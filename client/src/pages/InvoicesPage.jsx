import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import api from '../utils/api';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const statusBadge = {
    draft: 'badge-neutral', sent: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-neutral'
};

const emptyForm = {
    client: '', project: '', status: 'draft', dueDate: '', notes: '',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    tax: 0, discount: 0
};

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const columnCount = isAdmin ? 7 : 6;

    const fetchAll = () => {
        Promise.all([api.get('/invoices'), api.get('/clients'), api.get('/projects')]).then(([inv, c, p]) => {
            setInvoices(inv.data); setClients(c.data); setProjects(p.data); setLoading(false);
        });
    };
    useEffect(fetchAll, []);

    const updateItem = (i, field, val) => {
        const items = [...form.items];
        items[i] = { ...items[i], [field]: val };
        if (field === 'quantity' || field === 'rate') {
            items[i].amount = (field === 'quantity' ? val : items[i].quantity) * (field === 'rate' ? val : items[i].rate);
        }
        setForm({ ...form, items });
    };

    const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, rate: 0, amount: 0 }] });
    const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

    const subtotal = form.items.reduce((s, it) => s + Number(it.amount), 0);
    const total = subtotal + Number(form.tax) - Number(form.discount);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, tax: Number(form.tax), discount: Number(form.discount) };
            if (editing) { await api.put(`/invoices/${editing._id}`, payload); toast.success('Invoice updated'); }
            else { await api.post('/invoices', payload); toast.success('Invoice created'); }
            setShowModal(false); fetchAll();
        } catch { toast.error('Something went wrong'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this invoice?')) return;
        await api.delete(`/invoices/${id}`);
        toast.success('Invoice deleted'); fetchAll();
    };

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (inv) => {
        setEditing(inv);
        setForm({ client: inv.client?._id || '', project: inv.project?._id || '', status: inv.status, dueDate: inv.dueDate ? inv.dueDate.split('T')[0] : '', notes: inv.notes || '', items: inv.items, tax: inv.tax, discount: inv.discount });
        setShowModal(true);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h2>Invoices</h2>
                    <p>{invoices.length} total invoices</p>
                </div>
                {isAdmin && (
                    <button onClick={openCreate} className="btn btn-primary"><HiOutlinePlus /> New Invoice</button>
                )}
            </div>

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Client</th>
                                <th>Project</th>
                                {isAdmin && <th>Total</th>}
                                <th>Status</th>
                                <th>Due Date</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={columnCount} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={columnCount}><div className="empty-state"><div className="empty-icon">🧾</div><h3>No invoices yet</h3><p>{isAdmin ? 'Create your first invoice' : 'No invoices available'}</p></div></td></tr>
                            ) : invoices.map(inv => (
                                <tr key={inv._id}>
                                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{inv.invoiceNumber}</span></td>
                                    <td>{inv.client?.name || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{inv.project?.name || '—'}</td>
                                    {isAdmin && <td style={{ fontWeight: 700 }}>₹{inv.total?.toLocaleString()}</td>}
                                    <td><span className={`badge ${statusBadge[inv.status]}`}>{inv.status}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                                    {isAdmin && (
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => openEdit(inv)} className="btn btn-ghost btn-icon"><HiOutlinePencil /></button>
                                                <button onClick={() => handleDelete(inv._id)} className="btn btn-danger btn-icon"><HiOutlineTrash /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && isAdmin && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? `Edit ${editing.invoiceNumber}` : 'New Invoice'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon">✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Client *</label>
                                        <select className="form-select" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required>
                                            <option value="">Select client</option>
                                            {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Project</label>
                                        <select className="form-select" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}>
                                            <option value="">No project</option>
                                            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div style={{ marginBottom: 12 }}>
                                    <label className="form-label">Line Items</label>
                                    {form.items.map((item, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 100px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                            <input className="form-input" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                                            <input className="form-input" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} min={1} />
                                            <input className="form-input" type="number" placeholder="Rate" value={item.rate} onChange={e => updateItem(i, 'rate', Number(e.target.value))} min={0} />
                                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 14 }}>₹{item.amount}</div>
                                            <button type="button" onClick={() => removeItem(i)} className="btn btn-danger btn-icon" style={{ fontSize: 12 }}>✕</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addItem} className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>+ Add Item</button>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Tax (₹)</label>
                                        <input type="number" className="form-input" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} min={0} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Discount (₹)</label>
                                        <input type="number" className="form-input" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} min={0} />
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--text-secondary)' }}>
                                        <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>
                                        <span>Total</span><span>₹{total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                            <option value="draft">Draft</option>
                                            <option value="sent">Sent</option>
                                            <option value="paid">Paid</option>
                                            <option value="overdue">Overdue</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Due Date</label>
                                        <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create Invoice'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
