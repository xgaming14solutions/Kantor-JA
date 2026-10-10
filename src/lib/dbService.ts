import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
  };
}

export function formatFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'users', 'ping_check'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      // Client is operating in offline/cached mode; handled gracefully by local cache fallback
      return false;
    }
    return false;
  }
}
import {
  UserProfile,
  AcademicYear,
  Teacher,
  SchoolClass,
  Subject,
  TeacherAssignment,
  Student,
  Score,
  Attendance,
  ReportCard,
  SchoolIdentity,
  PesantrenFacilityItem,
  EducationFacilitiesMap,
  EducationFacilityLevel
} from '../types';
import {
  INITIAL_ACADEMIC_YEARS,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_STUDENTS,
  INITIAL_SCORES,
  INITIAL_ATTENDANCE,
  INITIAL_REPORT_CARDS,
  DEMO_USERS
} from './mockData';

// Helper to seed initial data into Firestore if empty
export async function seedDatabaseIfEmpty(): Promise<boolean> {
  if (!auth.currentUser) {
    return false;
  }
  try {
    // Check if academicYears exists
    const aySnap = await getDocs(collection(db, 'academicYears'));
    if (!aySnap.empty) {
      console.log('Database already initialized with data.');
      return false;
    }

    console.log('Seeding initial data into Firestore...');
    const batch = writeBatch(db);

    // Seed academicYears
    INITIAL_ACADEMIC_YEARS.forEach((ay) => {
      batch.set(doc(db, 'academicYears', ay.id), ay);
    });

    // Seed teachers
    INITIAL_TEACHERS.forEach((t) => {
      batch.set(doc(db, 'teachers', t.id), t);
    });

    // Seed classes
    INITIAL_CLASSES.forEach((c) => {
      batch.set(doc(db, 'classes', c.id), c);
    });

    // Seed subjects
    INITIAL_SUBJECTS.forEach((s) => {
      batch.set(doc(db, 'subjects', s.id), s);
    });

    // Seed teacherAssignments
    INITIAL_ASSIGNMENTS.forEach((asg) => {
      batch.set(doc(db, 'teacherAssignments', asg.id), asg);
    });

    // Seed students
    INITIAL_STUDENTS.forEach((st) => {
      batch.set(doc(db, 'students', st.id), st);
    });

    // Seed scores
    INITIAL_SCORES.forEach((sc) => {
      batch.set(doc(db, 'scores', sc.id), sc);
    });

    // Seed attendance
    INITIAL_ATTENDANCE.forEach((att) => {
      batch.set(doc(db, 'attendance', att.id), att);
    });

    // Seed reportCards
    INITIAL_REPORT_CARDS.forEach((rc) => {
      batch.set(doc(db, 'reportCards', rc.id), rc);
    });

    // Seed only the verified primary admin user matching real Firebase Auth UID
    const primaryAdmin = {
      id: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
      userId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
      uid: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
      username: 'admin',
      email: 'xgamingsolutions@gmail.com',
      displayName: 'Administrator AKSARA',
      name: 'Administrator AKSARA',
      role: 'ADMIN' as const,
      nip: '198501012010011001',
      phone: '081234567890',
      isActive: true,
      teacherId: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
    batch.set(doc(db, 'users', primaryAdmin.id), primaryAdmin);

    await batch.commit();
    console.log('Database successfully seeded!');
    return true;
  } catch (error) {
    console.warn('Could not seed Firestore (fallback to local state if offline/unauthorized):', error);
    return false;
  }
}

// User Profile Operations
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (e) {
    console.warn('Error fetching user profile from Firestore:', e);
  }
  // Fallback to demo users lookup by id or email
  const fallback = DEMO_USERS.find(u => u.id === userId || u.email === userId);
  return fallback || null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await setDoc(doc(db, 'users', profile.id), profile, { merge: true });
  } catch (e) {
    console.warn('Error saving user profile to Firestore:', e);
  }
}

// Generic collection fetchers with fallback to initial data
export function normalizeAcademicYear(raw: any): AcademicYear {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'ay_2026_2027_1',
      name: '2026/2027',
      semester: 'Ganjil',
      isActive: true,
      startDate: '2026-07-13',
      endDate: '2026-12-19',
    };
  }

  const id: string = raw.id || 'ay_2026_2027_1';

  // Check possible field names for year/name
  let name = raw.name || raw.tahun || raw.tahunAjaran || raw.year || raw.academicYear || raw.periode || '';
  if (!name && typeof id === 'string') {
    const match = id.match(/(\d{4})_(\d{4})/);
    if (match) {
      name = `${match[1]}/${match[2]}`;
    }
  }
  if (!name) {
    const fallback = INITIAL_ACADEMIC_YEARS.find(ay => ay.id === id);
    name = fallback?.name || '2026/2027';
  }

  // Check possible field names for semester
  let rawSemester = raw.semester || raw.term || raw.semesterName || '';
  if (!rawSemester && typeof id === 'string') {
    if (id.endsWith('_1')) rawSemester = 'Ganjil';
    else if (id.endsWith('_2')) rawSemester = 'Genap';
  }
  if (!rawSemester) {
    const fallback = INITIAL_ACADEMIC_YEARS.find(ay => ay.id === id);
    rawSemester = fallback?.semester || 'Ganjil';
  }

  const lowerSem = String(rawSemester).trim().toLowerCase();
  const semester: 'Ganjil' | 'Genap' = (lowerSem === 'genap' || lowerSem === '2') ? 'Genap' : 'Ganjil';

  return {
    id,
    name: String(name).trim(),
    semester,
    isActive: Boolean(raw.isActive),
    startDate: raw.startDate || '',
    endDate: raw.endDate || '',
  };
}

/**
 * Normalizes Score data from Firestore or cache, ensuring value is a number,
 * types are clean, and academic period keys are standardized.
 */
