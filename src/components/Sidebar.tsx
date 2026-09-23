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
  School
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}

export const NAVIGATION_ITEMS: MenuItem[] = [
  // Dashboard for all
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'],
  },
  // Data Siswa
  {
    id: 'students',
    label: 'Data Siswa',
    icon: GraduationCap,
    allowedRoles: ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS'],
  },
  // Data Guru
  {
    id: 'teachers',
    label: 'Data Guru',
    icon: Users,
    allowedRoles: ['ADMIN', 'KEPALA_SEKOLAH'],
  },
  // Kelas & Wali (Admin) or Kelas (Kepala Sekolah)
  {
    id: 'classes',
    label: 'Kelas & Wali',
    icon: DoorOpen,
    allowedRoles: ['ADMIN', 'KEPALA_SEKOLAH'],
  },
  // Mata Pelajaran
  {
    id: 'subjects',
    label: 'Mata Pelajaran',
    icon: BookOpen,
    allowedRoles: ['ADMIN'],
  },
  // Penugasan Guru
  {
    id: 'assignments',
    label: 'Penugasan Guru',
    icon: ClipboardList,
    allowedRoles: ['ADMIN'],
  },
  // Kelas & Mapel Saya (Khusus Guru Mapel)
  {
    id: 'my-classes',
    label: 'Kelas & Mapel Saya',
    icon: BookOpen,
    allowedRoles: ['GURU_MAPEL'],
  },
  // Nilai Siswa
  {
    id: 'scores',
    label: 'Nilai Siswa',
    icon: FileSpreadsheet,
    allowedRoles: ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'],
  },
  // Absensi
  {
    id: 'attendance',
    label: 'Absensi',
    icon: CalendarCheck,
    allowedRoles: ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS', 'GURU_MAPEL'],
  },
  // Rapor
  {
    id: 'report-cards',
    label: 'Rapor',
    icon: Award,
    allowedRoles: ['ADMIN', 'KEPALA_SEKOLAH', 'WALI_KELAS'],
  },
  // Pengaturan Akademik (Kepala Sekolah & Admin)
  {
    id: 'academic-settings',
    label: 'Pengaturan Akademik',
    icon: SlidersHorizontal,
    allowedRoles: ['KEPALA_SEKOLAH', 'ADMIN'],
  },
  // Tahun Ajaran
  {
    id: 'academic-years',
    label: 'Tahun Ajaran',
    icon: CalendarDays,
    allowedRoles: ['ADMIN'],
  },
  // Pengguna
  {
    id: 'users',
    label: 'Pengguna',
    icon: UserCog,
    allowedRoles: ['ADMIN'],
  },
  // Pengaturan
  {
    id: 'settings',
    label: 'Pengaturan',
    icon: Settings,
    allowedRoles: ['ADMIN'],
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

  // Filter navigation items strictly based on RBAC
  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.allowedRoles.includes(role)
  );

  const roleBadge = {
    ADMIN: { text: 'Admin', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    KEPALA_SEKOLAH: { text: 'Kepala Sekolah', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    WALI_KELAS: { text: 'Wali Kelas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    GURU_MAPEL: { text: 'Guru Mapel', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  }[role];

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
                KantoJA
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
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`menu-${item.id}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${
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
                <span className="truncate">{item.label}</span>
              </button>
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
            Keluar dari KantoJA
          </button>
        </div>
      </aside>
    </>
  );
};
