import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import L from 'leaflet';
import { Lot } from '../api';
import { capacityColor, priceLabel } from '../lib/format';

function lotIcon(lot: Lot, active: boolean) {
  const cap = capacityColor(lot.available_spots, lot.total_spots);
  const scale = active ? 'scale(1.12)' : 'scale(1)';
  const ring = active ? `0 0 0 2.5px #fff, 0 0 0 4px ${cap.color}` : 'none';
  const shadow = `0 4px 16px ${cap.color}66, 0 1px 4px rgba(0,0,0,0.20)`;

  return L.divIcon({
    className: '',
    html: `
      <div style="transform:translate(-50%,-100%); display:flex; flex-direction:column; align-items:center;">
        <div class="${active ? 'marker-float' : ''}" style="display:flex; flex-direction:column; align-items:center;">
          <div style="
            background: linear-gradient(170deg, rgba(255,255,255,0.28) 0%, rgba(0,0,0,0.10) 100%), ${cap.color};
            border: 1.5px solid rgba(255,255,255,0.50);
            border-radius: 999px;
            padding: 5px 12px;
            font-weight: 700;
            font-size: 12px;
            color: #fff;
            text-shadow: 0 1px 3px rgba(0,0,0,0.30);
            white-space: nowrap;
            transform: ${scale};
            box-shadow:
              inset 0 1.5px 0 rgba(255,255,255,0.65),
              inset 0 -1px 0 rgba(0,0,0,0.12),
              ${ring !== 'none' ? ring + ',' : ''}
              ${shadow};
          ">
            ${priceLabel(lot)} · ${lot.available_spots} chỗ
          </div>
          <div style="
            width:0; height:0;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-top:7px solid ${cap.color};
            margin-top:-1px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.22));
          "></div>
        </div>
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

function MapClickWatcher({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: () => onClick() });
  return null;
}

export function MapView({
  center,
  userPos,
  lots,
  activeId,
  onSelect,
  onMoveEnd,
  onMapClick,
}: {
  center: [number, number];
  userPos: [number, number] | null;
  lots: Lot[];
  activeId?: number;
  onSelect: (lot: Lot) => void;
  onMoveEnd?: (c: [number, number]) => void;
  onMapClick?: () => void;
}) {
  return (
    <MapContainer center={center} zoom={14} zoomControl={false} attributionControl={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <DragWatcher onMoveEnd={onMoveEnd} />
      {onMapClick && <MapClickWatcher onClick={onMapClick} />}
      {userPos && <Marker position={userPos} icon={userIcon()} />}
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
