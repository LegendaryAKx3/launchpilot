"use client";

import { useCallback, useEffect, useState } from "react";

import { DrawerButton, DrawerField, DrawerInput, DrawerTextarea } from "@/components/ui/detail-drawer";

// Define field configurations for different asset types
const assetTypeFields: Record<string, { key: string; label: string; type: "input" | "textarea"; rows?: number }[]> = {
  landing_copy: [
    { key: "headline", label: "Headline", type: "input" },
    { key: "subheadline", label: "Subheadline", type: "input" },
    { key: "hero_copy", label: "Hero Copy", type: "textarea", rows: 4 },
    { key: "cta_text", label: "Call to Action", type: "input" },
    { key: "benefits", label: "Benefits", type: "textarea", rows: 6 }
  ],
  email_copy: [
    { key: "subject", label: "Subject Line", type: "input" },
    { key: "preview_text", label: "Preview Text", type: "input" },
    { key: "body", label: "Email Body", type: "textarea", rows: 10 },
    { key: "cta_text", label: "Call to Action", type: "input" },
    { key: "signature", label: "Signature", type: "textarea", rows: 3 }
  ],
  social_post: [
    { key: "platform", label: "Platform", type: "input" },
    { key: "content", label: "Post Content", type: "textarea", rows: 4 },
    { key: "hashtags", label: "Hashtags", type: "input" },
    { key: "cta", label: "Call to Action", type: "input" }
  ],
  blog_post: [
    { key: "title", label: "Title", type: "input" },
    { key: "meta_description", label: "Meta Description", type: "textarea", rows: 2 },
    { key: "introduction", label: "Introduction", type: "textarea", rows: 4 },
    { key: "body", label: "Body Content", type: "textarea", rows: 12 },
    { key: "conclusion", label: "Conclusion", type: "textarea", rows: 4 }
  ],
  image_ad: [
    { key: "headline", label: "Headline", type: "input" },
    { key: "body_copy", label: "Body Copy", type: "textarea", rows: 3 },
    { key: "cta", label: "Call to Action", type: "input" },
    { key: "image_description", label: "Image Description", type: "textarea", rows: 4 }
  ],
  video_script: [
    { key: "title", label: "Title", type: "input" },
    { key: "hook", label: "Opening Hook", type: "textarea", rows: 3 },
    { key: "script", label: "Script", type: "textarea", rows: 12 },
    { key: "cta", label: "Call to Action", type: "textarea", rows: 2 }
  ]
};

// Default fields for unknown asset types
const defaultFields = [
  { key: "title", label: "Title", type: "input" as const },
  { key: "content", label: "Content", type: "textarea" as const, rows: 8 }
];

interface AssetEditorProps {
  assetType: string;
  content: Record<string, unknown>;
  onSave: (content: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export function AssetEditor({ assetType, content, onSave, saving }: AssetEditorProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const fields = assetTypeFields[assetType] || defaultFields;

  useEffect(() => {
    const initialData: Record<string, string> = {};
    fields.forEach((field) => {
      const value = content[field.key];
      initialData[field.key] = typeof value === "string" ? value : "";
    });
    // Also preserve any extra fields from content
    Object.entries(content).forEach(([key, value]) => {
      if (!initialData[key] && typeof value === "string") {
        initialData[key] = value;
      }
    });
    setFormData(initialData);
  }, [content, fields]);

  const handleChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // Clean up empty values
      const cleanedData: Record<string, string> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value.trim()) {
          cleanedData[key] = value.trim();
        }
      });
      await onSave(cleanedData);
    },
    [formData, onSave]
  );

  // Detect any extra fields in content that aren't in the field config
  const extraFields = Object.entries(content).filter(
    ([key, value]) => !fields.some((f) => f.key === key) && typeof value === "string"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Configured fields */}
      {fields.map((field) => (
        <DrawerField key={field.key} label={field.label}>
          {field.type === "input" ? (
            <DrawerInput
              value={formData[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
          ) : (
            <DrawerTextarea
              value={formData[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              rows={field.rows || 4}
            />
          )}
        </DrawerField>
      ))}

      {/* Extra fields from content */}
      {extraFields.map(([key]) => (
        <DrawerField key={key} label={key.replace(/_/g, " ")}>
          <DrawerTextarea
            value={formData[key] || ""}
            onChange={(e) => handleChange(key, e.target.value)}
            rows={3}
          />
        </DrawerField>
      ))}

      {/* Submit button */}
      <div className="flex justify-end pt-4">
        <DrawerButton type="submit" variant="primary" loading={saving}>
          Save Changes
        </DrawerButton>
      </div>
    </form>
  );
}
