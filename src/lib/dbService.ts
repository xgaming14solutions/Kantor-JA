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
  ReportCard
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

export async function fetchCollection<T extends { id: string }>(
  collectionName: string,
  fallbackData: T[]
): Promise<T[]> {
  // Read local cache first to ensure zero data loss on browser refresh
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

  // Fetch genuine Firestore collection
  let firestoreItems: T[] | null = null;
  try {
    const snap = await getDocs(collection(db, collectionName));
    if (!snap.empty) {
      firestoreItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as T));
    }
  } catch (e) {
    console.warn(`Firestore read failed for collection ${collectionName}, relying on local cache:`, e);
  }

  let items: T[] = [];
  if (firestoreItems && firestoreItems.length > 0) {
    items = firestoreItems;
    // NON-DESTRUCTIVE SAFEGUARD:
    // If local cache has any items that are NOT in Firestore yet (e.g. recent inputs or sync pending),
    // merge them in so they are NEVER wiped out on page reload/refresh!
    if (localItems.length > 0) {
      const firestoreIds = new Set(firestoreItems.map(item => item.id));
      const unpersistedLocal = localItems.filter(item => !firestoreIds.has(item.id));
      if (unpersistedLocal.length > 0) {
        items = [...items, ...unpersistedLocal];
        // Background sync unpersisted items to Firestore
        unpersistedLocal.forEach(item => {
          const sanitized = sanitizeDataForFirestore(item as any);
          setDoc(doc(db, collectionName, item.id), sanitized, { merge: true }).catch(err => {
            console.warn(`Background sync failed for ${collectionName}/${item.id}:`, err);
          });
        });
      }
    }
  } else if (localItems.length > 0) {
    items = localItems;
  } else {
    items = fallbackData;
  }

  // Collection-specific normalization & non-destructive preservation of seed/fallback data
  if (collectionName === 'academicYears') {
    items = (items as any[]).map(normalizeAcademicYear) as unknown as T[];
  } else if (collectionName === 'scores') {
    items = (items as any[]).map(normalizeScore) as unknown as T[];
    // Non-destructive preservation: ensure default demo/seed scores are present
    const existingIds = new Set(items.map(item => item.id));
    const missingFallback = fallbackData.filter(item => !existingIds.has(item.id));
    if (missingFallback.length > 0) {
      items = [...items, ...missingFallback];
    }
  }

  // Save the normalized, merged list back to cache
  safeSetItem(`kantoja_${collectionName}`, JSON.stringify(items));
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
  const cleanTeacherId = teacherId.trim();
  const cleanClassId = classId.trim();
  const cleanSubjectId = subjectId.trim();
  const cleanYear = (academicYearId || '').trim().toLowerCase();
  const cleanSemester = (semester || '').trim().toLowerCase();

  return assignments.some((a) => {
    if (a.teacherId !== cleanTeacherId) return false;
    if (a.classId !== cleanClassId) return false;
    if (a.subjectId !== cleanSubjectId) return false;
    if (a.status === 'Nonaktif' || a.status === 'Historis') return false;

    // Academic Year check (handling ID or Name matching)
    if (cleanYear) {
      const aYear = (a.academicYearId || '').trim().toLowerCase();
      const aDigits = aYear.replace(/[^0-9]/g, '');
      const cDigits = cleanYear.replace(/[^0-9]/g, '');
      const yearMatches =
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

  // Only GURU_MAPEL or ADMIN can write scores
  if (userRole !== 'GURU_MAPEL') {
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
  if (score.teacherId && score.teacherId !== currentTeacherId) {
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
  currentUser: { id?: string; teacherId?: string | null; email?: string | null; nip?: string | null } | null | undefined,
  role: string | null | undefined,
  teachers: Teacher[]
): string | null {
  if (currentUser?.teacherId) return currentUser.teacherId;
  if (role === 'GURU_MAPEL' || role === 'WALI_KELAS' || role === 'KEPALA_SEKOLAH') {
    const cleanEmail = currentUser?.email?.toLowerCase().trim();
    const cleanNip = currentUser?.nip?.trim();
    const match = teachers.find(
      (t) =>
        (cleanEmail && t.email?.toLowerCase().trim() === cleanEmail) ||
        (cleanNip && t.nip?.trim() === cleanNip) ||
        t.id === currentUser?.id
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
  if (!teacherId || !activeAcademicYear) return [];
  return teacherAssignments.filter((a) => {
    if (a.teacherId !== teacherId) return false;

    // Check status
    if (a.status === 'Nonaktif' || a.status === 'Historis') return false;

    // Academic Year check
    const aYear = (a.academicYearId || '').trim().toLowerCase();
    const curYearId = (activeAcademicYear.id || '').trim().toLowerCase();
    const curYearName = (activeAcademicYear.name || '').trim().toLowerCase();
    const aDigits = aYear.replace(/[^0-9]/g, '');
    const idDigits = curYearId.replace(/[^0-9]/g, '');
    const nameDigits = curYearName.replace(/[^0-9]/g, '');

    const yearMatches =
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


