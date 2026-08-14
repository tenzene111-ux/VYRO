import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { CreateMenu } from "./CreateMenu";

export function Shell() {
  return (
    <div className="fixed inset-0 mx-auto flex max-w-[480px] flex-col overflow-hidden bg-vyro-radial sm:border-x sm:border-white/5">
      <div className="flex-1 overflow-y-auto pb-28">
        <Outlet />
      </div>

      <BottomNav />
      <CreateMenu />
    </div>
  );
}
