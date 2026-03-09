import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlineUsers, HiOutlineBriefcase, HiOutlineClipboardList,
    HiOutlineDocumentText, HiOutlineTicket, HiOutlineCurrencyDollar,
    HiOutlineClock
} from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { format } from 'date-fns';

const statusBadge = (status) => {
    const map = {
        active: 'badge-green', completed: 'badge-blue', 'on-hold': 'badge-yellow',
        cancelled: 'badge-red', paid: 'badge-green', sent: 'badge-blue',
        overdue: 'badge-red', draft: 'badge-neutral', open: 'badge-orange',
        prospect: 'badge-yellow', inactive: 'badge-red',
    };
    return map[status] || 'badge-neutral';
};

function StatCard({ icon, label, value, color, bg, sub }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: bg, color }}>
                {icon}
            </div>
            <div className="stat-info">
                <div className="stat-value" style={{ color }}>{value}</div>
                <div className="stat-label">{label}</div>
                {sub && <div className="stat-change up">{sub}</div>}
            </div>
        </div>
    );
}

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hrmsToday, setHrmsToday] = useState(null);
    const [checkInPopupDismissed, setCheckInPopupDismissed] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [notCheckedOut, setNotCheckedOut] = useState([]);
    const [teamTasksToday, setTeamTasksToday] = useState([]);
    const { user } = useAuthStore();

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        if (isAdmin) {
            Promise.all([
                api.get('/dashboard/stats'),
                api.get('/hrms/not-checked-out').catch(() => ({ data: [] })),
                api.get('/hrms/team-tasks-today').catch(() => ({ data: [] }))
            ])
                .then(([statsRes, notCheckedOutRes, teamTasksRes]) => {
                    setStats(statsRes.data);
                    setNotCheckedOut(notCheckedOutRes.data);
                    setTeamTasksToday(teamTasksRes.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else {
            Promise.all([
                api.get(`/tasks?assignedTo=${user._id}`),
                api.get('/hrms/today').catch(() => ({ data: null })),
            ])
                .then(([tasksRes, hrmsRes]) => {
                    setMyTasks(tasksRes.data?.tasks ?? tasksRes.data ?? []);
                    setHrmsToday(hrmsRes.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [isAdmin, user]);

    const handleCheckIn = () => {
        if (!navigator.geolocation) {
            return toast.error('Geolocation is not supported by your browser');
        }

        setCheckingIn(true);
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await api.post('/hrms/check-in', {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setHrmsToday((prev) => (prev ? { ...prev, checkInAt: new Date().toISOString(), checkOutAt: null } : null));
                    setCheckInPopupDismissed(true);
                    toast.success('Checked in successfully');
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Could not check in');
                } finally {
                    setCheckingIn(false);
                }
            },
            (error) => {
                setCheckingIn(false);
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

    const showCheckInPopup = !isAdmin && !checkInPopupDismissed && hrmsToday && !hrmsToday.checkInAt;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const todayLabel = format(new Date(), 'EEEE, MMMM d');

    const { todayTasks, overdueTasks, upcomingTasks, completedToday } = useMemo(() => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const isBeforeToday = (d) => d && d < startOfToday;
        const isToday = (d) => d && d >= startOfToday && d <= endOfToday;
        const isAfterToday = (d) => d && d > endOfToday;

        const result = {
            todayTasks: [],
            overdueTasks: [],
            upcomingTasks: [],
            completedToday: [],
        };

        myTasks.forEach(t => {
            const due = t.dueDate ? new Date(t.dueDate) : null;
            if (t.status === 'done' && t.updatedAt && isToday(new Date(t.updatedAt))) {
                result.completedToday.push(t);
            }
            if (!due || t.status === 'done') return;
            if (isBeforeToday(due)) result.overdueTasks.push(t);
            else if (isToday(due)) result.todayTasks.push(t);
            else if (isAfterToday(due)) result.upcomingTasks.push(t);
        });

        return result;
    }, [myTasks]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (isAdmin) {
        return (
            <div className="fade-in">
                <div style={{ marginBottom: 28 }}>
                    <h2 style={{ fontSize: 26, fontWeight: 800 }}>
                        {greeting}, {user?.name?.split(' ')[0]} 👋
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                        Here's what's happening at Servora today.
                    </p>
                </div>

                <div className="stats-grid">
                    <StatCard icon={<HiOutlineUsers size={24} />} label="Total Clients" value={stats?.totalClients ?? 0} color="var(--blue)" bg="var(--blue-bg)" />
                    <StatCard icon={<HiOutlineBriefcase size={24} />} label="Active Projects" value={stats?.activeProjects ?? 0} color="var(--accent-primary)" bg="var(--accent-glow)" sub={`${stats?.totalProjects ?? 0} total`} />
                    <StatCard icon={<HiOutlineClipboardList size={24} />} label="Pending Tasks" value={stats?.pendingTasks ?? 0} color="var(--yellow)" bg="var(--yellow-bg)" sub={`${stats?.totalTasks ?? 0} total`} />
                    <StatCard icon={<HiOutlineCurrencyDollar size={24} />} label="Revenue Earned" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`} color="var(--green)" bg="var(--green-bg)" />
                    <StatCard icon={<HiOutlineDocumentText size={24} />} label="Pending Revenue" value={`₹${(stats?.pendingRevenue ?? 0).toLocaleString()}`} color="var(--orange)" bg="var(--orange-bg)" />
                    <StatCard icon={<HiOutlineTicket size={24} />} label="Open Requests" value={stats?.openRequests ?? 0} color="var(--red)" bg="var(--red-bg)" />
                </div>

                <div className="grid-2">
                    {/* Recent Clients */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Clients</h3>
                            <Link to="/clients" className="btn btn-ghost btn-sm">View all</Link>
                        </div>
                        {stats?.recentClients?.length ? (
                            <div>
                                {stats.recentClients.map(c => (
                                    <div key={c._id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                                {c.name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.company || 'Individual'}</div>
                                            </div>
                                        </div>
                                        <span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: 30 }}>
                                <div className="empty-icon">🤝</div>
                                <p>No clients yet</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Projects */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Projects</h3>
                            <Link to="/projects" className="btn btn-ghost btn-sm">View all</Link>
                        </div>
                        {stats?.recentProjects?.length ? (
                            <div>
                                {stats.recentProjects.map(p => (
                                    <div key={p._id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.client?.name || 'No client'}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <span className={`badge ${statusBadge(p.priority)}`}>{p.priority}</span>
                                            <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: 30 }}>
                                <div className="empty-icon">📁</div>
                                <p>No projects yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Not Checked Out */}
                {notCheckedOut.length > 0 && (
                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="card-header">
                            <h3 className="card-title">Not Checked Out</h3>
                            <span className="badge badge-orange">{notCheckedOut.length}</span>
                        </div>
                        <div>
                            {notCheckedOut.map(item => (
                                <div key={item.user._id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                            {item.user.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.user.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {item.user.jobTitle || item.user.email}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            Checked in: {new Date(item.checkInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            Logged: {Math.floor(item.workedMinutes / 60)}h {item.workedMinutes % 60}m
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Team Tasks Today */}
                {teamTasksToday.length > 0 && (
                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="card-header">
                            <h3 className="card-title">Team Tasks Today</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, padding: 16 }}>
                            {teamTasksToday.map(member => (
                                <div key={member.user._id} style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                                            {member.user.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700 }}>{member.user.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {member.user.jobTitle || 'Team Member'}
                                            </div>
                                        </div>
                                    </div>
                                    {member.tasks.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {member.tasks.map(task => (
                                                <div key={task._id} style={{ padding: 8, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            {task.project?.name || 'No project'}
                                                        </div>
                                                        <span className={`badge ${statusBadge(task.status)}`} style={{ fontSize: 10 }}>
                                                            {task.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
                                            No tasks today
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Member dashboard – focused on today's and pending tasks
    return (
        <div className="fade-in">
            {showCheckInPopup && (
                <div
                    className="card"
                    style={{
                        marginBottom: 24,
                        background: 'linear-gradient(135deg, var(--accent-glow) 0%, var(--card) 100%)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                        padding: '16px 20px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <HiOutlineClock size={24} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Start your day</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Check in to log your work hours</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setCheckInPopupDismissed(true)}>
                            Later
                        </button>
                        <button className="btn btn-primary" onClick={handleCheckIn} disabled={checkingIn}>
                            {checkingIn ? 'Checking in...' : 'Check in'}
                        </button>
                    </div>
                </div>
            )}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 26, fontWeight: 800 }}>
                    {greeting}, {user?.name?.split(' ')[0]} 👋
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                    Today is {todayLabel}. Here are your tasks.
                </p>
            </div>

            <div className="stats-grid">
                <StatCard
                    icon={<HiOutlineClipboardList size={22} />}
                    label="Today's Tasks"
                    value={todayTasks.length}
                    color="var(--accent-primary)"
                    bg="var(--accent-glow)"
                />
                <StatCard
                    icon={<HiOutlineClipboardList size={22} />}
                    label="Overdue Tasks"
                    value={overdueTasks.length}
                    color="var(--red)"
                    bg="var(--red-bg)"
                />
                <StatCard
                    icon={<HiOutlineClipboardList size={22} />}
                    label="Upcoming"
                    value={upcomingTasks.length}
                    color="var(--blue)"
                    bg="var(--blue-bg)"
                />
                <StatCard
                    icon={<HiOutlineClipboardList size={22} />}
                    label="Completed Today"
                    value={completedToday.length}
                    color="var(--green)"
                    bg="var(--green-bg)"
                />
            </div>

            <div className="grid-2" style={{ marginTop: 24 }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Today's Tasks</h3>
                        <Link to="/tasks" className="btn btn-ghost btn-sm">View all</Link>
                    </div>
                    {todayTasks.length ? (
                        <TaskList tasks={todayTasks} />
                    ) : (
                        <div className="empty-state" style={{ padding: 26 }}>
                            <div className="empty-icon">✅</div>
                            <p>No tasks due today</p>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Overdue (yesterday & before)</h3>
                        <Link to="/tasks" className="btn btn-ghost btn-sm">Manage tasks</Link>
                    </div>
                    {overdueTasks.length ? (
                        <TaskList tasks={overdueTasks} />
                    ) : (
                        <div className="empty-state" style={{ padding: 26 }}>
                            <div className="empty-icon">🎯</div>
                            <p>Nothing overdue. Great job!</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3 className="card-title">Quick access</h3>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 16 }}>
                    <Link to="/tasks" className="btn btn-secondary btn-sm">Go to Tasks</Link>
                    <Link to="/projects" className="btn btn-secondary btn-sm">View Projects</Link>
                    <Link to="/requests" className="btn btn-secondary btn-sm">Service Requests</Link>
                </div>
            </div>
        </div>
    );
}

function TaskList({ tasks }) {
    return (
        <div>
            {tasks.map(t => (
                <div
                    key={t._id}
                    className="flex-between"
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}
                >
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {t.project?.name || 'No project'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                marginBottom: 4,
                            }}
                        >
                            {t.dueDate ? format(new Date(t.dueDate), 'dd MMM') : 'No due date'}
                        </div>
                        <span className={`badge ${statusBadge(t.status)}`}>{t.status}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Dashboard;
