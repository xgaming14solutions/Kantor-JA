import {
  createDefaultAcademicSetting,
  calculateStudentScore,
  normalizeScoreType,
  isExactScoreTypeMatch,
  TUGAS_COLUMNS,
  UH_COLUMNS
} from '../src/lib/academicCalculation';
import { normalizeScore } from '../src/lib/dbService';
import { Score } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- STARTING ACADEMIC CALCULATION & SCORE AUDIT TESTS ---\n');

const defaultSetting = createDefaultAcademicSetting('ay_2026_2027_1', 'Ganjil');

// TEST 1: Hanya satu tugas terisi
console.log('TEST 1: Hanya satu tugas terisi');
{
  const testScores: Score[] = [
    {
      id: 'sc_1',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'Tugas 1',
      value: 80
    },
    {
      id: 'sc_2',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UH 1',
      value: 70
    },
    {
      id: 'sc_3',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'STS',
      value: 75
    },
    {
      id: 'sc_4',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'SAS',
      value: 85
    }
  ];

  const res = calculateStudentScore(defaultSetting, testScores, 75);
  assert(res.tugasFilledCount === 1, 'Tugas filled count should be 1');
  assert(res.tugasAverage === 80, `Tugas average should be 80, got ${res.tugasAverage}`);
  assert(res.isComplete === true, 'All 4 components present -> isComplete true');
  // (80 * 0.15) + (70 * 0.20) + (75 * 0.25) + (85 * 0.40)
  // = 12 + 14 + 18.75 + 34 = 78.75 -> rounded with 1 decimal is 78.8
  assert(res.finalScore === 78.8, `Final score should be 78.8, got ${res.finalScore}`);
}

// TEST 2: Beberapa tugas terisi dan sisanya kosong (User example: Tugas 1 = 80, Tugas 2 = 90, 3-10 kosong)
console.log('\nTEST 2: Beberapa tugas terisi dan sisanya kosong');
{
  const testScores: Score[] = [
    {
      id: 'sc_1',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'Tugas 1',
      value: 80
    },
    {
      id: 'sc_2',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'Tugas 2',
      value: 90
    }
  ];

  const res = calculateStudentScore(defaultSetting, testScores, 75);
  assert(res.tugasFilledCount === 2, 'Tugas filled count should be 2');
  assert(res.tugasAverage === 85, `Tugas average should be (80+90)/2 = 85, got ${res.tugasAverage}`);
  assert(res.isComplete === false, 'UH, STS, SAS not filled -> isComplete false');
  assert(res.finalScore === null, 'Final score must be null when incomplete');
  assert(res.formattedFinalScore === '-', 'Formatted final score must be "-"');
  assert(res.completenessStatus === 'Belum Lengkap', 'Completeness status must be "Belum Lengkap"');
}

// TEST 3: Beberapa UH terisi dan sisanya kosong (User example: UH 1 = 80, UH 2 = 70, 3-5 kosong)
console.log('\nTEST 3: Beberapa UH terisi dan sisanya kosong');
{
  const testScores: Score[] = [
    {
      id: 'sc_1',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UH 1',
      value: 80
    },
    {
      id: 'sc_2',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UH 2',
      value: 70
    }
  ];

  const res = calculateStudentScore(defaultSetting, testScores, 75);
  assert(res.uhFilledCount === 2, 'UH filled count should be 2');
  assert(res.uhAverage === 75, `UH average should be (80+70)/2 = 75, got ${res.uhAverage}`);
}

