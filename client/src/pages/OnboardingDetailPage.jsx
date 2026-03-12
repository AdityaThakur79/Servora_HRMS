import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineClipboardCopy, HiOutlineExternalLink } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';

const BASE_URL = window.location.origin;

const SECTIONS = [
    { key: 'brand', icon: '🏢', label: 'Basic Brand Info', color: '#8b5cf6' },
    { key: 'about', icon: '💡', label: 'About the Brand', color: '#3b82f6' },
    { key: 'founder', icon: '👤', label: 'Founder Story', color: '#f59e0b' },
    { key: 'products', icon: '📦', label: 'Products / Services', color: '#f97316' },
    { key: 'mission', icon: '🎯', label: 'Mission & Vision', color: '#10b981' },
    { key: 'audience', icon: '👥', label: 'Target Audience', color: '#6366f1' },
    { key: 'personality', icon: '✨', label: 'Brand Personality', color: '#ec4899' },
    { key: 'competitors', icon: '⚔️', label: 'Competitors', color: '#ef4444' },
    { key: 'social', icon: '📱', label: 'Social Media', color: '#0ea5e9' },
    { key: 'content', icon: '🎬', label: 'Content & Goals', color: '#14b8a6' },
    { key: 'additional', icon: '📝', label: 'Additional Info', color: '#6b7280' },
];

function getSectionData(form) {
    return {
        brand: [
            ['Brand Name', form.brandName], ['Founder / Owner', form.founderName],
            ['Year Started', form.yearStarted], ['Business Type', form.businessType],
            ['Location', form.brandLocation], ['Email', form.contactEmail],
            ['Phone', form.contactPhone], ['Website', form.website],
        ],
        about: [
            ['Brand Description', form.brandDescription], ['Inspiration', form.brandInspiration],
            ['Problem Solved', form.problemSolved], ['What Makes It Unique', form.uniqueness],
        ],
        founder: [
            ["Founder's Journey", form.founderJourney], ['Why Started', form.whyStarted],
            ['Vision for the Future', form.futureVision], ['Achievements / Milestones', form.achievements],
        ],
        products: [
            ['Products / Services Offered', form.productsServices], ['Best Sellers', form.bestSellers],
            ['Signature Products', form.signatureProducts], ['Price Range', form.priceRange],
        ],
        mission: [
            ['Brand Mission', form.brandMission], ['Brand Vision', form.brandVision],
            ['Brand Values', form.brandValues],
        ],
        audience: [
            ['Ideal Customer', form.idealCustomer], ['Age Group', form.ageGroup],
            ['Audience Location', form.audienceLocation], ['Typical Buyers', form.typicalBuyers],
        ],
        personality: (form.brandPersonality || []),
        competitors: [
            ['Main Competitors', form.competitors], ['Inspiring Brands', form.inspiringBrands],
        ],
        social: [
            ['Instagram', form.instagram], ['Facebook', form.facebook],
            ['YouTube', form.youtube], ['TikTok / Reels', form.tiktok],
            ['Follower Count', form.followerCount],
        ],
        content: {
            preferences: form.contentPreferences || [],
            goals: form.campaignGoals || [],
        },
        additional: [
            ['Upcoming Events / Launches', form.upcomingEvents],
            ['Special Message', form.specialMessage],
            ['Additional Info', form.additionalInfo],
        ],
    };
}

