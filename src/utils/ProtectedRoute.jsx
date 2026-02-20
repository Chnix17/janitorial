import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import NotAuthorize from '../components/NotAuthorize';
import { SecureStorage } from './encryption';
const ProtectedRoute = ({ children, allowedRoles, requiredDepartment }) => {
    const [showModal, setShowModal] = useState(false);
    const [shouldNavigate, setShouldNavigate] = useState(false);
    const loggedIn = SecureStorage.getLocalItem('janitorial_loggedIn') ?? SecureStorage.getLocalItem('loggedIn');
    const isLoggedIn = loggedIn === 'true' || loggedIn === true;
    const userRole = SecureStorage.getLocalItem('janitorial_user_level') ?? SecureStorage.getLocalItem('user_level');
    const userLevelId = SecureStorage.getLocalItem('janitorial_user_level_id') ?? SecureStorage.getLocalItem('user_level_id');
    const roleMap = { '1': 'Admin' };
    const resolvedUserRole = userRole || roleMap[String(userLevelId)] || '';
    const userDepartment = SecureStorage.getLocalItem('Department Name');
    useEffect(() => {
        if (
            (allowedRoles && !allowedRoles.includes(resolvedUserRole)) ||
            (requiredDepartment && userDepartment !== requiredDepartment)
        ) {
            setShowModal(true);
        }
    }, [allowedRoles, resolvedUserRole, requiredDepartment, userDepartment]);

    const handleModalClose = () => {
        setShowModal(false);
        setTimeout(() => {
            setShouldNavigate(true);
        }, 300); 
    };

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    const getRedirectPath = () => {
        if (resolvedUserRole === 'Super Admin' || resolvedUserRole === 'Admin') return '/Admin';
        if (resolvedUserRole === 'Student') return '/Student/Dashboard';

        return '/';
    };

    if (
        (allowedRoles && !allowedRoles.includes(resolvedUserRole)) ||
        (requiredDepartment && userDepartment !== requiredDepartment)
    ) {
        return (
            <>
                <NotAuthorize open={showModal} onClose={handleModalClose} />
                {shouldNavigate && <Navigate to={getRedirectPath()} replace />}
            </>
        );
    }

    return children;
};

export default ProtectedRoute;