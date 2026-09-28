import React, { useState, useMemo } from 'react';
import {
  AtkItem,
  AtkTransaction,
  AtkRequest,
  AtkCategory,
  calculateAtkStockStatus,
} from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { SchoolLogo } from './SchoolLogo';
import {
  ShoppingCart,
  History,
  BarChart3,
  Search,
  Printer,
  Download,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Package,
  Users,
  FileSpreadsheet,
} from 'lucide-react';

export interface RestockRecommendation {
  item: AtkItem;
  status: 'Stok Aman' | 'Stok Menipis' | 'Habis';
  pendingQty: number;
  approvedNotHandedQty: number;
  totalNeededByTeachers: number;
  shortageForApproved: number;
  reasons: string[];
  recommendedBuyQty: number;
  estimatedCost: number;
}

interface AtkReportsSectionProps {
  mode: 'RESTOCK' | 'HISTORY' | 'REPORTS';
  atkItems: AtkItem[];
  atkTransactions: AtkTransaction[];
  atkRequests: AtkRequest[];
  atkCategories: AtkCategory[];
  restockList: RestockRecommendation[];
  isAdminOrHeadmaster: boolean;
  schoolName: string;
  onQuickIncoming: (itemId: string, suggestedQty?: number) => void;
}

export function formatIDR(num?: number): string {
  if (num === undefined || num === null || isNaN(Number(num))) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(num));
}

