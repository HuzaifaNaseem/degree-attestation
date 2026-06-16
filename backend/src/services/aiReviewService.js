/**
 * aiReviewService.js — the verification agent.
 *
 * Given an attestation request (the applicant's form fields + the OCR text
 * extracted from their uploaded CNIC, payment proof, and marksheets), it
 * cross-checks the documents against the application and recommends
 * APPROVE / REVIEW / REJECT with a confidence score, reasons, and red flags.
 *
 * Engines, chosen automatically by which key is configured:
 *   1. Claude (Anthropic)  — if ANTHROPIC_API_KEY is set.
 *   2. Google Gemini       — if GEMINI_API_KEY is set (has a FREE tier — no card).
 *   3. Rule-based offline  — zero-cost fallback when there's no key, no credit,
 *      or the LLM call fails. Same output shape, so the UI is identical.
 *
 * The recommendation is ADVISORY ONLY — the human admin always makes the final
 * decision (the approve/reject endpoints are unchanged and require a wallet key).
 */
const Anthropic = require("@anthropic-ai/sdk");
const { decrypt } = require("./encryptionService");

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Run the verification agent over a request document. Always resolves with a
 * verdict — never throws for "no key": it falls back to the offline engine.
 */
async function analyzeRequest(reqDoc) {
  if (process.env.ANTHROPIC_API_KEY) {
    try { return await claudeReview(reqDoc); }
    catch (err) { console.warn("AI agent: Claude failed, trying next engine —", err.message); }
  }
  if (process.env.GEMINI_API_KEY) {
    try { return await geminiReview(reqDoc); }
    catch (err) { console.warn("AI agent: Gemini failed, using offline analyzer —", err.message); }
  }
  return ruleBasedReview(reqDoc);
}

/* ─────────────────────── Shared prompt + helpers ─────────────────────── */

const SYSTEM_PROMPT = `You are a degree-attestation verification officer for a university registrar.
You review an applicant's attestation request and the OCR text of their uploaded documents
(CNIC/national ID, payment proof, matric marksheet, intermediate marksheet) and decide whether
the case is ready to be issued on-chain.

Cross-check rigorously:
- Does the name on the documents match the name on the application form?
- Does the CNIC/ID number appear and look well-formed?
- Is there payment evidence consistent with the attestation fee?
- Do the marksheets correspond to the claimed program/level of study?
- Are there mismatches, missing documents, or signs of tampering/forgery?

OCR is imperfect — minor spelling/spacing noise is normal and is NOT by itself a red flag.

Decide one recommendation:
- APPROVE: documents are present and consistent with the application.
- REVIEW: something is missing, unreadable, or needs a human to look closer.
- REJECT: clear contradiction, wrong person, or evidence of fraud.

You are an assistant — a human officer makes the final decision. Be specific and concise.
Return strictly the JSON object: { recommendation, confidence (0-100 integer), summary, reasons[], redFlags[] }.`;

const fmtDate = (unix) =>
  unix ? new Date(unix * 1000).toISOString().slice(0, 10) : "(not provided)";

function buildCaseText(reqDoc) {
  const docs = (reqDoc.documents || [])
    .map(
      (d) =>
        `--- DOCUMENT: ${d.label} (${d.type}) ---\n` +
        `OCR-extracted text:\n${(d.ocrText || "").trim() || "(no text could be extracted)"}`
    )
    .join("\n\n");

  return [
    `APPLICATION FORM (what the applicant claims):`,
    `- Full name: ${reqDoc.applicantName}`,
    `- Student / Registration ID: ${reqDoc.studentId}`,
    `- Degree program: ${reqDoc.program}`,
    `- Graduation date: ${fmtDate(reqDoc.graduationDate)}`,
    `- Email: ${reqDoc.email}`,
    `- Attestation fee due: Rs. ${reqDoc.fee}`,
    ``,
    `UPLOADED SUPPORTING DOCUMENTS (text extracted by OCR in the applicant's browser):`,
    docs || "(no documents were uploaded)",
  ].join("\n");
}

/** Normalise any engine's raw JSON object into our stored verdict shape. */
function normalize(v, modelLabel) {
  return {
    recommendation: ["APPROVE", "REJECT", "REVIEW"].includes(v.recommendation) ? v.recommendation : "REVIEW",
    confidence:     clamp(v.confidence),
    summary:        String(v.summary || ""),
    reasons:        Array.isArray(v.reasons) ? v.reasons.map(String) : [],
    redFlags:       Array.isArray(v.redFlags) ? v.redFlags.map(String) : [],
    model:          modelLabel,
    createdAt:      new Date(),
  };
}

const USER_TURN = (reqDoc) =>
  "Review this degree-attestation case and return your verdict.\n\n" + buildCaseText(reqDoc);

/* ──────────────────────────── 1) Claude engine ──────────────────────────── */

const CLAUDE_SCHEMA = {
  type: "object",
  properties: {
    recommendation: { type: "string", enum: ["APPROVE", "REJECT", "REVIEW"] },
    confidence:     { type: "integer" },
    summary:        { type: "string" },
    reasons:        { type: "array", items: { type: "string" } },
    redFlags:       { type: "array", items: { type: "string" } },
  },
  required: ["recommendation", "confidence", "summary", "reasons", "redFlags"],
  additionalProperties: false,
};

async function claudeReview(reqDoc) {
  const model = process.env.AI_MODEL || "claude-opus-4-8";
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: CLAUDE_SCHEMA } },
    messages: [{ role: "user", content: USER_TURN(reqDoc) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock?.text) throw new Error(`Claude returned no verdict (stop_reason: ${response.stop_reason})`);
  return normalize(JSON.parse(textBlock.text), `Claude · ${response.model || model}`);
}

