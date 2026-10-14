import React, { useState, useMemo, useEffect } from 'react';
import { Score, ExtracurricularScore, hasRole, hasAnyRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import {
  validateTeacherAssignmentAuth,
  assertTeacherScoreAccess,
  getEffectiveTeacherId,
  getActiveTeacherAssignments
} from '../lib/dbService';
import {
  calculateStudentScore,
  createDefaultAcademicSetting,
  matchesScoreType,
  normalizeScoreType,
  isExactScoreTypeMatch,
  formatFinalScore,
  TUGAS_COLUMNS,
  UH_COLUMNS,
  ALL_ASSESSMENT_COLUMNS
} from '../lib/academicCalculation';
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  X,
  BookOpen,
  GraduationCap,
  Award,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  Eye,
  Trash2,
  SlidersHorizontal,
  Calculator,
  Edit2,
  Sparkles,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Info
} from 'lucide-react';

const DEFAULT_EKSKUL_KETERANGAN: Record<string, string> = {
  A: 'Sangat Baik',
  B: 'Baik',
  C: 'Cukup',
  D: 'Kurang'
};

export const ScoresView: React.FC = () => {
  const { currentUser, role } = useAuth();
  const {
    classes,
    subjects,
    students,
    teachers,
    activeAcademicYear,
    teacherAssignments,
    scores,
    academicSettings,
    extracurricularParticipants,
    extracurricularScores,
    getAcademicSetting,
    saveScore,
    deleteScore,
    saveExtracurricularScore,
    deleteExtracurricularScore,
    refreshAll
  } = useMasterData();

  // Assessment Type Selector: 'subject' (Mata Pelajaran) | 'extracurricular' (Ekstrakurikuler)
  const [assessmentType, setAssessmentType] = useState<'subject' | 'extracurricular'>('subject');

  // Toggle view for 10 Tugas & 5 UH (default true: show all individual columns)
  const [showAllColumns, setShowAllColumns] = useState<boolean>(true);

  // Mobile expandable card student ID
  const [mobileExpandedStudentId, setMobileExpandedStudentId] = useState<string | null>(null);

  // Active Academic Setting dynamically fetched from Firestore
  const currentAcademicSetting = useMemo(() => {
    if (!activeAcademicYear) {
      return createDefaultAcademicSetting('ay_2026_2027_1', 'Ganjil');
    }
    return getAcademicSetting(activeAcademicYear.id, activeAcademicYear.semester);
  }, [activeAcademicYear, getAcademicSetting, academicSettings]);

  // Multi-role definitions
  const isTeacher = hasAnyRole(currentUser || role, ['GURU_MAPEL', 'WALI_KELAS']);
  const isAdmin = hasRole(currentUser || role, 'ADMIN');
  const isHeadOrMudir = hasAnyRole(currentUser || role, ['KEPALA_SEKOLAH', 'MUDIR']);
  const isWaliKelas = hasRole(currentUser || role, 'WALI_KELAS');
  const isGuruMapel = hasRole(currentUser || role, 'GURU_MAPEL');

  // 1. Resolve Effective Teacher ID: user/guru -> teacherId
  const effectiveTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, role, teachers);
  }, [currentUser, role, teachers]);

  const teacherProfile = useMemo(() => {
    return teachers.find((t) => t.id === effectiveTeacherId) || null;
  }, [teachers, effectiveTeacherId]);

  // 2. Filter Active Teacher Assignments for teachers
  const activeTeacherAssignments = useMemo(() => {
    if (!isTeacher) return [];
    return getActiveTeacherAssignments(teacherAssignments, effectiveTeacherId, activeAcademicYear);
  }, [isTeacher, effectiveTeacherId, activeAcademicYear, teacherAssignments]);

  // Selected Class State
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // 3. Filter Available Subjects strictly from TeacherAssignments for GURU_MAPEL, and prioritize for WALI_KELAS
  const availableSubjects = useMemo(() => {
    const academicSubjects = subjects.filter(
      (s) => (s.type || 'subject') === 'subject' && s.isActive !== false
    );

    if (!isAdmin && !isWaliKelas && isGuruMapel) {
      const assignedSubjectIds = new Set(activeTeacherAssignments.map((a) => a.subjectId));
      return academicSubjects.filter((s) => assignedSubjectIds.has(s.id));
    }
    if (isWaliKelas) {
      const assignedSubjectIds = new Set(
        activeTeacherAssignments
          .filter((a) => !selectedClassId || a.classId === selectedClassId)
          .map((a) => a.subjectId)
      );
      const assigned = academicSubjects.filter((s) => assignedSubjectIds.has(s.id));
      const others = academicSubjects.filter((s) => !assignedSubjectIds.has(s.id));
      return [...assigned, ...others];
    }
    return academicSubjects;
  }, [isAdmin, isWaliKelas, isGuruMapel, activeTeacherAssignments, selectedClassId, subjects]);

  // Selected Subject State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Auto-sync selectedSubjectId
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  // 3B. Filter Available Extracurriculars
  const availableExtracurriculars = useMemo(() => {
    return subjects.filter((s) => s.type === 'extracurricular' && s.isActive !== false);
  }, [subjects]);

  const [selectedExtracurricularId, setSelectedExtracurricularId] = useState<string>('');

  useEffect(() => {
    if (availableExtracurriculars.length > 0) {
      if (!availableExtracurriculars.some((s) => s.id === selectedExtracurricularId)) {
        setSelectedExtracurricularId(availableExtracurriculars[0].id);
      }
    } else {
      setSelectedExtracurricularId('');
    }
  }, [availableExtracurriculars, selectedExtracurricularId]);

  // Available classes based on teacher assignments
  const availableClasses = useMemo(() => {
    if (!isAdmin && !isWaliKelas && isGuruMapel) {
      const assignedClassIds = new Set(activeTeacherAssignments.map((a) => a.classId));
      return classes.filter((c) => c.isActive !== false && assignedClassIds.has(c.id));
    }
    if (isWaliKelas) {
      const assignedClassIds = new Set(activeTeacherAssignments.map((a) => a.classId));
      const relevant = classes.filter(
        (c) =>
          c.isActive !== false &&
          (assignedClassIds.has(c.id) ||
            c.homeroomTeacherId === effectiveTeacherId ||
            c.teacherId === effectiveTeacherId)
      );
      return relevant.length > 0 ? relevant : classes.filter((c) => c.isActive !== false);
    }
    return classes.filter((c) => c.isActive !== false);
  }, [isAdmin, isWaliKelas, isGuruMapel, activeTeacherAssignments, classes, effectiveTeacherId]);

  // Auto-sync selectedClassId
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!availableClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(availableClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [availableClasses, selectedClassId]);

  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  const currentSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  const currentExtracurricular = useMemo(() => {
    return subjects.find((s) => s.id === selectedExtracurricularId) || null;
  }, [subjects, selectedExtracurricularId]);

  // Filter students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students.filter(
      (s) =>
        s.classId === selectedClassId &&
        s.status === 'Aktif' &&
        (s as any).isActive !== false
    );
  }, [students, selectedClassId]);

  // Extracurricular participants
  const extracurricularStudents = useMemo(() => {
    if (!selectedExtracurricularId || !selectedClassId) return [];
    const participantStudentIds = new Set(
      extracurricularParticipants
        .filter((p) => p.extracurricularId === selectedExtracurricularId)
        .map((p) => p.studentId)
    );
    return classStudents.filter((s) => participantStudentIds.has(s.id));
  }, [classStudents, extracurricularParticipants, selectedExtracurricularId, selectedClassId]);

  // Authorization check for current class and subject
  const isAuthorized = useMemo(() => {
    if (isAdmin || isHeadOrMudir) return true;
    if (!isTeacher) return true;
    if (!selectedClassId || !selectedSubjectId || !activeAcademicYear) return false;
    return validateTeacherAssignmentAuth(
      teacherAssignments,
      effectiveTeacherId!,
      selectedClassId,
      selectedSubjectId,
      activeAcademicYear.id,
      activeAcademicYear.semester
    );
  }, [
    isAdmin,
    isHeadOrMudir,
    isTeacher,
    effectiveTeacherId,
    teacherAssignments,
    selectedClassId,
    selectedSubjectId,
    activeAcademicYear
  ]);

  const canEditScores = useMemo(() => {
    if (isAdmin) return true;
    if (isTeacher) return isAuthorized;
    return false;
  }, [isAdmin, isTeacher, isAuthorized]);

  const canEditExtracurricularScores = useMemo(() => {
    return isAdmin || isTeacher;
  }, [isAdmin, isTeacher]);

  const effectiveCurrentKkm = useMemo(() => {
    if (!currentSubject) return 75;
    return currentAcademicSetting.subjectKkmOverrides?.[currentSubject.id] ?? currentSubject.kkm ?? 75;
  }, [currentAcademicSetting, currentSubject]);

  // =========================================================================
  // MODAL 1: FULL STUDENT SCORE MODAL (10 Tugas + 5 UH + STS + SAS at once)
  // =========================================================================
  const [studentScoreModalOpen, setStudentScoreModalOpen] = useState<boolean>(false);
  const [studentScoreModalStudent, setStudentScoreModalStudent] = useState<any | null>(null);
  const [studentFormTugas, setStudentFormTugas] = useState<string[]>(Array(10).fill(''));
  const [studentFormUh, setStudentFormUh] = useState<string[]>(Array(5).fill(''));
  const [studentFormSts, setStudentFormSts] = useState<string>('');
  const [studentFormSas, setStudentFormSas] = useState<string>('');
  const [studentFormDate, setStudentFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentFormNotes, setStudentFormNotes] = useState<string>('');
  const [studentFormSaving, setStudentFormSaving] = useState<boolean>(false);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [studentFormSuccess, setStudentFormSuccess] = useState<string | null>(null);

  // Open Full Student Score Form
  const handleOpenStudentScoreModal = (student: any) => {
    setStudentScoreModalStudent(student);
    setStudentFormError(null);
    setStudentFormSuccess(null);

    // Retrieve current student scores for selected subject, class, academicYear, semester
    const existingScores = scores.filter((s) => {
      if (s.studentId !== student.id) return false;
      if (selectedClassId && s.classId && s.classId.toLowerCase() !== selectedClassId.toLowerCase()) return false;
      if (selectedSubjectId && s.subjectId && s.subjectId.toLowerCase() !== selectedSubjectId.toLowerCase()) return false;
      if (activeAcademicYear) {
        const sYear = (s.academicYearId || '').toLowerCase();
        const activeId = activeAcademicYear.id.toLowerCase();
        const activeName = activeAcademicYear.name.toLowerCase();
        if (sYear && sYear !== activeId && sYear !== activeName) return false;
        if (s.semester && s.semester !== activeAcademicYear.semester) return false;
      }
      return true;
    });

    // Extract 10 Tugas
    const initialTugas: string[] = TUGAS_COLUMNS.map((col) => {
      const found = existingScores.find((s) => isExactScoreTypeMatch(s.type, col));
      if (found && found.value !== undefined && found.value !== null) {
        return String(found.value);
      }
      if (col === 'Tugas 1') {
        const legacy = existingScores.find(
          (s) => String(s.type).trim().toUpperCase() === 'TUGAS' || String(s.type).trim().toUpperCase() === 'PR'
        );
        if (legacy && legacy.value !== undefined && legacy.value !== null) {
          return String(legacy.value);
        }
      }
      return '';
    });

    // Extract 5 UH
    const initialUh: string[] = UH_COLUMNS.map((col) => {
      const found = existingScores.find((s) => isExactScoreTypeMatch(s.type, col));
      if (found && found.value !== undefined && found.value !== null) {
        return String(found.value);
      }
      if (col === 'UH 1') {
        const legacy = existingScores.find(
          (s) =>
            String(s.type).trim().toUpperCase() === 'UH' ||
            String(s.type).trim().toUpperCase() === 'PH' ||
            String(s.type).trim().toUpperCase() === 'ULANGAN HARIAN'
        );
        if (legacy && legacy.value !== undefined && legacy.value !== null) {
          return String(legacy.value);
        }
      }
      return '';
    });

    // Extract STS & SAS
    const stsFound = existingScores.find((s) => normalizeScoreType(s.type) === 'STS');
    const sasFound = existingScores.find((s) => normalizeScoreType(s.type) === 'SAS');

    setStudentFormTugas(initialTugas);
    setStudentFormUh(initialUh);
    setStudentFormSts(stsFound && stsFound.value !== undefined && stsFound.value !== null ? String(stsFound.value) : '');
    setStudentFormSas(sasFound && sasFound.value !== undefined && sasFound.value !== null ? String(sasFound.value) : '');
    setStudentFormDate(stsFound?.date || sasFound?.date || existingScores[0]?.date || new Date().toISOString().split('T')[0]);
    setStudentFormNotes(stsFound?.notes || sasFound?.notes || existingScores[0]?.notes || '');

    setStudentScoreModalOpen(true);
  };

  // Live calculation within Full Student Score Modal
  const liveCalc = useMemo(() => {
    const filledTugas = studentFormTugas
      .map((v) => (v.trim() === '' ? null : parseFloat(v.replace(',', '.'))))
      .filter((v): v is number => v !== null && !isNaN(v));
    const tugasCount = filledTugas.length;
    const tugasAvg =
      tugasCount > 0 ? Math.round((filledTugas.reduce((a, b) => a + b, 0) / tugasCount) * 10) / 10 : null;

    const filledUh = studentFormUh
      .map((v) => (v.trim() === '' ? null : parseFloat(v.replace(',', '.'))))
      .filter((v): v is number => v !== null && !isNaN(v));
    const uhCount = filledUh.length;
    const uhAvg =
      uhCount > 0 ? Math.round((filledUh.reduce((a, b) => a + b, 0) / uhCount) * 10) / 10 : null;

    const stsVal =
      studentFormSts.trim() === '' || isNaN(parseFloat(studentFormSts.replace(',', '.')))
        ? null
        : parseFloat(studentFormSts.replace(',', '.'));
    const sasVal =
      studentFormSas.trim() === '' || isNaN(parseFloat(studentFormSas.replace(',', '.')))
        ? null
        : parseFloat(studentFormSas.replace(',', '.'));

    const isComplete = tugasAvg !== null && uhAvg !== null && stsVal !== null && sasVal !== null;
    let finalScore: number | null = null;
    if (isComplete) {
      const raw = (tugasAvg * 0.15) + (uhAvg * 0.20) + (stsVal * 0.25) + (sasVal * 0.40);
      finalScore = Math.round(raw * 10) / 10;
    }

    const isPassing = finalScore !== null ? finalScore >= effectiveCurrentKkm : null;

    const missing: string[] = [];
    if (tugasAvg === null) missing.push('Tugas');
    if (uhAvg === null) missing.push('UH');
    if (stsVal === null) missing.push('STS');
    if (sasVal === null) missing.push('SAS');

    return {
      tugasCount,
      tugasAvg,
      uhCount,
      uhAvg,
      stsVal,
      sasVal,
      isComplete,
      finalScore,
      isPassing,
      missing
    };
  }, [studentFormTugas, studentFormUh, studentFormSts, studentFormSas, effectiveCurrentKkm]);

  // Handle Save All Student Scores
  const handleSaveStudentAllScores = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormError(null);
    setStudentFormSuccess(null);

    if (!studentScoreModalStudent || !selectedClassId || !selectedSubjectId || !activeAcademicYear) {
      setStudentFormError('Data siswa, kelas, atau mapel tidak valid.');
      return;
    }

    // Teacher authorization check
    if (isTeacher) {
      const authCheck = assertTeacherScoreAccess(
        currentUser || role,
        effectiveTeacherId,
        teacherAssignments,
        {
          teacherId: effectiveTeacherId || undefined,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          academicYearId: activeAcademicYear.id,
          semester: activeAcademicYear.semester
        },
        activeAcademicYear
      );
      if (!authCheck.allowed) {
        setStudentFormError(authCheck.reason || 'Akses Ditolak: Anda tidak memiliki penugasan mengajar aktif.');
        return;
      }
    }

    // Validate numeric range 0 - 100 for any filled fields
    const allEntries: { type: string; rawVal: string }[] = [
      ...studentFormTugas.map((val, idx) => ({ type: `Tugas ${idx + 1}`, rawVal: val })),
      ...studentFormUh.map((val, idx) => ({ type: `UH ${idx + 1}`, rawVal: val })),
      { type: 'STS', rawVal: studentFormSts },
      { type: 'SAS', rawVal: studentFormSas }
    ];

    for (const item of allEntries) {
      if (item.rawVal.trim() !== '') {
        const num = parseFloat(item.rawVal.replace(',', '.'));
        if (isNaN(num) || num < 0 || num > 100) {
          setStudentFormError(`Nilai ${item.type} tidak valid. Masukkan angka antara 0 sampai 100.`);
          return;
        }
      }
    }

    setStudentFormSaving(true);
    try {
      const targetDate = studentFormDate || new Date().toISOString().split('T')[0];
      const resolvedTeacherId =
        (isTeacher ? effectiveTeacherId : null) ||
        effectiveTeacherId ||
        currentUser?.teacherId ||
        't_003';

      // Find all existing scores for this student, class, subject, period
      const existingScores = scores.filter(
        (s) =>
          s.studentId === studentScoreModalStudent.id &&
          s.classId === selectedClassId &&
          s.subjectId === selectedSubjectId &&
          (s.academicYearId === activeAcademicYear.id || s.academicYearId === activeAcademicYear.name) &&
          (!s.semester || s.semester === activeAcademicYear.semester)
      );

      // Save each filled column; delete any cleared column
      for (const item of allEntries) {
        const existing = existingScores.find((s) => isExactScoreTypeMatch(s.type, item.type));
        if (item.rawVal.trim() !== '') {
          const numVal = Math.round(parseFloat(item.rawVal.replace(',', '.')) * 10) / 10;
          const cleanType = item.type.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const deterministicId = `sc_${activeAcademicYear.id}_${activeAcademicYear.semester}_${selectedClassId}_${selectedSubjectId}_${studentScoreModalStudent.id}_${cleanType}`;

          const scoreObj: Score = {
            id: existing ? existing.id : deterministicId,
            studentId: studentScoreModalStudent.id,
            teacherId: resolvedTeacherId,
            classId: selectedClassId,
            subjectId: selectedSubjectId,
            academicYearId: activeAcademicYear.id,
            semester: activeAcademicYear.semester,
            type: item.type,
            value: numVal,
            date: targetDate,
            notes: studentFormNotes.trim()
          };
          await saveScore(scoreObj);
        } else if (existing) {
          // If teacher intentionally emptied the input, remove that specific score record
          await deleteScore(existing.id);
        }
      }

      await refreshAll();
      setStudentFormSuccess('Seluruh nilai siswa berhasil disimpan ke sistem.');
      setTimeout(() => {
        setStudentScoreModalOpen(false);
        setStudentFormSuccess(null);
      }, 900);
    } catch (err: any) {
      console.error('Error saving student scores:', err);
      setStudentFormError(err.message || 'Gagal menyimpan nilai.');
    } finally {
      setStudentFormSaving(false);
    }
  };

  // =========================================================================
  // MODAL 2: SINGLE COMPONENT QUICK INPUT MODAL
  // =========================================================================
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    studentId: '',
    type: 'Tugas 1',
    value: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [actionNoticeError, setActionNoticeError] = useState<string | null>(null);
  const [actionNoticeSuccess, setActionNoticeSuccess] = useState<string | null>(null);
  const [scoreToDelete, setScoreToDelete] = useState<Score | null>(null);
  const [isDeleteScoreModalOpen, setIsDeleteScoreModalOpen] = useState<boolean>(false);
  const [deleteScoreError, setDeleteScoreError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Open Quick Input Modal
  const handleOpenInputModal = (targetStudentId?: string, targetType?: string) => {
    setFormError(null);
    setFormSuccess(null);

    if (isTeacher && !canEditScores) {
      setActionNoticeError('Akses Ditolak (403 Forbidden): Anda tidak memiliki wewenang penugasan mengajar aktif untuk kelas dan mata pelajaran ini.');
      setTimeout(() => setActionNoticeError(null), 5000);
      return;
    }

    const initialClassId = selectedClassId || availableClasses[0]?.id || '';
    const initialSubjectId = selectedSubjectId || availableSubjects[0]?.id || '';
    const studentToSelect =
      targetStudentId ||
      (classStudents.length > 0
        ? classStudents[0].id
        : students.find(
            (s) =>
              s.classId === initialClassId &&
              s.status === 'Aktif' &&
              (s as any).isActive !== false
          )?.id || '');
    const defaultType = targetType || 'Tugas 1';

    const existing = scores.find(
      (s) =>
        s.studentId === studentToSelect &&
        s.subjectId === initialSubjectId &&
        s.classId === initialClassId &&
        (s.academicYearId === activeAcademicYear?.id || s.academicYearId === activeAcademicYear?.name) &&
        (!s.semester || s.semester === activeAcademicYear?.semester) &&
        (s.type === defaultType || isExactScoreTypeMatch(s.type, defaultType))
    );

    setFormData({
      classId: initialClassId,
      subjectId: initialSubjectId,
      studentId: studentToSelect,
      type: defaultType,
      value: existing ? String(existing.value) : '',
      notes: existing?.notes || '',
      date: existing?.date || new Date().toISOString().split('T')[0]
    });

    setIsInputModalOpen(true);
  };

  const existingScoreInModal = useMemo(() => {
    if (!formData.studentId || !formData.subjectId || !formData.classId || !formData.type || !activeAcademicYear) {
      return null;
    }
    return (
      scores.find(
        (s) =>
          s.studentId === formData.studentId &&
          s.subjectId === formData.subjectId &&
          s.classId === formData.classId &&
          (s.academicYearId === activeAcademicYear.id || s.academicYearId === activeAcademicYear.name) &&
          (!s.semester || s.semester === activeAcademicYear.semester) &&
          (s.type === formData.type || isExactScoreTypeMatch(s.type, formData.type))
      ) || null
    );
  }, [formData.studentId, formData.subjectId, formData.classId, formData.type, activeAcademicYear, scores]);

  const modalAvailableClasses = useMemo(() => {
    if (!isAdmin && !isWaliKelas && isGuruMapel) {
      const assignedClassIds = new Set(
        activeTeacherAssignments
          .filter((a) => !formData.subjectId || a.subjectId === formData.subjectId)
          .map((a) => a.classId)
      );
      return classes.filter((c) => c.isActive !== false && assignedClassIds.has(c.id));
    }
    if (isWaliKelas) {
      const assignedClassIds = new Set(
        activeTeacherAssignments
          .filter((a) => !formData.subjectId || a.subjectId === formData.subjectId)
          .map((a) => a.classId)
      );
      const relevant = classes.filter(
        (c) =>
          c.isActive !== false &&
          (assignedClassIds.has(c.id) ||
            c.homeroomTeacherId === effectiveTeacherId ||
            c.teacherId === effectiveTeacherId)
      );
      return relevant.length > 0 ? relevant : classes.filter((c) => c.isActive !== false);
    }
    return classes.filter((c) => c.isActive !== false);
  }, [isAdmin, isWaliKelas, isGuruMapel, activeTeacherAssignments, formData.subjectId, classes, effectiveTeacherId]);

  useEffect(() => {
    if (modalAvailableClasses.length > 0 && !modalAvailableClasses.some((c) => c.id === formData.classId)) {
      setFormData((prev) => ({ ...prev, classId: modalAvailableClasses[0].id }));
    }
  }, [modalAvailableClasses, formData.classId]);

  const modalClassStudents = useMemo(() => {
    if (!formData.classId) return [];
    return students.filter(
      (s) =>
        s.classId === formData.classId &&
        s.status === 'Aktif' &&
        (s as any).isActive !== false
    );
  }, [students, formData.classId]);

  useEffect(() => {
    if (modalClassStudents.length > 0 && !modalClassStudents.some((s) => s.id === formData.studentId)) {
      setFormData((prev) => ({ ...prev, studentId: modalClassStudents[0].id }));
    }
  }, [modalClassStudents, formData.studentId]);

  // Handle Quick Form Submission
  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!activeAcademicYear) {
      setFormError('Tahun ajaran aktif belum ditentukan dalam sistem.');
      return;
    }

    if (!formData.classId || !formData.subjectId || !formData.studentId) {
      setFormError('Lengkapi pilihan Kelas, Mata Pelajaran, dan Siswa.');
      return;
    }

    const numericValue = parseFloat(formData.value.replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      setFormError('Nilai harus berupa angka valid antara 0 sampai 100.');
      return;
    }

    if (isTeacher) {
      const authCheck = assertTeacherScoreAccess(
        currentUser || role,
        effectiveTeacherId,
        teacherAssignments,
        {
          teacherId: effectiveTeacherId || undefined,
          classId: formData.classId,
          subjectId: formData.subjectId,
          academicYearId: activeAcademicYear.id,
          semester: activeAcademicYear.semester
        },
        activeAcademicYear
      );

      if (!authCheck.allowed) {
        setFormError(authCheck.reason || 'Akses Ditolak: Anda tidak memiliki penugasan mengajar aktif.');
        return;
      }

      const targetStudent = students.find((s) => s.id === formData.studentId);
      if (!targetStudent || targetStudent.classId !== formData.classId) {
        setFormError('Akses Ditolak: Siswa yang dipilih tidak terdaftar pada kelas penugasan Anda.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const targetDate = formData.date || new Date().toISOString().split('T')[0];

      const existingScore = scores.find(
        (s) =>
          s.studentId === formData.studentId &&
          s.subjectId === formData.subjectId &&
          s.classId === formData.classId &&
          (s.academicYearId === activeAcademicYear.id || s.academicYearId === activeAcademicYear.name) &&
          (!s.semester || s.semester === activeAcademicYear.semester) &&
          (s.type === formData.type || isExactScoreTypeMatch(s.type, formData.type))
      );

      const cleanStudentId = formData.studentId.trim();
      const cleanSubjectId = formData.subjectId.trim();
      const cleanType = formData.type.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const deterministicId = `sc_${activeAcademicYear.id}_${activeAcademicYear.semester}_${formData.classId}_${cleanSubjectId}_${cleanStudentId}_${cleanType}`;

      const resolvedTeacherId =
        (isTeacher ? effectiveTeacherId : null) ||
        existingScore?.teacherId ||
        effectiveTeacherId ||
        currentUser?.teacherId ||
        't_003';

      const scoreToSave: Score = {
        id: existingScore ? existingScore.id : deterministicId,
        studentId: cleanStudentId,
        teacherId: resolvedTeacherId,
        classId: formData.classId,
        subjectId: cleanSubjectId,
        academicYearId: activeAcademicYear.id,
        semester: activeAcademicYear.semester,
        type: formData.type,
        value: Math.round(numericValue * 10) / 10,
        notes: (formData.notes || '').trim(),
        date: targetDate
      };

      await saveScore(scoreToSave);
      await refreshAll();

      setFormSuccess(
        existingScore
          ? `Nilai ${formData.type} siswa berhasil diperbarui di database.`
          : `Nilai ${formData.type} siswa berhasil disimpan ke database.`
      );

      setFormData((prev) => ({
        ...prev,
        value: '',
        notes: ''
      }));

      setTimeout(() => {
        setIsInputModalOpen(false);
        setFormSuccess(null);
      }, 1000);
    } catch (err) {
      console.error('Error saving score:', err);
      setFormError('Gagal menyimpan nilai ke sistem. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // MODAL 3: RINCIAN NILAI SISWA (Detail Breakdown & Inline Edit)
  // =========================================================================
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [detailInputType, setDetailInputType] = useState<string>('Tugas 1');
  const [detailInputValue, setDetailInputValue] = useState<string>('');
  const [detailInputDate, setDetailInputDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [detailInputNotes, setDetailInputNotes] = useState<string>('');
  const [detailFormError, setDetailFormError] = useState<string | null>(null);
  const [detailFormSuccess, setDetailFormSuccess] = useState<string | null>(null);
  const [isDetailSubmitting, setIsDetailSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!detailStudentId || !selectedSubjectId || !selectedClassId || !activeAcademicYear) {
      setDetailInputValue('');
      setDetailInputNotes('');
      return;
    }

    const existing = scores.find(
      (s) =>
        s.studentId === detailStudentId &&
        s.subjectId === selectedSubjectId &&
        s.classId === selectedClassId &&
        (s.academicYearId === activeAcademicYear.id || s.academicYearId === activeAcademicYear.name) &&
        (!s.semester || s.semester === activeAcademicYear.semester) &&
        (s.type === detailInputType || isExactScoreTypeMatch(s.type, detailInputType))
    );

    if (existing) {
      setDetailInputValue(String(existing.value));
      setDetailInputNotes(existing.notes || '');
      setDetailInputDate(existing.date || new Date().toISOString().split('T')[0]);
    } else {
      setDetailInputValue('');
      setDetailInputNotes('');
      setDetailInputDate(new Date().toISOString().split('T')[0]);
    }
    setDetailFormError(null);
    setDetailFormSuccess(null);
  }, [detailStudentId, detailInputType, selectedSubjectId, selectedClassId, activeAcademicYear, scores]);

  const handleSaveDetailScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailFormError(null);
    setDetailFormSuccess(null);

    if (!canEditScores) {
      setDetailFormError('Akses Ditolak (403 Forbidden): Anda tidak memiliki penugasan mengajar aktif untuk kelas dan mata pelajaran ini.');
      return;
    }

    if (!selectedStudentForDetail || !selectedClassId || !selectedSubjectId || !activeAcademicYear) {
      setDetailFormError('Data siswa atau mata pelajaran tidak valid.');
      return;
    }

    const numericValue = parseFloat(detailInputValue.replace(',', '.'));
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      setDetailFormError('Nilai harus berupa angka valid antara 0 sampai 100.');
      return;
    }

    setIsDetailSubmitting(true);
    try {
      const targetDate = detailInputDate || new Date().toISOString().split('T')[0];

      const existingScore = scores.find(
        (s) =>
          s.studentId === selectedStudentForDetail.id &&
          s.subjectId === selectedSubjectId &&
          s.classId === selectedClassId &&
          (s.academicYearId === activeAcademicYear.id || s.academicYearId === activeAcademicYear.name) &&
          (!s.semester || s.semester === activeAcademicYear.semester) &&
          (s.type === detailInputType || isExactScoreTypeMatch(s.type, detailInputType))
      );

      const cleanStudentId = selectedStudentForDetail.id.trim();
      const cleanSubjectId = selectedSubjectId.trim();
      const cleanType = detailInputType.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const deterministicId = `sc_${activeAcademicYear.id}_${activeAcademicYear.semester}_${selectedClassId}_${cleanSubjectId}_${cleanStudentId}_${cleanType}`;

      const resolvedTeacherId =
        (isTeacher ? effectiveTeacherId : null) ||
        existingScore?.teacherId ||
        effectiveTeacherId ||
        currentUser?.teacherId ||
        't_003';

      const scoreToSave: Score = {
        id: existingScore ? existingScore.id : deterministicId,
        studentId: cleanStudentId,
        teacherId: resolvedTeacherId,
        classId: selectedClassId,
        subjectId: cleanSubjectId,
        academicYearId: activeAcademicYear.id,
        semester: activeAcademicYear.semester,
        type: detailInputType,
        value: Math.round(numericValue * 10) / 10,
        notes: (detailInputNotes || '').trim(),
        date: targetDate
      };

      await saveScore(scoreToSave);
      await refreshAll();

      setDetailFormSuccess(`Nilai ${detailInputType} berhasil disimpan.`);
      setTimeout(() => setDetailFormSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving detail score:', err);
      setDetailFormError(err.message || 'Gagal menyimpan nilai.');
    } finally {
      setIsDetailSubmitting(false);
    }
  };

  // =========================================================================
  // MODAL 4 & 5: EKSTRAKURIKULER
  // =========================================================================
  const [isEksInputModalOpen, setIsEksInputModalOpen] = useState<boolean>(false);
  const [eksDetailStudentId, setEksDetailStudentId] = useState<string | null>(null);
  const [eksFormData, setEksFormData] = useState({
    studentId: '',
    nilai: 'A',
    keterangan: 'Sangat Baik'
  });
  const [eksFormError, setEksFormError] = useState<string | null>(null);
  const [eksFormSuccess, setEksFormSuccess] = useState<string | null>(null);
  const [isEksSubmitting, setIsEksSubmitting] = useState<boolean>(false);

  const getStudentExtracurricularScore = (studentId: string): ExtracurricularScore | null => {
    if (!selectedExtracurricularId || !selectedClassId || !activeAcademicYear) return null;
    return (
      extracurricularScores.find(
        (s) =>
          s.studentId === studentId &&
          s.extracurricularId === selectedExtracurricularId &&
          s.classId === selectedClassId &&
          (s.academicYearId === activeAcademicYear.id || s.academicYearId === activeAcademicYear.name) &&
          (!s.semester || s.semester === activeAcademicYear.semester)
      ) || null
    );
  };

  const handleOpenEksInputModal = (targetStudentId?: string) => {
    setEksFormError(null);
    setEksFormSuccess(null);

    const studentToSelect = targetStudentId || extracurricularStudents[0]?.id || '';
    const existing = studentToSelect ? getStudentExtracurricularScore(studentToSelect) : null;

    setEksFormData({
      studentId: studentToSelect,
      nilai: existing?.nilai || 'A',
      keterangan: existing?.keterangan || DEFAULT_EKSKUL_KETERANGAN['A']
    });

    setIsEksInputModalOpen(true);
  };

  const handleEksStudentChangeInModal = (studentId: string) => {
    const existing = getStudentExtracurricularScore(studentId);
    setEksFormData({
      studentId,
      nilai: existing?.nilai || 'A',
      keterangan: existing?.keterangan || DEFAULT_EKSKUL_KETERANGAN['A']
    });
  };

  const handleEksGradeChangeInModal = (grade: string) => {
    setEksFormData((prev) => ({
      ...prev,
      nilai: grade,
      keterangan: DEFAULT_EKSKUL_KETERANGAN[grade] || prev.keterangan
    }));
  };

  const handleSaveEksScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setEksFormError(null);
    setEksFormSuccess(null);

    if (!activeAcademicYear || !selectedClassId || !selectedExtracurricularId) {
      setEksFormError('Tahun ajaran, kelas, atau kegiatan ekstrakurikuler tidak valid.');
      return;
    }

    if (!eksFormData.studentId) {
      setEksFormError('Pilih siswa peserta ekstrakurikuler terlebih dahulu.');
      return;
    }

    setIsEksSubmitting(true);
    try {
      const existing = getStudentExtracurricularScore(eksFormData.studentId);
      const deterministicId = `eks_${activeAcademicYear.id}_${activeAcademicYear.semester}_${selectedClassId}_${selectedExtracurricularId}_${eksFormData.studentId}`;

      const dataToSave: ExtracurricularScore = {
        id: existing ? existing.id : deterministicId,
        studentId: eksFormData.studentId,
        extracurricularId: selectedExtracurricularId,
        classId: selectedClassId,
        academicYearId: activeAcademicYear.id,
        semester: activeAcademicYear.semester,
        nilai: eksFormData.nilai as any,
        keterangan: eksFormData.keterangan.trim(),
        updatedAt: new Date().toISOString()
      };

      await saveExtracurricularScore(dataToSave);
      await refreshAll();

      setEksFormSuccess(existing ? 'Nilai ekstrakurikuler berhasil diperbarui.' : 'Nilai ekstrakurikuler berhasil disimpan.');
      setTimeout(() => {
        setIsEksInputModalOpen(false);
        setEksFormSuccess(null);
      }, 900);
    } catch (err: any) {
      console.error('Error saving ekskul score:', err);
      setEksFormError(err.message || 'Gagal menyimpan nilai ekstrakurikuler.');
    } finally {
      setIsEksSubmitting(false);
    }
  };

  const selectedStudentForEksDetail = useMemo(() => {
    if (!eksDetailStudentId) return null;
    return students.find((s) => s.id === eksDetailStudentId) || null;
  }, [students, eksDetailStudentId]);

  // =========================================================================
  // SCORE CALCULATION ENGINE PER STUDENT
  // =========================================================================
  const getStudentScoreSummary = (studentId: string) => {
    if (isTeacher && !isAuthorized && !isAdmin && !isWaliKelas) {
      return {
        tugas: null,
        uh: null,
        sts: null,
        sas: null,
        componentScores: {},
        average: null,
        formattedFinalScore: '-',
        isPassing: false,
        statusLabel: 'Ditolak',
        effectiveKkm: effectiveCurrentKkm,
        totalEntries: 0,
        scoresList: [],
        tugasList: Array(10).fill(null),
        tugasFilledCount: 0,
        tugasAverage: null,
        uhList: Array(5).fill(null),
        uhFilledCount: 0,
        uhAverage: null,
        stsScore: null,
        sasScore: null,
        tugasWeight: 15,
        uhWeight: 20,
        stsWeight: 25,
        sasWeight: 40,
        isComplete: false,
        completenessStatus: 'Belum Lengkap' as const,
        missingComponents: ['Akses Ditolak']
      };
    }

    const studentScores = scores.filter((s) => {
      if (s.studentId !== studentId) return false;

      if (selectedClassId && s.classId) {
        if (s.classId.trim().toLowerCase() !== selectedClassId.trim().toLowerCase()) return false;
      }

      if (selectedSubjectId && s.subjectId) {
        if (s.subjectId.trim().toLowerCase() !== selectedSubjectId.trim().toLowerCase()) return false;
      }

      if (activeAcademicYear) {
        const sYear = (s.academicYearId || '').trim().toLowerCase();
        const activeId = activeAcademicYear.id.trim().toLowerCase();
        const activeName = activeAcademicYear.name.trim().toLowerCase();
        const sDigits = sYear.replace(/\D/g, '');
        const aDigits = activeName.replace(/\D/g, '');

        const yearMatches =
          !s.academicYearId ||
          sYear === activeId ||
          sYear === activeName ||
          (sDigits.length >= 4 && aDigits.length >= 4 && sDigits.startsWith(aDigits));

        if (!yearMatches) return false;

        if (s.semester && activeAcademicYear.semester) {
          const sSem = s.semester.trim().toLowerCase();
          const aSem = activeAcademicYear.semester.trim().toLowerCase();
          const semMatches =
            sSem === aSem ||
            ((sSem === '1' || sSem === 'ganjil') && (aSem === '1' || aSem === 'ganjil')) ||
            ((sSem === '2' || sSem === 'genap') && (aSem === '2' || aSem === 'genap'));

          if (!semMatches) return false;
        }
      }

      return true;
    });

    const calculated = calculateStudentScore(
      currentAcademicSetting,
      studentScores,
      effectiveCurrentKkm,
      selectedSubjectId
    );

    return {
      tugas: calculated.componentScores['Tugas'] ?? null,
      uh: calculated.componentScores['UH'] ?? null,
      sts: calculated.componentScores['STS'] ?? null,
      sas: calculated.componentScores['SAS'] ?? null,
      componentScores: calculated.componentScores,
      average: calculated.finalScore,
      formattedFinalScore: calculated.formattedFinalScore,
      isPassing: calculated.isPassing,
      statusLabel: calculated.statusLabel,
      effectiveKkm: calculated.effectiveKkm,
      totalEntries: calculated.totalEntries,
      scoresList: calculated.scoresList,
      tugasList: calculated.tugasList,
      tugasFilledCount: calculated.tugasFilledCount,
      tugasAverage: calculated.tugasAverage,
      uhList: calculated.uhList,
      uhFilledCount: calculated.uhFilledCount,
      uhAverage: calculated.uhAverage,
      stsScore: calculated.stsScore,
      sasScore: calculated.sasScore,
      tugasWeight: calculated.tugasWeight,
      uhWeight: calculated.uhWeight,
      stsWeight: calculated.stsWeight,
      sasWeight: calculated.sasWeight,
      isComplete: calculated.isComplete,
      completenessStatus: calculated.completenessStatus,
      missingComponents: calculated.missingComponents
    };
  };

  const selectedStudentForDetail = useMemo(() => {
    if (!detailStudentId) return null;
    const st = students.find((s) => s.id === detailStudentId) || null;
    if (!st) return null;
    if (!isAdmin && !isWaliKelas && isGuruMapel) {
      if (!isAuthorized || st.classId !== selectedClassId) {
        return null;
      }
    }
    return st;
  }, [students, detailStudentId, role, isAuthorized, selectedClassId]);

  // Secure Score Deletion Handler
  const handleDeleteScore = (score: Score) => {
    setScoreToDelete(score);
    setDeleteScoreError(null);
    setIsDeleteScoreModalOpen(true);
  };

  const handleConfirmDeleteScore = async () => {
    if (!scoreToDelete) return;
    setDeleteScoreError(null);
    try {
      if (isTeacher) {
        const authCheck = assertTeacherScoreAccess(
          currentUser || role,
          effectiveTeacherId,
          teacherAssignments,
          scoreToDelete,
          activeAcademicYear
        );
        if (!authCheck.allowed) {
          setDeleteScoreError(authCheck.reason || 'Akses Ditolak: Anda tidak diizinkan menghapus nilai ini.');
          return;
        }
      }
      await deleteScore(scoreToDelete.id);
      await refreshAll();
      setIsDeleteScoreModalOpen(false);
      setScoreToDelete(null);
      setActionNoticeSuccess('Data nilai berhasil dihapus dari sistem.');
      setTimeout(() => setActionNoticeSuccess(null), 4000);
    } catch (err: any) {
      console.error('Delete score error:', err);
      setDeleteScoreError(err.message || 'Gagal menghapus nilai.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Nilai Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Buku nilai: 10 Tugas (15%) • 5 UH (20%) • STS (25%) • SAS (40%). Kolom kosong tidak dianggap 0.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>Tahun Ajaran:</span>
            <strong className="text-slate-900 font-semibold">
              {activeAcademicYear ? `${activeAcademicYear.name} - ${activeAcademicYear.semester}` : 'Belum Ada'}
            </strong>
          </div>

          {assessmentType === 'subject' ? (
            (canEditScores || isAdmin) && (
              <button
                id="btn-input-nilai-baru"
                onClick={() => {
                  if (classStudents.length > 0) {
                    handleOpenStudentScoreModal(classStudents[0]);
                  } else {
                    handleOpenInputModal();
                  }
                }}
                disabled={isTeacher && (availableSubjects.length === 0 || !canEditScores)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition shadow-xs cursor-pointer ${
                  isTeacher && (availableSubjects.length === 0 || !canEditScores)
                    ? 'bg-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                + Input Nilai Siswa
              </button>
            )
          ) : (
            canEditExtracurricularScores && (
              <button
                id="btn-input-nilai-ekskul"
                onClick={() => handleOpenEksInputModal()}
                disabled={extracurricularStudents.length === 0}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition shadow-xs cursor-pointer ${
                  extracurricularStudents.length === 0
                    ? 'bg-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                + Input Nilai
              </button>
            )
          )}
        </div>
      </div>

      {/* Action Notification Banners */}
      {actionNoticeSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{actionNoticeSuccess}</span>
          </div>
          <button
            onClick={() => setActionNoticeSuccess(null)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionNoticeError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{actionNoticeError}</span>
          </div>
          <button
            onClick={() => setActionNoticeError(null)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Filter and Assessment Settings Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            KELAS
          </label>
          <select
            id="select-filter-class"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={availableClasses.length <= 1 && isTeacher && !isAdmin && !isWaliKelas}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-80"
          >
            {availableClasses.length === 0 ? (
              <option value="">Tidak ada kelas ditugaskan</option>
            ) : (
              availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            JENIS PENILAIAN
          </label>
          <select
            id="select-filter-assessment-type"
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value as 'subject' | 'extracurricular')}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
          >
            <option value="subject">Mata Pelajaran (Akademik)</option>
            <option value="extracurricular">Ekstrakurikuler</option>
          </select>
        </div>

        {assessmentType === 'subject' ? (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              MATA PELAJARAN
            </label>
            <select
              id="select-filter-subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={availableSubjects.length <= 1 && isTeacher}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-80"
            >
              {availableSubjects.length === 0 ? (
                <option value="">Tidak ada mata pelajaran ditugaskan</option>
              ) : (
                availableSubjects.map((s) => {
                  const effKkm = currentAcademicSetting.subjectKkmOverrides?.[s.id] ?? s.kkm;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} (KKM: {effKkm})
                    </option>
                  );
                })
              )}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              EKSTRAKURIKULER
            </label>
            <select
              id="select-filter-extracurricular"
              value={selectedExtracurricularId}
              onChange={(e) => setSelectedExtracurricularId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-purple-200 bg-purple-50/40 text-purple-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
            >
              {availableExtracurriculars.length === 0 ? (
                <option value="">Belum ada ekstrakurikuler aktif</option>
              ) : (
                availableExtracurriculars.map((eks) => (
                  <option key={eks.id} value={eks.id}>
                    {eks.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {assessmentType === 'subject' && currentSubject && (
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>KKM Mapel:</span>
              <strong className="text-slate-900 font-bold">{effectiveCurrentKkm}</strong>
            </div>

            {/* Toggle View Switcher: 10 Tugas & 5 UH vs Ringkas */}
            <button
              type="button"
              onClick={() => setShowAllColumns(!showAllColumns)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1.5 cursor-pointer ${
                showAllColumns
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Ganti tampilan antara semua 10 kolom tugas & 5 UH atau mode ringkas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{showAllColumns ? 'Tampil 10 Tugas & 5 UH' : 'Tampilan Ringkas'}</span>
            </button>
          </div>
        )}

        {assessmentType === 'extracurricular' && currentExtracurricular && (
          <div className="ml-auto flex items-center gap-2 text-xs text-purple-800 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Peserta {currentExtracurricular.name}:</span>
            <strong className="text-purple-950 font-bold">{extracurricularStudents.length} Siswa</strong>
          </div>
        )}
      </div>

      {/* Formula & Rule Guidance Banner */}
      {assessmentType === 'subject' && (
        <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 p-3 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-900">Formula Penilaian Berbobot:</span>{' '}
              <span className="font-mono text-[11px] text-indigo-900">
                Nilai Akhir = (Rata Tugas × 15%) + (Rata UH × 20%) + (STS × 25%) + (SAS × 40%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Tugas 1–10 (15%)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              UH 1–5 (20%)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              STS (25%)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              SAS (40%)
            </span>
          </div>
        </div>
      )}

      {/* Relational Scores Table (Academic vs Extracurricular) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {assessmentType === 'extracurricular' ? (
          availableExtracurriculars.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada kegiatan ekstrakurikuler aktif. Silakan tambahkan pada menu Mata Pelajaran &amp; Ekstrakurikuler.
            </div>
          ) : extracurricularStudents.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Belum Ada Peserta {currentExtracurricular?.name || 'Ekstrakurikuler'} di Kelas {currentClass?.name || ''}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Hanya siswa yang terdaftar sebagai peserta yang ditampilkan. Silakan pilih peserta terlebih dahulu melalui menu <strong>Mata Pelajaran &rarr; Ekstrakurikuler &rarr; Peserta</strong>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">NIS</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4 text-center">Nilai</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extracurricularStudents.map((st) => {
                    const eksScore = getStudentExtracurricularScore(st.id);
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-slate-500">{st.nis}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {st.name}
                          {st.gender && (
                            <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                              ({st.gender})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {eksScore ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {eksScore.nilai}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {eksScore?.keterangan ? (
                            <span className="font-medium text-slate-800">{eksScore.keterangan}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEditExtracurricularScores && (
                              <button
                                id={`btn-eks-score-${st.id}`}
                                onClick={() => handleOpenEksInputModal(st.id)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition inline-flex items-center gap-1 cursor-pointer ${
                                  eksScore
                                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                    : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                                }`}
                              >
                                {eksScore ? (
                                  <>
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit Nilai</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>+ Input Nilai</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              id={`btn-eks-detail-${st.id}`}
                              onClick={() => setEksDetailStudentId(st.id)}
                              className="px-2 py-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Rincian</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : !isAdmin && !isWaliKelas && isGuruMapel && !canEditScores ? (
          <div className="p-10 text-center bg-rose-50/60 border border-rose-200/80 m-4 rounded-xl">
            <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-rose-900">AKSES DITOLAK (403 FORBIDDEN)</h4>
            <p className="text-xs text-rose-700 mt-1 max-w-lg mx-auto leading-relaxed">
              Anda tidak memiliki wewenang penugasan mengajar aktif untuk kelas ({currentClass?.name || selectedClassId}) dan mata pelajaran ({currentSubject?.name || selectedSubjectId}) pada periode akademik berjalan.
            </p>
            <p className="text-[11px] text-rose-500 mt-2 font-mono">
              Guru: {effectiveTeacherId || 'N/A'} • Status Akses: DIBLOKIR SISTEM
            </p>
          </div>
        ) : availableSubjects.length === 0 && isTeacher ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">Tidak Ada Penugasan Mengajar Aktif</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Akun Anda belum memiliki penugasan guru aktif untuk periode akademik{' '}
              {activeAcademicYear?.name || 'berjalan'}.
            </p>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Tidak ada data siswa aktif pada kelas ini.
          </div>
        ) : (
          <div>
            {/* Desktop Table: Responsive horizontal scroll with 10 Tugas & 5 UH */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-3 px-3 text-center sticky left-0 bg-slate-50 z-10 w-16">NIS</th>
                    <th className="py-3 px-4 text-left sticky left-16 bg-slate-50 z-10 min-w-[170px]">Nama Siswa</th>

                    {/* 10 Kolom Tugas */}
                    {showAllColumns &&
                      TUGAS_COLUMNS.map((col, idx) => (
                        <th
                          key={col}
                          className="py-2.5 px-1.5 text-center min-w-[50px] bg-indigo-50/40 text-indigo-900 border-l border-indigo-100/60"
                          title={`Nilai ${col}`}
                        >
                          <span className="text-[11px] font-bold">T{idx + 1}</span>
                          <span className="block text-[8px] font-normal text-indigo-600/70">Tugas {idx + 1}</span>
                        </th>
                      ))}

                    {/* Rata-Rata Tugas (15%) */}
                    <th className="py-2.5 px-2.5 text-center min-w-[85px] bg-indigo-100/70 text-indigo-950 font-bold border-r border-indigo-200">
                      <span className="text-[11px] block">Rata Tugas</span>
                      <span className="text-[9px] font-semibold text-indigo-700 bg-white/80 px-1 py-0.2 rounded">15%</span>
                    </th>

                    {/* 5 Kolom UH */}
                    {showAllColumns &&
                      UH_COLUMNS.map((col, idx) => (
                        <th
                          key={col}
                          className="py-2.5 px-1.5 text-center min-w-[50px] bg-emerald-50/40 text-emerald-900 border-l border-emerald-100/60"
                          title={`Nilai ${col}`}
                        >
                          <span className="text-[11px] font-bold">UH{idx + 1}</span>
                          <span className="block text-[8px] font-normal text-emerald-600/70">Harian {idx + 1}</span>
                        </th>
                      ))}

                    {/* Rata-Rata UH (20%) */}
                    <th className="py-2.5 px-2.5 text-center min-w-[85px] bg-emerald-100/70 text-emerald-950 font-bold border-r border-emerald-200">
                      <span className="text-[11px] block">Rata UH</span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-white/80 px-1 py-0.2 rounded">20%</span>
                    </th>

                    {/* STS (25%) */}
                    <th className="py-2.5 px-2.5 text-center min-w-[70px] bg-amber-50/60 text-amber-950 font-bold border-r border-amber-200">
                      <span className="text-[11px] block">STS</span>
                      <span className="text-[9px] font-semibold text-amber-700 bg-white/80 px-1 py-0.2 rounded">25%</span>
                    </th>

                    {/* SAS (40%) */}
                    <th className="py-2.5 px-2.5 text-center min-w-[70px] bg-purple-50/60 text-purple-950 font-bold border-r border-purple-200">
                      <span className="text-[11px] block">SAS</span>
                      <span className="text-[9px] font-semibold text-purple-700 bg-white/80 px-1 py-0.2 rounded">40%</span>
                    </th>

                    {/* Nilai Akhir */}
                    <th className="py-2.5 px-2.5 text-center min-w-[90px] bg-slate-100 text-slate-900 font-bold">
                      <span className="text-[11px] block">Nilai Akhir</span>
                      <span className="text-[9px] font-normal text-slate-500">100%</span>
                    </th>

                    {/* Status */}
                    <th className="py-2.5 px-3 text-center min-w-[110px]">Status</th>

                    {/* Aksi */}
                    <th className="py-2.5 px-3 text-center min-w-[140px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const summary = getStudentScoreSummary(st.id);

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-center sticky left-0 bg-white">{st.nis}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 sticky left-16 bg-white">
                          {st.name}
                          {st.gender && (
                            <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                              ({st.gender})
                            </span>
                          )}
                        </td>

                        {/* 10 Tugas Cells */}
                        {showAllColumns &&
                          summary.tugasList.map((val, idx) => (
                            <td key={`t_${idx}`} className="py-2.5 px-1.5 text-center font-medium text-slate-800 bg-indigo-50/15 border-l border-slate-100">
                              {val !== null && val !== undefined ? (
                                <span className="font-semibold text-slate-900">{val}</span>
                              ) : (
                                <span className="text-slate-300 font-light" title="Belum diisi">-</span>
                              )}
                            </td>
                          ))}

                        {/* Rata-Rata Tugas Cell */}
                        <td className="py-2.5 px-2.5 text-center font-bold bg-indigo-50/40 border-r border-indigo-100">
                          {summary.tugasAverage !== null ? (
                            <span
                              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-indigo-700 bg-indigo-100/70 text-[11px] font-bold"
                              title={`Rata-rata dari ${summary.tugasFilledCount} tugas yang terisi`}
                            >
                              {summary.tugasAverage}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal" title="Belum ada nilai tugas terisi">-</span>
                          )}
                        </td>

                        {/* 5 UH Cells */}
                        {showAllColumns &&
                          summary.uhList.map((val, idx) => (
                            <td key={`uh_${idx}`} className="py-2.5 px-1.5 text-center font-medium text-slate-800 bg-emerald-50/15 border-l border-slate-100">
                              {val !== null && val !== undefined ? (
                                <span className="font-semibold text-slate-900">{val}</span>
                              ) : (
                                <span className="text-slate-300 font-light" title="Belum diisi">-</span>
                              )}
                            </td>
                          ))}

                        {/* Rata-Rata UH Cell */}
                        <td className="py-2.5 px-2.5 text-center font-bold bg-emerald-50/40 border-r border-emerald-100">
                          {summary.uhAverage !== null ? (
                            <span
                              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100/70 text-[11px] font-bold"
                              title={`Rata-rata dari ${summary.uhFilledCount} UH yang terisi`}
                            >
                              {summary.uhAverage}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal" title="Belum ada nilai UH terisi">-</span>
                          )}
                        </td>

                        {/* STS Cell */}
                        <td className="py-2.5 px-2.5 text-center font-medium bg-amber-50/25 border-r border-amber-100">
                          {summary.stsScore !== null ? (
                            <span className="font-semibold text-amber-900">{summary.stsScore}</span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* SAS Cell */}
                        <td className="py-2.5 px-2.5 text-center font-medium bg-purple-50/25 border-r border-purple-100">
                          {summary.sasScore !== null ? (
                            <span className="font-semibold text-purple-900">{summary.sasScore}</span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* Nilai Akhir Cell */}
                        <td className="py-2.5 px-2.5 text-center font-bold">
                          {summary.average !== null ? (
                            <span className={summary.isPassing ? 'text-emerald-600 font-bold text-sm' : 'text-rose-600 font-bold text-sm'}>
                              {summary.formattedFinalScore ?? summary.average}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">-</span>
                          )}
                        </td>

                        {/* Status Ketuntasan & Kelengkapan Cell */}
                        <td className="py-2.5 px-3 text-center">
                          {summary.isComplete ? (
                            summary.isPassing ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Tuntas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                Remedial
                              </span>
                            )
                          ) : summary.totalEntries === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                              Belum Dinilai
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                              title={`Belum lengkap: belum ada nilai ${summary.missingComponents.join(', ')}`}
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Belum Lengkap
                            </span>
                          )}
                        </td>

                        {/* Aksi Cell */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEditScores && (
                              <button
                                id={`btn-input-score-${st.id}`}
                                onClick={() => handleOpenStudentScoreModal(st)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                                title="Input atau ubah 10 Tugas, 5 UH, STS, & SAS"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Nilai</span>
                              </button>
                            )}
                            <button
                              id={`btn-detail-${st.id}`}
                              onClick={() => {
                                setDetailStudentId(st.id);
                                setDetailFormError(null);
                                setDetailFormSuccess(null);
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Rincian</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / HP Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {classStudents.map((st) => {
                const summary = getStudentScoreSummary(st.id);
                const isExpanded = mobileExpandedStudentId === st.id;

                return (
                  <div key={`m_${st.id}`} className="p-3.5 space-y-2.5 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{st.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">NIS: {st.nis}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">Nilai Akhir</div>
                        <div
                          className={`text-sm font-extrabold ${
                            summary.average !== null
                              ? summary.isPassing
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {summary.average !== null ? summary.formattedFinalScore : '-'}
                        </div>
                      </div>
                    </div>

                    {/* 4 Komponen Utama Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                      <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                        <span className="text-slate-500 block text-[9px]">Rata Tugas</span>
                        <strong className="text-indigo-900 font-bold">{summary.tugasAverage !== null ? summary.tugasAverage : '-'}</strong>
                        <span className="block text-[8px] text-indigo-600">({summary.tugasFilledCount}/10)</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                        <span className="text-slate-500 block text-[9px]">Rata UH</span>
                        <strong className="text-emerald-900 font-bold">{summary.uhAverage !== null ? summary.uhAverage : '-'}</strong>
                        <span className="block text-[8px] text-emerald-600">({summary.uhFilledCount}/5)</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                        <span className="text-slate-500 block text-[9px]">STS</span>
                        <strong className="text-amber-900 font-bold">{summary.stsScore !== null ? summary.stsScore : '-'}</strong>
                        <span className="block text-[8px] text-amber-600">25%</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-100">
                        <span className="text-slate-500 block text-[9px]">SAS</span>
                        <strong className="text-purple-900 font-bold">{summary.sasScore !== null ? summary.sasScore : '-'}</strong>
                        <span className="block text-[8px] text-purple-600">40%</span>
                      </div>
                    </div>

                    {/* Accordion Toggle for 10 Tugas & 5 UH */}
                    <button
                      type="button"
                      onClick={() => setMobileExpandedStudentId(isExpanded ? null : st.id)}
                      className="w-full text-center py-1.5 text-[11px] text-slate-600 hover:text-indigo-600 font-medium inline-flex items-center justify-center gap-1 cursor-pointer bg-slate-50 rounded-lg border border-slate-200/60"
                    >
                      <span>{isExpanded ? 'Tutup Rincian Tugas & UH' : 'Lihat 10 Tugas & 5 UH'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="p-2.5 bg-slate-50 rounded-xl space-y-2.5 border border-slate-200/80 text-[10px]">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-indigo-900">Nilai Tugas (1 - 10):</span>
                            <span className="text-indigo-700 font-semibold">{summary.tugasFilledCount} terisi &bull; Rata: {summary.tugasAverage ?? '-'}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1 text-center">
                            {summary.tugasList.map((val, idx) => (
                              <div key={idx} className="bg-white p-1 rounded border border-indigo-100">
                                <span className="text-[8px] text-slate-400 block font-semibold">T{idx + 1}</span>
                                <strong className={val !== null ? 'text-slate-800' : 'text-slate-300 font-normal'}>
                                  {val !== null ? val : '-'}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-emerald-900">Ulangan Harian (1 - 5):</span>
                            <span className="text-emerald-700 font-semibold">{summary.uhFilledCount} terisi &bull; Rata: {summary.uhAverage ?? '-'}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1 text-center">
                            {summary.uhList.map((val, idx) => (
                              <div key={idx} className="bg-white p-1 rounded border border-emerald-100">
                                <span className="text-[8px] text-slate-400 block font-semibold">UH{idx + 1}</span>
                                <strong className={val !== null ? 'text-slate-800' : 'text-slate-300 font-normal'}>
                                  {val !== null ? val : '-'}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {summary.isComplete ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Lengkap ({summary.isPassing ? 'Tuntas' : 'Remedial'})
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {summary.totalEntries === 0 ? 'Belum Dinilai' : 'Belum Lengkap'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {canEditScores && (
                          <button
                            onClick={() => handleOpenStudentScoreModal(st)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Nilai</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDetailStudentId(st.id);
                            setDetailFormError(null);
                            setDetailFormSuccess(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Rincian</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULIR INPUT / EDIT NILAI LENGKAP SISWA (10 Tugas + 5 UH + STS + SAS) */}
      {/* ========================================================================= */}
      {studentScoreModalOpen && studentScoreModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            id="modal-student-all-scores"
            className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <span>Input &amp; Edit Nilai Siswa</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <strong>{studentScoreModalStudent.name}</strong> (NIS: {studentScoreModalStudent.nis}) • Kelas {currentClass?.name} • Mapel: {currentSubject?.name} (KKM: {effectiveCurrentKkm})
                </p>
              </div>
              <button
                onClick={() => setStudentScoreModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveStudentAllScores} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Guidance Notice */}
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Ketentuan Input Nilai:</strong> Guru bebas mengisi kolom yang diperlukan saja (tidak wajib semua). Kolom yang dibiarkan kosong <strong>bukan nilai 0</strong> dan tidak masuk dalam pembagi rata-rata. Nilai 0 yang sengaja diisi sah sebagai nilai 0.
                </div>
              </div>

              {studentFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{studentFormError}</span>
                </div>
              )}

              {studentFormSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{studentFormSuccess}</span>
                </div>
              )}

              {/* SECTION 1: 10 TUGAS (Bobot 15%) */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                      Nilai Tugas (Tugas 1 s.d. 10)
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-100 text-indigo-800">
                      Bobot: 15%
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-indigo-900">
                    Terisi: <strong className="text-indigo-700">{liveCalc.tugasCount}</strong> / 10 &bull; Rata-rata:{' '}
                    <strong className="text-indigo-700 font-mono text-sm">
                      {liveCalc.tugasAvg !== null ? liveCalc.tugasAvg : '-'}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {TUGAS_COLUMNS.map((col, idx) => (
                    <div key={col} className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span>{col}</span>
                        <span className="text-[9px] text-slate-400 font-normal">0-100</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="Kosong (-)"
                        value={studentFormTugas[idx]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStudentFormTugas((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-xl border font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                          studentFormTugas[idx].trim() !== ''
                            ? 'bg-white border-indigo-300 text-indigo-900 font-bold'
                            : 'bg-white/80 border-slate-200 text-slate-700 placeholder:text-slate-300'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: 5 ULANGAN HARIAN (Bobot 20%) */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                      Ulangan Harian (UH 1 s.d. 5)
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800">
                      Bobot: 20%
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-900">
                    Terisi: <strong className="text-emerald-700">{liveCalc.uhCount}</strong> / 5 &bull; Rata-rata:{' '}
                    <strong className="text-emerald-700 font-mono text-sm">
                      {liveCalc.uhAvg !== null ? liveCalc.uhAvg : '-'}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {UH_COLUMNS.map((col, idx) => (
                    <div key={col} className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span>{col}</span>
                        <span className="text-[9px] text-slate-400 font-normal">0-100</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="Kosong (-)"
                        value={studentFormUh[idx]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStudentFormUh((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-xl border font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                          studentFormUh[idx].trim() !== ''
                            ? 'bg-white border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-white/80 border-slate-200 text-slate-700 placeholder:text-slate-300'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: STS (25%) & SAS (40%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* STS */}
                <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                      Sumatif Tengah Semester (STS)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-800">
                      Bobot: 25%
                    </span>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="Nilai STS (contoh: 80)"
                      value={studentFormSts}
                      onChange={(e) => setStudentFormSts(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-600 ${
                        studentFormSts.trim() !== ''
                          ? 'bg-white border-amber-300 text-amber-950 text-sm'
                          : 'bg-white/90 border-slate-200 text-slate-700 placeholder:text-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* SAS */}
                <div className="p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-950 uppercase tracking-wider">
                      Sumatif Akhir Semester (SAS)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-purple-100 text-purple-800">
                      Bobot: 40%
                    </span>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="Nilai SAS (contoh: 85)"
                      value={studentFormSas}
                      onChange={(e) => setStudentFormSas(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                        studentFormSas.trim() !== ''
                          ? 'bg-white border-purple-300 text-purple-950 text-sm'
                          : 'bg-white/90 border-slate-200 text-slate-700 placeholder:text-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: REAL-TIME AUDIT CALCULATION PREVIEW */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                    Kalkulasi Nilai Akhir (Live Preview):
                  </span>
                  <div>
                    {liveCalc.isComplete ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Status: Lengkap ({liveCalc.isPassing ? 'Tuntas' : 'Remedial'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Status: Belum Lengkap (Kurang: {liveCalc.missing.join(', ')})
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Rata Tugas (15%)</span>
                    <strong className="text-indigo-300 text-sm">
                      {liveCalc.tugasAvg !== null ? liveCalc.tugasAvg : '-'}
                    </strong>
                    <span className="block text-[9px] text-slate-400">
                      {liveCalc.tugasAvg !== null ? `+${(liveCalc.tugasAvg * 0.15).toFixed(2)}` : '0 poin'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Rata UH (20%)</span>
                    <strong className="text-emerald-300 text-sm">
                      {liveCalc.uhAvg !== null ? liveCalc.uhAvg : '-'}
                    </strong>
                    <span className="block text-[9px] text-slate-400">
                      {liveCalc.uhAvg !== null ? `+${(liveCalc.uhAvg * 0.20).toFixed(2)}` : '0 poin'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">STS (25%)</span>
                    <strong className="text-amber-300 text-sm">
                      {liveCalc.stsVal !== null ? liveCalc.stsVal : '-'}
                    </strong>
                    <span className="block text-[9px] text-slate-400">
                      {liveCalc.stsVal !== null ? `+${(liveCalc.stsVal * 0.25).toFixed(2)}` : '0 poin'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">SAS (40%)</span>
                    <strong className="text-purple-300 text-sm">
                      {liveCalc.sasVal !== null ? liveCalc.sasVal : '-'}
                    </strong>
                    <span className="block text-[9px] text-slate-400">
                      {liveCalc.sasVal !== null ? `+${(liveCalc.sasVal * 0.40).toFixed(2)}` : '0 poin'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                  <span className="text-slate-300 font-medium">Prediksi Nilai Akhir:</span>
                  <span className="text-base font-extrabold text-white">
                    {liveCalc.finalScore !== null ? (
                      <span className={liveCalc.isPassing ? 'text-emerald-400' : 'text-rose-400'}>
                        {liveCalc.finalScore} {liveCalc.isPassing ? '(Tuntas)' : '(Perlu Remedial)'}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">- (Menunggu kelengkapan seluruh komponen)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Tanggal & Catatan Umum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tanggal Penilaian
                  </label>
                  <input
                    type="date"
                    value={studentFormDate}
                    onChange={(e) => setStudentFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Catatan Penilaian (Opsional)
                  </label>
                  <input
                    type="text"
                    value={studentFormNotes}
                    onChange={(e) => setStudentFormNotes(e.target.value)}
                    placeholder="Contoh: Penilaian Pembelajaran Semester Ganjil"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setStudentScoreModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={studentFormSaving}
                  className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer font-medium"
                >
                  {studentFormSaving ? 'Menyimpan Semua Nilai...' : 'Simpan Semua Nilai Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK INPUT SINGLE COMPONENT */}
      {/* ========================================================================= */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            id="modal-input-nilai-komponen"
            className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {existingScoreInModal ? 'Edit Nilai Komponen' : 'Input Nilai Komponen'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input cepat per kolom untuk satu siswa
                </p>
              </div>
              <button
                onClick={() => setIsInputModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScore} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Grid: Kelas & Mata Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="form-select-class"
                    value={formData.classId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                    disabled={modalAvailableClasses.length <= 1 && !isAdmin && !isWaliKelas && isGuruMapel}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100"
                    required
                  >
                    {modalAvailableClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="form-select-subject"
                    value={formData.subjectId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subjectId: e.target.value }))}
                    disabled={availableSubjects.length <= 1 && !isAdmin && !isWaliKelas && isGuruMapel}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100"
                    required
                  >
                    {availableSubjects.map((s) => {
                      const effKkm = currentAcademicSetting.subjectKkmOverrides?.[s.id] ?? s.kkm;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} (KKM: {effKkm})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Pilih Siswa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Siswa <span className="text-rose-500">*</span>
                </label>
                <select
                  id="form-select-student"
                  value={formData.studentId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  required
                >
                  {modalClassStudents.length === 0 ? (
                    <option value="">Tidak ada siswa di kelas ini</option>
                  ) : (
                    modalClassStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nis} - {st.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Grid: Jenis Penilaian & Nilai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jenis Nilai <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="form-select-type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                    required
                  >
                    <optgroup label="Tugas (Bobot 15%)">
                      {TUGAS_COLUMNS.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Ulangan Harian (Bobot 20%)">
                      {UH_COLUMNS.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Ujian Sumatif">
                      <option value="STS">STS - Sumatif Tengah Semester (25%)</option>
                      <option value="SAS">SAS - Sumatif Akhir Semester (40%)</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nilai (0 - 100) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-input-value"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder="Contoh: 85 (0 sah)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Tanggal & Keterangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tanggal Penilaian
                  </label>
                  <input
                    id="form-input-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Keterangan (Opsional)
                  </label>
                  <input
                    id="form-input-notes"
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Contoh: Bab 1"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-score"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RINCIAN NILAI SISWA (FULL AUDIT & INLINE EDITING) */}
      {/* ========================================================================= */}
      {detailStudentId && selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            id="modal-rincian-nilai"
            className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Rincian Buku Nilai Siswa</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <strong>{selectedStudentForDetail.name}</strong> (NIS: {selectedStudentForDetail.nis}) &bull; Kelas {currentClass?.name || '-'} &bull; Mapel: {currentSubject?.name || '-'}
                </p>
              </div>
              <button
                onClick={() => setDetailStudentId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const summary = getStudentScoreSummary(selectedStudentForDetail.id);

                return (
                  <div className="space-y-4">
                    {/* Overall Summary Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">KKM Mapel</span>
                        <strong className="text-slate-900 text-sm font-bold">{effectiveCurrentKkm}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">Nilai Akhir</span>
                        <strong
                          className={`text-sm font-extrabold ${
                            summary.average !== null
                              ? summary.isPassing
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {summary.average !== null ? summary.formattedFinalScore : '-'}
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">Kelengkapan</span>
                        <span
                          className={`text-xs font-bold ${
                            summary.isComplete ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {summary.completenessStatus}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-500 block text-[11px]">Ketuntasan</span>
                        {summary.average === null ? (
                          <span className="text-slate-400 font-medium text-[11px]">{summary.statusLabel}</span>
                        ) : summary.isPassing ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tuntas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Remedial
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Button to open complete 10 Tugas + 5 UH Editor */}
                    {canEditScores && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailStudentId(null);
                            handleOpenStudentScoreModal(selectedStudentForDetail);
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Buka Formulir Lengkap (10 Tugas &amp; 5 UH)</span>
                        </button>
                      </div>
                    )}

                    {/* SECTION: 10 TUGAS DETAIL TABLE */}
                    <div className="border border-indigo-100 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="px-4 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                            Rincian 10 Nilai Tugas
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-100 text-indigo-800">
                            Bobot: 15%
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-indigo-900">
                          Terisi: <strong>{summary.tugasFilledCount}</strong> / 10 &bull; Rata-rata:{' '}
                          <strong className="text-indigo-700 text-sm">{summary.tugasAverage ?? '-'}</strong>
                          {summary.tugasAverage !== null && (
                            <span className="text-[11px] text-slate-500 ml-1">
                              (Kontribusi: {(summary.tugasAverage * 0.15).toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs divide-y divide-slate-100">
                          <thead className="bg-slate-50 text-[10px] font-semibold text-slate-600 uppercase">
                            <tr>
                              <th className="py-2 px-3">Kolom</th>
                              <th className="py-2 px-3 text-center">Nilai</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Tanggal</th>
                              <th className="py-2 px-3">Catatan</th>
                              <th className="py-2 px-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {TUGAS_COLUMNS.map((col, idx) => {
                              const val = summary.tugasList[idx];
                              const scoreObj = summary.scoresList.find((s) => isExactScoreTypeMatch(s.type, col));

                              return (
                                <tr key={col} className="hover:bg-slate-50/60 transition">
                                  <td className="py-2 px-3 font-semibold text-slate-900">{col}</td>
                                  <td className="py-2 px-3 text-center font-bold">
                                    {val !== null ? (
                                      <span className="inline-flex px-2 py-0.5 rounded text-indigo-800 bg-indigo-50 font-bold">
                                        {val}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-light">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {val !== null ? (
                                      <span className="text-[10px] text-emerald-700 font-medium">Terisi</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Belum diisi</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 text-[11px] font-mono">
                                    {scoreObj?.date || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 text-[11px] max-w-xs truncate">
                                    {scoreObj?.notes || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {canEditScores && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDetailInputType(col);
                                            setDetailInputValue(val !== null ? String(val) : '');
                                            setDetailInputNotes(scoreObj?.notes || '');
                                            setDetailInputDate(scoreObj?.date || new Date().toISOString().split('T')[0]);
                                          }}
                                          className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                          title="Ubah nilai di form bawah"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {canEditScores && scoreObj && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteScore(scoreObj)}
                                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                          title="Hapus nilai"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION: 5 ULANGAN HARIAN DETAIL TABLE */}
                    <div className="border border-emerald-100 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                            Rincian 5 Ulangan Harian (UH)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800">
                            Bobot: 20%
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-emerald-900">
                          Terisi: <strong>{summary.uhFilledCount}</strong> / 5 &bull; Rata-rata:{' '}
                          <strong className="text-emerald-700 text-sm">{summary.uhAverage ?? '-'}</strong>
                          {summary.uhAverage !== null && (
                            <span className="text-[11px] text-slate-500 ml-1">
                              (Kontribusi: {(summary.uhAverage * 0.20).toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs divide-y divide-slate-100">
                          <thead className="bg-slate-50 text-[10px] font-semibold text-slate-600 uppercase">
                            <tr>
                              <th className="py-2 px-3">Kolom</th>
                              <th className="py-2 px-3 text-center">Nilai</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Tanggal</th>
                              <th className="py-2 px-3">Catatan</th>
                              <th className="py-2 px-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {UH_COLUMNS.map((col, idx) => {
                              const val = summary.uhList[idx];
                              const scoreObj = summary.scoresList.find((s) => isExactScoreTypeMatch(s.type, col));

                              return (
                                <tr key={col} className="hover:bg-slate-50/60 transition">
                                  <td className="py-2 px-3 font-semibold text-slate-900">{col}</td>
                                  <td className="py-2 px-3 text-center font-bold">
                                    {val !== null ? (
                                      <span className="inline-flex px-2 py-0.5 rounded text-emerald-800 bg-emerald-50 font-bold">
                                        {val}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-light">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {val !== null ? (
                                      <span className="text-[10px] text-emerald-700 font-medium">Terisi</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Belum diisi</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 text-[11px] font-mono">
                                    {scoreObj?.date || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 text-[11px] max-w-xs truncate">
                                    {scoreObj?.notes || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {canEditScores && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDetailInputType(col);
                                            setDetailInputValue(val !== null ? String(val) : '');
                                            setDetailInputNotes(scoreObj?.notes || '');
                                            setDetailInputDate(scoreObj?.date || new Date().toISOString().split('T')[0]);
                                          }}
                                          className="p-1 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                          title="Ubah nilai di form bawah"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {canEditScores && scoreObj && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteScore(scoreObj)}
                                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                          title="Hapus nilai"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION: STS & SAS CARD */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* STS */}
                      <div className="p-3.5 rounded-xl border border-amber-200/80 bg-white shadow-2xs space-y-2">
                        <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                          <span className="font-bold text-xs text-amber-950 uppercase">STS (Tengah Semester)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800">
                            Bobot: 25%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-500">Nilai: </span>
                            <strong className="text-sm font-bold text-amber-900">
                              {summary.stsScore !== null ? summary.stsScore : '-'}
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Kontribusi: <strong className="text-amber-800">{summary.stsScore !== null ? (summary.stsScore * 0.25).toFixed(2) : '-'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* SAS */}
                      <div className="p-3.5 rounded-xl border border-purple-200/80 bg-white shadow-2xs space-y-2">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                          <span className="font-bold text-xs text-purple-950 uppercase">SAS (Akhir Semester)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800">
                            Bobot: 40%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-500">Nilai: </span>
                            <strong className="text-sm font-bold text-purple-900">
                              {summary.sasScore !== null ? summary.sasScore : '-'}
                            </strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Kontribusi: <strong className="text-purple-800">{summary.sasScore !== null ? (summary.sasScore * 0.40).toFixed(2) : '-'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: AUDIT RUMUS PENILAIAN */}
                    <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-indigo-400" />
                        <span>Audit Rumus Nilai Akhir:</span>
                      </div>
                      <p className="font-mono text-[11px] text-indigo-200 bg-white/5 p-2 rounded-lg leading-relaxed">
                        Nilai Akhir = (Rata-rata Tugas × 15%) + (Rata-rata UH × 20%) + (STS × 25%) + (SAS × 40%)
                        <br />
                        {summary.isComplete ? (
                          <span className="text-emerald-300 font-bold">
                            = ({summary.tugasAverage} × 15%) + ({summary.uhAverage} × 20%) + ({summary.stsScore} × 25%) + ({summary.sasScore} × 40%) = {summary.formattedFinalScore}
                          </span>
                        ) : (
                          <span className="text-amber-300">
                            Status: Belum Lengkap. Komponen belum terisi: {summary.missingComponents.join(', ')}.
                            Nilai akhir belum diterbitkan karena komponen belum terpenuhi (bobot tidak diubah dan kolom kosong tidak dianggap 0).
                          </span>
                        )}
                      </p>
                    </div>

                    {/* SECTION: FORM INPUT CEPAT LANGSUNG DI MODAL RINCIAN */}
                    {canEditScores && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 to-slate-50 border border-indigo-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                            <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Input / Ubah Nilai Komponen Spesifik</span>
                          </h4>
                          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                            KKM: {effectiveCurrentKkm}
                          </span>
                        </div>

                        {detailFormError && (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{detailFormError}</span>
                          </div>
                        )}

                        {detailFormSuccess && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                            <Check className="w-4 h-4 shrink-0" />
                            <span>{detailFormSuccess}</span>
                          </div>
                        )}

                        <form onSubmit={handleSaveDetailScore} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Pilih Kolom Nilai <span className="text-rose-500">*</span>
                              </label>
                              <select
                                id="detail-select-type"
                                value={detailInputType}
                                onChange={(e) => setDetailInputType(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                              >
                                <optgroup label="10 Tugas (Bobot 15%)">
                                  {TUGAS_COLUMNS.map((col) => (
                                    <option key={col} value={col}>
                                      {col}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="5 Ulangan Harian (Bobot 20%)">
                                  {UH_COLUMNS.map((col) => (
                                    <option key={col} value={col}>
                                      {col}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Sumatif">
                                  <option value="STS">STS (25%)</option>
                                  <option value="SAS">SAS (40%)</option>
                                </optgroup>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Nilai (0 - 100) <span className="text-rose-500">*</span>
                              </label>
                              <input
                                id="detail-input-value"
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={detailInputValue}
                                onChange={(e) => setDetailInputValue(e.target.value)}
                                placeholder="Contoh: 85 (0 sah)"
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Tanggal Penilaian
                              </label>
                              <input
                                id="detail-input-date"
                                type="date"
                                value={detailInputDate}
                                onChange={(e) => setDetailInputDate(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Keterangan (Opsional)
                              </label>
                              <input
                                id="detail-input-notes"
                                type="text"
                                value={detailInputNotes}
                                onChange={(e) => setDetailInputNotes(e.target.value)}
                                placeholder="Contoh: Tugas Bab 1"
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500 italic">
                              * Nilai disimpan langsung ke database dan tersinkronisasi.
                            </span>
                            <button
                              type="submit"
                              id="btn-save-detail-score"
                              disabled={isDetailSubmitting}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                            >
                              {isDetailSubmitting ? 'Menyimpan...' : 'Simpan Nilai'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  id="btn-close-detail"
                  onClick={() => setDetailStudentId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INPUT / EDIT NILAI EKSTRAKURIKULER */}
      {/* ========================================================================= */}
      {isEksInputModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            id="modal-input-nilai-ekskul"
            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {getStudentExtracurricularScore(eksFormData.studentId)
                    ? 'Edit Nilai Ekstrakurikuler'
                    : 'Input Nilai Ekstrakurikuler'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentExtracurricular?.name || 'Ekstrakurikuler'} • Kelas {currentClass?.name || '-'} ({activeAcademicYear?.name} - {activeAcademicYear?.semester})
                </p>
              </div>
              <button
                onClick={() => setIsEksInputModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEksScore} className="p-6 space-y-4">
              {eksFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{eksFormError}</span>
                </div>
              )}

              {eksFormSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{eksFormSuccess}</span>
                </div>
              )}

              {/* Peserta Ekstrakurikuler */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Siswa Peserta <span className="text-rose-500">*</span>
                </label>
                <select
                  id="eks-form-select-student"
                  value={eksFormData.studentId}
                  onChange={(e) => handleEksStudentChangeInModal(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  required
                >
                  {extracurricularStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.nis} - {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilihan Nilai (A / B / C / D) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nilai Ekstrakurikuler <span className="text-rose-500">*</span>
                </label>
                <select
                  id="eks-form-select-nilai"
                  value={eksFormData.nilai}
                  onChange={(e) => handleEksGradeChangeInModal(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-indigo-600 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="A">A — Sangat Baik</option>
                  <option value="B">B — Baik</option>
                  <option value="C">C — Cukup</option>
                  <option value="D">D — Kurang</option>
                </select>
              </div>

              {/* Keterangan (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Keterangan (Opsional)
                </label>
                <input
                  id="eks-form-input-keterangan"
                  type="text"
                  value={eksFormData.keterangan}
                  onChange={(e) => setEksFormData((prev) => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Contoh: Sangat Baik / Aktif dalam kegiatan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEksInputModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-submit-eks-score"
                  disabled={isEksSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isEksSubmitting ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RINCIAN EKSTRAKURIKULER */}
      {/* ========================================================================= */}
      {eksDetailStudentId && selectedStudentForEksDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            id="modal-rincian-ekskul"
            className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Ekstrakurikuler
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periode: {activeAcademicYear?.name || '2026/2027'} - {activeAcademicYear?.semester || 'Ganjil'}
                </p>
              </div>
              <button
                onClick={() => setEksDetailStudentId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {(() => {
                const eksScore = getStudentExtracurricularScore(selectedStudentForEksDetail.id);
                return (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                      <span className="text-slate-500 font-medium">Nama Siswa</span>
                      <div className="text-right">
                        <strong className="text-slate-900 font-bold block">
                          {selectedStudentForEksDetail.name}
                        </strong>
                        <span className="text-[11px] font-mono text-slate-400">
                          NIS: {selectedStudentForEksDetail.nis} • Kelas {currentClass?.name || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                      <span className="text-slate-500 font-medium">Nama Ekstrakurikuler</span>
                      <strong className="text-purple-900 font-bold">
                        {currentExtracurricular?.name || '-'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                      <span className="text-slate-500 font-medium">Nilai</span>
                      {eksScore ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-sm bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {eksScore.nilai}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum dinilai</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Keterangan</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[220px]">
                        {eksScore?.keterangan || '-'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                {canEditExtracurricularScores && (
                  <button
                    type="button"
                    onClick={() => {
                      const stId = selectedStudentForEksDetail.id;
                      setEksDetailStudentId(null);
                      handleOpenEksInputModal(stId);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {getStudentExtracurricularScore(selectedStudentForEksDetail.id)
                      ? 'Edit Nilai'
                      : '+ Input Nilai'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEksDetailStudentId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: KONFIRMASI HAPUS NILAI */}
      {/* ========================================================================= */}
      {isDeleteScoreModalOpen && scoreToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Hapus Nilai
                </h3>
                <p className="text-xs text-slate-500">
                  Apakah Anda yakin ingin menghapus catatan nilai ini dari sistem?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Siswa:</span>
                <span className="font-semibold text-slate-800">
                  {students.find((s) => s.id === scoreToDelete.studentId)?.name || 'Siswa'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mata Pelajaran:</span>
                <span className="font-semibold text-slate-800">
                  {subjects.find((sub) => sub.id === scoreToDelete.subjectId)?.name || 'Mata Pelajaran'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Komponen & Nilai:</span>
                <span className="font-bold text-rose-600">
                  {scoreToDelete.type} — {scoreToDelete.value}
                </span>
              </div>
            </div>

            {deleteScoreError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteScoreError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteScoreModalOpen(false);
                  setScoreToDelete(null);
                  setDeleteScoreError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteScore}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs"
              >
                Ya, Hapus Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
