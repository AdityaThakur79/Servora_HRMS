import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function HRMSPage() {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [ts, setTs] = useState(null);
    const [saving, setSaving] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [day, setDay] = useState(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });

    const { user } = useAuthStore();
    const canViewReports = user?.role === 'admin' || user?.role === 'manager';
    const isAdmin = user?.role === 'admin';
    const [teamMembers, setTeamMembers] = useState([]);
    const [reportMonth, setReportMonth] = useState(() => day.slice(0, 7)); // YYYY-MM
    const [reportUserId, setReportUserId] = useState('');
    const [report, setReport] = useState(null);

    const checkedIn = !!ts?.checkInAt && !ts?.checkOutAt;
    const isToday = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return day === `${yyyy}-${mm}-${dd}`;
    }, [day]);

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [sheet, proj, members] = await Promise.all([
                api.get('/hrms/day', { params: { day } }),
                api.get('/projects'),
                canViewReports ? api.get('/users') : Promise.resolve({ data: [] }),
            ]);
            setTs(sheet.data);
            setProjects(proj.data);
            setTeamMembers(Array.isArray(members.data) ? members.data : []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to load HRMS');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, user?._id]);

    const workedMinutes = useMemo(() => {
        if (!ts?.workBlocks) return 0;
        return ts.workBlocks.reduce((sum, b) => sum + Number(b.minutes || 0), 0);
    }, [ts]);

    const sessionSeconds = useMemo(() => {
        if (!checkedIn) return 0;
        const start = new Date(ts.checkInAt).getTime();
        return Math.max(0, Math.floor((now - start) / 1000));
    }, [checkedIn, now, ts]);

    const formatHMS = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const checkIn = async () => {
        if (!isToday) return toast.error('Check-in is only allowed for today');
        
        // Get user's location
        if (!navigator.geolocation) {
            return toast.error('Geolocation is not supported by your browser');
        }

        setSaving(true);
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const res = await api.post('/hrms/check-in', {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setTs(res.data);
                    toast.success('Checked in successfully');
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Unable to check in');
                } finally {
                    setSaving(false);
                }
            },
            (error) => {
                setSaving(false);
                let errorMessage = 'Unable to get your location';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = 'Location permission denied. Please enable location access.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = 'Location information unavailable';
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = 'Location request timed out';
                }
                toast.error(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const checkOut = async () => {
        if (!isToday) return toast.error('Check-out is only allowed for today');
        setSaving(true);
        try {
            const res = await api.post('/hrms/check-out');
            setTs(res.data);
            toast.success('Checked out');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to check out');
        } finally {
            setSaving(false);
        }
    };

    const roundDownHour = (d) => {
        const x = new Date(d);
        x.setMinutes(0, 0, 0);
        return x;
    };
    const roundUpHour = (d) => {
        const x = new Date(d);
        if (x.getMinutes() === 0 && x.getSeconds() === 0 && x.getMilliseconds() === 0) return x;
        x.setHours(x.getHours() + 1, 0, 0, 0);
        return x;
    };
    const formatSlot = (start) => {
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    };

    const [slotDrafts, setSlotDrafts] = useState({});

    useEffect(() => {
        // Reset drafts when day/sheet changes
        setSlotDrafts({});
    }, [day]);

    const slotRows = useMemo(() => {
        if (!ts?.checkInAt) return [];
        const start = roundDownHour(new Date(ts.checkInAt));
        const endBase = ts.checkOutAt ? new Date(ts.checkOutAt) : new Date(now);
        const end = roundUpHour(endBase);

        const slots = [];
        for (let t = start.getTime(); t < end.getTime(); t += 60 * 60 * 1000) {
            const slotStart = new Date(t);
            const block = (ts.workBlocks || []).find((b) => {
                const bStart = roundDownHour(new Date(b.startAt)).getTime();
                return bStart === slotStart.getTime() && Number(b.minutes) === 60;
            });
            slots.push({ slotStart, block });
        }
        return slots;
    }, [now, ts]);

    const slotKey = (d) => d.toISOString();

    const setDraft = (k, patch) => {
        setSlotDrafts((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), ...patch } }));
    };

    const saveSlot = async (slotStart, draft) => {
        if (!checkedIn) return toast.error('Check in first');
        if (!draft?.taskText) return toast.error('Please enter a task');
        setSaving(true);
        try {
            const res = await api.post('/hrms/work-blocks/slot', {
                startAt: slotStart.toISOString(),
                taskText: draft.taskText,
                project: draft.project || undefined,
                note: draft.note || '',
            });
            setTs(res.data);
            toast.success('Saved hour');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to save hour');
        } finally {
            setSaving(false);
        }
    };

    const projectLabel = (p) => {
        if (!p) return '';
        const name = p.name || '';
        const clientName = p.client?.name || '';
        return clientName ? `${name} \u2013 ${clientName}` : name;
    };

    const generateMonthlyReport = async () => {
        if (!canViewReports) return;
        if (!reportUserId) return toast.error('Select a member');
        if (!reportMonth) return toast.error('Select a month');
        setSaving(true);
        try {
            const res = await api.get('/hrms/reports/monthly', { params: { userId: reportUserId, month: reportMonth } });
            setReport(res.data);
            toast.success('Report generated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to generate report');
        } finally {
            setSaving(false);
        }
    };

    const downloadMonthlyReport = async () => {
        if (!isAdmin) return toast.error('Only admin can download reports');
        if (!reportUserId || !reportMonth) return;
        setSaving(true);
        try {
            const res = await api.get('/hrms/reports/monthly.csv', {
                params: { userId: reportUserId, month: reportMonth },
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monthly_report_${reportMonth}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unable to download report');
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

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>HRMS</h2>
                    <p>Check-in, check-out and log your work hours</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <input
                        type="date"
                        className="form-input"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        style={{ width: 165 }}
                    />
                    {!checkedIn ? (
                        <button className="btn btn-primary" onClick={checkIn} disabled={saving}>
                            {saving ? 'Checking in...' : 'Check In'}
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={checkOut} disabled={saving}>
                            {saving ? 'Checking out...' : 'Check Out'}
                        </button>
                    )}
                </div>
            </div>

            <div className="stats-grid">
                <Stat label="Session" value={checkedIn ? formatHMS(sessionSeconds) : '—'} />
                <Stat label="Work logged today" value={`${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m`} />
                <Stat label="Check-in" value={ts?.checkInAt ? new Date(ts.checkInAt).toLocaleTimeString() : '—'} />
                <Stat label="Check-out" value={ts?.checkOutAt ? new Date(ts.checkOutAt).toLocaleTimeString() : '—'} />
            </div>

            <div className="card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <div className="card-header">
                        <h3 className="card-title">Timeline</h3>
                    </div>

                    {!ts?.checkInAt ? (
                        <div className="empty-state" style={{ padding: 26 }}>
                            <div className="empty-icon">⏱️</div>
                            <p>Check in to start your timeline</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {slotRows.map(({ slotStart, block }) => {
                                const k = slotKey(slotStart);
                                const draft = slotDrafts[k] || {};
                                const taskValue = block?.taskText || draft.taskText || '';
                                const projectValue = block?.project?._id || block?.project || draft.project || '';
                                const noteValue = block?.note || draft.note || '';

                                return (
                                    <div key={k} style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                                            <div style={{ fontWeight: 900 }}>{formatSlot(slotStart)}</div>
                                            {block ? (
                                                <span className="badge badge-green">Logged</span>
                                            ) : (
                                                <span className="badge badge-neutral">Pending</span>
                                            )}
                                        </div>

                                        <div className="form-row" style={{ marginTop: 10 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Task</label>
                                                <input
                                                    className="form-input"
                                                    value={taskValue}
                                                    onChange={(e) => setDraft(k, { taskText: e.target.value })}
                                                    disabled={!!block}
                                                    placeholder="Task for this hour"
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Project</label>
                                                <select
                                                    className="form-select"
                                                    value={projectValue}
                                                    onChange={(e) => setDraft(k, { project: e.target.value })}
                                                    disabled={!!block}
                                                >
                                                    <option value="">No project</option>
                                                    {projects.map((p) => (
                                                        <option key={p._id} value={p._id}>{projectLabel(p)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginTop: 10 }}>
                                            <label className="form-label">Note</label>
                                            <input
                                                className="form-input"
                                                value={noteValue}
                                                onChange={(e) => setDraft(k, { note: e.target.value })}
                                                disabled={!!block}
                                                placeholder="What did you do in this hour?"
                                            />
                                        </div>

                                        {!block && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => saveSlot(slotStart, slotDrafts[k])}
                                                disabled={saving || !checkedIn}
                                            >
                                                Save hour
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            {canViewReports && (
                <div className="card" style={{ marginTop: 16, maxHeight: '60vh', overflowY: 'auto' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <h3 className="card-title">Monthly report</h3>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <select className="form-select" style={{ width: 240 }} value={reportUserId} onChange={(e) => setReportUserId(e.target.value)}>
                                <option value="">Select member</option>
                                {teamMembers.map((m) => (
                                    <option key={m._id} value={m._id}>
                                        {m.name} {m.jobTitle ? `(${m.jobTitle})` : ''}
                                    </option>
                                ))}
                            </select>
                            <input type="month" className="form-input" style={{ width: 160 }} value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
                            <button className="btn btn-primary" onClick={generateMonthlyReport} disabled={saving || !reportUserId || !reportMonth}>
                                {saving ? 'Generating...' : 'Generate'}
                            </button>
                            {isAdmin && (
                                <button className="btn btn-secondary" onClick={downloadMonthlyReport} disabled={saving || !report || !reportUserId || !reportMonth}>
                                    Download CSV
                                </button>
                            )}
                        </div>
                    </div>

                    {!report ? (
                        <div className="empty-state" style={{ padding: 18 }}>
                            <p>Select a member and month to generate a report.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
                            <div className="stats-grid">
                                <Stat label="Member" value={report.user?.name || '—'} />
                                <Stat label="Month" value={report.month} />
                                <Stat label="Total hours" value={`${report.totalHours}h`} />
                                <Stat label="Days with work" value={String(report.daysWithWork || 0)} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {(report.days || []).map((d) => (
                                    <div key={d.day} style={{ border: '1px solid var(--border-color)', borderRadius: 14, padding: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                                            <div style={{ fontWeight: 900 }}>{d.day}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                {d.workedMinutes ? `${Math.floor(d.workedMinutes / 60)}h ${d.workedMinutes % 60}m` : '0h 0m'}
                                            </div>
                                        </div>

                                        {d.blocks?.length ? (
                                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {d.blocks.map((b, idx) => (
                                                    <div key={idx} style={{ padding: 10, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--card)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                            <div style={{ fontWeight: 800 }}>
                                                                {new Date(b.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(b.endAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                            </div>
                                                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                                {b.project?.name ? b.project.name : 'No project'}
                                                            </div>
                                                        </div>
                                                        {(b.taskText || b.note) && (
                                                            <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontWeight: 700 }}>
                                                                {b.taskText ? b.taskText : '—'}
                                                                {b.note ? ` — ${b.note}` : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>No entries.</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="stat-card">
            <div className="stat-info">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
            </div>
        </div>
    );
}

