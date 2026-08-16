import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import type { AuthResponse } from "../types";

function PreviewFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden ${className}`} style={{ background: "#0F1218" }}>
      {children}
    </div>
  );
}

function MiniStatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg px-3.5 py-3 border border-[#2A303A]" style={{ background: "#171B22" }}>
      <div className="text-[9.5px] text-[#6B7585] uppercase tracking-wide font-semibold mb-0.5">{label}</div>
      <div className="text-[18px] font-bold tabular-nums" style={{ color: color || "#E2E6ED" }}>{value}</div>
    </div>
  );
}

function GoogleSignInButton({ size = "normal", className = "" }: { size?: "normal" | "large"; className?: string }) {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await userInfo.json();

        const data = await api.post<AuthResponse>("/api/auth/google-token", {
          access_token: tokenResponse.access_token,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          sub: profile.sub,
        });
        login(data.access_token, data.user);
        navigate("/dashboard");
      } catch {
        console.error("Login failed");
      }
    },
  });

  const isLarge = size === "large";

  return (
    <button
      onClick={() => googleLogin()}
      className={`inline-flex items-center gap-2.5 font-semibold rounded-[10px] border-none cursor-pointer text-white ${className}`}
      style={{
        background: "var(--accent)",
        padding: isLarge ? "12px 28px" : "8px 20px",
        fontSize: isLarge ? "15px" : "13px",
      }}
    >
      <svg width={isLarge ? 20 : 16} height={isLarge ? 20 : 16} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" opacity=".9"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".75"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#fff" opacity=".6"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
      </svg>
      Sign in with Google
    </button>
  );
}

export function LandingPage() {
  return (
    <div>
      {/* Nav */}
      <div className="flex justify-between items-center px-10 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5 font-bold text-[15px]">
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-white text-[13px] font-extrabold bg-gradient-to-br from-[#4AADE5] to-[#1a6fa0]">S</div>
          Singapore Dividends
        </div>
        <GoogleSignInButton />
      </div>

      {/* Hero */}
      <div className="flex items-center gap-12 max-w-[1100px] mx-auto mt-16 px-10 flex-wrap">
        <div className="flex-1 min-w-[320px]">
          <h1 className="text-[38px] font-extrabold leading-[1.12] tracking-tight mb-4" style={{ textWrap: "balance" }}>
            Your <span style={{ color: "var(--accent)" }}>Singapore dividend</span> portfolio, all in one place
          </h1>
          <p className="text-[16px] mb-7 max-w-[420px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Track holdings, visualize returns, monitor dividend income, and research every SGX stock — completely free.
          </p>
          <GoogleSignInButton size="large" />
        </div>
        <div className="flex-[1.2] min-w-[400px]">
          <PreviewFrame>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <MiniStatCard label="Total Value" value="$54,730" />
              <MiniStatCard label="Total Return" value="+13.9%" color="#34C578" />
              <MiniStatCard label="Fwd Yield" value="4.8%" color="#E5A84A" />
            </div>
            <div className="rounded-lg p-3.5 border border-[#2A303A]" style={{ background: "#171B22" }}>
              <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="w-full block">
                <path d="M0,60 L33,65 L66,50 L100,42 L133,52 L166,38 L200,32 L233,36 L266,24 L300,20 L333,10 L366,14 L400,8 L400,80 L0,80 Z" fill="rgba(74,173,229,0.12)" />
                <path d="M0,60 L33,65 L66,50 L100,42 L133,52 L166,38 L200,32 L233,36 L266,24 L300,20 L333,10 L366,14 L400,8" fill="none" stroke="#4AADE5" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
          </PreviewFrame>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-[1100px] mx-auto mt-20 px-10">
        <h2 className="text-[26px] font-bold tracking-tight text-center mb-12">Everything you need for dividend investing</h2>

        <div className="flex items-center gap-12 mb-14 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <h3 className="text-[18px] font-bold mb-2">Track every position and lot</h3>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              Add your stocks with purchase date, cost, and shares. See unrealised and realised gains, annualised returns, and dividend yield on cost — all calculated automatically. Add notes to remember your thesis or price targets.
            </p>
          </div>
          <div className="flex-[1.1]">
            <PreviewFrame>
              <div className="text-[11px] overflow-hidden rounded-lg border border-[#2A303A]" style={{ background: "#171B22" }}>
                {[
                  { cls: "text-[9px] uppercase tracking-wide font-semibold text-[#5A6375]", cells: ["Ticker", "Name", "Value", "Gain", "Yield"] },
                  { cells: [{ v: "D05.SI", c: "#4AADE5", bold: true }, { v: "DBS Group" }, { v: "$20,600", c: "#E2E6ED" }, { v: "+11.8%", c: "#34C578" }, { v: "4.2%", c: "#E5A84A" }] },
                  { cells: [{ v: "O39.SI", c: "#4AADE5", bold: true }, { v: "OCBC Bank" }, { v: "$15,800", c: "#E2E6ED" }, { v: "+14.5%", c: "#34C578" }, { v: "5.5%", c: "#E5A84A" }] },
                  { cells: [{ v: "C38U.SI", c: "#4AADE5", bold: true }, { v: "CapitaLand Int." }, { v: "$4,860", c: "#E2E6ED" }, { v: "+29.9%", c: "#34C578" }, { v: "5.1%", c: "#E5A84A" }] },
                ].map((row, ri) => (
                  <div key={ri} className={`flex gap-2 px-3 py-2 items-center ${ri > 0 ? "border-t border-[#222830]" : ""} ${row.cls || "text-[#8892A2]"}`}>
                    {row.cells.map((cell, ci) => {
                      const isObj = typeof cell === "object";
                      return (
                        <div key={ci} className={`tabular-nums ${ci === 0 ? "w-[70px] shrink-0" : ci === 1 ? "flex-[1.5]" : "flex-1 text-right"} ${isObj && cell.bold ? "font-bold" : ""}`} style={{ color: isObj ? cell.c : undefined }}>
                          {isObj ? cell.v : cell}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </PreviewFrame>
          </div>
        </div>

        <div className="flex items-center gap-12 mb-14 flex-wrap flex-row-reverse">
          <div className="flex-1 min-w-[280px]">
            <h3 className="text-[18px] font-bold mb-2">Visualize your portfolio</h3>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              See sector allocation at a glance, track portfolio value over time, and view monthly dividend income. Know exactly how much passive income your portfolio generates — projected and actual.
            </p>
          </div>
          <div className="flex-[1.1]">
            <PreviewFrame className="flex gap-3">
              <div className="flex-1 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full relative" style={{ background: "conic-gradient(#4AADE5 0% 66.5%, #6C7A8D 66.5% 84.3%, #E5A84A 84.3% 100%)" }}>
                  <div className="absolute rounded-full" style={{ inset: "25%", background: "#0F1218" }} />
                </div>
                <div className="text-[9px] text-[#6B7585] mt-2.5 text-center">Sector allocation</div>
              </div>
              <div className="flex-[1.5]">
                <div className="flex items-end gap-1 h-[70px] mb-1.5">
                  {[0, 45, 0, 55, 92, 38, 0, 68, 100, 0, 72, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ background: "#E5A84A", height: `${h}%`, minHeight: h ? "2px" : 0 }} />
                  ))}
                </div>
                <div className="text-[9px] text-[#6B7585] text-center">Monthly dividend income</div>
              </div>
            </PreviewFrame>
          </div>
        </div>

        <div className="flex items-center gap-12 mb-14 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <h3 className="text-[18px] font-bold mb-2">Research every SGX dividend stock</h3>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              Browse the full SGX universe. View price history, dividend track records, payout ratios, forward and trailing yields — no account required. Spot opportunities before you commit capital.
            </p>
          </div>
          <div className="flex-[1.1]">
            <PreviewFrame>
              <div className="rounded-lg p-4 border border-[#2A303A]" style={{ background: "#171B22" }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-[14px] font-bold text-[#E2E6ED]">DBS Group Holdings</div>
                    <div className="text-[11px] text-[#6B7585]">D05.SI · Financial Services</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[20px] font-bold text-[#E2E6ED] tabular-nums">$75.53</div>
                    <div className="text-[11px] text-[#34C578]">+0.32%</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Fwd Yield", value: "4.21%" },
                    { label: "Payout", value: "79.8%" },
                    { label: "Annual Div", value: "$3.18" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-md px-2.5 py-2" style={{ background: "#1E232B" }}>
                      <div className="text-[8px] text-[#5A6375] uppercase tracking-wide font-semibold">{m.label}</div>
                      <div className="text-[13px] font-bold text-[#E5A84A] tabular-nums mt-0.5">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </PreviewFrame>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-16 px-10 border-t flex flex-col items-center" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-[24px] font-bold tracking-tight mb-3">Start tracking your dividends</h2>
        <p className="text-[15px] mb-6" style={{ color: "var(--text-2)" }}>Free forever. No credit card. Sign in with Google to get started.</p>
        <GoogleSignInButton size="large" />
      </div>
    </div>
  );
}
