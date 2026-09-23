import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import { getEffectiveTeacherId, getActiveTeacherAssignments } from '../lib/dbService';
import {
  BookOpen,
  Users,
  Clock,
  GraduationCap,
  Calendar,
  AlertCircle,
  Search,
  ChevronRight,
  DoorOpen,
  Sparkles
} from 'lucide-react';

export const MyClassesView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const { teacherAssignments, classes, subjects, students, activeAcademicYear, teachers } = useMasterData();

  const [selectedClassId, setSelectedClassId] = useState<string | 'ALL'>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // 1. Resolve Effective Teacher ID: user/guru -> teacherId
  const effectiveTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, role, teachers);
  }, [currentUser, role, teachers]);

  const teacherProfile = useMemo(() => {
    return teachers.find((t) => t.id === effectiveTeacherId) || null;
  }, [teachers, effectiveTeacherId]);

  // 2. Resolve Active Assignments: teacherId -> teacherAssignments -> classId + subjectId + academicYearId
  // Filtered strictly by teacherId, active academicYearId, and active semester
  const myAssignments = useMemo(() => {
    return getActiveTeacherAssignments(teacherAssignments, effectiveTeacherId, activeAcademicYear);
  }, [teacherAssignments, effectiveTeacherId, activeAcademicYear]);

  // 3. Unique Classes taught by this teacher from teacherAssignments
  const taughtClassIds = useMemo(() => {
    return Array.from(new Set(myAssignments.map((a) => a.classId)));
  }, [myAssignments]);

  const myClasses = useMemo(() => {
    return classes.filter((c) => taughtClassIds.includes(c.id));
  }, [classes, taughtClassIds]);

  // 4. Homeroom Class: ONLY for WALI_KELAS role
  const homeroomClass = useMemo(() => {
    if (role !== 'WALI_KELAS') return null;
    return classes.find(
      (c) =>
        (c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId) &&
        (activeAcademicYear ? c.academicYearId === activeAcademicYear.id : true)
    ) || null;
  }, [role, classes, effectiveTeacherId, activeAcademicYear]);

  const homeroomStudents = useMemo(() => {
    if (!homeroomClass) return [];
    return students.filter((s) => s.classId === homeroomClass.id && s.status === 'Aktif');
  }, [homeroomClass, students]);

  // 5. Total Teaching Hours per Week
  const totalHours = useMemo(() => {
    return myAssignments.reduce((sum, a) => sum + (a.totalHoursPerWeek || 0), 0);
  }, [myAssignments]);

  // 6. Accessible Classes list for filtering students (strictly taught classes for GURU_MAPEL)
  const accessibleClasses = useMemo(() => {
    if (role === 'WALI_KELAS' && homeroomClass) {
      const map = new Map<string, typeof classes[0]>();
      map.set(homeroomClass.id, homeroomClass);
      myClasses.forEach((c) => map.set(c.id, c));
      return Array.from(map.values());
    }
    return myClasses;
  }, [role, homeroomClass, myClasses]);

  const accessibleClassIds = useMemo(() => {
    return accessibleClasses.map((c) => c.id);
  }, [accessibleClasses]);

  // 7. Eligible Students (strictly from assigned classes)
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => accessibleClassIds.includes(s.classId) && s.status === 'Aktif');
  }, [students, accessibleClassIds]);

  // 8. Filtered displayed students by dropdown and search input
  const displayedStudents = useMemo(() => {
    return eligibleStudents.filter((s) => {
      const matchesClass = selectedClassId === 'ALL' ? true : s.classId === selectedClassId;
      const term = studentSearch.toLowerCase().trim();
      const matchesSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.nis.includes(term) ||
        (s.nisn && s.nisn.includes(term));
      return matchesClass && matchesSearch;
    });
  }, [eligibleStudents, selectedClassId, studentSearch]);

  // If no teacherId is linked to this user account
  if (!effectiveTeacherId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-amber-900">Akun Belum Terhubung dengan Data Guru</h3>
        <p className="text-xs text-amber-700 mt-2 leading-relaxed">
          Akun login Anda belum dikaitkan dengan profil tenaga pendidik (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-800">users.teacherId</code>). Silakan hubungi Administrator untuk menghubungkan akun Anda agar jadwal dan kelas mengajar dapat ditampilkan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base flex-shrink-0">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Kelas & Mapel Saya
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {role === 'WALI_KELAS' ? 'Wali Kelas' : 'Guru Mata Pelajaran'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Tenaga Pendidik: <strong className="text-slate-800">{teacherProfile?.name || currentUser?.name}</strong>
              </span>
              <span className="font-mono text-slate-400">
                (ID: <span className="text-indigo-600 font-semibold">{effectiveTeacherId}</span>)
              </span>
              {teacherProfile?.nip && (
                <span className="font-mono text-slate-400">&bull; NIP {teacherProfile.nip}</span>
              )}
            </div>
          </div>
        </div>

        {/* Academic Period Indicator */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start md:self-auto text-xs text-slate-700">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>
            Periode Aktif: <strong>{activeAcademicYear?.name || '2026/2027'}</strong> ({activeAcademicYear?.semester || 'Ganjil'})
          </span>
        </div>
      </div>

      {/* Homeroom Highlight (Hanya jika pengguna bertugas sebagai Wali Kelas) */}
      {role === 'WALI_KELAS' && homeroomClass && (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-indigo-200">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-indigo-300">
                  Tugas Tambahan Sebagai Wali Kelas
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] font-semibold border border-emerald-400/30">
                  Aktif
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Kelas Binaan: {homeroomClass.name} (Tingkat {homeroomClass.gradeLevel})
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Total {homeroomStudents.length} siswa binaan terdaftar dalam rombel ini.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedClassId(homeroomClass.id)}
            className="px-3.5 py-2 rounded-xl bg-white text-indigo-900 text-xs font-semibold hover:bg-indigo-50 transition shadow-xs self-start sm:self-auto cursor-pointer"
          >
            Fokus Lihat Kelas {homeroomClass.name}
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Penugasan Mengajar</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {myAssignments.length} <span className="text-xs font-normal text-slate-400">Rombel & Mapel</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Beban Mengajar</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {totalHours} <span className="text-xs font-normal text-slate-400">Jam / Minggu</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Siswa Diajar</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {eligibleStudents.length} <span className="text-xs font-normal text-slate-400">Siswa Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Penugasan Mengajar Berdasarkan teacherAssignments */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Jadwal Penugasan Mata Pelajaran (Periode Aktif {activeAcademicYear?.name || '2026/2027'})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Diambil langsung dari relasi penugasan SK mengajar (<code className="font-mono text-indigo-600">teacherAssignments</code>)
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {myAssignments.length} Penugasan Aktif
          </span>
        </div>

        {myAssignments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Tidak ada penugasan mengajar mata pelajaran untuk periode akademik aktif.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAssignments.map((asg) => {
              const cls = classes.find((c) => c.id === asg.classId);
              const sub = subjects.find((s) => s.id === asg.subjectId);
              const countInClass = students.filter((s) => s.classId === asg.classId && s.status === 'Aktif').length;
              const isSelected = selectedClassId === asg.classId;

              return (
                <div
                  key={asg.id}
                  onClick={() => setSelectedClassId(asg.classId)}
                  className={`p-4 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-bold bg-white text-indigo-700 border border-indigo-200 rounded-lg shadow-2xs">
                      Kelas {cls?.name || asg.classId}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {asg.totalHoursPerWeek} Jam / Minggu
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-base font-bold text-slate-900">
                      {sub?.name || asg.subjectId}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      {sub?.code && <span className="font-mono font-medium text-slate-600">{sub.code}</span>}
                      {sub?.code && <span>&bull;</span>}
                      <span>{countInClass} Siswa Terdaftar</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                    <span>Lihat Siswa Kelas Ini</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Roster Siswa Rombongan Belajar yang Diajar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Daftar Siswa Rombongan Belajar
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hanya menampilkan siswa dari kelas yang menjadi kewenangan penugasan mengajar Anda
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter class dropdown */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Kelas Diajar ({eligibleStudents.length} Siswa)</option>
              {accessibleClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name} {role === 'WALI_KELAS' && c.id === homeroomClass?.id ? '(Wali Kelas)' : '(Diajar)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NIS..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">NIS / NISN</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3">L/P</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa ditemukan untuk kelas terpilih.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((st, idx) => {
                  const studentClass = classes.find((c) => c.id === st.classId);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{st.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {st.nis} {st.nisn ? `/ ${st.nisn}` : ''}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-700">
                          {studentClass?.name || st.classId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
