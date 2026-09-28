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
  role: UserRole;
  roleCode?: string; // e.g. 'kepala_kesantrian' | 'musyrif_kesantrian'
  kesantrianRole?: KesantrianOfficerRole; // Jabatan spesifik di Kesantrian: Kepala Kesantrian atau Musyrif Kesantrian
  nip?: string;
  phone?: string;
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
  type: 'Tugas' | 'UH' | 'STS' | 'SAS' | 'UTS' | 'UAS' | 'Praktik' | (string & {});
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
  whatsapp?: string; // Nomor WhatsApp Resmi Pesantren
  email?: string; // Email Resmi Pesantren
  socialMedia?: string; // Kanal Media Sosial Resmi
  ppdbInfo?: string; // Informasi / Catatan Penerimaan Santri Baru
  facilities?: PesantrenFacilityItem[]; // Daftar Fasilitas Pesantren yang tersedia
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

export function isMudirRole(role?: UserRole | string | null): boolean {
  const r = String(role || '').trim().toUpperCase();
  return r === 'MUDIR' || r === 'MUDIR_PESANTREN' || r === 'MUDIR PESANTREN';
}

export function isKesantrianOfficerRole(role?: UserRole | string | null): boolean {
  const r = String(role || '').trim().toUpperCase();
  return (
    r === 'KEPALA_KESANTRIAN' ||
    r === 'MUSYRIF_KESANTRIAN' ||
    r === 'PETUGAS_KESANTRIAN'
  );
}

export function isKepalaKesantrianRole(role?: UserRole | string | null, user?: Partial<UserProfile> | null): boolean {
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
  const rawRole = String(user?.role || '').trim().toUpperCase();
  if (rawRole === 'MUSYRIF_KESANTRIAN' || isMusyrifKesantrianRole(user?.role, user)) {
    return 'Musyrif Kesantrian';
  }
  if (rawRole === 'KEPALA_KESANTRIAN' || isKepalaKesantrianRole(user?.role, user)) {
    return 'Kepala Kesantrian';
  }
  if (rawRole === 'ADMIN') return 'Administrator';
  if (rawRole === 'MUDIR') return 'Mudir Pesantren';
  if (rawRole === 'KEPALA_SEKOLAH') return 'Kepala Sekolah';
  return 'Petugas Kesantrian';
}

export function isKepalaKesantrianUser(
  user?: Partial<UserProfile> | null
): boolean {
  const rawRole = String(user?.role || '').trim().toUpperCase();
  if (rawRole === 'MUSYRIF_KESANTRIAN' || isMusyrifKesantrianRole(user?.role, user)) {
    return false;
  }
  return (
    rawRole === 'KEPALA_KESANTRIAN' ||
    isKepalaKesantrianRole(user?.role, user) ||
    rawRole === 'ADMIN' ||
    rawRole === 'MUDIR' ||
    rawRole === 'KEPALA_SEKOLAH'
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

export function isAtkAdminRole(role?: UserRole | string | null): boolean {
  const r = String(role || '').trim().toUpperCase();
  return r === 'ADMIN' || r === 'KEPALA_SEKOLAH';
}

export function isAtkReadAllRole(role?: UserRole | string | null): boolean {
  const r = String(role || '').trim().toUpperCase();
  return r === 'ADMIN' || r === 'MUDIR' || r === 'KEPALA_SEKOLAH';
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

export function canManageAcademicCalendar(role?: UserRole | string | null): boolean {
  const r = String(role || '').trim().toUpperCase();
  return r === 'ADMIN' || r === 'MUDIR' || r === 'KEPALA_SEKOLAH';
}





