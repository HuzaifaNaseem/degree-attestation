/**
 * docScan.js — client-side document processing for the application flow.
 *
 *   compressImage(file)        → a small JPEG data-URL (caps size so it fits in Mongo)
 *   ocrImage(dataUrl, onProg)  → text extracted in-browser via Tesseract.js (free, no API key)
 *
 * This is where OCR lives in the system: extraction happens entirely on the
 * applicant's device, so raw documents never need to be shipped anywhere just to
 * read them. The extracted text travels with the application for the reviewer and
 * the AI verification agent to cross-check.
 */

/**
 * Downscale + re-encode an image file to a compact JPEG data-URL.
 * @param {File} file
 * @param {number} maxDim  longest edge in px (default 1100 — readable for OCR, small on disk)
 * @param {number} quality JPEG quality 0–1
 * @returns {Promise<{dataUrl: string, mime: string}>}
 */
export function compressImage(file, maxDim = 1100, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), mime: "image/jpeg" });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Run OCR on an image data-URL. Tesseract.js is imported lazily so it (and its
 * ~2MB worker/wasm) only loads the first time an applicant actually uploads a doc.
 * @param {string} dataUrl
 * @param {(pct:number)=>void} [onProgress]  0–100 recognition progress
 * @returns {Promise<string>} extracted text (trimmed)
 */
export async function ocrImage(dataUrl, onProgress) {
  const { default: Tesseract } = await import("tesseract.js");
  const { data } = await Tesseract.recognize(dataUrl, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  return (data.text || "").trim();
}
