/**
 * KantoJA - Data Types & Relational Interfaces
 * Sistem Informasi Manajemen Sekolah
 */

export type UserRole = 'ADMIN' | 'KEPALA_SEKOLAH' | 'WALI_KELAS' | 'GURU_MAPEL';

export interface UserProfile {
  id: string; // Document ID (matches Firebase Auth UID)
  userId: string; // Auth UID
  uid?: string; // Firebase Auth UID alias
  username: string; // Lowercase, unique for username-based login
  email: string;
  displayName: string;
  name: string; // Keep for existing references
  role: UserRole;
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
  code: string; // e.g., "MAT-VII", "BIN-VII"
  name: string; // e.g., "Matematika", "Bahasa Indonesia"
  nameArab?: string; // Tulisan Arab (Unicode) yang dimasukkan manual oleh admin
  kkm: number; // Kriteria Ketuntasan Minimal, e.g., 75
  category: 'Diniyah' | 'Umum' | 'Peminatan' | 'Muatan Lokal' | (string & {});
  isActive?: boolean;
  description?: string;
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
