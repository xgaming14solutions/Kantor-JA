import React, { useState, useMemo, useEffect } from 'react';
import {
  AtkItem,
  AtkCategory,
  AtkUnit,
  calculateAtkStockStatus,
  isAtkAdminRole,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import { AtkRequestsSection } from './AtkRequestsSection';
import { AtkReportsSection, RestockRecommendation, formatIDR } from './AtkReportsSection';
import {
  Package,
  LayoutDashboard,
  ClipboardList,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  History,
  BarChart3,
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Tags,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';

interface AtkViewProps {
  tab: string;
  onNavigate: (tab: string) => void;
}

type AtkSubSection =
  | 'DASHBOARD'
  | 'ITEMS'
  | 'INCOMING'
  | 'OUTGOING'
  | 'REQUESTS'
  | 'RESTOCK'
  | 'HISTORY'
  | 'REPORTS';

const UNIT_OPTIONS: AtkUnit[] = [
  'pcs',
  'buah',
  'kotak',
  'rim',
  'botol',
  'pak',
  'set',
  'lusin',
];

const SUMBER_BARANG_OPTIONS = [
  'Pembelian Toko ATK',
  'Dana BOS / Operasional Sekolah',
  'Pengadaan Yayasan',
  'Hibah / Bantuan',
  'Saldo Awal / Penyesuaian',
  'Lainnya',
];

const KEPERLUAN_KELUAR_OPTIONS = [
  'Mengajar di Kelas',
  'Administrasi Ruang TU',
  'Ujian / Evaluasi Sekolah',
  'Kebutuhan Kepala Sekolah / Pimpinan',
  'Kegiatan Ekstrakurikuler / Kesantrian',
  'Kebersihan & Pemeliharaan Kantor',
  'Rapat Guru / Kepanitiaan',
  'Lainnya',
];

function mapTabToSection(tab: string, isAdminOrHeadmaster: boolean): AtkSubSection {
  switch (tab) {
    case 'atk-dashboard':
      return isAdminOrHeadmaster ? 'DASHBOARD' : 'REQUESTS';
    case 'atk-items':
      return 'ITEMS';
    case 'atk-incoming':
      return isAdminOrHeadmaster ? 'INCOMING' : 'REQUESTS';
    case 'atk-outgoing':
      return isAdminOrHeadmaster ? 'OUTGOING' : 'REQUESTS';
    case 'atk-requests':
      return 'REQUESTS';
    case 'atk-restock':
      return isAdminOrHeadmaster ? 'RESTOCK' : 'REQUESTS';
    case 'atk-history':
      return isAdminOrHeadmaster ? 'HISTORY' : 'REQUESTS';
    case 'atk-reports':
      return isAdminOrHeadmaster ? 'REPORTS' : 'REQUESTS';
    default:
      return isAdminOrHeadmaster ? 'DASHBOARD' : 'REQUESTS';
  }
}

export const AtkView: React.FC<AtkViewProps> = ({ tab, onNavigate }) => {
  const { currentUser, role } = useAuth();
  const {
    atkCategories,
    atkItems,
    atkTransactions,
    atkRequests,
    teachers,
    users,
    schoolIdentity,
    allowTeacherViewAtkStock,
    setAllowTeacherViewAtkStock,
    saveAtkCategory,
    deleteAtkCategory,
    saveAtkItem,
    toggleAtkItemStatus,
    recordAtkIncoming,
    recordAtkOutgoing,
    createAtkRequest,
    approveAtkRequest,
    rejectAtkRequest,
    handoverAtkRequest,
    cancelAtkRequest,
  } = useMasterData();

  const isAdminOrHeadmaster = isAtkAdminRole(role);
  const [activeSection, setActiveSection] = useState<AtkSubSection>(() =>
    mapTabToSection(tab, isAdminOrHeadmaster)
  );

  useEffect(() => {
    setActiveSection(mapTabToSection(tab, isAdminOrHeadmaster));
  }, [tab, isAdminOrHeadmaster]);

  const handleSectionSelect = (sec: AtkSubSection, routeId: string) => {
    setActiveSection(sec);
    onNavigate(routeId);
  };

  // Notification banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // ==========================================================================
  // COMPUTED METRICS & RESTOCK RECOMMENDATIONS
  // ==========================================================================
  const activeAtkItems = useMemo(
    () => atkItems.filter((i) => i.isActive !== false),
    [atkItems]
  );

  const restockList: RestockRecommendation[] = useMemo(() => {
    const list: RestockRecommendation[] = [];

    activeAtkItems.forEach((item) => {
      const status = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);

      const pendingQty = atkRequests
        .filter((r) => r.itemId === item.id && r.status === 'Menunggu')
        .reduce((acc, r) => acc + (Number(r.jumlahDiminta) || 0), 0);

      const approvedNotHandedQty = atkRequests
        .filter((r) => r.itemId === item.id && r.status === 'Disetujui')
        .reduce((acc, r) => acc + (Number(r.jumlahDisetujui || r.jumlahDiminta) || 0), 0);

      const totalNeededByTeachers = pendingQty + approvedNotHandedQty;
      const shortageForApproved = Math.max(0, approvedNotHandedQty - item.stokSaatIni);
      const shortageForAllRequests = Math.max(0, totalNeededByTeachers - item.stokSaatIni);

      const reasons: string[] = [];
      if (item.stokSaatIni <= 0) {
        reasons.push('Stok sudah habis (0)');
      } else if (item.stokSaatIni <= item.stokMinimum) {
        reasons.push(`Stok menipis (${item.stokSaatIni} ≤ batas minimum ${item.stokMinimum})`);
      }
      if (approvedNotHandedQty > item.stokSaatIni) {
        reasons.push(
          `Stok tidak mencukupi untuk memenuhi permintaan yang sudah disetujui (butuh ${approvedNotHandedQty} ${item.unit}, tersedia ${item.stokSaatIni} ${item.unit})`
        );
      } else if (totalNeededByTeachers > item.stokSaatIni) {
        reasons.push(
          `Permintaan guru menunggu + disetujui (${totalNeededByTeachers} ${item.unit}) melebihi stok tersedia (${item.stokSaatIni} ${item.unit})`
        );
      }

      if (reasons.length > 0) {
        const targetBuffer = Math.max(item.stokMinimum * 2, item.stokMinimum + 5);
        const recommendedBuyQty = Math.max(
          1,
          targetBuffer - item.stokSaatIni + totalNeededByTeachers,
          shortageForAllRequests + item.stokMinimum
        );
        const estimatedCost = recommendedBuyQty * (Number(item.hargaPerkiraan) || 0);

        list.push({
          item,
          status,
          pendingQty,
          approvedNotHandedQty,
          totalNeededByTeachers,
          shortageForApproved,
          reasons,
          recommendedBuyQty,
          estimatedCost,
        });
      }
    });

    return list.sort((a, b) => a.item.stokSaatIni - b.item.stokSaatIni);
  }, [activeAtkItems, atkRequests]);

  const dashboardMetrics = useMemo(() => {
    let stokAman = 0;
    let stokMenipis = 0;
    let habis = 0;

    activeAtkItems.forEach((item) => {
      const st = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);
      if (st === 'Stok Aman') stokAman++;
      else if (st === 'Stok Menipis') stokMenipis++;
      else habis++;
    });

    const permintaanMenunggu = atkRequests.filter((r) => r.status === 'Menunggu').length;
    const disetujuiBelumDiberikan = atkRequests.filter((r) => r.status === 'Disetujui').length;

    return {
      totalJenis: activeAtkItems.length,
      stokAman,
      stokMenipis,
      habis,
      permintaanMenunggu,
      disetujuiBelumDiberikan,
      perluDibeli: restockList.length,
    };
  }, [activeAtkItems, atkRequests, restockList]);

  // ==========================================================================
  // STATE FOR MASTER DATA BARANG (📋 DAFTAR BARANG)
  // ==========================================================================
  const [itemSearch, setItemSearch] = useState<string>('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('ALL');
  const [itemStatusFilter, setItemStatusFilter] = useState<'ALL' | 'Stok Aman' | 'Stok Menipis' | 'Habis'>('ALL');
  const [showInactiveItems, setShowInactiveItems] = useState<boolean>(false);

  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AtkItem | null>(null);
  const [itemForm, setItemForm] = useState<{
    code: string;
    name: string;
    category: string;
    unit: AtkUnit;
    stokSaatIni: string;
    stokMinimum: string;
    lokasiPenyimpanan: string;
    hargaPerkiraan: string;
    keterangan: string;
    isActive: boolean;
  }>({
    code: '',
    name: '',
    category: 'ATK',
    unit: 'pcs',
    stokSaatIni: '0',
    stokMinimum: '5',
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: '',
    keterangan: '',
    isActive: true,
  });

  // Category Management Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  // ==========================================================================
  // STATE FOR BARANG MASUK (📥 BARANG MASUK)
  // ==========================================================================
  const [inItemId, setInItemId] = useState<string>('');
  const [inJumlah, setInJumlah] = useState<string>('1');
  const [inTanggal, setInTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [inSumber, setInSumber] = useState<string>('Pembelian Toko ATK');
  const [inHargaSatuan, setInHargaSatuan] = useState<string>('');
  const [inNomorNota, setInNomorNota] = useState<string>('');
  const [inKeterangan, setInKeterangan] = useState<string>('');
  const [inPetugas, setInPetugas] = useState<string>(
    currentUser?.displayName || currentUser?.name || 'Administrator'
  );

  // ==========================================================================
  // STATE FOR BARANG KELUAR (📤 BARANG KELUAR)
  // ==========================================================================
  const [outItemId, setOutItemId] = useState<string>('');
  const [outJumlah, setOutJumlah] = useState<string>('1');
  const [outTanggal, setOutTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [outPenerimaNama, setOutPenerimaNama] = useState<string>('');
  const [outKeperluan, setOutKeperluan] = useState<string>('Mengajar di Kelas');
  const [outKeterangan, setOutKeterangan] = useState<string>('');
  const [outPetugas, setOutPetugas] = useState<string>(
    currentUser?.displayName || currentUser?.name || 'Administrator'
  );

  useEffect(() => {
    const defaultName = currentUser?.displayName || currentUser?.name || '';
    if (defaultName) {
      setInPetugas((prev) => (!prev || prev === 'Administrator' ? defaultName : prev));
      setOutPetugas((prev) => (!prev || prev === 'Administrator' ? defaultName : prev));
    }
  }, [currentUser?.displayName, currentUser?.name]);

  const openAddItemModal = () => {
    const nextNum = atkItems.length + 1;
    setEditingItem(null);
    setItemForm({
      code: `ATK-${String(nextNum).padStart(3, '0')}`,
      name: '',
      category: atkCategories.find((c) => c.isActive)?.name || 'ATK',
      unit: 'pcs',
      stokSaatIni: '0',
      stokMinimum: '5',
      lokasiPenyimpanan: 'Ruang TU',
      hargaPerkiraan: '',
      keterangan: '',
      isActive: true,
    });
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: AtkItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      stokSaatIni: String(item.stokSaatIni),
      stokMinimum: String(item.stokMinimum),
      lokasiPenyimpanan: item.lokasiPenyimpanan,
      hargaPerkiraan: item.hargaPerkiraan !== undefined ? String(item.hargaPerkiraan) : '',
      keterangan: item.keterangan || '',
      isActive: item.isActive !== false,
    });
    setItemModalOpen(true);
  };

  const handleSaveItemForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      showBanner('error', 'Nama barang wajib diisi.');
      return;
    }
    try {
      const payload: AtkItem = {
        id: editingItem ? editingItem.id : `atk_item_${Date.now()}`,
        code: itemForm.code.trim() || `ATK-${String(atkItems.length + 1).padStart(3, '0')}`,
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit,
        stokSaatIni: Math.max(0, Math.floor(Number(itemForm.stokSaatIni) || 0)),
        stokMinimum: Math.max(0, Math.floor(Number(itemForm.stokMinimum) || 0)),
        lokasiPenyimpanan: itemForm.lokasiPenyimpanan.trim() || 'Ruang TU',
        hargaPerkiraan:
          itemForm.hargaPerkiraan.trim() !== ''
            ? Math.max(0, Number(itemForm.hargaPerkiraan))
            : undefined,
        keterangan: itemForm.keterangan.trim(),
        isActive: itemForm.isActive,
      };
      await saveAtkItem(payload, !editingItem);
      showBanner(
        'success',
        editingItem
          ? `Data barang "${payload.name}" berhasil diperbarui.`
          : `Barang baru "${payload.name}" berhasil ditambahkan ke Master Data.`
      );
      setItemModalOpen(false);
    } catch (err: any) {
      showBanner('error', err?.message || 'Gagal menyimpan data barang.');
    }
  };

  const handleSubmitIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inItemId) {
      showBanner('error', 'Silakan pilih barang yang masuk.');
      return;
    }
    try {
      const trx = await recordAtkIncoming({
        itemId: inItemId,
        jumlah: Number(inJumlah),
        tanggal: inTanggal,
        sumberBarang: inSumber,
        hargaSatuan: inHargaSatuan.trim() !== '' ? Number(inHargaSatuan) : undefined,
        nomorNota: inNomorNota,
        keterangan: inKeterangan,
        petugasNama: inPetugas,
      });
      showBanner(
        'success',
        `Barang Masuk tercatat: ${trx.itemName} (+${trx.jumlah} ${trx.unit}). Stok otomatis bertambah dari ${trx.stokSebelum} menjadi ${trx.stokSesudah} ${trx.unit}.`
      );
      setInItemId('');
      setInJumlah('1');
      setInNomorNota('');
      setInKeterangan('');
    } catch (err: any) {
      showBanner('error', err?.message || 'Gagal mencatat barang masuk.');
    }
  };

  const handleSubmitOutgoing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outItemId) {
      showBanner('error', 'Silakan pilih barang yang keluar.');
      return;
    }
    if (!outPenerimaNama.trim()) {
      showBanner('error', 'Silakan isi atau pilih nama penerima/pengguna barang.');
      return;
    }
    try {
      const trx = await recordAtkOutgoing({
        itemId: outItemId,
        jumlah: Number(outJumlah),
        tanggal: outTanggal,
        penerimaNama: outPenerimaNama,
        keperluan: outKeperluan,
        keterangan: outKeterangan,
        petugasNama: outPetugas,
      });
      showBanner(
        'success',
        `Barang Keluar tercatat: ${trx.itemName} (-${trx.jumlah} ${trx.unit}) untuk ${trx.penerimaNama}. Stok otomatis menjadi ${trx.stokSesudah} ${trx.unit}.`
      );
      setOutItemId('');
      setOutJumlah('1');
      setOutKeterangan('');
    } catch (err: any) {
      showBanner('error', err?.message || 'Gagal mencatat barang keluar.');
    }
  };

  const handleQuickIncomingFromRestock = (itemId: string, suggestedQty?: number) => {
    const item = atkItems.find((i) => i.id === itemId);
    setInItemId(itemId);
    setInJumlah(String(suggestedQty || 5));
    if (item?.hargaPerkiraan) {
      setInHargaSatuan(String(item.hargaPerkiraan));
    }
    handleSectionSelect('INCOMING', 'atk-incoming');
  };

  // Filtered Master Items
  const filteredItems = useMemo(() => {
    return atkItems.filter((item) => {
      if (!showInactiveItems && item.isActive === false) return false;
      if (itemCategoryFilter !== 'ALL' && item.category !== itemCategoryFilter) return false;
      const st = calculateAtkStockStatus(item.stokSaatIni, item.stokMinimum);
      if (itemStatusFilter !== 'ALL' && st !== itemStatusFilter) return false;
      if (itemSearch.trim()) {
        const q = itemSearch.toLowerCase();
        const hay = `${item.code} ${item.name} ${item.category} ${item.lokasiPenyimpanan} ${item.keterangan || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [atkItems, showInactiveItems, itemCategoryFilter, itemStatusFilter, itemSearch]);

  // Recipient options from Teachers & Users
  const recipientSuggestions = useMemo(() => {
    const names = new Set<string>();
    teachers.forEach((t) => {
      if (t.name) names.add(t.name);
    });
    users.forEach((u) => {
      if (u.displayName || u.name) names.add(u.displayName || u.name);
    });
    names.add('Ruang TU / Administrasi');
    names.add('Ruang Kepala Sekolah');
    names.add('Panitia Ujian Sekolah');
    names.add('Asrama / Kesantrian');
    return Array.from(names);
  }, [teachers, users]);

  const selectedIncomingItem = useMemo(
    () => atkItems.find((i) => i.id === inItemId) || null,
    [atkItems, inItemId]
  );

  const selectedOutgoingItem = useMemo(
    () => atkItems.find((i) => i.id === outItemId) || null,
    [atkItems, outItemId]
  );

  const renderStockStatusText = (stokSaatIni: number, stokMinimum: number) => {
    const status = calculateAtkStockStatus(stokSaatIni, stokMinimum);
    if (status === 'Stok Aman') {
      return <span className="font-semibold text-emerald-700">🟢 Stok Aman</span>;
    }
    if (status === 'Stok Menipis') {
      return <span className="font-semibold text-amber-700">🟡 Stok Menipis</span>;
    }
    return <span className="font-semibold text-rose-700">🔴 Habis</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Module Header & Sub-Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-indigo-600">
              MODUL AKSARA &bull; INVENTARIS & LOGISTIK SEKOLAH
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight flex items-center gap-2">
              <span>📦 ATK & Persediaan Kantor</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isAdminOrHeadmaster
                ? 'Kelola ketersediaan stok ATK, barang masuk & keluar, persetujuan permintaan guru, pengadaan, dan laporan penggunaan.'
                : 'Ajukan permintaan kebutuhan ATK mengajar/administrasi dan pantau status persetujuan permintaan Anda.'}
            </p>
          </div>

          {isAdminOrHeadmaster && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSectionSelect('INCOMING', 'atk-incoming')}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownCircle className="w-4 h-4" />
                + Barang Masuk
              </button>
              <button
                onClick={() => handleSectionSelect('OUTGOING', 'atk-outgoing')}
                className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpCircle className="w-4 h-4" />
                + Barang Keluar
              </button>
              <button
                onClick={() => {
                  handleSectionSelect('ITEMS', 'atk-items');
                  openAddItemModal();
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Barang
              </button>
            </div>
          )}
        </div>

        {/* Sub-navigation Bar */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {isAdminOrHeadmaster && (
            <button
              onClick={() => handleSectionSelect('DASHBOARD', 'atk-dashboard')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeSection === 'DASHBOARD'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              📦 Ringkasan Persediaan
            </button>
          )}

          <button
            onClick={() => handleSectionSelect('ITEMS', 'atk-items')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'ITEMS'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            📋 Daftar Barang
          </button>

          {isAdminOrHeadmaster && (
            <>
              <button
                onClick={() => handleSectionSelect('INCOMING', 'atk-incoming')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeSection === 'INCOMING'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                📥 Barang Masuk
              </button>

              <button
                onClick={() => handleSectionSelect('OUTGOING', 'atk-outgoing')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeSection === 'OUTGOING'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                📤 Barang Keluar
              </button>
            </>
          )}

          <button
            onClick={() => handleSectionSelect('REQUESTS', 'atk-requests')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'REQUESTS'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            {isAdminOrHeadmaster ? '📋 Permintaan ATK' : '📝 Permintaan ATK'}
            {isAdminOrHeadmaster && dashboardMetrics.permintaanMenunggu > 0 && (
              <span className="font-mono font-bold text-amber-700">
                ({dashboardMetrics.permintaanMenunggu})
              </span>
            )}
          </button>

          {isAdminOrHeadmaster && (
            <>
              <button
                onClick={() => handleSectionSelect('RESTOCK', 'atk-restock')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeSection === 'RESTOCK'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                🛒 Pengadaan ({dashboardMetrics.perluDibeli})
              </button>

              <button
                onClick={() => handleSectionSelect('HISTORY', 'atk-history')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeSection === 'HISTORY'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                🔄 Riwayat Transaksi
              </button>

              <button
                onClick={() => handleSectionSelect('REPORTS', 'atk-reports')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeSection === 'REPORTS'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                📊 Laporan ATK
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button onClick={() => setBanner(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. 📦 DASHBOARD ATK & PERSEDIAAN */}
      {/* ==================================================================== */}
      {activeSection === 'DASHBOARD' && isAdminOrHeadmaster && (
        <div className="space-y-6">
          {/* 6 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => handleSectionSelect('ITEMS', 'atk-items')}
              className="text-left bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-xs transition cursor-pointer"
            >
              <div className="text-xs font-medium text-slate-500">Total Jenis Barang</div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {dashboardMetrics.totalJenis}{' '}
                <span className="text-xs font-sans font-normal text-slate-500">jenis</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Master barang aktif</div>
            </button>

            <button
              onClick={() => {
                setItemStatusFilter('Stok Aman');
                handleSectionSelect('ITEMS', 'atk-items');
              }}
              className="text-left bg-white border border-emerald-200 hover:border-emerald-400 rounded-2xl p-4 shadow-xs transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-emerald-700">🟢 Stok Aman</div>
              <div className="text-2xl font-bold text-emerald-900 font-mono tabular-nums mt-1">
                {dashboardMetrics.stokAman}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">Stok &gt; batas minimum</div>
            </button>

            <button
              onClick={() => {
                setItemStatusFilter('Stok Menipis');
                handleSectionSelect('ITEMS', 'atk-items');
              }}
              className="text-left bg-white border border-amber-200 hover:border-amber-400 rounded-2xl p-4 shadow-xs transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-amber-700">🟡 Stok Menipis</div>
              <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums mt-1">
                {dashboardMetrics.stokMenipis}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">Stok &le; batas minimum</div>
            </button>

            <button
              onClick={() => {
                setItemStatusFilter('Habis');
                handleSectionSelect('ITEMS', 'atk-items');
              }}
              className="text-left bg-white border border-rose-200 hover:border-rose-400 rounded-2xl p-4 shadow-xs transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-rose-700">🔴 Barang Habis</div>
              <div className="text-2xl font-bold text-rose-900 font-mono tabular-nums mt-1">
                {dashboardMetrics.habis}
              </div>
              <div className="text-[11px] text-rose-600 mt-1">Stok saat ini = 0</div>
            </button>

            <button
              onClick={() => handleSectionSelect('REQUESTS', 'atk-requests')}
              className="text-left bg-white border border-indigo-200 hover:border-indigo-400 rounded-2xl p-4 shadow-xs transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-indigo-700">Permintaan Menunggu</div>
              <div className="text-2xl font-bold text-indigo-900 font-mono tabular-nums mt-1">
                {dashboardMetrics.permintaanMenunggu}
              </div>
              <div className="text-[11px] text-indigo-600 mt-1">
                +{dashboardMetrics.disetujuiBelumDiberikan} disetujui blm diberikan
              </div>
            </button>

            <button
              onClick={() => handleSectionSelect('RESTOCK', 'atk-restock')}
              className="text-left bg-white border border-rose-200 hover:border-rose-400 rounded-2xl p-4 shadow-xs transition cursor-pointer"
            >
              <div className="text-xs font-semibold text-rose-700">🛒 Perlu Dibeli</div>
              <div className="text-2xl font-bold text-rose-900 font-mono tabular-nums mt-1">
                {dashboardMetrics.perluDibeli}
              </div>
              <div className="text-[11px] text-rose-600 mt-1">Rekomendasi pengadaan</div>
            </button>
          </div>

          {/* 🔴 PERLU PERHATIAN SECTION */}
          <div className="bg-white border border-rose-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 sm:px-6 border-b border-rose-100 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                  <span>🔴 PERLU PERHATIAN</span>
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Daftar barang yang stoknya sudah habis, berada di bawah/sama dengan batas minimum, atau tidak mencukupi untuk memenuhi permintaan guru yang sudah disetujui.
                </p>
              </div>
              <button
                onClick={() => handleSectionSelect('RESTOCK', 'atk-restock')}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer self-start sm:self-center whitespace-nowrap"
              >
                Buka Daftar Belanja ({restockList.length}) &rarr;
              </button>
            </div>

            {restockList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Tidak ada barang yang memerlukan perhatian darurat. Seluruh stok berada di atas batas minimum.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                      <th className="py-3 px-4">Barang</th>
                      <th className="py-3 px-4">Kategori & Lokasi</th>
                      <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                      <th className="py-3 px-4 text-right">Stok Minimum</th>
                      <th className="py-3 px-4">Status Otomatis</th>
                      <th className="py-3 px-4">Keterangan Perhatian</th>
                      <th className="py-3 px-4 text-right">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {restockList.map((r) => (
                      <tr key={r.item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{r.item.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{r.item.code}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{r.item.category}</div>
                          <div className="text-[11px] text-slate-400">{r.item.lokasiPenyimpanan}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {r.item.stokSaatIni} {r.item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                          {r.item.stokMinimum} {r.item.unit}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderStockStatusText(r.item.stokSaatIni, r.item.stokMinimum)}
                        </td>
                        <td className="py-3 px-4">
                          {r.reasons.map((reason, idx) => (
                            <div key={idx} className="text-[11px] font-medium text-rose-700">
                              &bull; {reason}
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() =>
                              handleQuickIncomingFromRestock(r.item.id, r.recommendedBuyQty)
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer"
                          >
                            + Barang Masuk
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Grid: Permintaan Guru yang Perlu Ditindaklanjuti & Riwayat Transaksi Terbaru */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Teacher Requests */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="p-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    📝 Permintaan Guru (Menunggu & Belum Diberikan)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Barang yang sedang dibutuhkan guru dan barang yang sudah disetujui tetapi belum diserahkan.
                  </p>
                </div>
                <button
                  onClick={() => handleSectionSelect('REQUESTS', 'atk-requests')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer whitespace-nowrap"
                >
                  Semua &rarr;
                </button>
              </div>
              <div className="divide-y divide-slate-100 flex-1">
                {atkRequests.filter((r) => r.status === 'Menunggu' || r.status === 'Disetujui')
                  .length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada permintaan guru yang menunggu atau belum diserahkan.
                  </div>
                ) : (
                  atkRequests
                    .filter((r) => r.status === 'Menunggu' || r.status === 'Disetujui')
                    .slice(0, 6)
                    .map((req) => (
                      <div
                        key={req.id}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {req.pemohonNama} &mdash; {req.itemName} ({req.jumlahDiminta} {req.unit})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Keperluan: {req.keperluan} &bull; {req.tanggal} {req.waktu}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold">
                            {req.status === 'Menunggu' ? '🟡 Menunggu' : '🟢 Disetujui (Blm Diberikan)'}
                          </span>
                          <button
                            onClick={() => handleSectionSelect('REQUESTS', 'atk-requests')}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                          >
                            Proses
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="p-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    🔄 Riwayat Barang Masuk & Keluar Terbaru
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pencatatan pengadaan barang masuk dan siapa yang menerima/menggunakan barang.
                  </p>
                </div>
                <button
                  onClick={() => handleSectionSelect('HISTORY', 'atk-history')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer whitespace-nowrap"
                >
                  Lihat Riwayat &rarr;
                </button>
              </div>
              <div className="divide-y divide-slate-100 flex-1">
                {atkTransactions.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {t.type === 'MASUK' ? '📥 Masuk: ' : '📤 Keluar: '}
                        {t.itemName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {t.type === 'MASUK'
                          ? `Sumber: ${t.sumberBarang || '-'}`
                          : `Penerima: ${t.penerimaNama || '-'} (${t.keperluan || '-'})`}{' '}
                        &bull; {t.tanggal}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div
                        className={`text-xs font-bold ${
                          t.type === 'MASUK' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {t.type === 'MASUK' ? `+${t.jumlah}` : `-${t.jumlah}`} {t.unit}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Stok: {t.stokSesudah} {t.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. 📋 MASTER DATA BARANG (DAFTAR BARANG) */}
      {/* ==================================================================== */}
      {activeSection === 'ITEMS' && (
        <div className="space-y-6">
          {!isAdminOrHeadmaster && !allowTeacherViewAtkStock ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <EyeOff className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900">
                Daftar Stok Detail Dibatasi oleh Administrator
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Anda tetap dapat mengajukan kebutuhan ATK kapan saja melalui menu{' '}
                <strong>📝 Permintaan ATK</strong>.
              </p>
              <button
                onClick={() => handleSectionSelect('REQUESTS', 'atk-requests')}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
              >
                Buka Form Permintaan ATK
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-600" />
                      📋 Daftar Barang ATK & Persediaan Kantor
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Status stok dihitung secara otomatis berdasarkan perbandingan Stok Saat Ini dan Stok Minimum.
                    </p>
                  </div>

                  {isAdminOrHeadmaster && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setAllowTeacherViewAtkStock(!allowTeacherViewAtkStock)}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                        title="Atur apakah Guru/Staff diizinkan melihat tabel daftar stok barang"
                      >
                        {allowTeacherViewAtkStock ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            Guru Diizinkan Lihat Stok
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            Stok Disembunyikan dari Guru
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setCategoryModalOpen(true)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Tags className="w-3.5 h-3.5" />
                        Kelola Kategori ({atkCategories.filter((c) => c.isActive).length})
                      </button>

                      <button
                        onClick={openAddItemModal}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Barang Baru
                      </button>
                    </div>
                  )}
                </div>

                {/* Search & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Cari kode, nama barang, lokasi..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <select
                    value={itemCategoryFilter}
                    onChange={(e) => setItemCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="ALL">Semua Kategori</option>
                    {atkCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={itemStatusFilter}
                    onChange={(e) => setItemStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="ALL">Semua Status Stok</option>
                    <option value="Stok Aman">🟢 Stok Aman</option>
                    <option value="Stok Menipis">🟡 Stok Menipis</option>
                    <option value="Habis">🔴 Habis</option>
                  </select>

                  {isAdminOrHeadmaster && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 px-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showInactiveItems}
                        onChange={(e) => setShowInactiveItems(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      Tampilkan barang nonaktif
                    </label>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                        <th className="py-3 px-4">ID / Kode</th>
                        <th className="py-3 px-4">Nama Barang</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                        <th className="py-3 px-4 text-right">Stok Minimum</th>
                        <th className="py-3 px-4">Lokasi Penyimpanan</th>
                        {isAdminOrHeadmaster && <th className="py-3 px-4 text-right">Harga Perkiraan</th>}
                        <th className="py-3 px-4">Status Stok Otomatis</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition ${
                            item.isActive === false ? 'opacity-50 bg-slate-50' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {item.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            {item.keterangan && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.keterangan}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                            {item.stokSaatIni} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                            {item.stokMinimum} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            {item.lokasiPenyimpanan}
                          </td>
                          {isAdminOrHeadmaster && (
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {formatIDR(item.hargaPerkiraan)}
                            </td>
                          )}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div>{renderStockStatusText(item.stokSaatIni, item.stokMinimum)}</div>
                            <div className="text-[10px] text-slate-400">
                              {item.isActive === false ? 'Status: Nonaktif' : 'Status: Aktif'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {isAdminOrHeadmaster ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditItemModal(item)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit / Stok Min
                                </button>
                                <button
                                  onClick={() => toggleAtkItemStatus(item.id)}
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                >
                                  {item.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSectionSelect('REQUESTS', 'atk-requests')}
                                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                              >
                                Minta ATK
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. 📥 BARANG MASUK */}
      {/* ==================================================================== */}
      {activeSection === 'INCOMING' && isAdminOrHeadmaster && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 self-start">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                📥 Form Pencatatan Barang Masuk
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Digunakan ketika sekolah membeli atau menerima persediaan ATK. Stok barang akan bertambah secara otomatis.
              </p>
            </div>

            <form onSubmit={handleSubmitIncoming} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Barang <span className="text-rose-500">*</span>
                </label>
                <select
                  value={inItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setInItemId(id);
                    const found = atkItems.find((i) => i.id === id);
                    if (found?.hargaPerkiraan) {
                      setInHargaSatuan(String(found.hargaPerkiraan));
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">-- Pilih Barang ATK --</option>
                  {activeAtkItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code}) — Stok saat ini: {item.stokSaatIni} {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Masuk {selectedIncomingItem ? `(${selectedIncomingItem.unit})` : ''}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={inJumlah}
                    onChange={(e) => setInJumlah(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Masuk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={inTanggal}
                    onChange={(e) => setInTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Automatic Stock Calculation Preview */}
              {selectedIncomingItem && (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-1 font-mono">
                  <div>
                    Stok sebelumnya: <strong>{selectedIncomingItem.stokSaatIni} {selectedIncomingItem.unit}</strong>
                  </div>
                  <div>
                    Barang masuk: <strong>+{Math.max(0, Number(inJumlah) || 0)} {selectedIncomingItem.unit}</strong>
                  </div>
                  <div className="pt-1 border-t border-emerald-200 font-bold text-emerald-950">
                    Stok otomatis menjadi:{' '}
                    {selectedIncomingItem.stokSaatIni + Math.max(0, Number(inJumlah) || 0)}{' '}
                    {selectedIncomingItem.unit}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="sumber-barang-list"
                  value={inSumber}
                  onChange={(e) => setInSumber(e.target.value)}
                  required
                  placeholder="Contoh: Pembelian Toko ATK / Dana BOS"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <datalist id="sumber-barang-list">
                  {SUMBER_BARANG_OPTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Satuan (Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={inHargaSatuan}
                    onChange={(e) => setInHargaSatuan(e.target.value)}
                    placeholder="Contoh: 52000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Nota / Faktur (Opsional)
                  </label>
                  <input
                    type="text"
                    value={inNomorNota}
                    onChange={(e) => setInNomorNota(e.target.value)}
                    placeholder="Contoh: INV/2026/001"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Petugas Pencatat
                </label>
                <input
                  type="text"
                  value={inPetugas}
                  onChange={(e) => setInPetugas(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  value={inKeterangan}
                  onChange={(e) => setInKeterangan(e.target.value)}
                  placeholder="Catatan tambahan penerimaan barang..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer"
              >
                Simpan Barang Masuk & Tambah Stok
              </button>
            </form>
          </div>

          {/* Recent Incoming List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                Riwayat Penerimaan Barang Masuk
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar transaksi penambahan stok persediaan ATK.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4 text-right">Jumlah Masuk</th>
                    <th className="py-3 px-4 text-right">Stok Sesudah</th>
                    <th className="py-3 px-4">Sumber & Nota</th>
                    <th className="py-3 px-4">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {atkTransactions
                    .filter((t) => t.type === 'MASUK')
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                          <div>{t.tanggal}</div>
                          <div className="text-[10px] text-slate-400">{t.waktu}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{t.itemName}</div>
                          <div className="text-[11px] text-slate-400">{t.category}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                          +{t.jumlah} {t.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {t.stokSebelum} &rarr; <strong>{t.stokSesudah}</strong> {t.unit}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{t.sumberBarang}</div>
                          {t.nomorNota && (
                            <div className="text-[11px] text-indigo-600 font-mono">
                              Nota: {t.nomorNota}
                            </div>
                          )}
                          {t.keterangan && (
                            <div className="text-[11px] text-slate-400">{t.keterangan}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{t.petugasNama}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. 📤 BARANG KELUAR */}
      {/* ==================================================================== */}
      {activeSection === 'OUTGOING' && isAdminOrHeadmaster && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 self-start">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                📤 Form Pencatatan Barang Keluar
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Digunakan untuk mencatat pengeluaran ATK secara langsung beserta siapa penerima/pengguna barang.
              </p>
            </div>

            <form onSubmit={handleSubmitOutgoing} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Barang <span className="text-rose-500">*</span>
                </label>
                <select
                  value={outItemId}
                  onChange={(e) => setOutItemId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">-- Pilih Barang ATK --</option>
                  {activeAtkItems.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.stokSaatIni <= 0}>
                      {item.name} ({item.code}) — Tersedia: {item.stokSaatIni} {item.unit}
                      {item.stokSaatIni <= 0 ? ' [HABIS]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Keluar {selectedOutgoingItem ? `(${selectedOutgoingItem.unit})` : ''}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedOutgoingItem ? selectedOutgoingItem.stokSaatIni : undefined}
                    value={outJumlah}
                    onChange={(e) => setOutJumlah(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Keluar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={outTanggal}
                    onChange={(e) => setOutTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {selectedOutgoingItem && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1 font-mono">
                  <div>
                    Stok saat ini: <strong>{selectedOutgoingItem.stokSaatIni} {selectedOutgoingItem.unit}</strong>
                  </div>
                  <div>
                    Barang keluar: <strong>-{Math.max(0, Number(outJumlah) || 0)} {selectedOutgoingItem.unit}</strong>
                  </div>
                  <div className="pt-1 border-t border-amber-200 font-bold text-amber-950">
                    Sisa stok menjadi:{' '}
                    {Math.max(0, selectedOutgoingItem.stokSaatIni - Math.max(0, Number(outJumlah) || 0))}{' '}
                    {selectedOutgoingItem.unit}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Penerima / Pengguna Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="penerima-atk-list"
                  value={outPenerimaNama}
                  onChange={(e) => setOutPenerimaNama(e.target.value)}
                  required
                  placeholder="Pilih guru/staf atau ketik nama penerima..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <datalist id="penerima-atk-list">
                  {recipientSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keperluan Penggunaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="keperluan-keluar-list"
                  value={outKeperluan}
                  onChange={(e) => setOutKeperluan(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <datalist id="keperluan-keluar-list">
                  {KEPERLUAN_KELUAR_OPTIONS.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Petugas Pencatat
                </label>
                <input
                  type="text"
                  value={outPetugas}
                  onChange={(e) => setOutPetugas(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={outKeterangan}
                  onChange={(e) => setOutKeterangan(e.target.value)}
                  placeholder="Catatan penggunaan barang..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition cursor-pointer"
              >
                Simpan Barang Keluar & Kurangi Stok
              </button>
            </form>
          </div>

          {/* Recent Outgoing List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                Riwayat Pengeluaran & Penggunaan Barang ATK
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mencakup pengeluaran langsung maupun penyerahan dari permintaan ATK guru.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Barang</th>
                    <th className="py-3 px-4 text-right">Jumlah Keluar</th>
                    <th className="py-3 px-4 text-right">Sisa Stok</th>
                    <th className="py-3 px-4">Penerima / Pengguna</th>
                    <th className="py-3 px-4">Keperluan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {atkTransactions
                    .filter((t) => t.type === 'KELUAR')
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                          <div>{t.tanggal}</div>
                          <div className="text-[10px] text-slate-400">{t.waktu}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{t.itemName}</div>
                          <div className="text-[11px] text-slate-400">{t.category}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-amber-700">
                          -{t.jumlah} {t.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {t.stokSebelum} &rarr; <strong>{t.stokSesudah}</strong> {t.unit}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {t.penerimaNama || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800">{t.keperluan || '-'}</div>
                          {t.keterangan && (
                            <div className="text-[11px] text-slate-400">{t.keterangan}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6 & 7. 📝 / 📋 PERMINTAAN ATK & PERSETUJUAN */}
      {/* ==================================================================== */}
      {activeSection === 'REQUESTS' && (
        <AtkRequestsSection
          atkItems={atkItems}
          atkRequests={atkRequests}
          currentUser={currentUser}
          role={role}
          isAdminOrHeadmaster={isAdminOrHeadmaster}
          allowTeacherViewStock={isAdminOrHeadmaster || allowTeacherViewAtkStock}
          onCreateRequest={createAtkRequest}
          onApproveRequest={approveAtkRequest}
          onRejectRequest={rejectAtkRequest}
          onHandoverRequest={handoverAtkRequest}
          onCancelRequest={cancelAtkRequest}
          onNotify={showBanner}
        />
      )}

      {/* ==================================================================== */}
      {/* 9, 10, 11. 🛒 PERLU DIBELI, 🔄 RIWAYAT TRANSAKSI, 📊 LAPORAN ATK */}
      {/* ==================================================================== */}
      {(activeSection === 'RESTOCK' ||
        activeSection === 'HISTORY' ||
        activeSection === 'REPORTS') &&
        isAdminOrHeadmaster && (
          <AtkReportsSection
            mode={activeSection}
            atkItems={atkItems}
            atkTransactions={atkTransactions}
            atkRequests={atkRequests}
            atkCategories={atkCategories}
            restockList={restockList}
            isAdminOrHeadmaster={isAdminOrHeadmaster}
            schoolName={schoolIdentity?.schoolName || 'AKSARA'}
            onQuickIncoming={handleQuickIncomingFromRestock}
          />
        )}

      {/* ==================================================================== */}
      {/* MODAL TAMBAH / EDIT MASTER BARANG */}
      {/* ==================================================================== */}
      {itemModalOpen && isAdminOrHeadmaster && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                {editingItem ? `Edit Data Barang: ${editingItem.name}` : 'Tambah Barang ATK Baru'}
              </h4>
              <button
                onClick={() => setItemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItemForm} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID / Kode Barang
                  </label>
                  <input
                    type="text"
                    value={itemForm.code}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    required
                    placeholder="Contoh: Kertas HVS A4"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Barang
                  </label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    {atkCategories
                      .filter((c) => c.isActive || c.name === itemForm.category)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingItem ? 'Stok Saat Ini (Otomatis dari Transaksi)' : 'Stok Awal Saat Ini'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.stokSaatIni}
                    onChange={(e) => setItemForm({ ...itemForm, stokSaatIni: e.target.value })}
                    disabled={
                      Boolean(
                        editingItem &&
                          atkTransactions.some((t) => t.itemId === editingItem.id)
                      )
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {editingItem && atkTransactions.some((t) => t.itemId === editingItem.id) && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Gunakan menu Barang Masuk / Keluar untuk mengubah stok barang yang sudah memiliki transaksi.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stok Minimum <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.stokMinimum}
                    onChange={(e) => setItemForm({ ...itemForm, stokMinimum: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Automatic status preview */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">Status Stok Otomatis:</span>
                {renderStockStatusText(
                  Number(itemForm.stokSaatIni) || 0,
                  Number(itemForm.stokMinimum) || 0
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Penyimpanan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={itemForm.lokasiPenyimpanan}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, lokasiPenyimpanan: e.target.value })
                    }
                    required
                    placeholder="Contoh: Ruang TU"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Perkiraan (Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.hargaPerkiraan}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, hargaPerkiraan: e.target.value })
                    }
                    placeholder="Contoh: 52000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  value={itemForm.keterangan}
                  onChange={(e) => setItemForm({ ...itemForm, keterangan: e.target.value })}
                  placeholder="Catatan spesifikasi atau penggunaan barang..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL KELOLA KATEGORI BARANG */}
      {/* ==================================================================== */}
      {categoryModalOpen && isAdminOrHeadmaster && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Kelola Kategori Barang ATK</h4>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                try {
                  await saveAtkCategory({
                    id: `atk_cat_${Date.now()}`,
                    name: newCatName.trim(),
                    description: newCatDesc.trim(),
                    isActive: true,
                  });
                  setNewCatName('');
                  setNewCatDesc('');
                  showBanner('success', 'Kategori barang baru berhasil ditambahkan.');
                } catch (err: any) {
                  showBanner('error', err?.message || 'Gagal menambah kategori.');
                }
              }}
              className="space-y-2.5"
            >
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru (misal: Elektronik Kantor)"
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Keterangan singkat..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer whitespace-nowrap"
                >
                  + Tambah
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
              {atkCategories.map((cat) => (
                <div key={cat.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {cat.name}{' '}
                      {!cat.isActive && (
                        <span className="text-[10px] text-slate-400">(Nonaktif)</span>
                      )}
                    </div>
                    {cat.description && (
                      <div className="text-[11px] text-slate-400">{cat.description}</div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await deleteAtkCategory(cat.id);
                        showBanner('success', res.message);
                      } catch (err: any) {
                        showBanner('error', err?.message || 'Gagal menghapus kategori.');
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
