/**
 * AKSARA - Data Types & Relational Interfaces
 * Sistem Informasi Manajemen Akademik dan Administrasi Sekolah
 */

export type UserRole =
  | 'ADMIN'
  | 'MUDIR'
  | 'mudir'
  | 'KEPALA_SEKOLAH'
  | 'WALI_KELAS'
  | 'GURU_MAPEL'
  | 'PENGAMPU_HALAQAH'
  | 'pengampu_halaqah'
  | 'KEPALA_KESANTRIAN'
  | 'MUSYRIF_KESANTRIAN'
  | 'kepala_kesantrian'
  | 'musyrif_kesantrian'
  | 'PETUGAS_KESANTRIAN';

export type KesantrianOfficerRole = 'KEPALA_KESANTRIAN' | 'MUSYRIF_KESANTRIAN';

export interface UserProfile {
  id: string; // Document ID (matches Firebase Auth UID)
  userId: string; // Auth UID
  uid?: string; // Firebase Auth UID alias
  username: string; // Lowercase, unique for username-based login
  email: string;
  displayName: string;
  name: string; // Keep for existing references
  role: UserRole; // Primary role (retained for 100% backward compatibility)
  roles?: UserRole[]; // Multi-role support: array of assigned roles
  roleCode?: string; // e.g. 'kepala_kesantrian' | 'musyrif_kesantrian'
  kesantrianRole?: KesantrianOfficerRole; // Jabatan spesifik di Kesantrian: Kepala Kesantrian atau Musyrif Kesantrian
  nip?: string | null;
  phone?: string | null;
  avatarUrl?: string;
  teacherId?: string | null; // Relation to Teacher if role is WALI_KELAS or GURU_MAPEL or KEPALA_SEKOLAH (null for ADMIN)
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface AcademicYear {
  id: string;
  name: string; // e.g., "2025/2026"
  semester: 'Ganjil' | 'Genap';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  email: string;
  gender: 'L' | 'P';
  phone?: string;
  status: 'PNS' | 'PPPK' | 'GTT' | 'Honor' | 'Yayasan';
  specialization?: string; // Bidang keahlian
  isActive: boolean;
  notes?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g., "VII-A", "VIII-B", "IX-C", "X-MIPA-1"
  gradeLevel: number; // e.g., 7, 8, 9, 10, 11, 12
  academicYearId: string;
  semester?: 'Ganjil' | 'Genap';
  homeroomTeacherId: string; // Wali Kelas (teacherId)
  teacherId?: string; // Alias for homeroomTeacherId
  capacity: number;
  isActive?: boolean;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  classId: string; // Relasi ke SchoolClass
  academicYearId: string; // Relasi ke AcademicYear
  status: 'Aktif' | 'Nonaktif' | 'Lulus' | 'Pindah' | 'Keluar';
}

export interface Subject {
  id: string;
  code: string; // e.g., "MAT-VII", "BIN-VII", "EKS-PRM"
  name: string; // e.g., "Matematika", "Bahasa Indonesia", "Pertanian"
  nameArab?: string; // Tulisan Arab (Unicode) yang dimasukkan manual oleh admin
  kkm: number; // Kriteria Ketuntasan Minimal, e.g., 75
  category: 'Diniyah' | 'Umum' | 'Peminatan' | 'Muatan Lokal' | (string & {});
  type?: 'subject' | 'extracurricular' | string;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap';
  totalHoursPerWeek?: number;
  status?: 'Aktif' | 'Nonaktif' | 'Historis' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Score {
  id: string;
  studentId: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap';
  type:
    | 'Tugas 1'
    | 'Tugas 2'
    | 'Tugas 3'
    | 'Tugas 4'
    | 'Tugas 5'
    | 'Tugas 6'
    | 'Tugas 7'
    | 'Tugas 8'
    | 'Tugas 9'
    | 'Tugas 10'
    | 'UH 1'
    | 'UH 2'
    | 'UH 3'
    | 'UH 4'
    | 'UH 5'
    | 'STS'
    | 'SAS'
    | 'Tugas'
    | 'UH'
    | (string & {});
  value: number; // 0 - 100
  notes?: string;
  date?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap';
  date: string; // YYYY-MM-DD
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  recordedByTeacherId?: string;
}

export interface StudentReportNote {
  id: string; // e.g. srn_{studentId}_{academicYearId}_{semester}
  studentId: string;
  classId?: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap' | 'GANJIL' | 'GENAP';
  note: string;
  updatedBy: string;
  updatedByName?: string;
  updatedByRole?: string;
  updatedAt: string;
}

export interface ReportCard {
  id: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap';
  academicRank?: number;
  totalScore?: number;
  averageScore?: number;
  attendanceSummary?: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
  };
  homeroomNotes?: string;
  headmasterNotes?: string;
  updatedBy?: string;
  updatedAt?: string;
  status: 'Draft' | 'Ditinjau' | 'Disahkan' | 'Diterbitkan';
}

export type CalculationMethod = 'WEIGHTED' | 'SIMPLE_AVERAGE';
export type RoundingOption = '1_decimal' | 'round' | 'none';

export interface AssessmentComponent {
  code: string; // e.g. 'Tugas', 'UH', 'STS', 'SAS'
  name: string; // e.g. 'Tugas Mandiri / Kelompok', 'Ulangan Harian'
  enabled: boolean;
  weight: number; // 0 - 100
  includedInFinalScore: boolean;
}

export interface AcademicSetting {
  id: string; // e.g. as_ay_2026_2027_1_Ganjil
  academicYearId: string;
  semester: 'Ganjil' | 'Genap';
  calculationMethod: CalculationMethod;
  components: AssessmentComponent[];
  rounding: RoundingOption;
  subjectKkmOverrides?: Record<string, number>; // subjectId -> kkm
  passingGradeStatus?: {
    passingLabel: string;
    remedialLabel: string;
    unassessedLabel: string;
  };
  version: number;
  status: 'Aktif' | 'Arsip';
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AcademicSettingLog {
  id: string;
  settingId: string;
  academicYearId: string;
  semester: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  changes: string[];
  previousState?: Partial<AcademicSetting>;
  newState?: Partial<AcademicSetting>;
}

export interface ExtracurricularParticipant {
  id: string; // e.g. ep_{studentId}_{extracurricularId}_{academicYearId}_{semester}
  studentId: string;
  extracurricularId: string;
  classId: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap' | string;
  status: 'active' | 'inactive' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtracurricularScore {
  id: string; // e.g. es_{studentId}_{extracurricularId}_{academicYearId}_{semester}
  studentId: string;
  extracurricularId: string;
  classId: string;
  academicYearId: string;
  semester: 'Ganjil' | 'Genap' | string;
  nilai: 'A' | 'B' | 'C' | 'D' | string;
  keterangan?: string;
  teacherId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PesantrenFacilityItem {
  id: string;
  name: string;
  description: string;
  isAvailable: boolean;
}

export interface EducationFacilityLevel {
  imageUrl?: string;
  storagePath?: string;
  title?: string;
  description?: string;
  updatedAt?: string;
}

export interface EducationFacilitiesMap {
  tk?: EducationFacilityLevel;
  sd?: EducationFacilityLevel;
  smp?: EducationFacilityLevel;
  sma?: EducationFacilityLevel;
  tkImageUrl?: string;
  sdImageUrl?: string;
  smpImageUrl?: string;
  smaImageUrl?: string;
}

export interface SchoolIdentity {
  id: string; // 'school_identity'
  schoolName: string; // Nama Lembaga/Sekolah
  programName: string; // Nama Program / PKBM (misal: PKBM AL-QOLAM)
  npsn: string; // NPSN
  address: string; // Alamat Sekolah
  mudirName: string; // Nama Mudir/Kepala Sekolah
  mudirNip: string; // NIP/NIK Mudir
  leaderTitle: string; // Jabatan Pimpinan (misal: Mudir / Kepala Sekolah)
  city: string; // Kota/Kabupaten
  logoUrl?: string; // URL atau Data URL Logo Sekolah / Pesantren
  logoUpdatedAt?: string; // Waktu terakhir logo diperbarui
  logoRemoved?: boolean; // Penanda eksplisit jika logo sengaja dihapus oleh Admin
  whatsapp?: string; // Nomor WhatsApp Resmi Pesantren
  email?: string; // Email Resmi Pesantren
  socialMedia?: string; // Kanal Media Sosial Resmi
  ppdbInfo?: string; // Informasi / Catatan Penerimaan Santri Baru
  facilities?: PesantrenFacilityItem[]; // Daftar Fasilitas Pesantren yang tersedia
  educationFacilities?: EducationFacilitiesMap; // Foto Gedung & Fasilitas setiap Jenjang: TK, SD, SMP, SMA
  updatedAt?: string;
  updatedBy?: string;
}

export type KesantrianRecordType =
  | 'PELANGGARAN'
  | 'SAKIT'
  | 'IZIN_PULANG'
  | 'MABIT'
  | 'OBAT_P3K';

export type KesantrianViolationLevel = 'Ringan' | 'Sedang' | 'Berat';

export type KesantrianViolationStatus = 'Belum Ditangani' | 'Dalam Pembinaan' | 'Selesai';

export interface KesantrianViolationCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface KesantrianFollowUp {
  id: string;
  date: string; // YYYY-MM-DD (Tanggal tindak lanjut)
  time?: string; // HH:mm (Waktu tindak lanjut)
  note: string; // Catatan pembinaan / pemantauan berkelanjutan
  conditionUpdate?: string; // Pembaruan kondisi santri (misal: Hari ke-2 masih demam / sudah membaik)
  actionType?: 'Tindak Lanjut Musyrif' | 'Evaluasi Kepala Kesantrian' | 'Pembaruan Status' | string;
  statusAfter?: string; // Status penanganan setelah tindak lanjut
  createdBy: string; // Nama petugas atau userId
  createdByName?: string; // Nama lengkap petugas
  createdByRole?: string; // Jabatan petugas (Kepala Kesantrian / Musyrif Kesantrian)
  createdByUserId?: string;
  createdAt: string; // ISO timestamp
}

export interface KesantrianRecord {
  id: string;
  type: KesantrianRecordType;
  studentId: string; // Relasi utama ke Student.id (master data siswa)
  studentName?: string; // Opsional (ditampilkan langsung dari master data siswa)
  nis?: string; // Opsional (ditampilkan langsung dari master data siswa)
  nisn?: string; // Opsional (ditampilkan langsung dari master data siswa)
  classId?: string; // Opsional (ditampilkan langsung dari master data siswa)
  className?: string; // Opsional (ditampilkan langsung dari master data kelas)
  date: string; // YYYY-MM-DD (tanggal kejadian)
  time?: string; // HH:mm (jam pencatatan / kejadian)
  incidentTime?: string; // HH:mm (waktu kejadian)
  semester: 'Ganjil' | 'Genap'; // Semester saat kejadian
  academicYearId: string; // Relasi ke AcademicYear.id
  academicYearName: string; // Tahun ajaran (contoh: 2025/2026)
  title: string; // Ringkasan / jenis kejadian
  violationCategoryId?: string; // Relasi ke KesantrianViolationCategory.id
  violationCategoryName?: string; // Nama jenis pelanggaran (Kedisiplinan, Adab/Akhlak, dll.)
  violationLevel?: KesantrianViolationLevel | string; // Ringan | Sedang | Berat
  category?: string; // Kategori (Ringan/Sedang/Berat, jenis izin, dll.)
  description?: string; // Kronologi / Keterangan kejadian
  actionTaken?: string; // Tindakan / Pembinaan
  additionalNotes?: string; // Catatan tambahan
  parentContacted?: boolean; // Status apakah wali santri telah dihubungi/dipanggil
  parentContactNote?: string; // Catatan pemanggilan/komunikasi wali santri
  status?: string; // Status penanganan (Belum Ditangani, Dalam Pembinaan, Selesai, Sedang Sakit, Masa Pemulihan, Sudah Sembuh, Sedang Izin, Sudah Kembali, Terlambat Kembali, dll.)
  followUps?: KesantrianFollowUp[]; // Catatan tindak lanjut pembinaan/pemantauan berkelanjutan
  headEvaluationNote?: string; // Catatan evaluasi / arahan Kepala Kesantrian
  evaluatedBy?: string; // Nama Kepala Kesantrian yang memberikan evaluasi/arahan
  evaluatedAt?: string; // Waktu evaluasi Kepala Kesantrian
  // Khusus Tindak Lanjut Santri Sakit & Kepulangan/Izin (Requirement 2 & 6)
  needsParentPickup?: boolean; // Apakah perlu dijemput orang tua
  sickLeaveDate?: string; // Tanggal santri pulang karena sakit
  sickLeaveReason?: string; // Alasan dipulangkan
  conditionAtLeave?: string; // Kondisi santri saat pulang
  parentNotes?: string; // Catatan untuk orang tua
  estimatedReturnDate?: string; // Perkiraan tanggal kembali ke pesantren
  recoveredConfirmedDate?: string; // Tanggal konfirmasi sembuh
  returnToPesantrenDate?: string; // Tanggal kembali ke pesantren
  conditionAtReturn?: string; // Kondisi santri saat kembali ke pesantren / setelah pulang
  recoveryAdditionalNotes?: string; // Catatan tambahan setelah sembuh / kembali
  returnDate?: string; // Tanggal kembali / tanggal sembuh (opsional)
  returnTime?: string; // Jam kembali aktual (opsional)
  medicineName?: string; // Nama obat yang diberikan (opsional)
  medicineQty?: string; // Dosis / jumlah obat (opsional)
  recordedByUserId?: string;
  recordedByName?: string;
  recordedByRole?: string; // Kepala Kesantrian / Musyrif Kesantrian
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByRole?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface KesantrianMedicine {
  id: string;
  name: string;
  category: string; // Obat Dalam, Obat Luar, P3K, Vitamin
  stock: number;
  unit: string; // Tablet, Strip, Botol, Pcs
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByRole?: string;
}

export type MabitReturnStatus = 'Belum Kembali' | 'Sudah Kembali';

export interface MabitParticipant {
  studentId: string; // Relasi utama ke Student.id pada Master Data Siswa
  departureTime?: string; // Waktu pulang santri (default mengikuti jam pulang periode)
  actualReturnTime?: string; // Waktu kembali aktual (contoh: 15:45)
  status: MabitReturnStatus; // 'Belum Kembali' | 'Sudah Kembali'
  notes?: string; // Catatan kepulangan santri (opsional)
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByRole?: string;
}

export interface MabitPeriod {
  id: string;
  periodName: string; // Contoh: Mabit Periode 1
  departureDate: string; // YYYY-MM-DD (Tanggal pulang)
  departureDay: string; // Hari otomatis (Sabtu, dll.)
  departureTime: string; // Jam pulang (contoh: 16:30)
  returnDate: string; // YYYY-MM-DD (Tanggal kembali)
  returnDay: string; // Hari otomatis (Ahad, dll.)
  returnTime: string; // Jam kembali terjadwal (contoh: 16:00)
  participants: MabitParticipant[]; // Daftar santri yang mengikuti periode Mabit ini
  generalNotes?: string; // Catatan umum (opsional)
  academicYearId?: string;
  academicYearName?: string;
  semester?: 'Ganjil' | 'Genap';
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByRole?: string;
  updatedAt?: string;
}

export function normalizeUserRole(rawRole?: string | null, user?: Partial<UserProfile> | null): UserRole {
  const clean = String(rawRole || '').trim().toUpperCase();
  if (clean === 'PENGAMPU_HALAQAH' || clean === 'PENGAMPU HALAQAH' || clean === 'PENGAMPU' || clean === 'MUSYRIF_HALAQAH') {
    return 'PENGAMPU_HALAQAH';
  }
  if (clean === 'KEPALA_KESANTRIAN') return 'KEPALA_KESANTRIAN';
  if (clean === 'MUSYRIF_KESANTRIAN') return 'MUSYRIF_KESANTRIAN';
  if (clean === 'PETUGAS_KESANTRIAN') {
    if (
      user?.kesantrianRole === 'MUSYRIF_KESANTRIAN' ||
      user?.username?.toLowerCase().includes('musyrif') ||
      user?.email?.toLowerCase().includes('musyrif')
    ) {
      return 'MUSYRIF_KESANTRIAN';
    }
    return 'KEPALA_KESANTRIAN';
  }
  if (clean === 'ADMIN') return 'ADMIN';
  if (clean === 'MUDIR' || clean === 'MUDIR_PESANTREN' || clean === 'MUDIR PESANTREN') return 'MUDIR';
  if (clean === 'KEPALA_SEKOLAH') return 'KEPALA_SEKOLAH';
  if (clean === 'WALI_KELAS') return 'WALI_KELAS';
  if (clean === 'GURU_MAPEL') return 'GURU_MAPEL';
  return (rawRole as UserRole) || 'GURU_MAPEL';
}

/**
 * Standard list of valid selectable canonical roles in the system
 */
export const AVAILABLE_USER_ROLES: {
  id: UserRole;
  label: string;
  badge: string;
  description: string;
}[] = [
  {
    id: 'ADMIN',
    label: 'Administrator (ADMIN)',
    badge: 'ADMIN',
    description: 'Akses penuh ke seluruh modul sistem dan pengelolaan akun pengguna.',
  },
  {
    id: 'MUDIR',
    label: 'Mudir Pesantren (MUDIR)',
    badge: 'MUDIR PESANTREN',
    description: 'Pimpinan tertinggi lembaga, pengawas seluruh unit (Akademik, Kesantrian, & ATK).',
  },
  {
    id: 'KEPALA_SEKOLAH',
    label: 'Kepala Sekolah (KEPALA_SEKOLAH)',
    badge: 'KEPALA SEKOLAH',
    description: 'Penanggung jawab operasional sekolah, kurikulum, dan kalender akademik.',
  },
  {
    id: 'PENGAMPU_HALAQAH',
    label: 'Pengampu Halaqah (PENGAMPU_HALAQAH)',
    badge: 'PENGAMPU HALAQAH',
    description: 'Ustadz pembina halaqah tahfiz Al-Qur’an & hadis serta pencatat laporan capaian bulanan.',
  },
  {
    id: 'KEPALA_KESANTRIAN',
    label: 'Kepala Kesantrian (KEPALA_KESANTRIAN)',
    badge: 'KEPALA KESANTRIAN',
    description: 'Penanggung jawab pengasuhan, kedisiplinan, perizinan, mabit, dan kesehatan santri.',
  },
  {
    id: 'MUSYRIF_KESANTRIAN',
    label: 'Musyrif Kesantrian (MUSYRIF_KESANTRIAN)',
    badge: 'MUSYRIF KESANTRIAN',
    description: 'Pelaksana harian kesantrian, pencatatan pelanggaran, izin pulang, dan santri sakit.',
  },
  {
    id: 'WALI_KELAS',
    label: 'WALI_KELAS – Wali Kelas',
    badge: 'WALI KELAS',
    description: 'Pengelola kelas binaan, presensi santri kelas, dan pencetakan raport santri.',
  },
  {
    id: 'GURU_MAPEL',
    label: 'GURU_MAPEL – Guru Mata Pelajaran',
    badge: 'GURU MAPEL',
    description: 'Pengajar mata pelajaran sesuai penugasan mengajar aktif dan penginput nilai.',
  },
];

/**
 * Extracts and normalizes the full array of roles assigned to a user.
 * Seamlessly backwards compatible: if user has `roles: [...]`, it returns all normalized roles.
 * If user only has single `role: '...'`, it wraps and normalizes into an array.
 */
export function getUserRoles(user?: Partial<UserProfile> | Record<string, any> | null): UserRole[] {
  if (!user) return [];
  const set = new Set<UserRole>();

  // If user has multi-role array
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    user.roles.forEach((r: any) => {
      if (r) {
        const norm = normalizeUserRole(r, user);
        set.add(norm);
      }
    });
  }

  // Also include user.role if present
  if (user.role) {
    set.add(normalizeUserRole(user.role, user));
  }

  // Also check kesantrianRole
  if (user.kesantrianRole === 'MUSYRIF_KESANTRIAN') {
    set.add('MUSYRIF_KESANTRIAN');
  } else if (user.kesantrianRole === 'KEPALA_KESANTRIAN') {
    set.add('KEPALA_KESANTRIAN');
  }

  const result = Array.from(set);
  return result.length > 0 ? result : ['GURU_MAPEL'];
}

/**
 * Checks whether a user or a specific role/roles array possesses a required role.
 * e.g. hasRole(currentUser, 'WALI_KELAS')
 */
export function hasRole(
  userOrRoles: Partial<UserProfile> | Record<string, any> | UserRole[] | UserRole | string | null | undefined,
  targetRole: UserRole | string
): boolean {
  if (!userOrRoles) return false;
  const targetClean = String(targetRole).trim().toUpperCase();

  let rolesToCheck: UserRole[] = [];
  if (Array.isArray(userOrRoles)) {
    rolesToCheck = userOrRoles.map((r) => normalizeUserRole(r));
  } else if (typeof userOrRoles === 'object' && userOrRoles !== null) {
    rolesToCheck = getUserRoles(userOrRoles as Partial<UserProfile>);
  } else {
    rolesToCheck = [normalizeUserRole(userOrRoles as string)];
  }

  return rolesToCheck.some((r) => {
    const rc = String(r).trim().toUpperCase();
    if (rc === targetClean) return true;
    if (targetClean === 'MUDIR' && (rc === 'MUDIR_PESANTREN' || rc === 'MUDIR PESANTREN')) return true;
    if (targetClean === 'PETUGAS_KESANTRIAN' && (rc === 'KEPALA_KESANTRIAN' || rc === 'MUSYRIF_KESANTRIAN')) return true;
    return false;
  });
}

/**
 * Checks whether a user or roles array possesses ANY of the allowed roles.
 * e.g. hasAnyRole(currentUser, ['ADMIN', 'MUDIR', 'KEPALA_SEKOLAH'])
 */
export function hasAnyRole(
  userOrRoles: Partial<UserProfile> | Record<string, any> | UserRole[] | UserRole | string | null | undefined,
  allowedRoles: (UserRole | string)[]
): boolean {
  if (!userOrRoles || !allowedRoles || allowedRoles.length === 0) return false;
  return allowedRoles.some((target) => hasRole(userOrRoles, target));
}

/**
 * Check if user has teacher privileges (either GURU_MAPEL or WALI_KELAS or KEPALA_SEKOLAH)
 */
export function isTeacherRole(userOrRole?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasAnyRole(userOrRole, ['GURU_MAPEL', 'WALI_KELAS']);
}

export function isMudirRole(roleOrUser?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasRole(roleOrUser, 'MUDIR');
}

export function isKesantrianOfficerRole(roleOrUser?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasAnyRole(roleOrUser, ['KEPALA_KESANTRIAN', 'MUSYRIF_KESANTRIAN', 'PETUGAS_KESANTRIAN']);
}

export function isKepalaKesantrianRole(role?: UserRole | string | null, user?: Partial<UserProfile> | null): boolean {
  if (user) {
    if (hasRole(user, 'KEPALA_KESANTRIAN')) return true;
  }
  const r = String(role || user?.role || '').trim().toUpperCase();
  if (r === 'MUSYRIF_KESANTRIAN') return false;
  if (r === 'KEPALA_KESANTRIAN') return true;
  if (r === 'PETUGAS_KESANTRIAN') {
    return !(
      user?.kesantrianRole === 'MUSYRIF_KESANTRIAN' ||
      user?.username?.toLowerCase().includes('musyrif') ||
      user?.email?.toLowerCase().includes('musyrif')
    );
  }
  return false;
}

export function isMusyrifKesantrianRole(role?: UserRole | string | null, user?: Partial<UserProfile> | null): boolean {
  if (user) {
    if (hasRole(user, 'MUSYRIF_KESANTRIAN')) return true;
  }
  const r = String(role || user?.role || '').trim().toUpperCase();
  if (r === 'MUSYRIF_KESANTRIAN') return true;
  if (r === 'PETUGAS_KESANTRIAN') {
    return Boolean(
      user?.kesantrianRole === 'MUSYRIF_KESANTRIAN' ||
      user?.username?.toLowerCase().includes('musyrif') ||
      user?.email?.toLowerCase().includes('musyrif')
    );
  }
  return false;
}

export function getKesantrianOfficerLabel(
  user?: Partial<UserProfile> | null
): string {
  if (hasRole(user, 'MUSYRIF_KESANTRIAN')) {
    return 'Musyrif Kesantrian';
  }
  if (hasRole(user, 'KEPALA_KESANTRIAN')) {
    return 'Kepala Kesantrian';
  }
  if (hasRole(user, 'ADMIN')) return 'Administrator';
  if (hasRole(user, 'MUDIR')) return 'Mudir Pesantren';
  if (hasRole(user, 'KEPALA_SEKOLAH')) return 'Kepala Sekolah';
  return 'Petugas Kesantrian';
}

export function isKepalaKesantrianUser(
  user?: Partial<UserProfile> | null
): boolean {
  return (
    hasRole(user, 'KEPALA_KESANTRIAN') ||
    hasRole(user, 'ADMIN') ||
    hasRole(user, 'MUDIR') ||
    hasRole(user, 'KEPALA_SEKOLAH')
  );
}

// ============================================================================
// 📦 MODUL ATK & PERSEDIAAN KANTOR
// ============================================================================

export type AtkStockStatus = 'Stok Aman' | 'Stok Menipis' | 'Habis';

export type AtkUnit =
  | 'pcs'
  | 'buah'
  | 'kotak'
  | 'rim'
  | 'botol'
  | 'pak'
  | 'set'
  | 'lusin'
  | (string & {});

export type AtkRequestStatus =
  | 'Menunggu'
  | 'Disetujui'
  | 'Sudah Diberikan'
  | 'Ditolak'
  | 'Dibatalkan';

export interface AtkCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AtkItem {
  id: string; // ID barang (misal: atk_001)
  code: string; // Kode barang tampil (misal: ATK-001)
  name: string; // Nama barang (misal: Kertas HVS A4)
  category: string; // Kategori (ATK, Kertas, Tinta & Printer, Administrasi, Kebersihan, Perlengkapan Guru, Lainnya)
  unit: AtkUnit; // Satuan (pcs, buah, kotak, rim, botol, pak, set, lusin)
  stokSaatIni: number; // Stok saat ini
  stokMinimum: number; // Stok minimum
  lokasiPenyimpanan: string; // Lokasi penyimpanan (misal: Ruang TU)
  hargaPerkiraan?: number; // Harga perkiraan satuan (opsional)
  keterangan?: string; // Keterangan tambahan
  isActive: boolean; // Status aktif / nonaktif
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AtkTransaction {
  id: string;
  type: 'MASUK' | 'KELUAR';
  itemId: string;
  itemCode?: string;
  itemName: string;
  category: string;
  unit: string;
  jumlah: number;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  stokSebelum: number;
  stokSesudah: number;
  // Khusus Barang Masuk
  sumberBarang?: string;
  hargaSatuan?: number;
  nomorNota?: string;
  // Khusus Barang Keluar
  penerimaId?: string;
  penerimaNama?: string;
  penerimaRole?: string;
  keperluan?: string;
  requestId?: string;
  // Umum
  keterangan?: string;
  petugasId: string;
  petugasNama: string;
  petugasRole?: string;
  createdAt: string;
}

export interface AtkRequest {
  id: string;
  itemId: string;
  itemCode?: string;
  itemName: string;
  category: string;
  unit: string;
  jumlahDiminta: number;
  jumlahDisetujui?: number;
  keperluan: string;
  catatan?: string;
  pemohonId: string;
  pemohonNama: string;
  pemohonRole: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  status: AtkRequestStatus;
  catatanAdmin?: string;
  diprosesOlehId?: string;
  diprosesOlehNama?: string;
  tanggalDiproses?: string;
  diserahkanOlehId?: string;
  diserahkanOlehNama?: string;
  tanggalDiserahkan?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sistem Status Stok Otomatis (Bagian 4):
 * - Jika stok > stokMinimum: 🟢 Stok Aman
 * - Jika stok > 0 tetapi stok <= stokMinimum: 🟡 Stok Menipis
 * - Jika stok = 0: 🔴 Habis
 */
export function calculateAtkStockStatus(
  stokSaatIni: number,
  stokMinimum: number
): AtkStockStatus {
  const current = Number(stokSaatIni) || 0;
  const min = Number(stokMinimum) || 0;
  if (current <= 0) {
    return 'Habis';
  }
  if (current <= min) {
    return 'Stok Menipis';
  }
  return 'Stok Aman';
}

export function isAtkAdminRole(userOrRole?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasAnyRole(userOrRole, ['ADMIN', 'KEPALA_SEKOLAH']);
}

export function isAtkReadAllRole(userOrRole?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasAnyRole(userOrRole, ['ADMIN', 'MUDIR', 'KEPALA_SEKOLAH']);
}

// ============================================================================
// MODUL KALENDER AKADEMIK
// ============================================================================

export type AcademicCalendarCategory =
  | 'Tahun Ajaran'
  | 'Awal Semester'
  | 'Akhir Semester'
  | 'Kegiatan Pembelajaran'
  | 'Asesmen / Ujian'
  | 'Sumatif Tengah Semester'
  | 'Sumatif Akhir Semester'
  | 'Libur'
  | 'Rapat Guru'
  | 'RAKER'
  | 'Kegiatan Pesantren'
  | 'Kegiatan Tahfiz'
  | 'Penerimaan Santri Baru'
  | 'Pembagian Raport'
  | 'Kegiatan Orang Tua/Wali'
  | 'Kegiatan Sekolah'
  | 'Lainnya';

export const ACADEMIC_CALENDAR_CATEGORIES: AcademicCalendarCategory[] = [
  'Tahun Ajaran',
  'Awal Semester',
  'Akhir Semester',
  'Kegiatan Pembelajaran',
  'Asesmen / Ujian',
  'Sumatif Tengah Semester',
  'Sumatif Akhir Semester',
  'Libur',
  'Rapat Guru',
  'RAKER',
  'Kegiatan Pesantren',
  'Kegiatan Tahfiz',
  'Penerimaan Santri Baru',
  'Pembagian Raport',
  'Kegiatan Orang Tua/Wali',
  'Kegiatan Sekolah',
  'Lainnya',
];

export type AcademicCalendarStatus =
  | 'Terjadwal'
  | 'Berlangsung'
  | 'Selesai'
  | 'Dibatalkan';

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  category: AcademicCalendarCategory | (string & {});
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  academicYearId: string;
  semester: 'Ganjil' | 'Genap';
  classIds: string[]; // Empty array or ['ALL'] means berlaku untuk Semua Kelas
  location?: string;
  personInCharge?: string;
  description?: string;
  status: AcademicCalendarStatus;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
  updatedAt: string;
}

export function canManageAcademicCalendar(userOrRole?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasAnyRole(userOrRole, ['ADMIN', 'MUDIR', 'KEPALA_SEKOLAH']);
}

export interface SpmbBrochure {
  id: string;
  title: string;
  academicYear: string;
  description: string;
  imageUrls: string[];
  storagePaths: string[];
  pageDocIds?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
}

export function canManageBrochures(userOrRole?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasAnyRole(userOrRole, ['ADMIN', 'MUDIR', 'KEPALA_SEKOLAH']);
}

export type CurriculumGroup = 'PAKET_B' | 'PAKET_C';

export interface CurriculumGroupInfo {
  code: CurriculumGroup;
  name: string;
  grades: number[];
  gradeLabels: string;
  description: string;
}

export const CURRICULUM_GROUPS: Record<CurriculumGroup, CurriculumGroupInfo> = {
  PAKET_B: {
    code: 'PAKET_B',
    name: 'Paket B — Kelas 7, 8, dan 9',
    grades: [7, 8, 9],
    gradeLabels: 'Kelas 7, 8, 9 (VII, VIII, IX)',
    description: 'Kelompok Kurikulum Setara SMP/MTs (Kelas 7, 8, dan 9)',
  },
  PAKET_C: {
    code: 'PAKET_C',
    name: 'Paket C — Kelas 10, 11, dan 12',
    grades: [10, 11, 12],
    gradeLabels: 'Kelas 10, 11, 12 (X, XI, XII)',
    description: 'Kelompok Kurikulum Setara SMA/MA (Kelas 10, 11, dan 12)',
  },
};

export type ScheduleDay =
  | 'Senin'
  | 'Selasa'
  | 'Rabu'
  | 'Kamis'
  | 'Jumat'
  | 'Sabtu';

export const SCHEDULE_DAYS: ScheduleDay[] = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export interface LessonSchedule {
  id: string; // e.g. "sched_17123456789"
  curriculumGroup: CurriculumGroup; // 'PAKET_B' | 'PAKET_C'
  day: ScheduleDay;
  startTime: string; // "HH:mm", e.g. "07:30"
  endTime: string; // "HH:mm", e.g. "09:00"
  subjectId: string; // Relasi ke Subject.id asli
  subjectName?: string; // Cache tampilan mata pelajaran
  subjectCode?: string; // Cache kode mata pelajaran
  teacherId: string; // Relasi ke Teacher.id asli
  teacherName?: string; // Cache tampilan nama guru
  academicYearId?: string; // Relasi ke AcademicYear.id (opsional/default tahun ajaran aktif)
  semester?: 'Ganjil' | 'Genap';
  notes?: string; // Keterangan opsional
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByRole?: string;
  updatedAt: string;
}

export function canManageLessonSchedule(userOrRole?: Partial<UserProfile> | UserRole | string | null): boolean {
  return hasAnyRole(userOrRole, ['ADMIN', 'MUDIR', 'KEPALA_SEKOLAH']);
}

// =======================================================
// HALAQAH TAHFIZ & LAPORAN BULANAN
// =======================================================

export type HalaqahReportStatus = 'Belum Diisi' | 'Draf' | 'Menunggu Verifikasi' | 'Terverifikasi';

export interface Halaqah {
  id: string; // e.g. "hlq_ubay"
  name: string; // e.g. "Halaqah Ubay bin Ka’ab (Kelas VII)"
  pengampuTeacherId?: string | null; // Relasi ke Teacher.id (jika ustadz terdaftar di master data guru)
  pengampuUserId?: string | null; // Relasi ke UserProfile.id / Auth UID
  pengampuName: string; // Nama ustadz pengampu halaqah
  targetJuz: string; // Target hafalan halaqah, e.g. "Juz 30 & 29"
  studentIds: string[]; // Daftar ID santri anggota halaqah
  academicYearId: string; // Tahun ajaran aktif
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HalaqahMonthlyReport {
  id: string; // Deterministic: hlqr_${academicYearId}_${year}_${month}_${halaqahId}_${studentId}
  studentId: string; // Relasi ke Student.id
  studentName: string;
  studentNis: string;
  halaqahId: string; // Relasi ke Halaqah.id
  halaqahName: string;
  pengampuId: string; // ID ustadz pengampu (Teacher ID atau User ID)
  pengampuName: string;
  academicYearId: string;
  year: number; // e.g. 2026
  month: number; // 1 to 12 (e.g. 7=Juli, 10=Oktober)
  monthName: string; // e.g. "Oktober 2026"

  // A. Posisi Awal Bulan Al-Qur'an
  quranStartSurah: string; // e.g. "An-Naba'"
  quranStartSurahNumber: number; // 1 to 114
  quranStartAyah: number;
  quranStartJuz: number; // 1 to 30
  quranStartPage: number; // 1 to 604

  // B. Posisi Akhir Bulan Al-Qur'an
  quranEndSurah: string; // e.g. "An-Nazi'at"
  quranEndSurahNumber: number;
  quranEndAyah: number;
  quranEndJuz: number;
  quranEndPage: number;

  // C. Capaian Baru Bulan Ini (Al-Qur'an)
  quranNewPages: number; // Total halaman baru yang dihafal
  quranNewAyahs: number; // Total ayat baru yang dihafal
  quranNotes?: string;

  // D. Posisi Awal Hadis
  hadithBook: string; // e.g. "Arba'in An-Nawawi", "Umdatul Ahkam"
  hadithStartNumber: number; // e.g. 1
  hadithStartTitle?: string;

  // E. Posisi Akhir Hadis
  hadithEndNumber: number; // e.g. 5
  hadithEndTitle?: string;

  // F. Capaian Baru Bulan Ini (Hadis)
  hadithNewCount: number; // Total hadis baru dihafal
  hadithListNumbers?: string; // e.g. "1, 2, 3, 4, 5"
  hadithNotes?: string;

  // G. Total Akumulasi Hafalan Santri (Hingga Akhir Bulan Laporan)
  totalAccumulatedJuz: number; // Total juz santri yang sudah tuntas dihafal
  totalAccumulatedPages: number; // Total halaman Al-Qur'an santri yang sudah tuntas
  totalAccumulatedHadith: number; // Total hadis santri yang sudah tuntas
  lastHafalanSurah: string;
  lastHafalanAyah: number;
  lastHafalanJuz: number;
  lastHafalanPage: number;
  lastHadithNumber: number;
  lastHadithBook: string;
  isAccumulationVerified: boolean; // Menandakan apakah total akumulasi telah diverifikasi

  // H. Status & Verifikasi Mudir
  status: HalaqahReportStatus;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  feedbackMudir?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Checks if a user is the assigned pengampu of a specific halaqah,
 * or if they hold executive supervisory access (ADMIN, MUDIR, KEPALA_SEKOLAH).
 */
export function isAuthorizedForHalaqah(
  currentUser: Partial<UserProfile> | Record<string, any> | UserRole | string | null | undefined,
  halaqah: Halaqah | null | undefined,
  teachersList: Teacher[] = []
): { authorized: boolean; isSupervisor: boolean; isDirectPengampu: boolean; reason?: string } {
  if (!currentUser) {
    return { authorized: false, isSupervisor: false, isDirectPengampu: false, reason: 'Pengguna belum terautentikasi.' };
  }

  // Normalize currentUser object if string passed
  const userObj: Partial<UserProfile> | Record<string, any> =
    typeof currentUser === 'string' ? { role: currentUser as UserRole, roles: [currentUser as UserRole] } : currentUser;

  // Admin, Mudir, and Kepala Sekolah have supervisory access to all halaqahs
  const isSupervisor = hasAnyRole(userObj, ['ADMIN', 'MUDIR', 'KEPALA_SEKOLAH', 'KEPALA_KESANTRIAN']);
  if (isSupervisor) {
    return { authorized: true, isSupervisor: true, isDirectPengampu: false };
  }

  // If user does not have PENGAMPU_HALAQAH role
  if (!hasRole(userObj, 'PENGAMPU_HALAQAH')) {
    return { authorized: false, isSupervisor: false, isDirectPengampu: false, reason: 'Akun Anda tidak memiliki role Pengampu Halaqah.' };
  }

  if (!halaqah) {
    return { authorized: false, isSupervisor: false, isDirectPengampu: false, reason: 'Data halaqah tidak ditemukan.' };
  }

  // Match directly by userId / id / uid
  const targetUid = userObj.id || userObj.userId || userObj.uid;
  const matchesUserId = halaqah.pengampuUserId && targetUid && (halaqah.pengampuUserId === targetUid);

  // Match by teacherId
  const matchesTeacherId = halaqah.pengampuTeacherId && userObj.teacherId && halaqah.pengampuTeacherId === userObj.teacherId;

  // Match by teacher email or name lookup
  const userName = (userObj.name || userObj.displayName || '').trim().toLowerCase();
  const currentTeacher = teachersList.find(
    (t) =>
      (userObj.email && t.email?.toLowerCase() === userObj.email.toLowerCase()) ||
      (userObj.teacherId && t.id === userObj.teacherId) ||
      (userName && t.name?.toLowerCase().trim() === userName) ||
      (userName && t.name?.toLowerCase().includes(userName)) ||
      (userName && userName.includes(t.name?.toLowerCase().trim()))
  );
  const matchesTeacherObject = currentTeacher && halaqah.pengampuTeacherId === currentTeacher.id;

  // Match by direct name string
  const halaqahPengampuNameLower = (halaqah.pengampuName || '').toLowerCase();
  const matchesName =
    userName &&
    halaqahPengampuNameLower &&
    (halaqahPengampuNameLower.includes(userName) || userName.includes(halaqahPengampuNameLower));

  if (matchesUserId || matchesTeacherId || matchesTeacherObject || matchesName) {
    return { authorized: true, isSupervisor: false, isDirectPengampu: true };
  }

  return {
    authorized: false,
    isSupervisor: false,
    isDirectPengampu: false,
    reason: `Akses Terbatas: Anda bukan pengampu yang ditugaskan untuk ${halaqah.name}.`
  };
}
