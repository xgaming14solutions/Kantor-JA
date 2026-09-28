import React from 'react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
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
  BarChart3,
} from 'lucide-react';

export type MenuGroup =
  | 'MAIN'
  | 'AKADEMIK'
  | 'KESANTRIAN'
  | 'ATK'
  | 'ADMINISTRASI'
  | 'PENGATURAN';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  group: MenuGroup;
}

export const MENU_GROUP_LABELS: Record<MenuGroup, string> = {
  MAIN: 'MENU UTAMA',
  AKADEMIK: 'AKADEMIK',
  KESANTRIAN: 'KESANTRIAN',
  ATK: 'ATK & PERSEDIAAN',
  ADMINISTRASI: 'ADMINISTRASI',
  PENGATURAN: 'PENGATURAN',
};

export const NAVIGATION_ITEMS: MenuItem[] = [
  // =======================================================
  // MENU UTAMA
  // =======================================================
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
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
  // AKADEMIK
  // =======================================================
  {
    id: 'students',
    label: 'Data Siswa/Santri',
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
  {
    id: 'academic-calendar',
    label: 'Kalender Akademik',
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

  // =======================================================
  // KESANTRIAN
  // =======================================================
  {
    id: 'kesantrian-dashboard',
    label: 'Dashboard Kesantrian',
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
  // ATK & PERSEDIAAN
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
  // ADMINISTRASI
  // =======================================================
  {
    id: 'users',
    label: 'Pengguna & Role',
    icon: UserCog,
    allowedRoles: ['ADMIN'],
    group: 'ADMINISTRASI',
  },
  {
    id: 'settings',
    label: 'Identitas Sekolah',
    icon: Settings,
    allowedRoles: ['ADMIN', 'MUDIR', 'mudir', 'KEPALA_SEKOLAH'],
    group: 'ADMINISTRASI',
  },

  // =======================================================
  // PENGATURAN
  // =======================================================
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

export function formatRoleLabel(role?: UserRole | string | null, kesantrianSubRole?: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'MUDIR':
    case 'mudir':
      return 'Mudir Pesantren';
    case 'KEPALA_SEKOLAH':
      return 'Kepala Sekolah';
    case 'WALI_KELAS':
      return 'Wali Kelas';
    case 'GURU_MAPEL':
      return 'Guru Mata Pelajaran';
    case 'KEPALA_KESANTRIAN':
    case 'kepala_kesantrian':
      return 'Kepala Kesantrian';
    case 'MUSYRIF_KESANTRIAN':
    case 'musyrif_kesantrian':
      return 'Musyrif Kesantrian';
    case 'PETUGAS_KESANTRIAN':
      return kesantrianSubRole === 'MUSYRIF_KESANTRIAN'
        ? 'Musyrif Kesantrian'
        : 'Kepala Kesantrian';
    default:
      return String(role || 'Pengguna');
  }
}

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  onClose,
  isCollapsed = false,
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

  const roleText = formatRoleLabel(role, currentUser?.kesantrianRole);

  const orderedGroups: MenuGroup[] = [
    'MAIN',
    'AKADEMIK',
    'KESANTRIAN',
    'ATK',
    'ADMINISTRASI',
    'PENGATURAN',
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#162833]/50 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container — Primary Navy #24485A */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#24485A] text-white flex flex-col transition-all duration-200 ease-out select-none ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'
        } w-64 ${isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Brand Header */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#335F75] border border-white/15 text-white flex items-center justify-center shrink-0">
              <School className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="font-bold text-[15px] leading-tight text-white tracking-tight truncate">
                  AKSARA
                </div>
                <div className="text-[11px] text-[#B5C9D3] font-medium leading-tight truncate">
                  Sistem Informasi Manajemen
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Summary in Sidebar */}
        {!isCollapsed ? (
          <div className="px-4 py-3 border-b border-white/10 bg-[#1E3D4D]/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#335F75] border border-white/15 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {(currentUser?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-white truncate">
                  {currentUser?.name || 'Pengguna'}
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="text-[11px] text-[#B5C9D3] truncate">{roleText}</span>
                  <span className="text-[10px] font-mono text-[#9AB4C1] bg-white/8 px-1.5 py-0.5 rounded shrink-0">
                    {activeAcademicYear?.name || '2026/2027'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2.5 border-b border-white/10 bg-[#1E3D4D]/60 flex justify-center shrink-0">
            <div
              className="w-8 h-8 rounded-lg bg-[#335F75] border border-white/15 text-white flex items-center justify-center font-semibold text-xs"
              title={`${currentUser?.name || 'Pengguna'} (${roleText})`}
            >
              {(currentUser?.name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Navigation Links Grouped by Section */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {orderedGroups.map((groupKey) => {
            const groupItems = visibleItems.filter((item) => item.group === groupKey);
            if (groupItems.length === 0) return null;

            return (
              <div key={groupKey} className="space-y-0.5">
                {!isCollapsed && (
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9AB4C1]">
                    {MENU_GROUP_LABELS[groupKey]}
                  </div>
                )}

                {groupItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  const displayLabel =
                    item.id === 'dashboard' && isKesantrianOnlyRole
                      ? 'Dashboard Kesantrian'
                      : item.label;

                  return (
                    <button
                      key={item.id}
                      id={`menu-${item.id}`}
                      title={isCollapsed ? displayLabel : undefined}
                      onClick={() => {
                        setCurrentTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center ${
                        isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5'
                      } py-2 text-[13px] rounded-lg transition cursor-pointer relative ${
                        isActive
                          ? 'bg-[#325E74] text-white font-semibold'
                          : 'text-[#D5E2E8] hover:bg-white/8 hover:text-white font-medium'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-[#8BB3C7]" />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-[#9AB4C1]'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{displayLabel}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom Logout Section */}
        <div className="p-2.5 border-t border-white/10 bg-[#1E3D4D]/40 shrink-0">
          <button
            id="btn-logout"
            title={isCollapsed ? 'Keluar dari AKSARA' : undefined}
            onClick={logout}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            } py-2 text-xs font-medium text-[#E8C5C5] hover:text-white hover:bg-[#C96A6A]/25 rounded-lg transition cursor-pointer`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
