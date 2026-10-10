import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext';
import { useMasterData } from './context/MasterDataContext';
import { LoginView } from './components/LoginView';
import {
  Sidebar,
  NAVIGATION_ITEMS,
  MENU_GROUP_LABELS,
  formatRoleLabel,
} from './components/Sidebar';
import { SchoolLogo } from './components/SchoolLogo';
import { calculateAtkStockStatus } from './types';
import {
  Menu,
  ShieldAlert,
  School,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  CalendarDays,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

// Lazy-load internal administrative modules so the public profile page (/) stays fast and lightweight
const DashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const MudirDashboardView = lazy(() =>
  import('./components/MudirDashboardView').then((m) => ({ default: m.MudirDashboardView }))
);
const StudentsView = lazy(() =>
  import('./components/StudentsView').then((m) => ({ default: m.StudentsView }))
);
const TeachersView = lazy(() =>
  import('./components/TeachersView').then((m) => ({ default: m.TeachersView }))
);
const ClassesView = lazy(() =>
  import('./components/ClassesView').then((m) => ({ default: m.ClassesView }))
);
const ScoresView = lazy(() =>
  import('./components/ScoresView').then((m) => ({ default: m.ScoresView }))
);
const AttendanceView = lazy(() =>
  import('./components/AttendanceView').then((m) => ({ default: m.AttendanceView }))
);
const AcademicYearsView = lazy(() =>
  import('./components/AcademicYearsView').then((m) => ({ default: m.AcademicYearsView }))
);
const SubjectsView = lazy(() =>
  import('./components/SubjectsView').then((m) => ({ default: m.SubjectsView }))
);
const AssignmentsView = lazy(() =>
  import('./components/AssignmentsView').then((m) => ({ default: m.AssignmentsView }))
);
const UsersView = lazy(() =>
  import('./components/UsersView').then((m) => ({ default: m.UsersView }))
);
const AcademicSettingsView = lazy(() =>
  import('./components/AcademicSettingsView').then((m) => ({ default: m.AcademicSettingsView }))
);
const ReportCardsView = lazy(() =>
  import('./components/ReportCardsView').then((m) => ({ default: m.ReportCardsView }))
);
const PrintReportCardView = lazy(() =>
  import('./components/PrintReportCardView').then((m) => ({ default: m.PrintReportCardView }))
);
const MyClassesView = lazy(() =>
  import('./components/MyClassesView').then((m) => ({ default: m.MyClassesView }))
);
const GenericModuleView = lazy(() =>
  import('./components/GenericModuleView').then((m) => ({ default: m.GenericModuleView }))
);
const KesantrianView = lazy(() =>
  import('./components/KesantrianView').then((m) => ({ default: m.KesantrianView }))
);
const AtkView = lazy(() =>
  import('./components/AtkView').then((m) => ({ default: m.AtkView }))
);
const AcademicCalendarView = lazy(() =>
  import('./components/AcademicCalendarView').then((m) => ({ default: m.AcademicCalendarView }))
);
const SpmbBrochuresAdminView = lazy(() =>
  import('./components/SpmbBrochuresAdminView').then((m) => ({ default: m.SpmbBrochuresAdminView }))
);

const PUBLIC_SEO_TITLE = "Pesantren Islam Mutiara Insan | Pendidikan Tahfiz Al-Qur'an";
const PUBLIC_CANONICAL_URL = 'https://mutiarainsantbb.vercel.app/';
const PUBLIC_ROBOTS_CONTENT =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const PRIVATE_ROBOTS_CONTENT = 'noindex, nofollow';

const updateSeoRobotsAndTitle = (isPublicRoot: boolean, pageTitle: string) => {
  if (typeof document === 'undefined') return;
  document.title = pageTitle;

  let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    robotsMeta.id = 'meta-robots-tag';
    document.head.appendChild(robotsMeta);
  }
  robotsMeta.content = isPublicRoot ? PUBLIC_ROBOTS_CONTENT : PRIVATE_ROBOTS_CONTENT;

  // Ensure exactly ONE canonical tag exists on the public page
  const canonicalLinks = document.querySelectorAll('link[rel="canonical"]');
  if (canonicalLinks.length === 0) {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.id = 'canonical-url-tag';
    link.href = PUBLIC_CANONICAL_URL;
    document.head.appendChild(link);
  } else {
    (canonicalLinks[0] as HTMLLinkElement).href = PUBLIC_CANONICAL_URL;
    for (let i = 1; i < canonicalLinks.length; i++) {
      canonicalLinks[i].parentNode?.removeChild(canonicalLinks[i]);
    }
  }
};

