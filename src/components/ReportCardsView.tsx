import React, { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import { calculateStudentScore, formatFinalScore } from '../lib/academicCalculation';
import { formatReportProgram, formatReportClassLabel } from '../lib/dbService';
import { ReportCard, UserRole } from '../types';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Download,
  SlidersHorizontal,
  Search,
  BookOpen,
  UserCheck,
  Save,
  X,
  Info
} from 'lucide-react';

interface ReportCardsViewProps {
  userRole?: UserRole;
  onNavigateToPrint?: (studentId?: string, classId?: string) => void;
}

export const ReportCardsView: React.FC<ReportCardsViewProps> = ({ userRole, onNavigateToPrint }) => {
  const { role, currentUser } = useAuth();
  const effectiveRole = userRole || role || 'ADMIN';

  const {
    classes,
    students,
    subjects,
    teachers,
    scores,
    activeAcademicYear,
    getAcademicSetting,
    reportCards,
    saveReportCard,
    attendance,
    schoolIdentity
  } = useMasterData();

  // Find homeroom class if current user is Wali Kelas
  const homeroomClass = useMemo(() => {
    if (effectiveRole !== 'WALI_KELAS') return null;
    const currentTeacher = teachers.find(
      (t) => t.email === currentUser?.email || t.id === currentUser?.teacherId
    );
    if (!currentTeacher) return null;
    return classes.find((c) => c.homeroomTeacherId === currentTeacher.id || c.teacherId === currentTeacher.id);
  }, [effectiveRole, currentUser, teachers, classes]);

  const activeClasses = useMemo(() => {
    return classes.filter((c) => c.isActive !== false);
  }, [classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (homeroomClass) return homeroomClass.id;
    return activeClasses[0]?.id || classes[0]?.id || '';
  });

  useEffect(() => {
    if (homeroomClass && selectedClassId !== homeroomClass.id) {
      setSelectedClassId(homeroomClass.id);
      return;
    }
    if (activeClasses.length > 0 && !activeClasses.some((c) => c.id === selectedClassId)) {
      const classWithStudents = activeClasses.find((c) =>
        students.some((s) => s.classId === c.id && s.status === 'Aktif' && (s as any).isActive !== false)
      );
      setSelectedClassId(classWithStudents?.id || activeClasses[0].id);
    }
  }, [activeClasses, students, selectedClassId, homeroomClass]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<ReportCard['status']>('Draft');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active academic setting as Single Source of Truth
  const currentAcademicSetting = useMemo(() => {
    return getAcademicSetting(
      activeAcademicYear?.id || 'ay_2026_2027_1',
      activeAcademicYear?.semester || 'Ganjil'
    );
  }, [activeAcademicYear, getAcademicSetting]);

  // Active Assessment Components (only enabled ones)
  const enabledComponents = useMemo(() => {
    return currentAcademicSetting.components.filter((c) => c.enabled);
  }, [currentAcademicSetting]);

  // Active students in selected class
  const classStudents = useMemo(() => {
    return students
      .filter(
        (s) =>
          s.classId === selectedClassId &&
          s.status === 'Aktif' &&
          (s as any).isActive !== false
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  // Current class details
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classHomeroomTeacher = teachers.find(
    (t) => t.id === selectedClass?.homeroomTeacherId || t.id === selectedClass?.teacherId
  );

  // Strictly filter ONLY active Diniyah academic subjects and deduplicate by subject name
  const diniyahSubjects = useMemo(() => {
    const candidates = subjects.filter(
      (s) =>
        (s.type || 'subject') === 'subject' &&
        s.isActive !== false &&
        (s.category || '').trim().toLowerCase() === 'diniyah'
    );

    const byName = new Map<string, typeof candidates[0]>();
    candidates.forEach((sub) => {
      const key = sub.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, sub);
      } else {
        const existingHasScores = scores.some((sc) => sc.subjectId === existing.id);
        const currentHasScores = scores.some((sc) => sc.subjectId === sub.id);
        if (currentHasScores && !existingHasScores) {
          byName.set(key, sub);
        } else if (existing.id === 'sub_aqd' && sub.id !== 'sub_aqd') {
          byName.set(key, sub);
        }
      }
    });

    return Array.from(byName.values());
  }, [subjects, scores]);

  // Calculate detailed subject scores for a given student
  const getStudentSubjectScores = (studentId: string) => {
    return diniyahSubjects.map((sub) => {
      const subScores = scores.filter(
        (sc) =>
          sc.studentId === studentId &&
          sc.classId === selectedClassId &&
          sc.subjectId === sub.id &&
          (sc.academicYearId === activeAcademicYear?.id || sc.academicYearId === activeAcademicYear?.name) &&
          (!sc.semester || sc.semester === activeAcademicYear?.semester)
      );

      // Effective KKM: checks override from active AcademicSetting, fallback to subject default
      const effectiveKkm = currentAcademicSetting.subjectKkmOverrides?.[sub.id] ?? sub.kkm ?? 75;

      // SINGLE SOURCE OF TRUTH: exact same calculation engine as Nilai Siswa
      const calcResult = calculateStudentScore(
        currentAcademicSetting,
        subScores,
        effectiveKkm,
        sub.id
      );

      return {
        subject: sub,
        effectiveKkm,
        calcResult,
        componentScores: calcResult.componentScores,
        finalScore: calcResult.finalScore,
        formattedFinalScore: calcResult.formattedFinalScore,
        isPassing: calcResult.isPassing,
        statusLabel: calcResult.statusLabel,
        totalEntries: subScores.length,
      };
    });
  };

  // Get attendance summary for student in current period
  const getStudentAttendance = (studentId: string) => {
    const studentAtt = attendance.filter(
      (a) =>
        a.studentId === studentId &&
        a.classId === selectedClassId &&
        (a.academicYearId === activeAcademicYear?.id || a.academicYearId === activeAcademicYear?.name) &&
        (!a.semester || a.semester === activeAcademicYear?.semester)
    );

    const hadir = studentAtt.filter((a) => a.status === 'Hadir').length;
    const sakit = studentAtt.filter((a) => a.status === 'Sakit').length;
    const izin = studentAtt.filter((a) => a.status === 'Izin').length;
    const alpa = studentAtt.filter((a) => a.status === 'Alpa').length;

    return { hadir, sakit, izin, alpa, total: studentAtt.length };
  };

  // Get or initialize report card record for student
  const getReportCardRecord = (studentId: string) => {
    return reportCards.find(
      (rc) =>
        rc.studentId === studentId &&
        rc.classId === selectedClassId &&
        (rc.academicYearId === activeAcademicYear?.id || rc.academicYearId === activeAcademicYear?.name) &&
        rc.semester === (activeAcademicYear?.semester || 'Ganjil')
    );
  };

  // Compute student summary row for table
  const studentSummaries = useMemo(() => {
    return filteredStudents.map((st) => {
      const subjectResults = getStudentSubjectScores(st.id);
      const scoredSubjects = subjectResults.filter((sr) => sr.finalScore !== null);
      
      const totalScore = scoredSubjects.reduce((acc, curr) => acc + (curr.finalScore || 0), 0);
      const rawAverage = scoredSubjects.length > 0 ? totalScore / scoredSubjects.length : null;
      const formattedAverage = rawAverage !== null
        ? formatFinalScore(rawAverage, currentAcademicSetting.rounding)
        : '-';

      const passingCount = scoredSubjects.filter((sr) => sr.isPassing === true).length;
      const remedialCount = scoredSubjects.filter((sr) => sr.isPassing === false).length;

      const att = getStudentAttendance(st.id);
      const reportRecord = getReportCardRecord(st.id);

      return {
        student: st,
        subjectResults,
        scoredCount: scoredSubjects.length,
        totalSubjects: diniyahSubjects.length,
        totalScore,
        rawAverage,
        formattedAverage,
        passingCount,
        remedialCount,
        attendance: att,
        reportStatus: reportRecord?.status || 'Draft',
        homeroomNotes: reportRecord?.homeroomNotes || 'Tetap pertahankan prestasi dan rajin belajar.',
      };
    });
  }, [filteredStudents, diniyahSubjects, scores, activeAcademicYear, currentAcademicSetting, attendance, reportCards]);

  // Active student for Modal
  const activeStudentDetail = useMemo(() => {
    if (!selectedStudentForModal) return null;
    return studentSummaries.find((s) => s.student.id === selectedStudentForModal) || null;
  }, [selectedStudentForModal, studentSummaries]);

  // Open modal and pre-fill form
  const handleOpenStudentModal = (studentId: string) => {
    setSelectedStudentForModal(studentId);
    const existingRc = getReportCardRecord(studentId);
    setModalNotes(existingRc?.homeroomNotes || 'Menunjukkan semangat belajar yang baik. Tingkatkan pemahaman materi secara konsisten.');
    setModalStatus(existingRc?.status || 'Draft');
    setSaveSuccessMsg(null);
  };

  // Save homeroom notes & report card status
  const handleSaveModalNotes = async () => {
    if (!activeStudentDetail) return;
    setIsSavingNotes(true);
    setSaveSuccessMsg(null);

    const rcId = `rc_${activeStudentDetail.student.id}_${selectedClassId}_${activeAcademicYear?.semester || 'Ganjil'}`;
    const newRecord: ReportCard = {
      id: rcId,
      studentId: activeStudentDetail.student.id,
      classId: selectedClassId,
      academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: activeAcademicYear?.semester || 'Ganjil',
      totalScore: activeStudentDetail.totalScore,
      averageScore: activeStudentDetail.rawAverage !== null ? Math.round(activeStudentDetail.rawAverage * 10) / 10 : undefined,
      attendanceSummary: {
        hadir: activeStudentDetail.attendance.hadir,
        sakit: activeStudentDetail.attendance.sakit,
        izin: activeStudentDetail.attendance.izin,
        alpa: activeStudentDetail.attendance.alpa,
      },
      homeroomNotes: modalNotes.trim(),
      status: modalStatus,
    };

    try {
      await saveReportCard(newRecord);
      setSaveSuccessMsg('Catatan dan status rapor berhasil disimpan ke database!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Error saving report card:', e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Print Report Card
  const handlePrint = () => {
    window.print();
  };

  // Export Class Report to CSV
  const handleExportCsv = () => {
    const headers = [
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Tahun Ajaran',
      'Semester',
      ...diniyahSubjects.map((sub) => `${sub.name} (KKM: ${currentAcademicSetting.subjectKkmOverrides?.[sub.id] ?? sub.kkm ?? 75})`),
      'Rata-Rata Nilai',
      'Mapel Tuntas',
      'Mapel Remedial',
      'Hadir',
      'Sakit',
      'Izin',
      'Alpa',
      'Status Rapor',
      'Catatan Wali Kelas'
    ];

    const rows = studentSummaries.map((item) => {
      const subjectScoresList = item.subjectResults.map((sr) => sr.formattedFinalScore);
      return [
        `"${item.student.nis}"`,
        `"${item.student.name}"`,
        `"${selectedClass?.name || ''}"`,
        `"${activeAcademicYear?.name || '2026/2027'}"`,
        `"${activeAcademicYear?.semester || 'Ganjil'}"`,
        ...subjectScoresList,
        `"${item.formattedAverage}"`,
        item.passingCount,
        item.remedialCount,
        item.attendance.hadir,
        item.attendance.sakit,
        item.attendance.izin,
        item.attendance.alpa,
        `"${item.reportStatus}"`,
        `"${item.homeroomNotes.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Rapor_${selectedClass?.name || 'Kelas'}_${activeAcademicYear?.semester || 'Ganjil'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Overall class stats
  const classAvg = useMemo(() => {
    const scoredStudents = studentSummaries.filter((s) => s.rawAverage !== null);
    if (scoredStudents.length === 0) return '-';
    const sum = scoredStudents.reduce((acc, s) => acc + (s.rawAverage || 0), 0);
    return formatFinalScore(sum / scoredStudents.length, currentAcademicSetting.rounding);
  }, [studentSummaries, currentAcademicSetting.rounding]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Modul Rapor Siswa
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Semester {activeAcademicYear?.semester || 'Ganjil'} &bull; TA {activeAcademicYear?.name || '2026/2027'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Buku Rapor & Capaian Belajar Peserta Didik
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Seluruh nilai dihitung secara terpusat berdasarkan konfigurasi Pengaturan Akademik aktif sekolah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToPrint && (
            <button
              onClick={() => onNavigateToPrint(undefined, selectedClassId)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Rapor Formal
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV Rekap
          </button>
        </div>
      </div>

      {/* Wali Kelas / Role Banner Notice */}
      {effectiveRole === 'WALI_KELAS' && homeroomClass && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-xs text-blue-900 leading-relaxed">
            <p className="font-bold">Akses Wali Kelas Terverifikasi</p>
            <p className="mt-0.5 text-blue-700">
              Anda mengelola Buku Rapor untuk <strong>{homeroomClass.name}</strong>. Anda dapat melihat rincian nilai akhir tiap mata pelajaran, mengisi catatan perkembangan siswa, dan menerbitkan lembar rapor.
            </p>
          </div>
        </div>
      )}

      {/* Academic Policy Single Source of Truth Banner */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-100 rounded-2xl p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900">Kebijakan Penilaian Terpusat (AcademicSettings):</span>
              <p className="text-slate-600 mt-0.5">
                Metode:{' '}
                <strong className="text-indigo-700">
                  {currentAcademicSetting.calculationMethod === 'WEIGHTED'
                    ? 'Rata-rata Berbobot'
                    : 'Rata-rata Biasa'}
                </strong>{' '}
                &bull; Pembulatan:{' '}
                <strong className="text-indigo-700">
                  {currentAcademicSetting.rounding === '1_decimal'
                    ? '1 Angka Desimal'
                    : currentAcademicSetting.rounding === 'round'
                    ? 'Bilangan Bulat Terdekat'
                    : 'Desimal Penuh (2 Angka)'}
                </strong>{' '}
                &bull; Status Versi: v{currentAcademicSetting.version || 1}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-indigo-100">
            <span className="text-slate-500 font-medium mr-1">Komponen Aktif:</span>
            {enabledComponents.map((comp) => (
              <span
                key={comp.code}
                className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 font-semibold text-[11px]"
              >
                {comp.name} {currentAcademicSetting.calculationMethod === 'WEIGHTED' ? `(${comp.weight}%)` : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Overview Stats Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Pilih Kelas:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={effectiveRole === 'WALI_KELAS' && !!homeroomClass}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {activeClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Tingkat {cls.gradeLevel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Cari Siswa:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Quick summary counters */}
        <div className="flex items-center gap-4 text-xs pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="text-center">
            <span className="text-[11px] text-slate-400 block">Total Siswa</span>
            <span className="text-base font-bold text-slate-800">{classStudents.length}</span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div className="text-center">
            <span className="text-[11px] text-slate-400 block">Rata-Rata Kelas</span>
            <span className="text-base font-bold text-indigo-600">{classAvg}</span>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div className="text-center">
            <span className="text-[11px] text-slate-400 block">Wali Kelas</span>
            <span className="text-xs font-semibold text-slate-700">{classHomeroomTeacher?.name || '-'}</span>
          </div>
        </div>
      </div>

      {/* Class Students Report Cards Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">NIS</th>
                <th className="py-3.5 px-4">Nama Siswa</th>
                <th className="py-3.5 px-4 text-center">Mapel Dinilai</th>
                <th className="py-3.5 px-4 text-center">Rata-Rata Rapor</th>
                <th className="py-3.5 px-4 text-center">Status Ketuntasan</th>
                <th className="py-3.5 px-4 text-center">Kehadiran (H/S/I/A)</th>
                <th className="py-3.5 px-4">Catatan Wali Kelas</th>
                <th className="py-3.5 px-4 text-center">Status Rapor</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada siswa yang ditemukan di kelas ini.
                  </td>
                </tr>
              ) : (
                studentSummaries.map((item) => (
                  <tr key={item.student.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{item.student.nis}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.student.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {item.scoredCount} / {item.totalSubjects}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-indigo-700 text-sm">
                      {item.formattedAverage}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.remedialCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          {item.remedialCount} Mapel Remedial
                        </span>
                      ) : item.scoredCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Semua Tuntas
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 bg-slate-100">
                          Belum Lengkap
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600">
                      {item.attendance.hadir} / {item.attendance.sakit} / {item.attendance.izin} / {item.attendance.alpa}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500 italic text-[11px]">
                      {item.homeroomNotes}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.reportStatus === 'Diterbitkan' || item.reportStatus === 'Disahkan'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.reportStatus === 'Ditinjau'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.reportStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenStudentModal(item.student.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Lembar Rapor
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: LEMBAR RAPOR SISWA LENGKAP (PRINT READY)
         ======================================================== */}
      {selectedStudentForModal && activeStudentDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lembar Hasil Belajar Peserta Didik (Rapor)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan'} &bull;{' '}
                    {formatReportProgram(schoolIdentity.programName, selectedClass)} &bull; Semester{' '}
                    {activeAcademicYear?.semester || 'Ganjil'} {activeAcademicYear?.name || '2025/2026'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToPrint && (
                  <button
                    onClick={() => {
                      const studentId = activeStudentDetail.student.id;
                      setSelectedStudentForModal(null);
                      onNavigateToPrint(studentId, selectedClassId);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Buka Template Cetak Rapor
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Lembar Rapor
                </button>
                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0">
              {/* Report Header Card */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  {/* Left Column */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[100px_10px_1fr]">
                      <span className="font-semibold text-slate-600">Nama Sekolah</span>
                      <span>:</span>
                      <span className="font-bold text-slate-900">
                        {schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan'}
                      </span>
                    </div>
                    <div className="grid grid-cols-[100px_10px_1fr]">
                      <span className="font-semibold text-slate-600">Program</span>
                      <span>:</span>
                      <span className="font-semibold text-slate-900">
                        {formatReportProgram(schoolIdentity.programName, selectedClass)}
                      </span>
                    </div>
                    <div className="grid grid-cols-[100px_10px_1fr]">
                      <span className="font-semibold text-slate-600">Alamat</span>
                      <span>:</span>
                      <span className="text-slate-800">{schoolIdentity.address || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[100px_10px_1fr]">
                      <span className="font-semibold text-slate-600">Nama</span>
                      <span>:</span>
                      <strong className="font-bold text-slate-900">
                        {activeStudentDetail.student.name}
                      </strong>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[95px_10px_1fr]">
                      <span className="font-semibold text-slate-600">Kelas</span>
                      <span>:</span>
                      <strong className="font-bold text-slate-900">
                        {formatReportClassLabel(selectedClass)}
                      </strong>
                    </div>
                    <div className="grid grid-cols-[95px_10px_1fr]">
                      <span className="font-semibold text-slate-600">Semester</span>
                      <span>:</span>
                      <span className="text-slate-800">{activeAcademicYear?.semester || 'Ganjil'}</span>
                    </div>
                    <div className="grid grid-cols-[95px_10px_1fr]">
                      <span className="font-semibold text-slate-600">Tahun Ajaran</span>
                      <span>:</span>
                      <span className="text-slate-800">{activeAcademicYear?.name || '2025/2026'}</span>
                    </div>
                    <div className="grid grid-cols-[95px_10px_1fr]">
                      <span className="font-semibold text-slate-600">NISN</span>
                      <span>:</span>
                      <span className="font-mono text-slate-800">
                        {activeStudentDetail.student.nisn || activeStudentDetail.student.nis || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single Source of Truth Indicator */}
              <div className="px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-800">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  Aturan Penilaian: {currentAcademicSetting.calculationMethod === 'WEIGHTED' ? 'Rata-rata Berbobot' : 'Rata-rata Biasa'} | Pembulatan: {currentAcademicSetting.rounding}
                </span>
                <span className="font-semibold text-indigo-700">
                  Rata-rata Nilai Rapor: {activeStudentDetail.formattedAverage}
                </span>
              </div>

              {/* Full Subject Score Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-semibold text-[11px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-3 text-center">KKM</th>
                      {enabledComponents.map((comp) => (
                        <th key={comp.code} className="py-3 px-3 text-center">
                          {comp.name}
                          {currentAcademicSetting.calculationMethod === 'WEIGHTED' && (
                            <span className="block text-[9px] text-slate-400 font-mono">
                              {comp.weight}%
                            </span>
                          )}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center font-bold text-indigo-700">Nilai Akhir</th>
                      <th className="py-3 px-3 text-center">Ketuntasan</th>
                      <th className="py-3 px-4">Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {activeStudentDetail.subjectResults.map((sr, idx) => (
                      <tr key={sr.subject.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {sr.subject.name}
                          <span className="block text-[10px] text-slate-400 font-normal">{sr.subject.code}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 bg-slate-50/40">
                          {sr.effectiveKkm}
                        </td>
                        {enabledComponents.map((comp) => {
                          const val = sr.componentScores[comp.code];
                          return (
                            <td key={comp.code} className="py-3 px-3 text-center font-mono">
                              {val !== null && val !== undefined ? (
                                <span className="font-semibold text-slate-800">{val}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center font-mono font-extrabold text-sm text-indigo-700 bg-indigo-50/30">
                          {sr.formattedFinalScore}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {sr.finalScore === null ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                              {sr.statusLabel}
                            </span>
                          ) : sr.isPassing ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {sr.statusLabel}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {sr.statusLabel}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-600 leading-tight">
                          {sr.finalScore !== null && sr.finalScore >= sr.effectiveKkm
                            ? 'Mencapai kompetensi dasar dengan sangat baik dan konsisten.'
                            : sr.finalScore !== null
                            ? 'Perlu bimbingan dan tindak lanjut remedial pada materi pokok.'
                            : 'Belum ada penilaian lengkap di semester ini.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-xs text-slate-800 border-t border-slate-200">
                    <tr>
                      <td colSpan={3 + enabledComponents.length} className="py-3 px-4 text-right">
                        Rata-Rata Capaian Rapor Siswa:
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-base text-indigo-700 bg-indigo-50/50">
                        {activeStudentDetail.formattedAverage}
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-slate-500 text-[11px] font-normal">
                        ({activeStudentDetail.passingCount} Mapel Tuntas &bull; {activeStudentDetail.remedialCount} Remedial)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Attendance & Homeroom Notes Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance Summary */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/40">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Rekapitulasi Kehadiran
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Hadir (H)</span>
                      <strong className="font-mono text-emerald-700">{activeStudentDetail.attendance.hadir} Hari</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Sakit (S)</span>
                      <strong className="font-mono text-amber-700">{activeStudentDetail.attendance.sakit} Hari</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600">Izin (I)</span>
                      <strong className="font-mono text-blue-700">{activeStudentDetail.attendance.izin} Hari</strong>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600">Alpa / Tanpa Keterangan (A)</span>
                      <strong className="font-mono text-rose-700">{activeStudentDetail.attendance.alpa} Hari</strong>
                    </div>
                  </div>
                </div>

                {/* Homeroom Notes & Status Editor */}
                <div className="md:col-span-2 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Catatan Perkembangan Wali Kelas
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">Status Rapor:</span>
                        <select
                          value={modalStatus}
                          onChange={(e) => setModalStatus(e.target.value as any)}
                          className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Ditinjau">Ditinjau</option>
                          <option value="Disahkan">Disahkan</option>
                          <option value="Diterbitkan">Diterbitkan</option>
                        </select>
                      </div>
                    </div>
                    <textarea
                      rows={3}
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Masukkan catatan evaluasi dan motivasi belajar peserta didik..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-slate-700"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {saveSuccessMsg ? (
                      <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {saveSuccessMsg}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Catatan akan tercetak pada lembar rapor resmi peserta didik.
                      </span>
                    )}

                    <button
                      onClick={handleSaveModalNotes}
                      disabled={isSavingNotes}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Official Signatures Section */}
              <div className="border-t border-slate-200 pt-6 mt-6">
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Mengetahui,</p>
                    <p className="text-slate-700 font-medium">Orang Tua / Wali Peserta Didik</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 inline-block min-w-32">
                      ({activeStudentDetail.student.parentName || '................................'})
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      {schoolIdentity.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-slate-700 font-medium">Wali Kelas {selectedClass?.name}</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 inline-block min-w-36">
                      {classHomeroomTeacher?.name || '(..........................................)'}
                    </p>
                    {classHomeroomTeacher?.nip && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        NIP. {classHomeroomTeacher.nip}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-slate-500">Mengetahui,</p>
                    <p className="text-slate-700 font-medium">{schoolIdentity.leaderTitle || 'Mudir / Kepala Sekolah'}</p>
                    <div className="h-16" />
                    <p className="font-bold text-slate-800 border-t border-slate-300 pt-1 inline-block min-w-36">
                      {schoolIdentity.mudirName || '(..........................................)'}
                    </p>
                    {schoolIdentity.mudirNip && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        NIP/NIK. {schoolIdentity.mudirNip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                ID Dokumen: rc_{activeStudentDetail.student.id}_{activeAcademicYear?.semester || 'Ganjil'}
              </span>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
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
