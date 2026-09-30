import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import { DEFAULT_PESANTREN_FACILITIES } from '../lib/dbService';
import { SchoolLogo } from './SchoolLogo';
import {
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  GraduationCap,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Phone,
  Mail,
  Globe,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Info,
  KeyRound
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import heroPesantrenImg from '../assets/images/hero_pesantren_mutiara_1790506485327.jpg';
import tahfizQuranImg from '../assets/images/tahfiz_quran_mushaf_1790506498260.jpg';
import studySanctuaryImg from '../assets/images/pesantren_study_sanctuary_1790506511129.jpg';

const TAHFIZ_PILLARS = [
  {
    step: '01',
    title: 'Tahsin',
    description: 'Memperbaiki bacaan Al-Qur’an dan membangun dasar membaca yang benar.',
  },
  {
    step: '02',
    title: 'Ziyadah',
    description: 'Menambah hafalan baru secara bertahap dan terukur.',
  },
  {
    step: '03',
    title: 'Murajaah',
    description: 'Menjaga hafalan agar tetap kuat dan tidak mudah terlupakan.',
  },
  {
    step: '04',
    title: 'Tasmi’',
    description: 'Evaluasi hafalan untuk mengukur kelancaran dan ketepatan hafalan santri.',
  },
  {
    step: '05',
    title: 'Mutabaah Hafalan',
    description: 'Pemantauan perkembangan hafalan santri secara berkala.',
  },
];

const HOLISTIC_APPROACHES = [
  {
    index: '01',
    title: 'Al-Qur’an dan Tahfiz',
    description:
      'Pendampingan interaksi harian bersama Al-Qur’an agar santri tidak sekadar menghafal ayat, tetapi mencintai dan menjaganya sepanjang hayat.',
  },
  {
    index: '02',
    title: 'Tahsin dan Tilawah',
    description:
      'Pembinaan makharijul huruf, sifatul huruf, dan hukum tajwid secara tertib sehingga bacaan santri terjaga sesuai kaidah.',
  },
  {
    index: '03',
    title: 'Akhlak dan Adab',
    description:
      'Penanaman adab kepada Allah, Rasul-Nya, orang tua, guru, dan sesama santri dalam setiap aktivitas di dalam maupun luar kelas.',
  },
  {
    index: '04',
    title: 'Pendidikan Keislaman',
    description:
      'Penguatan dasar-dasar aqidah, ibadah praktis, fiqih keseharian, dan sirah sebagai bekal pengamalan agama yang lurus.',
  },
  {
    index: '05',
    title: 'Pendidikan Akademik',
    description:
      'Pembelajaran kurikulum akademik yang terstruktur untuk membekali santri dengan wawasan ilmu pengetahuan umum dan kemampuan berpikir kritis.',
  },
  {
    index: '06',
    title: 'Kemandirian dan Kedisiplinan',
    description:
      'Pembiasaan hidup teratur, pengelolaan waktu, kebersihan diri dan lingkungan, serta tanggung jawab pribadi di asrama.',
  },
];

const SANTRI_LIFE_ASPECTS = [
  {
    title: 'Pembinaan kedisiplinan',
    detail: 'Penataan waktu ibadah, belajar, istirahat, dan kegiatan harian secara tertib dan terukur.',
  },
  {
    title: 'Pendampingan musyrif',
    detail: 'Bimbingan langsung oleh musyrif asrama dalam keseharian, ibadah, dan pembiasaan adab santri.',
  },
  {
    title: 'Pemantauan kesehatan',
    detail: 'Perhatian terhadap kondisi kesehatan santri, istirahat, serta penanganan dan pencatatan keluhan sakit.',
  },
  {
    title: 'Perizinan santri',
    detail: 'Pengelolaan izin keluar atau pulang santri yang tertib, tercatat, dan terkoordinasi dengan wali santri.',
  },
  {
    title: 'Kegiatan Mabit',
    detail: 'Pembinaan ruhiyah malam hari untuk memperkuat ibadah, muhasabah, dan kebersamaan santri.',
  },
  {
    title: 'Pembinaan pelanggaran',
    detail: 'Pendekatan edukatif dan pembinaan bertahap bagi santri agar menyadari kesalahan dan memperbaiki sikap.',
  },
  {
    title: 'Pendampingan keseharian',
    detail: 'Pengawasan kebersihan kamar, kerapian berpakaian, serta interaksi sosial yang sehat antar-santri.',
  },
  {
    title: 'Komunikasi dengan wali santri',
    detail: 'Sinergi informasi perkembangan akademik, tahfiz, dan kesantrian secara berkala bersama orang tua/wali.',
  },
];

const INTEGRATED_EDUCATION_ITEMS = [
  {
    number: '01',
    title: "Tahfiz Al-Qur'an",
    description:
      "Program inti pendidikan tahfiz untuk penghafalan dan penjagaan Al-Qur'an melalui halaqah rutin pagi dan petang dengan bimbingan pengampu tahfiz.",
  },
  {
    number: '02',
    title: 'Pendidikan Diniyah',
    description:
      'Pendalaman ilmu-ilmu dasar keislaman meliputi aqidah, akhlak, fiqih ibadah, hadits, serta bahasa Arab sebagai fondasi pemahaman agama.',
  },
  {
    number: '03',
    title: 'Pembinaan Akhlak',
    description:
      'Keteladanan dan pembiasaan adab islami dalam bertutur kata, bersikap hormat kepada guru, serta berinteraksi dengan sesama santri.',
  },
  {
    number: '04',
    title: 'Pendidikan Akademik',
    description:
      'Penyelenggaraan pembelajaran mata pelajaran umum secara sistematis guna menunjang kompetensi keilmuan dan kelanjutan studi santri.',
  },
  {
    number: '05',
    title: 'Kegiatan Kepesantrenan',
    description:
      'Rangkaian aktivitas asrama, ibadah berjamaah, latihan kemandirian santri, dan kegiatan kebersamaan yang membentuk karakter.',
  },
];

const PESANTREN_VALUES = [
  {
    name: 'Al-Qur’an',
    meaning: 'Menjadikan Al-Qur’an sebagai pedoman hidup, bacaan harian, hafalan yang dijaga, dan akhlak dalam keseharian.',
  },
  {
    name: 'Akhlak',
    meaning: 'Mengutamakan adab, kesantunan, dan kemuliaan budi pekerti sebelum dan bersama ilmu pengetahuan.',
  },
  {
    name: 'Ilmu',
    meaning: 'Menuntut ilmu syar’i dan ilmu pengetahuan secara sungguh-sungguh, terarah, dan berkesinambungan.',
  },
  {
    name: 'Disiplin',
    meaning: 'Menghargai waktu, menaati tata tertib, serta istiqamah dalam menjalankan jadwal ibadah dan belajar.',
  },
  {
    name: 'Tanggung Jawab',
    meaning: 'Menunaikan amanah sebagai penuntut ilmu dengan penuh kesadaran terhadap diri, keluarga, dan masyarakat.',
  },
  {
    name: 'Kemandirian',
    meaning: 'Terbiasa mengurus kebutuhan diri secara rapi, tangguh menghadapi tantangan, dan tidak bergantung secara berlebihan.',
  },
];

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, error, errorCode, setError } = useAuth();
  const { schoolIdentity } = useMasterData();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Dropdown & UI states
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showForgotPasswordInfo, setShowForgotPasswordInfo] = useState(false);
  const [ppdbModalOpen, setPpdbModalOpen] = useState(false);

  // Image fallback states (Zero-Broken-Image Policy)
  const [heroImgError, setHeroImgError] = useState(false);
  const [tahfizImgError, setTahfizImgError] = useState(false);
  const [studyImgError, setStudyImgError] = useState(false);

  const loginContainerRef = useRef<HTMLDivElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Automatically open login dropdown if there is an auth error
  useEffect(() => {
    if (error) {
      setLoginDropdownOpen(true);
    }
  }, [error]);

  // Focus username input when dropdown opens
  useEffect(() => {
    if (loginDropdownOpen) {
      const timer = setTimeout(() => {
        identifierInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [loginDropdownOpen]);

  // Close login dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        loginDropdownOpen &&
        loginContainerRef.current &&
        !loginContainerRef.current.contains(e.target as Node)
      ) {
        setLoginDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [loginDropdownOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Harap masukkan Username / Email dan Password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch {
      setError('Terjadi kesalahan saat masuk ke AKSARA. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    try {
      await loginWithGoogle();
    } catch {
      setError('Gagal masuk menggunakan akun Google.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openLoginFromAnywhere = () => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoginDropdownOpen(true);
  };

  const isOperationNotAllowed =
    errorCode === 'auth/operation-not-allowed' ||
    (error && error.includes('Metode login Email/Password belum diaktifkan'));

  const availableFacilities = (
    Array.isArray(schoolIdentity?.facilities) && schoolIdentity.facilities.length > 0
      ? schoolIdentity.facilities
      : DEFAULT_PESANTREN_FACILITIES
  ).filter((item) => item.isAvailable !== false);

  const rawSchoolName = schoolIdentity?.schoolName?.trim() || '';
  const pesantrenName =
    !rawSchoolName || rawSchoolName.toLowerCase() === 'pesantren islam mutiara insan'
      ? 'Pesantren Islam Mutiara Insan'
      : rawSchoolName;
  const pesantrenLogoUrl = schoolIdentity?.logoUrl?.trim() || '';
  const pesantrenAddress =
    schoolIdentity?.address ||
    'Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung';
  const pesantrenWhatsapp = schoolIdentity?.whatsapp?.trim() || '';
  const pesantrenEmail = schoolIdentity?.email?.trim() || '';
  const pesantrenSocial = schoolIdentity?.socialMedia?.trim() || '';
  const pesantrenPpdbInfo =
    schoolIdentity?.ppdbInfo?.trim() ||
    'Informasi penerimaan santri baru, persyaratan, tahapan pendaftaran, dan informasi pendidikan dapat diperoleh melalui kanal resmi Pesantren Islam Mutiara Insan.';

  const navLinks = [
    { label: 'Beranda', target: 'beranda' },
    { label: 'Profil', target: 'profil' },
    { label: 'Program Tahfiz', target: 'program-tahfiz' },
    { label: 'Pendidikan', target: 'pendidikan' },
    { label: 'Fasilitas', target: 'fasilitas' },
    { label: 'Penerimaan Santri', target: 'penerimaan-santri' },
    { label: 'Kontak', target: 'kontak' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col selection:bg-emerald-900 selection:text-white">
      {/* =====================================================================
          1. HEADER / NAVBAR
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Kiri: Logo & Nama Pesantren */}
          <a
            href="#beranda"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('beranda');
            }}
            className="flex items-center gap-3 min-w-0 group focus:outline-none"
          >
            <SchoolLogo
              logoUrl={pesantrenLogoUrl}
              schoolName={pesantrenName}
              size="md"
              variant="emerald"
              fallbackIcon="book"
            />
            <span className="font-bold text-xs sm:text-sm md:text-base tracking-tight text-emerald-950 uppercase truncate">
              {pesantrenName}
            </span>
          </a>

          {/* Tengah/Kanan: Desktop Navigation Links */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden xl:flex items-center gap-6 text-sm font-medium text-stone-600"
          >
            {navLinks.map((item) => (
              <button
                key={item.target}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className="hover:text-emerald-900 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 border-transparent hover:border-emerald-800"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Paling Kanan: Tombol Masuk AKSARA (Dropdown) + Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={loginContainerRef}>
            <div className="relative">
              <button
                id="btn-toggle-login-aksara"
                type="button"
                onClick={() => {
                  setLoginDropdownOpen((prev) => !prev);
                  setMobileMenuOpen(false);
                }}
                aria-expanded={loginDropdownOpen}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-900 hover:bg-emerald-950 active:bg-emerald-950 transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2"
              >
                <span>Masuk AKSARA</span>
                <ChevronDown
                  className={`w-4 h-4 text-amber-300 transition-transform duration-150 ${
                    loginDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* ===============================================================
                  13. LOGIN DROPDOWN PANEL
                 =============================================================== */}
              {loginDropdownOpen && (
                <div
                  id="aksara-login-dropdown"
                  className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-18 sm:top-full sm:mt-2.5 w-auto sm:w-96 bg-white rounded-2xl border border-stone-200 shadow-2xl p-5 sm:p-6 z-50 text-left max-h-[85vh] overflow-y-auto"
                >
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-stone-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SchoolLogo
                        logoUrl={pesantrenLogoUrl}
                        schoolName={pesantrenName}
                        size="sm"
                        variant="light"
                      />
                      <div className="min-w-0">
                        <div className="text-base font-bold text-stone-900">Masuk ke AKSARA</div>
                        <p className="text-xs text-stone-500 mt-0.5 truncate">
                          {pesantrenName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoginDropdownOpen(false)}
                      aria-label="Tutup panel login"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Error / Operation Not Allowed Alert */}
                  {isOperationNotAllowed ? (
                    <div
                      id="login-provider-alert"
                      className="mt-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl space-y-2"
                    >
                      <div className="flex items-start gap-2 font-semibold text-amber-800">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                          Metode login Email/Password belum diaktifkan pada Firebase Authentication.
                        </span>
                      </div>
                      <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200 text-stone-700 space-y-1 text-[11px] leading-relaxed">
                        <p>
                          Project ID:{' '}
                          <code className="font-mono font-bold text-amber-900">
                            {firebaseConfig.projectId}
                          </code>
                        </p>
                        <a
                          href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
                        >
                          Buka Firebase Console
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    error && (
                      <div
                        id="login-error-alert"
                        className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <span className="leading-relaxed">{error}</span>
                      </div>
                    )
                  )}

                  {/* Form Login Utama */}
                  <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                    <div>
                      <label
                        htmlFor="identifier"
                        className="block text-xs font-semibold text-stone-700 mb-1.5"
                      >
                        Username / Email
                      </label>
                      <input
                        ref={identifierInputRef}
                        id="identifier"
                        type="text"
                        required
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Masukkan username atau email"
                        disabled={isSubmitting || isGoogleSubmitting}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent text-xs transition disabled:bg-stone-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold text-stone-700 mb-1.5"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Masukkan password akun"
                          disabled={isSubmitting || isGoogleSubmitting}
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent text-xs transition disabled:bg-stone-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition focus:outline-none cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      id="btn-login-submit"
                      type="submit"
                      disabled={isSubmitting || isGoogleSubmitting}
                      className="w-full inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-800 disabled:opacity-60 transition shadow-xs cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Memverifikasi akun...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Masuk</span>
                        </>
                      )}
                    </button>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordInfo((prev) => !prev)}
                        className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer"
                      >
                        Lupa Password?
                      </button>
                    </div>
                  </form>

                  {/* Info Lupa Password */}
                  {showForgotPasswordInfo && (
                    <div className="mt-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1.5">
                      <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Pemulihan Password Akun AKSARA</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Demi keamanan data akademik dan kesantrian, pengaturan ulang password dilakukan melalui <strong>Administrator AKSARA</strong> atau bagian Tata Usaha Pesantren Islam Mutiara Insan.
                      </p>
                    </div>
                  )}

                  {/* Divider Google Sign-In */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-stone-200" />
                    </div>
                    <div className="relative flex justify-center text-[11px]">
                      <span className="px-2.5 bg-white text-stone-400 font-medium">
                        atau
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="w-full inline-flex justify-center items-center gap-2.5 py-2 px-4 rounded-xl text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 transition cursor-pointer disabled:opacity-60"
                  >
                    {isGoogleSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-800" />
                        <span>Menghubungkan ke Google...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>Akun Google Terdaftar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Menu Button (Mobile & Tablet) */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen((prev) => !prev);
                setLoginDropdownOpen(false);
              }}
              aria-label="Menu Navigasi"
              className="xl:hidden p-2 rounded-xl text-stone-700 hover:text-emerald-950 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white border-b border-stone-200 px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navLinks.map((item) => (
              <button
                key={item.target}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:text-emerald-950 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* =====================================================================
          2. HERO SECTION (#beranda)
         ===================================================================== */}
      <section
        id="beranda"
        className="relative overflow-hidden bg-emerald-950 text-white border-b border-emerald-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Editorial Text & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-300/90 font-medium tracking-wide">
                <span>Lembaga Pendidikan Islam &amp; Tahfiz Al-Qur’an</span>
                <span aria-hidden="true">&middot;</span>
                <span>{schoolIdentity?.city || 'Tulang Bawang Barat'}</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] text-balance">
                Pesantren Islam Mutiara Insan
              </h1>

              <p className="font-display text-xl sm:text-2xl text-amber-200 font-medium leading-snug text-balance">
                “Menumbuhkan Generasi Qur’ani yang Hafizh, Berilmu, Berakhlak, dan Mandiri.”
              </p>

              <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                Pesantren Islam Mutiara Insan merupakan lembaga pendidikan dan pesantren tahfiz Al-Qur’an yang berfokus pada pendidikan tahfiz Al-Qur’an, pendidikan diniyah, pembinaan akhlak, ilmu, dan kemandirian santri.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => scrollToSection('profil')}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-amber-400 text-emerald-950 hover:bg-amber-300 transition-colors shadow-sm inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Kenali Pesantren</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('penerimaan-santri')}
                  className="px-6 py-3 rounded-xl text-sm font-semibold text-white border border-emerald-700 hover:bg-emerald-900/80 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Informasi Penerimaan Santri
                </button>
              </div>
            </div>

            {/* Right Column: Dignified Architectural Visual */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-emerald-800/80 bg-emerald-900 aspect-16/10 sm:aspect-16/9 lg:aspect-4/3 shadow-xl">
                {!heroImgError ? (
                  <img
                    src={heroPesantrenImg}
                    alt="Lingkungan Pesantren Islam Mutiara Insan"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-emerald-900 via-emerald-950 to-stone-900">
                    <BookOpen className="w-12 h-12 text-amber-300/80 mb-3" />
                    <span className="font-display text-xl text-white font-semibold">
                      Pesantren Islam Mutiara Insan
                    </span>
                    <span className="text-xs text-emerald-200/80 mt-1">
                      Pendidikan Tahfiz Al-Qur’an, Diniyah, dan Akademik
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-xs text-emerald-100/90 flex items-center justify-between">
                  <span>Lingkungan Pembinaan Al-Qur’an &amp; Karakter</span>
                  <span className="font-arabic text-base text-amber-300">
                    خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. PROFIL PESANTREN (#profil)
         ===================================================================== */}
      <section id="profil" className="py-16 sm:py-24 border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
                Tentang Lembaga &middot; {pesantrenName}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
                Profil Pesantren
              </h2>
              <div className="w-16 h-0.5 bg-amber-500" />
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed pt-2">
                Menyelenggarakan pendidikan Islam terpadu yang memadukan Tahfiz Al-Qur’an, pendidikan diniyah, dan pembinaan santri secara berkesinambungan.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-5 text-base text-stone-700 leading-relaxed max-w-2xl">
              <p>
                Pesantren Islam Mutiara Insan hadir sebagai lembaga pendidikan yang berkomitmen mendampingi santri dalam proses menghafal, memahami, dan mengamalkan Al-Qur’an.
              </p>
              <p>
                Pembinaan tidak hanya diarahkan pada pencapaian jumlah hafalan, tetapi juga pada kualitas bacaan, kedisiplinan murajaah, adab, ibadah, tanggung jawab, dan pembentukan karakter.
              </p>
              <p>
                Dengan lingkungan pendidikan yang terarah dan pendampingan yang berkesinambungan, santri dibimbing agar tumbuh menjadi pribadi yang dekat dengan Al-Qur’an, memiliki akhlak yang baik, berilmu, serta mampu menjalankan tanggung jawabnya di tengah masyarakat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. PROGRAM UNGGULAN TAHFIZ AL-QUR’AN (#program-tahfiz)
         ===================================================================== */}
      <section
        id="program-tahfiz"
        className="py-16 sm:py-24 bg-emerald-950 text-white border-b border-emerald-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                Fokus Utama Pembinaan
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
                Program Tahfiz Al-Qur'an
              </h2>
              <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                Program Tahfiz Al-Qur'an menjadi salah satu fokus utama pembinaan santri di Pesantren Islam Mutiara Insan. Proses hafalan dilakukan secara bertahap dan terarah dengan memperhatikan kualitas bacaan, ziyadah, murajaah, dan ketuntasan hafalan.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-emerald-800 bg-emerald-900 aspect-4/3">
                {!tahfizImgError ? (
                  <img
                    src={tahfizQuranImg}
                    alt="Program Tahfiz Al-Qur’an Pesantren Islam Mutiara Insan"
                    referrerPolicy="no-referrer"
                    onError={() => setTahfizImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-emerald-900">
                    <BookOpen className="w-10 h-10 text-amber-300 mb-2" />
                    <span className="font-display text-lg text-white">Halaqah Tahfiz Al-Qur’an</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5 Kartu Tahapan Program Tahfiz */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {TAHFIZ_PILLARS.map((item) => (
              <div
                key={item.step}
                className="bg-emerald-900/60 border border-emerald-800/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-amber-400/60 transition-colors"
              >
                <div className="space-y-3">
                  <div className="text-xs font-mono text-amber-300 font-semibold">
                    {item.step}.
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. PENDEKATAN PEMBINAAN ("Pembinaan yang Menyeluruh")
         ===================================================================== */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Pendekatan Pendidikan
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Pembinaan yang Menyeluruh
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Pendidikan di Pesantren Islam Mutiara Insan tidak hanya mengejar capaian hafalan semata, melainkan juga menanamkan kebiasaan ibadah, adab mulia, penguasaan ilmu, serta karakter santri dalam kehidupan sehari-hari.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOLISTIC_APPROACHES.map((item) => (
              <div
                key={item.index}
                className="p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-2.5"
              >
                <div className="text-xs font-mono font-semibold text-emerald-800">
                  {item.index}.
                </div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. KEHIDUPAN SANTRI ("Kehidupan dan Pembinaan Santri")
         ===================================================================== */}
      <section className="py-16 sm:py-24 bg-[#FAF8F5] border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Keseharian Asrama
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Kehidupan dan Pembinaan Santri
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Kehidupan santri di lingkungan pesantren dipantau dan dibina secara terstruktur agar tercipta suasana belajar yang aman, tertib, sehat, dan mendukung pertumbuhan akhlak.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {SANTRI_LIFE_ASPECTS.map((aspect, idx) => (
              <div
                key={aspect.title}
                className="bg-white p-5 rounded-2xl border border-stone-200/90 flex flex-col justify-between space-y-2"
              >
                <div className="space-y-2">
                  <span className="text-xs font-mono text-stone-400">
                    0{idx + 1}.
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    {aspect.title}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {aspect.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. PENDIDIKAN (#pendidikan - "Pendidikan yang Terintegrasi")
         ===================================================================== */}
      <section id="pendidikan" className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
                  Sistem Kurikulum Terintegrasi
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
                  Program Pendidikan
                </h2>
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                  Pesantren Islam Mutiara Insan mengintegrasikan pendidikan tahfiz Al-Qur’an, pendidikan diniyah, pembinaan akhlak, kemandirian santri, dan pendidikan akademik dalam satu kesatuan pembinaan harian.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-4/3">
                {!studyImgError ? (
                  <img
                    src={studySanctuaryImg}
                    alt="Suasana ruang belajar Pesantren Islam Mutiara Insan"
                    referrerPolicy="no-referrer"
                    onError={() => setStudyImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-100">
                    <GraduationCap className="w-10 h-10 text-emerald-800 mb-2" />
                    <span className="font-display text-lg text-stone-800">
                      Ruang Pembelajaran Terpadu
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 divide-y divide-stone-200 border-t border-b border-stone-200">
              {INTEGRATED_EDUCATION_ITEMS.map((item) => (
                <div
                  key={item.number}
                  className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6"
                >
                  <span className="text-xs font-mono font-semibold text-emerald-800 shrink-0">
                    {item.number}.
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. FASILITAS (#fasilitas)
         ===================================================================== */}
      <section id="fasilitas" className="py-16 sm:py-24 bg-[#FAF8F5] border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Sarana &amp; Prasarana
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Fasilitas Pesantren
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Sarana pendukung kegiatan belajar, ibadah, tahfiz Al-Qur’an, serta kehidupan berasrama santri di Pesantren Islam Mutiara Insan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableFacilities.map((facility, idx) => (
              <div
                key={facility.id || idx}
                className="bg-white p-6 rounded-2xl border border-stone-200/90 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="text-xs font-mono text-emerald-800 font-semibold">
                    0{idx + 1}.
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">
                    {facility.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {facility.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. NILAI-NILAI PESANTREN ("Nilai yang Kami Tanamkan")
         ===================================================================== */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Prinsip Dasar
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Nilai yang Kami Tanamkan
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Enam nilai utama yang menjadi pijakan dalam mendidik dan membimbing setiap santri di Pesantren Islam Mutiara Insan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-stone-200">
            {PESANTREN_VALUES.map((val, idx) => (
              <div
                key={val.name}
                className="p-6 sm:p-8 border-r border-b border-stone-200 bg-white hover:bg-[#FAF8F5] transition-colors space-y-3"
              >
                <div className="text-xs font-mono text-amber-700 font-semibold">
                  0{idx + 1} / NILAI UTAMA
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-emerald-950">
                  {val.name}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {val.meaning}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          10. PENERIMAAN SANTRI BARU (#penerimaan-santri)
         ===================================================================== */}
      <section
        id="penerimaan-santri"
        className="py-16 sm:py-24 bg-[#FAF8F5] border-b border-stone-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-emerald-950 text-white rounded-3xl p-8 sm:p-12 lg:p-16 border border-emerald-900">
            <div className="max-w-3xl space-y-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                Penerimaan Santri Baru &middot; {pesantrenName}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
                Informasi Penerimaan Santri
              </h2>
              <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
                {pesantrenPpdbInfo}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPpdbModalOpen(true)}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-amber-400 text-emerald-950 hover:bg-amber-300 transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Informasi Pendaftaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('kontak')}
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-emerald-100 border border-emerald-800 hover:bg-emerald-900 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Hubungi Sekretariat
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          11. KONTAK (#kontak - "Hubungi Kami")
         ===================================================================== */}
      <section id="kontak" className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Kanal Komunikasi Resmi
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Kontak dan Informasi Pesantren
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Silakan mengunjungi atau menghubungi sekretariat Pesantren Islam Mutiara Insan untuk informasi pendidikan dan penerimaan santri.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Alamat Pesantren */}
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Alamat Pesantren</h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {pesantrenAddress}
              </p>
            </div>

            {/* Nomor WhatsApp */}
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Nomor WhatsApp</h3>
              {pesantrenWhatsapp ? (
                <p className="text-xs sm:text-sm font-mono font-semibold text-emerald-900">
                  {pesantrenWhatsapp}
                </p>
              ) : (
                <p className="text-xs text-stone-500 italic leading-relaxed">
                  Nomor WhatsApp resmi dapat dilengkapi oleh Administrator pada menu Pengaturan Identitas Sekolah.
                </p>
              )}
            </div>

            {/* Email */}
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Email</h3>
              {pesantrenEmail ? (
                <p className="text-xs sm:text-sm font-mono font-semibold text-emerald-900 break-all">
                  {pesantrenEmail}
                </p>
              ) : (
                <p className="text-xs text-stone-500 italic leading-relaxed">
                  Alamat email resmi dapat dilengkapi oleh Administrator pada menu Pengaturan Identitas Sekolah.
                </p>
              )}
            </div>

            {/* Media Sosial */}
            <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">Media Sosial</h3>
              {pesantrenSocial ? (
                <p className="text-xs sm:text-sm font-medium text-emerald-900">
                  {pesantrenSocial}
                </p>
              ) : (
                <p className="text-xs text-stone-500 italic leading-relaxed">
                  Kanal media sosial resmi dapat dilengkapi oleh Administrator pada menu Pengaturan Identitas Sekolah.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          12. FOOTER
         ===================================================================== */}
      <footer className="bg-stone-950 text-stone-300 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-10 border-b border-stone-800">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex items-center gap-3">
                <SchoolLogo
                  logoUrl={pesantrenLogoUrl}
                  schoolName={pesantrenName}
                  size="sm"
                  variant="emerald"
                  fallbackIcon="book"
                />
                <span className="font-bold text-sm sm:text-base tracking-tight text-white uppercase">
                  {pesantrenName}
                </span>
              </div>
              <p className="font-display text-lg sm:text-xl text-amber-200/90 italic">
                “Menumbuhkan Generasi Qur’ani yang Hafizh, Berilmu, Berakhlak, dan Mandiri.”
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm font-medium text-stone-300">
              <button
                type="button"
                onClick={() => scrollToSection('profil')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Profil
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('program-tahfiz')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Program
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('penerimaan-santri')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Penerimaan Santri
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('kontak')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Kontak
              </button>
              <button
                type="button"
                onClick={openLoginFromAnywhere}
                className="text-amber-300 hover:text-amber-200 font-semibold transition-colors cursor-pointer"
              >
                Masuk AKSARA
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-stone-400">
            <p>
              &copy; {new Date().getFullYear()} {pesantrenName}. All rights reserved.
            </p>
            <p className="text-stone-500">
              Didukung oleh AKSARA &mdash; Sistem Informasi Manajemen Akademik dan Administrasi Sekolah
            </p>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MODAL INFORMASI PENDAFTARAN SANTRI BARU (PPDB PLACEHOLDER RESMI)
         ===================================================================== */}
      {ppdbModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPpdbModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                  Penerimaan Santri Baru
                </span>
                <h3 className="font-display text-2xl font-bold text-stone-900 mt-0.5">
                  Informasi Pendaftaran Santri
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPpdbModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
              <p>{pesantrenPpdbInfo}</p>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200 space-y-2.5">
                <div className="font-bold text-stone-900 flex items-center gap-2 text-xs">
                  <Info className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>Alur Umum Informasi &amp; Pendaftaran:</span>
                </div>
                <ul className="space-y-2 text-xs text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      Menghubungi sekretariat atau mengunjungi langsung kampus Pesantren Islam Mutiara Insan.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      Mengisi formulir pendaftaran calon santri dan melengkapi dokumen administrasi keluarga serta riwayat pendidikan.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      Mengikuti observasi bacaan Al-Qur’an serta wawancara kesiapan calon santri dan wali santri.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="text-xs text-stone-500">
                <strong>Alamat Sekretariat:</strong> {pesantrenAddress}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPpdbModalOpen(false);
                  scrollToSection('kontak');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-900 text-white hover:bg-emerald-950 transition-colors cursor-pointer"
              >
                Lihat Kontak Pesantren
              </button>
              <button
                type="button"
                onClick={() => setPpdbModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
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
