import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlinePencil, HiOutlineClipboardList } from 'react-icons/hi';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

const statusColors = {
    active: 'badge-green',
    completed: 'badge-blue',
    'on-hold': 'badge-yellow',
    cancelled: 'badge-red',
};

const priorityColors = {
    low: 'badge-neutral',
    medium: 'badge-blue',
    high: 'badge-orange',
};

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [tasksState, setTasksState] = useState({
        rows: [],
        page: 1,
        totalPages: 1,
        total: 0,
    });
    const [tasksLoading, setTasksLoading] = useState(false);
    const [assignedFilter, setAssignedFilter] = useState('all');
    const [updatingTaskId, setUpdatingTaskId] = useState(null);
    const [related, setRelated] = useState({
        invoices: [],
        requests: [],
        loading: false,
    });

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        api.get(`/projects/${id}`)
            .then((res) => {
                if (!isMounted) return;
                setProject(res.data);
                setLoading(false);
            })
            .catch(() => {
                if (!isMounted) return;
                setError('Unable to load project');
                setLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [id]);

    const projectId = project?._id;
    const clientId = project?.client?._id;

    useEffect(() => {
        if (!projectId || !clientId) return;
        let cancelled = false;
        setRelated(prev => ({ ...prev, loading: true }));
        Promise.all([
            api.get('/invoices', { params: { project: projectId } }),
            api.get('/requests', { params: { client: clientId } }),
        ])
            .then(([inv, req]) => {
                if (cancelled) return;
                setRelated({
                    invoices: inv.data.slice(0, 3),
                    requests: req.data.slice(0, 3),
                    loading: false,
                });
            })
            .catch(() => {
                if (cancelled) return;
                setRelated(prev => ({ ...prev, loading: false }));
            });
        return () => {
            cancelled = true;
        };
    }, [projectId, clientId]);

    const loadTasks = (page = 1, assigned = assignedFilter) => {
        if (!id) return;
        setTasksLoading(true);
        const params = { project: id, page, limit: 5 };
        if (assigned !== 'all') params.assignedTo = assigned;
        api.get('/tasks', { params })
            .then((res) => {
                if (Array.isArray(res.data)) {
                    // Fallback if pagination is not applied for some reason
                    setTasksState({
                        rows: res.data,
                        page: 1,
                        totalPages: 1,
                        total: res.data.length,
                    });
                } else {
                    setTasksState({
                        rows: res.data.tasks,
                        page: res.data.page,
                        totalPages: res.data.totalPages,
                        total: res.data.total,
                    });
                }
                setTasksLoading(false);
            })
            .catch(() => {
                setTasksState(prev => ({ ...prev, rows: [] }));
                setTasksLoading(false);
            });
    };

    useEffect(() => {
        if (activeTab === 'tasks') {
            loadTasks(1, assignedFilter);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, assignedFilter]);

    const smm = project?.serviceType === 'smm' ? project.serviceDetails || {} : null;

    const assignedOptions = useMemo(() => {
        if (project?.assignedTo && project.assignedTo.length > 0) {
            return project.assignedTo;
        }
        const map = new Map();
        tasksState.rows.forEach((t) => {
            if (t.assignedTo) {
                const key = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo._id;
                if (!map.has(key)) {
                    map.set(key, t.assignedTo);
                }
            }
        });
        return Array.from(map.values());
    }, [project, tasksState.rows]);

    const getAssigneeLabel = (task) => {
        if (!task.assignedTo) return 'Unassigned';
        if (typeof task.assignedTo === 'string') {
            const fromProject = project?.assignedTo?.find(u => u._id === task.assignedTo);
            return fromProject?.name || 'Unassigned';
        }
        return task.assignedTo.name || 'Unassigned';
    };

    const normalizeStatus = (raw) => {
        const s = String(raw || '').trim().toLowerCase();
        const map = {
            'todo': 'todo',
            'to do': 'todo',
            'in-progress': 'in-progress',
            'in progress': 'in-progress',
            'inprogress': 'in-progress',
            'review': 'review',
            'done': 'done',
            'completed': 'done',
        };
        return map[s] || 'todo';
    };

    const canUpdateStatus = (task) => {
        if (isAdmin) return true;
        const assignedId = typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?._id;
        return !!assignedId && assignedId === user?._id;
    };

    const updateTaskStatus = async (task, status) => {
        if (!task?._id) return;
        if (!canUpdateStatus(task)) return;
        setUpdatingTaskId(task._id);
        const prev = task.status;
        setTasksState((prevState) => ({
            ...prevState,
            rows: prevState.rows.map((t) => (t._id === task._id ? { ...t, status } : t)),
        }));
        try {
            await api.put(`/tasks/${task._id}`, { status });
        } catch {
            setTasksState((prevState) => ({
                ...prevState,
                rows: prevState.rows.map((t) => (t._id === task._id ? { ...t, status: prev } : t)),
            }));
        } finally {
            setUpdatingTaskId(null);
        }
    };

    if (loading) {
        return (
            <div className="fade-in">
                <div className="page-header">
                    <div>
                        <h2>Project</h2>
                        <p>Loading project...</p>
                    </div>
                </div>
                <div className="card" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="fade-in">
                <div className="page-header">
                    <div>
                        <h2>Project</h2>
                        <p>Something went wrong</p>
                    </div>
                </div>
                <div className="card" style={{ padding: 24 }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{error || 'Project not found'}</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in project-detail-page">
            <div className="page-header">
                <div>
                    <button
                        className="btn btn-ghost btn-icon"
                        style={{ marginBottom: 10 }}
                        onClick={() => navigate('/projects')}
                    >
                        <HiOutlineArrowLeft /> Back
                    </button>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {project.name}
                        <span className={`badge ${statusColors[project.status]}`}>{project.status}</span>
                        <span className={`badge ${priorityColors[project.priority]}`}>{project.priority}</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                        Client: <strong>{project.client?.name || '—'}</strong>{' '}
                        {project.client?.company && <span> · {project.client.company}</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
                        Back to list
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/projects', { state: { editId: project._id } })}>
                        <HiOutlinePencil /> Edit Project
                    </button>
                </div>
            </div>

            <div className="project-tabs">
                <button
                    className={`project-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`project-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    <HiOutlineClipboardList style={{ marginRight: 6 }} /> Tasks
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="project-layout">
                    <div className="card">
                        <div className="card-header">
                            <h3>Overview</h3>
                        </div>
                        <div className="card-body">
                            <div className="detail-grid">
                                <DetailItem label="Status" value={project.status} />
                                <DetailItem label="Priority" value={project.priority} />
                                {isAdmin && (
                                    <DetailItem
                                        label="Budget"
                                        value={
                                            project.budget
                                                ? `₹${Number(project.budget).toLocaleString()}`
                                                : '—'
                                        }
                                    />
                                )}
                                <DetailItem
                                    label="Start Date"
                                    value={
                                        project.startDate
                                            ? new Date(project.startDate).toLocaleDateString()
                                            : '—'
                                    }
                                />
                                <DetailItem
                                    label="Due Date"
                                    value={
                                        project.dueDate
                                            ? new Date(project.dueDate).toLocaleDateString()
                                            : '—'
                                    }
                                />
                                <DetailItem
                                    label="Created"
                                    value={
                                        project.createdAt
                                            ? new Date(project.createdAt).toLocaleDateString()
                                            : '—'
                                    }
                                />
                                <DetailItem label="Category" value={project.workstream || (project.serviceType === 'smm' ? 'smm' : 'general')} />
                                <DetailItem label="Type" value={project.serviceType || 'general'} />
                                <DetailItem
                                    label="Created By"
                                    value={project.createdBy?.name || '—'}
                                />
                            </div>
                            {project.description && (
                                <div style={{ marginTop: 24 }}>
                                    <div className="section-label">Project Plan / Notes</div>
                                    <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
                                        {project.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {smm && (
                        <div className="card">
                            <div className="card-header">
                                <h3>SMM Plan Tracking</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                    <MetricCard
                                        label="Package"
                                        value={smm.planName ? smm.planName.toUpperCase() : 'Custom'}
                                    />
                                    <MetricCard label="Reels / month" value={smm.reels ?? '—'} />
                                    <MetricCard label="Posts / month" value={smm.posts ?? '—'} />
                                    <MetricCard label="Stories / month" value={smm.stories ?? '—'} />
                                </div>
                                {smm.notes && (
                                    <div style={{ marginTop: 24 }}>
                                        <div className="section-label">SMM Notes</div>
                                        <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
                                            {smm.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {project.assignedTo && project.assignedTo.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3>Assigned Team</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    {project.assignedTo.map((user) => (
                                        <div key={user._id} className="chip">
                                            <span style={{ fontWeight: 500 }}>{user.name}</span>
                                            {user.email && (
                                                <span
                                                    style={{
                                                        marginLeft: 6,
                                                        fontSize: 12,
                                                        color: 'var(--text-secondary)',
                                                    }}
                                                >
                                                    {user.email}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <h3>Billing & Support</h3>
                        </div>
                        <div className="card-body">
                            {related.loading ? (
                                <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
                                    <div className="spinner" />
                                </div>
                            ) : (
                                <div className="billing-grid">
                                    <div>
                                        <div className="section-label">Recent Invoices</div>
                                        {related.invoices.length === 0 ? (
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                                                No invoices yet for this project.
                                            </p>
                                        ) : (
                                            <ul style={{ marginTop: 6 }}>
                                                {related.invoices.map(inv => (
                                                    <li key={inv._id} style={{ fontSize: 13, marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 500 }}>#{inv.number || inv._id.slice(-4)}</span>{' '}
                                                        <span style={{ color: 'var(--text-muted)' }}>
                                                            ({inv.status})
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div>
                                        <div className="section-label">Service Requests</div>
                                        {related.requests.length === 0 ? (
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                                                No service requests linked to this client.
                                            </p>
                                        ) : (
                                            <ul style={{ marginTop: 6 }}>
                                                {related.requests.map(r => (
                                                    <li key={r._id} style={{ fontSize: 13, marginBottom: 4 }}>
                                                        <span style={{ fontWeight: 500 }}>{r.subject || 'Request'}</span>{' '}
                                                        <span style={{ color: 'var(--text-muted)' }}>
                                                            ({r.status})
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => navigate('/invoices')}
                                    >
                                        Open Invoices
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => navigate('/requests')}
                                >
                                    Open Service Requests
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tasks' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Tasks for this project</h3>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <select
                                className="form-select"
                                value={assignedFilter}
                                onChange={e => {
                                    setAssignedFilter(e.target.value);
                                }}
                                style={{ minWidth: 180 }}
                            >
                                <option value="all">All team members</option>
                                {assignedOptions.map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="card-body">
                        {tasksLoading ? (
                            <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}>
                                <div className="spinner" />
                            </div>
                        ) : tasksState.rows.length === 0 ? (
                            <div className="empty-state" style={{ padding: 30 }}>
                                <div className="empty-icon">📋</div>
                                <p>No tasks found for this project</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Task</th>
                                                <th>Assigned To</th>
                                                <th>Status</th>
                                                <th>Priority</th>
                                                <th>Due Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tasksState.rows.map(t => (
                                                <tr key={t._id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                                                        {t.description && (
                                                            <div
                                                                style={{
                                                                    fontSize: 12,
                                                                    color: 'var(--text-muted)',
                                                                    marginTop: 2,
                                                                }}
                                                            >
                                                                {t.description}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>
                                                        {getAssigneeLabel(t)}
                                                    </td>
                                                    <td>
                                                        {canUpdateStatus(t) ? (
                                                            <select
                                                                className="form-select"
                                                                value={normalizeStatus(t.status)}
                                                                disabled={updatingTaskId === t._id}
                                                                onChange={(e) => updateTaskStatus(t, e.target.value)}
                                                                style={{ width: 150, minHeight: 34, padding: '6px 10px', fontSize: 13, lineHeight: 1.2 }}
                                                            >
                                                                <option value="todo">To Do</option>
                                                                <option value="in-progress">In Progress</option>
                                                                <option value="review">Review</option>
                                                                <option value="done">Done</option>
                                                            </select>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-secondary)' }}>{normalizeStatus(t.status)}</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textTransform: 'capitalize' }}>
                                                        {t.priority}
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>
                                                        {t.dueDate
                                                            ? new Date(t.dueDate).toLocaleDateString()
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pagination">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={tasksState.page <= 1}
                                        onClick={() => loadTasks(tasksState.page - 1)}
                                    >
                                        Previous
                                    </button>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        Page {tasksState.page} of {tasksState.totalPages} ·{' '}
                                        {tasksState.total} tasks
                                    </span>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={tasksState.page >= tasksState.totalPages}
                                        onClick={() => loadTasks(tasksState.page + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            <style>{`
                .project-detail-page {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .project-layout {
                    display: grid;
                    grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr);
                    gap: 16px;
                }
                @media (max-width: 960px) {
                    .project-layout {
                        grid-template-columns: minmax(0, 1fr);
                    }
                }
                .billing-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                    margin-top: 4px;
                }
                /* Tabs styling is global in index.css */
                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 12px 18px;
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .detail-label {
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--text-muted);
                }
                .detail-value {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .section-label {
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: var(--text-muted);
                }
                .pagination {
                    margin-top: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }
            `}</style>
        </div>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="detail-item">
            <div className="detail-label">{label}</div>
            <div className="detail-value">{value || '—'}</div>
        </div>
    );
}

function MetricCard({ label, value }) {
    return (
        <div
            className="metric-card"
            style={{
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(148, 98, 74, 0.18)',
                background: 'linear-gradient(135deg, #FFF7F3, #FFF9F6)',
                minWidth: 140,
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.06,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
        </div>
    );
}

