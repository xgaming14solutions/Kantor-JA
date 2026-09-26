import React, { useState, useMemo, useEffect } from 'react';
import { Score, ExtracurricularScore } from '../types';
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
  matchesScoreType
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
  Users
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

  // Active Academic Setting dynamically fetched from Firestore
  const currentAcademicSetting = useMemo(() => {
    if (!activeAcademicYear) {
      return createDefaultAcademicSetting('ay_2026_2027_1', 'Ganjil');
    }
    return getAcademicSetting(activeAcademicYear.id, activeAcademicYear.semester);
  }, [activeAcademicYear, getAcademicSetting, academicSettings]);

  // Enabled assessment components for active academic period
  const enabledComponents = useMemo(() => {
    return currentAcademicSetting.components.filter((c) => c.enabled);
  }, [currentAcademicSetting]);

  // Is current logged-in user a teacher (GURU_MAPEL or WALI_KELAS)
  const isTeacher = role === 'GURU_MAPEL' || role === 'WALI_KELAS';

  // 1. Resolve Effective Teacher ID: user/guru -> teacherId
  const effectiveTeacherId = useMemo(() => {
    return getEffectiveTeacherId(currentUser, role, teachers);
  }, [currentUser, role, teachers]);

  const teacherProfile = useMemo(() => {
    return teachers.find((t) => t.id === effectiveTeacherId) || null;
  }, [teachers, effectiveTeacherId]);

  // 2. Filter Active Teacher Assignments for teachers: teacherId -> teacherAssignments -> classId + subjectId + academicYearId
  const activeTeacherAssignments = useMemo(() => {
    if (!isTeacher) return [];
    return getActiveTeacherAssignments(teacherAssignments, effectiveTeacherId, activeAcademicYear);
  }, [isTeacher, effectiveTeacherId, activeAcademicYear, teacherAssignments]);

  // Selected Class State
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // 3. Filter Available Subjects strictly from TeacherAssignments for GURU_MAPEL, and prioritize assigned for WALI_KELAS
  const availableSubjects = useMemo(() => {
    // Only active standard academic subjects enter academic score management
    const academicSubjects = subjects.filter(
      (s) => (s.type || 'subject') === 'subject' && s.isActive !== false
    );

    if (role === 'GURU_MAPEL') {
      const assignedSubjectIds = new Set(activeTeacherAssignments.map((a) => a.subjectId));
      return academicSubjects.filter((s) => assignedSubjectIds.has(s.id));
    }
    if (role === 'WALI_KELAS') {
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
  }, [role, activeTeacherAssignments, selectedClassId, subjects]);

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

  // 3B. Filter Available Extracurriculars from master subjects (type === 'extracurricular')
  const availableExtracurriculars = useMemo(() => {
    return subjects.filter((s) => s.type === 'extracurricular' && s.isActive !== false);
  }, [subjects]);

  const [selectedExtracurricularId, setSelectedExtracurricularId] = useState<string>('');

  useEffect(() => {
    if (availableExtracurriculars.length > 0) {
      if (!availableExtracurriculars.some((e) => e.id === selectedExtracurricularId)) {
        setSelectedExtracurricularId(availableExtracurriculars[0].id);
      }
    } else {
      setSelectedExtracurricularId('');
    }
  }, [availableExtracurriculars, selectedExtracurricularId]);

  // 4. Filter Available Classes strictly from TeacherAssignments for teachers (or active classes for extracurricular)
  const availableClasses = useMemo(() => {
    if (role === 'GURU_MAPEL') {
      const assignedClassIds = new Set(
        activeTeacherAssignments
          .filter((a) => assessmentType === 'extracurricular' || !selectedSubjectId || a.subjectId === selectedSubjectId)
          .map((a) => a.classId)
      );
      const matched = classes.filter((c) => c.isActive !== false && assignedClassIds.has(c.id));
      return matched.length > 0
        ? matched
        : assessmentType === 'extracurricular'
        ? classes.filter((c) => c.isActive !== false)
        : [];
    }
    if (role === 'WALI_KELAS') {
      const taughtClassIds = new Set(activeTeacherAssignments.map((a) => a.classId));
      const relevant = classes.filter(
        (c) =>
          c.isActive !== false &&
          (taughtClassIds.has(c.id) ||
            c.homeroomTeacherId === effectiveTeacherId ||
            c.teacherId === effectiveTeacherId)
      );
      return relevant.length > 0 ? relevant : classes.filter((c) => c.isActive !== false);
    }
    return classes.filter((c) => c.isActive !== false);
  }, [role, activeTeacherAssignments, selectedSubjectId, classes, effectiveTeacherId, assessmentType]);

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

  // Current selected subject, extracurricular & class objects
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || null;
  const currentExtracurricular = availableExtracurriculars.find((e) => e.id === selectedExtracurricularId) || null;
  const currentClass = classes.find((c) => c.id === selectedClassId) || null;

  // Strict Authorization Barrier:
  // - ADMIN has full oversight and can edit any score
  // - KEPALA_SEKOLAH has read-only oversight
  // - GURU_MAPEL & WALI_KELAS can edit IF AND ONLY IF they have an active teacherAssignment for:
  //   effectiveTeacherId + selectedClassId + selectedSubjectId + activeAcademicYear
  const canEditScores = useMemo(() => {
    if (role === 'ADMIN') return true;
    if (role === 'KEPALA_SEKOLAH') return false;
    if (!isTeacher || !effectiveTeacherId || !activeAcademicYear) return false;
    if (!selectedClassId || !selectedSubjectId) return false;
    return validateTeacherAssignmentAuth(
      teacherAssignments,
      effectiveTeacherId,
      selectedClassId,
      selectedSubjectId,
      activeAcademicYear.id,
      activeAcademicYear.semester
    );
  }, [role, isTeacher, effectiveTeacherId, activeAcademicYear, selectedClassId, selectedSubjectId, teacherAssignments]);

  const isAuthorized = canEditScores;

  // Filter students belonging to this class (BLOCKED and returns empty array if unauthorized GURU_MAPEL)
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    if (role === 'GURU_MAPEL' && !canEditScores) return [];
    return students.filter(
      (s) =>
        s.classId === selectedClassId &&
        s.status === 'Aktif' &&
        (s as any).isActive !== false
    );
  }, [students, selectedClassId, role, canEditScores]);

  // Authorization for Extracurricular Scores
  const canEditExtracurricularScores = useMemo(() => {
    if (role === 'ADMIN') return true;
    if (role === 'KEPALA_SEKOLAH') return false;
    if (role === 'WALI_KELAS' || role === 'GURU_MAPEL') return true;
    return false;
  }, [role]);

  // Strictly filter ONLY students registered as participants of selectedExtracurricularId in selectedClassId
  const extracurricularParticipantStudentIds = useMemo(() => {
    if (!selectedClassId || !selectedExtracurricularId) return new Set<string>();
    const matched = extracurricularParticipants.filter((p) => {
      if (p.extracurricularId !== selectedExtracurricularId) return false;
      if (p.classId !== selectedClassId) return false;
      if (p.status === 'inactive') return false;
      if (activeAcademicYear) {
        const yearMatches =
          !p.academicYearId ||
          p.academicYearId === activeAcademicYear.id ||
          p.academicYearId === activeAcademicYear.name;
        if (!yearMatches) return false;
        if (p.semester && activeAcademicYear.semester && p.semester !== activeAcademicYear.semester) {
          return false;
        }
      }
      return true;
    });
    return new Set(matched.map((p) => p.studentId));
  }, [extracurricularParticipants, selectedClassId, selectedExtracurricularId, activeAcademicYear]);

  const extracurricularStudents = useMemo(() => {
    if (!selectedClassId || !selectedExtracurricularId) return [];
    return students
      .filter(
        (s) =>
          s.classId === selectedClassId &&
          s.status === 'Aktif' &&
          (s as any).isActive !== false &&
          extracurricularParticipantStudentIds.has(s.id)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId, selectedExtracurricularId, extracurricularParticipantStudentIds]);

  const getStudentExtracurricularScore = (studentId: string): ExtracurricularScore | null => {
    if (!selectedExtracurricularId) return null;
    return (
      extracurricularScores.find((sc) => {
        if (sc.studentId !== studentId) return false;
        if (sc.extracurricularId !== selectedExtracurricularId) return false;
        if (selectedClassId && sc.classId && sc.classId !== selectedClassId) return false;
        if (activeAcademicYear) {
          const yearMatches =
            !sc.academicYearId ||
            sc.academicYearId === activeAcademicYear.id ||
            sc.academicYearId === activeAcademicYear.name;
          if (!yearMatches) return false;
          if (sc.semester && activeAcademicYear.semester && sc.semester !== activeAcademicYear.semester) {
            return false;
          }
        }
        return true;
      }) || null
    );
  };

  // Extracurricular Input/Edit Modal & Rincian Modal States
  const [isEksInputModalOpen, setIsEksInputModalOpen] = useState<boolean>(false);
  const [eksDetailStudentId, setEksDetailStudentId] = useState<string | null>(null);
  const [eksFormData, setEksFormData] = useState<{
    studentId: string;
    nilai: string;
    keterangan: string;
  }>({
    studentId: '',
    nilai: 'A',
    keterangan: 'Sangat Baik'
  });
  const [eksFormError, setEksFormError] = useState<string | null>(null);
  const [eksFormSuccess, setEksFormSuccess] = useState<string | null>(null);
  const [isEksSubmitting, setIsEksSubmitting] = useState<boolean>(false);

  const handleOpenEksInputModal = (targetStudentId?: string) => {
    setEksFormError(null);
    setEksFormSuccess(null);

    if (!canEditExtracurricularScores) {
      return;
    }

    const studentToSelect = targetStudentId || extracurricularStudents[0]?.id || '';
    const existing = studentToSelect ? getStudentExtracurricularScore(studentToSelect) : null;

    setEksFormData({
      studentId: studentToSelect,
      nilai: existing?.nilai || 'A',
      keterangan: existing ? (existing.keterangan || '') : 'Sangat Baik'
    });
    setIsEksInputModalOpen(true);
  };

  const handleEksStudentChangeInModal = (newStudentId: string) => {
    const existing = newStudentId ? getStudentExtracurricularScore(newStudentId) : null;
    setEksFormData({
      studentId: newStudentId,
      nilai: existing?.nilai || 'A',
      keterangan: existing ? (existing.keterangan || '') : 'Sangat Baik'
    });
  };

  const handleEksGradeChangeInModal = (newNilai: string) => {
    setEksFormData((prev) => {
      const currentKet = prev.keterangan.trim();
      const isDefaultKet =
        currentKet === '' ||
        Object.values(DEFAULT_EKSKUL_KETERANGAN).includes(currentKet);
      return {
        ...prev,
        nilai: newNilai,
        keterangan: isDefaultKet ? (DEFAULT_EKSKUL_KETERANGAN[newNilai] || '') : prev.keterangan
      };
    });
  };

  const handleSaveEksScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setEksFormError(null);
    setEksFormSuccess(null);

    if (!activeAcademicYear) {
      setEksFormError('Tahun ajaran aktif belum ditentukan.');
      return;
    }
    if (!selectedClassId || !selectedExtracurricularId || !eksFormData.studentId) {
      setEksFormError('Pilih Kelas, Ekstrakurikuler, dan Siswa peserta terlebih dahulu.');
      return;
    }
    if (!['A', 'B', 'C', 'D'].includes(eksFormData.nilai)) {
      setEksFormError('Pilih nilai ekstrakurikuler yang valid (A, B, C, atau D).');
      return;
    }

    setIsEksSubmitting(true);
    try {
      const existing = getStudentExtracurricularScore(eksFormData.studentId);
      await saveExtracurricularScore({
        id: existing?.id,
        studentId: eksFormData.studentId,
        extracurricularId: selectedExtracurricularId,
        classId: selectedClassId,
        academicYearId: activeAcademicYear.id,
        semester: activeAcademicYear.semester,
        nilai: eksFormData.nilai,
        keterangan: eksFormData.keterangan.trim(),
        teacherId: effectiveTeacherId || currentUser?.teacherId || 't_001'
      });

      setEksFormSuccess(
        existing
          ? `Nilai ekstrakurikuler berhasil diperbarui menjadi ${eksFormData.nilai}.`
          : `Nilai ekstrakurikuler (${eksFormData.nilai}) berhasil disimpan ke database.`
      );

      setTimeout(() => {
        setIsEksInputModalOpen(false);
        setEksFormSuccess(null);
      }, 800);
    } catch (err: any) {
      console.error('Error saving extracurricular score:', err);
      setEksFormError(err?.message || 'Gagal menyimpan nilai ekstrakurikuler.');
    } finally {
      setIsEksSubmitting(false);
    }
  };

  const selectedStudentForEksDetail = useMemo(() => {
    if (!eksDetailStudentId) return null;
    return students.find((s) => s.id === eksDetailStudentId) || null;
  }, [students, eksDetailStudentId]);

  // 5. Modal State for "+ Input Nilai Baru"
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);

  // Effective KKM for current subject (respecting per-period overrides from Headmaster)
  const effectiveCurrentKkm = useMemo(() => {
    if (!currentSubject) return 75;
    return (
      currentAcademicSetting.subjectKkmOverrides?.[currentSubject.id] ?? currentSubject.kkm ?? 75
    );
  }, [currentSubject, currentAcademicSetting]);

  // Form State
  const [formData, setFormData] = useState<{
    classId: string;
    subjectId: string;
    studentId: string;
    type: string;
    value: string;
    notes: string;
    date: string;
  }>({
    classId: '',
    subjectId: '',
    studentId: '',
    type: 'UH',
    value: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Open Input Modal (with optional preselected student & assessment component)
  const handleOpenInputModal = (targetStudentId?: string, targetType?: string) => {
    setFormError(null);
    setFormSuccess(null);

    if (isTeacher && !canEditScores) {
      alert('Akses Ditolak (403 Forbidden): Anda tidak memiliki wewenang penugasan mengajar aktif untuk kelas dan mata pelajaran ini.');
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
    const defaultType = targetType || enabledComponents[0]?.code || 'UH';

    const existing = scores.find(
      (s) =>
        s.studentId === studentToSelect &&
        s.subjectId === initialSubjectId &&
        s.classId === initialClassId &&
        (s.academicYearId === activeAcademicYear?.id || s.academicYearId === activeAcademicYear?.name) &&
        (!s.semester || s.semester === activeAcademicYear?.semester) &&
        (s.type === defaultType || matchesScoreType(s.type, defaultType))
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

  // Detect whether an existing score entry exists for current modal selections
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
          (s.type === formData.type || matchesScoreType(s.type, formData.type))
      ) || null
    );
  }, [formData.studentId, formData.subjectId, formData.classId, formData.type, activeAcademicYear, scores]);

  // Modal classes strictly filtered by role and selected subject in modal
  const modalAvailableClasses = useMemo(() => {
    if (role === 'GURU_MAPEL') {
      const assignedClassIds = new Set(
        activeTeacherAssignments
          .filter((a) => !formData.subjectId || a.subjectId === formData.subjectId)
          .map((a) => a.classId)
      );
      return classes.filter((c) => c.isActive !== false && assignedClassIds.has(c.id));
    }
    if (role === 'WALI_KELAS') {
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
  }, [role, activeTeacherAssignments, formData.subjectId, classes, effectiveTeacherId]);

  // Ensure formData.classId remains valid when subject changes
  useEffect(() => {
    if (modalAvailableClasses.length > 0 && !modalAvailableClasses.some((c) => c.id === formData.classId)) {
      setFormData((prev) => ({ ...prev, classId: modalAvailableClasses[0].id }));
    }
  }, [modalAvailableClasses, formData.classId]);

  // Update modal students when class in modal changes
  const modalClassStudents = useMemo(() => {
    if (!formData.classId) return [];
    return students.filter(
      (s) =>
        s.classId === formData.classId &&
        s.status === 'Aktif' &&
        (s as any).isActive !== false
    );
  }, [students, formData.classId]);

  // Ensure formData.studentId is valid when class changes
  useEffect(() => {
    if (modalClassStudents.length > 0 && !modalClassStudents.some((s) => s.id === formData.studentId)) {
      setFormData((prev) => ({ ...prev, studentId: modalClassStudents[0].id }));
    }
  }, [modalClassStudents, formData.studentId]);

  // Handle Form Submission with Security Validation & Non-destructive Upsert
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

    const numericValue = parseFloat(formData.value);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      setFormError('Nilai harus berupa angka valid antara 0 sampai 100.');
      return;
    }

    // SECURITY VALIDATION: Verify that the logged-in teacher has an active assignment for this class, subject, year, and semester
    if (isTeacher) {
      const authCheck = assertTeacherScoreAccess(
        role,
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

      // Verify selected student belongs to formData.classId
      const targetStudent = students.find((s) => s.id === formData.studentId);
      if (!targetStudent || targetStudent.classId !== formData.classId) {
        setFormError('Akses Ditolak: Siswa yang dipilih tidak terdaftar pada kelas penugasan Anda.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const targetDate = formData.date || new Date().toISOString().split('T')[0];

      // DEDUPLICATION & COMPONENT MATCHING:
      // Match by studentId, subjectId, classId, academicYear, semester, and assessment component type.
      // Date is NOT a barrier to updating the score component so editing an existing grade works seamlessly.
      const existingScore = scores.find(
        (s) =>
          s.studentId === formData.studentId &&
          s.subjectId === formData.subjectId &&
          s.classId === formData.classId &&
          (s.academicYearId === activeAcademicYear.id || s.academicYearId === activeAcademicYear.name) &&
          (!s.semester || s.semester === activeAcademicYear.semester) &&
          (s.type === formData.type || matchesScoreType(s.type, formData.type))
      );

      // Verify teacher ownership if updating an existing score
      if (existingScore && isTeacher) {
        if (existingScore.teacherId && existingScore.teacherId !== effectiveTeacherId) {
          const isStillAssigned = validateTeacherAssignmentAuth(
            teacherAssignments,
            effectiveTeacherId!,
            formData.classId,
            formData.subjectId,
            activeAcademicYear.id,
            activeAcademicYear.semester
          );
          if (!isStillAssigned) {
            setFormError('Akses Ditolak (403 Forbidden): Anda tidak diizinkan mengubah nilai yang dimasukkan oleh guru lain.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Deterministic ID if creating new score to ensure complete idempotency
      const cleanStudentId = formData.studentId.trim();
      const cleanSubjectId = formData.subjectId.trim();
      const cleanType = formData.type.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const deterministicId = `sc_${activeAcademicYear.id}_${activeAcademicYear.semester}_${formData.classId}_${cleanSubjectId}_${cleanStudentId}_${cleanType}`;

      const resolvedTeacherId =
        (isTeacher ? effectiveTeacherId : null) ||
        existingScore?.teacherId ||
        effectiveTeacherId ||
        currentUser?.teacherId ||
        't_001';

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

      // 1. Await genuine database persistence
      await saveScore(scoreToSave);

      // 2. Resynchronize database collections to guarantee consistent source of truth
      await refreshAll();

      setFormSuccess(
        existingScore
          ? `Nilai ${formData.type} siswa berhasil diperbarui di database.`
          : `Nilai ${formData.type} siswa berhasil disimpan ke database.`
      );

      // Reset form value & notes
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

  // State for Score Input/Edit directly in Rincian Modal
  const [detailInputType, setDetailInputType] = useState<string>('Tugas');
  const [detailInputValue, setDetailInputValue] = useState<string>('');
  const [detailInputDate, setDetailInputDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [detailInputNotes, setDetailInputNotes] = useState<string>('');
  const [detailFormError, setDetailFormError] = useState<string | null>(null);
  const [detailFormSuccess, setDetailFormSuccess] = useState<string | null>(null);
  const [isDetailSubmitting, setIsDetailSubmitting] = useState<boolean>(false);

  // Sync Rincian input form when student or component changes
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
        (s.type === detailInputType || matchesScoreType(s.type, detailInputType))
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

    const numericValue = parseFloat(detailInputValue);
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
          (s.type === detailInputType || matchesScoreType(s.type, detailInputType))
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
        't_001';

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

      setDetailFormSuccess(
        existingScore
          ? `Nilai ${detailInputType} (${scoreToSave.value}) berhasil diperbarui di database.`
          : `Nilai ${detailInputType} (${scoreToSave.value}) berhasil disimpan ke database.`
      );
    } catch (err: any) {
      console.error('Error saving score in detail modal:', err);
      setDetailFormError(err.message || 'Gagal menyimpan nilai. Silakan coba lagi.');
    } finally {
      setIsDetailSubmitting(false);
    }
  };

  // Helper to compute summary scores for a student using dynamic academic settings
  const getStudentScoreSummary = (studentId: string) => {
    if (role === 'GURU_MAPEL' && !isAuthorized) {
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
        scoresList: []
      };
    }

    const studentScores = scores.filter((s) => {
      // 1. Student Match
      if (s.studentId !== studentId) return false;

      // 2. Class Match (flexible case/trim)
      if (selectedClassId && s.classId) {
        if (s.classId.trim().toLowerCase() !== selectedClassId.trim().toLowerCase()) return false;
      }

      // 3. Subject Match (flexible case/trim)
      if (selectedSubjectId && s.subjectId) {
        if (s.subjectId.trim().toLowerCase() !== selectedSubjectId.trim().toLowerCase()) return false;
      }

      // 4. Academic Year Match (handling ID or Name or numeric year e.g. 2026/2027)
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

        // 5. Semester Match
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
      scoresList: calculated.scoresList
    };
  };

  const selectedStudentForDetail = useMemo(() => {
    if (!detailStudentId) return null;
    const st = students.find((s) => s.id === detailStudentId) || null;
    if (!st) return null;
    // Strict security check: Student must belong to currently viewed class and teacher must be authorized
    if (role === 'GURU_MAPEL') {
      if (!isAuthorized || st.classId !== selectedClassId) {
        return null;
      }
    }
    return st;
  }, [students, detailStudentId, role, isAuthorized, selectedClassId]);

  // Secure Score Deletion Handler
  const handleDeleteScore = async (scoreToDelete: Score) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data nilai ini?')) return;
    try {
      if (isTeacher) {
        const authCheck = assertTeacherScoreAccess(
          role,
          effectiveTeacherId,
          teacherAssignments,
          scoreToDelete,
          activeAcademicYear
        );
        if (!authCheck.allowed) {
          alert(authCheck.reason || 'Akses Ditolak: Anda tidak diizinkan menghapus nilai ini.');
          return;
        }
      }
      await deleteScore(scoreToDelete.id);
      await refreshAll();
    } catch (err: any) {
      console.error('Delete score error:', err);
      alert(err.message || 'Gagal menghapus nilai.');
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
            Pengelolaan buku nilai berdasarkan relasi ID: studentId, teacherId, classId, subjectId, academicYearId
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>Tahun Ajaran:</span>
            <strong className="text-slate-900 font-semibold">
              {activeAcademicYear ? `${activeAcademicYear.name} - ${activeAcademicYear.semester}` : 'Belum Ada'}
            </strong>
          </div>

          {assessmentType === 'subject' ? (
            (canEditScores || role === 'ADMIN') && (
              <button
                id="btn-input-nilai-baru"
                onClick={() => handleOpenInputModal()}
                disabled={isTeacher && (availableSubjects.length === 0 || !canEditScores)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition shadow-xs cursor-pointer ${
                  isTeacher && (availableSubjects.length === 0 || !canEditScores)
                    ? 'bg-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                + Input Nilai Baru
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

      {/* Role & Assignment Info Banner for Teachers */}
      {isTeacher && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start md:items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 flex items-center gap-2">
                <span>
                  Akses Guru: <strong className="text-indigo-950">{teacherProfile?.name || currentUser?.displayName || currentUser?.name || 'Agi Nugraha'}</strong>
                </span>
                <span className="text-[11px] font-mono text-indigo-600">({effectiveTeacherId || 'N/A'})</span>
                {role === 'WALI_KELAS' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                    Wali Kelas
                  </span>
                )}
                {role === 'GURU_MAPEL' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                    Guru Mapel
                  </span>
                )}
              </p>
              <p className="text-slate-600 text-[11px] mt-1">
                {activeTeacherAssignments.length > 0 ? (
                  <>
                    Penugasan Aktif:{' '}
                    {activeTeacherAssignments.map((a, idx) => {
                      const sub = subjects.find((s) => s.id === a.subjectId);
                      const cls = classes.find((c) => c.id === a.classId);
                      return (
                        <span key={a.id} className="font-medium text-slate-800">
                          {idx > 0 && ', '}
                          {sub?.name || a.subjectId} ({cls ? `Kelas ${cls.name}` : a.classId})
                          {a.totalHoursPerWeek ? ` - ${a.totalHoursPerWeek} Jam/Minggu` : ''}
                        </span>
                      );
                    })}
                  </>
                ) : (
                  <span className="text-amber-700 font-medium">
                    Tidak ditemukan penugasan mengajar aktif untuk semester ini.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-800 font-medium text-[11px] self-start md:self-auto">
            <span>Otorisasi Penugasan: teacherAssignments</span>
          </div>
        </div>
      )}

      {/* Selector Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            PILIH KELAS
          </label>
          <select
            id="select-filter-class"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={availableClasses.length <= 1 && isTeacher}
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
            <option value="subject">Mata Pelajaran</option>
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
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>KKM Mapel:</span>
            <strong className="text-slate-900 font-bold">{effectiveCurrentKkm}</strong>
            {currentAcademicSetting.subjectKkmOverrides?.[currentSubject.id] !== undefined && (
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                Kustom
              </span>
            )}
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
                Hanya siswa yang terdaftar sebagai peserta {currentExtracurricular?.name || 'ekstrakurikuler ini'} yang ditampilkan. Silakan pilih peserta terlebih dahulu melalui menu <strong>Mata Pelajaran &rarr; Ekstrakurikuler &rarr; Peserta</strong>.
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
        ) : role === 'GURU_MAPEL' && !canEditScores ? (
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  {enabledComponents.map((comp) => (
                    <th key={comp.code} className="py-3 px-4 text-center">
                      <span>{comp.name}</span>
                      {currentAcademicSetting.calculationMethod === 'WEIGHTED' && comp.weight > 0 && (
                        <span className="block text-[9px] font-normal text-slate-400 lowercase">
                          ({comp.weight}%)
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">
                    {currentAcademicSetting.calculationMethod === 'WEIGHTED' ? 'Nilai Akhir' : 'Rata-Rata'}
                  </th>
                  <th className="py-3 px-4">Status Ketuntasan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st) => {
                  const summary = getStudentScoreSummary(st.id);

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
                      {enabledComponents.map((comp) => {
                        const val =
                          summary.componentScores[comp.code] !== undefined && summary.componentScores[comp.code] !== null
                            ? summary.componentScores[comp.code]
                            : (Object.entries(summary.componentScores).find(([k]) => matchesScoreType(k, comp.code))?.[1] ?? null);
                        return (
                          <td key={comp.code} className="py-3 px-4 text-center font-medium text-slate-800">
                            {val !== null && val !== undefined ? val : <span className="text-slate-300">-</span>}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center font-bold">
                        {summary.average !== null ? (
                          <span className={summary.isPassing ? 'text-emerald-600' : 'text-rose-600'}>
                            {summary.formattedFinalScore ?? summary.average}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {summary.average === null ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                            {summary.statusLabel}
                          </span>
                        ) : summary.isPassing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            {summary.statusLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            {summary.statusLabel}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditScores && (
                            <button
                              id={`btn-input-score-${st.id}`}
                              onClick={() => handleOpenInputModal(st.id)}
                              className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                              title="Input atau ubah nilai siswa ini"
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
                            Rincian ({summary.totalEntries})
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM INPUT NILAI BARU (Full Implementation) */}
      {/* ========================================================================= */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            id="modal-input-nilai"
            className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Input Nilai Siswa</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periode Akademik: {activeAcademicYear?.name || '2026/2027'} - {activeAcademicYear?.semester || 'Ganjil'}
                </p>
              </div>
              <button
                onClick={() => setIsInputModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveScore} className="p-6 space-y-4">
              {/* Security & Assignment Notice */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Guru Pengampu:</span>
                  <strong className="text-slate-900">
                    {teacherProfile?.name || currentUser?.displayName || currentUser?.name || 'Budi Santoso, S.Si.'}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Teacher ID:</span>
                  <span className="font-mono text-indigo-600 font-semibold">{effectiveTeacherId || 't_003'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Semester / Tahun:</span>
                  <span className="font-medium text-slate-800">
                    {activeAcademicYear?.semester} / {activeAcademicYear?.name}
                  </span>
                </div>
              </div>

              {/* Feedback messages */}
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
                    disabled={modalAvailableClasses.length <= 1 && role === 'GURU_MAPEL'}
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
                    disabled={availableSubjects.length <= 1 && role === 'GURU_MAPEL'}
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

              {/* Existing Score Indicator / Non-destructive overwrite reminder */}
              {existingScoreInModal && (
                <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-950">
                      Nilai {formData.type} siswa ini sudah tercatat di database:{' '}
                      <span className="font-bold underline text-amber-900 text-sm">{existingScoreInModal.value}</span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Menyimpan nilai baru akan memperbarui komponen {formData.type} ini secara aman (upsert/update) tanpa menghapus atau menimpa nilai Tugas, UH, STS, atau SAS lainnya.
                    </p>
                  </div>
                </div>
              )}

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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    required
                  >
                    {enabledComponents.map((comp) => (
                      <option key={comp.code} value={comp.code}>
                        {comp.name} {currentAcademicSetting.calculationMethod === 'WEIGHTED' && comp.weight > 0 ? `(${comp.weight}%)` : ''}
                      </option>
                    ))}
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
                    placeholder="Contoh: 85"
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
                    placeholder="Contoh: Materi Bab Ekosistem"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
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
      {/* MODAL 2: RINCIAN NILAI SISWA */}
      {/* ========================================================================= */}
      {detailStudentId && selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian Nilai: {selectedStudentForDetail.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: {selectedStudentForDetail.nis} • {currentSubject?.name} • Kelas {currentClass?.name}
                </p>
              </div>
              <button
                onClick={() => setDetailStudentId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {(() => {
                const summary = getStudentScoreSummary(selectedStudentForDetail.id);

                return (
                  <div className="space-y-4">
                    {/* Overall Summary Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">KKM Mapel</span>
                        <strong className="text-slate-800 text-sm">{effectiveCurrentKkm}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          {currentAcademicSetting.calculationMethod === 'WEIGHTED' ? 'Nilai Akhir' : 'Rata-Rata'}
                        </span>
                        <strong className={`text-sm ${summary.average !== null ? (summary.isPassing ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold') : 'text-slate-400'}`}>
                          {summary.average !== null ? (summary.formattedFinalScore ?? summary.average) : '-'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Status</span>
                        {summary.average === null ? (
                          <span className="text-slate-400 font-medium text-[11px]">{summary.statusLabel}</span>
                        ) : summary.isPassing ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            {summary.statusLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            {summary.statusLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Form Input / Ubah Nilai Langsung pada Rincian */}
                    {canEditScores ? (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 to-slate-50 border border-indigo-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                            <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Input / Ubah Nilai Siswa</span>
                          </h4>
                          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                            {currentSubject?.name} • KKM: {effectiveCurrentKkm}
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
                                Jenis / Komponen Nilai <span className="text-rose-500">*</span>
                              </label>
                              <select
                                id="detail-select-type"
                                value={detailInputType}
                                onChange={(e) => setDetailInputType(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                              >
                                {enabledComponents.map((comp) => (
                                  <option key={comp.code} value={comp.code}>
                                    {comp.name} {currentAcademicSetting.calculationMethod === 'WEIGHTED' && comp.weight > 0 ? `(${comp.weight}%)` : ''}
                                  </option>
                                ))}
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
                                placeholder="Contoh: 85"
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
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Mode Hanya Lihat: Anda tidak memiliki penugasan mengajar aktif untuk mata pelajaran ini sehingga tidak dapat menginput atau mengubah nilai.</span>
                      </div>
                    )}

                    {/* Breakdown by Academic Components */}
                    <div className="space-y-3">
                      {currentAcademicSetting.components.map((comp) => {
                        const items = summary.scoresList.filter((s) => matchesScoreType(comp.code, s.type));
                        const avgVal = summary.componentScores[comp.code];

                        return (
                          <div
                            key={comp.code}
                            className={`border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs ${
                              !comp.enabled ? 'opacity-65 bg-slate-50/70 border-dashed' : ''
                            }`}
                          >
                            <div className="px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-800">
                                  {comp.name}
                                </span>
                                {!comp.enabled && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                                    Nonaktif (Tidak Dihitung)
                                  </span>
                                )}
                                {comp.enabled && currentAcademicSetting.calculationMethod === 'WEIGHTED' && comp.weight > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                                    Bobot: {comp.weight}%
                                  </span>
                                )}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                                  {items.length} entri
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {canEditScores && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDetailInputType(comp.code);
                                      const existing = items[0];
                                      if (existing) {
                                        setDetailInputValue(String(existing.value));
                                        setDetailInputNotes(existing.notes || '');
                                        setDetailInputDate(existing.date || new Date().toISOString().split('T')[0]);
                                      } else {
                                        setDetailInputValue('');
                                        setDetailInputNotes('');
                                        setDetailInputDate(new Date().toISOString().split('T')[0]);
                                      }
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold transition cursor-pointer"
                                  >
                                    + Input {comp.name}
                                  </button>
                                )}
                                <div>
                                  <span className="text-slate-500 text-[11px] mr-1">Rata-rata:</span>
                                  <strong className={`font-semibold ${avgVal !== null && avgVal !== undefined ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {avgVal !== null && avgVal !== undefined ? avgVal : '-'}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {items.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-400 italic">
                                Belum ada catatan nilai {comp.name}
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {items.map((sc) => (
                                  <div
                                    key={sc.id}
                                    className="p-3 flex items-center justify-between hover:bg-slate-50/60 text-xs"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                        <CalendarDays className="w-3 h-3 text-slate-400" />
                                        <span>{sc.date || '-'}</span>
                                      </div>
                                      {sc.notes ? (
                                        <p className="text-[11px] text-slate-700 font-medium">
                                          "{sc.notes}"
                                        </p>
                                      ) : (
                                        <p className="text-[10px] text-slate-400 italic">
                                          Tanpa catatan
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        {sc.value}
                                      </span>
                                      {canEditScores && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => {
                                              setDetailInputType(sc.type);
                                              setDetailInputValue(String(sc.value));
                                              setDetailInputNotes(sc.notes || '');
                                              setDetailInputDate(sc.date || new Date().toISOString().split('T')[0]);
                                            }}
                                            className="text-slate-400 hover:text-indigo-600 transition p-1 cursor-pointer"
                                            title="Ubah Nilai Ini di Form"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteScore(sc)}
                                            className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                                            title="Hapus Nilai"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-400 text-center italic">
                      * Rata-rata dihitung murni dari komponen nilai yang sudah tersedia (tanpa pembobotan).
                    </p>
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
      {/* MODAL 3: INPUT / EDIT NILAI EKSTRAKURIKULER */}
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
      {/* MODAL 4: RINCIAN EKSTRAKURIKULER */}
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
    </div>
  );
};
