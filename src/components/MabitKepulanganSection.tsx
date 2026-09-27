import React, { useState, useMemo, useEffect } from 'react';
import {
  MabitPeriod,
  MabitParticipant,
  MabitReturnStatus,
  Student,
  getKesantrianOfficerLabel,
} from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import {
  Moon,
  Plus,
  Search,
  CheckSquare,
  Square,
  CheckCircle2,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle,
  Users,
  ArrowRight,
} from 'lucide-react';

// Helper to compute Indonesian Islamic/Pesantren day name from YYYY-MM-DD
export const getDayNameFromDateStr = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '-';
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(dateObj.getTime())) return '-';
  const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return dayNames[dateObj.getDay()] || '-';
};

// Helper to format YYYY-MM-DD into readable Indonesian date (e.g., 10 Oktober 2026)
export const formatIndonesianDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const months = [
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
  return `${parts[2]} ${months[parts[1] - 1] || ''} ${parts[0]}`;
};

export const MabitKepulanganSection: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    students = [],
    classes = [],
    activeAcademicYear,
    mabitPeriods = [],
    saveMabitPeriod,
    deleteMabitPeriod,
  } = useMasterData();

  const currentActorName =
    currentUser?.displayName || currentUser?.name || currentUser?.username || 'Petugas Kesantrian';
  const currentOfficerLabel = getKesantrianOfficerLabel(currentUser);

  // Helper: Get class name from Master Data Kelas
  const getClassName = (classId?: string) => {
    if (!classId) return '-';
    const found = classes.find((c) => c && c.id === classId);
    return found ? found.name : classId;
  };

  // Helper: Format NIS/NISN from Master Data Siswa
  const formatNisOrNisn = (st?: Partial<Student> | null) => {
    if (st?.nisn && st.nisn !== '-') return `NISN: ${st.nisn}`;
    if (st?.nis && st.nis !== '-') return `NIS: ${st.nis}`;
    return 'NISN: -';
  };

  // Resolve participant student info dynamically from Master Data Siswa via studentId
  const resolveParticipantStudent = (studentId: string) => {
    const masterStudent = students.find((s) => s && s.id === studentId);
    const classId = masterStudent?.classId || '';
    const className = classId ? getClassName(classId) : '-';
    return {
      masterStudent,
      studentId,
      name: masterStudent?.name || 'Santri (Arsip)',
      nisnLabel: formatNisOrNisn(masterStudent),
      classId,
      className,
      status: masterStudent?.status || 'Aktif',
      isInactive: Boolean(masterStudent && masterStudent.status !== 'Aktif'),
    };
  };

  // Requirement 5 & 9: Active students only from Master Data Siswa for new Mabit selection
  const activeStudentsList = useMemo(() => {
    return students
      .filter((s) => s && s.status === 'Aktif')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [students]);

  // Selected Mabit Period for Pemantauan Kepulangan
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  useEffect(() => {
    if (!selectedPeriodId && mabitPeriods.length > 0) {
      setSelectedPeriodId(mabitPeriods[0].id);
    } else if (
      selectedPeriodId &&
      mabitPeriods.length > 0 &&
      !mabitPeriods.some((p) => p.id === selectedPeriodId)
    ) {
      setSelectedPeriodId(mabitPeriods[0].id);
    }
  }, [mabitPeriods, selectedPeriodId]);

  const activePeriod = useMemo(
    () => mabitPeriods.find((p) => p.id === selectedPeriodId) || mabitPeriods[0] || null,
    [mabitPeriods, selectedPeriodId]
  );

  // Compute period status helper
  const getPeriodStats = (period: MabitPeriod) => {
    const participants = period.participants || [];
    const total = participants.length;
    const returnedCount = participants.filter((p) => p.status === 'Sudah Kembali').length;
    const notReturnedCount = total - returnedCount;
    const isAllReturned = total > 0 && notReturnedCount === 0;
    const statusLabel = isAllReturned ? 'Selesai (Semua Sudah Kembali)' : 'Dalam Pemantauan Kepulangan';

    return {
      total,
      returnedCount,
      notReturnedCount,
      isAllReturned,
      statusLabel,
    };
  };

  // Notices & Errors
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================================
  // FORM TAMBAH / EDIT PERIODE MABIT (Requirement 3, 4, 5)
  // =========================================================================
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<MabitPeriod | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const [periodForm, setPeriodForm] = useState<{
    id: string;
    periodName: string;
    departureDate: string;
    departureTime: string;
    returnDate: string;
    returnTime: string;
    selectedStudentIds: string[];
    generalNotes: string;
  }>({
    id: '',
    periodName: '',
    departureDate: todayStr,
    departureTime: '16.30',
    returnDate: tomorrowStr,
    returnTime: '16.00',
    selectedStudentIds: [],
    generalNotes: '',
  });

  // Filters inside Student Multi-Selector in Modal
  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const [modalClassFilter, setModalClassFilter] = useState('ALL');

  const filteredModalStudents = useMemo(() => {
    const q = modalStudentSearch.trim().toLowerCase();
    return activeStudentsList.filter((st) => {
      const clsName = getClassName(st.classId).toLowerCase();
      const matchesClass = modalClassFilter === 'ALL' || st.classId === modalClassFilter;
      const matchesSearch =
        !q ||
        (st.name || '').toLowerCase().includes(q) ||
        (st.nisn || '').toLowerCase().includes(q) ||
        (st.nis || '').toLowerCase().includes(q) ||
        clsName.includes(q);
      return matchesClass && matchesSearch;
    });
  }, [activeStudentsList, modalStudentSearch, modalClassFilter, classes]);

  const handleOpenAddPeriod = () => {
    const nextNumber = mabitPeriods.length + 1;
    setEditingPeriod(null);
    setFormError('');
    setModalStudentSearch('');
    setModalClassFilter('ALL');
    setPeriodForm({
      id: `mabit_period_${Date.now()}`,
      periodName: `Mabit Periode ${nextNumber}`,
      departureDate: todayStr,
      departureTime: '16.30',
      returnDate: tomorrowStr,
      returnTime: '16.00',
      selectedStudentIds: [],
      generalNotes: '',
    });
    setIsPeriodModalOpen(true);
  };

  const handleOpenEditPeriod = (period: MabitPeriod) => {
    setEditingPeriod(period);
    setFormError('');
    setModalStudentSearch('');
    setModalClassFilter('ALL');
    setPeriodForm({
      id: period.id,
      periodName: period.periodName,
      departureDate: period.departureDate,
      departureTime: period.departureTime || '16.30',
      returnDate: period.returnDate,
      returnTime: period.returnTime || '16.00',
      selectedStudentIds: (period.participants || []).map((p) => p.studentId),
      generalNotes: period.generalNotes || '',
    });
    setIsPeriodModalOpen(true);
  };

  // Toggle single student checkbox
  const handleToggleStudent = (studentId: string) => {
    setPeriodForm((prev) => {
      const exists = prev.selectedStudentIds.includes(studentId);
      return {
        ...prev,
        selectedStudentIds: exists
          ? prev.selectedStudentIds.filter((id) => id !== studentId)
          : [...prev.selectedStudentIds, studentId],
      };
    });
  };

  // Requirement 5: Pilih Semua (all currently filtered active students)
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredModalStudents.map((s) => s.id);
    setPeriodForm((prev) => {
      const merged = Array.from(new Set([...prev.selectedStudentIds, ...filteredIds]));
      return { ...prev, selectedStudentIds: merged };
    });
  };

  // Requirement 5: Batalkan Semua
  const handleDeselectAll = () => {
    if (modalClassFilter === 'ALL' && !modalStudentSearch.trim()) {
      setPeriodForm((prev) => ({ ...prev, selectedStudentIds: [] }));
    } else {
      const filteredIds = new Set(filteredModalStudents.map((s) => s.id));
      setPeriodForm((prev) => ({
        ...prev,
        selectedStudentIds: prev.selectedStudentIds.filter((id) => !filteredIds.has(id)),
      }));
    }
  };

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!periodForm.periodName.trim()) {
      setFormError('Nama / nomor periode Mabit wajib diisi.');
      return;
    }

    if (!periodForm.departureDate) {
      setFormError('Tanggal pulang wajib diisi.');
      return;
    }

    if (!periodForm.returnDate) {
      setFormError('Tanggal kembali wajib diisi.');
      return;
    }

    if (periodForm.selectedStudentIds.length === 0) {
      setFormError('Pilih minimal 1 santri aktif yang mengikuti periode Mabit ini.');
      return;
    }

    const existingParticipantsMap = new Map<string, MabitParticipant>();
    if (editingPeriod && Array.isArray(editingPeriod.participants)) {
      editingPeriod.participants.forEach((p) => existingParticipantsMap.set(p.studentId, p));
    }

    const participants: MabitParticipant[] = periodForm.selectedStudentIds.map((studentId) => {
      const prev = existingParticipantsMap.get(studentId);
      if (prev) {
        return {
          ...prev,
          departureTime: periodForm.departureTime.trim() || prev.departureTime || '16.30',
        };
      }
      return {
        studentId,
        departureTime: periodForm.departureTime.trim() || '16.30',
        actualReturnTime: '',
        status: 'Belum Kembali',
        notes: '',
      };
    });

    const currentActorId =
      currentUser?.id || currentUser?.uid || currentUser?.userId || currentActorName;

    const payload: MabitPeriod = {
      id: periodForm.id || `mabit_period_${Date.now()}`,
      periodName: periodForm.periodName.trim(),
      departureDate: periodForm.departureDate,
      departureDay: getDayNameFromDateStr(periodForm.departureDate),
      departureTime: periodForm.departureTime.trim() || '16.30',
      returnDate: periodForm.returnDate,
      returnDay: getDayNameFromDateStr(periodForm.returnDate),
      returnTime: periodForm.returnTime.trim() || '16.00',
      participants,
      generalNotes: periodForm.generalNotes.trim() || undefined,
      academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
      academicYearName: activeAcademicYear?.name || '2026/2027',
      semester: activeAcademicYear?.semester || 'Ganjil',
      createdBy: editingPeriod?.createdBy || currentActorId,
      createdByName: editingPeriod?.createdByName || currentActorName,
      createdByRole: editingPeriod?.createdByRole || currentOfficerLabel,
      createdAt: editingPeriod?.createdAt || new Date().toISOString(),
      updatedBy: currentActorId,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await saveMabitPeriod(payload);
      setSelectedPeriodId(payload.id);
      setIsPeriodModalOpen(false);
      setNotice(
        editingPeriod
          ? `Periode "${payload.periodName}" (${participants.length} santri) berhasil diperbarui.`
          : `Periode "${payload.periodName}" dengan ${participants.length} santri berhasil disimpan.`
      );
      setTimeout(() => setNotice(''), 4500);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan periode Mabit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // PEMANTAUAN KEPULANGAN SANTRI (Requirement 6)
  // =========================================================================
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [monitoringClassFilter, setMonitoringClassFilter] = useState('ALL');
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState('ALL');

  // Update a single participant's return status, actual return time, or notes
  const handleUpdateParticipantReturn = async (
    period: MabitPeriod,
    studentId: string,
    updates: Partial<MabitParticipant>
  ) => {
    const nowTimeStr = new Date().toTimeString().slice(0, 5).replace(':', '.');
    const updatedParticipants = (period.participants || []).map((p) => {
      if (p.studentId !== studentId) return p;
      const nextStatus = updates.status !== undefined ? updates.status : p.status;
      let nextReturnTime =
        updates.actualReturnTime !== undefined ? updates.actualReturnTime : p.actualReturnTime;

      // When changing status to 'Sudah Kembali', auto-fill return time if empty
      if (nextStatus === 'Sudah Kembali' && !nextReturnTime) {
        nextReturnTime = period.returnTime || nowTimeStr;
      }
      // When changing status back to 'Belum Kembali', clear actualReturnTime unless explicitly provided
      if (nextStatus === 'Belum Kembali' && updates.status === 'Belum Kembali') {
        nextReturnTime = '';
      }

      return {
        ...p,
        ...updates,
        status: nextStatus,
        actualReturnTime: nextReturnTime,
        updatedAt: new Date().toISOString(),
        updatedBy: currentActorName,
      };
    });

    await saveMabitPeriod({
      ...period,
      participants: updatedParticipants,
    });
  };

  // Mark all participants in activePeriod as Sudah Kembali
  const handleMarkAllReturned = async (period: MabitPeriod) => {
    const defaultReturnTime = period.returnTime || '16.00';
    const updatedParticipants = (period.participants || []).map((p) => ({
      ...p,
      status: 'Sudah Kembali' as MabitReturnStatus,
      actualReturnTime: p.actualReturnTime || defaultReturnTime,
      updatedAt: new Date().toISOString(),
      updatedBy: currentActorName,
    }));
    await saveMabitPeriod({
      ...period,
      participants: updatedParticipants,
    });
    setNotice(`Seluruh santri pada "${period.periodName}" ditandai Sudah Kembali.`);
    setTimeout(() => setNotice(''), 4000);
  };

  const filteredActiveParticipants = useMemo(() => {
    if (!activePeriod) return [];
    const q = monitoringSearch.trim().toLowerCase();
    return (activePeriod.participants || []).filter((part) => {
      const resolved = resolveParticipantStudent(part.studentId);
      const matchesSearch =
        !q ||
        resolved.name.toLowerCase().includes(q) ||
        resolved.nisnLabel.toLowerCase().includes(q) ||
        resolved.className.toLowerCase().includes(q) ||
        (part.notes || '').toLowerCase().includes(q);
      const matchesClass =
        monitoringClassFilter === 'ALL' || resolved.classId === monitoringClassFilter;
      const matchesStatus =
        monitoringStatusFilter === 'ALL' || part.status === monitoringStatusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [
    activePeriod,
    monitoringSearch,
    monitoringClassFilter,
    monitoringStatusFilter,
    students,
    classes,
  ]);

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice('')}
            className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          2. HEADER MODUL: MABIT & KEPULANGAN SANTRI
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Moon className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Mabit &amp; Kepulangan Santri</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan jadwal kepulangan santri pada periode Mabit dan pemantauan waktu kembali ke pesantren.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            id="btn-tambah-periode-mabit"
            onClick={handleOpenAddPeriod}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Periode Mabit</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          8. RIWAYAT & DAFTAR PERIODE MABIT
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Riwayat Periode Mabit</h3>
            <p className="text-xs text-slate-500">
              1 periode Mabit = 1 catatan kepulangan kolektif santri. Klik periode untuk memantau waktu kembali santri.
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl self-start sm:self-center">
            Total {mabitPeriods.length} Periode Mabit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Tanggal Pulang</th>
                <th className="py-3 px-4">Tanggal Kembali</th>
                <th className="py-3 px-4">Jumlah Santri</th>
                <th className="py-3 px-4">Status Periode</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mabitPeriods.map((period) => {
                const stats = getPeriodStats(period);
                const isSelected = activePeriod?.id === period.id;

                return (
                  <tr
                    key={period.id}
                    onClick={() => setSelectedPeriodId(period.id)}
                    className={`transition cursor-pointer ${
                      isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{period.periodName}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 text-white">
                            Sedang Dibuka
                          </span>
                        )}
                      </div>
                      {period.generalNotes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {period.generalNotes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {period.departureDay || getDayNameFromDateStr(period.departureDate)},{' '}
                        {formatIndonesianDate(period.departureDate)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Jam Pulang: {period.departureTime || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {period.returnDay || getDayNameFromDateStr(period.returnDate)},{' '}
                        {formatIndonesianDate(period.returnDate)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Jam Kembali: {period.returnTime || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{stats.total} santri</div>
                      <div className="text-[11px] flex items-center gap-2 mt-0.5">
                        <span className="text-emerald-600 font-semibold">
                          Sudah Kembali: {stats.returnedCount}
                        </span>
                        <span className="text-amber-600 font-semibold">
                          Belum Kembali: {stats.notReturnedCount}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          stats.isAllReturned
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {stats.statusLabel}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedPeriodId(period.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pantau Kepulangan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPeriod(period)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition cursor-pointer"
                          title="Edit Periode & Daftar Santri Mabit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMabitPeriod(period.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Periode Mabit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {mabitPeriods.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Belum ada periode Mabit yang dicatat. Klik tombol{' '}
                    <strong>+ Tambah Periode Mabit</strong> untuk membuat jadwal kepulangan santri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          6. PEMANTAUAN KEPULANGAN SANTRI PADA PERIODE YANG DIBUKA
         ===================================================================== */}
      {activePeriod && (() => {
        const stats = getPeriodStats(activePeriod);
        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
            {/* Header Detail Periode */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Pemantauan Kepulangan Mabit
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {activePeriod.periodName}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                  <span>
                    <strong>Pulang:</strong>{' '}
                    {activePeriod.departureDay || getDayNameFromDateStr(activePeriod.departureDate)},{' '}
                    {formatIndonesianDate(activePeriod.departureDate)} ({activePeriod.departureTime})
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    <strong>Kembali:</strong>{' '}
                    {activePeriod.returnDay || getDayNameFromDateStr(activePeriod.returnDate)},{' '}
                    {formatIndonesianDate(activePeriod.returnDate)} ({activePeriod.returnTime})
                  </span>
                </div>
                {activePeriod.generalNotes && (
                  <p className="text-xs text-slate-500 mt-1">
                    Catatan Periode: {activePeriod.generalNotes}
                  </p>
                )}
              </div>

              {/* Ringkasan Cepat Status Kembali */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Total Santri Mabit
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{stats.total} Santri</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="text-emerald-600 block text-[10px] uppercase font-semibold">
                    Sudah Kembali
                  </span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {stats.returnedCount} Santri
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <span className="text-amber-600 block text-[10px] uppercase font-semibold">
                    Belum Kembali
                  </span>
                  <span className="font-bold text-amber-800 text-sm">
                    {stats.notReturnedCount} Santri
                  </span>
                </div>

                {stats.notReturnedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMarkAllReturned(activePeriod)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Tandai Semua Sudah Kembali
                  </button>
                )}
              </div>
            </div>

            {/* Filter Daftar Santri Mabit */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama santri, NIS/NISN, atau kelas..."
                  value={monitoringSearch}
                  onChange={(e) => setMonitoringSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={monitoringClassFilter}
                  onChange={(e) => setMonitoringClassFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={monitoringStatusFilter}
                  onChange={(e) => setMonitoringStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
                >
                  <option value="ALL">Semua Status Kepulangan</option>
                  <option value="Belum Kembali">Belum Kembali</option>
                  <option value="Sudah Kembali">Sudah Kembali</option>
                </select>
              </div>
            </div>

            {/* Tabel Pemantauan Kepulangan Santri (Requirement 6) */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Santri</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Waktu Pulang</th>
                    <th className="py-3 px-4">Waktu Kembali</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActiveParticipants.map((part) => {
                    const resolved = resolveParticipantStudent(part.studentId);
                    const isReturned = part.status === 'Sudah Kembali';

                    return (
                      <tr key={part.studentId} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{resolved.name}</span>
                            {resolved.isInactive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                {resolved.status}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {resolved.nisnLabel}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            {resolved.className}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {part.departureTime || activePeriod.departureTime || '16.30'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <input
                            type="text"
                            aria-label={`Waktu Kembali ${resolved.name}`}
                            value={isReturned ? part.actualReturnTime || '' : ''}
                            placeholder="-"
                            onChange={(e) =>
                              handleUpdateParticipantReturn(activePeriod, part.studentId, {
                                actualReturnTime: e.target.value,
                                status: e.target.value.trim() ? 'Sudah Kembali' : part.status,
                              })
                            }
                            className="w-24 px-2.5 py-1 rounded-lg border border-slate-200 font-mono text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                          />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            aria-label={`Status Kembali ${resolved.name}`}
                            value={part.status}
                            onChange={(e) =>
                              handleUpdateParticipantReturn(activePeriod, part.studentId, {
                                status: e.target.value as MabitReturnStatus,
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                              isReturned
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <option value="Belum Kembali">Belum Kembali</option>
                            <option value="Sudah Kembali">Sudah Kembali</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={part.notes || ''}
                            placeholder="Catatan kepulangan (opsional)..."
                            onChange={(e) =>
                              handleUpdateParticipantReturn(activePeriod, part.studentId, {
                                notes: e.target.value,
                              })
                            }
                            className="w-full min-w-[160px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {filteredActiveParticipants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada santri yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL: TAMBAH / EDIT PERIODE MABIT (Requirement 4 & 5)
         ===================================================================== */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingPeriod ? 'Edit Periode Mabit & Daftar Santri' : 'Tambah Periode Mabit'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih jadwal kepulangan serta centang santri aktif yang mengikuti Mabit dari Master Data Siswa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSavePeriod}
              className="p-4 sm:p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nama / Nomor Periode Mabit */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama / Nomor Periode Mabit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={periodForm.periodName}
                  onChange={(e) => setPeriodForm({ ...periodForm, periodName: e.target.value })}
                  placeholder="Contoh: Mabit Periode 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* Jadwal Pulang: Tanggal Pulang, Hari Otomatis, Jam Pulang */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Jadwal Kepulangan Santri
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tanggal Pulang <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={periodForm.departureDate}
                      onChange={(e) =>
                        setPeriodForm({ ...periodForm, departureDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hari Pulang (Otomatis)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={getDayNameFromDateStr(periodForm.departureDate)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jam Pulang</label>
                    <input
                      type="text"
                      value={periodForm.departureTime}
                      onChange={(e) =>
                        setPeriodForm({ ...periodForm, departureTime: e.target.value })
                      }
                      placeholder="Contoh: 16.30"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Jadwal Kembali: Tanggal Kembali, Hari Otomatis, Jam Kembali */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Jadwal Kembali ke Pesantren
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tanggal Kembali <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={periodForm.returnDate}
                      onChange={(e) =>
                        setPeriodForm({ ...periodForm, returnDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hari Kembali (Otomatis)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={getDayNameFromDateStr(periodForm.returnDate)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jam Kembali</label>
                    <input
                      type="text"
                      value={periodForm.returnTime}
                      onChange={(e) =>
                        setPeriodForm({ ...periodForm, returnTime: e.target.value })
                      }
                      placeholder="Contoh: 16.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Requirement 5: Pemilihan Banyak Santri Sekaligus dari Master Data Siswa */}
              <div className="space-y-2.5 border border-slate-200 rounded-xl p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="font-bold text-slate-800 block">
                      Daftar Santri yang Mengikuti Mabit <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Mengambil langsung dari Master Data Siswa Aktif ({activeStudentsList.length}{' '}
                      santri tersedia)
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs">
                    Terpilih: {periodForm.selectedStudentIds.length} santri
                  </span>
                </div>

                {/* Search, Filter Kelas, Pilih Semua, Batalkan Semua */}
                <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={modalStudentSearch}
                      onChange={(e) => setModalStudentSearch(e.target.value)}
                      placeholder="Cari santri (Nama / NISN)..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                    <select
                      value={modalClassFilter}
                      onChange={(e) => setModalClassFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700"
                    >
                      <option value="ALL">Semua Kelas</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Kelas {c.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold text-[11px] cursor-pointer"
                    >
                      Pilih Semua
                    </button>

                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                    >
                      Batalkan Semua
                    </button>
                  </div>
                </div>

                {/* Daftar Checkbox Santri Aktif */}
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {filteredModalStudents.map((st) => {
                    const isChecked = periodForm.selectedStudentIds.includes(st.id);
                    const clsName = getClassName(st.classId);
                    return (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition ${
                          isChecked ? 'bg-teal-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStudent(st.id)}
                            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{st.name}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {formatNisOrNisn(st)}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                          Kelas {clsName}
                        </span>
                      </label>
                    );
                  })}

                  {filteredModalStudents.length === 0 && (
                    <div className="py-6 text-center text-slate-400">
                      Tidak ada santri aktif yang sesuai dengan filter pencarian.
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan Umum (Opsional) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Umum (Opsional)
                </label>
                <input
                  type="text"
                  value={periodForm.generalNotes}
                  onChange={(e) => setPeriodForm({ ...periodForm, generalNotes: e.target.value })}
                  placeholder="Contoh: Jadwal kepulangan Mabit rutin pekan ke-2..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Periode Mabit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
