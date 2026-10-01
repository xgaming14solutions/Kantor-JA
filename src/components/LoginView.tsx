import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import { DEFAULT_PESANTREN_FACILITIES } from '../lib/dbService';
import {
  DEFAULT_SPMB_BROCHURE,
  subscribeToBrochures,
  downloadBrochurePageImage,
  downloadAllBrochurePagesAsPdf,
} from '../lib/brochureService';
import { SpmbBrochure } from '../types';
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
  BookOpen,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Calendar,
  Sparkles,
  Compass,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileText,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import heroPesantrenImg from '../assets/images/hero_pesantren_mutiara_1790506485327.jpg';
import tahfizQuranImg from '../assets/images/tahfiz_quran_mushaf_1790506498260.jpg';
import studySanctuaryImg from '../assets/images/pesantren_study_sanctuary_1790506511129.jpg';

type GraduateTabKey = 'ALL' | 'TK' | 'SD' | 'SMP_SMA';

interface GraduateTargetGroup {
  key: 'TK' | 'SD' | 'SMP_SMA';
  shortLabel: string;
  headingH3: string;
  subtitle: string;
  targets: string[];
}

const GRADUATE_TARGETS: GraduateTargetGroup[] = [
  {
    key: 'TK',
    shortLabel: 'TK',
    headingH3: 'Target Lulusan TK',
    subtitle: 'Taman Kanak-kanak (TK)',
    targets: [
      'Hafal Juz 30',
      'Hafal Doa & Hadits Pilihan',
      'Kosa Kata Bahasa Arab pilihan',
      'Mampu Calistung',
      'Memiliki Adab Islami',
    ],
  },
  {
    key: 'SD',
    shortLabel: 'SD',
    headingH3: 'Target Lulusan Setara SD',
    subtitle: 'Setara Sekolah Dasar (SD)',
    targets: [
      "Hafal 4 Juz Al-Qur'an",
      'Hafal 50 Doa & Hadits Pilihan',
      'Mampu Percakapan Bahasa Arab Sehari-hari',
      'Memiliki Adab Islami',
    ],
  },
  {
    key: 'SMP_SMA',
    shortLabel: 'SMP & SMA',
    headingH3: 'Target Lulusan Setara SMP & SMA',
    subtitle: 'Setara SMP & SMA',
    targets: [
      "Hafal 30 Juz Al-Qur'an",
      'Hafal Kitab Umdatul Ahkam 420 Hadits',
      'Mampu Berbahasa Arab Lisan dan Tulisan',
      "Menguasai Cabang Ilmu Syar'i",
      'Hafal Beberapa Mutun',
    ],
  },
];

const REGISTRATION_REQUIREMENTS = [
  {
    number: '01',
    text: 'Mengisi Formulir Pendaftaran',
  },
  {
    number: '02',
    text: 'Pas Foto Berwarna 3×4 sebanyak 2 lembar',
  },
  {
    number: '03',
    text: 'Fotokopi Kartu Keluarga (KK) dan KTP Orang Tua',
  },
  {
    number: '04',
    text: 'Fotokopi Surat Keterangan Lulus untuk jenjang SMP dan SMA',
  },
  {
    number: '05',
    text: 'Untuk TK, genap berusia 4,5 tahun pada bulan Juli 2027',
  },
  {
    number: '06',
    text: 'Membayar Uang Pendaftaran Rp150.000',
  },
];

interface TuitionItem {
  level: string;
  fullName: string;
  daftarUlang: string;
  sppJuli: string;
  total: string;
  keterangan: string;
}

const TUITION_FEES: TuitionItem[] = [
  {
    level: 'TK',
    fullName: 'Taman Kanak-kanak (TK)',
    daftarUlang: 'Rp1.900.000',
    sppJuli: 'Rp100.000',
    total: 'Rp2.000.000',
    keterangan:
      'Kolom daftar ulang mencakup seragam 3 stel, buku pelajaran, pengembangan, dan outing class (kegiatan dalam satu tahun).',
  },
  {
    level: 'SD',
    fullName: 'Setara SD',
    daftarUlang: 'Rp2.365.000',
    sppJuli: 'Rp135.000',
    total: 'Rp2.500.000',
    keterangan:
      'Kolom daftar ulang mencakup seragam 3 stel, buku pelajaran, pengembangan, dan UAS ganjil/genap.',
  },
  {
    level: 'SMP',
    fullName: 'Setara SMP',
    daftarUlang: 'Rp5.750.000',
    sppJuli: 'Rp750.000',
    total: 'Rp6.500.000',
    keterangan:
      'Kolom daftar ulang mencakup seragam, buku pelajaran, pengembangan, ekstrakurikuler, rihlah, dan UAS ganjil/genap.',
  },
  {
    level: 'SMA',
    fullName: 'Setara SMA',
    daftarUlang: 'Rp4.750.000',
    sppJuli: 'Rp750.000',
    total: 'Rp5.500.000',
    keterangan:
      'Kolom daftar ulang mencakup seragam, buku pelajaran, pengembangan, ekstrakurikuler, rihlah, dan UAS ganjil/genap.',
  },
];

const LIFE_SKILL_ITEMS = ['Pertanian', 'Perikanan', 'Peternakan', 'Perkebunan'];

