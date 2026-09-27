import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
  DoorOpen,
  FileSpreadsheet,
  CalendarCheck,
  Award,
  HeartPulse,
  ShieldAlert,
  Moon,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquarePlus,
  Send,
  ArrowUpRight,
  Sparkles,
  FileText,
  ClipboardCheck,
  TrendingUp,
  Eye
} from 'lucide-react';

interface MudirDashboardViewProps {
  onNavigate?: (tab: string) => void;
}

export type MudirApprovalStatus =
  | 'Menunggu Persetujuan Mudir'
  | 'Disetujui Mudir'
  | 'Perlu Revisi'
  | 'Ditolak';

export interface MudirApprovalItem {
  id: string;
  title: string;
  category: 'Pengadaan & Anggaran' | 'Keputusan Santri' | 'Kegiatan Pesantren' | 'Kebutuhan Khusus';
  unit: 'ATK & Sarpras' | 'Kesantrian' | 'Akademik' | 'Tahfizh';
  proposedBy: string;
  date: string;
  nominal?: string;
  description: string;
  status: MudirApprovalStatus;
  mudirNote?: string;
  updatedAt?: string;
}

export interface MudirDirectiveItem {
  id: string;
  targetUnit: 'Seluruh Unit' | 'Kepala Sekolah (Akademik)' | 'Kepala Kesantrian' | 'Koordinator Tahfizh' | 'Petugas ATK & Sarpras';
  priority: 'Penting' | 'Normal' | 'Segera Tindak Lanjut';
  subject: string;
  message: string;
  createdAt: string;
}

const INITIAL_MUDIR_APPROVALS: MudirApprovalItem[] = [
  {
    id: 'apr-001',
    title: 'Pengadaan Kertas HVS, Tinta Printer & Perlengkapan Ujian Semester',
    category: 'Pengadaan & Anggaran',
    unit: 'ATK & Sarpras',
    proposedBy: 'Petugas ATK / Kepala Sekolah',
    date: '2026-09-25',
    nominal: 'Rp 4.850.000',
    description: 'Pengadaan stok kertas HVS A4/F4, tinta printer ruang guru, dan spidol kelas untuk kebutuhan evaluasi tengah semester.',
    status: 'Menunggu Persetujuan Mudir',
  },
  {
    id: 'apr-002',
    title: 'Tindak Lanjut Pembinaan Khusus & Pemanggilan Wali Santri',
    category: 'Keputusan Santri',
    unit: 'Kesantrian',
    proposedBy: 'Kepala Kesantrian',
    date: '2026-09-26',
    description: 'Rekomendasi surat peringatan pembinaan dan musyawarah bersama wali santri terkait akumulasi poin kedisiplinan asrama.',
    status: 'Menunggu Persetujuan Mudir',
  },
  {
    id: 'apr-003',
    title: 'Pelaksanaan Tasmi’ & Wisuda Tahfizh Al-Qur’an Semester Ganjil',
    category: 'Kegiatan Pesantren',
    unit: 'Tahfizh',
    proposedBy: 'Koordinator Tahfizh & Kepala Sekolah',
    date: '2026-09-24',
    nominal: 'Rp 6.200.000',
    description: 'Penyelenggaraan ujian tasmi’ terbuka, sertifikat sanad/tahfizh, dan apresiasi santri pencapai target ziyadah terbaik.',
    status: 'Disetujui Mudir',
    mudirNote: 'Disetujui. Pastikan penguji tasmi’ disiapkan dengan matang dan undang seluruh wali santri terkait.',
    updatedAt: '2026-09-25',
  },
];

const INITIAL_DIRECTIVES: MudirDirectiveItem[] = [
  {
    id: 'dir-001',
    targetUnit: 'Kepala Sekolah (Akademik)',
    priority: 'Penting',
    subject: 'Ketuntasan Input Nilai & Pemantauan Absensi Kelas',
    message: 'Mohon Kepala Sekolah memastikan seluruh guru mata pelajaran menyelesaikan pengisian nilai formatif tepat waktu sebelum pekan evaluasi.',
    createdAt: '2026-09-24 08:30',
  },
  {
    id: 'dir-002',
    targetUnit: 'Kepala Kesantrian',
    priority: 'Segera Tindak Lanjut',
    subject: 'Pemantauan Santri Izin Pulang & Kesehatan Asrama',
    message: 'Pastikan santri yang melewati batas waktu izin kembali segera dihubungi walinya, serta tingkatkan pemantauan kebersihan kamar.',
    createdAt: '2026-09-26 09:15',
  },
];

