import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
  Users,
  GraduationCap,
  DoorOpen,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  ArrowUpRight,
  Package,
  ShieldAlert,
  HeartPulse,
  Moon,
  FileSpreadsheet,
  Award,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Clock,
  Activity,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import { calculateAtkStockStatus } from '../types';
import { getEffectiveTeacherId, getActiveTeacherAssignments } from '../lib/dbService';
import {
  resolveEventEffectiveStatus,
  formatEventDateRange,
} from './AcademicCalendarView';
import { SchoolLogo } from './SchoolLogo';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { currentUser, role } = useAuth();
  const {
    students = [],
    teachers = [],
    classes = [],
    subjects = [],
    academicYears = [],
    activeAcademicYear,
    schoolIdentity,
    teacherAssignments = [],
    scores = [],
    attendance = [],
    kesantrianRecords = [],
    mabitPeriods = [],
    atkItems = [],
    atkTransactions = [],
    atkRequests = [],
    academicCalendarEvents = [],
    allowTeacherViewAtkStock,
    loading = false,
    dataError = null,
    refreshAll,
  } = useMasterData();

  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString('id-ID');
    }
  }, []);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const clean = dateStr.slice(0, 10);
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return clean;
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(parts[0], parts[1] - 1, parts[2]));
    } catch {
      return clean;
    }
  };

  // =========================================================================
  // 1. DATA AKADEMIK AKTUAL
  // =========================================================================
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'Aktif').length;
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter((t) => t.isActive !== false).length;
  const totalClasses = classes.length;
  const activeClassesList = classes.filter((c) => c.isActive !== false);
  const activeClasses = activeClassesList.length;
  const activeSubjectsList = subjects.filter((s) => s.isActive !== false);
  const activeSubjects = activeSubjectsList.length;
  const totalSubjects = subjects.length;
  const activeAssignments = teacherAssignments.filter((a) => a.status !== 'Nonaktif');

  const formatAcademicYear = (ay: typeof activeAcademicYear): string => {
    if (!ay || !ay.name) {
      return '2026/2027 - Semester Ganjil';
    }
    const rawSem = ay.semester || 'Ganjil';
    const semester = rawSem.charAt(0).toUpperCase() + rawSem.slice(1).toLowerCase();
    return `${ay.name} • Semester ${semester}`;
  };

  const activeYearDisplay = formatAcademicYear(activeAcademicYear);

  // Hitung kelengkapan nilai & perkembangan nilai per kelas
  const incompleteScoreStats = useMemo(() => {
    const activeStudentList = students.filter((s) => s.status === 'Aktif');
    const relevantAssignments = activeAcademicYear
      ? activeAssignments.filter(
          (a) => !a.academicYearId || a.academicYearId === activeAcademicYear.id
        )
      : activeAssignments;

    let incompleteAssignmentCount = 0;
    let missingStudentSubjectCount = 0;

    relevantAssignments.forEach((asg) => {
      const classStudents = activeStudentList.filter((s) => s.classId === asg.classId);
      if (classStudents.length === 0) return;

      let hasMissingInClass = false;
      classStudents.forEach((st) => {
        const hasScore = scores.some(
          (sc) =>
            sc.studentId === st.id &&
            sc.subjectId === asg.subjectId &&
            typeof sc.value === 'number'
        );
        if (!hasScore) {
          hasMissingInClass = true;
          missingStudentSubjectCount++;
        }
      });

      if (hasMissingInClass) {
        incompleteAssignmentCount++;
      }
    });

    return {
      incompleteAssignmentCount,
      missingStudentSubjectCount,
      totalRelevantAssignments: relevantAssignments.length,
    };
  }, [students, activeAssignments, activeAcademicYear, scores]);

  // Grafik Perkembangan Nilai & Kelengkapan per Kelas
  const classAcademicProgress = useMemo(() => {
    const activeStudentList = students.filter((s) => s.status === 'Aktif');
    return activeClassesList.map((cls) => {
      const clsStudents = activeStudentList.filter((s) => s.classId === cls.id);
      const clsAssignments = activeAssignments.filter((a) => a.classId === cls.id);
      const subjectIds =
        clsAssignments.length > 0
          ? Array.from(new Set(clsAssignments.map((a) => a.subjectId)))
          : activeSubjectsList.slice(0, 5).map((s) => s.id);

      const expectedCells = Math.max(1, clsStudents.length * Math.max(1, subjectIds.length));
      const clsScores = scores.filter(
        (sc) =>
          clsStudents.some((st) => st.id === sc.studentId) &&
          typeof sc.value === 'number' &&
          sc.value > 0
      );

      // Unique student-subject pairs with scores
      const filledPairs = new Set(clsScores.map((sc) => `${sc.studentId}_${sc.subjectId}`)).size;
      const completionPct =
        clsStudents.length === 0
          ? 0
          : Math.min(100, Math.round((filledPairs / expectedCells) * 100));

      const avgScore =
        clsScores.length > 0
          ? Math.round(
              (clsScores.reduce((sum, sc) => sum + (Number(sc.value) || 0), 0) /
                clsScores.length) *
                10
            ) / 10
          : 0;

      return {
        id: cls.id,
        name: cls.name,
        studentCount: clsStudents.length,
        completionPct,
        avgScore,
      };
    });
  }, [activeClassesList, students, activeAssignments, activeSubjectsList, scores]);

  // =========================================================================
  // 2. DATA KESANTRIAN AKTUAL
  // =========================================================================
  const activeKesantrianRecords = useMemo(
    () => kesantrianRecords.filter((r) => !r.isDeleted),
    [kesantrianRecords]
  );

  const kesantrianStats = useMemo(() => {
    const calcDaysSince = (startDateStr: string): number => {
      if (!startDateStr) return 1;
      const start = new Date(startDateStr);
      const end = new Date(todayIso);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
      const diffMs = end.getTime() - start.getTime();
      return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    };

    const sakitRecords = activeKesantrianRecords.filter((r) => r.type === 'SAKIT');
    const sakitActive = sakitRecords.filter(
      (r) =>
        r.status !== 'Sudah Sembuh' &&
        r.status !== 'Sudah Kembali ke Pesantren' &&
        r.status !== 'Selesai'
    );
    const sakitLongDuration = sakitActive.filter((r) => calcDaysSince(r.date) >= 3);

    const izinRecords = activeKesantrianRecords.filter((r) => r.type === 'IZIN_PULANG');
    const izinActive = izinRecords.filter(
      (r) =>
        r.status !== 'Sudah Kembali' &&
        r.status !== 'Sudah Kembali ke Pesantren' &&
        r.status !== 'Selesai'
    );
    const izinOverdue = izinActive.filter((r) => {
      const targetReturn = r.estimatedReturnDate || r.returnDate || '';
      return (
        r.status === 'Terlambat Kembali' ||
        Boolean(targetReturn && targetReturn < todayIso)
      );
    });

    const pelanggaranRecords = activeKesantrianRecords.filter((r) => r.type === 'PELANGGARAN');
    const pelanggaranPending = pelanggaranRecords.filter(
      (r) =>
        r.status === 'Belum Ditangani' ||
        r.status === 'Tercatat' ||
        r.status === 'Dalam Pembinaan'
    );

    const sortedPeriods = [...mabitPeriods].sort((a, b) =>
      (b.departureDate || '').localeCompare(a.departureDate || '')
    );
    const latestMabit = sortedPeriods[0] || null;
    let mabitTotalSantri = 0;
    let mabitBelumKembali = 0;

    if (latestMabit && Array.isArray(latestMabit.participants)) {
      mabitTotalSantri = latestMabit.participants.length;
      latestMabit.participants.forEach((p) => {
        if (p.status !== 'Sudah Kembali') {
          mabitBelumKembali++;
        }
      });
    }

    const perluPerhatianCount =
      sakitLongDuration.length +
      izinOverdue.length +
      pelanggaranPending.length +
      mabitBelumKembali;

    return {
      sakitActiveCount: sakitActive.length,
      sakitLongDurationCount: sakitLongDuration.length,
      sakitTotalCount: sakitRecords.length,
      izinActiveCount: izinActive.length,
      izinOverdueCount: izinOverdue.length,
      izinTotalCount: izinRecords.length,
      pelanggaranTotalCount: pelanggaranRecords.length,
      pelanggaranPendingCount: pelanggaranPending.length,
      mabitPeriodName: latestMabit?.periodName || null,
      mabitTotalSantri,
      mabitBelumKembali,
      perluPerhatianCount,
    };
  }, [activeKesantrianRecords, mabitPeriods, todayIso]);

  // =========================================================================
  // 3. DATA ATK & PERSEDIAAN AKTUAL
  // =========================================================================
  const activeAtkItems = useMemo(
    () => atkItems.filter((i) => i.isActive !== false),
    [atkItems]
  );

  const atkStats = useMemo(() => {
    let stokAman = 0;
    let stokMenipis = 0;
    let habis = 0;
    let perluPengadaan = 0;

    const attentionItemsList: Array<{
      id: string;
      name: string;
      code: string;
      stokSaatIni: number;
      stokMinimum: number;
      unit: string;
      status: 'Stok Menipis' | 'Habis';
    }> = [];

    activeAtkItems.forEach((item) => {
      const st = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);
      if (st === 'Stok Aman') {
        stokAman++;
      } else if (st === 'Stok Menipis') {
        stokMenipis++;
        perluPengadaan++;
        attentionItemsList.push({
          id: item.id,
          name: item.name,
          code: item.code,
          stokSaatIni: item.stokSaatIni,
          stokMinimum: item.stokMinimum,
          unit: item.unit,
          status: 'Stok Menipis',
        });
      } else {
        habis++;
        perluPengadaan++;
        attentionItemsList.push({
          id: item.id,
          name: item.name,
          code: item.code,
          stokSaatIni: item.stokSaatIni,
          stokMinimum: item.stokMinimum,
          unit: item.unit,
          status: 'Habis',
        });
      }
    });

    const permintaanMenunggu = atkRequests.filter((r) => r.status === 'Menunggu').length;

    return {
      totalJenis: activeAtkItems.length,
      stokAman,
      stokMenipis,
      habis,
      permintaanMenunggu,
      perluPengadaan,
      attentionItemsList: attentionItemsList.sort((a, b) => a.stokSaatIni - b.stokSaatIni),
    };
  }, [activeAtkItems, atkRequests]);

  // Transaksi Barang Masuk & Barang Keluar Terbaru
  const recentIncomingAtk = useMemo(
    () =>
      [...atkTransactions]
        .filter((t) => t.type === 'MASUK')
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
        .slice(0, 4),
    [atkTransactions]
  );

  const recentOutgoingAtk = useMemo(
    () =>
      [...atkTransactions]
        .filter((t) => t.type === 'KELUAR')
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
        .slice(0, 4),
    [atkTransactions]
  );

  // =========================================================================
  // 4. DAFTAR "PERLU PERHATIAN" COMPACT LIST (Section 5)
  // =========================================================================
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      severity: 'danger' | 'warning';
      text: string;
      moduleLabel: string;
      targetTab: string;
    }> = [];

    if (kesantrianStats.sakitLongDurationCount > 0) {
      items.push({
        id: 'ks-sakit-3hari',
        severity: 'danger',
        text: `${kesantrianStats.sakitLongDurationCount} santri sakit ≥ 3 hari`,
        moduleLabel: 'Kesantrian',
        targetTab: 'kesantrian-sakit',
      });
    } else if (kesantrianStats.sakitActiveCount > 0) {
      items.push({
        id: 'ks-sakit-aktif',
        severity: 'warning',
        text: `${kesantrianStats.sakitActiveCount} santri sedang sakit`,
        moduleLabel: 'Kesantrian',
        targetTab: 'kesantrian-sakit',
      });
    }

    if (kesantrianStats.mabitBelumKembali > 0) {
      items.push({
        id: 'ks-mabit',
        severity: 'warning',
        text: `${kesantrianStats.mabitBelumKembali} santri belum kembali dari Mabit`,
        moduleLabel: 'Kesantrian',
        targetTab: 'kesantrian-mabit',
      });
    }

    if (kesantrianStats.izinOverdueCount > 0) {
      items.push({
        id: 'ks-izin-overdue',
        severity: 'danger',
        text: `${kesantrianStats.izinOverdueCount} santri terlambat kembali dari izin`,
        moduleLabel: 'Kesantrian',
        targetTab: 'kesantrian-izin',
      });
    } else if (kesantrianStats.izinActiveCount > 0) {
      items.push({
        id: 'ks-izin-aktif',
        severity: 'warning',
        text: `${kesantrianStats.izinActiveCount} santri belum kembali dari izin`,
        moduleLabel: 'Kesantrian',
        targetTab: 'kesantrian-izin',
      });
    }

    if (atkStats.habis > 0) {
      items.push({
        id: 'atk-habis',
        severity: 'danger',
        text: `${atkStats.habis} barang ATK habis`,
        moduleLabel: 'ATK',
        targetTab: 'atk-restock',
      });
    }

    if (atkStats.stokMenipis > 0) {
      items.push({
        id: 'atk-menipis',
        severity: 'warning',
        text: `${atkStats.stokMenipis} barang ATK stok menipis`,
        moduleLabel: 'ATK',
        targetTab: 'atk-items',
      });
    }

    if (incompleteScoreStats.incompleteAssignmentCount > 0) {
      items.push({
        id: 'akademik-nilai',
        severity: 'warning',
        text: `${incompleteScoreStats.incompleteAssignmentCount} nilai belum lengkap`,
        moduleLabel: 'Akademik',
        targetTab: 'scores',
      });
    }

    if (atkStats.permintaanMenunggu > 0) {
      items.push({
        id: 'atk-req',
        severity: 'warning',
        text: `${atkStats.permintaanMenunggu} permintaan ATK menunggu persetujuan`,
        moduleLabel: 'ATK',
        targetTab: 'atk-requests',
      });
    }

    if (kesantrianStats.pelanggaranPendingCount > 0) {
      items.push({
        id: 'ks-pelanggaran',
        severity: 'warning',
        text: `${kesantrianStats.pelanggaranPendingCount} pelanggaran perlu tindak lanjut`,
        moduleLabel: 'Kesantrian',
        targetTab: 'kesantrian-pelanggaran',
      });
    }

    return items;
  }, [kesantrianStats, atkStats, incompleteScoreStats]);

  // =========================================================================
  // 5. AKTIVITAS TERBARU LINTAS MODUL (Section 5)
  // =========================================================================
  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      sortDate: string;
      dateLabel: string;
      type: 'Penilaian' | 'Kesantrian' | 'ATK' | 'Kalender';
      description: string;
      actor: string;
      status: string;
      statusTone: 'success' | 'warning' | 'danger' | 'info';
      targetTab: string;
    }> = [];

    // 1. Kesantrian records
    activeKesantrianRecords.slice(0, 4).forEach((rec) => {
      const st = students.find((s) => s.id === rec.studentId);
      const stName = st?.name || rec.studentName || 'Santri';
      const typeLabel =
        rec.type === 'SAKIT'
          ? 'Santri sakit'
          : rec.type === 'IZIN_PULANG'
          ? 'Santri izin pulang'
          : rec.type === 'PELANGGARAN'
          ? 'Catatan pelanggaran'
          : 'Catatan kesantrian';
      const isDone =
        rec.status === 'Selesai' ||
        rec.status === 'Sudah Sembuh' ||
        rec.status === 'Sudah Kembali';

      list.push({
        id: `act-ks-${rec.id}`,
        sortDate: rec.date || todayIso,
        dateLabel: formatShortDate(rec.date || todayIso),
        type: 'Kesantrian',
        description: `${typeLabel}: ${stName} (${rec.title})`,
        actor: rec.recordedByRole || rec.createdByName || 'Petugas Kesantrian',
        status: isDone ? 'Selesai' : 'Dipantau',
        statusTone: isDone ? 'success' : 'warning',
        targetTab:
          rec.type === 'SAKIT'
            ? 'kesantrian-sakit'
            : rec.type === 'IZIN_PULANG'
            ? 'kesantrian-izin'
            : 'kesantrian-pelanggaran',
      });
    });

    // 2. ATK Requests
    atkRequests.slice(0, 3).forEach((req) => {
      const tone: 'success' | 'warning' | 'danger' | 'info' =
        req.status === 'Sudah Diberikan' || req.status === 'Disetujui'
          ? 'success'
          : req.status === 'Ditolak' || req.status === 'Dibatalkan'
          ? 'danger'
          : 'warning';
      list.push({
        id: `act-atk-req-${req.id}`,
        sortDate: req.tanggal || todayIso,
        dateLabel: formatShortDate(req.tanggal || todayIso),
        type: 'ATK',
        description: `Permintaan ${req.itemName} (${req.jumlahDiminta} ${req.unit})`,
        actor: req.pemohonNama || 'Guru',
        status: req.status,
        statusTone: tone,
        targetTab: 'atk-requests',
      });
    });

    // 3. Scores / Penilaian
    const recentScores = [...scores].slice(-3).reverse();
    recentScores.forEach((sc, idx) => {
      const subj = subjects.find((s) => s.id === sc.subjectId);
      const st = students.find((s) => s.id === sc.studentId);
      list.push({
        id: `act-score-${sc.id || idx}`,
        sortDate: todayIso,
        dateLabel: formatShortDate(todayIso),
        type: 'Penilaian',
        description: `Nilai ${subj?.name || 'Mata Pelajaran'} diperbarui (${st?.name || 'Siswa'})`,
        actor: 'Guru Mapel',
        status: 'Selesai',
        statusTone: 'success',
        targetTab: 'scores',
      });
    });

    return list
      .sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || ''))
      .slice(0, 7);
  }, [activeKesantrianRecords, atkRequests, scores, students, subjects, todayIso]);

  // Agenda Terdekat dari Kalender Akademik
  const upcomingCalendarAgendas = useMemo(() => {
    const candidates = academicCalendarEvents.filter((ev) => {
      if (activeAcademicYear && ev.academicYearId) {
        const matchesYear =
          ev.academicYearId === activeAcademicYear.id ||
          ev.academicYearId === activeAcademicYear.name;
        if (!matchesYear) return false;
      }
      const end = ev.endDate && ev.endDate >= ev.startDate ? ev.endDate : ev.startDate;
      const { effectiveStatus } = resolveEventEffectiveStatus(ev, todayIso);
      if (effectiveStatus === 'Dibatalkan' || effectiveStatus === 'Selesai') return false;
      return end >= todayIso;
    });

    return candidates
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      .slice(0, 4);
  }, [academicCalendarEvents, activeAcademicYear, todayIso]);

  // =========================================================================
  // DATA KHUSUS WALI KELAS & GURU MAPEL
  // =========================================================================
  const effectiveTeacherId = getEffectiveTeacherId(currentUser, role, teachers);

  const homeroomClass =
    role === 'WALI_KELAS'
      ? classes.find(
          (c) =>
            (c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId) &&
            (activeAcademicYear ? c.academicYearId === activeAcademicYear.id : true)
        ) ||
        classes.find(
          (c) => c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId
        )
      : null;

  const homeroomStudents = homeroomClass
    ? students.filter((s) => s.classId === homeroomClass.id && s.status === 'Aktif')
    : [];

  const homeroomAttendanceToday = attendance.filter(
    (a) => a.classId === homeroomClass?.id && a.status === 'Hadir'
  );
  const homeroomAttendanceRate = Math.round(
    (homeroomAttendanceToday.length / (homeroomStudents.length || 1)) * 100
  );

  const myAssignments = getActiveTeacherAssignments(
    teacherAssignments,
    effectiveTeacherId,
    activeAcademicYear
  );
  const myTaughtClassIds = Array.from(new Set(myAssignments.map((a) => a.classId)));
  const myClasses = classes.filter((c) => myTaughtClassIds.includes(c.id));
  const myAssignedSubjectIds = Array.from(new Set(myAssignments.map((a) => a.subjectId)));
  const mySubjects = subjects.filter((s) => myAssignedSubjectIds.includes(s.id));
  const myStudentsCount = students.filter(
    (s) => myTaughtClassIds.includes(s.classId) && s.status === 'Aktif'
  ).length;

  // Semantic badge helper
  const renderSemanticBadge = (
    label: string,
    tone: 'success' | 'warning' | 'danger' | 'info'
  ) => {
    const classesMap = {
      success: 'bg-[#EFF7F3] text-[#437A5D] border-[#BBE0CC]',
      warning: 'bg-[#FCF7EC] text-[#9A6F21] border-[#EDD5A4]',
      danger: 'bg-[#FBF1F1] text-[#A84E4E] border-[#E8BDBD]',
      info: 'bg-[#EEF4F7] text-[#3E6073] border-[#BDD3E0]',
    }[tone];
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${classesMap}`}
      >
        {label}
      </span>
    );
  };

  // =========================================================================
  // RENDER: DASHBOARD ADMINISTRATOR & KEPALA SEKOLAH (Sections 5, 6, 7, 8)
  // =========================================================================
  if (role === 'ADMIN' || role === 'KEPALA_SEKOLAH') {
    const isKepsek = role === 'KEPALA_SEKOLAH';

    return (
      <div className="space-y-6">
        {/* =====================================================
            HEADER UTAMA
           ===================================================== */}
        <div className="bg-white border border-[#DCE5E8] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <SchoolLogo
              logoUrl={schoolIdentity?.logoUrl}
              schoolName={schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'}
              size="lg"
              variant="light"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#71818A]">
                <span className="font-semibold text-[#24485A] bg-[#F0F5F7] border border-[#DCE5E8] px-2.5 py-0.5 rounded-md">
                  {isKepsek ? 'Dashboard Kepala Sekolah' : 'Dashboard Administrator'}
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-[#24343D]">
                  {schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'}
                </span>
                <span>&bull;</span>
                <span>{todayFormatted}</span>
                <span>&bull;</span>
                <span className="font-medium text-[#24343D]">{activeYearDisplay}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#24343D] mt-1.5 tracking-tight">
                Selamat datang, {currentUser?.name || (isKepsek ? 'Kepala Sekolah' : 'Administrator')}
              </h1>
              <p className="text-[13px] text-[#71818A] mt-0.5">
                Ringkasan kondisi Akademik, Kesantrian, dan ATK &amp; Persediaan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => refreshAll()}
              disabled={loading}
              title="Segarkan data dari database Firestore"
              className="px-3.5 py-2 text-xs font-semibold text-[#24343D] bg-[#F4F7F8] hover:bg-[#EBF0F2] border border-[#DCE5E8] rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#5D8295] ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
            </button>
            <button
              onClick={() => onNavigate('academic-calendar')}
              className="px-3.5 py-2 text-xs font-semibold text-[#24343D] bg-[#F4F7F8] hover:bg-[#EBF0F2] border border-[#DCE5E8] rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#5D8295]" />
              Kalender Akademik
            </button>
            <button
              onClick={() => onNavigate(isKepsek ? 'scores' : 'users')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isKepsek ? 'Pantau Penilaian' : 'Pengguna & Role'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Diagnostic notification if Firestore connection error occurred */}
        {dataError && (
          <div className="bg-[#FFF8F0] border border-[#F0D5BA] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#8A4A1C]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#8A4A1C]">Pemberitahuan Sinkronisasi Database Firestore</p>
                <p className="text-[#A45920] mt-0.5">{dataError}</p>
              </div>
            </div>
            <button
              onClick={() => refreshAll()}
              className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
          </div>
        )}

        {/* =====================================================
            STATISTIK UTAMA (4 Kartu Kecil — Putih & Konsisten)
           ===================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate('students')}
            className="text-left bg-white border border-[#DCE5E8] hover:border-[#5D8295] rounded-xl p-4 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#71818A]">Total Siswa/Santri</span>
              <GraduationCap className="w-4 h-4 text-[#5D8295]" />
            </div>
            {loading ? (
              <div className="space-y-2 mt-2">
                <div className="h-7 w-16 bg-[#E8EEF0] animate-pulse rounded" />
                <div className="h-3 w-28 bg-[#E8EEF0] animate-pulse rounded" />
              </div>
            ) : dataError && totalStudents === 0 ? (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#A45920] font-mono tabular-nums mt-2 leading-none">—</div>
                <div className="text-[11px] text-[#A45920] mt-2">Gagal membaca data santri</div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#24343D] font-mono tabular-nums mt-2 leading-none">
                  {activeStudents}
                </div>
                <div className="text-[11px] text-[#71818A] mt-2">
                  Santri aktif dari {totalStudents} terdaftar
                </div>
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('teachers')}
            className="text-left bg-white border border-[#DCE5E8] hover:border-[#5D8295] rounded-xl p-4 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#71818A]">Total Guru</span>
              <Users className="w-4 h-4 text-[#5D8295]" />
            </div>
            {loading ? (
              <div className="space-y-2 mt-2">
                <div className="h-7 w-16 bg-[#E8EEF0] animate-pulse rounded" />
                <div className="h-3 w-28 bg-[#E8EEF0] animate-pulse rounded" />
              </div>
            ) : dataError && totalTeachers === 0 ? (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#A45920] font-mono tabular-nums mt-2 leading-none">—</div>
                <div className="text-[11px] text-[#A45920] mt-2">Gagal membaca data guru</div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#24343D] font-mono tabular-nums mt-2 leading-none">
                  {activeTeachers}
                </div>
                <div className="text-[11px] text-[#71818A] mt-2">
                  Pendidik aktif ({totalTeachers} terdaftar)
                </div>
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('classes')}
            className="text-left bg-white border border-[#DCE5E8] hover:border-[#5D8295] rounded-xl p-4 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#71818A]">Total Kelas</span>
              <DoorOpen className="w-4 h-4 text-[#5D8295]" />
            </div>
            {loading ? (
              <div className="space-y-2 mt-2">
                <div className="h-7 w-16 bg-[#E8EEF0] animate-pulse rounded" />
                <div className="h-3 w-28 bg-[#E8EEF0] animate-pulse rounded" />
              </div>
            ) : dataError && totalClasses === 0 ? (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#A45920] font-mono tabular-nums mt-2 leading-none">—</div>
                <div className="text-[11px] text-[#A45920] mt-2">Gagal membaca data kelas</div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#24343D] font-mono tabular-nums mt-2 leading-none">
                  {activeClasses}
                </div>
                <div className="text-[11px] text-[#71818A] mt-2">
                  Rombongan belajar aktif
                </div>
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('subjects')}
            className="text-left bg-white border border-[#DCE5E8] hover:border-[#5D8295] rounded-xl p-4 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#71818A]">Total Mata Pelajaran</span>
              <BookOpen className="w-4 h-4 text-[#5D8295]" />
            </div>
            {loading ? (
              <div className="space-y-2 mt-2">
                <div className="h-7 w-16 bg-[#E8EEF0] animate-pulse rounded" />
                <div className="h-3 w-28 bg-[#E8EEF0] animate-pulse rounded" />
              </div>
            ) : dataError && totalSubjects === 0 ? (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#A45920] font-mono tabular-nums mt-2 leading-none">—</div>
                <div className="text-[11px] text-[#A45920] mt-2">Gagal membaca data mapel</div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-[28px] font-bold text-[#24343D] font-mono tabular-nums mt-2 leading-none">
                  {activeSubjects}
                </div>
                <div className="text-[11px] text-[#71818A] mt-2">
                  Mata pelajaran kurikulum aktif
                </div>
              </>
            )}
          </button>
        </div>

        {/* =====================================================
            PERLU PERHATIAN & AKTIVITAS TERBARU (Section 5)
           ===================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Panel Kiri: PERLU PERHATIAN (Compact List) */}
          <div className="lg:col-span-5 bg-white border border-[#DCE5E8] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE5E8] flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#24343D]">Perlu Perhatian</h2>
                <p className="text-[11px] text-[#71818A] mt-0.5">
                  Indikator yang membutuhkan tindak lanjut segera
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-[#F4F7F8] text-[#24343D] border border-[#DCE5E8]">
                {attentionItems.length} item
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#71818A] flex flex-col items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#5D9B7A]" />
                <span>Seluruh indikator operasional dalam kondisi terkendali.</span>
              </div>
            ) : (
              <div className="divide-y divide-[#EBF0F2]">
                {attentionItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.targetTab)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F4F7F8] transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.severity === 'danger' ? 'bg-[#C96A6A]' : 'bg-[#D6A64A]'
                        }`}
                      />
                      <span className="text-[13px] font-medium text-[#24343D] truncate">
                        {item.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-medium text-[#71818A] px-2 py-0.5 rounded bg-[#F4F7F8] border border-[#DCE5E8]">
                        {item.moduleLabel}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#71818A] group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel Kanan: AKTIVITAS TERBARU (Clean Table) */}
          <div className="lg:col-span-7 bg-white border border-[#DCE5E8] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE5E8] flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-bold text-[#24343D]">Aktivitas Terbaru</h2>
                <p className="text-[11px] text-[#71818A] mt-0.5">
                  Log pembaruan lintas modul Akademik, Kesantrian, dan ATK
                </p>
              </div>
              <Activity className="w-4 h-4 text-[#5D8295]" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7F8] text-[#71818A] border-b border-[#DCE5E8] uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 whitespace-nowrap">Tanggal</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Jenis</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Pengguna</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF0F2] text-[13px]">
                  {recentActivities.map((act) => (
                    <tr
                      key={act.id}
                      onClick={() => onNavigate(act.targetTab)}
                      className="hover:bg-[#F4F7F8] transition cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-mono text-xs text-[#71818A] whitespace-nowrap">
                        {act.dateLabel}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-[#24485A] text-xs">{act.type}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[#24343D] font-medium max-w-[240px] truncate">
                        {act.description}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#71818A] whitespace-nowrap">
                        {act.actor}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {renderSemanticBadge(act.status, act.statusTone)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* =====================================================
            6. SECTION AKADEMIK (Ringkas, Grafik & Agenda)
           ===================================================== */}
        <section className="bg-white border border-[#DCE5E8] rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DCE5E8] pb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#24343D]">Monitoring Akademik</h2>
              <p className="text-xs text-[#71818A] mt-0.5">
                Perkembangan kelengkapan penilaian per kelas dan jadwal agenda akademik terdekat
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('scores')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#24485A] bg-[#F0F5F7] hover:bg-[#DCE5E8] transition cursor-pointer"
              >
                Penilaian
              </button>
              <button
                onClick={() => onNavigate('report-cards')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#24485A] bg-[#F0F5F7] hover:bg-[#DCE5E8] transition cursor-pointer"
              >
                Raport
              </button>
              <button
                onClick={() => onNavigate('students')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Data Siswa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Ringkasan Akademik Compact */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8]">
              <div className="text-[11px] font-medium text-[#71818A]">Total Siswa Aktif</div>
              <div className="text-xl font-bold text-[#24343D] font-mono tabular-nums mt-1">
                {activeStudents}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8]">
              <div className="text-[11px] font-medium text-[#71818A]">Total Guru Aktif</div>
              <div className="text-xl font-bold text-[#24343D] font-mono tabular-nums mt-1">
                {activeTeachers}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8]">
              <div className="text-[11px] font-medium text-[#71818A]">Total Kelas</div>
              <div className="text-xl font-bold text-[#24343D] font-mono tabular-nums mt-1">
                {activeClasses}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#71818A]">Nilai Belum Lengkap</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    incompleteScoreStats.incompleteAssignmentCount > 0
                      ? 'bg-[#D6A64A]'
                      : 'bg-[#5D9B7A]'
                  }`}
                />
              </div>
              <div className="text-xl font-bold text-[#24343D] font-mono tabular-nums mt-1">
                {incompleteScoreStats.incompleteAssignmentCount}{' '}
                <span className="text-xs font-sans font-normal text-[#71818A]">mapel</span>
              </div>
            </div>
          </div>

          {/* Grafik Kelengkapan Nilai per Kelas & Agenda Akademik Terdekat */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Grafik Perkembangan Nilai & Kelengkapan per Kelas */}
            <div className="lg:col-span-7 border border-[#DCE5E8] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#24343D] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#24485A]" />
                    <span>Grafik Kelengkapan &amp; Rata-Rata Nilai per Kelas</span>
                  </h3>
                  <p className="text-[11px] text-[#71818A]">
                    Persentase ketuntasan input nilai guru dan rata-rata capaian siswa
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {classAcademicProgress.slice(0, 6).map((cls) => (
                  <div key={cls.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#24343D]">
                        Kelas {cls.name}{' '}
                        <span className="text-[#71818A] font-normal">
                          ({cls.studentCount} santri)
                        </span>
                      </span>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-[#71818A]">
                          Rata-rata: <strong className="text-[#24343D]">{cls.avgScore || '-'}</strong>
                        </span>
                        <span className="font-semibold text-[#24485A] w-10 text-right">
                          {cls.completionPct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#F4F7F8] rounded-full overflow-hidden border border-[#DCE5E8]/60">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(4, cls.completionPct)}%`,
                          backgroundColor:
                            cls.completionPct >= 80
                              ? '#5D9B7A'
                              : cls.completionPct >= 50
                              ? '#24485A'
                              : '#D6A64A',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kalender & Agenda Akademik Terdekat */}
            <div className="lg:col-span-5 border border-[#DCE5E8] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#24343D]">Agenda Akademik Terdekat</h3>
                  <p className="text-[11px] text-[#71818A]">Jadwal kegiatan dari Kalender Akademik</p>
                </div>
                <button
                  onClick={() => onNavigate('academic-calendar')}
                  className="text-xs font-semibold text-[#24485A] hover:underline cursor-pointer"
                >
                  Semua Agenda &rarr;
                </button>
              </div>

              {upcomingCalendarAgendas.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#71818A]">
                  Belum ada agenda terdekat yang terjadwal.
                </div>
              ) : (
                <div className="divide-y divide-[#EBF0F2]">
                  {upcomingCalendarAgendas.map((ev) => {
                    const { isToday, daysUntil } = resolveEventEffectiveStatus(ev, todayIso);
                    const badgeLabel = isToday
                      ? 'Hari Ini'
                      : daysUntil === 1
                      ? 'Besok'
                      : daysUntil > 1
                      ? `${daysUntil} hari lagi`
                      : 'Berlangsung';
                    return (
                      <button
                        key={ev.id}
                        onClick={() => onNavigate('academic-calendar')}
                        className="w-full text-left py-2.5 first:pt-1 last:pb-1 hover:bg-[#F4F7F8] rounded-lg px-2 -mx-2 transition flex items-start justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#24343D] truncate">
                            {ev.title}
                          </div>
                          <div className="text-[11px] text-[#71818A] mt-0.5 truncate">
                            {formatEventDateRange(ev.startDate, ev.endDate)} &bull; {ev.category}
                          </div>
                        </div>
                        <span className="shrink-0">
                          {renderSemanticBadge(badgeLabel, isToday ? 'warning' : 'info')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            7. SECTION KESANTRIAN (Monitoring Statistik & Tabel)
           ===================================================== */}
        <section className="bg-white border border-[#DCE5E8] rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DCE5E8] pb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#24343D]">Monitoring Kesantrian</h2>
              <p className="text-xs text-[#71818A] mt-0.5">
                Pemantauan kesehatan santri, perizinan pulang, kedisiplinan, dan kepulangan Mabit
              </p>
            </div>
            <button
              onClick={() => onNavigate('kesantrian-dashboard')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] transition inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
            >
              <span>Buka Modul Kesantrian</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5 Statistik Kesantrian — Clean White Cards with Semantic Status Dots */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <button
              onClick={() => onNavigate('kesantrian-sakit')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Santri Sakit</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    kesantrianStats.sakitActiveCount > 0 ? 'bg-[#D6A64A]' : 'bg-[#5D9B7A]'
                  }`}
                />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {kesantrianStats.sakitActiveCount}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                {kesantrianStats.sakitLongDurationCount > 0
                  ? `${kesantrianStats.sakitLongDurationCount} sakit ≥ 3 hari`
                  : `${kesantrianStats.sakitTotalCount} total catatan`}
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-izin')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Izin/Pulang</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    kesantrianStats.izinOverdueCount > 0
                      ? 'bg-[#C96A6A]'
                      : kesantrianStats.izinActiveCount > 0
                      ? 'bg-[#6C91A8]'
                      : 'bg-[#5D9B7A]'
                  }`}
                />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {kesantrianStats.izinActiveCount}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                {kesantrianStats.izinOverdueCount > 0
                  ? `${kesantrianStats.izinOverdueCount} terlambat kembali`
                  : 'Sedang izin keluar/pulang'}
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-pelanggaran')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Pelanggaran</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    kesantrianStats.pelanggaranPendingCount > 0 ? 'bg-[#D6A64A]' : 'bg-[#5D9B7A]'
                  }`}
                />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {kesantrianStats.pelanggaranTotalCount}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                {kesantrianStats.pelanggaranPendingCount} perlu pembinaan
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-mabit')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Mabit Belum Kembali</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    kesantrianStats.mabitBelumKembali > 0 ? 'bg-[#D6A64A]' : 'bg-[#5D9B7A]'
                  }`}
                />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {kesantrianStats.mabitBelumKembali}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1 truncate">
                {kesantrianStats.mabitPeriodName || 'Periode Mabit aktif'}
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-dashboard')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Perlu Tindak Lanjut</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    kesantrianStats.perluPerhatianCount > 0 ? 'bg-[#C96A6A]' : 'bg-[#5D9B7A]'
                  }`}
                />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {kesantrianStats.perluPerhatianCount}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                Total kasus dipantau
              </div>
            </button>
          </div>

          {/* Tabel Kejadian Kesantrian Terbaru: Santri | Kejadian | Tanggal | Petugas | Status */}
          <div className="border border-[#DCE5E8] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7F8] text-[#71818A] border-b border-[#DCE5E8] uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Santri</th>
                    <th className="py-2.5 px-3">Kejadian</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Tanggal</th>
                    <th className="py-2.5 px-3">Petugas</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF0F2] text-[13px]">
                  {activeKesantrianRecords.slice(0, 5).map((rec) => {
                    const st = students.find((s) => s.id === rec.studentId);
                    const cls = classes.find((c) => c.id === (st?.classId || rec.classId));
                    const isDone =
                      rec.status === 'Selesai' ||
                      rec.status === 'Sudah Sembuh' ||
                      rec.status === 'Sudah Kembali' ||
                      rec.status === 'Sudah Kembali ke Pesantren';
                    const isAlert =
                      rec.status === 'Belum Ditangani' ||
                      rec.status === 'Terlambat Kembali' ||
                      rec.status === 'Perlu Dijemput Orang Tua';

                    return (
                      <tr
                        key={rec.id}
                        onClick={() =>
                          onNavigate(
                            rec.type === 'SAKIT'
                              ? 'kesantrian-sakit'
                              : rec.type === 'IZIN_PULANG'
                              ? 'kesantrian-izin'
                              : 'kesantrian-pelanggaran'
                          )
                        }
                        className="hover:bg-[#F4F7F8] transition cursor-pointer"
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-[#24343D]">
                            {st?.name || rec.studentName || '-'}
                          </div>
                          <div className="text-[11px] text-[#71818A]">
                            Kelas {cls?.name || rec.className || '-'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-[#24343D]">{rec.title}</div>
                          <div className="text-[11px] text-[#71818A]">{rec.type}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[#71818A] whitespace-nowrap">
                          {formatShortDate(rec.date)}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[#71818A]">
                          {rec.recordedByName || rec.createdByName || 'Petugas Kesantrian'}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {renderSemanticBadge(
                            rec.status || 'Tercatat',
                            isDone ? 'success' : isAlert ? 'danger' : 'warning'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =====================================================
            8. SECTION ATK & PERSEDIAAN (Inventory Management Style)
           ===================================================== */}
        <section className="bg-white border border-[#DCE5E8] rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DCE5E8] pb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#24343D]">
                ATK &amp; Persediaan Kantor
              </h2>
              <p className="text-xs text-[#71818A] mt-0.5">
                Manajemen inventaris barang kantor, grafik ketersediaan stok, dan mutasi barang terbaru
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigate('atk-requests')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#24485A] bg-[#F0F5F7] hover:bg-[#DCE5E8] transition cursor-pointer"
              >
                Permintaan ATK ({atkStats.permintaanMenunggu})
              </button>
              <button
                onClick={() => onNavigate('atk-dashboard')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Kelola Persediaan</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 6 Kartu Statistik ATK — Clean White Surface */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <button
              onClick={() => onNavigate('atk-items')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="text-xs font-medium text-[#71818A]">Total Jenis Barang</div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {atkStats.totalJenis}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Master barang aktif</div>
            </button>

            <button
              onClick={() => onNavigate('atk-items')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Stok Aman</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#5D9B7A]" />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {atkStats.stokAman}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Di atas batas minimum</div>
            </button>

            <button
              onClick={() => onNavigate('atk-items')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Stok Menipis</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#D6A64A]" />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {atkStats.stokMenipis}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">&le; batas minimum</div>
            </button>

            <button
              onClick={() => onNavigate('atk-restock')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Stok Habis</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#C96A6A]" />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {atkStats.habis}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Stok saat ini = 0</div>
            </button>

            <button
              onClick={() => onNavigate('atk-requests')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Permintaan Menunggu</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#6C91A8]" />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {atkStats.permintaanMenunggu}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Menunggu persetujuan</div>
            </button>

            <button
              onClick={() => onNavigate('atk-restock')}
              className="text-left p-4 rounded-xl bg-white border border-[#DCE5E8] hover:border-[#5D8295] transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Perlu Pengadaan</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#C96A6A]" />
              </div>
              <div className="text-2xl font-bold text-[#24343D] font-mono tabular-nums mt-2">
                {atkStats.perluPengadaan}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Rekomendasi beli</div>
            </button>
          </div>

          {/* GRAFIK STOK & DAFTAR BARANG YANG PERLU PERHATIAN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Grafik Stok */}
            <div className="lg:col-span-7 border border-[#DCE5E8] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#24343D]">Grafik Ketersediaan Stok Barang</h3>
                  <p className="text-[11px] text-[#71818A]">
                    Perbandingan jumlah stok saat ini terhadap batas stok minimum
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#71818A]">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#5D9B7A]" /> Aman
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#D6A64A]" /> Menipis
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#C96A6A]" /> Habis
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {activeAtkItems.slice(0, 6).map((item) => {
                  const st = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);
                  const maxScale = Math.max(item.stokMinimum * 3, item.stokSaatIni, 10);
                  const pct = Math.min(100, Math.round((item.stokSaatIni / maxScale) * 100));
                  const barColor =
                    st === 'Habis'
                      ? '#C96A6A'
                      : st === 'Stok Menipis'
                      ? '#D6A64A'
                      : '#5D9B7A';

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#24343D] truncate">{item.name}</span>
                        <span className="font-mono text-xs text-[#71818A] shrink-0">
                          Stok: <strong className="text-[#24343D]">{item.stokSaatIni}</strong> / Min:{' '}
                          {item.stokMinimum} {item.unit}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F4F7F8] rounded-full overflow-hidden border border-[#DCE5E8]/60">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${ item.stokSaatIni === 0 ? 3 : Math.max(6, pct) }%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daftar Barang yang Perlu Perhatian */}
            <div className="lg:col-span-5 border border-[#DCE5E8] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#24343D]">
                    Daftar Barang yang Perlu Perhatian
                  </h3>
                  <p className="text-[11px] text-[#71818A]">
                    Barang dengan status stok habis atau menipis
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('atk-restock')}
                  className="text-xs font-semibold text-[#24485A] hover:underline cursor-pointer"
                >
                  Pengadaan &rarr;
                </button>
              </div>

              {atkStats.attentionItemsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71818A]">
                  Seluruh barang ATK berada di atas batas stok minimum.
                </div>
              ) : (
                <div className="divide-y divide-[#EBF0F2]">
                  {atkStats.attentionItemsList.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate('atk-restock')}
                      className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F4F7F8] rounded-lg px-2 -mx-2 transition"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#24343D] truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[#71818A] font-mono mt-0.5">
                          Stok: <strong className="text-[#24343D]">{item.stokSaatIni} {item.unit}</strong> &bull; Minimum: {item.stokMinimum} {item.unit}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {renderSemanticBadge(
                          item.status === 'Habis' ? 'Habis' : 'Menipis',
                          item.status === 'Habis' ? 'danger' : 'warning'
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Barang Masuk Terbaru & Barang Keluar Terbaru */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Barang Masuk Terbaru */}
            <div className="border border-[#DCE5E8] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#F4F7F8] border-b border-[#DCE5E8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#24343D] flex items-center gap-1.5">
                  <ArrowDownCircle className="w-3.5 h-3.5 text-[#5D9B7A]" />
                  Barang Masuk Terbaru
                </span>
                <button
                  onClick={() => onNavigate('atk-incoming')}
                  className="text-[11px] font-semibold text-[#24485A] hover:underline cursor-pointer"
                >
                  + Catat Masuk
                </button>
              </div>
              <div className="divide-y divide-[#EBF0F2] text-xs">
                {recentIncomingAtk.length === 0 ? (
                  <div className="p-4 text-center text-[#71818A]">Belum ada riwayat barang masuk.</div>
                ) : (
                  recentIncomingAtk.map((trx) => (
                    <div
                      key={trx.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#24343D] truncate">{trx.itemName}</div>
                        <div className="text-[11px] text-[#71818A] truncate">
                          {formatShortDate(trx.tanggal)} &bull; {trx.sumberBarang || 'Pengadaan'}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[#5D9B7A] shrink-0">
                        +{trx.jumlah} {trx.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Barang Keluar Terbaru */}
            <div className="border border-[#DCE5E8] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#F4F7F8] border-b border-[#DCE5E8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#24343D] flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5 text-[#5D8295]" />
                  Barang Keluar Terbaru
                </span>
                <button
                  onClick={() => onNavigate('atk-outgoing')}
                  className="text-[11px] font-semibold text-[#24485A] hover:underline cursor-pointer"
                >
                  + Catat Keluar
                </button>
              </div>
              <div className="divide-y divide-[#EBF0F2] text-xs">
                {recentOutgoingAtk.length === 0 ? (
                  <div className="p-4 text-center text-[#71818A]">Belum ada riwayat barang keluar.</div>
                ) : (
                  recentOutgoingAtk.map((trx) => (
                    <div
                      key={trx.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#24343D] truncate">{trx.itemName}</div>
                        <div className="text-[11px] text-[#71818A] truncate">
                          {formatShortDate(trx.tanggal)} &bull; Penerima: {trx.penerimaNama || '-'}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[#24343D] shrink-0">
                        -{trx.jumlah} {trx.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // RENDER UNTUK WALI KELAS & GURU MAPEL (Consistent Professional Design)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-[#DCE5E8] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <SchoolLogo
            logoUrl={schoolIdentity?.logoUrl}
            schoolName={schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'}
            size="lg"
            variant="light"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#71818A]">
              <span className="font-semibold text-[#24485A] bg-[#F0F5F7] border border-[#DCE5E8] px-2.5 py-0.5 rounded-md">
                {role === 'WALI_KELAS' ? 'Dashboard Wali Kelas' : 'Dashboard Guru Mata Pelajaran'}
              </span>
              <span>&bull;</span>
              <span className="font-semibold text-[#24343D]">
                {schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'}
              </span>
              <span>&bull;</span>
              <span>{todayFormatted}</span>
              <span>&bull;</span>
              <span className="font-medium text-[#24343D]">{activeYearDisplay}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#24343D] mt-1.5 tracking-tight">
              Selamat datang, {currentUser?.name}
            </h1>
            <p className="text-[13px] text-[#71818A] mt-0.5">
              {role === 'WALI_KELAS'
                ? `Monitoring kemajuan belajar, presensi, dan catatan raport siswa kelas ${homeroomClass?.name || 'Binaan'}.`
                : 'Kelola kegiatan belajar mengajar, input nilai siswa, dan absensi mata pelajaran.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => onNavigate('attendance')}
            className="px-3.5 py-2 text-xs font-semibold text-[#24343D] bg-[#F4F7F8] hover:bg-[#EBF0F2] border border-[#DCE5E8] rounded-lg transition cursor-pointer"
          >
            Absensi Siswa
          </button>
          <button
            onClick={() => onNavigate('scores')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] rounded-lg transition cursor-pointer"
          >
            Input Nilai
          </button>
        </div>
      </div>

      {/* WALI KELAS DASHBOARD */}
      {role === 'WALI_KELAS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Kelas Binaan</span>
              <div className="mt-2 text-2xl font-bold text-[#24343D] font-mono">
                {homeroomClass?.name || 'VII-A'}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Rombongan belajar aktif</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Jumlah Santri</span>
              <div className="mt-2 text-2xl font-bold text-[#24343D] font-mono tabular-nums">
                {homeroomStudents.length}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                Santri aktif kelas {homeroomClass?.name}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Kehadiran Hari Ini</span>
              <div className="mt-2 text-2xl font-bold text-[#5D9B7A] font-mono tabular-nums">
                {homeroomAttendanceRate}%
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                {homeroomAttendanceToday.length} dari {homeroomStudents.length} hadir
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Nilai Belum Lengkap</span>
              <div className="mt-2 text-2xl font-bold text-[#D6A64A] font-mono tabular-nums">
                {incompleteScoreStats.incompleteAssignmentCount} Mapel
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Klik Penilaian untuk detail</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#DCE5E8] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE5E8] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#24343D]">
                  Daftar Presensi Santri Kelas {homeroomClass?.name}
                </h3>
                <p className="text-xs text-[#71818A]">Data terhubung dengan tabel absensi kelas</p>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs font-semibold text-[#24485A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Buka Rekap Lengkap <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7F8] text-[#71818A] uppercase font-semibold text-[11px] border-b border-[#DCE5E8]">
                  <tr>
                    <th className="py-2.5 px-4">NIS</th>
                    <th className="py-2.5 px-3">Nama Santri</th>
                    <th className="py-2.5 px-3">L/P</th>
                    <th className="py-2.5 px-4 text-right">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF0F2] text-[13px]">
                  {homeroomStudents.map((st) => {
                    const att = attendance.find((a) => a.studentId === st.id);
                    const status = att?.status || 'Hadir';
                    const tone =
                      status === 'Hadir'
                        ? 'success'
                        : status === 'Sakit' || status === 'Izin'
                        ? 'warning'
                        : 'danger';

                    return (
                      <tr key={st.id} className="hover:bg-[#F4F7F8]">
                        <td className="py-2.5 px-4 font-mono text-xs text-[#71818A]">{st.nis}</td>
                        <td className="py-2.5 px-3 font-medium text-[#24343D]">{st.name}</td>
                        <td className="py-2.5 px-3 text-[#71818A]">{st.gender}</td>
                        <td className="py-2.5 px-4 text-right">
                          {renderSemanticBadge(status, tone)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GURU MAPEL DASHBOARD */}
      {role === 'GURU_MAPEL' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Kelas Diampu</span>
              <div className="mt-2 text-2xl font-bold text-[#24343D] truncate">
                {myClasses.length > 0 ? myClasses.map((c) => c.name).join(', ') : 'Belum Ada'}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">{myClasses.length} rombel aktif</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Mata Pelajaran</span>
              <div className="mt-2 text-xl font-bold text-[#24343D] truncate">
                {mySubjects.length > 0 ? mySubjects.map((s) => s.name).join(', ') : 'Belum Ada'}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                {mySubjects.length} mata pelajaran terdaftar
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Total Santri Diajar</span>
              <div className="mt-2 text-2xl font-bold text-[#24343D] font-mono tabular-nums">
                {myStudentsCount}
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Dalam rombel yang diajar</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#DCE5E8]">
              <span className="text-xs font-medium text-[#71818A]">Total Beban Mengajar</span>
              <div className="mt-2 text-2xl font-bold text-[#24485A] font-mono tabular-nums">
                {myAssignments.reduce((acc, a) => acc + (a.totalHoursPerWeek || 0), 0)} Jam
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">Tatap muka per minggu</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#DCE5E8] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE5E8] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#24343D]">
                  Penugasan Mengajar Semester Ini
                </h3>
                <p className="text-xs text-[#71818A]">Jadwal dan beban tatap muka per minggu</p>
              </div>
              <button
                onClick={() => onNavigate('scores')}
                className="text-xs font-semibold text-[#24485A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Kelola Nilai <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F7F8] text-[#71818A] uppercase font-semibold text-[11px] border-b border-[#DCE5E8]">
                  <tr>
                    <th className="py-2.5 px-4">Kelas</th>
                    <th className="py-2.5 px-3">Mata Pelajaran</th>
                    <th className="py-2.5 px-3">Jam / Minggu</th>
                    <th className="py-2.5 px-3">Tahun Ajaran</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF0F2] text-[13px]">
                  {myAssignments.map((asg) => {
                    const cls = classes.find((c) => c.id === asg.classId);
                    const subj = subjects.find((s) => s.id === asg.subjectId);
                    const asgYear = academicYears.find((ay) => ay.id === asg.academicYearId);

                    return (
                      <tr key={asg.id} className="hover:bg-[#F4F7F8]">
                        <td className="py-2.5 px-4 font-semibold text-[#24343D]">
                          {cls?.name || asg.classId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#24485A]">
                          {subj?.name || asg.subjectId}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[#71818A]">
                          {asg.totalHoursPerWeek} JP
                        </td>
                        <td className="py-2.5 px-3 text-xs text-[#71818A]">
                          {asgYear ? asgYear.name : activeAcademicYear?.name || '2026/2027'} (
                          {asg.semester || activeAcademicYear?.semester || 'Ganjil'})
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => onNavigate('scores')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F0F5F7] text-[#24485A] hover:bg-[#DCE5E8] transition cursor-pointer"
                          >
                            Input Nilai
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Agenda Terdekat & Ringkasan Permintaan ATK untuk Guru / Wali Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Agenda Terdekat */}
        <div className="bg-white rounded-xl border border-[#DCE5E8] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DCE5E8] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#24343D]">Agenda Akademik Terdekat</h3>
              <p className="text-xs text-[#71818A]">Jadwal kegiatan dari Kalender Akademik</p>
            </div>
            <button
              onClick={() => onNavigate('academic-calendar')}
              className="text-xs font-semibold text-[#24485A] hover:underline cursor-pointer"
            >
              Lihat Kalender &rarr;
            </button>
          </div>
          {upcomingCalendarAgendas.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#71818A]">
              Belum ada agenda terdekat yang terjadwal.
            </div>
          ) : (
            <div className="divide-y divide-[#EBF0F2]">
              {upcomingCalendarAgendas.map((ev) => {
                const { isToday, daysUntil } = resolveEventEffectiveStatus(ev, todayIso);
                const badgeLabel = isToday
                  ? 'Hari Ini'
                  : daysUntil === 1
                  ? 'Besok'
                  : daysUntil > 1
                  ? `${daysUntil} hari lagi`
                  : 'Berlangsung';
                return (
                  <button
                    key={ev.id}
                    onClick={() => onNavigate('academic-calendar')}
                    className="w-full text-left py-2.5 first:pt-1 last:pb-1 hover:bg-[#F4F7F8] rounded-lg px-2 -mx-2 transition flex items-start justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#24343D] truncate">{ev.title}</div>
                      <div className="text-[11px] text-[#71818A] mt-0.5 truncate">
                        {formatEventDateRange(ev.startDate, ev.endDate)} &bull; {ev.category}
                      </div>
                    </div>
                    <span className="shrink-0">
                      {renderSemanticBadge(badgeLabel, isToday ? 'warning' : 'info')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Ringkasan Permintaan ATK Guru */}
        <div className="bg-white rounded-xl border border-[#DCE5E8] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCE5E8] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#24343D]">Permintaan ATK Saya</h3>
              <p className="text-xs text-[#71818A]">
                Status pengajuan kebutuhan alat tulis kantor mengajar
              </p>
            </div>
            <button
              onClick={() => onNavigate('atk-requests')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] rounded-lg transition cursor-pointer"
            >
              Ajukan ATK
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8]">
              <div className="text-[11px] font-medium text-[#71818A]">Menunggu</div>
              <div className="text-xl font-bold text-[#24343D] font-mono tabular-nums mt-1">
                {
                  atkRequests.filter(
                    (r) =>
                      (r.pemohonId === currentUser?.id || r.pemohonNama === currentUser?.name) &&
                      r.status === 'Menunggu'
                  ).length
                }
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8]">
              <div className="text-[11px] font-medium text-[#71818A]">Disetujui</div>
              <div className="text-xl font-bold text-[#5D9B7A] font-mono tabular-nums mt-1">
                {
                  atkRequests.filter(
                    (r) =>
                      (r.pemohonId === currentUser?.id || r.pemohonNama === currentUser?.name) &&
                      r.status === 'Disetujui'
                  ).length
                }
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8]">
              <div className="text-[11px] font-medium text-[#71818A]">Diberikan</div>
              <div className="text-xl font-bold text-[#24485A] font-mono tabular-nums mt-1">
                {
                  atkRequests.filter(
                    (r) =>
                      (r.pemohonId === currentUser?.id || r.pemohonNama === currentUser?.name) &&
                      r.status === 'Sudah Diberikan'
                  ).length
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
