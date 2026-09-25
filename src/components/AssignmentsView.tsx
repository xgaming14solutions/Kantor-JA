import React, { useState, useMemo } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import { TeacherAssignment, UserRole } from '../types';
import { getEffectiveTeacherId } from '../lib/dbService';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  BookOpen,
  DoorOpen,
  Edit2,
  Trash2,
  Power,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  X,
  Info
} from 'lucide-react';

interface AssignmentFormData {
  id?: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap';
  status: 'Aktif' | 'Nonaktif';
  totalHoursPerWeek: number;
}

export const AssignmentsView: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const { currentUser, role } = useAuth();
  const {
    teachers,
    classes,
    subjects,
    academicYears,
    activeAcademicYear,
    teacherAssignments,
    saveTeacherAssignment,
    deleteTeacherAssignment
  } = useMasterData();

  // Role resolution
  const isAdmin = userRole === 'ADMIN' || role === 'ADMIN';
  const isTeacher = userRole === 'GURU_MAPEL' || userRole === 'WALI_KELAS' || role === 'GURU_MAPEL' || role === 'WALI_KELAS';

  const effectiveTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, role, teachers);
  }, [currentUser, role, teachers]);

  const teacherProfile = useMemo(() => {
    return teachers.find((t) => t.id === effectiveTeacherId) || null;
  }, [teachers, effectiveTeacherId]);

  // Restrict to teacher's own assignments if logged in as a teacher
  const accessibleAssignments = useMemo(() => {
    if (isTeacher && !isAdmin) {
      if (!effectiveTeacherId) return [];
      const cleanId = effectiveTeacherId.trim().toLowerCase();
      return teacherAssignments.filter((a) => (a.teacherId || '').trim().toLowerCase() === cleanId);
    }
    return teacherAssignments;
  }, [isTeacher, isAdmin, effectiveTeacherId, teacherAssignments]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modals & Notifications
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<TeacherAssignment | null>(null);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<AssignmentFormData>({
    teacherId: '',
    subjectId: '',
    classId: '',
    academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
    semester: (activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap',
    status: 'Aktif',
    totalHoursPerWeek: 4
  });

  // Open Add Modal
  const openAddModal = () => {
    setEditingAssignment(null);
    setFormError('');
    const teachingSubjects = subjects.filter((s) => (s.type || 'subject') === 'subject' && s.isActive !== false);
    setFormData({
      teacherId: teachers.find((t) => t.isActive !== false)?.id || teachers[0]?.id || '',
      subjectId: teachingSubjects[0]?.id || '',
      classId: classes.find((c) => c.isActive !== false)?.id || classes[0]?.id || '',
      academicYearId: activeAcademicYear?.id || academicYears[0]?.id || 'ay_2026_2027_1',
      semester: (activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap',
      status: 'Aktif',
      totalHoursPerWeek: 4
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (asg: TeacherAssignment) => {
    setEditingAssignment(asg);
    setFormError('');
    setFormData({
      id: asg.id,
      teacherId: asg.teacherId,
      subjectId: asg.subjectId,
      classId: asg.classId,
      academicYearId: asg.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: (asg.semester || activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap',
      status: asg.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
      totalHoursPerWeek: asg.totalHoursPerWeek || 2
    });
    setIsModalOpen(true);
  };

  // Form Submission (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // 1. Validation
    if (
      !formData.teacherId ||
      !formData.subjectId ||
      !formData.classId ||
      !formData.academicYearId ||
      !formData.semester ||
      !formData.status
    ) {
      setFormError('Harap lengkapi semua pilihan: Guru, Mata Pelajaran, Kelas, Tahun Ajaran, Semester, dan Status.');
      return;
    }

    // 2. Prevent Duplicates (teacherId + subjectId + classId + academicYearId + semester)
    const isDuplicate = teacherAssignments.some((a) => {
      // Exclude self when editing
      if (editingAssignment && a.id === editingAssignment.id) {
        return false;
      }
      return (
        a.teacherId === formData.teacherId &&
        a.subjectId === formData.subjectId &&
        a.classId === formData.classId &&
        a.academicYearId === formData.academicYearId &&
        a.semester === formData.semester
      );
    });

    if (isDuplicate) {
      setFormError('Penugasan dengan guru, mata pelajaran, kelas, tahun ajaran, dan semester tersebut sudah tersedia.');
      return;
    }

    // 3. Persist to Firestore & Local Cache
    setIsSubmitting(true);
    try {
      const isEdit = Boolean(editingAssignment);
      const targetId = isEdit ? editingAssignment!.id : `asg_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const payload: TeacherAssignment = {
        id: targetId,
        teacherId: formData.teacherId,
        subjectId: formData.subjectId,
        classId: formData.classId,
        academicYearId: formData.academicYearId,
        semester: formData.semester,
        status: formData.status,
        totalHoursPerWeek: Number(formData.totalHoursPerWeek) || 2,
        createdAt: isEdit && editingAssignment?.createdAt ? editingAssignment.createdAt : nowIso,
        updatedAt: nowIso
      };

      await saveTeacherAssignment(payload);
      setIsModalOpen(false);

      if (isEdit) {
        setNotice('Penugasan berhasil diperbarui.');
      } else {
        setNotice('Penugasan berhasil disimpan.');
      }
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      console.error('Error saving assignment:', err);
      setFormError(err?.message || 'Terjadi kesalahan saat menyimpan penugasan ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (asg: TeacherAssignment) => {
    if (!isAdmin) return;
    const newStatus = asg.status === 'Nonaktif' ? 'Aktif' : 'Nonaktif';
    try {
      const updated: TeacherAssignment = {
        ...asg,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      await saveTeacherAssignment(updated);
      setNotice(`Status penugasan berhasil diubah menjadi ${newStatus}.`);
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      console.error('Error toggling status:', err);
    }
  };

  // Delete Assignment Confirmation
  const confirmDelete = async () => {
    if (!deletingAssignment || !isAdmin) return;
    setIsSubmitting(true);
    try {
      await deleteTeacherAssignment(deletingAssignment.id);
      setDeletingAssignment(null);
      setNotice('Penugasan berhasil dihapus.');
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      console.error('Error deleting assignment:', err);
      setFormError(err?.message || 'Terjadi kesalahan saat menghapus penugasan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Assignments List
  const filteredAssignments = useMemo(() => {
    return accessibleAssignments.filter((asg) => {
      const t = teachers.find((item) => item.id === asg.teacherId);
      const c = classes.find((item) => item.id === asg.classId);
      const s = subjects.find((item) => item.id === asg.subjectId);
      const ay = academicYears.find((item) => item.id === asg.academicYearId);
      const sCategory = s?.category || 'Umum';

      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (t?.name.toLowerCase().includes(query) ?? false) ||
        (s?.name.toLowerCase().includes(query) ?? false) ||
        (s?.nameArab?.toLowerCase().includes(query) ?? false) ||
        (c?.name.toLowerCase().includes(query) ?? false) ||
        (t?.nip?.includes(query) ?? false);

      // Filter matches
      const matchesYear =
        selectedYearFilter === 'ALL' || asg.academicYearId === selectedYearFilter;

      const matchesSemester =
        selectedSemesterFilter === 'ALL' || asg.semester === selectedSemesterFilter;

      const matchesCategory =
        selectedCategoryFilter === 'ALL' || sCategory === selectedCategoryFilter;

      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'Aktif' && (asg.status === 'Aktif' || !asg.status)) ||
        (selectedStatusFilter === 'Nonaktif' && asg.status === 'Nonaktif');

      return matchesSearch && matchesYear && matchesSemester && matchesCategory && matchesStatus;
    });
  }, [
    accessibleAssignments,
    teachers,
    classes,
    subjects,
    academicYears,
    searchQuery,
    selectedYearFilter,
    selectedSemesterFilter,
    selectedCategoryFilter,
    selectedStatusFilter
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isTeacher && !isAdmin ? 'Penugasan Guru (Jadwal Mengajar Anda)' : 'Penugasan Guru'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Periode Aktif: {activeAcademicYear?.name || '2026/2027'} ({activeAcademicYear?.semester || 'Ganjil'})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isTeacher && !isAdmin
              ? `Menampilkan jadwal tugas mengajar resmi untuk akun ${teacherProfile?.name || 'Guru'}.`
              : 'Atur guru mengajar mata pelajaran tertentu pada rombel kelas tertentu secara relasional via ID database.'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Tambah Penugasan
          </button>
        )}
      </div>

      {/* Notice Notification */}
      {notice && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Info Banner for Guru */}
      {isTeacher && !isAdmin && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Akses Khusus Guru: {teacherProfile?.name} (NIP. {teacherProfile?.nip || '-'})
            </h4>
            <p className="text-xs text-blue-800/90 mt-0.5">
              Anda hanya dapat melihat daftar penugasan kelas dan mata pelajaran yang ditugaskan kepada Anda. Nilai siswa dapat diinput pada menu <strong>Nilai Siswa</strong> sesuai mata pelajaran dan kelas yang tertera di bawah ini.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru, NIP, mata pelajaran, atau rombel kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tahun Ajaran */}
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Tahun Ajaran</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isActive ? '★ (Aktif)' : ''}
                </option>
              ))}
            </select>

            {/* Filter Semester */}
            <select
              value={selectedSemesterFilter}
              onChange={(e) => setSelectedSemesterFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Semester</option>
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>

            {/* Filter Kategori Mapel */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Diniyah">Diniyah</option>
              <option value="Umum">Umum</option>
            </select>

            {/* Filter Status */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Nonaktif">Status: Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Penugasan Guru */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Guru</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Kelas/Rombel</th>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada penugasan guru yang sesuai kriteria pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((asg) => {
                  const t = teachers.find((item) => item.id === asg.teacherId);
                  const c = classes.find((item) => item.id === asg.classId);
                  const s = subjects.find((item) => item.id === asg.subjectId);
                  const ay = academicYears.find((item) => item.id === asg.academicYearId);
                  const sCategory = s?.category || 'Umum';
                  const isInactive = asg.status === 'Nonaktif';
                  const isHistorical = asg.status === 'Historis';

                  return (
                    <tr
                      key={asg.id}
                      className={`hover:bg-slate-50/70 transition ${isInactive ? 'bg-slate-50/40 opacity-75' : ''}`}
                    >
                      {/* 1. Nama Guru */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{t?.name || asg.teacherId}</div>
                        <div className="text-[11px] text-slate-400 font-mono">NIP. {t?.nip || '-'}</div>
                      </td>

                      {/* 2. Mata Pelajaran */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{s?.name || asg.subjectId}</div>
                        {s?.nameArab && (
                          <div className="text-xs font-arabic font-bold text-slate-700 mt-0.5 tracking-wide" dir="rtl">
                            {s.nameArab}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{s?.code}</span>
                      </td>

                      {/* 3. Kategori (Diniyah / Umum) */}
                      <td className="py-3.5 px-4">
                        {sCategory === 'Diniyah' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            DINIYAH
                          </span>
                        ) : sCategory === 'Umum' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            UMUM
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {sCategory}
                          </span>
                        )}
                      </td>

                      {/* 4. Kelas/Rombel */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900">{c?.name || asg.classId}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Tingkat {c?.gradeLevel || '-'}
                        </span>
                      </td>

                      {/* 5. Tahun Ajaran */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">
                          {ay?.name || (asg.academicYearId.includes('2026') ? '2026/2027' : asg.academicYearId)}
                        </span>
                        {ay?.isActive && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* 6. Semester */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {asg.semester || ay?.semester || 'Ganjil'}
                        </span>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isInactive ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Nonaktif
                          </span>
                        ) : isHistorical ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Historis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* 8. Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        {isAdmin ? (
                          <div className="flex items-center justify-center gap-1">
                            {/* Tombol Edit */}
                            <button
                              onClick={() => openEditModal(asg)}
                              title="Edit Penugasan"
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Nonaktifkan / Aktifkan */}
                            <button
                              onClick={() => handleToggleStatus(asg)}
                              title={isInactive ? 'Aktifkan Penugasan' : 'Nonaktifkan Penugasan'}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isInactive
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Hapus */}
                            <button
                              onClick={() => setDeletingAssignment(asg)}
                              title="Hapus Penugasan"
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Hanya Lihat</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form: Tambah / Edit Penugasan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingAssignment ? 'Edit Penugasan Guru' : 'Tambah Penugasan Guru'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingAssignment
                    ? 'Perbarui guru, mata pelajaran, rombel kelas, atau status penugasan'
                    : 'Tetapkan guru pengampu untuk mata pelajaran dan rombongan belajar'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 1. Guru Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Guru Pengampu <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  required
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers
                    .filter((t) => t.isActive !== false)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (NIP. {t.nip}) - {t.specialization || 'Guru'}
                      </option>
                    ))}
                </select>
              </div>

              {/* 2. Mata Pelajaran Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  required
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects
                    .filter((s) => (s.type || 'subject') === 'subject' && s.isActive !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.category || 'Umum'}] {s.name} ({s.code}) {s.nameArab ? ` - ${s.nameArab}` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* 3. Kelas / Rombel Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kelas / Rombongan Belajar <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  required
                >
                  <option value="">-- Pilih Kelas --</option>
                  {classes
                    .filter((c) => c.isActive !== false)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} (Tingkat {c.gradeLevel})
                      </option>
                    ))}
                </select>
              </div>

              {/* 4. Tahun Ajaran & 5. Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Ajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.academicYearId}
                    onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                    required
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.isActive ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Semester <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                    required
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
              </div>

              {/* 6. Status & 7. Beban Jam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Penugasan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                    required
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Beban Jam (Jam/Minggu)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={formData.totalHoursPerWeek}
                    onChange={(e) =>
                      setFormData({ ...formData, totalHoursPerWeek: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingAssignment
                    ? 'Simpan Perubahan'
                    : 'Simpan Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Penugasan */}
      {deletingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 text-center">
              Konfirmasi Hapus Penugasan Guru
            </h3>

            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus penugasan mengajar untuk:
            </p>

            <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>
                <strong>Guru:</strong> {teachers.find((t) => t.id === deletingAssignment.teacherId)?.name}
              </div>
              <div>
                <strong>Mata Pelajaran:</strong>{' '}
                {subjects.find((s) => s.id === deletingAssignment.subjectId)?.name}
              </div>
              <div>
                <strong>Kelas:</strong> {classes.find((c) => c.id === deletingAssignment.classId)?.name}
              </div>
              <div>
                <strong>Periode:</strong>{' '}
                {academicYears.find((ay) => ay.id === deletingAssignment.academicYearId)?.name} (
                {deletingAssignment.semester})
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-tight">
              <strong>Catatan Aman:</strong> Tindakan ini hanya menghapus data penugasan mengajar ini. Data guru, data siswa, data kelas, mata pelajaran, serta nilai siswa yang sudah ada <u>tidak akan terhapus</u>.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingAssignment(null)}
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
