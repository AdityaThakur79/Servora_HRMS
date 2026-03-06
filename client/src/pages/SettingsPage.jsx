import { useState } from 'react';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineSave } from 'react-icons/hi';
import useAuthStore from '../store/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { user, logout } = useAuthStore();
    const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', department: user?.department || '' });
    const [password, setPassword] = useState({ current: '', newPass: '', confirm: '' });
    const [saving, setSaving] = useState(false);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/users/${user._id}`, { name: profile.name, phone: profile.phone, department: profile.department });
            toast.success('Profile updated successfully');
        } catch { toast.error('Failed to update profile'); }
        setSaving(false);
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (password.newPass !== password.confirm) return toast.error('Passwords do not match');
        if (password.newPass.length < 6) return toast.error('Password must be at least 6 characters');
        setSaving(true);
        try {
            await api.put(`/users/${user._id}`, { password: password.newPass });
            toast.success('Password updated');
            setPassword({ current: '', newPass: '', confirm: '' });
        } catch { toast.error('Failed to update password'); }
        setSaving(false);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Settings</h2>
                    <p>Manage your profile and account preferences</p>
                </div>
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
                {/* Profile Card */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <HiOutlineUser size={20} color="var(--accent-primary)" />
                            <h3 className="card-title" style={{ marginBottom: 0 }}>Profile Information</h3>
                        </div>
                    </div>

                    {/* Avatar */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 28, fontWeight: 700, boxShadow: '0 4px 20px rgba(124,92,252,0.4)'
                            }}>
                                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div style={{
                                position: 'absolute', bottom: 0, right: 0,
                                background: 'var(--green)', color: '#fff',
                                width: 18, height: 18, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, border: '2px solid var(--bg-card)'
                            }}>✓</div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{user?.email}</div>
                        <span className={`badge ${user?.role === 'admin' ? 'badge-purple' : user?.role === 'manager' ? 'badge-blue' : 'badge-neutral'}`} style={{ marginTop: 8 }}>
                            {user?.role}
                        </span>
                    </div>

                    <form onSubmit={handleProfileSave}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" value={profile.email} disabled style={{ opacity: 0.6 }} />
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 99999 99999" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <input className="form-input" value={profile.department} onChange={e => setProfile({ ...profile, department: e.target.value })} placeholder="e.g. Engineering" />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving}>
                            <HiOutlineSave /> {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Password Card */}
                    <div className="card">
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <HiOutlineLockClosed size={20} color="var(--accent-primary)" />
                                <h3 className="card-title" style={{ marginBottom: 0 }}>Change Password</h3>
                            </div>
                        </div>
                        <form onSubmit={handlePasswordSave}>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input type="password" className="form-input" value={password.newPass} onChange={e => setPassword({ ...password, newPass: e.target.value })} placeholder="At least 6 characters" required minLength={6} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input type="password" className="form-input" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} placeholder="Repeat new password" required />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving}>
                                <HiOutlineLockClosed /> Update Password
                            </button>
                        </form>
                    </div>

                    {/* System Info Card */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 16 }}>System Info</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Platform', value: 'Servora ERP v1.0' },
                                { label: 'Stack', value: 'MERN (MongoDB, Express, React, Node)' },
                                { label: 'Environment', value: 'Development' },
                                { label: 'Your Role', value: user?.role?.toUpperCase() || '—' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="card" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
                        <h3 className="card-title" style={{ marginBottom: 8, color: 'var(--red)' }}>Danger Zone</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>This will log you out of all sessions.</p>
                        <button onClick={() => { logout(); window.location.href = '/login'; }} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
                            Sign Out of All Sessions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
