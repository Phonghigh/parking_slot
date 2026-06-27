import { Outlet } from 'react-router-dom';

/** Layout full-screen cho commuter (KHÔNG có tab bar) — dùng cho các trang push như
 *  chi tiết bãi & QR check-in, nơi đã có nút back và thanh hành động riêng. */
export function CommuterPlain() {
  return (
    <div className="mx-auto min-h-full max-w-md bg-white">
      <Outlet />
    </div>
  );
}