/* ──────────────────── 2) Google Gemini engine (free tier) ──────────────────── */

// Gemini uses its own (OpenAPI-style) schema dialect — types are UPPERCASE.
const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    recommendation: { type: "STRING", enum: ["APPROVE", "REJECT", "REVIEW"] },
    confidence:     { type: "INTEGER" },
    summary:        { type: "STRING" },
    reasons:        { type: "ARRAY", items: { type: "STRING" } },
    redFlags:       { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["recommendation", "confidence", "summary", "reasons", "redFlags"],
};

async function geminiReview(reqDoc) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: USER_TURN(reqDoc) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GEMINI_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text).join("").trim();
  if (!text) throw new Error("Gemini returned no content");
  return normalize(JSON.parse(text), `Google Gemini · ${model}`);
}

/* ─────────────────────── 3) Rule-based engine (offline) ─────────────────────── */

const norm   = (s) => String(s || "").toLowerCase();
const digits = (s) => String(s || "").replace(/\D/g, "");

const PAY_WORDS  = ["paid", "payment", "deposit", "receipt", "challan", "amount", "rs", "rupee", "fee", "slip", "bank", "transaction"];
const MARK_WORDS = ["marks", "grade", "gpa", "board", "examination", "certificate", "result", "ssc", "hssc", "matric", "intermediate", "passed", "division"];

/**
 * Deterministic cross-check — no LLM, no cost. Mirrors the checks the LLM does:
 * name match, CNIC number, payment evidence, marksheet content, missing docs.
 */
function ruleBasedReview(reqDoc) {
  const docs   = reqDoc.documents || [];
  const byType = Object.fromEntries(docs.map((d) => [d.type, d]));
  const allText = norm(docs.map((d) => d.ocrText).join("  \n"));
  const reasons = [];
  const redFlags = [];

  if (docs.length === 0) {
    return {
      recommendation: "REVIEW", confidence: 20,
      summary: "No supporting documents were uploaded, so the application cannot be auto-verified.",
      reasons: [], redFlags: ["No documents uploaded — cannot cross-check the applicant's claims."],
      model: "rule-based (offline) v1", createdAt: new Date(),
    };
  }

  // 1) Name match across all OCR text
  const nameTokens = norm(reqDoc.applicantName).split(/\s+/).filter((t) => t.length >= 3);
  const nameHits   = nameTokens.filter((t) => allText.includes(t));
  const nameRatio  = nameTokens.length ? nameHits.length / nameTokens.length : 0;
  let score = 0;
  if (nameRatio >= 0.5) { reasons.push("Applicant's name was found in the uploaded documents."); score += 30; }
  else if (nameHits.length > 0) { reasons.push("Applicant's name partially matches the documents (possible OCR noise)."); score += 15; }
  else { redFlags.push("Applicant's name was not found in any uploaded document."); }

  // 2) CNIC / National ID
  if (byType.cnic) {
    let nidMatched = false;
    try {
      const nid = digits(decrypt(reqDoc.nationalIdEnc));
      if (nid && digits(byType.cnic.ocrText).includes(nid.slice(0, Math.min(8, nid.length)))) nidMatched = true;
    } catch { /* decrypt unavailable — fall through to pattern check */ }
    const has13 = /\d[\d\s-]{11,}\d/.test(byType.cnic.ocrText || "");
    if (nidMatched)   { reasons.push("CNIC number on the ID matches the application."); score += 20; }
    else if (has13)   { reasons.push("A CNIC-style number is present on the ID document."); score += 10; }
    else              { redFlags.push("No clear CNIC number detected on the ID document."); }
  } else {
    redFlags.push("CNIC / National ID document was not uploaded.");
  }

  // 3) Payment proof
  if (byType.payment) {
    if (PAY_WORDS.some((w) => norm(byType.payment.ocrText).includes(w))) {
      reasons.push("Payment document contains payment/receipt keywords."); score += 15;
    } else { redFlags.push("Payment document doesn't look like a valid receipt/slip."); }
  } else { redFlags.push("Payment proof was not uploaded."); }

  // 4) Marksheets
  for (const [type, label] of [["matric", "Matriculation marksheet"], ["intermediate", "Intermediate marksheet"]]) {
    if (byType[type]) {
      if (MARK_WORDS.some((w) => norm(byType[type].ocrText).includes(w))) {
        reasons.push(`${label} looks like a genuine result document.`); score += 12;
      } else { redFlags.push(`${label} text doesn't resemble a marksheet.`); }
    } else { redFlags.push(`${label} was not uploaded.`); }
  }

  const missingCount = ["cnic", "payment", "matric", "intermediate"].filter((t) => !byType[t]).length;

  let recommendation, confidence, summary;
  if (nameHits.length === 0 && allText.replace(/\s/g, "").length > 40) {
    recommendation = "REJECT"; confidence = 72;
    summary = "The applicant's name does not appear in any uploaded document, which suggests a mismatch between the applicant and their documents.";
  } else if (missingCount >= 2 || score < 45) {
    recommendation = "REVIEW"; confidence = clamp(40 + score / 2);
    summary = "Some documents are missing or could not be confidently verified — a human reviewer should check this application.";
  } else if (score >= 65 && missingCount === 0) {
    recommendation = "APPROVE"; confidence = clamp(score);
    summary = "All required documents are present and consistent with the application form.";
  } else {
    recommendation = "REVIEW"; confidence = clamp(45 + score / 2);
    summary = "The application is mostly consistent but has minor gaps worth a quick human check.";
  }

  return { recommendation, confidence, summary, reasons, redFlags, model: "rule-based (offline) v1", createdAt: new Date() };
}

module.exports = { analyzeRequest };
