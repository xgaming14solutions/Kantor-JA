import React, { useState } from 'react';
import { Subject } from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { ExtracurricularParticipantsView } from './ExtracurricularParticipantsView';
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
  Info,
  Sparkles,
  Layers,
  Trash2,
  AlertTriangle,
  Users
} from 'lucide-react';

interface SubjectsViewProps {
  userRole: string;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({ userRole }) => {
  const { subjects, saveSubject, toggleSubjectStatus, deleteSubject } = useMasterData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'subject' | 'extracurricular'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [detailSubject, setDetailSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [managingParticipantsSubject, setManagingParticipantsSubject] = useState<Subject | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    type: 'subject' | 'extracurricular';
    code: string;
    name: string;
    nameArab: string;
    kkm: number;
    category: 'Diniyah' | 'Umum' | string;
    isActive: boolean;
    description: string;
  }>({
    id: '',
    type: 'subject',
    code: '',
    name: '',
    nameArab: '',
    kkm: 75,
    category: 'Umum',
    isActive: true,
    description: '',
  });

  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtering
  const filteredSubjects = subjects.filter((s) => {
    const sType = s.type || 'subject';
    const sCategory = s.category || (sType === 'extracurricular' ? '' : 'Umum');
    const sNameArab = s.nameArab || '';

    // Search filter
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sNameArab.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type filter: ALL | subject | extracurricular
    const matchesType =
      selectedTypeFilter === 'ALL' || sType === selectedTypeFilter;

    // Category filter (only applicable when sType is subject or ALL)
    const matchesCat =
      selectedCategory === 'ALL' ||
      (sType === 'subject' && sCategory === selectedCategory);

    // Status filter
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && s.isActive !== false) ||
      (statusFilter === 'INACTIVE' && s.isActive === false);

    return matchesSearch && matchesType && matchesCat && matchesStatus;
  });

