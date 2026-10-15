import React, { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import {
  Halaqah,
  HalaqahMonthlyReport,
  HalaqahReportStatus,
  UserRole,
  UserProfile,
  Student,
  hasRole,
  hasAnyRole,
  isAuthorizedForHalaqah,
  getUserRoles
} from '../types';
import {
  QURAN_SURAHS,
  HADITH_BOOKS,
  HADITH_CATALOG,
  getSurahByNumber,
  getJuzFromSurahAyah,
  getJuzFromPage,
  getHadithBookByName,
  calculateQuranProgress,
  calculateHadithProgress
} from '../lib/quranData';
import {
  BookOpen,
  Award,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  BookmarkCheck,
  UserCheck,
  HelpCircle,
  Trophy,
  Medal,
  ChevronDown,
  History
} from 'lucide-react';

interface HalaqahReportViewProps {
  userRole?: UserRole;
  initialTab?: 'reports' | 'awards' | 'history' | 'manage_halaqah';
  onNavigate?: (tab: string) => void;
}

const MONTH_NAMES = [
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
  'Desember'
];

export const HalaqahReportView: React.FC<HalaqahReportViewProps> = ({ userRole, initialTab, onNavigate }) => {
  const { currentUser, role } = useAuth();
  const effectiveRole = userRole || role;

  const {
    academicYears,
    activeAcademicYear,
    teachers,
    classes,
    students,
    halaqahs,
    halaqahMonthlyReports,
    users,
    saveUser,
    saveHalaqah,
    deleteHalaqah,
    saveHalaqahMonthlyReport,
    deleteHalaqahMonthlyReport,
    verifyHalaqahMonthlyReport,
    schoolIdentity
  } = useMasterData();

  // Role Checks
  const isExecutive = hasAnyRole(currentUser, ['ADMIN', 'MUDIR', 'KEPALA_SEKOLAH', 'KEPALA_KESANTRIAN']);
  const isPengampu = hasRole(currentUser, 'PENGAMPU_HALAQAH');

  // Active Year & Selected Period
  const [selectedYearId, setSelectedYearId] = useState<string>(activeAcademicYear?.id || 'ay_2026_2027_1');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Filter Pengampu (Ustadz Pengampu)
  const [selectedPengampuFilter, setSelectedPengampuFilter] = useState<string>('ALL');

  // Unique list of Pengampu from halaqahs & teachers
  const pengampuOptions = useMemo(() => {
    const map = new Map<string, string>();
    halaqahs.forEach((h) => {
      if (h.pengampuName) {
        map.set(h.pengampuTeacherId || h.pengampuName, h.pengampuName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [halaqahs]);

  // Filter halaqah list according to user's assigned halaqah and pengampu filter
  const availableHalaqahs = useMemo(() => {
    let list = halaqahs;
    if (!isExecutive) {
      list = halaqahs.filter((h) => isAuthorizedForHalaqah(currentUser, h, teachers).authorized);
    } else if (selectedPengampuFilter !== 'ALL') {
      list = halaqahs.filter(
        (h) => h.pengampuTeacherId === selectedPengampuFilter || h.pengampuName === selectedPengampuFilter
      );
    }
    return list;
  }, [halaqahs, isExecutive, currentUser, teachers, selectedPengampuFilter]);

  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');

  // Default selection when halaqahs load
  useEffect(() => {
    if (availableHalaqahs.length > 0) {
      if (!selectedHalaqahId || !availableHalaqahs.some((h) => h.id === selectedHalaqahId)) {
        setSelectedHalaqahId(availableHalaqahs[0].id);
      }
    } else {
      setSelectedHalaqahId('');
    }
  }, [availableHalaqahs, selectedHalaqahId]);

  const currentHalaqah = useMemo(() => {
    return halaqahs.find((h) => h.id === selectedHalaqahId) || null;
  }, [halaqahs, selectedHalaqahId]);

  // Active Tab: 'reports' | 'awards' | 'history' | 'manage_halaqah'
  const [activeTab, setActiveTab] = useState<'reports' | 'awards' | 'history' | 'manage_halaqah'>(
    initialTab || 'reports'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Non-blocking in-app notification state (replaces window.alert for iframe compatibility)
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setActionToast({ type, message });
    setTimeout(() => {
      setActionToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Halaqah Management State (Admin, Mudir, Kepala Sekolah, Kepala Kesantrian)
  const [isHalaqahModalOpen, setIsHalaqahModalOpen] = useState<boolean>(false);
  const [editingHalaqah, setEditingHalaqah] = useState<Halaqah | null>(null);
  const [halaqahFormName, setHalaqahFormName] = useState<string>('');
  const [halaqahFormTarget, setHalaqahFormTarget] = useState<string>('');
  const [halaqahFormAyId, setHalaqahFormAyId] = useState<string>('');
  const [halaqahFormDesc, setHalaqahFormDesc] = useState<string>('');
  const [halaqahFormPengampuType, setHalaqahFormPengampuType] = useState<'teacher' | 'user' | 'manual'>('teacher');
  const [halaqahFormPengampuId, setHalaqahFormPengampuId] = useState<string>('');
  const [halaqahFormPengampuName, setHalaqahFormPengampuName] = useState<string>('');
  const [halaqahFormStudentIds, setHalaqahFormStudentIds] = useState<string[]>([]);
  const [halaqahFormError, setHalaqahFormError] = useState<string>('');
  const [isSubmittingHalaqah, setIsSubmittingHalaqah] = useState<boolean>(false);

  // Quick Student Assignment Modal
  const [isStudentAssignModalOpen, setIsStudentAssignModalOpen] = useState<boolean>(false);
  const [targetHalaqahForStudents, setTargetHalaqahForStudents] = useState<Halaqah | null>(null);
  const [assignStudentClassFilter, setAssignStudentClassFilter] = useState<string>('ALL');
  const [assignStudentSearch, setAssignStudentSearch] = useState<string>('');
  const [assignedStudentIdsDraft, setAssignedStudentIdsDraft] = useState<string[]>([]);
  const [isSavingAssignedStudents, setIsSavingAssignedStudents] = useState<boolean>(false);

  // Delete Halaqah Confirmation Modal
  const [halaqahToDelete, setHalaqahToDelete] = useState<Halaqah | null>(null);
  const [isDeletingHalaqah, setIsDeletingHalaqah] = useState<boolean>(false);
  const [halaqahManageSearch, setHalaqahManageSearch] = useState<string>('');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [rankingCriteria, setRankingCriteria] = useState<'pages' | 'hadith' | 'both'>('pages');

  // Students in selected halaqah
  const halaqahStudents = useMemo(() => {
    if (!currentHalaqah) return [];
    const activeSt = students.filter((s) => s.status === 'Aktif');

    // If explicit studentIds exist
    if (currentHalaqah.studentIds && currentHalaqah.studentIds.length > 0) {
      return activeSt.filter((s) => currentHalaqah.studentIds.includes(s.id));
    }

    // Default fallback: match by class or grade level if studentIds not yet populated
    if (currentHalaqah.id === 'hlq_ubay') {
      const cls7 = classes.find((c) => c.gradeLevel === 7 || c.name.includes('VII'))?.id;
      return activeSt.filter((s) => (cls7 ? s.classId === cls7 : true));
    } else if (currentHalaqah.id === 'hlq_zaid') {
      const cls8 = classes.find((c) => c.gradeLevel === 8 || c.name.includes('VIII'))?.id;
      return activeSt.filter((s) => (cls8 ? s.classId === cls8 : true));
    } else if (currentHalaqah.id === 'hlq_abdullah') {
      const cls9 = classes.find((c) => c.gradeLevel === 9 || c.name.includes('IX'))?.id;
      return activeSt.filter((s) => (cls9 ? s.classId === cls9 : true));
    }

    return activeSt;
  }, [currentHalaqah, students, classes]);

  // Filtered students based on search
  const filteredStudents = useMemo(() => {
    return halaqahStudents.filter((st) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || st.name.toLowerCase().includes(q) || st.nis.toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (statusFilter !== 'ALL') {
        const report = halaqahMonthlyReports.find(
          (r) =>
            r.studentId === st.id &&
            r.halaqahId === selectedHalaqahId &&
            r.month === selectedMonth &&
            r.year === selectedYear
        );
        const reportStatus = report?.status || 'Belum Diisi';
        if (reportStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [halaqahStudents, searchQuery, statusFilter, halaqahMonthlyReports, selectedHalaqahId, selectedMonth, selectedYear]);

  // Form State for Report Input/Edit Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  const [formQuranStartSurah, setFormQuranStartSurah] = useState<number>(78);
  const [formQuranStartAyah, setFormQuranStartAyah] = useState<number>(1);
  const [formQuranStartJuz, setFormQuranStartJuz] = useState<number>(30);
  const [formQuranStartPage, setFormQuranStartPage] = useState<number>(582);

  const [formQuranEndSurah, setFormQuranEndSurah] = useState<number>(78);
  const [formQuranEndAyah, setFormQuranEndAyah] = useState<number>(40);
  const [formQuranEndJuz, setFormQuranEndJuz] = useState<number>(30);
  const [formQuranEndPage, setFormQuranEndPage] = useState<number>(583);

  const [formQuranNewPages, setFormQuranNewPages] = useState<number>(2);
  const [formQuranNewAyahs, setFormQuranNewAyahs] = useState<number>(40);
  const [formQuranNotes, setFormQuranNotes] = useState<string>('');

  const [formHadithBook, setFormHadithBook] = useState<string>('Arba\'in An-Nawawi');
  const [formHadithStartNum, setFormHadithStartNum] = useState<number>(1);
  const [formHadithStartTitle, setFormHadithStartTitle] = useState<string>('');
  const [formHadithEndNum, setFormHadithEndNum] = useState<number>(5);
  const [formHadithEndTitle, setFormHadithEndTitle] = useState<string>('');
  const [formHadithNewCount, setFormHadithNewCount] = useState<number>(5);
  const [formHadithList, setFormHadithList] = useState<string>('1, 2, 3, 4, 5');
  const [formHadithNotes, setFormHadithNotes] = useState<string>('');

  // Total Accumulation & Baseline State
  const [baselineAccumulation, setBaselineAccumulation] = useState<{
    baselineReport: HalaqahMonthlyReport | null;
    pages: number;
    hadith: number;
    juz: number;
  }>({
    baselineReport: null,
    pages: 0,
    hadith: 0,
    juz: 0
  });

  const [formAccJuz, setFormAccJuz] = useState<number>(1);
  const [formAccPages, setFormAccPages] = useState<number>(20);
  const [formAccHadith, setFormAccHadith] = useState<number>(5);
  const [formLastSurah, setFormLastSurah] = useState<string>('An-Naba\'');
  const [formLastAyah, setFormLastAyah] = useState<number>(40);
  const [formLastJuz, setFormLastJuz] = useState<number>(30);
  const [formLastPage, setFormLastPage] = useState<number>(583);
  const [formLastHadithNum, setFormLastHadithNum] = useState<number>(5);
  const [formLastHadithBook, setFormLastHadithBook] = useState<string>('Arba\'in An-Nawawi');
  const [formAccVerified, setFormAccVerified] = useState<boolean>(true);

  const [formStatus, setFormStatus] = useState<HalaqahReportStatus>('Draf');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Verification Modal State (Mudir / Admin)
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [reportToVerify, setReportToVerify] = useState<HalaqahMonthlyReport | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailReport, setDetailReport] = useState<HalaqahMonthlyReport | null>(null);

  // Print Preview Modals
  const [printAwardsModalOpen, setPrintAwardsModalOpen] = useState<boolean>(false);
  const [printReportModalOpen, setPrintReportModalOpen] = useState<boolean>(false);

  // History tab filter
  const [historyStudentFilter, setHistoryStudentFilter] = useState<string>('ALL');

  // History reports query (previous months)
  const historyReports = useMemo(() => {
    return halaqahMonthlyReports
      .filter((r) => {
        const isAuth = isExecutive || availableHalaqahs.some((h) => h.id === r.halaqahId);
        if (!isAuth) return false;

        if (selectedHalaqahId && r.halaqahId !== selectedHalaqahId) {
          return false;
        }

        if (historyStudentFilter !== 'ALL' && r.studentId !== historyStudentFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match =
            r.studentName.toLowerCase().includes(q) ||
            r.studentNis.toLowerCase().includes(q) ||
            r.halaqahName.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (b.month !== a.month) return b.month - a.month;
        return a.studentName.localeCompare(b.studentName);
      });
  }, [
    halaqahMonthlyReports,
    isExecutive,
    availableHalaqahs,
    selectedHalaqahId,
    historyStudentFilter,
    searchQuery
  ]);

  // Export Monthly Reports to CSV
  const handleExportReportsCsv = () => {
    const headers = [
      'NIS',
      'Nama Santri',
      'Halaqah',
      'Pengampu',
      'Bulan',
      'Tahun',
      'Qur\'an Mulai (Surat)',
      'Qur\'an Mulai (Ayat)',
      'Qur\'an Mulai (Hal)',
      'Qur\'an Selesai (Surat)',
      'Qur\'an Selesai (Ayat)',
      'Qur\'an Selesai (Hal)',
      'Halaman Baru',
      'Ayat Baru',
      'Catatan Qur\'an',
      'Kitab Hadis',
      'Hadis Mulai No',
      'Hadis Selesai No',
      'Hadis Baru (Jumlah)',
      'Daftar Hadis',
      'Catatan Hadis',
      'Total Akumulasi Juz',
      'Total Akumulasi Halaman',
      'Total Akumulasi Hadis',
      'Posisi Terakhir Qur\'an',
      'Posisi Terakhir Hadis',
      'Status Verifikasi Akumulasi',
      'Status Laporan',
      'Verifikator',
      'Catatan Mudir'
    ];

    const rows = halaqahStudents.map((st) => {
      const r = halaqahMonthlyReports.find(
        (rep) =>
          rep.studentId === st.id &&
          rep.halaqahId === selectedHalaqahId &&
          rep.month === selectedMonth &&
          rep.year === selectedYear
      );

      return [
        `"${st.nis}"`,
        `"${st.name}"`,
        `"${currentHalaqah?.name || ''}"`,
        `"${currentHalaqah?.pengampuName || ''}"`,
        `"${MONTH_NAMES[selectedMonth - 1]}"`,
        selectedYear,
        r ? `"${r.quranStartSurah}"` : '""',
        r ? r.quranStartAyah : '""',
        r ? r.quranStartPage : '""',
        r ? `"${r.quranEndSurah}"` : '""',
        r ? r.quranEndAyah : '""',
        r ? r.quranEndPage : '""',
        r ? r.quranNewPages : '""',
        r ? r.quranNewAyahs : '""',
        r ? `"${(r.quranNotes || '').replace(/"/g, '""')}"` : '""',
        r ? `"${r.hadithBook}"` : '""',
        r ? r.hadithStartNumber : '""',
        r ? r.hadithEndNumber : '""',
        r ? r.hadithNewCount : '""',
        r ? `"${(r.hadithListNumbers || '').replace(/"/g, '""')}"` : '""',
        r ? `"${(r.hadithNotes || '').replace(/"/g, '""')}"` : '""',
        r ? r.totalAccumulatedJuz : '""',
        r ? r.totalAccumulatedPages : '""',
        r ? r.totalAccumulatedHadith : '""',
        r ? `"${r.lastHafalanSurah} Ayat ${r.lastHafalanAyah}"` : '""',
        r ? `"${r.lastHadithBook} No ${r.lastHadithNumber}"` : '""',
        r ? (r.isAccumulationVerified ? '"Terverifikasi"' : '"Belum Terverifikasi"') : '""',
        r ? `"${r.status}"` : '"Belum Diisi"',
        r ? `"${r.verifiedByName || ''}"` : '""',
        r ? `"${(r.feedbackMudir || '').replace(/"/g, '""')}"` : '""'
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Halaqah_${currentHalaqah?.name || 'Halaqah'}_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Awards Leaderboard to CSV
  const handleExportAwardsCsv = () => {
    const headers = [
      'Peringkat',
      'Nama Santri',
      'NIS',
      'Halaqah',
      'Pengampu',
      'Halaman Qur\'an Baru',
      'Ayat Qur\'an Baru',
      'Hadis Baru',
      'Kitab Hadis',
      'Skor Komposit',
      'Status Kelayakan Hadiah',
      'Rekomendasi Penghargaan Bulanan',
      'Status Laporan'
    ];

    const rows = leaderboardList.map((r, rankIdx) => {
      const compositeScore = (r.quranNewPages || 0) * 10 + (r.hadithNewCount || 0) * 15;
      const kelayakan =
        compositeScore >= 100 || (r.quranNewPages >= 8 && r.hadithNewCount >= 4)
          ? 'Sangat Layak (Istimewa)'
          : compositeScore >= 50 || (r.quranNewPages >= 4 && r.hadithNewCount >= 2)
          ? 'Layak (Standar Prestasi)'
          : 'Cukup (Perlu Ditingkatkan)';

      const rekomendasi =
        rankIdx === 0
          ? 'Santri Teladan Tahfiz & Hadits Terbaik I'
          : rankIdx === 1
          ? 'Peringkat II Prestasi Hafalan Bulanan'
          : rankIdx === 2
          ? 'Peringkat III Prestasi Hafalan Bulanan'
          : r.quranNewPages >= 8
          ? 'Bintang Tahfiz Al-Qur\'an'
          : r.hadithNewCount >= 5
          ? 'Bintang Hafalan Hadis'
          : compositeScore >= 50
          ? 'Apresiasi Mutaba\'ah Halaqah'
          : 'Peserta Aktif Halaqah';

      return [
        rankIdx + 1,
        `"${r.studentName}"`,
        `"${r.studentNis}"`,
        `"${r.halaqahName}"`,
        `"${r.pengampuName}"`,
        r.quranNewPages || 0,
        r.quranNewAyahs || 0,
        r.hadithNewCount || 0,
        `"${r.hadithBook}"`,
        compositeScore,
        `"${kelayakan}"`,
        `"${rekomendasi}"`,
        `"${r.status}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Hadiah_Bulanan_Halaqah_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Auto-calculate Quran Progress when start or end changes (Mushaf Madinah 604 Hal & 114 Surah)
  const autoQuranCalc = useMemo(() => {
    return calculateQuranProgress(
      formQuranStartSurah,
      formQuranStartAyah,
      formQuranStartPage,
      formQuranEndSurah,
      formQuranEndAyah,
      formQuranEndPage
    );
  }, [
    formQuranStartSurah,
    formQuranStartAyah,
    formQuranStartPage,
    formQuranEndSurah,
    formQuranEndAyah,
    formQuranEndPage
  ]);

  // 2. Auto-calculate Hadith Progress when book or range changes
  const autoHadithCalc = useMemo(() => {
    return calculateHadithProgress(
      formHadithBook,
      formHadithStartNum,
      formHadithEndNum
    );
  }, [formHadithBook, formHadithStartNum, formHadithEndNum]);

  // 3. Auto-calculate Total Accumulation across months (strictly baseline + current month progress)
  const autoAccumulation = useMemo(() => {
    const newPages = autoQuranCalc.isValid ? autoQuranCalc.calculatedPages : 0;
    const newHadith = autoHadithCalc.isValid ? autoHadithCalc.newCount : 0;

    const totalPages = (baselineAccumulation?.pages || 0) + newPages;
    const totalHadith = (baselineAccumulation?.hadith || 0) + newHadith;
    // Standard ~20 pages per Juz in Mushaf Madinah
    const totalJuz = Math.min(30, Math.floor(totalPages / 20));

    const endSurahObj = getSurahByNumber(formQuranEndSurah);
    const lastSurahName = endSurahObj ? endSurahObj.name : `Surat ${formQuranEndSurah}`;

    return {
      totalPages,
      totalHadith,
      totalJuz,
      lastSurahName,
      lastAyah: formQuranEndAyah,
      lastPage: formQuranEndPage,
      lastJuz: autoQuranCalc.endJuz,
      lastHadithBook: formHadithBook,
      lastHadithNumber: formHadithEndNum
    };
  }, [
    baselineAccumulation,
    autoQuranCalc,
    autoHadithCalc,
    formQuranEndSurah,
    formQuranEndAyah,
    formQuranEndPage,
    formHadithBook,
    formHadithEndNum
  ]);

  // Open modal for editing or creating report
  const handleOpenReportModal = (st: Student) => {
    setSelectedStudentForReport(st);
    setFormError(null);
    setFormSuccess(null);

    // Look for existing report for this student, halaqah, and month/year
    const existing = halaqahMonthlyReports.find(
      (r) =>
        r.studentId === st.id &&
        r.halaqahId === selectedHalaqahId &&
        r.month === selectedMonth &&
        r.year === selectedYear
    );

    // Look for all historical reports strictly before this month/year to find baseline accumulation
    const priorReports = halaqahMonthlyReports
      .filter((r) => {
        if (r.studentId !== st.id) return false;
        if (existing && r.id === existing.id) return false;
        const rTime = r.year * 12 + r.month;
        const curTime = selectedYear * 12 + selectedMonth;
        return rTime < curTime;
      })
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));

    const baselineReport = priorReports[0] || null;
    const baselinePages = baselineReport ? (baselineReport.totalAccumulatedPages || 0) : 0;
    const baselineHadith = baselineReport ? (baselineReport.totalAccumulatedHadith || 0) : 0;
    const baselineJuz = baselineReport ? (baselineReport.totalAccumulatedJuz || 0) : 0;

    setBaselineAccumulation({
      baselineReport,
      pages: baselinePages,
      hadith: baselineHadith,
      juz: baselineJuz
    });

    if (existing) {
      // 1. Existing report
      setFormQuranStartSurah(existing.quranStartSurahNumber || 78);
      setFormQuranStartAyah(existing.quranStartAyah || 1);
      setFormQuranStartJuz(existing.quranStartJuz || 30);
      setFormQuranStartPage(existing.quranStartPage || 582);

      setFormQuranEndSurah(existing.quranEndSurahNumber || 78);
      setFormQuranEndAyah(existing.quranEndAyah || 40);
      setFormQuranEndJuz(existing.quranEndJuz || 30);
      setFormQuranEndPage(existing.quranEndPage || 583);

      setFormQuranNewPages(existing.quranNewPages || 2);
      setFormQuranNewAyahs(existing.quranNewAyahs || 40);
      setFormQuranNotes(existing.quranNotes || '');

      setFormHadithBook(existing.hadithBook || "Arba'in An-Nawawi");
      setFormHadithStartNum(existing.hadithStartNumber || 1);
      setFormHadithStartTitle(existing.hadithStartTitle || '');
      setFormHadithEndNum(existing.hadithEndNumber || 5);
      setFormHadithEndTitle(existing.hadithEndTitle || '');
      setFormHadithNewCount(existing.hadithNewCount || 5);
      setFormHadithList(existing.hadithListNumbers || '');
      setFormHadithNotes(existing.hadithNotes || '');

      setFormAccJuz(existing.totalAccumulatedJuz || 1);
      setFormAccPages(existing.totalAccumulatedPages || 20);
      setFormAccHadith(existing.totalAccumulatedHadith || 5);
      setFormLastSurah(existing.lastHafalanSurah || "An-Naba'");
      setFormLastAyah(existing.lastHafalanAyah || 40);
      setFormLastJuz(existing.lastHafalanJuz || 30);
      setFormLastPage(existing.lastHafalanPage || 583);
      setFormLastHadithNum(existing.lastHadithNumber || 5);
      setFormLastHadithBook(existing.lastHadithBook || "Arba'in An-Nawawi");
      setFormAccVerified(existing.isAccumulationVerified !== false);
      setFormStatus(existing.status);
    } else if (baselineReport) {
      // 2. Continuing from previous month's ending position
      const prevEndSurah = getSurahByNumber(baselineReport.quranEndSurahNumber);
      const isSurahFinished = prevEndSurah && baselineReport.quranEndAyah >= prevEndSurah.ayahCount;

      let nextStartSurahNum = baselineReport.quranEndSurahNumber;
      let nextStartAyah = baselineReport.quranEndAyah + 1;
      let nextStartPage = baselineReport.quranEndPage;

      if (isSurahFinished && baselineReport.quranEndSurahNumber < 114) {
        nextStartSurahNum = baselineReport.quranEndSurahNumber + 1;
        nextStartAyah = 1;
        const nextSurahObj = getSurahByNumber(nextStartSurahNum);
        nextStartPage = nextSurahObj?.startPage || baselineReport.quranEndPage;
      }

      const nextStartJuz = getJuzFromSurahAyah(nextStartSurahNum, nextStartAyah);
      const targetSurahObj = getSurahByNumber(nextStartSurahNum);

      setFormQuranStartSurah(nextStartSurahNum);
      setFormQuranStartAyah(nextStartAyah);
      setFormQuranStartJuz(nextStartJuz);
      setFormQuranStartPage(nextStartPage);

      const nextEndAyah = Math.min(nextStartAyah + 19, targetSurahObj?.ayahCount || 40);
      const nextEndPage = Math.min(nextStartPage + 1, targetSurahObj?.endPage || 604);
      const nextEndJuz = getJuzFromSurahAyah(nextStartSurahNum, nextEndAyah);

      setFormQuranEndSurah(nextStartSurahNum);
      setFormQuranEndAyah(nextEndAyah);
      setFormQuranEndJuz(nextEndJuz);
      setFormQuranEndPage(nextEndPage);

      setFormQuranNewPages(nextEndPage - nextStartPage + 1);
      setFormQuranNewAyahs(nextEndAyah - nextStartAyah + 1);
      setFormQuranNotes('');

      // Hadith
      const hadithBook = baselineReport.hadithBook || "Arba'in An-Nawawi";
      const bookMeta = getHadithBookByName(hadithBook);
      const maxHadith = bookMeta?.totalHadith || 42;
      const nextHadithStart = Math.min(baselineReport.hadithEndNumber + 1, maxHadith);
      const nextHadithEnd = Math.min(nextHadithStart + 2, maxHadith);

      setFormHadithBook(hadithBook);
      setFormHadithStartNum(nextHadithStart);
      setFormHadithStartTitle('');
      setFormHadithEndNum(nextHadithEnd);
      setFormHadithEndTitle('');
      setFormHadithNewCount(Math.max(1, nextHadithEnd - nextHadithStart + 1));
      setFormHadithList(
        nextHadithStart === nextHadithEnd
          ? `Hadits No. ${nextHadithStart}`
          : `Hadits No. ${nextHadithStart} s.d. ${nextHadithEnd}`
      );
      setFormHadithNotes('');

      setFormAccJuz(baselineJuz);
      setFormAccPages(baselinePages + (nextEndPage - nextStartPage + 1));
      setFormAccHadith(baselineHadith + Math.max(1, nextHadithEnd - nextHadithStart + 1));
      setFormLastSurah(targetSurahObj?.name || `Surat ${nextStartSurahNum}`);
      setFormLastAyah(nextEndAyah);
      setFormLastJuz(nextEndJuz);
      setFormLastPage(nextEndPage);
      setFormLastHadithNum(nextHadithEnd);
      setFormLastHadithBook(hadithBook);
      setFormAccVerified(true);
      setFormStatus('Draf');
    } else {
      // 3. Fresh new student report
      setFormQuranStartSurah(78);
      setFormQuranStartAyah(1);
      setFormQuranStartJuz(30);
      setFormQuranStartPage(582);

      setFormQuranEndSurah(78);
      setFormQuranEndAyah(40);
      setFormQuranEndJuz(30);
      setFormQuranEndPage(583);

      setFormQuranNewPages(2);
      setFormQuranNewAyahs(40);
      setFormQuranNotes('Alhamdulillah setoran hafalan lancar.');

      setFormHadithBook("Arba'in An-Nawawi");
      setFormHadithStartNum(1);
      setFormHadithStartTitle('Hadits 1: Niat');
      setFormHadithEndNum(5);
      setFormHadithEndTitle('Hadits 5: Larangan Bid\'ah');
      setFormHadithNewCount(5);
      setFormHadithList('Hadits No. 1 s.d. 5 (5 hadis)');
      setFormHadithNotes('Hafalan matan hadits tartil dan paham makna ringkas.');

      setFormAccJuz(1);
      setFormAccPages(2);
      setFormAccHadith(5);
      setFormLastSurah('An-Naba\'');
      setFormLastAyah(40);
      setFormLastJuz(30);
      setFormLastPage(583);
      setFormLastHadithNum(5);
      setFormLastHadithBook("Arba'in An-Nawawi");
      setFormAccVerified(true);
      setFormStatus('Draf');
    }

    setIsReportModalOpen(true);
  };

  // Handle Save Report
  const handleSaveReport = async (targetStatus: HalaqahReportStatus) => {
    if (!selectedStudentForReport || !currentHalaqah) return;

    setFormError(null);
    setFormSuccess(null);
    setIsSaving(true);

    try {
      if (!autoQuranCalc.isValid) {
        setFormError(autoQuranCalc.errorMessage || "Data posisi hafalan Al-Qur'an tidak valid.");
        setIsSaving(false);
        return;
      }
      if (!autoHadithCalc.isValid) {
        setFormError(autoHadithCalc.errorMessage || 'Data hafalan Hadis tidak valid.');
        setIsSaving(false);
        return;
      }

      const startSurahObj = getSurahByNumber(formQuranStartSurah);
      const endSurahObj = getSurahByNumber(formQuranEndSurah);

      const resolvedPengampuId =
        currentHalaqah.pengampuTeacherId ||
        currentHalaqah.pengampuUserId ||
        currentUser?.teacherId ||
        currentUser?.id ||
        't_001';

      // Look up existing report to preserve original createdAt
      const existingReport = halaqahMonthlyReports.find(
        (r) =>
          r.studentId === selectedStudentForReport.id &&
          r.halaqahId === currentHalaqah.id &&
          r.month === selectedMonth &&
          r.year === selectedYear
      );

      const reportData: HalaqahMonthlyReport = {
        id: `hlqr_${selectedYearId}_${selectedYear}_${selectedMonth}_${currentHalaqah.id}_${selectedStudentForReport.id}`,
        studentId: selectedStudentForReport.id,
        studentName: selectedStudentForReport.name,
        studentNis: selectedStudentForReport.nis,
        halaqahId: currentHalaqah.id,
        halaqahName: currentHalaqah.name,
        pengampuId: resolvedPengampuId,
        pengampuName: currentHalaqah.pengampuName || currentUser?.name || 'Ustadz Pengampu',
        academicYearId: selectedYearId,
        year: selectedYear,
        month: selectedMonth,
        monthName: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`,

        // A. Quran Start
        quranStartSurah: startSurahObj?.name || `Surat ${formQuranStartSurah}`,
        quranStartSurahNumber: Number(formQuranStartSurah),
        quranStartAyah: Number(formQuranStartAyah),
        quranStartJuz: Number(autoQuranCalc.startJuz),
        quranStartPage: Number(formQuranStartPage),

        // B. Quran End
        quranEndSurah: endSurahObj?.name || `Surat ${formQuranEndSurah}`,
        quranEndSurahNumber: Number(formQuranEndSurah),
        quranEndAyah: Number(formQuranEndAyah),
        quranEndJuz: Number(autoQuranCalc.endJuz),
        quranEndPage: Number(formQuranEndPage),

        // C. Quran New Progress (Dihitung Otomatis Berdasarkan Mushaf Madinah 604 Hal & Urutan 114 Surat)
        quranNewPages: autoQuranCalc.calculatedPages,
        quranNewAyahs: autoQuranCalc.calculatedAyahs,
        quranNotes: formQuranNotes.trim(),

        // D. Hadith Start
        hadithBook: formHadithBook,
        hadithStartNumber: Number(formHadithStartNum),
        hadithStartTitle: formHadithStartTitle.trim(),

        // E. Hadith End
        hadithEndNumber: Number(formHadithEndNum),
        hadithEndTitle: formHadithEndTitle.trim(),

        // F. Hadith New Progress (Dihitung Otomatis dari Rentang Nomor Hadis)
        hadithNewCount: autoHadithCalc.newCount,
        hadithListNumbers: autoHadithCalc.formattedRange,
        hadithNotes: formHadithNotes.trim(),

        // G. Total Accumulation (Dihitung Otomatis Lintas Bulan: Baseline Lalu + Capaian Baru Bulan Ini)
        totalAccumulatedJuz: autoAccumulation.totalJuz,
        totalAccumulatedPages: autoAccumulation.totalPages,
        totalAccumulatedHadith: autoAccumulation.totalHadith,
        lastHafalanSurah: autoAccumulation.lastSurahName,
        lastHafalanAyah: Number(autoAccumulation.lastAyah),
        lastHafalanJuz: Number(autoAccumulation.lastJuz),
        lastHafalanPage: Number(autoAccumulation.lastPage),
        lastHadithNumber: Number(autoAccumulation.lastHadithNumber),
        lastHadithBook: autoAccumulation.lastHadithBook,
        isAccumulationVerified: formAccVerified,

        // H. Status
        status: targetStatus,
        createdAt: existingReport?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveHalaqahMonthlyReport(reportData);
      setFormSuccess(
        targetStatus === 'Menunggu Verifikasi'
          ? 'Laporan bulanan berhasil disimpan dan diajukan ke Mudir untuk verifikasi.'
          : 'Draf laporan bulanan berhasil disimpan.'
      );

      setTimeout(() => {
        setIsReportModalOpen(false);
        setFormSuccess(null);
      }, 800);
    } catch (err: any) {
      console.error('Error saving halaqah report:', err);
      setFormError(err.message || 'Gagal menyimpan laporan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mudir Verification Handler
  const handleConfirmVerification = async () => {
    if (!reportToVerify) return;
    setIsVerifying(true);
    try {
      await verifyHalaqahMonthlyReport(reportToVerify.id, 'Terverifikasi', verifyFeedback);
      setVerifyModalOpen(false);
      setReportToVerify(null);
      showFeedback('Laporan bulanan berhasil diverifikasi.', 'success');
    } catch (err: any) {
      showFeedback(err?.message || 'Gagal memverifikasi laporan.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Awards Leaderboard Data
  const leaderboardList = useMemo(() => {
    // For awards, consider reports from selectedMonth & selectedYear
    const monthReports = halaqahMonthlyReports.filter(
      (r) =>
        r.month === selectedMonth &&
        r.year === selectedYear &&
        (isExecutive || availableHalaqahs.some((h) => h.id === r.halaqahId))
    );

    const sorted = [...monthReports].sort((a, b) => {
      if (rankingCriteria === 'pages') {
        return (b.quranNewPages || 0) - (a.quranNewPages || 0);
      } else if (rankingCriteria === 'hadith') {
        return (b.hadithNewCount || 0) - (a.hadithNewCount || 0);
      } else {
        // Separate or combined criteria: primary by verified status, then pages, then hadith
        if (b.status === 'Terverifikasi' && a.status !== 'Terverifikasi') return 1;
        if (a.status === 'Terverifikasi' && b.status !== 'Terverifikasi') return -1;
        return (b.quranNewPages || 0) + (b.hadithNewCount || 0) - ((a.quranNewPages || 0) + (a.hadithNewCount || 0));
      }
    });

    return sorted;
  }, [halaqahMonthlyReports, selectedMonth, selectedYear, isExecutive, availableHalaqahs, rankingCriteria]);

  // Filtered halaqahs for management tab
  const filteredHalaqahsForManage = useMemo(() => {
    const baseList = isExecutive ? halaqahs : availableHalaqahs;
    return baseList.filter((h) => {
      const q = halaqahManageSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        h.name.toLowerCase().includes(q) ||
        (h.pengampuName && h.pengampuName.toLowerCase().includes(q)) ||
        (h.targetJuz && h.targetJuz.toLowerCase().includes(q))
      );
    });
  }, [halaqahs, availableHalaqahs, isExecutive, halaqahManageSearch]);

  const totalStudentsInAllHalaqahs = useMemo(() => {
    const list = isExecutive ? halaqahs : availableHalaqahs;
    return list.reduce((sum, h) => sum + (h.studentIds?.length || 0), 0);
  }, [halaqahs, availableHalaqahs, isExecutive]);

  // Open Add Halaqah Modal
  const handleOpenAddHalaqah = () => {
    setEditingHalaqah(null);
    setHalaqahFormName('');
    setHalaqahFormTarget('Juz 30 & 29, Hadis Arbain 1–15');
    setHalaqahFormAyId(activeAcademicYear?.id || (academicYears[0]?.id ?? 'ay_2026_2027_1'));
    setHalaqahFormDesc('');
    setHalaqahFormPengampuType('teacher');
    setHalaqahFormPengampuId(teachers[0]?.id || '');
    setHalaqahFormPengampuName(teachers[0]?.name || '');
    setHalaqahFormStudentIds([]);
    setHalaqahFormError('');
    setIsHalaqahModalOpen(true);
  };

  // Open Edit Halaqah Modal
  const handleOpenEditHalaqah = (h: Halaqah) => {
    setEditingHalaqah(h);
    setHalaqahFormName(h.name);
    setHalaqahFormTarget(h.targetJuz || 'Juz 30 & Hadis Pilihan');
    setHalaqahFormAyId(h.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1');
    setHalaqahFormDesc(h.description || '');
    if (h.pengampuTeacherId) {
      setHalaqahFormPengampuType('teacher');
      setHalaqahFormPengampuId(h.pengampuTeacherId);
    } else if (h.pengampuUserId) {
      setHalaqahFormPengampuType('user');
      setHalaqahFormPengampuId(h.pengampuUserId);
    } else {
      setHalaqahFormPengampuType('manual');
      setHalaqahFormPengampuId('');
    }
    setHalaqahFormPengampuName(h.pengampuName || '');
    setHalaqahFormStudentIds(h.studentIds || []);
    setHalaqahFormError('');
    setIsHalaqahModalOpen(true);
  };

  // Save Halaqah Handler
  const handleSaveHalaqahSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHalaqahFormError('');

    const cleanName = halaqahFormName.trim();
    if (!cleanName) {
      setHalaqahFormError('Nama kelompok halaqah wajib diisi.');
      return;
    }
    const cleanPengampuName = halaqahFormPengampuName.trim();
    if (!cleanPengampuName) {
      setHalaqahFormError('Nama ustadz pengampu wajib diisi.');
      return;
    }

    setIsSubmittingHalaqah(true);
    try {
      let teacherId = halaqahFormPengampuType === 'teacher' ? halaqahFormPengampuId : undefined;
      let userId = halaqahFormPengampuType === 'user' ? halaqahFormPengampuId : undefined;

      const matchedTeacher = teachers.find(
        (t) => t.id === teacherId || t.name.toLowerCase().trim() === cleanPengampuName.toLowerCase().trim()
      );
      if (matchedTeacher && !teacherId) {
        teacherId = matchedTeacher.id;
      }

      const matchedUser = (users || []).find(
        (u) =>
          u.id === userId ||
          u.userId === userId ||
          (teacherId && u.teacherId === teacherId) ||
          (u.name && u.name.toLowerCase().trim() === cleanPengampuName.toLowerCase().trim())
      );
      if (matchedUser && !userId) {
        userId = matchedUser.userId || matchedUser.id;
      }

      const halaqahPayload: Halaqah = {
        id: editingHalaqah?.id || `hlq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        targetJuz: halaqahFormTarget.trim() || 'Juz 30 & Hadis Pilihan',
        academicYearId: halaqahFormAyId || activeAcademicYear?.id || 'ay_2026_2027_1',
        description: halaqahFormDesc.trim(),
        pengampuName: cleanPengampuName,
        pengampuTeacherId: teacherId,
        pengampuUserId: userId,
        studentIds: halaqahFormStudentIds,
        createdAt: editingHalaqah?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveHalaqah(halaqahPayload);

      // Auto-grant role PENGAMPU_HALAQAH to linked user account if not already present
      if (matchedUser) {
        const uRoles = getUserRoles(matchedUser);
        if (!uRoles.includes('PENGAMPU_HALAQAH')) {
          await saveUser({
            ...matchedUser,
            roles: [...uRoles, 'PENGAMPU_HALAQAH'],
            role: matchedUser.role || 'PENGAMPU_HALAQAH'
          });
        }
      }

      setIsHalaqahModalOpen(false);
      setEditingHalaqah(null);
    } catch (err: any) {
      console.error('Error saving halaqah:', err);
      setHalaqahFormError(err?.message || 'Gagal menyimpan data kelompok halaqah.');
    } finally {
      setIsSubmittingHalaqah(false);
    }
  };

  // Quick Grant Role PENGAMPU_HALAQAH
  const handleGrantPengampuRole = async (targetUser: UserProfile) => {
    try {
      const currentRoles = getUserRoles(targetUser);
      if (!currentRoles.includes('PENGAMPU_HALAQAH')) {
        const updatedRoles = [...currentRoles, 'PENGAMPU_HALAQAH' as UserRole];
        await saveUser({
          ...targetUser,
          roles: updatedRoles,
          role: targetUser.role || 'PENGAMPU_HALAQAH'
        });
      }
    } catch (err: any) {
      console.error('Error granting pengampu role:', err);
      showFeedback('Gagal memberikan role PENGAMPU_HALAQAH: ' + (err?.message || 'Error tidak diketahui'), 'error');
    }
  };

  // Open Quick Student Assignment Modal
  const handleOpenAssignStudents = (h: Halaqah) => {
    setTargetHalaqahForStudents(h);
    let existingIds = h.studentIds || [];
    if (existingIds.length === 0) {
      if (h.id === 'hlq_ubay') {
        const cls7 = classes.find((c) => c.gradeLevel === 7 || c.name.includes('VII'))?.id;
        existingIds = students.filter((s) => s.status === 'Aktif' && (cls7 ? s.classId === cls7 : true)).map((s) => s.id);
      } else if (h.id === 'hlq_zaid') {
        const cls8 = classes.find((c) => c.gradeLevel === 8 || c.name.includes('VIII'))?.id;
        existingIds = students.filter((s) => s.status === 'Aktif' && (cls8 ? s.classId === cls8 : true)).map((s) => s.id);
      } else if (h.id === 'hlq_abdullah') {
        const cls9 = classes.find((c) => c.gradeLevel === 9 || c.name.includes('IX'))?.id;
        existingIds = students.filter((s) => s.status === 'Aktif' && (cls9 ? s.classId === cls9 : true)).map((s) => s.id);
      }
    }
    setAssignedStudentIdsDraft(existingIds);
    setAssignStudentClassFilter('ALL');
    setAssignStudentSearch('');
    setIsStudentAssignModalOpen(true);
  };

  // Save Assigned Students
  const handleSaveAssignedStudents = async () => {
    if (!targetHalaqahForStudents) return;
    setIsSavingAssignedStudents(true);
    try {
      const updated: Halaqah = {
        ...targetHalaqahForStudents,
        studentIds: assignedStudentIdsDraft,
        updatedAt: new Date().toISOString()
      };
      await saveHalaqah(updated);
      setIsStudentAssignModalOpen(false);
      setTargetHalaqahForStudents(null);
      showFeedback('Daftar santri halaqah berhasil diperbarui.', 'success');
    } catch (err: any) {
      console.error('Error saving assigned students:', err);
      showFeedback('Gagal menyimpan daftar santri halaqah: ' + (err?.message || 'Error tidak diketahui'), 'error');
    } finally {
      setIsSavingAssignedStudents(false);
    }
  };

  // Delete Halaqah Handler
  const handleConfirmDeleteHalaqah = async () => {
    if (!halaqahToDelete) return;
    setIsDeletingHalaqah(true);
    try {
      await deleteHalaqah(halaqahToDelete.id);
      setHalaqahToDelete(null);
      if (selectedHalaqahId === halaqahToDelete.id) {
        setSelectedHalaqahId(availableHalaqahs.find((h) => h.id !== halaqahToDelete.id)?.id || '');
      }
      showFeedback('Kelompok halaqah berhasil dihapus.', 'success');
    } catch (err: any) {
      console.error('Error deleting halaqah:', err);
      showFeedback('Gagal menghapus kelompok halaqah: ' + (err?.message || 'Error tidak diketahui'), 'error');
    } finally {
      setIsDeletingHalaqah(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast / Notification Banner */}
      {actionToast && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs font-medium shadow-xs transition-all animate-in fade-in slide-in-from-top-2 ${
            actionToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : actionToast.type === 'info'
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                actionToast.type === 'success'
                  ? 'bg-emerald-500'
                  : actionToast.type === 'info'
                  ? 'bg-sky-500'
                  : 'bg-rose-500'
              }`}
            />
            <span>{actionToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            &times;
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Modul Taḥfidz
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">
              Pesantren Islam Mutiara Insan
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              {activeTab === 'manage_halaqah' ? (
                <Users className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {activeTab === 'manage_halaqah'
                  ? 'Pengampu & Kelompok Halaqah'
                  : 'Laporan Halaqah Bulanan'}
              </h2>
              <p className="text-xs text-slate-500">
                {activeTab === 'manage_halaqah'
                  ? 'Pengelolaan kelompok halaqah tahfidz, penugasan ustadz pengampu, dan penetapan anggota santri.'
                  : 'Input capaian hafalan Al-Qur\'an dan hadis, riwayat laporan, rekap capaian, serta evaluasi hadiah bulanan.'}
              </p>
            </div>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2">
          {isPengampu && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Pengampu Halaqah: {currentUser?.displayName || currentUser?.name}</span>
            </span>
          )}
          {isExecutive && (
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Supervisi Lembaga ({effectiveRole})</span>
            </span>
          )}
        </div>
      </div>

      {/* Tabs Navigation & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('manage_halaqah');
              if (onNavigate) onNavigate('halaqah-management');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'manage_halaqah'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pengampu &amp; Kelompok Halaqah</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'manage_halaqah'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isExecutive ? halaqahs.length : availableHalaqahs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              if (onNavigate) onNavigate('halaqah-reports');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Input Capaian Hafalan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('awards');
              if (onNavigate) onNavigate('halaqah-reports');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'awards'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Rekap &amp; Hadiah Bulanan</span>
            {leaderboardList.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'awards'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {leaderboardList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              if (onNavigate) onNavigate('halaqah-reports');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4 text-sky-400" />
            <span>Riwayat Laporan</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'manage_halaqah' ? (
            <div className="flex items-center gap-2">
              {isExecutive && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('users')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Buka Manajemen Pengguna untuk kelola role akun"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manajemen Pengguna</span>
                </button>
              )}
              {isExecutive && (
                <button
                  type="button"
                  onClick={handleOpenAddHalaqah}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelompok Halaqah</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={activeTab === 'awards' ? handleExportAwardsCsv : handleExportReportsCsv}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Unduh format spreadsheet CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'awards') {
                    setPrintAwardsModalOpen(true);
                  } else {
                    setPrintReportModalOpen(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Cetak format resmi pesantren"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cetak Dokumen</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar (Tahun Ajaran, Bulan Laporan, Pengampu, Halaqah, Status) */}
      {activeTab !== 'manage_halaqah' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* 1. Tahun Ajaran */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tahun Ajaran
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} ({ay.semester}) {ay.isActive ? '• Aktif' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Bulan & Tahun Laporan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Bulan Laporan
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-2/3 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-1/3 px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-center text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Pengampu Halaqah */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Pengampu Halaqah
              </label>
              <select
                value={selectedPengampuFilter}
                onChange={(e) => {
                  setSelectedPengampuFilter(e.target.value);
                }}
                disabled={!isExecutive && availableHalaqahs.length <= 1}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 cursor-pointer"
              >
                <option value="ALL">Semua Pengampu</option>
                {pengampuOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Pilihan Halaqah */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Halaqah
              </label>
              <select
                value={selectedHalaqahId}
                onChange={(e) => setSelectedHalaqahId(e.target.value)}
                disabled={availableHalaqahs.length <= 1 && !isExecutive}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 cursor-pointer"
              >
                {availableHalaqahs.length === 0 ? (
                  <option value="">Belum ada halaqah ditugaskan</option>
                ) : (
                  availableHalaqahs.map((hlq) => (
                    <option key={hlq.id} value={hlq.id}>
                      {hlq.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 5. Filter Status Laporan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status Laporan
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="Belum Diisi">Belum Diisi</option>
                <option value="Draf">Draf</option>
                <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                <option value="Terverifikasi">Terverifikasi</option>
              </select>
            </div>
          </div>

          {/* Halaqah Info Banner & Search */}
          {currentHalaqah && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-600">
                  Ustadz Pengampu:{' '}
                  <strong className="text-slate-900 font-bold">{currentHalaqah.pengampuName}</strong>
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-600">
                  Target Halaqah:{' '}
                  <strong className="text-indigo-700 font-medium">{currentHalaqah.targetJuz}</strong>
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-600">
                  Anggota Santri:{' '}
                  <strong className="text-slate-900">{halaqahStudents.length} Santri</strong>
                </span>
              </div>

              {/* Search Input */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIS santri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: DAFTAR LAPORAN BULANAN SANTRI */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {availableHalaqahs.length === 0 && !isExecutive ? (
            <div className="p-10 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Halaqah yang Ditugaskan</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Akun Anda belum memiliki penugasan kelompok halaqah aktif. Silakan hubungi Administrator atau Mudir untuk penugasan halaqah santri.
              </p>
            </div>
          ) : halaqahStudents.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Belum ada santri terdaftar pada halaqah ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3 text-center w-16">NIS</th>
                    <th className="py-3 px-4 min-w-[170px]">Nama Santri</th>
                    <th className="py-3 px-3 text-center min-w-[120px] bg-indigo-50/40 text-indigo-900 border-l border-indigo-100">
                      Hafalan Baru Qur'an
                    </th>
                    <th className="py-3 px-3 text-center min-w-[90px] bg-indigo-50/70 text-indigo-950 font-bold">
                      Halaman Baru
                    </th>
                    <th className="py-3 px-3 text-center min-w-[110px] bg-emerald-50/40 text-emerald-900 border-l border-emerald-100">
                      Hadis Baru
                    </th>
                    <th className="py-3 px-3 text-center min-w-[120px] bg-slate-100 text-slate-800">
                      Total Akumulasi
                    </th>
                    <th className="py-3 px-3 text-center min-w-[110px]">Status</th>
                    <th className="py-3 px-3 text-center min-w-[130px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st, idx) => {
                    const report = halaqahMonthlyReports.find(
                      (r) =>
                        r.studentId === st.id &&
                        r.halaqahId === selectedHalaqahId &&
                        r.month === selectedMonth &&
                        r.year === selectedYear
                    );

                    const status: HalaqahReportStatus = report?.status || 'Belum Diisi';

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{st.nis}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {st.name}
                          {st.gender && (
                            <span className="ml-1 text-[10px] text-slate-400 font-normal">
                              ({st.gender})
                            </span>
                          )}
                        </td>

                        {/* Hafalan Baru Al-Qur'an Bulan Ini */}
                        <td className="py-3 px-3 text-center bg-indigo-50/20 border-l border-indigo-100">
                          {report ? (
                            <div>
                              <span className="font-bold text-slate-900">
                                {report.quranStartSurah === report.quranEndSurah
                                  ? `${report.quranStartSurah} : ${report.quranStartAyah}–${report.quranEndAyah}`
                                  : `${report.quranStartSurah} (${report.quranStartAyah}) &rarr; ${report.quranEndSurah} (${report.quranEndAyah})`}
                              </span>
                              <span className="block text-[10px] text-indigo-600 font-mono">
                                {report.quranNewAyahs} ayat
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Halaman Baru Bulan Ini */}
                        <td className="py-3 px-3 text-center font-bold bg-indigo-50/40 text-indigo-900">
                          {report ? (
                            <span className="inline-flex px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-bold text-xs">
                              {report.quranNewPages} Halaman
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Hadis Baru Bulan Ini */}
                        <td className="py-3 px-3 text-center bg-emerald-50/20 border-l border-emerald-100">
                          {report ? (
                            <div>
                              <strong className="text-emerald-800 text-xs font-bold">
                                +{report.hadithNewCount} Hadis
                              </strong>
                              <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                                {report.hadithBook} (No. {report.hadithStartNumber}–{report.hadithEndNumber})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Total Akumulasi Santri */}
                        <td className="py-3 px-3 text-center bg-slate-50/70">
                          {report ? (
                            <div className="text-[11px] leading-tight">
                              <span className="font-bold text-slate-900">
                                {report.totalAccumulatedJuz} Juz ({report.totalAccumulatedPages} Hal)
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                Total Hadis: {report.totalAccumulatedHadith}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {status === 'Terverifikasi' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Terverifikasi
                            </span>
                          ) : status === 'Menunggu Verifikasi' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Menunggu
                            </span>
                          ) : status === 'Draf' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              Draf
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-normal text-slate-400 bg-slate-100">
                              Belum Diisi
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Input / Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenReportModal(st)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition inline-flex items-center gap-1 cursor-pointer"
                              title="Input atau ubah laporan capaian hafalan santri"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{report ? 'Edit' : 'Input'}</span>
                            </button>

                            {/* Detail Button */}
                            {report && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailReport(report);
                                  setDetailModalOpen(true);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="Lihat Rincian Laporan"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Mudir Verification Button */}
                            {isExecutive && report && report.status === 'Menunggu Verifikasi' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReportToVerify(report);
                                  setVerifyFeedback(report.feedbackMudir || '');
                                  setVerifyModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition inline-flex items-center gap-1 cursor-pointer"
                                title="Verifikasi laporan capaian santri"
                              >
                                <Check className="w-3 h-3" />
                                <span>Verifikasi</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAP CAPAIAN & NOMINASI HADIAH BULANAN */}
      {activeTab === 'awards' && (
        <div className="space-y-4">
          {/* Header Card & Criteria Selector */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-indigo-50/50 border border-amber-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Trophy className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Rekapitulasi Capaian &amp; Peringkat Hadiah Bulanan
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Periode: <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> • Penentuan santri berprestasi hafalan Al-Qur'an dan hadis.
                </p>
              </div>
            </div>

            {/* Criteria Radio Toggle */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-amber-200/80 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 px-2">Kriteria Peringkat:</span>
              <button
                type="button"
                onClick={() => setRankingCriteria('pages')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  rankingCriteria === 'pages'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Halaman Al-Qur'an
              </button>
              <button
                type="button"
                onClick={() => setRankingCriteria('hadith')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  rankingCriteria === 'hadith'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jumlah Hadis
              </button>
              <button
                type="button"
                onClick={() => setRankingCriteria('both')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  rankingCriteria === 'both'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rekap Terpisah
              </button>
            </div>
          </div>

          {/* Leaderboard Table with Required 7 Columns */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {leaderboardList.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Belum ada laporan santri yang tersimpan pada bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 text-center w-16">Peringkat</th>
                      <th className="py-3 px-4">Nama Santri</th>
                      <th className="py-3 px-4">Nama Halaqah</th>
                      <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-950 font-bold">
                        Capaian Al-Qur'an (Halaman)
                      </th>
                      <th className="py-3 px-3 text-center bg-emerald-50/50 text-emerald-950 font-bold">
                        Capaian Hadis
                      </th>
                      <th className="py-3 px-3 text-center bg-amber-50/50 text-amber-950 font-bold">
                        Skor Komposit &amp; Kelayakan
                      </th>
                      <th className="py-3 px-4 text-slate-900 font-bold">
                        Rekomendasi Penghargaan Bulanan
                      </th>
                      <th className="py-3 px-3 text-center">Status &amp; Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboardList.map((r, rankIdx) => {
                      const isTop1 = rankIdx === 0;
                      const isTop2 = rankIdx === 1;
                      const isTop3 = rankIdx === 2;

                      // Composite Score Formula: (Pages * 10) + (Hadith * 15)
                      const compositeScore = (r.quranNewPages || 0) * 10 + (r.hadithNewCount || 0) * 15;
                      const isSangatLayak = compositeScore >= 100 || ((r.quranNewPages || 0) >= 8 && (r.hadithNewCount || 0) >= 4);
                      const isLayak = !isSangatLayak && (compositeScore >= 50 || ((r.quranNewPages || 0) >= 4 && (r.hadithNewCount || 0) >= 2));

                      // Award Recommendation
                      let rekomendasi = 'Peserta Aktif Halaqah';
                      let rekomendasiIcon = '🎖️';
                      if (rankIdx === 0) {
                        rekomendasi = 'Santri Teladan Tahfiz & Hadits Terbaik I';
                        rekomendasiIcon = '🥇';
                      } else if (rankIdx === 1) {
                        rekomendasi = 'Peringkat II Prestasi Hafalan Bulanan';
                        rekomendasiIcon = '🥈';
                      } else if (rankIdx === 2) {
                        rekomendasi = 'Peringkat III Prestasi Hafalan Bulanan';
                        rekomendasiIcon = '🥉';
                      } else if ((r.quranNewPages || 0) >= 8) {
                        rekomendasi = 'Bintang Tahfiz Al-Qur\'an';
                        rekomendasiIcon = '⭐';
                      } else if ((r.hadithNewCount || 0) >= 5) {
                        rekomendasi = 'Bintang Hafalan Hadis';
                        rekomendasiIcon = '📖';
                      } else if (compositeScore >= 50) {
                        rekomendasi = 'Apresiasi Mutaba\'ah Halaqah';
                        rekomendasiIcon = '✨';
                      }

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isTop1 ? 'bg-amber-50/40 font-medium' : ''
                          }`}
                        >
                          {/* 1. Peringkat */}
                          <td className="py-3 px-3 text-center font-bold">
                            {isTop1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-extrabold text-xs shadow-xs">
                                🥇 1
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-extrabold text-xs">
                                🥈 2
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-900 font-extrabold text-xs">
                                🥉 3
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">{rankIdx + 1}</span>
                            )}
                          </td>

                          {/* 2. Nama Santri */}
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {r.studentName}
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">
                              NIS: {r.studentNis}
                            </span>
                          </td>

                          {/* 3. Nama Halaqah */}
                          <td className="py-3 px-4 text-slate-700">
                            <span className="font-semibold text-slate-800 block">{r.halaqahName}</span>
                            <span className="text-[10px] text-slate-500">Ustadz {r.pengampuName}</span>
                          </td>

                          {/* 4. Capaian Al-Qur'an (Halaman) */}
                          <td className="py-3 px-3 text-center bg-indigo-50/20 font-medium text-slate-900">
                            <span className="inline-flex px-2 py-0.5 rounded font-extrabold text-xs bg-indigo-100 text-indigo-900 shadow-2xs">
                              {r.quranNewPages} Halaman
                            </span>
                            <span className="block text-[10px] text-indigo-700 font-medium mt-0.5">
                              {r.quranStartSurah === r.quranEndSurah
                                ? `${r.quranStartSurah} : ${r.quranStartAyah}–${r.quranEndAyah}`
                                : `${r.quranStartSurah} &rarr; ${r.quranEndSurah}`}
                              {' '}({r.quranNewAyahs} ayat)
                            </span>
                          </td>

                          {/* 5. Capaian Hadis */}
                          <td className="py-3 px-3 text-center bg-emerald-50/20 font-medium">
                            <span className="inline-flex px-2 py-0.5 rounded font-extrabold text-xs bg-emerald-100 text-emerald-900 shadow-2xs">
                              +{r.hadithNewCount} Hadis
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                              {r.hadithBook} (No. {r.hadithStartNumber}–{r.hadithEndNumber})
                            </span>
                          </td>

                          {/* 6. Skor Komposit / Status Kelayakan Hadiah */}
                          <td className="py-3 px-3 text-center bg-amber-50/20">
                            <span className="font-mono font-bold text-xs text-amber-900 block">
                              Skor: {compositeScore}
                            </span>
                            {isSangatLayak ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Sparkles className="w-2.5 h-2.5" />
                                Sangat Layak
                              </span>
                            ) : isLayak ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-300">
                                Layak
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                Memenuhi Syarat
                              </span>
                            )}
                          </td>

                          {/* 7. Rekomendasi Penghargaan Bulanan */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span>{rekomendasiIcon}</span>
                              <span className={isTop1 ? 'text-amber-900 font-extrabold' : ''}>{rekomendasi}</span>
                            </div>
                            <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                              Catatan: {r.quranNotes || r.hadithNotes || 'Hafalan lancar & tertib setoran'}
                            </span>
                          </td>

                          {/* 8. Status & Aksi */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {r.status === 'Terverifikasi' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Terverifikasi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  {r.status}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailReport(r);
                                  setDetailModalOpen(true);
                                }}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                              >
                                Rincian
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT BULAN-BULAN SEBELUMNYA (History Bulanan Halaqah) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                <History className="w-5 h-5 text-sky-100" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Riwayat Laporan Halaqah Bulan-Bulan Sebelumnya
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arsip perkembangan hafalan santri {currentHalaqah ? `untuk ${currentHalaqah.name}` : ''} dari seluruh periode bulan yang tersimpan di sistem.
                </p>
              </div>
            </div>

            {/* Filter Santri Khusus Riwayat */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Filter Santri:</span>
              <select
                value={historyStudentFilter}
                onChange={(e) => setHistoryStudentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                <option value="ALL">Semua Santri Halaqah</option>
                {halaqahStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.nis})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {historyReports.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Belum ada arsip riwayat laporan bulan sebelumnya untuk halaqah ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 text-center">Periode</th>
                      <th className="py-3 px-4">Nama Santri</th>
                      <th className="py-3 px-4">Halaqah</th>
                      <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-950 font-bold">
                        Hafalan Qur'an (Hal Baru)
                      </th>
                      <th className="py-3 px-3 text-center bg-emerald-50/50 text-emerald-950 font-bold">
                        Hafalan Hadis
                      </th>
                      <th className="py-3 px-3 text-center bg-slate-900 text-white font-bold">
                        Total Akumulasi
                      </th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                          {MONTH_NAMES[r.month - 1]} {r.year}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {r.studentName}
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            NIS: {r.studentNis}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {r.halaqahName}
                          <span className="block text-[10px] text-slate-500">Ustadz {r.pengampuName}</span>
                        </td>
                        <td className="py-3 px-3 text-center bg-indigo-50/20">
                          <strong className="text-indigo-900">{r.quranNewPages} Halaman</strong> ({r.quranNewAyahs} Ayat)
                          <span className="block text-[10px] text-slate-500">
                            {r.quranStartSurah} &rarr; {r.quranEndSurah}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center bg-emerald-50/20">
                          <strong className="text-emerald-900">+{r.hadithNewCount} Hadis</strong>
                          <span className="block text-[10px] text-slate-500">
                            {r.hadithBook} (No. {r.hadithStartNumber}–{r.hadithEndNumber})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center bg-slate-50 font-medium">
                          <span className="text-slate-900 font-bold">
                            {r.totalAccumulatedJuz} Juz ({r.totalAccumulatedPages} Hal)
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {r.totalAccumulatedHadith} Hadis &bull; {r.lastHafalanSurah}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {r.status === 'Terverifikasi' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Terverifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailReport(r);
                              setDetailModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Rincian</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: KELOLA PENGAMPU & KELOMPOK HALAQAH */}
      {activeTab === 'manage_halaqah' && (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  {isExecutive ? 'Total Kelompok' : 'Halaqah Binaan'}
                </span>
                <span className="text-xl font-bold text-slate-900 font-mono">
                  {isExecutive ? halaqahs.length : availableHalaqahs.length} Halaqah
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Ustadz Pengampu
                </span>
                <span className="text-xl font-bold text-emerald-700 font-mono truncate block max-w-[170px]">
                  {isExecutive ? `${pengampuOptions.length} Ustadz` : (currentUser?.displayName || currentUser?.name || 'Ustadz Pengampu')}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  {isExecutive ? 'Santri Tergabung' : 'Santri Binaan'}
                </span>
                <span className="text-xl font-bold text-sky-700 font-mono">
                  {totalStudentsInAllHalaqahs} Santri
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Tahun Ajaran
                </span>
                <span className="text-sm font-bold text-slate-900 truncate block max-w-[150px]">
                  {activeAcademicYear?.name || '2026/2027'}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isExecutive ? "Cari kelompok halaqah, target juz, atau ustadz pengampu..." : "Cari kelompok halaqah atau target hafalan..."}
                value={halaqahManageSearch}
                onChange={(e) => setHalaqahManageSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {isExecutive && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddHalaqah}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Halaqah Baru</span>
                </button>
              </div>
            )}
          </div>

          {/* Halaqah List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredHalaqahsForManage.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">
                  {isExecutive ? 'Tidak ada kelompok halaqah ditemukan' : 'Belum ada kelompok halaqah binaan yang ditugaskan'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isExecutive
                    ? 'Silakan buat kelompok halaqah baru atau ubah kata kunci pencarian Anda.'
                    : 'Silakan hubungi Administrator atau Mudir untuk penugasan kelompok halaqah dan santri binaan Anda.'}
                </p>
                {isExecutive && (
                  <button
                    type="button"
                    onClick={handleOpenAddHalaqah}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  >
                    Tambah Halaqah Sekarang
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nama Kelompok Halaqah</th>
                      <th className="py-3 px-4">Target Hafalan</th>
                      <th className="py-3 px-4">Ustadz Pengampu</th>
                      <th className="py-3 px-4 text-center">Status Role Akun</th>
                      <th className="py-3 px-4 text-center">Santri Anggota</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHalaqahsForManage.map((hlq) => {
                      // Lookup linked user profile
                      const linkedUser = (users || []).find(
                        (u) =>
                          (hlq.pengampuUserId && (u.id === hlq.pengampuUserId || u.userId === hlq.pengampuUserId)) ||
                          (hlq.pengampuTeacherId && u.teacherId === hlq.pengampuTeacherId) ||
                          (hlq.pengampuName && u.name && u.name.toLowerCase().trim() === hlq.pengampuName.toLowerCase().trim())
                      );
                      const hasPengampuRole = linkedUser ? hasRole(linkedUser, 'PENGAMPU_HALAQAH') : false;
                      const studentCount = hlq.studentIds?.length || 0;

                      return (
                        <tr key={hlq.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-[13px] flex items-center gap-2">
                              <span>{hlq.name}</span>
                            </div>
                            {hlq.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {hlq.description}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            <span className="inline-block bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium">
                              {hlq.targetJuz || 'Juz 30 & Hadis'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{hlq.pengampuName}</span>
                            </div>
                            {linkedUser ? (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                @{linkedUser.username || linkedUser.email} &bull; UID: {linkedUser.userId || linkedUser.id}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 italic block mt-0.5">
                                Belum terhubung akun pengguna
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {linkedUser ? (
                              hasPengampuRole ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Role Aktif
                                </span>
                              ) : (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    Role Belum Diberikan
                                  </span>
                                  {isExecutive && (
                                    <button
                                      type="button"
                                      onClick={() => handleGrantPengampuRole(linkedUser)}
                                      className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-semibold cursor-pointer"
                                    >
                                      + Berikan Role Sekarang
                                    </button>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                                {studentCount} Santri
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignStudents(hlq)}
                                className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer"
                                title="Atur daftar santri halaqah"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              {isExecutive && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditHalaqah(hlq)}
                                  className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer"
                                  title="Edit Halaqah & Pengampu"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenAssignStudents(hlq)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition cursor-pointer"
                                title="Kelola Anggota Santri"
                              >
                                <Users className="w-3.5 h-3.5" />
                              </button>
                              {isExecutive && (
                                <button
                                  type="button"
                                  onClick={() => setHalaqahToDelete(hlq)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                                  title="Hapus Kelompok Halaqah"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL INPUT / EDIT LAPORAN BULANAN (114 Surah, Juz, Halaman, Hadis, Akumulasi) */}
      {/* ========================================================================= */}
      {isReportModalOpen && selectedStudentForReport && currentHalaqah && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Input Laporan Hafalan Bulanan Santri</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <strong>{selectedStudentForReport.name}</strong> (NIS: {selectedStudentForReport.nis}) &bull; {currentHalaqah.name} &bull; Periode: {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Guidance Info */}
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 text-xs leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Perhitungan Otomatis:</strong> Pengampu cukup memilih posisi awal (surat, ayat, halaman) dan posisi akhir (surat, ayat, halaman) untuk Al-Qur'an, serta kitab dan nomor hadis awal-akhir. Sistem otomatis menghitung jumlah halaman, ayat, hadis baru, juz, dan total akumulasi lintas bulan tanpa perlu perhitungan manual.
                </div>
              </div>

              {/* ======================================================= */}
              {/* SECTION 1: HAFALAN AL-QUR'AN */}
              {/* ======================================================= */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                      I. Perkembangan Hafalan Al-Qur'an Bulan Ini
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                    Mushaf Madinah 604 Hal
                  </span>
                </div>

                {/* Grid: Posisi Awal vs Posisi Akhir */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* A. Posisi Awal */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-[11px] font-bold text-slate-700 uppercase">
                        A. Posisi Awal Bulan
                      </span>
                      <span className="text-[9px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                        Titik Mulai
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Surat Awal (1 - 114)
                      </label>
                      <select
                        value={formQuranStartSurah}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          setFormQuranStartSurah(num);
                          const s = getSurahByNumber(num);
                          if (s) {
                            setFormQuranStartPage(s.startPage);
                            setFormQuranStartAyah(1);
                            setFormQuranStartJuz(s.startJuz);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 cursor-pointer"
                      >
                        {QURAN_SURAHS.map((s) => (
                          <option key={s.number} value={s.number}>
                            {s.number}. {s.name} ({s.arabic}) - {s.ayahCount} ayat
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Ayat Awal
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={getSurahByNumber(formQuranStartSurah)?.ayahCount || 286}
                          value={formQuranStartAyah}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormQuranStartAyah(val);
                            const j = getJuzFromSurahAyah(formQuranStartSurah, val);
                            setFormQuranStartJuz(j);
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-center font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                          <span>Halaman</span>
                          <span className="text-[9px] text-slate-400">1–604</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="604"
                          value={formQuranStartPage}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormQuranStartPage(val);
                            const j = getJuzFromPage(val);
                            setFormQuranStartJuz(j);
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-center font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                          <span>Juz Awal</span>
                          <span className="text-[8px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded">Auto</span>
                        </label>
                        <div className="w-full py-1.5 text-xs rounded-lg border border-indigo-200 bg-indigo-50/60 text-center font-extrabold text-indigo-900">
                          Juz {autoQuranCalc.startJuz}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* B. Posisi Akhir */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-[11px] font-bold text-slate-700 uppercase">
                        B. Posisi Akhir Bulan
                      </span>
                      <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Capaian Akhir
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Surat Akhir (1 - 114)
                      </label>
                      <select
                        value={formQuranEndSurah}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          setFormQuranEndSurah(num);
                          const s = getSurahByNumber(num);
                          if (s) {
                            setFormQuranEndPage(s.endPage);
                            setFormQuranEndAyah(s.ayahCount);
                            setFormQuranEndJuz(s.endJuz);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 cursor-pointer"
                      >
                        {QURAN_SURAHS.map((s) => (
                          <option key={s.number} value={s.number}>
                            {s.number}. {s.name} ({s.arabic}) - {s.ayahCount} ayat
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Ayat Akhir
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={getSurahByNumber(formQuranEndSurah)?.ayahCount || 286}
                          value={formQuranEndAyah}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormQuranEndAyah(val);
                            const j = getJuzFromSurahAyah(formQuranEndSurah, val);
                            setFormQuranEndJuz(j);
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-center font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                          <span>Halaman</span>
                          <span className="text-[9px] text-slate-400">1–604</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="604"
                          value={formQuranEndPage}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormQuranEndPage(val);
                            const j = getJuzFromPage(val);
                            setFormQuranEndJuz(j);
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-center font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                          <span>Juz Akhir</span>
                          <span className="text-[8px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded">Auto</span>
                        </label>
                        <div className="w-full py-1.5 text-xs rounded-lg border border-indigo-200 bg-indigo-50/60 text-center font-extrabold text-indigo-900">
                          Juz {autoQuranCalc.endJuz}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* C. Capaian Baru Bulan Ini (Dihitung Otomatis & Hanya-Baca) */}
                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950">
                        Capaian Hafalan Baru Al-Qur'an (Bulan Berjalan):
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                      Dihitung Otomatis (Hanya-Baca)
                    </span>
                  </div>

                  {!autoQuranCalc.isValid && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{autoQuranCalc.errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Jumlah Halaman Baru</span>
                        <span className="text-[9px] text-slate-400">
                          {formQuranStartPage === formQuranEndPage
                            ? `Halaman ${formQuranStartPage}`
                            : `Halaman ${formQuranStartPage} s.d. ${formQuranEndPage}`}
                        </span>
                      </label>
                      <div className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-200 bg-white font-extrabold text-indigo-900 shadow-sm flex items-center justify-between">
                        <span className="text-sm">{autoQuranCalc.calculatedPages} Halaman</span>
                        <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {autoQuranCalc.isValid ? 'Valid Sesuai Mushaf' : 'Perlu Koreksi'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Jumlah Ayat Baru</span>
                        <span className="text-[9px] text-slate-400">Total ayat terlewati</span>
                      </label>
                      <div className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-200 bg-white font-extrabold text-indigo-900 shadow-sm flex items-center justify-between">
                        <span className="text-sm">{autoQuranCalc.calculatedAyahs} Ayat</span>
                        <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Juz {autoQuranCalc.startJuz} {autoQuranCalc.startJuz !== autoQuranCalc.endJuz ? `s.d. ${autoQuranCalc.endJuz}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Catatan Pengampu Al-Qur'an (Kelancaran / Tajwid / Disiplin Murajaah)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Makhraj huruf jelas, kelancaran mutqin, istiqamah ziyadah harian."
                      value={formQuranNotes}
                      onChange={(e) => setFormQuranNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* ======================================================= */}
              {/* SECTION 2: HAFALAN HADIS */}
              {/* ======================================================= */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                      II. Perkembangan Hafalan Hadis Bulan Ini
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Dihitung Otomatis (Hanya-Baca)
                  </span>
                </div>

                {!autoHadithCalc.isValid && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{autoHadithCalc.errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Kitab Hadis</span>
                      <span className="text-[9px] text-slate-400">Pilih kitab referensi resmi</span>
                    </label>
                    <select
                      value={formHadithBook}
                      onChange={(e) => {
                        const bName = e.target.value;
                        setFormHadithBook(bName);
                        const bookMeta = getHadithBookByName(bName);
                        if (bookMeta && formHadithEndNum > bookMeta.totalHadith) {
                          setFormHadithEndNum(Math.min(formHadithStartNum + 2, bookMeta.totalHadith));
                        }
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 cursor-pointer"
                    >
                      {HADITH_CATALOG.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} ({b.totalHadith} hadis &bull; {b.author})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Jumlah Hadis Baru</span>
                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">Auto</span>
                    </label>
                    <div className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white font-extrabold text-emerald-900 shadow-sm flex items-center justify-center">
                      +{autoHadithCalc.newCount} Hadis
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Nomor Hadis Awal Bulan
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={getHadithBookByName(formHadithBook)?.totalHadith || 2000}
                      value={formHadithStartNum}
                      onChange={(e) => setFormHadithStartNum(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                      <span>Nomor Hadis Akhir Bulan</span>
                      <span className="text-[9px] text-slate-400">
                        Maks. {getHadithBookByName(formHadithBook)?.totalHadith || 2000} hadis
                      </span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={getHadithBookByName(formHadithBook)?.totalHadith || 2000}
                      value={formHadithEndNum}
                      onChange={(e) => setFormHadithEndNum(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Rentang Nomor Hadis (Dihasilkan Otomatis)</span>
                    <span className="text-[9px] text-emerald-700 font-semibold">{autoHadithCalc.formattedRange}</span>
                  </label>
                  <div className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-200 bg-white font-medium text-slate-800 flex items-center justify-between">
                    <span>{autoHadithCalc.formattedRange}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Dari {formHadithBook}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Catatan Pengampu Hadis (Kelancaran Matan / Pemahaman Makna)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Hafalan matan tartil, paham kosakata pokok dan perawi hadits."
                    value={formHadithNotes}
                    onChange={(e) => setFormHadithNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* ======================================================= */}
              {/* SECTION 3: TOTAL AKUMULASI HAFALAN SANTRI (HINGGA AKHIR BULAN) */}
              {/* ======================================================= */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white space-y-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      III. Total Akumulasi Hafalan Santri (Hingga Akhir Bulan Laporan)
                    </h4>
                  </div>
                  <span className="text-[10px] text-amber-300 font-medium bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                    Dihitung Otomatis Lintas Bulan
                  </span>
                </div>

                {/* Riwayat Akumulasi Lintas Bulan */}
                {baselineAccumulation.baselineReport ? (
                  <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5">
                    <History className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">
                        Riwayat Bulan Sebelumnya ({baselineAccumulation.baselineReport.monthName}):
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Akumulasi dasar: <strong>{baselineAccumulation.pages} Halaman</strong> ({baselineAccumulation.juz} Juz) Al-Qur'an &bull; <strong>{baselineAccumulation.hadith} Hadis</strong>.
                        Ditambah capaian baru bulan ini (+{autoQuranCalc.calculatedPages} Hal, +{autoHadithCalc.newCount} Hadis) secara otomatis tanpa penghitungan ganda.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Laporan Perdana Santri di AKSARA</p>
                      <p className="text-[11px] text-emerald-300 mt-0.5">
                        Santri belum memiliki riwayat laporan bulan sebelumnya di database. Total akumulasi sampai akhir bulan ini dihitung langsung dari capaian perdana bulan ini.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <label className="block text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                      <span>Total Juz Tuntas</span>
                      <span className="text-[9px] text-amber-300 font-bold">Otomatis</span>
                    </label>
                    <div className="w-full px-2 py-1 text-sm rounded bg-white/10 text-amber-300 font-extrabold text-center">
                      {autoAccumulation.totalJuz} Juz
                    </div>
                    <p className="text-[9px] text-slate-400 text-center mt-1">Standar 20 hal/juz</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <label className="block text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                      <span>Total Halaman Tuntas</span>
                      <span className="text-[9px] text-amber-300 font-bold">Otomatis</span>
                    </label>
                    <div className="w-full px-2 py-1 text-sm rounded bg-white/10 text-white font-extrabold text-center">
                      {autoAccumulation.totalPages} Halaman
                    </div>
                    <p className="text-[9px] text-slate-400 text-center mt-1">
                      {baselineAccumulation.pages} lalu + {autoQuranCalc.calculatedPages} baru
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 col-span-2 sm:col-span-1">
                    <label className="block text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                      <span>Total Hadis Tuntas</span>
                      <span className="text-[9px] text-amber-300 font-bold">Otomatis</span>
                    </label>
                    <div className="w-full px-2 py-1 text-sm rounded bg-white/10 text-emerald-400 font-extrabold text-center">
                      {autoAccumulation.totalHadith} Hadis
                    </div>
                    <p className="text-[9px] text-slate-400 text-center mt-1">
                      {baselineAccumulation.hadith} lalu + {autoHadithCalc.newCount} baru
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Posisi Terakhir Al-Qur'an (Surat, Ayat, Hal, Juz)
                    </label>
                    <div className="text-xs font-semibold text-white">
                      {autoAccumulation.lastSurahName} : Ayat {autoAccumulation.lastAyah}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Halaman {autoAccumulation.lastPage} &bull; Juz {autoAccumulation.lastJuz}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Posisi Terakhir Hadis (Kitab &amp; No)
                    </label>
                    <div className="text-xs font-semibold text-white">
                      {autoAccumulation.lastHadithBook}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Hadits Nomor {autoAccumulation.lastHadithNumber}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-acc-verified"
                    checked={formAccVerified}
                    onChange={(e) => setFormAccVerified(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 border-white/30 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="chk-acc-verified" className="text-xs text-slate-300 cursor-pointer">
                    Total akumulasi hafalan santri dihitung otomatis oleh sistem dan sesuai buku/kartu setoran santri
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveReport('Draf')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer disabled:opacity-50"
                >
                  Simpan Sebagai Draf
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveReport('Menunggu Verifikasi')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Kirim ke Mudir (Ajukan)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL VERIFIKASI MUDIR */}
      {/* ========================================================================= */}
      {verifyModalOpen && reportToVerify && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verifikasi Laporan Capaian Santri</span>
              </h3>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <p>
                <strong>Santri:</strong> {reportToVerify.studentName} ({reportToVerify.studentNis})
              </p>
              <p>
                <strong>Halaqah:</strong> {reportToVerify.halaqahName} (Pengampu: {reportToVerify.pengampuName})
              </p>
              <p>
                <strong>Hafalan Baru Al-Qur'an:</strong> {reportToVerify.quranNewPages} Halaman ({reportToVerify.quranNewAyahs} Ayat)
              </p>
              <p>
                <strong>Hadis Baru:</strong> +{reportToVerify.hadithNewCount} Hadis ({reportToVerify.hadithBook})
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan / Evaluasi Pembinaan Mudir:
              </label>
              <textarea
                rows={3}
                value={verifyFeedback}
                onChange={(e) => setVerifyFeedback(e.target.value)}
                placeholder="Contoh: Capaian hafalan terverifikasi baik. Layak masuk nominasi santri terbaik bulan ini."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleConfirmVerification}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                {isVerifying ? 'Memproses...' : 'Sahkan & Terverifikasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL RINCIAN LAPORAN SANTRI */}
      {/* ========================================================================= */}
      {detailModalOpen && detailReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                <span>Rincian Buku Laporan Halaqah Santri</span>
              </h3>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="font-bold text-sm text-slate-900">{detailReport.studentName}</div>
                <div className="text-slate-500 font-mono">NIS: {detailReport.studentNis} • {detailReport.halaqahName}</div>
                <div className="text-indigo-700">Ustadz Pengampu: {detailReport.pengampuName}</div>
                <div className="text-slate-500">Periode: {detailReport.monthName}</div>
              </div>

              <div className="p-3 border border-indigo-100 rounded-xl bg-indigo-50/20 space-y-2">
                <strong className="text-indigo-950 block border-b pb-1">I. Capaian Al-Qur'an:</strong>
                <p>Posisi Awal: <strong>{detailReport.quranStartSurah} (Ayat {detailReport.quranStartAyah})</strong> Hal. {detailReport.quranStartPage}</p>
                <p>Posisi Akhir: <strong>{detailReport.quranEndSurah} (Ayat {detailReport.quranEndAyah})</strong> Hal. {detailReport.quranEndPage}</p>
                <p>Capaian Baru: <strong className="text-indigo-700 font-bold">{detailReport.quranNewPages} Halaman</strong> ({detailReport.quranNewAyahs} Ayat)</p>
                <p className="text-slate-600 italic">Catatan: {detailReport.quranNotes || '-'}</p>
              </div>

              <div className="p-3 border border-emerald-100 rounded-xl bg-emerald-50/20 space-y-2">
                <strong className="text-emerald-950 block border-b pb-1">II. Capaian Hadis:</strong>
                <p>Kitab: <strong>{detailReport.hadithBook}</strong></p>
                <p>Nomor: Hadits No. {detailReport.hadithStartNumber} s.d. {detailReport.hadithEndNumber}</p>
                <p>Capaian Baru: <strong className="text-emerald-700 font-bold">+{detailReport.hadithNewCount} Hadis</strong></p>
                <p className="text-slate-600 italic">Catatan: {detailReport.hadithNotes || '-'}</p>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl bg-slate-900 text-white space-y-1.5">
                <strong className="text-amber-300 block border-b border-white/10 pb-1">III. Total Akumulasi Santri:</strong>
                <p>Total Juz Tuntas: <strong>{detailReport.totalAccumulatedJuz} Juz ({detailReport.totalAccumulatedPages} Halaman)</strong></p>
                <p>Total Hadis Tuntas: <strong>{detailReport.totalAccumulatedHadith} Hadis</strong></p>
                <p>Posisi Terakhir: {detailReport.lastHafalanSurah} ({detailReport.lastHafalanAyah})</p>
                <p className="text-[11px] text-emerald-400 font-semibold">Status Verifikasi: {detailReport.isAccumulationVerified ? 'Telah Diverifikasi Pengampu' : 'Belum Diverifikasi'}</p>
              </div>

              {detailReport.feedbackMudir && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <strong>Evaluasi Mudir:</strong>
                  <p className="mt-0.5">{detailReport.feedbackMudir}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CETAK RESMI: REKAPITULASI HADIAH BULANAN */}
      {/* ========================================================================= */}
      {printAwardsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:overflow-visible">
            {/* Action Bar (Hidden when printing) */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Pratinjau Cetak: Rekapitulasi Capaian &amp; Hadiah Bulanan
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintAwardsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="space-y-4 text-slate-800 text-xs">
              {/* Kop Surat Resmi */}
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                  {schoolIdentity?.schoolName || 'PESANTREN ISLAM MUTIARA INSAN'}
                </h2>
                <p className="text-[11px] font-semibold text-slate-700">
                  LEMBAGA PENDIDIKAN TAHFIZ AL-QUR'AN &amp; HADIS AS-SUNNAH
                </p>
                <p className="text-[10px] text-slate-500">
                  {schoolIdentity?.address || 'Jl. Raya Pesantren No. 01, Mutiara Insan'} • NPSN: {schoolIdentity?.npsn || '69989876'}
                </p>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center py-2 space-y-0.5">
                <h4 className="font-bold text-sm text-slate-900 uppercase underline">
                  REKAPITULASI CAPAIAN HAFALAN &amp; PENETAPAN PENERIMA HADIAH BULANAN
                </h4>
                <p className="text-[11px] text-slate-600">
                  Periode: Bulan <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> • Tahun Ajaran: {activeAcademicYear?.name || '2026/2027'}
                </p>
              </div>

              {/* Tabel Cetak */}
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="border border-slate-300 py-2 px-2 text-center w-10">Rank</th>
                    <th className="border border-slate-300 py-2 px-3">Nama Santri</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">NIS</th>
                    <th className="border border-slate-300 py-2 px-3">Halaqah / Pengampu</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">Qur'an Baru</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">Hadis Baru</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">Skor &amp; Kelayakan</th>
                    <th className="border border-slate-300 py-2 px-3">Rekomendasi Penghargaan</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardList.map((r, rankIdx) => {
                    const compositeScore = (r.quranNewPages || 0) * 10 + (r.hadithNewCount || 0) * 15;
                    const isSangatLayak = compositeScore >= 100 || ((r.quranNewPages || 0) >= 8 && (r.hadithNewCount || 0) >= 4);

                    let rekomendasi = 'Peserta Aktif Halaqah';
                    if (rankIdx === 0) rekomendasi = '🥇 Santri Teladan Tahfiz & Hadits Terbaik I';
                    else if (rankIdx === 1) rekomendasi = '🥈 Peringkat II Prestasi Hafalan Bulanan';
                    else if (rankIdx === 2) rekomendasi = '🥉 Peringkat III Prestasi Hafalan Bulanan';
                    else if ((r.quranNewPages || 0) >= 8) rekomendasi = '⭐ Bintang Tahfiz Al-Qur\'an';
                    else if ((r.hadithNewCount || 0) >= 5) rekomendasi = '⭐ Bintang Hafalan Hadis';
                    else if (compositeScore >= 50) rekomendasi = '🎖️ Apresiasi Mutaba\'ah Halaqah';

                    return (
                      <tr key={r.id} className={rankIdx < 3 ? 'bg-amber-50/30 font-medium' : ''}>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                          {rankIdx + 1}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-3 font-bold">
                          {r.studentName}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">
                          {r.studentNis}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-3">
                          {r.halaqahName} (Ustadz {r.pengampuName})
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                          {r.quranNewPages} Hal ({r.quranNewAyahs} Ayat)
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                          +{r.hadithNewCount} Hadis
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">
                          {compositeScore} ({isSangatLayak ? 'Sangat Layak' : 'Layak'})
                        </td>
                        <td className="border border-slate-300 py-1.5 px-3">
                          {rekomendasi}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Tanda Tangan Resmi Pengampu & Mudir */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-500">Mengetahui / Mengajukan,</p>
                  <p className="font-semibold text-slate-800">Ustadz Pengampu Halaqah</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">
                    {currentHalaqah?.pengampuName || 'Ustadz Pengampu'}
                  </p>
                  <p className="text-[10px] text-slate-500">Pengampu Halaqah Mutiara Insan</p>
                </div>

                <div>
                  <p className="text-slate-500">
                    {schoolIdentity?.city || 'Pesantren Mutiara Insan'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="font-semibold text-slate-800">
                    Mudir Pesantren Islam Mutiara Insan
                  </p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">
                    {schoolIdentity?.mudirName || 'Ustadz Pembina, Lc., M.Ag.'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    NIP/NIK: {schoolIdentity?.mudirNip || '198207152010011002'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CETAK RESMI: LAPORAN HALAQAH BULANAN SANTRI */}
      {/* ========================================================================= */}
      {printReportModalOpen && currentHalaqah && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-6 max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:overflow-visible">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Pratinjau Cetak: Laporan Bulanan {currentHalaqah.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintReportModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-slate-800 text-xs">
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                  {schoolIdentity?.schoolName || 'PESANTREN ISLAM MUTIARA INSAN'}
                </h2>
                <p className="text-[11px] font-semibold text-slate-700">
                  LAPORAN PERKEMBANGAN HAFALAN AL-QUR'AN DAN HADIS BULANAN
                </p>
                <p className="text-[10px] text-slate-500">
                  {currentHalaqah.name} • Pengampu: <strong>{currentHalaqah.pengampuName}</strong> • Periode: {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100 text-slate-900 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="border border-slate-300 py-2 px-2 text-center w-8">No</th>
                    <th className="border border-slate-300 py-2 px-3">Nama Santri</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">NIS</th>
                    <th className="border border-slate-300 py-2 px-3">Posisi Awal Qur'an</th>
                    <th className="border border-slate-300 py-2 px-3">Posisi Akhir Qur'an</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">Hal Baru</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">Hadis Baru</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">Total Akumulasi</th>
                    <th className="border border-slate-300 py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {halaqahStudents.map((st, idx) => {
                    const r = halaqahMonthlyReports.find(
                      (rep) =>
                        rep.studentId === st.id &&
                        rep.halaqahId === selectedHalaqahId &&
                        rep.month === selectedMonth &&
                        rep.year === selectedYear
                    );

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 py-1.5 px-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 py-1.5 px-3 font-bold">{st.name}</td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">{st.nis}</td>
                        <td className="border border-slate-300 py-1.5 px-3">
                          {r ? `${r.quranStartSurah} : ${r.quranStartAyah} (Hal ${r.quranStartPage})` : '-'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-3">
                          {r ? `${r.quranEndSurah} : ${r.quranEndAyah} (Hal ${r.quranEndPage})` : '-'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                          {r ? `${r.quranNewPages} Hal` : '-'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                          {r ? `+${r.hadithNewCount}` : '-'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center font-mono">
                          {r ? `${r.totalAccumulatedJuz} Juz` : '-'}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2 text-center">
                          {r ? r.status : 'Belum Diisi'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="text-slate-500">Ustadz Pengampu,</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">{currentHalaqah.pengampuName}</p>
                </div>
                <div>
                  <p className="text-slate-500">Mudir Pesantren Islam Mutiara Insan,</p>
                  <div className="h-16" />
                  <p className="font-bold underline text-slate-900">{schoolIdentity?.mudirName || 'Ustadz Pembina, Lc., M.Ag.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT KELOMPOK HALAQAH & PENUGASAN PENGAMPU */}
      {/* ========================================================================= */}
      {isHalaqahModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <span>{editingHalaqah ? 'Edit Kelompok Halaqah' : 'Tambah Kelompok Halaqah Baru'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tugaskan ustadz pengampu serta tentukan santri anggota halaqah tahfiz &amp; hadis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHalaqahModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveHalaqahSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {halaqahFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{halaqahFormError}</span>
                </div>
              )}

              {/* 1. Nama Halaqah & Tahun Ajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Kelompok Halaqah *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Halaqah Ubay bin Ka'ab (Kelas VII)"
                    value={halaqahFormName}
                    onChange={(e) => setHalaqahFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tahun Ajaran
                  </label>
                  <select
                    value={halaqahFormAyId}
                    onChange={(e) => setHalaqahFormAyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium cursor-pointer"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} ({ay.semester}) {ay.isActive ? '• Aktif' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Target Hafalan */}
              <div className="text-xs">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Hafalan Al-Qur'an &amp; Hadis
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Juz 30 & 29, Hadis Arbain 1–15"
                  value={halaqahFormTarget}
                  onChange={(e) => setHalaqahFormTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>

              {/* 3. Penugasan Ustadz Pengampu */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ustadz Pengampu Halaqah *</span>
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Otomatis Sinkron Akun &amp; Role
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Pilih dari Master Guru / Akun:</span>
                    <select
                      value={halaqahFormPengampuId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHalaqahFormPengampuId(val);
                        // Check if teacher
                        const t = teachers.find((tch) => tch.id === val);
                        if (t) {
                          setHalaqahFormPengampuName(t.name);
                          setHalaqahFormPengampuType('teacher');
                          return;
                        }
                        // Check if user
                        const u = (users || []).find((usr) => usr.id === val || usr.userId === val);
                        if (u) {
                          setHalaqahFormPengampuName(u.name || u.displayName || u.username);
                          setHalaqahFormPengampuType('user');
                          return;
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                    >
                      <option value="">-- Pilih Guru / Ustadz --</option>
                      <optgroup label="Tenaga Pendidik / Asatidz">
                        {teachers.map((tch) => (
                          <option key={tch.id} value={tch.id}>
                            {tch.name} {tch.nip ? `(NIP: ${tch.nip})` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Akun Pengguna Sistem">
                        {(users || [])
                          .filter((u) => u.isActive !== false)
                          .map((u) => (
                            <option key={u.id} value={u.userId || u.id}>
                              {u.name || u.displayName} (@{u.username})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Nama Tampilan Pengampu:</span>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap ustadz pengampu"
                      value={halaqahFormPengampuName}
                      onChange={(e) => setHalaqahFormPengampuName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  * Sistem akan otomatis menghubungkan halaqah ini dengan akun login ustadz dan memastikan role{' '}
                  <strong className="text-indigo-700">PENGAMPU_HALAQAH</strong> aktif pada profil beliau tanpa mengubah UID Firebase atau kata sandi.
                </p>
              </div>

              {/* 4. Deskripsi / Keterangan */}
              <div className="text-xs">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deskripsi / Catatan Halaqah
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat fokus halaqah, jadwal setoran, atau catatan khusus..."
                  value={halaqahFormDesc}
                  onChange={(e) => setHalaqahFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>

              {/* 5. Penugasan Santri ke Halaqah */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Santri Anggota Halaqah</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {halaqahFormStudentIds.length} santri terpilih untuk halaqah ini.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const activeIds = students.filter((s) => s.status === 'Aktif').map((s) => s.id);
                        setHalaqahFormStudentIds(activeIds);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
                    >
                      Pilih Semua Santri
                    </button>
                    <button
                      type="button"
                      onClick={() => setHalaqahFormStudentIds([])}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  {students
                    .filter((s) => s.status === 'Aktif')
                    .map((st) => {
                      const isChecked = halaqahFormStudentIds.includes(st.id);
                      const stClass = classes.find((c) => c.id === st.classId);
                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none text-xs ${
                            isChecked
                              ? 'bg-white border-indigo-300 shadow-2xs'
                              : 'bg-white/60 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setHalaqahFormStudentIds(Array.from(new Set([...halaqahFormStudentIds, st.id])));
                                } else {
                                  setHalaqahFormStudentIds(halaqahFormStudentIds.filter((id) => id !== st.id));
                                }
                              }}
                              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="font-semibold text-slate-800">{st.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>NIS: {st.nis}</span>
                            {stClass && (
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-sans font-medium">
                                {stClass.name}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHalaqahModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHalaqah}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {isSubmittingHalaqah ? 'Menyimpan...' : 'Simpan Kelompok Halaqah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ATUR ANGGOTA SANTRI CEPAT */}
      {/* ========================================================================= */}
      {isStudentAssignModalOpen && targetHalaqahForStudents && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Kelola Anggota Santri Halaqah</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <strong>{targetHalaqahForStudents.name}</strong> &bull; Pengampu: Ustadz {targetHalaqahForStudents.pengampuName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentAssignModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 flex-1 overflow-y-auto text-xs">
              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Filter Kelas
                  </label>
                  <select
                    value={assignStudentClassFilter}
                    onChange={(e) => setAssignStudentClassFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Cari Santri
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama atau NIS..."
                      value={assignStudentSearch}
                      onChange={(e) => setAssignStudentSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Counter & Bulk Actions */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700">
                  Terpilih: <strong className="text-indigo-600">{assignedStudentIdsDraft.length}</strong> dari {students.filter((s) => s.status === 'Aktif').length} santri aktif
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const displayedIds = students
                        .filter((s) => s.status === 'Aktif')
                        .filter((s) => (assignStudentClassFilter === 'ALL' ? true : s.classId === assignStudentClassFilter))
                        .map((s) => s.id);
                      setAssignedStudentIdsDraft(Array.from(new Set([...assignedStudentIdsDraft, ...displayedIds])));
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer"
                  >
                    Pilih Kelas Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignedStudentIdsDraft([])}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* Student Checkbox List */}
              <div className="max-h-72 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                {students
                  .filter((s) => s.status === 'Aktif')
                  .filter((s) => (assignStudentClassFilter === 'ALL' ? true : s.classId === assignStudentClassFilter))
                  .filter((s) => {
                    const q = assignStudentSearch.toLowerCase().trim();
                    if (!q) return true;
                    return s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
                  })
                  .map((st) => {
                    const isChecked = assignedStudentIdsDraft.includes(st.id);
                    const stClass = classes.find((c) => c.id === st.classId);
                    return (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none text-xs ${
                          isChecked
                            ? 'bg-white border-indigo-400 shadow-2xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedStudentIdsDraft(Array.from(new Set([...assignedStudentIdsDraft, st.id])));
                              } else {
                                setAssignedStudentIdsDraft(assignedStudentIdsDraft.filter((id) => id !== st.id));
                              }
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-800">{st.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>NIS: {st.nis}</span>
                          {stClass && (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-sans font-medium">
                              {stClass.name}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStudentAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingAssignedStudents}
                onClick={handleSaveAssignedStudents}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {isSavingAssignedStudents ? 'Menyimpan...' : 'Simpan Anggota Santri'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KONFIRMASI HAPUS KELOMPOK HALAQAH */}
      {/* ========================================================================= */}
      {halaqahToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Hapus Kelompok Halaqah?</h4>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus <strong>{halaqahToDelete.name}</strong>? Data hafalan bulanan santri yang sudah tercatat akan tetap tersimpan secara aman dalam arsip.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHalaqahToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingHalaqah}
                onClick={handleConfirmDeleteHalaqah}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {isDeletingHalaqah ? 'Menghapus...' : 'Ya, Hapus Halaqah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
