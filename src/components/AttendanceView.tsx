import React, { useState, useMemo, useEffect } from 'react';
import { Attendance } from '../types';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import { getEffectiveTeacherId, getActiveTeacherAssignments } from '../lib/dbService';
import { CalendarCheck, Check, CalendarDays, ShieldAlert, AlertCircle } from 'lucide-react';

export const AttendanceView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const { classes, students: allStudents, activeAcademicYear, attendance, saveAttendance, teachers, teacherAssignments } = useMasterData();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 1. Resolve Effective Teacher ID: user/guru -> teacherId
  const effectiveTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, role, teachers);
  }, [currentUser, role, teachers]);

  // 2. Resolve Active Teacher Assignments
  const myAssignments = useMemo(() => {
    return getActiveTeacherAssignments(teacherAssignments, effectiveTeacherId, activeAcademicYear);
  }, [teacherAssignments, effectiveTeacherId, activeAcademicYear]);

  // 3. Resolve Authorized Classes strictly: GURU_MAPEL only sees classes in their active assignments
  const authorizedClasses = useMemo(() => {
    if (role === 'ADMIN' || role === 'KEPALA_SEKOLAH') {
      return classes.filter((c) => c.isActive !== false);
    }
    if (role === 'GURU_MAPEL') {
      const taughtClassIds = new Set(myAssignments.map((a) => a.classId));
      return classes.filter((c) => c.isActive !== false && taughtClassIds.has(c.id));
    }
    if (role === 'WALI_KELAS') {
      const homeroomClass = classes.find(
        (c) =>
          c.isActive !== false &&
          (c.teacherId === effectiveTeacherId || c.homeroomTeacherId === effectiveTeacherId) &&
          (activeAcademicYear ? c.academicYearId === activeAcademicYear.id : true)
      );
      const authorizedIds = new Set<string>();
      if (homeroomClass) authorizedIds.add(homeroomClass.id);
      myAssignments.forEach((a) => authorizedIds.add(a.classId));
      return classes.filter((c) => c.isActive !== false && authorizedIds.has(c.id));
    }
    return [];
  }, [role, classes, myAssignments, effectiveTeacherId, activeAcademicYear]);

  // 4. Auto-sync selected class
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    if (authorizedClasses.length > 0) {
      if (!authorizedClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(authorizedClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [authorizedClasses, selectedClassId]);

  // Check if current selectedClassId is permitted
  const isClassAuthorized = authorizedClasses.some((c) => c.id === selectedClassId);

  const students = useMemo(() => {
    if (!isClassAuthorized || !selectedClassId) return [];
    return allStudents.filter((s) => s.classId === selectedClassId && s.status === 'Aktif');
  }, [allStudents, selectedClassId, isClassAuthorized]);

  const getStatus = (studentId: string) => {
    const found = attendance.find((a) => a.studentId === studentId && a.date === date);
    return found?.status || 'Hadir';
  };

  const handleStatusChange = async (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    if (!isClassAuthorized || !selectedClassId) return;

    const existing = attendance.find((a) => a.studentId === studentId && a.date === date);
    const itemToSave: Attendance = existing
      ? { ...existing, status }
      : {
          id: `att_${Date.now()}_${studentId}`,
          studentId,
          classId: selectedClassId,
          academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
          semester: activeAcademicYear?.semester || 'Ganjil',
          date,
          status,
        };
    await saveAttendance(itemToSave);
  };

  const handleSaveAll = () => {
    setSaveSuccessMsg('Data presensi berhasil disimpan dan tersinkronisasi.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Presensi & Absensi Siswa</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan kehadiran harian siswa per rombongan belajar kewenangan Anda
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>Tahun Ajaran:</span>
            <strong className="text-slate-900 font-semibold">
              {activeAcademicYear ? `${activeAcademicYear.name} - ${activeAcademicYear.semester}` : 'Belum Ada'}
            </strong>
          </div>

          {isClassAuthorized && (
            <button
              onClick={handleSaveAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Simpan Presensi
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {authorizedClasses.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-amber-900">Tidak Ada Rombel Kewenangan Presensi</h3>
          <p className="text-xs text-amber-700 mt-2 leading-relaxed">
            Anda belum memiliki penugasan mengajar aktif atau rombel binaan pada periode tahun ajaran <strong>{activeAcademicYear?.name || '2026/2027'} ({activeAcademicYear?.semester || 'Ganjil'})</strong>.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                KELAS KEWENANGAN
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {authorizedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                TANGGAL PRESENSI
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="ml-auto text-xs text-slate-500 self-end pb-1.5">
              Menampilkan {students.length} siswa terdaftar
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">L/P</th>
                    <th className="py-3 px-4 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada siswa aktif terdaftar pada kelas ini.
                      </td>
                    </tr>
                  ) : (
                    students.map((st, idx) => {
                      const status = getStatus(st.id);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{st.nis}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{st.name}</td>
                          <td className="py-3 px-4 text-slate-500">{st.gender}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map((s) => {
                                const isCurrent = status === s;
                                const colors = {
                                  Hadir: isCurrent
                                    ? 'bg-emerald-600 text-white font-semibold'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                                  Sakit: isCurrent
                                    ? 'bg-amber-600 text-white font-semibold'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                                  Izin: isCurrent
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                                  Alpa: isCurrent
                                    ? 'bg-rose-600 text-white font-semibold'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                                }[s];

                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(st.id, s)}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${colors}`}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
