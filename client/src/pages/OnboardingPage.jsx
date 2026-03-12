import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineEye, HiOutlineClipboardCopy, HiOutlineExternalLink } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';

const BASE_URL = window.location.origin;

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [forms, setForms] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedClient, setSelectedClient] = useState('');
    const [clientName, setClientName] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const res = await api.get('/onboarding');
            setForms(res.data);
        } catch { toast.error('Unable to load forms'); }
        finally { setLoading(false); }
    };

    const fetchClients = async () => {
        try { const res = await api.get('/clients'); setClients(res.data?.rows || res.data || []); } catch {}
    };

    useEffect(() => { fetchForms(); fetchClients(); }, []);

    const createForm = async () => {
        if (!selectedClient && !clientName.trim()) return toast.error('Select a client or enter a name');
        setSaving(true);
        try {
            await api.post('/onboarding', {
                client: selectedClient || undefined,
                clientName: clientName.trim(),
            });
            toast.success('Form created — copy the link and send it to the client');
            setShowCreate(false);
            setSelectedClient('');
            setClientName('');
            fetchForms();
        } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    const deleteForm = async (id) => {
        if (!window.confirm('Delete this onboarding form?')) return;
        try { await api.delete(`/onboarding/${id}`); toast.success('Deleted'); fetchForms(); }
        catch { toast.error('Unable to delete'); }
    };

    const copyLink = (token) => {
        const link = `${BASE_URL}/onboarding/fill/${token}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard');
    };

    const viewSubmission = async (id) => {
        try {
            const res = await api.get(`/onboarding/${id}`);
            setViewForm(res.data);
        } catch { toast.error('Unable to load'); }
    };

    const statusBadge = (s) => {
        const map = {
            draft: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
            sent: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
            submitted: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
        };
        const st = map[s] || map.draft;
        return (
            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
        );
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div><h2>Client Onboarding</h2><p>Create and manage brand questionnaire forms</p></div>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary"><HiOutlinePlus /> New Form</button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : forms.length === 0 ? (
                                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">📋</div><h3>No onboarding forms yet</h3><p>Create one and share the link with your client</p></div></td></tr>
                            ) : forms.map((f) => (
                                <tr key={f._id}>
                                    <td style={{ fontWeight: 700 }}>{f.client?.name || f.clientName || f.brandName || '—'}</td>
                                    <td>{statusBadge(f.status)}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{f.submittedAt ? new Date(f.submittedAt).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-icon" onClick={() => copyLink(f.token)} title="Copy link"><HiOutlineClipboardCopy /></button>
                                            <a href={`${BASE_URL}/onboarding/fill/${f.token}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon" title="Open form"><HiOutlineExternalLink /></a>
                                            {f.status === 'submitted' && <button className="btn btn-ghost btn-icon" onClick={() => viewSubmission(f._id)} title="View response"><HiOutlineEye /></button>}
                                            <button className="btn btn-danger btn-icon" onClick={() => deleteForm(f._id)} title="Delete"><HiOutlineTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">New Onboarding Form</h3>
                            <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Select Existing Client</label>
                                <select className="form-select" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                                    <option value="">— None —</option>
                                    {clients.map((c) => <option key={c._id} value={c._id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Or enter client name</label>
                                <input className="form-input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Swati Kitchen" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={createForm} disabled={saving}>{saving ? 'Creating...' : 'Create & Get Link'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Submission Modal */}
            {viewForm && (
                <div className="modal-overlay" onClick={() => setViewForm(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '85vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Submission: {viewForm.brandName || viewForm.clientName || '—'}</h3>
                            <button onClick={() => setViewForm(null)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <div className="modal-body">
                            <ViewSection title="Basic Brand Info" items={[
                                ['Brand Name', viewForm.brandName], ['Founder', viewForm.founderName],
                                ['Year Started', viewForm.yearStarted], ['Business Type', viewForm.businessType],
                                ['Location', viewForm.brandLocation], ['Email', viewForm.contactEmail],
                                ['Phone', viewForm.contactPhone], ['Website', viewForm.website],
                            ]} />
                            <ViewSection title="About the Brand" items={[
                                ['Description', viewForm.brandDescription], ['Inspiration', viewForm.brandInspiration],
                                ['Problem Solved', viewForm.problemSolved], ['Uniqueness', viewForm.uniqueness],
                            ]} />
                            <ViewSection title="Founder Story" items={[
                                ['Journey', viewForm.founderJourney], ['Why Started', viewForm.whyStarted],
                                ['Future Vision', viewForm.futureVision], ['Achievements', viewForm.achievements],
                            ]} />
                            <ViewSection title="Products / Services" items={[
                                ['Products/Services', viewForm.productsServices], ['Best Sellers', viewForm.bestSellers],
                                ['Signature Products', viewForm.signatureProducts], ['Price Range', viewForm.priceRange],
                            ]} />
                            <ViewSection title="Mission & Vision" items={[
                                ['Mission', viewForm.brandMission], ['Vision', viewForm.brandVision], ['Values', viewForm.brandValues],
                            ]} />
                            <ViewSection title="Target Audience" items={[
                                ['Ideal Customer', viewForm.idealCustomer], ['Age Group', viewForm.ageGroup],
                                ['Audience Location', viewForm.audienceLocation], ['Typical Buyers', viewForm.typicalBuyers],
                            ]} />
                            <ViewItem label="Brand Personality" value={(viewForm.brandPersonality || []).join(', ')} />
                            <ViewSection title="Competitors" items={[
                                ['Competitors', viewForm.competitors], ['Inspiring Brands', viewForm.inspiringBrands],
                            ]} />
                            <ViewSection title="Social Media" items={[
                                ['Instagram', viewForm.instagram], ['Facebook', viewForm.facebook],
                                ['YouTube', viewForm.youtube], ['TikTok', viewForm.tiktok], ['Followers', viewForm.followerCount],
                            ]} />
                            <ViewItem label="Content Preferences" value={(viewForm.contentPreferences || []).join(', ')} />
                            <ViewItem label="Campaign Goals" value={(viewForm.campaignGoals || []).join(', ')} />
                            <ViewSection title="Additional" items={[
                                ['Upcoming Events', viewForm.upcomingEvents], ['Special Message', viewForm.specialMessage],
                                ['Additional Info', viewForm.additionalInfo],
                            ]} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ViewSection({ title, items }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
            {items.map(([label, val]) => <ViewItem key={label} label={label} value={val} />)}
        </div>
    );
}

function ViewItem({ label, value }) {
    if (!value) return null;
    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13 }}>
            <span style={{ fontWeight: 700, minWidth: 140, color: 'var(--text-secondary)' }}>{label}:</span>
            <span style={{ color: 'var(--text-primary)' }}>{value}</span>
        </div>
    );
}
