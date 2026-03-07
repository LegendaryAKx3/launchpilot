import { cn } from "@/lib/utils";

const styles: Record<string, { dot: string; text: string; bg: string }> = {
  pending: {
    dot: "bg-amber-400",
    text: "text-amber-400",
    bg: "bg-amber-400/10"
  },
  running: {
    dot: "bg-blue-400 animate-pulse",
    text: "text-blue-400",
    bg: "bg-blue-400/10"
  },
  succeeded: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10"
  },
  completed: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10"
  },
  failed: {
    dot: "bg-red-400",
    text: "text-red-400",
    bg: "bg-red-400/10"
  },
  active: {
    dot: "bg-accent",
    text: "text-accent",
    bg: "bg-accent/10"
  },
  selected: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10"
  },
  draft: {
    dot: "bg-fg-faint",
    text: "text-fg-muted",
    bg: "bg-fg-faint/10"
  },
  approved: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10"
  },
  rejected: {
    dot: "bg-red-400",
    text: "text-red-400",
    bg: "bg-red-400/10"
  },
  default: {
    dot: "bg-fg-muted",
    text: "text-fg-secondary",
    bg: "bg-fg-muted/10"
  }
};

export function StatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? styles.default;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        style.bg,
        style.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {status}
    </span>
  );
}
