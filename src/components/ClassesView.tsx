import React, { useState } from 'react';
import { SchoolClass, Student } from '../types';
import { useMasterData } from '../context/MasterDataContext';
import {
  DoorOpen,
  Users,
  UserCheck,
  Plus,
  Edit2,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Power,
  GraduationCap
} from 'lucide-react';

interface ClassesViewProps {
  userRole: string;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ userRole }) => {
  const { classes, teachers, students, academicYears, activeAcademicYear, saveClass, toggleActiveClass } =
    useMasterData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [detailClass, setDetailClass] = useState<SchoolClass | null>(null);

  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    gradeLevel: number;
    academicYearId: string;
    semester: 'Ganjil' | 'Genap';
    homeroomTeacherId: string;
    capacity: number;
    isActive: boolean;
  }>({
    id: '',
    name: '',
    gradeLevel: 7,
    academicYearId: '',
    semester: 'Ganjil',
    homeroomTeacherId: '',
    capacity: 32,
    isActive: true,
  });

  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const openAddModal = () => {
    setEditingClass(null);
    setFormData({
      id: `c_${Date.now()}`,
      name: '',
      gradeLevel: 7,
      academicYearId: activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: activeAcademicYear?.semester || 'Ganjil',
      homeroomTeacherId: teachers[0]?.id || '',
      capacity: 32,
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: SchoolClass) => {
    setEditingClass(c);
    setFormData({
      id: c.id,
      name: c.name,
      gradeLevel: c.gradeLevel,
      academicYearId: c.academicYearId,
      semester: c.semester || 'Ganjil',
      homeroomTeacherId: c.homeroomTeacherId,
      capacity: c.capacity,
      isActive: c.isActive !== false,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama rombel/kelas wajib diisi (contoh: VII-C)');
      return;
    }
    if (!formData.homeroomTeacherId) {
      setFormError('Pilih wali kelas');
      return;
    }

    const payload: SchoolClass = {
      id: formData.id || `c_${Date.now()}`,
      name: formData.name.trim().toUpperCase(),
      gradeLevel: Number(formData.gradeLevel),
      academicYearId: formData.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: formData.semester || activeAcademicYear?.semester || 'Ganjil',
      homeroomTeacherId: formData.homeroomTeacherId,
      capacity: Number(formData.capacity) || 32,
      isActive: formData.isActive,
    };

    await saveClass(payload);
    setIsModalOpen(false);
    setNotice(
      editingClass
        ? `Kelas ${payload.name} berhasil diperbarui.`
        : `Kelas ${payload.name} berhasil ditambahkan.`
    );
    setTimeout(() => setNotice(''), 4000);
  };

  const handleToggleActive = async (c: SchoolClass) => {
    await toggleActiveClass(c.id);
    setNotice(
      `Status kelas ${c.name} diubah menjadi ${c.isActive === false ? 'Aktif' : 'Nonaktif'}.`
    );
    setTimeout(() => setNotice(''), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-indigo-600" />
            Kelas & Wali Kelas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengorganisasian rombongan belajar, kapasitas kelas, dan penunjukan guru wali kelas
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas
          </button>
        )}
      </div>

      {/* Notice */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const homeroom = teachers.find((t) => t.id === cls.homeroomTeacherId);
          const studentCount = students.filter((s) => s.classId === cls.id).length;
          const isAct = cls.isActive !== false;

          return (
            <div
              key={cls.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition hover:border-indigo-300 flex flex-col justify-between ${
                isAct ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-xs">
                      {cls.name}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Kelas {cls.name}</div>
                      <div className="text-[11px] text-slate-400">Tingkat {cls.gradeLevel}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${
                      isAct
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {isAct ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[11px] text-slate-400 font-medium">Wali Kelas (ID Guru):</div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                      <span className="truncate">{homeroom?.name || 'Belum Ditunjuk'}</span>
                    </div>
                    {homeroom?.nip && (
                      <div className="text-[10px] text-slate-400 font-mono ml-5">
                        NIP. {homeroom.nip}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span>Kapasitas Rombel</span>
                    <span className="font-semibold text-slate-900">
                      {studentCount} / {cls.capacity} Siswa
                    </span>
                  </div>

                  {/* Progress bar of capacity */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((studentCount / cls.capacity) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setDetailClass(cls)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Users className="w-3.5 h-3.5" />
                  Daftar Siswa ({studentCount})
                </button>

                {userRole === 'ADMIN' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cls)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Rombel"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(cls)}
                      className={`p-1.5 rounded-lg transition ${
                        isAct
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={isAct ? 'Nonaktifkan Kelas' : 'Aktifkan Kelas'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingClass ? 'Ubah Rombel / Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Rombel / Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: VII-C"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tingkat Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={formData.gradeLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, gradeLevel: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Wali Kelas (Homeroom Teacher) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.homeroomTeacherId}
                  onChange={(e) => setFormData({ ...formData, homeroomTeacherId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">-- Pilih Guru Wali Kelas --</option>
                  {teachers
                    .filter((t) => t.isActive !== false)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (NIP. {t.nip})
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Hubungan database terhubung melalui ID guru (teacherId).
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kapasitas Siswa</label>
                  <input
                    type="number"
                    min={10}
                    max={50}
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
                <select
                  value={formData.academicYearId}
                  onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} ({ay.semester}) {ay.isActive ? '(Aktif)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Periode aktif saat ini: {activeAcademicYear?.name || '2026/2027'} ({activeAcademicYear?.semester || 'Ganjil'}). Terhubung melalui academicYearId.
                </span>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">Status Kelas Aktif Berjalan</span>
                </label>
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
                  {editingClass ? 'Simpan Perubahan' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Kelas & Daftar Siswa */}
      {detailClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 my-8 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                  {detailClass.name}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Rombongan Belajar Kelas {detailClass.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tingkat {detailClass.gradeLevel} &bull; Kapasitas {detailClass.capacity} Siswa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailClass(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Homeroom teacher info */}
            {(() => {
              const homeroom = teachers.find((t) => t.id === detailClass.homeroomTeacherId);
              const classStudents = students.filter((s) => s.classId === detailClass.id);

              return (
                <div className="mt-4 space-y-4 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        Wali Kelas Terdaftar:
                      </span>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        {homeroom?.name || 'Belum Ditunjuk'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        NIP. {homeroom?.nip || '-'} &bull; {homeroom?.phone || '-'}
                      </div>
                    </div>
                    <div className="text-right sm:text-right">
                      <span className="text-[11px] text-slate-500 block">Total Siswa Terdaftar:</span>
                      <span className="text-lg font-bold text-indigo-600">
                        {classStudents.length} / {detailClass.capacity}
                      </span>
                    </div>
                  </div>

                  {/* List of students in this class */}
                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs mb-2">
                      Daftar Peserta Didik di Kelas {detailClass.name}:
                    </h4>
                    {classStudents.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="py-2.5 px-3">No</th>
                              <th className="py-2.5 px-3">NIS</th>
                              <th className="py-2.5 px-3">Nama Lengkap</th>
                              <th className="py-2.5 px-3">L/P</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {classStudents.map((st, idx) => (
                              <tr key={st.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                                <td className="py-2 px-3 font-mono font-medium text-slate-900">
                                  {st.nis}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{st.name}</td>
                                <td className="py-2 px-3">{st.gender}</td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {st.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Belum ada siswa yang ditempatkan pada kelas {detailClass.name}.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailClass(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition text-xs"
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
