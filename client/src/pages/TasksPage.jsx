import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const statusColors = { todo: 'badge-neutral', 'in-progress': 'badge-blue', review: 'badge-yellow', done: 'badge-green' };
const priorityColors = { low: 'badge-neutral', medium: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };

const emptyForm = { title: '', description: '', project: '', assignedTo: '', status: 'todo', priority: 'medium', dueDate: '' };

export default function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    const fetchAll = () => {
        Promise.all([api.get('/tasks'), api.get('/projects'), api.get('/users')]).then(([t, p, u]) => {
            setTasks(t.data); setProjects(p.data); setUsers(u.data); setLoading(false);
        });
    };
    useEffect(fetchAll, []);

    const openCreate = () => {
        setEditing(null);
        setForm(isAdminOrManager ? emptyForm : { ...emptyForm, assignedTo: user?._id || '' });
        setShowModal(true);
    };
    const openEdit = (t) => {
        setEditing(t);
        setForm({
            title: t.title,
            description: t.description,
            project: t.project?._id || '',
            assignedTo: isAdminOrManager ? (t.assignedTo?._id || '') : (user?._id || ''),
            status: t.status,
            priority: t.priority,
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
            if (!isAdminOrManager) {
                payload.assignedTo = user?._id;
            }
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

    const filtered = tasks.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) &&
        (filterStatus ? t.status === filterStatus : true)
    );

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
        if (isAdminOrManager) return true;
        const assignedId = typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?._id;
        return !!assignedId && assignedId === user?._id;
    };

    const updateStatus = async (task, status) => {
        if (!task?._id) return;
        if (!canUpdateStatus(task)) return;
        setUpdatingStatusId(task._id);
        const prev = task.status;
        setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status } : t)));
        try {
            await api.put(`/tasks/${task._id}`, { status });
            toast.success('Status updated');
        } catch (err) {
            setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, status: prev } : t)));
            toast.error(err.response?.data?.message || 'Unable to update status');
        } finally {
            setUpdatingStatusId(null);
        }
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

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <div className="search-input-wrapper">
                            <HiOutlineSearch className="search-icon" />
                            <input className="form-input" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
                        </div>
                        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}>
                            <option value="">All Statuses</option>
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                        </select>
                    </div>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Task</th><th>Project</th><th>Assigned To</th><th>Priority</th><th>Status</th><th>Due Date</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">✅</div><h3>No tasks found</h3><p>Create a task to get started</p></div></td></tr>
                            ) : filtered.map(t => (
                                <tr key={t._id}>
                                    <td><span style={{ fontWeight: 600 }}>{t.title}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{t.project?.name || '—'}</td>
                                    <td>
                                        {t.assignedTo ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{t.assignedTo.name[0]}</div>
                                                <span style={{ fontSize: 13 }}>{t.assignedTo.name}</span>
                                            </div>
                                        ) : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                                    </td>
                                    <td><span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span></td>
                                    <td>
                                        {(() => {
                                            const statusValue = normalizeStatus(t.status);
                                            return canUpdateStatus(t) ? (
                                                <select
                                                    className="form-select"
                                                    value={statusValue}
                                                    disabled={updatingStatusId === t._id}
                                                    onChange={(e) => updateStatus(t, e.target.value)}
                                                    style={{ width: 150, minHeight: 34, padding: '6px 10px', fontSize: 13, lineHeight: 1.2 }}
                                                    title="Update status"
                                                >
                                                    <option value="todo">To Do</option>
                                                    <option value="in-progress">In Progress</option>
                                                    <option value="review">Review</option>
                                                    <option value="done">Done</option>
                                                </select>
                                            ) : (
                                                <span
                                                    className={`badge ${statusColors[statusValue]}`}
                                                    title="You can only update tasks assigned to you"
                                                    style={{ opacity: 0.85 }}
                                                >
                                                    {statusValue}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => openEdit(t)} className="btn btn-ghost btn-icon"><HiOutlinePencil /></button>
                                            <button onClick={() => handleDelete(t._id)} className="btn btn-danger btn-icon"><HiOutlineTrash /></button>
                                        </div>
                                    </td>
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
                                            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Assign To</label>
                                        {isAdminOrManager ? (
                                            <select
                                                className="form-select"
                                                value={form.assignedTo}
                                                onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                                            >
                                                <option value="">Unassigned</option>
                                                {users.map(u => (
                                                    <option key={u._id} value={u._id}>
                                                        {u.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                className="form-input"
                                                value={user?.name || ''}
                                                disabled
                                            />
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
