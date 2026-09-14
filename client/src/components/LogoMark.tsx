import { useId } from "react";

/**
 * A coin with a bite taken out, and a smaller coin -- the dividend -- floating
 * free of that exact notch with a fading trail. Colors are fixed brand colors
 * (not theme tokens): a muted version of the app's accent blue and dividend
 * indigo, so the mark itself carries the same "indigo means cash" meaning as
 * the rest of the app.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  const maskId = useId();

  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${maskId}-grad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4c819d" />
          <stop offset="100%" stopColor="#406f88" />
        </linearGradient>
        <mask id={`${maskId}-bite`}>
          <rect x="0" y="0" width="52" height="48" fill="#fff" />
          <circle cx="35" cy="13" r="9" fill="#000" />
        </mask>
      </defs>
      <rect width="72" height="72" rx="18" fill={`url(#${maskId}-grad)`} />
      <g transform="translate(10,12) scale(1.05)">
        <circle cx="21" cy="26" r="15" fill="#ffffff" mask={`url(#${maskId}-bite)`} />
        <circle cx="36" cy="12" r="1.5" fill="#594995" opacity="0.4" />
        <circle cx="39" cy="8.5" r="1" fill="#594995" opacity="0.6" />
        <circle cx="42" cy="4.5" r="7" fill="#594995" />
      </g>
    </svg>
  );
}
