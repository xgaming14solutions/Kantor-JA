import React, { useState, useMemo } from 'react';
import {
  KesantrianRecord,
  KesantrianRecordType,
  KesantrianMedicine,
  KesantrianFollowUp,
  Student,
  getKesantrianOfficerLabel,
  isKepalaKesantrianUser,
  isKesantrianOfficerRole,
} from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import { PelanggaranSantriSection } from './PelanggaranSantriSection';
import { MabitKepulanganSection, formatIndonesianDate } from './MabitKepulanganSection';
import { LaporanKesantrianSection } from './LaporanKesantrianSection';
import {
  ShieldAlert,
  HeartPulse,
  DoorOpen,
  Moon,
  Pill,
  LayoutDashboard,
  Plus,
  Search,
  Edit2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  MessageSquarePlus,
  Users,
  ClipboardCheck,
  Phone,
} from 'lucide-react';

interface KesantrianViewProps {
  tab: string;
  onNavigate: (tab: string) => void;
}

const RECORD_TYPE_CONFIG: Record<
  KesantrianRecordType,
  {
    label: string;
    menuTitle: string;
    subtitle: string;
    badgeClass: string;
    categories: string[];
    statuses: string[];
    titleLabel: string;
    titlePlaceholder: string;
    descLabel: string;
    descPlaceholder: string;
    actionLabel: string;
    actionPlaceholder: string;
  }
> = {
  PELANGGARAN: {
    label: 'Pelanggaran Santri',
    menuTitle: 'Pelanggaran Santri',
    subtitle: 'Pencatatan dan pemantauan kedisiplinan, tata tertib, serta pembinaan santri',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    categories: ['Ringan', 'Sedang', 'Berat'],
    statuses: ['Tercatat', 'Dalam Pembinaan', 'Selesai'],
    titleLabel: 'Jenis / Bentuk Pelanggaran',
    titlePlaceholder: 'Contoh: Terlambat mengikuti apel pagi / tidak memakai atribut lengkap',
    descLabel: 'Kronologi / Keterangan Kejadian',
    descPlaceholder: 'Jelaskan detail kejadian pelanggaran...',
    actionLabel: 'Tindakan Pembinaan / Sanksi',
    actionPlaceholder: 'Contoh: Nasihat lisan, hafalan surat pendek, atau pemanggilan wali',
  },
  SAKIT: {
    label: 'Santri Sakit',
    menuTitle: 'Santri Sakit',
    subtitle: 'Pencatatan kondisi kesehatan santri, keluhan medis, pemulangan sakit, dan pemantauan kesembuhan',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    categories: ['Rawat UKS / Asrama', 'Rujuk Klinik / Puskesmas', 'Rujuk Rumah Sakit', 'Istirahat Pulang'],
    statuses: [
      'Sedang Sakit',
      'Perlu Dijemput Orang Tua',
      'Dipulangkan karena Sakit',
      'Masa Pemulihan',
      'Sudah Sembuh',
    ],
    titleLabel: 'Keluhan / Gejala Sakit',
    titlePlaceholder: 'Contoh: Demam tinggi dan batuk sejak malam',
    descLabel: 'Diagnosa / Keterangan Pemeriksaan',
    descPlaceholder: 'Catatan pemeriksaan suhu tubuh atau kondisi santri...',
    actionLabel: 'Penanganan & Obat yang Diberikan',
    actionPlaceholder: 'Contoh: Istirahat di UKS, diberikan Paracetamol 500mg',
  },
  IZIN_PULANG: {
    label: 'Izin / Pulang Santri',
    menuTitle: 'Izin / Pulang Santri',
    subtitle: 'Administrasi perizinan keluar komplek pesantren, pemantauan batas kembali, dan kondisi santri',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    categories: ['Izin Pulang ke Rumah', 'Izin Keluar Sementara', 'Keperluan Keluarga', 'Kontrol Kesehatan'],
    statuses: ['Sedang Izin', 'Belum Kembali', 'Terlambat Kembali', 'Sudah Kembali'],
    titleLabel: 'Alasan / Keperluan Izin',
    titlePlaceholder: 'Contoh: Menghadiri acara keluarga / kontrol dokter spesialis',
    descLabel: 'Keterangan Tambahan / Alamat Tujuan',
    descPlaceholder: 'Detail alamat tujuan atau catatan izin...',
    actionLabel: 'Nama Penjemput / Wali Santri',
    actionPlaceholder: 'Contoh: Dijemput oleh Ayah kandung (Bpk. Ahmad)',
  },
  MABIT: {
    label: 'Mabit & Kepulangan Santri',
    menuTitle: 'Mabit & Kepulangan Santri',
    subtitle: 'Pencatatan jadwal kepulangan santri pada periode Mabit dan pemantauan waktu kembali ke pesantren.',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    categories: ['Kepulangan Mabit'],
    statuses: ['Belum Kembali', 'Sudah Kembali'],
    titleLabel: 'Periode Mabit',
    titlePlaceholder: 'Contoh: Mabit Periode 1',
    descLabel: 'Catatan Kepulangan Mabit',
    descPlaceholder: 'Catatan jadwal kepulangan Mabit...',
    actionLabel: 'Status Kepulangan',
    actionPlaceholder: 'Belum Kembali / Sudah Kembali',
  },
  OBAT_P3K: {
    label: 'Obat & P3K',
    menuTitle: 'Obat & P3K',
    subtitle: 'Pencatatan distribusi kebutuhan obat santri dan inventaris perlengkapan P3K',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    categories: ['Pemberian Obat Dalam', 'Obat Luar / P3K Luka', 'Vitamin / Suplemen', 'Titipan Obat Wali'],
    statuses: ['Sudah Diberikan', 'Konsumsi Rutin', 'Selesai'],
    titleLabel: 'Nama Obat / Tindakan P3K',
    titlePlaceholder: 'Contoh: Paracetamol 500mg / Perban & Antiseptik Luka',
    descLabel: 'Keluhan / Indikasi Pemberian Obat',
    descPlaceholder: 'Contoh: Sakit kepala ringan setelah kegiatan lapangan...',
    actionLabel: 'Dosis / Jumlah & Aturan Pakai',
    actionPlaceholder: 'Contoh: 1 tablet sesudah makan (3x1)',
  },
};

