import React from "react";

/**
 * Shared layout primitives, extracted from the Home dashboard rework.
 *
 * The rule they encode: related items belong on ONE plane separated by rules,
 * not in a stack of individually bordered cards. Elevation is reserved for
 * things that genuinely float (modals, popovers, the copilot).
 */

export type Tone = "urgent" | "soon" | "hold" | "neutral" | "brand";

const STRIPE: Record<Tone, string> = {
  urgent: "bg-urgent",
  soon: "bg-soon",
  hold: "bg-hold",
  neutral: "bg-line-strong",
  brand: "bg-brand"
};

const CHIP: Record<Tone, string> = {
  urgent: "text-urgent border-urgent bg-urgent-wash",
  soon: "text-soon border-soon bg-soon-wash",
  hold: "text-hold border-hold bg-hold-wash",
  neutral: "text-ink-dim border-line-strong",
  brand: "text-brand-deep border-brand-edge bg-brand-wash"
};

const VALUE: Record<Tone, string> = {
  urgent: "text-urgent",
  soon: "text-soon",
  hold: "text-hold",
  neutral: "text-ink-faint",
  brand: "text-brand-deep"
};

/* -------------------------------------------------------------------------- */

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
}

/** A single bordered plane. Rows live inside it; it carries no shadow. */
export const Surface: React.FC<SurfaceProps> = ({ children, className = "" }) => (
  <div className={`border border-line bg-surface ${className}`}>{children}</div>
);

/* -------------------------------------------------------------------------- */

interface SectionHeadProps {
  title: string;
  /** Short count or status, set in mono. */
  meta?: string;
  action?: React.ReactNode;
  id?: string;
}

export const SectionHead: React.FC<SectionHeadProps> = ({ title, meta, action, id }) => (
  <div className="flex items-baseline gap-3 mb-3">
    <h2 id={id} className="text-lead font-semibold text-ink">
      {title}
    </h2>
    {meta && (
      <span className="u-data text-spec text-ink-faint uppercase tracking-[0.09em]">{meta}</span>
    )}
    {action && <div className="ml-auto">{action}</div>}
  </div>
);

/* -------------------------------------------------------------------------- */

interface ListRowProps {
  /** Drives the severity stripe. */
  tone?: Tone;
  children: React.ReactNode;
  /** Right-aligned controls. */
  actions?: React.ReactNode;
  onClick?: () => void;
}

/**
 * One ruled row with a 3px severity stripe. Rows separate themselves with a
 * bottom rule, so a parent Surface needs no extra dividers.
 */
export const ListRow: React.FC<ListRowProps> = ({ tone = "neutral", children, actions, onClick }) => {
  const interactive = Boolean(onClick);
  return (
    <article
      onClick={onClick}
      className={`grid grid-cols-[3px_1fr] ${
        actions ? "md:grid-cols-[3px_1fr_auto]" : ""
      } border-b border-line last:border-b-0 hover:bg-raised transition-colors ${
        interactive ? "cursor-pointer" : ""
      }`}
    >
      <div className={STRIPE[tone]} aria-hidden="true"></div>
      <div className="py-4 pl-4 pr-4 min-w-0">{children}</div>
      {actions && (
        <div className="col-start-2 md:col-start-3 flex items-center gap-1.5 pb-4 md:py-4 pl-4 md:pl-0 pr-4">
          {actions}
        </div>
      )}
    </article>
  );
};

/* -------------------------------------------------------------------------- */

interface ChipProps {
  children: React.ReactNode;
  tone?: Tone;
}

/** Small uppercase mono label. Encodes state in form as well as colour. */
export const Chip: React.FC<ChipProps> = ({ children, tone = "neutral" }) => (
  <span className={`u-eyebrow px-1.5 py-0.5 border ${CHIP[tone]}`}>{children}</span>
);

/* -------------------------------------------------------------------------- */

export interface StatCellProps {
  value: React.ReactNode;
  label: string;
  /** One line naming what the number refers to. */
  note?: string;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

/**
 * A strip of figures on one plane, hairline-separated. Replaces rows of
 * individually bordered stat cards.
 */
export const StatStrip: React.FC<{ cells: StatCellProps[] }> = ({ cells }) => (
  <div
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-px bg-line border border-line"
    style={{ gridTemplateColumns: `repeat(${Math.min(cells.length, 4)}, minmax(0, 1fr))` }}
  >
    {cells.map((c, i) => {
      const Tag = c.onClick ? "button" : "div";
      return (
        <Tag
          key={i}
          {...(c.onClick
            ? {
                onClick: c.onClick,
                disabled: c.disabled,
                "aria-pressed": c.active,
                type: "button" as const
              }
            : {})}
          className={`text-left px-4 py-3.5 flex flex-col gap-1 transition-colors ${
            c.disabled
              ? "bg-surface cursor-default"
              : c.onClick
              ? c.active
                ? "bg-raised cursor-pointer ring-1 ring-inset ring-brand-edge"
                : "bg-surface hover:bg-raised cursor-pointer"
              : "bg-surface"
          }`}
        >
          <div className="flex items-baseline gap-2">
            <span
              className={`u-data text-head leading-none font-medium ${
                c.disabled ? "text-ink-faint" : VALUE[c.tone ?? "neutral"]
              }`}
            >
              {c.value}
            </span>
            <span className="u-eyebrow text-ink-dim">{c.label}</span>
          </div>
          {c.note && <span className="text-spec text-ink-faint truncate">{c.note}</span>}
        </Tag>
      );
    })}
  </div>
);
