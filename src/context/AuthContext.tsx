import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import {
  loginWithUsernameOrEmail,
  fetchUserProfileByUid,
  logoutUser
} from '../lib/authService';
import { seedDatabaseIfEmpty } from '../lib/dbService';

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
  errorCode: string | null;
  setError: (err: string | null) => void;
  setErrorCode: (code: string | null) => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Initialize DB seed and check genuine Firebase auth session
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Seed initial data to Firestore if completely empty
      try {
        await seedDatabaseIfEmpty();
      } catch (err) {
        console.warn('Initial seed check error:', err);
      }

      // Listen strictly to Firebase Auth state
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;

        if (firebaseUser) {
          try {
            const profile = await fetchUserProfileByUid(firebaseUser.uid, firebaseUser.email);
            if (profile) {
              if (profile.isActive === false) {
                setError('Akun Anda tidak aktif. Silakan hubungi Administrator.');
                setErrorCode('auth/account-inactive');
                setCurrentUser(null);
                localStorage.removeItem('kantoja_currentUser');
                await fbSignOut(auth);
              } else {
                setCurrentUser(profile);
                localStorage.setItem('kantoja_currentUser', JSON.stringify(profile));
                setError(null);
                setErrorCode(null);

                if (profile.role === 'ADMIN') {
                  seedDatabaseIfEmpty().catch(err => console.warn('Post-auth seed:', err));
                }
              }
            } else {
              // Authenticated in Firebase Auth, but no matching profile in Firestore
              setError('Profil pengguna tidak ditemukan dalam database Firestore.');
              setCurrentUser(null);
              localStorage.removeItem('kantoja_currentUser');
              await fbSignOut(auth);
            }
          } catch (e) {
            console.error('Error loading user profile on auth state change:', e);
            setCurrentUser(null);
          }
        } else {
          // If no Firebase Auth session, user is strictly not logged in
          setCurrentUser(null);
          localStorage.removeItem('kantoja_currentUser');
        }

        if (isMounted) setLoading(false);
      });

      return unsubscribe;
    };

    let unsubPromise = initializeAuth();

    return () => {
      isMounted = false;
      unsubPromise.then(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  const refreshUserProfile = async () => {
    if (!currentUser) return;
    try {
      const refreshed = await fetchUserProfileByUid(currentUser.id, currentUser.email);
      if (refreshed) {
        if (refreshed.isActive === false) {
          await logout();
          setError('Akun Anda tidak aktif. Silakan hubungi Administrator.');
        } else {
          setCurrentUser(refreshed);
          localStorage.setItem('kantoja_currentUser', JSON.stringify(refreshed));
        }
      }
    } catch (e) {
      console.warn('Error refreshing profile:', e);
    }
  };

  /**
   * Primary login function accepting Username or Email + Password via Firebase Auth
   */
  const login = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    setError(null);
    setErrorCode(null);
    setLoading(true);

    const result = await loginWithUsernameOrEmail(identifier, pass);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      if (result.user.role === 'ADMIN') {
        seedDatabaseIfEmpty().catch(err => console.warn('Post-login seed:', err));
      }
      setLoading(false);
      return { success: true };
    } else {
      const errMsg = result.error || 'Email/username atau kata sandi salah.';
      setError(errMsg);
      setErrorCode(result.errorCode || null);
      setLoading(false);
      return { success: false, error: errMsg, errorCode: result.errorCode };
    }
  };

  /**
   * Backward-compatible helper for email login
   */
  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    const res = await login(email, pass);
    return res.success;
  };

  /**
   * Logout user: signs out of Firebase, clears session, redirects to /login
   */
  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    setError(null);
    setErrorCode(null);
    localStorage.removeItem('kantoja_currentUser');
    localStorage.removeItem('kantoja_active_user');
    window.history.replaceState(null, '', '/login');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        loading,
        login,
        loginWithEmail,
        logout,
        error,
        errorCode,
        setError,
        setErrorCode,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
