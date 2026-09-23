import { AcademicSetting, AssessmentComponent, Score, RoundingOption } from '../types';

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
}

/**
 * Formats a numerical score into a clean display string according to the active RoundingOption:
 * - '1_decimal': 1 angka di belakang koma (e.g. 85.9)
 * - 'round': Bilangan bulat terdekat (e.g. 86)
 * - 'none': Desimal penuh / 2 angka di belakang koma (e.g. 85.90)
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
 * Normalizes Score type matching against AssessmentComponent code in a bidirectional,
 * resilient, case-insensitive way.
 * Handles synonyms:
 * - STS: STS, UTS, PTS, Sumatif Tengah Semester, Penilaian Tengah Semester
 * - SAS: SAS, UAS, PAS, PAT, Sumatif Akhir Semester, Penilaian Akhir Semester, Penilaian Akhir Tahun
 * - UH: UH, PH, Ulangan Harian, Penilaian Harian, Formatif
 * - Tugas: Tugas, PR, Penugasan, Projek
 */
export function matchesScoreType(compOrTypeA: string, compOrTypeB: string): boolean {
  if (!compOrTypeA || !compOrTypeB) return false;
  const a = String(compOrTypeA).trim().toUpperCase();
  const b = String(compOrTypeB).trim().toUpperCase();
  if (a === b) return true;

  const normalize = (code: string): string => {
    if (
      code === 'STS' ||
      code === 'UTS' ||
      code === 'PTS' ||
      code.includes('TENGAH') ||
      code.startsWith('STS') ||
      code.startsWith('PTS') ||
      code.startsWith('UTS')
    ) {
      return 'STS';
    }
    if (
      code === 'SAS' ||
      code === 'UAS' ||
      code === 'PAS' ||
      code === 'PAT' ||
      code.includes('AKHIR') ||
      code.startsWith('SAS') ||
      code.startsWith('PAS') ||
      code.startsWith('UAS') ||
      code.startsWith('PAT')
    ) {
      return 'SAS';
    }
    if (
      code === 'UH' ||
      code === 'PH' ||
      code.includes('HARIAN') ||
      code.includes('FORMATIF') ||
      code.startsWith('UH') ||
      code.startsWith('PH')
    ) {
      return 'UH';
    }
    if (
      code === 'TUGAS' ||
      code === 'PR' ||
      code.includes('TUGAS') ||
      code.includes('PROJEK') ||
      code.startsWith('TUGAS')
    ) {
      return 'TUGAS';
    }
    return code;
  };

  return normalize(a) === normalize(b);
}

/**
 * Calculates academic score summary based on the active AcademicSetting configuration
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

  // 2. Compute individual component scores (arithmetic average of all entries for that component)
  // All components in the setting have their recorded average computed, preserving historical values
  const componentScores: Record<string, number | null> = {};

  setting.components.forEach((comp) => {
    const matchingScores = studentScores.filter((s) => matchesScoreType(comp.code, s.type));
    if (matchingScores.length === 0) {
      componentScores[comp.code] = null;
    } else {
      const sum = matchingScores.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
      componentScores[comp.code] = Math.round((sum / matchingScores.length) * 10) / 10;
    }
  });

  // 3. Filter components that are active, included in final score, AND have recorded values
  const activeScoredComponents = setting.components.filter(
    (comp) => comp.enabled && comp.includedInFinalScore && componentScores[comp.code] !== null
  );

  if (activeScoredComponents.length === 0) {
    return {
      componentScores,
      finalScore: null,
      formattedFinalScore: '-',
      rawAverage: null,
      effectiveKkm,
      isPassing: null,
      statusLabel: setting.passingGradeStatus?.unassessedLabel || 'Belum Dinilai',
      totalEntries: studentScores.length,
      scoresList: studentScores
    };
  }

  // 4. Calculate raw score based on selected calculation method
  let rawScore = 0;

  if (setting.calculationMethod === 'SIMPLE_AVERAGE') {
    const sum = activeScoredComponents.reduce(
      (acc, comp) => acc + (componentScores[comp.code] || 0),
      0
    );
    rawScore = sum / activeScoredComponents.length;
  } else {
    // WEIGHTED:
    // Important: When not all components have grades, normalize relative to the sum of available weights
    // Example: Only UH (weight 30) = 85 -> (85 * 30) / 30 = 85 (NOT 21.25)
    // When all components (weight 20+30+20+30=100) are filled:
    // (80*20 + 85*30 + 90*20 + 88*30) / 100 = 85.9
    const totalAvailableWeight = activeScoredComponents.reduce((acc, comp) => acc + comp.weight, 0);

    if (totalAvailableWeight === 0) {
      // Fallback if weights sum to 0
      const sum = activeScoredComponents.reduce(
        (acc, comp) => acc + (componentScores[comp.code] || 0),
        0
      );
      rawScore = sum / activeScoredComponents.length;
    } else {
      const weightedSum = activeScoredComponents.reduce(
        (acc, comp) => acc + (componentScores[comp.code] || 0) * comp.weight,
        0
      );
      rawScore = weightedSum / totalAvailableWeight;
    }
  }

  // 5. Apply Rounding configuration
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

  // 6. Passing Status
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
    totalEntries: studentScores.length,
    scoresList: studentScores
  };
}