export function normalizeScore(raw: any): Score {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `sc_${Date.now()}`,
      studentId: '',
      teacherId: 't_003',
      classId: 'c_7a',
      subjectId: 'sub_ipa',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UH',
      value: 0
    };
  }

  const rawVal = raw.value !== undefined ? raw.value : raw.nilai;
  const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.'));
  const value = isNaN(numVal) ? 0 : Math.round(Math.min(100, Math.max(0, numVal)) * 10) / 10;

  let sem: 'Ganjil' | 'Genap' = 'Ganjil';
  const rawSem = String(raw.semester || raw.term || '').trim().toLowerCase();
  if (rawSem === 'genap' || rawSem === '2') {
    sem = 'Genap';
  } else {
    sem = 'Ganjil';
  }

  let ayId = String(raw.academicYearId || raw.academicYear || raw.tahunAjaran || 'ay_2026_2027_1').trim();
  if (ayId === '2026/2027' || ayId === '2026_2027') {
    ayId = sem === 'Genap' ? 'ay_2026_2027_2' : 'ay_2026_2027_1';
  } else if (ayId === '2025/2026' || ayId === '2025_2026') {
    ayId = sem === 'Genap' ? 'ay_2025_2026_2' : 'ay_2025_2026_1';
  }

  let type = String(raw.type || raw.jenisNilai || raw.componentCode || 'UH').trim();
  const upperType = type.toUpperCase();
  if (
    upperType === 'UTS' ||
    upperType === 'PTS' ||
    upperType === 'SUMATIF TENGAH SEMESTER' ||
    upperType === 'PENILAIAN TENGAH SEMESTER' ||
    upperType.startsWith('STS')
  ) {
    type = 'STS';
  } else if (
    upperType === 'UAS' ||
    upperType === 'PAS' ||
    upperType === 'PAT' ||
    upperType === 'SUMATIF AKHIR SEMESTER' ||
    upperType === 'PENILAIAN AKHIR SEMESTER' ||
    upperType.startsWith('SAS')
  ) {
    type = 'SAS';
  } else if (
    upperType === 'PH' ||
    upperType === 'ULANGAN HARIAN' ||
    upperType === 'FORMATIF' ||
    upperType.startsWith('UH')
  ) {
    type = 'UH';
  } else if (upperType === 'PR' || upperType === 'PROJEK' || upperType.startsWith('TUGAS')) {
    type = 'Tugas';
  }

  const result: Score = {
    id: String(raw.id || `sc_${Date.now()}`),
    studentId: String(raw.studentId || raw.idSiswa || '').trim(),
    teacherId: String(raw.teacherId || raw.idGuru || 't_003').trim(),
    classId: String(raw.classId || raw.idKelas || 'c_7a').trim(),
    subjectId: String(raw.subjectId || raw.idMapel || 'sub_ipa').trim(),
    academicYearId: ayId,
    semester: sem,
    type,
    value,
    notes: raw.notes ? String(raw.notes).trim() : '',
    date: raw.date ? String(raw.date).trim() : ''
  };

  return result;
}

function sanitizeValueForFirestore(val: any): any {
  if (val === undefined) return undefined;
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) {
    return val
      .map((item) => sanitizeValueForFirestore(item))
      .filter((item) => item !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    const sv = sanitizeValueForFirestore(v);
    if (sv !== undefined) {
      clean[k] = sv;
    }
  }
  return clean;
}

/**
 * Strips all `undefined` values from an object and its nested arrays/objects recursively.
 * Critical for Firestore since setDoc/updateDoc throw exceptions on `undefined`.
 */
export function sanitizeDataForFirestore<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  return sanitizeValueForFirestore(obj) as T;
}

function safeGetItem(key: string): string | null {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // If quota exceeded when saving critical school identity, free up non-essential cache keys and retry
      if (
        key === 'kantoja_school_identity' ||
        key === 'kantoja_school_logo_url' ||
        key === 'kantoja_school_logo_backup'
      ) {
        try {
          const removableKeys = [
            'kantoja_spmb_brochures_v1',
            'kantoja_academicSettingLogs',
            'kantoja_academicSettings',
            'kantoja_atkTransactions',
            'kantoja_kesantrianRecords',
            'kantoja_scores',
            'kantoja_attendance',
          ];
          removableKeys.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem(key, value);
          return;
        } catch (retryErr) {
          console.warn('Storage retry failed:', retryErr);
        }
      }
      console.warn('Storage set failed:', e);
    }
  }
}

import { ensureFirebaseAuthSession } from './authService';

let lastFirestoreError: string | null = null;
let lastFirestoreErrorCollection: string | null = null;

export function getLastFirestoreError(): { collection: string; message: string } | null {
  if (lastFirestoreError && lastFirestoreErrorCollection) {
    return { collection: lastFirestoreErrorCollection, message: lastFirestoreError };
  }
  return null;
}

export function clearLastFirestoreError(): void {
  lastFirestoreError = null;
  lastFirestoreErrorCollection = null;
}

