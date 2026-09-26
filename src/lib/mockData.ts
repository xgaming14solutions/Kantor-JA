import {
  AcademicYear,
  Teacher,
  SchoolClass,
  Subject,
  TeacherAssignment,
  Student,
  Score,
  Attendance,
  ReportCard,
  UserProfile
} from '../types';

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay_2026_2027_1',
    name: '2026/2027',
    semester: 'Ganjil',
    isActive: true,
    startDate: '2026-07-13',
    endDate: '2026-12-19',
  },
  {
    id: 'ay_2025_2026_1',
    name: '2025/2026',
    semester: 'Ganjil',
    isActive: false,
    startDate: '2025-07-15',
    endDate: '2025-12-20',
  },
  {
    id: 'ay_2024_2025_2',
    name: '2024/2025',
    semester: 'Genap',
    isActive: false,
    startDate: '2025-01-06',
    endDate: '2025-06-21',
  }
];

export const INITIAL_TEACHERS: Teacher[] = [];

export const INITIAL_CLASSES: SchoolClass[] = [];

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub_mat',
    code: 'MAT-01',
    name: 'Matematika',
    nameArab: 'الرياضيات',
    kkm: 75,
    category: 'Umum',
    type: 'subject',
    isActive: true,
    description: 'Pembelajaran aljabar, geometri, dan statistika dasar'
  },
  {
    id: 'sub_bin',
    code: 'BIN-01',
    name: 'Bahasa Indonesia',
    kkm: 75,
    category: 'Umum',
    type: 'subject',
    isActive: true,
    description: 'Tata bahasa, sastra, dan kemampuan literasi'
  },
  {
    id: 'sub_ipa',
    code: 'IPA-01',
    name: 'Ilmu Pengetahuan Alam',
    kkm: 75,
    category: 'Umum',
    type: 'subject',
    isActive: true,
    description: 'Biologi, fisika, dan kimia lingkungan'
  },
  {
    id: 'sub_tik',
    code: 'TIK-01',
    name: 'Informatika',
    kkm: 78,
    category: 'Peminatan',
    type: 'subject',
    isActive: false,
    description: 'Literasi digital, dasar pemrograman dan algoritma'
  },
  {
    id: 'sub_ing',
    code: 'ING-01',
    name: 'Bahasa Inggris',
    kkm: 75,
    category: 'Umum',
    type: 'subject',
    isActive: true,
    description: 'Kemampuan komunikasi verbal dan penulisan bahasa internasional'
  }
];

export const INITIAL_ASSIGNMENTS: TeacherAssignment[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_SCORES: Score[] = [];

export const INITIAL_ATTENDANCE: Attendance[] = [];

export const INITIAL_REPORT_CARDS: ReportCard[] = [];

// Initial user profiles with real roles
export const DEMO_USERS: UserProfile[] = [
  {
    id: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    userId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    username: 'admin',
    email: 'Xgamingsolutions@gmail.com',
    displayName: 'Administrator KantoJA',
    name: 'Administrator KantoJA',
    role: 'ADMIN',
    nip: '198501012010011001',
    phone: '081234567890',
    isActive: true,
    teacherId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  }
];
