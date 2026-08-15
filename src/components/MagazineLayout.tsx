import { Outlet } from 'react-router';

export default function MagazineLayout() {
  return (
    <div className="mx-auto flex min-h-svh w-[1126px] max-w-full flex-col border-x border-rule bg-paper font-sans text-muted">
      <Outlet />
    </div>
  );
}
