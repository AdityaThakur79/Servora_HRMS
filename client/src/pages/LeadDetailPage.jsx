import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { LEAD_PIPELINE_GROUPS, getStatusInfo, normalizeLegacyStatus } from '../utils/leadStatuses';

const formatSource = (src) => {
    const s = String(src || '').trim().toLowerCase();
    const map = {
        manual: 'Manual', referral: 'Referral', instagram: 'Instagram',
        facebook: 'Facebook', website: 'Website', whatsapp: 'WhatsApp',
        call: 'Call', 'meta-ads': 'Meta Ads', other: 'Other',
    };
    return map[s] || (src || 'Manual');
};

export default function LeadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    const [lead, setLead] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [l, u] = await Promise.all([
                api.get(`/leads/${id}`),
                api.get('/users'),
            ]);
            setLead(l.data);
            setUsers(u.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to load lead');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const updateLead = async (patch) => {
        if (!lead?._id) return;
        setSaving(true);
        try {
            const res = await api.put(`/leads/${lead._id}`, patch);
            setLead((prev) => ({ ...prev, ...res.data }));
            toast.success('Updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to update');
        } finally {
            setSaving(false);
        }
    };

    const addNote = async () => {
        const text = note.trim();
        if (!text) return;
        setSaving(true);
        try {
            const res = await api.post(`/leads/${id}/notes`, { text });
            setLead(res.data);
            setNote('');
            toast.success('Note added');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to add note');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="card">
                <p style={{ color: 'var(--text-secondary)' }}>Lead not found</p>
                <button className="btn btn-secondary" onClick={() => navigate('/leads')}>Back</button>
            </div>
        );
    }

    const initials = useMemo(() => {
        const name = String(lead.fullName || '').trim();
        if (!name) return 'L';
        return name
            .split(' ')
            .filter(Boolean)
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }, [lead.fullName]);

    const createdDaysAgo = useMemo(() => {
        const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
        const ms = Date.now() - createdAt.getTime();
        return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
    }, [lead.createdAt]);

    return (
        <div className="fade-in lead-detail-page">
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost btn-icon" style={{ marginBottom: 10 }} onClick={() => navigate('/leads')}>
                        <HiOutlineArrowLeft /> Back
                    </button>
                    <div className="lead-header">
                        <div className="lead-avatar">{initials}</div>
                        <div className="lead-headline">
                            <div className="lead-title">
                                <h2 style={{ margin: 0 }}>{lead.fullName}</h2>
                                <span style={{
                                    display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                                    fontSize: 11, fontWeight: 700,
                                    color: getStatusInfo(lead.status).color,
                                    background: getStatusInfo(lead.status).bg,
                                }}>{getStatusInfo(lead.status).label}</span>
                            </div>
                            <div className="lead-subtitle">
                                <span style={{ fontWeight: 600 }}>{lead.company || '—'}</span>
                                {createdDaysAgo !== null && (
                                    <span style={{ color: 'var(--text-muted)' }}> · {createdDaysAgo}d ago</span>
                                )}
                            </div>
                            <div className="lead-chips">
                                {lead.email && <span className="chip">Email: {lead.email}</span>}
                                {lead.phone && <span className="chip">Phone: {lead.phone}</span>}
                                <span className="chip">Source: {formatSource(lead.source)}</span>
                                <span className="chip">Assigned: {lead.assignedTo?.name || '—'}</span>
                                <span className="chip">Sales Owner: {lead.salesOwner?.name || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="project-tabs" style={{ marginBottom: 16 }}>
                <button className={`project-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    Overview
                </button>
                <button className={`project-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                    Notes
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="lead-layout">
                    <div className="card lead-main-card">
                        <div className="card-header">
                            <h3 className="card-title">Lead Info</h3>
                        </div>
                        <div className="lead-pipeline">
                            <div className="section-label" style={{ marginBottom: 8 }}>Pipeline</div>
                            {LEAD_PIPELINE_GROUPS.map((group) => (
                                <div key={group.label} style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: group.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {group.label}
                                    </div>
                                    <div className="pipeline-steps">
                                        {group.statuses.map((s) => {
                                            const info = getStatusInfo(s);
                                            const isActive = normalizeLegacyStatus(lead.status) === s;
                                            return (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    className={`pipeline-step ${isActive ? 'active' : ''}`}
                                                    disabled={saving}
                                                    onClick={() => updateLead({ status: s })}
                                                    title={`Set to ${info.label}`}
                                                    style={isActive ? { background: info.color, borderColor: info.color, color: '#fff' } : {}}
                                                >
                                                    {info.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                Click a stage to update status.
                            </p>
                        </div>

                        {lead.description && (
                            <div style={{ marginTop: 18 }}>
                                <div className="section-label">Requirements</div>
                                <p style={{ marginTop: 6, color: 'var(--text-secondary)' }}>{lead.description}</p>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Assignment</h3>
                        </div>
                        {isAdmin ? (
                            <>
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label className="form-label">Assigned To</label>
                                    <select
                                        className="form-select"
                                        value={lead.assignedTo?._id || ''}
                                        disabled={saving}
                                        onChange={(e) => updateLead({ assignedTo: e.target.value || null })}
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map((u) => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Sales Owner</label>
                                    <select
                                        className="form-select"
                                        value={lead.salesOwner?._id || ''}
                                        disabled={saving}
                                        onChange={(e) => updateLead({ salesOwner: e.target.value || null })}
                                    >
                                        <option value="">None</option>
                                        {users.map((u) => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                <p style={{ marginBottom: 6 }}>Assigned To: <span style={{ fontWeight: 700 }}>{lead.assignedTo?.name || '—'}</span></p>
                                <p>Sales Owner: <span style={{ fontWeight: 700 }}>{lead.salesOwner?.name || '—'}</span></p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Notes</h3>
                    </div>

                    <div className="form-row" style={{ alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Add a note</label>
                            <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Call summary, next steps, follow-up date..." />
                        </div>
                        <button className="btn btn-primary" onClick={addNote} disabled={saving || !note.trim()}>
                            Add Note
                        </button>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        {(lead.notes || []).length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}>
                                <div className="empty-icon">📝</div>
                                <p>No notes yet</p>
                            </div>
                        ) : (
                            <div className="notes-timeline">
                                {lead.notes.map((n, idx) => (
                                    <div key={idx} className="note-item">
                                        <div className="note-meta">
                                            <span style={{ fontWeight: 700 }}>{n.createdBy?.name || 'User'}</span>
                                            <span style={{ color: 'var(--text-muted)' }}> · {new Date(n.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="note-text">{n.text}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .lead-detail-page { display: flex; flex-direction: column; gap: 6px; }
                .lead-header { display: flex; gap: 14px; align-items: flex-start; }
                .lead-avatar {
                    width: 52px;
                    height: 52px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    color: #FFF7F3;
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    box-shadow: 0 10px 30px rgba(65, 54, 52, 0.18);
                    flex-shrink: 0;
                }
                .lead-title { display: flex; align-items: center; gap: 10px; }
                .lead-headline h2 { font-size: 26px; font-weight: 850; }
                .lead-subtitle { color: var(--text-secondary); margin-top: 2px; }
                .lead-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
                .chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 10px;
                    border-radius: 999px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    color: var(--text-secondary);
                    font-size: 12px;
                    max-width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .lead-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
                @media (max-width: 960px) { .lead-layout { grid-template-columns: minmax(0, 1fr); } }
                .lead-pipeline { margin-top: 2px; }
                .pipeline-steps { display: flex; flex-wrap: wrap; gap: 8px; }
                .pipeline-step {
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    border-radius: 999px;
                    padding: 6px 10px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: capitalize;
                    transition: all 0.15s ease;
                }
                .pipeline-step:hover { background: var(--bg-hover); color: var(--text-primary); }
                .pipeline-step.active {
                    background: var(--accent-primary);
                    color: #FFF7F3;
                    border-color: rgba(65,54,52,0.6);
                }
                .notes-timeline { display: flex; flex-direction: column; gap: 10px; }
                .note-item {
                    padding: 12px 14px;
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    background: linear-gradient(135deg, #FFF7F3, #FFFFFF);
                }
                .note-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
                .note-text { font-weight: 600; }
            `}</style>
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <div className="detail-item">
            <div className="detail-label">{label}</div>
            <div className="detail-value">{value}</div>
        </div>
    );
}

