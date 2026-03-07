"use client";

import { cn } from "@/lib/utils";

export type ExecutionTab = "plans" | "assets" | "outreach";

interface ExecutionTabsProps {
  activeTab: ExecutionTab;
  onTabChange: (tab: ExecutionTab) => void;
  counts?: {
    plans?: number;
    assets?: number;
    contacts?: number;
    pendingBatches?: number;
  };
}

const tabs: { id: ExecutionTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "outreach",
    label: "Outreach",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    )
  },
  {
    id: "assets",
    label: "Assets",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    )
  },
  {
    id: "plans",
    label: "Plans",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    )
  }
];

export function ExecutionTabs({ activeTab, onTabChange, counts }: ExecutionTabsProps) {
  const getCount = (tabId: ExecutionTab) => {
    switch (tabId) {
      case "plans":
        return counts?.plans;
      case "assets":
        return counts?.assets;
      case "outreach":
        return counts?.contacts;
      default:
        return undefined;
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-subtle p-1">
      {tabs.map((tab) => {
        const count = getCount(tab.id);
        const isActive = activeTab === tab.id;
        const hasPending = tab.id === "outreach" && (counts?.pendingBatches ?? 0) > 0;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-surface-elevated text-fg-primary shadow-sm"
                : "text-fg-muted hover:text-fg-secondary"
            )}
          >
            <span className={cn(isActive && "text-accent")}>{tab.icon}</span>
            <span>{tab.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-elevated text-fg-faint"
                )}
              >
                {count}
              </span>
            )}
            {hasPending && (
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