// TEST 4: Nilai 0 yang sengaja diisi guru adalah nilai yang sah
console.log('\nTEST 4: Nilai 0 yang dimasukkan secara sengaja');
{
  const testScores: Score[] = [
    {
      id: 'sc_1',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'Tugas 1',
      value: 0
    },
    {
      id: 'sc_2',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'Tugas 2',
      value: 90
    },
    {
      id: 'sc_3',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UH 1',
      value: 0
    },
    {
      id: 'sc_4',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'STS',
      value: 0
    },
    {
      id: 'sc_5',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'SAS',
      value: 0
    }
  ];

  const res = calculateStudentScore(defaultSetting, testScores, 75);
  assert(res.tugasFilledCount === 2, 'Tugas filled count includes 0');
  assert(res.tugasAverage === 45, `Tugas average (0 + 90)/2 = 45, got ${res.tugasAverage}`);
  assert(res.uhFilledCount === 1, 'UH filled count includes 0');
  assert(res.uhAverage === 0, `UH average with 0 should be 0, got ${res.uhAverage}`);
  assert(res.stsScore === 0, 'STS score 0 is valid');
  assert(res.sasScore === 0, 'SAS score 0 is valid');
  assert(res.isComplete === true, 'All components with 0 are marked complete');
  // (45 * 0.15) + (0 * 0.20) + (0 * 0.25) + (0 * 0.40) = 6.75 -> 6.8
  assert(res.finalScore === 6.8, `Final score should be 6.8, got ${res.finalScore}`);
  assert(res.isPassing === false, 'Score 6.8 is not passing KKM 75');
}

// TEST 5: Kompatibilitas nilai lama (Legacy migration without losing data)
console.log('\nTEST 5: Kompatibilitas nilai lama');
{
  const legacyScores: Score[] = [
    {
      id: 'sc_leg_1',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'TUGAS', // Legacy type
      value: 85
    },
    {
      id: 'sc_leg_2',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UH', // Legacy type
      value: 75
    },
    {
      id: 'sc_leg_3',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UTS', // Legacy synonym for STS
      value: 80
    },
    {
      id: 'sc_leg_4',
      studentId: 'st_001',
      teacherId: 't_001',
      classId: 'c_001',
      subjectId: 'sub_001',
      academicYearId: 'ay_2026_2027_1',
      semester: 'Ganjil',
      type: 'UAS', // Legacy synonym for SAS
      value: 90
    }
  ];

  const res = calculateStudentScore(defaultSetting, legacyScores, 75);
  assert(res.tugasAverage === 85, 'Legacy TUGAS mapped to Tugas 1 and averaged correctly');
  assert(res.uhAverage === 75, 'Legacy UH mapped to UH 1 and averaged correctly');
  assert(res.stsScore === 80, 'Legacy UTS mapped to STS correctly');
  assert(res.sasScore === 90, 'Legacy UAS mapped to SAS correctly');
  // (85 * 0.15) + (75 * 0.20) + (80 * 0.25) + (90 * 0.40)
  // = 12.75 + 15 + 20 + 36 = 83.75 -> 83.8
  assert(res.finalScore === 83.8, `Final score should be 83.8, got ${res.finalScore}`);
  assert(res.isPassing === true, '83.8 >= 75 is passing');
}

// TEST 6: Normalisasi Score & Firestore Sanitasi
console.log('\nTEST 6: Normalisasi Score & Sanitasi');
{
  const normalizedTugas = normalizeScore({
    studentId: 'st_123',
    teacherId: 't_456',
    classId: 'c_7a',
    subjectId: 'sub_ipa',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    type: 'tugas 3',
    value: '88,5'
  });
  assert(normalizedTugas.type === 'Tugas 3', `Type should normalize to 'Tugas 3', got ${normalizedTugas.type}`);
  assert(normalizedTugas.value === 88.5, `Value should parse to 88.5, got ${normalizedTugas.value}`);

  const normalizedZero = normalizeScore({
    studentId: 'st_123',
    teacherId: 't_456',
    classId: 'c_7a',
    subjectId: 'sub_ipa',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    type: 'UH 4',
    value: 0
  });
  assert(normalizedZero.value === 0, `Value 0 should remain 0, got ${normalizedZero.value}`);
  assert(normalizedZero.type === 'UH 4', `Type should normalize to 'UH 4', got ${normalizedZero.type}`);
}

console.log('\n🎉 ALL ACADEMIC TESTS PASSED SUCCESSFULLY!');
