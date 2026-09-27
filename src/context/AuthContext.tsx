import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, normalizeUserRole } from '../types';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import {
  loginWithUsernameOrEmail,
  loginWithGooglePopup,
  fetchUserProfileByUid,
  logoutUser,
  normalizeBrandDisplayName
} from '../lib/authService';
import { seedDatabaseIfEmpty, testFirestoreConnection } from '../lib/dbService';

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string; errorCode?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; errorCode?: string }>;
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

  // Check genuine Firebase auth session or verified fallback session
  useEffect(() => {
    let isMounted = true;

    testFirestoreConnection().catch(() => {});

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
              localStorage.removeItem('kantoja_session_active');
              await fbSignOut(auth);
            } else {
              setCurrentUser(profile);
              localStorage.setItem('kantoja_currentUser', JSON.stringify(profile));
              localStorage.setItem('kantoja_session_active', 'true');
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
            localStorage.removeItem('kantoja_session_active');
            await fbSignOut(auth);
          }
        } catch (e) {
          console.error('Error loading user profile on auth state change:', e);
          setCurrentUser(null);
        }
      } else {
        // Check if there is an active local session (e.g. demo/bootstrap account when Email/Password provider is off)
        try {
          const isSessionActive = localStorage.getItem('kantoja_session_active') === 'true';
          const savedUserStr = localStorage.getItem('kantoja_currentUser');
          if (isSessionActive && savedUserStr) {
            const parsedUser = JSON.parse(savedUserStr) as UserProfile;
            if (parsedUser && parsedUser.isActive !== false) {
              const normalizedUser: UserProfile = {
                ...parsedUser,
                name: normalizeBrandDisplayName(parsedUser.name || parsedUser.displayName) || parsedUser.name,
                displayName:
                  normalizeBrandDisplayName(parsedUser.displayName || parsedUser.name) ||
                  parsedUser.displayName,
                role: normalizeUserRole(parsedUser.role, parsedUser),
              };
              setCurrentUser(normalizedUser);
              localStorage.setItem('kantoja_currentUser', JSON.stringify(normalizedUser));
            } else {
              setCurrentUser(null);
              localStorage.removeItem('kantoja_currentUser');
              localStorage.removeItem('kantoja_session_active');
            }
          } else {
            setCurrentUser(null);
            localStorage.removeItem('kantoja_currentUser');
          }
        } catch {
          setCurrentUser(null);
        }
      }

      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
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

    const result = await loginWithUsernameOrEmail(identifier, pass);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      if (result.user.role === 'ADMIN') {
        seedDatabaseIfEmpty().catch(err => console.warn('Post-login seed:', err));
      }
      return { success: true };
    } else {
      const errMsg = result.error || 'Email/username atau kata sandi salah.';
      setError(errMsg);
      setErrorCode(result.errorCode || null);
      return { success: false, error: errMsg, errorCode: result.errorCode };
    }
  };

  /**
   * Google Sign-In popup via Firebase Auth
   */
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    setError(null);
    setErrorCode(null);

    const result = await loginWithGooglePopup();
    if (result.success && result.user) {
      setCurrentUser(result.user);
      if (result.user.role === 'ADMIN') {
        seedDatabaseIfEmpty().catch(err => console.warn('Post-google-login seed:', err));
      }
      return { success: true };
    } else {
      const errMsg = result.error || 'Gagal masuk menggunakan akun Google.';
      if (result.errorCode !== 'auth/popup-closed-by-user') {
        setError(errMsg);
        setErrorCode(result.errorCode || null);
      }
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
    localStorage.removeItem('kantoja_session_active');
    window.history.replaceState(null, '', '/login');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser ? normalizeUserRole(currentUser.role, currentUser) : null,
        loading,
        login,
        loginWithGoogle,
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
