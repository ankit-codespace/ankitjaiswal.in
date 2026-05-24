import { type FormEvent, useMemo, useState } from "react";
import { Seo } from "@/components/Seo";
import { tokens } from "@/components/tool/tokens";
import {
  useCreateQuotaEntry,
  useDeleteQuotaEntry,
  useQuotaEntries,
  useUpdateQuotaEntry,
  type QuotaEntry,
} from "@/hooks/use-quota-entries";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  EyeOff,
  Folder,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  User,
} from "lucide-react";

type FormState = {
  email: string;
  service: string;
  folder: string;
  profile: string;
  resetDate: string;
  resetTime: string;
};

type FolderFilter = "all" | "codex" | "antigravity" | "other";

type GroupedRows = {
  key: Exclude<FolderFilter, "all">;
  label: string;
  rows: QuotaEntry[];
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

function folderBucket(folder: string | null | undefined): Exclude<FolderFilter, "all"> {
  const key = (folder ?? "").trim().toLowerCase();
  if (key === "codex") return "codex";
  if (key === "antigravity") return "antigravity";
  return "other";
}

function folderLabel(bucket: Exclude<FolderFilter, "all">): string {
  if (bucket === "codex") return "Codex";
  if (bucket === "antigravity") return "Antigravity";
  return "Other";
}

export default function QuotaTrackerPrivatePage() {
  const { data = [], isLoading, error, refetch } = useQuotaEntries();
  const createMutation = useCreateQuotaEntry();
  const updateMutation = useUpdateQuotaEntry();
  const deleteMutation = useDeleteQuotaEntry();

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [readyOnly, setReadyOnly] = useState(false);

  const folderSuggestions = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((r) => r.folder?.trim())
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [data]);

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
      .filter((row) => {
        if (folderFilter === "all") return true;
        return folderBucket(row.folder) === folderFilter;
      })
      .filter((row) => (readyOnly ? getStatus(row.resetAt) === "ready" : true))
      .sort((a, b) => {
        const rankDiff = profileRank(a.profile) - profileRank(b.profile);
        if (rankDiff !== 0) return rankDiff;
        return new Date(a.resetAt).getTime() - new Date(b.resetAt).getTime();
      });
  }, [data, searchQuery, folderFilter, readyOnly]);

  const groupedRows = useMemo((): GroupedRows[] => {
    const codex = sortedRows.filter((r) => folderBucket(r.folder) === "codex");
    const antigravity = sortedRows.filter((r) => folderBucket(r.folder) === "antigravity");
    const other = sortedRows.filter((r) => folderBucket(r.folder) === "other");

    if (folderFilter === "all") {
      return ([
        { key: "codex", label: "Codex", rows: codex },
        { key: "antigravity", label: "Antigravity", rows: antigravity },
        { key: "other", label: "Other", rows: other },
      ] as GroupedRows[]).filter((g) => g.rows.length > 0);
    }

    const selected =
      folderFilter === "codex" ? codex
      : folderFilter === "antigravity" ? antigravity
      : other;

    const key = folderFilter as Exclude<FolderFilter, "all">;
    return [{ key, label: folderLabel(key), rows: selected }];
  }, [sortedRows, folderFilter]);

  const stats = useMemo(() => {
    const ready = data.filter((r) => getStatus(r.resetAt) === "ready").length;
    const soon = data.filter((r) => getStatus(r.resetAt) === "soon").length;
    const waiting = data.filter((r) => getStatus(r.resetAt) === "waiting").length;
    const codex = data.filter((r) => folderBucket(r.folder) === "codex");
    const antigravity = data.filter((r) => folderBucket(r.folder) === "antigravity");
    const codexReady = codex.filter((r) => getStatus(r.resetAt) === "ready").length;
    const antigravityReady = antigravity.filter((r) => getStatus(r.resetAt) === "ready").length;
    return {
      total: data.length,
      ready,
      soon,
      waiting,
      codexReady,
      codexTotal: codex.length,
      antigravityReady,
      antigravityTotal: antigravity.length,
    };
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
      <Seo title="Quota Tracker" description="Private quota tracker page" path="/internal/quota-tracker" noIndex />
      <QuotaTrackerStyles />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px 0" }}>
        <header style={{ marginBottom: 40 }}>
          <div className="qt-eyebrow">
            <EyeOff size={12} style={{ marginRight: 6 }} /> Private Route
          </div>
          <h1 className="qt-title">Quota Tracker</h1>
          <p className="qt-desc">
            Centralized account status and reset monitoring. Server persisted, profile grouped, and folder separated.
          </p>
        </header>

        <section className="qt-stats-grid">
          <div className="qt-stat-card"><span className="qt-stat-num">{stats.total}</span><span className="qt-stat-label">Total Accounts</span></div>
          <div className="qt-stat-card border-ready"><span className="qt-stat-num text-ready">{stats.ready}</span><span className="qt-stat-label">Ready Now</span></div>
          <div className="qt-stat-card border-soon"><span className="qt-stat-num text-soon">{stats.soon}</span><span className="qt-stat-label">Resetting Soon</span></div>
          <div className="qt-stat-card border-waiting"><span className="qt-stat-num text-waiting">{stats.waiting}</span><span className="qt-stat-label">Waiting</span></div>
          <div className="qt-stat-card border-codex"><span className="qt-stat-num text-codex">{stats.codexReady}</span><span className="qt-stat-label">Codex Ready ({stats.codexTotal})</span></div>
          <div className="qt-stat-card border-antigravity"><span className="qt-stat-num text-antigravity">{stats.antigravityReady}</span><span className="qt-stat-label">Antigravity Ready ({stats.antigravityTotal})</span></div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
          <section className="qt-panel" style={{ padding: 28 }}>
            <h2 className="qt-panel-title">
              {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
              {editingId ? "Edit Account Entry" : "Add New Account Entry"}
            </h2>

            <form onSubmit={onSubmit} className="qt-form">
              <div className="form-group">
                <label>Account Name / Email</label>
                <div className="input-icon-wrap"><User size={16} className="input-icon" />
                  <input required placeholder="e.g. rs9216589@gmail.com or ankit-work" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Service</label>
                <div className="input-icon-wrap"><Server size={16} className="input-icon" />
                  <input required placeholder="e.g. chatgpt, claude" value={form.service} onChange={(e) => setForm((s) => ({ ...s, service: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Folder (Optional)</label>
                <div className="input-icon-wrap"><Folder size={16} className="input-icon" />
                  <input list="quota-folder-suggestions" placeholder="e.g. codex, antigravity" value={form.folder} onChange={(e) => setForm((s) => ({ ...s, folder: e.target.value }))} />
                </div>
                <datalist id="quota-folder-suggestions">
                  {folderSuggestions.map((folder) => (<option key={folder} value={folder} />))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Chrome Profile (Optional)</label>
                <select value={form.profile} onChange={(e) => setForm((s) => ({ ...s, profile: e.target.value }))}>
                  <option value="">Auto Resolve Profile</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (<option key={n} value={String(n)}>{`Win ${n}`}</option>))}
                </select>
              </div>

              <div className="form-group">
                <label>Reset Date</label>
                <div className="input-icon-wrap"><Calendar size={16} className="input-icon" />
                  <input required type="date" value={form.resetDate} onChange={(e) => setForm((s) => ({ ...s, resetDate: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label>Reset Time</label>
                <div className="input-icon-wrap"><Clock size={16} className="input-icon" />
                  <input type="time" value={form.resetTime} onChange={(e) => setForm((s) => ({ ...s, resetTime: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }} className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Save Changes" : "Create Entry"}
                </button>
                {editingId && <button type="button" className="btn btn-secondary" onClick={clearForm}>Cancel</button>}
              </div>
            </form>
          </section>

          <section className="qt-panel">
            <div className="qt-panel-header" style={{ padding: "24px 28px 16px" }}>
              <h2 className="qt-panel-title" style={{ margin: 0 }}><Clock size={18} /> Account Statuses</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="search-wrap">
                  <input type="text" placeholder="Filter by account, service, folder" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                </div>
                <button type="button" className="action-btn" onClick={() => refetch()} title="Refresh">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="qt-filters" style={{ padding: "0 28px 18px" }}>
              <div className="qt-filter-group">
                {([
                  ["all", "All"],
                  ["codex", "Codex"],
                  ["antigravity", "Antigravity"],
                  ["other", "Other"],
                ] as const).map(([key, label]) => (
                  <button key={key} type="button" className={`qt-filter-chip ${folderFilter === key ? "is-active" : ""}`} onClick={() => setFolderFilter(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" className={`qt-filter-chip ${readyOnly ? "is-active" : ""}`} onClick={() => setReadyOnly((v) => !v)}>
                Ready only
              </button>
            </div>

            {isLoading && <div style={{ padding: 40, textAlign: "center", color: tokens.text.soft }}>Loading accounts from database...</div>}

            {error && (
              <div style={{ padding: "24px 28px", color: "#EF4444", display: "flex", gap: 8 }}>
                <AlertCircle size={20} />
                <span>Could not load entries: {error instanceof Error ? error.message : "Unknown error"}</span>
              </div>
            )}

            {!isLoading && !error && sortedRows.length === 0 && (
              <div style={{ padding: 50, textAlign: "center", color: tokens.text.quiet }}>
                No active tracking records. Add one to get started.
              </div>
            )}

            {!isLoading && !error && sortedRows.length > 0 && groupedRows.map((group) => (
              <div key={group.key} className="qt-group-block">
                <div className="qt-group-head">
                  <h3>{group.label}</h3>
                  <span>{group.rows.length} accounts</span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className="qt-table">
                    <thead>
                      <tr>
                        <th align="left" style={{ width: 62 }}>Profile</th>
                        <th align="left">Email / Account</th>
                        <th align="left" style={{ width: 130 }}>Service</th>
                        <th align="left" style={{ width: 130 }}>Folder</th>
                        <th align="left" style={{ width: 180 }}>Resets At</th>
                        <th align="left" style={{ width: 110 }}>Status</th>
                        <th align="right" style={{ width: 110 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => {
                        const status = getStatus(row.resetAt);
                        return (
                          <tr key={row.id}>
                            <td><span className="profile-badge">{row.profile ? `Win ${row.profile}` : "-"}</span></td>
                            <td style={{ fontWeight: 500, color: tokens.text.primary }}>{row.email}</td>
                            <td><span className="service-tag">{row.service}</span></td>
                            <td>{row.folder ? <span className="folder-tag">{row.folder}</span> : <span style={{ opacity: 0.3 }}>-</span>}</td>
                            <td style={{ fontSize: 13, color: tokens.text.muted }}>
                              {new Date(row.resetAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </td>
                            <td>
                              <span className={`status-badge tag-${status}`}>
                                {status === "ready" && <CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                                {status !== "ready" && <Clock size={12} style={{ marginRight: 4 }} />}
                                {status}
                              </span>
                            </td>
                            <td align="right">
                              <div className="table-actions">
                                <button type="button" className="action-btn" onClick={() => startEdit(row)} title="Edit Entry"><Edit3 size={14} /></button>
                                <button
                                  type="button"
                                  className="action-btn action-btn-danger"
                                  onClick={() => {
                                    if (confirm("Delete this entry?")) deleteMutation.mutate(row.id);
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
              </div>
            ))}
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
        max-width: 680px;
        margin: 0;
      }

      .qt-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 14px;
        margin-bottom: 28px;
      }
      .qt-stat-card {
        background: ${tokens.bg.card};
        border: 1px solid ${tokens.border.subtle};
        border-radius: 12px;
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
      }
      .qt-stat-num {
        font-family: ${tokens.font.display};
        font-size: 34px;
        font-weight: 800;
        line-height: 1;
        color: ${tokens.text.primary};
        margin-bottom: 6px;
      }
      .qt-stat-label {
        font-family: ${tokens.font.body};
        font-size: 12px;
        color: ${tokens.text.soft};
        font-weight: 600;
      }
      .border-ready { border-left: 3px solid #10b981; }
      .border-soon { border-left: 3px solid #f59e0b; }
      .border-waiting { border-left: 3px solid #6b7280; }
      .border-codex { border-left: 3px solid #3b82f6; }
      .border-antigravity { border-left: 3px solid #a855f7; }
      .text-ready { color: #10b981; }
      .text-soon { color: #f59e0b; }
      .text-waiting { color: rgba(255,255,255,0.74); }
      .text-codex { color: #60a5fa; }
      .text-antigravity { color: #c084fc; }

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
        margin: 0 0 18px;
      }

      .qt-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
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
      .qt-form input,
      .qt-form select {
        width: 100%;
        background: rgba(0,0,0,0.2);
        border: 1px solid ${tokens.border.default};
        border-radius: 8px;
        color: ${tokens.text.primary};
        font-family: ${tokens.font.body};
        font-size: 14px;
        padding: 10px 14px 10px 40px;
        outline: none;
      }
      .qt-form select {
        padding-left: 14px;
      }
      .qt-form input:focus,
      .qt-form select:focus {
        border-color: ${tokens.border.focus};
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
        background: rgba(255,255,255,0.08);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.primary};
      }

      .search-wrap {
        min-width: 260px;
      }
      .search-input {
        width: 100%;
        background: rgba(255,255,255,0.03);
        border: 1px solid ${tokens.border.default};
        border-radius: 8px;
        color: ${tokens.text.primary};
        font-family: ${tokens.font.body};
        font-size: 13px;
        padding: 8px 12px;
        outline: none;
      }

      .qt-filters {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .qt-filter-group {
        display: inline-flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .qt-filter-chip {
        background: rgba(255,255,255,0.02);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.muted};
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        padding: 8px 12px;
        cursor: pointer;
      }
      .qt-filter-chip.is-active {
        color: ${tokens.text.primary};
        border-color: ${tokens.border.hover};
        background: rgba(255,255,255,0.08);
      }

      .qt-group-block {
        border-top: 1px solid ${tokens.border.subtle};
      }
      .qt-group-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 28px 8px;
      }
      .qt-group-head h3 {
        margin: 0;
        font-family: ${tokens.font.display};
        font-size: 20px;
        color: ${tokens.text.primary};
      }
      .qt-group-head span {
        font-size: 12px;
        color: ${tokens.text.soft};
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .qt-table {
        width: 100%;
        border-collapse: collapse;
        font-family: ${tokens.font.body};
        font-size: 14px;
      }
      .qt-table th,
      .qt-table td {
        padding: 14px 24px;
        border-bottom: 1px solid ${tokens.border.subtle};
      }
      .qt-table th {
        background: rgba(255,255,255,0.01);
        font-weight: 600;
        color: ${tokens.text.soft};
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.05em;
      }

      .profile-badge {
        display: inline-block;
        font-family: ${tokens.font.mono};
        font-size: 12px;
        color: ${tokens.text.muted};
        background: rgba(255,255,255,0.05);
        border: 1px solid ${tokens.border.subtle};
        padding: 2px 6px;
        border-radius: 4px;
      }
      .service-tag {
        font-family: ${tokens.font.mono};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #a78bfa;
        background: rgba(167,139,250,0.1);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .folder-tag {
        font-size: 12px;
        color: #60a5fa;
        background: rgba(96,165,250,0.12);
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
      }
      .tag-ready { background: rgba(16,185,129,0.1); color: #34d399; }
      .tag-soon { background: rgba(245,158,11,0.1); color: #fbbf24; }
      .tag-waiting { background: rgba(255,255,255,0.04); color: ${tokens.text.muted}; }

      .table-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .action-btn {
        background: rgba(255,255,255,0.03);
        border: 1px solid ${tokens.border.subtle};
        color: ${tokens.text.muted};
        padding: 6px;
        border-radius: 6px;
        cursor: pointer;
        line-height: 1;
      }
      .action-btn:hover {
        background: rgba(255,255,255,0.08);
        color: ${tokens.text.primary};
      }
      .action-btn-danger:hover {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.3);
        color: #ef4444;
      }

      @media (max-width: 780px) {
        .qt-panel-header {
          align-items: stretch;
        }
        .search-wrap {
          min-width: 0;
          width: 100%;
        }
      }
    `}</style>
  );
}
