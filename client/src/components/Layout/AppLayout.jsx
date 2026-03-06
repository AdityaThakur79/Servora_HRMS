import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

function AppLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const closeSidebar = () => setSidebarOpen(false);
    const toggleSidebar = () => setSidebarOpen((v) => !v);

    return (
        <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
            <div className="main-content">
                <Navbar onToggleSidebar={toggleSidebar} />
                <main className="page-content fade-in">
                    {children}
                </main>
            </div>
            {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}
        </div>
    );
}

export default AppLayout;
