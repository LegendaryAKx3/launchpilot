"use client";

import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { DrawerButton, DrawerField, DrawerInput } from "@/components/ui/detail-drawer";

export interface Contact {
  id: string;
  name?: string;
  email?: string;
  segment?: string;
}

interface ContactsListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (contactId: string | null) => void;
  onAddContact: (name: string, email: string) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
}

export function ContactsList({
  contacts,
  selectedContactId,
  onSelectContact,
  onAddContact,
  onDeleteContact
}: ContactsListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await onAddContact(newName.trim(), newEmail.trim());
      setNewName("");
      setNewEmail("");
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  }, [newName, newEmail, onAddContact]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, contactId: string) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this contact?")) {
        await onDeleteContact(contactId);
      }
    },
    [onDeleteContact]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-edge-subtle px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-fg-primary">Contacts</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </button>
      </div>

      {/* Add contact form */}
      {showAddForm && (
        <div className="border-b border-edge-subtle bg-surface-subtle/50 p-4">
          <div className="space-y-3">
            <DrawerField label="Name (optional)">
              <DrawerInput
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="John Doe"
              />
            </DrawerField>
            <DrawerField label="Email">
              <DrawerInput
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="john@example.com"
                type="email"
              />
            </DrawerField>
            <div className="flex justify-end gap-2">
              <DrawerButton variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </DrawerButton>
              <DrawerButton
                variant="primary"
                onClick={handleAdd}
                loading={adding}
                disabled={!newEmail.trim()}
              >
                Add Contact
              </DrawerButton>
            </div>
          </div>
        </div>
      )}

      {/* Contacts list */}
      <div className="flex-1 overflow-y-auto p-3">
        {contacts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
              <svg className="h-8 w-8 text-fg-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-fg-primary">No contacts yet</h3>
            <p className="mt-1 text-xs text-fg-muted">
              Add contacts manually or use the chat to import them
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => onSelectContact(selectedContactId === contact.id ? null : contact.id)}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all",
                  selectedContactId === contact.id
                    ? "border-accent bg-accent/5 shadow-sm"
                    : "border-edge-subtle bg-surface-elevated hover:border-edge-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-purple-500 text-sm font-medium text-white">
                    {(contact.name || contact.email || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div>
                    <p className="text-sm font-medium text-fg-primary">
                      {contact.name || contact.email}
                    </p>
                    {contact.name && (
                      <p className="text-xs text-fg-muted">{contact.email}</p>
                    )}
                    {contact.segment && (
                      <span className="mt-1 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg-faint">
                        {contact.segment}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, contact.id)}
                  className="rounded-lg p-2 text-fg-faint opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
