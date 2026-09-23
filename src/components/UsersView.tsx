import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import {
  createUserByAdmin,
  sendPasswordReset,
  profileHasFirebaseAuth,
  isRealFirebaseAuthUid
} from '../lib/authService';
import {
  UserCog,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  Shield,
  GraduationCap,
  X,
  UserCheck,
  AlertCircle,
  KeyRound,
  AlertTriangle,
  Loader2,
  Mail,
  User,
  ShieldCheck,
  UserPlus
} from 'lucide-react';

interface UsersViewProps {
  userRole: UserRole | null;
}

export const UsersView: React.FC<UsersViewProps> = ({ userRole }) => {
  const { users, teachers, saveUser, toggleUserStatus, deleteUser } = useMasterData();
  const { currentUser, refreshUserProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Selected records
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userToReset, setUserToReset] = useState<UserProfile | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'GURU_MAPEL' as UserRole,
    teacherId: '',
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    id: '',
    userId: '',
    name: '',
    username: '',
    email: '',
    role: 'GURU_MAPEL' as UserRole,
    teacherId: '',
    isActive: true,
  });

  // UI feedback
  const [notice, setNotice] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Access check: Only ADMIN can access
  if (userRole !== 'ADMIN') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Anda tidak memiliki izin untuk membuka halaman Manajemen Pengguna. Menu ini khusus untuk Administrator KantoJA.
        </p>
      </div>
    );
  }

  // --- Handlers ---

  const handleOpenAdd = () => {
    setAddForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'GURU_MAPEL',
      teacherId: '',
      isActive: true,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      id: user.id,
      userId: user.userId || user.id,
      name: user.name || user.displayName || '',
      username: user.username || '',
      email: user.email,
      role: user.role,
      teacherId: user.teacherId || '',
      isActive: user.isActive !== false,
    });
    setFormError('');
    setResetSent(false);
    setIsEditModalOpen(true);
  };

  const handleOpenDetail = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Submit Add User (Creates Firebase Auth + Firestore user)
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = addForm.name.trim();
    if (!cleanName) {
      setFormError('Nama lengkap pengguna wajib diisi.');
      return;
    }
    const cleanUsername = addForm.username.trim().toLowerCase();
    if (!cleanUsername) {
      setFormError('Username wajib diisi.');
      return;
    }
    if (cleanUsername.length < 3) {
      setFormError('Username minimal 3 karakter.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setFormError('Username hanya boleh berisi huruf, angka, garis bawah (_), titik (.), dan tanda hubung (-).');
      return;
    }
    // Requirement 8: Check if username already belongs to a user with a genuine Firebase Auth UID
    const existingUsernameUser = users.find((u) => u.username?.toLowerCase() === cleanUsername);
    if (existingUsernameUser && profileHasFirebaseAuth(existingUsernameUser)) {
      setFormError(
        `Username "${cleanUsername}" sudah digunakan oleh akun dengan Firebase Authentication resmi (UID: ${
          existingUsernameUser.userId || existingUsernameUser.id
        }). Tidak dapat membuat akun Firebase kedua.`
      );
      return;
    }

    const cleanEmail = addForm.email.trim().toLowerCase();
    if (!cleanEmail) {
      setFormError('Email pengguna wajib diisi.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setFormError('Format alamat email tidak valid (contoh: guru@kantoja.sch.id).');
      return;
    }
    // Requirement 8: Check if email already belongs to a user with a genuine Firebase Auth UID
    const existingEmailUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingEmailUser && profileHasFirebaseAuth(existingEmailUser)) {
      setFormError(
        `Profil dengan email "${cleanEmail}" sudah memiliki akun Firebase Authentication resmi (UID: ${
          existingEmailUser.userId || existingEmailUser.id
        }). Tidak dapat membuat akun Firebase kedua untuk profil yang sama.`
      );
      return;
    }

    if (!addForm.password || addForm.password.length < 6) {
      setFormError('Kata sandi awal wajib diisi minimal 6 karakter sesuai standar keamanan Firebase.');
      return;
    }

    // Role validation
    const validRoles: UserRole[] = ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'];
    if (!addForm.role || !validRoles.includes(addForm.role)) {
      setFormError('Role hak akses pengguna tidak valid.');
      return;
    }

    // Role-teacher validation: WALI_KELAS and GURU_MAPEL MUST have teacherId
    if (addForm.role === 'WALI_KELAS' || addForm.role === 'GURU_MAPEL') {
      if (!addForm.teacherId || addForm.teacherId.trim() === '') {
        setFormError(
          `Untuk peran ${
            addForm.role === 'WALI_KELAS' ? 'Wali Kelas' : 'Guru Mapel'
          }, Guru Terkait (teacherId) wajib dipilih dari master data.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const linkedTeacher = teachers.find((t) => t.id === addForm.teacherId);
      const res = await createUserByAdmin({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password: addForm.password,
        role: addForm.role,
        teacherId: addForm.teacherId ? addForm.teacherId.trim() : null,
        nip: linkedTeacher?.nip,
        phone: linkedTeacher?.phone,
        isActive: addForm.isActive,
      });

      if (!res.success || !res.user) {
        setFormError(res.error || 'Gagal membuat akun pengguna.');
        setIsSubmitting(false);
        return;
      }

      // If there was an old placeholder record without Auth, remove it so there is no duplicate
      if (existingEmailUser && existingEmailUser.id.startsWith('u_')) {
        await deleteUser(existingEmailUser.id);
      } else if (existingUsernameUser && existingUsernameUser.id.startsWith('u_')) {
        await deleteUser(existingUsernameUser.id);
      }

      await saveUser(res.user);

      // Reset form memory completely so no plaintext password lingers
      setAddForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'GURU_MAPEL',
        teacherId: '',
        isActive: true,
      });

      setIsAddModalOpen(false);
      setNotice(
        `Akun ${res.user.name} (@${res.user.username}) dengan email ${res.user.email} dan role ${res.user.role} berhasil dibuat di Firebase Auth (UID: ${res.user.userId}) dan tersimpan di Firestore.`
      );
      setTimeout(() => setNotice(''), 6000);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kendala saat membuat akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit User
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!editForm.name.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }
    const cleanUsername = editForm.username.trim().toLowerCase();
    if (!cleanUsername) {
      setFormError('Username wajib diisi.');
      return;
    }
    // Check uniqueness if changed
    const usernameTaken = users.some(
      (u) => u.id !== editForm.id && u.username?.toLowerCase() === cleanUsername
    );
    if (usernameTaken) {
      setFormError(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
      return;
    }

    // Role-teacher validation
    if (editForm.role === 'WALI_KELAS' || editForm.role === 'GURU_MAPEL') {
      if (!editForm.teacherId) {
        setFormError(
          `Untuk peran ${
            editForm.role === 'WALI_KELAS' ? 'Wali Kelas' : 'Guru Mapel'
          }, Guru Terkait wajib dipilih.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const linkedTeacher = teachers.find((t) => t.id === editForm.teacherId);
      const updatedProfile: UserProfile = {
        id: editForm.id,
        userId: editForm.userId || editForm.id,
        name: editForm.name.trim(),
        displayName: editForm.name.trim(),
        username: cleanUsername,
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
        teacherId: editForm.teacherId || undefined,
        nip: linkedTeacher?.nip || selectedUser?.nip,
        phone: linkedTeacher?.phone || selectedUser?.phone,
        isActive: editForm.isActive,
        updatedAt: new Date().toISOString(),
      };

      await saveUser(updatedProfile);

      // If current user updated their own profile, refresh session
      if (currentUser?.id === updatedProfile.id) {
        await refreshUserProfile();
      }

      setIsEditModalOpen(false);
      setNotice(`Akun ${updatedProfile.name} berhasil diperbarui.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: UserProfile) => {
    // Prevent admin from deactivating their own active account
    if (currentUser?.id === user.id) {
      setNotice('Peringatan: Anda tidak dapat menonaktifkan akun sendiri yang sedang login.');
      setTimeout(() => setNotice(''), 4000);
      return;
    }
    await toggleUserStatus(user.id);
    const newStatus = user.isActive === false ? 'Aktif' : 'Nonaktif';
    setNotice(`Status akun ${user.name} (@${user.username}) diubah menjadi ${newStatus}.`);
    setTimeout(() => setNotice(''), 4000);
  };

  // Confirm Delete or Deactivate instead
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (currentUser?.id === userToDelete.id) {
      setNotice('Peringatan: Anda tidak dapat menghapus akun sendiri yang sedang login.');
      setIsDeleteModalOpen(false);
      return;
    }

    await deleteUser(userToDelete.id);
    setNotice(`Akun pengguna ${userToDelete.name} berhasil dihapus dari sistem.`);
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleDeactivateInstead = async () => {
    if (!userToDelete) return;
    if (userToDelete.isActive !== false) {
      await toggleUserStatus(userToDelete.id);
    }
    setNotice(`Akun ${userToDelete.name} dialihkan menjadi NONAKTIF untuk menjaga data historis.`);
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
    setTimeout(() => setNotice(''), 4000);
  };

  // Send Password Reset
  const handleOpenReset = (user: UserProfile) => {
    setUserToReset(user);
    setFormError('');
    setIsResetModalOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!userToReset || !userToReset.email) return;
    setIsSubmitting(true);
    setFormError('');
    try {
      const res = await sendPasswordReset(userToReset.email);
      if (res.success) {
        setIsResetModalOpen(false);
        setNotice(
          `Instruksi reset kata sandi telah dikirimkan ke email: ${userToReset.email}. Pengguna dapat memperbarui kata sandi secara mandiri.`
        );
        setTimeout(() => setNotice(''), 6000);
        setUserToReset(null);
      } else {
        setFormError(res.error || 'Gagal mengirim email reset password.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem saat mengirim email reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetEmail = async (email: string) => {
    setResetSent(false);
    const res = await sendPasswordReset(email);
    if (res.success) {
      setResetSent(true);
      setNotice(`Instruksi reset kata sandi telah dikirimkan ke email: ${email}`);
      setTimeout(() => setNotice(''), 5000);
    } else {
      setFormError(res.error || 'Gagal mengirim email reset password.');
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.teacherId && u.teacherId.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-600" />
            ADMIN
          </span>
        );
      case 'KEPALA_SEKOLAH':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-amber-600" />
            KEPALA SEKOLAH
          </span>
        );
      case 'WALI_KELAS':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-blue-600" />
            WALI KELAS
          </span>
        );
      case 'GURU_MAPEL':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-emerald-600" />
            GURU MAPEL
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-indigo-600" />
            Manajemen Pengguna (Akun & Otorisasi)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola akun Firebase Authentication, username unik, hak akses (RBAC), dan relasi ke data guru (<code className="font-mono text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-[11px]">users.teacherId</code>).
          </p>
        </div>

        <button
          id="btn-add-user"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search and Role Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-user-input"
            type="text"
            placeholder="Cari nama, username, email, ID guru..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Semua Role' },
            { id: 'ADMIN', label: 'Admin' },
            { id: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah' },
            { id: 'WALI_KELAS', label: 'Wali Kelas' },
            { id: 'GURU_MAPEL', label: 'Guru Mapel' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                roleFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Guru Terkait</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data pengguna yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const linkedTeacher = teachers.find((t) => t.id === u.teacherId);
                  const isCurrent = currentUser?.id === u.id;
                  const isAct = u.isActive !== false;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isCurrent ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Nama Lengkap */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {(u.name || u.displayName || 'U').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name || u.displayName}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {!profileHasFirebaseAuth(u) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Profil belum memiliki akun Firebase Auth
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                                  UID: {u.userId || u.uid || u.id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          @{u.username || u.id}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      {/* Guru Terkait */}
                      <td className="py-3.5 px-4">
                        {u.teacherId ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                              <span>{linkedTeacher ? linkedTeacher.name : 'Guru Ditemukan'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-slate-400 font-mono">ID:</span>
                              <span className="font-mono text-indigo-600 font-medium bg-slate-100 px-1 rounded">
                                {u.teacherId}
                              </span>
                              {linkedTeacher?.nip && (
                                <span className="text-slate-400 ml-1 font-mono">
                                  &bull; NIP {linkedTeacher.nip}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Tanpa relasi guru
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={isAct ? 'Klik untuk nonaktifkan akun' : 'Klik untuk aktifkan akun'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            isAct
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAct ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          {isAct ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Buat Akun Auth untuk profil belum terdaftar di Firebase Auth */}
                          {!profileHasFirebaseAuth(u) && (
                            <button
                              title="Buat Akun Firebase Authentication untuk Profil Ini"
                              onClick={() => {
                                setAddForm({
                                  name: u.name || u.displayName || '',
                                  username: u.username || '',
                                  email: u.email || '',
                                  password: '',
                                  role: u.role,
                                  teacherId: u.teacherId || '',
                                  isActive: u.isActive !== false,
                                });
                                setFormError('');
                                setIsAddModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Buat Akun Auth</span>
                            </button>
                          )}

                          {/* Detail */}
                          <button
                            title="Detail Pengguna"
                            onClick={() => handleOpenDetail(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            title="Edit Pengguna"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            title="Kirim Reset Kata Sandi"
                            onClick={() => handleOpenReset(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Hapus */}
                          <button
                            title="Hapus Pengguna"
                            onClick={() => handleOpenDelete(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Tambah Pengguna Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah Pengguna Baru</h3>
                  <p className="text-[11px] text-slate-400">
                    Daftarkan akun autentikasi Firebase & profil pengguna
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Si."
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Username & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">@</span>
                    <input
                      type="text"
                      required
                      placeholder="budisantoso"
                      value={addForm.username}
                      onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dapat digunakan untuk login</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Pengguna <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="budi@kantoja.sch.id"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Awal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Ditangani secara aman oleh Firebase Authentication. Tidak disimpan dalam plaintext.
                </p>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role (Hak Akses) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      role: e.target.value as UserRole,
                      teacherId: e.target.value === 'ADMIN' ? '' : addForm.teacherId,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="GURU_MAPEL">GURU_MAPEL - Guru Mata Pelajaran</option>
                  <option value="WALI_KELAS">WALI_KELAS - Wali Kelas Rombel</option>
                  <option value="KEPALA_SEKOLAH">KEPALA_SEKOLAH - Monitoring Sekolah</option>
                  <option value="ADMIN">ADMIN - Akses Penuh Sistem</option>
                </select>
              </div>

              {/* Guru Terkait (Dropdown dari master data teachers) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Guru Terkait
                    {(addForm.role === 'WALI_KELAS' || addForm.role === 'GURU_MAPEL') && (
                      <span className="text-rose-500 ml-1">* Wajib dipilih</span>
                    )}
                  </label>
                  {(addForm.role === 'ADMIN' || addForm.role === 'KEPALA_SEKOLAH') && (
                    <span className="text-[10px] text-slate-400">Opsional untuk Admin/Kepsek</span>
                  )}
                </div>

                <select
                  value={addForm.teacherId}
                  onChange={(e) => setAddForm({ ...addForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="">
                    -- {addForm.role === 'WALI_KELAS' || addForm.role === 'GURU_MAPEL'
                      ? 'Pilih Guru yang Sesuai (Wajib)'
                      : 'Tanpa Relasi Guru (Opsional)'} --
                  </option>
                  {teachers.map((tch) => (
                    <option key={tch.id} value={tch.id}>
                      {tch.name} (ID: {tch.id}) - {tch.specialization || tch.status}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Sistem menyimpan <strong className="font-mono text-slate-600">teacherId</strong> untuk menghubungkan penugasan mengajar dan kelas binaan.
                </p>
              </div>

              {/* Status Akun */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Status Keaktifan Akun</div>
                  <div className="text-[11px] text-slate-400">Akun nonaktif tidak diizinkan login</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.isActive}
                    onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-user-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Memproses...' : 'Buat Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Pengguna */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Akun Pengguna</h3>
                  <p className="text-[11px] text-slate-400">
                    Perbarui profil, role otorisasi, dan relasi guru
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Username & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">@</span>
                    <input
                      type="text"
                      required
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Pengguna
                  </label>
                  <input
                    type="email"
                    disabled
                    value={editForm.email}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-500 bg-slate-50 cursor-not-allowed font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Email akun utama Firebase</p>
                </div>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role (Hak Akses) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as UserRole,
                      teacherId: e.target.value === 'ADMIN' ? '' : editForm.teacherId,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="GURU_MAPEL">GURU_MAPEL - Guru Mata Pelajaran</option>
                  <option value="WALI_KELAS">WALI_KELAS - Wali Kelas Rombel</option>
                  <option value="KEPALA_SEKOLAH">KEPALA_SEKOLAH - Monitoring Sekolah</option>
                  <option value="ADMIN">ADMIN - Akses Penuh Sistem</option>
                </select>
              </div>

              {/* Guru Terkait */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Guru Terkait
                    {(editForm.role === 'WALI_KELAS' || editForm.role === 'GURU_MAPEL') && (
                      <span className="text-rose-500 ml-1">* Wajib dipilih</span>
                    )}
                  </label>
                  {(editForm.role === 'ADMIN' || editForm.role === 'KEPALA_SEKOLAH') && (
                    <span className="text-[10px] text-slate-400">Opsional untuk Admin/Kepsek</span>
                  )}
                </div>

                <select
                  value={editForm.teacherId}
                  onChange={(e) => setEditForm({ ...editForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="">
                    -- {editForm.role === 'WALI_KELAS' || editForm.role === 'GURU_MAPEL'
                      ? 'Pilih Guru yang Sesuai (Wajib)'
                      : 'Tanpa Relasi Guru (Opsional)'} --
                  </option>
                  {teachers.map((tch) => (
                    <option key={tch.id} value={tch.id}>
                      {tch.name} (ID: {tch.id}) - {tch.specialization || tch.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Akun */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Status Keaktifan Akun</div>
                  <div className="text-[11px] text-slate-400">Akun nonaktif tidak diizinkan login</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Dedicated Reset Password Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Reset Kata Sandi Pengguna</span>
                  </div>
                  {resetSent && (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Terkirim
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sesuai standar keamanan, kata sandi lama tidak ditampilkan. Admin dapat mengirim email instruksi tautan reset kata sandi ke <strong>{editForm.email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => handleSendResetEmail(editForm.email)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Kirim Email Reset Password
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-edit-user-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Detail Pengguna */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Detail Akun Pengguna</h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                  {(selectedUser.name || 'U').charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedUser.name}</h4>
                  <div className="text-xs text-indigo-600 font-mono font-semibold">
                    @{selectedUser.username || selectedUser.id}
                  </div>
                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[11px]">Email Resmi</span>
                  <span className="font-mono text-slate-800 font-medium">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status Akun</span>
                  <span
                    className={`inline-block font-semibold mt-0.5 ${
                      selectedUser.isActive !== false ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedUser.isActive !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">User ID (Firebase UID)</span>
                  <span className="font-mono text-slate-600 text-[11px] break-all">
                    {selectedUser.userId || selectedUser.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">NIP</span>
                  <span className="font-mono text-slate-800">
                    {selectedUser.nip || '-'}
                  </span>
                </div>
              </div>

              {/* Guru Terkait Detail */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Relasi Tenaga Pendidik
                </div>
                {selectedUser.teacherId ? (
                  (() => {
                    const t = teachers.find((tch) => tch.id === selectedUser.teacherId);
                    return (
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{t ? t.name : 'Guru Ditemukan'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          teacherId: {selectedUser.teacherId} {t?.status && `• ${t.status}`}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-slate-400 italic">
                    Akun ini tidak memiliki tautan ID guru (khusus Admin).
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Konfirmasi Hapus Akun Pengguna */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Akun</h3>
                <p className="text-[11px] text-slate-400">
                  Perhatikan dampak terhadap data historis sekolah
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Apakah Anda yakin ingin menghapus akun pengguna{' '}
                <strong className="text-slate-900">{userToDelete.name}</strong> (@{userToDelete.username})?
              </p>

              {userToDelete.teacherId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Peringatan Data Historis Sekolah:</span>
                  </div>
                  <p className="text-[11px]">
                    Pengguna ini terhubung dengan Guru (ID: <code className="font-mono font-bold">{userToDelete.teacherId}</code>). Akun ini mungkin memiliki riwayat penugasan kelas, pengisian nilai, absensi, atau rapor.
                  </p>
                  <p className="text-[11px] font-medium text-amber-800 pt-0.5">
                    Rekomendasi aman: Ubah status akun menjadi <strong>NONAKTIF</strong> agar pengguna tidak dapat login, namun data historis sekolah tetap aman terjaga.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>

              {userToDelete.teacherId && userToDelete.isActive !== false && (
                <button
                  type="button"
                  onClick={handleDeactivateInstead}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 transition cursor-pointer"
                >
                  Ubah ke Nonaktif Saja (Disarankan)
                </button>
              )}

              <button
                type="button"
                id="btn-confirm-delete-user"
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer"
              >
                Tetap Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Reset Kata Sandi Pengguna */}
      {isResetModalOpen && userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Kata Sandi Pengguna</h3>
                  <p className="text-[11px] text-slate-400">
                    Kirim link pembaruan password melalui email terdaftar
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setUserToReset(null);
                  setFormError('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[11px] text-slate-400">Akun Sasaran:</div>
                <div className="font-semibold text-slate-900 text-sm">{userToReset.name} (@{userToReset.username})</div>
                <div className="font-mono text-indigo-600 text-xs">{userToReset.email}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Peran: <span className="font-semibold text-slate-700">{userToReset.role}</span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-blue-800">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Protokol Keamanan & Privasi Firebase</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Sesuai standar keamanan terenkripsi Firebase, kata sandi lama tidak dapat dan tidak pernah ditampilkan kepada siapapun (termasuk Administrator).
                </p>
                <p className="text-[11px] font-medium text-blue-800">
                  Tautan resmi Firebase akan dikirimkan langsung ke email di atas agar pemilik akun dapat membuat kata sandi baru secara mandiri.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setUserToReset(null);
                  setFormError('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Kirim Email Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
