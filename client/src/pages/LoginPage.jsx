import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import api from '../utils/api';

function LoginPage() {
    const navigate = useNavigate();
    const { login, register, isLoading } = useAuthStore();
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [allowRegistration, setAllowRegistration] = useState(true);

    useEffect(() => {
        const checkUsers = async () => {
            try {
                const res = await api.get('/auth/has-users');
                if (res.data.hasUsers) {
                    setAllowRegistration(false);
                    setIsRegister(false);
                }
            } catch (err) {
                console.error("Error checking users:", err);
            }
        };
        checkUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        let result;
        if (isRegister) {
            result = await register(form.name, form.email, form.password);
        } else {
            result = await login(form.email, form.password);
        }
        if (result.success) {
            toast.success(isRegister ? 'Account created!' : 'Welcome back!');
            navigate('/');
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="login-orb orb-1" />
                <div className="login-orb orb-2" />
            </div>
            <div className="login-card">
                <div className="login-logo">
                    <img src="/logo.png" alt="Servora Logo" className="logo-icon" style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 12px', display: 'block' }} />
                    <h1>Servora</h1>
                    <p>Internal Management Platform</p>
                </div>

                <div className="login-tabs">
                    <button
                        className={`login-tab ${!isRegister ? 'active' : ''}`}
                        onClick={() => setIsRegister(false)}
                    >Sign In</button>
                    {allowRegistration && (
                        <button
                            className={`login-tab ${isRegister ? 'active' : ''}`}
                            onClick={() => setIsRegister(true)}
                        >Create Account</button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {isRegister && (
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <div className="input-icon-wrap">
                                <HiOutlineUser className="input-icon" />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="John Smith"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="input-icon-wrap">
                            <HiOutlineMail className="input-icon" />
                            <input
                                type="email"
                                className="form-input"
                                placeholder="you@servora.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="input-icon-wrap">
                            <HiOutlineLockClosed className="input-icon" />
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 8 }} disabled={isLoading}>
                        {isLoading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                {isRegister && (
                    <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                        The first registered account becomes the Admin.
                    </p>
                )}
            </div>

            <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }
        .login-bg { position: absolute; inset: 0; pointer-events: none; }
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: var(--accent-primary);
          top: -100px; left: -100px;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: #413634;
          bottom: -80px; right: -80px;
        }
        .login-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          box-shadow: 0 20px 60px rgba(0,0,0,0.08);
          animation: slideUp 0.4s ease;
        }
        .login-logo { text-align: center; margin-bottom: 28px; }
        .login-logo h1 { font-size: 26px; font-weight: 800; background: linear-gradient(135deg, #413634 0%, var(--accent-primary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .login-logo p { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
        .login-tabs {
          display: flex;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 4px;
          margin-bottom: 24px;
        }
        .login-tab {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .login-tab.active {
          background: var(--accent-primary);
          color: #FFF7F3;
          box-shadow: 0 2px 8px rgba(65, 54, 52, 0.2);
        }
        .login-form { display: flex; flex-direction: column; }
        .input-icon-wrap { position: relative; }
        .input-icon {
          position: absolute;
          left: 12px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 16px;
        }
        .input-icon-wrap .form-input { padding-left: 40px; }
      `}</style>
        </div>
    );
}

export default LoginPage;
