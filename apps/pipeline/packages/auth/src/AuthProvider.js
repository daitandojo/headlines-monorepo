// packages/auth/src/AuthProvider.js (version 8.1.0)
'use client'

import { createContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoadingOverlay } from '@headlines/ui'
import { updateUserFilterPreference } from '@headlines/data-access'

const AuthContext = createContext(null)

export function AuthProvider({ children, appType }) {
  const [user, setUser] = useState(null)
  const [authStatus, setAuthStatus] = useState('verifying')
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    if (appType === 'admin' && process.env.NODE_ENV === 'development') {
      setUser({ _id: 'dev_admin_id', firstName: 'Admin', role: 'admin', filterPreferences: { globalCountryFilter: [] } });
      setAuthStatus('authenticated');
      return;
    }

    try {
      const res = await fetch('/api/subscribers/me');
      if (res.ok) {
        setUser(await res.json());
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    } catch (error) {
      setUser(null);
      setAuthStatus('unauthenticated');
    }
  }, [appType]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    setAuthStatus('loading');
    // ... login logic as before
  };

  const logout = async () => {
    // ... logout logic as before
  };

  const updateUserPreferences = async (updateData) => {
      // ... profile update logic as before
  };

  const updateFilters = useCallback(async (filterData) => {
    if (!user) return;
    
    const result = await updateUserFilterPreference(filterData);
    
    if (result.success && result.user) {
      // DEFINITIVE FIX: On success, update the context with the new user object from the DB.
      setUser(result.user);
    } else {
      toast.error("Failed to save filter settings.", { description: result.error });
      // Revert by refetching old state from DB.
      await fetchUser();
    }
  }, [user, fetchUser]);

  const value = { user, isLoading: authStatus === 'loading', login, logout, updateUserPreferences, updateFilters };

  if (authStatus === 'verifying') {
    return <LoadingOverlay isLoading={true} text="Verifying session..." />;
  }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
