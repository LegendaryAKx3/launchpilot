"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Asset } from "./assets-list";
import { AssetEditor } from "./asset-editor";

const assetTypeLabels: Record<string, string> = {
  landing_copy: "Landing Page Copy",
  email_copy: "Email Copy",
  cold_email: "Cold Email",
  cold_dm: "Cold DM",
  social_post: "Social Post",
  blog_post: "Blog Post",
  image_ad: "Image Ad",
  image_ad_prompt: "Image Ad Prompt",
  video_script: "Video Script"
};

interface AssetDetailProps {
  asset: Asset;
  onSave: (assetId: string, updates: Partial<Asset>) => Promise<void>;
  onStatusChange: (assetId: string, status: string) => Promise<void>;
  onDelete: (assetId: string) => Promise<void>;
}

export function AssetDetail({ asset, onSave, onStatusChange, onDelete }: AssetDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge-subtle px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-lg font-semibold text-fg-primary">
              {asset.title || assetTypeLabels[asset.asset_type] || asset.asset_type}
            </h2>
            <StatusBadge status={asset.status} />
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            {assetTypeLabels[asset.asset_type] || asset.asset_type.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
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
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                Delete
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

      {showDeleteConfirm && (
        <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-400">
            Delete "{asset.title || assetTypeLabels[asset.asset_type] || asset.asset_type}"?
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            This action cannot be undone. Asset content and prompt data will be permanently removed.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  await onDelete(asset.id);
                } finally {
                  setSaving(false);
                  setShowDeleteConfirm(false);
                }
              }}
              disabled={saving}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {saving ? "Deleting..." : "Yes, delete asset"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={saving}
              className="rounded-lg border border-edge-subtle bg-surface-muted px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-elevated disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

// Fields to hide from preview (meta/internal fields that clutter the UI)
const hiddenFields = new Set([
  "channel",
  "variation_label",
  "hook_angle",
  "platform",
  "reply_handling",
  "follow_up_1",
  "follow_up_2",
  "visual_concept",
  "target_emotion",
  "headline_overlay",
  "cta_overlay",
  "text_overlays",
  "music_mood",
  "duration"
]);

// Friendly labels for common fields
const fieldLabels: Record<string, string> = {
  message: "Message",
  follow_up: "Follow-up",
  subject: "Subject Line",
  preview_text: "Preview",
  body: "Body",
  cta: "Call to Action",
  generation_prompt: "Image Prompt",
  hook: "Opening Hook",
  script: "Script"
};

function AssetPreview({ asset }: { asset: Asset }) {
  const content = asset.content || {};

  // Filter out hidden fields
  const visibleEntries = Object.entries(content).filter(
    ([key]) => !hiddenFields.has(key)
  );

  if (visibleEntries.length === 0) {
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
      {visibleEntries.map(([key, value]) => (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-medium capitalize text-fg-secondary">
            {fieldLabels[key] || key.replace(/_/g, " ")}
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
