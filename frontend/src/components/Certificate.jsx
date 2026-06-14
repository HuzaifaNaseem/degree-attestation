/**
 * Certificate — a printable, QR-verifiable degree certificate.
 *
 * Premium diploma styling: navy + gold, ornamental frame, guilloché watermark,
 * a circular "Blockchain Verified" seal, and a QR that deep-links to the public
 * verifier (/verify-degree?hash=…). Scanning confirms authenticity on-chain in
 * seconds — the Blockcerts / W3C Verifiable Credentials pattern.
 *
 * Branding: drop the official logo at  frontend/public/iqra-logo.png  and it is
 * used automatically; otherwise a clean SVG "IU" crest is rendered as fallback.
 *
 * Uses a fixed light "paper" palette (independent of app theme) so it always
 * looks like a real document and prints cleanly to PDF (landscape).
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";

const NAVY = "#15305B";
const GOLD = "#B08A2E";
const INK  = "#2A2113";

function fmtDate(unix) {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

/* ── Institutional crest: official PNG if present, else SVG fallback ── */
function Crest() {
  const [imgOk, setImgOk] = useState(true);
  if (imgOk) {
    // The asset is a square canvas with the logo as a horizontal band centred in
    // it — so we render it large and pull the transparent top/bottom padding in
    // with negative margins to get a properly-sized, tight logo.
    return (
      <div className="flex justify-center overflow-hidden" style={{ height: 70 }}>
        <img
          src="/iqra-logo.png"
          alt="Iqra University"
          onError={() => setImgOk(false)}
          className="w-auto object-contain"
          style={{ height: 200, marginTop: -65, marginBottom: -65 }}
        />
      </div>
    );
  }
  // Fallback "IU" crest in Iqra's navy identity
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tight" style={{ color: NAVY, fontFamily: "Georgia, serif" }}>
          IQRA
        </span>
        <span
          className="inline-flex items-center justify-center font-bold text-white text-lg leading-none"
          style={{ background: NAVY, width: 34, height: 34, borderRadius: 4, fontFamily: "Georgia, serif" }}
        >
          IU
        </span>
      </div>
      <span className="text-[11px] tracking-[0.45em] mt-1" style={{ color: NAVY }}>UNIVERSITY</span>
    </div>
  );
}

/* ── Circular verification seal with curved text ── */
function Seal() {
  return (
    <svg viewBox="0 0 130 130" className="w-[88px] h-[88px]">
      <defs>
        <path id="seal-top" d="M65,65 m-46,0 a46,46 0 1,1 92,0" fill="none" />
        <path id="seal-bottom" d="M65,65 m46,0 a46,46 0 1,1 -92,0" fill="none" />
      </defs>
      <circle cx="65" cy="65" r="60" fill="none" stroke={GOLD} strokeWidth="2.5" />
      <circle cx="65" cy="65" r="51" fill="none" stroke={GOLD} strokeWidth="1" strokeDasharray="1.5 3" />
      <text fill={GOLD} fontSize="10.5" fontWeight="bold" letterSpacing="2.5" style={{ fontFamily: "Georgia, serif" }}>
        <textPath href="#seal-top" startOffset="50%" textAnchor="middle">BLOCKCHAIN VERIFIED</textPath>
      </text>
      <text fill={GOLD} fontSize="9" fontWeight="bold" letterSpacing="2" style={{ fontFamily: "Georgia, serif" }}>
        <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle">IQRA UNIVERSITY</textPath>
      </text>
      {/* center emblem */}
      <g transform="translate(65 65)">
        <circle r="30" fill={NAVY} />
        <g transform="translate(-13 -11) scale(1.1)" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4 L23 9 L12 14 L1 9 Z" />
          <path d="M5 11 V16 C5 18 19 18 19 16 V11" />
          <line x1="23" y1="9" x2="23" y2="15" />
        </g>
      </g>
    </svg>
  );
}

