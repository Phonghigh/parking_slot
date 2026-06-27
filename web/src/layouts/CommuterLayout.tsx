import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { IconHistory, IconMap, IconTicket, IconUser } from '../components/icons';

const TABS = [
  { to: '/', icon: <IconMap />, label: 'Bản đồ', end: true },
  { to: '/ticket', icon: <IconTicket />, label: 'Vé của tôi', end: false },
  { to: '/history', icon: <IconHistory />, label: 'Lịch sử', end: false },
  { to: '/account', icon: <IconUser />, label: 'Tài khoản', end: false },
];

type BlobPhase = 'idle' | 'stretch' | 'land';

export function CommuterLayout() {
  const { pathname } = useLocation();
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const prevIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [blob, setBlob] = useState({ x: 0, w: 0, phase: 'idle' as BlobPhase });
  const [blobReady, setBlobReady] = useState(false);

  const activeIdx = TABS.findIndex((t) =>
    t.end ? pathname === t.to : pathname.startsWith(t.to)
  );

  const snapBlob = (idx: number, animate: boolean) => {
    const destEl = tabRefs.current[idx];
    if (!destEl) return;
    const { offsetLeft: destLeft, offsetWidth: destWidth } = destEl;

    if (!animate) {
      setBlob({ x: destLeft, w: destWidth, phase: 'idle' });
      setBlobReady(true);
      return;
    }

    const srcEl = tabRefs.current[prevIdxRef.current];
    if (!srcEl) {
      setBlob({ x: destLeft, w: destWidth, phase: 'land' });
      return;
    }

    const { offsetLeft: srcLeft, offsetWidth: srcWidth } = srcEl;

    // Phase 1: stretch blob to bridge source → destination (width-based, no overflow)
    const spanLeft = Math.min(srcLeft, destLeft);
    const spanRight = Math.max(srcLeft + srcWidth, destLeft + destWidth);
    setBlob({ x: spanLeft, w: spanRight - spanLeft, phase: 'stretch' });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Phase 2: contract to destination with spring
      setBlob({ x: destLeft, w: destWidth, phase: 'land' });
    }, 150);
  };

  useEffect(() => {
    if (activeIdx < 0) return;
    snapBlob(activeIdx, blobReady);
    prevIdxRef.current = activeIdx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  useEffect(() => {
    if (blobReady) return;
    const frame = requestAnimationFrame(() => snapBlob(activeIdx >= 0 ? activeIdx : 0, false));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="no-scrollbar flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="glass-nav fixed bottom-5 left-1/2 z-20 mx-auto w-[88%] max-w-sm -translate-x-1/2 rounded-full px-3 py-2">
        <div className="relative flex items-center justify-evenly">
          {blobReady && (
            <div
              className={`blob-indicator${blob.phase === 'land' ? ' landing' : ''}`}
              style={{ left: blob.x, width: blob.w }}
            />
          )}

          {TABS.map((tab, i) => (
            <NavLink
              key={tab.to}
              ref={(el) => { tabRefs.current[i] = el; }}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `relative z-10 flex flex-col items-center gap-0.5 rounded-full px-4 py-2 text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {tab.icon}
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
