import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.css';
import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import { Lot } from '../api';
import { capacityColor } from '../lib/format';

function shortPrice(lot: Lot): string {
  const p = lot.pricing_type === 'flat' ? lot.flat_price : lot.price_per_hour;
  return p >= 1000 ? `${Math.round(p / 1000)}k` : `${p}đ`;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function lotIcon(lot: Lot, active: boolean) {
  const cap = capacityColor(lot.available_spots, lot.total_spots);
  const gradients: Record<string, string> = {
    high:   'linear-gradient(135deg,#4ade80,#16a34a)',
    medium: 'linear-gradient(135deg,#fb923c,#ea580c)',
    low:    'linear-gradient(135deg,#f87171,#dc2626)',
  };
  const grad  = gradients[cap.key] ?? gradients.low;
  const color = cap.key === 'medium' ? '#ea580c' : cap.color;

  const circleSize = active ? 28 : 24;
  const fontSize   = lot.available_spots >= 100 ? 9 : lot.available_spots >= 10 ? 11 : 14;
  const pillPad    = active ? '6px 11px 6px 6px' : '5px 9px 5px 5px';
  const shadow     = active
    ? `0 6px 20px rgba(${hexToRgb(color)},0.38),0 2px 6px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,1)`
    : '0 4px 14px rgba(0,0,0,0.13),0 1px 3px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,1)';
  const border = active
    ? '1.5px solid rgba(26,58,107,0.30)'
    : '1.5px solid rgba(0,0,0,0.07)';

  return L.divIcon({
    className: '',
    html: `
      <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;">
        <div style="
          display:flex;align-items:center;gap:6px;
          padding:${pillPad};
          border-radius:20px;
          background:rgba(255,255,255,0.97);
          border:${border};
          box-shadow:${shadow};
          font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
          white-space:nowrap;
        ">
          <div style="
            width:${circleSize}px;height:${circleSize}px;border-radius:50%;
            background:${grad};
            display:flex;align-items:center;justify-content:center;
            font-size:${fontSize}px;font-weight:800;color:#fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.18);
            flex-shrink:0;
          ">${lot.available_spots}</div>
          <span style="font-size:11px;font-weight:700;color:#1e293b;letter-spacing:-0.2px;">${shortPrice(lot)}</span>
        </div>
        <div style="
          width:10px;height:6px;
          background:rgba(255,255,255,0.97);
          clip-path:polygon(0 0,100% 0,50% 100%);
          margin-top:-1px;
          filter:drop-shadow(0 2px 2px rgba(0,0,0,0.08));
        "></div>
      </div>`,
    iconSize: [0, 0],
  });
}

function userIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;
           background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.3);"></div>`,
    iconSize: [0, 0],
  });
}

function Recenter({ center, flyKey }: { center: [number, number]; flyKey: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], flyKey]);
  return null;
}

function DragWatcher({ onMoveEnd }: { onMoveEnd?: (c: [number, number]) => void }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      onMoveEnd?.([c.lat, c.lng]);
    },
  });
  return null;
}

function MapClickWatcher({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: () => onClick() });
  return null;
}

function searchPinIcon(name: string) {
  const label = name.split(',')[0].trim();
  return L.divIcon({
    className: '',
    html: `
      <div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;">
        <div style="
          background:#fff;
          border:1.5px solid rgba(0,0,0,0.12);
          border-radius:8px;
          padding:4px 8px;
          font-size:11px;
          font-weight:600;
          color:#1e293b;
          white-space:nowrap;
          max-width:180px;
          overflow:hidden;
          text-overflow:ellipsis;
          box-shadow:0 2px 8px rgba(0,0,0,0.18);
          margin-bottom:4px;
        ">${label}</div>
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.222 23.166 15.208 24.041a1 1 0 0 0 1.584 0C17.778 39.166 32 26.627 32 16 32 7.163 24.837 0 16 0z" fill="#EA4335"/>
          <circle cx="16" cy="16" r="7" fill="white"/>
        </svg>
      </div>`,
    iconSize: [0, 0],
  });
}

export function MapView({
  center,
  flyKey,
  userPos,
  lots,
  activeId,
  searchPin,
  onSelect,
  onMoveEnd,
  onMapClick,
}: {
  center: [number, number];
  flyKey: number;
  userPos: [number, number] | null;
  lots: Lot[];
  activeId?: number;
  searchPin?: { coords: [number, number]; name: string } | null;
  onSelect: (lot: Lot) => void;
  onMoveEnd?: (c: [number, number]) => void;
  onMapClick?: () => void;
}) {
  return (
    <MapContainer center={center} zoom={14} zoomControl={false} attributionControl={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <Recenter center={center} flyKey={flyKey} />
      <DragWatcher onMoveEnd={onMoveEnd} />
      {onMapClick && <MapClickWatcher onClick={onMapClick} />}
      {userPos && <Marker position={userPos} icon={userIcon()} />}
      {searchPin && (
        <Marker position={searchPin.coords} icon={searchPinIcon(searchPin.name)} />
      )}
      <MarkerClusterGroup chunkedLoading>
        {lots.map((lot) => (
          <Marker
            key={lot.id}
            position={[lot.lat, lot.lng]}
            icon={lotIcon(lot, lot.id === activeId)}
            eventHandlers={{ click: () => onSelect(lot) }}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
