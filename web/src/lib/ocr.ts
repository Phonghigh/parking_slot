/**
 * Đọc biển số xe từ ảnh bằng OCR (Tesseract.js).
 * Dynamic import để không nạp thư viện OCR vào bundle chính.
 */
export async function readPlateFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  return cleanPlate(data.text || '');
}

/** Làm sạch text OCR thành chuỗi gần với biển số VN nhất. */
export function cleanPlate(raw: string): string {
  const lines = raw
    .toUpperCase()
    .split(/\n+/)
    .map((l) => l.replace(/[^A-Z0-9.\-]/g, '').trim())
    .filter(Boolean);

  // Chọn dòng có nhiều ký tự chữ–số nhất (biển số thường 7–9 ký tự)
  const candidates = lines
    .map((l) => ({ l, score: (l.match(/[A-Z0-9]/g) || []).length }))
    .filter((c) => c.score >= 5 && c.score <= 12)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.l || lines.sort((a, b) => b.length - a.length)[0] || '';
}