export async function fetchCollection<T extends { id: string }>(
  collectionName: string,
  fallbackData: T[]
): Promise<T[]> {
  // Read local cache first to ensure zero data loss when offline
  let localItems: T[] = [];
  try {
    const cached = safeGetItem(`kantoja_${collectionName}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        localItems = parsed;
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  // Ensure Firebase Auth session is active if user is logged in
  if (!auth.currentUser) {
    try {
      await ensureFirebaseAuthSession();
    } catch {
      // ignore
    }
  }

  // Fetch genuine Firestore collection
  let firestoreItems: T[] | null = null;
  let firestoreReadSucceeded = false;
  try {
    const snap = await getDocs(collection(db, collectionName));
    firestoreReadSucceeded = true;
    firestoreItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
  } catch (e: any) {
    const formatted = formatFirestoreError(e, OperationType.LIST, collectionName);
    lastFirestoreError = formatted.error;
    lastFirestoreErrorCollection = collectionName;
    console.warn(
      `Firestore read fallback for ${collectionName}:`,
      formatted
    );
  }

  let items: T[] = [];
  if (firestoreReadSucceeded && firestoreItems !== null) {
    items = firestoreItems;
  } else if (localItems.length > 0) {
    items = localItems;
  } else {
    items = fallbackData;
  }

  // Collection-specific normalization
  if (collectionName === 'academicYears') {
    items = (items as any[]).map(normalizeAcademicYear) as unknown as T[];
  } else if (collectionName === 'scores') {
    items = (items as any[]).map(normalizeScore) as unknown as T[];
  }

  // Save the normalized list back to cache only if Firestore read succeeded or cache already existed
  if (firestoreReadSucceeded) {
    // Exclude school_identity, school_logo, and atk_config from kantoja_academicSettings cache
    const toCache =
      collectionName === 'academicSettings'
        ? items.filter(
            (item: any) =>
              item.id !== 'school_identity' &&
              item.id !== 'school_logo' &&
              item.id !== 'atk_config'
          )
        : items;
    safeSetItem(`kantoja_${collectionName}`, JSON.stringify(toCache));
  }
  return items;
}

// Save document to Firestore & Local Storage
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  const sanitized = sanitizeDataForFirestore(data as any);

  // 1. Write to Firestore with merge: true when authenticated in Firebase Auth
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, collectionName, sanitized.id), sanitized, { merge: true });
    } catch (e) {
      console.warn(
        `Firestore write fallback for ${collectionName}/${sanitized.id}:`,
        formatFirestoreError(e, OperationType.WRITE, `${collectionName}/${sanitized.id}`)
      );
    }
  }

  // 2. Update local cache immediately
  try {
    const cached = safeGetItem(`kantoja_${collectionName}`);
    let list: T[] = cached ? JSON.parse(cached) : [];
    const index = list.findIndex(item => item.id === sanitized.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...sanitized };
    } else {
      list.push(sanitized);
    }
    safeSetItem(`kantoja_${collectionName}`, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to update local cache:', err);
  }
}

// Delete document from Firestore & Local Storage
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.warn(
        `Firestore delete fallback for ${collectionName}/${id}:`,
        formatFirestoreError(e, OperationType.DELETE, `${collectionName}/${id}`)
      );
    }
  }

  try {
    const cached = safeGetItem(`kantoja_${collectionName}`);
    if (cached) {
      const list = JSON.parse(cached).filter((item: any) => item.id !== id);
      safeSetItem(`kantoja_${collectionName}`, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Failed to update local cache on delete:', err);
  }
}

// Bulk update / set active academic year (only ONE can be active)
export async function setActiveAcademicYearDoc(
  activeYearId: string,
  allYears: AcademicYear[]
): Promise<AcademicYear[]> {
  const updatedYears = allYears.map(year => {
    const normalized = normalizeAcademicYear(year);
    return {
      ...normalized,
      isActive: normalized.id === activeYearId
    };
  });

  if (auth.currentUser) {
    try {
      const batch = writeBatch(db);
      updatedYears.forEach(year => {
        // Save complete normalized object so name, semester, and dates are never stripped in Firestore
        batch.set(doc(db, 'academicYears', year.id), year, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn('Failed to batch update active academic year in Firestore:', e);
    }
  }

  safeSetItem('kantoja_academicYears', JSON.stringify(updatedYears));

  return updatedYears;
}

export const DEFAULT_PESANTREN_FACILITIES: PesantrenFacilityItem[] = [
  {
    id: 'fac_ruang_belajar',
    name: 'Ruang Belajar',
    description: 'Ruang kelas kondusif dan tertata rapi untuk menunjang kegiatan pembelajaran akademik dan diniyah santri.',
    isAvailable: true,
  },
  {
    id: 'fac_asrama_santri',
    name: 'Asrama Santri',
    description: 'Tempat tinggal santri yang bersih, teratur, dan didampingi oleh musyrif dalam pembinaan keseharian.',
    isAvailable: true,
  },
  {
    id: 'fac_area_ibadah',
    name: 'Area Ibadah',
    description: 'Pusat pelaksanaan shalat berjamaah lima waktu, dzikir, kajian keislaman, dan pembinaan ruhiyah santri.',
    isAvailable: true,
  },
  {
    id: 'fac_ruang_tahfiz',
    name: 'Ruang Tahfiz',
    description: 'Area khusus halaqah Al-Qur’an untuk kegiatan tahsin, setoran ziyadah, murajaah, dan ujian tasmi’.',
    isAvailable: true,
  },
  {
    id: 'fac_area_kegiatan',
    name: 'Area Kegiatan Santri',
    description: 'Lingkungan terbuka dan ruang bersama untuk aktivitas kemandirian, olahraga, serta kegiatan kepesantrenan.',
    isAvailable: true,
  },
  {
    id: 'fac_uks',
    name: 'UKS / Layanan Kesehatan',
    description: 'Fasilitas pemantauan kesehatan dasar, penanganan pertama santri sakit, serta pengelolaan obat & P3K.',
    isAvailable: true,
  },
  {
    id: 'fac_pendukung_belajar',
    name: 'Fasilitas Pendukung Pembelajaran',
    description: 'Sarana penunjang kegiatan belajar mengajar, literasi keislaman, dan administrasi pendidikan pesantren.',
    isAvailable: true,
  },
];

export const DEFAULT_EDUCATION_FACILITIES: EducationFacilitiesMap = {
  tk: {
    title: 'TK',
    description:
      'Gedung dan lingkungan belajar ramah anak untuk pembiasaan adab Islami, hafalan Juz 30, doa, hadits pilihan, dan pengenalan calistung secara ceria.',
    imageUrl: '',
  },
  sd: {
    title: 'SD',
    description:
      'Ruang kelas dan fasilitas terpadu untuk pembelajaran tahfiz Al-Qur’an (target 4 juz), bahasa Arab dasar, adab, dan kurikulum akademik dasar.',
    imageUrl: '',
  },
  smp: {
    title: 'SMP',
    description:
      'Gedung kelas, asrama santri, dan sarana halaqah Al-Qur’an untuk program intensif 30 juz, kitab hadits Umdatul Ahkam, dan penguasaan bahasa Arab.',
    imageUrl: '',
  },
  sma: {
    title: 'SMA',
    description:
      'Fasilitas pendidikan lanjutan, asrama santri, laboratorium, dan pembinaan kemandirian (life skill) untuk mencetak lulusan berilmu dan berakhlak mandiri.',
    imageUrl: '',
  },
  tkImageUrl: '',
  sdImageUrl: '',
  smpImageUrl: '',
  smaImageUrl: '',
};

export const DEFAULT_SCHOOL_IDENTITY: SchoolIdentity = {
  id: 'school_identity',
  schoolName: 'Pesantren Islam Mutiara Insan',
  programName: 'PKBM AL-QOLAM',
  npsn: '20108899',
  address: 'Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung',
  mudirName: '',
  mudirNip: '',
  leaderTitle: 'Mudir / Kepala Sekolah',
  city: 'Tulang Bawang Barat',
  logoUrl: '/assets/logo-pesantren-mutiara-insan.webp',
  whatsapp: '',
  email: '',
  socialMedia: '',
  ppdbInfo: 'Informasi penerimaan santri baru, persyaratan, tahapan pendaftaran, dan informasi pendidikan dapat diperoleh melalui kanal resmi Pesantren Islam Mutiara Insan.',
  facilities: DEFAULT_PESANTREN_FACILITIES,
  educationFacilities: DEFAULT_EDUCATION_FACILITIES,
};

/**
 * Resolves numeric grade level (7-12) from a SchoolClass object by inspecting its name (Roman/Arabic numerals) and gradeLevel.
 */
export function resolveClassGradeNumber(
  cls?: { name?: string; gradeLevel?: number | string } | null
): number {
  if (!cls) return 7;
  const rawName = String(cls.name || '').trim().toUpperCase();

  // Check Roman numerals (longest/most specific first: XII, XI, X, IX, VIII, VII)
  if (/\bXII\b|^XII([-\s(]|$)/.test(rawName)) return 12;
  if (/\bXI\b|^XI([-\s(]|$)/.test(rawName)) return 11;
  if (/\bX\b|^X([-\s(]|$)/.test(rawName)) return 10;
  if (/\bIX\b|^IX([-\s(]|$)/.test(rawName)) return 9;
  if (/\bVIII\b|^VIII([-\s(]|$)/.test(rawName)) return 8;
  if (/\bVII\b|^VII([-\s(]|$)/.test(rawName)) return 7;

  // Check Arabic numerals 12, 11, 10, 9, 8, 7 in class name
  if (/\b12\b|^12([A-Z-\s(]|$)/.test(rawName)) return 12;
  if (/\b11\b|^11([A-Z-\s(]|$)/.test(rawName)) return 11;
  if (/\b10\b|^10([A-Z-\s(]|$)/.test(rawName)) return 10;
  if (/\b9\b|^9([A-Z-\s(]|$)/.test(rawName)) return 9;
  if (/\b8\b|^8([A-Z-\s(]|$)/.test(rawName)) return 8;
  if (/\b7\b|^7([A-Z-\s(]|$)/.test(rawName)) return 7;

  const numGrade = Number(cls.gradeLevel);
  if (!isNaN(numGrade) && numGrade >= 1 && numGrade <= 12) {
    return numGrade;
  }
  return 7;
}

/**
 * Formats Program name automatically with Paket B (for Grade 7, 8, 9 / VII, VIII, IX)
 * or Paket C (for Grade 10, 11, 12 / X, XI, XII).
 */
export function formatReportProgram(
  baseProgram?: string,
  cls?: { name?: string; gradeLevel?: number | string } | null
): string {
  const rawProgram = (baseProgram || DEFAULT_SCHOOL_IDENTITY.programName).trim() || DEFAULT_SCHOOL_IDENTITY.programName;
  const cleanBase =
    rawProgram.replace(/\s*\(\s*paket\s+[abc]\s*\)\s*$/i, '').trim() ||
    DEFAULT_SCHOOL_IDENTITY.programName;
  const grade = resolveClassGradeNumber(cls);
  const paket = grade >= 10 ? 'Paket C' : 'Paket B';
  return `${cleanBase} (${paket})`;
}

/**
 * Formats Class label for Report Card header, e.g.:
 * VII -> VII (Tujuh)
 * VIII -> VIII (Delapan)
 * IX -> IX (Sembilan)
 * X -> X (Sepuluh)
 * XI -> XI (Sebelas)
 * XII -> XII (Dua Belas)
 */
export function formatReportClassLabel(
  cls?: { name?: string; gradeLevel?: number | string } | null
): string {
  if (!cls) return '-';
  const rawName = String(cls.name || '').trim();
  if (rawName.includes('(') && rawName.includes(')')) {
    return rawName;
  }

  const grade = resolveClassGradeNumber(cls);
  const gradeMap: Record<number, { roman: string; word: string }> = {
    7: { roman: 'VII', word: 'Tujuh' },
    8: { roman: 'VIII', word: 'Delapan' },
    9: { roman: 'IX', word: 'Sembilan' },
    10: { roman: 'X', word: 'Sepuluh' },
    11: { roman: 'XI', word: 'Sebelas' },
    12: { roman: 'XII', word: 'Dua Belas' }
  };

  const mapped = gradeMap[grade];
  if (!mapped) return rawName || '-';

  const cleaned = rawName.replace(/^KELAS\s+/i, '').trim().toUpperCase();
  if (!cleaned || cleaned === mapped.roman || cleaned === String(grade)) {
    return `${mapped.roman} (${mapped.word})`;
  }

  return `${cleaned} (${mapped.word})`;
}

export function isValidPersistedLogoUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('blob:')) return false;
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/')
  );
}

export function recoverLocalLogoBackup(): { logoUrl: string; logoRemoved: boolean } {
  try {
    const removedFlag = safeGetItem('kantoja_school_logo_removed') === 'true';
    if (removedFlag) {
      return { logoUrl: '', logoRemoved: true };
    }

    const candidates: Array<string | null> = [
      safeGetItem('kantoja_school_logo_backup'),
      safeGetItem('kantoja_school_logo_url'),
    ];

    const cachedIdentityRaw = safeGetItem('kantoja_school_identity');
    if (cachedIdentityRaw) {
      try {
        const parsed = JSON.parse(cachedIdentityRaw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.logoRemoved === true) {
            return { logoUrl: '', logoRemoved: true };
          }
          candidates.push(
            parsed.logoUrl ?? parsed.logo ?? parsed.schoolLogo ?? parsed.logoDataUrl ?? null
          );
        }
      } catch {
        // ignore JSON parse error
      }
    }

    const cachedSettingsRaw = safeGetItem('kantoja_academicSettings');
    if (cachedSettingsRaw) {
      try {
        const list = JSON.parse(cachedSettingsRaw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && (item.id === 'school_identity' || item.id === 'school_logo')) {
              candidates.push(item.logoUrl ?? item.logo ?? null);
            }
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }

    for (const c of candidates) {
      if (isValidPersistedLogoUrl(c)) {
        return { logoUrl: String(c).trim(), logoRemoved: false };
      }
    }
  } catch {
    // ignore storage errors
  }
  return { logoUrl: '', logoRemoved: false };
}

export function normalizeSchoolIdentity(raw: any): SchoolIdentity {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SCHOOL_IDENTITY };
  }

  const rawSchoolName = String(raw.schoolName ?? raw.namaSekolah ?? raw.name ?? '').trim();
  const isLegacySchoolName =
    !rawSchoolName ||
    rawSchoolName === 'SMP / MTs Unggulan AKSARA' ||
    rawSchoolName === 'SMP AKSARA';

  const rawProgram = String(raw.programName ?? raw.program ?? '').trim();
  const cleanProgram = rawProgram.replace(/\s*\(\s*paket\s+[abc]\s*\)\s*$/i, '').trim();

  const rawAddress = String(raw.address ?? raw.alamat ?? '').trim();
  const isLegacyAddress =
    !rawAddress ||
    rawAddress === 'Jl. Pendidikan Nasional No. 45, Kompleks Akademika, Indonesia';

  const rawCity = String(raw.city ?? raw.kota ?? '').trim();
  const isLegacyCity = !rawCity || rawCity === 'Jakarta';

  const explicitlyRemoved = raw.logoRemoved === true;
  const candidateLogo = String(
    raw.logoUrl ?? raw.logo ?? raw.schoolLogo ?? raw.logoDataUrl ?? raw.imageUrl ?? ''
  ).trim();
  const validLogoUrl = explicitlyRemoved
    ? ''
    : isValidPersistedLogoUrl(candidateLogo)
    ? candidateLogo
    : DEFAULT_SCHOOL_IDENTITY.logoUrl || '';

  return {
    id: 'school_identity',
    schoolName: isLegacySchoolName ? DEFAULT_SCHOOL_IDENTITY.schoolName : rawSchoolName,
    programName: cleanProgram || DEFAULT_SCHOOL_IDENTITY.programName,
    npsn: String(raw.npsn ?? DEFAULT_SCHOOL_IDENTITY.npsn).trim(),
    address: isLegacyAddress ? DEFAULT_SCHOOL_IDENTITY.address : rawAddress,
    mudirName: String(raw.mudirName ?? raw.namaMudir ?? raw.headmasterName ?? '').trim(),
    mudirNip: String(raw.mudirNip ?? raw.nipMudir ?? raw.headmasterNip ?? '').trim(),
    leaderTitle:
      String(raw.leaderTitle ?? raw.jabatanPimpinan ?? DEFAULT_SCHOOL_IDENTITY.leaderTitle).trim() ||
      'Mudir / Kepala Sekolah',
    city: isLegacyCity ? DEFAULT_SCHOOL_IDENTITY.city : rawCity,
    logoUrl: validLogoUrl,
    logoUpdatedAt: raw.logoUpdatedAt ? String(raw.logoUpdatedAt) : undefined,
    logoRemoved: raw.logoRemoved === true,
    whatsapp: String(raw.whatsapp ?? '').trim(),
    email: String(raw.email ?? '').trim(),
    socialMedia: String(raw.socialMedia ?? '').trim(),
    ppdbInfo:
      String(raw.ppdbInfo ?? '').trim() ||
      DEFAULT_SCHOOL_IDENTITY.ppdbInfo,
    facilities:
      Array.isArray(raw.facilities) && raw.facilities.length > 0
        ? raw.facilities.map((f: any, idx: number) => ({
            id: String(f.id || `fac_${idx + 1}`),
            name: String(f.name || '').trim(),
            description: String(f.description || '').trim(),
            isAvailable: f.isAvailable !== false,
          }))
        : DEFAULT_PESANTREN_FACILITIES,
    educationFacilities: (() => {
      const ef = raw.educationFacilities;
      if (!ef || typeof ef !== 'object') return { ...DEFAULT_EDUCATION_FACILITIES };
      const norm = (key: 'tk' | 'sd' | 'smp' | 'sma') => {
        const item = ef[key];
        const flatUrl = ef[`${key}ImageUrl`] || raw[`${key}ImageUrl`];
        const def = DEFAULT_EDUCATION_FACILITIES[key]!;
        if (!item || typeof item !== 'object') {
          const resolvedImg = String(flatUrl || (typeof item === 'string' ? item : '') || def.imageUrl || '').trim();
          return {
            ...def,
            imageUrl: resolvedImg,
          };
        }
        const imgUrl = String(item.imageUrl || item.url || flatUrl || '').trim();
        return {
          title: String(item.title || def.title).trim(),
          description: String(item.description || def.description).trim(),
          imageUrl: imgUrl,
          storagePath: item.storagePath ? String(item.storagePath).trim() : undefined,
          updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
        };
      };
      const tkObj = norm('tk');
      const sdObj = norm('sd');
      const smpObj = norm('smp');
      const smaObj = norm('sma');
      return {
        tk: tkObj,
        sd: sdObj,
        smp: smpObj,
        sma: smaObj,
        tkImageUrl: tkObj.imageUrl,
        sdImageUrl: sdObj.imageUrl,
        smpImageUrl: smpObj.imageUrl,
        smaImageUrl: smaObj.imageUrl,
      };
    })(),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : undefined
  };
}

export function logEducationFacilitiesDiagnostic(ef?: EducationFacilitiesMap): void {
  try {
    const envStr = import.meta.env.PROD ? 'production' : 'development';
    console.info(
      `[EDUCATION FACILITIES]\nenvironment: ${envStr}\ntkImageUrl: ${ef?.tkImageUrl || ef?.tk?.imageUrl || '-'}\nsdImageUrl: ${ef?.sdImageUrl || ef?.sd?.imageUrl || '-'}\nsmpImageUrl: ${ef?.smpImageUrl || ef?.smp?.imageUrl || '-'}\nsmaImageUrl: ${ef?.smaImageUrl || ef?.sma?.imageUrl || '-'}`
    );
    console.info(
      `[Firebase]\nprojectId: ${firebaseConfig.projectId || '-'}\nstorageBucket: ${firebaseConfig.storageBucket || '-'}`
    );
  } catch {
    // ignore logging errors
  }
}

export function getInitialSchoolIdentity(): SchoolIdentity {
  try {
    const recovery = recoverLocalLogoBackup();
    const cached = safeGetItem('kantoja_school_identity');
    if (cached) {
      const parsed = normalizeSchoolIdentity(JSON.parse(cached));
      if (!parsed.logoUrl && !parsed.logoRemoved && recovery.logoUrl) {
        parsed.logoUrl = recovery.logoUrl;
      }
      return parsed;
    }
    if (recovery.logoUrl && !recovery.logoRemoved) {
      return { ...DEFAULT_SCHOOL_IDENTITY, logoUrl: recovery.logoUrl };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_SCHOOL_IDENTITY };
}

export async function fetchSchoolIdentity(): Promise<SchoolIdentity> {
  // 1. Read local cache & backup logo recovery
  let cachedIdentity: SchoolIdentity | null = null;
  const localRecovery = recoverLocalLogoBackup();
  try {
    const cached = safeGetItem('kantoja_school_identity');
    if (cached) {
      cachedIdentity = normalizeSchoolIdentity(JSON.parse(cached));
      if (!cachedIdentity.logoUrl && !cachedIdentity.logoRemoved && localRecovery.logoUrl) {
        cachedIdentity.logoUrl = localRecovery.logoUrl;
      }
    }
  } catch (err) {
    console.warn('Error reading school identity from localStorage:', err);
  }

  // 2. Read from Firestore (academicSettings/school_identity AND academicSettings/school_logo) and Server in parallel
  const docRef = doc(db, 'academicSettings', 'school_identity');
  const logoDocRef = doc(db, 'academicSettings', 'school_logo');

  const fetchServerPromise: Promise<SchoolIdentity | null> = (async () => {
    if (typeof window === 'undefined') return null;
    try {
      const res = await fetch('/api/school-identity', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.success && json?.data && typeof json.data === 'object') {
        return normalizeSchoolIdentity(json.data);
      }
    } catch {
      // ignore if endpoint unreachable
    }
    return null;
  })();

  const fetchFirestoreIdentityPromise: Promise<SchoolIdentity | null> = (async () => {
    try {
      const serverTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const serverTask = getDocFromServer(docRef)
        .then((snap) => (snap.exists() ? normalizeSchoolIdentity({ id: snap.id, ...snap.data() }) : null))
        .catch(() => null);
      const fromServer = await Promise.race([serverTask, serverTimeout]);
      if (fromServer) return fromServer;

      const cacheTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const cacheTask = getDoc(docRef)
        .then((snap) => (snap.exists() ? normalizeSchoolIdentity({ id: snap.id, ...snap.data() }) : null))
        .catch(() => null);
      return await Promise.race([cacheTask, cacheTimeout]);
    } catch {
      return null;
    }
  })();

  const fetchFirestoreLogoPromise: Promise<{
    logoUrl: string;
    logoRemoved: boolean;
    logoUpdatedAt?: string;
  } | null> = (async () => {
    const parseLogoSnap = (d: any) => {
      const rawUrl = String(d.logoUrl ?? d.logoDataUrl ?? d.logo ?? '').trim();
      return {
        logoUrl: isValidPersistedLogoUrl(rawUrl) ? rawUrl : '',
        logoRemoved: d.logoRemoved === true,
        logoUpdatedAt: d.logoUpdatedAt || d.updatedAt,
      };
    };
    try {
      const serverTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const serverTask = getDocFromServer(logoDocRef)
        .then((snap) => (snap.exists() ? parseLogoSnap(snap.data()) : null))
        .catch(() => null);
      const fromServer = await Promise.race([serverTask, serverTimeout]);
      if (fromServer) return fromServer;

      const cacheTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const cacheTask = getDoc(logoDocRef)
        .then((snap) => (snap.exists() ? parseLogoSnap(snap.data()) : null))
        .catch(() => null);
      return await Promise.race([cacheTask, cacheTimeout]);
    } catch {
      return null;
    }
  })();

  const [serverIdentity, firestoreIdentity, firestoreLogoDoc] = await Promise.all([
    fetchServerPromise,
    fetchFirestoreIdentityPromise,
    fetchFirestoreLogoPromise,
  ]);

  // Pick the most recent authoritative identity across Firestore, Server, and Local Cache
  const candidates = [firestoreIdentity, serverIdentity, cachedIdentity].filter(
    (item): item is SchoolIdentity => item !== null
  );

  // Determine whether the logo was explicitly removed by Admin
  const explicitlyRemoved =
    firestoreLogoDoc?.logoRemoved === true ||
    firestoreIdentity?.logoRemoved === true ||
    (firestoreLogoDoc === null &&
      firestoreIdentity === null &&
      serverIdentity?.logoRemoved === true);

  // Resolve the single authoritative logoUrl across all sources (never let an accidental empty string wipe a valid logo)
  const resolvedLogoUrl = explicitlyRemoved
    ? ''
    : [
        firestoreLogoDoc?.logoUrl,
        firestoreIdentity?.logoUrl,
        serverIdentity?.logoUrl,
        cachedIdentity?.logoUrl,
        localRecovery.logoUrl,
      ].find((u) => isValidPersistedLogoUrl(u)) || '';

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      if (a.logoUrl && !b.logoUrl) return -1;
      if (!a.logoUrl && b.logoUrl) return 1;
      return 0;
    });

    // Authoritatively resolve educationFacilities primarily from Firestore so that
    // stale local storage or server cache never wipes out photo URLs (TK, SD, SMP, SMA)
    const fsEf = firestoreIdentity?.educationFacilities;
    const srvEf = serverIdentity?.educationFacilities;
    const cacheEf = cachedIdentity?.educationFacilities;

    const resolveLevelFacility = (level: 'tk' | 'sd' | 'smp' | 'sma') => {
      const def = DEFAULT_EDUCATION_FACILITIES[level]!;
      const primaryItem = fsEf?.[level] || srvEf?.[level] || cacheEf?.[level] || def;
      const fsFlatUrl = fsEf?.[`${level}ImageUrl` as keyof EducationFacilitiesMap] as string | undefined;
      const srvFlatUrl = srvEf?.[`${level}ImageUrl` as keyof EducationFacilitiesMap] as string | undefined;
      const cacheFlatUrl = cacheEf?.[`${level}ImageUrl` as keyof EducationFacilitiesMap] as string | undefined;

      const finalUrl = String(
        fsEf?.[level]?.imageUrl ||
        fsFlatUrl ||
        primaryItem?.imageUrl ||
        srvEf?.[level]?.imageUrl ||
        srvFlatUrl ||
        cacheEf?.[level]?.imageUrl ||
        cacheFlatUrl ||
        ''
      ).trim();

      return {
        title: String(primaryItem?.title || def.title).trim(),
        description: String(primaryItem?.description || def.description).trim(),
        imageUrl: finalUrl,
        storagePath: primaryItem?.storagePath ? String(primaryItem.storagePath).trim() : undefined,
        updatedAt: primaryItem?.updatedAt ? String(primaryItem.updatedAt) : undefined,
      };
    };

    const authoritativeFacilities: EducationFacilitiesMap = {
      tk: resolveLevelFacility('tk'),
      sd: resolveLevelFacility('sd'),
      smp: resolveLevelFacility('smp'),
      sma: resolveLevelFacility('sma'),
      tkImageUrl: resolveLevelFacility('tk').imageUrl,
      sdImageUrl: resolveLevelFacility('sd').imageUrl,
      smpImageUrl: resolveLevelFacility('smp').imageUrl,
      smaImageUrl: resolveLevelFacility('sma').imageUrl,
    };

    const winner: SchoolIdentity = {
      ...candidates[0],
      educationFacilities: authoritativeFacilities,
      logoUrl: resolvedLogoUrl,
      logoRemoved: explicitlyRemoved,
      logoUpdatedAt:
        firestoreLogoDoc?.logoUpdatedAt ||
        candidates[0].logoUpdatedAt ||
        candidates[0].updatedAt,
    };

    // Diagnostics required for production/development environment
    logEducationFacilitiesDiagnostic(winner.educationFacilities);


    // Update local cache
    safeSetItem('kantoja_school_identity', JSON.stringify(winner));
    safeSetItem('kantoja_school_logo_url', winner.logoUrl || '');
    if (winner.logoUrl) {
      safeSetItem('kantoja_school_logo_backup', winner.logoUrl);
      safeSetItem('kantoja_school_logo_removed', 'false');
    } else if (explicitlyRemoved) {
      safeSetItem('kantoja_school_logo_backup', '');
      safeSetItem('kantoja_school_logo_removed', 'true');
    }

    // Self-heal Firestore ONLY when we have a valid non-empty logoUrl that was missing in Firestore
    if (winner.logoUrl) {
      if (!firestoreIdentity || firestoreIdentity.logoUrl !== winner.logoUrl) {
        setDoc(docRef, sanitizeDataForFirestore(winner), { merge: true }).catch(() => {});
      }
      if (!firestoreLogoDoc || firestoreLogoDoc.logoUrl !== winner.logoUrl) {
        setDoc(
          logoDocRef,
          sanitizeDataForFirestore({
            id: 'school_logo',
            logoUrl: winner.logoUrl,
            logoRemoved: false,
            logoUpdatedAt: winner.logoUpdatedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        ).catch(() => {});
      }
    }

    // Sync runtime server cache if needed (never push empty logo over existing server logo unless explicitly removed)
    if (
      typeof window !== 'undefined' &&
      (winner.logoUrl || explicitlyRemoved) &&
      (!serverIdentity || serverIdentity.logoUrl !== winner.logoUrl)
    ) {
      fetch('/api/school-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(winner),
      }).catch(() => {});
    }

    return winner;
  }

  // Fallback in-memory identity (DO NOT write empty default identity to Firestore on read!)
  const fallbackIdentity: SchoolIdentity = {
    ...DEFAULT_SCHOOL_IDENTITY,
    logoUrl: resolvedLogoUrl,
    logoRemoved: explicitlyRemoved,
  };
  return fallbackIdentity;
}

export async function fetchAtkConfig(): Promise<{ allowTeacherViewAtkStock: boolean }> {
  let localVal = true;
  const saved = safeGetItem('kantoja_allow_teacher_view_atk_stock');
  if (saved !== null) {
    localVal = saved === 'true';
  }
  if (auth.currentUser) {
    try {
      const snap = await getDoc(doc(db, 'academicSettings', 'atk_config'));
      if (snap.exists()) {
        const data = snap.data();
        const remoteVal = data?.allowTeacherViewAtkStock !== false;
        safeSetItem('kantoja_allow_teacher_view_atk_stock', String(remoteVal));
        return { allowTeacherViewAtkStock: remoteVal };
      }
    } catch {
      // fallback to localVal
    }
  }
  return { allowTeacherViewAtkStock: localVal };
}

export async function saveAtkConfig(allowTeacherViewAtkStock: boolean, updatedBy?: string): Promise<void> {
  safeSetItem('kantoja_allow_teacher_view_atk_stock', String(allowTeacherViewAtkStock));
  if (auth.currentUser) {
    try {
      await setDoc(
        doc(db, 'academicSettings', 'atk_config'),
        sanitizeDataForFirestore({
          id: 'atk_config',
          allowTeacherViewAtkStock,
          updatedAt: new Date().toISOString(),
          updatedBy: updatedBy || 'Administrator',
        }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not persist atk_config to Firestore:', e);
    }
  }
}

export async function saveSchoolIdentityDoc(data: Partial<SchoolIdentity>): Promise<SchoolIdentity> {
  const nowIso = new Date().toISOString();
  const cleanProgram = String(data.programName ?? DEFAULT_SCHOOL_IDENTITY.programName)
    .replace(/\s*\(\s*paket\s+[abc]\s*\)\s*$/i, '')
    .trim();

  const explicitlyRemoved = data.logoRemoved === true;
  const incomingLogo = String(data.logoUrl ?? '').trim();
  const localRecovery = recoverLocalLogoBackup();

  let effectiveLogoUrl = '';
  if (!explicitlyRemoved) {
    if (isValidPersistedLogoUrl(incomingLogo)) {
      effectiveLogoUrl = incomingLogo;
    } else if (isValidPersistedLogoUrl(localRecovery.logoUrl)) {
      effectiveLogoUrl = localRecovery.logoUrl;
    }
  }

  const normalized: SchoolIdentity = {
    id: 'school_identity',
    schoolName: String(data.schoolName ?? DEFAULT_SCHOOL_IDENTITY.schoolName).trim() || DEFAULT_SCHOOL_IDENTITY.schoolName,
    programName: cleanProgram || DEFAULT_SCHOOL_IDENTITY.programName,
    npsn: String(data.npsn ?? '').trim(),
    address: String(data.address ?? DEFAULT_SCHOOL_IDENTITY.address).trim() || DEFAULT_SCHOOL_IDENTITY.address,
    mudirName: String(data.mudirName ?? '').trim(),
    mudirNip: String(data.mudirNip ?? '').trim(),
    leaderTitle: String(data.leaderTitle ?? 'Mudir / Kepala Sekolah').trim() || 'Mudir / Kepala Sekolah',
    city: String(data.city ?? DEFAULT_SCHOOL_IDENTITY.city).trim() || DEFAULT_SCHOOL_IDENTITY.city,
    logoUrl: effectiveLogoUrl,
    logoUpdatedAt:
      effectiveLogoUrl || explicitlyRemoved
        ? nowIso
        : data.logoUpdatedAt || nowIso,
    logoRemoved: explicitlyRemoved,
    whatsapp: String(data.whatsapp ?? '').trim(),
    email: String(data.email ?? '').trim(),
    socialMedia: String(data.socialMedia ?? '').trim(),
    ppdbInfo:
      String(data.ppdbInfo ?? DEFAULT_SCHOOL_IDENTITY.ppdbInfo ?? '').trim() ||
      DEFAULT_SCHOOL_IDENTITY.ppdbInfo,
    facilities:
      Array.isArray(data.facilities) && data.facilities.length > 0
        ? data.facilities
        : DEFAULT_PESANTREN_FACILITIES,
    educationFacilities: (() => {
      if (data.educationFacilities !== undefined) {
        return data.educationFacilities;
      }
      try {
        const cachedStr = safeGetItem('kantoja_school_identity');
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (parsed && parsed.educationFacilities) {
            return parsed.educationFacilities;
          }
        }
      } catch {
        // ignore
      }
      return DEFAULT_EDUCATION_FACILITIES;
    })(),
    updatedAt: nowIso,
    updatedBy: data.updatedBy
  };
  const sanitized = sanitizeDataForFirestore(normalized);

  // 1. Update local cache & backup immediately
  safeSetItem('kantoja_school_identity', JSON.stringify(sanitized));
  safeSetItem('kantoja_school_logo_url', sanitized.logoUrl || '');
  if (sanitized.logoUrl) {
    safeSetItem('kantoja_school_logo_backup', sanitized.logoUrl);
    safeSetItem('kantoja_school_logo_removed', 'false');
  } else if (explicitlyRemoved) {
    safeSetItem('kantoja_school_logo_backup', '');
    safeSetItem('kantoja_school_logo_removed', 'true');
  }

  // 2. Persist to Firestore (academicSettings/school_identity + academicSettings/school_logo) and Backend Server
  const docRef = doc(db, 'academicSettings', 'school_identity');
  const logoDocRef = doc(db, 'academicSettings', 'school_logo');

  const saveServerPromise: Promise<boolean> = (async () => {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch('/api/school-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      });
      return res.ok;
    } catch {
      return false;
    }
  })();

  const saveFirestorePromise: Promise<boolean> = (async () => {
    try {
      // Never overwrite an existing logoUrl in Firestore with an empty string unless explicitlyRemoved is true
      const firestorePayload: Record<string, any> = { ...sanitized };
      if (!sanitized.logoUrl && !explicitlyRemoved) {
        delete firestorePayload.logoUrl;
        delete firestorePayload.logoRemoved;
        delete firestorePayload.logoUpdatedAt;
      }
      if (data.educationFacilities === undefined) {
        delete firestorePayload.educationFacilities;
      }

      const writeIdentityTask = setDoc(docRef, firestorePayload, { merge: true }).then(() => true);
      const writeLogoTask =
        sanitized.logoUrl || explicitlyRemoved
          ? setDoc(
              logoDocRef,
              sanitizeDataForFirestore({
                id: 'school_logo',
                logoUrl: sanitized.logoUrl || '',
                logoDataUrl:
                  localRecovery.logoUrl && localRecovery.logoUrl.startsWith('data:image/')
                    ? localRecovery.logoUrl
                    : sanitized.logoUrl?.startsWith('data:image/')
                    ? sanitized.logoUrl
                    : undefined,
                logoRemoved: explicitlyRemoved,
                logoUpdatedAt: nowIso,
                updatedAt: nowIso,
                updatedBy: data.updatedBy || 'Administrator',
              }),
              { merge: true }
            ).then(() => true)
          : Promise.resolve(true);

      const combinedTask = Promise.all([writeIdentityTask, writeLogoTask]).then(
        ([idOk]) => idOk
      );
      const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000));
      return await Promise.race([combinedTask, timeout]);
    } catch (e) {
      console.warn('Firestore write error for academicSettings/school_identity:', e);
      return false;
    }
  })();

  const [serverSaved, firestoreSaved] = await Promise.all([
    saveServerPromise,
    saveFirestorePromise,
  ]);

  if (!serverSaved && !firestoreSaved) {
    throw new Error('Gagal menyimpan identitas sekolah secara permanen ke database. Periksa koneksi internet Anda.');
  }

  return sanitized;
}

/**
 * Validates that a teacher has an active assignment for given classId, subjectId, academicYearId, and semester.
 * Returns true if valid, false otherwise.
 * Supports comparison against academicYearId or academicYearName (e.g. 2026/2027 vs ay_2026_2027_1).
 */
export function validateTeacherAssignmentAuth(
  assignments: TeacherAssignment[],
  teacherId: string,
  classId: string,
  subjectId: string,
  academicYearId: string,
  semester: 'Ganjil' | 'Genap'
): boolean {
  if (!teacherId || !classId || !subjectId) return false;
  const cleanTeacherId = teacherId.trim().toLowerCase();
  const cleanClassId = classId.trim().toLowerCase();
  const cleanSubjectId = subjectId.trim().toLowerCase();
  const cleanYear = (academicYearId || '').trim().toLowerCase();
  const cleanSemester = (semester || '').trim().toLowerCase();

  return assignments.some((a) => {
    if ((a.teacherId || '').trim().toLowerCase() !== cleanTeacherId) return false;
    if ((a.classId || '').trim().toLowerCase() !== cleanClassId) return false;
    if ((a.subjectId || '').trim().toLowerCase() !== cleanSubjectId) return false;
    if (a.status === 'Nonaktif' || a.status === 'Historis') return false;

    // Academic Year check (handling ID or Name matching)
    if (cleanYear) {
      const aYear = (a.academicYearId || '').trim().toLowerCase();
      const aDigits = aYear.replace(/[^0-9]/g, '');
      const cDigits = cleanYear.replace(/[^0-9]/g, '');
      const yearMatches =
        !aYear ||
        aYear === cleanYear ||
        (aDigits.length >= 4 && cDigits.length >= 4 && (aDigits.startsWith(cDigits) || cDigits.startsWith(aDigits)));
      if (!yearMatches) return false;
    }

    // Semester check
    if (a.semester && cleanSemester) {
      const aSem = a.semester.trim().toLowerCase();
      const semMatches =
        aSem === cleanSemester ||
        ((aSem === '1' || aSem === 'ganjil') && (cleanSemester === '1' || cleanSemester === 'ganjil')) ||
        ((aSem === '2' || aSem === 'genap') && (cleanSemester === '2' || cleanSemester === 'genap'));
      if (!semMatches) return false;
    }

    return true;
  });
}

/**
 * Strictly verifies whether a teacher is permitted to view, create, update, or delete a score.
 * Throws or returns an authorization result conforming to least privilege access control.
 */
export function assertTeacherScoreAccess(
  userRole: string | null | undefined,
  currentTeacherId: string | null | undefined,
  assignments: TeacherAssignment[],
  score: {
    teacherId?: string;
    classId: string;
    subjectId: string;
    academicYearId?: string;
    semester?: 'Ganjil' | 'Genap';
  },
  activeYear?: { id: string; name: string; semester: 'Ganjil' | 'Genap' } | null
): { allowed: boolean; reason?: string } {
  // ADMIN has full administrative oversight
  if (userRole === 'ADMIN') {
    return { allowed: true };
  }

  // Both GURU_MAPEL and WALI_KELAS who hold active teaching assignments can manage scores
  if (userRole !== 'GURU_MAPEL' && userRole !== 'WALI_KELAS') {
    return {
      allowed: false,
      reason: `Akses Ditolak (403 Forbidden): Peran '${userRole || 'Tamu'}' tidak memiliki wewenang untuk mengelola nilai siswa.`
    };
  }

  if (!currentTeacherId) {
    return {
      allowed: false,
      reason: 'Akses Ditolak (403 Forbidden): Akun pengguna Anda tidak terikat dengan profil guru (teacherId) yang sah.'
    };
  }

  // Prevent teacher identity spoofing
  if (score.teacherId && score.teacherId.trim().toLowerCase() !== currentTeacherId.trim().toLowerCase()) {
    return {
      allowed: false,
      reason: `Akses Ditolak (403 Forbidden): Anda tidak diizinkan membuat atau mengubah nilai atas nama guru lain (${score.teacherId}).`
    };
  }

  const targetYearId = score.academicYearId || activeYear?.id || '';
  const targetSemester = score.semester || activeYear?.semester || 'Ganjil';

  const isAuthorized = validateTeacherAssignmentAuth(
    assignments,
    currentTeacherId,
    score.classId,
    score.subjectId,
    targetYearId,
    targetSemester
  );

  if (!isAuthorized) {
    return {
      allowed: false,
      reason: `Akses Ditolak (403 Forbidden): Anda tidak memiliki penugasan mengajar aktif untuk kelas '${score.classId}' dan mata pelajaran '${score.subjectId}' pada periode akademik berjalan.`
    };
  }

  return { allowed: true };
}

/**
 * Resolves the effective teacherId for a user, checking currentUser.teacherId first,
 * then falling back to matching email, nip, or user id in teachers list.
 */
export function getEffectiveTeacherId(
  currentUser: { id?: string; teacherId?: string | null; email?: string | null; nip?: string | null; name?: string; displayName?: string } | null | undefined,
  role: string | null | undefined,
  teachers: Teacher[]
): string | null {
  if (currentUser?.teacherId) return currentUser.teacherId;
  if (role === 'GURU_MAPEL' || role === 'WALI_KELAS' || role === 'KEPALA_SEKOLAH') {
    const cleanEmail = currentUser?.email?.toLowerCase().trim();
    const cleanNip = currentUser?.nip?.trim();
    const cleanName = (currentUser?.displayName || currentUser?.name || '').toLowerCase().trim();
    const match = teachers.find(
      (t) =>
        (cleanEmail && t.email?.toLowerCase().trim() === cleanEmail) ||
        (cleanNip && t.nip?.trim() === cleanNip) ||
        t.id === currentUser?.id ||
        (cleanName && t.name?.toLowerCase().trim() === cleanName)
    );
    return match?.id || null;
  }
  return null;
}

/**
 * Filters teacher assignments strictly by teacherId, active academicYear, and active semester.
 * Returns only active assignments for the current academic period conforming to:
 * user/guru -> teacherId -> teacherAssignments -> classId + subjectId + academicYearId
 */
export function getActiveTeacherAssignments(
  teacherAssignments: TeacherAssignment[],
  teacherId: string | null | undefined,
  activeAcademicYear: AcademicYear | null | undefined
): TeacherAssignment[] {
  if (!teacherId) return [];
  const cleanTId = teacherId.trim().toLowerCase();
  return teacherAssignments.filter((a) => {
    if ((a.teacherId || '').trim().toLowerCase() !== cleanTId) return false;

    // Check status
    if (a.status === 'Nonaktif' || a.status === 'Historis') return false;

    if (!activeAcademicYear) return true;

    // Academic Year check
    const aYear = (a.academicYearId || '').trim().toLowerCase();
    const curYearId = (activeAcademicYear.id || '').trim().toLowerCase();
    const curYearName = (activeAcademicYear.name || '').trim().toLowerCase();
    const aDigits = aYear.replace(/[^0-9]/g, '');
    const idDigits = curYearId.replace(/[^0-9]/g, '');
    const nameDigits = curYearName.replace(/[^0-9]/g, '');

    const yearMatches =
      !aYear ||
      aYear === curYearId ||
      aYear === curYearName ||
      (aDigits.length >= 4 && idDigits.length >= 4 && (aDigits.startsWith(idDigits) || idDigits.startsWith(aDigits))) ||
      (aDigits.length >= 4 && nameDigits.length >= 4 && (aDigits.startsWith(nameDigits) || nameDigits.startsWith(aDigits)));

    if (!yearMatches) return false;

    // Semester check
    if (a.semester && activeAcademicYear.semester) {
      const aSem = a.semester.trim().toLowerCase();
      const curSem = activeAcademicYear.semester.trim().toLowerCase();
      const semMatches =
        aSem === curSem ||
        ((aSem === '1' || aSem === 'ganjil') && (curSem === '1' || curSem === 'ganjil')) ||
        ((aSem === '2' || aSem === 'genap') && (curSem === '2' || curSem === 'genap'));
      if (!semMatches) return false;
    }

    return true;
  });
}


