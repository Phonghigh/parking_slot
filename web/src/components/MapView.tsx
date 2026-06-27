import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Lot } from '../api';
import { capacityColor, priceLabel } from '../lib/format';

function lotIcon(lot: Lot, active: boolean) {
  const cap = capacityColor(lot.available_spots, lot.total_spots);
  return L.divIcon({
    className: '',
    html: `
      <div style="transform: translate(-50%, -100%); display:flex; flex-direction:column; align-items:center;">
        <div style="background:${cap.color}; color:#fff; font-weight:700; font-size:11px;
             padding:3px 8px; border-radius:999px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,.25);
             border:${active ? '2px solid #0f172a' : '2px solid #fff'};">
          ${priceLabel(lot)}
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
             border-top:7px solid ${cap.color};margin-top:-1px;"></div>
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

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [center[0], center[1]]);
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

export function MapView({
  center,
  userPos,
  lots,
  activeId,
  onSelect,
  onMoveEnd,
}: {
  center: [number, number];
  userPos: [number, number] | null;
  lots: Lot[];
  activeId?: number;
  onSelect: (lot: Lot) => void;
  onMoveEnd?: (c: [number, number]) => void;
}) {
  return (
    <MapContainer center={center} zoom={14} zoomControl={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <DragWatcher onMoveEnd={onMoveEnd} />
      {userPos && <Marker position={userPos} icon={userIcon()} />}
      {lots.map((lot) => (
        <Marker
          key={lot.id}
          position={[lot.lat, lot.lng]}
          icon={lotIcon(lot, lot.id === activeId)}
          eventHandlers={{ click: () => onSelect(lot) }}
        />
      ))}
    </MapContainer>
  );
}
