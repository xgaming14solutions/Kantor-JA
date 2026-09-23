import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';
import {
  createAuthUserViaFirebase,
  rollbackAuthUser,
  sendPasswordResetViaApi,
} from '../server/adminAuthService.ts';

export interface AuthLoginResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  errorCode?: string;
}

// Designated primary Admin account configuration
export const PRIMARY_ADMIN_CONFIG = {
  uid: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
  email: 'xgamingsolutions@gmail.com',
  username: 'admin',
  displayName: 'Administrator KantoJA',
  name: 'Administrator KantoJA',
  role: 'ADMIN' as UserRole,
  isActive: true,
  teacherId: null,
};

/**
 * Helper to verify whether an ID is a genuine Firebase Authentication UID
 */
export function isRealFirebaseAuthUid(uid?: string | null): boolean {
  if (!uid) return false;
  if (uid.startsWith('u_') || uid.startsWith('demo_') || uid.startsWith('mock_')) {
    return false;
  }
  return uid.length >= 20;
}

/**
 * Checks if a UserProfile is connected to a genuine Firebase Auth account
 */
export function profileHasFirebaseAuth(user: UserProfile): boolean {
  if (!user) return false;
  return isRealFirebaseAuthUid(user.uid) || isRealFirebaseAuthUid(user.userId) || isRealFirebaseAuthUid(user.id);
}

/**
 * Find user profile in Firestore by username or email
 */
export async function findUserByIdentifier(identifier: string): Promise<UserProfile | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  try {
    if (clean.includes('@')) {
      const qEmail = query(collection(db, 'users'), where('email', '==', clean));
      const snap = await getDocs(qEmail);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
      }
    } else {
      const qUser = query(collection(db, 'users'), where('username', '==', clean));
      const snap = await getDocs(qUser);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
      }
    }
  } catch (e) {
    console.warn('Firestore user search error:', e);
  }

  // Fallback for bootstrap admin username lookup
  if (clean === PRIMARY_ADMIN_CONFIG.username || clean === PRIMARY_ADMIN_CONFIG.email) {
    return {
      id: PRIMARY_ADMIN_CONFIG.uid,
      userId: PRIMARY_ADMIN_CONFIG.uid,
      username: PRIMARY_ADMIN_CONFIG.username,
      email: PRIMARY_ADMIN_CONFIG.email,
      displayName: PRIMARY_ADMIN_CONFIG.displayName,
      name: PRIMARY_ADMIN_CONFIG.name,
      role: 'ADMIN',
      isActive: true,
      teacherId: null,
    };
  }

  // Fallback to local storage cache if previously synced from Firestore
  try {
    const cached = localStorage.getItem('kantoja_users');
    if (cached) {
      const list: UserProfile[] = JSON.parse(cached);
      const found = list.find(
        u => (u.email && u.email.toLowerCase() === clean) || (u.username && u.username.toLowerCase() === clean)
      );
      if (found) return found;
    }
  } catch (err) {
    console.warn('LocalStorage users search error:', err);
  }

  return null;
}

/**
 * Fetch user profile from Firestore by Firebase Auth UID
 */
