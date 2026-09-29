import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import { calculateStudentScore, formatFinalScore } from '../lib/academicCalculation';
import { formatReportProgram, formatReportClassLabel } from '../lib/dbService';
import { SchoolLogo } from './SchoolLogo';
import { ReportCard, UserRole } from '../types';
import {
  Printer,
  Download,
  Eye,
  Search,
  SlidersHorizontal,
  Award,
  CalendarDays,
  UserCheck,
  Building2,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

interface PrintReportCardViewProps {
  userRole?: UserRole;
  initialStudentId?: string;
  initialClassId?: string;
  onBack?: () => void;
}

// Arabic subject dictionary for Islamic and general curriculum
export const ARABIC_SUBJECT_MAP: Record<string, string> = {
  // Diniyyah / Islamic
  "hifdzul qur'an": "حفظ القرآن",
  "hifzul qur'an": "حفظ القرآن",
  "tahfidz": "تحفيظ القرآن",
  "tahfidzul qur'an": "تحفيظ القرآن",
  "al-qur'an": "القرآن الكريم",
  "qur'an": "القرآن الكريم",
  "qur'an hadits": "القرآن والحديث",
  "alquran hadis": "القرآن والحديث",
  "hadits": "الحديث الشريف",
  "hadis": "الحديث الشريف",
  "tauhid": "التوحيد",
  "akidah": "العقيدة",
  "akidah akhlak": "العقيدة والأخلاق",
  "aqidah akhlak": "العقيدة والأخلاق",
  "akhlak": "الأخلاق",
  "tajwid": "التجويد",
  "fiqih": "الفقه",
  "fikih": "الفقه",
  "fiqh": "الفقه",
  "ushul fiqih": "أصول الفقه",
  "siroh": "السيرة النبوية",
  "sirah": "السيرة النبوية",
  "tarikh": "التاريخ الإسلامي",
  "sejarah kebudayaan islam": "تاريخ الحضارة الإسلامية",
  "ski": "تاريخ الحضارة الإسلامية",
  "do'a & dzikir": "الدعاء والذكر",
  "doa & dzikir": "الدعاء والذكر",
  "doa dan dzikir": "الدعاء والذكر",
  "doa": "الأدعية",
  "dzikir": "الأذكار",
  // Bahasa
  "nahwu": "النحو",
  "ilmu nahwu": "علم النحو",
  "shorof": "الصرف",
  "sharaf": "الصرف",
  "ilmu shorof": "علم الصرف",
  "bahasa arab": "اللغة العربية",
  "b. arab": "اللغة العربية",
  "arab": "اللغة العربية",
  "khot & imla'": "الخط والإملاء",
  "khath & imla'": "الخط والإملاء",
  "khot": "الخط العربي",
  "imla'": "الإملاء",
  "muthala'ah": "المطالعة",
  "insya'": "الإنشاء",
  "balaghah": "البلاغة",
  "muhadatsah": "المحادثة",
  // Umum
  "matematika": "الرياضيات",
  "bahasa indonesia": "اللغة الإندونيسية",
  "b. indonesia": "اللغة الإندونيسية",
  "ilmu pengetahuan alam": "العلوم الطبيعية",
  "ipa": "العلوم الطبيعية",
  "ilmu pengetahuan sosial": "العلوم الاجتماعية",
  "ips": "العلوم الاجتماعية",
  "informatika": "المعلوماتية",
  "tik": "تكنولوجيا المعلومات",
  "bahasa inggris": "اللغة الإنجليزية",
  "b. inggris": "اللغة الإنجليزية",
  "pendidikan agama islam": "التربية الإسلامية",
  "pai": "التربية الإسلامية",
  "pendidikan pancasila": "التربية الوطنية",
  "ppkn": "التربية الوطنية",
  "pkn": "التربية الوطنية",
  "pjok": "التربية البدنية والصحية",
  "penjasorkes": "التربية البدنية",
  "penjas": "التربية البدنية",
  "seni budaya": "الفنون والثقافة",
  "prakarya": "الأعمال اليدوية",
  // Ekstrakurikuler
  "pertanian": "الزراعة",
  "perikanan": "مصايد الأسماك",
  "peternakan": "تربية المواشي",
  "pramuka": "الكشافة",
  "pencak silat": "بينشاك سيلات",
  "memanah": "الرماية",
  "berkuda": "فروسية",
  "renang": "السباحة",
};

/**
 * Converts an integer (0 - 1000) into Indonesian words (Terbilang)
 */
function integerToWords(n: number): string {
  const num = Math.floor(Math.abs(n));
  const satuan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas'
  ];

  if (num === 0) return 'Nol';
  if (num < 12) return satuan[num];
  if (num < 20) return `${satuan[num - 10]} Belas`;
  if (num < 100) {
    const puluh = Math.floor(num / 10);
    const sisa = num % 10;
    return `${satuan[puluh]} Puluh${sisa > 0 ? ' ' + satuan[sisa] : ''}`;
  }
  if (num === 100) return 'Seratus';
  if (num < 200) {
    return `Seratus ${integerToWords(num - 100)}`;
  }
  if (num < 1000) {
    const ratus = Math.floor(num / 100);
    const sisa = num % 100;
    return `${satuan[ratus]} Ratus${sisa > 0 ? ' ' + integerToWords(sisa) : ''}`;
  }
  return String(num);
}

/**
 * Converts a report card numeric score (including optional decimal) to Indonesian Terbilang text.
 * Examples:
 * 0 -> Nol, 1 -> Satu, 10 -> Sepuluh, 11 -> Sebelas, 20 -> Dua Puluh, 21 -> Dua Puluh Satu,
 * 85 -> Delapan Puluh Lima, 87 -> Delapan Puluh Tujuh, 90 -> Sembilan Puluh, 100 -> Seratus
 */
export function scoreToTerbilang(
  formattedScore?: string | null,
  rawScore?: number | null
): string {
  if (formattedScore && formattedScore !== '-') {
    const clean = String(formattedScore).trim().replace(',', '.');
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return '-';

    const parts = clean.split('.');
    const intPart = parseInt(parts[0], 10);
    if (isNaN(intPart)) return '-';

    const intWords = integerToWords(intPart);
    if (parts.length > 1) {
      const decStr = parts[1].replace(/0+$/, '');
      if (decStr.length > 0) {
        const digitWords = [
          'Nol',
          'Satu',
          'Dua',
          'Tiga',
          'Empat',
          'Lima',
          'Enam',
          'Tujuh',
          'Delapan',
          'Sembilan'
        ];
        const decWords = decStr
          .split('')
          .map((d) => digitWords[parseInt(d, 10)] || '')
          .filter(Boolean)
          .join(' ');
        if (decWords) {
          return `${intWords} Koma ${decWords}`;
        }
      }
    }
    return intWords;
  }

  if (rawScore === null || rawScore === undefined || isNaN(rawScore)) return '-';
  const rounded = Math.round(rawScore * 10) / 10;
  return scoreToTerbilang(String(rounded), null);
}

