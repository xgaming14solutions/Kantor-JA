import React, { useState, useEffect, useRef } from 'react';
import { MyClassesView } from './MyClassesView';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_REPORT_CARDS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ACADEMIC_YEARS,
  DEMO_USERS
} from '../lib/mockData';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import { formatReportProgram, DEFAULT_PESANTREN_FACILITIES } from '../lib/dbService';
import { PesantrenFacilityItem } from '../types';
import {
  SchoolLogo,
  ProcessedLogoResult,
  validateAndPreviewLogoFile,
  uploadSchoolLogoWithFallback,
} from './SchoolLogo';
import {
  BookOpen,
  ClipboardList,
  CalendarDays,
  Award,
  UserCog,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  Database,
  School,
  UserCheck,
  MapPin,
  Save,
  AlertCircle,
  Info,
  Phone,
  Building2,
  Upload,
  Trash2,
  Image as ImageIcon,
  X,
  Loader2,
} from 'lucide-react';
import {
  uploadFacilityPhotoToStorage,
  deleteFacilityPhotoFromStorage,
} from '../lib/facilityPhotoService';
import { EducationFacilitiesMap } from '../types';
import { DEFAULT_EDUCATION_FACILITIES } from '../lib/dbService';

export const GenericModuleView: React.FC<{ tab: string }> = ({ tab }) => {
  const { role } = useAuth();
  const { activeAcademicYear, classes, students, schoolIdentity, saveSchoolIdentity } = useMasterData();

  const [formData, setFormData] = useState<{
    schoolName: string;
    programName: string;
    npsn: string;
    address: string;
    mudirName: string;
    mudirNip: string;
    leaderTitle: string;
    city: string;
    whatsapp: string;
    email: string;
    socialMedia: string;
    ppdbInfo: string;
    facilities: PesantrenFacilityItem[];
  }>({
    schoolName: schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan',
    programName: schoolIdentity.programName || 'PKBM AL-QOLAM',
    npsn: schoolIdentity.npsn || '',
    address:
      schoolIdentity.address ||
      'Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung',
    mudirName: schoolIdentity.mudirName || '',
    mudirNip: schoolIdentity.mudirNip || '',
    leaderTitle: schoolIdentity.leaderTitle || 'Mudir / Kepala Sekolah',
    city: schoolIdentity.city || 'Tulang Bawang Barat',
    whatsapp: schoolIdentity.whatsapp || '',
    email: schoolIdentity.email || '',
    socialMedia: schoolIdentity.socialMedia || '',
    ppdbInfo:
      schoolIdentity.ppdbInfo ||
      'Informasi penerimaan santri baru, persyaratan, tahapan pendaftaran, dan informasi pendidikan dapat diperoleh melalui kanal resmi Pesantren Islam Mutiara Insan.',
    facilities:
      Array.isArray(schoolIdentity.facilities) && schoolIdentity.facilities.length > 0
        ? schoolIdentity.facilities
        : DEFAULT_PESANTREN_FACILITIES,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Logo Sekolah / Pesantren state
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingLogo, setPendingLogo] = useState<ProcessedLogoResult | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);
  const [previewImgBroken, setPreviewImgBroken] = useState(false);

  // Foto Gedung & Jenjang Pendidikan state (TK, SD, SMP, SMA)
  const [uploadingFacilityLevel, setUploadingFacilityLevel] = useState<'tk' | 'sd' | 'smp' | 'sma' | null>(null);
  const [facilityPhotoSuccess, setFacilityPhotoSuccess] = useState<string | null>(null);
  const [facilityPhotoError, setFacilityPhotoError] = useState<string | null>(null);
  const [confirmDeleteFacilityLevel, setConfirmDeleteFacilityLevel] = useState<'tk' | 'sd' | 'smp' | 'sma' | null>(null);
  const [brokenFacilityImages, setBrokenFacilityImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setBrokenFacilityImages({});
  }, [schoolIdentity.educationFacilities]);

  const tkFacilityInputRef = useRef<HTMLInputElement | null>(null);
  const sdFacilityInputRef = useRef<HTMLInputElement | null>(null);
  const smpFacilityInputRef = useRef<HTMLInputElement | null>(null);
  const smaFacilityInputRef = useRef<HTMLInputElement | null>(null);

  const facilityInputRefs = {
    tk: tkFacilityInputRef,
    sd: sdFacilityInputRef,
    smp: smpFacilityInputRef,
    sma: smaFacilityInputRef,
  };

  const handleUploadFacilityPhoto = async (
    level: 'tk' | 'sd' | 'smp' | 'sma',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (facilityInputRefs[level].current) {
      facilityInputRefs[level].current!.value = '';
    }
    if (!file) return;

    if (!canManageIdentity) {
      setFacilityPhotoError('Akses Ditolak: Hanya Administrator yang dapat mengunggah foto gedung.');
      return;
    }

    setFacilityPhotoError(null);
    setFacilityPhotoSuccess(null);
    setUploadingFacilityLevel(level);

    try {
      const result = await uploadFacilityPhotoToStorage(level, file);
      const currentFacilities = schoolIdentity.educationFacilities || DEFAULT_EDUCATION_FACILITIES;
      const targetLevelData = currentFacilities[level] || DEFAULT_EDUCATION_FACILITIES[level];

      const levelTitleMap: Record<string, string> = {
        tk: 'Taman Kanak-kanak (TK)',
        sd: 'Sekolah Dasar (SD)',
        smp: 'Sekolah Menengah Pertama (SMP)',
        sma: 'Sekolah Menengah Atas (SMA)',
      };

      const updatedEducationFacilities: EducationFacilitiesMap = {
        ...currentFacilities,
        [level]: {
          ...targetLevelData,
          title: levelTitleMap[level] || targetLevelData?.title || level.toUpperCase(),
          imageUrl: result.downloadUrl,
          storagePath: result.storagePath,
          updatedAt: new Date().toISOString(),
        },
      };

      await saveSchoolIdentity({
        educationFacilities: updatedEducationFacilities,
      });

      setFacilityPhotoSuccess(`Foto gedung jenjang ${level.toUpperCase()} berhasil disimpan.`);
      setTimeout(() => setFacilityPhotoSuccess(null), 5000);
    } catch (err: any) {
      console.error(`Error uploading facility photo for ${level}:`, err);
      setFacilityPhotoError(err?.message || `Gagal mengunggah foto gedung jenjang ${level.toUpperCase()}.`);
    } finally {
      setUploadingFacilityLevel(null);
    }
  };

  const handleDeleteFacilityPhoto = async (level: 'tk' | 'sd' | 'smp' | 'sma') => {
    if (!canManageIdentity) {
      setFacilityPhotoError('Akses Ditolak: Hanya Administrator yang dapat menghapus foto gedung.');
      return;
    }

    setFacilityPhotoError(null);
    setFacilityPhotoSuccess(null);
    setUploadingFacilityLevel(level);

    try {
      const currentFacilities = schoolIdentity.educationFacilities || DEFAULT_EDUCATION_FACILITIES;
      const targetLevelData = currentFacilities[level] || DEFAULT_EDUCATION_FACILITIES[level];

      if (targetLevelData?.storagePath) {
        await deleteFacilityPhotoFromStorage(targetLevelData.storagePath);
      }

      const updatedEducationFacilities: EducationFacilitiesMap = {
        ...currentFacilities,
        [level]: {
          ...targetLevelData,
          imageUrl: '',
          storagePath: '',
          updatedAt: new Date().toISOString(),
        },
      };

      await saveSchoolIdentity({
        educationFacilities: updatedEducationFacilities,
      });

      setConfirmDeleteFacilityLevel(null);
      setFacilityPhotoSuccess(`Foto gedung jenjang ${level.toUpperCase()} berhasil dihapus dan dikembalikan ke placeholder.`);
      setTimeout(() => setFacilityPhotoSuccess(null), 5000);
    } catch (err: any) {
      console.error(`Error deleting facility photo for ${level}:`, err);
      setFacilityPhotoError(err?.message || `Gagal menghapus foto gedung jenjang ${level.toUpperCase()}.`);
    } finally {
      setUploadingFacilityLevel(null);
    }
  };

  const isAdmin = role === 'ADMIN';
  const canManageIdentity = role === 'ADMIN';

  const savedLogoUrl = (schoolIdentity.logoUrl || '').trim();
  const activePreviewLogoUrl = pendingLogo ? pendingLogo.previewDataUrl : savedLogoUrl;

  useEffect(() => {
    setPreviewImgBroken(false);
  }, [activePreviewLogoUrl]);

  const handleSelectLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    if (!file) return;
    if (!isAdmin) {
      setLogoError('Akses Ditolak: Hanya Administrator yang dapat mengubah logo sekolah.');
      return;
    }

    setLogoError(null);
    setLogoSuccess(null);
    setConfirmRemoveLogo(false);

    try {
      const processed = await validateAndPreviewLogoFile(file);
      setPendingLogo(processed);
    } catch (err: any) {
      setPendingLogo(null);
      setLogoError(err?.message || 'Gagal memproses file logo yang dipilih.');
    }
  };

  const handleCancelPendingLogo = () => {
    setPendingLogo(null);
    setLogoError(null);
    setConfirmRemoveLogo(false);
  };

  const handleSaveLogo = async () => {
    if (!pendingLogo) return;
    if (!isAdmin) {
      setLogoError('Akses Ditolak: Hanya Administrator yang dapat menyimpan logo sekolah.');
      return;
    }
    setLogoError(null);
    setLogoSuccess(null);
    setIsSavingLogo(true);
    try {
      const finalLogoUrl = await uploadSchoolLogoWithFallback(pendingLogo);
      await saveSchoolIdentity({
        logoUrl: finalLogoUrl,
        logoRemoved: false,
      });
      setPendingLogo(null);
      setLogoSuccess(
        'Logo Sekolah / Pesantren berhasil disimpan dan langsung diterapkan di seluruh aplikasi.'
      );
      setTimeout(() => setLogoSuccess(null), 5000);
    } catch (err: any) {
      setLogoError(err?.message || 'Gagal menyimpan logo sekolah.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleConfirmRemoveLogo = async () => {
    if (!isAdmin) {
      setLogoError('Akses Ditolak: Hanya Administrator yang dapat menghapus logo sekolah.');
      return;
    }
    setLogoError(null);
    setLogoSuccess(null);
    setIsSavingLogo(true);
    try {
      await saveSchoolIdentity({
        logoUrl: '',
        logoRemoved: true,
      });
      setPendingLogo(null);
      setConfirmRemoveLogo(false);
      setLogoSuccess('Logo sekolah berhasil dihapus dan dikembalikan ke ikon standar.');
      setTimeout(() => setLogoSuccess(null), 5000);
    } catch (err: any) {
      setLogoError(err?.message || 'Gagal menghapus logo sekolah.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  // Sync form state whenever schoolIdentity loads or updates from Firestore
  useEffect(() => {
    setFormData({
      schoolName: schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan',
      programName: schoolIdentity.programName || 'PKBM AL-QOLAM',
      npsn: schoolIdentity.npsn || '',
      address:
        schoolIdentity.address ||
        'Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung',
      mudirName: schoolIdentity.mudirName || '',
      mudirNip: schoolIdentity.mudirNip || '',
      leaderTitle: schoolIdentity.leaderTitle || 'Mudir / Kepala Sekolah',
      city: schoolIdentity.city || 'Tulang Bawang Barat',
      whatsapp: schoolIdentity.whatsapp || '',
      email: schoolIdentity.email || '',
      socialMedia: schoolIdentity.socialMedia || '',
      ppdbInfo:
        schoolIdentity.ppdbInfo ||
        'Informasi penerimaan santri baru, persyaratan, tahapan pendaftaran, dan informasi pendidikan dapat diperoleh melalui kanal resmi Pesantren Islam Mutiara Insan.',
      facilities:
        Array.isArray(schoolIdentity.facilities) && schoolIdentity.facilities.length > 0
          ? schoolIdentity.facilities
          : DEFAULT_PESANTREN_FACILITIES,
    });
  }, [schoolIdentity]);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);

    if (!formData.schoolName.trim()) {
      setSaveError('Nama Lembaga/Sekolah wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      let nextLogoUrl = schoolIdentity.logoUrl || '';
      let nextLogoRemoved = schoolIdentity.logoRemoved === true;
      if (pendingLogo) {
        nextLogoUrl = await uploadSchoolLogoWithFallback(pendingLogo);
        nextLogoRemoved = false;
      }
      await saveSchoolIdentity({
        schoolName: formData.schoolName.trim(),
        programName: formData.programName.trim() || 'PKBM AL-QOLAM',
        npsn: formData.npsn.trim(),
        address: formData.address.trim(),
        mudirName: formData.mudirName.trim(),
        mudirNip: formData.mudirNip.trim(),
        leaderTitle: formData.leaderTitle.trim() || 'Mudir / Kepala Sekolah',
        city: formData.city.trim() || 'Tulang Bawang Barat',
        logoUrl: nextLogoUrl,
        logoRemoved: nextLogoRemoved,
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim(),
        socialMedia: formData.socialMedia.trim(),
        ppdbInfo: formData.ppdbInfo.trim(),
        facilities: formData.facilities,
        educationFacilities: schoolIdentity.educationFacilities || DEFAULT_EDUCATION_FACILITIES,
      });
      if (pendingLogo) {
        setPendingLogo(null);
      }
      setSaveSuccess('Identitas Pesantren, Logo, Kontak Publik, Fasilitas, dan Data Mudir berhasil disimpan ke database.');
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setSaveError(err?.message || 'Gagal menyimpan pengaturan identitas sekolah.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mata Pelajaran View
  if (tab === 'subjects') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mata Pelajaran</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kurikulum mata pelajaran dan Kriteria Ketuntasan Minimal (KKM)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode Mapel</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Standar KKM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_SUBJECTS.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{s.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-indigo-600">{s.kkm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Penugasan Guru View
  if (tab === 'assignments') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Penugasan Guru (Jadwal & Rombel)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Relasi penugasan: teacherId &harr; classId &harr; subjectId &harr; academicYearId
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Beban Ajar</th>
                <th className="py-3 px-4">Tahun Ajaran / Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_ASSIGNMENTS.map((asg) => {
                const t = INITIAL_TEACHERS.find((item) => item.id === asg.teacherId);
                const c = INITIAL_CLASSES.find((item) => item.id === asg.classId);
                const s = INITIAL_SUBJECTS.find((item) => item.id === asg.subjectId);

                return (
                  <tr key={asg.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{t?.name || asg.teacherId}</div>
                      <div className="text-[11px] text-slate-400 font-mono">NIP. {t?.nip}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-indigo-700">{s?.name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c?.name}</td>
                    <td className="py-3 px-4 text-slate-600">{asg.totalHoursPerWeek} Jam/Minggu</td>
                    <td className="py-3 px-4 text-slate-500">2025/2026 ({asg.semester})</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Kelas & Mapel Saya (Khusus Guru Mapel)
  if (tab === 'my-classes') {
    return <MyClassesView />;
  }

  // Rapor View
  if (tab === 'report-cards') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Rapor Siswa</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi pencapaian akademik, kehadiran, dan catatan perkembangan peserta didik
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>Tahun Ajaran:</span>
            <strong className="text-slate-900 font-semibold">
              {activeAcademicYear ? `${activeAcademicYear.name} - ${activeAcademicYear.semester}` : 'Belum Ada'}
            </strong>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">Rata-Rata Nilai</th>
                <th className="py-3 px-4">Kehadiran (H/S/I/A)</th>
                <th className="py-3 px-4">Catatan Wali Kelas</th>
                <th className="py-3 px-4">Status Rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_REPORT_CARDS.map((rc) => {
                const st = INITIAL_STUDENTS.find((item) => item.id === rc.studentId);
                const cl = INITIAL_CLASSES.find((item) => item.id === rc.classId);

                return (
                  <tr key={rc.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{st?.name}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{cl?.name}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-600">{rc.averageScore}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {rc.attendanceSummary?.hadir} / {rc.attendanceSummary?.sakit} / {rc.attendanceSummary?.izin} / {rc.attendanceSummary?.alpa}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic max-w-xs">{rc.homeroomNotes}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {rc.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Tahun Ajaran View
  if (tab === 'academic-years') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tahun Ajaran</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen periode kalender akademik dan semester aktif
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_ACADEMIC_YEARS.map((ay) => (
                <tr key={ay.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{ay.name}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{ay.semester}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {ay.startDate} s/d {ay.endDate}
                  </td>
                  <td className="py-3 px-4">
                    {ay.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                        Arsip
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Pengguna View (Users & Roles)
  if (tab === 'users') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna (RBAC)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar akun dan hak akses pengguna AKSARA pada Firestore collection <code>users</code>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Role Akses</th>
                <th className="py-3 px-4">Relasi Guru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_USERS.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-3 px-4 text-slate-700">{u.email}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{u.nip || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {u.teacherId || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Settings View (Pengaturan Sekolah & Data Mudir)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-indigo-600" />
            Pengaturan Sekolah &amp; Data Mudir
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi resmi identitas lembaga dan data pimpinan (Mudir/Kepala Sekolah) sebagai sumber data utama Cetak Rapor
          </p>
        </div>
        {schoolIdentity.updatedAt && (
          <div className="text-[11px] text-slate-400 font-mono">
            Terakhir diperbarui: {new Date(schoolIdentity.updatedAt).toLocaleString('id-ID')}
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Column: Logo Card + Form Edit Identitas Sekolah */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Logo Sekolah / Pesantren */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE5E8] shadow-xs space-y-4">
            <div className="border-b border-[#EBF0F2] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#24343D] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#24485A]" />
                  <span>Logo Sekolah / Pesantren</span>
                </h3>
                <p className="text-[11px] text-[#71818A] mt-0.5 leading-relaxed">
                  Logo ini digunakan sebagai identitas aplikasi dan dapat ditampilkan pada halaman profil, dashboard, cetak rapor, laporan, dan dokumen resmi.
                </p>
              </div>
              {pendingLogo ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FDF7EB] text-[#B47D1E] border border-[#F3DFB8] self-start sm:self-auto shrink-0">
                  Pratinjau Logo Baru (Belum Disimpan)
                </span>
              ) : savedLogoUrl && !previewImgBroken ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#EFF7F2] text-[#35694E] border border-[#CBE4D5] self-start sm:self-auto shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5D9B7A]" />
                  Logo Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#F4F7F8] text-[#71818A] border border-[#DCE5E8] self-start sm:self-auto shrink-0">
                  Belum ada logo
                </span>
              )}
            </div>

            {logoSuccess && (
              <div className="p-3.5 rounded-xl bg-[#EFF7F2] border border-[#CBE4D5] text-[#35694E] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5D9B7A] shrink-0" />
                <span>{logoSuccess}</span>
              </div>
            )}

            {logoError && (
              <div className="p-3.5 rounded-xl bg-[#FBF1F1] border border-[#EBC6C6] text-[#A84848] text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#C96A6A] shrink-0" />
                <span>{logoError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-[#F4F7F8]/70 border border-[#DCE5E8]">
              {/* [ Preview Logo ] */}
              <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl bg-white border border-[#DCE5E8] shadow-2xs flex flex-col items-center justify-center p-3 shrink-0 overflow-hidden">
                {activePreviewLogoUrl && !previewImgBroken ? (
                  <img
                    src={activePreviewLogoUrl}
                    alt={`Logo ${formData.schoolName || 'Sekolah'}`}
                    onError={() => setPreviewImgBroken(true)}
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-[#71818A] gap-1.5 px-2">
                    <div className="w-11 h-11 rounded-xl bg-[#F0F5F7] border border-[#DCE5E8] text-[#5D8295] flex items-center justify-center">
                      <School className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#24343D]">Belum ada logo</span>
                    <span className="text-[10px] text-[#71818A] leading-tight">
                      Gunakan tombol Upload Logo
                    </span>
                  </div>
                )}
              </div>

              {/* Controls & File Info */}
              <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#24343D]">
                    {formData.schoolName || schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan'}
                  </div>
                  <p className="text-[11px] text-[#71818A] leading-relaxed">
                    Format yang didukung: <strong>PNG, JPG, JPEG, WEBP</strong> &bull; Ukuran maksimal: <strong>2 MB</strong>. Rasio gambar asli akan dipertahankan secara proporsional (tidak gepeng atau terpotong).
                  </p>
                  {pendingLogo && (
                    <div className="text-[11px] font-mono text-[#24485A] bg-white px-2.5 py-1.5 rounded-lg border border-[#DCE5E8] inline-block mt-1">
                      File terpilih: <strong>{pendingLogo.fileName}</strong> ({pendingLogo.width}&times;{pendingLogo.height}px &bull;{' '}
                      {(pendingLogo.originalSize / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={handleSelectLogoFile}
                  className="hidden"
                />

                {canManageIdentity ? (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                    {/* [ Ubah Logo / Upload Logo ] */}
                    <button
                      type="button"
                      disabled={isSavingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#24485A] text-white hover:bg-[#1C3948] transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{savedLogoUrl && !previewImgBroken ? 'Ubah Logo' : 'Upload Logo'}</span>
                    </button>

                    {/* [ Simpan Logo ] & [ Batal ] when a new logo is previewed */}
                    {pendingLogo && (
                      <>
                        <button
                          type="button"
                          disabled={isSavingLogo}
                          onClick={handleSaveLogo}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#5D9B7A] text-white hover:bg-[#4B8567] transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingLogo ? 'Menyimpan Logo...' : 'Simpan Logo'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingLogo}
                          onClick={handleCancelPendingLogo}
                          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#24343D] border border-[#DCE5E8] hover:bg-[#F4F7F8] transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batal</span>
                        </button>
                      </>
                    )}

                    {/* [ Hapus Logo ] when logo exists */}
                    {savedLogoUrl && !pendingLogo && !confirmRemoveLogo && (
                      <button
                        type="button"
                        disabled={isSavingLogo}
                        onClick={() => setConfirmRemoveLogo(true)}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#FBF1F1] text-[#C96A6A] border border-[#EBC6C6] hover:bg-[#F5E1E1] transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white border border-[#DCE5E8] text-[11px] text-[#71818A] inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#24485A] shrink-0" />
                    <span>Mode Lihat Saja &mdash; Hanya Administrator yang dapat mengubah atau menghapus logo sekolah.</span>
                  </div>
                )}

                {/* In-app Confirmation to Remove Logo */}
                {confirmRemoveLogo && (
                  <div className="p-3 rounded-xl bg-[#FBF1F1] border border-[#EBC6C6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
                    <span className="text-[#A84848] font-medium">
                      Hapus logo sekolah saat ini? Aplikasi akan kembali menampilkan ikon standar.
                    </span>
                    <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isSavingLogo}
                        onClick={handleConfirmRemoveLogo}
                        className="px-3 py-1.5 rounded-lg bg-[#C96A6A] text-white font-semibold hover:bg-[#B25555] transition cursor-pointer disabled:opacity-50"
                      >
                        {isSavingLogo ? 'Menghapus...' : 'Ya, Hapus Logo'}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingLogo}
                        onClick={() => setConfirmRemoveLogo(false)}
                        className="px-3 py-1.5 rounded-lg bg-white text-[#24343D] border border-[#DCE5E8] font-semibold hover:bg-[#F4F7F8] transition cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Foto Gedung & Jenjang Pendidikan (TK, SD, SMP, SMA) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#DCE5E8] shadow-xs space-y-4">
            <div className="border-b border-[#EBF0F2] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#24343D] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#24485A]" />
                  <span>Foto Gedung &amp; Jenjang Pendidikan</span>
                </h3>
                <p className="text-[11px] text-[#71818A] mt-0.5 leading-relaxed">
                  Kelola foto gedung dan sarana untuk setiap jenjang pendidikan (TK, SD, SMP, SMA) yang ditampilkan pada profil publik Pesantren Islam Mutiara Insan.
                </p>
              </div>
            </div>

            {facilityPhotoSuccess && (
              <div className="p-3.5 rounded-xl bg-[#EFF7F2] border border-[#CBE4D5] text-[#35694E] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#5D9B7A] shrink-0" />
                <span>{facilityPhotoSuccess}</span>
              </div>
            )}

            {facilityPhotoError && (
              <div className="p-3.5 rounded-xl bg-[#FBF1F1] border border-[#EBC6C6] text-[#A84848] text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#C96A6A] shrink-0" />
                <span>{facilityPhotoError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { key: 'tk', label: 'TK', fullName: 'Taman Kanak-kanak (TK)' },
                  { key: 'sd', label: 'SD', fullName: 'Sekolah Dasar (SD)' },
                  { key: 'smp', label: 'SMP', fullName: 'Sekolah Menengah Pertama (SMP)' },
                  { key: 'sma', label: 'SMA', fullName: 'Sekolah Menengah Atas (SMA)' },
                ] as const
              ).map((item) => {
                const facilityData =
                  schoolIdentity.educationFacilities?.[item.key] ||
                  DEFAULT_EDUCATION_FACILITIES[item.key];
                const hasPhoto = Boolean(facilityData?.imageUrl?.trim());
                const isUploadingThis = uploadingFacilityLevel === item.key;
                const isConfirmingDelete = confirmDeleteFacilityLevel === item.key;

                return (
                  <div
                    key={item.key}
                    className="p-4 rounded-xl bg-[#F4F7F8]/70 border border-[#DCE5E8] flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#EBF0F2] pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-[#24485A] text-white text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          {item.label}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#24343D] truncate">{item.fullName}</h4>
                          <span className="text-[10px] text-[#71818A] block">
                            {hasPhoto ? 'Foto tersimpan' : 'Foto belum tersedia'}
                          </span>
                        </div>
                      </div>
                      {hasPhoto ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EFF7F2] text-[#35694E] border border-[#CBE4D5] shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-[#5D9B7A]" />
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-500 border border-stone-200 shrink-0">
                          Belum ada foto
                        </span>
                      )}
                    </div>

                    {/* Preview Foto */}
                    <div className="relative w-full aspect-16/10 rounded-xl overflow-hidden bg-white border border-[#DCE5E8] flex items-center justify-center">
                      {hasPhoto && !brokenFacilityImages[item.key] ? (
                        <img
                          src={(facilityData?.imageUrl || '').replace(/^\/uploads\/schoolIdentity\/education\//, '/education/')}
                          alt={`Gedung ${item.label} Pesantren Islam Mutiara Insan`}
                          onError={() => {
                            console.warn(`[Identitas Sekolah] Gagal memuat foto gedung jenjang ${item.label.toUpperCase()}:`, facilityData?.imageUrl);
                            setBrokenFacilityImages((prev) => ({ ...prev, [item.key]: true }));
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-[#71818A] space-y-1">
                          <Building2 className="w-7 h-7 text-[#5D8295]" />
                          <span className="text-xs font-semibold text-[#24343D]">Foto gedung belum tersedia</span>
                          <span className="text-[10px] text-[#71818A] leading-tight">
                            Gunakan tombol Upload Foto
                          </span>
                        </div>
                      )}

                      {isUploadingThis && (
                        <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center text-xs font-semibold text-[#24485A] gap-2 p-3 text-center">
                          <Loader2 className="w-5 h-5 animate-spin text-[#24485A]" />
                          <span>Mengunggah foto gedung...</span>
                        </div>
                      )}
                    </div>

                    {/* Hidden File Input */}
                    <input
                      ref={facilityInputRefs[item.key]}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                      onChange={(e) => handleUploadFacilityPhoto(item.key, e)}
                      className="hidden"
                    />

                    {/* Action Controls */}
                    {canManageIdentity ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isUploadingThis}
                            onClick={() => facilityInputRefs[item.key].current?.click()}
                            className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl bg-[#24485A] text-white hover:bg-[#1C3948] transition inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{hasPhoto ? 'Ubah Foto' : 'Upload Foto'}</span>
                          </button>

                          {hasPhoto && !isConfirmingDelete && (
                            <button
                              type="button"
                              disabled={isUploadingThis}
                              onClick={() => setConfirmDeleteFacilityLevel(item.key)}
                              className="py-1.5 px-3 text-xs font-semibold rounded-xl bg-[#FBF1F1] text-[#C96A6A] border border-[#EBC6C6] hover:bg-[#F5E1E1] transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus Foto</span>
                            </button>
                          )}
                        </div>

                        {/* In-card Confirmation for Delete */}
                        {isConfirmingDelete && (
                          <div className="p-2.5 rounded-xl bg-[#FBF1F1] border border-[#EBC6C6] text-xs space-y-2">
                            <p className="text-[#A84848] text-[11px] font-medium leading-tight">
                              Hapus foto gedung {item.label}? Tampilan akan kembali ke placeholder belum tersedia.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isUploadingThis}
                                onClick={() => handleDeleteFacilityPhoto(item.key)}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#C96A6A] text-white hover:bg-[#B25555] transition cursor-pointer disabled:opacity-50"
                              >
                                {isUploadingThis ? 'Menghapus...' : 'Ya, Hapus'}
                              </button>
                              <button
                                type="button"
                                disabled={isUploadingThis}
                                onClick={() => setConfirmDeleteFacilityLevel(null)}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white text-[#24343D] border border-[#DCE5E8] hover:bg-[#F4F7F8] transition cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-white border border-[#DCE5E8] text-[10px] text-[#71818A] flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-[#24485A] shrink-0" />
                        <span>Mode Lihat Saja</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Edit Identitas Sekolah & Data Mudir */}
          <form
            onSubmit={handleSaveIdentity}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5"
          >
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600" />
              1. Identitas Lembaga / Sekolah
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Data ini akan langsung tampil pada kop dan informasi sekolah di lembar Cetak Rapor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lembaga/Sekolah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                placeholder="Contoh: Pesantren Islam Mutiara Insan"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Program (PKBM / Penyelenggara) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.programName}
                onChange={(e) => setFormData({ ...formData, programName: e.target.value })}
                placeholder="Contoh: PKBM AL-QOLAM"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Keterangan <strong>(Paket B)</strong> untuk Kelas VII–IX dan <strong>(Paket C)</strong> untuk Kelas X–XII akan ditambahkan secara otomatis pada Cetak Rapor sesuai kelas siswa.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NPSN
              </label>
              <input
                type="text"
                value={formData.npsn}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                placeholder="Contoh: 20108899"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kota/Kabupaten (Tempat Tanda Tangan Rapor)
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Contoh: Tulang Bawang Barat"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Sekolah <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Contoh: Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>
          </div>

          <div className="border-t border-b border-slate-100 py-3 pt-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              2. Data Pimpinan (Mudir / Kepala Sekolah)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Digunakan khusus untuk identitas pimpinan yang menandatangani rapor. Mudir tidak perlu dimasukkan ke menu Data Guru apabila tidak mengajar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Mudir/Kepala Sekolah
              </label>
              <input
                type="text"
                value={formData.mudirName}
                onChange={(e) => setFormData({ ...formData, mudirName: e.target.value })}
                placeholder="Contoh: Ust. H. Ahmad Fauzi, Lc., M.Ag."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP/NIK Mudir
              </label>
              <input
                type="text"
                value={formData.mudirNip}
                onChange={(e) => setFormData({ ...formData, mudirNip: e.target.value })}
                placeholder="Contoh: 197503122000031001 atau -"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jabatan Pimpinan
              </label>
              <input
                type="text"
                value={formData.leaderTitle}
                onChange={(e) => setFormData({ ...formData, leaderTitle: e.target.value })}
                placeholder="Contoh: Mudir / Kepala Sekolah"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="border-t border-b border-slate-100 py-3 pt-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-700" />
              3. Kontak Resmi &amp; Informasi Penerimaan Santri (Halaman Profil Publik)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ditampilkan pada halaman depan profil resmi Pesantren Islam Mutiara Insan. Kosongkan jika belum tersedia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor WhatsApp Resmi
              </label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="Belum diatur (opsional)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Resmi Pesantren
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Belum diatur (opsional)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Media Sosial Resmi
              </label>
              <input
                type="text"
                value={formData.socialMedia}
                onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })}
                placeholder="Belum diatur (opsional)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Informasi Penerimaan Santri Baru (PPDB)
              </label>
              <textarea
                rows={2}
                value={formData.ppdbInfo}
                onChange={(e) => setFormData({ ...formData, ppdbInfo: e.target.value })}
                placeholder="Informasi pendaftaran santri baru..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="border-t border-b border-slate-100 py-3 pt-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              4. Daftar Fasilitas Pesantren (Halaman Profil Publik)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Centang fasilitas yang tersedia di pesantren agar tampil pada halaman profil depan.
            </p>
          </div>

          <div className="space-y-2.5">
            {formData.facilities.map((fac, idx) => (
              <div
                key={fac.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 sm:w-56 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fac.isAvailable}
                    onChange={(e) => {
                      const next = [...formData.facilities];
                      next[idx] = { ...fac, isAvailable: e.target.checked };
                      setFormData({ ...formData, facilities: next });
                    }}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>{fac.name}</span>
                </label>
                <input
                  type="text"
                  value={fac.description}
                  onChange={(e) => {
                    const next = [...formData.facilities];
                    next[idx] = { ...fac, description: e.target.value };
                    setFormData({ ...formData, facilities: next });
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Deskripsi fasilitas..."
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] rounded-xl transition shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Identitas Sekolah'}
            </button>
          </div>
          </form>
        </div>

        {/* Live Preview Panel for Report Card */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Info className="w-4 h-4 text-[#24485A]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pratinjau pada Cetak Rapor &amp; Aplikasi
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Kop &amp; Identitas Sekolah di Rapor:
              </div>
              <div className="flex items-center gap-3 pb-2.5 border-b border-slate-200">
                <SchoolLogo
                  logoUrl={activePreviewLogoUrl}
                  schoolName={formData.schoolName || 'Pesantren Islam Mutiara Insan'}
                  size="md"
                  variant="light"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate">
                    {formData.schoolName || 'Pesantren Islam Mutiara Insan'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {formData.programName || 'PKBM AL-QOLAM'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[105px_8px_1fr] gap-y-1.5 text-[11px]">
                <span className="text-slate-500">Nama Sekolah</span>
                <span>:</span>
                <span className="font-bold text-slate-900">{formData.schoolName || '-'}</span>

                <span className="text-slate-500">Program (VII–IX)</span>
                <span>:</span>
                <span className="font-semibold text-indigo-700">
                  {formatReportProgram(formData.programName, { name: 'VII', gradeLevel: 7 })}
                </span>

                <span className="text-slate-500">Program (X–XII)</span>
                <span>:</span>
                <span className="font-semibold text-indigo-700">
                  {formatReportProgram(formData.programName, { name: 'X', gradeLevel: 10 })}
                </span>

                <span className="text-slate-500">Alamat</span>
                <span>:</span>
                <span className="text-slate-800">{formData.address || '-'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
                Blok Tanda Tangan Pimpinan:
              </div>
              <div className="pt-1 text-[11px] text-slate-600">
                <p className="text-right text-[10px] text-slate-500 mb-2">
                  {formData.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p>Mengetahui</p>
                <p className="font-semibold text-slate-800">
                  {formData.leaderTitle || 'Mudir / Kepala Sekolah'}
                </p>
                <div className="h-10" />
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-36">
                  {formData.mudirName || '(..........................................)'}
                </p>
                {formData.mudirNip && (
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    NIP/NIK. {formData.mudirNip}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-800 leading-relaxed">
              Perubahan yang disimpan pada halaman ini akan langsung tersimpan di Firestore dan otomatis digunakan pada halaman <strong>Cetak Rapor</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