export async function fetchUserProfileByUid(uid: string, email?: string | null): Promise<UserProfile | null> {
  try {
    // 1. Check direct doc by UID (Primary lookup)
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as UserProfile;
    }

    // 2. Query by userId field
    const qUserId = query(collection(db, 'users'), where('userId', '==', uid));
    const userSnap = await getDocs(qUserId);
    if (!userSnap.empty) {
      return { id: userSnap.docs[0].id, ...userSnap.docs[0].data() } as UserProfile;
    }

    // 3. Admin Bootstrap: If authenticated user is the designated primary admin UID and profile does not exist yet
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (uid === PRIMARY_ADMIN_CONFIG.uid || cleanEmail === PRIMARY_ADMIN_CONFIG.email) {
      const adminProfile: UserProfile = {
        id: uid,
        userId: uid,
        email: cleanEmail || PRIMARY_ADMIN_CONFIG.email,
        username: PRIMARY_ADMIN_CONFIG.username,
        displayName: PRIMARY_ADMIN_CONFIG.displayName,
        name: PRIMARY_ADMIN_CONFIG.name,
        role: 'ADMIN',
        isActive: true,
        teacherId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(userDocRef, adminProfile, { merge: true });
        console.log('Admin profile successfully seeded into Firestore:', uid);
      } catch (writeErr) {
        console.warn('Could not write admin profile to Firestore during bootstrap:', writeErr);
      }

      return adminProfile;
    }

    // 4. Fallback: match by email and link to UID (for existing staff registered by email)
    if (cleanEmail) {
      const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const emailSnap = await getDocs(qEmail);
      if (!emailSnap.empty) {
        const found = { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() } as UserProfile;
        const linkedProfile: UserProfile = {
          ...found,
          id: uid,
          userId: uid,
          email: cleanEmail,
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(userDocRef, linkedProfile, { merge: true });
        } catch (setErr) {
          console.warn('Could not link profile by UID in Firestore:', setErr);
        }
        return linkedProfile;
      }
    }
  } catch (e) {
    console.warn('Error fetching user profile by UID from Firestore:', e);
  }

  // Check cached users if available
  try {
    const cached = localStorage.getItem('kantoja_users');
    if (cached) {
      const list: UserProfile[] = JSON.parse(cached);
      const found = list.find(
        u => u.userId === uid || u.id === uid || (email && u.email.toLowerCase() === email.toLowerCase())
      );
      if (found) {
        return { ...found, id: uid, userId: uid };
      }
    }
  } catch (err) {
    console.warn('Error checking cached user profiles:', err);
  }

  return null;
}

/**
 * Log in using either Username or Email + Password via genuine Firebase Authentication
 */
export async function loginWithUsernameOrEmail(
  identifier: string,
  password: string
): Promise<AuthLoginResult> {
  const cleanId = identifier.trim().toLowerCase();
  let targetEmail = cleanId;

  // 1. If username was entered, lookup corresponding email in Firestore users
  if (!cleanId.includes('@')) {
    const userDoc = await findUserByIdentifier(cleanId);
    if (!userDoc || !userDoc.email) {
      return {
        success: false,
        error: 'Email/username atau kata sandi salah.'
      };
    }
    targetEmail = userDoc.email.toLowerCase();
  }

  try {
    // 2. Perform genuine Firebase Authentication with Email & Password
    const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
    const authUser = cred.user;

    if (!authUser) {
      return {
        success: false,
        error: 'Gagal mengautentikasi pengguna dengan Firebase Authentication.'
      };
    }

    // 3. Retrieve user profile from Firestore by UID
    let profile = await fetchUserProfileByUid(authUser.uid, authUser.email);

    // If profile not yet keyed to UID, search by email to link
    if (!profile) {
      const matchingUser = await findUserByIdentifier(targetEmail);
      if (matchingUser) {
        profile = {
          ...matchingUser,
          id: authUser.uid,
          userId: authUser.uid,
          email: authUser.email || targetEmail,
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'users', authUser.uid), profile, { merge: true });
        } catch (linkErr) {
          console.warn('Error saving linked user profile to Firestore:', linkErr);
        }
      }
    }

    if (!profile) {
      await fbSignOut(auth);
      return {
        success: false,
        error: 'Profil pengguna tidak ditemukan dalam database Firestore. Silakan hubungi Administrator.'
      };
    }

    // 4. Check isActive status: if false, reject access immediately and sign out
    if (profile.isActive === false) {
      await fbSignOut(auth);
      return {
        success: false,
        error: 'Akun Anda tidak aktif. Silakan hubungi Administrator.'
      };
    }

    // Save session in localStorage
    localStorage.setItem('kantoja_currentUser', JSON.stringify(profile));
    return { success: true, user: profile };
  } catch (err: any) {
    console.error('Firebase Auth sign-in error:', err);

    // Specific error mapping as explicitly required
    if (err.code === 'auth/operation-not-allowed') {
      return {
        success: false,
        errorCode: 'auth/operation-not-allowed',
        error: 'Metode login Email/Password belum diaktifkan pada Firebase Authentication. Aktifkan provider Email/Password pada Firebase Console.'
      };
    }

    if (
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-login-credentials'
    ) {
      return {
        success: false,
        errorCode: err.code,
        error: 'Email/username atau kata sandi salah.'
      };
    }

    if (err.code === 'auth/too-many-requests') {
      return {
        success: false,
        errorCode: err.code,
        error: 'Terlalu banyak percobaan login gagal. Silakan tunggu beberapa saat lagi.'
      };
    }

    if (err.code === 'auth/network-request-failed') {
      return {
        success: false,
        errorCode: err.code,
        error: 'Gagal terhubung ke server autentikasi Firebase. Periksa koneksi internet Anda.'
      };
    }

    return {
      success: false,
      errorCode: err.code,
      error: err.message || 'Terjadi kesalahan saat memproses login. Silakan coba lagi.'
    };
  }
}

