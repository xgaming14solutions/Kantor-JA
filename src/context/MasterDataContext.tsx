import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AcademicYear,
  Teacher,
  SchoolClass,
  Student,
  Subject,
  TeacherAssignment,
  UserProfile,
  Score,
  AcademicSetting,
  AcademicSettingLog,
  ReportCard,
  Attendance
} from '../types';
import {
  fetchCollection,
  saveDocument,
  deleteDocument,
  setActiveAcademicYearDoc,
  seedDatabaseIfEmpty,
  normalizeAcademicYear,
  normalizeScore,
  assertTeacherScoreAccess
} from '../lib/dbService';
import { useAuth } from './AuthContext';
import { createDefaultAcademicSetting } from '../lib/academicCalculation';
import {
  INITIAL_ACADEMIC_YEARS,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_SUBJECTS,
  INITIAL_ASSIGNMENTS,
  DEMO_USERS,
  INITIAL_SCORES,
  INITIAL_REPORT_CARDS,
  INITIAL_ATTENDANCE
} from '../lib/mockData';

interface MasterDataContextType {
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear | null;
  teachers: Teacher[];
  classes: SchoolClass[];
  students: Student[];
  subjects: Subject[];
  teacherAssignments: TeacherAssignment[];
  users: UserProfile[];
  scores: Score[];
  academicSettings: AcademicSetting[];
  academicSettingLogs: AcademicSettingLog[];
  reportCards: ReportCard[];
  attendance: Attendance[];
  loading: boolean;
  saveAcademicYear: (data: AcademicYear) => Promise<void>;
  setActiveAcademicYear: (id: string) => Promise<void>;
  saveTeacher: (data: Teacher) => Promise<void>;
  toggleTeacherStatus: (id: string) => Promise<void>;
  saveStudent: (data: Student) => Promise<void>;
  updateStudentStatus: (id: string, status: Student['status']) => Promise<void>;
  saveClass: (data: SchoolClass) => Promise<void>;
  toggleActiveClass: (id: string) => Promise<void>;
  saveSubject: (data: Subject) => Promise<void>;
  toggleSubjectStatus: (id: string) => Promise<void>;
  saveTeacherAssignment: (data: TeacherAssignment) => Promise<void>;
  saveUser: (data: UserProfile) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveScore: (data: Score) => Promise<void>;
  deleteScore: (id: string) => Promise<void>;
  saveReportCard: (data: ReportCard) => Promise<void>;
  saveAttendance: (data: Attendance) => Promise<void>;
  getAcademicSetting: (academicYearId: string, semester: 'Ganjil' | 'Genap') => AcademicSetting;
  saveAcademicSetting: (
    data: AcademicSetting,
    updatedByName: string,
    changeNotes?: string[]
  ) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const MasterDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, role } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(INITIAL_ACADEMIC_YEARS);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [classes, setClasses] = useState<SchoolClass[]>(INITIAL_CLASSES);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>(INITIAL_ASSIGNMENTS);
  const [users, setUsers] = useState<UserProfile[]>(DEMO_USERS);
  const [scores, setScores] = useState<Score[]>(INITIAL_SCORES);
  const [academicSettings, setAcademicSettings] = useState<AcademicSetting[]>([]);
  const [academicSettingLogs, setAcademicSettingLogs] = useState<AcademicSettingLog[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>(INITIAL_REPORT_CARDS);
  const [attendance, setAttendance] = useState<Attendance[]>(INITIAL_ATTENDANCE);
  const [loading, setLoading] = useState<boolean>(true);

  // Load all master data collections
  const refreshAll = async () => {
    try {
      // First attempt to seed if completely empty
      await seedDatabaseIfEmpty();

      const [
        rawAyList,
        tList,
        rawCList,
        rawStList,
        rawSubList,
        rawAsgList,
        rawUsers,
        scList,
        rawSettings,
        rawLogs,
        rawRepList,
        rawAttList
      ] = await Promise.all([
        fetchCollection<AcademicYear>('academicYears', INITIAL_ACADEMIC_YEARS),
        fetchCollection<Teacher>('teachers', INITIAL_TEACHERS),
        fetchCollection<SchoolClass>('classes', INITIAL_CLASSES),
        fetchCollection<Student>('students', INITIAL_STUDENTS),
        fetchCollection<Subject>('subjects', INITIAL_SUBJECTS),
        fetchCollection<TeacherAssignment>('teacherAssignments', INITIAL_ASSIGNMENTS),
        fetchCollection<UserProfile>('users', DEMO_USERS),
        fetchCollection<Score>('scores', INITIAL_SCORES),
        fetchCollection<AcademicSetting>('academicSettings', []),
        fetchCollection<AcademicSettingLog>('academicSettingLogs', []),
        fetchCollection<ReportCard>('reportCards', INITIAL_REPORT_CARDS),
        fetchCollection<Attendance>('attendance', INITIAL_ATTENDANCE)
      ]);

      // Normalize all academic years to guarantee valid structure
      let ayList = rawAyList.map(normalizeAcademicYear);

      // If no academic year is currently active, activate 2026/2027 if available or first available
      const hasActive = ayList.some(ay => ay.isActive);
      if (!hasActive && ayList.length > 0) {
        const defaultActive = ayList.find(ay => ay.id === 'ay_2026_2027_1' || ay.name === '2026/2027') || ayList[0];
        ayList = ayList.map(ay => ({
          ...ay,
          isActive: ay.id === defaultActive.id
        }));
        await setActiveAcademicYearDoc(defaultActive.id, ayList);
      }

      // Ensure classes link to active year and have teacherId alias
      const activeYear = ayList.find(ay => ay.isActive) || ayList[0] || null;
      const cList = rawCList.map(c => ({
        ...c,
        academicYearId: c.academicYearId || (activeYear ? activeYear.id : 'ay_2026_2027_1'),
        teacherId: c.teacherId || c.homeroomTeacherId,
      }));

      // Ensure assignments have teacherId & subjectId & academicYearId
      const asgList = rawAsgList.map(a => ({
        ...a,
        academicYearId: a.academicYearId || (activeYear ? activeYear.id : 'ay_2026_2027_1'),
      }));

      // Ensure students have classId and academicYearId
      const stList = rawStList.map(s => ({
        ...s,
        academicYearId: s.academicYearId || (activeYear ? activeYear.id : 'ay_2026_2027_1'),
      }));

      // Ensure users have isActive defaults
      const userList = rawUsers.map(u => ({
        ...u,
        isActive: u.isActive !== false,
      }));

      // Ensure subjects have safe fallback for category and nameArab
      const subList = rawSubList.map(s => ({
        ...s,
        category: s.category || 'Umum',
        nameArab: s.nameArab || '',
      }));

      // Ensure default setting for active year exists
      let settingsList = [...rawSettings];
      if (activeYear) {
        const activeSettingExists = settingsList.some(
          s => s.academicYearId === activeYear.id && s.semester === activeYear.semester
        );
        if (!activeSettingExists) {
          const defaultSetting = createDefaultAcademicSetting(activeYear.id, activeYear.semester);
          settingsList.push(defaultSetting);
          saveDocument('academicSettings', defaultSetting).catch(e =>
            console.warn('Auto-seed academic setting failed:', e)
          );
        }
      }

      setAcademicYears(ayList);
      setTeachers(tList);
      setClasses(cList);
      setStudents(stList);
      setSubjects(subList);
      setTeacherAssignments(asgList);
      setUsers(userList);
      setScores(scList);
      setAcademicSettings(settingsList);
      setAcademicSettingLogs(
        rawLogs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
      setReportCards(rawRepList);
      setAttendance(rawAttList);
    } catch (e) {
      console.warn('Error loading master data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const activeAcademicYear = academicYears.find((ay) => ay.isActive) || null;

  // 1. Academic Year actions
  const saveAcademicYear = async (data: AcademicYear) => {
    const normalized = normalizeAcademicYear(data);
    let updatedList: AcademicYear[];
    // If set as active, mark all others inactive
    if (normalized.isActive) {
      updatedList = academicYears.map(ay => ({
        ...ay,
        isActive: ay.id === normalized.id
      }));
      const existingIdx = updatedList.findIndex(ay => ay.id === normalized.id);
      if (existingIdx >= 0) {
        updatedList[existingIdx] = normalized;
      } else {
        updatedList.push(normalized);
      }
      setAcademicYears(updatedList);
      await setActiveAcademicYearDoc(normalized.id, updatedList);
    } else {
      const existingIdx = academicYears.findIndex(ay => ay.id === normalized.id);
      if (existingIdx >= 0) {
        updatedList = [...academicYears];
        updatedList[existingIdx] = normalized;
      } else {
        updatedList = [...academicYears, normalized];
      }
      setAcademicYears(updatedList);
      await saveDocument('academicYears', normalized);
    }
  };

  const setActiveAcademicYear = async (id: string) => {
    const updated = await setActiveAcademicYearDoc(id, academicYears);
    setAcademicYears(updated);
  };

  // 2. Teacher actions
  const saveTeacher = async (data: Teacher) => {
    setTeachers(prev => {
      const idx = prev.findIndex(t => t.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('teachers', data);
  };

  const toggleTeacherStatus = async (id: string) => {
    const found = teachers.find(t => t.id === id);
    if (!found) return;
    const updated: Teacher = { ...found, isActive: !found.isActive };
    await saveTeacher(updated);
  };

  // 3. Student actions
  const saveStudent = async (data: Student) => {
    setStudents(prev => {
      const idx = prev.findIndex(s => s.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('students', data);
  };

  const updateStudentStatus = async (id: string, status: Student['status']) => {
    const found = students.find(s => s.id === id);
    if (!found) return;
    const updated: Student = { ...found, status };
    await saveStudent(updated);
  };

  // 4. Class actions
  const saveClass = async (data: SchoolClass) => {
    setClasses(prev => {
      const idx = prev.findIndex(c => c.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('classes', data);
  };

  const toggleActiveClass = async (id: string) => {
    const found = classes.find(c => c.id === id);
    if (!found) return;
    const updated: SchoolClass = { ...found, isActive: found.isActive === false ? true : false };
    await saveClass(updated);
  };

  // 5. Subject actions
  const saveSubject = async (data: Subject) => {
    setSubjects(prev => {
      const idx = prev.findIndex(s => s.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('subjects', data);
  };

  const toggleSubjectStatus = async (id: string) => {
    const found = subjects.find(s => s.id === id);
    if (!found) return;
    const updated: Subject = { ...found, isActive: found.isActive === false ? true : false };
    await saveSubject(updated);
  };

  // 6. Teacher Assignment actions (uses activeAcademicYear by default)
  const saveTeacherAssignment = async (data: TeacherAssignment) => {
    setTeacherAssignments(prev => {
      const idx = prev.findIndex(a => a.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('teacherAssignments', data);
  };

  // 7. User Account actions (Admin user management)
  const saveUser = async (data: UserProfile) => {
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('users', data);
  };

  const toggleUserStatus = async (id: string) => {
    const found = users.find(u => u.id === id);
    if (!found) return;
    const updated: UserProfile = { ...found, isActive: found.isActive === false ? true : false };
    await saveUser(updated);
  };

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    await deleteDocument('users', id);
  };

  // 8. Score actions - Strictly isolated from academic setting configurations
  // SECURITY GUARD: Assert teacher assignment authorization at data-layer
  const saveScore = async (data: Score) => {
    if (role === 'GURU_MAPEL' || role === 'WALI_KELAS') {
      const effectiveTeacherId =
        currentUser?.teacherId ||
        teachers.find(
          (t) =>
            (currentUser?.email && t.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
            (currentUser?.nip && t.nip === currentUser.nip) ||
            (currentUser?.name && t.name?.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
        )?.id;

      const authCheck = assertTeacherScoreAccess(
        role,
        effectiveTeacherId,
        teacherAssignments,
        data,
        activeAcademicYear
      );

      if (!authCheck.allowed) {
        console.error('[SECURITY BLOCK saveScore]', authCheck.reason);
        throw new Error(authCheck.reason || 'Akses Ditolak: Penugasan tidak sah.');
      }
    }

    const cleanScore = normalizeScore(data);
    setScores(prev => {
      const idx = prev.findIndex(s => s.id === cleanScore.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cleanScore;
        return next;
      }
      return [cleanScore, ...prev];
    });
    await saveDocument('scores', cleanScore);
  };

  const deleteScore = async (id: string) => {
    const existing = scores.find(s => s.id === id);
    if (existing && (role === 'GURU_MAPEL' || role === 'WALI_KELAS')) {
      const effectiveTeacherId =
        currentUser?.teacherId ||
        teachers.find(
          (t) =>
            (currentUser?.email && t.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
            (currentUser?.nip && t.nip === currentUser.nip) ||
            (currentUser?.name && t.name?.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
        )?.id;

      const authCheck = assertTeacherScoreAccess(
        role,
        effectiveTeacherId,
        teacherAssignments,
        existing,
        activeAcademicYear
      );

      if (!authCheck.allowed) {
        console.error('[SECURITY BLOCK deleteScore]', authCheck.reason);
        throw new Error(authCheck.reason || 'Akses Ditolak: Penugasan tidak sah.');
      }
    }

    setScores(prev => prev.filter(s => s.id !== id));
    await deleteDocument('scores', id);
  };

  // 9. Academic Settings Actions
  // CRITICAL GUARD: Academic setting changes MUST NEVER modify student scores.
  // Completely isolated update path guaranteeing student scores remain 100% independent.
  const getAcademicSetting = (academicYearId: string, semester: 'Ganjil' | 'Genap'): AcademicSetting => {
    const ayObj = academicYears.find(ay => ay.id === academicYearId || ay.name === academicYearId);
    const targetId = ayObj ? ayObj.id : academicYearId;
    const targetName = ayObj ? ayObj.name : academicYearId;

    const found = academicSettings.find(
      s =>
        (s.academicYearId === targetId ||
         s.academicYearId === targetName ||
         s.id === `as_${targetId}_${semester}` ||
         s.id === `as_${targetName}_${semester}`) &&
        s.semester === semester
    );
    if (found) return found;
    return createDefaultAcademicSetting(targetId, semester);
  };

  const saveAcademicSetting = async (
    data: AcademicSetting,
    updatedByName: string,
    changeNotes?: string[]
  ) => {
    const existingIdx = academicSettings.findIndex(
      s => s.id === data.id || (s.academicYearId === data.academicYearId && s.semester === data.semester)
    );

    const prevSetting = existingIdx >= 0 ? academicSettings[existingIdx] : undefined;
    const newVersion = prevSetting ? (prevSetting.version || 1) + 1 : (data.version || 1);

    const nowIso = new Date().toISOString();
    const settingToSave: AcademicSetting = {
      ...data,
      id: data.id || `as_${data.academicYearId}_${data.semester}`,
      version: newVersion,
      updatedAt: nowIso,
      updatedBy: updatedByName,
      status: 'Aktif'
    };

    // Create Audit Log
    const logItem: AcademicSettingLog = {
      id: `aslog_${Date.now()}`,
      settingId: settingToSave.id,
      academicYearId: settingToSave.academicYearId,
      semester: settingToSave.semester,
      version: newVersion,
      updatedAt: nowIso,
      updatedBy: updatedByName,
      changes: changeNotes && changeNotes.length > 0 ? changeNotes : ['Pembaruan konfigurasi penilaian akademik'],
      previousState: prevSetting,
      newState: settingToSave
    };

    setAcademicSettings(prev => {
      const next = [...prev];
      if (existingIdx >= 0) {
        next[existingIdx] = settingToSave;
      } else {
        next.push(settingToSave);
      }
      return next;
    });

    setAcademicSettingLogs(prev => [logItem, ...prev]);

    await Promise.all([
      saveDocument('academicSettings', settingToSave),
      saveDocument('academicSettingLogs', logItem)
    ]);
  };

  // 10. Report Cards & Attendance Actions
  const saveReportCard = async (data: ReportCard) => {
    setReportCards(prev => {
      const idx = prev.findIndex(r => r.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('reportCards', data);
  };

  const saveAttendance = async (data: Attendance) => {
    setAttendance(prev => {
      const idx = prev.findIndex(a => a.id === data.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = data;
        return next;
      }
      return [data, ...prev];
    });
    await saveDocument('attendance', data);
  };

  return (
    <MasterDataContext.Provider
      value={{
        academicYears,
        activeAcademicYear,
        teachers,
        classes,
        students,
        subjects,
        teacherAssignments,
        users,
        scores,
        academicSettings,
        academicSettingLogs,
        reportCards,
        attendance,
        loading,
        saveAcademicYear,
        setActiveAcademicYear,
        saveTeacher,
        toggleTeacherStatus,
        saveStudent,
        updateStudentStatus,
        saveClass,
        toggleActiveClass,
        saveSubject,
        toggleSubjectStatus,
        saveTeacherAssignment,
        saveUser,
        toggleUserStatus,
        deleteUser,
        saveScore,
        deleteScore,
        saveReportCard,
        saveAttendance,
        getAcademicSetting,
        saveAcademicSetting,
        refreshAll
      }}
    >
      {children}
    </MasterDataContext.Provider>
  );
};

export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
};
