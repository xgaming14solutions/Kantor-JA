import React, { useState } from 'react';
import { Teacher } from '../types';
import { useMasterData } from '../context/MasterDataContext';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Edit2,
  Power,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  BookOpen,
  DoorOpen
} from 'lucide-react';

interface TeachersViewProps {
  userRole: string;
}

export const TeachersView: React.FC<TeachersViewProps> = ({ userRole }) => {
  const { teachers, classes, saveTeacher, toggleTeacherStatus } = useMasterData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [detailTeacher, setDetailTeacher] = useState<Teacher | null>(null);

  const [formData, setFormData] = useState<{
    id: string;
    nip: string;
    name: string;
    email: string;
    gender: 'L' | 'P';
    phone: string;
    status: 'PNS' | 'PPPK' | 'GTT' | 'Honor' | 'Yayasan';
    specialization: string;
    isActive: boolean;
    notes: string;
  }>({
    id: '',
    nip: '',
    name: '',
    email: '',
    gender: 'L',
    phone: '',
    status: 'PNS',
    specialization: '',
    isActive: true,
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  // Filter teachers
  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nip.includes(searchQuery) ||
      (t.specialization && t.specialization.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesActive =
      activeFilter === 'ALL' ||
      (activeFilter === 'ACTIVE' && t.isActive !== false) ||
      (activeFilter === 'INACTIVE' && t.isActive === false);

    return matchesSearch && matchesStatus && matchesActive;
  });

  const openAddModal = () => {
    setEditingTeacher(null);
    setFormData({
      id: `t_${Date.now()}`,
      nip: '',
      name: '',
      email: '',
      gender: 'L',
      phone: '',
      status: 'PNS',
      specialization: '',
      isActive: true,
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      id: t.id,
      nip: t.nip,
      name: t.name,
      email: t.email,
      gender: t.gender,
      phone: t.phone || '',
      status: t.status,
      specialization: t.specialization || '',
      isActive: t.isActive !== false,
      notes: t.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama lengkap guru wajib diisi');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email guru wajib diisi');
      return;
    }

    const payload: Teacher = {
      id: formData.id || `t_${Date.now()}`,
      nip: formData.nip.trim() || '-',
      name: formData.name.trim(),
      email: formData.email.trim(),
      gender: formData.gender,
      phone: formData.phone.trim(),
      status: formData.status,
      specialization: formData.specialization.trim(),
      isActive: formData.isActive,
      notes: formData.notes.trim(),
    };

    await saveTeacher(payload);
    setIsModalOpen(false);
    setNotice(
      editingTeacher
        ? `Data guru ${payload.name} berhasil diperbarui.`
        : `Guru baru ${payload.name} berhasil ditambahkan ke database.`
    );
    setTimeout(() => setNotice(''), 4000);
  };

  const handleToggleActive = async (t: Teacher) => {
    const nextStatus = t.isActive === false;
    await toggleTeacherStatus(t.id);
    setNotice(
      nextStatus
        ? `Guru ${t.name} telah diaktifkan kembali.`
        : `Guru ${t.name} telah dinonaktifkan tanpa menghapus riwayat historis pengajaran.`
    );
    setTimeout(() => setNotice(''), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Data Guru & Tenaga Pendidik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil pendidik, NIP, status kepegawaian, keaktifan, dan bidang spesialisasi
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Guru
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru, NIP, atau bidang studi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Kepegawaian:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="GTT">GTT</option>
              <option value="Honor">Honor</option>
              <option value="Yayasan">Yayasan</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Keaktifan:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua</option>
              <option value="ACTIVE">Aktif Saja</option>
              <option value="INACTIVE">Nonaktif Saja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap & NIP</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Spesialisasi / Mapel</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Status Kerja</th>
                <th className="py-3 px-4">Keaktifan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((t) => {
                  const isAct = t.isActive !== false;
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/60 transition ${
                        !isAct ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          NIP. {t.nip || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{t.gender}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {t.specialization || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700">{t.email}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{t.phone || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            t.status === 'PNS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : t.status === 'PPPK'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {t.status}
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
                            onClick={() => setDetailTeacher(t)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Lihat Detail Profil"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          {userRole === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => openEditModal(t)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Edit Guru"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(t)}
                                className={`p-1.5 rounded-lg transition ${
                                  isAct
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={isAct ? 'Nonaktifkan Guru' : 'Aktifkan Guru'}
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
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada data guru yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-8 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingTeacher ? 'Ubah Data Guru' : 'Tambah Guru Baru'}
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dra. Siti Nurhaliza, M.Pd."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP / NIK</label>
                  <input
                    type="text"
                    placeholder="18 digit NIP atau NIK"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="nama@kantoja.sch.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Kepegawaian
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'PNS' | 'PPPK' | 'GTT' | 'Honor' | 'Yayasan',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="GTT">GTT (Guru Tidak Tetap)</option>
                    <option value="Honor">Honor</option>
                    <option value="Yayasan">Yayasan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bidang Keahlian / Mapel
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Matematika"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Penanggung jawab ekstrakurikuler Pramuka..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  <span className="font-semibold text-slate-800">Guru Berstatus Aktif Mengajar</span>
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
                  {editingTeacher ? 'Simpan Perubahan' : 'Simpan Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Guru */}
      {detailTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                  {detailTeacher.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{detailTeacher.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {detailTeacher.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailTeacher(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Check if homeroom for any class */}
            {(() => {
              const homeroomFor = classes.find((c) => c.homeroomTeacherId === detailTeacher.id);
              return (
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">NIP / NIK</span>
                    <span className="font-mono font-medium text-slate-900">
                      {detailTeacher.nip || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Jenis Kelamin</span>
                    <span className="font-medium text-slate-800">
                      {detailTeacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Status Kepegawaian</span>
                    <span className="font-semibold text-indigo-700">{detailTeacher.status}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Bidang Spesialisasi</span>
                    <span className="font-semibold text-slate-800">
                      {detailTeacher.specialization || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Email</span>
                    <span className="text-slate-800">{detailTeacher.email}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Nomor HP</span>
                    <span className="font-mono text-slate-800">{detailTeacher.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Wali Kelas</span>
                    <span className="font-semibold text-emerald-600">
                      {homeroomFor ? `Kelas ${homeroomFor.name}` : 'Bukan Wali Kelas'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Status Keaktifan</span>
                    <span
                      className={`font-bold ${
                        detailTeacher.isActive !== false ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {detailTeacher.isActive !== false ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  {detailTeacher.notes && (
                    <div className="pt-2">
                      <span className="text-slate-500 block mb-1">Catatan Tambahan:</span>
                      <p className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                        {detailTeacher.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailTeacher(null)}
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