export const KesantrianView: React.FC<KesantrianViewProps> = ({ tab, onNavigate }) => {
  const { currentUser, role } = useAuth();
  const {
    students = [],
    classes = [],
    academicYears = [],
    activeAcademicYear,
    kesantrianRecords = [],
    kesantrianMedicines = [],
    mabitPeriods = [],
    saveKesantrianRecord,
    saveKesantrianMedicine,
  } = useMasterData();

  // Map current tab to active section (No duplicate Data Santri menu)
  const activeSection = useMemo(() => {
    switch (tab) {
      case 'kesantrian-pelanggaran':
        return 'PELANGGARAN';
      case 'kesantrian-sakit':
        return 'SAKIT';
      case 'kesantrian-izin':
        return 'IZIN_PULANG';
      case 'kesantrian-mabit':
        return 'MABIT';
      case 'kesantrian-obat':
        return 'OBAT_P3K';
      case 'kesantrian-laporan':
        return 'LAPORAN';
      case 'kesantrian-dashboard':
      case 'dashboard':
      default:
        return 'DASHBOARD';
    }
  }, [tab]);

  // Filters for records table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedRecordCategory, setSelectedRecordCategory] = useState<string>('ALL');

  // Search filter inside "Pilih Santri" modal
  const [studentPickerQuery, setStudentPickerQuery] = useState('');

  // Modals for Kesantrian Records
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KesantrianRecord | null>(null);
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null);

  // Officer identity determined strictly from the logged-in account (Kepala Kesantrian & Musyrif are 2 distinct accounts)
  const currentOfficerLabel = getKesantrianOfficerLabel(currentUser);
  const isKepalaKesantrian = isKepalaKesantrianUser(currentUser);
  const currentActorName =
    currentUser?.displayName || currentUser?.name || currentUser?.username || 'Petugas Kesantrian';

  // Monitoring filter on Dashboard Kesantrian
  const [monitoringCategoryFilter, setMonitoringCategoryFilter] = useState<
    | 'ALL'
    | 'SAKIT_3_HARI'
    | 'BELUM_TINDAK_LANJUT'
    | 'PELANGGARAN'
    | 'SAKIT'
    | 'IZIN_PULANG'
    | 'BELUM_KEMBALI'
    | 'MABIT'
  >('ALL');

  // Follow-up & evaluation form state inside Detail Modal
  const [followUpDate, setFollowUpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpCondition, setFollowUpCondition] = useState('');
  const [headEvalInput, setHeadEvalInput] = useState('');

  // Quick update state inside Detail Modal for Sick Leave (Dijemput Orang Tua) & Recovery / Return confirmation
  const [showSickLeaveBox, setShowSickLeaveBox] = useState(false);
  const [sickLeaveBoxForm, setSickLeaveBoxForm] = useState({
    needsParentPickup: true,
    sickLeaveDate: new Date().toISOString().split('T')[0],
    sickLeaveReason: '',
    conditionAtLeave: '',
    parentNotes: '',
    estimatedReturnDate: '',
  });
  const [showRecoveryBox, setShowRecoveryBox] = useState(false);
  const [recoveryBoxForm, setRecoveryBoxForm] = useState({
    recoveredConfirmedDate: new Date().toISOString().split('T')[0],
    returnToPesantrenDate: new Date().toISOString().split('T')[0],
    conditionAtReturn: '',
    recoveryAdditionalNotes: '',
  });

  // Filters for Laporan Kesantrian section
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('ALL');
  const [reportClassFilter, setReportClassFilter] = useState<string>('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL');
  const [reportYearFilter, setReportYearFilter] = useState<string>('ALL');
  const [reportSemesterFilter, setReportSemesterFilter] = useState<string>('ALL');
  const [reportMonthFilter, setReportMonthFilter] = useState<string>('ALL');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');

  // Rekap & Pemantauan Seluruh Santri (Dashboard Kesantrian - Tanpa Pembagian Binaan)
  const [santriMonitorQuery, setSantriMonitorQuery] = useState('');
  const [santriMonitorClassId, setSantriMonitorClassId] = useState<string>('ALL');
  const [selectedSantriHistoryId, setSelectedSantriHistoryId] = useState<string | null>(null);

  // Modal for Medicine Inventory (in Obat & P3K tab)
  const [obatSubTab, setObatSubTab] = useState<'RECORDS' | 'INVENTORY'>('RECORDS');
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<KesantrianMedicine | null>(null);
  const [medicineForm, setMedicineForm] = useState({
    id: '',
    name: '',
    category: 'Obat Dalam',
    stock: 10,
    unit: 'Tablet',
    notes: '',
  });

  // Record Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [recordForm, setRecordForm] = useState<{
    id: string;
    type: KesantrianRecordType;
    studentId: string;
    date: string;
    academicYearId: string;
    semester: 'Ganjil' | 'Genap';
    title: string;
    category: string;
    description: string;
    actionTaken: string;
    status: string;
    returnDate: string;
    returnTime: string;
    needsParentPickup: boolean;
    sickLeaveDate: string;
    sickLeaveReason: string;
    conditionAtLeave: string;
    parentNotes: string;
    estimatedReturnDate: string;
    recoveredConfirmedDate: string;
    returnToPesantrenDate: string;
    conditionAtReturn: string;
    recoveryAdditionalNotes: string;
  }>({
    id: '',
    type: 'PELANGGARAN',
    studentId: '',
    date: todayStr,
    academicYearId: activeAcademicYear?.id || academicYears[0]?.id || 'ay_2025_2026_2',
    semester: activeAcademicYear?.semester || 'Genap',
    title: '',
    category: 'Ringan',
    description: '',
    actionTaken: '',
    status: 'Tercatat',
    returnDate: '',
    returnTime: '',
    needsParentPickup: false,
    sickLeaveDate: '',
    sickLeaveReason: '',
    conditionAtLeave: '',
    parentNotes: '',
    estimatedReturnDate: '',
    recoveredConfirmedDate: '',
    returnToPesantrenDate: '',
    conditionAtReturn: '',
    recoveryAdditionalNotes: '',
  });

  const [notice, setNotice] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: Get class name by classId from master Data Kelas
  const getClassName = (classId?: string) => {
    if (!classId) return '-';
    const found = classes.find((c) => c && c.id === classId);
    return found ? found.name : classId;
  };

  // Helper: Format NIS/NISN label from master Student
  const formatNisOrNisn = (st?: Partial<Student> | null, fallbackNisn?: string, fallbackNis?: string) => {
    const nisnVal = st?.nisn || fallbackNisn || '';
    const nisVal = st?.nis || fallbackNis || '';
    if (nisnVal && nisnVal !== '-') return `NISN: ${nisnVal}`;
    if (nisVal && nisVal !== '-') return `NIS: ${nisVal}`;
    return 'NISN: -';
  };

  // CRITICAL REQUIREMENT 2 & 5:
  // Always resolve student name, NIS/NISN, and class directly from Master Data Siswa (students & classes)
  // using studentId as the primary relation. Do not rely on duplicated copies.
  const resolveStudentFromMaster = (rec: KesantrianRecord) => {
    const masterStudent = students.find((s) => s && s.id === rec.studentId);
    const classId = masterStudent?.classId || rec.classId || '';
    const resolvedClassName = classId ? getClassName(classId) : rec.className || '-';
    const name = masterStudent?.name || rec.studentName || '-';
    const nis = masterStudent?.nis || rec.nis || '-';
    const nisn = masterStudent?.nisn || rec.nisn || '-';
    const nisnLabel = formatNisOrNisn(masterStudent, rec.nisn, rec.nis);
    const status = masterStudent?.status || 'Aktif';
    const isInactive = Boolean(masterStudent && masterStudent.status !== 'Aktif');

    return {
      masterStudent,
      studentId: rec.studentId,
      name,
      nis,
      nisn,
      nisnLabel,
      classId,
      className: resolvedClassName,
      status,
      isInactive,
    };
  };

  // CRITICAL REQUIREMENT 3 & 4:
  // Active students only from Master Data Siswa for creating new Kesantrian records!
  // Students with status !== 'Aktif' remain in Master Data Siswa as archive and do NOT appear when creating new records.
  const activeStudentsList = useMemo(() => {
    return students
      .filter((s) => s && s.status === 'Aktif')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [students]);

  // Filtered active students for the "Pilih Santri" search & dropdown
  const filteredActiveStudentsForPicker = useMemo(() => {
    const q = studentPickerQuery.trim().toLowerCase();
    if (!q) return activeStudentsList;
    return activeStudentsList.filter((st) => {
      const clsName = getClassName(st.classId).toLowerCase();
      return (
        (st.name || '').toLowerCase().includes(q) ||
        (st.nisn || '').toLowerCase().includes(q) ||
        (st.nis || '').toLowerCase().includes(q) ||
        clsName.includes(q) ||
        `kelas ${clsName}`.includes(q)
      );
    });
  }, [activeStudentsList, studentPickerQuery, classes]);

  // Counts per record type (excluding soft-deleted records)
  const activeKesantrianRecords = useMemo(
    () => kesantrianRecords.filter((r) => !r.isDeleted),
    [kesantrianRecords]
  );

  const recordCounts = useMemo(() => {
    return {
      PELANGGARAN: activeKesantrianRecords.filter((r) => r.type === 'PELANGGARAN').length,
      SAKIT: activeKesantrianRecords.filter((r) => r.type === 'SAKIT').length,
      IZIN_PULANG: activeKesantrianRecords.filter((r) => r.type === 'IZIN_PULANG').length,
      MABIT: activeKesantrianRecords.filter((r) => r.type === 'MABIT').length,
      OBAT_P3K: activeKesantrianRecords.filter((r) => r.type === 'OBAT_P3K').length,
    };
  }, [activeKesantrianRecords]);

  // Dashboard Mabit Summary (Requirement 7)
  const dashboardMabitSummary = useMemo(() => {
    if (mabitPeriods.length === 0) return null;
    // Prioritize period that is currently ongoing (date in range or has unreturned students) or nearest upcoming/latest
    const ongoingPeriod = mabitPeriods.find((p) => {
      const hasUnreturned = (p.participants || []).some((pt) => pt.status === 'Belum Kembali');
      const isDateInRange = todayStr >= p.departureDate && todayStr <= p.returnDate;
      return isDateInRange || hasUnreturned;
    });
    const targetPeriod = ongoingPeriod || mabitPeriods[0];
    const participants = targetPeriod.participants || [];
    const totalSantri = participants.length;
    const sudahKembali = participants.filter((pt) => pt.status === 'Sudah Kembali').length;
    const belumKembali = totalSantri - sudahKembali;
    const isOngoing = Boolean(ongoingPeriod);

    return {
      period: targetPeriod,
      isOngoing,
      totalSantri,
      sudahKembali,
      belumKembali,
    };
  }, [mabitPeriods, todayStr]);

  const detailRecord = useMemo(
    () => activeKesantrianRecords.find((r) => r.id === detailRecordId) || null,
    [activeKesantrianRecords, detailRecordId]
  );

  // Helper: Calculate how many days a student has been sick (Sudah berapa hari sakit)
  const calculateSickDays = (rec: KesantrianRecord): number => {
    if (!rec.date) return 1;
    const startParts = rec.date.split('-').map(Number);
    if (startParts.length !== 3 || startParts.some(isNaN)) return 1;
    const startMs = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();

    const isDone = rec.status === 'Sudah Sembuh' || rec.status === 'Selesai';
    const endDateStr = isDone
      ? rec.recoveredConfirmedDate || rec.returnToPesantrenDate || rec.returnDate || todayStr
      : todayStr;
    const endParts = endDateStr.split('-').map(Number);
    const endMs =
      endParts.length === 3 && !endParts.some(isNaN)
        ? new Date(endParts[0], endParts[1] - 1, endParts[2]).getTime()
        : Date.now();

    const diffDays = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  // Helper: Determine whether an Izin/Pulang or Dipulangkan karena Sakit record is overdue for return
  const isLeaveOverdue = (rec: KesantrianRecord): boolean => {
    if (
      rec.status === 'Sudah Kembali' ||
      rec.status === 'Sudah Kembali ke Pesantren' ||
      rec.status === 'Sudah Sembuh' ||
      rec.status === 'Selesai'
    ) {
      return false;
    }
    const targetReturn = rec.estimatedReturnDate || rec.returnDate || '';
    if (!targetReturn) return rec.status === 'Terlambat Kembali';
    return targetReturn < todayStr || rec.status === 'Terlambat Kembali';
  };
  const isIzinOverdue = isLeaveOverdue;

  // Helper: Open Detail & Monitoring Modal with initialized forms
  const openDetailMonitoringModal = (rec: KesantrianRecord) => {
    setDetailRecordId(rec.id);
    setFollowUpNote('');
    setFollowUpCondition('');
    setHeadEvalInput(rec.headEvaluationNote || '');
    setShowSickLeaveBox(false);
    setShowRecoveryBox(false);
    setSickLeaveBoxForm({
      needsParentPickup: Boolean(
        rec.needsParentPickup ||
          rec.status === 'Perlu Dijemput Orang Tua' ||
          rec.status === 'Dipulangkan karena Sakit'
      ),
      sickLeaveDate: rec.sickLeaveDate || todayStr,
      sickLeaveReason: rec.sickLeaveReason || rec.title || '',
      conditionAtLeave: rec.conditionAtLeave || '',
      parentNotes: rec.parentNotes || '',
      estimatedReturnDate: rec.estimatedReturnDate || rec.returnDate || '',
    });
    setRecoveryBoxForm({
      recoveredConfirmedDate: rec.recoveredConfirmedDate || todayStr,
      returnToPesantrenDate: rec.returnToPesantrenDate || rec.returnDate || todayStr,
      conditionAtReturn: rec.conditionAtReturn || 'Sehat & Baik',
      recoveryAdditionalNotes: rec.recoveryAdditionalNotes || '',
    });
  };

  // Pusat Pemantauan & Tindak Lanjut Kesantrian (Real-time active incidents requiring monitoring/follow-up)
  const monitoringStats = useMemo(() => {
    const pelanggaranPending = activeKesantrianRecords.filter(
      (r) =>
        r.type === 'PELANGGARAN' &&
        (r.status === 'Belum Ditangani' || r.status === 'Dalam Pembinaan' || r.status === 'Tercatat')
    );
    const sakitActive = activeKesantrianRecords.filter(
      (r) =>
        r.type === 'SAKIT' &&
        r.status !== 'Sudah Sembuh' &&
        r.status !== 'Sudah Kembali ke Pesantren' &&
        r.status !== 'Selesai'
    );
    const sakitLongDuration = sakitActive.filter((r) => calculateSickDays(r) >= 3);
    const sakitHandledCount = sakitActive.filter(
      (r) => Boolean(r.actionTaken && r.actionTaken.trim()) || (r.followUps || []).length > 0
    ).length;
    const sakitNeedsPickup = sakitActive.filter(
      (r) =>
        Boolean(r.needsParentPickup) ||
        r.status === 'Perlu Dijemput Orang Tua' ||
        r.status === 'Dipulangkan karena Sakit' ||
        r.category === 'Istirahat Pulang'
    );
    const izinActive = activeKesantrianRecords.filter(
      (r) => r.type === 'IZIN_PULANG' && r.status !== 'Sudah Kembali' && r.status !== 'Selesai'
    );
    const overdueReturnRecords = [...izinActive, ...sakitNeedsPickup].filter((r) =>
      isLeaveOverdue(r)
    );
    const mabitUnreturnedCount = dashboardMabitSummary ? dashboardMabitSummary.belumKembali : 0;

    const combinedRecords = [...pelanggaranPending, ...sakitActive, ...izinActive].sort(
      (a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
    );

    const noFollowUpRecords = combinedRecords.filter(
      (r) => !r.actionTaken?.trim() && (r.followUps || []).length === 0
    );

    return {
      pelanggaranPending,
      sakitActive,
      sakitLongDuration,
      sakitHandledCount,
      sakitNeedsPickup,
      sakitNeedPickup: sakitNeedsPickup,
      izinActive,
      overdueReturnRecords,
      izinOverdue: overdueReturnRecords,
      noFollowUpRecords,
      mabitUnreturnedCount,
      combinedRecords,
    };
  }, [activeKesantrianRecords, dashboardMabitSummary, todayStr]);

  const filteredMonitoringRecords = useMemo(() => {
    if (monitoringCategoryFilter === 'ALL') return monitoringStats.combinedRecords;
    if (monitoringCategoryFilter === 'SAKIT_3_HARI') return monitoringStats.sakitLongDuration;
    if (monitoringCategoryFilter === 'BELUM_TINDAK_LANJUT') return monitoringStats.noFollowUpRecords;
    if (monitoringCategoryFilter === 'PELANGGARAN') return monitoringStats.pelanggaranPending;
    if (monitoringCategoryFilter === 'SAKIT') return monitoringStats.sakitActive;
    if (monitoringCategoryFilter === 'IZIN_PULANG') return monitoringStats.izinActive;
    if (monitoringCategoryFilter === 'BELUM_KEMBALI') return monitoringStats.overdueReturnRecords;
    return [];
  }, [monitoringCategoryFilter, monitoringStats]);

  // Add follow-up note to any Kesantrian record
  const handleAddRecordFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRecord || !followUpNote.trim()) return;
    const nowIso = new Date().toISOString();
    const newFu: KesantrianFollowUp = {
      id: `fu_${Date.now()}`,
      date: followUpDate || todayStr,
      time: new Date().toTimeString().slice(0, 5),
      note: followUpNote.trim(),
      conditionUpdate: followUpCondition.trim() || undefined,
      actionType: isKepalaKesantrian ? 'Evaluasi Kepala Kesantrian' : 'Tindak Lanjut Musyrif',
      createdBy: currentActorName,
      createdByName: currentActorName,
      createdByRole: currentOfficerLabel,
      createdByUserId: currentUser?.id || currentUser?.uid,
      createdAt: nowIso,
    };

    const updated: KesantrianRecord = {
      ...detailRecord,
      followUps: [...(detailRecord.followUps || []), newFu],
      updatedBy: currentActorName,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: nowIso,
    };

    setIsSubmitting(true);
    try {
      await saveKesantrianRecord(updated);
      setFollowUpNote('');
      setFollowUpCondition('');
      setNotice(`Catatan tindak lanjut oleh ${currentOfficerLabel} (${currentActorName}) berhasil disimpan.`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Sick Leave / Parent Pickup update from Detail Modal
  const handleSaveSickLeaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRecord) return;
    const nowIso = new Date().toISOString();
    const nextStatus =
      detailRecord.status === 'Sedang Sakit'
        ? 'Dipulangkan karena Sakit'
        : detailRecord.status;

    const autoFu: KesantrianFollowUp = {
      id: `fu_sickleave_${Date.now()}`,
      date: sickLeaveBoxForm.sickLeaveDate || todayStr,
      time: new Date().toTimeString().slice(0, 5),
      note: `Santri dipulangkan / dijemput orang tua. Alasan: ${
        sickLeaveBoxForm.sickLeaveReason || detailRecord.title
      }. Kondisi saat pulang: ${
        sickLeaveBoxForm.conditionAtLeave || '-'
      }. Perkiraan kembali: ${sickLeaveBoxForm.estimatedReturnDate || '-'}.`,
      conditionUpdate: sickLeaveBoxForm.conditionAtLeave || undefined,
      actionType: 'Pemulangan Santri Sakit',
      statusAfter: nextStatus,
      createdBy: currentActorName,
      createdByName: currentActorName,
      createdByRole: currentOfficerLabel,
      createdByUserId: currentUser?.id || currentUser?.uid,
      createdAt: nowIso,
    };

    const updated: KesantrianRecord = {
      ...detailRecord,
      status: nextStatus,
      needsParentPickup: sickLeaveBoxForm.needsParentPickup,
      sickLeaveDate: sickLeaveBoxForm.sickLeaveDate || todayStr,
      sickLeaveReason: sickLeaveBoxForm.sickLeaveReason.trim(),
      conditionAtLeave: sickLeaveBoxForm.conditionAtLeave.trim(),
      parentNotes: sickLeaveBoxForm.parentNotes.trim(),
      estimatedReturnDate: sickLeaveBoxForm.estimatedReturnDate || undefined,
      followUps: [...(detailRecord.followUps || []), autoFu],
      updatedBy: currentActorName,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: nowIso,
    };

    setIsSubmitting(true);
    try {
      await saveKesantrianRecord(updated);
      setShowSickLeaveBox(false);
      setNotice('Data pemulangan santri sakit & penjemputan orang tua berhasil disimpan.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Recovery / Return to Pesantren confirmation from Detail Modal
  const handleSaveRecoveryConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRecord) return;
    const nowIso = new Date().toISOString();
    const nextStatus = detailRecord.type === 'SAKIT' ? 'Sudah Sembuh' : 'Sudah Kembali';

    const autoFu: KesantrianFollowUp = {
      id: `fu_recovery_${Date.now()}`,
      date: recoveryBoxForm.returnToPesantrenDate || todayStr,
      time: new Date().toTimeString().slice(0, 5),
      note: `Konfirmasi ${nextStatus}: Kembali/aktif di pesantren tanggal ${
        recoveryBoxForm.returnToPesantrenDate || todayStr
      }. Kondisi santri: ${
        recoveryBoxForm.conditionAtReturn || 'Sehat / Baik'
      }. ${recoveryBoxForm.recoveryAdditionalNotes || ''}`.trim(),
      conditionUpdate: recoveryBoxForm.conditionAtReturn || 'Sudah Sembuh / Kembali',
      actionType: `Konfirmasi ${nextStatus}`,
      statusAfter: nextStatus,
      createdBy: currentActorName,
      createdByName: currentActorName,
      createdByRole: currentOfficerLabel,
      createdByUserId: currentUser?.id || currentUser?.uid,
      createdAt: nowIso,
    };

    const updated: KesantrianRecord = {
      ...detailRecord,
      status: nextStatus,
      recoveredConfirmedDate: recoveryBoxForm.recoveredConfirmedDate || todayStr,
      returnToPesantrenDate: recoveryBoxForm.returnToPesantrenDate || todayStr,
      returnDate: recoveryBoxForm.returnToPesantrenDate || todayStr,
      conditionAtReturn: recoveryBoxForm.conditionAtReturn.trim() || 'Sehat & siap mengikuti kegiatan',
      recoveryAdditionalNotes: recoveryBoxForm.recoveryAdditionalNotes.trim() || undefined,
      followUps: [...(detailRecord.followUps || []), autoFu],
      updatedBy: currentActorName,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: nowIso,
    };

    setIsSubmitting(true);
    try {
      await saveKesantrianRecord(updated);
      setShowRecoveryBox(false);
      setNotice(`Status santri berhasil dikonfirmasi menjadi "${nextStatus}".`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick status update from Detail / Monitoring modal
  const handleQuickRecordStatusChange = async (rec: KesantrianRecord, nextStatus: string) => {
    const nowIso = new Date().toISOString();
    const isCompletedReturn = nextStatus === 'Sudah Sembuh' || nextStatus === 'Sudah Kembali';
    const updated: KesantrianRecord = {
      ...rec,
      status: nextStatus,
      needsParentPickup:
        nextStatus === 'Perlu Dijemput Orang Tua' || nextStatus === 'Dipulangkan karena Sakit'
          ? true
          : rec.needsParentPickup,
      returnDate: isCompletedReturn && !rec.returnDate ? todayStr : rec.returnDate,
      recoveredConfirmedDate:
        nextStatus === 'Sudah Sembuh' && !rec.recoveredConfirmedDate
          ? todayStr
          : rec.recoveredConfirmedDate,
      returnToPesantrenDate:
        isCompletedReturn && !rec.returnToPesantrenDate ? todayStr : rec.returnToPesantrenDate,
      updatedBy: currentActorName,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: nowIso,
    };
    await saveKesantrianRecord(updated);
    setNotice(`Status penanganan diperbarui menjadi "${nextStatus}" oleh ${currentOfficerLabel}.`);
    setTimeout(() => setNotice(''), 3500);
  };

  // Save Kepala Kesantrian evaluation / directive note
  const handleSaveHeadEvaluation = async (rec: KesantrianRecord) => {
    const nowIso = new Date().toISOString();
    const updated: KesantrianRecord = {
      ...rec,
      headEvaluationNote: headEvalInput.trim(),
      evaluatedBy: `${currentActorName} (${currentOfficerLabel})`,
      evaluatedAt: nowIso,
      updatedBy: currentActorName,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: nowIso,
    };
    await saveKesantrianRecord(updated);
    setNotice('Arahan & evaluasi Kepala Kesantrian berhasil disimpan.');
    setTimeout(() => setNotice(''), 3500);
  };

  // Current record menu section (SAKIT, IZIN_PULANG, OBAT_P3K; PELANGGARAN & MABIT use dedicated sections)
  const currentRecordType: KesantrianRecordType | null =
    activeSection === 'SAKIT' ||
    activeSection === 'IZIN_PULANG' ||
    activeSection === 'OBAT_P3K'
      ? activeSection
      : null;

  // Filtered records resolved against Master Data Siswa
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeKesantrianRecords.filter((r) => {
      if (currentRecordType && r.type !== currentRecordType) return false;
      const resolved = resolveStudentFromMaster(r);
      const matchesSearch =
        !q ||
        resolved.name.toLowerCase().includes(q) ||
        resolved.nis.toLowerCase().includes(q) ||
        resolved.nisn.toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        resolved.className.toLowerCase().includes(q);
      const matchesClass = selectedClassId === 'ALL' || resolved.classId === selectedClassId;
      const matchesCategory =
        selectedRecordCategory === 'ALL' || r.category === selectedRecordCategory;
      return matchesSearch && matchesClass && matchesCategory;
    });
  }, [activeKesantrianRecords, currentRecordType, searchQuery, selectedClassId, selectedRecordCategory, students, classes]);

  // Open modal to create a new Kesantrian record
  const handleOpenAddRecord = (type: KesantrianRecordType, preselectedStudentId?: string) => {
    const cfg = RECORD_TYPE_CONFIG[type];
    const defaultStudentId =
      preselectedStudentId && activeStudentsList.some((s) => s.id === preselectedStudentId)
        ? preselectedStudentId
        : activeStudentsList[0]?.id || '';

    setEditingRecord(null);
    setStudentPickerQuery('');
    setRecordForm({
      id: `ks_${type.toLowerCase()}_${Date.now()}`,
      type,
      studentId: defaultStudentId,
      date: todayStr,
      academicYearId: activeAcademicYear?.id || academicYears[0]?.id || 'ay_2025_2026_2',
      semester: activeAcademicYear?.semester || 'Genap',
      title: '',
      category: cfg.categories[0] || '',
      description: '',
      actionTaken: '',
      status: cfg.statuses[0] || 'Tercatat',
      returnDate: '',
      returnTime: '',
      needsParentPickup: false,
      sickLeaveDate: '',
      sickLeaveReason: '',
      conditionAtLeave: '',
      parentNotes: '',
      estimatedReturnDate: '',
      recoveredConfirmedDate: '',
      returnToPesantrenDate: '',
      conditionAtReturn: '',
      recoveryAdditionalNotes: '',
    });
    setFormError('');
    setIsRecordModalOpen(true);
  };

  // Open modal to edit an existing Kesantrian record
  const handleOpenEditRecord = (rec: KesantrianRecord) => {
    setEditingRecord(rec);
    setStudentPickerQuery('');
    setRecordForm({
      id: rec.id,
      type: rec.type,
      studentId: rec.studentId,
      date: rec.date || todayStr,
      academicYearId: rec.academicYearId || activeAcademicYear?.id || 'ay_2025_2026_2',
      semester: rec.semester || activeAcademicYear?.semester || 'Genap',
      title: rec.title || '',
      category: rec.category || RECORD_TYPE_CONFIG[rec.type].categories[0] || '',
      description: rec.description || '',
      actionTaken: rec.actionTaken || '',
      status: rec.status || RECORD_TYPE_CONFIG[rec.type].statuses[0] || 'Tercatat',
      returnDate: rec.returnDate || '',
      returnTime: rec.returnTime || '',
      needsParentPickup: Boolean(rec.needsParentPickup),
      sickLeaveDate: rec.sickLeaveDate || '',
      sickLeaveReason: rec.sickLeaveReason || '',
      conditionAtLeave: rec.conditionAtLeave || '',
      parentNotes: rec.parentNotes || '',
      estimatedReturnDate: rec.estimatedReturnDate || rec.returnDate || '',
      recoveredConfirmedDate: rec.recoveredConfirmedDate || '',
      returnToPesantrenDate: rec.returnToPesantrenDate || rec.returnDate || '',
      conditionAtReturn: rec.conditionAtReturn || '',
      recoveryAdditionalNotes: rec.recoveryAdditionalNotes || '',
    });
    setFormError('');
    setIsRecordModalOpen(true);
  };

  // Save Kesantrian Record using studentId as primary relation to Master Data Siswa
  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!recordForm.studentId) {
      setFormError('Pilih santri terlebih dahulu dari Master Data Siswa.');
      return;
    }

    const studentObj = students.find((s) => s.id === recordForm.studentId);
    if (!studentObj) {
      setFormError('Data santri tidak ditemukan pada Master Data Siswa.');
      return;
    }

    // Enforce Requirement 4: When creating a NEW record, non-active student is strictly disallowed
    if (!editingRecord && studentObj.status !== 'Aktif') {
      setFormError(
        `Santri "${studentObj.name}" berstatus ${studentObj.status} (tidak aktif). Catatan kesantrian baru hanya dapat dibuat untuk santri aktif.`
      );
      return;
    }

    if (!recordForm.title.trim()) {
      setFormError(`${RECORD_TYPE_CONFIG[recordForm.type].titleLabel} wajib diisi.`);
      return;
    }

    if (!recordForm.date) {
      setFormError('Tanggal kejadian wajib diisi.');
      return;
    }

    const ayObj =
      academicYears.find((ay) => ay.id === recordForm.academicYearId) || activeAcademicYear;
    const clsName = getClassName(studentObj.classId);

    const isSickPickup =
      recordForm.type === 'SAKIT' &&
      (recordForm.needsParentPickup ||
        recordForm.status === 'Perlu Dijemput Orang Tua' ||
        recordForm.status === 'Dipulangkan karena Sakit' ||
        recordForm.category === 'Istirahat Pulang');

    // Store studentId as the primary relation to Master Data Siswa without duplicating student master fields
    const payload: KesantrianRecord = {
      id: recordForm.id || `ks_${recordForm.type.toLowerCase()}_${Date.now()}`,
      type: recordForm.type,
      studentId: studentObj.id,
      date: recordForm.date,
      semester: recordForm.semester,
      academicYearId: ayObj?.id || recordForm.academicYearId,
      academicYearName: ayObj?.name || '2025/2026',
      title: recordForm.title.trim(),
      category: recordForm.category,
      description: recordForm.description.trim(),
      actionTaken: recordForm.actionTaken.trim(),
      status: recordForm.status,
      returnDate:
        recordForm.returnToPesantrenDate ||
        recordForm.returnDate ||
        recordForm.estimatedReturnDate ||
        undefined,
      returnTime: recordForm.returnTime || undefined,
      needsParentPickup: isSickPickup,
      sickLeaveDate: isSickPickup ? recordForm.sickLeaveDate || recordForm.date : undefined,
      sickLeaveReason: isSickPickup ? recordForm.sickLeaveReason.trim() || undefined : undefined,
      conditionAtLeave: recordForm.conditionAtLeave.trim() || undefined,
      parentNotes: recordForm.parentNotes.trim() || undefined,
      estimatedReturnDate: recordForm.estimatedReturnDate || recordForm.returnDate || undefined,
      recoveredConfirmedDate: recordForm.recoveredConfirmedDate || undefined,
      returnToPesantrenDate: recordForm.returnToPesantrenDate || undefined,
      conditionAtReturn: recordForm.conditionAtReturn.trim() || undefined,
      recoveryAdditionalNotes: recordForm.recoveryAdditionalNotes.trim() || undefined,
      followUps: editingRecord?.followUps || [],
      headEvaluationNote: editingRecord?.headEvaluationNote,
      evaluatedBy: editingRecord?.evaluatedBy,
      evaluatedAt: editingRecord?.evaluatedAt,
      recordedByUserId: editingRecord?.recordedByUserId || currentUser?.id || currentUser?.uid || 'kesantrian',
      recordedByName: editingRecord?.recordedByName || currentActorName,
      recordedByRole: editingRecord?.recordedByRole || currentOfficerLabel,
      createdBy: editingRecord?.createdBy || currentActorName,
      createdByName: editingRecord?.createdByName || currentActorName,
      createdByRole: editingRecord?.createdByRole || currentOfficerLabel,
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
      updatedBy: currentActorName,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await saveKesantrianRecord(payload);
      setIsRecordModalOpen(false);
      setNotice(
        editingRecord
          ? `Catatan ${RECORD_TYPE_CONFIG[payload.type].label} untuk santri ${studentObj.name} berhasil diperbarui.`
          : `Catatan ${RECORD_TYPE_CONFIG[payload.type].label} untuk santri ${studentObj.name} (Kelas ${clsName}) berhasil disimpan.`
      );
      setTimeout(() => setNotice(''), 4500);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan catatan kesantrian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Medicine Inventory Item
  const handleSubmitMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineForm.name.trim()) return;
    setIsSubmitting(true);
    try {
      await saveKesantrianMedicine({
        id: medicineForm.id || `med_${Date.now()}`,
        name: medicineForm.name.trim(),
        category: medicineForm.category,
        stock: Number(medicineForm.stock) || 0,
        unit: medicineForm.unit.trim() || 'Pcs',
        notes: medicineForm.notes.trim(),
        updatedBy: currentActorName,
        updatedByName: currentActorName,
        updatedByRole: currentOfficerLabel,
        updatedAt: new Date().toISOString(),
      });
      setIsMedicineModalOpen(false);
      setNotice(`Data Obat & P3K "${medicineForm.name}" berhasil disimpan.`);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sub-navigation bar inside Kesantrian module (No duplicate "Data Santri" menu)
  const kesantrianNavTabs = [
    {
      id: isKesantrianOfficerRole(role) ? 'dashboard' : 'kesantrian-dashboard',
      section: 'DASHBOARD',
      label: isKesantrianOfficerRole(role) ? 'Dashboard Kesantrian' : 'Ringkasan Kesantrian',
      icon: LayoutDashboard,
    },
    {
      id: 'kesantrian-pelanggaran',
      section: 'PELANGGARAN',
      label: 'Pelanggaran',
      icon: ShieldAlert,
    },
    {
      id: 'kesantrian-sakit',
      section: 'SAKIT',
      label: 'Santri Sakit',
      icon: HeartPulse,
    },
    {
      id: 'kesantrian-izin',
      section: 'IZIN_PULANG',
      label: 'Izin/Pulang',
      icon: DoorOpen,
    },
    {
      id: 'kesantrian-mabit',
      section: 'MABIT',
      label: 'Mabit',
      icon: Moon,
    },
    {
      id: 'kesantrian-obat',
      section: 'OBAT_P3K',
      label: 'Obat & P3K',
      icon: Pill,
    },
    {
      id: 'kesantrian-laporan',
      section: 'LAPORAN',
      label: 'Laporan Kesantrian',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Module Navigation Bar */}
      <div className="bg-white border border-[#DCE5E8] rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto">
        {kesantrianNavTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.section}
              onClick={() => {
                setSearchQuery('');
                setSelectedRecordCategory('ALL');
                onNavigate(item.id);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#24485A] text-white'
                  : 'text-[#71818A] hover:bg-[#F4F7F8] hover:text-[#24343D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 bg-[#EFF7F2] border border-[#CBE4D5] rounded-xl text-xs text-[#35694E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#5D9B7A] shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-[#5D9B7A] hover:text-[#35694E] cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          DASHBOARD KESANTRIAN
         ===================================================================== */}
      {activeSection === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Welcome Banner & Akun Pengguna Kesantrian */}
          <div className="bg-white border border-[#DCE5E8] rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#24485A] bg-[#F0F5F7] border border-[#DCE5E8] px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#24485A]" />
                    Modul Kesantrian AKSARA
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#F4F7F8] text-[#24343D] border border-[#DCE5E8]">
                    {currentOfficerLabel}
                  </span>
                  <span className="text-xs text-[#71818A] font-medium">
                    Periode Aktif:{' '}
                    <strong className="text-[#24343D]">
                      {activeAcademicYear
                        ? `${activeAcademicYear.name} - Semester ${activeAcademicYear.semester}`
                        : '2026/2027 - Semester Ganjil'}
                    </strong>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#24343D] mt-1.5 tracking-tight">
                  Dashboard Kesantrian &amp; Asrama
                </h2>
                <p className="text-xs text-[#71818A] mt-0.5">
                  Pemantauan terpadu kesehatan, perizinan pulang, kedisiplinan, mabit, dan pembinaan untuk{' '}
                  <strong className="text-[#24343D]">
                    {activeStudentsList.length} santri aktif
                  </strong>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                <button
                  onClick={() => onNavigate('kesantrian-laporan')}
                  className="px-3.5 py-2 text-xs font-semibold text-[#24485A] bg-[#F4F7F8] border border-[#DCE5E8] hover:bg-[#EBF1F4] rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Laporan Kesantrian
                </button>
                <button
                  onClick={() => onNavigate('kesantrian-pelanggaran')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#24485A] hover:bg-[#1C3948] rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Catat Pelanggaran
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards (5 Clean White Kesantrian KPI Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              onClick={() => onNavigate('kesantrian-pelanggaran')}
              className="bg-white p-5 rounded-xl border border-[#DCE5E8] text-left hover:border-[#C96A6A] transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Pelanggaran Santri</span>
                <div className="w-9 h-9 rounded-lg bg-[#FBF1F1] text-[#C96A6A] flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#24343D] font-mono tabular-nums">
                  {recordCounts.PELANGGARAN}
                </span>
                <span className="text-xs text-[#C96A6A] font-medium">Catatan</span>
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                Kedisiplinan &amp; pembinaan
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-sakit')}
              className="bg-white p-5 rounded-xl border border-[#DCE5E8] text-left hover:border-[#D6A64A] transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Santri Sakit</span>
                <div className="w-9 h-9 rounded-lg bg-[#FDF7EB] text-[#D6A64A] flex items-center justify-center">
                  <HeartPulse className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#24343D] font-mono tabular-nums">
                  {recordCounts.SAKIT}
                </span>
                <span className="text-xs text-[#B47D1E] font-medium">Catatan</span>
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                Pemantauan kesehatan &amp; UKS
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-izin')}
              className="bg-white p-5 rounded-xl border border-[#DCE5E8] text-left hover:border-[#6C91A8] transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Izin / Pulang</span>
                <div className="w-9 h-9 rounded-lg bg-[#F1F6F9] text-[#6C91A8] flex items-center justify-center">
                  <DoorOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#24343D] font-mono tabular-nums">
                  {recordCounts.IZIN_PULANG}
                </span>
                <span className="text-xs text-[#3D6B82] font-medium">Catatan</span>
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                Perizinan keluar &amp; kepulangan
              </div>
            </button>

            <button
              onClick={() => onNavigate('kesantrian-mabit')}
              className="bg-white p-5 rounded-xl border border-[#DCE5E8] text-left hover:border-[#24485A] transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">
                  Mabit &amp; Kepulangan
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#F0F5F7] text-[#24485A] flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
              </div>
              {dashboardMabitSummary ? (
                <div className="mt-2 space-y-1">
                  <div className="text-xs font-semibold text-[#24485A] truncate">
                    {dashboardMabitSummary.period.periodName}
                  </div>
                  <div className="pt-1 border-t border-[#EDF2F4] text-[11px] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-[#24343D]">
                      {dashboardMabitSummary.totalSantri} santri
                    </span>
                    <span className="text-[#5D9B7A] font-medium">
                      Kembali: {dashboardMabitSummary.sudahKembali}
                    </span>
                    <span className="text-[#D6A64A] font-medium">
                      Belum: {dashboardMabitSummary.belumKembali}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#24343D] font-mono tabular-nums">0</span>
                    <span className="text-xs text-[#24485A] font-medium">Periode</span>
                  </div>
                  <div className="text-[11px] text-[#71818A] mt-1">
                    Jadwal kepulangan Mabit
                  </div>
                </>
              )}
            </button>

            <button
              onClick={() => onNavigate('kesantrian-obat')}
              className="bg-white p-5 rounded-xl border border-[#DCE5E8] text-left hover:border-[#5D9B7A] transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#71818A]">Obat &amp; P3K</span>
                <div className="w-9 h-9 rounded-lg bg-[#EFF7F2] text-[#5D9B7A] flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#24343D] font-mono tabular-nums">
                  {recordCounts.OBAT_P3K}
                </span>
                <span className="text-xs text-[#35694E] font-medium">Pemberian</span>
              </div>
              <div className="text-[11px] text-[#71818A] mt-1">
                {kesantrianMedicines.length} item stok obat &amp; P3K
              </div>
            </button>
          </div>

          {/* =================================================================
              PUSAT PEMANTAUAN & TINDAK LANJUT KEJADIAN KESANTRIAN
             ================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-teal-600" />
                  <span>Pusat Pemantauan &amp; Tindak Lanjut Kejadian Aktif</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemantauan terpadu untuk Kepala Kesantrian &amp; Musyrif: siapa santri yang sedang sakit &amp; berapa hari sakit, apakah perlu dijemput orang tua, siapa yang sedang izin &amp; belum kembali, serta tindak lanjut pelanggaran.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  {
                    id: 'ALL' as const,
                    label: `Semua Perlu Pantauan (${monitoringStats.combinedRecords.length})`,
                  },
                  {
                    id: 'PELANGGARAN' as const,
                    label: `Pelanggaran (${monitoringStats.pelanggaranPending.length})`,
                  },
                  {
                    id: 'SAKIT' as const,
                    label: `Santri Sakit (${monitoringStats.sakitActive.length})`,
                  },
                  {
                    id: 'IZIN_PULANG' as const,
                    label: `Sedang Izin (${monitoringStats.izinActive.length})`,
                  },
                  {
                    id: 'MABIT' as const,
                    label: `Mabit Belum Kembali (${monitoringStats.mabitUnreturnedCount})`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMonitoringCategoryFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      monitoringCategoryFilter === f.id
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Indikator Prioritas Pusat Pemantauan & Tindak Lanjut */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setMonitoringCategoryFilter('SAKIT_3_HARI')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  monitoringCategoryFilter === 'SAKIT_3_HARI'
                    ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300'
                    : 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/70'
                }`}
              >
                <div className="text-[11px] text-rose-800 font-bold flex items-center gap-1.5">
                  <span>🔴 Sakit &ge; 3 Hari (Perlu Evaluasi)</span>
                </div>
                <div className="text-lg font-bold text-rose-900 mt-0.5">
                  {monitoringStats.sakitLongDuration.length} Santri
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5">
                  Total sedang sakit: {monitoringStats.sakitActive.length} ({monitoringStats.sakitNeedPickup.length} perlu jemput)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMonitoringCategoryFilter('BELUM_TINDAK_LANJUT')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  monitoringCategoryFilter === 'BELUM_TINDAK_LANJUT'
                    ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-300'
                    : 'bg-orange-50/80 border-orange-200 hover:bg-orange-100/70'
                }`}
              >
                <div className="text-[11px] text-orange-800 font-bold flex items-center gap-1.5">
                  <span>🟠 Belum Ada Tindak Lanjut</span>
                </div>
                <div className="text-lg font-bold text-orange-900 mt-0.5">
                  {monitoringStats.noFollowUpRecords.length} Kejadian
                </div>
                <div className="text-[10px] text-orange-700 mt-0.5">
                  Menunggu tindakan / catatan perkembangan
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMonitoringCategoryFilter('IZIN_PULANG')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  monitoringCategoryFilter === 'IZIN_PULANG'
                    ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                    : 'bg-amber-50/80 border-amber-200 hover:bg-amber-100/70'
                }`}
              >
                <div className="text-[11px] text-amber-800 font-bold flex items-center gap-1.5">
                  <span>🟡 Sedang Izin / Pulang</span>
                </div>
                <div className="text-lg font-bold text-amber-900 mt-0.5">
                  {monitoringStats.izinActive.length} Santri
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  Dipantau alasan &amp; jadwal kembali
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMonitoringCategoryFilter('BELUM_KEMBALI')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  monitoringCategoryFilter === 'BELUM_KEMBALI'
                    ? 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-300'
                    : 'bg-yellow-50/80 border-yellow-300 hover:bg-yellow-100/70'
                }`}
              >
                <div className="text-[11px] text-yellow-900 font-bold flex items-center gap-1.5">
                  <span>🟡 Belum Kembali ke Pesantren</span>
                </div>
                <div className="text-lg font-bold text-yellow-950 mt-0.5">
                  {monitoringStats.izinOverdue.length + monitoringStats.mabitUnreturnedCount} Santri
                </div>
                <div className="text-[10px] text-yellow-800 mt-0.5">
                  {monitoringStats.izinOverdue.length} izin lewat jadwal &bull; {monitoringStats.mabitUnreturnedCount} Mabit
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMonitoringCategoryFilter('PELANGGARAN')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  monitoringCategoryFilter === 'PELANGGARAN'
                    ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300'
                    : 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/70'
                }`}
              >
                <div className="text-[11px] text-rose-800 font-bold flex items-center gap-1.5">
                  <span>🔴 Pelanggaran Belum Ditangani</span>
                </div>
                <div className="text-lg font-bold text-rose-900 mt-0.5">
                  {monitoringStats.pelanggaranPending.length} Kasus
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5">
                  Perlu pembinaan &amp; tindak lanjut
                </div>
              </button>
            </div>

            {monitoringCategoryFilter === 'MABIT' ? (
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-indigo-900">
                    Pemantauan Kepulangan Mabit:{' '}
                    {dashboardMabitSummary
                      ? dashboardMabitSummary.period.periodName
                      : 'Belum ada periode Mabit'}
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    {dashboardMabitSummary
                      ? `${dashboardMabitSummary.belumKembali} santri berstatus Belum Kembali dari total ${dashboardMabitSummary.totalSantri} santri peserta Mabit.`
                      : 'Silakan buka menu Mabit & Kepulangan Santri untuk mengatur jadwal kepulangan Mabit.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('kesantrian-mabit')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition cursor-pointer self-start sm:self-center"
                >
                  Buka Pemantauan Mabit
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal &amp; Durasi</th>
                      <th className="py-2.5 px-3">Santri &amp; Kelas</th>
                      <th className="py-2.5 px-3">Jenis Kejadian</th>
                      <th className="py-2.5 px-3">Detail Kondisi, Penanganan &amp; Kepulangan</th>
                      <th className="py-2.5 px-3">Petugas Pencatat</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMonitoringRecords.slice(0, 12).map((rec) => {
                      const cfg = RECORD_TYPE_CONFIG[rec.type];
                      const resolved = resolveStudentFromMaster(rec);
                      const fuCount = (rec.followUps || []).length;
                      const sickDays = rec.type === 'SAKIT' ? calculateSickDays(rec) : 0;
                      const overdueIzin = rec.type === 'IZIN_PULANG' && isIzinOverdue(rec);
                      return (
                        <tr
                          key={rec.id}
                          onClick={() => openDetailMonitoringModal(rec)}
                          className="hover:bg-slate-50/70 cursor-pointer transition"
                          title="Klik untuk melihat detail santri dan riwayat penanganannya"
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{rec.date}</div>
                            <div className="text-[10px] text-slate-400">
                              {rec.academicYearName} ({rec.semester})
                            </div>
                            {rec.type === 'SAKIT' && (
                              <span
                                className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  sickDays >= 3
                                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-200'
                                }`}
                              >
                                {sickDays >= 3 ? `🔴 Sakit Hari ke-${sickDays} (Perlu Perhatian)` : `Hari ke-${sickDays}`}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{resolved.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {resolved.nisnLabel} &bull; Kelas {resolved.className}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.badgeClass}`}
                            >
                              {cfg.label}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              {rec.category}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs space-y-0.5">
                            <div className="font-semibold text-slate-800">{rec.title}</div>
                            {rec.type === 'SAKIT' && sickDays >= 3 && (
                              <div className="text-[10px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-1 rounded font-semibold">
                                ⚠ Santri sudah sakit {sickDays} hari — perlu ditentukan apakah dijemput orang tua.
                              </div>
                            )}
                            {rec.actionTaken ? (
                              <div className="text-[11px] text-emerald-700 font-medium">
                                Ditangani: {rec.actionTaken}
                              </div>
                            ) : (
                              <div className="text-[11px] text-rose-600 font-semibold">
                                Belum ada tindakan awal tercatat
                              </div>
                            )}
                            {rec.type === 'SAKIT' &&
                              (rec.needsParentPickup ||
                                rec.status === 'Perlu Dijemput Orang Tua' ||
                                rec.status === 'Dipulangkan karena Sakit') && (
                                <div className="text-[10px] bg-orange-50 text-orange-900 border border-orange-200 px-2 py-1 rounded mt-1">
                                  <span className="font-bold">Perlu Dijemput / Pulang Sakit</span>
                                  {rec.sickLeaveReason ? ` • Alasan: ${rec.sickLeaveReason}` : ''}
                                  {rec.conditionAtLeave
                                    ? ` • Kondisi: ${rec.conditionAtLeave}`
                                    : ''}
                                  {rec.estimatedReturnDate || rec.returnDate
                                    ? ` • Est. Kembali: ${rec.estimatedReturnDate || rec.returnDate}`
                                    : ''}
                                </div>
                              )}
                            {rec.type === 'IZIN_PULANG' && (
                              <div className="text-[10px] text-blue-800 font-medium">
                                Harus Kembali: {rec.returnDate || '-'}{' '}
                                {rec.returnTime ? `(${rec.returnTime})` : ''}
                                {overdueIzin && (
                                  <span className="ml-1 text-rose-600 font-bold">
                                    [Belum Kembali - Melewati Jadwal!]
                                  </span>
                                )}
                              </div>
                            )}
                            {fuCount > 0 && (
                              <div className="text-[10px] font-semibold text-teal-700 mt-0.5">
                                +{fuCount} catatan perkembangan / tindak lanjut
                              </div>
                            )}
                            {rec.headEvaluationNote && (
                              <div className="text-[10px] font-semibold text-indigo-700 mt-0.5 truncate">
                                Arahan Kepala: {rec.headEvaluationNote}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800">
                              {rec.createdByName || rec.recordedByName || rec.createdBy || 'Petugas'}
                            </div>
                            <div className="text-[10px] text-teal-700 font-semibold">
                              {rec.createdByRole || rec.recordedByRole || 'Petugas Kesantrian'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                overdueIzin
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {overdueIzin ? 'Belum Kembali (Terlambat)' : rec.status || 'Perlu Tindak Lanjut'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openDetailMonitoringModal(rec)}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" />
                              <span>Pantau &amp; Tindak Lanjut</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMonitoringRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Alhamdulillah, seluruh kejadian pada kategori ini telah selesai ditindaklanjuti.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Kesantrian Records & Access Governance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Records Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Riwayat Kejadian Kesantrian Terbaru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direferensikan langsung dari Master Data Siswa utama melalui relasi <code>studentId</code>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Santri &amp; Kelas</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Keterangan Kejadian</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeKesantrianRecords.slice(0, 8).map((rec) => {
                      const cfg = RECORD_TYPE_CONFIG[rec.type];
                      const resolved = resolveStudentFromMaster(rec);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            <div>{rec.date}</div>
                            <div className="text-[10px] text-slate-400">
                              {rec.academicYearName} ({rec.semester})
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{resolved.name}</span>
                              {resolved.isInactive && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                  {resolved.status}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {resolved.nisnLabel} &bull; Kelas {resolved.className}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.badgeClass}`}
                            >
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800">{rec.title}</div>
                            {rec.actionTaken && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                Tindakan: {rec.actionTaken}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {rec.status || 'Tercatat'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {activeKesantrianRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          Belum ada catatan kejadian kesantrian. Gunakan tombol <strong>Catat Kejadian Baru</strong> atau pilih salah satu menu kesantrian di atas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role & Single Master Data Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Referensi Master Data Siswa</h3>
                  <p className="text-[11px] text-slate-400">Tanpa Duplikasi Tabel / Koleksi Santri</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Relasi Data Siswa Utama:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600 pl-5 list-disc">
                  <li>
                    Menggunakan satu-satunya <strong>Master Data Siswa</strong> yang sudah ada di sistem ({activeStudentsList.length} siswa aktif terdaftar)
                  </li>
                  <li>
                    Setiap catatan terhubung melalui <code>studentId</code> ke Nama, NIS/NISN, dan Kelas master siswa
                  </li>
                  <li>
                    Dilengkapi periode Tanggal Kejadian, Semester, dan Tahun Ajaran
                  </li>
                </ul>
              </div>

              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                <div className="font-semibold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Batasan Hak Akses Kesantrian:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600 pl-5 list-disc">
                  <li>Tidak dapat menginput atau mengubah nilai akademik</li>
                  <li>Tidak dapat mengubah mata pelajaran, guru, kelas, atau raport</li>
                  <li>Tidak dapat mengubah konfigurasi sekolah atau akun pengguna</li>
                  <li>Tidak dapat menghapus data utama santri</li>
                </ul>
              </div>

              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-[11px] text-teal-900 leading-relaxed">
                <strong>Aturan Siswa Aktif &amp; Nonaktif:</strong> Hanya siswa berstatus <strong>Aktif</strong> yang muncul pada pilihan <em>Pilih Santri</em> untuk catatan baru. Siswa <strong>Nonaktif</strong> tetap tersimpan di Data Siswa sebagai arsip dan seluruh riwayat kesantrian lamanya tetap terjaga.
              </div>
            </div>
          </div>

          {/* =================================================================
              PEMANTAUAN & REKAP KESANTRIAN SELURUH SANTRI (MASTER DATA SISWA)
              Tanpa Pembagian Santri Binaan Berdasarkan Petugas
             ================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Pemantauan &amp; Rekap Kesantrian Seluruh Santri ({activeStudentsList.length} Santri Aktif)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kepala Kesantrian &amp; Musyrif Kesantrian melihat seluruh santri dari Master Data Siswa utama tanpa pembagian wilayah/petugas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={santriMonitorQuery}
                    onChange={(e) => setSantriMonitorQuery(e.target.value)}
                    placeholder="Cari nama santri atau NISN..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <select
                  value={santriMonitorClassId}
                  onChange={(e) => setSantriMonitorClassId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama Santri &amp; NISN</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3 text-center">Pelanggaran</th>
                    <th className="py-2.5 px-3 text-center">Sakit</th>
                    <th className="py-2.5 px-3 text-center">Izin/Pulang</th>
                    <th className="py-2.5 px-3 text-center">Mabit</th>
                    <th className="py-2.5 px-3 text-center">Obat &amp; P3K</th>
                    <th className="py-2.5 px-3 text-right">Aksi Pemantauan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStudentsList
                    .filter((st) => {
                      const matchesClass =
                        santriMonitorClassId === 'ALL' || st.classId === santriMonitorClassId;
                      const q = santriMonitorQuery.trim().toLowerCase();
                      const matchesQuery =
                        !q ||
                        (st.name || '').toLowerCase().includes(q) ||
                        (st.nisn || '').toLowerCase().includes(q) ||
                        (st.nis || '').toLowerCase().includes(q);
                      return matchesClass && matchesQuery;
                    })
                    .slice(0, 15)
                    .map((st) => {
                      const stRecords = activeKesantrianRecords.filter(
                        (r) => r.studentId === st.id
                      );
                      const pelanggaranCount = stRecords.filter(
                        (r) => r.type === 'PELANGGARAN'
                      ).length;
                      const sakitCount = stRecords.filter((r) => r.type === 'SAKIT').length;
                      const izinCount = stRecords.filter((r) => r.type === 'IZIN_PULANG').length;
                      const obatCount = stRecords.filter((r) => r.type === 'OBAT_P3K').length;
                      const mabitCount = mabitPeriods.filter((mp) =>
                        (mp.participants || []).some((pt) => pt.studentId === st.id)
                      ).length;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{st.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatNisOrNisn(st)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              Kelas {getClassName(st.classId)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                pelanggaranCount > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {pelanggaranCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                sakitCount > 0
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {sakitCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                izinCount > 0
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {izinCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                mabitCount > 0
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {mabitCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                obatCount > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {obatCount}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSantriHistoryId(st.id)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Riwayat Kesantrian</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAHAP K2: PELANGGARAN SANTRI
         ===================================================================== */}
      {activeSection === 'PELANGGARAN' && <PelanggaranSantriSection />}

      {/* =====================================================================
          MODUL MABIT & KEPULANGAN SANTRI
         ===================================================================== */}
      {activeSection === 'MABIT' && <MabitKepulanganSection />}

      {/* =====================================================================
          LAPORAN KESANTRIAN (REKAPITULASI & EVALUASI MENYELURUH)
         ===================================================================== */}
      {activeSection === 'LAPORAN' && (
        <LaporanKesantrianSection
          onSelectRecordDetail={(recordId) => {
            const found = activeKesantrianRecords.find((r) => r.id === recordId);
            if (found) openDetailMonitoringModal(found);
          }}
          onNavigateToMabit={() => onNavigate('kesantrian-mabit')}
        />
      )}

      {/* =====================================================================
          SUB-MENU PENCATATAN KESANTRIAN LAINNYA
          (Santri Sakit, Izin/Pulang, Obat & P3K)
         ===================================================================== */}
      {currentRecordType && (
        <div className="space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-600" />
                {RECORD_TYPE_CONFIG[currentRecordType].menuTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {RECORD_TYPE_CONFIG[currentRecordType].subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentRecordType === 'OBAT_P3K' && (
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    onClick={() => setObatSubTab('RECORDS')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      obatSubTab === 'RECORDS'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Riwayat Pemberian Obat
                  </button>
                  <button
                    onClick={() => setObatSubTab('INVENTORY')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      obatSubTab === 'INVENTORY'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Stok Obat &amp; P3K ({kesantrianMedicines.length})
                  </button>
                </div>
              )}

              {currentRecordType === 'OBAT_P3K' && obatSubTab === 'INVENTORY' ? (
                <button
                  onClick={() => {
                    setEditingMedicine(null);
                    setMedicineForm({
                      id: `med_${Date.now()}`,
                      name: '',
                      category: 'Obat Dalam',
                      stock: 10,
                      unit: 'Tablet',
                      notes: '',
                    });
                    setIsMedicineModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Item Obat / P3K
                </button>
              ) : (
                <button
                  onClick={() => handleOpenAddRecord(currentRecordType)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Catatan {RECORD_TYPE_CONFIG[currentRecordType].label}
                </button>
              )}
            </div>
          </div>

          {/* Kartu Ringkasan Pemantauan Santri Sakit */}
          {currentRecordType === 'SAKIT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-xs font-semibold text-slate-500">Total Catatan Sakit</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{recordCounts.SAKIT}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Riwayat kesehatan santri</div>
              </div>
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
                <div className="text-xs font-semibold text-amber-800">Sedang Sakit / Dirawat</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">
                  {monitoringStats.sakitActive.length}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  Dipantau jumlah hari sakit &amp; perkembangannya
                </div>
              </div>
              <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200 shadow-2xs">
                <div className="text-xs font-semibold text-orange-800">
                  Perlu Dijemput / Pulang Sakit
                </div>
                <div className="text-2xl font-bold text-orange-700 mt-1">
                  {monitoringStats.sakitNeedPickup.length}
                </div>
                <div className="text-[11px] text-orange-700 mt-0.5">
                  Dipantau kondisi di rumah &amp; estimasi kembali
                </div>
              </div>
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                <div className="text-xs font-semibold text-emerald-800">
                  Sudah Sembuh / Kembali
                </div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {
                    activeKesantrianRecords.filter(
                      (r) =>
                        r.type === 'SAKIT' &&
                        (r.status === 'Sudah Sembuh' ||
                          r.status === 'Sudah Kembali ke Pesantren' ||
                          r.status === 'Selesai')
                    ).length
                  }
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Tercatat sembuh &amp; kembali aktif
                </div>
              </div>
            </div>
          )}

          {/* Kartu Ringkasan Pemantauan Izin / Pulang Santri */}
          {currentRecordType === 'IZIN_PULANG' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-xs font-semibold text-slate-500">Total Izin / Pulang</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {recordCounts.IZIN_PULANG}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Catatan izin keluar/pulang</div>
              </div>
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-2xs">
                <div className="text-xs font-semibold text-blue-800">Sedang Izin (Belum Kembali)</div>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  {monitoringStats.izinActive.length}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">Sedang berada di luar pesantren</div>
              </div>
              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-2xs">
                <div className="text-xs font-semibold text-rose-800">
                  Melewati Batas Waktu Kembali
                </div>
                <div className="text-2xl font-bold text-rose-700 mt-1">
                  {monitoringStats.izinOverdue.length}
                </div>
                <div className="text-[11px] text-rose-700 mt-0.5">
                  Perlu segera ditindaklanjuti petugas
                </div>
              </div>
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                <div className="text-xs font-semibold text-emerald-800">
                  Sudah Kembali ke Pesantren
                </div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {
                    activeKesantrianRecords.filter(
                      (r) =>
                        r.type === 'IZIN_PULANG' &&
                        (r.status === 'Sudah Kembali' || r.status === 'Selesai')
                    ).length
                  }
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Tercatat sudah kembali ke asrama
                </div>
              </div>
            </div>
          )}

          {/* If Obat & P3K Inventory Sub-tab is selected */}
          {currentRecordType === 'OBAT_P3K' && obatSubTab === 'INVENTORY' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nama Obat / Perlengkapan P3K</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Stok Tersedia</th>
                      <th className="py-3 px-4">Keterangan / Kegunaan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kesantrianMedicines.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">{med.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {med.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {med.stock} {med.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{med.notes || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingMedicine(med);
                              setMedicineForm({
                                id: med.id,
                                name: med.name,
                                category: med.category,
                                stock: med.stock,
                                unit: med.unit,
                                notes: med.notes || '',
                              });
                              setIsMedicineModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition cursor-pointer"
                            title="Ubah Stok / Obat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {kesantrianMedicines.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Belum ada daftar inventaris obat &amp; P3K. Klik <strong>Tambah Item Obat / P3K</strong> untuk menambahkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              {/* Filter Bar for Records */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama santri, NISN, kelas, atau keterangan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Kelas:</span>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="ALL">Semua Kelas</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Kelas {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Kategori:</span>
                    <select
                      value={selectedRecordCategory}
                      onChange={(e) => setSelectedRecordCategory(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="ALL">Semua Kategori</option>
                      {RECORD_TYPE_CONFIG[currentRecordType].categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Records Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Tanggal &amp; Durasi</th>
                        <th className="py-3 px-4">Nama Santri (Master Siswa)</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4">
                          {RECORD_TYPE_CONFIG[currentRecordType].titleLabel} &amp; Pemantauan
                        </th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((rec) => {
                        const cfg = RECORD_TYPE_CONFIG[rec.type];
                        const resolved = resolveStudentFromMaster(rec);
                        const sickDays = rec.type === 'SAKIT' ? calculateSickDays(rec) : 0;
                        const overdueIzin = rec.type === 'IZIN_PULANG' && isIzinOverdue(rec);

                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 font-mono whitespace-nowrap">
                              <div className="font-semibold text-slate-900">{rec.date}</div>
                              <div className="text-[10px] text-slate-400">
                                TA {rec.academicYearName} &bull; {rec.semester}
                              </div>
                              {rec.type === 'SAKIT' && (
                                <span className="mt-1 inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  Lama Sakit: {sickDays} Hari
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{resolved.name}</span>
                                {resolved.isInactive && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                    {resolved.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {resolved.nisnLabel}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                Kelas {resolved.className}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.badgeClass}`}
                              >
                                {rec.category || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-xs space-y-1">
                              <div className="font-semibold text-slate-900">{rec.title}</div>
                              {rec.actionTaken && (
                                <div className="text-[11px] text-slate-600">
                                  <strong>Penanganan:</strong> {rec.actionTaken}
                                </div>
                              )}
                              {rec.type === 'SAKIT' &&
                                (rec.needsParentPickup ||
                                  rec.status === 'Perlu Dijemput Orang Tua' ||
                                  rec.status === 'Dipulangkan karena Sakit') && (
                                  <div className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-[11px] text-orange-900 space-y-0.5">
                                    <div className="font-bold">
                                      Perlu Dijemput Orang Tua / Pulang Sakit
                                    </div>
                                    {rec.sickLeaveReason && (
                                      <div>Alasan: {rec.sickLeaveReason}</div>
                                    )}
                                    {rec.conditionAtLeave && (
                                      <div>Kondisi Setelah Pulang: {rec.conditionAtLeave}</div>
                                    )}
                                    {(rec.estimatedReturnDate || rec.returnDate) && (
                                      <div>
                                        Perkiraan Kembali:{' '}
                                        <strong>{rec.estimatedReturnDate || rec.returnDate}</strong>
                                      </div>
                                    )}
                                  </div>
                                )}
                              {rec.type === 'SAKIT' &&
                                (rec.recoveredConfirmedDate || rec.returnToPesantrenDate) && (
                                  <div className="text-[11px] text-emerald-700 font-semibold">
                                    Sembuh/Kembali:{' '}
                                    {rec.returnToPesantrenDate || rec.recoveredConfirmedDate}
                                    {rec.conditionAtReturn
                                      ? ` (${rec.conditionAtReturn})`
                                      : ''}
                                  </div>
                                )}
                              {rec.type === 'IZIN_PULANG' && (
                                <div className="text-[11px] text-blue-800 space-y-0.5">
                                  <div>
                                    Jadwal Kembali: <strong>{rec.returnDate || '-'}</strong>{' '}
                                    {rec.returnTime ? `pukul ${rec.returnTime}` : ''}
                                  </div>
                                  {overdueIzin && (
                                    <div className="text-rose-600 font-bold">
                                      ⚠ Melewati jadwal kembali ke pesantren!
                                    </div>
                                  )}
                                  {rec.returnToPesantrenDate && (
                                    <div className="text-emerald-700 font-semibold">
                                      Kembali Aktual: {rec.returnToPesantrenDate}{' '}
                                      {rec.conditionAtReturn ? `(${rec.conditionAtReturn})` : ''}
                                    </div>
                                  )}
                                </div>
                              )}
                              {(rec.followUps || []).length > 0 && (
                                <div className="text-[10px] font-semibold text-teal-700">
                                  +{(rec.followUps || []).length} catatan perkembangan / tindak lanjut
                                </div>
                              )}
                              {rec.headEvaluationNote && (
                                <div className="text-[10px] font-semibold text-indigo-700 truncate max-w-xs">
                                  Arahan Kepala: {rec.headEvaluationNote}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  overdueIzin
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : rec.status === 'Sudah Sembuh' ||
                                      rec.status === 'Sudah Kembali ke Pesantren' ||
                                      rec.status === 'Sudah Kembali' ||
                                      rec.status === 'Selesai'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {overdueIzin ? 'Belum Kembali (Terlambat)' : rec.status || 'Tercatat'}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Oleh: {rec.recordedByName || rec.createdBy || 'Petugas'}{' '}
                                {rec.recordedByRole ? `(${rec.recordedByRole})` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => openDetailMonitoringModal(rec)}
                                  className="px-2.5 py-1.5 rounded-lg text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold"
                                  title="Detail & Tindak Lanjut"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Tindak Lanjut</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditRecord(rec)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition cursor-pointer"
                                  title="Ubah Catatan Kesantrian"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            Belum ada data catatan untuk <strong>{RECORD_TYPE_CONFIG[currentRecordType].label}</strong>.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: TAMBAH / EDIT CATATAN KESANTRIAN
          ("Pilih Santri" mengambil langsung dari Master Data Siswa utama)
         ===================================================================== */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingRecord
                    ? `Ubah Catatan ${RECORD_TYPE_CONFIG[recordForm.type].label}`
                    : `Tambah Catatan ${RECORD_TYPE_CONFIG[recordForm.type].label}`}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Menggunakan referensi <code>studentId</code> langsung dari Master Data Siswa utama
                </p>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRecord} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Jenis Catatan (Apabila dibuka dari Dashboard) */}
              {!editingRecord && activeSection === 'DASHBOARD' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Modul Kesantrian <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={recordForm.type}
                    onChange={(e) => {
                      const nextType = e.target.value as KesantrianRecordType;
                      const cfg = RECORD_TYPE_CONFIG[nextType];
                      setRecordForm({
                        ...recordForm,
                        type: nextType,
                        category: cfg.categories[0] || '',
                        status: cfg.statuses[0] || 'Tercatat',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="PELANGGARAN">Pelanggaran Santri</option>
                    <option value="SAKIT">Santri Sakit</option>
                    <option value="IZIN_PULANG">Izin / Pulang Santri</option>
                    <option value="MABIT">Mabit &amp; Keasramaan</option>
                    <option value="OBAT_P3K">Obat &amp; P3K</option>
                  </select>
                </div>
              )}

              {/* ============================================================
                  REQUIREMENT 3 & 4: PILIH SANTRI DARI DATA SISWA UTAMA
                  Hanya menampilkan siswa berstatus AKTIF untuk catatan baru.
                  Menampilkan Nama Santri, NIS/NISN, dan Kelas.
                 ============================================================ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="select-pilih-santri" className="font-semibold text-slate-700">
                    Pilih Santri <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-teal-700 font-medium">
                    Master Data Siswa Aktif ({activeStudentsList.length} santri)
                  </span>
                </div>

                {/* Search Input untuk memudahkan pencarian santri dari Master Data Siswa */}
                {!editingRecord && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentPickerQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudentPickerQuery(val);
                        // Auto-select first matching active student when searching
                        const q = val.trim().toLowerCase();
                        if (q) {
                          const firstMatch = activeStudentsList.find((st) => {
                            const clsName = getClassName(st.classId).toLowerCase();
                            return (
                              (st.name || '').toLowerCase().includes(q) ||
                              (st.nisn || '').toLowerCase().includes(q) ||
                              (st.nis || '').toLowerCase().includes(q) ||
                              clsName.includes(q)
                            );
                          });
                          if (firstMatch) {
                            setRecordForm((prev) => ({ ...prev, studentId: firstMatch.id }));
                          }
                        }
                      }}
                      placeholder="Cari santri (Nama Santri, NIS/NISN, atau Kelas)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                )}

                {/* Dropdown Pilih Santri (Mengambil langsung dari Master Data Siswa) */}
                <select
                  id="select-pilih-santri"
                  aria-label="Pilih Santri"
                  value={recordForm.studentId}
                  onChange={(e) => setRecordForm({ ...recordForm, studentId: e.target.value })}
                  disabled={Boolean(editingRecord)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:bg-slate-50"
                  required
                >
                  <option value="">-- Pilih Santri --</option>
                  {filteredActiveStudentsForPicker.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} | {formatNisOrNisn(st)} | Kelas {getClassName(st.classId)}
                    </option>
                  ))}
                  {/* Jika sedang mengedit catatan lama yang santrinya kini nonaktif, tetap tampilkan dari arsip Master Data Siswa */}
                  {editingRecord &&
                    !activeStudentsList.some((s) => s.id === editingRecord.studentId) && (() => {
                      const archivedInfo = resolveStudentFromMaster(editingRecord);
                      return (
                        <option value={editingRecord.studentId}>
                          {archivedInfo.name} | {archivedInfo.nisnLabel} | Kelas {archivedInfo.className} (Nonaktif - Arsip)
                        </option>
                      );
                    })()}
                </select>

                {/* Daftar Pilihan Cepat saat mencari santri */}
                {!editingRecord && studentPickerQuery.trim() !== '' && (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
                    {filteredActiveStudentsForPicker.map((st) => {
                      const isSelected = recordForm.studentId === st.id;
                      return (
                        <button
                          type="button"
                          key={st.id}
                          onClick={() => {
                            setRecordForm({ ...recordForm, studentId: st.id });
                            setStudentPickerQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 transition cursor-pointer flex items-center justify-between ${
                            isSelected ? 'bg-teal-50/80' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="leading-snug">
                            <div className="font-bold text-slate-900">{st.name}</div>
                            <div className="text-[11px] font-mono text-slate-600">
                              {formatNisOrNisn(st)}
                            </div>
                            <div className="text-[11px] font-semibold text-teal-700">
                              Kelas {getClassName(st.classId)}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    {filteredActiveStudentsForPicker.length === 0 && (
                      <div className="py-3 px-3 text-center text-slate-400 text-[11px]">
                        Tidak ada santri aktif yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>
                )}

                {/* Tampilan Informasi Santri Terpilih (Format: Nama Santri, NIS/NISN, Kelas dari Master Data Siswa) */}
                {recordForm.studentId && (() => {
                  const st = students.find((s) => s.id === recordForm.studentId);
                  const fallbackName = st?.name || editingRecord?.studentName || '-';
                  const fallbackNisn = formatNisOrNisn(st, editingRecord?.nisn, editingRecord?.nis);
                  const fallbackClass = st
                    ? getClassName(st.classId)
                    : editingRecord?.className || getClassName(editingRecord?.classId);
                  return (
                    <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5 leading-snug">
                        <div className="font-bold text-slate-900 text-xs">{fallbackName}</div>
                        <div className="font-mono text-[11px] text-slate-700">{fallbackNisn}</div>
                        <div className="font-semibold text-[11px] text-teal-700">
                          Kelas {fallbackClass}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-teal-700 border border-teal-200">
                        Master Siswa
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Tanggal Kejadian, Tahun Ajaran, Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Kejadian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={recordForm.date}
                    onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
                  <select
                    value={recordForm.academicYearId}
                    onChange={(e) =>
                      setRecordForm({ ...recordForm, academicYearId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} ({ay.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <select
                    value={recordForm.semester}
                    onChange={(e) =>
                      setRecordForm({
                        ...recordForm,
                        semester: e.target.value as 'Ganjil' | 'Genap',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              {/* Kategori & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={recordForm.category}
                    onChange={(e) => setRecordForm({ ...recordForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {RECORD_TYPE_CONFIG[recordForm.type].categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={recordForm.status}
                    onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {RECORD_TYPE_CONFIG[recordForm.type].statuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Judul / Ringkasan Kejadian */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {RECORD_TYPE_CONFIG[recordForm.type].titleLabel}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={recordForm.title}
                  onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                  placeholder={RECORD_TYPE_CONFIG[recordForm.type].titlePlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              {/* Keterangan / Deskripsi */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {RECORD_TYPE_CONFIG[recordForm.type].descLabel}
                </label>
                <textarea
                  rows={2}
                  value={recordForm.description}
                  onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                  placeholder={RECORD_TYPE_CONFIG[recordForm.type].descPlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* Tindakan / Penanganan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {RECORD_TYPE_CONFIG[recordForm.type].actionLabel}
                </label>
                <input
                  type="text"
                  value={recordForm.actionTaken}
                  onChange={(e) => setRecordForm({ ...recordForm, actionTaken: e.target.value })}
                  placeholder={RECORD_TYPE_CONFIG[recordForm.type].actionPlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* Detail Tambahan Khusus Santri Sakit: Dijemput Orang Tua / Pulang & Konfirmasi Sembuh */}
              {recordForm.type === 'SAKIT' && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        recordForm.needsParentPickup ||
                        recordForm.status === 'Perlu Dijemput Orang Tua' ||
                        recordForm.status === 'Dipulangkan karena Sakit' ||
                        recordForm.category === 'Istirahat Pulang'
                      }
                      onChange={(e) =>
                        setRecordForm({
                          ...recordForm,
                          needsParentPickup: e.target.checked,
                          status: e.target.checked
                            ? 'Perlu Dijemput Orang Tua'
                            : recordForm.status,
                        })
                      }
                      className="rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Santri Perlu Dijemput Orang Tua / Dipulangkan Sementara karena Sakit</span>
                  </label>

                  {(recordForm.needsParentPickup ||
                    recordForm.status === 'Perlu Dijemput Orang Tua' ||
                    recordForm.status === 'Dipulangkan karena Sakit' ||
                    recordForm.category === 'Istirahat Pulang') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tanggal Pulang / Dijemput
                        </label>
                        <input
                          type="date"
                          value={recordForm.sickLeaveDate || recordForm.date}
                          onChange={(e) =>
                            setRecordForm({ ...recordForm, sickLeaveDate: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Perkiraan Kembali ke Pesantren
                        </label>
                        <input
                          type="date"
                          value={recordForm.estimatedReturnDate}
                          onChange={(e) =>
                            setRecordForm({ ...recordForm, estimatedReturnDate: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Alasan Dipulangkan
                        </label>
                        <input
                          type="text"
                          value={recordForm.sickLeaveReason}
                          onChange={(e) =>
                            setRecordForm({ ...recordForm, sickLeaveReason: e.target.value })
                          }
                          placeholder="Contoh: Perlu istirahat & observasi di rumah"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Kondisi Saat Pulang
                        </label>
                        <input
                          type="text"
                          value={recordForm.conditionAtLeave}
                          onChange={(e) =>
                            setRecordForm({ ...recordForm, conditionAtLeave: e.target.value })
                          }
                          placeholder="Contoh: Demam 38.5C, sudah diberi obat awal"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Catatan untuk Orang Tua / Wali
                        </label>
                        <input
                          type="text"
                          value={recordForm.parentNotes}
                          onChange={(e) =>
                            setRecordForm({ ...recordForm, parentNotes: e.target.value })
                          }
                          placeholder="Pesan pemantauan obat atau jadwal kontrol dokter..."
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {recordForm.status === 'Sudah Sembuh' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-amber-200">
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                          Tanggal Konfirmasi Sembuh
                        </label>
                        <input
                          type="date"
                          value={recordForm.recoveredConfirmedDate || todayStr}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              recoveredConfirmedDate: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                          Tanggal Kembali ke Pesantren
                        </label>
                        <input
                          type="date"
                          value={recordForm.returnToPesantrenDate || todayStr}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              returnToPesantrenDate: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                          Kondisi Saat Kembali
                        </label>
                        <input
                          type="text"
                          value={recordForm.conditionAtReturn}
                          onChange={(e) =>
                            setRecordForm({ ...recordForm, conditionAtReturn: e.target.value })
                          }
                          placeholder="Contoh: Sehat, suhu normal, siap belajar"
                          className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                          Catatan Tambahan Kesembuhan
                        </label>
                        <input
                          type="text"
                          value={recordForm.recoveryAdditionalNotes}
                          onChange={(e) =>
                            setRecordForm({
                              ...recordForm,
                              recoveryAdditionalNotes: e.target.value,
                            })
                          }
                          placeholder="Catatan surat dokter / vitamin lanjutan..."
                          className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detail Tambahan Khusus Izin / Pulang Santri */}
              {recordForm.type === 'IZIN_PULANG' && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                      Batas Tanggal Kembali ke Pesantren
                    </label>
                    <input
                      type="date"
                      value={recordForm.returnDate}
                      onChange={(e) => setRecordForm({ ...recordForm, returnDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-blue-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                      Batas Jam Kembali
                    </label>
                    <input
                      type="time"
                      value={recordForm.returnTime}
                      onChange={(e) => setRecordForm({ ...recordForm, returnTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-blue-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                      Catatan Komunikasi dengan Orang Tua / Wali
                    </label>
                    <input
                      type="text"
                      value={recordForm.parentNotes}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, parentNotes: e.target.value })
                      }
                      placeholder="Contoh: Sudah konfirmasi via telepon dengan orang tua..."
                      className="w-full px-2.5 py-1.5 rounded-xl border border-blue-200 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: DETAIL & PEMANTAUAN TINDAK LANJUT CATATAN KESANTRIAN
         ===================================================================== */}
      {detailRecord && (() => {
        const resolved = resolveStudentFromMaster(detailRecord);
        const cfg = RECORD_TYPE_CONFIG[detailRecord.type];
        const followUps = detailRecord.followUps || [];
        const masterSt = resolved.masterStudent;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.badgeClass}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {detailRecord.date} &bull; {detailRecord.academicYearName} ({detailRecord.semester})
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                    Detail Kejadian &amp; Pemantauan Tindak Lanjut
                  </h3>
                </div>
                <button
                  onClick={() => setDetailRecordId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
                {/* Data Santri & Wali dari Master Data Siswa */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Identitas Santri (Master Siswa)
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">{resolved.name}</div>
                    <div className="font-mono text-[11px] text-slate-600">{resolved.nisnLabel}</div>
                    <div className="text-[11px] font-semibold text-teal-700 mt-0.5">
                      Kelas {resolved.className}
                    </div>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Informasi Orang Tua / Wali
                    </div>
                    <div className="text-slate-700 mt-0.5">
                      Nama Orang Tua / Wali:{' '}
                      <strong className="text-slate-900">
                        {masterSt?.parentName || '-'}
                      </strong>
                    </div>
                    {masterSt?.parentPhone && (
                      <div className="text-[11px] text-teal-700 font-mono flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        <span>HP Wali: {masterSt.parentPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ringkasan Kejadian & Penanganan Awal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">
                      {cfg.titleLabel}:
                    </span>
                    <div className="font-bold text-slate-900 mt-0.5">{detailRecord.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Kategori: <strong className="text-slate-700">{detailRecord.category}</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-xl">
                    <span className="text-[11px] text-teal-700 block font-semibold">
                      {cfg.actionLabel}:
                    </span>
                    <div className="font-medium text-teal-950 mt-0.5">
                      {detailRecord.actionTaken || 'Belum ada catatan penanganan awal'}
                    </div>
                    {detailRecord.returnDate && (
                      <div className="text-[11px] text-teal-700 mt-1">
                        Tanggal Selesai/Kembali: <strong>{detailRecord.returnDate}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {detailRecord.description && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[11px] text-slate-500 block font-semibold mb-1">
                      {cfg.descLabel}:
                    </span>
                    <div className="text-slate-700 whitespace-pre-wrap">
                      {detailRecord.description}
                    </div>
                  </div>
                )}

                {/* Panel Khusus Pemantauan Santri Sakit (Hari Sakit, Peringatan >= 3 Hari, Pemulangan, & Kesembuhan) */}
                {detailRecord.type === 'SAKIT' && (() => {
                  const sickDays = calculateSickDays(detailRecord);
                  const isStillSick =
                    detailRecord.status !== 'Sudah Sembuh' &&
                    detailRecord.status !== 'Sudah Kembali ke Pesantren' &&
                    detailRecord.status !== 'Selesai';
                  return (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                              sickDays >= 3 && isStillSick
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            Pemantauan Sakit: Hari ke-{sickDays}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            Mulai sakit: {detailRecord.date}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowSickLeaveBox(!showSickLeaveBox);
                              setShowRecoveryBox(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-semibold text-[11px] hover:bg-orange-700 cursor-pointer"
                          >
                            {showSickLeaveBox ? 'Tutup Form Pulang' : 'Catat Dijemput Ortu / Pulang'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRecoveryBox(!showRecoveryBox);
                              setShowSickLeaveBox(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 cursor-pointer"
                          >
                            {showRecoveryBox ? 'Tutup Form Sembuh' : 'Konfirmasi Sembuh & Kembali'}
                          </button>
                        </div>
                      </div>

                      {sickDays >= 3 && isStillSick && (
                        <div className="p-3 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-950 font-semibold flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-rose-900">
                              PERLU PERHATIAN — Evaluasi Hari ke-{sickDays}
                            </div>
                            <div className="text-[11px] mt-0.5">
                              &ldquo;Santri sudah sakit {sickDays} hari — perlu ditentukan apakah dijemput orang tua.&rdquo;
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info Pemulangan karena Sakit jika sudah diisi */}
                      {(detailRecord.needsParentPickup ||
                        detailRecord.sickLeaveDate ||
                        detailRecord.sickLeaveReason ||
                        detailRecord.conditionAtLeave ||
                        detailRecord.parentNotes ||
                        detailRecord.estimatedReturnDate) && (
                        <div className="p-3 rounded-xl bg-white border border-orange-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="sm:col-span-2 font-bold text-orange-900 border-b border-orange-100 pb-1">
                            Informasi Kepulangan / Penjemputan Orang Tua
                          </div>
                          <div>
                            <span className="text-slate-500">Tanggal Pulang:</span>{' '}
                            <strong className="text-slate-800">
                              {detailRecord.sickLeaveDate || detailRecord.date}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Perkiraan Kembali:</span>{' '}
                            <strong className="text-slate-800">
                              {detailRecord.estimatedReturnDate || detailRecord.returnDate || '-'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Alasan:</span>{' '}
                            <strong className="text-slate-800">
                              {detailRecord.sickLeaveReason || detailRecord.title}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Kondisi Saat Pulang:</span>{' '}
                            <strong className="text-slate-800">
                              {detailRecord.conditionAtLeave || '-'}
                            </strong>
                          </div>
                          {detailRecord.parentNotes && (
                            <div className="sm:col-span-2">
                              <span className="text-slate-500">Catatan untuk Orang Tua:</span>{' '}
                              <strong className="text-slate-800">{detailRecord.parentNotes}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info Konfirmasi Sembuh & Kembali ke Pesantren */}
                      {(detailRecord.recoveredConfirmedDate ||
                        detailRecord.returnToPesantrenDate ||
                        detailRecord.conditionAtReturn) && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="sm:col-span-2 font-bold text-emerald-900 border-b border-emerald-200 pb-1">
                            Konfirmasi Kesembuhan &amp; Kembali ke Pesantren
                          </div>
                          <div>
                            <span className="text-emerald-700">Tanggal Konfirmasi Sembuh:</span>{' '}
                            <strong className="text-emerald-950">
                              {detailRecord.recoveredConfirmedDate || '-'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-emerald-700">Tanggal Kembali ke Pesantren:</span>{' '}
                            <strong className="text-emerald-950">
                              {detailRecord.returnToPesantrenDate || detailRecord.returnDate || '-'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-emerald-700">Kondisi Saat Kembali:</span>{' '}
                            <strong className="text-emerald-950">
                              {detailRecord.conditionAtReturn || '-'}
                            </strong>
                          </div>
                          {detailRecord.recoveryAdditionalNotes && (
                            <div>
                              <span className="text-emerald-700">Catatan Tambahan:</span>{' '}
                              <strong className="text-emerald-950">
                                {detailRecord.recoveryAdditionalNotes}
                              </strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Form Cepat Pemulangan Santri Sakit */}
                      {showSickLeaveBox && (
                        <form
                          onSubmit={handleSaveSickLeaveUpdate}
                          className="p-3 rounded-xl bg-white border border-orange-300 space-y-2.5"
                        >
                          <div className="font-bold text-orange-900">
                            Catat Penjemputan Orang Tua / Pemulangan Santri Sakit
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Tanggal Pulang
                              </label>
                              <input
                                type="date"
                                value={sickLeaveBoxForm.sickLeaveDate}
                                onChange={(e) =>
                                  setSickLeaveBoxForm({
                                    ...sickLeaveBoxForm,
                                    sickLeaveDate: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Perkiraan Kembali ke Pesantren
                              </label>
                              <input
                                type="date"
                                value={sickLeaveBoxForm.estimatedReturnDate}
                                onChange={(e) =>
                                  setSickLeaveBoxForm({
                                    ...sickLeaveBoxForm,
                                    estimatedReturnDate: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Alasan Pulang / Dijemput
                              </label>
                              <input
                                type="text"
                                value={sickLeaveBoxForm.sickLeaveReason}
                                onChange={(e) =>
                                  setSickLeaveBoxForm({
                                    ...sickLeaveBoxForm,
                                    sickLeaveReason: e.target.value,
                                  })
                                }
                                placeholder="Perlu pemeriksaan lanjut / istirahat di rumah"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Kondisi Saat Pulang
                              </label>
                              <input
                                type="text"
                                value={sickLeaveBoxForm.conditionAtLeave}
                                onChange={(e) =>
                                  setSickLeaveBoxForm({
                                    ...sickLeaveBoxForm,
                                    conditionAtLeave: e.target.value,
                                  })
                                }
                                placeholder="Contoh: Masih demam ringan, lemas"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                                required
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Catatan untuk Orang Tua
                              </label>
                              <input
                                type="text"
                                value={sickLeaveBoxForm.parentNotes}
                                onChange={(e) =>
                                  setSickLeaveBoxForm({
                                    ...sickLeaveBoxForm,
                                    parentNotes: e.target.value,
                                  })
                                }
                                placeholder="Catatan konsumsi obat & pemantauan di rumah..."
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 cursor-pointer"
                            >
                              Simpan Data Kepulangan Sakit
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Form Cepat Konfirmasi Sembuh & Kembali ke Pesantren */}
                      {showRecoveryBox && (
                        <form
                          onSubmit={handleSaveRecoveryConfirm}
                          className="p-3 rounded-xl bg-white border border-emerald-300 space-y-2.5"
                        >
                          <div className="font-bold text-emerald-900">
                            Konfirmasi Santri Sembuh &amp; Kembali ke Pesantren
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Tanggal Konfirmasi Sembuh
                              </label>
                              <input
                                type="date"
                                value={recoveryBoxForm.recoveredConfirmedDate}
                                onChange={(e) =>
                                  setRecoveryBoxForm({
                                    ...recoveryBoxForm,
                                    recoveredConfirmedDate: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Tanggal Kembali ke Pesantren
                              </label>
                              <input
                                type="date"
                                value={recoveryBoxForm.returnToPesantrenDate}
                                onChange={(e) =>
                                  setRecoveryBoxForm({
                                    ...recoveryBoxForm,
                                    returnToPesantrenDate: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Kondisi Saat Kembali
                              </label>
                              <input
                                type="text"
                                value={recoveryBoxForm.conditionAtReturn}
                                onChange={(e) =>
                                  setRecoveryBoxForm({
                                    ...recoveryBoxForm,
                                    conditionAtReturn: e.target.value,
                                  })
                                }
                                placeholder="Sehat & siap mengikuti kegiatan"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Catatan Tambahan
                              </label>
                              <input
                                type="text"
                                value={recoveryBoxForm.recoveryAdditionalNotes}
                                onChange={(e) =>
                                  setRecoveryBoxForm({
                                    ...recoveryBoxForm,
                                    recoveryAdditionalNotes: e.target.value,
                                  })
                                }
                                placeholder="Catatan tambahan setelah kembali..."
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                            >
                              Simpan Konfirmasi Sembuh
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })()}

                {/* Panel Khusus Konfirmasi Kembali untuk Izin / Pulang Santri */}
                {detailRecord.type === 'IZIN_PULANG' && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-blue-900">
                          Jadwal Kembali ke Pesantren: {detailRecord.returnDate || '-'}{' '}
                          {detailRecord.returnTime ? `(${detailRecord.returnTime})` : ''}
                        </span>
                        {isIzinOverdue(detailRecord) && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                            Belum Kembali (Melewati Jadwal!)
                          </span>
                        )}
                      </div>
                      {detailRecord.status !== 'Sudah Kembali' && (
                        <button
                          type="button"
                          onClick={() => setShowRecoveryBox(!showRecoveryBox)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 cursor-pointer"
                        >
                          {showRecoveryBox ? 'Tutup Form' : 'Konfirmasi Sudah Kembali'}
                        </button>
                      )}
                    </div>

                    {showRecoveryBox && (
                      <form
                        onSubmit={handleSaveRecoveryConfirm}
                        className="p-3 rounded-xl bg-white border border-emerald-300 grid grid-cols-1 sm:grid-cols-3 gap-2"
                      >
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Tanggal Kembali Aktual
                          </label>
                          <input
                            type="date"
                            value={recoveryBoxForm.returnToPesantrenDate}
                            onChange={(e) =>
                              setRecoveryBoxForm({
                                ...recoveryBoxForm,
                                returnToPesantrenDate: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                            Kondisi Saat Kembali
                          </label>
                          <input
                            type="text"
                            value={recoveryBoxForm.conditionAtReturn}
                            onChange={(e) =>
                              setRecoveryBoxForm({
                                ...recoveryBoxForm,
                                conditionAtReturn: e.target.value,
                              })
                            }
                            placeholder="Baik & lengkap"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                            required
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                          >
                            Simpan Kembali
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Perbarui Status Penanganan Secara Cepat */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      Status Penanganan Saat Ini:{' '}
                      <span className="text-teal-700">{detailRecord.status}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Klik untuk memperbarui status tindak lanjut:
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cfg.statuses.map((st) => {
                      const active = detailRecord.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleQuickRecordStatusChange(detailRecord, st)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            active
                              ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Arahan & Evaluasi Kepala Kesantrian */}
                <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span>Arahan / Evaluasi Kepala Kesantrian</span>
                    </span>
                    {detailRecord.evaluatedBy && (
                      <span className="text-[10px] text-teal-700 font-medium">
                        Oleh: {detailRecord.evaluatedBy}
                      </span>
                    )}
                  </div>

                  {isKepalaKesantrian ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={headEvalInput}
                        onChange={(e) => setHeadEvalInput(e.target.value)}
                        placeholder="Tulis arahan atau evaluasi Kepala Kesantrian untuk penanganan kasus ini..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-teal-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveHeadEvaluation(detailRecord)}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 transition cursor-pointer shrink-0"
                      >
                        Simpan Evaluasi
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-700 italic">
                      {detailRecord.headEvaluationNote ||
                        'Belum ada catatan evaluasi khusus dari Kepala Kesantrian.'}
                    </div>
                  )}
                </div>

                {/* Riwayat Tindak Lanjut & Pemantauan Berkelanjutan */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MessageSquarePlus className="w-4 h-4 text-teal-600" />
                      <span>Riwayat Tindak Lanjut Petugas ({followUps.length})</span>
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Bertugas sebagai: <strong>{currentOfficerLabel}</strong>
                    </span>
                  </div>

                  {followUps.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {followUps.map((fu) => (
                        <div
                          key={fu.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{fu.createdBy}</span>
                              {fu.createdByRole && (
                                <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                                  {fu.createdByRole}
                                </span>
                              )}
                              {fu.actionType && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                  {fu.actionType}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-slate-500">
                              {fu.date} {fu.time ? `• ${fu.time}` : ''}
                            </span>
                          </div>
                          <div className="text-slate-700 leading-relaxed">{fu.note}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-slate-400 text-[11px] bg-slate-50 rounded-xl">
                      Belum ada catatan tindak lanjut untuk kejadian ini.
                    </div>
                  )}

                  {/* Form Tambah Tindak Lanjut */}
                  <form onSubmit={handleAddRecordFollowUp} className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Tanggal Tindak Lanjut
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Catatan Tindak Lanjut ({currentOfficerLabel})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={followUpNote}
                            onChange={(e) => setFollowUpNote(e.target.value)}
                            placeholder="Contoh: Suhu tubuh sudah turun / Wali santri sudah dihubungi..."
                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition cursor-pointer shrink-0"
                          >
                            + Simpan
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Informasi Pencatat & Audit (Requirement 5: createdBy, createdByName, createdByRole, tanggal & waktu) */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span>Dicatat oleh: </span>
                    <strong className="text-slate-900">
                      {detailRecord.createdByName ||
                        detailRecord.recordedByName ||
                        detailRecord.createdBy ||
                        'Petugas Kesantrian'}
                    </strong>
                    <span> &bull; Jabatan: </span>
                    <strong className="text-teal-800">
                      {detailRecord.createdByRole ||
                        detailRecord.recordedByRole ||
                        'Petugas Kesantrian'}
                    </strong>
                    <span> &bull; Tanggal: </span>
                    <span className="font-mono">
                      {detailRecord.createdAt
                        ? detailRecord.createdAt.replace('T', ' ').slice(0, 16)
                        : detailRecord.date}
                    </span>
                  </div>
                  {detailRecord.updatedBy && (
                    <div>
                      Diperbarui terakhir oleh:{' '}
                      <strong className="text-slate-800">
                        {detailRecord.updatedByName || detailRecord.updatedBy}
                      </strong>
                      {detailRecord.updatedByRole ? ` (${detailRecord.updatedByRole})` : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetStId = detailRecord.studentId;
                    setDetailRecordId(null);
                    setSelectedSantriHistoryId(targetStId);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-800 hover:bg-teal-100 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Seluruh Riwayat Santri Ini</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const recToEdit = detailRecord;
                      setDetailRecordId(null);
                      handleOpenEditRecord(recToEdit);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-teal-700 hover:bg-teal-50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah Data Kejadian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailRecordId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white hover:bg-slate-900 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL 3: TAMBAH / EDIT INVENTARIS OBAT & P3K
         ===================================================================== */}
      {isMedicineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingMedicine ? 'Ubah Stok Obat / P3K' : 'Tambah Item Obat & P3K'}
              </h3>
              <button
                onClick={() => setIsMedicineModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitMedicine} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Obat / Perlengkapan P3K <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={medicineForm.name}
                  onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                  placeholder="Contoh: Paracetamol 500mg / Betadine Antiseptik"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={medicineForm.category}
                    onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="Obat Dalam">Obat Dalam</option>
                    <option value="Obat Luar">Obat Luar</option>
                    <option value="P3K">Perlengkapan P3K</option>
                    <option value="Vitamin">Vitamin / Suplemen</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok</label>
                  <input
                    type="number"
                    min={0}
                    value={medicineForm.stock}
                    onChange={(e) =>
                      setMedicineForm({ ...medicineForm, stock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={medicineForm.unit}
                    onChange={(e) => setMedicineForm({ ...medicineForm, unit: e.target.value })}
                    placeholder="Tablet / Botol"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan / Indikasi
                </label>
                <input
                  type="text"
                  value={medicineForm.notes}
                  onChange={(e) => setMedicineForm({ ...medicineForm, notes: e.target.value })}
                  placeholder="Contoh: Obat penurun panas & pereda nyeri"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMedicineModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition cursor-pointer disabled:opacity-50"
                >
                  Simpan Obat / P3K
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: RIWAYAT LENGKAP KESANTRIAN SANTRI (LINTAS MODUL)
         ===================================================================== */}
      {selectedSantriHistoryId && (() => {
        const st = students.find((s) => s.id === selectedSantriHistoryId);
        if (!st) return null;
        const stRecords = activeKesantrianRecords
          .filter((r) => r.studentId === st.id)
          .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
        const stMabitPeriods = mabitPeriods.filter((mp) =>
          (mp.participants || []).some((pt) => pt.studentId === st.id)
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                    Rekapitulasi Lintas Modul Kesantrian
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {st.name} &bull; Kelas {getClassName(st.classId)}
                  </h3>
                  <div className="text-xs font-mono text-slate-500">{formatNisOrNisn(st)}</div>
                </div>
                <button
                  onClick={() => setSelectedSantriHistoryId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="text-[10px] text-rose-600 font-semibold">Pelanggaran</div>
                    <div className="text-lg font-bold text-rose-800">
                      {stRecords.filter((r) => r.type === 'PELANGGARAN').length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[10px] text-amber-600 font-semibold">Santri Sakit</div>
                    <div className="text-lg font-bold text-amber-800">
                      {stRecords.filter((r) => r.type === 'SAKIT').length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-[10px] text-blue-600 font-semibold">Izin/Pulang</div>
                    <div className="text-lg font-bold text-blue-800">
                      {stRecords.filter((r) => r.type === 'IZIN_PULANG').length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div className="text-[10px] text-indigo-600 font-semibold">Periode Mabit</div>
                    <div className="text-lg font-bold text-indigo-800">
                      {stMabitPeriods.length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] text-emerald-600 font-semibold">Obat &amp; P3K</div>
                    <div className="text-lg font-bold text-emerald-800">
                      {stRecords.filter((r) => r.type === 'OBAT_P3K').length}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">
                    Daftar Catatan Kejadian &amp; Tindak Lanjut ({stRecords.length})
                  </h4>
                  {stRecords.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {stRecords.map((rec) => {
                        const cfg = RECORD_TYPE_CONFIG[rec.type];
                        return (
                          <div
                            key={rec.id}
                            className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.badgeClass}`}
                                >
                                  {cfg.label}
                                </span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  {rec.date}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                  {rec.status}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900">{rec.title}</div>
                              {rec.actionTaken && (
                                <div className="text-[11px] text-slate-500">
                                  Penanganan: {rec.actionTaken}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSantriHistoryId(null);
                                openDetailMonitoringModal(rec);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 font-semibold text-[11px] shrink-0 cursor-pointer"
                            >
                              Tindak Lanjut
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                      Belum ada riwayat kejadian kesantrian untuk santri ini.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSantriHistoryId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
