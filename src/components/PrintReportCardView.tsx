import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import { calculateStudentScore, formatFinalScore } from '../lib/academicCalculation';
import { formatReportProgram, formatReportClassLabel } from '../lib/dbService';
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
  "bahasa indonesia": "اللغة الإndونيسية",
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
    saveReportCard,
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
    } else if (!classStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(classStudents[0].id);
    }
  }, [classStudents, selectedStudentId]);

  // Search filter inside student picker
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');

  // Editable homeroom notes state for live editing before print
  const [editableNotes, setEditableNotes] = useState<string>('');
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active student object
  const activeStudent = useMemo(() => {
    return classStudents.find((s) => s.id === selectedStudentId) || classStudents[0] || null;
  }, [classStudents, selectedStudentId]);

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

  // Fetch or initialize report card record for notes
  const currentReportCard = useMemo(() => {
    if (!activeStudent) return null;
    return reportCards.find(
      (rc) =>
        rc.studentId === activeStudent.id &&
        rc.classId === selectedClassId &&
        (rc.academicYearId === selectedYearId || rc.academicYearId === selectedYear?.name) &&
        rc.semester === selectedSemester
    );
  }, [reportCards, activeStudent, selectedClassId, selectedYearId, selectedYear, selectedSemester]);

  // Sync notes when student or period changes
  React.useEffect(() => {
    if (currentReportCard?.homeroomNotes) {
      setEditableNotes(currentReportCard.homeroomNotes);
    } else {
      setEditableNotes(
        'Ananda menunjukkan kesungguhan dan adab yang baik dalam menuntut ilmu. Tingkatkan keistiqamahan dan pemahaman materi di semester berikutnya.'
      );
    }
  }, [currentReportCard, activeStudent]);

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

  // Calculate detailed subject scores for the active selected student (Diniyah only)
  const studentSubjectScores = useMemo(() => {
    if (!activeStudent) return [];

    return diniyahSubjects.map((sub) => {
      const subScores = scores.filter(
        (sc) =>
          sc.studentId === activeStudent.id &&
          sc.classId === selectedClassId &&
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

      // Arabic name resolver: check custom sub.nameArab first, then dictionary
      const lowerName = sub.name.toLowerCase().trim();
      const arabicTitle = sub.nameArab || (sub as any).arabicName || ARABIC_SUBJECT_MAP[lowerName] || null;

      return {
        subject: sub,
        arabicTitle,
        effectiveKkm,
        calcResult,
        finalScore: calcResult.finalScore,
        formattedScore: calcResult.formattedFinalScore,
        terbilangScore: scoreToTerbilang(calcResult.formattedFinalScore, calcResult.finalScore),
        classAverage: classSubjectAverages[sub.id]?.averageFormatted || '-',
        isPassing: calcResult.isPassing
      };
    });
  }, [activeStudent, diniyahSubjects, scores, selectedClassId, selectedYearId, selectedYear, selectedSemester, currentAcademicSetting, classSubjectAverages]);

  // Group subjects exclusively under Diniyah
  const groupedSubjects = useMemo(() => {
    const groups: Record<string, typeof studentSubjectScores> = {};
    if (studentSubjectScores.length > 0) {
      groups['Diniyah'] = studentSubjectScores;
    }
    return groups;
  }, [studentSubjectScores]);

  // Summary totals for student
  const studentTotals = useMemo(() => {
    const scoredList = studentSubjectScores.filter((s) => s.finalScore !== null);
    if (scoredList.length === 0) {
      return { totalScore: '-', averageScore: '-', rawAverage: null };
    }

    const total = scoredList.reduce((acc, curr) => acc + (curr.finalScore || 0), 0);
    const rawAvg = total / scoredList.length;
    const formattedTotal = formatFinalScore(total, currentAcademicSetting.rounding);
    const formattedAvg = formatFinalScore(rawAvg, currentAcademicSetting.rounding);

    return { totalScore: formattedTotal, averageScore: formattedAvg, rawAverage: rawAvg };
  }, [studentSubjectScores, currentAcademicSetting.rounding]);

  // Attendance summary for this student in chosen class & period
  const studentAttendance = useMemo(() => {
    if (!activeStudent) return { sakit: 0, izin: 0, alpa: 0, total: 0 };

    const attList = attendance.filter(
      (a) =>
        a.studentId === activeStudent.id &&
        a.classId === selectedClassId &&
        (a.academicYearId === selectedYearId || a.academicYearId === selectedYear?.name) &&
        (!a.semester || a.semester === selectedSemester)
    );

    const sakit = attList.filter((a) => a.status === 'Sakit').length;
    const izin = attList.filter((a) => a.status === 'Izin').length;
    const alpa = attList.filter((a) => a.status === 'Alpa').length;

    return { sakit, izin, alpa, total: attList.length };
  }, [attendance, activeStudent, selectedClassId, selectedYearId, selectedYear, selectedSemester]);

  // Extracurricular activities & scores strictly for the active student in chosen period
  const studentExtracurriculars = useMemo(() => {
    if (!activeStudent) return [];

    const eksMasterList = subjects.filter(
      (s) => s.type === 'extracurricular' && s.isActive !== false
    );

    // 1. Find extracurricular IDs that this student participates in for the selected period
    const studentParticipations = extracurricularParticipants.filter((p) => {
      if (p.studentId !== activeStudent.id) return false;
      if (p.status === 'inactive') return false;
      if (selectedClassId && p.classId && p.classId !== selectedClassId) return false;
      const yearMatches =
        !p.academicYearId ||
        p.academicYearId === selectedYearId ||
        p.academicYearId === selectedYear?.name;
      if (!yearMatches) return false;
      if (p.semester && p.semester !== selectedSemester) return false;
      return true;
    });

    const participatedEksIds = new Set(studentParticipations.map((p) => p.extracurricularId));

    // 2. Find extracurricular scores saved specifically for this student in the selected period
    const studentEksScores = extracurricularScores.filter((sc) => {
      if (sc.studentId !== activeStudent.id) return false;
      if (selectedClassId && sc.classId && sc.classId !== selectedClassId) return false;
      const yearMatches =
        !sc.academicYearId ||
        sc.academicYearId === selectedYearId ||
        sc.academicYearId === selectedYear?.name;
      if (!yearMatches) return false;
      if (sc.semester && sc.semester !== selectedSemester) return false;
      return true;
    });

    // Only include extracurriculars followed by this student
    return eksMasterList
      .filter((eks) => participatedEksIds.has(eks.id))
      .map((eks) => {
        const scoreRecord = studentEksScores.find((sc) => sc.extracurricularId === eks.id);
        return {
          extracurricular: eks,
          nilai: scoreRecord?.nilai || '-',
          keterangan: scoreRecord?.keterangan || ''
        };
      });
  }, [
    activeStudent,
    subjects,
    extracurricularParticipants,
    extracurricularScores,
    selectedClassId,
    selectedYearId,
    selectedYear,
    selectedSemester
  ]);

  // Save edited notes
  const handleSaveNotes = async () => {
    if (!activeStudent) return;
    setIsSavingNotes(true);
    setSaveSuccessMsg(null);

    const rcId = `rc_${activeStudent.id}_${selectedClassId}_${selectedSemester}`;
    const newRecord: ReportCard = {
      id: rcId,
      studentId: activeStudent.id,
      classId: selectedClassId,
      academicYearId: selectedYearId,
      semester: selectedSemester,
      totalScore: typeof studentTotals.totalScore === 'number' ? studentTotals.totalScore : undefined,
      averageScore: studentTotals.rawAverage !== null ? Math.round(studentTotals.rawAverage * 10) / 10 : undefined,
      attendanceSummary: {
        hadir: 0,
        sakit: studentAttendance.sakit,
        izin: studentAttendance.izin,
        alpa: studentAttendance.alpa,
      },
      homeroomNotes: editableNotes.trim(),
      status: currentReportCard?.status || 'Draft',
    };

    try {
      await saveReportCard(newRecord);
      setSaveSuccessMsg('Catatan wali kelas berhasil disimpan!');
      setIsEditingNotes(false);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error saving report notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* ========================================================
          SCREEN-ONLY: FILTER BAR & CONTROLS
         ======================================================== */}
      <div className="no-print space-y-4">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
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
              <span className="text-xs text-slate-400 font-medium">
                Standard A4 Portrait &bull; Format Buku Rapor
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              Cetak Lembar Hasil Belajar Siswa
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Template formal siap cetak dengan konversi nilai huruf otomatis, rata-rata kelas, dan tipografi Arab.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
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
                  // Auto-select first active student in that class
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
                value={activeStudent?.id || ''}
                onChange={(e) => {
                  const chosenId = e.target.value;
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
                  <optgroup label={`Siswa Kelas ${selectedClass?.name || ''}`}>
                    {classStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} (NISN: {st.nisn || st.nis || '-'})
                      </option>
                    ))}
                  </optgroup>
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
          </div>

          {/* Quick info strip & note editor toggle */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div className="text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Wali Kelas:</span>{' '}
              {classHomeroomTeacher?.name || '-'} &bull;{' '}
              <span className="font-semibold text-slate-700">Rata-rata Nilai:</span>{' '}
              <strong className="text-indigo-600">{studentTotals.averageScore}</strong> &bull;{' '}
              <span className="font-semibold text-slate-700">Predikat:</span>{' '}
              <span
                className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-arabic font-bold text-sm"
                dir="rtl"
              >
                {getPredicateText(studentTotals.rawAverage)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3 h-3 text-slate-400" />
                {isEditingNotes ? 'Tutup Catatan' : 'Edit Catatan Wali Kelas'}
              </button>
            </div>
          </div>

          {/* Collapsible live notes editor */}
          {isEditingNotes && (
            <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Catatan Wali Kelas untuk {activeStudent?.name}:
              </label>
              <textarea
                rows={2}
                value={editableNotes}
                onChange={(e) => setEditableNotes(e.target.value)}
                placeholder="Tuliskan catatan perkembangan dan motivasi belajar siswa..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
              />
              <div className="flex items-center justify-between">
                {saveSuccessMsg ? (
                  <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saveSuccessMsg}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Catatan ini akan langsung tercetak pada kotak "Catatan" di rapor siswa.
                  </span>
                )}
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  {isSavingNotes ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          RAPOR SHEET (A4 PORTRAIT TEMPLATE DESIGN)
         ======================================================== */}
      {!activeStudent && (
        <div className="no-print bg-amber-50 rounded-2xl border border-amber-200 p-3.5 text-center text-xs text-amber-800 font-medium">
          Belum ada siswa aktif yang terdaftar di Kelas <strong>{formatReportClassLabel(selectedClass)}</strong>. Anda tetap dapat melihat pratinjau identitas program <strong>{formatReportProgram(schoolIdentity.programName, selectedClass)}</strong> di bawah ini, atau pilih siswa dari dropdown <strong>Pilih Siswa</strong>.
        </div>
      )}

      <div className="flex justify-center">
        <div
          id="print-rapor-sheet"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white p-6 sm:p-10 border border-slate-200 shadow-md rounded-xl text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          }}
        >
          {/* ========================================================
              1. HEADER
             ======================================================== */}
          <div className="text-center pb-3 border-b-2 border-slate-900">
            <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900">
              LAPORAN HASIL BELAJAR SISWA
            </h1>
          </div>

          {/* Information Grid: Two Columns (Left & Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 py-3 text-[11px] sm:text-xs border-b border-slate-300">
            {/* Left Column */}
            <div className="space-y-1">
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span className="font-semibold text-slate-700">Nama Sekolah</span>
                <span>:</span>
                <span className="font-bold text-slate-900">
                  {schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan'}
                </span>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span className="font-semibold text-slate-700">Program</span>
                <span>:</span>
                <span className="font-semibold text-slate-900">
                  {formatReportProgram(schoolIdentity.programName, selectedClass)}
                </span>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span className="font-semibold text-slate-700">Alamat</span>
                <span>:</span>
                <span className="text-slate-800 leading-snug">
                  {schoolIdentity.address || '-'}
                </span>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span className="font-semibold text-slate-700">Nama</span>
                <span>:</span>
                <strong className="font-bold text-slate-900">
                  {activeStudent ? activeStudent.name : '-'}
                </strong>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-1">
              <div className="grid grid-cols-[95px_10px_1fr]">
                <span className="font-semibold text-slate-700">Kelas</span>
                <span>:</span>
                <strong className="font-bold text-slate-900">
                  {formatReportClassLabel(selectedClass)}
                </strong>
              </div>
              <div className="grid grid-cols-[95px_10px_1fr]">
                <span className="font-semibold text-slate-700">Semester</span>
                <span>:</span>
                <span className="text-slate-800">{selectedSemester}</span>
              </div>
              <div className="grid grid-cols-[95px_10px_1fr]">
                <span className="font-semibold text-slate-700">Tahun Ajaran</span>
                <span>:</span>
                <span className="text-slate-800">
                  {selectedYear?.name || activeAcademicYear?.name || '-'}
                </span>
              </div>
              <div className="grid grid-cols-[95px_10px_1fr]">
                <span className="font-semibold text-slate-700">NISN</span>
                <span>:</span>
                <span className="font-mono text-slate-800">
                  {activeStudent ? activeStudent.nisn || activeStudent.nis || '-' : '-'}
                </span>
              </div>
            </div>
          </div>

            {/* ========================================================
                2. TABEL NILAI (MAIN GRADES TABLE)
               ======================================================== */}
            <div className="mt-3">
              <table className="w-full text-left border-collapse border border-slate-400 text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-blue-700 text-white font-bold text-center border-b border-blue-900">
                    <th rowSpan={2} className="border border-slate-400 px-2 py-2 w-10">
                      No.
                    </th>
                    <th rowSpan={2} className="border border-slate-400 px-3 py-2 text-left">
                      Mata Pelajaran
                    </th>
                    <th colSpan={2} className="border border-slate-400 px-2 py-1">
                      Nilai
                    </th>
                    <th rowSpan={2} className="border border-slate-400 px-2 py-2 w-28 text-center">
                      Rata-rata Kelas
                    </th>
                  </tr>
                  <tr className="bg-blue-800 text-white font-bold text-center border-b border-blue-900 text-[10px]">
                    <th className="border border-slate-400 px-2 py-1 w-16">Angka</th>
                    <th className="border border-slate-400 px-2 py-1 w-40">Terbilang</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedSubjects).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-slate-300 px-3 py-4 text-center text-slate-400">
                        Tidak ada mata pelajaran terdaftar.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedSubjects).map(([category, items], groupIdx) => {
                      const alphabet = String.fromCharCode(65 + groupIdx); // A, B, C...
                      return (
                        <React.Fragment key={category}>
                          {/* Group Category Header Row */}
                          <tr className="bg-slate-100 font-bold text-slate-900 border-t border-b border-slate-300">
                            <td colSpan={5} className="border border-slate-400 px-3 py-1 text-[11px] bg-slate-100">
                              {alphabet}. {category}
                            </td>
                          </tr>

                          {/* Subject rows */}
                          {items.map((sr, idx) => (
                            <tr key={sr.subject.id} className="hover:bg-slate-50/50">
                              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-600 font-mono">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-slate-800">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-slate-900">{sr.subject.name}</span>
                                  {sr.arabicTitle && (
                                    <span
                                      className="font-arabic font-bold text-slate-700 text-xs sm:text-sm tracking-wide ml-2"
                                      dir="rtl"
                                    >
                                      {sr.arabicTitle}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-900 font-mono">
                                {sr.formattedScore}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-800">
                                {sr.terbilangScore}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700 font-mono">
                                {sr.classAverage}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}

                  {/* ========================================================
                      5. JUMLAH DAN RATA-RATA ROW
                     ======================================================== */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-400 text-slate-900">
                    <td colSpan={2} className="border border-slate-400 px-3 py-1.5 text-right font-semibold">
                      Jumlah / <span className="font-arabic text-xs font-bold" dir="rtl">مجموع الدرجات</span>
                    </td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-bold font-mono text-sm">
                      {studentTotals.totalScore}
                    </td>
                    <td colSpan={2} className="border border-slate-400 bg-slate-50" />
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b border-slate-400 text-slate-900">
                    <td colSpan={2} className="border border-slate-400 px-3 py-1.5 text-right font-semibold">
                      Nilai Rata-rata / <span className="font-arabic text-xs font-bold" dir="rtl">معدل التراكم</span>
                    </td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-bold font-mono text-sm text-indigo-900">
                      {studentTotals.averageScore}
                    </td>
                    <td colSpan={2} className="border border-slate-400 bg-slate-50" />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ========================================================
                6. EKSTRAKURIKULER + 7. ABSENSI + 8. PREDIKAT (3-COLUMN SECTION)
               ======================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
              {/* 6. Ekstrakurikuler Table (5 Cols) */}
              <div className="md:col-span-5">
                <table className="w-full text-left border-collapse border border-slate-400 text-[10px] sm:text-[11px]">
                  <thead>
                    <tr className="bg-blue-700 text-white font-bold text-center">
                      <th className="border border-slate-400 px-1.5 py-1 w-8">No.</th>
                      <th className="border border-slate-400 px-2 py-1 text-left">
                        Kegiatan Ekstrakurikuler
                      </th>
                      <th className="border border-slate-400 px-1.5 py-1 w-12 text-center">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentExtracurriculars.length === 0 ? (
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
                      studentExtracurriculars.map((item, idx) => (
                        <tr key={item.extracurricular.id}>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-800 font-medium">
                            {item.extracurricular.name}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-900 font-mono">
                            {item.nilai}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 7. Absensi Table (4 Cols) */}
              <div className="md:col-span-4">
                <table className="w-full text-left border-collapse border border-slate-400 text-[10px] sm:text-[11px]">
                  <thead>
                    <tr className="bg-blue-700 text-white font-bold text-center">
                      <th className="border border-slate-400 px-2 py-1 text-left">Absensi</th>
                      <th className="border border-slate-400 px-2 py-1 w-20 text-center">Hari</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1 text-slate-700">Sakit</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold text-slate-900">
                        {studentAttendance.sakit}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1 text-slate-700">Izin</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold text-slate-900">
                        {studentAttendance.izin}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-2 py-1 text-slate-700">Ghoib</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold text-slate-900">
                        {studentAttendance.alpa}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 8. Predikat Box (3 Cols) */}
              <div className="md:col-span-3">
                <div className="border border-slate-400 h-full flex flex-col">
                  <div className="bg-blue-700 text-white font-bold text-[10px] sm:text-[11px] px-2 py-1 text-center">
                    Predikat
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-2 text-center bg-slate-50/50">
                    <span
                      className="text-xl sm:text-2xl font-bold text-slate-900 font-arabic leading-relaxed"
                      dir="rtl"
                    >
                      {getPredicateText(studentTotals.rawAverage)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                9. CATATAN WALI KELAS (FULL WIDTH BOX)
               ======================================================== */}
            <div className="mt-3 border border-slate-400">
              <div className="bg-blue-700 text-white font-bold text-[10px] sm:text-[11px] px-3 py-1">
                Catatan
              </div>
              <div className="p-3 text-[11px] text-slate-800 italic min-h-[46px] leading-relaxed">
                {editableNotes || 'Ananda menunjukkan kesungguhan dan adab yang baik dalam menuntut ilmu. Tingkatkan keistiqamahan dan pemahaman materi di semester berikutnya.'}
              </div>
            </div>

            {/* ========================================================
                10. TANDA TANGAN (SIGNATURES SECTION)
               ======================================================== */}
            <div className="mt-6 pt-2 text-[11px] sm:text-xs">
              {/* Date & Location */}
              <div className="text-right text-slate-700 mb-2">
                <span>{schoolIdentity.city || 'Jakarta'}, </span>
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
                  <div className="h-16" />
                  <div>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-36">
                      {activeStudent?.parentName || '(..........................................)'}
                    </p>
                  </div>
                </div>

                {/* 2. Wali Kelas */}
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="text-transparent select-none">&nbsp;</p>
                    <p className="font-semibold text-slate-800">
                      Wali Kelas {selectedClass?.name || ''}
                    </p>
                  </div>
                  <div className="h-16" />
                  <div>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-36">
                      {classHomeroomTeacher?.name || '(..........................................)'}
                    </p>
                    {classHomeroomTeacher?.nip && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        NIP. {classHomeroomTeacher.nip}
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
                  <div className="h-16" />
                  <div>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-36">
                      {schoolIdentity.mudirName || '(..........................................)'}
                    </p>
                    {schoolIdentity.mudirNip && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        NIP/NIK. {schoolIdentity.mudirNip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};
