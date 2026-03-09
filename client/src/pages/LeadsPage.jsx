import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';

const statusBadge = {
    new: 'badge-neutral',
    contacted: 'badge-blue',
    qualified: 'badge-yellow',
    proposal: 'badge-orange',
    won: 'badge-green',
    lost: 'badge-red',
};

const emptyForm = {
    fullName: '',
    company: '',
    email: '',
    phone: '',
    source: 'manual',
    status: 'new',
    assignedTo: '',
    description: '',
};

const formatSource = (src) => {
    const s = String(src || '').trim().toLowerCase();
    const map = {
        manual: 'Manual',
        referral: 'Referral',
        instagram: 'Instagram',
        facebook: 'Facebook',
        website: 'Website',
        whatsapp: 'WhatsApp',
        call: 'Call',
        'meta-ads': 'Meta Ads',
        other: 'Other',
    };
    return map[s] || (src || 'Manual');
};

export default function LeadsPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;
    const [totalPages, setTotalPages] = useState(1);

    const fetchStats = () => api.get('/leads/stats').then(r => setStats(r.data));
    const fetchUsers = () => api.get('/users').then(r => setUsers(r.data));

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await api.get('/leads', {
                params: { search, status: status || undefined, assignedTo: assignedTo || undefined, page, limit },
            });
            setRows(res.data.rows);
            setTotalPages(res.data.totalPages);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        Promise.all([fetchStats(), fetchUsers(), fetchLeads()]).catch(() => {
            toast.error('Unable to load leads');
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchLeads().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status, assignedTo]);

    const onSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLeads().catch(() => {});
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEdit = (lead) => {
        setEditing(lead);
        setForm({
            fullName: lead.fullName || '',
            company: lead.company || '',
            email: lead.email || '',
            phone: lead.phone || '',
            source: lead.source || 'manual',
            status: lead.status || 'new',
            assignedTo: lead.assignedTo?._id || '',
            description: lead.description || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullName = (form.fullName || '').trim();
        if (!fullName) return toast.error('Full name is required');
        setSaving(true);
        try {
            const payload = { ...form, fullName };
            if (!payload.assignedTo) delete payload.assignedTo;
            if (editing) {
                await api.put(`/leads/${editing._id}`, payload);
                toast.success('Lead updated');
            } else {
                await api.post('/leads', payload);
                toast.success('Lead created');
            }
            setShowModal(false);
            await Promise.all([fetchStats(), fetchLeads()]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this lead?')) return;
        try {
            await api.delete(`/leads/${id}`);
            toast.success('Lead deleted');
            await Promise.all([fetchStats(), fetchLeads()]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Not allowed');
        }
    };

    const updateLeadStatus = async (lead, nextStatus) => {
        const prev = lead.status;
        setRows((rs) => rs.map((r) => (r._id === lead._id ? { ...r, status: nextStatus } : r)));
        try {
            await api.put(`/leads/${lead._id}`, { status: nextStatus });
            fetchStats().catch(() => {});
        } catch {
            setRows((rs) => rs.map((r) => (r._id === lead._id ? { ...r, status: prev } : r)));
            toast.error('Unable to update status');
        }
    };

    const conversionText = useMemo(() => {
        if (!stats) return '—';
        return `${stats.conversionRate}%`;
    }, [stats]);

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Leads</h2>
                    <p>Track, convert and manage your pipeline</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary">
                    <HiOutlinePlus /> New Lead
                </button>
            </div>

            <div className="stats-grid">
                <Stat label="Total Leads" value={stats?.total ?? 0} />
                <Stat label="Won" value={stats?.byStatus?.won ?? 0} />
                <Stat label="Lost" value={stats?.byStatus?.lost ?? 0} />
                <Stat label="Conversion" value={conversionText} />
            </div>

            <div className="card">
                <div className="card-header">
                    <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="search-input-wrapper">
                            <HiOutlineSearch className="search-icon" />
                            <input
                                className="form-input"
                                placeholder="Search name/company/email/phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: 320 }}
                            />
                        </div>
                        <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 170 }}>
                            <option value="">All Status</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="proposal">Proposal</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                        </select>
                        <select className="form-select" value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); setPage(1); }} style={{ width: 200 }}>
                            <option value="">All owners</option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-secondary btn-sm">Search</button>
                    </form>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Lead</th>
                                <th>Company</th>
                                <th>Status</th>
                                <th>Last Note</th>
                                <th>Source</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📈</div><h3>No leads found</h3><p>Create a lead to start tracking conversions</p></div></td></tr>
                            ) : rows.map((lead) => {
                                const lastNote = lead.notes?.length > 0 ? lead.notes[0].text : (lead.description || '');
                                const noteLimit = 40;
                                const truncated = lastNote.length > noteLimit ? lastNote.slice(0, noteLimit) + '…' : lastNote;

                                return (
                                    <tr key={lead._id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{lead.fullName}</div>
                                            {lead.email && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.email}</div>}
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{lead.company || '—'}</td>
                                        <td>
                                            <select
                                                className="form-select"
                                                value={lead.status}
                                                onChange={(e) => updateLeadStatus(lead, e.target.value)}
                                                style={{ width: 160, minHeight: 34, padding: '6px 10px', fontSize: 13, lineHeight: 1.2 }}
                                            >
                                                <option value="new">New</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="qualified">Qualified</option>
                                                <option value="proposal">Proposal</option>
                                                <option value="won">Won</option>
                                                <option value="lost">Lost</option>
                                            </select>
                                        </td>
                                        <td style={{ maxWidth: 200, position: 'relative' }}>
                                            {lastNote ? (
                                                <span
                                                    className="note-cell-truncated"
                                                    style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'default', display: 'inline-block', position: 'relative' }}
                                                >
                                                    {truncated}
                                                    {lastNote.length > noteLimit && (
                                                        <span className="note-cell-tooltip">{lastNote}</span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{formatSource(lead.source)}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/leads/${lead._id}`)} title="View">
                                                    <HiOutlineEye />
                                                </button>
                                                <button className="btn btn-ghost btn-icon" onClick={() => openEdit(lead)} title="Edit">
                                                    ✎
                                                </button>
                                                <button className="btn btn-danger btn-icon" onClick={() => handleDelete(lead._id)} title="Delete">
                                                    <HiOutlineTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="pagination" style={{ paddingTop: 16 }}>
                    <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Previous
                    </button>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        Next
                    </button>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit Lead' : 'New Lead'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Full Name *</label>
                                        <input className="form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Company</label>
                                        <input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Source</label>
                                        <select className="form-select" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                                            <option value="manual">Manual</option>
                                            <option value="referral">Referral</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="facebook">Facebook</option>
                                            <option value="website">Website</option>
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="call">Call</option>
                                            <option value="meta-ads">Meta Ads</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="qualified">Qualified</option>
                                            <option value="proposal">Proposal</option>
                                            <option value="won">Won</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Owner</label>
                                    <select className="form-select" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                                        <option value="">Unassigned</option>
                                        {users.map((u) => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                        Only admins can change owner later from the detail page.
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes / Requirements</label>
                                    <textarea className="form-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`
                .note-cell-truncated {
                    position: relative;
                }
                .note-cell-tooltip {
                    display: none;
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 0;
                    z-index: 100;
                    background: var(--accent-secondary);
                    color: #FFF7F3;
                    padding: 10px 14px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 500;
                    line-height: 1.5;
                    max-width: 320px;
                    min-width: 180px;
                    white-space: pre-wrap;
                    word-break: break-word;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
                    pointer-events: none;
                }
                .note-cell-truncated:hover .note-cell-tooltip {
                    display: block;
                }
            `}</style>
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="stat-card">
            <div className="stat-info">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
            </div>
        </div>
    );
}