// Helper to parse clean tab from URL path
const getInitialTab = (): string => {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (path && NAVIGATION_ITEMS.some((item) => item.id === path)) {
    return path;
  }
  return 'dashboard';
};

export default function App() {
  const { currentUser, role, loading, logout } = useAuth();
  const {
    activeAcademicYear,
    schoolIdentity,
    kesantrianRecords = [],
    mabitPeriods = [],
    atkItems = [],
    atkRequests = [],
    loading: masterLoading = false,
    students = [],
    teachers = [],
    classes = [],
  } = useMasterData();

  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [printTarget, setPrintTarget] = useState<{ studentId?: string; classId?: string }>({});

  // Top bar dropdown states
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isNavigatingViaHistoryRef = useRef<boolean>(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync URL with tab, auth state, and SEO indexing directives
  useEffect(() => {
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];

    if (!currentUser) {
      // If a crawler or user accessed a private path directly while unauthenticated, mark it noindex
      const isRootPath = !rawPath;
      updateSeoRobotsAndTitle(isRootPath, PUBLIC_SEO_TITLE);
      // Allow unauthenticated visitors on both / and /login. If visiting another private route, redirect to /login
      if (!loading && rawPath && rawPath !== 'login') {
        window.history.replaceState({ tab: 'login' }, '', '/login');
        updateSeoRobotsAndTitle(true, PUBLIC_SEO_TITLE);
      }
      return;
    }

    if (loading) return;

    // Do not mutate history if the user is currently traversing history via Back/Forward buttons
    if (isNavigatingViaHistoryRef.current) return;

    let resolvedTab = currentTab;
    if (rawPath === 'login' || !rawPath) {
      const targetTab =
        role === 'ADMIN' || role === 'MUDIR' || role === 'mudir' ? 'dashboard' : currentTab;
      if (targetTab !== currentTab) {
        setCurrentTab(targetTab);
      }
      resolvedTab = targetTab;
      if (window.location.pathname !== `/${targetTab}`) {
        window.history.replaceState({ tab: targetTab }, '', `/${targetTab}`);
      }
    } else {
      const matchingItem = NAVIGATION_ITEMS.find((item) => item.id === rawPath);
      if (matchingItem) {
        if (currentTab !== matchingItem.id) {
          setCurrentTab(matchingItem.id);
        }
        resolvedTab = matchingItem.id;
      } else {
        if (window.location.pathname !== `/${currentTab}`) {
          window.history.replaceState({ tab: currentTab }, '', `/${currentTab}`);
        }
      }
    }

    const activeItem = NAVIGATION_ITEMS.find((item) => item.id === resolvedTab);
    const internalTitle = activeItem
      ? `${activeItem.label} — AKSARA | Pesantren Islam Mutiara Insan`
      : 'Dashboard — AKSARA | Pesantren Islam Mutiara Insan';
    updateSeoRobotsAndTitle(false, internalTitle);
  }, [currentUser, loading, role, currentTab]);

  // Handle browser back and forward button navigation smoothly without full page reload
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      isNavigatingViaHistoryRef.current = true;
      const stateTab = e.state?.tab;
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];

      if (currentUser) {
        if (stateTab && NAVIGATION_ITEMS.some((item) => item.id === stateTab)) {
          setCurrentTab(stateTab);
        } else {
          const matchingItem = NAVIGATION_ITEMS.find((item) => item.id === path);
          if (matchingItem) {
            setCurrentTab(matchingItem.id);
          } else if (!path || path === 'dashboard' || path === 'login') {
            setCurrentTab('dashboard');
          }
        }
      } else {
        // Unauthenticated visitor: Back/Forward navigation maintains public view cleanly
        if (!path || path === 'login') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }

      // Allow DOM to settle before re-enabling automatic replaceState
      setTimeout(() => {
        isNavigatingViaHistoryRef.current = false;
      }, 80);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Update URL on currentTab change
  const handleNavigate = (tab: string) => {
    isNavigatingViaHistoryRef.current = false;
    setCurrentTab(tab);
    setNotifOpen(false);
    setProfileOpen(false);
    const currentClean = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (currentClean !== tab) {
      window.history.pushState({ tab }, '', `/${tab}`);
    }
  };


  // Compute actionable top-bar notifications from real database records
  const notifications = useMemo(() => {
    const list: Array<{
      id: string;
      severity: 'danger' | 'warning' | 'info';
      title: string;
      subtitle: string;
      targetTab: string;
    }> = [];

    const activeKs = kesantrianRecords.filter((r) => !r.isDeleted);
    const activeSick = activeKs.filter(
      (r) =>
        r.type === 'SAKIT' &&
        r.status !== 'Sudah Sembuh' &&
        r.status !== 'Sudah Kembali ke Pesantren' &&
        r.status !== 'Selesai'
    );
    if (activeSick.length > 0) {
      list.push({
        id: 'notif-sakit',
        severity: 'danger',
        title: `${activeSick.length} santri sedang sakit`,
        subtitle: 'Pantau penanganan dan kesembuhan di modul Kesantrian',
        targetTab: 'kesantrian-sakit',
      });
    }

    const sortedMabit = [...mabitPeriods].sort((a, b) =>
      (b.departureDate || '').localeCompare(a.departureDate || '')
    );
    const latestMabit = sortedMabit[0];
    const mabitNotReturned = latestMabit
      ? (latestMabit.participants || []).filter((p) => p.status !== 'Sudah Kembali').length
      : 0;
    if (mabitNotReturned > 0) {
      list.push({
        id: 'notif-mabit',
        severity: 'warning',
        title: `${mabitNotReturned} santri belum kembali dari Mabit`,
        subtitle: latestMabit?.periodName || 'Pemantauan kepulangan Mabit',
        targetTab: 'kesantrian-mabit',
      });
    }

    const activeItems = atkItems.filter((i) => i.isActive !== false);
    const habisCount = activeItems.filter(
      (i) => calculateAtkStockStatus(i.stokSaatIni, i.stokMinimum) === 'Habis'
    ).length;
    const menipisCount = activeItems.filter(
      (i) => calculateAtkStockStatus(i.stokSaatIni, i.stokMinimum) === 'Stok Menipis'
    ).length;
    const pendingReqCount = atkRequests.filter((r) => r.status === 'Menunggu').length;

    if (habisCount > 0) {
      list.push({
        id: 'notif-atk-habis',
        severity: 'danger',
        title: `${habisCount} barang ATK habis`,
        subtitle: 'Segera lakukan pengadaan persediaan kantor',
        targetTab: 'atk-restock',
      });
    }
    if (menipisCount > 0) {
      list.push({
        id: 'notif-atk-menipis',
        severity: 'warning',
        title: `${menipisCount} barang ATK stok menipis`,
        subtitle: 'Stok berada pada atau di bawah batas minimum',
        targetTab: 'atk-items',
      });
    }
    if (pendingReqCount > 0) {
      list.push({
        id: 'notif-atk-req',
        severity: 'info',
        title: `${pendingReqCount} permintaan ATK menunggu`,
        subtitle: 'Menunggu persetujuan Kepala Sekolah / Admin',
        targetTab: 'atk-requests',
      });
    }

    return list;
  }, [kesantrianRecords, mabitPeriods, atkItems, atkRequests]);

  // If user is not logged in, render public profile / Login screen immediately so Googlebot & visitors never hit a loading gate
  if (!currentUser || !role) {
    return <LoginView />;
  }

  // If loading session for an authenticated user
  const isInitialLoading =
    loading ||
    (masterLoading && students.length === 0 && teachers.length === 0 && classes.length === 0);
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <SchoolLogo
            logoUrl={schoolIdentity?.logoUrl}
            schoolName={schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'}
            size="md"
            variant="navy"
            className="animate-pulse"
          />
          <p className="text-xs font-medium text-[#71818A]">Memuat AKSARA...</p>
        </div>
      </div>
    );
  }

  // Enforce RBAC on current tab
  const activeNavItem = NAVIGATION_ITEMS.find((item) => item.id === currentTab);
  const isAuthorized = activeNavItem ? activeNavItem.allowedRoles.includes(role) : true;
  const roleLabel = formatRoleLabel(role, currentUser?.kesantrianRole);
  const activeGroupLabel = activeNavItem ? MENU_GROUP_LABELS[activeNavItem.group] : 'MENU UTAMA';

  // Render view corresponding to currentTab
  const renderContent = () => {
    if (!isAuthorized) {
      return (
        <div className="bg-white rounded-xl border border-[#DCE5E8] p-8 text-center max-w-lg mx-auto my-12">
          <div className="w-11 h-11 rounded-xl bg-[#FBF1F1] text-[#C96A6A] flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-[#24343D]">Akses Ditolak</h3>
          <p className="text-xs text-[#71818A] mt-2 leading-relaxed">
            Anda tidak memiliki izin untuk membuka halaman ini. Sistem otorisasi RBAC AKSARA membatasi hak akses berdasarkan peran akun Anda (<strong>{roleLabel}</strong>).
          </p>
          <button
            onClick={() => handleNavigate('dashboard')}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] rounded-lg transition cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return role === 'MUDIR' || role === 'mudir' ? (
          <MudirDashboardView onNavigate={handleNavigate} />
        ) : role === 'PETUGAS_KESANTRIAN' ||
          role === 'KEPALA_KESANTRIAN' ||
          role === 'MUSYRIF_KESANTRIAN' ||
          role === 'kepala_kesantrian' ||
          role === 'musyrif_kesantrian' ? (
          <KesantrianView tab="dashboard" onNavigate={handleNavigate} />
        ) : (
          <DashboardView onNavigate={handleNavigate} />
        );
      case 'kesantrian-dashboard':
      case 'kesantrian-pelanggaran':
      case 'kesantrian-sakit':
      case 'kesantrian-izin':
      case 'kesantrian-mabit':
      case 'kesantrian-obat':
      case 'kesantrian-laporan':
        return <KesantrianView tab={currentTab} onNavigate={handleNavigate} />;
      case 'atk-dashboard':
      case 'atk-items':
      case 'atk-incoming':
      case 'atk-outgoing':
      case 'atk-requests':
      case 'atk-restock':
      case 'atk-history':
      case 'atk-reports':
        return <AtkView tab={currentTab} onNavigate={handleNavigate} />;
      case 'academic-calendar':
        return <AcademicCalendarView userRole={role} />;
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
      case 'spmb-brochures':
        return <SpmbBrochuresAdminView userRole={role} />;
      case 'report-cards':
        return (
          <ReportCardsView
            userRole={role}
            onNavigateToPrint={(studentId, classId) => {
              setPrintTarget({ studentId, classId });
              handleNavigate('print-report');
            }}
          />
        );
      case 'print-report':
        return (
          <PrintReportCardView
            userRole={role}
            initialStudentId={printTarget.studentId}
            initialClassId={printTarget.classId}
            onBack={() => handleNavigate('report-cards')}
          />
        );
      case 'my-classes':
        return <MyClassesView />;
      default:
        return <GenericModuleView tab={currentTab} />;
    }
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#F4F7F8] text-[#24343D] print:min-h-0 print:max-w-none print:bg-white print:overflow-visible">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`min-h-screen flex flex-col min-w-0 w-full max-w-full overflow-x-hidden transition-all duration-200 box-border print:min-h-0 print:pl-0 print:overflow-visible ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Top Bar — Clean Professional Header (Section 4 & 13) */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#DCE5E8] h-14 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full box-border">
          {/* Left: Hamburger / Collapse Toggle & Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-[#71818A] hover:text-[#24343D] hover:bg-[#F4F7F8] lg:hidden cursor-pointer shrink-0"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden lg:inline-flex p-1.5 rounded-lg text-[#71818A] hover:text-[#24343D] hover:bg-[#F4F7F8] cursor-pointer shrink-0"
              title={sidebarCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            <SchoolLogo
              logoUrl={schoolIdentity?.logoUrl}
              schoolName={schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'}
              size="sm"
              variant="light"
              className="hidden sm:inline-flex"
            />

            <div className="min-w-0 flex-1 overflow-hidden">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-[#71818A] min-w-0 overflow-hidden">
                <span className="font-semibold text-[#24485A] shrink-0">AKSARA</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#95A5AD] shrink-0" />
                <span className="hidden sm:inline text-[#71818A] shrink-0">{activeGroupLabel}</span>
                <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-[#95A5AD] shrink-0" />
                <span className="font-semibold text-[#24343D] truncate min-w-0">
                  {activeNavItem?.label || 'Dashboard'}
                </span>
              </div>
              <div className="text-[11px] text-[#71818A] hidden md:block truncate">
                {schoolIdentity?.schoolName || 'Pesantren Islam Mutiara Insan'} &mdash; Sistem Informasi Manajemen Akademik &amp; Administrasi
              </div>
            </div>
          </div>

          {/* Right: Notifications, User Name, Role, Avatar, Profile Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setProfileOpen(false);
                }}
                className="relative p-2 rounded-lg text-[#71818A] hover:text-[#24343D] hover:bg-[#F4F7F8] transition cursor-pointer"
                title="Notifikasi Sistem"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#C96A6A] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-14 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white rounded-xl border border-[#DCE5E8] shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#DCE5E8] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#24343D]">Notifikasi &amp; Perhatian</span>
                    <span className="text-[11px] font-mono text-[#71818A]">
                      {notifications.length} aktif
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#EBF0F2]">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-[#71818A]">
                        Tidak ada peringatan mendesak saat ini.
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const dotColor =
                          item.severity === 'danger'
                            ? 'bg-[#C96A6A]'
                            : item.severity === 'warning'
                            ? 'bg-[#D6A64A]'
                            : 'bg-[#6C91A8]';
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.targetTab)}
                            className="w-full text-left px-4 py-2.5 hover:bg-[#F4F7F8] transition flex items-start gap-2.5 cursor-pointer"
                          >
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-[#24343D] truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-[#71818A] truncate mt-0.5">
                                {item.subtitle}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-[1px] bg-[#DCE5E8] hidden sm:block" />

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-[#F4F7F8] transition cursor-pointer"
              >
                <div className="hidden sm:flex flex-col text-right items-end">
                  <span className="text-xs font-semibold text-[#24343D] leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-[#71818A] leading-tight mt-0.5">
                    {roleLabel}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#24485A] text-white flex items-center justify-center font-semibold text-xs">
                  {(currentUser.name || 'U').charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#71818A] hidden sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#DCE5E8] shadow-lg py-2 z-50 text-xs">
                  <div className="px-4 py-2.5 border-b border-[#DCE5E8]">
                    <div className="font-bold text-[#24343D] truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-[#71818A] truncate mt-0.5">
                      {currentUser.email || `@${currentUser.username || currentUser.id}`}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F0F5F7] text-[#24485A] border border-[#DCE5E8] text-[10px] font-semibold">
                      <span>{roleLabel}</span>
                      <span>&bull;</span>
                      <span className="font-mono">
                        TA {activeAcademicYear?.name || '2026/2027'}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => handleNavigate('academic-calendar')}
                      className="w-full text-left px-4 py-2 text-[#24343D] hover:bg-[#F4F7F8] flex items-center gap-2 cursor-pointer"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-[#5D8295]" />
                      <span>Kalender Akademik</span>
                    </button>
                    {(role === 'ADMIN' || role === 'MUDIR' || role === 'mudir' || role === 'KEPALA_SEKOLAH') && (
                      <button
                        onClick={() => handleNavigate('settings')}
                        className="w-full text-left px-4 py-2 text-[#24343D] hover:bg-[#F4F7F8] flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#5D8295]" />
                        <span>Identitas Sekolah</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-[#DCE5E8] pt-1 mt-1">
                    <button
                      onClick={() => {
                        window.history.replaceState(null, '', '/');
                        updateSeoRobotsAndTitle(true, PUBLIC_SEO_TITLE);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-[#C96A6A] hover:bg-[#FBF1F1] font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar dari AKSARA</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full min-w-0 mx-auto box-border print:p-0 print:m-0 print:max-w-none print:overflow-visible">
          <Suspense
            fallback={
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#24485A] text-white flex items-center justify-center animate-pulse">
                  <School className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium text-[#71818A]">Memuat modul...</p>
              </div>
            }
          >
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
