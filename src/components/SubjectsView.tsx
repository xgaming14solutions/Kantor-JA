import React, { useState } from 'react';
import { Subject } from '../types';
import { useMasterData } from '../context/MasterDataContext';
import {
  BookOpen,
  Plus,
  Edit2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Power,
  Info
} from 'lucide-react';

interface SubjectsViewProps {
  userRole: string;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({ userRole }) => {
  const { subjects, saveSubject, toggleSubjectStatus } = useMasterData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);

  const [formData, setFormData] = useState<{
    id: string;
    code: string;
    name: string;
    kkm: number;
    category: 'Umum' | 'Peminatan' | 'Muatan Lokal';
    isActive: boolean;
    description: string;
  }>({
    id: '',
    code: '',
    name: '',
    kkm: 75,
    category: 'Umum',
    isActive: true,
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  // Filtering
  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && s.isActive !== false) ||
      (statusFilter === 'INACTIVE' && s.isActive === false);

    return matchesSearch && matchesCat && matchesStatus;
  });

  const openAddModal = () => {
    setEditingSubject(null);
    setFormData({
      id: `sub_${Date.now()}`,
      code: '',
      name: '',
      kkm: 75,
      category: 'Umum',
      isActive: true,
      description: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setFormData({
      id: sub.id,
      code: sub.code,
      name: sub.name,
      kkm: sub.kkm,
      category: sub.category,
      isActive: sub.isActive !== false,
      description: sub.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama mata pelajaran harus diisi');
      return;
    }
    if (!formData.code.trim()) {
      setFormError('Kode mata pelajaran harus diisi');
      return;
    }

    const payload: Subject = {
      id: formData.id || `sub_${Date.now()}`,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      kkm: Number(formData.kkm) || 75,
      category: formData.category,
      isActive: formData.isActive,
      description: formData.description.trim(),
    };

    await saveSubject(payload);
    setIsModalOpen(false);
    setNotice(
      editingSubject
        ? `Mata pelajaran ${payload.name} berhasil diperbarui.`
        : `Mata pelajaran ${payload.name} berhasil ditambahkan.`
    );
    setTimeout(() => setNotice(''), 4000);
  };

  const handleToggleStatus = async (sub: Subject) => {
    await toggleSubjectStatus(sub.id);
    setNotice(
      `Status mata pelajaran ${sub.name} diubah menjadi ${
        sub.isActive === false ? 'Aktif' : 'Nonaktif'
      }.`
    );
    setTimeout(() => setNotice(''), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Mata Pelajaran & KKM
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kurikulum mata pelajaran, Kriteria Ketuntasan Minimal (KKM), dan kategori ajar
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Mata Pelajaran
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Kategori:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Umum">Umum</option>
              <option value="Peminatan">Peminatan</option>
              <option value="Muatan Lokal">Muatan Lokal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif Saja</option>
              <option value="INACTIVE">Nonaktif Saja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Subjects */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Standar KKM</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((s) => {
                  const isAct = s.isActive !== false;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm">
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {s.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {s.kkm}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isAct ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setDetailSubject(s)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Detail Mapel"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          {userRole === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => openEditModal(s)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Edit Mapel"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(s)}
                                className={`p-1.5 rounded-lg transition ${
                                  isAct
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isAct ? 'Nonaktifkan Mapel' : 'Aktifkan Mapel'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada mata pelajaran yang sesuai filter.
                  </td>
                </tr>
              )}
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
                {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: MAT-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Standar KKM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.kkm}
                    onChange={(e) => setFormData({ ...formData, kkm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ilmu Pengetahuan Alam"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori Kurikulum</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as 'Umum' | 'Peminatan' | 'Muatan Lokal',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="Umum">Umum (Wajib)</option>
                  <option value="Peminatan">Peminatan</option>
                  <option value="Muatan Lokal">Muatan Lokal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Silabus</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat materi pelajaran..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">Status Aktif Dalam Kurikulum</span>
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
                  {editingSubject ? 'Simpan Perubahan' : 'Tambah Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {detailSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono font-bold text-xs">
                  {detailSubject.code}
                </div>
                <h3 className="font-bold text-base text-slate-900">{detailSubject.name}</h3>
              </div>
              <button
                onClick={() => setDetailSubject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">ID Database</span>
                <span className="font-mono text-slate-800">{detailSubject.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Kategori</span>
                <span className="font-semibold text-slate-800">{detailSubject.category}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Kriteria Ketuntasan Minimal (KKM)</span>
                <span className="font-bold text-indigo-600">{detailSubject.kkm}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status Kurikulum</span>
                <span
                  className={`font-semibold ${
                    detailSubject.isActive !== false ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {detailSubject.isActive !== false ? 'Aktif Digunakan' : 'Nonaktif (Arsip)'}
                </span>
              </div>
              {detailSubject.description && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Deskripsi / Catatan:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">
                    {detailSubject.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailSubject(null)}
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