export const AtkReportsSection: React.FC<AtkReportsSectionProps> = ({
  mode,
  atkItems,
  atkTransactions,
  atkRequests,
  atkCategories,
  restockList,
  isAdminOrHeadmaster,
  schoolName,
  onQuickIncoming,
}) => {
  const { schoolIdentity } = useMasterData();
  const effectiveSchoolName =
    schoolIdentity?.schoolName || schoolName || 'Pesantren Islam Mutiara Insan';
  const effectiveLogoUrl = schoolIdentity?.logoUrl || '';
  const effectiveAddress = schoolIdentity?.address || '';
  // History Filters
  const [trxTypeFilter, setTrxTypeFilter] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const [trxCategoryFilter, setTrxCategoryFilter] = useState<string>('ALL');
  const [trxItemFilter, setTrxItemFilter] = useState<string>('ALL');
  const [trxSearch, setTrxSearch] = useState<string>('');
  const [trxStartDate, setTrxStartDate] = useState<string>('');
  const [trxEndDate, setTrxEndDate] = useState<string>('');

  // Report Sub-tab & Filters
  const [reportTab, setReportTab] = useState<'USAGE_ITEM' | 'USAGE_USER' | 'STOCK_POSITION'>('USAGE_ITEM');
  const [repMonth, setRepMonth] = useState<string>('ALL');
  const [repCategory, setRepCategory] = useState<string>('ALL');

  const filteredTransactions = useMemo(() => {
    return atkTransactions.filter((t) => {
      if (trxTypeFilter !== 'ALL' && t.type !== trxTypeFilter) return false;
      if (trxCategoryFilter !== 'ALL' && t.category !== trxCategoryFilter) return false;
      if (trxItemFilter !== 'ALL' && t.itemId !== trxItemFilter) return false;
      if (trxStartDate && t.tanggal < trxStartDate) return false;
      if (trxEndDate && t.tanggal > trxEndDate) return false;
      if (trxSearch.trim()) {
        const q = trxSearch.toLowerCase();
        const hay = `${t.itemName} ${t.itemCode || ''} ${t.sumberBarang || ''} ${t.penerimaNama || ''} ${t.keperluan || ''} ${t.nomorNota || ''} ${t.petugasNama || ''} ${t.keterangan || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [atkTransactions, trxTypeFilter, trxCategoryFilter, trxItemFilter, trxStartDate, trxEndDate, trxSearch]);

  // Usage per Item summary
  const itemUsageSummary = useMemo(() => {
    return atkItems
      .filter((item) => repCategory === 'ALL' || item.category === repCategory)
      .map((item) => {
        const itemTrx = atkTransactions.filter((t) => {
          if (t.itemId !== item.id) return false;
          if (repMonth !== 'ALL' && !t.tanggal.startsWith(repMonth)) return false;
          return true;
        });

        const totalMasuk = itemTrx
          .filter((t) => t.type === 'MASUK')
          .reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
        const totalKeluar = itemTrx
          .filter((t) => t.type === 'KELUAR')
          .reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
        const frekuensiKeluar = itemTrx.filter((t) => t.type === 'KELUAR').length;

        const penerimaSet = new Set(
          itemTrx
            .filter((t) => t.type === 'KELUAR' && t.penerimaNama)
            .map((t) => t.penerimaNama as string)
        );

        return {
          item,
          status: calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum),
          totalMasuk,
          totalKeluar,
          frekuensiKeluar,
          penerimaList: Array.from(penerimaSet),
        };
      })
      .sort((a, b) => b.totalKeluar - a.totalKeluar);
  }, [atkItems, atkTransactions, repCategory, repMonth]);

  // Usage per Recipient / Teacher summary
  const recipientUsageSummary = useMemo(() => {
    const keluarTrx = atkTransactions.filter((t) => {
      if (t.type !== 'KELUAR') return false;
      if (repCategory !== 'ALL' && t.category !== repCategory) return false;
      if (repMonth !== 'ALL' && !t.tanggal.startsWith(repMonth)) return false;
      return true;
    });

    const map = new Map<
      string,
      {
        penerimaNama: string;
        totalTransaksi: number;
        totalUnitDigunakan: number;
        itemsDetail: Record<string, { itemName: string; unit: string; qty: number }>;
        lastDate: string;
      }
    >();

    keluarTrx.forEach((t) => {
      const key = (t.penerimaNama || 'Operasional Sekolah').trim();
      const existing = map.get(key) || {
        penerimaNama: key,
        totalTransaksi: 0,
        totalUnitDigunakan: 0,
        itemsDetail: {},
        lastDate: t.tanggal,
      };
      existing.totalTransaksi += 1;
      existing.totalUnitDigunakan += Number(t.jumlah) || 0;
      if (t.tanggal > existing.lastDate) existing.lastDate = t.tanggal;

      const itemKey = t.itemId || t.itemName;
      if (!existing.itemsDetail[itemKey]) {
        existing.itemsDetail[itemKey] = {
          itemName: t.itemName,
          unit: t.unit,
          qty: 0,
        };
      }
      existing.itemsDetail[itemKey].qty += Number(t.jumlah) || 0;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalUnitDigunakan - a.totalUnitDigunakan);
  }, [atkTransactions, repCategory, repMonth]);

  const handleExportRestockCSV = () => {
    const headers = [
      'Kode Barang',
      'Nama Barang',
      'Kategori',
      'Satuan',
      'Stok Saat Ini',
      'Stok Minimum',
      'Permintaan Menunggu',
      'Disetujui Belum Diberikan',
      'Rekomendasi Beli',
      'Harga Perkiraan',
      'Estimasi Total Biaya',
      'Alasan Perlu Dibeli',
    ];
    const rows = restockList.map((r) => [
      r.item.code,
      `"${r.item.name.replace(/"/g, '""')}"`,
      r.item.category,
      r.item.unit,
      r.item.stokSaatIni,
      r.item.stokMinimum,
      r.pendingQty,
      r.approvedNotHandedQty,
      r.recommendedBuyQty,
      r.item.hargaPerkiraan || 0,
      r.estimatedCost || 0,
      `"${r.reasons.join('; ')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daftar_Belanja_ATK_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHistoryCSV = () => {
    const headers = [
      'Tanggal',
      'Waktu',
      'Jenis',
      'Kode Barang',
      'Nama Barang',
      'Kategori',
      'Jumlah',
      'Satuan',
      'Stok Sebelum',
      'Stok Sesudah',
      'Sumber / Penerima',
      'Keperluan / No Nota',
      'Petugas',
      'Keterangan',
    ];
    const rows = filteredTransactions.map((t) => [
      t.tanggal,
      t.waktu,
      t.type,
      t.itemCode || '',
      `"${t.itemName.replace(/"/g, '""')}"`,
      t.category,
      t.jumlah,
      t.unit,
      t.stokSebelum,
      t.stokSesudah,
      `"${(t.type === 'MASUK' ? t.sumberBarang || '' : t.penerimaNama || '').replace(/"/g, '""')}"`,
      `"${(t.type === 'MASUK' ? t.nomorNota || '' : t.keperluan || '').replace(/"/g, '""')}"`,
      `"${(t.petugasNama || '').replace(/"/g, '""')}"`,
      `"${(t.keterangan || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Riwayat_Transaksi_ATK_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // MODE 1: 🛒 DAFTAR BARANG PERLU DIBELI (RESTOCK)
  // ============================================================================
  if (mode === 'RESTOCK') {
    const totalEstimatedCost = restockList.reduce((acc, r) => acc + (r.estimatedCost || 0), 0);

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <SchoolLogo
                logoUrl={effectiveLogoUrl}
                schoolName={effectiveSchoolName}
                size="lg"
                variant="light"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#24485A]">
                  {effectiveSchoolName}
                  {effectiveAddress ? ` • ${effectiveAddress}` : ''}
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <ShoppingCart className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Daftar Barang ATK Perlu Dibeli / Pengadaan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dihitung otomatis dari barang yang habis, stok menipis (&le; stok minimum), atau stok tidak mencukupi untuk memenuhi permintaan guru.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRestockCSV}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh CSV Belanja
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Daftar Belanja
              </button>
            </div>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
              <div className="text-xs font-medium text-rose-700">Total Jenis Perlu Dibeli</div>
              <div className="text-2xl font-bold text-rose-900 font-mono tabular-nums mt-1">
                {restockList.length} <span className="text-xs font-normal">jenis barang</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-xs font-medium text-amber-800">Barang Sudah Habis (Stok 0)</div>
              <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums mt-1">
                {restockList.filter((r) => r.item.stokSaatIni <= 0).length}{' '}
                <span className="text-xs font-normal">jenis barang</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-600">Estimasi Total Anggaran Belanja</div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {formatIDR(totalEstimatedCost)}
              </div>
            </div>
          </div>
        </div>

        {/* Table of Restock Items */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {restockList.length === 0 ? (
            <div className="p-10 text-center">
              <Package className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900">Seluruh Stok Barang dalam Kondisi Aman</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada barang yang habis, menipis, ataupun kekurangan stok untuk permintaan guru saat ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4">Kategori & Lokasi</th>
                    <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                    <th className="py-3 px-4 text-right">Stok Min</th>
                    <th className="py-3 px-4 text-right">Kebutuhan Guru</th>
                    <th className="py-3 px-4">Alasan Perlu Dibeli</th>
                    <th className="py-3 px-4 text-right">Saran Beli</th>
                    <th className="py-3 px-4 text-right">Estimasi Biaya</th>
                    {isAdminOrHeadmaster && <th className="py-3 px-4 text-right print:hidden">Tindak Lanjut</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {restockList.map((r) => (
                    <tr key={r.item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{r.item.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{r.item.code}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">{r.item.category}</div>
                        <div className="text-[11px] text-slate-400">{r.item.lokasiPenyimpanan}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            r.item.stokSaatIni === 0
                              ? 'text-rose-600'
                              : r.item.stokSaatIni <= r.item.stokMinimum
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {r.item.stokSaatIni} {r.item.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                        {r.item.stokMinimum} {r.item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {r.totalNeededByTeachers > 0 ? (
                          <div>
                            <span className="font-semibold text-indigo-700">
                              {r.totalNeededByTeachers} {r.item.unit}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              (Disetujui: {r.approvedNotHandedQty} · Menunggu: {r.pendingQty})
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {r.reasons.map((reason, idx) => (
                            <div key={idx} className="text-[11px] font-medium text-rose-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                        +{r.recommendedBuyQty} {r.item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">{formatIDR(r.estimatedCost)}</div>
                        {r.item.hargaPerkiraan ? (
                          <div className="text-[10px] text-slate-400">
                            @{formatIDR(r.item.hargaPerkiraan)}/{r.item.unit}
                          </div>
                        ) : null}
                      </td>
                      {isAdminOrHeadmaster && (
                        <td className="py-3.5 px-4 text-right print:hidden">
                          <button
                            onClick={() => onQuickIncoming(r.item.id, r.recommendedBuyQty)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition whitespace-nowrap cursor-pointer"
                          >
                            + Barang Masuk
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE 2: 🔄 RIWAYAT TRANSAKSI (MASUK & KELUAR)
  // ============================================================================
  if (mode === 'HISTORY') {
    const totalMasukFiltered = filteredTransactions
      .filter((t) => t.type === 'MASUK')
      .reduce((acc, t) => acc + (Number(t.jumlah) || 0), 0);
    const totalKeluarFiltered = filteredTransactions
      .filter((t) => t.type === 'KELUAR')
      .reduce((acc, t) => acc + (Number(t.jumlah) || 0), 0);

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <SchoolLogo
                logoUrl={effectiveLogoUrl}
                schoolName={effectiveSchoolName}
                size="lg"
                variant="light"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#24485A]">
                  {effectiveSchoolName}
                  {effectiveAddress ? ` • ${effectiveAddress}` : ''}
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <History className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Riwayat Transaksi Barang Masuk &amp; Keluar</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan audit lengkap seluruh pergerakan stok ATK beserta petugas, sumber pembelian, dan guru penerima/pengguna.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportHistoryCSV}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Riwayat
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={trxSearch}
                onChange={(e) => setTrxSearch(e.target.value)}
                placeholder="Cari barang, guru, nota..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={trxTypeFilter}
              onChange={(e) => setTrxTypeFilter(e.target.value as 'ALL' | 'MASUK' | 'KELUAR')}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Jenis Transaksi</option>
              <option value="MASUK">📥 Barang Masuk</option>
              <option value="KELUAR">📤 Barang Keluar</option>
            </select>

            <select
              value={trxCategoryFilter}
              onChange={(e) => setTrxCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kategori</option>
              {atkCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={trxItemFilter}
              onChange={(e) => setTrxItemFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Barang</option>
              {atkItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={trxStartDate}
                onChange={(e) => setTrxStartDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Dari Tanggal"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={trxEndDate}
                onChange={(e) => setTrxEndDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Sampai Tanggal"
              />
            </div>
          </div>

          {/* Quick totals */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span>
              Total Transaksi: <strong className="font-mono text-slate-900">{filteredTransactions.length}</strong>
            </span>
            <span>&bull;</span>
            <span className="text-emerald-700">
              Total Unit Masuk: <strong className="font-mono">+{totalMasukFiltered}</strong>
            </span>
            <span>&bull;</span>
            <span className="text-amber-700">
              Total Unit Keluar: <strong className="font-mono">-{totalKeluarFiltered}</strong>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {filteredTransactions.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Belum ada riwayat transaksi yang sesuai dengan filter pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-3 px-4">Tanggal & Waktu</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4 text-right">Jumlah</th>
                    <th className="py-3 px-4 text-right">Perubahan Stok</th>
                    <th className="py-3 px-4">Sumber / Penerima (Pengguna)</th>
                    <th className="py-3 px-4">Keperluan / Nota & Catatan</th>
                    <th className="py-3 px-4">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{t.tanggal}</div>
                        <div className="text-[11px] text-slate-400">{t.waktu} WIB</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {t.type === 'MASUK' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Barang Masuk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600" />
                            Barang Keluar
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{t.itemName}</div>
                        <div className="text-[11px] text-slate-400">
                          {t.itemCode || t.itemId} &bull; {t.category}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        <span className={t.type === 'MASUK' ? 'text-emerald-700' : 'text-amber-700'}>
                          {t.type === 'MASUK' ? `+${t.jumlah}` : `-${t.jumlah}`} {t.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {t.stokSebelum} &rarr; <strong className="text-slate-900">{t.stokSesudah}</strong> {t.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.type === 'MASUK' ? (
                          <div>
                            <div className="font-semibold text-slate-800">{t.sumberBarang || 'Pembelian ATK'}</div>
                            {t.hargaSatuan ? (
                              <div className="text-[11px] text-slate-400 font-mono">
                                @{formatIDR(t.hargaSatuan)}/{t.unit}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-900">{t.penerimaNama || '-'}</div>
                            <div className="text-[11px] text-slate-400">
                              {t.requestId ? 'Dari Permintaan ATK Guru' : 'Pengeluaran Langsung'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {t.type === 'MASUK' ? (
                          <div>
                            {t.nomorNota && (
                              <div className="font-mono text-[11px] text-indigo-700">Nota: {t.nomorNota}</div>
                            )}
                            <div className="text-slate-600">{t.keterangan || '-'}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800">{t.keperluan || '-'}</div>
                            {t.keterangan && <div className="text-[11px] text-slate-500">{t.keterangan}</div>}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{t.petugasNama}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE 3: 📊 LAPORAN ATK & PENGGUNAAN BARANG
  // ============================================================================
  const totalReqCount = atkRequests.length;
  const reqMenunggu = atkRequests.filter((r) => r.status === 'Menunggu').length;
  const reqDisetujui = atkRequests.filter((r) => r.status === 'Disetujui').length;
  const reqDiberikan = atkRequests.filter((r) => r.status === 'Sudah Diberikan').length;
  const reqDitolak = atkRequests.filter((r) => r.status === 'Ditolak').length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <SchoolLogo
              logoUrl={effectiveLogoUrl}
              schoolName={effectiveSchoolName}
              size="lg"
              variant="light"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#24485A]">
                {effectiveSchoolName}
                {effectiveAddress ? ` • ${effectiveAddress}` : ''}
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <BarChart3 className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Laporan Persediaan &amp; Penggunaan ATK Kantor</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekapitulasi jumlah penggunaan setiap barang, siapa yang menerima/menggunakan barang, dan posisi stok terkini untuk Kepala Sekolah.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Laporan (A4)
            </button>
          </div>
        </div>

        {/* Sub-report selector & period filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 print:hidden">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
            <button
              onClick={() => setReportTab('USAGE_ITEM')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                reportTab === 'USAGE_ITEM'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jumlah Penggunaan per Barang
            </button>
            <button
              onClick={() => setReportTab('USAGE_USER')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                reportTab === 'USAGE_USER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Penerima / Pengguna Barang
            </button>
            <button
              onClick={() => setReportTab('STOCK_POSITION')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                reportTab === 'STOCK_POSITION'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laporan Posisi Stok
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={repCategory}
              onChange={(e) => setRepCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
            >
              <option value="ALL">Semua Kategori</option>
              {atkCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={repMonth === 'ALL' ? '' : repMonth}
              onChange={(e) => setRepMonth(e.target.value || 'ALL')}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
              title="Filter Bulan"
            />
            {repMonth !== 'ALL' && (
              <button
                onClick={() => setRepMonth('ALL')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
              >
                Semua Waktu
              </button>
            )}
          </div>
        </div>

        {/* Summary of Requests */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500">Total Permintaan Guru</div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-0.5">{totalReqCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <div className="text-[11px] text-amber-800">🟡 Menunggu Persetujuan</div>
            <div className="text-lg font-bold text-amber-900 font-mono tabular-nums mt-0.5">{reqMenunggu}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-[11px] text-emerald-800">🟢 Disetujui (Belum Diberikan)</div>
            <div className="text-lg font-bold text-emerald-900 font-mono tabular-nums mt-0.5">{reqDisetujui}</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
            <div className="text-[11px] text-blue-800">🔵 Sudah Diberikan</div>
            <div className="text-lg font-bold text-blue-900 font-mono tabular-nums mt-0.5">{reqDiberikan}</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="text-[11px] text-rose-800">🔴 Ditolak</div>
            <div className="text-lg font-bold text-rose-900 font-mono tabular-nums mt-0.5">{reqDitolak}</div>
          </div>
        </div>
      </div>

      {/* Sub-Report 1: Jumlah Penggunaan Setiap Barang */}
      {reportTab === 'USAGE_ITEM' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                Rekap Jumlah Penggunaan Setiap Barang — {schoolName}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Menampilkan total barang masuk, total barang keluar/digunakan, frekuensi pengambilan, dan daftar pengguna.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <th className="py-3 px-4">Kode & Nama Barang</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Total Masuk</th>
                  <th className="py-3 px-4 text-right">Total Digunakan (Keluar)</th>
                  <th className="py-3 px-4 text-right">Frekuensi Keluar</th>
                  <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                  <th className="py-3 px-4">Status Stok</th>
                  <th className="py-3 px-4">Penerima / Pengguna Barang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {itemUsageSummary.map((row) => (
                  <tr key={row.item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{row.item.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{row.item.category}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      +{row.totalMasuk} {row.item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-700 font-bold">
                      {row.totalKeluar} {row.item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                      {row.frekuensiKeluar}x transaksi
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {row.item.stokSaatIni} {row.item.unit}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {row.status === 'Stok Aman' && (
                        <span className="font-semibold text-emerald-700">🟢 Stok Aman</span>
                      )}
                      {row.status === 'Stok Menipis' && (
                        <span className="font-semibold text-amber-700">🟡 Stok Menipis</span>
                      )}
                      {row.status === 'Habis' && (
                        <span className="font-semibold text-rose-700">🔴 Habis</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {row.penerimaList.length > 0 ? row.penerimaList.join(', ') : <span className="text-slate-400">Belum ada penggunaan</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Report 2: Siapa yang Menerima / Menggunakan Barang */}
      {reportTab === 'USAGE_USER' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:px-6 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Rekap Penerima & Pengguna Barang ATK (Guru / Staf / Unit)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Menampilkan daftar siapa saja yang menerima atau menggunakan barang ATK beserta rincian barang dan jumlahnya.
            </p>
          </div>
          {recipientUsageSummary.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Belum ada data pengeluaran/penerima barang ATK pada periode ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-3 px-4">Nama Penerima / Pengguna</th>
                    <th className="py-3 px-4 text-right">Frekuensi Pengambilan</th>
                    <th className="py-3 px-4 text-right">Total Unit Barang</th>
                    <th className="py-3 px-4">Rincian Barang yang Digunakan</th>
                    <th className="py-3 px-4 text-right">Terakhir Mengambil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recipientUsageSummary.map((rec) => (
                    <tr key={rec.penerimaNama} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{rec.penerimaNama}</td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {rec.totalTransaksi}x
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-indigo-700">
                        {rec.totalUnitDigunakan} unit
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-700">
                          {Object.values(rec.itemsDetail).map((d, idx) => (
                            <span key={idx} className="text-xs">
                              {d.itemName}: <strong className="font-mono">{d.qty} {d.unit}</strong>
                              {idx < Object.values(rec.itemsDetail).length - 1 ? ' · ' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-500">
                        {rec.lastDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-Report 3: Laporan Posisi Stok & Nilai Persediaan */}
      {reportTab === 'STOCK_POSITION' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:px-6 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              Laporan Posisi Stok Master Barang ATK
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kondisi stok seluruh barang ATK, batas minimum, lokasi penyimpanan, dan estimasi nilai persediaan.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Lokasi</th>
                  <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                  <th className="py-3 px-4 text-right">Stok Minimum</th>
                  <th className="py-3 px-4">Status Otomatis</th>
                  <th className="py-3 px-4 text-right">Harga Satuan</th>
                  <th className="py-3 px-4 text-right">Nilai Persediaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {atkItems
                  .filter((i) => repCategory === 'ALL' || i.category === repCategory)
                  .map((item) => {
                    const st = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);
                    const totalVal = (Number(item.stokSaatIni) || 0) * (Number(item.hargaPerkiraan) || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono text-slate-500">{item.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-3 px-4 text-slate-600">{item.category}</td>
                        <td className="py-3 px-4 text-slate-600">{item.lokasiPenyimpanan}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {item.stokSaatIni} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                          {item.stokMinimum} {item.unit}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {st === 'Stok Aman' && <span className="font-semibold text-emerald-700">🟢 Stok Aman</span>}
                          {st === 'Stok Menipis' && <span className="font-semibold text-amber-700">🟡 Stok Menipis</span>}
                          {st === 'Habis' && <span className="font-semibold text-rose-700">🔴 Habis</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatIDR(item.hargaPerkiraan)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {item.hargaPerkiraan ? formatIDR(totalVal) : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