export default function OnboardingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('brand');

    useEffect(() => {
        api.get(`/onboarding/${id}`)
            .then(r => setForm(r.data))
            .catch(() => toast.error('Unable to load form'))
            .finally(() => setLoading(false));
    }, [id]);

    const data = useMemo(() => form ? getSectionData(form) : null, [form]);

    const initials = useMemo(() => {
        const name = form?.brandName || form?.clientName || '';
        if (!name) return '?';
        return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }, [form]);

    const statusMap = {
        draft: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', label: 'Draft' },
        sent: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Sent' },
        submitted: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Submitted' },
    };

    const copyLink = () => {
        if (!form?.token) return;
        navigator.clipboard.writeText(`${BASE_URL}/onboarding/fill/${form.token}`);
        toast.success('Link copied');
    };

    if (loading) return <div className="flex-center" style={{ height: '60vh' }}><div className="spinner" /></div>;
    if (!form) return <div className="card"><p style={{ color: 'var(--text-secondary)' }}>Form not found</p><button className="btn btn-secondary" onClick={() => navigate('/onboarding')}>Back</button></div>;

    const st = statusMap[form.status] || statusMap.draft;
    const filledSections = SECTIONS.filter(s => {
        const d = data[s.key];
        if (!d) return false;
        if (Array.isArray(d) && d.length > 0 && Array.isArray(d[0])) return d.some(([, v]) => v);
        if (Array.isArray(d)) return d.length > 0;
        if (typeof d === 'object') return (d.preferences?.length > 0 || d.goals?.length > 0);
        return false;
    });
    const completionPct = Math.round((filledSections.length / SECTIONS.length) * 100);

    return (
        <div className="fade-in ob-detail">
            {/* Header */}
            <button className="btn btn-ghost btn-icon" style={{ marginBottom: 12 }} onClick={() => navigate('/onboarding')}>
                <HiOutlineArrowLeft /> Back
            </button>

            <div className="ob-header-card card">
                <div className="ob-header-top">
                    <div className="ob-avatar">{initials}</div>
                    <div className="ob-header-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 850 }}>{form.brandName || form.clientName || form.client?.name || '—'}</h2>
                            <span style={{ padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        {form.businessType && <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 14 }}>{form.businessType}{form.brandLocation ? ` · ${form.brandLocation}` : ''}</p>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            {form.contactEmail && <span className="chip">📧 {form.contactEmail}</span>}
                            {form.contactPhone && <span className="chip">📞 {form.contactPhone}</span>}
                            {form.website && <span className="chip">🌐 {form.website}</span>}
                            {form.createdBy?.name && <span className="chip">Created by: {form.createdBy.name}</span>}
                        </div>
                    </div>
                </div>

                <div className="ob-header-actions">
                    <div className="ob-progress-bar">
                        <div className="ob-progress-fill" style={{ width: `${completionPct}%` }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{completionPct}% completed · {filledSections.length}/{SECTIONS.length} sections</span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={copyLink}><HiOutlineClipboardCopy /> Copy Link</button>
                        <a href={`${BASE_URL}/onboarding/fill/${form.token}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><HiOutlineExternalLink /> Open Form</a>
                    </div>
                </div>
            </div>

            {/* Section Nav + Content */}
            <div className="ob-layout">
                <div className="ob-sidebar card">
                    {SECTIONS.map(s => {
                        const filled = filledSections.some(f => f.key === s.key);
                        return (
                            <button
                                key={s.key}
                                className={`ob-nav-item ${activeSection === s.key ? 'active' : ''}`}
                                onClick={() => setActiveSection(s.key)}
                            >
                                <span className="ob-nav-icon">{s.icon}</span>
                                <span className="ob-nav-label">{s.label}</span>
                                {filled && <span className="ob-nav-check">✓</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="ob-content card">
                    {SECTIONS.filter(s => s.key === activeSection).map(s => (
                        <div key={s.key}>
                            <div className="ob-section-header">
                                <span style={{ fontSize: 24 }}>{s.icon}</span>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: s.color }}>{s.label}</h3>
                            </div>
                            <SectionContent sectionKey={s.key} data={data[s.key]} color={s.color} />
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .ob-detail { display: flex; flex-direction: column; gap: 8px; }
                .ob-header-card { padding: 24px; }
                .ob-header-top { display: flex; gap: 16px; align-items: flex-start; }
                .ob-avatar {
                    width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 18; color: #FFF7F3;
                    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                    box-shadow: 0 8px 24px rgba(65,54,52,0.15);
                }
                .ob-header-info { flex: 1; }
                .ob-header-actions { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); }
                .ob-progress-bar {
                    width: 100%; height: 6px; border-radius: 3px;
                    background: var(--bg-secondary); overflow: hidden; margin-bottom: 6px;
                }
                .ob-progress-fill {
                    height: 100%; border-radius: 3px;
                    background: linear-gradient(90deg, #10b981, #34d399);
                    transition: width 0.4s ease;
                }
                .chip {
                    display: inline-flex; align-items: center; padding: 5px 10px;
                    border-radius: 999px; background: var(--bg-secondary);
                    border: 1px solid var(--border-color); color: var(--text-secondary);
                    font-size: 12px; white-space: nowrap;
                }
                .ob-layout { display: grid; grid-template-columns: 240px 1fr; gap: 12px; }
                @media (max-width: 860px) { .ob-layout { grid-template-columns: 1fr; } }
                .ob-sidebar { padding: 8px; display: flex; flex-direction: column; gap: 2px; align-self: start; position: sticky; top: 16px; }
                .ob-nav-item {
                    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
                    border-radius: 10px; border: none; background: transparent;
                    cursor: pointer; text-align: left; font-size: 13px; font-weight: 600;
                    color: var(--text-secondary); transition: all 0.15s;
                    width: 100%;
                }
                .ob-nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
                .ob-nav-item.active { background: var(--accent-primary); color: #FFF7F3; }
                .ob-nav-icon { font-size: 16px; flex-shrink: 0; }
                .ob-nav-label { flex: 1; }
                .ob-nav-check { font-size: 11px; color: #10b981; }
                .ob-nav-item.active .ob-nav-check { color: #FFF7F3; }
                .ob-content { padding: 28px; min-height: 300px; }
                .ob-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 2px solid var(--border-color); }
                .ob-field { margin-bottom: 18px; }
                .ob-field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px; }
                .ob-field-value { font-size: 14px; font-weight: 600; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap; }
                .ob-empty { color: var(--text-muted); font-style: italic; font-size: 13px; }
                .ob-tags { display: flex; flex-wrap: wrap; gap: 8px; }
                .ob-tag {
                    padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
                    border: 1px solid var(--border-color); background: var(--bg-secondary);
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
}

function SectionContent({ sectionKey, data, color }) {
    if (!data) return <p className="ob-empty">No data submitted for this section.</p>;

    // Personality — array of strings
    if (sectionKey === 'personality') {
        if (data.length === 0) return <p className="ob-empty">No personality traits selected.</p>;
        return (
            <div className="ob-tags">
                {data.map(t => <span key={t} className="ob-tag" style={{ borderColor: color, color }}>{t}</span>)}
            </div>
        );
    }

    // Content & Goals — object with preferences + goals
    if (sectionKey === 'content') {
        const { preferences = [], goals = [] } = data;
        if (preferences.length === 0 && goals.length === 0) return <p className="ob-empty">No preferences or goals selected.</p>;
        return (
            <>
                {preferences.length > 0 && (
                    <div className="ob-field">
                        <div className="ob-field-label">Content Preferences</div>
                        <div className="ob-tags" style={{ marginTop: 6 }}>
                            {preferences.map(p => <span key={p} className="ob-tag" style={{ borderColor: color, color }}>{p}</span>)}
                        </div>
                    </div>
                )}
                {goals.length > 0 && (
                    <div className="ob-field">
                        <div className="ob-field-label">Campaign Goals</div>
                        <div className="ob-tags" style={{ marginTop: 6 }}>
                            {goals.map(g => <span key={g} className="ob-tag" style={{ borderColor: color, color }}>{g}</span>)}
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Key-value pairs
    const filled = data.filter(([, v]) => v);
    if (filled.length === 0) return <p className="ob-empty">No data submitted for this section.</p>;

    return (
        <div>
            {filled.map(([label, value]) => (
                <div key={label} className="ob-field">
                    <div className="ob-field-label">{label}</div>
                    <div className="ob-field-value">{value}</div>
                </div>
            ))}
        </div>
    );
}