const OFFICIAL_WHATSAPP_DISPLAY = '0812-1098-876';
const OFFICIAL_WHATSAPP_CONTACT_NAME = 'Abu Al Fatih';
const OFFICIAL_WHATSAPP_URL =
  'https://wa.me/628121098876?text=Assalamu%27alaikum%20warahmatullahi%20wabarakatuh%20Ustadz%20Abu%20Al%20Fatih%2C%20saya%20ingin%20memperoleh%20informasi%20pendaftaran%20santri%20baru%20(SPMB%20Mutiara%20Insan%20Tahun%20Ajaran%202027-2028).';

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
  const [activeGraduateTab, setActiveGraduateTab] = useState<GraduateTabKey>('ALL');

  // Image fallback states (Zero-Broken-Image Policy)
  const [heroImgError, setHeroImgError] = useState(false);
  const [tahfizImgError, setTahfizImgError] = useState(false);
  const [studyImgError, setStudyImgError] = useState(false);

  // Public SPMB Brochure states
  const [brochures, setBrochures] = useState<SpmbBrochure[]>([DEFAULT_SPMB_BROCHURE]);
  const [selectedBrochureId, setSelectedBrochureId] = useState<string>(DEFAULT_SPMB_BROCHURE.id);
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxPageIdx, setLightboxPageIdx] = useState<number>(0);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToBrochures((list) => {
      setBrochures(list);
    });
    return () => unsubscribe();
  }, []);

  const activeBrochures = brochures.filter((b) => b.isActive !== false && b.imageUrls?.length > 0);
  const currentBrochure =
    activeBrochures.find((b) => b.id === selectedBrochureId) || activeBrochures[0] || null;

  useEffect(() => {
    if (currentBrochure && activePageIdx >= currentBrochure.imageUrls.length) {
      setActivePageIdx(0);
    }
  }, [currentBrochure, activePageIdx]);

  const handleOpenLightbox = (pageIndex: number) => {
    setLightboxPageIdx(pageIndex);
    setLightboxZoom(1);
    setLightboxOpen(true);
  };

  const handleDownloadSinglePage = async (pageIndex: number) => {
    if (!currentBrochure) return;
    const pageUrl = currentBrochure.imageUrls[pageIndex];
    if (!pageUrl) return;
    const key = `page-${pageIndex + 1}`;
    setDownloadingKey(key);
    try {
      await downloadBrochurePageImage(pageUrl, pageIndex + 1, currentBrochure.title);
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadFullPdf = async () => {
    if (!currentBrochure) return;
    setDownloadingKey('pdf-all');
    try {
      await downloadAllBrochurePagesAsPdf(currentBrochure);
    } finally {
      setDownloadingKey(null);
    }
  };

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

  const navLinks = [
    { label: 'Beranda', target: 'beranda' },
    { label: 'Profil', target: 'profil' },
    { label: 'SPMB 2027–2028', target: 'spmb-2027' },
    { label: 'Target Lulusan', target: 'target-lulusan' },
    { label: 'Biaya', target: 'biaya' },
    { label: 'Galeri', target: 'galeri' },
    { label: 'Pendaftaran', target: 'informasi-pendaftaran' },
    { label: 'Brosur SPMB', target: 'brosur-spmb' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col overflow-x-hidden selection:bg-emerald-900 selection:text-white">
      {/* =====================================================================
          1. HEADER / NAVBAR (Tombol Masuk AKSARA tetap di Header)
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
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 group focus:outline-none"
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

          {/* Tengah: Desktop Navigation Links */}
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

          {/* Kanan: Tombol Masuk AKSARA (Dropdown) + Mobile Hamburger */}
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
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-900 hover:bg-emerald-950 active:bg-emerald-950 transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2"
              >
                <span>Masuk AKSARA</span>
                <ChevronDown
                  className={`w-4 h-4 text-amber-300 transition-transform duration-150 ${
                    loginDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* LOGIN DROPDOWN PANEL */}
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
                        <p className="text-xs text-stone-500 mt-0.5 truncate">{pesantrenName}</p>
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
                      <span className="px-2.5 bg-white text-stone-400 font-medium">atau</span>
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
              className="xl:hidden p-2.5 rounded-xl text-stone-700 hover:text-emerald-950 hover:bg-stone-200/60 transition-colors cursor-pointer"
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
          - Logo Pesantren Islam Mutiara Insan
          - Nama pesantren (H1)
          - Tagline yang sudah ada
          - Tombol "Informasi SPMB 2027–2028"
         ===================================================================== */}
      <section
        id="beranda"
        className="relative overflow-hidden bg-emerald-950 text-white border-b border-emerald-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-18 lg:py-22">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Logo, Identity, Tagline & Primary CTA */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="flex items-center gap-3.5">
                <SchoolLogo
                  logoUrl={pesantrenLogoUrl}
                  schoolName={pesantrenName}
                  size="lg"
                  variant="emerald"
                  fallbackIcon="book"
                />
                <div className="space-y-0.5">
                  <div className="text-xs sm:text-sm text-amber-300 font-semibold tracking-wide">
                    Lembaga Pendidikan Islam &amp; Pesantren Tahfiz Al-Qur’an
                  </div>
                  <div className="text-xs text-emerald-200/90">
                    Tulang Bawang Barat &middot; Lampung
                  </div>
                </div>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12] text-balance">
                Pesantren Islam Mutiara Insan
              </h1>

              <p className="font-display text-xl sm:text-2xl text-amber-200 font-medium leading-snug text-balance">
                “Menumbuhkan Generasi Qur’ani yang Hafizh, Berilmu, Berakhlak, dan Mandiri.”
              </p>

              <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                Menyelenggarakan pendidikan tahfiz Al-Qur’an, pendidikan diniyah, pembinaan akhlak, serta pendidikan formal berjenjang mulai dari <strong>TK, SD, SMP, hingga SMA</strong> di Kabupaten Tulang Bawang Barat, Lampung.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollToSection('spmb-2027')}
                  className="min-h-[46px] px-6 py-3 rounded-xl text-sm font-semibold bg-amber-400 text-emerald-950 hover:bg-amber-300 transition-colors shadow-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Informasi SPMB 2027–2028</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <a
                  href={OFFICIAL_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[46px] px-5 py-3 rounded-xl text-sm font-semibold text-white border border-emerald-700 hover:bg-emerald-900/80 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Hubungi Panitia SPMB</span>
                </a>
              </div>
            </div>

            {/* Right Column: Existing Hero Photo */}
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
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-transparent to-transparent" />
                <div className="absolute bottom-3.5 left-4 right-4 text-xs text-emerald-100/95 flex items-center justify-between gap-2">
                  <span>TK &middot; SD &middot; SMP &middot; SMA</span>
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
          3. PROFIL SINGKAT PESANTREN (#profil)
         ===================================================================== */}
      <section id="profil" className="py-14 sm:py-20 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
            <div className="lg:col-span-5 space-y-3.5">
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
                Identitas Lembaga &middot; {pesantrenName}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
                Profil Pesantren
              </h2>
              <div className="w-14 h-0.5 bg-amber-500" />
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-1">
                Pesantren tahfiz Al-Qur’an dan lembaga pendidikan Islam di Tulang Bawang Barat, Lampung yang membina generasi Qur’ani sejak usia dini hingga pendidikan menengah.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-4 text-sm sm:text-base text-stone-700 leading-relaxed max-w-2xl">
              <p>
                <strong>Pesantren Islam Mutiara Insan</strong> hadir sebagai lembaga pendidikan Islam yang berkomitmen mendampingi santri dalam menghafal, memahami, dan mengamalkan Al-Qur’an melalui pembinaan bertahap pada jenjang <strong>TK, SD, SMP, dan SMA</strong>.
              </p>
              <p>
                Pendidikan dirancang secara terpadu antara <strong>pendidikan tahfiz Al-Qur’an</strong>, penguatan <strong>ilmu syar’i dan bahasa Arab</strong>, kecakapan akademik dasar, pembiasaan <strong>adab islami</strong>, serta keterampilan kemandirian (<em>life skill</em>) santri.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. SPMB 2027–2028 (#spmb-2027)
          H2: SPMB Mutiara Insan Tahun Ajaran 2027–2028
         ===================================================================== */}
      <section
        id="spmb-2027"
        className="py-14 sm:py-20 bg-emerald-950 text-white border-b border-emerald-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">
              Penerimaan Santri Baru Resmi &middot; Tahun Ajaran 2027–2028
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
              SPMB Mutiara Insan Tahun Ajaran 2027–2028
            </h2>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
              Informasi resmi Seleksi Penerimaan Murid/Santri Baru (SPMB) Pesantren Islam Mutiara Insan untuk Tahun Ajaran 2027–2028.
            </p>
          </div>

          {/* 4 Kartu Informasi Utama SPMB 2027–2028 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* 1. Jenjang Pendidikan */}
            <div className="bg-emerald-900/60 border border-emerald-800 rounded-2xl p-5 sm:p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                  <span>01. JENJANG PENDIDIKAN</span>
                  <GraduationCap className="w-4 h-4 shrink-0" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  TK – SD – SMP – SMA
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
                  Tersedia jenjang pendidikan berkelanjutan mulai dari Taman Kanak-kanak (TK), Setara SD, Setara SMP, hingga Setara SMA.
                </p>
              </div>
            </div>

            {/* 2. Gelombang Pendaftaran */}
            <div className="bg-emerald-900/60 border border-emerald-800 rounded-2xl p-5 sm:p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                  <span>02. GELOMBANG PENDAFTARAN</span>
                  <Calendar className="w-4 h-4 shrink-0" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Gelombang 1
                </div>
                <p className="text-sm font-semibold text-amber-200">
                  September – Oktober 2026
                </p>
                <p className="text-xs text-emerald-100/85 leading-relaxed">
                  Jadwal pendaftaran Gelombang 1 untuk calon santri baru Tahun Ajaran 2027–2028.
                </p>
              </div>
            </div>

            {/* 3. Promo Pendaftaran */}
            <div className="bg-amber-400/15 border border-amber-400/50 rounded-2xl p-5 sm:p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                  <span>03. PROMO PENDAFTARAN</span>
                  <Sparkles className="w-4 h-4 shrink-0" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-amber-300 tracking-tight">
                  Free Biaya Pendaftaran
                </div>
                <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                  Free biaya pendaftaran untuk 5 orang pertama.
                </p>
              </div>
            </div>

            {/* 4. Program yang Akan Datang */}
            <div className="bg-emerald-900/60 border border-emerald-800 rounded-2xl p-5 sm:p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                  <span>04. PROGRAM AKAN DATANG</span>
                  <BookOpen className="w-4 h-4 shrink-0" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  “Trial Class”
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
                  Program khusus calon santri baru “Trial Class” untuk mengenal suasana belajar dan pembinaan di pesantren.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. TARGET LULUSAN (#target-lulusan)
          H2: Target Lulusan
          H3: Target Lulusan TK
          H3: Target Lulusan Setara SD
          H3: Target Lulusan Setara SMP & SMA
         ===================================================================== */}
      <section
        id="target-lulusan"
        className="py-14 sm:py-20 bg-[#FAF8F5] border-b border-stone-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
                Capaian Kompetensi Santri
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
                Target Lulusan
              </h2>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Standar capaian hafalan Al-Qur’an, hadits, bahasa Arab, keilmuan, dan adab islami pada setiap jenjang pendidikan di Pesantren Islam Mutiara Insan.
              </p>
            </div>

            {/* Interactive Filter Tabs (Nyaman digunakan di HP & Desktop) */}
            <div
              role="tablist"
              aria-label="Filter Jenjang Target Lulusan"
              className="flex items-center gap-1.5 p-1.5 bg-stone-200/80 rounded-xl overflow-x-auto max-w-full"
            >
              {[
                { id: 'ALL' as GraduateTabKey, label: 'Semua Jenjang' },
                { id: 'TK' as GraduateTabKey, label: 'TK' },
                { id: 'SD' as GraduateTabKey, label: 'SD' },
                { id: 'SMP_SMA' as GraduateTabKey, label: 'SMP & SMA' },
              ].map((tab) => {
                const isActive = activeGraduateTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveGraduateTab(tab.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-950 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-950 hover:bg-white/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Cards Target Lulusan (Semua H3 tetap berada di DOM untuk SEO Google) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            {GRADUATE_TARGETS.map((group, idx) => {
              const isVisible =
                activeGraduateTab === 'ALL' || activeGraduateTab === group.key;
              return (
                <article
                  key={group.key}
                  className={`bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-7 flex flex-col justify-between transition-all ${
                    isVisible ? 'block' : 'hidden lg:block lg:opacity-45'
                  }`}
                >
                  <div className="space-y-5">
                    <div className="pb-4 border-b border-stone-100 space-y-1.5">
                      <div className="text-xs font-mono font-semibold text-emerald-800">
                        0{idx + 1}. {group.subtitle.toUpperCase()}
                      </div>
                      <h3 className="font-display text-2xl sm:text-3xl font-bold text-emerald-950">
                        {group.headingH3}
                      </h3>
                    </div>

                    <ol className="space-y-3">
                      {group.targets.map((target, itemIdx) => (
                        <li
                          key={target}
                          className="flex items-start gap-3 text-sm sm:text-base text-stone-800 leading-snug"
                        >
                          <span className="w-6 h-6 rounded-lg bg-emerald-950 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                            {itemIdx + 1}
                          </span>
                          <span className="font-medium">{target}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. PERSYARATAN PENDAFTARAN (#persyaratan)
          H2: Persyaratan Pendaftaran
         ===================================================================== */}
      <section
        id="persyaratan"
        className="py-14 sm:py-20 bg-white border-b border-stone-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Dokumen &amp; Ketentuan Calon Santri
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Persyaratan Pendaftaran
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Persyaratan administrasi pendaftaran santri baru SPMB Pesantren Islam Mutiara Insan Tahun Ajaran 2027–2028.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {REGISTRATION_REQUIREMENTS.map((req) => (
              <div
                key={req.number}
                className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 flex items-start gap-4"
              >
                <span className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {req.number}
                </span>
                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-semibold text-stone-900 leading-snug">
                    {req.text}
                  </p>
                  {req.number === '06' && (
                    <p className="text-xs font-medium text-emerald-800">
                      Promo: Free biaya pendaftaran untuk 5 orang pertama.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. RINCIAN BIAYA PENDIDIKAN (#biaya)
          H2: Rincian Biaya Pendidikan
          Nyaman dibaca di HP (Card responsif) + Tabel perbandingan di Desktop
         ===================================================================== */}
      <section
        id="biaya"
        className="py-14 sm:py-20 bg-[#FAF8F5] border-b border-stone-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Transparansi Biaya SPMB 2027–2028
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Rincian Biaya Pendidikan
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Rincian biaya daftar ulang dan SPP bulan Juli untuk masing-masing jenjang pendidikan pada Tahun Ajaran 2027–2028.
            </p>
          </div>

          {/* Tampilan Card Responsif (Sangat Nyaman Dibaca di HP & Tablet maupun Desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {TUITION_FEES.map((fee) => (
              <div
                key={fee.level}
                className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 block">
                        Jenjang Pendidikan
                      </span>
                      <h3 className="font-display text-2xl font-bold text-white">
                        {fee.level}
                      </h3>
                    </div>
                    <span className="text-xs text-emerald-100/90 font-medium">
                      {fee.fullName}
                    </span>
                  </div>

                  <div className="p-5 space-y-3.5">
                    <div className="flex items-center justify-between text-sm border-b border-stone-100 pb-2.5">
                      <span className="text-stone-600">Daftar Ulang</span>
                      <span className="font-mono font-semibold text-stone-900 tabular-nums">
                        {fee.daftarUlang}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm border-b border-stone-100 pb-2.5">
                      <span className="text-stone-600">SPP Juli</span>
                      <span className="font-mono font-semibold text-stone-900 tabular-nums">
                        {fee.sppJuli}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-bold text-emerald-950">Total</span>
                      <span className="font-mono text-base sm:text-lg font-bold text-emerald-900 tabular-nums">
                        {fee.total}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 bg-stone-50 border-t border-stone-200/80 text-xs text-stone-600 leading-relaxed">
                  <strong className="text-stone-800 block mb-0.5">Keterangan:</strong>
                  {fee.keterangan}
                </div>
              </div>
            ))}
          </div>

          {/* Tabel Ringkasan Perbandingan (Desktop) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-stone-200/90 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-700">
                  <th className="py-3.5 px-5">Jenjang</th>
                  <th className="py-3.5 px-5">Daftar Ulang</th>
                  <th className="py-3.5 px-5">SPP Juli</th>
                  <th className="py-3.5 px-5">Total</th>
                  <th className="py-3.5 px-5">Keterangan Cakupan Daftar Ulang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {TUITION_FEES.map((fee) => (
                  <tr key={fee.level} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-4 px-5 font-bold text-emerald-950 whitespace-nowrap">
                      {fee.level} <span className="font-normal text-stone-500">({fee.fullName})</span>
                    </td>
                    <td className="py-4 px-5 font-mono font-medium text-stone-800 tabular-nums whitespace-nowrap">
                      {fee.daftarUlang}
                    </td>
                    <td className="py-4 px-5 font-mono font-medium text-stone-800 tabular-nums whitespace-nowrap">
                      {fee.sppJuli}
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                      {fee.total}
                    </td>
                    <td className="py-4 px-5 text-xs text-stone-600 leading-relaxed max-w-md">
                      {fee.keterangan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. EKSTRAKURIKULER (#ekstrakurikuler)
          H2: Ekstrakurikuler
          - Futsal
          - Renang
          - Life Skill: Pertanian, Perikanan, Peternakan, Perkebunan
         ===================================================================== */}
      <section
        id="ekstrakurikuler"
        className="py-14 sm:py-20 bg-white border-b border-stone-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Pengembangan Minat, Fisik &amp; Kemandirian
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Ekstrakurikuler
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Kegiatan ekstrakurikuler olahraga dan pembinaan keterampilan hidup (<em>Life Skill</em>) untuk melatih ketangkasan serta kemandirian santri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Olahraga: Futsal & Renang */}
            <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
              <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 flex items-start gap-4">
                <span className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  01
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-stone-900">Futsal</h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    Pembinaan kebugaran jasmani, sportivitas, dan kerja sama tim santri melalui kegiatan olahraga futsal terjadwal.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/90 flex items-start gap-4">
                <span className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  02
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-stone-900">Renang</h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    Latihan ketangkasan fisik dan keterampilan berenang secara terarah dan aman bagi santri.
                  </p>
                </div>
              </div>
            </div>

            {/* Life Skill: Pertanian, Perikanan, Peternakan, Perkebunan */}
            <div className="md:col-span-7 p-6 sm:p-8 rounded-2xl bg-emerald-950 text-white border border-emerald-900 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-300 uppercase tracking-wider">
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>03. PROGRAM KEMANDIRIAN SANTRI</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  Life Skill
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
                  Pembekalan keterampilan praktis berbasis alam dan kemandirian pangan untuk menumbuhkan etos kerja, tanggung jawab, dan kemandirian santri:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LIFE_SKILL_ITEMS.map((skill, idx) => (
                  <div
                    key={skill}
                    className="bg-emerald-900/70 border border-emerald-800 rounded-xl p-4 space-y-1.5"
                  >
                    <span className="text-[11px] font-mono text-amber-300 font-semibold block">
                      0{idx + 1}.
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white block">
                      {skill}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          9. GALERI & FASILITAS PESANTREN (#galeri)
          Menggunakan foto yang sudah ada tanpa menggantinya
         ===================================================================== */}
      <section
        id="galeri"
        className="py-14 sm:py-20 bg-[#FAF8F5] border-b border-stone-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
              Dokumentasi &amp; Sarana Pendidikan
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Galeri dan Lingkungan Pesantren
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Suasana lingkungan pendidikan, halaqah tahfiz Al-Qur’an, dan fasilitas pendukung pembinaan santri di Pesantren Islam Mutiara Insan.
            </p>
          </div>

          {/* 3 Foto Galeri yang Sudah Ada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Foto 1 */}
            <figure className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col">
              <div className="aspect-4/3 bg-emerald-950 relative overflow-hidden">
                {!heroImgError ? (
                  <img
                    src={heroPesantrenImg}
                    alt="Lingkungan Pesantren Islam Mutiara Insan"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-emerald-950 text-white">
                    <BookOpen className="w-8 h-8 text-amber-300 mb-2" />
                    <span className="text-sm font-semibold">Lingkungan Pesantren</span>
                  </div>
                )}
              </div>
              <figcaption className="p-4 sm:p-5 space-y-1">
                <div className="text-sm font-bold text-stone-900">
                  Lingkungan Pesantren Islam Mutiara Insan
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Suasana kampus pesantren yang asri dan kondusif untuk kegiatan ibadah serta belajar santri.
                </p>
              </figcaption>
            </figure>

            {/* Foto 2 */}
            <figure className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col">
              <div className="aspect-4/3 bg-emerald-950 relative overflow-hidden">
                {!tahfizImgError ? (
                  <img
                    src={tahfizQuranImg}
                    alt="Program Tahfiz Al-Qur'an Pesantren Islam Mutiara Insan"
                    referrerPolicy="no-referrer"
                    onError={() => setTahfizImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-emerald-950 text-white">
                    <BookOpen className="w-8 h-8 text-amber-300 mb-2" />
                    <span className="text-sm font-semibold">Halaqah Tahfiz Al-Qur’an</span>
                  </div>
                )}
              </div>
              <figcaption className="p-4 sm:p-5 space-y-1">
                <div className="text-sm font-bold text-stone-900">
                  Pembinaan Tahfiz Al-Qur’an
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Pendampingan tahsin, ziyadah, dan murajaah hafalan Al-Qur’an secara bertahap dan terukur.
                </p>
              </figcaption>
            </figure>

            {/* Foto 3 */}
            <figure className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden flex flex-col">
              <div className="aspect-4/3 bg-stone-100 relative overflow-hidden">
                {!studyImgError ? (
                  <img
                    src={studySanctuaryImg}
                    alt="Suasana ruang belajar Pesantren Islam Mutiara Insan"
                    referrerPolicy="no-referrer"
                    onError={() => setStudyImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-200 text-stone-800">
                    <GraduationCap className="w-8 h-8 text-emerald-800 mb-2" />
                    <span className="text-sm font-semibold">Ruang Belajar Terpadu</span>
                  </div>
                )}
              </div>
              <figcaption className="p-4 sm:p-5 space-y-1">
                <div className="text-sm font-bold text-stone-900">
                  Kegiatan Belajar Diniyah &amp; Akademik
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Pembelajaran ilmu syar’i, bahasa Arab, dan materi akademik yang terstruktur.
                </p>
              </figcaption>
            </figure>
          </div>

          {/* Daftar Fasilitas Pendukung yang Tersedia */}
          {availableFacilities.length > 0 && (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableFacilities.map((facility, idx) => (
                <div
                  key={facility.id || idx}
                  className="bg-white p-5 rounded-2xl border border-stone-200/90 space-y-1.5"
                >
                  <div className="text-xs font-mono text-emerald-800 font-semibold">
                    0{idx + 1}. SARANA PESANTREN
                  </div>
                  <div className="text-sm sm:text-base font-bold text-stone-900">
                    {facility.name}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {facility.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          10. ALAMAT & INFORMASI PENDAFTARAN (#informasi-pendaftaran / #kontak)
          H2: Informasi Pendaftaran
          - Alamat Resmi
          - Nomor WhatsApp: 0812-1098-876 (Abu Al Fatih)
          - Tombol: "HUBUNGI PANITIA"
         ===================================================================== */}
      <section
        id="informasi-pendaftaran"
        className="py-14 sm:py-20 bg-white border-b border-stone-200/80"
      >
        <div id="kontak" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-10 lg:p-14 border border-emerald-900">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Kiri: Heading H2 & Alamat Resmi */}
              <div className="lg:col-span-7 space-y-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                  Layanan Informasi &amp; Pendaftaran Santri Baru
                </div>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight text-balance">
                  Informasi Pendaftaran
                </h2>
                <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                  Bagi orang tua / wali calon santri yang ingin mendaftarkan putra-putrinya pada <strong>SPMB Mutiara Insan Tahun Ajaran 2027–2028</strong> (jenjang TK, SD, SMP, atau SMA) maupun mengikuti program <strong>Trial Class</strong>, silakan menghubungi panitia atau mengunjungi langsung alamat pesantren.
                </p>

                {/* Alamat Lengkap Sesuai Brosur */}
                <div className="p-5 rounded-2xl bg-emerald-900/60 border border-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Alamat Pesantren Islam Mutiara Insan</span>
                  </div>
                  <address className="not-italic text-sm sm:text-base text-white leading-relaxed font-medium">
                    Jln. Tuan Rio II, Tiyuh Bandar Dewa
                    <br />
                    (Samping Pos Polisi Kalim Kaliming)
                    <br />
                    Kec. Tulang Bawang Tengah, Kab. Tulang Bawang Barat, Lampung
                  </address>
                </div>
              </div>

              {/* Kanan: Card Kontak Panitia SPMB & Tombol HUBUNGI PANITIA */}
              <div className="lg:col-span-5">
                <div className="bg-white text-stone-900 rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6">
                  <div className="space-y-1.5 border-b border-stone-100 pb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
                      Narahubung Resmi SPMB 2027–2028
                    </span>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
                      {OFFICIAL_WHATSAPP_CONTACT_NAME}
                    </div>
                    <p className="text-xs text-stone-500">
                      Panitia Penerimaan Santri Baru Pesantren Islam Mutiara Insan
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200/90 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-stone-500 font-medium">
                          Nomor Telepon / WhatsApp
                        </div>
                        <div className="font-mono text-lg sm:text-xl font-bold text-emerald-950 tabular-nums">
                          {OFFICIAL_WHATSAPP_DISPLAY}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-stone-600 space-y-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Gelombang 1: September – Oktober 2026</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Free biaya pendaftaran untuk 5 orang pertama</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={OFFICIAL_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[48px] py-3.5 px-6 rounded-xl text-sm font-bold tracking-wide text-emerald-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-400 transition-colors shadow-sm inline-flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>HUBUNGI PANITIA</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          11. BROSUR SPMB (#brosur-spmb)
          Berada tepat setelah Informasi Pendaftaran dan sebelum Footer.
          Model Slider/Carousel Satu Halaman (Halaman 1 -> Halaman 2)
         ===================================================================== */}
      <section
        id="brosur-spmb"
        className="py-14 sm:py-20 bg-[#FAF8F5] border-b border-stone-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Section Brosur SPMB */}
          <div className="max-w-2xl mx-auto text-center space-y-2.5">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 leading-tight text-balance">
              Brosur SPMB
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Lihat dan unduh brosur resmi Penerimaan Santri Baru Pesantren Islam Mutiara Insan.
            </p>

            {/* Selector jika terdapat lebih dari 1 brosur aktif */}
            {activeBrochures.length > 1 && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                {activeBrochures.map((b) => {
                  const isSel = currentBrochure?.id === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBrochureId(b.id);
                        setActivePageIdx(0);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isSel
                          ? 'bg-emerald-950 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {b.title} ({b.academicYear})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!currentBrochure ? (
            <div className="max-w-2xl mx-auto p-10 sm:p-14 rounded-2xl bg-white border border-stone-200/90 text-center space-y-2.5">
              <FileImage className="w-10 h-10 text-emerald-800 mx-auto" />
              <div className="font-display text-2xl font-bold text-stone-900">
                Brosur SPMB akan segera diperbarui.
              </div>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                Untuk informasi lengkap pendaftaran santri baru, silakan hubungi panitia SPMB melalui nomor resmi di atas.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Card Utama Satu Halaman Brosur (Slider/Carousel Model) */}
              <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-sm">
                {/* Bar Atas: HALAMAN X DARI Y & Perbesar Gambar */}
                <div className="px-4 sm:px-5 py-3.5 bg-emerald-950 text-white flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-mono font-semibold text-amber-300 tracking-wide">
                    HALAMAN {activePageIdx + 1} DARI {currentBrochure.imageUrls.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenLightbox(activePageIdx)}
                    className="text-xs sm:text-sm font-semibold text-emerald-100 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4 shrink-0" />
                    <span>Perbesar Gambar</span>
                  </button>
                </div>

                {/* Area Gambar Brosur Tunggal (Proporsional & Tanpa Crop) */}
                <div className="relative bg-stone-100/70 p-2 sm:p-5 flex items-center justify-center">
                  {currentBrochure.imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setActivePageIdx(
                          (prev) =>
                            (prev - 1 + currentBrochure.imageUrls.length) %
                            currentBrochure.imageUrls.length
                        )
                      }
                      aria-label="Halaman Sebelumnya"
                      className="hidden sm:inline-flex absolute left-3 z-10 w-10 h-10 rounded-full bg-emerald-950/85 hover:bg-emerald-950 text-white items-center justify-center shadow-md transition cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenLightbox(activePageIdx)}
                    className="w-full flex items-center justify-center group cursor-zoom-in focus:outline-none"
                    title={`Klik untuk memperbesar Brosur Halaman ${activePageIdx + 1}`}
                  >
                    <img
                      src={currentBrochure.imageUrls[activePageIdx]}
                      alt={`${currentBrochure.title} - Halaman ${activePageIdx + 1}`}
                      className="w-full h-auto max-h-[820px] object-contain rounded-lg shadow-xs"
                    />
                  </button>

                  {currentBrochure.imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setActivePageIdx((prev) => (prev + 1) % currentBrochure.imageUrls.length)
                      }
                      aria-label="Halaman Berikutnya"
                      className="hidden sm:inline-flex absolute right-3 z-10 w-10 h-10 rounded-full bg-emerald-950/85 hover:bg-emerald-950 text-white items-center justify-center shadow-md transition cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Navigasi Slider Halaman: [ Halaman 1 ] [ Halaman 2 ] */}
              {currentBrochure.imageUrls.length > 1 && (
                <div className="flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setActivePageIdx(
                        (prev) =>
                          (prev - 1 + currentBrochure.imageUrls.length) %
                          currentBrochure.imageUrls.length
                      )
                    }
                    aria-label="Halaman Sebelumnya"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-white border border-stone-200/90 text-stone-700 hover:bg-stone-100 inline-flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="inline-flex items-center gap-2">
                    {currentBrochure.imageUrls.map((_, idx) => {
                      const isCurrent = activePageIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePageIdx(idx)}
                          className={`min-h-[42px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-950 text-amber-300 shadow-xs'
                              : 'bg-white border border-stone-200/90 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          Halaman {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActivePageIdx((prev) => (prev + 1) % currentBrochure.imageUrls.length)
                    }
                    aria-label="Halaman Berikutnya"
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-white border border-stone-200/90 text-stone-700 hover:bg-stone-100 inline-flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Baris Tombol Aksi di Bawah Slider: [ Lihat Ukuran Penuh ] [ Unduh Halaman X ] [ Unduh Semua (PDF) ] */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenLightbox(activePageIdx)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-800 bg-white hover:bg-stone-100 border border-stone-200/90 transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Maximize2 className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>Lihat Ukuran Penuh</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingKey !== null}
                  onClick={() => handleDownloadSinglePage(activePageIdx)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  {downloadingKey === `page-${activePageIdx + 1}` ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Download className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {currentBrochure.imageUrls.length > 1
                      ? `Unduh Halaman ${activePageIdx + 1}`
                      : 'Unduh Brosur'}
                  </span>
                </button>

                {currentBrochure.imageUrls.length > 1 && (
                  <button
                    type="button"
                    disabled={downloadingKey !== null}
                    onClick={handleDownloadFullPdf}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-950 hover:bg-emerald-900 disabled:opacity-60 transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    {downloadingKey === 'pdf-all' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-amber-300 shrink-0" />
                    )}
                    <span>Unduh Semua (PDF)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          12. FOOTER
         ===================================================================== */}
      <footer className="bg-stone-950 text-stone-300 py-12 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 pb-8 border-b border-stone-800">
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
              <p className="text-xs text-stone-400">
                Jln. Tuan Rio II, Tiyuh Bandar Dewa (Samping Pos Polisi Kalim Kaliming), Kec. Tulang Bawang Tengah, Kab. Tulang Bawang Barat, Lampung
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
                onClick={() => scrollToSection('spmb-2027')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                SPMB 2027–2028
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('target-lulusan')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Target Lulusan
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('biaya')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Rincian Biaya
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('informasi-pendaftaran')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Informasi Pendaftaran
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('brosur-spmb')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Brosur SPMB
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
          12. MODAL LIGHTBOX UKURAN PENUH & ZOOM BROSUR SPMB
         ===================================================================== */}
      {lightboxOpen && currentBrochure && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/92 backdrop-blur-xs flex flex-col justify-between p-3 sm:p-5"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top Control Bar */}
          <div
            className="max-w-6xl w-full mx-auto bg-stone-900/95 border border-stone-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{currentBrochure.title}</div>
              <div className="text-xs text-amber-300 font-mono">
                Halaman {lightboxPageIdx + 1} dari {currentBrochure.imageUrls.length} &middot; Tahun Ajaran {currentBrochure.academicYear}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                title="Perkecil (Zoom Out)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 tabular-nums">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setLightboxZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                title="Perbesar (Zoom In)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
                title="Reset Ukuran"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={downloadingKey !== null}
                onClick={() => handleDownloadSinglePage(lightboxPageIdx)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-emerald-950 hover:bg-amber-300 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {downloadingKey === `page-${lightboxPageIdx + 1}` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Unduh Hal. {lightboxPageIdx + 1}</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-lg bg-stone-800 hover:bg-rose-600 text-white transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Interactive Zoom & Page Switcher */}
          <div
            className="flex-1 my-3 overflow-auto flex items-center justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {currentBrochure.imageUrls.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxPageIdx(
                    (prev) =>
                      (prev - 1 + currentBrochure.imageUrls.length) %
                      currentBrochure.imageUrls.length
                  )
                }
                className="fixed left-3 sm:left-7 z-20 p-3 rounded-full bg-stone-900/90 hover:bg-emerald-900 text-white border border-stone-700 shadow-lg cursor-pointer"
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="max-h-full max-w-full overflow-auto flex items-center justify-center p-2">
              <img
                src={currentBrochure.imageUrls[lightboxPageIdx]}
                alt={`${currentBrochure.title} - Halaman ${lightboxPageIdx + 1}`}
                style={{
                  transform: `scale(${lightboxZoom})`,
                  transformOrigin: 'top center',
                }}
                className="max-h-[76vh] w-auto object-contain rounded-lg shadow-2xl transition-transform duration-150"
              />
            </div>

            {currentBrochure.imageUrls.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxPageIdx((prev) => (prev + 1) % currentBrochure.imageUrls.length)
                }
                className="fixed right-3 sm:right-7 z-20 p-3 rounded-full bg-stone-900/90 hover:bg-emerald-900 text-white border border-stone-700 shadow-lg cursor-pointer"
                aria-label="Halaman Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Page Selector */}
          {currentBrochure.imageUrls.length > 1 && (
            <div
              className="max-w-md mx-auto bg-stone-900/95 border border-stone-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {currentBrochure.imageUrls.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxPageIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    lightboxPageIdx === idx
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
