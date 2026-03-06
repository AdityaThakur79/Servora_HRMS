import { HiOutlineBell, HiOutlineSearch } from 'react-icons/hi';
import { useLocation } from 'react-router-dom';

const titles = {
    '/': { title: 'Dashboard', sub: 'Welcome back, here\'s your overview' },
    '/clients': { title: 'Clients', sub: 'Manage your client relationships' },
    '/projects': { title: 'Projects', sub: 'Track and manage all projects' },
    '/tasks': { title: 'Tasks', sub: 'Monitor task progress and assignments' },
    '/invoices': { title: 'Invoices', sub: 'Manage billing and payments' },
    '/requests': { title: 'Service Requests', sub: 'Handle support tickets and requests' },
    '/team': { title: 'Team', sub: 'Manage your team members and roles' },
    '/settings': { title: 'Settings', sub: 'Account and system preferences' },
};

function Navbar() {
    const { pathname } = useLocation();
    const page = titles[pathname] || { title: 'Servora', sub: '' };
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <header className="navbar">
            <div className="navbar-left">
                <h1>{page.title}</h1>
                <p>{page.sub} · {dateStr}</p>
            </div>
            <div className="navbar-right">
                <button className="btn btn-ghost btn-icon" title="Notifications">
                    <HiOutlineBell size={20} />
                </button>
            </div>
        </header>
    );
}

export default Navbar;
