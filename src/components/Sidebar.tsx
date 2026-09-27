import React from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
  Home,
  LayoutDashboard,
  Users,
  GraduationCap,
  DoorOpen,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  CalendarCheck,
  Award,
  CalendarDays,
  UserCog,
  Settings,
  SlidersHorizontal,
  LogOut,
  X,
  School,
  Printer,
  ShieldAlert,
  HeartPulse,
  Moon,
  Pill,
  ShieldCheck,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  History,
  BarChart3
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  group?: 'MAIN' | 'AKADEMIK' | 'KESANTRIAN' | 'ATK' | 'PENGATURAN';
}

export const NAVIGATION_ITEMS: MenuItem[] = [
  // =======================================================
  // 🏠 DASHBOARD UTAMA
  // =======================================================
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    allowedRoles: [
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
      'WALI_KELAS',
      'GURU_MAPEL',
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
    ],
    group: 'MAIN',
  },

  // =======================================================
  // 📚 AKADEMIK
  // =======================================================
  {
    id: 'academic-calendar',
    label: '📅 Kalender Akademik',
    icon: CalendarDays,
    allowedRoles: [
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
      'WALI_KELAS',
      'GURU_MAPEL',
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
    ],
    group: 'AKADEMIK',
  },
  {
    id: 'students',
    label: 'Data Siswa',
    icon: GraduationCap,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH', 'WALI_KELAS'],
    group: 'AKADEMIK',
  },
  {
    id: 'teachers',
    label: 'Data Guru',
    icon: Users,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'AKADEMIK',
  },
  {
    id: 'classes',
    label: 'Kelas & Wali',
    icon: DoorOpen,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'AKADEMIK',
  },
  {
    id: 'subjects',
    label: 'Mata Pelajaran',
    icon: BookOpen,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'AKADEMIK',
  },
  {
    id: 'assignments',
    label: 'Penugasan Guru',
    icon: ClipboardList,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH', 'GURU_MAPEL', 'WALI_KELAS'],
    group: 'AKADEMIK',
  },
  {
    id: 'my-classes',
    label: 'Kelas & Mapel Saya',
    icon: BookOpen,
    allowedRoles: ['GURU_MAPEL', 'WALI_KELAS'],
    group: 'AKADEMIK',
  },
  {
    id: 'scores',
    label: 'Penilaian',
    icon: FileSpreadsheet,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'],
    group: 'AKADEMIK',
  },
  {
    id: 'attendance',
    label: 'Absensi',
    icon: CalendarCheck,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'],
    group: 'AKADEMIK',
  },
  {
    id: 'report-cards',
    label: 'Raport',
    icon: Award,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH', 'WALI_KELAS'],
    group: 'AKADEMIK',
  },
  {
    id: 'print-report',
    label: 'Cetak Raport',
    icon: Printer,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH', 'WALI_KELAS'],
    group: 'AKADEMIK',
  },

  // =======================================================
  // 🏫 KESANTRIAN
  // =======================================================
  {
    id: 'kesantrian-dashboard',
    label: 'Ringkasan Kesantrian',
    icon: ShieldCheck,
    allowedRoles: [
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
    ],
    group: 'KESANTRIAN',
  },
  {
    id: 'kesantrian-pelanggaran',
    label: 'Pelanggaran',
    icon: ShieldAlert,
    allowedRoles: [
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
    ],
    group: 'KESANTRIAN',
  },
  {
    id: 'kesantrian-sakit',
    label: 'Santri Sakit',
    icon: HeartPulse,
    allowedRoles: [
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
    ],
    group: 'KESANTRIAN',
  },
  {
    id: 'kesantrian-izin',
    label: 'Izin/Pulang',
    icon: DoorOpen,
    allowedRoles: [
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
    ],
    group: 'KESANTRIAN',
  },
  {
    id: 'kesantrian-mabit',
    label: 'Mabit',
    icon: Moon,
    allowedRoles: [
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
    ],
    group: 'KESANTRIAN',
  },
  {
    id: 'kesantrian-obat',
    label: 'Obat & P3K',
    icon: Pill,
    allowedRoles: [
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
    ],
    group: 'KESANTRIAN',
  },
  {
    id: 'kesantrian-laporan',
    label: 'Laporan Kesantrian',
    icon: FileSpreadsheet,
    allowedRoles: [
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
    ],
    group: 'KESANTRIAN',
  },

  // =======================================================
  // 📦 ATK & PERSEDIAAN
  // =======================================================
  {
    id: 'atk-dashboard',
    label: 'Ringkasan Persediaan',
    icon: Package,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'ATK',
  },
  {
    id: 'atk-items',
    label: 'Daftar Barang',
    icon: ClipboardList,
    allowedRoles: [
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
      'WALI_KELAS',
      'GURU_MAPEL',
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
    ],
    group: 'ATK',
  },
  {
    id: 'atk-requests',
    label: 'Permintaan ATK',
    icon: FileSpreadsheet,
    allowedRoles: [
      'ADMIN',
      'MUDIR',
      'mudir',
      'KEPALA_SEKOLAH',
      'WALI_KELAS',
      'GURU_MAPEL',
      'KEPALA_KESANTRIAN',
      'MUSYRIF_KESANTRIAN',
      'kepala_kesantrian',
      'musyrif_kesantrian',
      'PETUGAS_KESANTRIAN',
    ],
    group: 'ATK',
  },
  {
    id: 'atk-incoming',
    label: 'Barang Masuk',
    icon: ArrowDownCircle,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'ATK',
  },
  {
    id: 'atk-outgoing',
    label: 'Barang Keluar',
    icon: ArrowUpCircle,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'ATK',
  },
  {
    id: 'atk-restock',
    label: 'Pengadaan',
    icon: ShoppingCart,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'ATK',
  },
  {
    id: 'atk-history',
    label: 'Riwayat Transaksi',
    icon: History,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'ATK',
  },
  {
    id: 'atk-reports',
    label: 'Laporan ATK',
    icon: BarChart3,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'ATK',
  },

  // =======================================================
  // ⚙️ PENGATURAN
  // =======================================================
  {
    id: 'users',
    label: 'Pengguna & Role',
    icon: UserCog,
    allowedRoles: ['ADMIN'],
    group: 'PENGATURAN',
  },
  {
    id: 'settings',
    label: 'Identitas Sekolah',
    icon: Settings,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'PENGATURAN',
  },
  {
    id: 'academic-settings',
    label: 'Pengaturan Akademik',
    icon: SlidersHorizontal,
    allowedRoles: ['KEPALA_SEKOLAH', 'ADMIN', 'MUDIR', 'mudir'],
    group: 'PENGATURAN',
  },
  {
    id: 'academic-years',
    label: 'Tahun Ajaran',
    icon: CalendarDays,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'PENGATURAN',
  },
];

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  onClose,
}) => {
  const { currentUser, role, logout } = useAuth();
  const { activeAcademicYear } = useMasterData();

  if (!role) return null;

  const isKesantrianOnlyRole =
    role === 'KEPALA_KESANTRIAN' ||
    role === 'MUSYRIF_KESANTRIAN' ||
    role === 'kepala_kesantrian' ||
    role === 'musyrif_kesantrian' ||
    role === 'PETUGAS_KESANTRIAN';

  // Filter navigation items strictly based on RBAC
  const visibleItems = NAVIGATION_ITEMS.filter((item) => {
    if (isKesantrianOnlyRole && item.id === 'kesantrian-dashboard') return false;
    return item.allowedRoles.includes(role);
  });

  const kesantrianSubRoleText =
    currentUser?.kesantrianRole === 'MUSYRIF_KESANTRIAN'
      ? 'Musyrif Kesantrian'
      : currentUser?.kesantrianRole === 'KEPALA_KESANTRIAN'
      ? 'Kepala Kesantrian'
      : 'Kepala Kesantrian';

  const roleBadge = {
    ADMIN: { text: 'Admin', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    MUDIR: { text: 'Mudir Pesantren', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
    mudir: { text: 'Mudir Pesantren', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
    KEPALA_SEKOLAH: { text: 'Kepala Sekolah', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    WALI_KELAS: { text: 'Wali Kelas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    GURU_MAPEL: { text: 'Guru Mapel', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    KEPALA_KESANTRIAN: { text: 'Kepala Kesantrian', color: 'bg-teal-50 text-teal-800 border-teal-300' },
    MUSYRIF_KESANTRIAN: { text: 'Musyrif Kesantrian', color: 'bg-cyan-50 text-cyan-800 border-cyan-300' },
    kepala_kesantrian: { text: 'Kepala Kesantrian', color: 'bg-teal-50 text-teal-800 border-teal-300' },
    musyrif_kesantrian: { text: 'Musyrif Kesantrian', color: 'bg-cyan-50 text-cyan-800 border-cyan-300' },
    PETUGAS_KESANTRIAN: { text: kesantrianSubRoleText, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  }[role] || { text: 'Kepala Kesantrian', color: 'bg-teal-50 text-teal-800 border-teal-300' };

  const firstAkademikId = visibleItems.find((vi) => vi.group === 'AKADEMIK')?.id;
  const firstKesantrianId = visibleItems.find((vi) => vi.group === 'KESANTRIAN')?.id;
  const firstAtkId = visibleItems.find((vi) => vi.group === 'ATK')?.id;
  const firstPengaturanId = visibleItems.find((vi) => vi.group === 'PENGATURAN')?.id;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base leading-none text-slate-900 tracking-tight">
                AKSARA
              </div>
              <div className="text-[11px] text-slate-500 font-medium leading-none mt-1">
                Sistem Info Sekolah
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Role Pill */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-medium truncate">
            {currentUser?.name || 'Pengguna'}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleBadge.color}`}
            >
              {roleBadge.text}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              TA {activeAcademicYear?.name || '2026/2027'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon === Home && role !== 'ADMIN' ? LayoutDashboard : item.icon;
            const isActive = currentTab === item.id;
            const displayLabel =
              item.id === 'dashboard'
                ? role === 'ADMIN'
                  ? '🏠 Dashboard'
                  : role === 'MUDIR' || role === 'mudir'
                  ? '🏛️ Dashboard Mudir'
                  : isKesantrianOnlyRole
                  ? 'Dashboard Kesantrian'
                  : 'Dashboard'
                : item.label;

            const showAkademikDivider = firstAkademikId === item.id;
            const showKesantrianDivider = !isKesantrianOnlyRole && firstKesantrianId === item.id;
            const showAtkDivider = firstAtkId === item.id;
            const showPengaturanDivider = firstPengaturanId === item.id;

            return (
              <React.Fragment key={item.id}>
                {showAkademikDivider && (
                  <div className="pt-3 pb-1 px-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-t border-slate-100 pt-2.5">
                      📚 AKADEMIK
                    </div>
                  </div>
                )}
                {showKesantrianDivider && (
                  <div className="pt-3 pb-1 px-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600 border-t border-slate-100 pt-2.5">
                      🏫 KESANTRIAN
                    </div>
                  </div>
                )}
                {showAtkDivider && (
                  <div className="pt-3 pb-1 px-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 border-t border-slate-100 pt-2.5">
                      📦 ATK & PERSEDIAAN
                    </div>
                  </div>
                )}
                {showPengaturanDivider && (
                  <div className="pt-3 pb-1 px-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-t border-slate-100 pt-2.5">
                      ⚙️ PENGATURAN
                    </div>
                  </div>
                )}
                <button
                  id={`menu-${item.id}`}
                  onClick={() => {
                    setCurrentTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{displayLabel}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-200">
          <button
            id="btn-logout"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar dari AKSARA
          </button>
        </div>
      </aside>
    </>
  );
};
