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

  useEffect(() => {
    if (contact) {
      setName(contact.name || "");
      setEmail(contact.email || "");
      setSegment(contact.segment || "manual");
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
    if (window.confirm("Are you sure you want to delete this contact?")) {
      setSaving(true);
      try {
        await onDelete(contact.id);
        onClose();
      } finally {
        setSaving(false);
      }
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
          <DrawerButton variant="destructive" onClick={handleDelete} loading={saving}>
            Delete Contact
          </DrawerButton>
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
