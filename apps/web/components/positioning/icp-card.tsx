import { cn } from "@/lib/utils";

interface IcpCardProps {
  icp: string;
  selected?: boolean;
  onSelect?: () => void;
}

export function IcpCard({ icp, selected, onSelect }: IcpCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200",
        selected
          ? "border-accent bg-accent-subtle"
          : "border-edge-subtle bg-surface-muted hover:border-edge-muted hover:bg-surface-elevated"
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected
            ? "border-accent bg-accent"
            : "border-fg-faint group-hover:border-fg-muted"
        )}
      >
        {selected && (
          <svg
            className="h-3 w-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      <span
        className={cn(
          "font-medium transition-colors",
          selected ? "text-accent" : "text-fg-secondary group-hover:text-fg-primary"
        )}
      >
        {icp}
      </span>
    </button>
  );
}