/**
 * Formal Arabic predicate mapping for report card:
 * >= 90 : ممتاز (predikat tertinggi)
 * >= 80 : جيد جدا (predikat sangat baik)
 * >= 70 : جيد (predikat baik)
 * < 70  : مقبول (predikat cukup)
 */
export function getPredicateText(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '-';
  if (score >= 90) return 'ممتاز';
  if (score >= 80) return 'جيد جدا';
  if (score >= 70) return 'جيد';
  return 'مقبول';
}

export const PrintReportCardView: React.FC<PrintReportCardViewProps> = ({
  userRole,
  initialStudentId,
  initialClassId,
  onBack
}) => {
  const { role, currentUser } = useAuth();
  const effectiveRole = userRole || role || 'ADMIN';

  const {
    classes,
    students,
    subjects,
    teachers,
    scores,
    academicYears,
    activeAcademicYear,
    getAcademicSetting,
    reportCards,
    studentReportNotes,
    getStudentReportNote,
    attendance,
    extracurricularParticipants,
    extracurricularScores,
    schoolIdentity,
    loading
  } = useMasterData();

  // Find homeroom class if current user is Wali Kelas
  const homeroomClass = useMemo(() => {
    if (effectiveRole !== 'WALI_KELAS') return null;
    const currentTeacher = teachers.find(
      (t) => t.email === currentUser?.email || t.id === currentUser?.teacherId
    );
    if (!currentTeacher) return null;
    return classes.find(
      (c) => c.homeroomTeacherId === currentTeacher.id || c.teacherId === currentTeacher.id
    );
  }, [effectiveRole, currentUser, teachers, classes]);

  // Active classes only
  const activeClasses = useMemo(() => {
    return classes.filter((c) => c.isActive !== false);
  }, [classes]);

  // All active students across active classes
  const allActiveStudents = useMemo(() => {
    return students
      .filter((s) => s.status === 'Aktif' && (s as any).isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  // Year Selection
  const [selectedYearId, setSelectedYearId] = useState<string>(
    activeAcademicYear?.id || academicYears[0]?.id || ''
  );

  // Semester Selection
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(
    activeAcademicYear?.semester || 'Ganjil'
  );

  // Sync with activeAcademicYear when master data finishes loading or activeAcademicYear changes
  const lastSyncedActiveYearId = useRef<string | null>(null);
  useEffect(() => {
    if (activeAcademicYear) {
      const key = `${activeAcademicYear.id}_${activeAcademicYear.semester}`;
      if (lastSyncedActiveYearId.current !== key) {
        setSelectedYearId(activeAcademicYear.id);
        setSelectedSemester(activeAcademicYear.semester);
        lastSyncedActiveYearId.current = key;
      }
    }
  }, [activeAcademicYear]);

  // Class Selection
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (homeroomClass) return homeroomClass.id;
    if (initialClassId && activeClasses.some((c) => c.id === initialClassId)) return initialClassId;
    const classWithStudents = activeClasses.find((c) =>
      allActiveStudents.some((s) => s.classId === c.id)
    );
    return classWithStudents?.id || activeClasses[0]?.id || classes[0]?.id || '';
  });

  // Active students in selected class (exclude inactive/keluar/lulus/pindah students)
  const classStudents = useMemo(() => {
    return allActiveStudents.filter((s) => s.classId === selectedClassId);
  }, [allActiveStudents, selectedClassId]);

  // Student Selection
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialStudentId && allActiveStudents.some((s) => s.id === initialStudentId)) {
      return initialStudentId;
    }
    return classStudents[0]?.id || '';
  });

  // Sync initialClassId & initialStudentId when passed via props or when Firestore finishes loading
  const hasInitializedSelection = useRef(false);
  useEffect(() => {
    if (initialStudentId) {
      const targetStudent = allActiveStudents.find((s) => s.id === initialStudentId);
      if (targetStudent) {
        if (targetStudent.classId && targetStudent.classId !== selectedClassId) {
          setSelectedClassId(targetStudent.classId);
        }
        setSelectedStudentId(targetStudent.id);
        hasInitializedSelection.current = true;
        return;
      }
    }
    if (initialClassId && activeClasses.some((c) => c.id === initialClassId)) {
      setSelectedClassId(initialClassId);
      const firstSt = allActiveStudents.find((s) => s.classId === initialClassId);
      setSelectedStudentId(firstSt?.id || '');
      hasInitializedSelection.current = true;
      return;
    }
  }, [initialStudentId, initialClassId, activeClasses, allActiveStudents]);

  // Ensure valid class and student selection once Firestore data loads
  useEffect(() => {
    if (loading) return;
    if (homeroomClass && selectedClassId !== homeroomClass.id) {
      setSelectedClassId(homeroomClass.id);
      return;
    }

    const isCurrentClassValid = activeClasses.some((c) => c.id === selectedClassId);
    if (!isCurrentClassValid && activeClasses.length > 0) {
      const classWithStudents = activeClasses.find((c) =>
        allActiveStudents.some((s) => s.classId === c.id)
      );
      const nextClassId = classWithStudents?.id || activeClasses[0].id;
      setSelectedClassId(nextClassId);
      const firstSt = allActiveStudents.find((s) => s.classId === nextClassId);
      setSelectedStudentId(firstSt?.id || '');
      hasInitializedSelection.current = true;
      return;
    }

    // On first load after Firestore finishes, if current class has 0 students while another active class has students, prefer the class with students
    if (!hasInitializedSelection.current && activeClasses.length > 0 && !initialClassId && !homeroomClass) {
      const currentHasStudents = allActiveStudents.some((s) => s.classId === selectedClassId);
      if (!currentHasStudents) {
        const classWithStudents = activeClasses.find((c) =>
          allActiveStudents.some((s) => s.classId === c.id)
        );
        if (classWithStudents) {
          setSelectedClassId(classWithStudents.id);
          const firstSt = allActiveStudents.find((s) => s.classId === classWithStudents.id);
          setSelectedStudentId(firstSt?.id || '');
        }
      }
      hasInitializedSelection.current = true;
    }
  }, [loading, activeClasses, allActiveStudents, selectedClassId, homeroomClass, initialClassId]);

  // Keep selectedStudentId in sync with classStudents when class changes
  useEffect(() => {
    if (classStudents.length === 0) {
      if (selectedStudentId !== '') setSelectedStudentId('');
    } else if (
      selectedStudentId !== '__ALL_CLASS_STUDENTS__' &&
      !classStudents.some((s) => s.id === selectedStudentId)
    ) {
      setSelectedStudentId(classStudents[0].id);
    }
  }, [classStudents, selectedStudentId]);

  // Search filter inside student picker
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');

  // Paper Size Selection ('A4' = 210x297mm, 'F4' = 215x330mm)
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>(() => {
    try {
      const saved = localStorage.getItem('aksara_report_paper_size');
      if (saved === 'F4' || saved === 'A4') return saved;
    } catch {
      // ignore storage errors
    }
    return 'A4';
  });

  useEffect(() => {
    try {
      localStorage.setItem('aksara_report_paper_size', paperSize);
    } catch {
      // ignore storage errors
    }
  }, [paperSize]);

  // Inject dynamic @page rule into document.head so only the selected paper size (A4 or F4) is active
  useEffect(() => {
    const styleId = 'aksara-dynamic-report-page-size';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    if (paperSize === 'F4') {
      styleEl.textContent = `
        @page {
          size: 215mm 330mm;
          margin: 8mm 10mm 8mm 10mm;
        }
      `;
    } else {
      styleEl.textContent = `
        @page {
          size: 210mm 297mm;
          margin: 7mm 10mm 7mm 10mm;
        }
      `;
    }

    return () => {
      // Keep default A4 when leaving PrintReportCardView
      if (styleEl) {
        styleEl.textContent = `
          @page {
            size: 210mm 297mm;
            margin: 8mm 10mm 8mm 10mm;
          }
        `;
      }
    };
  }, [paperSize]);

  // Print mode: single student vs all students in class
  const isAllClassStudentsSelected = selectedStudentId === '__ALL_CLASS_STUDENTS__';

  // Header logo error state for clean fallback (never show broken image)
  const [headerLogoError, setHeaderLogoError] = useState(false);
  const cleanHeaderLogoUrl = useMemo(() => {
    const raw = (schoolIdentity?.logoUrl || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
    if (schoolIdentity?.updatedAt) {
      const sep = raw.includes('?') ? '&' : '?';
      return `${raw}${sep}v=${encodeURIComponent(String(schoolIdentity.updatedAt))}`;
    }
    return raw;
  }, [schoolIdentity?.logoUrl, schoolIdentity?.updatedAt]);
  useEffect(() => {
    setHeaderLogoError(false);
  }, [cleanHeaderLogoUrl]);

  // Active student object (for single-student view or first student summary)
  const activeStudent = useMemo(() => {
    if (isAllClassStudentsSelected) {
      return classStudents[0] || null;
    }
    return (
      classStudents.find((s) => s.id === selectedStudentId) ||
      allActiveStudents.find((s) => s.id === selectedStudentId) ||
      classStudents[0] ||
      null
    );
  }, [classStudents, allActiveStudents, selectedStudentId, isAllClassStudentsSelected]);

  // List of students to render as report card pages (1 student = 1 page)
  const studentsToRender = useMemo(() => {
    if (isAllClassStudentsSelected && classStudents.length > 0) {
      return classStudents;
    }
    return activeStudent ? [activeStudent] : [null];
  }, [isAllClassStudentsSelected, classStudents, activeStudent]);

  // Selected academic year object
  const selectedYear = useMemo(() => {
    return (
      academicYears.find((y) => y.id === selectedYearId) ||
      activeAcademicYear ||
      academicYears[0] || {
        id: selectedYearId,
        name: '2025/2026',
        semester: selectedSemester,
        isActive: true
      }
    );
  }, [academicYears, selectedYearId, activeAcademicYear, selectedSemester]);

  // Academic setting single source of truth for the chosen year and semester
  const currentAcademicSetting = useMemo(() => {
    return getAcademicSetting(selectedYearId, selectedSemester);
  }, [selectedYearId, selectedSemester, getAcademicSetting]);

  // Class metadata (always matches selectedClassId / activeStudent's class)
  const selectedClass = useMemo(() => {
    return (
      classes.find((c) => c.id === selectedClassId) ||
      (activeStudent ? classes.find((c) => c.id === activeStudent.classId) : undefined) ||
      activeClasses[0]
    );
  }, [classes, activeClasses, selectedClassId, activeStudent]);
  const classHomeroomTeacher = teachers.find(
    (t) => t.id === selectedClass?.homeroomTeacherId || t.id === selectedClass?.teacherId
  );

  // Read-only individual student report note strictly bound to studentId + academicYearId + semester
  const activeStudentReportNote = useMemo(() => {
    if (!activeStudent) return null;
    return getStudentReportNote(
      activeStudent.id,
      selectedYearId,
      selectedSemester,
      selectedClassId
    );
  }, [
    activeStudent,
    selectedYearId,
    selectedSemester,
    selectedClassId,
    studentReportNotes,
    reportCards,
    getStudentReportNote
  ]);

  // Strictly filter ONLY active Diniyah academic subjects and deduplicate by subject name
  const diniyahSubjects = useMemo(() => {
    const candidates = subjects.filter(
      (s) =>
        (s.type || 'subject') === 'subject' &&
        s.isActive !== false &&
        (s.category || '').trim().toLowerCase() === 'diniyah'
    );

    const byName = new Map<string, typeof candidates[0]>();
    candidates.forEach((sub) => {
      const key = sub.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, sub);
      } else {
        // Prefer the subject record that has actual scores or is not a legacy mock ID
        const existingHasScores = scores.some((sc) => sc.subjectId === existing.id);
        const currentHasScores = scores.some((sc) => sc.subjectId === sub.id);
        if (currentHasScores && !existingHasScores) {
          byName.set(key, sub);
        } else if (existing.id === 'sub_aqd' && sub.id !== 'sub_aqd') {
          byName.set(key, sub);
        }
      }
    });

    return Array.from(byName.values());
  }, [subjects, scores]);

  // Calculate subject scores for all students in class to compute Class Average per Subject
  const classSubjectAverages = useMemo(() => {
    const map: Record<string, { total: number; count: number; averageFormatted: string }> = {};

    diniyahSubjects.forEach((sub) => {
      let sum = 0;
      let count = 0;

      classStudents.forEach((st) => {
        const subScores = scores.filter(
          (sc) =>
            sc.studentId === st.id &&
            sc.classId === selectedClassId &&
            sc.subjectId === sub.id &&
            (sc.academicYearId === selectedYearId || sc.academicYearId === selectedYear?.name) &&
            (!sc.semester || sc.semester === selectedSemester)
        );

        const effectiveKkm =
          currentAcademicSetting.subjectKkmOverrides?.[sub.id] ?? sub.kkm ?? 75;
        const calc = calculateStudentScore(
          currentAcademicSetting,
          subScores,
          effectiveKkm,
          sub.id
        );

        if (calc.finalScore !== null) {
          sum += calc.finalScore;
          count += 1;
        }
      });

      const avgRaw = count > 0 ? sum / count : null;
      map[sub.id] = {
        total: sum,
        count,
        averageFormatted:
          avgRaw !== null
            ? formatFinalScore(avgRaw, currentAcademicSetting.rounding)
            : '-'
      };
    });

    return map;
  }, [diniyahSubjects, classStudents, scores, selectedClassId, selectedYearId, selectedYear, selectedSemester, currentAcademicSetting]);

  // Helper function to compute report data for any student (supports 1 student or multi-student class print)
  const buildStudentReportData = (targetStudent: (typeof students)[number] | null | undefined) => {
    const targetClassId = targetStudent?.classId || selectedClassId;
    const targetClass =
      classes.find((c) => c.id === targetClassId) || selectedClass;
    const targetHomeroomTeacher = teachers.find(
      (t) => t.id === targetClass?.homeroomTeacherId || t.id === targetClass?.teacherId
    );

    const subjectScoresList = !targetStudent
      ? []
      : diniyahSubjects.map((sub) => {
          const subScores = scores.filter(
            (sc) =>
              sc.studentId === targetStudent.id &&
              sc.classId === targetClassId &&
              sc.subjectId === sub.id &&
              (sc.academicYearId === selectedYearId || sc.academicYearId === selectedYear?.name) &&
              (!sc.semester || sc.semester === selectedSemester)
          );

          const effectiveKkm =
            currentAcademicSetting.subjectKkmOverrides?.[sub.id] ?? sub.kkm ?? 75;

          const calcResult = calculateStudentScore(
            currentAcademicSetting,
            subScores,
            effectiveKkm,
            sub.id
          );

          const lowerName = sub.name.toLowerCase().trim();
          const arabicTitle =
            sub.nameArab || (sub as any).arabicName || ARABIC_SUBJECT_MAP[lowerName] || null;

          return {
            subject: sub,
            arabicTitle,
            effectiveKkm,
            calcResult,
            finalScore: calcResult.finalScore,
            formattedScore: calcResult.formattedFinalScore,
            terbilangScore: scoreToTerbilang(
              calcResult.formattedFinalScore,
              calcResult.finalScore
            ),
            classAverage: classSubjectAverages[sub.id]?.averageFormatted || '-',
            isPassing: calcResult.isPassing
          };
        });

    const groups: Record<string, typeof subjectScoresList> = {};
    if (subjectScoresList.length > 0) {
      groups['Diniyah'] = subjectScoresList;
    }

    const scoredList = subjectScoresList.filter((s) => s.finalScore !== null);
    let totals: { totalScore: string; averageScore: string; rawAverage: number | null } = {
      totalScore: '-',
      averageScore: '-',
      rawAverage: null
    };
    if (scoredList.length > 0) {
      const total = scoredList.reduce((acc, curr) => acc + (curr.finalScore || 0), 0);
      const rawAvg = total / scoredList.length;
      totals = {
        totalScore: formatFinalScore(total, currentAcademicSetting.rounding),
        averageScore: formatFinalScore(rawAvg, currentAcademicSetting.rounding),
        rawAverage: rawAvg
      };
    }

    let attSummary = { sakit: 0, izin: 0, alpa: 0, total: 0 };
    if (targetStudent) {
      const attList = attendance.filter(
        (a) =>
          a.studentId === targetStudent.id &&
          a.classId === targetClassId &&
          (a.academicYearId === selectedYearId || a.academicYearId === selectedYear?.name) &&
          (!a.semester || a.semester === selectedSemester)
      );
      attSummary = {
        sakit: attList.filter((a) => a.status === 'Sakit').length,
        izin: attList.filter((a) => a.status === 'Izin').length,
        alpa: attList.filter((a) => a.status === 'Alpa').length,
        total: attList.length
      };
    }

    let eksList: Array<{ extracurricular: typeof subjects[0]; nilai: string; keterangan: string }> = [];
    if (targetStudent) {
      const eksMasterList = subjects.filter(
        (s) => s.type === 'extracurricular' && s.isActive !== false
      );
      const studentParticipations = extracurricularParticipants.filter((p) => {
        if (p.studentId !== targetStudent.id) return false;
        if (p.status === 'inactive') return false;
        if (targetClassId && p.classId && p.classId !== targetClassId) return false;
        const yearMatches =
          !p.academicYearId ||
          p.academicYearId === selectedYearId ||
          p.academicYearId === selectedYear?.name;
        if (!yearMatches) return false;
        if (p.semester && p.semester !== selectedSemester) return false;
        return true;
      });
      const participatedEksIds = new Set(studentParticipations.map((p) => p.extracurricularId));
      const studentEksScores = extracurricularScores.filter((sc) => {
        if (sc.studentId !== targetStudent.id) return false;
        if (targetClassId && sc.classId && sc.classId !== targetClassId) return false;
        const yearMatches =
          !sc.academicYearId ||
          sc.academicYearId === selectedYearId ||
          sc.academicYearId === selectedYear?.name;
        if (!yearMatches) return false;
        if (sc.semester && sc.semester !== selectedSemester) return false;
        return true;
      });

      eksList = eksMasterList
        .filter((eks) => participatedEksIds.has(eks.id))
        .map((eks) => {
          const scoreRecord = studentEksScores.find((sc) => sc.extracurricularId === eks.id);
          return {
            extracurricular: eks,
            nilai: scoreRecord?.nilai || '-',
            keterangan: scoreRecord?.keterangan || ''
          };
        });
    }

    const reportNote = targetStudent
      ? getStudentReportNote(
          targetStudent.id,
          selectedYearId,
          selectedSemester,
          targetClassId
        )
      : null;

    return {
      student: targetStudent,
      studentClass: targetClass,
      homeroomTeacher: targetHomeroomTeacher,
      groupedSubjects: groups,
      studentTotals: totals,
      studentAttendance: attSummary,
      studentExtracurriculars: eksList,
      reportNote
    };
  };

  // Summary totals for activeStudent (used in the top filter summary bar)
  const activeStudentData = useMemo(
    () => buildStudentReportData(activeStudent),
    [
      activeStudent,
      diniyahSubjects,
      scores,
      selectedClassId,
      selectedYearId,
      selectedYear,
      selectedSemester,
      currentAcademicSetting,
      classSubjectAverages,
      attendance,
      subjects,
      extracurricularParticipants,
      extracurricularScores,
      studentReportNotes,
      reportCards
    ]
  );

  const studentTotals = activeStudentData.studentTotals;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // PDF Download Helper notice
  const handleDownloadPdf = () => {
    // Standard browser print will prompt user to "Save as PDF"
    window.print();
  };

  // RBAC Access Guard: GURU_MAPEL without homeroom is not allowed to print full official report card
  if (effectiveRole === 'GURU_MAPEL') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Penerbitan dan pencetakan lembar resmi Rapor Siswa hanya dapat dilakukan oleh <strong>Wali Kelas</strong>, <strong>Kepala Sekolah</strong>, atau <strong>Administrator</strong>.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
          >
            Kembali
          </button>
        )}
      </div>
    );
  }

  const isF4 = paperSize === 'F4';

  return (
    <div className="space-y-5 print:space-y-0 print:m-0 print:p-0">
      {/* ========================================================
          SCREEN-ONLY: FILTER BAR & CONTROLS
         ======================================================== */}
      <div className="no-print space-y-4">
        {/* Top Header & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition mr-1 cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                Format Cetak Rapor Resmi
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {isF4
                  ? 'Ukuran F4 / Folio Portrait (215 × 330 mm)'
                  : 'Ukuran A4 Portrait (210 × 297 mm)'}{' '}
                &bull; 1 Siswa = 1 Lembar Kertas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              Cetak Lembar Hasil Belajar Siswa
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Header identitas pesantren dinamis, ukuran kertas A4/F4 akurat untuk Preview maupun Print/PDF, serta tata letak 1 halaman penuh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Segmented Paper Size Toggle: [ A4 ] [ F4 ] */}
            <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2.5">
                Ukuran Kertas:
              </span>
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Kertas A4 Portrait (210 × 297 mm)"
              >
                A4 (210×297 mm)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  paperSize === 'F4'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Kertas F4 / Folio Portrait (215 × 330 mm)"
              >
                F4 (215×330 mm)
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Rapor (Print / PDF)
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
              title="Gunakan opsi 'Save as PDF' di jendela print"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* 1. Class Picker */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pilih Kelas:
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  const newClassId = e.target.value;
                  setSelectedClassId(newClassId);
                  const firstInClass = allActiveStudents.find(
                    (s) => s.classId === newClassId
                  );
                  setSelectedStudentId(firstInClass ? firstInClass.id : '');
                }}
                disabled={effectiveRole === 'WALI_KELAS' && !!homeroomClass}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {activeClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Kelas {formatReportClassLabel(cls)} — {formatReportProgram(schoolIdentity.programName, cls)}
                  </option>
                ))}
              </select>
              {effectiveRole === 'WALI_KELAS' && homeroomClass && (
                <span className="text-[10px] text-blue-600 mt-1 block">
                  Terkunci pada kelas binaan Anda: <strong>{homeroomClass.name}</strong>
                </span>
              )}
            </div>

            {/* 2. Student Picker */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pilih Siswa ({classStudents.length} Siswa di Kelas {selectedClass?.name || '-'}):
              </label>
              <select
                value={isAllClassStudentsSelected ? '__ALL_CLASS_STUDENTS__' : activeStudent?.id || ''}
                onChange={(e) => {
                  const chosenId = e.target.value;
                  if (chosenId === '__ALL_CLASS_STUDENTS__') {
                    setSelectedStudentId('__ALL_CLASS_STUDENTS__');
                    return;
                  }
                  const chosenStudent = allActiveStudents.find((s) => s.id === chosenId);
                  if (chosenStudent) {
                    if (chosenStudent.classId && chosenStudent.classId !== selectedClassId) {
                      setSelectedClassId(chosenStudent.classId);
                    }
                    setSelectedStudentId(chosenStudent.id);
                  } else {
                    setSelectedStudentId(chosenId);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {classStudents.length === 0 ? (
                  <option value="">-- Belum ada siswa di kelas {selectedClass?.name || ''} --</option>
                ) : (
                  <>
                    {classStudents.length > 1 && (
                      <option value="__ALL_CLASS_STUDENTS__">
                        Semua Siswa Kelas {selectedClass?.name || ''} ({classStudents.length} Siswa — 1 Siswa 1 Halaman)
                      </option>
                    )}
                    <optgroup label={`Siswa Kelas ${selectedClass?.name || ''}`}>
                      {classStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} (NISN: {st.nisn || st.nis || '-'})
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
                {effectiveRole !== 'WALI_KELAS' &&
                  allActiveStudents.some((s) => s.classId !== selectedClassId) && (
                    <optgroup label="Pilih Siswa dari Kelas Lain">
                      {allActiveStudents
                        .filter((s) => s.classId !== selectedClassId)
                        .map((st) => {
                          const stClass = classes.find((c) => c.id === st.classId);
                          return (
                            <option key={st.id} value={st.id}>
                              {st.name} — Kelas {stClass?.name || '-'} (NISN: {st.nisn || st.nis || '-'})
                            </option>
                          );
                        })}
                    </optgroup>
                  )}
              </select>
            </div>

            {/* 3. Semester Picker */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Semester:
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>

            {/* 4. Academic Year Picker */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tahun Ajaran:
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => {
                  const newYearId = e.target.value;
                  setSelectedYearId(newYearId);
                  const foundAy = academicYears.find((ay) => ay.id === newYearId);
                  if (foundAy?.semester) {
                    setSelectedSemester(foundAy.semester);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} ({ay.semester}) {ay.isActive ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Paper Size Dropdown */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Ukuran Kertas:
              </label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as 'A4' | 'F4')}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="A4">A4 Portrait (210 × 297 mm)</option>
                <option value="F4">F4 / Folio Portrait (215 × 330 mm)</option>
              </select>
            </div>
          </div>

          {/* Quick info strip (Read-Only Summary) */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="text-slate-500 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">Wali Kelas:</span>{' '}
              {classHomeroomTeacher?.name || '-'} &bull;{' '}
              <span className="font-semibold text-slate-700">Ukuran Kertas Aktif:</span>{' '}
              <strong className="text-indigo-600">
                {isF4 ? 'F4 / Folio (215 × 330 mm)' : 'A4 (210 × 297 mm)'}
              </strong>{' '}
              &bull;{' '}
              {isAllClassStudentsSelected ? (
                <span>
                  Mode Cetak Massal: <strong>{classStudents.length} Lembar Rapor</strong> (1 Siswa = 1 Halaman)
                </span>
              ) : (
                <>
                  <span className="font-semibold text-slate-700">Rata-rata Nilai:</span>{' '}
                  <strong className="text-indigo-600">{studentTotals.averageScore}</strong> &bull;{' '}
                  <span className="font-semibold text-slate-700">Predikat:</span>{' '}
                  <span
                    className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-arabic font-bold text-sm"
                    dir="rtl"
                  >
                    {getPredicateText(studentTotals.rawAverage)}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAllClassStudentsSelected && (
                activeStudentReportNote?.note?.trim() ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Catatan Raport Individual Tersedia (Read-Only)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Catatan Raport belum diisi (Isi melalui menu Data Siswa &rarr; Catatan Raport)
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          RAPOR SHEET PREVIEW & PRINT PAGES (A4 / F4 DYNAMIC)
         ======================================================== */}
      {!activeStudent && (
        <div className="no-print bg-amber-50 rounded-2xl border border-amber-200 p-3.5 text-center text-xs text-amber-800 font-medium">
          Belum ada siswa aktif yang terdaftar di Kelas <strong>{formatReportClassLabel(selectedClass)}</strong>. Anda tetap dapat melihat pratinjau identitas program <strong>{formatReportProgram(schoolIdentity.programName, selectedClass)}</strong> di bawah ini, atau pilih siswa dari dropdown <strong>Pilih Siswa</strong>.
        </div>
      )}

      <div className="flex flex-col items-center gap-6 print:block print:gap-0 print:m-0 print:p-0">
        {studentsToRender.map((studentItem, pageIdx) => {
          const pageData = buildStudentReportData(studentItem);
          const isLastPage = pageIdx === studentsToRender.length - 1;
          const hasLogo = cleanHeaderLogoUrl.length > 0 && !headerLogoError;

          return (
            <div
              key={studentItem?.id || `preview-sheet-${pageIdx}`}
              id={pageIdx === 0 ? 'print-rapor-sheet' : `print-rapor-sheet-${pageIdx}`}
              className={`report-card-page w-full bg-white border border-slate-300 shadow-md rounded-xl text-slate-900 box-border transition-all duration-150 ${
                isF4
                  ? 'max-w-[215mm] min-h-[330mm] px-6 py-5 sm:px-9 sm:py-7'
                  : 'max-w-[210mm] min-h-[297mm] px-6 py-4 sm:px-8 sm:py-5'
              } print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 print:rounded-none ${
                !isLastPage ? 'report-card-page-break' : ''
              }`}
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
              }}
            >
              {/* Screen-only paper indicator badge */}
              <div className="no-print flex items-center justify-between text-[10px] text-slate-400 font-medium mb-2 pb-1.5 border-b border-dashed border-slate-200">
                <span>
                  Pratinjau Kertas:{' '}
                  <strong className="text-slate-600">
                    {isF4 ? 'F4 / Folio (215 × 330 mm)' : 'A4 (210 × 297 mm)'}
                  </strong>
                </span>
                <span>
                  {studentsToRender.length > 1
                    ? `Lembar ${pageIdx + 1} dari ${studentsToRender.length} — ${studentItem?.name || ''}`
                    : '1 Siswa = 1 Lembar Kertas'}
                </span>
              </div>

              {/* ========================================================
                  1. HEADER RAPOR DINAMIS (LOGO -> NAMA SEKOLAH -> ALAMAT -> JUDUL)
                 ======================================================== */}
              <div
                className={`text-center border-b-2 border-slate-900 ${
                  isF4 ? 'pb-2.5' : 'pb-2'
                }`}
              >
                {hasLogo && (
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={cleanHeaderLogoUrl}
                      alt={`Logo ${schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan'}`}
                      onError={() => setHeaderLogoError(true)}
                      className={`${
                        isF4
                          ? 'h-12 sm:h-14 print:h-[13.5mm]'
                          : 'h-10 sm:h-12 print:h-[11.5mm]'
                      } w-auto max-w-[45mm] object-contain select-none`}
                    />
                  </div>
                )}

                <div
                  className={`${
                    isF4 ? 'text-sm sm:text-[15px]' : 'text-xs sm:text-[13.5px]'
                  } font-extrabold uppercase tracking-wide text-slate-900 leading-tight`}
                >
                  {schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan'}
                </div>

                {schoolIdentity.address && (
                  <div className="text-[10px] sm:text-[10.5px] text-slate-600 leading-snug mt-0.5 max-w-[175mm] mx-auto">
                    {schoolIdentity.address}
                  </div>
                )}

                <h1
                  className={`${
                    isF4 ? 'text-sm sm:text-[15px] mt-1.5' : 'text-xs sm:text-[13.5px] mt-1'
                  } font-black tracking-wider uppercase text-slate-900 leading-tight`}
                >
                  LAPORAN HASIL BELAJAR SISWA
                </h1>
              </div>

              {/* ========================================================
                  2. IDENTITAS DATA RAPOR & SISWA (TWO COLUMNS)
                 ======================================================== */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-5 gap-y-0.5 ${
                  isF4 ? 'py-2.5 text-[11px]' : 'py-1.5 text-[10.5px]'
                } border-b border-slate-300 leading-snug`}
              >
                {/* Left Column */}
                <div className="space-y-0.5">
                  <div className="grid grid-cols-[92px_8px_1fr]">
                    <span className="font-semibold text-slate-700">Nama Sekolah</span>
                    <span>:</span>
                    <span className="font-bold text-slate-900">
                      {schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[92px_8px_1fr]">
                    <span className="font-semibold text-slate-700">Program</span>
                    <span>:</span>
                    <span className="font-semibold text-slate-900">
                      {formatReportProgram(schoolIdentity.programName, pageData.studentClass)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[92px_8px_1fr]">
                    <span className="font-semibold text-slate-700">Alamat</span>
                    <span>:</span>
                    <span className="text-slate-800 leading-tight">
                      {schoolIdentity.address || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[92px_8px_1fr]">
                    <span className="font-semibold text-slate-700">Nama</span>
                    <span>:</span>
                    <strong className="font-bold text-slate-900">
                      {pageData.student ? pageData.student.name : '-'}
                    </strong>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-0.5">
                  <div className="grid grid-cols-[88px_8px_1fr]">
                    <span className="font-semibold text-slate-700">NISN</span>
                    <span>:</span>
                    <span className="font-mono text-slate-800">
                      {pageData.student
                        ? pageData.student.nisn || pageData.student.nis || '-'
                        : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[88px_8px_1fr]">
                    <span className="font-semibold text-slate-700">Kelas</span>
                    <span>:</span>
                    <strong className="font-bold text-slate-900">
                      {formatReportClassLabel(pageData.studentClass)}
                    </strong>
                  </div>
                  <div className="grid grid-cols-[88px_8px_1fr]">
                    <span className="font-semibold text-slate-700">Semester</span>
                    <span>:</span>
                    <span className="text-slate-800">{selectedSemester}</span>
                  </div>
                  <div className="grid grid-cols-[88px_8px_1fr]">
                    <span className="font-semibold text-slate-700">Tahun Ajaran</span>
                    <span>:</span>
                    <span className="text-slate-800">
                      {selectedYear?.name || activeAcademicYear?.name || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  3. TABEL NILAI (MAIN GRADES TABLE)
                 ======================================================== */}
              <div className={isF4 ? 'mt-2.5' : 'mt-1.5'}>
                <table
                  className={`w-full text-left border-collapse border border-slate-400 ${
                    isF4 ? 'text-[11px]' : 'text-[10.5px]'
                  } leading-tight`}
                >
                  <thead>
                    <tr className="bg-blue-700 text-white font-bold text-center border-b border-blue-900">
                      <th
                        rowSpan={2}
                        className={`border border-slate-400 px-1.5 ${
                          isF4 ? 'py-1.5' : 'py-1'
                        } w-9`}
                      >
                        No.
                      </th>
                      <th
                        rowSpan={2}
                        className={`border border-slate-400 px-2.5 ${
                          isF4 ? 'py-1.5' : 'py-1'
                        } text-left`}
                      >
                        Mata Pelajaran
                      </th>
                      <th
                        colSpan={2}
                        className={`border border-slate-400 px-2 ${
                          isF4 ? 'py-1' : 'py-0.5'
                        }`}
                      >
                        Nilai
                      </th>
                      <th
                        rowSpan={2}
                        className={`border border-slate-400 px-2 ${
                          isF4 ? 'py-1.5' : 'py-1'
                        } w-24 text-center`}
                      >
                        Rata-rata Kelas
                      </th>
                    </tr>
                    <tr className="bg-blue-800 text-white font-bold text-center border-b border-blue-900 text-[10px]">
                      <th
                        className={`border border-slate-400 px-1.5 ${
                          isF4 ? 'py-1' : 'py-0.5'
                        } w-14`}
                      >
                        Angka
                      </th>
                      <th
                        className={`border border-slate-400 px-2 ${
                          isF4 ? 'py-1' : 'py-0.5'
                        } w-40`}
                      >
                        Terbilang
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(pageData.groupedSubjects).length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border border-slate-300 px-3 py-3 text-center text-slate-400"
                        >
                          Tidak ada mata pelajaran terdaftar.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(pageData.groupedSubjects).map(
                        ([category, items], groupIdx) => {
                          const alphabet = String.fromCharCode(65 + groupIdx);
                          return (
                            <React.Fragment key={category}>
                              {/* Group Category Header Row */}
                              <tr className="bg-slate-100 font-bold text-slate-900 border-t border-b border-slate-300">
                                <td
                                  colSpan={5}
                                  className={`border border-slate-400 px-2.5 ${
                                    isF4 ? 'py-1' : 'py-0.5'
                                  } text-[10.5px] bg-slate-100`}
                                >
                                  {alphabet}. {category}
                                </td>
                              </tr>

                              {/* Subject rows */}
                              {items.map((sr, idx) => (
                                <tr key={sr.subject.id}>
                                  <td
                                    className={`border border-slate-300 px-1.5 ${
                                      isF4 ? 'py-1' : 'py-[3px]'
                                    } text-center text-slate-600 font-mono`}
                                  >
                                    {idx + 1}
                                  </td>
                                  <td
                                    className={`border border-slate-300 px-2.5 ${
                                      isF4 ? 'py-1' : 'py-[3px]'
                                    } text-slate-800`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-slate-900">
                                        {sr.subject.name}
                                      </span>
                                      {sr.arabicTitle && (
                                        <span
                                          className="font-arabic font-bold text-slate-700 text-xs tracking-wide shrink-0"
                                          dir="rtl"
                                        >
                                          {sr.arabicTitle}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className={`border border-slate-300 px-1.5 ${
                                      isF4 ? 'py-1' : 'py-[3px]'
                                    } text-center font-bold text-slate-900 font-mono`}
                                  >
                                    {sr.formattedScore}
                                  </td>
                                  <td
                                    className={`border border-slate-300 px-2 ${
                                      isF4 ? 'py-1' : 'py-[3px]'
                                    } text-center font-semibold text-slate-800`}
                                  >
                                    {sr.terbilangScore}
                                  </td>
                                  <td
                                    className={`border border-slate-300 px-2 ${
                                      isF4 ? 'py-1' : 'py-[3px]'
                                    } text-center text-slate-700 font-mono`}
                                  >
                                    {sr.classAverage}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        }
                      )
                    )}

                    {/* ========================================================
                        4. JUMLAH DAN RATA-RATA ROW
                       ======================================================== */}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-400 text-slate-900">
                      <td
                        colSpan={2}
                        className={`border border-slate-400 px-2.5 ${
                          isF4 ? 'py-1' : 'py-[3px]'
                        } text-right font-semibold`}
                      >
                        Jumlah /{' '}
                        <span className="font-arabic text-xs font-bold" dir="rtl">
                          مجموع الدرجات
                        </span>
                      </td>
                      <td
                        className={`border border-slate-400 px-1.5 ${
                          isF4 ? 'py-1' : 'py-[3px]'
                        } text-center font-bold font-mono text-xs`}
                      >
                        {pageData.studentTotals.totalScore}
                      </td>
                      <td colSpan={2} className="border border-slate-400 bg-slate-50" />
                    </tr>
                    <tr className="bg-slate-50 font-bold border-b border-slate-400 text-slate-900">
                      <td
                        colSpan={2}
                        className={`border border-slate-400 px-2.5 ${
                          isF4 ? 'py-1' : 'py-[3px]'
                        } text-right font-semibold`}
                      >
                        Nilai Rata-rata /{' '}
                        <span className="font-arabic text-xs font-bold" dir="rtl">
                          معدل التراكم
                        </span>
                      </td>
                      <td
                        className={`border border-slate-400 px-1.5 ${
                          isF4 ? 'py-1' : 'py-[3px]'
                        } text-center font-bold font-mono text-xs text-indigo-900`}
                      >
                        {pageData.studentTotals.averageScore}
                      </td>
                      <td colSpan={2} className="border border-slate-400 bg-slate-50" />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ========================================================
                  5. EKSTRAKURIKULER + ABSENSI + PREDIKAT (3-COLUMN SECTION)
                 ======================================================== */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-2.5 ${
                  isF4 ? 'mt-2.5' : 'mt-1.5'
                }`}
              >
                {/* Ekstrakurikuler Table (5 Cols) */}
                <div className="sm:col-span-5 print:col-span-5">
                  <table className="w-full text-left border-collapse border border-slate-400 text-[10px] leading-tight">
                    <thead>
                      <tr className="bg-blue-700 text-white font-bold text-center">
                        <th className="border border-slate-400 px-1.5 py-0.5 w-7">No.</th>
                        <th className="border border-slate-400 px-2 py-0.5 text-left">
                          Kegiatan Ekstrakurikuler
                        </th>
                        <th className="border border-slate-400 px-1.5 py-0.5 w-11 text-center">
                          Nilai
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.studentExtracurriculars.length === 0 ? (
                        <tr>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-slate-400">
                            -
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-400 italic">
                            Tidak mengikuti ekstrakurikuler
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-semibold text-slate-400">
                            -
                          </td>
                        </tr>
                      ) : (
                        pageData.studentExtracurriculars.map((item, idx) => (
                          <tr key={item.extracurricular.id}>
                            <td className="border border-slate-300 px-1.5 py-0.5 text-center font-mono">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 px-2 py-0.5 text-slate-800 font-medium">
                              {item.extracurricular.name}
                            </td>
                            <td className="border border-slate-300 px-1.5 py-0.5 text-center font-bold text-slate-900 font-mono">
                              {item.nilai}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Absensi Table (4 Cols) */}
                <div className="sm:col-span-4 print:col-span-4">
                  <table className="w-full text-left border-collapse border border-slate-400 text-[10px] leading-tight">
                    <thead>
                      <tr className="bg-blue-700 text-white font-bold text-center">
                        <th className="border border-slate-400 px-2 py-0.5 text-left">Absensi</th>
                        <th className="border border-slate-400 px-2 py-0.5 w-16 text-center">
                          Hari
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 px-2 py-0.5 text-slate-700">
                          Sakit
                        </td>
                        <td className="border border-slate-300 px-2 py-0.5 text-center font-mono font-bold text-slate-900">
                          {pageData.studentAttendance.sakit}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-2 py-0.5 text-slate-700">Izin</td>
                        <td className="border border-slate-300 px-2 py-0.5 text-center font-mono font-bold text-slate-900">
                          {pageData.studentAttendance.izin}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-2 py-0.5 text-slate-700">
                          Ghoib
                        </td>
                        <td className="border border-slate-300 px-2 py-0.5 text-center font-mono font-bold text-slate-900">
                          {pageData.studentAttendance.alpa}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Predikat Box (3 Cols) */}
                <div className="sm:col-span-3 print:col-span-3">
                  <div className="border border-slate-400 h-full flex flex-col">
                    <div className="bg-blue-700 text-white font-bold text-[10px] px-2 py-0.5 text-center leading-tight">
                      Predikat
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-1.5 text-center bg-slate-50/50">
                      <span
                        className="text-lg sm:text-xl font-bold text-slate-900 font-arabic leading-snug"
                        dir="rtl"
                      >
                        {getPredicateText(pageData.studentTotals.rawAverage)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  6. CATATAN WALI KELAS (FULL WIDTH BOX - READ-ONLY PER STUDENT)
                 ======================================================== */}
              <div className={`${isF4 ? 'mt-2.5' : 'mt-1.5'} border border-slate-400`}>
                <div className="bg-blue-700 text-white font-bold text-[10px] px-2.5 py-0.5 leading-tight">
                  Catatan
                </div>
                <div
                  className={`${
                    isF4 ? 'p-2.5 min-h-[40px]' : 'p-2 min-h-[30px]'
                  } text-[10.5px] text-slate-800 leading-snug`}
                >
                  {pageData.reportNote?.note?.trim() ? (
                    <span className="italic">{pageData.reportNote.note}</span>
                  ) : (
                    <>
                      <span className="no-print text-slate-400 italic">
                        Belum ada catatan raport untuk {pageData.student?.name || 'santri ini'} pada Semester {selectedSemester} Tahun Ajaran {selectedYear?.name || activeAcademicYear?.name || '-'}.
                      </span>
                      <span className="hidden print:inline text-slate-500">-</span>
                    </>
                  )}
                </div>
              </div>

              {/* ========================================================
                  7. TANDA TANGAN (SIGNATURES SECTION - KEPT ON SAME PAGE)
                 ======================================================== */}
              <div
                className={`${
                  isF4 ? 'mt-4 pt-1.5 text-[11px]' : 'mt-2.5 pt-1 text-[10.5px]'
                } leading-tight break-inside-avoid`}
              >
                {/* Date & Location */}
                <div className="text-right text-slate-700 mb-1.5">
                  <span>{schoolIdentity.city || 'Tulang Bawang Barat'}, </span>
                  <span>
                    {new Date().toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {/* 3 Columns Signatures */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* 1. Wali Santri / Orang Tua */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-slate-600">Mengetahui</p>
                      <p className="font-semibold text-slate-800">Wali Santri / Orang Tua</p>
                    </div>
                    <div className={isF4 ? 'h-14' : 'h-10'} />
                    <div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-32">
                        {pageData.student?.parentName || '(..........................................)'}
                      </p>
                    </div>
                  </div>

                  {/* 2. Wali Kelas */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-transparent select-none">&nbsp;</p>
                      <p className="font-semibold text-slate-800">
                        Wali Kelas {pageData.studentClass?.name || ''}
                      </p>
                    </div>
                    <div className={isF4 ? 'h-14' : 'h-10'} />
                    <div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-32">
                        {pageData.homeroomTeacher?.name ||
                          '(..........................................)'}
                      </p>
                      {pageData.homeroomTeacher?.nip && (
                        <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                          NIP. {pageData.homeroomTeacher.nip}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3. Mengetahui Mudir / Kepala Sekolah (dari Identitas Sekolah) */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-slate-600">Mengetahui</p>
                      <p className="font-semibold text-slate-800">
                        {schoolIdentity.leaderTitle || 'Mudir / Kepala Sekolah'}
                      </p>
                    </div>
                    <div className={isF4 ? 'h-14' : 'h-10'} />
                    <div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-32">
                        {schoolIdentity.mudirName || '(..........................................)'}
                      </p>
                      {schoolIdentity.mudirNip && (
                        <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                          NIP/NIK. {schoolIdentity.mudirNip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