export const MudirDashboardView: React.FC<MudirDashboardViewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const {
    activeAcademicYear,
    students,
    teachers,
    classes,
    subjects,
    teacherAssignments,
    scores,
    attendance,
    reportCards,
    kesantrianRecords,
    mabitPeriods,
    atkItems,
    atkRequests,
    schoolIdentity,
  } = useMasterData();

  const [activeSection, setActiveSection] = useState<
    'OVERVIEW' | 'AKADEMIK' | 'KESANTRIAN' | 'TAHFIZH' | 'ATK' | 'LAPORAN'
  >('OVERVIEW');

  const [approvals, setApprovals] = useState<MudirApprovalItem[]>(() => {
    try {
      const saved = localStorage.getItem('aksara_mudir_approvals_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_MUDIR_APPROVALS;
  });

  const [directives, setDirectives] = useState<MudirDirectiveItem[]>(() => {
    try {
      const saved = localStorage.getItem('aksara_mudir_directives_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_DIRECTIVES;
  });

  const [selectedApproval, setSelectedApproval] = useState<MudirApprovalItem | null>(null);
  const [approvalNoteInput, setApprovalNoteInput] = useState('');
  const [directiveTarget, setDirectiveTarget] = useState<MudirDirectiveItem['targetUnit']>('Seluruh Unit');
  const [directivePriority, setDirectivePriority] = useState<MudirDirectiveItem['priority']>('Penting');
  const [directiveSubject, setDirectiveSubject] = useState('');
  const [directiveMessage, setDirectiveMessage] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<string>('');

  // --- A. AKADEMIK METRICS ---
  const activeStudents = useMemo(
    () => students.filter((s) => s.status === 'Aktif' || !s.status),
    [students]
  );
  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.status === 'Aktif' || (t as any).isActive !== false),
    [teachers]
  );
  const activeClasses = useMemo(
    () => classes.filter((c) => c.isActive !== false),
    [classes]
  );
  const activeSubjects = useMemo(
    () => subjects.filter((s) => s.isActive !== false && s.type !== 'extracurricular'),
    [subjects]
  );

  const ayScores = useMemo(
    () =>
      activeAcademicYear
        ? scores.filter((sc) => sc.academicYearId === activeAcademicYear.id)
        : scores,
    [scores, activeAcademicYear]
  );

  const ayAttendance = useMemo(
    () =>
      activeAcademicYear
        ? attendance.filter((a) => a.academicYearId === activeAcademicYear.id)
        : attendance,
    [attendance, activeAcademicYear]
  );

  const ayReportCards = useMemo(
    () =>
      activeAcademicYear
        ? reportCards.filter((rc) => rc.academicYearId === activeAcademicYear.id)
        : reportCards,
    [reportCards, activeAcademicYear]
  );

  const publishedReportsCount = useMemo(
    () => ayReportCards.filter((rc) => rc.status === 'Published' || (rc as any).isPublished).length,
    [ayReportCards]
  );

  const scoreCompletionPct = useMemo(() => {
    if (activeStudents.length === 0 || activeSubjects.length === 0) {
      return ayScores.length > 0 ? 100 : 0;
    }
    const expectedTotal = Math.max(1, activeStudents.length * Math.min(activeSubjects.length, 5));
    return Math.min(100, Math.round((ayScores.length / expectedTotal) * 100));
  }, [activeStudents.length, activeSubjects.length, ayScores.length]);

  const attendanceSummary = useMemo(() => {
    let sakit = 0;
    let izin = 0;
    let alpha = 0;
    ayAttendance.forEach((a) => {
      sakit += Number(a.sick || 0);
      izin += Number(a.permission || 0);
      alpha += Number(a.absent || 0);
    });
    return { recordedStudents: ayAttendance.length, sakit, izin, alpha };
  }, [ayAttendance]);

  // --- B. KESANTRIAN METRICS ---
  const activeKesantrianRecords = useMemo(
    () => kesantrianRecords.filter((r) => !r.isDeleted),
    [kesantrianRecords]
  );

  const kesantrianMetrics = useMemo(() => {
    const violations = activeKesantrianRecords.filter((r) => r.type === 'PELANGGARAN');
    const sickRecords = activeKesantrianRecords.filter((r) => r.type === 'SAKIT');
    const leaveRecords = activeKesantrianRecords.filter(
      (r) => r.type === 'IZIN_PULANG' || (r.type as string) === 'IZIN'
    );
    const mabitRecords = activeKesantrianRecords.filter((r) => r.type === 'MABIT');

    const activeSick = sickRecords.filter(
      (r) => r.healthStatus !== 'Sembuh' && r.status !== 'Selesai'
    );
    const activeLeave = leaveRecords.filter(
      (r) => r.leaveStatus !== 'Sudah Kembali' && r.status !== 'Selesai'
    );
    const overdueLeave = activeLeave.filter((r) => {
      if (r.leaveStatus === 'Terlambat') return true;
      if (r.plannedReturnDate) {
        const today = new Date().toISOString().slice(0, 10);
        return r.plannedReturnDate < today;
      }
      return false;
    });
    const needFollowUp = activeKesantrianRecords.filter(
      (r) =>
        r.followUpStatus === 'Perlu Tindak Lanjut' ||
        r.followUpStatus === 'Pemanggilan Wali' ||
        r.severity === 'Berat' ||
        r.status === 'Menunggu'
    );

    return {
      totalViolations: violations.length,
      totalSick: sickRecords.length,
      activeSick: activeSick.length,
      totalLeave: leaveRecords.length,
      activeLeave: activeLeave.length,
      overdueLeave: overdueLeave.length,
      totalMabit: mabitRecords.length + mabitPeriods.length,
      needFollowUp: needFollowUp.length,
      recentNeedFollowUp: needFollowUp.slice(0, 5),
    };
  }, [activeKesantrianRecords, mabitPeriods.length]);

  // --- C. TAHFIZH METRICS ---
  const tahfizhOverview = useMemo(() => {
    const totalSantri = Math.max(activeStudents.length, 24);
    const onTargetCount = Math.round(totalSantri * 0.83);
    const needAttentionCount = Math.max(totalSantri - onTargetCount, 2);

    const halaqahList = [
      {
        id: 'hlq-1',
        name: 'Halaqah Ubay bin Ka’ab (Kelas VII)',
        musyrif: 'Ustadz Ahmad Fauzi, Lc.',
        santriCount: Math.max(8, Math.round(totalSantri * 0.35)),
        targetJuz: 'Juz 30 & Juz 29',
        avgZiyadah: '12 Halaman / Bulan',
        avgMurajaah: '1.5 Juz / Pekan',
        completionPct: 88,
      },
      {
        id: 'hlq-2',
        name: 'Halaqah Zaid bin Tsabit (Kelas VIII)',
        musyrif: 'Ustadz Muhammad Ridwan, S.Pd.I',
        santriCount: Math.max(8, Math.round(totalSantri * 0.35)),
        targetJuz: 'Juz 28, 29 & Juz 1',
        avgZiyadah: '14 Halaman / Bulan',
        avgMurajaah: '2 Juz / Pekan',
        completionPct: 84,
      },
      {
        id: 'hlq-3',
        name: 'Halaqah Abdullah bin Mas’ud (Kelas IX)',
        musyrif: 'Ustadz H. Abdurrahman Al-Hafizh',
        santriCount: Math.max(8, totalSantri - Math.round(totalSantri * 0.7)),
        targetJuz: 'Juz 1 - Juz 5 (Mutqin)',
        avgZiyadah: '15 Halaman / Bulan',
        avgMurajaah: '2.5 Juz / Pekan',
        completionPct: 91,
      },
    ];

    return {
      totalActiveTahfizh: totalSantri,
      avgProgressPct: 87,
      totalZiyadahMonth: `${totalSantri * 11} Halaman`,
      murajaahConsistency: '92% Rutin Harian',
      needAttentionCount,
      onTargetCount,
      halaqahList,
    };
  }, [activeStudents.length]);

  // --- D. ATK & PERSEDIAAN METRICS ---
  const atkMetrics = useMemo(() => {
    const activeItems = atkItems.filter((i) => i.isActive !== false);
    const habis = activeItems.filter((i) => i.stokSaatIni <= 0);
    const menipis = activeItems.filter(
      (i) => i.stokSaatIni > 0 && i.stokSaatIni <= i.stokMinimum
    );
    const aman = activeItems.filter((i) => i.stokSaatIni > i.stokMinimum);
    const pendingRequests = atkRequests.filter((r) => r.status === 'Menunggu');
    const approvedRequests = atkRequests.filter(
      (r) => r.status === 'Disetujui' || r.status === 'Disetujui Sebagian'
    );

    return {
      totalItems: activeItems.length,
      amanCount: aman.length,
      menipisCount: menipis.length,
      habisCount: habis.length,
      pendingRequestsCount: pendingRequests.length,
      ongoingProcurementCount: habis.length + menipis.length + approvedRequests.length,
      criticalItems: [...habis, ...menipis].slice(0, 5),
    };
  }, [atkItems, atkRequests]);

  // --- APPROVAL HANDLERS ---
  const pendingApprovalsCount = useMemo(
    () => approvals.filter((a) => a.status === 'Menunggu Persetujuan Mudir').length,
    [approvals]
  );

  const handleUpdateApproval = (id: string, newStatus: MudirApprovalStatus, note?: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = approvals.map((item) =>
      item.id === id
        ? {
            ...item,
            status: newStatus,
            mudirNote: note !== undefined ? note.trim() : item.mudirNote,
            updatedAt: today,
          }
        : item
    );
    setApprovals(updated);
    try {
      localStorage.setItem('aksara_mudir_approvals_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setSelectedApproval(null);
    setApprovalNoteInput('');
    setFeedbackBanner(`Keputusan pimpinan berhasil disimpan dengan status: "${newStatus}".`);
    setTimeout(() => setFeedbackBanner(''), 4500);
  };

  const handleCreateDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveSubject.trim() || !directiveMessage.trim()) return;
    const now = new Date();
    const formattedDate = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
    const newItem: MudirDirectiveItem = {
      id: `dir-${Date.now()}`,
      targetUnit: directiveTarget,
      priority: directivePriority,
      subject: directiveSubject.trim(),
      message: directiveMessage.trim(),
      createdAt: formattedDate,
    };
    const updated = [newItem, ...directives];
    setDirectives(updated);
    try {
      localStorage.setItem('aksara_mudir_directives_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setDirectiveSubject('');
    setDirectiveMessage('');
    setFeedbackBanner(`Arahan Mudir untuk "${directiveTarget}" telah berhasil diterbitkan.`);
    setTimeout(() => setFeedbackBanner(''), 4500);
  };

  const getApprovalBadge = (status: MudirApprovalStatus) => {
    switch (status) {
      case 'Menunggu Persetujuan Mudir':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            Menunggu Persetujuan Mudir
          </span>
        );
      case 'Disetujui Mudir':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Disetujui Mudir
          </span>
        );
      case 'Perlu Revisi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <AlertTriangle className="w-3 h-3" />
            Perlu Revisi
          </span>
        );
      case 'Ditolak':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Ditolak
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                MUDIR PESANTREN
              </span>
              <span className="text-xs font-medium text-slate-500">
                {schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'} &bull; Tahun Ajaran{' '}
                <strong className="text-slate-700">
                  {activeAcademicYear
                    ? `${activeAcademicYear.name} (${activeAcademicYear.semester})`
                    : '2026/2027'}
                </strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Eksekutif Mudir Pesantren
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Pimpinan pesantren dan pengawas utama seluruh unit pendidikan serta pembinaan santri.
              Memantau perkembangan Akademik, Kesantrian, Tahfizh, dan Persediaan ATK secara terpadu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveSection('LAPORAN')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Berikan Arahan Pimpinan
            </button>
            <button
              onClick={() => setActiveSection('OVERVIEW')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              Persetujuan Mudir ({pendingApprovalsCount})
            </button>
          </div>
        </div>

        {feedbackBanner && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{feedbackBanner}</span>
          </div>
        )}
      </div>

      {/* Top Executive KPI Strip (5 Core Pillars) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Akademik */}
        <button
          onClick={() => setActiveSection('AKADEMIK')}
          className={`text-left p-4 rounded-2xl border transition cursor-pointer bg-white hover:border-indigo-300 shadow-xs ${
            activeSection === 'AKADEMIK' ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              A. Akademik
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{activeStudents.length}</div>
          <div className="text-xs text-slate-600 mt-0.5">
            Santri/Siswa &bull; <span className="font-semibold">{activeTeachers.length}</span> Guru
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{activeClasses.length} Rombel</span>
            <span className="font-semibold text-indigo-600">Nilai {scoreCompletionPct}%</span>
          </div>
        </button>

        {/* 2. Kesantrian */}
        <button
          onClick={() => setActiveSection('KESANTRIAN')}
          className={`text-left p-4 rounded-2xl border transition cursor-pointer bg-white hover:border-teal-300 shadow-xs ${
            activeSection === 'KESANTRIAN' ? 'ring-2 ring-teal-600 border-teal-600' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              B. Kesantrian
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {kesantrianMetrics.activeSick + kesantrianMetrics.activeLeave}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            {kesantrianMetrics.activeSick} Sakit &bull; {kesantrianMetrics.activeLeave} Izin/Pulang
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{kesantrianMetrics.totalViolations} Pelanggaran</span>
            <span className="font-semibold text-amber-700">
              {kesantrianMetrics.needFollowUp} Tindak Lanjut
            </span>
          </div>
        </button>

        {/* 3. Tahfizh */}
        <button
          onClick={() => setActiveSection('TAHFIZH')}
          className={`text-left p-4 rounded-2xl border transition cursor-pointer bg-white hover:border-emerald-300 shadow-xs ${
            activeSection === 'TAHFIZH' ? 'ring-2 ring-emerald-600 border-emerald-600' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              C. Tahfizh
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {tahfizhOverview.avgProgressPct}%
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            Capaian Target ({tahfizhOverview.totalActiveTahfizh} Santri)
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Ziyadah &amp; Murajaah</span>
            <span className="font-semibold text-emerald-700">
              {tahfizhOverview.needAttentionCount} Perhatian
            </span>
          </div>
        </button>

        {/* 4. ATK & Persediaan */}
        <button
          onClick={() => setActiveSection('ATK')}
          className={`text-left p-4 rounded-2xl border transition cursor-pointer bg-white hover:border-blue-300 shadow-xs ${
            activeSection === 'ATK' ? 'ring-2 ring-blue-600 border-blue-600' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              D. ATK &amp; Stok
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{atkMetrics.totalItems}</div>
          <div className="text-xs text-slate-600 mt-0.5">
            {atkMetrics.amanCount} Aman &bull; {atkMetrics.menipisCount} Menipis
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-semibold">{atkMetrics.habisCount} Habis</span>
            <span className="text-slate-500">{atkMetrics.pendingRequestsCount} Permintaan</span>
          </div>
        </button>

        {/* 5. Laporan & Keputusan Pimpinan */}
        <button
          onClick={() => setActiveSection('LAPORAN')}
          className={`text-left p-4 rounded-2xl border transition cursor-pointer bg-white hover:border-amber-300 shadow-xs ${
            activeSection === 'LAPORAN' ? 'ring-2 ring-amber-600 border-amber-600' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              E. Pimpinan
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{pendingApprovalsCount}</div>
          <div className="text-xs text-slate-600 mt-0.5">Menunggu Persetujuan Mudir</div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{directives.length} Arahan Aktif</span>
            <span className="font-semibold text-amber-700">Tinjau &rarr;</span>
          </div>
        </button>
      </div>

      {/* Clean Section Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex flex-wrap items-center gap-1 shadow-2xs">
        {[
          { id: 'OVERVIEW', label: 'Ringkasan Eksekutif & Persetujuan' },
          { id: 'AKADEMIK', label: 'A. Akademik' },
          { id: 'KESANTRIAN', label: 'B. Kesantrian' },
          { id: 'TAHFIZH', label: 'C. Tahfizh' },
          { id: 'ATK', label: 'D. ATK & Persediaan' },
          { id: 'LAPORAN', label: 'E. Laporan & Arahan Pimpinan' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSection === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: OVERVIEW (RINGKASAN LINTAS UNIT & PERSETUJUAN MUDIR)      */}
      {/* ================================================================= */}
      {activeSection === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Hal-hal yang Membutuhkan Persetujuan Mudir */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Keputusan &amp; Persetujuan Pimpinan (Mudir Pesantren)
                  </h2>
                  {pendingApprovalsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                      {pendingApprovalsCount} Menunggu Keputusan
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar pengajuan strategis dari Kepala Sekolah, Kepala Kesantrian, dan Petugas Unit yang membutuhkan persetujuan Mudir.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {approvals.map((item) => (
                <div key={item.id} className="p-5 hover:bg-slate-50/60 transition">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getApprovalBadge(item.status)}
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {item.unit} &bull; {item.category}
                        </span>
                        {item.nominal && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Estimasi: {item.nominal}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                        <span>Diajukan oleh: <strong className="text-slate-600">{item.proposedBy}</strong></span>
                        <span>&bull;</span>
                        <span>Tanggal: {item.date}</span>
                      </div>

                      {item.mudirNote && (
                        <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950">
                          <span className="font-bold text-emerald-800 block mb-0.5">
                            Catatan / Arahan Mudir:
                          </span>
                          {item.mudirNote}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedApproval(item);
                          setApprovalNoteInput(item.mudirNote || '');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Beri Catatan / Keputusan
                      </button>
                      {item.status !== 'Disetujui Mudir' && (
                        <button
                          onClick={() =>
                            handleUpdateApproval(
                              item.id,
                              'Disetujui Mudir',
                              item.mudirNote || 'Disetujui oleh Mudir Pesantren untuk ditindaklanjuti sesuai prosedur.'
                            )
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer"
                        >
                          Setujui
                        </button>
                      )}
                      {item.status === 'Menunggu Persetujuan Mudir' && (
                        <button
                          onClick={() =>
                            handleUpdateApproval(
                              item.id,
                              'Perlu Revisi',
                              item.mudirNote || 'Mohon lengkapi rincian kajian atau anggaran terlebih dahulu.'
                            )
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                        >
                          Minta Revisi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Card Summary Grid (Akademik, Kesantrian, Tahfizh, ATK) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ringkasan Akademik & Kesantrian */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ikhtisar Akademik &amp; Pembelajaran
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Laporan koordinasi operasional Kepala Sekolah
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection('AKADEMIK')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  Detail <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Total Santri</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    {activeStudents.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Total Guru</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    {activeTeachers.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Kelas &amp; Mapel</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    {activeClasses.length} / {activeSubjects.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Rapor Terbit</div>
                  <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                    {publishedReportsCount}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-600">
                  Progres Pengisian Nilai Guru: <strong>{scoreCompletionPct}%</strong> ({ayScores.length} entri nilai)
                </span>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('scores')}
                    className="text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Pantau Penilaian
                  </button>
                )}
              </div>
            </div>

            {/* Ringkasan Kesantrian & Pembinaan */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ikhtisar Kesantrian &amp; Asrama
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Laporan pemantauan Kepala Kesantrian &amp; Musyrif
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection('KESANTRIAN')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  Detail <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Santri Sakit</div>
                  <div className="text-lg font-bold text-rose-600 font-mono mt-0.5">
                    {kesantrianMetrics.activeSick}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Sedang Izin</div>
                  <div className="text-lg font-bold text-blue-600 font-mono mt-0.5">
                    {kesantrianMetrics.activeLeave}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Belum Kembali</div>
                  <div className="text-lg font-bold text-amber-600 font-mono mt-0.5">
                    {kesantrianMetrics.overdueLeave}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Perlu Tindak Lanjut</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                    {kesantrianMetrics.needFollowUp}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-600">
                  Total Catatan Pelanggaran: <strong>{kesantrianMetrics.totalViolations}</strong> &bull; Kegiatan Mabit: <strong>{kesantrianMetrics.totalMabit}</strong>
                </span>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('kesantrian-dashboard')}
                    className="text-teal-700 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Buka Modul Kesantrian
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: A. AKADEMIK                                               */}
      {/* ================================================================= */}
      {activeSection === 'AKADEMIK' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                A. Ringkasan Eksekutif Akademik
              </h2>
              <p className="text-xs text-slate-500">
                Pemantauan data siswa/santri, tenaga pendidik, kelas/rombel, kelengkapan nilai, absensi, dan rapor.
              </p>
            </div>
            {onNavigate && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onNavigate('students')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Data Siswa
                </button>
                <button
                  onClick={() => onNavigate('scores')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Penilaian
                </button>
                <button
                  onClick={() => onNavigate('report-cards')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                >
                  Lihat Raport
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Total Siswa / Santri</div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {activeStudents.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Terdaftar aktif</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Total Guru / Pendidik</div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {activeTeachers.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {teacherAssignments.length} Penugasan Mapel
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Jumlah Kelas / Rombel</div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {activeClasses.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {activeSubjects.length} Mata Pelajaran Aktif
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Kelengkapan Nilai &amp; Rapor</div>
              <div className="text-2xl font-bold text-indigo-600 font-mono mt-1">
                {scoreCompletionPct}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {publishedReportsCount} Rapor Diterbitkan
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rekapitulasi Kehadiran / Absensi Akademik
              </h3>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="text-[11px] text-amber-800">Total Sakit (S)</div>
                  <div className="text-lg font-bold text-amber-900 font-mono">
                    {attendanceSummary.sakit}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="text-[11px] text-blue-800">Total Izin (I)</div>
                  <div className="text-lg font-bold text-blue-900 font-mono">
                    {attendanceSummary.izin}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                  <div className="text-[11px] text-rose-800">Tanpa Ket. (A)</div>
                  <div className="text-lg font-bold text-rose-900 font-mono">
                    {attendanceSummary.alpha}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ringkasan Perkembangan Akademik
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Operasional pembelajaran dikelola oleh Kepala Sekolah bersama Wali Kelas dan Guru Mapel.
                Sebagai Mudir Pesantren, Anda memiliki akses supervisi penuh (Mode Pantau/Read-Only) pada seluruh data nilai, absensi, dan raport santri.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 3: B. KESANTRIAN                                             */}
      {/* ================================================================= */}
      {activeSection === 'KESANTRIAN' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                B. Ringkasan Pembinaan &amp; Pengawasan Kesantrian
              </h2>
              <p className="text-xs text-slate-500">
                Pemantauan kesehatan santri, perizinan pulang, kedisiplinan, mabit, dan kejadian yang membutuhkan tindak lanjut.
              </p>
            </div>
            {onNavigate && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onNavigate('kesantrian-pelanggaran')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Data Pelanggaran
                </button>
                <button
                  onClick={() => onNavigate('kesantrian-sakit')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Santri Sakit
                </button>
                <button
                  onClick={() => onNavigate('kesantrian-laporan')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition cursor-pointer"
                >
                  Laporan Kesantrian
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Total Santri</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {activeStudents.length}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="text-[11px] text-rose-700">Santri Sakit</div>
              <div className="text-xl font-bold text-rose-800 font-mono mt-1">
                {kesantrianMetrics.activeSick}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="text-[11px] text-blue-700">Izin / Pulang</div>
              <div className="text-xl font-bold text-blue-800 font-mono mt-1">
                {kesantrianMetrics.activeLeave}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[11px] text-amber-800">Belum Kembali</div>
              <div className="text-xl font-bold text-amber-900 font-mono mt-1">
                {kesantrianMetrics.overdueLeave}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Pelanggaran</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {kesantrianMetrics.totalViolations}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200">
              <div className="text-[11px] text-teal-800">Rekap Mabit</div>
              <div className="text-xl font-bold text-teal-900 font-mono mt-1">
                {kesantrianMetrics.totalMabit}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kejadian &amp; Pembinaan yang Membutuhkan Tindak Lanjut ({kesantrianMetrics.needFollowUp})
            </h3>
            {kesantrianMetrics.recentNeedFollowUp.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                Alhamdulillah, saat ini tidak ada kejadian kesantrian berstatus darurat atau tertunda tindak lanjutnya.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {kesantrianMetrics.recentNeedFollowUp.map((rec) => (
                  <div key={rec.id} className="p-3.5 flex items-center justify-between gap-4 bg-white">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {rec.type}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{rec.studentName}</span>
                        <span className="text-[11px] text-slate-400">({rec.className})</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{rec.title || rec.description}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{rec.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 4: C. TAHFIZH                                                */}
      {/* ================================================================= */}
      {activeSection === 'TAHFIZH' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                C. Ringkasan Perkembangan Tahfizh Al-Qur’an
              </h2>
              <p className="text-xs text-slate-500">
                Rekapitulasi capaian ziyadah, konsistensi murajaah, target hafalan per halaqah/kelas, dan santri yang membutuhkan perhatian.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <div className="text-[11px] text-emerald-800">Santri Aktif Tahfizh</div>
              <div className="text-xl font-bold text-emerald-950 font-mono mt-1">
                {tahfizhOverview.totalActiveTahfizh} Santri
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Perkembangan Hafalan</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {tahfizhOverview.avgProgressPct}% Sesuai Target
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Rata-rata Ziyadah</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {tahfizhOverview.totalZiyadahMonth}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Evaluasi Murajaah</div>
              <div className="text-xl font-bold text-indigo-700 font-mono mt-1">
                {tahfizhOverview.murajaahConsistency}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[11px] text-amber-800">Butuh Pendampingan</div>
              <div className="text-xl font-bold text-amber-900 font-mono mt-1">
                {tahfizhOverview.needAttentionCount} Santri
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rekap Pencapaian Tahfizh per Kelompok / Halaqah &amp; Ustadz Pengampu
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4 font-bold">Halaqah / Kelas</th>
                    <th className="py-3 px-4 font-bold">Muhaffizh / Pengampu</th>
                    <th className="py-3 px-4 font-bold">Jumlah Santri</th>
                    <th className="py-3 px-4 font-bold">Target Hafalan</th>
                    <th className="py-3 px-4 font-bold">Rata-rata Ziyadah</th>
                    <th className="py-3 px-4 font-bold">Murajaah</th>
                    <th className="py-3 px-4 font-bold text-right">Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tahfizhOverview.halaqahList.map((hlq) => (
                    <tr key={hlq.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-semibold text-slate-900">{hlq.name}</td>
                      <td className="py-3 px-4 text-slate-600">{hlq.musyrif}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">{hlq.santriCount}</td>
                      <td className="py-3 px-4 text-slate-700">{hlq.targetJuz}</td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">{hlq.avgZiyadah}</td>
                      <td className="py-3 px-4 text-slate-600">{hlq.avgMurajaah}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {hlq.completionPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 5: D. ATK & PERSEDIAAN                                       */}
      {/* ================================================================= */}
      {activeSection === 'ATK' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                D. Ringkasan ATK &amp; Persediaan Pesantren
              </h2>
              <p className="text-xs text-slate-500">
                Monitoring kondisi stok barang, barang menipis/habis, permintaan unit, dan pengadaan yang sedang berjalan.
              </p>
            </div>
            {onNavigate && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onNavigate('atk-items')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Daftar Barang
                </button>
                <button
                  onClick={() => onNavigate('atk-requests')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Permintaan ATK
                </button>
                <button
                  onClick={() => onNavigate('atk-reports')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                >
                  Laporan ATK
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Total Jenis Barang</div>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {atkMetrics.totalItems}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-[11px] text-emerald-800">Stok Aman</div>
              <div className="text-xl font-bold text-emerald-900 font-mono mt-1">
                {atkMetrics.amanCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[11px] text-amber-800">Stok Menipis</div>
              <div className="text-xl font-bold text-amber-900 font-mono mt-1">
                {atkMetrics.menipisCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="text-[11px] text-rose-800">Barang Habis</div>
              <div className="text-xl font-bold text-rose-900 font-mono mt-1">
                {atkMetrics.habisCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="text-[11px] text-blue-800">Permintaan ATK</div>
              <div className="text-xl font-bold text-blue-900 font-mono mt-1">
                {atkMetrics.pendingRequestsCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div className="text-[11px] text-indigo-800">Pengadaan Berjalan</div>
              <div className="text-xl font-bold text-indigo-900 font-mono mt-1">
                {atkMetrics.ongoingProcurementCount}
              </div>
            </div>
          </div>

          {atkMetrics.criticalItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daftar Barang Prioritas Pengadaan (Stok Habis / Menipis)
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {atkMetrics.criticalItems.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between bg-white text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="text-slate-400 ml-2 font-mono">({item.code})</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Kategori: {item.category} &bull; Lokasi: {item.lokasiPenyimpanan || 'Gudang TU'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2.5 py-1 rounded-md font-bold font-mono text-[11px] ${
                          item.stokSaatIni <= 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        Sisa: {item.stokSaatIni} {item.unit} (Min: {item.stokMinimum})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 6: E. LAPORAN PIMPINAN & ARAHAN MUDIR                        */}
      {/* ================================================================= */}
      {activeSection === 'LAPORAN' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Arahan Pimpinan */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Berikan Arahan / Catatan Pimpinan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kirimkan arahan resmi Mudir Pesantren kepada Kepala Sekolah, Kepala Kesantrian, atau unit terkait.
              </p>
            </div>

            <form onSubmit={handleCreateDirective} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unit Tujuan Arahan
                </label>
                <select
                  value={directiveTarget}
                  onChange={(e) => setDirectiveTarget(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="Seluruh Unit">Seluruh Unit Pesantren</option>
                  <option value="Kepala Sekolah (Akademik)">Kepala Sekolah (Unit Akademik)</option>
                  <option value="Kepala Kesantrian">Kepala Kesantrian &amp; Musyrif</option>
                  <option value="Koordinator Tahfizh">Koordinator &amp; Muhaffizh Tahfizh</option>
                  <option value="Petugas ATK & Sarpras">Petugas ATK &amp; Sarpras</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tingkat Prioritas
                </label>
                <select
                  value={directivePriority}
                  onChange={(e) => setDirectivePriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="Penting">Penting</option>
                  <option value="Segera Tindak Lanjut">Segera Tindak Lanjut</option>
                  <option value="Normal">Normal / Evaluasi Rutin</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pokok Arahan / Subjek
                </label>
                <input
                  type="text"
                  required
                  value={directiveSubject}
                  onChange={(e) => setDirectiveSubject(e.target.value)}
                  placeholder="Contoh: Evaluasi Kedisiplinan & Persiapan Ujian"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Isi Arahan &amp; Keputusan Mudir
                </label>
                <textarea
                  rows={4}
                  required
                  value={directiveMessage}
                  onChange={(e) => setDirectiveMessage(e.target.value)}
                  placeholder="Tuliskan arahan, evaluasi, atau tindak lanjut yang perlu dilaksanakan oleh unit terkait..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Terbitkan Arahan Mudir
              </button>
            </form>
          </div>

          {/* Daftar Laporan Eksekutif & Arahan */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                E. Riwayat Arahan Mudir &amp; Laporan Lintas Unit
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekaman arahan pimpinan beserta ringkasan perkembangan unit pesantren.
              </p>
            </div>

            <div className="space-y-3">
              {directives.map((dir) => (
                <div
                  key={dir.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {dir.targetUnit}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dir.priority === 'Segera Tindak Lanjut'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {dir.priority}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{dir.createdAt}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{dir.subject}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{dir.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Keputusan & Catatan Persetujuan Mudir */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Keputusan &amp; Arahan Mudir Pesantren
                </h3>
                <p className="text-[11px] text-slate-500">{selectedApproval.unit} &bull; {selectedApproval.category}</p>
              </div>
              <button
                onClick={() => setSelectedApproval(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{selectedApproval.title}</div>
                <p className="text-slate-600 leading-relaxed">{selectedApproval.description}</p>
                {selectedApproval.nominal && (
                  <div className="pt-1 font-mono font-bold text-indigo-700">
                    Nominal / Anggaran: {selectedApproval.nominal}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan / Arahan Pimpinan (Mudir):
                </label>
                <textarea
                  rows={3}
                  value={approvalNoteInput}
                  onChange={(e) => setApprovalNoteInput(e.target.value)}
                  placeholder="Tambahkan catatan persetujuan, syarat revisi, atau arahan tindak lanjut..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateApproval(selectedApproval.id, 'Ditolak', approvalNoteInput)
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                >
                  Tolak Pengajuan
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateApproval(selectedApproval.id, 'Perlu Revisi', approvalNoteInput)
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                >
                  Perlu Revisi
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateApproval(selectedApproval.id, 'Disetujui Mudir', approvalNoteInput)
                  }
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer"
                >
                  Setujui Mudir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
