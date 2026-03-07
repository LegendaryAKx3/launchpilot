export default function MemoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-fg-primary">Project Memory</h2>
        <p className="text-sm text-fg-secondary">Persisted decisions, preferences, hooks, and rejected directions.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-edge-subtle bg-surface-elevated p-4">
          <h3 className="text-sm font-medium text-fg-primary">Decisions</h3>
          <ul className="mt-2 space-y-1 text-sm text-fg-secondary">
            <li>Selected wedge: Hackathon to first users</li>
            <li>Primary channel: Email outreach</li>
          </ul>
        </section>
        <section className="rounded-lg border border-edge-subtle bg-surface-elevated p-4">
          <h3 className="text-sm font-medium text-fg-primary">Objections</h3>
          <ul className="mt-2 space-y-1 text-sm text-fg-secondary">
            <li>"Why not just use generic chat tools?"</li>
            <li>"Will this work for tiny audiences?"</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
