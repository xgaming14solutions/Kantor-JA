import { AcademicSetting, AssessmentComponent, Score, RoundingOption } from '../types';

export const TUGAS_COLUMNS = [
  'Tugas 1',
  'Tugas 2',
  'Tugas 3',
  'Tugas 4',
  'Tugas 5',
  'Tugas 6',
  'Tugas 7',
  'Tugas 8',
  'Tugas 9',
  'Tugas 10'
] as const;

export type TugasColumn = typeof TUGAS_COLUMNS[number];

export const UH_COLUMNS = [
  'UH 1',
  'UH 2',
  'UH 3',
  'UH 4',
  'UH 5'
] as const;

export type UHColumn = typeof UH_COLUMNS[number];

export const ALL_ASSESSMENT_COLUMNS = [
  ...TUGAS_COLUMNS,
  ...UH_COLUMNS,
  'STS',
  'SAS'
] as const;

export type AssessmentColumn = typeof ALL_ASSESSMENT_COLUMNS[number];

export const DEFAULT_ASSESSMENT_COMPONENTS: AssessmentComponent[] = [
  { code: 'Tugas', name: 'Tugas', enabled: true, weight: 15, includedInFinalScore: true },
  { code: 'UH', name: 'Ulangan Harian (UH)', enabled: true, weight: 20, includedInFinalScore: true },
  { code: 'STS', name: 'STS', enabled: true, weight: 25, includedInFinalScore: true },
  { code: 'SAS', name: 'SAS', enabled: true, weight: 40, includedInFinalScore: true }
];

export const createDefaultAcademicSetting = (
  academicYearId: string,
  semester: 'Ganjil' | 'Genap'
): AcademicSetting => ({
  id: `as_${academicYearId}_${semester}`,
  academicYearId,
  semester,
  calculationMethod: 'WEIGHTED',
  components: [
    { code: 'Tugas', name: 'Tugas', enabled: true, weight: 15, includedInFinalScore: true },
    { code: 'UH', name: 'Ulangan Harian (UH)', enabled: true, weight: 20, includedInFinalScore: true },
    { code: 'STS', name: 'STS', enabled: true, weight: 25, includedInFinalScore: true },
    { code: 'SAS', name: 'SAS', enabled: true, weight: 40, includedInFinalScore: true }
  ],
  rounding: '1_decimal',
  subjectKkmOverrides: {},
  passingGradeStatus: {
    passingLabel: 'Tuntas',
    remedialLabel: 'Perlu Remedial',
    unassessedLabel: 'Belum Dinilai'
  },
  version: 1,
  status: 'Aktif',
  createdAt: new Date().toISOString(),
  createdBy: 'Kepala Sekolah',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Kepala Sekolah'
});

export interface StudentCalculatedSummary {
  componentScores: Record<string, number | null>;
  finalScore: number | null;
  formattedFinalScore: string;
  rawAverage: number | null;
  effectiveKkm: number;
  isPassing: boolean | null;
  statusLabel: string;
  totalEntries: number;
  scoresList: Score[];

  // 10 Tugas array (Tugas 1 .. 10, null if not filled, 0 is a valid filled grade)
  tugasList: (number | null)[];
  tugasFilledCount: number;
  tugasAverage: number | null;

  // 5 UH array (UH 1 .. 5, null if not filled, 0 is a valid filled grade)
  uhList: (number | null)[];
  uhFilledCount: number;
  uhAverage: number | null;

  // STS & SAS
  stsScore: number | null;
  sasScore: number | null;

  // Fixed Component Weights (15%, 20%, 25%, 40%)
  tugasWeight: number;
  uhWeight: number;
  stsWeight: number;
  sasWeight: number;

  // Completeness Status
  isComplete: boolean;
  completenessStatus: 'Lengkap' | 'Belum Lengkap';
  missingComponents: string[];
}

/**
 * Formats a numerical score into a clean display string according to the active RoundingOption:
 * - '1_decimal': 1 angka di belakang koma (e.g. 85,9)
 * - 'round': Bilangan bulat terdekat (e.g. 86)
 * - 'none': Desimal penuh / 2 angka di belakang koma (e.g. 85,90)
 */
export function formatFinalScore(
  score: number | null | undefined,
  rounding: RoundingOption = '1_decimal'
): string {
  if (score === null || score === undefined || isNaN(score)) return '-';
  if (rounding === 'round') {
    return Math.round(score).toString();
  }
  if (rounding === 'none') {
    return score.toFixed(2).replace('.', ',');
  }
  return score.toFixed(1).replace('.', ',');
}

