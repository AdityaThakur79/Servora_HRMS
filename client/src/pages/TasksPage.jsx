import { useState, useEffect, useMemo } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineCheck } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const statusColors = { todo: 'badge-neutral', 'in-progress': 'badge-blue', review: 'badge-yellow', done: 'badge-green' };
const priorityColors = { low: 'badge-neutral', medium: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };
const emptyForm = { title: '', description: '', project: '', assignedTo: '', status: 'todo', priority: 'medium', dueDate: '' };

const normalizeStatus = (raw) => {
    const s = String(raw || '').trim().toLowerCase();
    const map = { 'todo': 'todo', 'to do': 'todo', 'in-progress': 'in-progress', 'in progress': 'in-progress', 'inprogress': 'in-progress', 'review': 'review', 'done': 'done', 'completed': 'done' };
    return map[s] || 'todo';
};

const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
};

export default function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
    const [updatingStatusId, setUpdatingStatusId] = useState(null);
    const [pendingModal, setPendingModal] = useState(null); // { label, tasks }

    const fetchAll = () => {
        Promise.all([api.get('/tasks'), api.get('/projects'), api.get('/users')]).then(([t, p, u]) => {
            setTasks(t.data); setProjects(p.data); setUsers(u.data); setLoading(false);
        });
    };
    useEffect(fetchAll, []);

    // --- Pending summary cards: last 5 days ---
    const pendingSummary = useMemo(() => {
        const today = dayStart(new Date());
        const cards = [];
        for (let i = 0; i < 5; i++) {
            const from = daysAgo(i);
            const to = new Date(from.getTime() + 86400000);
            const pending = tasks.filter(t => {
                if (normalizeStatus(t.status) === 'done') return false;
                const due = t.dueDate ? dayStart(new Date(t.dueDate)) : null;
                if (!due) return false;
                return due >= from && due < to;
            });
            const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i} days ago`;
            const dateLabel = from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            cards.push({ label, dateLabel, tasks: pending, date: from });
        }
        return cards;
    }, [tasks]);

    // --- Filter tasks: only show today + yesterday (past 2 days), hide older unless done ---
    const filtered = useMemo(() => {
        const twoDaysAgo = daysAgo(2);
        return tasks.filter(t => {
            // Search filter
            if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
            // Status filter
            if (filterStatus && normalizeStatus(t.status) !== filterStatus) return false;
            // User filter
            if (filterUser) {
                const assignedId = typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?._id;
                if (assignedId !== filterUser) return false;
            }
            // Hide tasks older than 2 days (unless they have no due date)
            if (t.dueDate) {
                const due = dayStart(new Date(t.dueDate));
                if (due < twoDaysAgo) return false;
            }
            return true;
        });
    }, [tasks, search, filterStatus, filterUser]);

    // Group by date for display
    const groupedByDate = useMemo(() => {
        const groups = {};
        const noDate = [];
        filtered.forEach(t => {
            if (!t.dueDate) {
                noDate.push(t);
                return;
            }
            const key = dayStart(new Date(t.dueDate)).toISOString();
            if (!groups[key]) groups[key] = { date: new Date(key), tasks: [] };
            groups[key].tasks.push(t);
        });
        const sorted = Object.values(groups).sort((a, b) => b.date - a.date);
        if (noDate.length) sorted.push({ date: null, tasks: noDate });
        return sorted;
    }, [filtered]);

    const openCreate = () => {
        setEditing(null);
        setForm(isAdminOrManager ? emptyForm : { ...emptyForm, assignedTo: user?._id || '' });
        setShowModal(true);
    };
    const openEdit = (t) => {
        setEditing(t);
        setForm({
            title: t.title, description: t.description, project: t.project?._id || '',
            assignedTo: isAdminOrManager ? (t.assignedTo?._id || '') : (user?._id || ''),
            status: t.status, priority: t.priority,
            dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const title = (form.title || '').trim();
            if (!title) return toast.error('Task title is required');
            if (!form.project) return toast.error('Please select a project');
            const payload = { ...form, assignedTo: form.assignedTo || undefined };
            payload.title = title;
            if (!isAdminOrManager) payload.assignedTo = user?._id;
            if (editing) { await api.put(`/tasks/${editing._id}`, payload); toast.success('Task updated'); }
            else { await api.post('/tasks', payload); toast.success('Task created'); }
            setShowModal(false); fetchAll();
        } catch { toast.error('Something went wrong'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this task?')) return;
        await api.delete(`/tasks/${id}`);
        toast.success('Task deleted'); fetchAll();
    };

    const canUpdateStatus = (task) => {
        if (isAdminOrManager) return true;
        const assignedId = typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?._id;
        return !!assignedId && assignedId === user?._id;
    };

    const updateStatus = async (task, status) => {
        if (!task?._id || !canUpdateStatus(task)) return;
        setUpdatingStatusId(task._id);
        const prev = task.status;
        setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status } : t)));
        try {
            await api.put(`/tasks/${task._id}`, { status });
            toast.success('Status updated');
        } catch (err) {
            setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status: prev } : t)));
            toast.error(err.response?.data?.message || 'Unable to update status');
        } finally { setUpdatingStatusId(null); }
    };

    const projectLabel = (p) => {
        const name = p?.name || '';
        const clientName = p?.client?.name || '';
        return clientName ? `${name} – ${clientName}` : name;
    };

    const getDateLabel = (date) => {
        if (!date) return 'No Due Date';
        const today = dayStart(new Date());
        const yesterday = daysAgo(1);
        const d = dayStart(date);
        if (d.getTime() === today.getTime()) return 'Today';
        if (d.getTime() === yesterday.getTime()) return 'Yesterday';
        const tomorrow = new Date(today.getTime() + 86400000);
        if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
        return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Tasks</h2>
                    <p>{tasks.length} total tasks</p>
                </div>
                <button onClick={openCreate} className="btn btn-primary"><HiOutlinePlus /> New Task</button>
            </div>

            {/* Pending Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
                {pendingSummary.map((card, i) => (
                    <div
                        key={i}
                        onClick={() => card.tasks.length > 0 && setPendingModal({ label: `${card.label} (${card.dateLabel})`, tasks: card.tasks })}
                        style={{
                            padding: 16, borderRadius: 14,
                            border: '1px solid var(--border-color)',
                            background: card.tasks.length > 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                            cursor: card.tasks.length > 0 ? 'pointer' : 'default',
                            transition: 'box-shadow 0.15s',
                            textAlign: 'center',
                        }}
                        onMouseEnter={e => { if (card.tasks.length > 0) e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{ fontSize: 28, fontWeight: 800, color: card.tasks.length > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>
                            {card.tasks.length}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>
                            pending
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {card.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {card.dateLabel}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div className="search-input-wrapper">
                            <HiOutlineSearch className="search-icon" />
                            <input className="form-input" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
                        </div>
                        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 150 }}>
                            <option value="">All Statuses</option>
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                        </select>
                        <select className="form-select" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ width: 180 }}>
                            <option value="">All Members</option>
                            {users.map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Date-grouped task list */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></div>
                ) : groupedByDate.length === 0 ? (
                    <div className="empty-state" style={{ padding: 40 }}>
                        <div className="empty-icon">✅</div>
                        <h3>No tasks found</h3>
                        <p>Create a task to get started</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {groupedByDate.map((group, gi) => (
                            <div key={gi}>
                                <div style={{
                                    padding: '10px 16px', fontSize: 13, fontWeight: 700,
                                    color: 'var(--text-secondary)', background: 'var(--bg-secondary)',
                                    borderBottom: '1px solid var(--border-color)',
                                    position: 'sticky', top: 0, zIndex: 1,
                                }}>
                                    {getDateLabel(group.date)}
                                    <span style={{ fontWeight: 400, marginLeft: 8, color: 'var(--text-muted)' }}>
                                        ({group.tasks.length})
                                    </span>
                                </div>
                                {group.tasks.map(t => {
                                    const isDone = normalizeStatus(t.status) === 'done';
                                    return (
                                        <div
                                            key={t._id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '12px 16px',
                                                borderBottom: '1px solid var(--border-color)',
                                                opacity: isDone ? 0.55 : 1,
                                                background: isDone ? 'var(--green-bg)' : 'transparent',
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            {/* Done indicator */}
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: isDone ? 'var(--green)' : 'var(--bg-secondary)',
                                                color: isDone ? '#fff' : 'var(--text-muted)',
                                                fontSize: 14,
                                            }}>
                                                {isDone ? <HiOutlineCheck /> : null}
                                            </div>

                                            {/* Task info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 600, fontSize: 14,
                                                    textDecoration: isDone ? 'line-through' : 'none',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {t.title}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {t.project ? projectLabel(t.project) : 'No project'}
                                                    {t.assignedTo ? ` · ${t.assignedTo.name}` : ' · Unassigned'}
                                                </div>
                                            </div>

                                            {/* Priority */}
                                            <span className={`badge ${priorityColors[t.priority]}`} style={{ flexShrink: 0 }}>{t.priority}</span>

                                            {/* Status */}
                                            <div style={{ flexShrink: 0 }}>
                                                {canUpdateStatus(t) ? (
                                                    <select
                                                        className="form-select"
                                                        value={normalizeStatus(t.status)}
                                                        disabled={updatingStatusId === t._id}
                                                        onChange={(e) => updateStatus(t, e.target.value)}
                                                        style={{ width: 130, minHeight: 32, padding: '4px 8px', fontSize: 12 }}
                                                    >
                                                        <option value="todo">To Do</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="review">Review</option>
                                                        <option value="done">Done ✓</option>
                                                    </select>
                                                ) : (
                                                    <span className={`badge ${statusColors[normalizeStatus(t.status)]}`}>
                                                        {normalizeStatus(t.status)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Due date */}
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, width: 80, textAlign: 'right' }}>
                                                {formatDate(t.dueDate)}
                                            </div>

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                <button onClick={() => openEdit(t)} className="btn btn-ghost btn-icon" style={{ padding: 4 }}><HiOutlinePencil size={15} /></button>
                                                <button onClick={() => handleDelete(t._id)} className="btn btn-danger btn-icon" style={{ padding: 4 }}><HiOutlineTrash size={15} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Tasks Modal */}
            {pendingModal && (
                <div className="modal-overlay" onClick={() => setPendingModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Pending Tasks — {pendingModal.label}</h3>
                            <button onClick={() => setPendingModal(null)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {pendingModal.tasks.length === 0 ? (
                                <div className="empty-state" style={{ padding: 20 }}>
                                    <p>No pending tasks</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {pendingModal.tasks.map(t => (
                                        <div key={t._id} style={{
                                            padding: 12, borderRadius: 12,
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-card)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {t.project ? projectLabel(t.project) : 'No project'}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                    <span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span>
                                                    <span className={`badge ${statusColors[normalizeStatus(t.status)]}`}>{normalizeStatus(t.status)}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                {t.assignedTo ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div className="user-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                                                            {t.assignedTo.name[0]}
                                                        </div>
                                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.assignedTo.name}</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unassigned</span>
                                                )}
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                                    Due: {formatDate(t.dueDate)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setPendingModal(null)} className="btn btn-secondary">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Task Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit Task' : 'New Task'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Task Title *</label>
                                    <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Project *</label>
                                        <select className="form-select" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} required>
                                            <option value="">Select project</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{projectLabel(p)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Assign To</label>
                                        {isAdminOrManager ? (
                                            <select className="form-select" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                                                <option value="">Unassigned</option>
                                                {users.map(u => (
                                                    <option key={u._id} value={u._id}>{u.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input className="form-input" value={user?.name || ''} disabled />
                                        )}
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                            <option value="todo">To Do</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="review">Review</option>
                                            <option value="done">Done</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
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
