import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { TeachersView } from './components/TeachersView';
import { ClassesView } from './components/ClassesView';
import { ScoresView } from './components/ScoresView';
import { AttendanceView } from './components/AttendanceView';
import { AcademicYearsView } from './components/AcademicYearsView';
import { SubjectsView } from './components/SubjectsView';
import { AssignmentsView } from './components/AssignmentsView';
import { UsersView } from './components/UsersView';
import { AcademicSettingsView } from './components/AcademicSettingsView';
import { ReportCardsView } from './components/ReportCardsView';
import { MyClassesView } from './components/MyClassesView';
import { GenericModuleView } from './components/GenericModuleView';
import { Menu, ShieldAlert, School, Shield, GraduationCap, UserCheck } from 'lucide-react';
import { NAVIGATION_ITEMS } from './components/Sidebar';

export default function App() {
  const { currentUser, role, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Sync URL with tab and auth state
  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      window.history.replaceState(null, '', '/login');
      return;
    }

    // If logged in and at /login, change to /dashboard
    const path = window.location.pathname.replace(/^\/+/, '');
    if (path === 'login' || !path) {
      window.history.replaceState(null, '', `/${currentTab}`);
    } else {
      // Check if URL matches a valid nav item
      const matchingItem = NAVIGATION_ITEMS.find((item) => item.id === path);
      if (matchingItem) {
        setCurrentTab(matchingItem.id);
      } else {
        window.history.replaceState(null, '', `/${currentTab}`);
      }
    }
  }, [currentUser, loading]);

  // Update URL on currentTab change
  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    window.history.replaceState(null, '', `/${tab}`);
  };

  // If loading session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse shadow-md">
            <School className="w-6 h-6" />
          </div>
          <p className="text-xs font-medium text-slate-500">Memuat KantoJA...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, render Login screen
  if (!currentUser || !role) {
    return <LoginView />;
  }

  // Enforce RBAC on current tab
  const activeNavItem = NAVIGATION_ITEMS.find((item) => item.id === currentTab);
  const isAuthorized = activeNavItem ? activeNavItem.allowedRoles.includes(role) : true;

  // Render view corresponding to currentTab
  const renderContent = () => {
    // If not authorized for this specific tab, show Access Denied screen
    if (!isAuthorized) {
      return (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Akses Ditolak</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Anda tidak memiliki izin untuk membuka halaman ini. Sistem otorisasi RBAC KantoJA membatasi hak akses berdasarkan peran akun Anda (<strong>{role}</strong>).
          </p>
          <button
            onClick={() => handleNavigate('dashboard')}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'students':
        return <StudentsView userRole={role} />;
      case 'teachers':
        return <TeachersView userRole={role} />;
      case 'classes':
        return <ClassesView userRole={role} />;
      case 'scores':
        return <ScoresView />;
      case 'attendance':
        return <AttendanceView />;
      case 'academic-years':
        return <AcademicYearsView userRole={role} />;
      case 'subjects':
        return <SubjectsView userRole={role} />;
      case 'assignments':
        return <AssignmentsView userRole={role} />;
      case 'users':
        return <UsersView userRole={role} />;
      case 'academic-settings':
        return <AcademicSettingsView userRole={role} />;
      case 'report-cards':
        return <ReportCardsView userRole={role} />;
      case 'my-classes':
        return <MyClassesView />;
      default:
        return <GenericModuleView tab={currentTab} />;
    }
  };

  const getHeaderRoleBadge = () => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" />
            ADMIN
          </span>
        );
      case 'KEPALA_SEKOLAH':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <GraduationCap className="w-2.5 h-2.5" />
            KEPALA SEKOLAH
          </span>
        );
      case 'WALI_KELAS':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
            <UserCheck className="w-2.5 h-2.5" />
            WALI KELAS
          </span>
        );
      case 'GURU_MAPEL':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
            <GraduationCap className="w-2.5 h-2.5" />
            GURU MAPEL
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                KantoJA &bull; {activeNavItem?.label || 'Sistem Informasi Sekolah'}
              </span>
              <span className="text-sm font-bold text-slate-900 hidden sm:inline">
                Sistem Informasi Manajemen Sekolah
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                {getHeaderRoleBadge()}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                @{currentUser.username || currentUser.id} &bull; {currentUser.email}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {(currentUser.name || 'U').charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
