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
  const { createWorker, PSM } = await import('tesseract.js');
  // Đa tỉ lệ: 520px (ảnh chụp cận, chữ to) + 1000px (ảnh xa, chữ nhỏ) — Tesseract đọc tốt nhất
  // khi chữ cỡ vừa; ảnh quá to/zoom sát sẽ fail nếu chỉ phóng to. Thêm biến thể Otsu cho ảnh khó.
  const variants = await Promise.all([
    preprocess(file, 'stretch', 520),
    preprocess(file, 'stretch', 1000),
    preprocess(file, 'otsu', 760),
  ]);

  const worker = await createWorker('eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHKLMNPRSTUVXYZ-.',
      tessedit_pageseg_mode: PSM.AUTO,
    });
    const candidates: string[] = [];
    for (const canvas of variants) {
      const { data } = await worker.recognize(canvas);
      candidates.push(cleanPlate(data.text || ''));
    }
    return pickBest(candidates);
  } finally {
    await worker.terminate();
  }
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
  const lines = raw
    .toUpperCase()
    .split(/\n+/)
    .map((l) => l.replace(/[^A-Z0-9]/g, ''))
    .filter((l) => l.length >= 2 && l.length <= 8);

  let s: string;
  if (lines.length >= 2) {
    s = `${lines[0]}-${lines[1]}`;
  } else if (lines.length === 1) {
    s = lines[0];
  } else {
    s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  s = s.replace(/(\d{3})(\d{2})$/, '$1.$2');
  return s;
}
