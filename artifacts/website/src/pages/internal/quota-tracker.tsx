import { type FormEvent, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import {
  useCreateQuotaEntry,
  useDeleteQuotaEntry,
  useQuotaEntries,
  useUpdateQuotaEntry,
  type QuotaEntry,
} from "@/hooks/use-quota-entries";

type FormState = {
  email: string;
  service: string;
  profile: string;
  resetAt: string;
};

const initialForm: FormState = {
  email: "",
  service: "chatgpt",
  profile: "",
  resetAt: "",
};

function toLocalDateInput(isoDate: string): string {
  const d = new Date(isoDate);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getStatus(resetAt: string): "ready" | "soon" | "waiting" {
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return "ready";
  if (ms <= 1000 * 60 * 60 * 24) return "soon";
  return "waiting";
}

function profileRank(profile: number | null): number {
  if (profile === 2) return 0;
  if (profile === 3) return 1;
  if (profile === 4) return 2;
  if (profile === 5) return 3;
  if (profile === 6) return 4;
  if (profile === 7) return 5;
  if (profile === 8) return 6;
  if (profile === 9) return 7;
  if (profile == null) return 9;
  return 8;
}

export default function QuotaTrackerPrivatePage() {
  const { data = [], isLoading, error } = useQuotaEntries();
  const createMutation = useCreateQuotaEntry();
  const updateMutation = useUpdateQuotaEntry();
  const deleteMutation = useDeleteQuotaEntry();

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const sortedRows = useMemo(
    () => [...data].sort((a, b) => {
      const rankDiff = profileRank(a.profile) - profileRank(b.profile);
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.resetAt).getTime() - new Date(b.resetAt).getTime();
    }),
    [data],
  );

  const stats = useMemo(() => {
    const ready = sortedRows.filter((r) => getStatus(r.resetAt) === "ready").length;
    const soon = sortedRows.filter((r) => getStatus(r.resetAt) === "soon").length;
    const waiting = sortedRows.filter((r) => getStatus(r.resetAt) === "waiting").length;
    return { ready, soon, waiting, total: sortedRows.length };
  }, [sortedRows]);

  function startEdit(row: QuotaEntry) {
    setEditingId(row.id);
    setForm({
      email: row.email,
      service: row.service,
      profile: row.profile ? String(row.profile) : "",
      resetAt: toLocalDateInput(row.resetAt),
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      email: form.email.trim(),
      service: form.service.trim().toLowerCase(),
      profile: form.profile ? Number(form.profile) : undefined,
      resetAt: new Date(form.resetAt).toISOString(),
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, input: payload });
      clearForm();
      return;
    }

    await createMutation.mutateAsync(payload);
    clearForm();
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Seo
        title="Quota Tracker"
        description="Private quota tracker for personal workflow"
        path="/internal/quota-tracker"
        noIndex
      />

      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Quota Tracker</h1>
      <p style={{ opacity: 0.75, marginBottom: 24 }}>
        Private URL only. Data is persisted on server DB (not browser storage).
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ padding: "10px 12px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, lineHeight: 1.15 }}>Total: {stats.total}</div>
        <div style={{ padding: "10px 12px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, lineHeight: 1.15 }}>Ready: {stats.ready}</div>
        <div style={{ padding: "10px 12px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, lineHeight: 1.15 }}>Soon: {stats.soon}</div>
        <div style={{ padding: "10px 12px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, lineHeight: 1.15 }}>Waiting: {stats.waiting}</div>
      </section>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          style={{ padding: 10 }}
        />
        <select
          value={form.profile}
          onChange={(e) => setForm((s) => ({ ...s, profile: e.target.value }))}
          style={{ padding: 10 }}
        >
          <option value="">Auto / Unknown</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={String(n)}>{`Win ${n}`}</option>
          ))}
        </select>
        <input
          required
          placeholder="Service"
          value={form.service}
          onChange={(e) => setForm((s) => ({ ...s, service: e.target.value }))}
          style={{ padding: 10 }}
        />
        <input
          required
          type="datetime-local"
          value={form.resetAt}
          onChange={(e) => setForm((s) => ({ ...s, resetAt: e.target.value }))}
          style={{ padding: 10 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button type="button" onClick={clearForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {isLoading && <p>Loading entries...</p>}
      {error && <p style={{ color: "crimson" }}>Could not load data.</p>}

      {!isLoading && (
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th align="left" style={{ width: 56, padding: "10px 8px", opacity: 0.7 }}>#</th>
              <th align="left" style={{ padding: "10px 8px" }}>Email</th>
              <th align="left" style={{ padding: "10px 8px", width: 140 }}>Service</th>
              <th align="left" style={{ padding: "10px 8px", width: 90 }}>Profile</th>
              <th align="left" style={{ padding: "10px 8px", width: 190 }}>Reset</th>
              <th align="left" style={{ padding: "10px 8px", width: 90 }}>Status</th>
              <th align="left" style={{ padding: "10px 8px", width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => {
              const status = getStatus(row.resetAt);
              return (
                <tr key={row.id}>
                  <td style={{ padding: "12px 8px", lineHeight: 1.1, opacity: 0.6 }}>{i + 1}</td>
                  <td style={{ padding: "12px 8px", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.email}</td>
                  <td style={{ padding: "12px 8px", lineHeight: 1.25 }}>{row.service}</td>
                  <td style={{ padding: "12px 8px", lineHeight: 1.25 }}>{row.profile ? `Win ${row.profile}` : "—"}</td>
                  <td style={{ padding: "12px 8px", lineHeight: 1.25 }}>{new Date(row.resetAt).toLocaleString()}</td>
                  <td style={{ padding: "12px 8px", lineHeight: 1.25 }}>{status}</td>
                  <td style={{ display: "flex", gap: 8, padding: "10px 8px" }}>
                    <button type="button" onClick={() => startEdit(row)}>Edit</button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
