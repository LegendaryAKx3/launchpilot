"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Asset } from "./assets-list";
import { AssetEditor } from "./asset-editor";

const assetTypeLabels: Record<string, string> = {
  landing_copy: "Landing Page Copy",
  email_copy: "Email Copy",
  social_post: "Social Post",
  blog_post: "Blog Post",
  image_ad: "Image Ad",
  video_script: "Video Script"
};

interface AssetDetailProps {
  asset: Asset;
  onSave: (assetId: string, updates: Partial<Asset>) => Promise<void>;
  onStatusChange: (assetId: string, status: string) => Promise<void>;
}

export function AssetDetail({ asset, onSave, onStatusChange }: AssetDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(
    async (content: Record<string, unknown>) => {
      setSaving(true);
      try {
        await onSave(asset.id, { content });
        setIsEditing(false);
      } finally {
        setSaving(false);
      }
    },
    [asset.id, onSave]
  );

  const handleMarkReady = useCallback(async () => {
    setSaving(true);
    try {
      await onStatusChange(asset.id, "ready");
    } finally {
      setSaving(false);
    }
  }, [asset.id, onStatusChange]);

  const handleMarkDraft = useCallback(async () => {
    setSaving(true);
    try {
      await onStatusChange(asset.id, "draft");
    } finally {
      setSaving(false);
    }
  }, [asset.id, onStatusChange]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-edge-subtle px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-fg-primary">
              {asset.title || assetTypeLabels[asset.asset_type] || asset.asset_type}
            </h2>
            <StatusBadge status={asset.status} />
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {assetTypeLabels[asset.asset_type] || asset.asset_type.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              {asset.status === "draft" ? (
                <button
                  onClick={handleMarkReady}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark Ready
                </button>
              ) : (
                <button
                  onClick={handleMarkDraft}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg border border-edge-subtle px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-elevated disabled:opacity-50"
                >
                  Revert to Draft
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-edge-subtle px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-elevated"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <AssetEditor
            assetType={asset.asset_type}
            content={asset.content || {}}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <AssetPreview asset={asset} />
        )}
      </div>
    </div>
  );
}

function AssetPreview({ asset }: { asset: Asset }) {
  const content = asset.content || {};

  if (Object.keys(content).length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <p className="text-fg-muted">No content generated yet</p>
          <p className="mt-1 text-sm text-fg-faint">
            Use the chat to generate content for this asset
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(content).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium capitalize text-fg-secondary">
            {key.replace(/_/g, " ")}
          </label>
          <div
            className={cn(
              "rounded-lg border border-edge-subtle bg-surface-muted p-4",
              typeof value === "string" && value.length > 200 && "whitespace-pre-wrap"
            )}
          >
            {typeof value === "string" ? (
              <p className="text-sm text-fg-primary">{value}</p>
            ) : Array.isArray(value) ? (
              <ul className="list-inside list-disc space-y-1">
                {value.map((item, index) => (
                  <li key={index} className="text-sm text-fg-primary">
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="text-sm text-fg-primary">
                {JSON.stringify(value, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
