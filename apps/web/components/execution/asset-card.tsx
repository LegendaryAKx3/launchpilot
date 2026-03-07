import { StatusBadge } from "@/components/ui/status-badge";

interface Asset {
  title?: string;
  asset_type: string;
  status: string;
}

const assetIcons: Record<string, string> = {
  email_copy: "✉️",
  landing_copy: "📄",
  image_ad: "🖼️",
  social_post: "📱",
  blog_post: "📝"
};

export function AssetCard({ asset }: { asset: Asset }) {
  const icon = assetIcons[asset.asset_type] ?? "📦";

  return (
    <div className="group relative rounded-xl border border-edge-subtle bg-surface-muted p-4 transition-all duration-200 hover:border-edge-muted">
      {/* Asset type badge */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated text-lg">
          {icon}
        </div>
        <StatusBadge status={asset.status} />
      </div>

      <p className="font-medium text-fg-primary">{asset.title ?? asset.asset_type}</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-wider text-fg-faint">
        {asset.asset_type.replace(/_/g, " ")}
      </p>

      {/* Hover actions */}
      <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button className="flex-1 rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium text-fg-secondary transition-colors hover:bg-surface-overlay">
          Preview
        </button>
        <button className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover">
          Edit
        </button>
      </div>
    </div>
  );
}
