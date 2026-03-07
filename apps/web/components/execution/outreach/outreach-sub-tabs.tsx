"use client";

import { cn } from "@/lib/utils";

export type OutreachSubTab = "contacts" | "batches";

interface OutreachSubTabsProps {
  activeTab: OutreachSubTab;
  onTabChange: (tab: OutreachSubTab) => void;
  contactCount?: number;
  batchCount?: number;
  pendingCount?: number;
}

export function OutreachSubTabs({
  activeTab,
  onTabChange,
  contactCount = 0,
  batchCount = 0,
  pendingCount = 0
}: OutreachSubTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-edge-subtle px-4">
      <button
        onClick={() => onTabChange("contacts")}
        className={cn(
          "relative flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
          activeTab === "contacts"
            ? "border-accent text-accent"
            : "border-transparent text-fg-muted hover:text-fg-secondary"
        )}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <span>Contacts</span>
        {contactCount > 0 && (
          <span className="rounded-full bg-surface-elevated px-1.5 py-0.5 text-xs text-fg-faint">
            {contactCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onTabChange("batches")}
        className={cn(
          "relative flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
          activeTab === "batches"
            ? "border-accent text-accent"
            : "border-transparent text-fg-muted hover:text-fg-secondary"
        )}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span>Email Batches</span>
        {batchCount > 0 && (
          <span className="rounded-full bg-surface-elevated px-1.5 py-0.5 text-xs text-fg-faint">
            {batchCount}
          </span>
        )}
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}