export default function Certificate({ degree, onClose }) {
  const [qr, setQr] = useState("");

  const verifyUrl = degree
    ? `${window.location.origin}/verify-degree?hash=${degree.degreeHash}`
    : "";

  useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toDataURL(verifyUrl, {
      margin: 1, width: 240,
      color: { dark: "#15305B", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then(setQr).catch(() => setQr(""));
  }, [verifyUrl]);

  if (!degree) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:p-8 no-print"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl my-auto"
        >
          {/* ── The certificate (this is what prints) ── */}
          <div
            id="certificate-print"
            className="relative rounded-sm shadow-2xl overflow-hidden"
            style={{ background: "#FCF8F0", color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {/* Ornamental frame */}
            <div className="absolute inset-[10px] pointer-events-none" style={{ border: `3px solid ${GOLD}` }} />
            <div className="absolute inset-[18px] pointer-events-none" style={{ border: `1px solid ${GOLD}66` }} />

            {/* Corner diamonds */}
            {["top-[10px] left-[10px]", "top-[10px] right-[10px]", "bottom-[10px] left-[10px]", "bottom-[10px] right-[10px]"].map((pos) => (
              <span key={pos} className={`absolute ${pos} w-3 h-3 rotate-45 -translate-x-1/2 -translate-y-1/2`}
                style={{ background: GOLD, marginLeft: pos.includes("right") ? "auto" : 0 }} />
            ))}

            {/* Guilloché watermark */}
            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" width="420" height="420" style={{ opacity: 0.05 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <circle key={i} cx="210" cy="210" r={20 + i * 19} fill="none" stroke={NAVY} strokeWidth="1" />
              ))}
            </svg>

            {/* Revoked watermark */}
            {degree.isRevoked && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[8rem] font-black tracking-widest -rotate-[18deg] select-none"
                  style={{ color: "rgba(220,38,38,0.13)", fontFamily: "Arial, sans-serif" }}>
                  REVOKED
                </span>
              </div>
            )}

            <div className="relative px-10 sm:px-16 pt-10 pb-8 text-center">
              {/* Crest + institution */}
              <Crest />
              <p className="text-[10px] tracking-[0.35em] mt-3" style={{ color: GOLD }}>
                KARACHI · PAKISTAN
              </p>

              <h1 className="text-3xl sm:text-[2.4rem] font-bold tracking-wide mt-5" style={{ color: NAVY }}>
                Certificate of Degree
              </h1>

              {/* flourish divider */}
              <div className="flex items-center justify-center gap-3 my-4">
                <span className="h-px w-20" style={{ background: GOLD }} />
                <span className="w-2 h-2 rotate-45" style={{ background: GOLD }} />
                <span className="h-px w-20" style={{ background: GOLD }} />
              </div>

              <p className="text-sm" style={{ color: "#5C5036" }}>This is to certify that</p>
              <p className="text-[2.5rem] sm:text-[3rem] leading-tight font-bold my-2" style={{ color: INK }}>
                {degree.studentName}
              </p>
              <p className="text-sm max-w-lg mx-auto" style={{ color: "#5C5036" }}>
                has satisfied all the requirements prescribed by Iqra University and is hereby awarded the degree of
              </p>
              <p className="text-2xl sm:text-[1.7rem] font-bold mt-3" style={{ color: GOLD }}>
                {degree.program}
              </p>
              <p className="text-sm mt-2" style={{ color: "#5C5036" }}>
                Conferred on {fmtDate(degree.graduationDate)}
              </p>

              {/* Bottom row: signature · seal · QR */}
              <div className="mt-9 grid grid-cols-3 items-end gap-4 text-left">
                {/* Signature */}
                <div>
                  <div className="h-px w-44" style={{ background: `${INK}66` }} />
                  <p className="text-xs font-semibold mt-1" style={{ color: INK }}>Registrar</p>
                  <p className="text-[10px]" style={{ color: "#5C5036" }}>Iqra University</p>
                  <p className="text-[9px] mt-2" style={{ color: "#5C5036" }}>
                    Student ID: <span style={{ fontFamily: "monospace" }}>{degree.studentId}</span>
                  </p>
                </div>

                {/* Seal */}
                <div className="flex justify-center pb-1"><Seal /></div>

                {/* QR */}
                <div className="text-center justify-self-end">
                  {qr ? (
                    <img src={qr} alt="Verification QR" className="w-[88px] h-[88px] mx-auto" style={{ border: `1px solid ${GOLD}66` }} />
                  ) : (
                    <div className="w-[88px] h-[88px] mx-auto bg-[#EFE7D4] animate-pulse" />
                  )}
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.2em] mt-1.5" style={{ color: GOLD }}>Scan to verify</p>
                  <p className="text-[8px]" style={{ color: "#5C5036" }}>on the blockchain</p>
                </div>
              </div>

              {/* Hash strip */}
              <div className="mt-7 pt-3" style={{ borderTop: `1px solid ${GOLD}55` }}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-0.5"
                    style={{ color: "#15803d", background: "#16a34a18", border: "1px solid #16a34a55" }}>
                    ⛓ Blockchain Verified
                  </span>
                  {degree.isRevoked && (
                    <span className="text-[10px] font-bold rounded-full px-2.5 py-0.5"
                      style={{ color: "#b91c1c", background: "#dc262618", border: "1px solid #dc262655" }}>
                      REVOKED
                    </span>
                  )}
                </div>
                <p className="text-[9px] leading-relaxed" style={{ color: "#5C5036", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {degree.degreeHash}
                </p>
              </div>
            </div>
          </div>

          {/* ── Actions (not printed) ── */}
          <div className="flex items-center justify-center gap-3 mt-5 no-print">
            <button
              onClick={() => window.print()}
              data-testid="print-certificate"
              className="bg-[#B08A2E] text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-black/30"
            >
              🖨  Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="bg-white/10 text-white font-semibold text-sm px-6 py-2.5 rounded-xl border border-white/20 hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
