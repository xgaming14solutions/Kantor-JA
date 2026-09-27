import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
  Users,
  GraduationCap,
  DoorOpen,
  CalendarDays,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ArrowUpRight,
  Package,
  ShieldAlert,
  HeartPulse,
  Moon,
  Pill,
  FileSpreadsheet,
  Award,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  ChevronRight
} from 'lucide-react';
import { calculateAtkStockStatus, KesantrianRecord } from '../types';
import { getEffectiveTeacherId, getActiveTeacherAssignments } from '../lib/dbService';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { currentUser, role } = useAuth();
  const {
    students,
    teachers,
    classes,
    subjects,
    academicYears,
    activeAcademicYear,
    teacherAssignments,
    scores,
    attendance,
    kesantrianRecords = [],
    mabitPeriods = [],
    atkItems,
    atkRequests,
    allowTeacherViewAtkStock,
  } = useMasterData();

  // Current formatted Indonesian date
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

  // =========================================================================
  // 1. DATA AKADEMIK AKTUAL
  // =========================================================================
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'Aktif').length;
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter((t) => t.isActive !== false).length;
  const totalClasses = classes.length;
  const activeClasses = classes.filter((c) => c.isActive !== false).length;
  const activeSubjects = subjects.filter((s) => s.isActive !== false).length;
  const activeAssignments = teacherAssignments.filter((a) => a.status !== 'Nonaktif');

  const formatAcademicYear = (ay: typeof activeAcademicYear): string => {
    if (!ay || !ay.name) {
      return 'Belum ada tahun ajaran aktif';
    }
    const rawSem = ay.semester || 'Ganjil';
    const semester = rawSem.charAt(0).toUpperCase() + rawSem.slice(1).toLowerCase();
    return `${ay.name} - Semester ${semester}`;
  };

  const activeYearDisplay = formatAcademicYear(activeAcademicYear);

  // Hitung nilai yang belum lengkap berdasarkan penugasan guru aktif & siswa aktif di kelas tersebut
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
    };
  }, [students, activeAssignments, activeAcademicYear, scores]);

  // =========================================================================
  // 2. DATA KESANTRIAN AKTUAL
  // =========================================================================
  const kesantrianStats = useMemo(() => {
    const activeRecords = kesantrianRecords.filter((r) => !r.isDeleted);

    const calculateSickDays = (rec: KesantrianRecord): number => {
      if (!rec.date) return 1;
      const parts = rec.date.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return 1;
      const startMs = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
      const nowMs = Date.now();
      const diff = Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diff);
    };

    const isLeaveOverdue = (rec: KesantrianRecord): boolean => {
      if (
        rec.status === 'Sudah Kembali' ||
        rec.status === 'Sudah Kembali ke Pesantren' ||
        rec.status === 'Sudah Sembuh' ||
        rec.status === 'Selesai'
      ) {
        return false;
      }
      const targetReturn = rec.estimatedReturnDate || rec.returnDate || '';
      if (!targetReturn) return rec.status === 'Terlambat Kembali';
      return targetReturn < todayIso || rec.status === 'Terlambat Kembali';
    };

    const sakitActive = activeRecords.filter(
      (r) =>
        r.type === 'SAKIT' &&
        r.status !== 'Sudah Sembuh' &&
        r.status !== 'Sudah Kembali ke Pesantren' &&
        r.status !== 'Selesai'
    );
    const sakitLongDuration = sakitActive.filter((r) => calculateSickDays(r) >= 3);

    const izinActive = activeRecords.filter(
      (r) => r.type === 'IZIN_PULANG' && r.status !== 'Sudah Kembali' && r.status !== 'Selesai'
    );
    const izinOverdue = izinActive.filter((r) => isLeaveOverdue(r));

    const pelanggaranAll = activeRecords.filter((r) => r.type === 'PELANGGARAN');
    const pelanggaranPending = pelanggaranAll.filter(
      (r) =>
        r.status === 'Belum Ditangani' ||
        r.status === 'Dalam Pembinaan' ||
        r.status === 'Tercatat' ||
        (!r.actionTaken?.trim() && (r.followUps || []).length === 0)
    );

    // Mabit summary from mabitPeriods or activeRecords
    const ongoingMabit =
      mabitPeriods.find((p) => {
        const hasUnreturned = (p.participants || []).some((pt) => pt.status === 'Belum Kembali');
        const isDateInRange = todayIso >= p.departureDate && todayIso <= p.returnDate;
        return isDateInRange || hasUnreturned;
      }) || mabitPeriods[0];

    const mabitTotalSantri = ongoingMabit ? (ongoingMabit.participants || []).length : 0;
    const mabitBelumKembali = ongoingMabit
      ? (ongoingMabit.participants || []).filter((pt) => pt.status === 'Belum Kembali').length
      : 0;

    // Total kejadian kesantrian yang memerlukan tindak lanjut / perhatian
    const perluPerhatianCount =
      sakitLongDuration.length +
      izinOverdue.length +
      pelanggaranPending.length +
      mabitBelumKembali;

    return {
      sakitActiveCount: sakitActive.length,
      sakitTotalCount: activeRecords.filter((r) => r.type === 'SAKIT').length,
      sakitLongDurationCount: sakitLongDuration.length,
      izinActiveCount: izinActive.length,
      izinTotalCount: activeRecords.filter((r) => r.type === 'IZIN_PULANG').length,
      izinOverdueCount: izinOverdue.length,
      pelanggaranTotalCount: pelanggaranAll.length,
      pelanggaranPendingCount: pelanggaranPending.length,
      mabitPeriodCount: mabitPeriods.length,
      mabitPeriodName: ongoingMabit?.periodName || '',
      mabitTotalSantri,
      mabitBelumKembali,
      perluPerhatianCount,
    };
  }, [kesantrianRecords, mabitPeriods, todayIso]);

  // =========================================================================
  // 3. DATA ATK & PERSEDIAAN AKTUAL
  // =========================================================================
  const atkStats = useMemo(() => {
    const activeItems = atkItems.filter((i) => i.isActive !== false);
    let stokAman = 0;
    let stokMenipis = 0;
    let habis = 0;
    let perluPengadaan = 0;

    activeItems.forEach((item) => {
      const status = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);
      if (status === 'Stok Aman') stokAman++;
      else if (status === 'Stok Menipis') stokMenipis++;
      else habis++;

      const approvedNotHandedOverQty = atkRequests
        .filter((r) => r.itemId === item.id && r.status === 'Disetujui')
        .reduce((sum, r) => sum + (r.jumlahDisetujui ?? r.jumlahDiminta ?? 0), 0);

      if (
        status === 'Habis' ||
        status === 'Stok Menipis' ||
        item.stokSaatIni < approvedNotHandedOverQty
      ) {
        perluPengadaan++;
      }
    });

    const permintaanMenunggu = atkRequests.filter((r) => r.status === 'Menunggu').length;

    return {
      totalJenis: activeItems.length,
      stokAman,
      stokMenipis,
      habis,
      permintaanMenunggu,
      perluPengadaan,
    };
  }, [atkItems, atkRequests]);

  // =========================================================================
  // 4. DAFTAR PENGINGAT "⚠️ PERLU PERHATIAN" LINTAS MODUL (UNTUK ADMINISTRATOR)
  // =========================================================================
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      dot: '🔴' | '🟠' | '🟡';
      badgeColor: string;
      moduleLabel: string;
      text: string;
      subtext: string;
      targetTab: string;
    }> = [];

    if (kesantrianStats.sakitLongDurationCount > 0) {
      items.push({
        id: 'sakit-3-hari',
        dot: '🔴',
        badgeColor: 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70',
        moduleLabel: 'Kesantrian',
        text: `${kesantrianStats.sakitLongDurationCount} santri sakit ≥ 3 hari`,
        subtext: 'Buka Kesantrian → Santri Sakit untuk memantau kondisi & tindak lanjut',
        targetTab: 'kesantrian-sakit',
      });
    } else if (kesantrianStats.sakitActiveCount > 0) {
      items.push({
        id: 'sakit-aktif',
        dot: '🟠',
        badgeColor: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70',
        moduleLabel: 'Kesantrian',
        text: `${kesantrianStats.sakitActiveCount} santri sedang sakit`,
        subtext: 'Buka Kesantrian → Santri Sakit untuk melihat perkembangan kesehatan',
        targetTab: 'kesantrian-sakit',
      });
    }

    if (atkStats.permintaanMenunggu > 0) {
      items.push({
        id: 'atk-requests-pending',
        dot: '🟠',
        badgeColor: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70',
        moduleLabel: 'ATK & Persediaan',
        text: `${atkStats.permintaanMenunggu} permintaan ATK menunggu persetujuan`,
        subtext: 'Buka Modul ATK → Permintaan ATK untuk menyetujui atau menolak',
        targetTab: 'atk-requests',
      });
    }

    if (atkStats.habis > 0) {
      items.push({
        id: 'atk-habis',
        dot: '🔴',
        badgeColor: 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70',
        moduleLabel: 'ATK & Persediaan',
        text: `${atkStats.habis} barang ATK habis`,
        subtext: 'Buka Modul ATK → Pengadaan untuk melihat daftar barang yang habis',
        targetTab: 'atk-restock',
      });
    }

    if (atkStats.stokMenipis > 0) {
      items.push({
        id: 'atk-menipis',
        dot: '🟡',
        badgeColor: 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/70',
        moduleLabel: 'ATK & Persediaan',
        text: `${atkStats.stokMenipis} barang ATK stok menipis`,
        subtext: 'Stok berada pada atau di bawah batas minimum persediaan',
        targetTab: 'atk-restock',
      });
    }

    if (incompleteScoreStats.incompleteAssignmentCount > 0) {
      items.push({
        id: 'akademik-nilai',
        dot: '🟡',
        badgeColor: 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/70',
        moduleLabel: 'Akademik',
        text: `${incompleteScoreStats.incompleteAssignmentCount} nilai mata pelajaran belum lengkap`,
        subtext: `${incompleteScoreStats.missingStudentSubjectCount} entri nilai siswa belum terisi pada periode aktif`,
        targetTab: 'scores',
      });
    }

    if (kesantrianStats.izinOverdueCount > 0) {
      items.push({
        id: 'kesantrian-izin-overdue',
        dot: '🔴',
        badgeColor: 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70',
        moduleLabel: 'Kesantrian',
        text: `${kesantrianStats.izinOverdueCount} santri melewati batas waktu izin`,
        subtext: 'Buka Kesantrian → Izin/Pulang untuk konfirmasi kepulangan santri',
        targetTab: 'kesantrian-izin',
      });
    } else if (kesantrianStats.izinActiveCount > 0) {
      items.push({
        id: 'kesantrian-izin-aktif',
        dot: '🟠',
        badgeColor: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70',
        moduleLabel: 'Kesantrian',
        text: `${kesantrianStats.izinActiveCount} santri belum kembali dari izin`,
        subtext: 'Buka Kesantrian → Izin/Pulang untuk memantau jadwal kembali',
        targetTab: 'kesantrian-izin',
      });
    }

    if (kesantrianStats.mabitBelumKembali > 0) {
      items.push({
        id: 'kesantrian-mabit-belum-kembali',
        dot: '🟠',
        badgeColor: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70',
        moduleLabel: 'Kesantrian',
        text: `${kesantrianStats.mabitBelumKembali} santri belum kembali dari Mabit`,
        subtext: `Periode ${kesantrianStats.mabitPeriodName || 'Mabit'} • Klik untuk cek daftar santri`,
        targetTab: 'kesantrian-mabit',
      });
    }

    if (kesantrianStats.pelanggaranPendingCount > 0) {
      items.push({
        id: 'kesantrian-pelanggaran-pending',
        dot: '🟠',
        badgeColor: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70',
        moduleLabel: 'Kesantrian',
        text: `${kesantrianStats.pelanggaranPendingCount} pelanggaran santri perlu tindak lanjut`,
        subtext: 'Buka Kesantrian → Pelanggaran untuk mencatat pembinaan',
        targetTab: 'kesantrian-pelanggaran',
      });
    }

    return items;
  }, [kesantrianStats, atkStats, incompleteScoreStats]);

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

  // =========================================================================
  // RENDER: 🏠 DASHBOARD ADMINISTRATOR (SATU DASHBOARD UTAMA TERPADU)
  // =========================================================================
  if (role === 'ADMIN') {
    return (
      <div className="space-y-6">
        {/* 1. HEADER UTAMA DASHBOARD ADMINISTRATOR */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                  🏠 DASHBOARD ADMINISTRATOR
                </span>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  {todayFormatted}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2.5 tracking-tight">
                Selamat datang, {currentUser?.name || 'Administrator'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Pusat kendali dan ringkasan terpadu Akademik, Kesantrian, serta ATK &amp; Persediaan AKSARA &bull; Tahun Ajaran:{' '}
                <strong
                  className={
                    activeAcademicYear ? 'text-slate-700 font-semibold' : 'text-amber-600 italic'
                  }
                >
                  {activeYearDisplay}
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => onNavigate('users')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Pengguna &amp; Role
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Identitas Sekolah
              </button>
            </div>
          </div>
        </div>

        {/* 2. BAGIAN "⚠️ PERLU PERHATIAN" LINTAS MODUL */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>⚠️ PERLU PERHATIAN</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengingat kondisi aktual dari seluruh sistem AKSARA yang membutuhkan tindak lanjut Administrator. Klik item untuk membuka halaman detail.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-center font-mono">
              {attentionItems.length} pengingat aktif
            </span>
          </div>

          {attentionItems.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Seluruh indikator Akademik, Kesantrian, dan ATK &amp; Persediaan dalam kondisi terkendali. Tidak ada antrean mendesak saat ini.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attentionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.targetTab)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer group ${item.badgeColor}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-base leading-none mt-0.5 shrink-0">{item.dot}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 text-slate-700 border border-slate-200/80">
                          {item.moduleLabel}
                        </span>
                        <span className="text-xs sm:text-sm font-bold truncate">{item.text}</span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-1 truncate">{item.subtext}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-60 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 3. RINGKASAN AKADEMIK (📚 AKADEMIK) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📚 AKADEMIK</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ringkasan data aktual siswa/santri, tenaga pendidik, mata pelajaran, kelas, dan kelengkapan penilaian.
              </p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-xs"
            >
              <span>Lihat Akademik</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <button
              onClick={() => onNavigate('students')}
              className="text-left p-4 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Siswa/Santri</span>
                <GraduationCap className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                {activeStudents}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Aktif dari {totalStudents} terdaftar
              </div>
            </button>

            <button
              onClick={() => onNavigate('teachers')}
              className="text-left p-4 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Guru</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                {activeTeachers}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Pendidik aktif ({totalTeachers} total)
              </div>
            </button>

            <button
              onClick={() => onNavigate('subjects')}
              className="text-left p-4 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Mata Pelajaran</span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                {activeSubjects}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Mata pelajaran kurikulum
              </div>
            </button>

            <button
              onClick={() => onNavigate('classes')}
              className="text-left p-4 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Rombongan Belajar</span>
                <DoorOpen className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                {activeClasses}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Kelas aktif ({totalClasses} total)
              </div>
            </button>

            <button
              onClick={() => onNavigate('scores')}
              className={`text-left p-4 rounded-xl border transition cursor-pointer col-span-2 sm:col-span-1 ${
                incompleteScoreStats.incompleteAssignmentCount > 0
                  ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60'
                  : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Nilai Belum Lengkap</span>
                <FileSpreadsheet
                  className={`w-4 h-4 ${
                    incompleteScoreStats.incompleteAssignmentCount > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                />
              </div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
                  incompleteScoreStats.incompleteAssignmentCount > 0
                    ? 'text-amber-900'
                    : 'text-emerald-900'
                }`}
              >
                {incompleteScoreStats.incompleteAssignmentCount}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {incompleteScoreStats.incompleteAssignmentCount > 0
                  ? `${incompleteScoreStats.missingStudentSubjectCount} nilai siswa belum diinput`
                  : 'Seluruh nilai mapel lengkap'}
              </div>
            </button>
          </div>

          {/* Pintasan Modul Akademik */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            {[
              { label: 'Data Siswa', tab: 'students', icon: GraduationCap },
              { label: 'Data Guru', tab: 'teachers', icon: Users },
              { label: 'Kelas & Wali', tab: 'classes', icon: DoorOpen },
              { label: 'Mata Pelajaran', tab: 'subjects', icon: BookOpen },
              { label: 'Penugasan Guru', tab: 'assignments', icon: ClipboardList },
              { label: 'Penilaian', tab: 'scores', icon: FileSpreadsheet },
              { label: 'Absensi', tab: 'attendance', icon: FileCheck },
              { label: 'Raport', tab: 'report-cards', icon: Award },
            ].map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <button
                  key={shortcut.tab}
                  onClick={() => onNavigate(shortcut.tab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{shortcut.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. RINGKASAN KESANTRIAN (🏫 KESANTRIAN) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🏫 KESANTRIAN</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan kesehatan santri, perizinan keluar/pulang, kedisiplinan, Mabit, dan kejadian yang memerlukan tindak lanjut.
              </p>
            </div>
            <button
              onClick={() => onNavigate('kesantrian-dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-xs"
            >
              <span>Lihat Kesantrian</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <button
              onClick={() => onNavigate('kesantrian-sakit')}
              className="text-left p-4 rounded-xl bg-amber-50/60 hover:bg-amber-100/50 border border-amber-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Santri Sakit</span>
                <HeartPulse className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums mt-2">
                {kesantrianStats.sakitActiveCount}
              </div>
              <div className="text-[11px] text-amber-800/80 mt-0.5">
                {kesantrianStats.sakitLongDurationCount > 0
                  ? `${kesantrianStats.sakitLongDurationCount} santri sakit ≥ 3 hari`
                  : `${kesantrianStats.sakitTotalCount} total catatan sakit`}
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-izin')}
              className="text-left p-4 rounded-xl bg-blue-50/60 hover:bg-blue-100/50 border border-blue-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-800">Izin/Pulang</span>
                <DoorOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900 font-mono tabular-nums mt-2">
                {kesantrianStats.izinActiveCount}
              </div>
              <div className="text-[11px] text-blue-800/80 mt-0.5">
                {kesantrianStats.izinOverdueCount > 0
                  ? `${kesantrianStats.izinOverdueCount} terlambat kembali`
                  : `${kesantrianStats.izinTotalCount} total catatan izin`}
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-pelanggaran')}
              className="text-left p-4 rounded-xl bg-rose-50/60 hover:bg-rose-100/50 border border-rose-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800">Pelanggaran</span>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-rose-900 font-mono tabular-nums mt-2">
                {kesantrianStats.pelanggaranTotalCount}
              </div>
              <div className="text-[11px] text-rose-800/80 mt-0.5">
                {kesantrianStats.pelanggaranPendingCount} perlu pembinaan
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-mabit')}
              className="text-left p-4 rounded-xl bg-indigo-50/60 hover:bg-indigo-100/50 border border-indigo-200 transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-800">Mabit</span>
                <Moon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-indigo-900 font-mono tabular-nums mt-2">
                {kesantrianStats.mabitBelumKembali > 0
                  ? kesantrianStats.mabitBelumKembali
                  : kesantrianStats.mabitTotalSantri || kesantrianStats.mabitPeriodCount}
              </div>
              <div className="text-[11px] text-indigo-800/80 mt-0.5 truncate">
                {kesantrianStats.mabitBelumKembali > 0
                  ? `${kesantrianStats.mabitBelumKembali} santri belum kembali`
                  : kesantrianStats.mabitPeriodName || `${kesantrianStats.mabitPeriodCount} periode Mabit`}
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-dashboard')}
              className={`text-left p-4 rounded-xl border transition cursor-pointer col-span-2 sm:col-span-1 ${
                kesantrianStats.perluPerhatianCount > 0
                  ? 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/60'
                  : 'bg-teal-50/70 border-teal-200 hover:bg-teal-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Perlu Tindak Lanjut</span>
                <AlertTriangle
                  className={`w-4 h-4 ${
                    kesantrianStats.perluPerhatianCount > 0 ? 'text-rose-600' : 'text-teal-600'
                  }`}
                />
              </div>
              <div
                className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
                  kesantrianStats.perluPerhatianCount > 0 ? 'text-rose-900' : 'text-teal-900'
                }`}
              >
                {kesantrianStats.perluPerhatianCount}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Kejadian perlu perhatian
              </div>
            </button>
          </div>

          {/* Pintasan Modul Kesantrian */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            {[
              { label: 'Ringkasan Kesantrian', tab: 'kesantrian-dashboard', icon: CheckCircle2 },
              { label: 'Pelanggaran', tab: 'kesantrian-pelanggaran', icon: ShieldAlert },
              { label: 'Santri Sakit', tab: 'kesantrian-sakit', icon: HeartPulse },
              { label: 'Izin/Pulang', tab: 'kesantrian-izin', icon: DoorOpen },
              { label: 'Mabit', tab: 'kesantrian-mabit', icon: Moon },
              { label: 'Obat & P3K', tab: 'kesantrian-obat', icon: Pill },
              { label: 'Laporan Kesantrian', tab: 'kesantrian-laporan', icon: FileSpreadsheet },
            ].map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <button
                  key={shortcut.tab}
                  onClick={() => onNavigate(shortcut.tab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-teal-50 hover:text-teal-700 border border-slate-200/80 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{shortcut.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. RINGKASAN ATK & PERSEDIAAN (📦 ATK & PERSEDIAAN) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📦 ATK &amp; PERSEDIAAN</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kondisi stok barang ATK &amp; kebutuhan kantor, permintaan guru yang menunggu persetujuan, dan daftar barang perlu pengadaan.
              </p>
            </div>
            <button
              onClick={() => onNavigate('atk-dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-xs"
            >
              <span>Lihat ATK</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <button
              onClick={() => onNavigate('atk-items')}
              className="text-left p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition cursor-pointer"
            >
              <div className="text-xs font-medium text-slate-500">Total Jenis Barang</div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
                {atkStats.totalJenis}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Master barang aktif</div>
            </button>

            <button
              onClick={() => onNavigate('atk-items')}
              className="text-left p-4 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/60 border border-emerald-200 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-emerald-700">🟢 Stok Aman</div>
              <div className="text-2xl font-bold text-emerald-900 font-mono tabular-nums mt-2">
                {atkStats.stokAman}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">Di atas stok minimum</div>
            </button>

            <button
              onClick={() => onNavigate('atk-items')}
              className="text-left p-4 rounded-xl bg-amber-50/70 hover:bg-amber-100/60 border border-amber-200 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-amber-700">🟡 Stok Menipis</div>
              <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums mt-2">
                {atkStats.stokMenipis}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">&le; batas minimum</div>
            </button>

            <button
              onClick={() => onNavigate('atk-restock')}
              className="text-left p-4 rounded-xl bg-rose-50/70 hover:bg-rose-100/60 border border-rose-200 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-rose-700">🔴 Habis</div>
              <div className="text-2xl font-bold text-rose-900 font-mono tabular-nums mt-2">
                {atkStats.habis}
              </div>
              <div className="text-[11px] text-rose-700/80 mt-0.5">Stok saat ini = 0</div>
            </button>

            <button
              onClick={() => onNavigate('atk-requests')}
              className="text-left p-4 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/60 border border-indigo-200 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-indigo-700">Permintaan</div>
              <div className="text-2xl font-bold text-indigo-900 font-mono tabular-nums mt-2">
                {atkStats.permintaanMenunggu}
              </div>
              <div className="text-[11px] text-indigo-700/80 mt-0.5">Menunggu persetujuan</div>
            </button>

            <button
              onClick={() => onNavigate('atk-restock')}
              className="text-left p-4 rounded-xl bg-purple-50/70 hover:bg-purple-100/60 border border-purple-200 transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-purple-800">Perlu Pengadaan</div>
              <div className="text-2xl font-bold text-purple-900 font-mono tabular-nums mt-2">
                {atkStats.perluPengadaan}
              </div>
              <div className="text-[11px] text-purple-700/80 mt-0.5">Perlu segera dibeli</div>
            </button>
          </div>

          {/* Pintasan Modul ATK & Persediaan */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            {[
              { label: 'Ringkasan Persediaan', tab: 'atk-dashboard', icon: Package },
              { label: 'Daftar Barang', tab: 'atk-items', icon: ClipboardList },
              { label: 'Permintaan ATK', tab: 'atk-requests', icon: FileSpreadsheet },
              { label: 'Barang Masuk', tab: 'atk-incoming', icon: ArrowDownCircle },
              { label: 'Barang Keluar', tab: 'atk-outgoing', icon: ArrowUpCircle },
              { label: 'Pengadaan', tab: 'atk-restock', icon: ShoppingCart },
              { label: 'Laporan ATK', tab: 'atk-reports', icon: FileCheck },
            ].map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <button
                  key={shortcut.tab}
                  onClick={() => onNavigate(shortcut.tab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{shortcut.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // RENDER UNTUK ROLE NON-ADMIN (KEPALA SEKOLAH, WALI KELAS, GURU MAPEL)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                AKSARA Dashboard
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {todayFormatted} &bull; Tahun Ajaran Aktif:{' '}
                <strong
                  className={
                    activeAcademicYear ? 'text-slate-700' : 'text-amber-600 font-semibold italic'
                  }
                >
                  {activeYearDisplay}
                </strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
              Selamat datang, {currentUser?.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {role === 'KEPALA_SEKOLAH' &&
                'Pantau ringkasan kinerja operasional, kemajuan nilai, dan absensi sekolah.'}
              {role === 'WALI_KELAS' &&
                `Monitoring kemajuan belajar dan kehadiran siswa kelas ${homeroomClass?.name || 'Binaan'}.`}
              {role === 'GURU_MAPEL' &&
                'Kelola kegiatan belajar mengajar, input nilai siswa, dan absensi mapel.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cek Absensi
            </button>
            <button
              onClick={() => onNavigate('scores')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              Lihat Nilai
            </button>
          </div>
        </div>
      </div>

      {/* =======================================================
          KEPALA SEKOLAH DASHBOARD
         ======================================================= */}
      {role === 'KEPALA_SEKOLAH' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Siswa</span>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{activeStudents}</div>
                <span className="text-xs text-slate-400">Siswa Aktif</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Guru</span>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{activeTeachers}</div>
                <span className="text-xs text-slate-400">Guru / Staf Pengajar Aktif</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Rombongan Belajar</span>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{activeClasses}</div>
                <span className="text-xs text-slate-400">Kelas Aktif</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-900">Progress Pengisian Nilai</h3>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">68%</div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Sebagian besar mata pelajaran telah menyelesaikan Ulangan Harian 1 dan Tugas mandiri.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-900">Progress Absensi</h3>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">95.4%</div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '95.4%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Rata-rata tingkat kehadiran siswa bulan ini. 4 siswa izin dan 1 sakit hari ini.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-900">Status Rapor</h3>
                <FileCheck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
                Persiapan Penilaian Tengah Semester
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Batas akhir pengunggahan nilai rapor semester ganjil dijadwalkan pada minggu ke-3 Desember.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          WALI KELAS DASHBOARD
         ======================================================= */}
      {role === 'WALI_KELAS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Kelas Binaan</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {homeroomClass?.name || 'VII-A'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Tingkat Kelas 7</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Jumlah Siswa</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {homeroomStudents.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Siswa kelas {homeroomClass?.name}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Kehadiran Hari Ini</span>
              <div className="mt-2 text-2xl font-bold text-emerald-600">
                {homeroomAttendanceRate}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {homeroomAttendanceToday.length} dari {homeroomStudents.length} hadir
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Nilai Belum Lengkap</span>
              <div className="mt-2 text-2xl font-bold text-amber-600">
                {incompleteScoreStats.incompleteAssignmentCount} Mapel
              </div>
              <div className="text-xs text-slate-500 mt-1">Klik Penilaian untuk detail</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Daftar Presensi Siswa Kelas {homeroomClass?.name} Hari Ini
                </h3>
                <p className="text-xs text-slate-500">Data terhubung dengan tabel absensi</p>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Buka Rekap Lengkap <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">NIS</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">L/P</th>
                    <th className="py-2.5 px-3">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {homeroomStudents.map((st) => {
                    const att = attendance.find((a) => a.studentId === st.id);
                    const status = att?.status || 'Hadir';
                    const statusColor = {
                      Hadir: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      Sakit: 'bg-amber-50 text-amber-700 border-amber-200',
                      Izin: 'bg-blue-50 text-blue-700 border-blue-200',
                      Alpa: 'bg-rose-50 text-rose-700 border-rose-200',
                    }[status];

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{st.nis}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{st.name}</td>
                        <td className="py-2.5 px-3">{st.gender}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusColor}`}
                          >
                            {status}
                          </span>
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

      {/* =======================================================
          GURU MAPEL DASHBOARD
         ======================================================= */}
      {role === 'GURU_MAPEL' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Kelas Diampu</span>
              <div className="mt-2 text-2xl font-bold text-slate-900 truncate">
                {myClasses.length > 0 ? myClasses.map((c) => c.name).join(', ') : 'Belum Ada'}
              </div>
              <div className="text-xs text-slate-500 mt-1">{myClasses.length} rombel aktif</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Mata Pelajaran</span>
              <div className="mt-2 text-xl font-bold text-slate-900 truncate">
                {mySubjects.length > 0 ? mySubjects.map((s) => s.name).join(', ') : 'Belum Ada'}
              </div>
              <div className="text-xs text-indigo-600 font-semibold mt-1">
                {mySubjects.length} Mata Pelajaran Terdaftar
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Siswa Diajar</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{myStudentsCount}</div>
              <div className="text-xs text-slate-500 mt-1">Dalam rombel yang diajar</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Beban Mengajar</span>
              <div className="mt-2 text-2xl font-bold text-indigo-600">
                {myAssignments.reduce((acc, a) => acc + (a.totalHoursPerWeek || 0), 0)} Jam
              </div>
              <div className="text-xs text-slate-500 mt-1">Tatap muka per minggu</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Penugasan Mengajar Semester Ini
                </h3>
                <p className="text-xs text-slate-500">Jadwal dan beban tatap muka per minggu</p>
              </div>
              <button
                onClick={() => onNavigate('scores')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                Kelola Nilai <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Mata Pelajaran</th>
                    <th className="py-2.5 px-3">Jam / Minggu</th>
                    <th className="py-2.5 px-3">Tahun Ajaran</th>
                    <th className="py-2.5 px-3">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myAssignments.map((asg) => {
                    const cls = classes.find((c) => c.id === asg.classId);
                    const subj = subjects.find((s) => s.id === asg.subjectId);

                    return (
                      <tr key={asg.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {cls?.name || asg.classId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-indigo-600">
                          {subj?.name || asg.subjectId}
                        </td>
                        <td className="py-2.5 px-3">{asg.totalHoursPerWeek} Jam Pelajaran</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {(() => {
                            const asgYear = academicYears.find(
                              (ay) => ay.id === asg.academicYearId
                            );
                            return asgYear
                              ? asgYear.name
                              : activeAcademicYear?.name || '2026/2027';
                          })()}{' '}
                          ({asg.semester || activeAcademicYear?.semester || 'Ganjil'})
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => onNavigate('scores')}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
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

      {/* 📦 Ringkasan Cepat ATK & Persediaan Kantor (untuk non-ADMIN) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              📦 Ringkasan ATK &amp; Persediaan Kantor
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {role === 'KEPALA_SEKOLAH'
                ? 'Pantau ketersediaan stok ATK, barang yang mulai menipis/habis, serta permintaan guru yang menunggu persetujuan.'
                : 'Ajukan permintaan kebutuhan ATK mengajar atau pantau status permintaan ATK Anda.'}
            </p>
          </div>
          <button
            onClick={() =>
              onNavigate(role === 'KEPALA_SEKOLAH' ? 'atk-dashboard' : 'atk-requests')
            }
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            {role === 'KEPALA_SEKOLAH' ? 'Lihat ATK' : 'Ajukan Permintaan ATK'}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {role === 'KEPALA_SEKOLAH' || allowTeacherViewAtkStock ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Total Jenis Barang</div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {atkStats.totalJenis} jenis
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-700">🟢 Stok Aman</div>
              <div className="text-lg font-bold text-emerald-900 font-mono tabular-nums mt-0.5">
                {atkStats.stokAman}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-700">🟡 Stok Menipis</div>
              <div className="text-lg font-bold text-amber-900 font-mono tabular-nums mt-0.5">
                {atkStats.stokMenipis}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="text-[11px] font-semibold text-rose-700">🔴 Barang Habis</div>
              <div className="text-lg font-bold text-rose-900 font-mono tabular-nums mt-0.5">
                {atkStats.habis}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div className="text-[11px] font-semibold text-indigo-700">Permintaan Menunggu</div>
              <div className="text-lg font-bold text-indigo-900 font-mono tabular-nums mt-0.5">
                {atkStats.permintaanMenunggu}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-700">
                🟡 Permintaan Saya (Menunggu)
              </div>
              <div className="text-lg font-bold text-amber-900 font-mono tabular-nums mt-0.5">
                {
                  atkRequests.filter(
                    (r) =>
                      (r.pemohonId === currentUser?.id || r.pemohonNama === currentUser?.name) &&
                      r.status === 'Menunggu'
                  ).length
                }
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-700">🟢 Disetujui</div>
              <div className="text-lg font-bold text-emerald-900 font-mono tabular-nums mt-0.5">
                {
                  atkRequests.filter(
                    (r) =>
                      (r.pemohonId === currentUser?.id || r.pemohonNama === currentUser?.name) &&
                      r.status === 'Disetujui'
                  ).length
                }
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="text-[11px] font-semibold text-blue-700">🔵 Sudah Diberikan</div>
              <div className="text-lg font-bold text-blue-900 font-mono tabular-nums mt-0.5">
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
        )}
      </div>
    </div>
  );
};
