import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { CreateMenu } from "./CreateMenu";

export function Shell() {
  const { pathname } = useLocation();
  const showBottomNav = pathname !== "/home";

  return (
    <div className="relative mx-auto min-h-svh w-full max-w-[480px] bg-vyro-radial sm:border-x sm:border-white/5">
      <div className={showBottomNav ? "pb-4" : "pb-4 safe-bottom"}>
        <Outlet />
      </div>

      {showBottomNav && <BottomNav />}
      <CreateMenu />
    </div>
  );
}
