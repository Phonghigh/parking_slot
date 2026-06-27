/**
 * Đọc biển số xe từ ảnh bằng OCR (Tesseract.js) — tối ưu cho biển số xe máy VN (2 dòng).
 * Chạy 2 biến thể tiền xử lý (giãn tương phản + nhị phân Otsu), thử cả 2 và chọn kết quả
 * giống biển số nhất → bền hơn với ảnh chụp thật (lóa sáng, viền tối, con dấu).
 * Dynamic import để không nạp thư viện OCR vào bundle chính.
 *
 * Trả về '' nếu không đọc được (caller nên báo cho người dùng gõ tay).
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

/** Chọn ứng viên giống biển số nhất (ưu tiên 7–9 ký tự chữ–số). */
function pickBest(cands: string[]): string {
  let best = '';
  let bestScore = -1;
  for (const c of cands) {
    const alnum = (c.match(/[A-Z0-9]/g) || []).length;
    if (alnum < 4) continue;
    let score = alnum;
    if (alnum >= 7 && alnum <= 9) score += 6; // biển xe máy VN thường 8–9 ký tự
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

type Mode = 'stretch' | 'otsu';

/** Tiền xử lý ảnh: chuẩn hoá kích thước + grayscale + (giãn tương phản | nhị phân Otsu) + viền trắng. */
async function preprocess(file: File, mode: Mode, targetW: number): Promise<HTMLCanvasElement> {
  const img = await fileToImage(file);
  const scale = targetW / img.naturalWidth; // có thể <1 (thu nhỏ) hoặc >1 (phóng to)
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const pad = Math.round(Math.max(w, h) * 0.06);
  const cw = w + pad * 2;
  const ch = h + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, pad, pad, w, h);

  const imgData = ctx.getImageData(0, 0, cw, ch);
  const d = imgData.data;
  const n = cw * ch;
  const gray = new Float32Array(n);
  const hist = new Array(256).fill(0);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    gray[p] = g;
    hist[Math.round(g)]++;
  }

  if (mode === 'otsu') {
    const th = otsuThreshold(hist, n);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const v = gray[p] > th ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  } else {
    // giãn tương phản theo PHÂN VỊ (bỏ 3% tối/sáng nhất) -> chống lóa & viền tối
    const lo = percentile(hist, n, 0.03);
    const hi = percentile(hist, n, 0.97);
    const range = Math.max(1, hi - lo);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const v = Math.max(0, Math.min(255, ((gray[p] - lo) / range) * 255));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function percentile(hist: number[], total: number, q: number): number {
  const target = total * q;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      resolve(im);
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không tải được ảnh'));
    };
    im.src = url;
  });
}

function otsuThreshold(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let varMax = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > varMax) {
      varMax = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Làm sạch text OCR → biển số VN (ghép 2 dòng, chèn dấu). */
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