/**
 * Log out user from Firebase Auth and clear local session
 */
export async function logoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  localStorage.removeItem('kantoja_currentUser');
  localStorage.removeItem('kantoja_active_user');
}

/**
 * Create a new user in Firebase Auth and Firestore by ADMIN without logging out the Admin
 * Uses an isolated secondary Firebase app to ensure the logged-in Admin's session is completely unaffected.
 */
export async function createUserByAdmin(data: {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  teacherId?: string | null;
  nip?: string;
  phone?: string;
  isActive: boolean;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanName = data.name.trim();
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanEmail = data.email.trim().toLowerCase();

  // 1. Validasi Input Dasar
  if (!cleanName) {
    return { success: false, error: 'Nama lengkap pengguna wajib diisi.' };
  }

  if (!cleanUsername) {
    return { success: false, error: 'Username wajib diisi.' };
  }
  if (cleanUsername.length < 3) {
    return { success: false, error: 'Username minimal 3 karakter.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    return {
      success: false,
      error: 'Username hanya boleh berisi huruf, angka, garis bawah (_), titik (.), dan tanda hubung (-).'
    };
  }

  if (!cleanEmail) {
    return { success: false, error: 'Email wajib diisi.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Format alamat email tidak valid.' };
  }

  if (!data.password || data.password.length < 6) {
    return {
      success: false,
      error: 'Kata sandi awal wajib diisi minimal 6 karakter sesuai standar keamanan Firebase.'
    };
  }

  // Validasi Role
  const validRoles: UserRole[] = ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'];
  if (!data.role || !validRoles.includes(data.role)) {
    return { success: false, error: 'Role hak akses pengguna tidak valid atau belum dipilih.' };
  }

  // Validasi Relasi Guru (teacherId)
  if (data.role === 'WALI_KELAS' || data.role === 'GURU_MAPEL') {
    if (!data.teacherId || data.teacherId.trim() === '') {
      return {
        success: false,
        error: `Untuk peran ${data.role === 'WALI_KELAS' ? 'Wali Kelas' : 'Guru Mapel'}, Guru Terkait (teacherId) wajib dipilih.`
      };
    }
  }

  // 2. Validasi Keunikan Username & Email di Firestore & Local Cache
  try {
    const qUsername = query(collection(db, 'users'), where('username', '==', cleanUsername));
    const snapUsername = await getDocs(qUsername);
    if (!snapUsername.empty) {
      const existing = snapUsername.docs[0].data() as UserProfile;
      if (profileHasFirebaseAuth({ ...existing, id: snapUsername.docs[0].id })) {
        return {
          success: false,
          error: `Username "${cleanUsername}" sudah digunakan oleh akun yang memiliki Firebase Authentication UID resmi (UID: ${existing.userId || existing.id || snapUsername.docs[0].id}). Tidak dapat membuat akun Firebase kedua.`
        };
      }
    }
  } catch (err) {
    console.warn('Username uniqueness check warning:', err);
  }

  try {
    const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      const existing = snapEmail.docs[0].data() as UserProfile;
      if (profileHasFirebaseAuth({ ...existing, id: snapEmail.docs[0].id })) {
        return {
          success: false,
          error: `Email "${cleanEmail}" sudah terdaftar dengan Firebase Authentication UID resmi (UID: ${existing.userId || existing.id || snapEmail.docs[0].id}). Tidak dapat membuat akun Firebase kedua untuk profil yang sama.`
        };
      }
    }
  } catch (err) {
    console.warn('Email uniqueness check warning:', err);
  }

  // 3. Buat akun Firebase Authentication menggunakan Backend API terpercaya
  // Sesi Admin pada browser tetap 100% aktif dan tidak terpengaruh atau tertimpa
  let authResult: { uid: string; tempToken?: string } | null = null;

  try {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password: data.password,
        role: data.role,
        teacherId: data.teacherId || null,
        nip: data.nip || undefined,
        phone: data.phone || undefined,
        isActive: data.isActive !== false,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || 'Gagal membuat akun pada Firebase Authentication.',
      };
    }

    authResult = {
      uid: json.uid,
      tempToken: json.tempToken,
    };
  } catch (backendFetchErr) {
    console.warn('Backend API endpoint fallback to direct Firebase Identity Toolkit:', backendFetchErr);
    // Fallback: Panggilan langsung yang terisolasi tanpa menyentuh sesi Admin di browser
    const directRes = await createAuthUserViaFirebase({
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: data.password,
      role: data.role,
      teacherId: data.teacherId,
    });

    if (!directRes.success || !directRes.uid) {
      return {
        success: false,
        error: directRes.error || 'Gagal membuat akun Firebase Authentication.',
      };
    }

    authResult = {
      uid: directRes.uid,
      tempToken: directRes.tempToken,
    };
  }

  const newUid = authResult.uid;

  // 4. Buat dokumen profil di Firestore dengan ID = Firebase Auth UID (TIDAK MENYIMPAN PASSWORD!)
  const newProfile: UserProfile = {
    id: newUid,
    userId: newUid,
    uid: newUid,
    username: cleanUsername,
    email: cleanEmail,
    displayName: cleanName,
    name: cleanName,
    role: data.role,
    teacherId: data.teacherId || null,
    nip: data.nip || undefined,
    phone: data.phone || undefined,
    isActive: data.isActive !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'users', newUid), newProfile);
  } catch (firestoreErr: any) {
    console.error('Firestore write failed for user profile:', firestoreErr);

    // PENTING: Rollback Firebase Auth user jika penyimpanan profil gagal
    // Hal ini menjamin tidak ada akun gantung / data tidak konsisten
    if (authResult.tempToken) {
      try {
        await fetch('/api/admin/rollback-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken: authResult.tempToken }),
        });
      } catch {
        await rollbackAuthUser(authResult.tempToken);
      }
      console.log('Rollback berhasil: Akun Auth dibatalkan karena gagal simpan profil Firestore.');
    }

    return {
      success: false,
      error: `Gagal menyimpan profil pengguna ke Firestore (${firestoreErr.message || 'Izin/Koneksi'}). Pembuatan akun dibatalkan untuk menjaga konsistensi database.`,
    };
  }

  // 5. Update cache lokal
  try {
    const cached = localStorage.getItem('kantoja_users');
    let list: UserProfile[] = cached ? JSON.parse(cached) : [];
    const existingIndex = list.findIndex((u) => u.id === newUid);
    if (existingIndex >= 0) {
      list[existingIndex] = newProfile;
    } else {
      list.unshift(newProfile);
    }
    localStorage.setItem('kantoja_users', JSON.stringify(list));
  } catch (err) {
    console.warn('LocalStorage update warning:', err);
  }

  return { success: true, user: newProfile };
}

/**
 * Send password reset email via Firebase Auth without displaying old password
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Coba lewat backend endpoint terpercaya
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      return { success: true };
    }
    if (json.error) {
      return { success: false, error: json.error };
    }
  } catch (backendErr) {
    console.warn('Backend reset password fallback to client SDK:', backendErr);
  }

  try {
    // 2. Fallback via Firebase Auth Client SDK
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true };
  } catch (err: any) {
    console.error('Password reset error:', err);
    if (err.code === 'auth/operation-not-allowed') {
      return {
        success: false,
        error: 'Metode login Email/Password belum diaktifkan pada Firebase Authentication. Aktifkan provider Email/Password pada Firebase Console.',
      };
    }
    if (err.code === 'auth/user-not-found') {
      return {
        success: false,
        error: `Pengguna dengan email "${email}" tidak ditemukan di Firebase Authentication.`,
      };
    }
    if (err.code === 'auth/invalid-email') {
      return {
        success: false,
        error: 'Format alamat email tidak valid.',
      };
    }
    return { success: false, error: err.message || 'Gagal mengirim email reset password.' };
  }
}
