import React, { useState } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { TeacherAssignment, UserRole } from '../types';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CalendarCheck,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  DoorOpen,
  ArrowRight,
  Info
} from 'lucide-react';

export const AssignmentsView: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const {
    teachers,
    classes,
    subjects,
    academicYears,
    activeAcademicYear,
    teacherAssignments,
    saveTeacherAssignment
  } = useMasterData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  // Form state for new assignment
  const [formData, setFormData] = useState({
    teacherId: teachers[0]?.id || '',
    subjectId: subjects[0]?.id || '',
    classId: classes[0]?.id || '',
    totalHoursPerWeek: 4,
    academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
    semester: (activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap'
  });

  const openAddModal = () => {
    setFormData({
      teacherId: teachers[0]?.id || '',
      subjectId: subjects[0]?.id || '',
      classId: classes[0]?.id || '',
      totalHoursPerWeek: 4,
      academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: (activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherId || !formData.subjectId || !formData.classId) {
      setFormError('Harap pilih Guru, Mata Pelajaran, dan Kelas rombel.');
      return;
    }

    const newAssignment: TeacherAssignment = {
      id: `asg_${Date.now()}`,
      teacherId: formData.teacherId,
      subjectId: formData.subjectId,
      classId: formData.classId,
      academicYearId: formData.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: formData.semester || activeAcademicYear?.semester || 'Ganjil',
      totalHoursPerWeek: Number(formData.totalHoursPerWeek) || 2
    };

    await saveTeacherAssignment(newAssignment);
    setIsModalOpen(false);

    const teacherObj = teachers.find(t => t.id === newAssignment.teacherId);
    const subjectObj = subjects.find(s => s.id === newAssignment.subjectId);
    const classObj = classes.find(c => c.id === newAssignment.classId);

    setNotice(
      `Penugasan baru ${teacherObj?.name || 'Guru'} mengajar ${subjectObj?.name || 'Mapel'} di kelas ${classObj?.name || 'Rombel'} untuk periode aktif 2026/2027 berhasil disimpan!`
    );
    setTimeout(() => setNotice(''), 5000);
  };

  // Filtered assignments
  const filteredAssignments = teacherAssignments.filter((asg) => {
    const t = teachers.find((item) => item.id === asg.teacherId);
    const c = classes.find((item) => item.id === asg.classId);
    const s = subjects.find((item) => item.id === asg.subjectId);

    const matchesSearch =
      (t?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (s?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (c?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesYear =
      selectedYearFilter === 'ALL'
        ? true
        : asg.academicYearId === selectedYearFilter;

    return matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Penugasan Guru (Jadwal & Rombel)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Periode Aktif: {activeAcademicYear?.name || '2026/2027'} ({activeAcademicYear?.semester || 'Ganjil'})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Penugasan mengajar guru ke rombongan belajar dan mata pelajaran. Terhubung via ID referensi database.
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tambah Penugasan Guru
          </button>
        )}
      </div>

      {/* Notice Notification */}
      {notice && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Info Card: Academic Year & Database Relation */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Periode Aktif: {activeAcademicYear?.name || '2026/2027'} Semester {activeAcademicYear?.semester || 'Ganjil'}
            </h4>
            <p className="text-xs text-indigo-800/80 mt-0.5">
              Setiap penugasan baru otomatis menggunakan ID periode akademik aktif (<code>{activeAcademicYear?.id || 'ay_2026_2027_1'}</code>). Penugasan periode lama tetap tersimpan utuh sebagai data historis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <span className="text-[11px] font-semibold text-slate-500">Filter Periode:</span>
          <select
            value={selectedYearFilter}
            onChange={(e) => setSelectedYearFilter(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="ALL">Semua Periode ({teacherAssignments.length})</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} ({ay.semester}) {ay.isActive ? '★ AKTIF' : '(Historis)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama guru, mata pelajaran, atau rombel kelas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        />
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kelas Rombel</th>
                <th className="py-3 px-4">Beban Ajar</th>
                <th className="py-3 px-4">Tahun Ajaran / Semester</th>
                <th className="py-3 px-4">Status Periode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada penugasan guru ditemukan untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((asg) => {
                  const t = teachers.find((item) => item.id === asg.teacherId);
                  const c = classes.find((item) => item.id === asg.classId);
                  const s = subjects.find((item) => item.id === asg.subjectId);
                  const ay = academicYears.find((item) => item.id === asg.academicYearId);
                  const isCurrentActive = ay?.isActive || asg.academicYearId === activeAcademicYear?.id;

                  return (
                    <tr key={asg.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t?.name || asg.teacherId}</div>
                        <div className="text-[11px] text-slate-400 font-mono">NIP. {t?.nip || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-indigo-700 bg-indigo-50/70 px-2 py-0.5 rounded-md">
                          {s?.name || asg.subjectId}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{s?.code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">
                          {c?.name || asg.classId}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Tingkat {c?.gradeLevel || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {asg.totalHoursPerWeek} Jam/Minggu
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {ay?.name || '2026/2027'} {asg.semester || ay?.semester || 'Ganjil'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isCurrentActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                            Historis
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Penugasan Guru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Tambah Penugasan Guru</h3>
                <p className="text-xs text-slate-500">
                  Tetapkan guru pengampu untuk mata pelajaran dan rombongan belajar
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Periode Akademik Indicator */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                  Periode Akademik Penugasan
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold text-slate-900">
                    {activeAcademicYear?.name || '2026/2027'} - Semester {activeAcademicYear?.semester || 'Ganjil'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Otomatis Periode Aktif
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  academicYearId: <code>{activeAcademicYear?.id || 'ay_2026_2027_1'}</code>
                </p>
              </div>

              {/* Guru Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Guru Pengampu <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers
                    .filter((t) => t.isActive !== false)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (NIP. {t.nip}) - {t.specialization || 'Guru'}
                      </option>
                    ))}
                </select>
              </div>

              {/* Mapel Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects
                    .filter((s) => s.isActive !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) - KKM: {s.kkm}
                      </option>
                    ))}
                </select>
              </div>

              {/* Kelas Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kelas Rombel <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">-- Pilih Rombongan Belajar --</option>
                  {classes
                    .filter((c) => c.isActive !== false)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} (Tingkat {c.gradeLevel})
                      </option>
                    ))}
                </select>
              </div>

              {/* Beban Jam Mengajar */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Beban Mengajar (Jam Pelajaran per Minggu)
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={formData.totalHoursPerWeek}
                  onChange={(e) =>
                    setFormData({ ...formData, totalHoursPerWeek: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                >
                  Simpan Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
