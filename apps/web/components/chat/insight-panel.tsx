"use client";

import { ReactNode, useState } from "react";

interface InsightSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
  accentColor?: "blue" | "emerald" | "amber" | "purple";
}

export function InsightSection({
  title,
  icon,
  children,
  defaultOpen = true,
  count,
  accentColor = "blue"
}: InsightSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const accentClasses = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20"
  };

  const iconAccent = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    purple: "text-purple-400"
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-gradient-to-br ${accentClasses[accentColor]} transition-all duration-200`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className={`${iconAccent[accentColor]}`}>{icon}</div>
          <span className="text-sm font-medium text-fg-primary">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-fg-muted">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-white/10 p-4">{children}</div>
      </div>
    </div>
  );
}

interface InsightPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function InsightPanel({ title, subtitle, children, actions }: InsightPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-edge-subtle bg-surface-subtle/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

interface InsightCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
}

export function InsightCard({ title, value, subtitle, trend, icon }: InsightCardProps) {
  return (
    <div className="rounded-lg border border-edge-subtle bg-surface-elevated p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-fg-muted">{title}</p>
          <p className="mt-1 text-lg font-semibold text-fg-primary">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-fg-faint">{subtitle}</p>}
        </div>
        {icon && <div className="text-fg-muted">{icon}</div>}
        {trend && (
          <div
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-400"
                : trend === "down"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-surface-muted text-fg-muted"
            }`}
          >
            {trend === "up" ? "+" : trend === "down" ? "-" : "~"}
          </div>
        )}
      </div>
    </div>
  );
}

interface InsightListItemProps {
  title: string;
  description?: string;
  badge?: string;
  badgeColor?: "blue" | "emerald" | "amber" | "purple" | "red";
  onClick?: () => void;
}

export function InsightListItem({
  title,
  description,
  badge,
  badgeColor = "blue",
  onClick
}: InsightListItemProps) {
  const badgeClasses = {
    blue: "bg-blue-500/10 text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    purple: "bg-purple-500/10 text-purple-400",
    red: "bg-red-500/10 text-red-400"
  };

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`block w-full rounded-lg border border-edge-subtle bg-surface-elevated p-3 text-left transition-all ${
        onClick ? "cursor-pointer hover:border-edge-muted hover:bg-surface-overlay" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg-primary truncate">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-fg-muted line-clamp-2">{description}</p>
          )}
        </div>
        {badge && (
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClasses[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
    </Component>
  );
}

export function InsightEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
        <svg className="h-6 w-6 text-fg-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm text-fg-muted">{message}</p>
    </div>
  );
}
