import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    HiOutlineUsers, HiOutlineBriefcase, HiOutlineClipboardList,
    HiOutlineDocumentText, HiOutlineTicket, HiOutlineCurrencyDollar
} from 'react-icons/hi';
import api from '../utils/api';
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
    const { user } = useAuthStore();

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        if (isAdmin) {
            api.get('/dashboard/stats')
                .then(res => { setStats(res.data); setLoading(false); })
                .catch(() => setLoading(false));
        } else {
            api.get(`/tasks?assignedTo=${user._id}`)
                .then(res => { setMyTasks(res.data); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [isAdmin, user]);

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
            </div>
        );
    }

    // Member dashboard – focused on today's and pending tasks
    return (
        <div className="fade-in">
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
