import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
  Users,
  GraduationCap,
  DoorOpen,
  CalendarDays,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';
import {
  INITIAL_ASSIGNMENTS,
  INITIAL_SCORES,
  INITIAL_ATTENDANCE
} from '../lib/mockData';
import { getEffectiveTeacherId, getActiveTeacherAssignments } from '../lib/dbService';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { currentUser, role } = useAuth();
  const { students, teachers, classes, subjects, academicYears, activeAcademicYear, teacherAssignments } = useMasterData();

  // Active counts based on live master data
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === 'Aktif').length;
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter((t) => t.isActive !== false).length;
  const totalClasses = classes.length;
  const activeClasses = classes.filter((c) => c.isActive !== false).length;
  // Format active year safely with clear message when none active
  const formatAcademicYear = (ay: typeof activeAcademicYear): string => {
    if (!ay || !ay.name) {
      return 'Belum ada tahun ajaran aktif';
    }
    const rawSem = ay.semester || 'Ganjil';
    const semester = rawSem.charAt(0).toUpperCase() + rawSem.slice(1).toLowerCase();
    return `${ay.name} - ${semester}`;
  };

  const activeYearDisplay = formatAcademicYear(activeAcademicYear);

  // Resolve effective teacher ID: user/guru -> teacherId
  const effectiveTeacherId = getEffectiveTeacherId(currentUser, role, teachers);

  // Wali Kelas specific stats (strictly filtered by: currentUser.teacherId -> class.teacherId / homeroomTeacherId)
  const homeroomClass = role === 'WALI_KELAS' ? (classes.find(
    (c) =>
      (c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId) &&
      (activeAcademicYear ? c.academicYearId === activeAcademicYear.id : true)
  ) || classes.find(
    (c) => c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId
  )) : null;

  const homeroomStudents = homeroomClass
    ? students.filter((s) => s.classId === homeroomClass.id && s.status === 'Aktif')
    : [];

  const homeroomAttendanceToday = INITIAL_ATTENDANCE.filter(
    (a) => a.classId === homeroomClass?.id && a.status === 'Hadir'
  );
  const homeroomAttendanceRate = Math.round(
    (homeroomAttendanceToday.length / (homeroomStudents.length || 1)) * 100
  );

  // Guru Mapel specific stats (strictly filtered by: user/guru -> teacherId -> teacherAssignments -> classId + subjectId + academicYearId)
  const myAssignments = getActiveTeacherAssignments(teacherAssignments, effectiveTeacherId, activeAcademicYear);

  const myTaughtClassIds = Array.from(new Set(myAssignments.map((a) => a.classId)));
  const myClasses = classes.filter((c) => myTaughtClassIds.includes(c.id));
  const myAssignedSubjectIds = Array.from(new Set(myAssignments.map((a) => a.subjectId)));
  const mySubjects = subjects.filter((s) => myAssignedSubjectIds.includes(s.id));
  const myStudentsCount = students.filter((s) =>
    myTaughtClassIds.includes(s.classId) && s.status === 'Aktif'
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                AKSARA Dashboard
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Tahun Ajaran Aktif:{' '}
                <strong className={activeAcademicYear ? 'text-slate-700' : 'text-amber-600 font-semibold italic'}>
                  {activeYearDisplay}
                </strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
              Selamat datang, {currentUser?.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {role === 'ADMIN' && 'Kelola struktur sekolah, pendataan siswa, guru, kelas, dan kurikulum.'}
              {role === 'KEPALA_SEKOLAH' && 'Pantau ringkasan kinerja operasional, kemajuan nilai, dan absensi sekolah.'}
              {role === 'WALI_KELAS' && `Monitoring kemajuan belajar dan kehadiran siswa kelas ${homeroomClass?.name || 'Binaan'}.`}
              {role === 'GURU_MAPEL' && 'Kelola kegiatan belajar mengajar, input nilai siswa, dan absensi mapel.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cek Absensi
            </button>
            <button
              onClick={() => onNavigate('scores')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
            >
              Lihat Nilai
            </button>
          </div>
        </div>
      </div>

      {/* =======================================================
          ADMIN DASHBOARD
         ======================================================= */}
      {role === 'ADMIN' && (
        <div className="space-y-6">
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Jumlah Siswa</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
                <div className="text-xs text-slate-500 mt-1">Siswa terdaftar aktif</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Jumlah Guru</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">{totalTeachers}</div>
                <div className="text-xs text-slate-500 mt-1">Tenaga pendidik & pengajar</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Jumlah Kelas</span>
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <DoorOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">{totalClasses}</div>
                <div className="text-xs text-slate-500 mt-1">Rombongan belajar aktif</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Tahun Ajaran</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-slate-900 truncate">
                  {activeAcademicYear?.name || 'Belum Diatur'}
                </div>
                <div className={`text-xs font-semibold mt-1 ${activeAcademicYear ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {activeAcademicYear
                    ? `Semester ${activeAcademicYear.semester.charAt(0).toUpperCase() + activeAcademicYear.semester.slice(1).toLowerCase()} (Aktif)`
                    : 'Belum ada periode aktif'}
                </div>
              </div>
            </div>
          </div>

          {/* Master Data Shortlinks & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Akses Cepat Pengelolaan Data</h3>
                <span className="text-xs text-slate-400">Database Relasional Firestore</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Data Siswa', sub: `${totalStudents} siswa`, tab: 'students', icon: GraduationCap },
                  { label: 'Data Guru', sub: `${totalTeachers} guru`, tab: 'teachers', icon: Users },
                  { label: 'Kelas & Wali', sub: `${totalClasses} kelas`, tab: 'classes', icon: DoorOpen },
                  { label: 'Mata Pelajaran', sub: `${subjects.length} mapel`, tab: 'subjects', icon: BookOpen },
                  { label: 'Penugasan Guru', sub: `${INITIAL_ASSIGNMENTS.length} jadwal`, tab: 'assignments', icon: FileCheck },
                  { label: 'Tahun Ajaran', sub: activeAcademicYear?.name ? `${activeAcademicYear.name} (${activeAcademicYear.semester})` : 'Belum diatur', tab: 'academic-years', icon: CalendarDays },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => onNavigate(item.tab)}
                      className="text-left p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition group"
                    >
                      <Icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mb-2 transition" />
                      <div className="font-medium text-xs text-slate-900 group-hover:text-indigo-900">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm mb-3">Informasi Sistem</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Koneksi Database</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Firestore Terhubung
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Autentikasi</span>
                    <span className="font-medium text-slate-800">Firebase Auth & RBAC</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Integritas Relasi Data</span>
                    <span className="font-semibold text-indigo-600">ID-Based Foreign Keys</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Versi Aplikasi</span>
                    <span className="font-medium text-slate-800">AKSARA v1.0.0</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed">
                Struktur data awal users, teachers, students, classes, subjects, dan assignments telah siap dikembangkan ke modul nilai dan absensi secara penuh.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          KEPALA SEKOLAH DASHBOARD
         ======================================================= */}
      {role === 'KEPALA_SEKOLAH' && (
        <div className="space-y-6">
          {/* Top 3 Metric Cards requested: Jumlah Siswa, Guru, Kelas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Siswa</span>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
                <span className="text-xs text-slate-400">Siswa Aktif</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Guru</span>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{totalTeachers}</div>
                <span className="text-xs text-slate-400">Guru / Staf Pengajar</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Rombongan Belajar</span>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">{totalClasses}</div>
                <span className="text-xs text-slate-400">Kelas</span>
              </div>
            </div>
          </div>

          {/* Progress Pengisian Nilai, Progress Absensi, Status Rapor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress Pengisian Nilai */}
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

            {/* Progress Absensi */}
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

            {/* Status Rapor */}
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
          {/* Requested Cards: Kelas Binaan, Jumlah Siswa, Kehadiran Hari Ini, Nilai yang Belum Lengkap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Kelas Binaan</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{homeroomClass?.name || 'VII-A'}</div>
              <div className="text-xs text-slate-500 mt-1">Tingkat Kelas 7</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Jumlah Siswa</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{homeroomStudents.length}</div>
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
              <div className="mt-2 text-2xl font-bold text-amber-600">2 Siswa</div>
              <div className="text-xs text-slate-500 mt-1">Tugas Matematika & TIK</div>
            </div>
          </div>

          {/* Quick Homeroom Student Attendance Snapshot */}
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
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
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
                    const att = INITIAL_ATTENDANCE.find((a) => a.studentId === st.id);
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
          {/* Requested Cards: Kelas yang diampu, Mata pelajaran yang diampu, Jumlah siswa, Jam Pelajaran */}
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

          {/* Table of Classes & Subject Schedule */}
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
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
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
                            const asgYear = academicYears.find((ay) => ay.id === asg.academicYearId);
                            return asgYear ? asgYear.name : (activeAcademicYear?.name || '2026/2027');
                          })()} ({asg.semester || activeAcademicYear?.semester || 'Ganjil'})
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => onNavigate('scores')}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
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
    </div>
  );
};