  const openAddModal = () => {
    setEditingSubject(null);
    setFormData({
      id: `sub_${Date.now()}`,
      type: 'subject',
      code: '',
      name: '',
      nameArab: '',
      kkm: 75,
      category: 'Diniyah',
      isActive: true,
      description: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    const isEks = sub.type === 'extracurricular';
    setEditingSubject(sub);
    setFormData({
      id: sub.id,
      type: isEks ? 'extracurricular' : 'subject',
      code: sub.code || (isEks ? `EKS-${sub.name.substring(0, 3).toUpperCase()}` : ''),
      name: sub.name,
      nameArab: sub.nameArab || '',
      kkm: typeof sub.kkm === 'number' ? sub.kkm : 75,
      category: isEks ? '' : (sub.category || 'Umum'),
      isActive: sub.isActive !== false,
      description: sub.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError(
        formData.type === 'extracurricular'
          ? 'Nama ekstrakurikuler harus diisi.'
          : 'Nama mata pelajaran harus diisi.'
      );
      return;
    }

    // Auto-generate or validate code
    let resolvedCode = formData.code.trim().toUpperCase();
    if (formData.type === 'extracurricular' && !resolvedCode) {
      const cleanSnippet = formData.name
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase();
      resolvedCode = `EKS-${cleanSnippet || '01'}`;
    }

    if (formData.type === 'subject' && !resolvedCode) {
      setFormError('Kode mata pelajaran harus diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isExtracurricular = formData.type === 'extracurricular';
      const isEdit = Boolean(editingSubject);
      const targetId = isEdit ? editingSubject!.id : (formData.id || `sub_${Date.now()}`);

      const payload: Subject = {
        id: targetId,
        type: formData.type,
        code: resolvedCode,
        name: formData.name.trim(),
        nameArab: isExtracurricular ? '' : formData.nameArab.trim(),
        kkm: isExtracurricular ? 0 : (Number(formData.kkm) || 75),
        category: isExtracurricular ? '' : (formData.category || 'Umum'),
        isActive: formData.isActive,
        description: formData.description.trim(),
        createdAt: isEdit && editingSubject?.createdAt ? editingSubject.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveSubject(payload);
      setIsModalOpen(false);
      setNotice(
        isEdit
          ? `${isExtracurricular ? 'Ekstrakurikuler' : 'Mata pelajaran'} "${payload.name}" berhasil diperbarui.`
          : `${isExtracurricular ? 'Ekstrakurikuler' : 'Mata pelajaran'} "${payload.name}" berhasil ditambahkan.`
      );
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      console.error('Error saving subject/extracurricular:', err);
      setFormError(err?.message || 'Terjadi kesalahan saat menyimpan ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sub: Subject) => {
    const isEks = sub.type === 'extracurricular';
    await toggleSubjectStatus(sub.id);
    setNotice(
      `Status ${isEks ? 'ekstrakurikuler' : 'mata pelajaran'} "${sub.name}" diubah menjadi ${
        sub.isActive === false ? 'Aktif' : 'Nonaktif'
      }.`
    );
    setTimeout(() => setNotice(''), 4000);
  };

  const confirmDelete = async () => {
    if (!deletingSubject || userRole !== 'ADMIN') return;
    setIsSubmitting(true);
    try {
      const isEks = deletingSubject.type === 'extracurricular';
      const name = deletingSubject.name;
      await deleteSubject(deletingSubject.id);
      setDeletingSubject(null);
      setNotice(`${isEks ? 'Ekstrakurikuler' : 'Mata pelajaran'} "${name}" berhasil dihapus.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      setFormError(err?.message || 'Gagal menghapus data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user clicked "Kelola Peserta" on an extracurricular item, show the participant management view
  if (managingParticipantsSubject) {
    return (
      <ExtracurricularParticipantsView
        userRole={userRole as any}
        initialExtracurricular={managingParticipantsSubject}
        onBack={() => setManagingParticipantsSubject(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Mata Pelajaran & Ekstrakurikuler
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola kurikulum mata pelajaran (Diniyah / Umum) dan kegiatan ekstrakurikuler sekolah dalam satu pintu.
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Tambah Data
          </button>
        )}
      </div>

      {/* Notice Notification */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode, nama mapel, atau ekstrakurikuler..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filter 1: Jenis (Semua / Mata Pelajaran / Ekstrakurikuler) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Jenis:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="subject">Mata Pelajaran</option>
              <option value="extracurricular">Ekstrakurikuler</option>
            </select>
          </div>

          {/* Filter 2: Kategori (Hanya relevan jika mata pelajaran atau semua) */}
          {selectedTypeFilter !== 'extracurricular' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Kategori:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="Diniyah">Diniyah</option>
                <option value="Umum">Umum</option>
              </select>
            </div>
          )}

          {/* Filter 3: Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Subjects & Extracurriculars */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Nama Data</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Standar KKM</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((s) => {
                  const isAct = s.isActive !== false;
                  const itemType = s.type || 'subject';
                  const isEks = itemType === 'extracurricular';
                  const categoryName = s.category || (isEks ? '' : 'Umum');

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      {/* 1. Kode */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {s.code || (isEks ? 'EKS' : '-')}
                      </td>

                      {/* 2. Nama */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        {s.nameArab && !isEks && (
                          <div className="text-sm font-arabic font-bold text-slate-700 mt-0.5 tracking-wide" dir="rtl">
                            {s.nameArab}
                          </div>
                        )}
                        {s.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5">
                            {s.description}
                          </div>
                        )}
                      </td>

                      {/* 3. Kolom Jenis (Badge) */}
                      <td className="py-3.5 px-4">
                        {isEks ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Ekstrakurikuler
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Mata Pelajaran
                          </span>
                        )}
                      </td>

                      {/* 4. Kategori (Diniyah / Umum / -) */}
                      <td className="py-3.5 px-4">
                        {isEks ? (
                          <span className="text-slate-400 text-xs italic">-</span>
                        ) : categoryName === 'Diniyah' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            DINIYAH
                          </span>
                        ) : categoryName === 'Umum' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            UMUM
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {categoryName || 'UMUM'}
                          </span>
                        )}
                      </td>

                      {/* 5. Standar KKM */}
                      <td className="py-3.5 px-4 text-center">
                        {isEks ? (
                          <span className="text-slate-400 text-xs">-</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {s.kkm || 75}
                          </span>
                        )}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-4 text-center">
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

                      {/* 7. Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Khusus Ekstrakurikuler: Kelola Peserta */}
                          {isEks && (
                            <button
                              type="button"
                              onClick={() => setManagingParticipantsSubject(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition cursor-pointer shadow-2xs"
                              title={`Kelola Siswa Peserta Ekstrakurikuler ${s.name}`}
                            >
                              <Users className="w-3.5 h-3.5 text-purple-600" />
                              <span>Peserta</span>
                            </button>
                          )}

                          <button
                            onClick={() => setDetailSubject(s)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Rincian"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          {userRole === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => openEditModal(s)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Edit Data"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(s)}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  isAct
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isAct ? 'Nonaktifkan' : 'Aktifkan'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingSubject(s)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus Data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada mata pelajaran atau ekstrakurikuler yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingSubject
                  ? `Edit ${formData.type === 'extracurricular' ? 'Ekstrakurikuler' : 'Mata Pelajaran'}`
                  : 'Tambah Data Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Pilihan: JENIS DATA */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Jenis Data <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      formData.type === 'subject'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="itemType"
                      value="subject"
                      checked={formData.type === 'subject'}
                      onChange={() => setFormData({ ...formData, type: 'subject' })}
                      className="sr-only"
                    />
                    <span>Mata Pelajaran</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      formData.type === 'extracurricular'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="itemType"
                      value="extracurricular"
                      checked={formData.type === 'extracurricular'}
                      onChange={() => setFormData({ ...formData, type: 'extracurricular' })}
                      className="sr-only"
                    />
                    <span>Ekstrakurikuler</span>
                  </label>
                </div>
              </div>

              {/* TAMPILAN JIKA: MATA PELAJARAN */}
              {formData.type === 'subject' && (
                <>
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
                      Nama Mata Pelajaran (Indonesia) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Aqidah atau Matematika"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Mata Pelajaran Arab <span className="text-slate-400 font-normal">(Tulisan Arab Manual)</span>
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="Contoh: العقيدة atau الرياضيات"
                      value={formData.nameArab}
                      onChange={(e) => setFormData({ ...formData, nameArab: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-arabic text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Ketik teks tulisan Arab menggunakan karakter Unicode Arab standar.
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kategori Mata Pelajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                      required
                    >
                      <option value="Diniyah">Diniyah</option>
                      <option value="Umum">Umum</option>
                    </select>
                  </div>
                </>
              )}

              {/* TAMPILAN JIKA: EKSTRAKURIKULER */}
              {formData.type === 'extracurricular' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Ekstrakurikuler <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pertanian atau Pramuka"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Keterangan
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: Kegiatan keterampilan pertanian atau kepramukaan..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </>
              )}

              {/* Status Aktif / Nonaktif (Berlaku untuk keduanya) */}
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Status Aktif</span>
                    <span className="text-[10px] text-slate-500">
                      {formData.type === 'extracurricular'
                        ? 'Ekstrakurikuler aktif dalam kegiatan sekolah'
                        : 'Mata pelajaran aktif dalam kurikulum tahun ajaran'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Menyimpan...'
                    : editingSubject
                    ? 'Simpan Perubahan'
                    : 'Simpan Data'}
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
                  {detailSubject.code || (detailSubject.type === 'extracurricular' ? 'EKS' : '-')}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{detailSubject.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{detailSubject.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailSubject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Jenis Data</span>
                <span className="font-bold text-slate-900">
                  {detailSubject.type === 'extracurricular' ? 'Ekstrakurikuler' : 'Mata Pelajaran'}
                </span>
              </div>

              {detailSubject.type !== 'extracurricular' && (
                <>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Nama (Indonesia)</span>
                    <span className="font-semibold text-slate-900">{detailSubject.name}</span>
                  </div>
                  {detailSubject.nameArab && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Nama (Arab)</span>
                      <span className="font-arabic font-bold text-slate-900 text-sm" dir="rtl">
                        {detailSubject.nameArab}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Kategori</span>
                    <span>
                      {(detailSubject.category || 'Umum') === 'Diniyah' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          DINIYAH
                        </span>
                      ) : (detailSubject.category || 'Umum') === 'Umum' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          UMUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                          {detailSubject.category || 'UMUM'}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Standar KKM</span>
                    <span className="font-bold text-indigo-600">{detailSubject.kkm || 75}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span
                  className={`font-semibold ${
                    detailSubject.isActive !== false ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {detailSubject.isActive !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {detailSubject.description && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">
                    {detailSubject.type === 'extracurricular' ? 'Keterangan Ekstrakurikuler:' : 'Keterangan / Silabus:'}
                  </span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">
                    {detailSubject.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailSubject(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Data */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 text-center">
              Konfirmasi Hapus {deletingSubject.type === 'extracurricular' ? 'Ekstrakurikuler' : 'Mata Pelajaran'}
            </h3>

            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus data <strong>{deletingSubject.name}</strong>?
            </p>

            <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>
                <strong>Nama:</strong> {deletingSubject.name}
              </div>
              <div>
                <strong>Jenis:</strong> {deletingSubject.type === 'extracurricular' ? 'Ekstrakurikuler' : 'Mata Pelajaran'}
              </div>
              {deletingSubject.type !== 'extracurricular' && (
                <div>
                  <strong>Kategori:</strong> {deletingSubject.category || 'Umum'}
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-tight">
              <strong>Catatan:</strong> Data guru, kelas, dan data siswa tidak akan terpengaruh oleh penghapusan master data ini.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
