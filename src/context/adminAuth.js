import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { getApiBaseUrl } from '@utils';
import { adminApiClient } from '@utils/adminApiClient';

const AdminAuthContext = createContext({
  authStatus: 'checking',
  user: null,
  authReason: '',
  login: async () => {},
  logout: async () => {},
  apiClient: adminApiClient,
  isAuthenticated: false,
});

export const AdminAuthProvider = ({ children }) => {
  const [authStatus, setAuthStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [authReason, setAuthReason] = useState('');
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    const unsubscribe = adminApiClient.subscribeAuthState(nextState => {
      setUser(nextState.user || null);
      setAuthStatus(nextState.status);
      setAuthReason(nextState.reason || '');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      if (!apiBaseUrl) {
        if (isMounted) {
          setAuthStatus('unavailable');
          setAuthReason('api_unavailable');
        }
        return;
      }

      try {
        const payload = await adminApiClient.restoreSession();

        if (isMounted) {
          setUser(payload.user);
          setAuthStatus('authenticated');
          setAuthReason('session_restored');
        }
      } catch (error) {
        if (isMounted) {
          setUser(null);
          setAuthStatus('unauthenticated');
          setAuthReason('session_missing');
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  const login = async credentials => {
    const payload = await adminApiClient.login(credentials);
    setUser(payload.user);
    setAuthStatus('authenticated');
    setAuthReason('login_success');
    return payload.user;
  };

  const logout = async () => {
    await adminApiClient.logout();
    setUser(null);
    setAuthStatus('unauthenticated');
    setAuthReason('logout');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        authStatus,
        user,
        authReason,
        login,
        logout,
        apiClient: adminApiClient,
        isAuthenticated: authStatus === 'authenticated',
      }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

AdminAuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAdminAuth = () => useContext(AdminAuthContext);
