import { useState, useEffect } from 'react';
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const roleBadge = { admin: 'badge-purple', manager: 'badge-blue', staff: 'badge-neutral' };

const jobRoleOptions = [
    'Account Manager',
    'Business Developer',
    'Project Manager',
    'Client Success Manager',
    'Operations',
    'Team Lead',
    'Video Editor',
    'Senior Video Editor',
    'Motion Graphics Designer',
    'Cinematographer / Videographer',
    'Graphic Designer',
    'Senior Graphic Designer',
    'Brand Designer',
    'Content Writer',
    'Copywriter',
    'Social Media Manager',
    'Social Media Strategist',
    'SEO Specialist',
    'Performance Marketer',
    'Ads Specialist',
    'Web Developer',
    'Frontend Developer',
    'Backend Developer',
    'MERN Developer',
    'Fullstack Developer',
    'Mobile App Developer',
    'UI/UX Designer',
    'Product Designer',
    'QA / Tester',
    'DevOps Engineer',
    'Data / Analytics Specialist',
    'Other',
];

export default function TeamPage() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        role: 'staff',
        department: '',
        phone: '',
        password: '',
        jobTitle: '',
        customJobTitle: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user: currentUser } = useAuthStore();

    const fetchUsers = () => {
        api.get('/users').then(r => { setUsers(r.data); setLoading(false); });
    };
    useEffect(fetchUsers, []);

    const openEdit = (u) => {
        setEditing(u);
        setForm({
            name: u.name,
            email: u.email,
            role: u.role,
            department: u.department || '',
            phone: u.phone || '',
            password: '',
            jobTitle: u.jobTitle || '',
            customJobTitle: '',
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            name: '',
            email: '',
            role: 'staff',
            department: '',
            phone: '',
            password: '',
            jobTitle: '',
            customJobTitle: '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const payload = { ...form };
            payload.name = (payload.name || '').trim();
            payload.email = (payload.email || '').trim();
            payload.department = (payload.department || '').trim();
            payload.phone = (payload.phone || '').trim();

            if (!payload.name) return toast.error('Full name is required');
            if (!payload.email) return toast.error('Email is required');

            if (payload.phone) {
                const ok = /^[0-9+()\s-]{7,20}$/.test(payload.phone);
                if (!ok) return toast.error('Please enter a valid phone number');
            }

            if (payload.jobTitle === 'Other') {
                payload.jobTitle = payload.customJobTitle || '';
            }
            delete payload.customJobTitle;
            if (!payload.password) delete payload.password;
            if (editing) {
                await api.put(`/users/${editing._id}`, payload);
                toast.success('Team member updated');
            } else {
                await api.post('/auth/register', payload); // api.js handles the Auth header
                toast.success('Team member added');
            }
            setShowModal(false); fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (id === currentUser?._id) return toast.error("Can't delete yourself");
        if (!window.confirm('Remove this team member?')) return;
        await api.delete(`/users/${id}`);
        toast.success('User removed'); fetchUsers();
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        const rank = { admin: 3, manager: 2, staff: 1 };
        const roleDiff = (rank[b.role] || 0) - (rank[a.role] || 0);
        if (roleDiff !== 0) return roleDiff;
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Team</h2>
                    <p>{users.length} team members</p>
                </div>
                {currentUser?.role === 'admin' && (
                    <button onClick={openCreate} className="btn btn-primary"><HiOutlinePlus /> Add Member</button>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="search-input-wrapper">
                        <HiOutlineSearch className="search-icon" />
                        <input className="form-input" placeholder="Search team..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
                    </div>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Job Role</th>
                                <th>Phone</th>
                                <th>Access</th>
                                <th>Joined</th>
                                {currentUser?.role === 'admin' && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : sorted.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">👥</div><h3>No team members</h3><p>Add your first team member</p></div></td></tr>
                            ) : sorted.map(u => (
                                <tr key={u._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                                                {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                                                {u._id === currentUser?._id && <div style={{ fontSize: 11, color: 'var(--accent-primary)' }}>You</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{u.department || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{u.jobTitle || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{u.phone || '—'}</td>
                                    <td><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    {currentUser?.role === 'admin' && (
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => openEdit(u)} className="btn btn-ghost btn-icon"><HiOutlinePencil /></button>
                                                <button onClick={() => handleDelete(u._id)} className="btn btn-danger btn-icon"><HiOutlineTrash /></button>
                                            </div>
                                        </td>
                                    )}
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
                            <h3 className="modal-title">{editing ? 'Edit Member' : 'Add Team Member'}</h3>
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
                                        <label className="form-label">Email *</label>
                                        <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Access Level</label>
                                        <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                            <option value="staff">Staff</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Department</label>
                                        <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Job Role</label>
                                        <select
                                            className="form-select"
                                            value={form.jobTitle}
                                            onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                                        >
                                            <option value="">Select job role</option>
                                            {jobRoleOptions.map(option => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {form.jobTitle === 'Other' && (
                                        <div className="form-group">
                                            <label className="form-label">Custom Role</label>
                                            <input
                                                className="form-input"
                                                value={form.customJobTitle}
                                                onChange={e => setForm({ ...form, customJobTitle: e.target.value })}
                                                placeholder="e.g. Motion Graphics Artist"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            className="form-input"
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                            inputMode="tel"
                                            pattern="^[0-9+()\\s-]{7,20}$"
                                            title="Use 7–20 characters: digits, spaces, +, -, ( )"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{editing ? 'New Password (optional)' : 'Password *'}</label>
                                        <input type="password" className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={editing ? 0 : 6} required={!editing} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                    style={{ minWidth: 130, justifyContent: 'center' }}
                                >
                                    {saving ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                            {editing ? 'Updating...' : 'Adding...'}
                                        </span>
                                    ) : (
                                        editing ? 'Update' : 'Add Member'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
