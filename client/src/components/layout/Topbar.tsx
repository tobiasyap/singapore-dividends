import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon, Plus, LogOut, LayoutDashboard, ClipboardList } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { useUiStore } from "../../stores/uiStore";
import { GoogleSignInButton } from "../GoogleSignInButton";
import { LogoMark } from "../LogoMark";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/holdings", label: "Holdings" },
  { to: "/stocks", label: "Browse Stocks" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
    isActive ? "" : "hover:bg-[var(--surface-alt)]"
  }`;

export function Topbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const openAddHolding = useUiStore((s) => s.openAddHolding);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(query ? `/stocks?q=${encodeURIComponent(query)}` : "/stocks");
  }

  const initials = user?.display_name
    ? user.display_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <header
      className="flex items-center gap-5 px-6 py-2.5 border-b flex-wrap sticky top-0 z-20"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 shrink-0" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "14.5px" }}>
        <LogoMark size={26} />
        <span className="hidden sm:inline">Singapore Dividends</span>
      </div>

      <nav className="hidden md:flex items-center gap-0.5 shrink-0">
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={navLinkClass}
            style={({ isActive }) => (isActive ? { background: "var(--accent-s)", color: "var(--accent)" } : { color: "var(--text-2)" })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 flex-1 min-w-[160px] max-w-[300px] rounded-[9px] px-3 py-1.5" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
        <Search size={14} style={{ color: "var(--text-3)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or company…"
          className="w-full bg-transparent outline-none text-[12.5px]"
          style={{ color: "var(--text)" }}
        />
      </form>

      <div className="flex-1" />

      {isAuthenticated && user ? (
        <>
          <button className="w-8 h-8 rounded-lg border flex items-center justify-center relative shrink-0" style={{ borderColor: "var(--border)", color: "var(--text-2)" }} title="Notifications">
            <Bell size={15} />
          </button>
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => openAddHolding()}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-white shrink-0"
            style={{ background: "var(--accent)" }}
          >
            <Plus size={15} /> <span className="hidden md:inline">Add Holding</span>
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border"
              style={{ background: "var(--accent-s)", color: "var(--accent)", borderColor: "var(--border)" }}
            >
              {initials}
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-10 rounded-lg overflow-hidden border z-30 min-w-[140px]"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => { setMenuOpen(false); logout(); navigate("/"); }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-medium hover:bg-[var(--surface-alt)]"
                  style={{ color: "var(--text-2)" }}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <GoogleSignInButton />
      )}

      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-20 items-stretch justify-around border-t"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {LINKS.map(({ to, label }, i) => {
          const Icon = i === 0 ? LayoutDashboard : i === 1 ? ClipboardList : Search;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? "" : ""}`}
              style={({ isActive }) => (isActive ? { color: "var(--accent)" } : { color: "var(--text-3)" })}
            >
              <Icon size={18} />
              {label === "Browse Stocks" ? "Browse" : label}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
