/**
 * Đọc biển số xe từ ảnh bằng OCR (Tesseract.js).
 * Dynamic import để không nạp thư viện OCR vào bundle chính.
 */
export async function readPlateFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.group('[OCR] readPlateFromImage');
  console.log('[OCR] file:', file.name, `${(file.size / 1024).toFixed(1)} KB`, file.type);

  const Tesseract = (await import('tesseract.js')).default;

  // Pass 1 — full image (progress 0→70%)
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m: any) => {
      console.log(`[OCR] pass1 status="${m.status}" progress=${(m.progress * 100).toFixed(0)}%`);
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress * 0.7);
    },
  });

  console.log('[OCR] raw text:', JSON.stringify(data.text));
  console.log('[OCR] confidence:', data.confidence);
  if (data.words?.length) {
    console.table(
      data.words.map((w: any) => ({ text: w.text, confidence: w.confidence.toFixed(1) }))
    );
  }

  const pass1 = cleanPlate(data.text || '');
  console.log('[OCR] pass 1 result:', pass1 || '(empty)');

  // If only the bottom number line was found (e.g. "793.79"), OCR the top half separately.
  // This happens when the VN national emblem between the province code and series letter
  // confuses Tesseract's line segmentation and the top line is dropped entirely.
  if (/^\d{3}\.?\d{2}$/.test(pass1)) {
    console.warn('[OCR] only bottom line detected — starting pass 2 on top half of image');
    const topLine = await ocrTopHalf(file, Tesseract, (p) => onProgress?.(0.7 + p * 0.3));
    if (topLine) {
      const combined = `${topLine}-${pass1}`;
      console.log('[OCR] two-pass combined result:', combined);
      console.groupEnd();
      return combined;
    }
    console.warn('[OCR] pass 2 also failed — returning bottom-only result');
  }

  console.log('[OCR] final plate:', pass1 || '(empty — nothing matched)');
  console.groupEnd();
  return pass1;
}

/** Crops the top half of the image and runs a second OCR pass to find the province+series line. */
async function ocrTopHalf(
  file: File,
  Tesseract: any,
  onProgress?: (p: number) => void,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = URL.createObjectURL(file);
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = Math.ceil(img.naturalHeight * 0.5);
  canvas.getContext('2d')!.drawImage(img, 0, 0); // canvas clips to top half automatically
  URL.revokeObjectURL(img.src);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas.toBlob failed'))))
  );

  const { data } = await Tesseract.recognize(blob, 'eng', {
    logger: (m: any) => {
      console.log(`[OCR] pass2 status="${m.status}" progress=${(m.progress * 100).toFixed(0)}%`);
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });

  console.log('[OCR] pass 2 top-half raw:', JSON.stringify(data.text));

  const lines = data.text
    .toUpperCase()
    .split(/\n+/)
    .map((l: string) => l.replace(/[^A-Z0-9.\-]/g, '').trim())
    .filter(Boolean);

  console.log('[OCR] pass 2 lines:', lines);

  // Same end-anchor pattern: ignore leading noise from plate border / emblem
  const topRe = /(\d{2}-?[A-Z]{1,2}\d)$/;
  for (const line of lines) {
    const m = line.match(topRe);
    if (m) {
      console.log('[OCR] pass 2 top line:', m[1]);
      return m[1];
    }
  }

  console.warn('[OCR] pass 2: no top-line pattern found in:', lines);
  return '';
}

/** Làm sạch text OCR thành chuỗi gần với biển số VN nhất. */
export function cleanPlate(raw: string): string {
  console.group('[OCR] cleanPlate');
  console.log('[OCR] input:', JSON.stringify(raw));

  const lines = raw
    .toUpperCase()
    .split(/\n+/)
    .map((l) => l.replace(/[^A-Z0-9.\-]/g, '').trim())
    .filter(Boolean);

  console.log('[OCR] lines after strip:', lines);

  // Step 1: two-line VN motorcycle plate  e.g. "29-B1" + "555.55"
  // Match at END of line so leading noise ("1", "E", "|"...) is ignored.
  const topRe = /(\d{2}-?[A-Z]{1,2}\d)$/;
  const bottomRe = /^(\d{3}\.?\d{2})/;
  for (let i = 0; i < lines.length - 1; i++) {
    const tm = lines[i].match(topRe);
    const bm = lines[i + 1].match(bottomRe);
    if (tm && bm) {
      const result = `${tm[1]}-${bm[1]}`;
      console.log('[OCR] matched two-line motorcycle plate:', result);
      console.groupEnd();
      return result;
    }
  }

  // Step 2: single-line car plate  e.g. "51F-123.45"
  const singleRe = /\d{2}[A-Z]{1,2}-?\d{3}\.?\d{2}/;
  for (const line of lines) {
    const m = line.match(singleRe);
    if (m) {
      console.log('[OCR] matched single-line car plate:', m[0]);
      console.groupEnd();
      return m[0];
    }
  }

  // Step 3: score-based fallback
  const scored = lines.map((l) => ({ l, score: (l.match(/[A-Z0-9]/g) || []).length }));
  console.log('[OCR] scored lines:', scored);

  const candidates = scored
    .filter((c) => c.score >= 4 && c.score <= 12)
    .sort((a, b) => b.score - a.score);

  console.log('[OCR] candidates (score 4–12):', candidates);

  const result =
    candidates[0]?.l || lines.sort((a, b) => b.length - a.length)[0] || '';

  if (!candidates[0] && lines.length) {
    console.warn('[OCR] no candidate passed score filter — falling back to longest line:', result);
  }

  console.groupEnd();
  return result;
}
