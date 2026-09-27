import React, { useState, useMemo } from 'react';
import {
  AtkItem,
  AtkRequest,
  AtkRequestStatus,
  UserProfile,
  calculateAtkStockStatus,
} from '../types';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Clock,
  AlertCircle,
  X,
  Send,
} from 'lucide-react';

interface AtkRequestsSectionProps {
  atkItems: AtkItem[];
  atkRequests: AtkRequest[];
  currentUser: UserProfile | null;
  role: string | null;
  isAdminOrHeadmaster: boolean;
  allowTeacherViewStock?: boolean;
  onCreateRequest: (input: {
    itemId: string;
    jumlahDiminta: number;
    keperluan: string;
    catatan?: string;
  }) => Promise<AtkRequest>;
  onApproveRequest: (
    requestId: string,
    jumlahDisetujui: number,
    catatanAdmin?: string
  ) => Promise<void>;
  onRejectRequest: (requestId: string, catatanAdmin: string) => Promise<void>;
  onHandoverRequest: (
    requestId: string,
    jumlahDiberikan?: number,
    catatanAdmin?: string
  ) => Promise<void>;
  onCancelRequest: (requestId: string) => Promise<void>;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

const KEPERLUAN_OPTIONS = [
  'Mengajar',
  'Ujian / Evaluasi Harian',
  'Administrasi Kelas / Wali Kelas',
  'Kegiatan Ekstrakurikuler',
  'Rapat / Kepanitiaan Sekolah',
  'Operasional Kantor / TU',
  'Lainnya',
];

export const AtkRequestsSection: React.FC<AtkRequestsSectionProps> = ({
  atkItems,
  atkRequests,
  currentUser,
  role,
  isAdminOrHeadmaster,
  allowTeacherViewStock = true,
  onCreateRequest,
  onApproveRequest,
  onRejectRequest,
  onHandoverRequest,
  onCancelRequest,
  onNotify,
}) => {
  const activeItems = useMemo(() => atkItems.filter((i) => i.isActive !== false), [atkItems]);

  // Form Permintaan Baru
  const [reqItemId, setReqItemId] = useState<string>('');
  const [reqQty, setReqQty] = useState<string>('1');
  const [reqKeperluan, setReqKeperluan] = useState<string>('Mengajar');
  const [reqCatatan, setReqCatatan] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | AtkRequestStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Persetujuan / Penyerahan / Penolakan (Khusus Admin / Kepala Sekolah)
  const [actionModal, setActionModal] = useState<{
    mode: 'APPROVE' | 'HANDOVER' | 'REJECT';
    request: AtkRequest;
    qty: string;
    note: string;
     approveAndHandoverNow: boolean;
  } | null>(null);

  const selectedItemObj = useMemo(
    () => atkItems.find((i) => i.id === reqItemId) || null,
    [atkItems, reqItemId]
  );

  // Filter daftar permintaan:
  // - Admin / Kepala Sekolah melihat seluruh permintaan guru/staff
  // - Guru / Staff hanya melihat permintaan miliknya sendiri
  const visibleRequests = useMemo(() => {
    const myId = currentUser?.id || currentUser?.uid || currentUser?.username || '';
    const myName = (currentUser?.displayName || currentUser?.name || '').toLowerCase().trim();

    return atkRequests.filter((r) => {
      if (!isAdminOrHeadmaster) {
        const isMine =
          r.pemohonId === myId ||
          (myName && r.pemohonNama.toLowerCase().trim() === myName);
        if (!isMine) return false;
      }
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${r.pemohonNama} ${r.itemName} ${r.itemCode || ''} ${r.keperluan} ${r.catatan || ''} ${r.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [atkRequests, isAdminOrHeadmaster, currentUser, statusFilter, searchQuery]);

  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqItemId) {
      onNotify('error', 'Silakan pilih barang ATK yang ingin diminta.');
      return;
    }
    const qtyNum = Math.floor(Number(reqQty) || 0);
    if (qtyNum <= 0) {
      onNotify('error', 'Jumlah yang diminta harus minimal 1.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await onCreateRequest({
        itemId: reqItemId,
        jumlahDiminta: qtyNum,
        keperluan: reqKeperluan,
        catatan: reqCatatan,
      });
      onNotify(
        'success',
        `Permintaan ATK "${created.itemName}" (${created.jumlahDiminta} ${created.unit}) berhasil diajukan dengan status Menunggu Persetujuan.`
      );
      setReqItemId('');
      setReqQty('1');
      setReqCatatan('');
    } catch (err: any) {
      onNotify('error', err?.message || 'Gagal mengajukan permintaan ATK.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmActionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    setSubmitting(true);
    try {
      const { mode, request, qty, note, approveAndHandoverNow } = actionModal;
      const qtyNum = Math.max(1, Math.floor(Number(qty) || request.jumlahDiminta));

      if (mode === 'APPROVE') {
        if (approveAndHandoverNow) {
          await onHandoverRequest(request.id, qtyNum, note || 'Disetujui & langsung diserahkan');
          onNotify(
            'success',
            `Permintaan ${request.pemohonNama} (${request.itemName} - ${qtyNum} ${request.unit}) disetujui dan langsung tercatat Sudah Diberikan (stok otomatis berkurang).`
          );
        } else {
          await onApproveRequest(request.id, qtyNum, note);
          onNotify(
            'success',
            `Permintaan ${request.pemohonNama} (${request.itemName}) telah disetujui (${qtyNum} ${request.unit}).`
          );
        }
      } else if (mode === 'HANDOVER') {
        await onHandoverRequest(request.id, qtyNum, note);
        onNotify(
          'success',
          `Barang "${request.itemName}" (${qtyNum} ${request.unit}) telah diserahkan kepada ${request.pemohonNama}. Stok otomatis diperbarui.`
        );
      } else if (mode === 'REJECT') {
        await onRejectRequest(request.id, note || 'Permintaan belum dapat disetujui.');
        onNotify('success', `Permintaan ${request.pemohonNama} telah ditolak.`);
      }
      setActionModal(null);
    } catch (err: any) {
      onNotify('error', err?.message || 'Gagal memproses permintaan ATK.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: AtkRequestStatus) => {
    switch (status) {
      case 'Menunggu':
        return <span className="font-semibold text-amber-700">🟡 Menunggu</span>;
      case 'Disetujui':
        return <span className="font-semibold text-emerald-700">🟢 Disetujui</span>;
      case 'Sudah Diberikan':
        return <span className="font-semibold text-blue-700">🔵 Sudah Diberikan</span>;
      case 'Ditolak':
        return <span className="font-semibold text-rose-700">🔴 Ditolak</span>;
      case 'Dibatalkan':
        return <span className="font-semibold text-slate-500">⚪ Dibatalkan</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Buat Permintaan ATK (Tersedia untuk Guru/Staff maupun Admin) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            📝 Form Permintaan ATK Guru / Staf
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Nama pemohon (<strong>{currentUser?.displayName || currentUser?.name}</strong>), ID pengguna, tanggal, dan waktu permintaan dicatat secara otomatis oleh sistem.
          </p>
        </div>

        <form onSubmit={handleSubmitNewRequest} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Barang ATK <span className="text-rose-500">*</span>
            </label>
            <select
              value={reqItemId}
              onChange={(e) => setReqItemId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Pilih Barang ATK --</option>
              {activeItems.map((item) => {
                const st = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);
                return (
                  <option key={item.id} value={item.id}>
                    {allowTeacherViewStock
                      ? `${item.name} (${item.code}) — Stok: ${item.stokSaatIni} ${item.unit} [${st}]`
                      : `${item.name} (${item.code}) — Satuan: ${item.unit}`}
                  </option>
                );
              })}
            </select>
            {selectedItemObj && (
              <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                <span>
                  Kategori: <strong>{selectedItemObj.category}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Lokasi: <strong>{selectedItemObj.lokasiPenyimpanan}</strong>
                </span>
                {allowTeacherViewStock && (
                  <>
                    <span>&bull;</span>
                    <span>
                      Tersedia:{' '}
                      <strong className="font-mono text-slate-900">
                        {selectedItemObj.stokSaatIni} {selectedItemObj.unit}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jumlah yang Diminta {selectedItemObj ? `(${selectedItemObj.unit})` : ''}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={reqQty}
              onChange={(e) => setReqQty(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keperluan Penggunaan <span className="text-rose-500">*</span>
            </label>
            <select
              value={reqKeperluan}
              onChange={(e) => setReqKeperluan(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {KEPERLUAN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={reqCatatan}
              onChange={(e) => setReqCatatan(e.target.value)}
              placeholder="Contoh: Digunakan untuk mengajar kelas VIII-A / cetak soal ulangan..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Ajukan Permintaan ATK
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Permintaan & Persetujuan */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                {isAdminOrHeadmaster
                  ? '📋 Daftar Seluruh Permintaan & Persetujuan ATK Guru'
                  : '📋 Status & Riwayat Permintaan ATK Saya'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdminOrHeadmaster
                  ? 'Administrator & Kepala Sekolah dapat menyetujui, menolak, atau menyerahkan barang ATK yang diminta guru.'
                  : 'Pantau status persetujuan dan riwayat pengambilan barang ATK yang telah Anda ajukan.'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pemohon, barang, keperluan..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Filter Tabs by Status */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { id: 'ALL', label: 'Semua Status' },
                { id: 'Menunggu', label: '🟡 Menunggu' },
                { id: 'Disetujui', label: '🟢 Disetujui (Belum Diberikan)' },
                { id: 'Sudah Diberikan', label: '🔵 Sudah Diberikan' },
                { id: 'Ditolak', label: '🔴 Ditolak' },
                { id: 'Dibatalkan', label: '⚪ Dibatalkan' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleRequests.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Belum ada data permintaan ATK yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <th className="py-3 px-4">Tanggal & Waktu</th>
                  <th className="py-3 px-4">Pemohon</th>
                  <th className="py-3 px-4">Barang yang Diminta</th>
                  <th className="py-3 px-4 text-right">Jumlah Diminta</th>
                  {isAdminOrHeadmaster && <th className="py-3 px-4 text-right">Stok Saat Ini</th>}
                  <th className="py-3 px-4">Keperluan & Catatan</th>
                  <th className="py-3 px-4">Status Permintaan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleRequests.map((req) => {
                  const liveItem = atkItems.find((i) => i.id === req.itemId);
                  const currentStock = liveItem ? liveItem.stokSaatIni : 0;
                  const targetQty = req.jumlahDisetujui || req.jumlahDiminta;
                  const isStockShort = currentStock < targetQty;
                  const isMyRequest =
                    currentUser &&
                    (req.pemohonId === currentUser.id ||
                      req.pemohonId === currentUser.uid ||
                      req.pemohonId === currentUser.username);

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{req.tanggal}</div>
                        <div className="text-[11px] text-slate-400">{req.waktu} WIB</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{req.pemohonNama}</div>
                        <div className="text-[11px] text-slate-400">{req.pemohonRole}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{req.itemName}</div>
                        <div className="text-[11px] text-slate-400">
                          {req.itemCode || req.itemId} &bull; {req.category}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {req.jumlahDiminta} {req.unit}
                        </div>
                        {req.jumlahDisetujui !== undefined &&
                          req.jumlahDisetujui !== req.jumlahDiminta && (
                            <div className="text-[11px] text-emerald-700 font-semibold">
                              Disetujui: {req.jumlahDisetujui} {req.unit}
                            </div>
                          )}
                      </td>
                      {isAdminOrHeadmaster && (
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              isStockShort &&
                              (req.status === 'Menunggu' || req.status === 'Disetujui')
                                ? 'text-rose-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {currentStock} {req.unit}
                          </span>
                          {isStockShort &&
                            (req.status === 'Menunggu' || req.status === 'Disetujui') && (
                              <div className="text-[10px] text-rose-600 font-sans font-semibold">
                                Stok Kurang!
                              </div>
                            )}
                        </td>
                      )}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800">{req.keperluan}</div>
                        {req.catatan && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{req.catatan}</div>
                        )}
                        {req.catatanAdmin && (
                          <div className="text-[11px] text-indigo-700 mt-1">
                            Catatan Admin/Kepsek: {req.catatanAdmin}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>{renderStatusBadge(req.status)}</div>
                        {req.diserahkanOlehNama && req.status === 'Sudah Diberikan' && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Oleh: {req.diserahkanOlehNama}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Admin / Kepala Sekolah Actions */}
                          {isAdminOrHeadmaster && req.status === 'Menunggu' && (
                            <>
                              <button
                                onClick={() =>
                                  setActionModal({
                                    mode: 'APPROVE',
                                    request: req,
                                    qty: String(req.jumlahDiminta),
                                    note: '',
                                    approveAndHandoverNow: false,
                                  })
                                }
                                className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Setujui
                              </button>
                              <button
                                onClick={() =>
                                  setActionModal({
                                    mode: 'REJECT',
                                    request: req,
                                    qty: String(req.jumlahDiminta),
                                    note: '',
                                    approveAndHandoverNow: false,
                                  })
                                }
                                className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </>
                          )}

                          {isAdminOrHeadmaster && req.status === 'Disetujui' && (
                            <button
                              onClick={() =>
                                setActionModal({
                                  mode: 'HANDOVER',
                                  request: req,
                                  qty: String(req.jumlahDisetujui || req.jumlahDiminta),
                                  note: req.catatanAdmin || '',
                                  approveAndHandoverNow: false,
                                })
                              }
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Serahkan Barang
                            </button>
                          )}

                          {/* Requester can cancel their own pending request */}
                          {isMyRequest && req.status === 'Menunggu' && (
                            <button
                              onClick={async () => {
                                try {
                                  await onCancelRequest(req.id);
                                  onNotify('success', 'Permintaan ATK berhasil dibatalkan.');
                                } catch (err: any) {
                                  onNotify('error', err?.message || 'Gagal membatalkan permintaan.');
                                }
                              }}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              Batalkan
                            </button>
                          )}
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

      {/* Modal Persetujuan / Penyerahan / Penolakan */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                {actionModal.mode === 'APPROVE' && '🟢 Setujui Permintaan ATK'}
                {actionModal.mode === 'HANDOVER' && '🔵 Serahkan Barang ATK ke Guru'}
                {actionModal.mode === 'REJECT' && '🔴 Tolak Permintaan ATK'}
              </h4>
              <button
                onClick={() => setActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmActionModal} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div>
                  Pemohon: <strong className="text-slate-900">{actionModal.request.pemohonNama}</strong>
                </div>
                <div>
                  Barang: <strong className="text-slate-900">{actionModal.request.itemName}</strong>
                </div>
                <div>
                  Jumlah Diminta:{' '}
                  <strong className="font-mono text-slate-900">
                    {actionModal.request.jumlahDiminta} {actionModal.request.unit}
                  </strong>
                </div>
                <div>
                  Keperluan: <strong className="text-slate-800">{actionModal.request.keperluan}</strong>
                </div>
              </div>

              {actionModal.mode !== 'REJECT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {actionModal.mode === 'APPROVE'
                      ? `Jumlah yang Disetujui (${actionModal.request.unit})`
                      : `Jumlah yang Diserahkan (${actionModal.request.unit})`}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={actionModal.qty}
                    onChange={(e) => setActionModal({ ...actionModal, qty: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              )}

              {actionModal.mode === 'APPROVE' && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={actionModal.approveAndHandoverNow}
                    onChange={(e) =>
                      setActionModal({
                        ...actionModal,
                        approveAndHandoverNow: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-blue-300 text-blue-600"
                  />
                  <div className="text-xs text-blue-900">
                    <div className="font-semibold">Langsung Serahkan Barang Sekarang (Sudah Diberikan)</div>
                    <div className="text-[11px] text-blue-700 mt-0.5">
                      Jika dicentang, stok barang otomatis langsung dikurangi dan tercatat di Riwayat Barang Keluar.
                    </div>
                  </div>
                </label>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {actionModal.mode === 'REJECT'
                    ? 'Alasan Penolakan *'
                    : 'Catatan Kepala Sekolah / Admin (Opsional)'}
                </label>
                <textarea
                  rows={2}
                  value={actionModal.note}
                  onChange={(e) => setActionModal({ ...actionModal, note: e.target.value })}
                  required={actionModal.mode === 'REJECT'}
                  placeholder={
                    actionModal.mode === 'REJECT'
                      ? 'Tuliskan alasan penolakan permintaan...'
                      : 'Contoh: Silakan diambil di Ruang TU...'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition cursor-pointer ${
                    actionModal.mode === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : actionModal.mode === 'HANDOVER'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionModal.mode === 'APPROVE' &&
                    (actionModal.approveAndHandoverNow ? 'Setujui & Serahkan' : 'Simpan Persetujuan')}
                  {actionModal.mode === 'HANDOVER' && 'Konfirmasi Barang Diberikan'}
                  {actionModal.mode === 'REJECT' && 'Tolak Permintaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
