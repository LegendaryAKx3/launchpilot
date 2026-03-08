"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

export interface Asset {
  id: string;
  asset_type: string;
  title?: string;
  content?: Record<string, unknown>;
  status: string;
  storage_path?: string;
}

const assetTypeLabels: Record<string, string> = {
  landing_copy: "Landing Page",
  email_copy: "Email",
  cold_email: "Cold Email",
  cold_dm: "Cold DM",
  social_post: "Social Post",
  blog_post: "Blog Post",
  image_ad: "Image Ad",
  image_ad_prompt: "Image Ad Prompt",
  video_script: "Video Script"
};

const assetTypeIcons: Record<string, string> = {
  landing_copy: "📄",
  email_copy: "✉️",
  cold_email: "✉️",
  cold_dm: "💬",
  social_post: "📱",
  blog_post: "📝",
  image_ad: "🖼️",
  image_ad_prompt: "🖼️",
  video_script: "🎬"
};

interface AssetsListProps {
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string | null) => void;
}

export function AssetsList({ assets, selectedAssetId, onSelectAsset }: AssetsListProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const assetTypes = [...new Set(assets.map((a) => a.asset_type))];
  const filteredAssets = filter ? assets.filter((a) => a.asset_type === filter) : assets;

  if (assets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
          <svg className="h-8 w-8 text-fg-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-fg-primary">No assets yet</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Use the chat to generate landing copy, emails, and more
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with filter */}
      <div className="border-b border-edge-subtle px-4 py-3">
        <h3 className="text-sm font-semibold text-fg-primary">Generated Assets</h3>
        <p className="mt-0.5 text-xs text-fg-muted">{assets.length} asset{assets.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Type filters */}
      {assetTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-edge-subtle p-3">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === null
                ? "bg-accent text-white"
                : "bg-surface-elevated text-fg-muted hover:text-fg-secondary"
            )}
          >
            All
          </button>
          {assetTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? null : type)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === type
                  ? "bg-accent text-white"
                  : "bg-surface-elevated text-fg-muted hover:text-fg-secondary"
              )}
            >
              {assetTypeLabels[type] || type}
            </button>
          ))}
        </div>
      )}

      {/* Assets grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-3">
          {filteredAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(selectedAssetId === asset.id ? null : asset.id)}
              className={cn(
                "group w-full rounded-xl border p-4 text-left transition-all",
                selectedAssetId === asset.id
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-edge-subtle bg-surface-elevated hover:border-edge-muted"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-muted text-lg">
                  {assetTypeIcons[asset.asset_type] || "📦"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-fg-primary truncate">
                      {asset.title || assetTypeLabels[asset.asset_type] || asset.asset_type}
                    </span>
                    <StatusBadge status={asset.status} />
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    {assetTypeLabels[asset.asset_type] || asset.asset_type.replace(/_/g, " ")}
                  </p>

                  {/* Preview */}
                  {asset.content && typeof asset.content === "object" && (
                    <p className="mt-2 text-xs text-fg-faint line-clamp-2">
                      {getPreviewText(asset.content)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Fields to skip when generating preview text
const skipPreviewFields = new Set([
  "channel",
  "variation_label",
  "hook_angle",
  "platform",
  "reply_handling",
  "visual_concept",
  "target_emotion",
  "headline_overlay",
  "cta_overlay",
  "music_mood",
  "duration"
]);

function getPreviewText(content: Record<string, unknown>): string {
  // Priority fields for different asset types
  const priorityFields = [
    "message",           // cold_dm
    "subject",           // cold_email
    "generation_prompt", // image_ad_prompt
    "hook",              // video_script
    "script",            // video_script
    "headline",          // landing_copy
    "body",              // email
    "content"            // generic
  ];

  for (const field of priorityFields) {
    if (content[field] && typeof content[field] === "string") {
      return content[field] as string;
    }
  }

  // Fallback to first non-meta string value
  for (const [key, value] of Object.entries(content)) {
    if (!skipPreviewFields.has(key) && typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return "";
}
