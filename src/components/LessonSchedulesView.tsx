import React, { useState, useMemo } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import {
  CurriculumGroup,
  CURRICULUM_GROUPS,
  ScheduleDay,
  SCHEDULE_DAYS,
  LessonSchedule,
  canManageLessonSchedule,
  UserRole,
} from '../types';
import { getEffectiveTeacherId, resolveClassGradeNumber } from '../lib/dbService';
import {
  Clock,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Printer,
  Calendar,
  BookOpen,
  UserCheck,
  UserX,
  X,
  Layers,
  Sparkles,
  Info,
  CalendarDays,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface LessonSchedulesViewProps {
  userRole?: UserRole;
}

// Convert "HH:mm" to total minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

// Format duration into readable Indonesian string, e.g. "90 menit (1.5 jam)"
function formatDuration(startTime: string, endTime: string): string {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const diff = end - start;
  if (diff <= 0) return '-';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${diff} mnt (${hours}j ${mins}m)`;
  if (hours > 0) return `${diff} mnt (${hours} jam)`;
  return `${diff} menit`;
}

// Check time overlap: two intervals overlap iff startA < endB && startB < endA
function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

const DAY_ORDER: Record<ScheduleDay, number> = {
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
};

export const LessonSchedulesView: React.FC<LessonSchedulesViewProps> = ({ userRole }) => {
  const { currentUser, role } = useAuth();
  const effectiveRole = userRole || role;
  const canManage = canManageLessonSchedule(effectiveRole);

  const {
    lessonSchedules,
    saveLessonSchedule,
    deleteLessonSchedule,
    teachers,
    subjects,
    classes,
    teacherAssignments,
    activeAcademicYear,
    schoolIdentity,
    loading,
    refreshAll,
  } = useMasterData();

  // Selected curriculum group: 'PAKET_B' or 'PAKET_C'
  const [selectedGroup, setSelectedGroup] = useState<CurriculumGroup>('PAKET_B');

  // Filter states
  const [filterDay, setFilterDay] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTeacherId, setFilterTeacherId] = useState<string>('ALL');
  const [onlyMySchedule, setOnlyMySchedule] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<LessonSchedule | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<LessonSchedule | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Form input state
  const [formGroup, setFormGroup] = useState<CurriculumGroup>('PAKET_B');
  const [formDay, setFormDay] = useState<ScheduleDay>('Senin');
  const [formStartTime, setFormStartTime] = useState<string>('07:30');
  const [formEndTime, setFormEndTime] = useState<string>('09:00');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Identify current logged-in teacher (if user is a teacher)
  const currentTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, effectiveRole, teachers);
  }, [currentUser, effectiveRole, teachers]);

  const normalizedRole = String(effectiveRole || '').trim().toUpperCase();
  const isTeacherUser =
    normalizedRole === 'GURU_MAPEL' ||
    normalizedRole === 'WALI_KELAS';

  // Helper map of active classes belonging to each group
  const groupClassIds = useMemo(() => {
    const paketBIds: string[] = [];
    const paketCIds: string[] = [];
    classes.forEach((c) => {
      const g = resolveClassGradeNumber(c);
      if (g >= 10) {
        paketCIds.push(c.id);
      } else {
        paketBIds.push(c.id);
      }
    });
    return {
      PAKET_B: paketBIds,
      PAKET_C: paketCIds,
    };
  }, [classes]);

  // Check if a teacher has valid assignment for a subject in the specified group
  const checkTeacherAssignmentStatus = useMemo(() => {
    return (teacherId: string, subjectId: string, group: CurriculumGroup) => {
      if (!teacherId || !subjectId) return { isAssigned: false, matchingCount: 0 };
      const validClassIds = groupClassIds[group] || [];
      const matches = teacherAssignments.filter((a) => {
        const matchesTeacher = a.teacherId === teacherId;
        const matchesSubject = a.subjectId === subjectId;
        const matchesClass = validClassIds.includes(a.classId);
        const matchesYear =
          !activeAcademicYear || !a.academicYearId || a.academicYearId === activeAcademicYear.id;
        const isActive = (a as any).status !== 'Nonaktif';
        return matchesTeacher && matchesSubject && matchesClass && matchesYear && isActive;
      });
      return {
        isAssigned: matches.length > 0,
        matchingCount: matches.length,
      };
    };
  }, [teacherAssignments, groupClassIds, activeAcademicYear]);

  // Active teachers and subjects
  const activeTeachers = useMemo(() => {
    return teachers
      .filter((t) => t.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers]);

  const activeSubjects = useMemo(() => {
    return subjects
      .filter((s) => s.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects]);

  // Schedules filtered by selected curriculum group
  const groupSchedules = useMemo(() => {
    return lessonSchedules.filter((s) => s.curriculumGroup === selectedGroup);
  }, [lessonSchedules, selectedGroup]);

  // Filtered schedules for view
  const displaySchedules = useMemo(() => {
    let list = [...groupSchedules];

    // Day filter
    if (filterDay !== 'ALL') {
      list = list.filter((s) => s.day === filterDay);
    }

    // Only my schedule (for teachers)
    if (onlyMySchedule && currentTeacherId) {
      list = list.filter((s) => s.teacherId === currentTeacherId);
    }

    // Filter teacher
    if (filterTeacherId !== 'ALL') {
      list = list.filter((s) => s.teacherId === filterTeacherId);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const subject = subjects.find((sub) => sub.id === s.subjectId);
        const teacher = teachers.find((t) => t.id === s.teacherId);
        const subName = (subject?.name || s.subjectName || '').toLowerCase();
        const subCode = (subject?.code || s.subjectCode || '').toLowerCase();
        const tName = (teacher?.name || s.teacherName || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        const day = s.day.toLowerCase();
        return (
          subName.includes(q) ||
          subCode.includes(q) ||
          tName.includes(q) ||
          notes.includes(q) ||
          day.includes(q)
        );
      });
    }

    // Sort by day order, then by startTime ascending
    return list.sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.day] || 0) - (DAY_ORDER[b.day] || 0);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [
    groupSchedules,
    filterDay,
    onlyMySchedule,
    currentTeacherId,
    filterTeacherId,
    searchQuery,
    subjects,
    teachers,
  ]);

  // Group schedules by day for the Grid view
  const schedulesByDay = useMemo(() => {
    const map: Record<ScheduleDay, LessonSchedule[]> = {
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    };
    displaySchedules.forEach((s) => {
      if (map[s.day]) {
        map[s.day].push(s);
      }
    });
    return map;
  }, [displaySchedules]);

  // Real-time conflict validation for form
  const formConflictCheck = useMemo(() => {
    if (!formDay || !formStartTime || !formEndTime) {
      return { hardConflict: null, teacherConflict: null };
    }

    // 1. Hard conflict: another schedule in the SAME curriculum group on the SAME day with overlapping time
    const hardConflict = lessonSchedules.find((s) => {
      if (editingSchedule && s.id === editingSchedule.id) return false;
      if (s.curriculumGroup !== formGroup) return false;
      if (s.day !== formDay) return false;
      return isTimeOverlapping(formStartTime, formEndTime, s.startTime, s.endTime);
    });

    // 2. Teacher conflict: the same teacher scheduled at overlapping time on the same day
    let teacherConflict = null;
    if (formTeacherId) {
      teacherConflict = lessonSchedules.find((s) => {
        if (editingSchedule && s.id === editingSchedule.id) return false;
        if (hardConflict && s.id === hardConflict.id) return false;
        if (s.day !== formDay) return false;
        if (s.teacherId !== formTeacherId) return false;
        return isTimeOverlapping(formStartTime, formEndTime, s.startTime, s.endTime);
      });
    }

    return { hardConflict, teacherConflict };
  }, [
    formGroup,
    formDay,
    formStartTime,
    formEndTime,
    formTeacherId,
    editingSchedule,
    lessonSchedules,
  ]);

  // Open Form modal for adding
  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormGroup(selectedGroup);
    setFormDay('Senin');
    setFormStartTime('07:30');
    setFormEndTime('09:00');
    setFormSubjectId(activeSubjects[0]?.id || '');
    setFormTeacherId(activeTeachers[0]?.id || '');
    setFormNotes('');
    setFormError(null);
    setFormWarning(null);
    setIsFormOpen(true);
  };

  // Open Form modal for editing
  const handleOpenEditModal = (sched: LessonSchedule) => {
    setEditingSchedule(sched);
    setFormGroup(sched.curriculumGroup);
    setFormDay(sched.day);
    setFormStartTime(sched.startTime);
    setFormEndTime(sched.endTime);
    setFormSubjectId(sched.subjectId);
    setFormTeacherId(sched.teacherId);
    setFormNotes(sched.notes || '');
    setFormError(null);
    setFormWarning(null);
    setIsFormOpen(true);
  };

  // Save form handler
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormWarning(null);

    // Basic validation
    if (!formDay) {
      setFormError('Silakan pilih hari belajar.');
      return;
    }
    if (!formStartTime || !formEndTime) {
      setFormError('Jam mulai dan jam selesai wajib diisi.');
      return;
    }
    if (timeToMinutes(formEndTime) <= timeToMinutes(formStartTime)) {
      setFormError('Jam selesai harus lebih akhir daripada jam mulai.');
      return;
    }
    if (!formSubjectId) {
      setFormError('Silakan pilih mata pelajaran.');
      return;
    }
    if (!formTeacherId) {
      setFormError('Silakan pilih guru pengampu.');
      return;
    }

    // Check hard conflict (same group, same day, overlapping time)
    if (formConflictCheck.hardConflict) {
      const conflictSub = subjects.find(
        (s) => s.id === formConflictCheck.hardConflict?.subjectId
      );
      const conflictSubName =
        conflictSub?.name || formConflictCheck.hardConflict.subjectName || 'Mata Pelajaran';
      setFormError(
        `Bentrok Waktu: Jadwal tidak dapat disimpan karena bertabrakan dengan jadwal ${conflictSubName} (${formConflictCheck.hardConflict.startTime} – ${formConflictCheck.hardConflict.endTime}) pada hari ${formDay} untuk ${CURRICULUM_GROUPS[formGroup].name}.`
      );
      return;
    }

    // Resolve subject and teacher metadata for caching
    const subObj = subjects.find((s) => s.id === formSubjectId);
    const teacherObj = teachers.find((t) => t.id === formTeacherId);

    const scheduleData: LessonSchedule = {
      id: editingSchedule ? editingSchedule.id : '',
      curriculumGroup: formGroup,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      subjectId: formSubjectId,
      subjectName: subObj?.name || '',
      subjectCode: subObj?.code || '',
      teacherId: formTeacherId,
      teacherName: teacherObj?.name || '',
      academicYearId: activeAcademicYear?.id || '',
      semester: (activeAcademicYear?.semester as any) || 'Ganjil',
      notes: formNotes.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.uid || currentUser?.id || 'admin',
      updatedByName: currentUser?.displayName || currentUser?.name || 'Administrator',
      updatedByRole: effectiveRole || 'ADMIN',
      createdAt: editingSchedule ? editingSchedule.createdAt : new Date().toISOString(),
      createdBy: editingSchedule
        ? editingSchedule.createdBy
        : currentUser?.uid || currentUser?.id || 'admin',
      createdByName: editingSchedule
        ? editingSchedule.createdByName
        : currentUser?.displayName || currentUser?.name || 'Administrator',
      createdByRole: editingSchedule ? editingSchedule.createdByRole : effectiveRole || 'ADMIN',
    };

    setIsSubmitting(true);
    try {
      await saveLessonSchedule(scheduleData);
      setIsFormOpen(false);
      setEditingSchedule(null);
      setSuccessToast(
        editingSchedule
          ? 'Jadwal pelajaran berhasil diperbarui!'
          : 'Jadwal pelajaran baru berhasil disimpan secara permanen.'
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error saving lesson schedule:', err);
      setFormError(err?.message || 'Gagal menyimpan jadwal ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete confirmation modal
  const handleOpenDeleteModal = (sched: LessonSchedule) => {
    setScheduleToDelete(sched);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    setDeleteError(null);
    setIsSubmitting(true);
    try {
      await deleteLessonSchedule(scheduleToDelete.id);
      setIsDeleteModalOpen(false);
      setScheduleToDelete(null);
      setSuccessToast('Jadwal pelajaran berhasil dihapus dari database.');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      const errMsg = err?.message || 'Gagal menghapus jadwal. Silakan coba kembali.';
      setDeleteError(errMsg);
      setErrorToast(errMsg);
      setTimeout(() => setErrorToast(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
          <button
            onClick={() => setSuccessToast(null)}
            className="ml-2 hover:opacity-80 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-rose-600 text-white px-5 py-3.5 rounded-xl shadow-xl animate-fade-in text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorToast}</span>
          <button
            onClick={() => setErrorToast(null)}
            className="ml-2 hover:opacity-80 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                  Jadwal Pelajaran
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  {schoolIdentity.schoolName} — Tahun Ajaran{' '}
                  <span className="font-semibold text-slate-700">
                    {activeAcademicYear?.name || '2026/2027'} ({activeAcademicYear?.semester || 'Ganjil'})
                  </span>
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl pt-1">
              Pengelolaan jadwal belajar mingguan (Senin – Sabtu) berbasis kelompok kurikulum.{' '}
              <span className="font-medium text-emerald-700">
                Satu jadwal berlaku serentak untuk seluruh jenjang dalam kelompok
              </span>{' '}
              tanpa duplikasi entri.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Cetak Jadwal Mingguan"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Jadwal</span>
            </button>

            <button
              onClick={() => refreshAll()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
              title="Muat Ulang Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {canManage && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal</span>
              </button>
            )}
          </div>
        </div>

        {/* Curriculum Group Selector (Paket B vs Paket C) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pilih Kelompok Kurikulum:
            </div>
            <div className="text-xs text-slate-500">
              Total jadwal tersimpan:{' '}
              <span className="font-semibold text-slate-800">{lessonSchedules.length} entri</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2.5">
            {/* Paket B Button Card */}
            <button
              onClick={() => setSelectedGroup('PAKET_B')}
              className={`text-left p-4 rounded-xl border-2 transition-all relative ${
                selectedGroup === 'PAKET_B'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selectedGroup === 'PAKET_B'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Paket B
                    </span>
                    <span className="font-bold text-slate-800 text-sm sm:text-base">
                      Kelas 7, 8, dan 9
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Kelompok Kurikulum Setara SMP/MTs (Jenjang Wustha / Menengah Pertama)
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    ✓ Jadwal yang sama berlaku serentak untuk Kelas 7, 8, dan 9
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100/80 text-emerald-800">
                    {lessonSchedules.filter((s) => s.curriculumGroup === 'PAKET_B').length} Jadwal
                  </span>
                </div>
              </div>
            </button>

            {/* Paket C Button Card */}
            <button
              onClick={() => setSelectedGroup('PAKET_C')}
              className={`text-left p-4 rounded-xl border-2 transition-all relative ${
                selectedGroup === 'PAKET_C'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selectedGroup === 'PAKET_C'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Paket C
                    </span>
                    <span className="font-bold text-slate-800 text-sm sm:text-base">
                      Kelas 10, 11, dan 12
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Kelompok Kurikulum Setara SMA/MA (Jenjang Ulya / Menengah Atas)
                  </p>
                  <p className="text-[11px] text-indigo-800 font-medium">
                    ✓ Jadwal yang sama berlaku serentak untuk Kelas 10, 11, dan 12
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100/80 text-indigo-800">
                    {lessonSchedules.filter((s) => s.curriculumGroup === 'PAKET_C').length} Jadwal
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Day Pills / Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs sm:text-sm font-medium">
          <span className="text-slate-400 font-semibold px-2 py-1 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" /> Hari:
          </span>
          <button
            onClick={() => setFilterDay('ALL')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filterDay === 'ALL'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Hari (Senin – Sabtu)
          </button>
          {SCHEDULE_DAYS.map((day) => {
            const count = groupSchedules.filter((s) => s.day === day).length;
            return (
              <button
                key={day}
                onClick={() => setFilterDay(day)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filterDay === day
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{day}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterDay === day
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filters & View Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mapel, guru, keterangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Filter by Teacher */}
            <select
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-700"
            >
              <option value="ALL">Semua Guru Pengampu</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Teacher toggle: "Jadwal Saya" */}
            {isTeacherUser && currentTeacherId && (
              <button
                type="button"
                onClick={() => setOnlyMySchedule((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl border transition-colors ${
                  onlyMySchedule
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Jadwal Mengajar Saya</span>
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Tabel
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Kartu Per Hari
            </button>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {displaySchedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700">Belum Ada Jadwal Pelajaran</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery || filterDay !== 'ALL' || filterTeacherId !== 'ALL' || onlyMySchedule
              ? 'Tidak ditemukan jadwal yang cocok dengan kriteria filter saat ini.'
              : `Belum ada jadwal yang dimasukkan untuk ${CURRICULUM_GROUPS[selectedGroup].name}.`}
          </p>
          {canManage && !searchQuery && filterDay === 'ALL' && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Sekarang</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3.5 px-4 w-28">Hari</th>
                  <th className="py-3.5 px-4 w-36">Waktu Belajar</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Mata Pelajaran</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Guru Pengampu</th>
                  <th className="py-3.5 px-4 w-44 hidden md:table-cell">Kesesuaian Penugasan</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Keterangan</th>
                  {canManage && <th className="py-3.5 px-4 w-24 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySchedules.map((sched) => {
                  const subObj = subjects.find((s) => s.id === sched.subjectId);
                  const teacherObj = teachers.find((t) => t.id === sched.teacherId);
                  const assignmentCheck = checkTeacherAssignmentStatus(
                    sched.teacherId,
                    sched.subjectId,
                    sched.curriculumGroup
                  );

                  return (
                    <tr
                      key={sched.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Day */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 align-top">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {sched.day}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 tracking-tight flex items-center gap-1">
                            <span>{sched.startTime}</span>
                            <span className="text-slate-400">–</span>
                            <span>{sched.endTime}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatDuration(sched.startTime, sched.endTime)}
                          </div>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-2">
                            <span>{subObj?.name || sched.subjectName || '-'}</span>
                            {subObj?.nameArab && (
                              <span
                                className="text-xs text-emerald-800 font-serif"
                                dir="rtl"
                              >
                                {subObj.nameArab}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            {subObj?.code && (
                              <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                                {subObj.code}
                              </span>
                            )}
                            {subObj?.category && (
                              <span className="text-slate-400">{subObj.category}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-800">
                            {teacherObj?.name || sched.teacherName || '-'}
                          </div>
                          {teacherObj?.specialization && (
                            <div className="text-[11px] text-slate-500">
                              {teacherObj.specialization}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assignment Status */}
                      <td className="py-3.5 px-4 align-top hidden md:table-cell">
                        {assignmentCheck.isAssigned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terdaftar Penugasan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60" title="Guru belum didaftarkan di Penugasan Guru untuk mapel ini di kelas kelompok ini">
                            <Info className="w-3 h-3 text-amber-600" />
                            <span>Penugasan Umum</span>
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-slate-600 align-top">
                        {sched.notes ? (
                          <span className="text-xs text-slate-600 italic">
                            {sched.notes}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(sched)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit Jadwal"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteModal(sched)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW (PER HARI) — Sangat ramah ponsel */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SCHEDULE_DAYS.filter((day) => filterDay === 'ALL' || filterDay === day).map(
            (day) => {
              const dayItems = schedulesByDay[day] || [];
              return (
                <div
                  key={day}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{day}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        {dayItems.length} Mapel
                      </span>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => {
                          setEditingSchedule(null);
                          setFormGroup(selectedGroup);
                          setFormDay(day);
                          setFormStartTime('07:30');
                          setFormEndTime('09:00');
                          setFormSubjectId(activeSubjects[0]?.id || '');
                          setFormTeacherId(activeTeachers[0]?.id || '');
                          setFormNotes('');
                          setFormError(null);
                          setFormWarning(null);
                          setIsFormOpen(true);
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah
                      </button>
                    )}
                  </div>

                  <div className="p-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px]">
                    {dayItems.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Tidak ada pelajaran pada hari {day}
                      </div>
                    ) : (
                      dayItems.map((sched) => {
                        const subObj = subjects.find((s) => s.id === sched.subjectId);
                        const teacherObj = teachers.find((t) => t.id === sched.teacherId);
                        return (
                          <div
                            key={sched.id}
                            className="py-3 first:pt-1 last:pb-1 group hover:bg-slate-50/60 rounded-xl px-2 -mx-2 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                                  <Clock className="w-3 h-3 text-emerald-600" />
                                  <span>
                                    {sched.startTime} – {sched.endTime}
                                  </span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm leading-snug">
                                  {subObj?.name || sched.subjectName || '-'}
                                </h4>
                                <p className="text-xs text-slate-600 font-medium">
                                  Ustadz/Ustadzah: {teacherObj?.name || sched.teacherName || '-'}
                                </p>
                                {sched.notes && (
                                  <p className="text-[11px] text-slate-500 italic">
                                    Catatan: {sched.notes}
                                  </p>
                                )}
                              </div>

                              {canManage && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => handleOpenEditModal(sched)}
                                    className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteModal(sched)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* FORM MODAL: TAMBAH / EDIT JADWAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                    {editingSchedule ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {CURRICULUM_GROUPS[formGroup].name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-4">
              {/* Error Alert */}
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Validasi Jadwal:</span>
                    <span>{formError}</span>
                  </div>
                </div>
              )}

              {/* Conflict Real-time Alert */}
              {formConflictCheck.hardConflict && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Peringatan Bentrok Waktu (Wajib Diperbaiki):</span>
                    <span>
                      Bertabrakan dengan pelajaran{' '}
                      <strong>
                        {subjects.find((s) => s.id === formConflictCheck.hardConflict?.subjectId)?.name ||
                          formConflictCheck.hardConflict.subjectName}
                      </strong>{' '}
                      ({formConflictCheck.hardConflict.startTime} – {formConflictCheck.hardConflict.endTime}) pada hari{' '}
                      {formDay} untuk {CURRICULUM_GROUPS[formGroup].name}.
                    </span>
                  </div>
                </div>
              )}

              {/* Teacher Conflict Alert */}
              {formConflictCheck.teacherConflict && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Peringatan Bentrok Jadwal Guru:</span>
                    <span>
                      Guru ini sudah terjadwal mengajar pada waktu tersebut (
                      {formConflictCheck.teacherConflict.startTime} – {formConflictCheck.teacherConflict.endTime}) di{' '}
                      {CURRICULUM_GROUPS[formConflictCheck.teacherConflict.curriculumGroup]?.name} pada hari {formDay}.
                    </span>
                  </div>
                </div>
              )}

              {/* Curriculum Group */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelompok Kurikulum <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormGroup('PAKET_B')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      formGroup === 'PAKET_B'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Paket B (Kelas 7, 8, 9)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormGroup('PAKET_C')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      formGroup === 'PAKET_C'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Paket C (Kelas 10, 11, 12)
                  </button>
                </div>
              </div>

              {/* Day selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hari Belajar <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {SCHEDULE_DAYS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setFormDay(d)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border text-center transition-colors ${
                        formDay === d
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time: Start & End */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Selesai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Time Presets */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Pilihan Jam Cepat:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ['07:30', '09:00'],
                    ['09:00', '10:30'],
                    ['10:45', '12:00'],
                    ['13:00', '14:30'],
                    ['14:30', '16:00'],
                  ].map(([start, end]) => (
                    <button
                      key={`${start}-${end}`}
                      type="button"
                      onClick={() => {
                        setFormStartTime(start);
                        setFormEndTime(end);
                      }}
                      className="px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono"
                    >
                      {start} – {end}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {activeSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `[${s.code}] ` : ''}
                      {s.name}
                      {s.category ? ` (${s.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guru Pengampu <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">-- Pilih Guru Pengampu --</option>
                  {activeTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.specialization ? ` (${t.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Assignment Verification Feedback */}
              {formTeacherId && formSubjectId && (
                <div className="p-3 rounded-xl text-xs bg-slate-50 border border-slate-200/80">
                  {checkTeacherAssignmentStatus(formTeacherId, formSubjectId, formGroup).isAssigned ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Sesuai Penugasan Guru: Guru ini terdaftar mengampu mata pelajaran ini di kelompok kurikulum{' '}
                        {formGroup === 'PAKET_B' ? 'Paket B' : 'Paket C'}.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 font-medium">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>
                        Pemberitahuan: Guru ini belum tercatat pada modul Penugasan Guru untuk mapel ini di{' '}
                        {formGroup === 'PAKET_B' ? 'Paket B' : 'Paket C'}. Anda tetap dapat menyimpan jadwal ini jika ini penugasan khusus.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Teori di Lab Komputer, Praktik Lapangan, dll."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!formConflictCheck.hardConflict}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingSchedule ? 'Simpan Perubahan' : 'Simpan Jadwal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  Konfirmasi Hapus Jadwal
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini permanen dan tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl text-xs sm:text-sm text-slate-700 space-y-1.5 border border-slate-200/60">
              <div className="flex justify-between">
                <span className="text-slate-400">Kelompok:</span>
                <span className="font-semibold text-slate-800">
                  {CURRICULUM_GROUPS[scheduleToDelete.curriculumGroup]?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hari & Jam:</span>
                <span className="font-semibold text-slate-800">
                  {scheduleToDelete.day}, {scheduleToDelete.startTime} – {scheduleToDelete.endTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-semibold text-slate-800">
                  {subjects.find((s) => s.id === scheduleToDelete.subjectId)?.name ||
                    scheduleToDelete.subjectName ||
                    '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Guru Pengampu:</span>
                <span className="font-semibold text-slate-800">
                  {teachers.find((t) => t.id === scheduleToDelete.teacherId)?.name ||
                    scheduleToDelete.teacherName ||
                    '-'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Catatan: Hanya entri jadwal ini yang dihapus. Data mata pelajaran dan data guru pengampu
              tetap aman.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setScheduleToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Ya, Hapus Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW / MODAL CETAK JADWAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 print:border-none print:shadow-none print:p-0">
            {/* Action Bar (hidden when printing) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                <span className="font-bold text-slate-800 text-base">
                  Pratinjau Cetak Jadwal Mingguan
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl print:border-none print:p-0">
              {/* Official School Header */}
              <div className="text-center pb-4 mb-4 border-b-2 border-slate-800 space-y-1">
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                  {schoolIdentity.schoolName}
                </h2>
                <h3 className="text-sm font-semibold text-slate-700 uppercase">
                  JADWAL PELAJARAN MINGGUAN — {CURRICULUM_GROUPS[selectedGroup].name}
                </h3>
                <p className="text-xs text-slate-500">
                  Tahun Ajaran {activeAcademicYear?.name || '2026/2027'} (Semester{' '}
                  {activeAcademicYear?.semester || 'Ganjil'}) • Berlaku Serentak untuk{' '}
                  {CURRICULUM_GROUPS[selectedGroup].gradeLabels}
                </p>
                <p className="text-[11px] text-slate-400">
                  Alamat: {schoolIdentity.address || 'Pekon Tulung Bambu, Pesisir Barat, Lampung'}
                </p>
              </div>

              {/* Weekly Printable Table */}
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                    <th className="p-2 border border-slate-300 w-24">Hari</th>
                    <th className="p-2 border border-slate-300 w-32">Waktu</th>
                    <th className="p-2 border border-slate-300">Mata Pelajaran</th>
                    <th className="p-2 border border-slate-300">Guru Pengampu</th>
                    <th className="p-2 border border-slate-300">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {groupSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                        Belum ada jadwal yang dimasukkan untuk kelompok kurikulum ini.
                      </td>
                    </tr>
                  ) : (
                    groupSchedules
                      .sort((a, b) => {
                        const diff = (DAY_ORDER[a.day] || 0) - (DAY_ORDER[b.day] || 0);
                        if (diff !== 0) return diff;
                        return a.startTime.localeCompare(b.startTime);
                      })
                      .map((sched, idx) => {
                        const subObj = subjects.find((s) => s.id === sched.subjectId);
                        const teacherObj = teachers.find((t) => t.id === sched.teacherId);
                        return (
                          <tr key={sched.id || idx} className="hover:bg-slate-50/50">
                            <td className="p-2 border border-slate-300 font-semibold">
                              {sched.day}
                            </td>
                            <td className="p-2 border border-slate-300 font-mono">
                              {sched.startTime} – {sched.endTime}
                            </td>
                            <td className="p-2 border border-slate-300 font-medium">
                              {subObj?.name || sched.subjectName || '-'}
                            </td>
                            <td className="p-2 border border-slate-300">
                              {teacherObj?.name || sched.teacherName || '-'}
                            </td>
                            <td className="p-2 border border-slate-300 text-slate-500">
                              {sched.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>

              {/* Official Signatures */}
              <div className="mt-8 pt-4 grid grid-cols-2 text-center text-xs text-slate-800">
                <div className="space-y-12">
                  <div>Mengetahui,</div>
                  <div>
                    <div className="font-bold underline">
                      {teachers.find((t) => t.status === 'Yayasan')?.name || 'Mudir Ma\'had'}
                    </div>
                    <div className="text-[11px] text-slate-500">Mudir / Pimpinan Pesantren</div>
                  </div>
                </div>
                <div className="space-y-12">
                  <div>Pesisir Barat, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
                  <div>
                    <div className="font-bold underline">
                      {currentUser?.displayName || currentUser?.name || 'Bagian Kurikulum'}
                    </div>
                    <div className="text-[11px] text-slate-500">Kepala Bagian Akademik</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
