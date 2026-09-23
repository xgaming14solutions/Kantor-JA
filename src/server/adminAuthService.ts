import firebaseConfig from '../../firebase-applet-config.json';
import { UserRole } from '../types';

export interface CreateUserInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  teacherId?: string | null;
  nip?: string;
  phone?: string;
  isActive?: boolean;
}

export interface CreateUserResult {
  success: boolean;
  uid?: string;
  email?: string;
  tempToken?: string;
  error?: string;
}

/**
 * Server-side creation of a genuine Firebase Authentication account using Firebase Identity Toolkit REST API.
 * This runs completely isolated from browser Auth sessions so the logged-in Admin is NEVER logged out.
 */
export async function createAuthUserViaFirebase(data: CreateUserInput): Promise<CreateUserResult> {
  const cleanName = data.name?.trim();
  const cleanUsername = data.username?.trim().toLowerCase();
  const cleanEmail = data.email?.trim().toLowerCase();
  const password = data.password;

  if (!cleanName) {
    return { success: false, error: 'Nama lengkap wajib diisi.' };
  }
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username minimal 3 karakter.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    return {
      success: false,
      error: 'Username hanya boleh berisi huruf, angka, garis bawah (_), titik (.), dan tanda hubung (-).'
    };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Format alamat email tidak valid.' };
  }
  if (!password || password.length < 6) {
    return {
      success: false,
      error: 'Kata sandi awal minimal 6 karakter sesuai standar keamanan Firebase Authentication.'
    };
  }
  const validRoles: UserRole[] = ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'];
  if (!data.role || !validRoles.includes(data.role)) {
    return { success: false, error: 'Role hak akses pengguna tidak valid.' };
  }
  if ((data.role === 'WALI_KELAS' || data.role === 'GURU_MAPEL') && (!data.teacherId || !data.teacherId.trim())) {
    return {
      success: false,
      error: `Untuk peran ${data.role === 'WALI_KELAS' ? 'Wali Kelas' : 'Guru Mapel'}, Guru Terkait (teacherId) wajib dipilih.`
    };
  }

  // Call Google Identity Toolkit REST API
  const apiKey = firebaseConfig.apiKey;
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

  try {
    const response = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
        returnSecureToken: true,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      const errMessage = result.error?.message || '';
      if (errMessage.includes('EMAIL_EXISTS')) {
        return { success: false, error: `Email "${cleanEmail}" sudah terdaftar di Firebase Authentication.` };
      }
      if (errMessage.includes('WEAK_PASSWORD')) {
        return { success: false, error: 'Kata sandi terlalu lemah (minimal 6 karakter).' };
      }
      if (errMessage.includes('OPERATION_NOT_ALLOWED')) {
        return {
          success: false,
          error: 'Metode pendaftaran Email/Password belum diaktifkan pada Firebase Authentication Console.'
        };
      }
      if (errMessage.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        return { success: false, error: 'Terlalu banyak percobaan. Harap tunggu beberapa saat.' };
      }
      return { success: false, error: result.error?.message || 'Gagal membuat akun pada Firebase Authentication.' };
    }

    // Success! Genuine Firebase Authentication UID is localId
    return {
      success: true,
      uid: result.localId,
      email: cleanEmail,
      tempToken: result.idToken,
    };
  } catch (netErr: any) {
    return {
      success: false,
      error: `Gagal terhubung ke Firebase Authentication server: ${netErr.message || 'Koneksi terputus'}`
    };
  }
}

/**
 * Rollback newly created Firebase Auth user if saving profile to Firestore fails
 */
export async function rollbackAuthUser(tempToken: string): Promise<boolean> {
  if (!tempToken) return false;
  const apiKey = firebaseConfig.apiKey;
  const deleteUrl = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`;

  try {
    const res = await fetch(deleteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: tempToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send password reset email directly via Firebase Authentication
 */
export async function sendPasswordResetViaApi(email: string): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'Alamat email wajib diisi.' };
  }
  const apiKey = firebaseConfig.apiKey;
  const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;

  try {
    const response = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: cleanEmail,
      }),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      const errMsg = result.error?.message || '';
      if (errMsg.includes('EMAIL_NOT_FOUND')) {
        return { success: false, error: `Email "${cleanEmail}" tidak ditemukan di Firebase Authentication.` };
      }
      return { success: false, error: result.error?.message || 'Gagal mengirim email reset password.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghubungi server reset password.' };
  }
}
