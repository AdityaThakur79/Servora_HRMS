import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

const personalityOptions = ['Premium', 'Modern', 'Traditional', 'Luxury', 'Friendly', 'Bold', 'Minimal', 'Fun', 'Elegant', 'Creative'];
const contentOptions = ['Educational', 'Behind the Scenes', 'Founder Story', 'Product Showcases', 'Customer Testimonials', 'Reels / Short Videos', 'Promotions / Offers'];
const goalOptions = ['Increase brand awareness', 'Get more customers', 'Build personal brand', 'Increase followers', 'Promote products', 'Drive store visits'];

export default function OnboardingPublicPage() {
    const { token } = useParams();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        api.get(`/onboarding/public/${token}`)
            .then(r => {
                if (r.data.status === 'submitted') setSubmitted(true);
                setForm(r.data);
            })
            .catch(() => setError('Form not found or link is invalid.'))
            .finally(() => setLoading(false));
    }, [token]);

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const toggleArray = (field, val) => {
        setForm(prev => {
            const arr = prev[field] || [];
            return { ...prev, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
        });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await api.put(`/onboarding/public/${token}`, form);
            setSubmitted(true);
        } catch { alert('Something went wrong. Please try again.'); }
        finally { setSubmitting(false); }
    };

    const sections = [
        {
            title: '1. Basic Brand Information',
            fields: (
                <>
                    <Field label="Brand Name" value={form?.brandName} onChange={v => update('brandName', v)} />
                    <Field label="Founder / Owner Name" value={form?.founderName} onChange={v => update('founderName', v)} />
                    <Field label="Year the Brand Started" value={form?.yearStarted} onChange={v => update('yearStarted', v)} />
                    <Field label="Business Type (Restaurant / Café / Personal Brand / Company)" value={form?.businessType} onChange={v => update('businessType', v)} />
                    <Field label="Brand Location (City / Area)" value={form?.brandLocation} onChange={v => update('brandLocation', v)} />
                    <Field label="Contact Email" value={form?.contactEmail} onChange={v => update('contactEmail', v)} type="email" />
                    <Field label="Contact Phone Number" value={form?.contactPhone} onChange={v => update('contactPhone', v)} />
                    <Field label="Website (if available)" value={form?.website} onChange={v => update('website', v)} />
                </>
            ),
        },
        {
            title: '2. About the Brand',
            fields: (
                <>
                    <TextArea label="Briefly describe your brand" value={form?.brandDescription} onChange={v => update('brandDescription', v)} />
                    <TextArea label="What inspired you to start this brand?" value={form?.brandInspiration} onChange={v => update('brandInspiration', v)} />
                    <TextArea label="What problem does your brand solve?" value={form?.problemSolved} onChange={v => update('problemSolved', v)} />
                    <TextArea label="What makes your brand unique?" value={form?.uniqueness} onChange={v => update('uniqueness', v)} />
                </>
            ),
        },
        {
            title: '3. Founder Story',
            fields: (
                <>
                    <TextArea label="Tell us about the founder's journey" value={form?.founderJourney} onChange={v => update('founderJourney', v)} />
                    <TextArea label="Why did you start this brand?" value={form?.whyStarted} onChange={v => update('whyStarted', v)} />
                    <TextArea label="What is your vision for the future?" value={form?.futureVision} onChange={v => update('futureVision', v)} />
                    <TextArea label="Any achievements or milestones?" value={form?.achievements} onChange={v => update('achievements', v)} />
                </>
            ),
        },
        {
            title: '4. Products / Services',
            fields: (
                <>
                    <TextArea label="What products or services do you offer?" value={form?.productsServices} onChange={v => update('productsServices', v)} />
                    <Field label="What are your best-selling items?" value={form?.bestSellers} onChange={v => update('bestSellers', v)} />
                    <Field label="Do you have any signature products?" value={form?.signatureProducts} onChange={v => update('signatureProducts', v)} />
                    <Field label="Average price range of your offerings" value={form?.priceRange} onChange={v => update('priceRange', v)} />
                </>
            ),
        },
        {
            title: '5. Brand Mission & Vision',
            fields: (
                <>
                    <TextArea label="Brand Mission" value={form?.brandMission} onChange={v => update('brandMission', v)} />
                    <TextArea label="Brand Vision" value={form?.brandVision} onChange={v => update('brandVision', v)} />
                    <Field label="Brand Values (e.g. quality, innovation, sustainability)" value={form?.brandValues} onChange={v => update('brandValues', v)} />
                </>
            ),
        },
        {
            title: '6. Target Audience',
            fields: (
                <>
                    <Field label="Who is your ideal customer?" value={form?.idealCustomer} onChange={v => update('idealCustomer', v)} />
                    <Field label="Age group of your target audience" value={form?.ageGroup} onChange={v => update('ageGroup', v)} />
                    <Field label="Location of your audience" value={form?.audienceLocation} onChange={v => update('audienceLocation', v)} />
                    <TextArea label="What kind of people usually visit or buy from you?" value={form?.typicalBuyers} onChange={v => update('typicalBuyers', v)} />
                </>
            ),
        },

        {
            title: '7. Brand Personality',
            fields: (
                <>
                    <p style={{ color: '#888', marginBottom: 12, fontSize: 14 }}>Select words that describe your brand:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {personalityOptions.map(opt => (
                            <CheckChip key={opt} label={opt} checked={(form?.brandPersonality || []).includes(opt)} onChange={() => toggleArray('brandPersonality', opt)} />
                        ))}
                    </div>
                </>
            ),
        },
        {
            title: '8. Competitors',
            fields: (
                <>
                    <TextArea label="Who are your main competitors?" value={form?.competitors} onChange={v => update('competitors', v)} />
                    <TextArea label="Which brands inspire you?" value={form?.inspiringBrands} onChange={v => update('inspiringBrands', v)} />
                </>
            ),
        },
        {
            title: '9. Social Media Presence',
            fields: (
                <>
                    <Field label="Instagram" value={form?.instagram} onChange={v => update('instagram', v)} />
                    <Field label="Facebook" value={form?.facebook} onChange={v => update('facebook', v)} />
                    <Field label="YouTube" value={form?.youtube} onChange={v => update('youtube', v)} />
                    <Field label="TikTok / Reels Platforms" value={form?.tiktok} onChange={v => update('tiktok', v)} />
                    <Field label="Current follower count (if known)" value={form?.followerCount} onChange={v => update('followerCount', v)} />
                </>
            ),
        },
        {
            title: '10. Content Preferences',
            fields: (
                <>
                    <p style={{ color: '#888', marginBottom: 12, fontSize: 14 }}>What type of content do you like?</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {contentOptions.map(opt => (
                            <CheckChip key={opt} label={opt} checked={(form?.contentPreferences || []).includes(opt)} onChange={() => toggleArray('contentPreferences', opt)} />
                        ))}
                    </div>
                </>
            ),
        },
        {
            title: '11. Campaign Goals',
            fields: (
                <>
                    <p style={{ color: '#888', marginBottom: 12, fontSize: 14 }}>What do you want to achieve with social media?</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {goalOptions.map(opt => (
                            <CheckChip key={opt} label={opt} checked={(form?.campaignGoals || []).includes(opt)} onChange={() => toggleArray('campaignGoals', opt)} />
                        ))}
                    </div>
                </>
            ),
        },
        {
            title: '12. Additional Information',
            fields: (
                <>
                    <TextArea label="Any upcoming events or launches?" value={form?.upcomingEvents} onChange={v => update('upcomingEvents', v)} />
                    <TextArea label="Any special message you want to communicate?" value={form?.specialMessage} onChange={v => update('specialMessage', v)} />
                    <TextArea label="Anything else we should know about your brand?" value={form?.additionalInfo} onChange={v => update('additionalInfo', v)} />
                </>
            ),
        },
    ];

    if (loading) return <PageShell><div className="spinner" style={{ margin: '80px auto' }} /></PageShell>;
    if (error) return <PageShell><div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}><h2>Oops</h2><p>{error}</p></div></PageShell>;
    if (submitted) return (
        <PageShell>
            <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <h2 style={{ marginBottom: 8 }}>Thank You!</h2>
                <p style={{ color: '#888' }}>Your brand information has been submitted successfully. We'll be in touch soon.</p>
            </div>
        </PageShell>
    );

    const current = sections[step];
    const isLast = step === sections.length - 1;

    return (
        <PageShell>
            {/* Progress */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
                {sections.map((_, i) => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= step ? 'var(--accent-primary, #8b5cf6)' : '#e5e7eb',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: '#1e1e30' }}>{current.title}</h2>
            {current.fields}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                <button
                    onClick={() => setStep(s => s - 1)}
                    disabled={step === 0}
                    style={{
                        padding: '10px 24px', borderRadius: 10, border: '1px solid #d1d5db',
                        background: '#fff', fontWeight: 700, fontSize: 14, cursor: step === 0 ? 'not-allowed' : 'pointer',
                        opacity: step === 0 ? 0.4 : 1,
                    }}
                >
                    ← Back
                </button>
                {isLast ? (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        style={{
                            padding: '10px 32px', borderRadius: 10, border: 'none',
                            background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit ✓'}
                    </button>
                ) : (
                    <button
                        onClick={() => setStep(s => s + 1)}
                        style={{
                            padding: '10px 24px', borderRadius: 10, border: 'none',
                            background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        Next →
                    </button>
                )}
            </div>
        </PageShell>
    );
}

function PageShell({ children }) {
    return (
        <div style={{
            minHeight: '100vh', background: 'linear-gradient(135deg, #f8f7ff 0%, #fff 100%)',
            display: 'flex', justifyContent: 'center', padding: '40px 16px',
        }}>
            <div style={{
                width: '100%', maxWidth: 640, background: '#fff',
                borderRadius: 20, padding: '36px 32px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.06)', alignSelf: 'flex-start',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <img src="/logo.png" alt="Servora" style={{ height: 36, marginBottom: 8 }} />
                    <p style={{ color: '#888', fontSize: 13 }}>Client Onboarding Questionnaire</p>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text' }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
            <input
                type={type}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                    transition: 'border 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
        </div>
    );
}

function TextArea({ label, value, onChange }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                rows={3}
                style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
                    resize: 'vertical', fontFamily: 'inherit',
                    transition: 'border 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
        </div>
    );
}

function CheckChip({ label, checked, onChange }) {
    return (
        <button
            type="button"
            onClick={onChange}
            style={{
                padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: checked ? '2px solid #8b5cf6' : '1px solid #d1d5db',
                background: checked ? 'rgba(139,92,246,0.1)' : '#fff',
                color: checked ? '#8b5cf6' : '#6b7280',
                cursor: 'pointer', transition: 'all 0.15s',
            }}
        >
            {checked ? '✓ ' : ''}{label}
        </button>
    );
}
