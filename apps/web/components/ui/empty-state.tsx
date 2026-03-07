import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="group flex flex-col items-center rounded-xl border-2 border-dashed border-edge-subtle bg-surface-subtle/50 p-8 text-center transition-colors hover:border-edge-muted">
      {/* Icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-fg-muted transition-colors group-hover:bg-accent/10 group-hover:text-accent">
        {icon || (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        )}
      </div>

      <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>

      {action && (
        <Link
          href={action.href}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
