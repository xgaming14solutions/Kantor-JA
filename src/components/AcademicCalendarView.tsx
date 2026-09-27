import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
  AcademicCalendarEvent,
  AcademicCalendarCategory,
  AcademicCalendarStatus,
  ACADEMIC_CALENDAR_CATEGORIES,
  canManageAcademicCalendar,
  UserRole,
} from '../types';
import { getEffectiveTeacherId, getActiveTeacherAssignments } from '../lib/dbService';
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  UserCheck,
  Users,
  FileText,
  Filter,
  RotateCcw,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ListFilter,
  LayoutGrid,
  List,
  Pin,
  Info,
  DoorOpen,
} from 'lucide-react';

interface AcademicCalendarViewProps {
  userRole?: UserRole;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES_SHORT_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Category visual color mapping (clean dot + subtle badge style)
export function getCategoryStyle(category: string): {
  dot: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case 'Tahun Ajaran':
    case 'Awal Semester':
    case 'Akhir Semester':
      return {
        dot: 'bg-indigo-600',
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
      };
    case 'Kegiatan Pembelajaran':
    case 'Kegiatan Sekolah':
      return {
        dot: 'bg-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
    case 'Asesmen / Ujian':
    case 'Sumatif Tengah Semester':
    case 'Sumatif Akhir Semester':
      return {
        dot: 'bg-amber-600',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
      };
    case 'Libur':
      return {
        dot: 'bg-rose-600',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      };
    case 'Rapat Guru':
    case 'RAKER':
      return {
        dot: 'bg-purple-600',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
      };
    case 'Kegiatan Pesantren':
    case 'Kegiatan Tahfiz':
      return {
        dot: 'bg-emerald-600',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
      };
    case 'Penerimaan Santri Baru':
    case 'Kegiatan Orang Tua/Wali':
      return {
        dot: 'bg-teal-600',
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
      };
    case 'Pembagian Raport':
      return {
        dot: 'bg-cyan-600',
        bg: 'bg-cyan-50',
        text: 'text-cyan-800',
        border: 'border-cyan-200',
      };
    default:
      return {
        dot: 'bg-slate-600',
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
      };
  }
}

/**
 * Compute effective status and whether an agenda is happening TODAY
 */
export function resolveEventEffectiveStatus(
  event: AcademicCalendarEvent,
  todayIso: string
): {
  effectiveStatus: AcademicCalendarStatus;
  isToday: boolean;
  daysUntil: number;
} {
  const start = event.startDate || todayIso;
  const end = event.endDate && event.endDate >= start ? event.endDate : start;
  const isToday = todayIso >= start && todayIso <= end;

  // Calculate days difference from today to startDate
  const parseDateMs = (dStr: string) => {
    const parts = dStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return Date.now();
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  };

  const todayMs = parseDateMs(todayIso);
  const startMs = parseDateMs(start);
  const daysUntil = Math.round((startMs - todayMs) / (1000 * 60 * 60 * 24));

  if (event.status === 'Dibatalkan') {
    return { effectiveStatus: 'Dibatalkan', isToday: false, daysUntil };
  }
  if (event.status === 'Selesai') {
    return { effectiveStatus: 'Selesai', isToday, daysUntil };
  }
  if (isToday) {
    return { effectiveStatus: 'Berlangsung', isToday: true, daysUntil: 0 };
  }
  if (end < todayIso) {
    return { effectiveStatus: 'Selesai', isToday: false, daysUntil };
  }
  return {
    effectiveStatus: event.status === 'Berlangsung' ? 'Berlangsung' : 'Terjadwal',
    isToday: false,
    daysUntil,
  };
}

/**
 * Format single date or date range in Indonesian
 */
export function formatEventDateRange(startDate: string, endDate?: string): string {
  if (!startDate) return '-';
  const effectiveEnd = endDate && endDate >= startDate ? endDate : startDate;

  const parseLocal = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const dStart = parseLocal(startDate);
  const dEnd = parseLocal(effectiveEnd);
  if (!dStart) return startDate;

  const fmtFull = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (startDate === effectiveEnd || !dEnd) {
    return fmtFull.format(dStart);
  }

  const sameMonth =
    dStart.getFullYear() === dEnd.getFullYear() && dStart.getMonth() === dEnd.getMonth();
  const dayStartName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dStart);
  const dayEndName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dEnd);

  if (sameMonth) {
    const monthYear = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(dEnd);
    return `${dayStartName}–${dayEndName}, ${dStart.getDate()}–${dEnd.getDate()} ${monthYear}`;
  }

  const fmtShort = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${fmtShort.format(dStart)} – ${fmtShort.format(dEnd)}`;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({ userRole }) => {
  const { currentUser, role: authRole, loading: authLoading } = useAuth();
  const effectiveRole = (userRole || authRole || currentUser?.role || 'ADMIN') as UserRole;

  const {
    academicYears = [],
    activeAcademicYear,
    classes = [],
    teachers = [],
    teacherAssignments = [],
    academicCalendarEvents = [],
    saveAcademicCalendarEvent,
    deleteAcademicCalendarEvent,
    loading,
  } = useMasterData();

  const canManage = canManageAcademicCalendar(effectiveRole);

  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // View mode: 'MONTHLY' (default) or 'LIST'
  const [viewMode, setViewMode] = useState<'MONTHLY' | 'LIST'>('MONTHLY');

  // Current displayed calendar month & year
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Selected date in monthly grid (defaults to todayIso)
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);

  // Filters (Requirement 6 & 9)
  const [filterAcademicYearId, setFilterAcademicYearId] = useState<string>(
    activeAcademicYear?.id || 'ALL'
  );
  const [filterSemester, setFilterSemester] = useState<string>(
    activeAcademicYear?.semester || 'ALL'
  );
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Automatically sync with activeAcademicYear when administrator switches active academic year
  const lastSyncedActiveYearKey = useRef<string>('');
  useEffect(() => {
    if (activeAcademicYear) {
      const key = `${activeAcademicYear.id}_${activeAcademicYear.semester}`;
      if (lastSyncedActiveYearKey.current !== key) {
        setFilterAcademicYearId(activeAcademicYear.id);
        setFilterSemester(activeAcademicYear.semester);
        lastSyncedActiveYearKey.current = key;
      }
    }
  }, [activeAcademicYear]);

  // Role-specific class context for WALI_KELAS and GURU_MAPEL
  const effectiveTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, effectiveRole, teachers);
  }, [currentUser, effectiveRole, teachers]);

  const homeroomClass = useMemo(() => {
    if (effectiveRole !== 'WALI_KELAS') return null;
    return (
      classes.find(
        (c) =>
          c.isActive !== false &&
          (c.homeroomTeacherId === effectiveTeacherId || c.teacherId === effectiveTeacherId)
      ) || null
    );
  }, [effectiveRole, classes, effectiveTeacherId]);

  const taughtClassIds = useMemo(() => {
    if (effectiveRole !== 'GURU_MAPEL') return [];
    const activeAsg = getActiveTeacherAssignments(
      teacherAssignments,
      effectiveTeacherId,
      activeAcademicYear
    );
    return Array.from(new Set(activeAsg.map((a) => a.classId)));
  }, [effectiveRole, teacherAssignments, effectiveTeacherId, activeAcademicYear]);

  const activeClasses = useMemo(() => {
    return classes.filter((c) => c.isActive !== false);
  }, [classes]);

  // Notice & Error banners
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail Modal & Delete Confirmation Modal state
  const [detailEvent, setDetailEvent] = useState<AcademicCalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<AcademicCalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Add / Edit Form Modal state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<AcademicCalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const [formData, setFormData] = useState<{
    title: string;
    category: AcademicCalendarCategory | string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    academicYearId: string;
    semester: 'Ganjil' | 'Genap';
    targetScope: 'ALL' | 'SPECIFIC';
    classIds: string[];
    location: string;
    personInCharge: string;
    description: string;
    status: AcademicCalendarStatus;
  }>({
    title: '',
    category: 'Kegiatan Pembelajaran',
    startDate: todayIso,
    endDate: todayIso,
    startTime: '08:00',
    endTime: '10:00',
    academicYearId: activeAcademicYear?.id || academicYears[0]?.id || 'ay_2026_2027_1',
    semester: activeAcademicYear?.semester || 'Ganjil',
    targetScope: 'ALL',
    classIds: [],
    location: '',
    personInCharge: '',
    description: '',
    status: 'Terjadwal',
  });

  // Reset Filters handler (Requirement 9)
  const handleResetFilters = () => {
    setFilterAcademicYearId(activeAcademicYear?.id || 'ALL');
    setFilterSemester(activeAcademicYear?.semester || 'ALL');
    setFilterMonth('ALL');
    setFilterCategory('ALL');
    setFilterClassId('ALL');
    setFilterStatus('ALL');
  };

  // Resolve class labels for an event
  const getEventClassLabel = (ev: AcademicCalendarEvent): string => {
    if (!ev.classIds || ev.classIds.length === 0 || ev.classIds.includes('ALL')) {
      return 'Semua Kelas';
    }
    const names = ev.classIds
      .map((cid) => classes.find((c) => c.id === cid)?.name || cid)
      .filter(Boolean);
    return names.length > 0 ? `Kelas ${names.join(', ')}` : 'Semua Kelas';
  };

  // Filter events according to selected filters & role context
  const filteredEvents = useMemo(() => {
    return academicCalendarEvents.filter((ev) => {
      // 1. Academic Year Filter
      if (filterAcademicYearId !== 'ALL') {
        const selectedAy = academicYears.find((ay) => ay.id === filterAcademicYearId);
        const matchesYear =
          ev.academicYearId === filterAcademicYearId ||
          (selectedAy && ev.academicYearId === selectedAy.name);
        if (!matchesYear) return false;
      }

      // 2. Semester Filter
      if (filterSemester !== 'ALL') {
        if ((ev.semester || '').toLowerCase() !== filterSemester.toLowerCase()) {
          return false;
        }
      }

      // 3. Month Filter (1..12)
      if (filterMonth !== 'ALL') {
        const targetMonth = Number(filterMonth);
        const startM = Number((ev.startDate || '').split('-')[1]);
        const endM = Number((ev.endDate || ev.startDate || '').split('-')[1]);
        if (startM !== targetMonth && endM !== targetMonth) {
          return false;
        }
      }

      // 4. Category Filter
      if (filterCategory !== 'ALL' && ev.category !== filterCategory) {
        return false;
      }

      // 5. Class Filter
      if (filterClassId !== 'ALL') {
        const appliesToAll =
          !ev.classIds || ev.classIds.length === 0 || ev.classIds.includes('ALL');
        if (!appliesToAll && !ev.classIds.includes(filterClassId)) {
          return false;
        }
      }

      // 6. Status Filter (checks effectiveStatus)
      if (filterStatus !== 'ALL') {
        const { effectiveStatus } = resolveEventEffectiveStatus(ev, todayIso);
        if (effectiveStatus !== filterStatus && ev.status !== filterStatus) {
          return false;
        }
      }

      return true;
    });
  }, [
    academicCalendarEvents,
    academicYears,
    filterAcademicYearId,
    filterSemester,
    filterMonth,
    filterCategory,
    filterClassId,
    filterStatus,
    todayIso,
  ]);

  // Upcoming Agendas (AGENDA TERDEKAT - Requirement 8)
  // Sorted from closest to today (including ongoing today or future agendas in the selected academic year)
  const upcomingAgendas = useMemo(() => {
    const candidates = academicCalendarEvents.filter((ev) => {
      if (filterAcademicYearId !== 'ALL') {
        const selectedAy = academicYears.find((ay) => ay.id === filterAcademicYearId);
        const matchesYear =
          ev.academicYearId === filterAcademicYearId ||
          (selectedAy && ev.academicYearId === selectedAy.name);
        if (!matchesYear) return false;
      }
      const end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
      const { effectiveStatus } = resolveEventEffectiveStatus(ev, todayIso);
      if (effectiveStatus === 'Dibatalkan' || effectiveStatus === 'Selesai') return false;
      return end >= todayIso;
    });

    return candidates
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .slice(0, 8);
  }, [academicCalendarEvents, academicYears, filterAcademicYearId, todayIso]);

  // Build Monthly Calendar Grid cells (Monday-first)
  const monthlyGridDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); // 0..11

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{
      dateIso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: AcademicCalendarEvent[];
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const iso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter((ev) => {
        const end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
        return iso >= ev.startDate && iso <= end;
      });
      cells.push({
        dateIso: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        events: dayEvents,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter((ev) => {
        const end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
        return iso >= ev.startDate && iso <= end;
      });
      cells.push({
        dateIso: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        events: dayEvents,
      });
    }

    // Next month padding days to complete 35 or 42 cells
    const totalNeeded = cells.length <= 35 ? 35 : 42;
    const remaining = totalNeeded - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter((ev) => {
        const end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
        return iso >= ev.startDate && iso <= end;
      });
      cells.push({
        dateIso: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        events: dayEvents,
      });
    }

    return cells;
  }, [currentMonthDate, filteredEvents, todayIso]);

  // Agendas on the clicked/selected date in Monthly view
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateIso) return [];
    return filteredEvents.filter((ev) => {
      const end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
      return selectedDateIso >= ev.startDate && selectedDateIso <= end;
    });
  }, [filteredEvents, selectedDateIso]);

  // Open Add Agenda Modal
  const handleOpenAddModal = (prefillDate?: string) => {
    const start = prefillDate || selectedDateIso || todayIso;
    const defaultAyId =
      filterAcademicYearId !== 'ALL'
        ? filterAcademicYearId
        : activeAcademicYear?.id || academicYears[0]?.id || 'ay_2026_2027_1';
    const foundAy = academicYears.find((ay) => ay.id === defaultAyId);
    const defaultSem: 'Ganjil' | 'Genap' =
      filterSemester === 'Ganjil' || filterSemester === 'Genap'
        ? filterSemester
        : foundAy?.semester || activeAcademicYear?.semester || 'Ganjil';

    setEditingEvent(null);
    setFormData({
      title: '',
      category: 'Kegiatan Pembelajaran',
      startDate: start,
      endDate: start,
      startTime: '08:00',
      endTime: '10:00',
      academicYearId: defaultAyId,
      semester: defaultSem,
      targetScope: 'ALL',
      classIds: [],
      location: '',
      personInCharge: currentUser?.displayName || currentUser?.name || '',
      description: '',
      status: 'Terjadwal',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Edit Agenda Modal
  const handleOpenEditModal = (ev: AcademicCalendarEvent) => {
    const isSpecific =
      Array.isArray(ev.classIds) && ev.classIds.length > 0 && !ev.classIds.includes('ALL');
    setEditingEvent(ev);
    setFormData({
      title: ev.title,
      category: ev.category,
      startDate: ev.startDate,
      endDate: ev.endDate || ev.startDate,
      startTime: ev.startTime || '',
      endTime: ev.endTime || '',
      academicYearId: ev.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: ev.semester || activeAcademicYear?.semester || 'Ganjil',
      targetScope: isSpecific ? 'SPECIFIC' : 'ALL',
      classIds: isSpecific ? ev.classIds : [],
      location: ev.location || '',
      personInCharge: ev.personInCharge || '',
      description: ev.description || '',
      status: ev.status || 'Terjadwal',
    });
    setFormError('');
    setDetailEvent(null);
    setIsFormOpen(true);
  };

  // Submit Add / Edit Agenda
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Nama kegiatan wajib diisi.');
      return;
    }
    if (!formData.category) {
      setFormError('Jenis kegiatan wajib dipilih.');
      return;
    }
    if (!formData.startDate) {
      setFormError('Tanggal mulai wajib diisi.');
      return;
    }
    if (!formData.academicYearId) {
      setFormError('Tahun ajaran wajib dipilih.');
      return;
    }

    const finalEndDate =
      formData.endDate && formData.endDate >= formData.startDate
        ? formData.endDate
        : formData.startDate;

    if (formData.targetScope === 'SPECIFIC' && formData.classIds.length === 0) {
      setFormError('Pilih minimal satu kelas jika agenda berlaku untuk kelas tertentu.');
      return;
    }

    const nowIso = new Date().toISOString();
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Administrator';
    const actorId = currentUser?.uid || currentUser?.id || actorName;

    const payload: AcademicCalendarEvent = {
      id: editingEvent ? editingEvent.id : `cal_${Date.now()}`,
      title: formData.title.trim(),
      category: formData.category,
      startDate: formData.startDate,
      endDate: finalEndDate,
      startTime: formData.startTime.trim(),
      endTime: formData.endTime.trim(),
      academicYearId: formData.academicYearId,
      semester: formData.semester,
      classIds: formData.targetScope === 'SPECIFIC' ? formData.classIds : [],
      location: formData.location.trim(),
      personInCharge: formData.personInCharge.trim(),
      description: formData.description.trim(),
      status: formData.status,
      createdBy: editingEvent?.createdBy || actorId,
      createdByName: editingEvent?.createdByName || actorName,
      createdByRole: editingEvent?.createdByRole || effectiveRole,
      createdAt: editingEvent?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    try {
      setIsSubmitting(true);
      await saveAcademicCalendarEvent(payload);
      setIsFormOpen(false);
      setSelectedDateIso(payload.startDate);
      setNoticeMsg(
        editingEvent
          ? `Agenda "${payload.title}" berhasil diperbarui.`
          : `Agenda baru "${payload.title}" berhasil ditambahkan ke Kalender Akademik.`
      );
      setTimeout(() => setNoticeMsg(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan agenda ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Agenda (Requirement 10)
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      setIsDeleting(true);
      const deletedTitle = eventToDelete.title;
      await deleteAcademicCalendarEvent(eventToDelete.id);
      setEventToDelete(null);
      setDetailEvent(null);
      setNoticeMsg(`Agenda "${deletedTitle}" telah dihapus.`);
      setTimeout(() => setNoticeMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus agenda dari database.');
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle class in multi-select
  const toggleSelectedClassId = (cid: string) => {
    setFormData((prev) => {
      const exists = prev.classIds.includes(cid);
      return {
        ...prev,
        classIds: exists ? prev.classIds.filter((id) => id !== cid) : [...prev.classIds, cid],
      };
    });
  };

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goToNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const goToToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateIso(todayIso);
  };

  // Render Status & Visual Notification Badge (Requirement 14)
  const renderStatusNotificationBadges = (ev: AcademicCalendarEvent) => {
    const { effectiveStatus, isToday } = resolveEventEffectiveStatus(ev, todayIso);

    const statusBadgeClass = {
      Terjadwal: 'bg-blue-50 text-blue-700 border-blue-200',
      Berlangsung: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Selesai: 'bg-slate-100 text-slate-600 border-slate-200',
      Dibatalkan: 'bg-rose-50 text-rose-700 border-rose-200',
    }[effectiveStatus];

    return (
      <div className="inline-flex flex-wrap items-center gap-1.5">
        {isToday && effectiveStatus !== 'Dibatalkan' && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
            TODAY
          </span>
        )}
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusBadgeClass}`}
        >
          {effectiveStatus}
        </span>
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-700">Memuat Kalender Akademik...</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Menyinkronkan agenda tahun ajaran dan semester aktif dari database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================
          A. HEADER UTAMA KALENDER AKADEMIK
         ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-indigo-600 inline-flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                Pusat Agenda Akademik &amp; Pesantren
              </span>
              <span aria-hidden="true">&bull;</span>
              <span>
                Tahun Ajaran Aktif:{' '}
                <strong className="text-slate-900">
                  {activeAcademicYear?.name || '2026/2027'}
                </strong>
              </span>
              <span aria-hidden="true">&bull;</span>
              <span>
                Semester Aktif:{' '}
                <strong className="text-indigo-700">
                  Semester {activeAcademicYear?.semester || 'Ganjil'}
                </strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              📅 Kalender Akademik
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {canManage
                ? 'Kelola dan pantau jadwal kegiatan pembelajaran, asesmen, rapat guru, kegiatan pesantren, serta pembagian raport.'
                : effectiveRole === 'WALI_KELAS'
                ? `Jadwal agenda akademik, asesmen, dan kegiatan kelas binaan (${homeroomClass?.name || 'Semua Kelas'}).`
                : effectiveRole === 'GURU_MAPEL'
                ? 'Jadwal agenda pembelajaran, ujian, rapat guru, dan kegiatan akademik sekolah.'
                : 'Jadwal agenda kegiatan pesantren, kesantrian, dan kalender pendidikan AKSARA.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Segmented View Toggle: Bulanan / Daftar Agenda */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('MONTHLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'MONTHLY'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Daftar Agenda
              </button>
            </div>

            {/* + Tambah Agenda button strictly for authorized roles */}
            {canManage && (
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Tambah Agenda
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {noticeMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
          <button
            onClick={() => setNoticeMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          FILTER BAR (Requirement 9)
         ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filter Kalender Akademik</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. Tahun Ajaran */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={filterAcademicYearId}
              onChange={(e) => setFilterAcademicYearId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Tahun Ajaran</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} ({ay.semester}) {ay.isActive ? '• Aktif' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Semester
            </label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Semester</option>
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* 3. Bulan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Bulan
            </label>
            <select
              value={filterMonth}
              onChange={(e) => {
                const val = e.target.value;
                setFilterMonth(val);
                if (val !== 'ALL') {
                  const mIndex = Number(val) - 1;
                  setCurrentMonthDate((prev) => new Date(prev.getFullYear(), mIndex, 1));
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Bulan</option>
              {MONTH_NAMES_ID.map((mName, idx) => (
                <option key={mName} value={String(idx + 1)}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Jenis Kegiatan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Jenis Kegiatan
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Jenis Kegiatan</option>
              {ACADEMIC_CALENDAR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Kelas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Kelas / Rombel
            </label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Kelas</option>
              {activeClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Kelas {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Status Agenda
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Berlangsung">Berlangsung</option>
              <option value="Selesai">Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================
          MAIN CONTENT GRID: KALENDER (KIRI) & AGENDA TERDEKAT (KANAN)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / MAIN AREA (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {viewMode === 'MONTHLY' ? (
            <>
              {/* Monthly Calendar Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Month Navigation Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {MONTH_NAMES_ID[currentMonthDate.getMonth()]}{' '}
                      {currentMonthDate.getFullYear()}
                    </h2>
                    <button
                      type="button"
                      onClick={goToToday}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      Hari Ini
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={goToPrevMonth}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextMonth}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center">
                  {DAY_NAMES_SHORT_ID.map((dayName, idx) => (
                    <div
                      key={dayName}
                      className={`py-2.5 text-[11px] font-bold uppercase tracking-wider ${
                        idx === 6 ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                  {monthlyGridDays.map((cell) => {
                    const isSelected = cell.dateIso === selectedDateIso;
                    const hasEvents = cell.events.length > 0;
                    const hasHoliday = cell.events.some((ev) => ev.category === 'Libur');

                    return (
                      <button
                        key={cell.dateIso}
                        type="button"
                        onClick={() => setSelectedDateIso(cell.dateIso)}
                        className={`min-h-[72px] sm:min-h-[96px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition relative cursor-pointer focus:outline-none ${
                          !cell.isCurrentMonth
                            ? 'bg-slate-50/50 text-slate-400'
                            : isSelected
                            ? 'bg-indigo-50/70 ring-2 ring-inset ring-indigo-600'
                            : 'bg-white hover:bg-slate-50/80 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs font-bold flex items-center justify-center font-mono tabular-nums ${
                              cell.isToday
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : hasHoliday && cell.isCurrentMonth
                                ? 'text-rose-600'
                                : ''
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          {cell.isToday && (
                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-white uppercase tracking-wider">
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Event Indicators */}
                        {hasEvents && (
                          <div className="mt-1 space-y-1 w-full overflow-hidden">
                            {/* Desktop: show up to 2 event titles */}
                            <div className="hidden sm:block space-y-1">
                              {cell.events.slice(0, 2).map((ev) => {
                                const style = getCategoryStyle(ev.category);
                                return (
                                  <div
                                    key={ev.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDateIso(cell.dateIso);
                                      setDetailEvent(ev);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border ${style.bg} ${style.text} ${style.border}`}
                                    title={ev.title}
                                  >
                                    {ev.title}
                                  </div>
                                );
                              })}
                              {cell.events.length > 2 && (
                                <div className="text-[10px] font-semibold text-indigo-600 pl-1">
                                  +{cell.events.length - 2} agenda lainnya
                                </div>
                              )}
                            </div>

                            {/* Mobile: compact colored dots + count */}
                            <div className="flex sm:hidden items-center gap-1 flex-wrap pt-1">
                              {cell.events.slice(0, 3).map((ev) => {
                                const style = getCategoryStyle(ev.category);
                                return (
                                  <span
                                    key={ev.id}
                                    className={`w-2 h-2 rounded-full ${style.dot}`}
                                  />
                                );
                              })}
                              {cell.events.length > 3 && (
                                <span className="text-[9px] font-bold text-indigo-600">
                                  +{cell.events.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Date Agenda Panel (When a date is clicked) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Agenda pada {formatEventDateRange(selectedDateIso)}
                      </h3>
                      {selectedDateIso === todayIso && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-white uppercase tracking-wider">
                          TODAY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Klik item agenda untuk melihat rincian lengkap, lokasi, dan penanggung jawab.
                    </p>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(selectedDateIso)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah di Tanggal Ini
                    </button>
                  )}
                </div>

                {selectedDateEvents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Tidak ada agenda terjadwal pada tanggal ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((ev) => {
                      const style = getCategoryStyle(ev.category);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setDetailEvent(ev)}
                          className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/20 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                {ev.category}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                &bull;
                              </span>
                              <span className="text-slate-500">{getEventClassLabel(ev)}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">{ev.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>{formatEventDateRange(ev.startDate, ev.endDate)}</span>
                              {(ev.startTime || ev.endTime) && (
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {ev.startTime || '--:--'}
                                  {ev.endTime ? `–${ev.endTime}` : ''}
                                </span>
                              )}
                              {ev.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {ev.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            {renderStatusNotificationBadges(ev)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ========================================================
               LIST VIEW (TAMPILAN DAFTAR AGENDA)
               ======================================================== */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Daftar Seluruh Agenda Akademik ({filteredEvents.length} Agenda)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diurutkan berdasarkan tanggal pelaksanaan. Klik agenda untuk melihat detail.
                  </p>
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Belum ada agenda yang sesuai dengan filter saat ini.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Gunakan tombol Reset Filter atau tambahkan agenda baru jika Anda memiliki akses.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEvents.map((ev) => {
                    const style = getCategoryStyle(ev.category);
                    const ayObj = academicYears.find(
                      (ay) => ay.id === ev.academicYearId || ay.name === ev.academicYearId
                    );
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setDetailEvent(ev)}
                        className="py-4 first:pt-1 last:pb-1 hover:bg-slate-50/80 rounded-xl px-3 -mx-3 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                              {ev.category}
                            </span>
                            <span aria-hidden="true">&bull;</span>
                            <span>
                              TA {ayObj?.name || ev.academicYearId} ({ev.semester})
                            </span>
                            <span aria-hidden="true">&bull;</span>
                            <span>{getEventClassLabel(ev)}</span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900">{ev.title}</h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">
                              {formatEventDateRange(ev.startDate, ev.endDate)}
                            </span>
                            {(ev.startTime || ev.endTime) && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {ev.startTime || '--:--'}
                                {ev.endTime ? `–${ev.endTime}` : ''}
                              </span>
                            )}
                            {ev.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {ev.location}
                              </span>
                            )}
                            {ev.personInCharge && (
                              <span className="inline-flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-slate-400" />
                                PJ: {ev.personInCharge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          {renderStatusNotificationBadges(ev)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================
            RIGHT COLUMN: AGENDA TERDEKAT (Requirement 8)
           ======================================================== */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Pin className="w-4 h-4 text-indigo-600" />
                AGENDA TERDEKAT
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Urutan kegiatan terdekat mulai hari ini ({formatEventDateRange(todayIso)}).
              </p>
            </div>

            {upcomingAgendas.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <CalendarDays className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-500">
                  Belum ada agenda terdekat yang terjadwal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAgendas.map((ev) => {
                  const { isToday, daysUntil } = resolveEventEffectiveStatus(ev, todayIso);
                  const style = getCategoryStyle(ev.category);

                  const relativeLabel = isToday
                    ? '📌 Hari Ini (TODAY)'
                    : daysUntil === 1
                    ? '📌 Besok'
                    : daysUntil > 1
                    ? `📌 ${daysUntil} hari lagi`
                    : '📌 Sedang Berlangsung';

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setDetailEvent(ev)}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/60 hover:bg-indigo-50/30 transition cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-bold ${
                            isToday
                              ? 'text-amber-600'
                              : daysUntil <= 3
                              ? 'text-indigo-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {relativeLabel}
                        </span>
                        {renderStatusNotificationBadges(ev)}
                      </div>

                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        {ev.title}
                      </div>

                      <div className="text-xs text-slate-600">
                        {formatEventDateRange(ev.startDate, ev.endDate)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                          {ev.category}
                        </span>
                        {(ev.startTime || ev.endTime) && (
                          <>
                            <span aria-hidden="true">&bull;</span>
                            <span className="font-mono">
                              {ev.startTime || '--:--'}
                              {ev.endTime ? `–${ev.endTime}` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL DETAIL AGENDA (Requirement 10)
         ======================================================== */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8 animate-scale-in space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const style = getCategoryStyle(detailEvent.category);
                    return (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                        {detailEvent.category}
                      </span>
                    );
                  })()}
                  {renderStatusNotificationBadges(detailEvent)}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {detailEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Jenis Kegiatan</span>
                <span className="font-semibold text-slate-900">{detailEvent.category}</span>
              </div>

              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tanggal</span>
                <span className="font-semibold text-slate-900">
                  {formatEventDateRange(detailEvent.startDate, detailEvent.endDate)}
                </span>
              </div>

              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Waktu</span>
                <span className="font-mono text-slate-800">
                  {detailEvent.startTime || detailEvent.endTime
                    ? `${detailEvent.startTime || '--:--'}${detailEvent.endTime ? ` – ${detailEvent.endTime}` : ''}`
                    : 'Sehari penuh / Sesuai jadwal'}
                </span>
              </div>

              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tahun Ajaran &amp; Sem</span>
                <span className="font-medium text-slate-800">
                  {(() => {
                    const ay = academicYears.find(
                      (a) =>
                        a.id === detailEvent.academicYearId ||
                        a.name === detailEvent.academicYearId
                    );
                    return `${ay?.name || detailEvent.academicYearId} — Semester ${detailEvent.semester}`;
                  })()}
                </span>
              </div>

              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kelas</span>
                <span className="font-semibold text-indigo-700">
                  {getEventClassLabel(detailEvent)}
                </span>
              </div>

              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Lokasi</span>
                <span className="text-slate-800">{detailEvent.location || '-'}</span>
              </div>

              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Penanggung Jawab</span>
                <span className="font-medium text-slate-800">
                  {detailEvent.personInCharge || '-'}
                </span>
              </div>

              <div className="grid grid-cols-[130px_1fr] py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <div>{renderStatusNotificationBadges(detailEvent)}</div>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 block mb-1">Keterangan:</span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed whitespace-pre-line">
                  {detailEvent.description || 'Tidak ada keterangan tambahan.'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {canManage ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(detailEvent)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventToDelete(detailEvent)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setDetailEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL KONFIRMASI HAPUS AGENDA (Requirement 10)
         ======================================================== */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Agenda</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apakah Anda yakin ingin menghapus agenda ini?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{eventToDelete.title}</div>
              <div className="text-slate-500">
                {eventToDelete.category} &bull;{' '}
                {formatEventDateRange(eventToDelete.startDate, eventToDelete.endDate)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Agenda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL FORM TAMBAH / EDIT AGENDA (Requirement 4)
         ======================================================== */}
      {isFormOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 my-8 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingEvent ? 'Edit Agenda Kalender Akademik' : 'Tambah Agenda Kalender Akademik'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Agenda akan tersimpan di database dan tampil sesuai Tahun Ajaran serta Semester.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="mt-4 space-y-3.5 text-xs">
              {/* Nama Kegiatan & Jenis Kegiatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Sumatif Tengah Semester Ganjil"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jenis Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  >
                    {ACADEMIC_CALENDAR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tanggal Mulai & Tanggal Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        startDate: newStart,
                        endDate:
                          !prev.endDate ||
                          prev.endDate === prev.startDate ||
                          prev.endDate < newStart
                            ? newStart
                            : prev.endDate,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Selesai{' '}
                    <span className="text-[10px] font-normal text-slate-400">
                      (Otomatis sama jika 1 hari)
                    </span>
                  </label>
                  <input
                    type="date"
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Waktu Mulai & Waktu Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waktu Mulai</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waktu Selesai</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Tahun Ajaran & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Ajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.academicYearId}
                    onChange={(e) => {
                      const chosenYearId = e.target.value;
                      const foundAy = academicYears.find((ay) => ay.id === chosenYearId);
                      setFormData({
                        ...formData,
                        academicYearId: chosenYearId,
                        semester: foundAy?.semester || formData.semester,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} ({ay.semester}) {ay.isActive ? '(Aktif)' : ''}
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
                      setFormData({
                        ...formData,
                        semester: e.target.value as 'Ganjil' | 'Genap',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              {/* Berlaku untuk: Semua kelas / Kelas tertentu */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block font-semibold text-slate-700">Berlaku Untuk:</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetScope"
                      checked={formData.targetScope === 'ALL'}
                      onChange={() => setFormData({ ...formData, targetScope: 'ALL', classIds: [] })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Semua Kelas</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetScope"
                      checked={formData.targetScope === 'SPECIFIC'}
                      onChange={() => setFormData({ ...formData, targetScope: 'SPECIFIC' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-800">Kelas Tertentu</span>
                  </label>
                </div>

                {formData.targetScope === 'SPECIFIC' && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {activeClasses.map((cls) => {
                      const checked = formData.classIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleSelectedClassId(cls.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            checked
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Kelas {cls.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lokasi, Penanggung Jawab, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lokasi</label>
                  <input
                    type="text"
                    placeholder="Aula / Ruang Kelas / Pesantren"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    placeholder="Nama panitia / koordinator"
                    value={formData.personInCharge}
                    onChange={(e) => setFormData({ ...formData, personInCharge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as AcademicCalendarStatus,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan</label>
                <textarea
                  rows={3}
                  placeholder="Rincian pelaksanaan agenda, peserta, atau catatan penting..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
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
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingEvent
                    ? 'Simpan Perubahan'
                    : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
