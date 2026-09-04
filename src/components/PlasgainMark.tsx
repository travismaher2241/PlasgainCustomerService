import React from "react";

interface PlasgainMarkProps {
  className?: string;
}

/**
 * The Plasgain arrows mark.
 *
 * Traced from the supplied logo raster, so it is an approximation — swap in the
 * official SVG path data when the brand asset is available. Colour is inherited
 * via `currentColor` so the mark can sit on ink or on paper.
 */
export const PlasgainMark: React.FC<PlasgainMarkProps> = ({ className }) => (
  <svg
    viewBox="0 0 26 26"
    className={className}
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M13 3.4a9.6 9.6 0 0 1 8.3 4.8l-2.9 1.2a6.5 6.5 0 0 0-9.6-2.2V9L4 5.9 8.8 2v1.9a9.6 9.6 0 0 1 4.2-.5Z" />
    <path d="M13 22.6a9.6 9.6 0 0 1-8.3-4.8l2.9-1.2a6.5 6.5 0 0 0 9.6 2.2V17l4.8 3.1L17.2 24v-1.9a9.6 9.6 0 0 1-4.2.5Z" />
  </svg>
);

interface PlasgainLockupProps {
  /** Renders the "Sales Workspace" sub-label beneath the wordmark. */
  showSub?: boolean;
}

/** Mark + wordmark, matching the logo lockup: PLAS in white, GAIN in brand green. */
export const PlasgainLockup: React.FC<PlasgainLockupProps> = ({ showSub = true }) => (
  <div>
    <div className="flex items-center gap-2.5">
      <PlasgainMark className="w-6 h-6 shrink-0 text-brand" />
      <div className="text-[1.25rem] leading-none font-bold tracking-[-0.03em] text-chrome-text">
        PLAS<span className="text-brand-lift">GAIN</span>
      </div>
    </div>
    {/* Tighter tracking than the usual eyebrow: at 0.16em this string measures
        190px against 196px of rail, so it wraps the moment the mono font falls
        back to Menlo. 0.09em leaves ~21px of headroom. */}
    {showSub && (
      <div className="u-eyebrow mt-1.5 text-[0.625rem] tracking-[0.09em] whitespace-nowrap text-chrome-dim">
        Sales Workspace
      </div>
    )}
  </div>
);
