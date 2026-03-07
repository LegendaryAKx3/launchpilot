export default function ProjectSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-fg-primary">Project Settings</h2>
        <p className="text-sm text-fg-secondary">Metadata, source docs, connected accounts, and project controls.</p>
      </header>

      <section className="rounded-lg border border-edge-subtle bg-surface-elevated p-4">
        <h3 className="text-sm font-medium text-fg-primary">General</h3>
        <p className="mt-2 text-sm text-fg-secondary">Update project summary, goal, and URLs.</p>
      </section>

      <section className="rounded-lg border border-edge-subtle bg-surface-elevated p-4">
        <h3 className="text-sm font-medium text-fg-primary">Connected Accounts</h3>
        <p className="mt-2 text-sm text-fg-secondary">GitHub: linked. Google: linked. Token Vault: optional.</p>
      </section>
    </div>
  );
}
