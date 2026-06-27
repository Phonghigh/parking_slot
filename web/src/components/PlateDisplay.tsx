/**
 * Renders a Vietnamese license plate badge.
 * Motorcycle plates (e.g. "29-B1-555.55") are shown in two rows
 * matching the physical plate layout. Car plates stay single-row.
 */

// Matches OCR output for two-line motorcycle plates: "29-B1-555.55"
const MOTO_RE = /^(\d{2}-?[A-Z]{1,2}\d)-(\d{3}\.?\d{2})$/;

function splitPlate(plate: string): [string, string] | null {
  const m = plate.trim().match(MOTO_RE);
  return m ? [m[1], m[2]] : null;
}

export function PlateDisplay({ plate, className = '' }: { plate: string; className?: string }) {
  const parts = splitPlate(plate);

  if (parts) {
    const [top, bottom] = parts;
    return (
      <span className={`plate-2row ${className}`}>
        <span className="plate-top">{top}</span>
        <span className="plate-bottom">{bottom}</span>
      </span>
    );
  }

  return <span className={`plate ${className}`}>{plate}</span>;
}
