import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';

const statusColors = { open: 'badge-orange', 'in-progress': 'badge-blue', resolved: 'badge-green', closed: 'badge-neutral' };
const priorityColors = { low: 'badge-neutral', medium: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };
const categoryLabel = { bug: '🐛 Bug', feature: '✨ Feature', support: '🎧 Support', billing: '💵 Billing', other: '📌 Other' };

const emptyForm = { title: '', description: '', client: '', project: '', assignedTo: '', status: 'open', priority: 'medium', category: 'support' };

export default function ServiceRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);

    const fetchAll = () => {
        Promise.all([
            api.get('/service-requests'),
            api.get('/clients'),
            api.get('/projects'),
            api.get('/users'),
        ]).then(([r, c, p, u]) => {
            setRequests(r.data); setClients(c.data); setProjects(p.data); setUsers(u.data); setLoading(false);
        });
    };
    useEffect(fetchAll, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (r) => {
        setEditing(r);
        setForm({ title: r.title, description: r.description, client: r.client?._id || '', project: r.project?._id || '', assignedTo: r.assignedTo?._id || '', status: r.status, priority: r.priority, category: r.category });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, assignedTo: form.assignedTo || undefined, client: form.client || undefined, project: form.project || undefined };
            if (editing) { await api.put(`/service-requests/${editing._id}`, payload); toast.success('Request updated'); }
            else { await api.post('/service-requests', payload); toast.success('Request created'); }
            setShowModal(false); fetchAll();
        } catch { toast.error('Something went wrong'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this request?')) return;
        await api.delete(`/service-requests/${id}`);
        toast.success('Request deleted'); fetchAll();
    };

    const filtered = requests.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) &&
        (filterStatus ? r.status === filterStatus : true)
    );

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Service Requests</h2>
                    <p>{requests.length} total tickets</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary"><HiOutlinePlus /> New Request</button>
            </div>

            {/* Kanban Summary Strip */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {['open', 'in-progress', 'resolved', 'closed'].map(s => {
                    const count = requests.filter(r => r.status === s).length;
                    return (
                        <div key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                            className="card" style={{ flex: 1, padding: '14px 18px', cursor: 'pointer', borderColor: filterStatus === s ? 'var(--accent-primary)' : 'var(--border-color)', transition: 'all 0.2s' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{count}</div>
                            <span className={`badge ${statusColors[s]}`} style={{ marginTop: 4 }}>{s.replace('-', ' ')}</span>
                        </div>
                    );
                })}
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div className="search-input-wrapper">
                            <HiOutlineSearch className="search-icon" />
                            <input className="form-input" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
                        </div>
                        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}>
                            <option value="">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Title</th><th>Category</th><th>Client</th><th>Assigned To</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">🎧</div><h3>No service requests</h3><p>All clear! Create a request to track an issue</p></div></td></tr>
                            ) : filtered.map(r => (
                                <tr key={r._id}>
                                    <td><span style={{ fontWeight: 600 }}>{r.title}</span></td>
                                    <td><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{categoryLabel[r.category] || r.category}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{r.client?.name || '—'}</td>
                                    <td>
                                        {r.assignedTo ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{r.assignedTo.name[0]}</div>
                                                <span style={{ fontSize: 13 }}>{r.assignedTo.name}</span>
                                            </div>
                                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unassigned</span>}
                                    </td>
                                    <td><span className={`badge ${priorityColors[r.priority]}`}>{r.priority}</span></td>
                                    <td><span className={`badge ${statusColors[r.status]}`}>{r.status.replace('-', ' ')}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => openEdit(r)} className="btn btn-ghost btn-icon"><HiOutlinePencil /></button>
                                            <button onClick={() => handleDelete(r._id)} className="btn btn-danger btn-icon"><HiOutlineTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit Request' : 'New Service Request'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            <option value="support">Support</option>
                                            <option value="bug">Bug</option>
                                            <option value="feature">Feature Request</option>
                                            <option value="billing">Billing</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Client</label>
                                        <select className="form-select" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}>
                                            <option value="">No client</option>
                                            {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Assign To</label>
                                        <select className="form-select" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                                            <option value="">Unassigned</option>
                                            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="open">Open</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
