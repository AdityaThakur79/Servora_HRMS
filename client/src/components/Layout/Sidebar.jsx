import { NavLink, useNavigate } from 'react-router-dom';
import {
    HiOutlineViewGridAdd, HiOutlineUsers, HiOutlineBriefcase,
    HiOutlineClipboardList, HiOutlineDocumentText, HiOutlineTicket,
    HiOutlineCog, HiOutlineLogout, HiOutlineChartBar, HiOutlineClock,
    HiOutlineClipboardCheck
} from 'react-icons/hi';
import { MdOutlineSpaceDashboard } from 'react-icons/md';
import useAuthStore from '../../store/authStore';

const navLinks = [
    { to: '/', icon: <MdOutlineSpaceDashboard />, label: 'Dashboard' },
    { divider: 'Management' },
    { to: '/clients', icon: <HiOutlineUsers />, label: 'Clients' },
    { to: '/leads', icon: <HiOutlineChartBar />, label: 'Leads', roles: ['admin'], jobTitles: ['Operations', 'Account Manager', 'Business Developer'] },
    { to: '/projects', icon: <HiOutlineBriefcase />, label: 'Projects' },
    { to: '/tasks', icon: <HiOutlineClipboardList />, label: 'Tasks' },
    { to: '/hrms', icon: <HiOutlineClock />, label: 'HRMS' },
    { to: '/onboarding', icon: <HiOutlineClipboardCheck />, label: 'Onboarding', roles: ['admin'] },
    { divider: 'Finance' },
    { to: '/invoices', icon: <HiOutlineDocumentText />, label: 'Invoices', roles: ['admin'] },
    { divider: 'Support' },
    { to: '/requests', icon: <HiOutlineTicket />, label: 'Service Requests' },
    { divider: 'System' },
    { to: '/team', icon: <HiOutlineViewGridAdd />, label: 'Team' },
    { to: '/settings', icon: <HiOutlineCog />, label: 'Settings' },
];

function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const role = user?.role || 'staff';
    const jobTitle = user?.jobTitle || '';

    const visibleNavLinks = (() => {
        const out = [];
        let pendingDividerIndex = -1;
        let hasLinkSinceDivider = false;

        for (const item of navLinks) {
            if (item.divider) {
                if (pendingDividerIndex !== -1 && !hasLinkSinceDivider) {
                    out.splice(pendingDividerIndex, 1);
                }
                out.push(item);
                pendingDividerIndex = out.length - 1;
                hasLinkSinceDivider = false;
                continue;
            }

            const roleAllowed = !item.roles || item.roles.includes(role);
            const jobAllowed = !item.jobTitles || item.jobTitles.includes(jobTitle);
            if (!roleAllowed && !jobAllowed) continue;
            out.push(item);
            if (pendingDividerIndex !== -1) hasLinkSinceDivider = true;
        }

        if (pendingDividerIndex !== -1 && !hasLinkSinceDivider) {
            out.splice(pendingDividerIndex, 1);
        }
        return out;
    })();

    const handleLogout = () => {
        logout();
        navigate('/login');
        if (onClose) onClose();
    };

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'SV';

    return (
        <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-logo">
                <img src="/logo.png" alt="Servora Logo" className="logo-icon" />
                <span className="logo-text">Servora</span>
            </div>

            <nav className="sidebar-nav">
                {visibleNavLinks.map((item, i) => {
                    if (item.divider) {
                        return <p key={i} className="nav-section-label">{item.divider}</p>;
                    }
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="user-avatar">{initials}</div>
                    <div className="user-info">
                        <div className="user-name">{user?.name || 'User'}</div>
                        <div className="user-role">{user?.role || 'staff'}</div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost btn-icon"
                        title="Logout"
                    >
                        <HiOutlineLogout size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
