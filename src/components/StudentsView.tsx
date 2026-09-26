import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import { getEffectiveTeacherId, getActiveTeacherAssignments } from '../lib/dbService';
import {
  GraduationCap,
  Search,
  Plus,
  Edit2,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
  ShieldAlert,
  DoorOpen
} from 'lucide-react';

interface StudentsViewProps {
  userRole: string;
}

export const StudentsView: React.FC<StudentsViewProps> = ({ userRole }) => {
  const { currentUser, role: authRole, loading: authLoading } = useAuth();
  const currentRole = userRole || authRole || currentUser?.role || 'ADMIN';

  const {
    students = [],
    classes = [],
    academicYears = [],
    activeAcademicYear,
    teacherAssignments = [],
    teachers = [],
    loading,
    saveStudent,
    updateStudentStatus,
  } = useMasterData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  // Role-based data access restriction (ID-based)
  const effectiveTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, currentRole, teachers);
  }, [currentUser, currentRole, teachers]);

  // 1. Wali Kelas: strictly filter by currentUser.teacherId -> class.teacherId / homeroomTeacherId
  const homeroomClass = useMemo(() => {
    if (currentRole !== 'WALI_KELAS') return null;
    return (
      (classes || []).find(
        (c) =>
          c &&
          (c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId) &&
          (activeAcademicYear ? c.academicYearId === activeAcademicYear.id : true)
      ) ||
      (classes || []).find(
        (c) => c && (c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId)
      ) ||
      null
    );
  }, [currentRole, classes, effectiveTeacherId, activeAcademicYear]);

  // 2. Guru Mapel: strictly filter by currentUser.teacherId -> teacherAssignments.teacherId -> active academicYearId & semester
  const myAssignments = useMemo(() => {
    if (currentRole !== 'GURU_MAPEL') return [];
    return getActiveTeacherAssignments(teacherAssignments, effectiveTeacherId, activeAcademicYear);
  }, [currentRole, teacherAssignments, effectiveTeacherId, activeAcademicYear]);

  const taughtClassIds = useMemo(() => {
    return Array.from(new Set(myAssignments.map((a) => a.classId)));
  }, [myAssignments]);

  // Determine permitted students and available class dropdown options
  const { accessibleStudents, selectableClasses } = useMemo(() => {
    let accStudents: Student[] = [];
    let selClasses = classes || [];

    if (currentRole === 'WALI_KELAS') {
      accStudents = homeroomClass
        ? (students || []).filter((s) => s && s.classId === homeroomClass.id)
        : [];
      selClasses = homeroomClass && homeroomClass.isActive !== false ? [homeroomClass] : [];
    } else if (currentRole === 'GURU_MAPEL') {
      accStudents = (students || []).filter((s) => s && taughtClassIds.includes(s.classId));
      selClasses = (classes || []).filter((c) => c && c.isActive !== false && taughtClassIds.includes(c.id));
    } else {
      // ADMIN and KEPALA_SEKOLAH have access to all students, and active classes for selection
      accStudents = students || [];
      selClasses = (classes || []).filter((c) => c && c.isActive !== false);
    }

    return { accessibleStudents: accStudents, selectableClasses: selClasses };
  }, [currentRole, homeroomClass, students, classes, taughtClassIds]);

  const [formData, setFormData] = useState<{
    id: string;
    nis: string;
    nisn: string;
    name: string;
    gender: 'L' | 'P';
    birthPlace: string;
    birthDate: string;
    address: string;
    parentName: string;
    parentPhone: string;
    classId: string;
    academicYearId: string;
    status: 'Aktif' | 'Nonaktif' | 'Lulus' | 'Pindah' | 'Keluar';
  }>({
    id: '',
    nis: '',
    nisn: '',
    name: '',
    gender: 'L',
    birthPlace: '',
    birthDate: '',
    address: '',
    parentName: '',
    parentPhone: '',
    classId: '',
    academicYearId: '',
    status: 'Aktif',
  });

  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Filter accessible students based on search, class, and status
  const filteredStudents = useMemo(() => {
    return (accessibleStudents || []).filter((s) => {
      if (!s) return false;
      const nameStr = (s.name || '').toLowerCase();
      const nisStr = s.nis || '';
      const nisnStr = s.nisn || '';
      const q = (searchQuery || '').trim().toLowerCase();

      const matchesSearch =
        !q ||
        nameStr.includes(q) ||
        nisStr.includes(q) ||
        nisnStr.includes(q);

      const matchesClass = selectedClass === 'ALL' || s.classId === selectedClass;
      const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [accessibleStudents, searchQuery, selectedClass, selectedStatus]);

  const getClassName = (classId?: string) => {
    if (!classId) return '-';
    const found = (classes || []).find((c) => c && c.id === classId);
    return found ? found.name : classId;
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      id: `st_${Date.now()}`,
      nis: '',
      nisn: '',
      name: '',
      gender: 'L',
      birthPlace: 'Jakarta',
      birthDate: '2012-05-10',
      address: '',
      parentName: '',
      parentPhone: '',
      classId: selectableClasses[0]?.id || (classes[0]?.id || ''),
      academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
      status: 'Aktif',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (st: Student) => {
    setEditingStudent(st);
    setFormData({
      id: st.id,
      nis: st.nis || '',
      nisn: st.nisn || '',
      name: st.name || '',
      gender: st.gender || 'L',
      birthPlace: st.birthPlace || '',
      birthDate: st.birthDate || '',
      address: st.address || '',
      parentName: st.parentName || '',
      parentPhone: st.parentPhone || '',
      classId: st.classId || '',
      academicYearId: st.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      status: st.status || 'Aktif',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Nama lengkap siswa wajib diisi');
      return;
    }
    if (!formData.nis.trim()) {
      setFormError('Nomor Induk Siswa (NIS) wajib diisi');
      return;
    }
    if (!formData.classId) {
      setFormError('Pilih kelas penempatan siswa');
      return;
    }

    const payload: Student = {
      id: formData.id || `st_${Date.now()}`,
      nis: formData.nis.trim(),
      nisn: formData.nisn.trim() || '-',
      name: formData.name.trim(),
      gender: formData.gender,
      birthPlace: formData.birthPlace.trim(),
      birthDate: formData.birthDate,
      address: formData.address.trim(),
      parentName: formData.parentName.trim(),
      parentPhone: formData.parentPhone.trim(),
      classId: formData.classId,
      academicYearId: formData.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      status: formData.status,
    };

    try {
      setIsSubmitting(true);
      await saveStudent(payload);
      setIsModalOpen(false);
      setNotice(
        editingStudent
          ? `Data siswa ${payload.name} berhasil diperbarui.`
          : `Siswa baru ${payload.name} berhasil ditambahkan ke kelas ${getClassName(payload.classId)}.`
      );
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan data siswa ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (st: Student, newStatus: Student['status']) => {
    try {
      await updateStudentStatus(st.id, newStatus);
      setNotice(`Status siswa ${st.name || st.id} diubah menjadi ${newStatus}.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setGeneralError(`Gagal memperbarui status siswa: ${err?.message || 'Terjadi kesalahan sistem'}`);
      setTimeout(() => setGeneralError(null), 5000);
    }
  };

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
              Data Siswa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Memuat data kesiswaan dari sistem...</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-700">Sedang memuat data kesiswaan...</p>
          <p className="text-[11px] text-slate-400 mt-1">Menyiapkan daftar siswa dan pembagian rombongan belajar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            Data Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentRole === 'WALI_KELAS'
              ? `Mode Wali Kelas: Menampilkan daftar siswa pada kelas binaan Anda (Kelas ${homeroomClass?.name || 'Binaan'}).`
              : currentRole === 'GURU_MAPEL'
              ? `Mode Guru Mapel: Menampilkan daftar siswa pada rombel yang Anda ajar (${taughtClassIds.length} rombel).`
              : currentRole === 'KEPALA_SEKOLAH'
              ? 'Mode Kepala Sekolah: Akses pantauan data siswa seluruh rombongan belajar.'
              : 'Daftar seluruh siswa terdaftar dan relasi penempatan rombongan belajar (classId)'}
          </p>
        </div>

        {currentRole === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Siswa
          </button>
        )}
      </div>

      {/* Role Notice / Access Boundary Banner */}
      {currentRole === 'WALI_KELAS' && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-3">
          <DoorOpen className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-xs">
            <div className="font-semibold text-indigo-900">
              Hak Akses Wali Kelas (Kelas {homeroomClass?.name || 'Belum Ditugaskan'})
            </div>
            <div className="text-indigo-700 mt-0.5 leading-relaxed">
              Sesuai kebijakan keamanan data, Anda hanya berhak melihat daftar siswa yang terdaftar di kelas binaan Anda. Data siswa di kelas lain tidak ditampilkan.
            </div>
          </div>
        </div>
      )}

      {currentRole === 'GURU_MAPEL' && (
        <div className="p-4 bg-violet-50/70 border border-violet-200 rounded-2xl flex items-start gap-3">
          <DoorOpen className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
          <div className="text-xs">
            <div className="font-semibold text-violet-900">
              Hak Akses Guru Mata Pelajaran
            </div>
            <div className="text-violet-700 mt-0.5 leading-relaxed">
              Anda hanya dapat melihat daftar siswa pada rombongan belajar yang Anda ampu berdasarkan penugasan mengajar aktif ({selectableClasses.map((c) => c?.name).filter(Boolean).join(', ') || 'Belum ada kelas yang diampu'}).
            </div>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {generalError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{generalError}</span>
          </div>
          <button onClick={() => setGeneralError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, NIS, atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {currentRole !== 'WALI_KELAS' && <option value="ALL">Semua Kelas</option>}
              {(selectableClasses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Lulus">Lulus</option>
              <option value="Pindah">Pindah</option>
              <option value="Keluar">Keluar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Kelahiran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => {
                  const statusColor =
                    {
                      Aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      Nonaktif: 'bg-slate-100 text-slate-600 border-slate-200',
                      Lulus: 'bg-blue-50 text-blue-700 border-blue-200',
                      Pindah: 'bg-amber-50 text-amber-700 border-amber-200',
                      Keluar: 'bg-rose-50 text-rose-700 border-rose-200',
                    }[s.status || 'Aktif'] || 'bg-slate-100 text-slate-600 border-slate-200';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-900">{s.nis || '-'}</div>
                        <div className="font-mono text-[10px] text-slate-400">{s.nisn || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.name || 'Tanpa Nama'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {s.address || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{s.gender || 'L'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {getClassName(s.classId)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {s.birthPlace ? `${s.birthPlace}, ` : ''}
                        {s.birthDate || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusColor}`}
                        >
                          {s.status || 'Aktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailStudent(s)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Detail Siswa"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          {currentRole === 'ADMIN' && (
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Edit Siswa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GraduationCap className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-500">Tidak ada siswa yang sesuai kriteria atau penugasan Anda.</p>
                      <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau sesuaikan filter kelas/status.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>
            Menampilkan {filteredStudents.length} siswa (dari {accessibleStudents.length} siswa yang
            dapat diakses)
          </span>
          <span className="text-[11px] text-slate-400">Hubungan Relasional: ID-Based (classId)</span>
        </div>
      </div>

      {/* Modal Add/Edit (Admin only) */}
      {isModalOpen && currentRole === 'ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingStudent ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nama lengkap sesuai akta lahir"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIS <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nomor Induk Siswa"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    placeholder="10 digit NISN nasional"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Penempatan Rombel / Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {(classes || [])
                      .filter((c) => c && (c.isActive !== false || c.id === formData.classId))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          Kelas {c.name} (Tingkat {c.gradeLevel})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Kota kelahiran"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Domisili</label>
                <textarea
                  rows={2}
                  placeholder="Alamat lengkap tempat tinggal siswa..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    placeholder="Nama ayah / ibu / wali"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. HP Orang Tua</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Kesiswaan</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Student['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Pindah">Pindah</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran Pendaftaran</label>
                  <select
                    value={formData.academicYearId}
                    onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {(academicYears || []).map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} ({ay.semester}) {ay.isActive ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Siswa */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                  {(detailStudent.name || 'S').charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{detailStudent.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    NIS: {detailStudent.nis || '-'} / NISN: {detailStudent.nisn || '-'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kelas Saat Ini</span>
                <span className="font-semibold text-indigo-700">
                  Kelas {getClassName(detailStudent.classId)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Jenis Kelamin</span>
                <span className="font-medium text-slate-800">
                  {detailStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tempat, Tanggal Lahir</span>
                <span className="text-slate-800">
                  {detailStudent.birthPlace ? `${detailStudent.birthPlace}, ` : ''}{detailStudent.birthDate || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nama Orang Tua / Wali</span>
                <span className="font-medium text-slate-800">
                  {detailStudent.parentName || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kontak Orang Tua</span>
                <span className="font-mono text-slate-800">
                  {detailStudent.parentPhone || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Status Kesiswaan</span>
                <span className="font-bold text-emerald-600">{detailStudent.status || 'Aktif'}</span>
              </div>
              {detailStudent.address && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Alamat Tinggal:</span>
                  <p className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                    {detailStudent.address}
                  </p>
                </div>
              )}

              {/* Status Action Switcher (Admin only) */}
              {currentRole === 'ADMIN' && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Ubah Cepat Status Kesiswaan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['Aktif', 'Nonaktif', 'Lulus', 'Pindah', 'Keluar'] as Student['status'][]).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => {
                            handleStatusChange(detailStudent, st);
                            setDetailStudent({ ...detailStudent, status: st });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            detailStudent.status === st
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