/**
 * Normalizes any raw score type into its canonical representation:
 * - 'Tugas 1' ... 'Tugas 10'
 * - 'UH 1' ... 'UH 5'
 * - 'STS'
 * - 'SAS'
 * - Legacy 'Tugas' -> 'Tugas 1'
 * - Legacy 'UH' -> 'UH 1'
 */
export function normalizeScoreType(rawType?: string | null): string {
  if (!rawType) return 'Tugas 1';
  const clean = String(rawType).trim();
  const upper = clean.toUpperCase();

  // Match Tugas 1 .. 10
  const tugasMatch = upper.match(/^(?:TUGAS|PR)[\s_\-]*(\d+)$/i);
  if (tugasMatch) {
    const num = parseInt(tugasMatch[1], 10);
    if (num >= 1 && num <= 10) {
      return `Tugas ${num}`;
    }
  }

  // Match UH 1 .. 5
  const uhMatch = upper.match(/^(?:UH|PH|FORMATIF)[\s_\-]*(\d+)$/i);
  if (uhMatch) {
    const num = parseInt(uhMatch[1], 10);
    if (num >= 1 && num <= 5) {
      return `UH ${num}`;
    }
  }

  // Match STS synonyms
  if (
    upper === 'STS' ||
    upper === 'UTS' ||
    upper === 'PTS' ||
    upper.startsWith('STS') ||
    upper.startsWith('UTS') ||
    upper.startsWith('PTS') ||
    upper.includes('TENGAH')
  ) {
    return 'STS';
  }

  // Match SAS synonyms
  if (
    upper === 'SAS' ||
    upper === 'UAS' ||
    upper === 'PAS' ||
    upper === 'PAT' ||
    upper.startsWith('SAS') ||
    upper.startsWith('UAS') ||
    upper.startsWith('PAS') ||
    upper.startsWith('PAT') ||
    upper.includes('AKHIR')
  ) {
    return 'SAS';
  }

  // Legacy single Tugas without number -> 'Tugas 1'
  if (upper === 'TUGAS' || upper === 'PR' || upper === 'PENUGASAN' || upper === 'PROJEK') {
    return 'Tugas 1';
  }

  // Legacy single UH without number -> 'UH 1'
  if (upper === 'UH' || upper === 'PH' || upper === 'ULANGAN HARIAN' || upper === 'FORMATIF') {
    return 'UH 1';
  }

  return clean;
}

/**
 * Checks if two score type labels reference the exact same column (e.g. 'Tugas 1' === 'Tugas 1')
 */
export function isExactScoreTypeMatch(typeA: string, typeB: string): boolean {
  if (!typeA || !typeB) return false;
  return normalizeScoreType(typeA) === normalizeScoreType(typeB);
}

/**
 * Checks if a specific score type matches an assessment component code or type:
 * Handles both group-level matching ('Tugas' matches 'Tugas 1'..'Tugas 10')
 * and specific column matching ('Tugas 1' matches 'Tugas 1').
 */
export function matchesScoreType(compOrTypeA: string, compOrTypeB: string): boolean {
  if (!compOrTypeA || !compOrTypeB) return false;
  const aClean = String(compOrTypeA).trim();
  const bClean = String(compOrTypeB).trim();
  if (aClean.toLowerCase() === bClean.toLowerCase()) return true;

  const aNorm = normalizeScoreType(aClean);
  const bNorm = normalizeScoreType(bClean);
  if (aNorm === bNorm) return true;

  const aUpper = aClean.toUpperCase();
  const bUpper = bClean.toUpperCase();

  // Group level matching for Tugas
  if (aUpper === 'TUGAS' && bNorm.startsWith('Tugas ')) return true;
  if (bUpper === 'TUGAS' && aNorm.startsWith('Tugas ')) return true;

  // Group level matching for UH
  if (aUpper === 'UH' && bNorm.startsWith('UH ')) return true;
  if (bUpper === 'UH' && aNorm.startsWith('UH ')) return true;

  // Group level matching for STS
  if ((aUpper === 'STS' || aNorm === 'STS') && (bUpper === 'STS' || bNorm === 'STS')) return true;

  // Group level matching for SAS
  if ((aUpper === 'SAS' || aNorm === 'SAS') && (bUpper === 'SAS' || bNorm === 'SAS')) return true;

  return false;
}

/**
 * Calculates academic score summary based on the active AcademicSetting configuration:
 * 1. Tugas 1..10: extracts filled values (0 is valid!). Computes Rata-rata Tugas = sum / count of filled.
 * 2. UH 1..5: extracts filled values (0 is valid!). Computes Rata-rata UH = sum / count of filled.
 * 3. STS & SAS: extracts single values.
 * 4. Weights: Tugas (15%), UH (20%), STS (25%), SAS (40%).
 * 5. If all 4 components are available:
 *    Nilai Akhir = (Rata-rata Tugas × 15%) + (Rata-rata UH × 20%) + (STS × 25%) + (SAS × 40%)
 * 6. If any component is missing:
 *    Status = 'Belum Lengkap' (missing components are not 0 and weights are not redistributed).
 *    Nilai Akhir = null.
 */
