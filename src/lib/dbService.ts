import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
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
  SchoolIdentity
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
      displayName: 'Administrator KantoJA',
      name: 'Administrator KantoJA',
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

/**
 * Strips all `undefined` values from an object recursively.
 * Critical for Firestore since setDoc/updateDoc throw exceptions on `undefined`.
 */
export function sanitizeDataForFirestore<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        clean[key] = sanitizeDataForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
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
      console.warn('Storage set failed:', e);
    }
  }
}

const REMOVED_DUMMY_IDS = new Set([
  'sub_aqd',
  's_001', 's_002', 's_003', 's_004', 's_005', 's_006', 's_007',
  't_001', 't_002', 't_003', 't_004', 't_005',
  'c_7b',
  'asg_001', 'asg_002', 'asg_003', 'asg_004', 'asg_005', 'asg_006', 'asg_1789956019973', 'asg_1790162665382',
  'rep_001', 'rep_002',
  'u_dewi', 'u_gurumapel', 'u_kepsek', 'u_walikelas',
  'sc_001', 'sc_002', 'sc_003', 'sc_2627_001', 'sc_2627_002', 'sc_2627_003', 'sc_2627_004', 'sc_2627_005', 'sc_2627_006',
  'sc_1790092794810', 'sc_1790096236955',
  'att_001', 'att_002', 'att_003', 'att_004', 'att_005', 'att_2627_001', 'att_2627_002', 'att_2627_003'
]);

const REMOVED_DUMMY_STUDENT_IDS = new Set([
  's_001', 's_002', 's_003', 's_004', 's_005', 's_006', 's_007'
]);

function isRemovedDummyRecord(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  if (item.id && REMOVED_DUMMY_IDS.has(String(item.id))) return true;
  if (item.studentId && REMOVED_DUMMY_STUDENT_IDS.has(String(item.studentId))) return true;
  return false;
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
        localItems = parsed.filter(item => !isRemovedDummyRecord(item));
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  // Fetch genuine Firestore collection
  let firestoreItems: T[] | null = null;
  let firestoreReadSucceeded = false;
  try {
    const snap = await getDocs(collection(db, collectionName));
    firestoreReadSucceeded = true;
    firestoreItems = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as unknown as T))
      .filter(item => !isRemovedDummyRecord(item));
  } catch (e) {
    console.warn(`Firestore read failed for collection ${collectionName}, relying on local cache:`, e);
  }

  let items: T[] = [];
  if (firestoreReadSucceeded && firestoreItems !== null) {
    items = firestoreItems;
  } else if (localItems.length > 0) {
    items = localItems;
  } else {
    items = fallbackData.filter(item => !isRemovedDummyRecord(item));
  }

  // Collection-specific normalization
  if (collectionName === 'academicYears') {
    items = (items as any[]).map(normalizeAcademicYear) as unknown as T[];
  } else if (collectionName === 'scores') {
    items = (items as any[]).map(normalizeScore) as unknown as T[];
  }

  // Save the normalized list back to cache only if Firestore read succeeded or cache already existed
  if (firestoreReadSucceeded) {
    safeSetItem(`kantoja_${collectionName}`, JSON.stringify(items));
  }
  return items;
}

// Save document to Firestore & Local Storage
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  const sanitized = sanitizeDataForFirestore(data as any);

  // 1. Write to Firestore with merge: true (await genuine database persistence)
  try {
    await setDoc(doc(db, collectionName, sanitized.id), sanitized, { merge: true });
  } catch (e) {
    console.error(`Firestore write error for ${collectionName}/${sanitized.id}:`, e);
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
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (e) {
    console.warn(`Firestore delete error for ${collectionName}/${id}:`, e);
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

  safeSetItem('kantoja_academicYears', JSON.stringify(updatedYears));

  return updatedYears;
}

export const DEFAULT_SCHOOL_IDENTITY: SchoolIdentity = {
  id: 'school_identity',
  schoolName: 'Pesantren Islam Mutiara Insan',
  programName: 'PKBM AL-QOLAM',
  npsn: '20108899',
  address: 'Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung',
  mudirName: '',
  mudirNip: '',
  leaderTitle: 'Mudir / Kepala Sekolah',
  city: 'Tulang Bawang Barat'
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
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : undefined
  };
}

export async function fetchSchoolIdentity(): Promise<SchoolIdentity> {
  // 1. Read local cache first
  let cachedIdentity: SchoolIdentity | null = null;
  try {
    const cached = safeGetItem('kantoja_school_identity');
    if (cached) {
      cachedIdentity = normalizeSchoolIdentity(JSON.parse(cached));
    }
  } catch (err) {
    console.warn('Error reading school identity from localStorage:', err);
  }

  // 2. Read from Firestore document academicSettings/school_identity
  try {
    const snap = await getDoc(doc(db, 'academicSettings', 'school_identity'));
    if (snap.exists()) {
      const firestoreIdentity = normalizeSchoolIdentity({ id: snap.id, ...snap.data() });
      // If cachedIdentity has a newer updatedAt than Firestore, sync cachedIdentity to Firestore
      if (
        cachedIdentity?.updatedAt &&
        (!firestoreIdentity.updatedAt || cachedIdentity.updatedAt > firestoreIdentity.updatedAt)
      ) {
        setDoc(doc(db, 'academicSettings', 'school_identity'), sanitizeDataForFirestore(cachedIdentity), {
          merge: true
        }).catch(() => {});
        safeSetItem('kantoja_school_identity', JSON.stringify(cachedIdentity));
        return cachedIdentity;
      }
      safeSetItem('kantoja_school_identity', JSON.stringify(firestoreIdentity));
      return firestoreIdentity;
    } else {
      // Seed initial school_identity document into Firestore so it exists persistently
      const initialToSave = cachedIdentity || { ...DEFAULT_SCHOOL_IDENTITY };
      safeSetItem('kantoja_school_identity', JSON.stringify(initialToSave));
      setDoc(doc(db, 'academicSettings', 'school_identity'), sanitizeDataForFirestore(initialToSave), {
        merge: true
      }).catch(() => {});
      return initialToSave;
    }
  } catch (e) {
    console.warn('Error fetching school identity from Firestore:', e);
  }

  const fallback = cachedIdentity || { ...DEFAULT_SCHOOL_IDENTITY };
  safeSetItem('kantoja_school_identity', JSON.stringify(fallback));
  return fallback;
}

export async function saveSchoolIdentityDoc(data: Partial<SchoolIdentity>): Promise<SchoolIdentity> {
  const cleanProgram = String(data.programName ?? DEFAULT_SCHOOL_IDENTITY.programName)
    .replace(/\s*\(\s*paket\s+[abc]\s*\)\s*$/i, '')
    .trim();

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
    updatedAt: new Date().toISOString(),
    updatedBy: data.updatedBy
  };
  const sanitized = sanitizeDataForFirestore(normalized);

  // 1. Always persist to local cache immediately
  safeSetItem('kantoja_school_identity', JSON.stringify(sanitized));

  // 2. Persist to Firestore (academicSettings/school_identity)
  try {
    await setDoc(doc(db, 'academicSettings', 'school_identity'), sanitized, { merge: true });
  } catch (e) {
    console.warn('Firestore write warning for academicSettings/school_identity (saved to local cache):', e);
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


