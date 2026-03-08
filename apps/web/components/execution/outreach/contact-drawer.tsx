"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DetailDrawer,
  DrawerButton,
  DrawerField,
  DrawerInput,
  DrawerSelect
} from "@/components/ui/detail-drawer";
import { Contact } from "./contacts-list";

interface ContactDrawerProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contactId: string, updates: Partial<Contact>) => Promise<void>;
  onDelete: (contactId: string) => Promise<void>;
}

export function ContactDrawer({ contact, isOpen, onClose, onSave, onDelete }: ContactDrawerProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.name || "");
      setEmail(contact.email || "");
      setSegment(contact.segment || "manual");
      setShowDeleteConfirm(false);
    }
  }, [contact]);

  const handleSave = useCallback(async () => {
    if (!contact || !email.trim()) return;

    setSaving(true);
    try {
      await onSave(contact.id, {
        name: name.trim() || undefined,
        email: email.trim(),
        segment
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [contact, name, email, segment, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    if (!contact) return;
    setSaving(true);
    try {
      await onDelete(contact.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [contact, onDelete, onClose]);

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Contact"
      subtitle={contact?.email}
      footer={
        <div className="flex items-center justify-between">
          {showDeleteConfirm ? (
            <div className="w-full rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-400">
                Delete "{contact?.name || contact?.email}"?
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                This action cannot be undone. The contact and its outreach references will be removed.
              </p>
              <div className="mt-4 flex gap-2">
                <DrawerButton variant="destructive" onClick={handleDelete} loading={saving}>
                  {saving ? "Deleting..." : "Yes, delete contact"}
                </DrawerButton>
                <DrawerButton variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                  Cancel
                </DrawerButton>
              </div>
            </div>
          ) : (
            <DrawerButton variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={saving}>
              Delete Contact
            </DrawerButton>
          )}
          <div className="flex items-center gap-2">
            <DrawerButton variant="secondary" onClick={onClose}>
              Cancel
            </DrawerButton>
            <DrawerButton variant="primary" onClick={handleSave} loading={saving}>
              Save Changes
            </DrawerButton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-purple-500 text-xl font-semibold text-white">
            {(name || email || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-fg-primary">{name || email || "Unknown"}</p>
            <p className="text-xs text-fg-muted">Contact details</p>
          </div>
        </div>

        {/* Name */}
        <DrawerField label="Name">
          <DrawerInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter contact name..."
          />
        </DrawerField>

        {/* Email */}
        <DrawerField label="Email">
          <DrawerInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address..."
            type="email"
          />
        </DrawerField>

        {/* Segment */}
        <DrawerField label="Segment">
          <DrawerSelect value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="manual">Manual</option>
            <option value="imported">Imported</option>
            <option value="lead">Lead</option>
            <option value="customer">Customer</option>
            <option value="partner">Partner</option>
            <option value="press">Press</option>
            <option value="investor">Investor</option>
          </DrawerSelect>
        </DrawerField>
      </div>
    </DetailDrawer>
  );
}
