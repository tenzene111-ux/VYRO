import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { CreateMenu } from "./CreateMenu";

export function Shell() {
  return (
    <div className="relative mx-auto min-h-svh w-full max-w-[480px] bg-vyro-radial sm:border-x sm:border-white/5">
      <div className="pb-4">
        <Outlet />
      </div>

      <BottomNav />
      <CreateMenu />
    </div>
  );
}
