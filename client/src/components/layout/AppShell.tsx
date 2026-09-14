import { Outlet } from "react-router-dom";
import { Topbar } from "./Topbar";
import { AddTickerModal } from "../AddTickerModal";

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <main className="flex-1 p-7 pb-20 md:pb-7">
        <div className="max-w-[1200px] mx-auto">
          <Outlet />
        </div>
      </main>
      <AddTickerModal />
    </div>
  );
}
