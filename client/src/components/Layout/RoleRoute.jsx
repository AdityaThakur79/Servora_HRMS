import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function RoleRoute({
    allow = [],
    allowRoles = [],
    allowJobTitles = [],
    children,
}) {
    const { token, user } = useAuthStore();
    if (!token) return <Navigate to="/login" replace />;

    const roles = allowRoles.length > 0 ? allowRoles : allow;
    const roleOk = roles.length === 0 || roles.includes(user?.role);
    const jobOk = allowJobTitles.length === 0 || allowJobTitles.includes(user?.jobTitle);

    // If both are provided, allow if either matches (admin OR allowed job role)
    if (!roleOk && !jobOk) {
        return <Navigate to="/" replace />;
    }
    return children;
}

