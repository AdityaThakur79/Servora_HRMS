import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const statusColors = {
    active: 'badge-green', completed: 'badge-blue', 'on-hold': 'badge-yellow', cancelled: 'badge-red',
};
const priorityColors = { low: 'badge-neutral', medium: 'badge-blue', high: 'badge-orange' };

const emptyForm = {
    name: '',
    description: '',
    client: '',
    status: 'active',
    priority: 'medium',
    budget: '',
    dueDate: '',
    workstream: 'general',
    serviceType: 'general',
    serviceDetails: {
        planName: '',
        reels: '',
        posts: '',
        stories: '',
        notes: '',
    },
};

export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const columnCount = isAdmin ? 8 : 7;

    const fetchAll = () => {
        Promise.all([api.get('/projects'), api.get('/clients')]).then(([p, c]) => {
            setProjects(p.data); setClients(c.data); setLoading(false);
        });
    };
    useEffect(fetchAll, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (p) => {
        setEditing(p);
        setForm({
            name: p.name,
            description: p.description,
            client: p.client?._id || '',
            status: p.status,
            priority: p.priority,
            budget: p.budget,
            dueDate: p.dueDate ? p.dueDate.split('T')[0] : '',
            workstream: p.workstream || (p.serviceType === 'smm' ? 'smm' : 'general'),
            serviceType: p.serviceType || 'general',
            serviceDetails: {
                planName: p.serviceDetails?.planName || '',
                reels: p.serviceDetails?.reels ?? '',
                posts: p.serviceDetails?.posts ?? '',
                stories: p.serviceDetails?.stories ?? '',
                notes: p.serviceDetails?.notes || '',
            },
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const name = (form.name || '').trim();
            if (!name) return toast.error('Project name is required');
            if (!form.client) return toast.error('Please select a client');

            if (form.budget !== '' && form.budget !== null && form.budget !== undefined) {
                const budget = Number(form.budget);
                if (!Number.isFinite(budget) || budget < 0) return toast.error('Budget must be a valid non-negative number');
            }

            if (form.serviceType === 'smm') {
                const reels = Number(form.serviceDetails?.reels);
                const posts = Number(form.serviceDetails?.posts);
                const stories = Number(form.serviceDetails?.stories);
                if (![reels, posts, stories].every(n => Number.isFinite(n))) {
                    return toast.error('Please enter valid numbers for reels, posts and stories');
                }
                if ([reels, posts, stories].some(n => n < 0)) {
                    return toast.error('Reels, posts and stories cannot be negative');
                }
            }

            const payload = {
                ...form,
                name,
                workstream: form.workstream || 'general',
                budget: isAdmin ? (form.budget === '' ? undefined : Number(form.budget)) : undefined,
                serviceDetails: form.serviceType === 'smm'
                    ? {
                        ...form.serviceDetails,
                        reels: Number(form.serviceDetails.reels),
                        posts: Number(form.serviceDetails.posts),
                        stories: Number(form.serviceDetails.stories),
                    }
                    : form.serviceDetails,
            };
            if (editing) {
                await api.put(`/projects/${editing._id}`, payload);
                toast.success('Project updated');
            } else {
                await api.post('/projects', payload);
                toast.success('Project created');
            }
            setShowModal(false); fetchAll();
        } catch { toast.error('Something went wrong'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this project?')) return;
        await api.delete(`/projects/${id}`);
        toast.success('Project deleted'); fetchAll();
    };

    const filtered = projects
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        .filter(p => {
            const ws = p.workstream || (p.serviceType === 'smm' ? 'smm' : 'general');
            if (tab === 'all') return true;
            if (tab === 'smm') return ws === 'smm';
            if (tab === 'tech') return ws === 'tech';
            return true;
        });

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Projects</h2>
                    <p>{projects.length} total projects</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary">
                    <HiOutlinePlus /> New Project
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div className="project-tabs" aria-label="Project category tabs">
                            <button type="button" className={`project-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
                            <button type="button" className={`project-tab ${tab === 'smm' ? 'active' : ''}`} onClick={() => setTab('smm')}>SMM</button>
                            <button type="button" className={`project-tab ${tab === 'tech' ? 'active' : ''}`} onClick={() => setTab('tech')}>Tech</button>
                        </div>
                        <div className="search-input-wrapper">
                            <HiOutlineSearch className="search-icon" />
                            <input className="form-input" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
                        </div>
                    </div>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Project</th>
                                <th>Client</th>
                                <th>Category</th>
                                <th>Priority</th>
                                <th>Status</th>
                                {isAdmin && <th>Budget</th>}
                                <th>Due Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={columnCount + 1} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={columnCount + 1}><div className="empty-state"><div className="empty-icon">📁</div><h3>No projects yet</h3><p>Create your first project</p></div></td></tr>
                            ) : filtered.map(p => (
                                <tr key={p._id}>
                                    <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{p.client?.name || '—'}</td>
                                    <td>
                                        <span className="badge badge-neutral">
                                            {(p.workstream || (p.serviceType === 'smm' ? 'smm' : 'general')).toUpperCase()}
                                        </span>
                                    </td>
                                    <td><span className={`badge ${priorityColors[p.priority]}`}>{p.priority}</span></td>
                                    <td><span className={`badge ${statusColors[p.status]}`}>{p.status}</span></td>
                                    {isAdmin && (
                                        <td style={{ color: 'var(--text-secondary)' }}>
                                            {p.budget ? `₹${Number(p.budget).toLocaleString()}` : '—'}
                                        </td>
                                    )}
                                    <td style={{ color: 'var(--text-secondary)' }}>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => navigate(`/projects/${p._id}`)} className="btn btn-ghost btn-icon" title="View details">
                                                <HiOutlineEye />
                                            </button>
                                            <button onClick={() => openEdit(p)} className="btn btn-ghost btn-icon"><HiOutlinePencil /></button>
                                            <button onClick={() => handleDelete(p._id)} className="btn btn-danger btn-icon"><HiOutlineTrash /></button>
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
                            <h3 className="modal-title">{editing ? 'Edit Project' : 'New Project'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Project Name *</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Client *</label>
                                    <select className="form-select" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required>
                                        <option value="">Select a client</option>
                                        {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                            <option value="active">Active</option>
                                            <option value="on-hold">On Hold</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    {isAdmin && (
                                        <div className="form-group">
                                            <label className="form-label">Budget (₹)</label>
                                            <input type="number" min="0" step="1" className="form-input" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label">Due Date</label>
                                        <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select
                                            className="form-select"
                                            value={form.workstream}
                                            onChange={e => {
                                                const ws = e.target.value;
                                                setForm(prev => ({
                                                    ...prev,
                                                    workstream: ws,
                                                    serviceType: ws === 'smm' ? 'smm' : (ws === 'tech' ? 'web' : prev.serviceType),
                                                }));
                                            }}
                                        >
                                            <option value="general">General</option>
                                            <option value="smm">SMM</option>
                                            <option value="tech">Tech</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Service Type</label>
                                        <select
                                            className="form-select"
                                            value={form.serviceType}
                                            onChange={e => setForm({ ...form, serviceType: e.target.value })}
                                        >
                                            <option value="general">General</option>
                                            <option value="smm">Social Media Management (SMM)</option>
                                            <option value="seo">SEO</option>
                                            <option value="design">Design</option>
                                            <option value="web">Web Development</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                {form.serviceType === 'smm' && (
                                    <div className="form-section">
                                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>SMM Plan Details</h4>
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            Capture how many reels, posts and stories are included in this SMM package so you can track delivery against the plan.
                                        </p>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">SMM Package</label>
                                                <select
                                                    className="form-select"
                                                    value={form.serviceDetails.planName}
                                                    onChange={e =>
                                                        setForm(prev => ({
                                                            ...prev,
                                                            serviceDetails: { ...prev.serviceDetails, planName: e.target.value },
                                                        }))
                                                    }
                                                >
                                                    <option value="">Select package</option>
                                                    <option value="standard">{isAdmin ? 'Standard (15K)' : 'Standard'}</option>
                                                    <option value="premium">{isAdmin ? 'Premium (25K)' : 'Premium'}</option>
                                                    <option value="elite">{isAdmin ? 'Elite (35K)' : 'Elite'}</option>
                                                    <option value="custom">Custom</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Total Reels / month</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="form-input"
                                                    value={form.serviceDetails.reels}
                                                    onChange={e =>
                                                        setForm(prev => ({
                                                            ...prev,
                                                            serviceDetails: { ...prev.serviceDetails, reels: e.target.value },
                                                        }))
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Total Posts / month</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="form-input"
                                                    value={form.serviceDetails.posts}
                                                    onChange={e =>
                                                        setForm(prev => ({
                                                            ...prev,
                                                            serviceDetails: { ...prev.serviceDetails, posts: e.target.value },
                                                        }))
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Total Stories / month</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="form-input"
                                                    value={form.serviceDetails.stories}
                                                    onChange={e =>
                                                        setForm(prev => ({
                                                            ...prev,
                                                            serviceDetails: { ...prev.serviceDetails, stories: e.target.value },
                                                        }))
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">SMM Notes</label>
                                            <textarea
                                                className="form-textarea"
                                                rows={3}
                                                value={form.serviceDetails.notes}
                                                onChange={e =>
                                                    setForm(prev => ({
                                                        ...prev,
                                                        serviceDetails: { ...prev.serviceDetails, notes: e.target.value },
                                                    }))
                                                }
                                                placeholder="Any additional deliverables, customizations or performance notes for this SMM project."
                                            />
                                        </div>
                                    </div>
                                )}
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
