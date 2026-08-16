import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Search, Sun, Moon, LogOut } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/holdings", label: "Holdings", icon: ClipboardList },
    { to: "/stocks", label: "Browse Stocks", icon: Search },
  ];

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] flex flex-col" style={{ background: "var(--sb-bg)" }}>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-7">
        <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-white text-[13px] font-extrabold bg-gradient-to-br from-[#4AADE5] to-[#1a6fa0]">
          S
        </div>
        <span className="text-white font-bold text-[14.5px] tracking-tight">Singapore Dividends</span>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                isActive
                  ? "bg-[rgba(74,173,229,0.12)] text-[#4AADE5]"
                  : "text-[var(--sb-text)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-active)]"
              }`
            }
          >
            <Icon size={18} className="opacity-70 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-white/[0.06] flex flex-col gap-0.5">
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[var(--sb-text)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-active)] transition-colors w-full"
        >
          {theme === "dark" ? <Sun size={18} className="opacity-70" /> : <Moon size={18} className="opacity-70" />}
          Theme
        </button>
        {user && (
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[var(--sb-text)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-active)] transition-colors w-full"
          >
            <LogOut size={18} className="opacity-70" />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
