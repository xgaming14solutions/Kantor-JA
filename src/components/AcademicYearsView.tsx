import React, { useState } from 'react';
import { AcademicYear } from '../types';
import { useMasterData } from '../context/MasterDataContext';
import {
  CalendarDays,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  CalendarCheck
} from 'lucide-react';

interface AcademicYearsViewProps {
  userRole: string;
}

export const AcademicYearsView: React.FC<AcademicYearsViewProps> = ({ userRole }) => {
  const { academicYears, activeAcademicYear, saveAcademicYear, setActiveAcademicYear } = useMasterData();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    semester: 'Ganjil' | 'Genap';
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>({
    id: '',
    name: '',
    semester: 'Ganjil',
    startDate: '',
    endDate: '',
    isActive: false,
  });

  const [formError, setFormError] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  const openAddModal = () => {
    setEditingYear(null);
    setFormData({
      id: `ay_${Date.now()}`,
      name: '2026/2027',
      semester: 'Ganjil',
      startDate: '2026-07-15',
      endDate: '2026-12-20',
      isActive: false,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      id: year.id,
      name: year.name,
      semester: year.semester,
      startDate: year.startDate || '',
      endDate: year.endDate || '',
      isActive: year.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama tahun ajaran wajib diisi (contoh: 2026/2027)');
      return;
    }

    const payload: AcademicYear = {
      id: formData.id || `ay_${Date.now()}`,
      name: formData.name.trim(),
      semester: formData.semester,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isActive: formData.isActive,
    };

    await saveAcademicYear(payload);
    setIsModalOpen(false);
    setSuccessNotice(
      editingYear
        ? `Tahun ajaran ${payload.name} (${payload.semester}) berhasil diperbarui.`
        : `Tahun ajaran ${payload.name} (${payload.semester}) berhasil ditambahkan.`
    );
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const handleQuickActivate = async (year: AcademicYear) => {
    if (year.isActive) return;
    await setActiveAcademicYear(year.id);
    setSuccessNotice(`Tahun ajaran ${year.name} (${year.semester}) sekarang menjadi periode aktif.`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
            Tahun Ajaran & Semester
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola periode kalender akademik dan tentukan satu tahun ajaran/semester yang aktif
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Tahun Ajaran
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Year Highlight Card */}
      {activeAcademicYear && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Periode Aktif Saat Ini
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                Tahun Ajaran {activeAcademicYear.name}
              </h3>
              <p className="text-sm text-indigo-200 mt-0.5">
                Semester {activeAcademicYear.semester} &bull; Periode: {activeAcademicYear.startDate || '-'} s/d{' '}
                {activeAcademicYear.endDate || '-'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-xs border border-white/10 max-w-sm">
              <span className="font-semibold text-indigo-100 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Aturan Integritas Data
              </span>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Hanya ada satu tahun ajaran/semester yang aktif pada waktu yang sama. Data historis pada tahun ajaran terdahulu tetap terjaga rapi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table of Academic Years */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Rentang Tanggal</th>
                <th className="py-3 px-4">Status Aktif</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {academicYears.map((ay) => (
                <tr
                  key={ay.id}
                  className={`hover:bg-slate-50/60 transition ${
                    ay.isActive ? 'bg-indigo-50/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                    {ay.name}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        ay.semester === 'Ganjil'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      Semester {ay.semester}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {ay.startDate && ay.endDate ? (
                      <span>
                        {ay.startDate} &mdash; {ay.endDate}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Belum ditentukan</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {ay.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                        Arsip / Tidak Aktif
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {userRole === 'ADMIN' && (
                        <>
                          {!ay.isActive && (
                            <button
                              onClick={() => handleQuickActivate(ay)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                              title="Jadikan Tahun Ajaran Aktif"
                            >
                              Aktifkan
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(ay)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Tahun Ajaran"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingYear ? 'Ubah Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Tahun Ajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 2026/2027"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-indigo-100 bg-indigo-50/40">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 block">Jadikan Periode Aktif</span>
                    <span className="text-[11px] text-slate-500">
                      Tahun ajaran yang aktif akan menjadi rujukan utama nilai dan absensi.
                    </span>
                  </div>
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
                  {editingYear ? 'Simpan Perubahan' : 'Tambah Tahun Ajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
