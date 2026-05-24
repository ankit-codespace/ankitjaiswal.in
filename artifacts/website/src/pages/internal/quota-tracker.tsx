import { useState, useMemo, type FormEvent } from "react";
import { Seo } from "@/components/Seo";
import { tokens } from "@/components/tool/tokens";
import {
  useQuotaEntries,
  useCreateQuotaEntry,
  useUpdateQuotaEntry,
  useDeleteQuotaEntry,
  type QuotaEntry
} from "@/hooks/use-quota-entries";
import {
  Clock, Plus, Trash2, Edit3, Folder, User, Server, AlertCircle, CheckCircle2, Calendar, EyeOff
} from "lucide-react";

type FormState = {
  email: string;
  service: string;
  folder: string;
  profile: string;
  resetDate: string;
  resetTime: string;
};

const initialForm: FormState = {
  email: "",
  service: "chatgpt",
  folder: "",
  profile: "",
  resetDate: "",
  resetTime: "",
};

function toLocalDateTimeParts(isoDate: string): { date: string; time: string } {
  const d = new Date(isoDate);
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localIso = new Date(d.getTime() - tzOffset).toISOString();
  return { date: localIso.slice(0, 10), time: localIso.slice(11, 16) };
}

function combineLocalDateTime(date: string, time: string): string {
  const dt = `${date}T${time || "00:00"}`;
  return new Date(dt).toISOString();
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
  const { data = [], isLoading, error, refetch } = useQuotaEntries();
  const createMutation = useCreateQuotaEntry();
  const updateMutation = useUpdateQuotaEntry();
  const deleteMutation = useDeleteQuotaEntry();

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sortedRows = useMemo(() => {
    return [...data]
      .filter((row) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          row.email.toLowerCase().includes(query) ||
          row.service.toLowerCase().includes(query) ||
          (row.folder && row.folder.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const rankDiff = profileRank(a.profile) - profileRank(b.profile);
        if (rankDiff !== 0) return rankDiff;
        return new Date(a.resetAt).getTime() - new Date(b.resetAt).getTime();
      });
  }, [data, searchQuery]);

  const folderSuggestions = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((r) => r.folder?.trim())
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const stats = useMemo(() => {
    const ready = data.filter((r) => getStatus(r.resetAt) === "ready").length;
    const soon = data.filter((r) => getStatus(r.resetAt) === "soon").length;
    const waiting = data.filter((r) => getStatus(r.resetAt) === "waiting").length;
    return { ready, soon, waiting, total: data.length };
  }, [data]);

  function startEdit(row: QuotaEntry) {
    const { date, time } = toLocalDateTimeParts(row.resetAt);
    setEditingId(row.id);
    setForm({
      email: row.email,
      service: row.service,
      folder: row.folder ?? "",
      profile: row.profile ? String(row.profile) : "",
      resetDate: date,
      resetTime: time,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.resetDate) return;

    const payload = {
      email: form.email.trim(),
      service: form.service.trim().toLowerCase(),
      folder: form.folder.trim() || undefined,
      profile: form.profile ? Number(form.profile) : undefined,
      resetAt: combineLocalDateTime(form.resetDate, form.resetTime),
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, input: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      clearForm();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div style={{ background: tokens.bg.page, minHeight: "100vh", color: tokens.text.body, paddingBottom: 80 }}>
      <Seo
        title="Quota Tracker"
        description="Private quota tracker page"
        path="/internal/quota-tracker"
        noIndex
      />

      <QuotaTrackerStyles />

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 24px 0" }}>
        {/* -- Header -- */}
        <header style={{ marginBottom: 40 }}>
          <div className="qt-eyebrow">
            <EyeOff size={12} style={{ marginRight: 6 }} /> Private Route
          </div>
          <h1 className="qt-title">Quota Tracker</h1>
          <p className="qt-desc">
            Centralized account status and reset time monitoring. Persisted directly on the server database.
          </p>
        </header>

        {/* -- Stats Counters -- */}
        <section className="qt-stats-grid">
          <div className="qt-stat-card">
            <span className="qt-stat-num">{stats.total}</span>
            <span className="qt-stat-label">Total Accounts</span>
          </div>
          <div className="qt-stat-card border-ready">
            <span className="qt-stat-num text-ready">{stats.ready}</span>
            <span className="qt-stat-label">Ready Now</span>
          </div>
          <div className="qt-stat-card border-soon">
            <span className="qt-stat-num text-soon">{stats.soon}</span>
            <span className="qt-stat-label">Resetting Soon</span>
          </div>
          <div className="qt-stat-card border-waiting">
            <span className="qt-stat-num text-waiting">{stats.waiting}</span>
            <span className="qt-stat-label">Waiting</span>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32, alignItems: "start" }} className="qt-layout-grid">
          {/* -- Interactive Action Panel -- */}
          <section className="qt-panel" style={{ padding: 28 }}>
            <h2 className="qt-panel-title">
              {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
              {editingId ? "Edit Account Entry" : "Add New Account Entry"}
            </h2>
            <form onSubmit={onSubmit} className="qt-form">
              <div className="form-group">
                <label>Account Name / Email</label>
                <div className="input-icon-wrap">
                  <User size={16} className="input-icon" />
                  <input
                    required
                    placeholder="e.g. rs9216589@gmail.com or ankit-work"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Service</label>
                <div className="input-icon-wrap">
                  <Server size={16} className="input-icon" />
                  <input
                    required
                    placeholder="e.g. chatgpt, claude"
                    value={form.service}
                    onChange={(e) => setForm((s) => ({ ...s, service: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Folder / Label (Optional)</label>
                <div className="input-icon-wrap">
                  <Folder size={16} className="input-icon" />
                  <input
                    list="quota-folder-suggestions"
                    placeholder="e.g. codex, copy-writing"
                    value={form.folder}
                    onChange={(e) => setForm((s) => ({ ...s, folder: e.target.value }))}
                  />
                </div>
                <datalist id="quota-folder-suggestions">
                  {folderSuggestions.map((folder) => (
                    <option key={folder} value={folder} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Chrome Profile (Optional)</label>
                <select
                  value={form.profile}
                  onChange={(e) => setForm((s) => ({ ...s, profile: e.target.value }))}
                >
                  <option value="">Auto Resolve Profile</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>{`Win ${n}`}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Reset Date</label>
                <div className="input-icon-wrap">
                  <Calendar size={16} className="input-icon" />
                  <input
                    required
                    type="date"
                    value={form.resetDate}
                    onChange={(e) => setForm((s) => ({ ...s, resetDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reset Time</label>
                <div className="input-icon-wrap">
                  <Clock size={16} className="input-icon" />
                  <input
                    type="time"
                    value={form.resetTime}
                    onChange={(e) => setForm((s) => ({ ...s, resetTime: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }} className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? "Save Changes" : "Create Entry"}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={clearForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* -- Data List Panel -- */}
          <section className="qt-panel">
            <div className="qt-panel-header" style={{ padding: "24px 28px 16px" }}>
              <h2 className="qt-panel-title" style={{ margin: 0 }}>
                <Clock size={18} /> Account Statuses
              </h2>
              <div className="search-wrap">
                <input
                  type="text"
                  placeholder="Filter by email, service, folder..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {isLoading && (
              <div style={{ padding: 40, textAlign: "center", color: tokens.text.soft }}>
                Loading accounts from database...
              </div>
            )}

            {error && (
              <div style={{ padding: "24px 28px", color: "#EF4444", display: "flex", gap: 8 }}>
                <AlertCircle size={20} />
                <span>Could not load entries: {error instanceof Error ? error.message : "Unknown error"}</span>
              </div>
            )}

            {!isLoading && !error && sortedRows.length === 0 && (
              <div style={{ padding: 50, textAlign: "center", color: tokens.text.quiet }}>
                No active tracking records. Add one to get started!
              </div>
            )}

            {!isLoading && !error && sortedRows.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="qt-table">
                  <thead>
                    <tr>
                      <th align="left" style={{ width: 60 }}>Profile</th>
                      <th align="left">Email / Account</th>
                      <th align="left" style={{ width: 130 }}>Service</th>
                      <th align="left" style={{ width: 130 }}>Folder</th>
                      <th align="left" style={{ width: 180 }}>Resets At</th>
                      <th align="left" style={{ width: 110 }}>Status</th>
                      <th align="right" style={{ width: 110 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => {
                      const status = getStatus(row.resetAt);
                      return (
                        <tr key={row.id}>
                          <td>
                            <span className="profile-badge">
                              {row.profile ? `Win ${row.profile}` : "—"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, color: tokens.text.primary }}>
                            {row.email}
                          </td>
                          <td>
                            <span className="service-tag">{row.service}</span>
                          </td>
                          <td>{row.folder ? <span className="folder-tag">{row.folder}</span> : <span style={{ opacity: 0.3 }}>—</span>}</td>
                          <td style={{ fontSize: 13, color: tokens.text.muted }}>
                            {new Date(row.resetAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>
                            <span className={`status-badge tag-${status}`}>
                              {status === "ready" && <CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                              {status === "soon" && <Clock size={12} style={{ marginRight: 4 }} />}
                              {status === "waiting" && <Clock size={12} style={{ marginRight: 4 }} />}
                              {status}
                            </span>
                          </td>
                          <td align="right">
                            <div className="table-actions">
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => startEdit(row)}
                                title="Edit Entry"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                className="action-btn action-btn-danger"
                                onClick={() => {
                                  if (confirm("Delete this entry?")) {
                                    deleteMutation.mutate(row.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                title="Delete Entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function QuotaTrackerStyles() {
  return (
    <style>{`
      .qt-eyebrow {
        display: inline-flex;
        align-items: center;
        font-family: ${tokens.font.mono};
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: ${tokens.text.kicker};
        margin-bottom: 12px;
      }
      .qt-title {
        font-family: ${tokens.font.display};
        font-size: 32px;
        font-weight: 800;
        color: ${tokens.text.primary};
        margin: 0 0 10px;
        letter-spacing: -0.02em;
      }
      .qt-desc {
        font-family: ${tokens.font.body};
        font-size: 15px;
        line-height: 1.6;
        color: ${tokens.text.muted};
        max-width: 600px;
        margin: 0;
      }
      .qt-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }
      .qt-stat-card {
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 12px;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        transition: border-color 0.2s ease, background-color 0.2s ease;
      }
      .qt-stat-card:hover {
        background: ${tokens.bg.cardHover};
        border-color: ${tokens.border.hover};
      }
      .qt-stat-num {
        font-family: ${tokens.font.display};
        font-size: 36px;
        font-weight: 800;
        line-height: 1;
        color: ${tokens.text.primary};
        margin-bottom: 6px;
      }
      .qt-stat-label {
        font-family: ${tokens.font.body};
        font-size: 13px;
        color: ${tokens.text.soft};
        font-weight: 500;
      }

      /* Colored stat borders */
      .border-ready { border-left: 3px solid #10B981; }
      .border-soon { border-left: 3px solid #F59E0B; }
      .border-waiting { border-left: 3px solid #6B7280; }

      .text-ready { color: #10B981; }
      .text-soon { color: #F59E0B; }
      .text-waiting { color: rgba(255,255,255,0.7); }

      .qt-panel {
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 16px;
        overflow: hidden;
      }
      .qt-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
        border-bottom: 1px solid ${tokens.border.subtle};
      }
      .qt-panel-title {
        font-family: ${tokens.font.display};
        font-size: 18px;
        font-weight: 700;
        color: ${tokens.text.primary};
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 20px;
      }

      /* Form elements */
      .qt-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
      }
      @media (max-width: 600px) {
        .qt-form {
          grid-template-columns: 1fr;
        }
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .form-group label {
        font-family: ${tokens.font.body};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: ${tokens.text.soft};
      }
      .input-icon-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .input-icon {
        position: absolute;
        left: 14px;
        color: ${tokens.text.quiet};
        pointer-events: none;
      }
      .qt-form input, .qt-form select {
        width: 100%;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid ${tokens.border.default};
        border-radius: 8px;
        color: ${tokens.text.primary};
        font-family: ${tokens.font.body};
        font-size: 14px;
        padding: 10px 14px 10px 40px;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .qt-form select {
        padding-left: 14px; /* Select dropdown lacks icon prefix */
      }
      .qt-form input:focus, .qt-form select:focus {
        border-color: ${tokens.border.focus};
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.04);
      }
      .form-actions {
        grid-column: 1 / -1;
      }

      .btn {
        font-family: ${tokens.font.body};
        font-size: 14px;
        font-weight: 600;
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        transition: opacity 0.15s ease, background 0.15s ease;
      }
      .btn:hover {
        opacity: 0.95;
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-primary {
        background: #fff;
        color: #000;
      }
      .btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.primary};
      }

      /* Search Filtering */
      .search-wrap {
        position: relative;
        min-width: 260px;
      }
      .search-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid ${tokens.border.default};
        border-radius: 8px;
        color: ${tokens.text.primary};
        font-family: ${tokens.font.body};
        font-size: 13px;
        padding: 8px 12px;
        outline: none;
        transition: border-color 0.15s;
      }
      .search-input:focus {
        border-color: ${tokens.border.focus};
      }

      /* Table styling */
      .qt-table {
        width: 100%;
        border-collapse: collapse;
        font-family: ${tokens.font.body};
        font-size: 14px;
      }
      .qt-table th, .qt-table td {
        padding: 16px 24px;
        border-bottom: 1px solid ${tokens.border.subtle};
        vertical-align: middle;
      }
      .qt-table th {
        background: rgba(255, 255, 255, 0.01);
        font-weight: 600;
        color: ${tokens.text.soft};
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.05em;
      }
      .qt-table tr:hover td {
        background: rgba(255, 255, 255, 0.005);
      }
      .profile-badge {
        display: inline-block;
        font-family: ${tokens.font.mono};
        font-size: 12px;
        font-weight: 500;
        color: ${tokens.text.muted};
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid ${tokens.border.subtle};
        padding: 2px 6px;
        border-radius: 4px;
      }
      .service-tag {
        font-family: ${tokens.font.mono};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #A78BFA;
        background: rgba(167, 139, 250, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .folder-tag {
        font-family: ${tokens.font.body};
        font-size: 12px;
        font-weight: 500;
        color: #3B82F6;
        background: rgba(59, 130, 246, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 4px 8px;
        border-radius: 6px;
        line-height: 1;
      }
      .tag-ready {
        background: rgba(16, 185, 129, 0.1);
        color: #34D399;
      }
      .tag-soon {
        background: rgba(245, 158, 11, 0.1);
        color: #FBBF24;
      }
      .tag-waiting {
        background: rgba(255, 255, 255, 0.04);
        color: ${tokens.text.muted};
      }

      /* Actions button spacing */
      .table-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .action-btn {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.muted};
        padding: 6px;
        border-radius: 6px;
        cursor: pointer;
        transition: color 0.15s, background 0.15s, border-color 0.15s;
        line-height: 1;
      }
      .action-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: ${tokens.border.hover};
        color: ${tokens.text.primary};
      }
      .action-btn-danger:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: #EF4444;
      }
    `}</style>
  );
}
