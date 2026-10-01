import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { SpmbBrochure, UserRole, canManageBrochures } from '../types';
import {
  ProcessedBrochurePage,
  validateAndProcessBrochureFile,
  subscribeToBrochures,
  saveBrochureToCloud,
  setBrochureActiveStatus,
  deleteBrochureFromCloud,
  downloadBrochurePageImage,
  downloadAllBrochurePagesAsPdf,
} from '../lib/brochureService';
import {
  Plus,
  Upload,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  FileImage,
  Download,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldAlert,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface SpmbBrochuresAdminViewProps {
  userRole?: UserRole | null;
}

export const SpmbBrochuresAdminView: React.FC<SpmbBrochuresAdminViewProps> = ({ userRole }) => {
  const { currentUser, role } = useAuth();
  const effectiveRole = userRole || role;
  const isAuthorized = canManageBrochures(effectiveRole);

  const [brochures, setBrochures] = useState<SpmbBrochure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Upload / Edit Modal States
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingBrochure, setEditingBrochure] = useState<SpmbBrochure | null>(null);
  const [title, setTitle] = useState<string>('SPMB Mutiara Insan Tahun Ajaran 2027–2028');
  const [academicYear, setAcademicYear] = useState<string>('2027/2028');
  const [description, setDescription] = useState<string>(
    'Brosur resmi Seleksi Penerimaan Santri Baru (SPMB) Pesantren Islam Mutiara Insan Tahun Ajaran 2027–2028.'
  );
  const [isActive, setIsActive] = useState<boolean>(true);

  // Page 1 & Page 2 states (either existing URL string or newly uploaded ProcessedBrochurePage)
  const [page1Input, setPage1Input] = useState<ProcessedBrochurePage | string | null>(null);
  const [page2Input, setPage2Input] = useState<ProcessedBrochurePage | string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const page1FileRef = useRef<HTMLInputElement | null>(null);
  const page2FileRef = useRef<HTMLInputElement | null>(null);

  // Viewer / Lightbox Modal States
  const [viewingBrochure, setViewingBrochure] = useState<SpmbBrochure | null>(null);
  const [viewerPageIndex, setViewerPageIndex] = useState<number>(0);
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deletingBrochure, setDeletingBrochure] = useState<SpmbBrochure | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToBrochures((list) => {
      setBrochures(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  const handleOpenCreateModal = () => {
    setEditingBrochure(null);
    setTitle('SPMB Mutiara Insan Tahun Ajaran 2027–2028');
    setAcademicYear('2027/2028');
    setDescription(
      'Brosur resmi Seleksi Penerimaan Santri Baru (SPMB) Pesantren Islam Mutiara Insan Tahun Ajaran 2027–2028.'
    );
    setIsActive(true);
    setPage1Input(null);
    setPage2Input(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (brochure: SpmbBrochure) => {
    setEditingBrochure(brochure);
    setTitle(brochure.title || 'SPMB Mutiara Insan Tahun Ajaran 2027–2028');
    setAcademicYear(brochure.academicYear || '2027/2028');
    setDescription(brochure.description || '');
    setIsActive(brochure.isActive !== false);
    setPage1Input(brochure.imageUrls?.[0] || null);
    setPage2Input(brochure.imageUrls?.[1] || null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSelectPageFile = async (
    pageNumber: 1 | 2,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    setFormError(null);
    try {
      const processed = await validateAndProcessBrochureFile(file);
      if (pageNumber === 1) {
        setPage1Input(processed);
      } else {
        setPage2Input(processed);
      }
    } catch (err: any) {
      setFormError(err?.message || `Gagal memproses gambar Halaman ${pageNumber}.`);
    }
  };

  const getPreviewUrl = (input: ProcessedBrochurePage | string | null): string => {
    if (!input) return '';
    return typeof input === 'string' ? input : input.previewDataUrl;
  };

  const handleSaveBrochure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setFormError('Anda tidak memiliki izin untuk menyimpan brosur.');
      return;
    }

    if (!title.trim()) {
      setFormError('Judul Brosur wajib diisi.');
      return;
    }

    if (!academicYear.trim()) {
      setFormError('Tahun Ajaran wajib diisi.');
      return;
    }

    const pagesToSave: Array<ProcessedBrochurePage | string> = [];
    if (page1Input) pagesToSave.push(page1Input);
    if (page2Input) pagesToSave.push(page2Input);

    if (pagesToSave.length === 0) {
      setFormError('Harap unggah minimal gambar Halaman 1 brosur sebelum menyimpan.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      await saveBrochureToCloud({
        id: editingBrochure?.id,
        title: title.trim(),
        academicYear: academicYear.trim(),
        description: description.trim(),
        pages: pagesToSave,
        isActive,
        uploadedBy: currentUser?.id || 'admin',
        uploadedByName: currentUser?.name || currentUser?.displayName || 'Administrator',
      });

      setIsFormOpen(false);
      showToast(
        'success',
        editingBrochure
          ? `Brosur "${title.trim()}" berhasil diperbarui.`
          : `Brosur baru "${title.trim()}" berhasil diunggah dan disimpan.`
      );
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan brosur ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (brochure: SpmbBrochure) => {
    if (!isAuthorized) return;
    setTogglingId(brochure.id);
    try {
      const nextStatus = !brochure.isActive;
      await setBrochureActiveStatus(brochure, nextStatus);
      showToast(
        'success',
        `Status brosur "${brochure.title}" diubah menjadi ${
          nextStatus ? 'Aktif (Tampil di Halaman Publik)' : 'Tidak Aktif'
        }.`
      );
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal mengubah status brosur.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBrochure || !isAuthorized) return;
    setIsDeleting(true);
    try {
      await deleteBrochureFromCloud(deletingBrochure);
      const deletedTitle = deletingBrochure.title;
      setDeletingBrochure(null);
      showToast('success', `Brosur "${deletedTitle}" berhasil dihapus.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Gagal menghapus brosur.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatUploadDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const date = new Date(isoStr);
      if (Number.isNaN(date.getTime())) return isoStr;
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-xl border border-[#DCE5E8] p-8 text-center max-w-lg mx-auto my-8">
        <div className="w-11 h-11 rounded-xl bg-[#FBF1F1] text-[#C96A6A] flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-[#24343D]">Akses Dibatasi</h3>
        <p className="text-xs text-[#71818A] mt-1.5 leading-relaxed">
          Hanya Administrator, Kepala Sekolah, atau Mudir yang memiliki izin untuk mengelola Brosur SPMB pada halaman publik.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-2xl border border-[#DCE5E8] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#2F7D63]">
            Pengaturan &middot; Konten Publik Pesantren
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#24343D]">
            Manajemen Brosur SPMB
          </h1>
          <p className="text-xs sm:text-sm text-[#71818A]">
            Kelola gambar brosur penerimaan santri baru (Halaman 1 &amp; Halaman 2) yang ditampilkan dan dapat diunduh pada halaman profil publik Pesantren Islam Mutiara Insan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] transition shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Upload Brosur</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Daftar Brosur Table */}
      <div className="bg-white rounded-2xl border border-[#DCE5E8] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DCE5E8] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#24343D]">Daftar Brosur SPMB</h2>
            <p className="text-xs text-[#71818A]">
              Hanya brosur dengan status <strong>Aktif</strong> yang ditampilkan kepada pengunjung halaman publik.
            </p>
          </div>
          <span className="text-xs font-mono text-[#71818A] tabular-nums">
            {brochures.length} brosur
          </span>
        </div>

        {loading ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2.5 text-xs text-[#71818A]">
            <Loader2 className="w-6 h-6 animate-spin text-[#24485A]" />
            <span>Memuat daftar brosur SPMB...</span>
          </div>
        ) : brochures.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-3">
            <FileImage className="w-10 h-10 text-[#95A5AD] mx-auto" />
            <div className="text-sm font-semibold text-[#24343D]">Belum Ada Brosur</div>
            <p className="text-xs text-[#71818A] max-w-md mx-auto">
              Silakan klik tombol <strong>+ Upload Brosur</strong> untuk mengunggah gambar brosur SPMB Halaman 1 dan Halaman 2.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F7F8] border-b border-[#DCE5E8] text-[11px] font-bold uppercase tracking-wider text-[#52656F]">
                  <th className="py-3.5 px-5">Judul</th>
                  <th className="py-3.5 px-4">Tahun Ajaran</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Tanggal Upload</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF0F2] text-xs sm:text-sm">
                {brochures.map((item) => {
                  const pageCount = item.imageUrls?.length || 0;
                  const thumbUrl = item.imageUrls?.[0] || '';
                  return (
                    <tr key={item.id} className="hover:bg-[#F9FBFC] transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3.5 min-w-[240px]">
                          <div className="w-12 h-16 rounded-lg border border-[#DCE5E8] bg-[#F4F7F8] overflow-hidden shrink-0 flex items-center justify-center">
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={item.title}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <FileImage className="w-5 h-5 text-[#95A5AD]" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-bold text-[#24343D] truncate max-w-md">
                              {item.title}
                            </div>
                            <div className="text-xs text-[#71818A] line-clamp-1 max-w-md">
                              {item.description || 'Brosur resmi SPMB Pesantren Islam Mutiara Insan'}
                            </div>
                            <div className="text-[11px] font-mono text-[#2F7D63] font-semibold">
                              {pageCount} halaman gambar
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-semibold text-[#24343D] whitespace-nowrap tabular-nums">
                        {item.academicYear}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
                            <XCircle className="w-4 h-4 text-stone-400 shrink-0" />
                            <span>Tidak Aktif</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-xs text-[#52656F] whitespace-nowrap tabular-nums">
                        <div>{formatUploadDate(item.updatedAt || item.createdAt)}</div>
                        {item.uploadedByName && (
                          <div className="text-[11px] text-[#95A5AD]">oleh {item.uploadedByName}</div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingBrochure(item);
                              setViewerPageIndex(0);
                              setViewerZoom(1);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#24485A] bg-[#F0F5F7] hover:bg-[#E1ECEF] transition inline-flex items-center gap-1 cursor-pointer"
                            title="Lihat Brosur"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Edit / Ganti Gambar Brosur"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={togglingId === item.id}
                            onClick={() => handleToggleActive(item)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer ${
                              item.isActive
                                ? 'text-stone-700 bg-stone-100 hover:bg-stone-200'
                                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {togglingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : null}
                            <span>{item.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingBrochure(item)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Brosur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL FORM UPLOAD / EDIT BROSUR
         ===================================================================== */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => !isSaving && setIsFormOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#DCE5E8] max-w-3xl w-full p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EBF0F2] pb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2F7D63]">
                  {editingBrochure ? 'Perbarui Data & Gambar Brosur' : 'Unggah Brosur Baru'}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-[#24343D] mt-0.5">
                  {editingBrochure ? 'Edit Brosur SPMB' : '+ Upload Brosur SPMB'}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-[#71818A] hover:text-[#24343D] hover:bg-[#F4F7F8] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBrochure} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-[#24343D] mb-1.5">
                    Judul Brosur <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: SPMB Mutiara Insan Tahun Ajaran 2027–2028"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E8] text-xs sm:text-sm text-[#24343D] focus:outline-none focus:ring-2 focus:ring-[#24485A]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-[#24343D] mb-1.5">
                    Tahun Ajaran <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="Contoh: 2027/2028"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E8] text-xs sm:text-sm font-mono text-[#24343D] focus:outline-none focus:ring-2 focus:ring-[#24485A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24343D] mb-1.5">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan isi brosur SPMB..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5E8] text-xs sm:text-sm text-[#24343D] focus:outline-none focus:ring-2 focus:ring-[#24485A]"
                />
              </div>

              {/* Upload Gambar Halaman 1 & Halaman 2 + Preview Sebelum Menyimpan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Halaman 1 */}
                <div className="p-4 rounded-2xl bg-[#F9FBFC] border border-[#DCE5E8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#24343D]">
                        Gambar Halaman 1 <span className="text-rose-600">*</span>
                      </div>
                      <p className="text-[11px] text-[#71818A]">
                        Informasi Utama, Target Lulusan &amp; Persyaratan
                      </p>
                    </div>
                    <input
                      ref={page1FileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => handleSelectPageFile(1, e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => page1FileRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DCE5E8] text-[#24485A] hover:bg-[#F0F5F7] transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{page1Input ? 'Ganti Gambar' : 'Pilih File'}</span>
                    </button>
                  </div>

                  {getPreviewUrl(page1Input) ? (
                    <div className="space-y-2">
                      <div className="aspect-3/4 rounded-xl border border-[#DCE5E8] bg-white overflow-hidden flex items-center justify-center p-1">
                        <img
                          src={getPreviewUrl(page1Input)}
                          alt="Preview Brosur Halaman 1"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#52656F]">
                        <span className="truncate">
                          {typeof page1Input === 'object' && page1Input?.fileName
                            ? `${page1Input.fileName} (${page1Input.width}×${page1Input.height}px)`
                            : 'Halaman 1 siap disimpan'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage1Input(null)}
                          className="text-rose-600 hover:underline font-medium shrink-0 cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => page1FileRef.current?.click()}
                      className="w-full aspect-3/4 rounded-xl border-2 border-dashed border-[#DCE5E8] hover:border-[#24485A] bg-white flex flex-col items-center justify-center p-6 text-center transition cursor-pointer"
                    >
                      <Upload className="w-7 h-7 text-[#95A5AD] mb-2" />
                      <span className="text-xs font-semibold text-[#24343D]">
                        Klik untuk Upload Halaman 1
                      </span>
                      <span className="text-[11px] text-[#71818A] mt-1">
                        Format JPG, PNG, atau WEBP (Resolusi penuh dipertahankan)
                      </span>
                    </button>
                  )}
                </div>

                {/* Halaman 2 */}
                <div className="p-4 rounded-2xl bg-[#F9FBFC] border border-[#DCE5E8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#24343D]">
                        Gambar Halaman 2 (Opsional / Halaman Kedua)
                      </div>
                      <p className="text-[11px] text-[#71818A]">
                        Rincian Biaya, Ekstrakurikuler &amp; Galeri
                      </p>
                    </div>
                    <input
                      ref={page2FileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => handleSelectPageFile(2, e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => page2FileRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DCE5E8] text-[#24485A] hover:bg-[#F0F5F7] transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{page2Input ? 'Ganti Gambar' : 'Pilih File'}</span>
                    </button>
                  </div>

                  {getPreviewUrl(page2Input) ? (
                    <div className="space-y-2">
                      <div className="aspect-3/4 rounded-xl border border-[#DCE5E8] bg-white overflow-hidden flex items-center justify-center p-1">
                        <img
                          src={getPreviewUrl(page2Input)}
                          alt="Preview Brosur Halaman 2"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#52656F]">
                        <span className="truncate">
                          {typeof page2Input === 'object' && page2Input?.fileName
                            ? `${page2Input.fileName} (${page2Input.width}×${page2Input.height}px)`
                            : 'Halaman 2 siap disimpan'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage2Input(null)}
                          className="text-rose-600 hover:underline font-medium shrink-0 cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => page2FileRef.current?.click()}
                      className="w-full aspect-3/4 rounded-xl border-2 border-dashed border-[#DCE5E8] hover:border-[#24485A] bg-white flex flex-col items-center justify-center p-6 text-center transition cursor-pointer"
                    >
                      <Upload className="w-7 h-7 text-[#95A5AD] mb-2" />
                      <span className="text-xs font-semibold text-[#24343D]">
                        Klik untuk Upload Halaman 2
                      </span>
                      <span className="text-[11px] text-[#71818A] mt-1">
                        Format JPG, PNG, atau WEBP (Resolusi penuh dipertahankan)
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Aktif Toggle */}
              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F4F7F8] border border-[#DCE5E8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#24485A] focus:ring-[#24485A]"
                />
                <div className="text-xs">
                  <div className="font-bold text-[#24343D]">
                    Status Aktif (Tampilkan pada Halaman Profil Publik)
                  </div>
                  <div className="text-[#71818A]">
                    Jika dicentang, pengunjung publik dapat langsung melihat, memperbesar, dan mengunduh brosur ini tanpa login.
                  </div>
                </div>
              </label>

              <div className="pt-2 border-t border-[#EBF0F2] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#52656F] hover:bg-[#F4F7F8] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] disabled:opacity-60 transition inline-flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Brosur...</span>
                    </>
                  ) : (
                    <span>Simpan Brosur</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL KONFIRMASI HAPUS BROSUR
         ===================================================================== */}
      {deletingBrochure && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isDeleting && setDeletingBrochure(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#DCE5E8] max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#24343D]">Hapus Brosur SPMB?</h3>
                <p className="text-xs text-[#71818A] mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus brosur <strong>{deletingBrochure.title}</strong> ({deletingBrochure.academicYear})?
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingBrochure(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#52656F] hover:bg-[#F4F7F8] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Ya, Hapus Brosur</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          LIGHTBOX PREVIEW MODAL (ADMIN)
         ===================================================================== */}
      {viewingBrochure && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-xs flex flex-col justify-between p-3 sm:p-6"
          onClick={() => setViewingBrochure(null)}
        >
          {/* Top Bar */}
          <div
            className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 rounded-2xl px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{viewingBrochure.title}</div>
              <div className="text-xs text-stone-400">
                Halaman {viewerPageIndex + 1} dari {viewingBrochure.imageUrls.length} &middot; Tahun Ajaran {viewingBrochure.academicYear}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewerZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 tabular-nums">
                {Math.round(viewerZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setViewerZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewerZoom(1)}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                title="Reset Ukuran"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  setIsDownloading(true);
                  try {
                    await downloadBrochurePageImage(
                      viewingBrochure.imageUrls[viewerPageIndex],
                      viewerPageIndex + 1,
                      viewingBrochure.title
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-400 text-emerald-950 hover:bg-amber-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Hal. {viewerPageIndex + 1}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingBrochure(null)}
                className="p-2 rounded-lg bg-stone-800 hover:bg-rose-600 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Image Area */}
          <div
            className="flex-1 my-3 overflow-auto flex items-center justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {viewingBrochure.imageUrls.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setViewerPageIndex(
                    (prev) =>
                      (prev - 1 + viewingBrochure.imageUrls.length) %
                      viewingBrochure.imageUrls.length
                  )
                }
                className="fixed left-4 sm:left-8 z-20 p-3 rounded-full bg-stone-900/90 hover:bg-emerald-900 text-white border border-stone-700 shadow-lg cursor-pointer"
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="max-h-full max-w-full overflow-auto flex items-center justify-center p-2">
              <img
                src={viewingBrochure.imageUrls[viewerPageIndex]}
                alt={`${viewingBrochure.title} - Halaman ${viewerPageIndex + 1}`}
                style={{
                  transform: `scale(${viewerZoom})`,
                  transformOrigin: 'top center',
                }}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-2xl transition-transform duration-150"
              />
            </div>

            {viewingBrochure.imageUrls.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setViewerPageIndex((prev) => (prev + 1) % viewingBrochure.imageUrls.length)
                }
                className="fixed right-4 sm:right-8 z-20 p-3 rounded-full bg-stone-900/90 hover:bg-emerald-900 text-white border border-stone-700 shadow-lg cursor-pointer"
                aria-label="Halaman Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Page Selector */}
          {viewingBrochure.imageUrls.length > 1 && (
            <div
              className="max-w-md mx-auto flex items-center justify-center gap-2 bg-stone-900/90 border border-stone-800 rounded-xl px-4 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              {viewingBrochure.imageUrls.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setViewerPageIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewerPageIndex === idx
                      ? 'bg-amber-400 text-emerald-950'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  Halaman {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
