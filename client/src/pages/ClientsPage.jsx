import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';

const statusBadge = { active: 'badge-green', inactive: 'badge-red', prospect: 'badge-yellow' };

const emptyForm = { name: '', company: '', email: '', phone: '', address: '', status: 'active', notes: '' };

export default function ClientsPage() {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);

    const fetchClients = () => {
        api.get('/clients').then(r => { setClients(r.data); setLoading(false); });
    };
    useEffect(fetchClients, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (c) => { setEditing(c); setForm({ ...c }); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/clients/${editing._id}`, form);
                toast.success('Client updated');
            } else {
                await api.post('/clients', form);
                toast.success('Client created');
            }
            setShowModal(false);
            fetchClients();
        } catch { toast.error('Something went wrong'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this client?')) return;
        await api.delete(`/clients/${id}`);
        toast.success('Client deleted');
        fetchClients();
    };

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Clients</h2>
                    <p>{clients.length} total clients</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary">
                    <HiOutlinePlus /> Add Client
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="search-input-wrapper">
                        <HiOutlineSearch className="search-icon" />
                        <input className="form-input" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6}>
                                    <div className="empty-state">
                                        <div className="empty-icon">🤝</div>
                                        <h3>No clients found</h3>
                                        <p>Add your first client to get started</p>
                                    </div>
                                </td></tr>
                            ) : filtered.map(c => (
                                <tr key={c._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{c.name[0].toUpperCase()}</div>
                                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{c.company || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                                    <td><span className={`badge ${statusBadge[c.status]}`}>{c.status}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => openEdit(c)} className="btn btn-ghost btn-icon"><HiOutlinePencil /></button>
                                            <button onClick={() => handleDelete(c._id)} className="btn btn-danger btn-icon"><HiOutlineTrash /></button>
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
                            <h3 className="modal-title">{editing ? 'Edit Client' : 'Add Client'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Full Name *</label>
                                        <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Company</label>
                                        <input className="form-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="prospect">Prospect</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
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