export function calculateStudentScore(
  setting: AcademicSetting,
  studentScores: Score[],
  defaultKkm: number = 75,
  subjectId?: string
): StudentCalculatedSummary {
  // 1. Determine Effective KKM (checking per-subject override first)
  const effectiveKkm =
    subjectId && setting.subjectKkmOverrides && setting.subjectKkmOverrides[subjectId] !== undefined
      ? Number(setting.subjectKkmOverrides[subjectId])
      : defaultKkm;

  // 2. Extract values for 10 Tugas (Tugas 1 .. Tugas 10)
  // Ensure intentional 0 is retained as a valid score, while empty remains null.
  const tugasList: (number | null)[] = TUGAS_COLUMNS.map((tugasCol) => {
    // Exact column match first
    const scoreDoc = studentScores.find((s) => isExactScoreTypeMatch(s.type, tugasCol));
    if (scoreDoc && scoreDoc.value !== undefined && scoreDoc.value !== null) {
      const num = typeof scoreDoc.value === 'number' ? scoreDoc.value : parseFloat(String(scoreDoc.value));
      return isNaN(num) ? null : num;
    }

    // Backward compatibility: If evaluating Tugas 1 and no explicit Tugas 1 exists, check for legacy 'Tugas'
    if (tugasCol === 'Tugas 1') {
      const legacyDoc = studentScores.find(
        (s) => String(s.type).trim().toUpperCase() === 'TUGAS' || String(s.type).trim().toUpperCase() === 'PR'
      );
      if (legacyDoc && legacyDoc.value !== undefined && legacyDoc.value !== null) {
        const num = typeof legacyDoc.value === 'number' ? legacyDoc.value : parseFloat(String(legacyDoc.value));
        return isNaN(num) ? null : num;
      }
    }

    return null;
  });

  // Calculate Rata-rata Tugas (only divider by actually filled tugas count)
  const filledTugas = tugasList.filter((v): v is number => v !== null && v !== undefined);
  const tugasFilledCount = filledTugas.length;
  const tugasAverage =
    tugasFilledCount > 0
      ? Math.round((filledTugas.reduce((a, b) => a + b, 0) / tugasFilledCount) * 10) / 10
      : null;

  // 3. Extract values for 5 UH (UH 1 .. UH 5)
  const uhList: (number | null)[] = UH_COLUMNS.map((uhCol) => {
    // Exact column match first
    const scoreDoc = studentScores.find((s) => isExactScoreTypeMatch(s.type, uhCol));
    if (scoreDoc && scoreDoc.value !== undefined && scoreDoc.value !== null) {
      const num = typeof scoreDoc.value === 'number' ? scoreDoc.value : parseFloat(String(scoreDoc.value));
      return isNaN(num) ? null : num;
    }

    // Backward compatibility: If evaluating UH 1 and no explicit UH 1 exists, check for legacy 'UH'
    if (uhCol === 'UH 1') {
      const legacyDoc = studentScores.find(
        (s) =>
          String(s.type).trim().toUpperCase() === 'UH' ||
          String(s.type).trim().toUpperCase() === 'PH' ||
          String(s.type).trim().toUpperCase() === 'ULANGAN HARIAN'
      );
      if (legacyDoc && legacyDoc.value !== undefined && legacyDoc.value !== null) {
        const num = typeof legacyDoc.value === 'number' ? legacyDoc.value : parseFloat(String(legacyDoc.value));
        return isNaN(num) ? null : num;
      }
    }

    return null;
  });

  // Calculate Rata-rata UH (only divider by actually filled UH count)
  const filledUh = uhList.filter((v): v is number => v !== null && v !== undefined);
  const uhFilledCount = filledUh.length;
  const uhAverage =
    uhFilledCount > 0
      ? Math.round((filledUh.reduce((a, b) => a + b, 0) / uhFilledCount) * 10) / 10
      : null;

  // 4. Extract STS
  const stsDoc = studentScores.find((s) => normalizeScoreType(s.type) === 'STS');
  const stsScore: number | null =
    stsDoc && stsDoc.value !== undefined && stsDoc.value !== null && !isNaN(Number(stsDoc.value))
      ? Number(stsDoc.value)
      : null;

  // 5. Extract SAS
  const sasDoc = studentScores.find((s) => normalizeScoreType(s.type) === 'SAS');
  const sasScore: number | null =
    sasDoc && sasDoc.value !== undefined && sasDoc.value !== null && !isNaN(Number(sasDoc.value))
      ? Number(sasDoc.value)
      : null;

  // 6. Build unified componentScores dictionary
  const componentScores: Record<string, number | null> = {
    Tugas: tugasAverage,
    UH: uhAverage,
    STS: stsScore,
    SAS: sasScore
  };

  // Also populate individual columns
  TUGAS_COLUMNS.forEach((col, idx) => {
    componentScores[col] = tugasList[idx];
  });
  UH_COLUMNS.forEach((col, idx) => {
    componentScores[col] = uhList[idx];
  });

  // Fixed Component Weights (15%, 20%, 25%, 40%)
  const tugasWeight = 15;
  const uhWeight = 20;
  const stsWeight = 25;
  const sasWeight = 40;

  // 7. Check Completeness:
  // All 4 components must have values (Rata-rata Tugas, Rata-rata UH, STS, SAS)
  const missingComponents: string[] = [];
  if (tugasAverage === null) missingComponents.push('Tugas');
  if (uhAverage === null) missingComponents.push('Ulangan Harian');
  if (stsScore === null) missingComponents.push('STS');
  if (sasScore === null) missingComponents.push('SAS');

  const isComplete = missingComponents.length === 0;
  const completenessStatus: 'Lengkap' | 'Belum Lengkap' = isComplete ? 'Lengkap' : 'Belum Lengkap';

  // Total student raw entries
  const totalEntries = studentScores.length;

  // 8. If all components are present, calculate final score
  if (isComplete) {
    let rawScore = 0;
    if (setting.calculationMethod === 'SIMPLE_AVERAGE') {
      rawScore = (tugasAverage! + uhAverage! + stsScore! + sasScore!) / 4;
    } else {
      // WEIGHTED (15%, 20%, 25%, 40%):
      // (Rata-rata Tugas × 15%) + (Rata-rata UH × 20%) + (Nilai STS × 25%) + (Nilai SAS × 40%)
      rawScore =
        (tugasAverage! * (tugasWeight / 100)) +
        (uhAverage! * (uhWeight / 100)) +
        (stsScore! * (stsWeight / 100)) +
        (sasScore! * (sasWeight / 100));
    }

    // Apply Rounding configuration
    let finalScore: number;
    if (setting.rounding === 'round') {
      finalScore = Math.round(rawScore);
    } else if (setting.rounding === 'none') {
      finalScore = Math.round(rawScore * 100) / 100;
    } else {
      // Default '1_decimal'
      finalScore = Math.round(rawScore * 10) / 10;
    }

    const formattedFinalScore = formatFinalScore(finalScore, setting.rounding);
    const isPassing = finalScore >= effectiveKkm;
    const statusLabel = isPassing
      ? setting.passingGradeStatus?.passingLabel || 'Tuntas'
      : setting.passingGradeStatus?.remedialLabel || 'Perlu Remedial';

    return {
      componentScores,
      finalScore,
      formattedFinalScore,
      rawAverage: rawScore,
      effectiveKkm,
      isPassing,
      statusLabel,
      totalEntries,
      scoresList: studentScores,
      tugasList,
      tugasFilledCount,
      tugasAverage,
      uhList,
      uhFilledCount,
      uhAverage,
      stsScore,
      sasScore,
      tugasWeight,
      uhWeight,
      stsWeight,
      sasWeight,
      isComplete,
      completenessStatus,
      missingComponents
    };
  }

  // 9. When one or more components are not yet filled:
  // Do NOT treat missing components as 0.
  // Do NOT redistribute missing weights to available components.
  // Display status as 'Belum Lengkap' and finalScore as null ('-').
  const isEntirelyUnassessed =
    tugasFilledCount === 0 && uhFilledCount === 0 && stsScore === null && sasScore === null;

  return {
    componentScores,
    finalScore: null,
    formattedFinalScore: '-',
    rawAverage: null,
    effectiveKkm,
    isPassing: null,
    statusLabel: isEntirelyUnassessed
      ? setting.passingGradeStatus?.unassessedLabel || 'Belum Dinilai'
      : 'Belum Lengkap',
    totalEntries,
    scoresList: studentScores,
    tugasList,
    tugasFilledCount,
    tugasAverage,
    uhList,
    uhFilledCount,
    uhAverage,
    stsScore,
    sasScore,
    tugasWeight,
    uhWeight,
    stsWeight,
    sasWeight,
    isComplete: false,
    completenessStatus: 'Belum Lengkap',
    missingComponents
  };
}
