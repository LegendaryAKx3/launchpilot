"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const result = await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
      if (result === null) {
        throw new Error("Failed to delete project");
      }
      router.push("/app/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm font-medium text-red-400">Delete "{projectName}"?</p>
        <p className="mt-1 text-sm text-fg-muted">
          This action cannot be undone. All project data will be permanently deleted.
        </p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Yes, delete project"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={deleting}
            className="rounded-lg border border-edge-subtle bg-surface-muted px-4 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      Delete Project
    </button>
  );
}
