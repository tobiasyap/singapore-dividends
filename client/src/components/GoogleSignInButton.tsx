import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import type { AuthResponse } from "../types";

export function GoogleSignInButton({ size = "normal", className = "" }: { size?: "normal" | "large"; className?: string }) {
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
