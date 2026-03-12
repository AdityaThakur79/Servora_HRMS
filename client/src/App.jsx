import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import RoleRoute from './components/Layout/RoleRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/ClientsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TasksPage from './pages/TasksPage';
import InvoicesPage from './pages/InvoicesPage';
import TeamPage from './pages/TeamPage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import SettingsPage from './pages/SettingsPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import HRMSPage from './pages/HRMSPage';
import OnboardingPage from './pages/OnboardingPage';
import OnboardingPublicPage from './pages/OnboardingPublicPage';

function App() {
    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e1e30',
                        color: '#f0f0ff',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '10px',
                        fontSize: '14px',
                    },
                    success: { iconTheme: { primary: '#22d3a0', secondary: '#1e1e30' } },
                    error: { iconTheme: { primary: '#f87171', secondary: '#1e1e30' } },
                }}
            />
            <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/onboarding/fill/:token" element={<OnboardingPublicPage />} />

                {/* Protected – wrapped in AppLayout */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <Dashboard />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/clients"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <ClientsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/projects"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <ProjectsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/projects/:id"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <ProjectDetailPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/tasks"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <TasksPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/invoices"
                    element={
                        <RoleRoute allow={['admin']}>
                            <AppLayout>
                                <InvoicesPage />
                            </AppLayout>
                        </RoleRoute>
                    }
                />
                <Route
                    path="/leads"
                    element={
                        <RoleRoute
                            allowRoles={['admin']}
                            allowJobTitles={['Operations', 'Account Manager', 'Business Developer']}
                        >
                            <AppLayout>
                                <LeadsPage />
                            </AppLayout>
                        </RoleRoute>
                    }
                />
                <Route
                    path="/leads/:id"
                    element={
                        <RoleRoute
                            allowRoles={['admin']}
                            allowJobTitles={['Operations', 'Account Manager', 'Business Developer']}
                        >
                            <AppLayout>
                                <LeadDetailPage />
                            </AppLayout>
                        </RoleRoute>
                    }
                />
                <Route
                    path="/hrms"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <HRMSPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/requests"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <ServiceRequestsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/team"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <TeamPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <AppLayout>
                                <SettingsPage />
                            </AppLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/onboarding"
                    element={
                        <RoleRoute allow={['admin']}>
                            <AppLayout>
                                <OnboardingPage />
                            </AppLayout>
                        </RoleRoute>
                    }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
