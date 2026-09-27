import React, { useState, useMemo, useEffect } from 'react';
import {
  KesantrianRecord,
  KesantrianViolationCategory,
  KesantrianViolationLevel,
  KesantrianViolationStatus,
  KesantrianFollowUp,
  Student,
  getKesantrianOfficerLabel,
  isKepalaKesantrianUser,
} from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Plus,
  Search,
  Edit2,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Settings,
  History,
  MessageSquarePlus,
  RotateCcw,
  Phone,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const VIOLATION_LEVELS: KesantrianViolationLevel[] = ['Ringan', 'Sedang', 'Berat'];
const VIOLATION_STATUSES: KesantrianViolationStatus[] = [
  'Belum Ditangani',
  'Dalam Pembinaan',
  'Selesai',
];

const QUICK_ACTION_SUGGESTIONS = [
  'Teguran',
  'Nasihat',
  'Pembinaan pribadi',
  'Pemanggilan wali santri',
  'Surat peringatan',
];

export const PelanggaranSantriSection: React.FC = () => {
  const { currentUser, role } = useAuth();
  const {
    students = [],
    classes = [],
    academicYears = [],
    activeAcademicYear,
    kesantrianRecords = [],
    kesantrianViolationCategories = [],
    saveKesantrianRecord,
    deleteKesantrianRecord,
    restoreKesantrianRecord,
    saveKesantrianViolationCategory,
    deleteKesantrianViolationCategory,
  } = useMasterData();

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
  const currentActorId = currentUser?.id || currentUser?.uid || currentUser?.username || 'kesantrian';
  const currentActorName =
    currentUser?.displayName || currentUser?.name || currentUser?.username || 'Petugas Kesantrian';
  const currentOfficerLabel = getKesantrianOfficerLabel(currentUser);
  const isKepalaKesantrian = isKepalaKesantrianUser(currentUser);

  // Helper: Class name from Master Data Kelas
  const getClassName = (classId?: string) => {
    if (!classId) return '-';
    const found = classes.find((c) => c && c.id === classId);
    return found ? found.name : classId;
  };

  // Helper: NIS/NISN label from Master Data Siswa
  const formatNisOrNisn = (
    st?: Partial<Student> | null,
    fallbackNisn?: string,
    fallbackNis?: string
  ) => {
    const nisnVal = st?.nisn || fallbackNisn || '';
    const nisVal = st?.nis || fallbackNis || '';
    if (nisnVal && nisnVal !== '-') return `NISN: ${nisnVal}`;
    if (nisVal && nisVal !== '-') return `NIS: ${nisVal}`;
    return 'NISN: -';
  };

  // Resolve student & guardian info directly from Master Data Siswa via studentId
  const resolveStudentFromMaster = (rec: KesantrianRecord) => {
    const masterStudent = students.find((s) => s && s.id === rec.studentId);
    const classId = masterStudent?.classId || rec.classId || '';
    const className = classId ? getClassName(classId) : rec.className || '-';
    const name = masterStudent?.name || rec.studentName || '-';
    const nis = masterStudent?.nis || rec.nis || '-';
    const nisn = masterStudent?.nisn || rec.nisn || '-';
    const nisnLabel = formatNisOrNisn(masterStudent, rec.nisn, rec.nis);
    const status = masterStudent?.status || 'Aktif';
    const isInactive = Boolean(masterStudent && masterStudent.status !== 'Aktif');

    return {
      masterStudent,
      studentId: rec.studentId,
      name,
      nis,
      nisn,
      nisnLabel,
      classId,
      className,
      status,
      isInactive,
      parentName: masterStudent?.parentName || '-',
      parentPhone: masterStudent?.parentPhone || '-',
      address: masterStudent?.address || '-',
    };
  };

  // Active students only for creating new records
  const activeStudentsList = useMemo(() => {
    return students
      .filter((s) => s && s.status === 'Aktif')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [students]);

  // Active & all violation records
  const allViolationRecords = useMemo(
    () => kesantrianRecords.filter((r) => r.type === 'PELANGGARAN'),
    [kesantrianRecords]
  );

  const activeViolationRecords = useMemo(
    () => allViolationRecords.filter((r) => !r.isDeleted),
    [allViolationRecords]
  );

  const deletedViolationRecords = useMemo(
    () => allViolationRecords.filter((r) => r.isDeleted),
    [allViolationRecords]
  );

  // Requirement 2: Summary metrics from real data (no dummy numbers)
  const summaryStats = useMemo(() => {
    const total = activeViolationRecords.length;
    const todayCount = activeViolationRecords.filter((r) => r.date === todayStr).length;
    const monthCount = activeViolationRecords.filter((r) =>
      (r.date || '').startsWith(currentMonthPrefix)
    ).length;
    const uniqueStudentsCount = new Set(activeViolationRecords.map((r) => r.studentId)).size;
    const unhandledCount = activeViolationRecords.filter(
      (r) => (r.status || 'Belum Ditangani') === 'Belum Ditangani'
    ).length;

    return {
      total,
      todayCount,
      monthCount,
      uniqueStudentsCount,
      unhandledCount,
    };
  }, [activeViolationRecords, todayStr, currentMonthPrefix]);

  // Requirement 11: Search & Filters (default academicYear & semester follow active period)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [filterAcademicYearName, setFilterAcademicYearName] = useState<string>(
    activeAcademicYear?.name || 'ALL'
  );
  const [filterSemester, setFilterSemester] = useState<string>(
    activeAcademicYear?.semester || 'ALL'
  );
  const [showDeletedArchive, setShowDeletedArchive] = useState(false);

  // Sync default filter when activeAcademicYear loads
  useEffect(() => {
    if (activeAcademicYear?.name) {
      setFilterAcademicYearName(activeAcademicYear.name);
    }
    if (activeAcademicYear?.semester) {
      setFilterSemester(activeAcademicYear.semester);
    }
  }, [activeAcademicYear?.id, activeAcademicYear?.name, activeAcademicYear?.semester]);

  // Unique academic year names for filter
  const academicYearNames = useMemo(() => {
    const names = Array.from(new Set(academicYears.map((ay) => ay.name).filter(Boolean)));
    return names.length > 0 ? names : ['2025/2026', '2026/2027'];
  }, [academicYears]);

  // Helper to resolve violation category name & level from record
  const getViolationCategoryName = (rec: KesantrianRecord) => {
    if (rec.violationCategoryName) return rec.violationCategoryName;
    if (rec.violationCategoryId) {
      const found = kesantrianViolationCategories.find((c) => c.id === rec.violationCategoryId);
      if (found) return found.name;
    }
    return rec.category || 'Kedisiplinan';
  };

  const getViolationLevel = (rec: KesantrianRecord): KesantrianViolationLevel => {
    if (
      rec.violationLevel === 'Ringan' ||
      rec.violationLevel === 'Sedang' ||
      rec.violationLevel === 'Berat'
    ) {
      return rec.violationLevel;
    }
    if (rec.category === 'Ringan' || rec.category === 'Sedang' || rec.category === 'Berat') {
      return rec.category;
    }
    return 'Ringan';
  };

  const getViolationStatus = (rec: KesantrianRecord): string => {
    return rec.status || 'Belum Ditangani';
  };

  // Filtered records list
  const filteredRecords = useMemo(() => {
    const sourceList = showDeletedArchive ? deletedViolationRecords : activeViolationRecords;
    const q = searchQuery.trim().toLowerCase();

    return sourceList.filter((rec) => {
      const resolved = resolveStudentFromMaster(rec);
      const catName = getViolationCategoryName(rec);
      const lvl = getViolationLevel(rec);
      const st = getViolationStatus(rec);

      const matchesSearch =
        !q ||
        resolved.name.toLowerCase().includes(q) ||
        resolved.nis.toLowerCase().includes(q) ||
        resolved.nisn.toLowerCase().includes(q) ||
        (rec.description || '').toLowerCase().includes(q) ||
        (rec.title || '').toLowerCase().includes(q);

      const matchesClass = filterClassId === 'ALL' || resolved.classId === filterClassId;
      const matchesCategory =
        filterCategory === 'ALL' || catName.toLowerCase() === filterCategory.toLowerCase();
      const matchesLevel = filterLevel === 'ALL' || lvl === filterLevel;
      const matchesStatus = filterStatus === 'ALL' || st === filterStatus;
      const matchesDate = !filterDate || rec.date === filterDate;
      const matchesYear =
        filterAcademicYearName === 'ALL' || rec.academicYearName === filterAcademicYearName;
      const matchesSemester = filterSemester === 'ALL' || rec.semester === filterSemester;

      return (
        matchesSearch &&
        matchesClass &&
        matchesCategory &&
        matchesLevel &&
        matchesStatus &&
        matchesDate &&
        matchesYear &&
        matchesSemester
      );
    });
  }, [
    showDeletedArchive,
    deletedViolationRecords,
    activeViolationRecords,
    searchQuery,
    filterClassId,
    filterCategory,
    filterLevel,
    filterStatus,
    filterDate,
    filterAcademicYearName,
    filterSemester,
    students,
    classes,
    kesantrianViolationCategories,
  ]);

  // Pagination (10 per page)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterClassId,
    filterCategory,
    filterLevel,
    filterStatus,
    filterDate,
    filterAcademicYearName,
    filterSemester,
    showDeletedArchive,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  // Notices & Errors
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================================================================
  // MODAL 1: FORM CATAT / EDIT PELANGGARAN (Requirement 3, 4, 5, 6, 7, 8, 9, 19)
  // =========================================================================
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<KesantrianRecord | null>(null);
  const [studentPickerQuery, setStudentPickerQuery] = useState('');

  const activeCategories = useMemo(
    () => kesantrianViolationCategories.filter((c) => c.isActive !== false),
    [kesantrianViolationCategories]
  );

  const [formState, setFormState] = useState({
    id: '',
    studentId: '',
    date: todayStr,
    incidentTime: '',
    violationCategoryId: '',
    violationCategoryName: 'Kedisiplinan',
    violationLevel: 'Ringan' as KesantrianViolationLevel,
    description: '',
    actionTaken: '',
    status: 'Belum Ditangani' as KesantrianViolationStatus,
    additionalNotes: '',
    parentContacted: false,
    parentContactNote: '',
    academicYearId: activeAcademicYear?.id || academicYears[0]?.id || 'ay_2026_2027_1',
    semester: (activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap',
  });

  const filteredActiveStudentsForPicker = useMemo(() => {
    const q = studentPickerQuery.trim().toLowerCase();
    if (!q) return activeStudentsList;
    return activeStudentsList.filter((st) => {
      const clsName = getClassName(st.classId).toLowerCase();
      return (
        (st.name || '').toLowerCase().includes(q) ||
        (st.nisn || '').toLowerCase().includes(q) ||
        (st.nis || '').toLowerCase().includes(q) ||
        clsName.includes(q)
      );
    });
  }, [activeStudentsList, studentPickerQuery, classes]);

  const handleOpenCreateModal = (preselectedStudentId?: string) => {
    const defaultCat = activeCategories[0] || {
      id: 'vcat_kedisiplinan',
      name: 'Kedisiplinan',
    };
    const validPreselected =
      preselectedStudentId && activeStudentsList.some((s) => s.id === preselectedStudentId)
        ? preselectedStudentId
        : '';

    setEditingRecord(null);
    setStudentPickerQuery('');
    setFormError('');
    setFormState({
      id: `ks_pelanggaran_${Date.now()}`,
      studentId: validPreselected,
      date: todayStr,
      incidentTime: new Date().toTimeString().slice(0, 5),
      violationCategoryId: defaultCat.id,
      violationCategoryName: defaultCat.name,
      violationLevel: 'Ringan',
      description: '',
      actionTaken: '',
      status: 'Belum Ditangani',
      additionalNotes: '',
      parentContacted: false,
      parentContactNote: '',
      academicYearId: activeAcademicYear?.id || academicYears[0]?.id || 'ay_2026_2027_1',
      semester: (activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (rec: KesantrianRecord) => {
    const catName = getViolationCategoryName(rec);
    const matchedCat = kesantrianViolationCategories.find(
      (c) => c.id === rec.violationCategoryId || c.name.toLowerCase() === catName.toLowerCase()
    );

    setEditingRecord(rec);
    setStudentPickerQuery('');
    setFormError('');
    setFormState({
      id: rec.id,
      studentId: rec.studentId,
      date: rec.date || todayStr,
      incidentTime: rec.incidentTime || '',
      violationCategoryId: matchedCat?.id || rec.violationCategoryId || '',
      violationCategoryName: matchedCat?.name || catName,
      violationLevel: getViolationLevel(rec),
      description: rec.description || rec.title || '',
      actionTaken: rec.actionTaken || '',
      status: (getViolationStatus(rec) as KesantrianViolationStatus) || 'Belum Ditangani',
      additionalNotes: rec.additionalNotes || '',
      parentContacted: Boolean(rec.parentContacted),
      parentContactNote: rec.parentContactNote || '',
      academicYearId: rec.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: (rec.semester || activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap',
    });
    setIsFormOpen(true);
  };

  // Requirement 19: Validation & Save
  const handleSaveViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formState.studentId) {
      setFormError('Santri wajib dipilih dari Master Data Siswa.');
      return;
    }

    const studentObj = students.find((s) => s.id === formState.studentId);
    if (!studentObj) {
      setFormError('Data santri tidak ditemukan pada Master Data Siswa.');
      return;
    }

    if (!editingRecord && studentObj.status !== 'Aktif') {
      setFormError(
        `Santri "${studentObj.name}" berstatus ${studentObj.status}. Hanya santri AKTIF yang dapat dipilih untuk mencatat pelanggaran baru.`
      );
      return;
    }

    if (!formState.date || isNaN(new Date(formState.date).getTime())) {
      setFormError('Tanggal kejadian wajib diisi dengan format tanggal yang valid.');
      return;
    }

    if (!formState.violationCategoryName.trim()) {
      setFormError('Jenis pelanggaran wajib dipilih.');
      return;
    }

    if (!formState.violationLevel) {
      setFormError('Tingkat pelanggaran (Ringan/Sedang/Berat) wajib dipilih.');
      return;
    }

    if (!formState.description.trim()) {
      setFormError('Kronologi / Keterangan pelanggaran wajib diisi.');
      return;
    }

    const ayObj =
      academicYears.find((ay) => ay.id === formState.academicYearId) || activeAcademicYear;
    const nowIso = new Date().toISOString();

    const payload: KesantrianRecord = {
      id: formState.id || `ks_pelanggaran_${Date.now()}`,
      type: 'PELANGGARAN',
      studentId: studentObj.id,
      date: formState.date,
      incidentTime: formState.incidentTime.trim() || undefined,
      semester: formState.semester,
      academicYearId: ayObj?.id || formState.academicYearId,
      academicYearName: ayObj?.name || filterAcademicYearName !== 'ALL' ? filterAcademicYearName : '2026/2027',
      violationCategoryId: formState.violationCategoryId || undefined,
      violationCategoryName: formState.violationCategoryName.trim(),
      violationLevel: formState.violationLevel,
      category: formState.violationCategoryName.trim(),
      title: `${formState.violationCategoryName.trim()} (${formState.violationLevel})`,
      description: formState.description.trim(),
      actionTaken: formState.actionTaken.trim(),
      status: formState.status,
      additionalNotes: formState.additionalNotes.trim() || undefined,
      parentContacted: formState.parentContacted,
      parentContactNote: formState.parentContactNote.trim() || undefined,
      followUps: editingRecord?.followUps || [],
      recordedByUserId: editingRecord?.recordedByUserId || currentActorId,
      recordedByName: editingRecord?.recordedByName || currentActorName,
      recordedByRole: editingRecord?.recordedByRole || currentOfficerLabel,
      createdBy: editingRecord?.createdBy || currentActorId,
      createdByName: editingRecord?.createdByName || editingRecord?.recordedByName || currentActorName,
      createdByRole: editingRecord?.createdByRole || editingRecord?.recordedByRole || currentOfficerLabel,
      createdAt: editingRecord?.createdAt || nowIso,
      updatedBy: currentActorId,
      updatedByName: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: nowIso,
      isDeleted: false,
    };

    try {
      setIsSubmitting(true);
      await saveKesantrianRecord(payload);
      setIsFormOpen(false);
      setNotice(
        editingRecord
          ? `Catatan pelanggaran santri ${studentObj.name} berhasil diperbarui.`
          : `Catatan pelanggaran santri ${studentObj.name} (Kelas ${getClassName(studentObj.classId)}) berhasil disimpan.`
      );
      setTimeout(() => setNotice(''), 4500);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan catatan pelanggaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // MODAL 2: DETAIL PELANGGARAN & CATATAN PEMBINAAN BERKELANJUTAN (Req 12, 14, 15)
  // =========================================================================
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null);
  const detailRecord = useMemo(
    () => allViolationRecords.find((r) => r.id === detailRecordId) || null,
    [allViolationRecords, detailRecordId]
  );

  const [followUpDate, setFollowUpDate] = useState(todayStr);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpError, setFollowUpError] = useState('');

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRecord) return;
    if (!followUpNote.trim()) {
      setFollowUpError('Catatan pembinaan tindak lanjut wajib diisi.');
      return;
    }
    if (!followUpDate || isNaN(new Date(followUpDate).getTime())) {
      setFollowUpError('Tanggal tindak lanjut tidak valid.');
      return;
    }

    const newFollowUp: KesantrianFollowUp = {
      id: `fu_${Date.now()}`,
      date: followUpDate,
      time: new Date().toTimeString().slice(0, 5),
      note: followUpNote.trim(),
      actionType: isKepalaKesantrian ? 'Evaluasi Kepala Kesantrian' : 'Tindak Lanjut Musyrif',
      createdBy: currentActorName,
      createdByRole: currentOfficerLabel,
      createdByUserId: currentUser?.id || currentUser?.uid,
      createdAt: new Date().toISOString(),
    };

    const updatedRecord: KesantrianRecord = {
      ...detailRecord,
      followUps: [...(detailRecord.followUps || []), newFollowUp],
      updatedBy: currentActorName,
      updatedByRole: currentOfficerLabel,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      setFollowUpError('');
      await saveKesantrianRecord(updatedRecord);
      setFollowUpNote('');
      setNotice('Catatan tindak lanjut pembinaan berhasil ditambahkan.');
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setFollowUpError(err?.message || 'Gagal menyimpan tindak lanjut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (
    rec: KesantrianRecord,
    nextStatus: KesantrianViolationStatus
  ) => {
    const updatedRecord: KesantrianRecord = {
      ...rec,
      status: nextStatus,
      updatedBy: currentActorName,
      updatedAt: new Date().toISOString(),
    };
    await saveKesantrianRecord(updatedRecord);
    setNotice(`Status penanganan diperbarui menjadi "${nextStatus}".`);
    setTimeout(() => setNotice(''), 3500);
  };

  // =========================================================================
  // MODAL 3: RIWAYAT PER SANTRI (Requirement 13 — Tanpa Ranking!)
  // =========================================================================
  const [historyStudentId, setHistoryStudentId] = useState<string>('');
  const [isStudentHistoryOpen, setIsStudentHistoryOpen] = useState(false);

  const studentHistoryData = useMemo(() => {
    if (!historyStudentId) return null;
    const st = students.find((s) => s.id === historyStudentId);
    const records = activeViolationRecords
      .filter((r) => r.studentId === historyStudentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const ringanCount = records.filter((r) => getViolationLevel(r) === 'Ringan').length;
    const sedangCount = records.filter((r) => getViolationLevel(r) === 'Sedang').length;
    const beratCount = records.filter((r) => getViolationLevel(r) === 'Berat').length;

    return {
      student: st,
      name: st?.name || records[0]?.studentName || '-',
      nisnLabel: formatNisOrNisn(st, records[0]?.nisn, records[0]?.nis),
      className: st ? getClassName(st.classId) : records[0]?.className || '-',
      status: st?.status || 'Aktif',
      total: records.length,
      ringanCount,
      sedangCount,
      beratCount,
      records,
    };
  }, [historyStudentId, students, classes, activeViolationRecords]);

  // =========================================================================
  // MODAL 4: KELOLA KATEGORI PELANGGARAN (Requirement 6 — Admin Only)
  // =========================================================================
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KesantrianViolationCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    description: '',
    isActive: true,
  });
  const [categoryNotice, setCategoryNotice] = useState('');

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    setIsSubmitting(true);
    try {
      await saveKesantrianViolationCategory({
        id: categoryForm.id || `vcat_${Date.now()}`,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        isActive: categoryForm.isActive,
      });
      setEditingCategory(null);
      setCategoryForm({ id: '', name: '', description: '', isActive: true });
      setCategoryNotice('Kategori pelanggaran berhasil disimpan.');
      setTimeout(() => setCategoryNotice(''), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrDeactivateCategory = async (cat: KesantrianViolationCategory) => {
    const res = await deleteKesantrianViolationCategory(cat.id);
    setCategoryNotice(res.message);
    setTimeout(() => setCategoryNotice(''), 5000);
  };

  // =========================================================================
  // MODAL 5: KONFIRMASI HAPUS (SOFT DELETE - Requirement 18)
  // =========================================================================
  const [recordToDelete, setRecordToDelete] = useState<KesantrianRecord | null>(null);

  const handleConfirmSoftDelete = async () => {
    if (!recordToDelete) return;
    await deleteKesantrianRecord(recordToDelete.id);
    const resolved = resolveStudentFromMaster(recordToDelete);
    setRecordToDelete(null);
    setNotice(
      `Catatan pelanggaran santri ${resolved.name} telah dihapus dari daftar aktif (tersimpan di arsip audit Admin).`
    );
    setTimeout(() => setNotice(''), 4500);
  };

  const getLevelBadgeClass = (level: KesantrianViolationLevel) => {
    switch (level) {
      case 'Berat':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Sedang':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Ringan':
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Dalam Pembinaan':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Belum Ditangani':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice('')}
            className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          1. HEADER HALAMAN PELANGGARAN SANTRI & TOMBOL AKSI
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
            <span>Pelanggaran Santri</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan dan pemantauan kedisiplinan serta pembinaan santri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Riwayat Per Santri */}
          <button
            type="button"
            onClick={() => {
              if (!historyStudentId && students.length > 0) {
                setHistoryStudentId(students[0].id);
              }
              setIsStudentHistoryOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            <History className="w-4 h-4 text-teal-600" />
            <span>Riwayat Per Santri</span>
          </button>

          {/* Tombol Kelola Kategori Pelanggaran (Admin & Kepala Kesantrian) */}
          {(role === 'ADMIN' || isKepalaKesantrian) && (
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ id: '', name: '', description: '', isActive: true });
                setIsCategoryModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Kategori Pelanggaran</span>
            </button>
          )}

          {/* Tombol Utama: + Catat Pelanggaran (Requirement 3) */}
          <button
            type="button"
            id="btn-catat-pelanggaran"
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pelanggaran</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. DASHBOARD RINGKAS PELANGGARAN (5 Kartu Ringkasan Data Sebenarnya)
         ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Pelanggaran</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summaryStats.total}</span>
            <span className="text-[11px] text-slate-400">Catatan</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Pelanggaran Hari Ini</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-700">{summaryStats.todayCount}</span>
            <span className="text-[11px] text-slate-400">{todayStr}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Pelanggaran Bulan Ini</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700">{summaryStats.monthCount}</span>
            <span className="text-[11px] text-slate-400">Bulan berjalan</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Santri Terlibat</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">
              {summaryStats.uniqueStudentsCount}
            </span>
            <span className="text-[11px] text-slate-400">Santri</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold text-rose-700">
            Pelanggaran Belum Ditindaklanjuti
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{summaryStats.unhandledCount}</span>
            <span className="text-[11px] text-rose-500 font-medium">Belum Ditangani</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          11. PENCARIAN DAN FILTER LENGKAP
         ===================================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Nama Santri / NIS / NISN */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama santri, NIS/NISN, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setShowDeletedArchive((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  showDeletedArchive
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {showDeletedArchive
                  ? `Menampilkan Arsip Dihapus (${deletedViolationRecords.length})`
                  : `Arsip Dihapus (${deletedViolationRecords.length})`}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterClassId('ALL');
                setFilterCategory('ALL');
                setFilterLevel('ALL');
                setFilterStatus('ALL');
                setFilterDate('');
                setFilterAcademicYearName('ALL');
                setFilterSemester('ALL');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Grid Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Kelas
            </label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Jenis Pelanggaran
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Jenis</option>
              {kesantrianViolationCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Tingkat
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Tingkat</option>
              {VIOLATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Status</option>
              {VIOLATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Tahun Ajaran
            </label>
            <select
              value={filterAcademicYearName}
              onChange={(e) => setFilterAcademicYearName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua TA</option>
              {academicYearNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Semester
            </label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Semester</option>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================================
          10. DAFTAR RIWAYAT PELANGGARAN (Tabel & Pagination)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10">No</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Santri</th>
                <th className="py-3 px-3">Kelas</th>
                <th className="py-3 px-3">Jenis</th>
                <th className="py-3 px-3">Tingkat</th>
                <th className="py-3 px-3">Keterangan</th>
                <th className="py-3 px-3">Tindakan</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Petugas</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map((rec, index) => {
                const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                const resolved = resolveStudentFromMaster(rec);
                const catName = getViolationCategoryName(rec);
                const level = getViolationLevel(rec);
                const status = getViolationStatus(rec);
                const followUpCount = (rec.followUps || []).length;

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono text-slate-400">{rowNumber}</td>
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{rec.date}</div>
                      {rec.incidentTime && (
                        <div className="text-[10px] text-slate-400">Pukul {rec.incidentTime}</div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {rec.academicYearName} &bull; {rec.semester}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryStudentId(rec.studentId);
                          setIsStudentHistoryOpen(true);
                        }}
                        className="text-left group cursor-pointer"
                        title="Klik untuk melihat seluruh riwayat pelanggaran santri ini"
                      >
                        <div className="font-semibold text-slate-900 group-hover:text-teal-700 flex items-center gap-1.5">
                          <span>{resolved.name}</span>
                          {resolved.isInactive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              {resolved.status}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {resolved.nisnLabel}
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        Kelas {resolved.className}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{catName}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getLevelBadgeClass(
                          level
                        )}`}
                      >
                        {level}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-slate-800 line-clamp-2">
                        {rec.description || rec.title || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-slate-700 line-clamp-2">
                        {rec.actionTaken || <span className="text-slate-400 italic">-</span>}
                      </div>
                      {followUpCount > 0 && (
                        <div className="text-[10px] font-semibold text-teal-700 mt-0.5">
                          +{followUpCount} Tindak Lanjut Pembinaan
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-700">
                        {rec.createdByName || rec.recordedByName || rec.createdBy || 'Petugas'}
                      </div>
                      <div className="text-[10px] font-semibold text-teal-700">
                        {rec.createdByRole || rec.recordedByRole || 'Petugas Kesantrian'}
                      </div>
                      {rec.updatedBy && rec.updatedAt !== rec.createdAt && (
                        <div className="text-[10px] text-slate-400">
                          Diubah: {rec.updatedByName || rec.updatedBy}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailRecordId(rec.id);
                            setFollowUpNote('');
                            setFollowUpError('');
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                          title="Lihat Detail Pelanggaran"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>

                        {!rec.isDeleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(rec)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition inline-flex items-center gap-1 cursor-pointer"
                              title="Edit Catatan Pelanggaran"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecordToDelete(rec)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition inline-flex items-center gap-1 cursor-pointer"
                              title="Hapus Catatan Pelanggaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </>
                        ) : (
                          role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => restoreKesantrianRecord(rec.id)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition inline-flex items-center gap-1 cursor-pointer"
                              title="Pulihkan Catatan"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Pulihkan</span>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    {showDeletedArchive
                      ? 'Tidak ada arsip catatan pelanggaran yang dihapus.'
                      : 'Belum ada data pelanggaran santri yang sesuai dengan filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredRecords.length > PAGE_SIZE && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} dari{' '}
              <strong>{filteredRecords.length}</strong> catatan
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Sebelumnya
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Halaman {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
              >
                Berikutnya
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL 1: FORM CATAT / EDIT PELANGGARAN (A s/d K)
         ===================================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden my-6">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingRecord ? 'Edit Catatan Pelanggaran Santri' : 'Catat Pelanggaran Santri'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Data santri &amp; kelas terhubung otomatis dari Master Data Siswa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveViolation}
              className="p-4 sm:p-5 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* A. Santri * (Mengambil langsung dari MASTER DATA SISWA Aktif) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="violation-student-select" className="font-semibold text-slate-700">
                    A. Santri <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-teal-700 font-medium">
                    Master Data Siswa Aktif ({activeStudentsList.length} santri)
                  </span>
                </div>

                {!editingRecord && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentPickerQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudentPickerQuery(val);
                        const q = val.trim().toLowerCase();
                        if (q) {
                          const firstMatch = activeStudentsList.find((st) => {
                            const clsName = getClassName(st.classId).toLowerCase();
                            return (
                              (st.name || '').toLowerCase().includes(q) ||
                              (st.nisn || '').toLowerCase().includes(q) ||
                              (st.nis || '').toLowerCase().includes(q) ||
                              clsName.includes(q)
                            );
                          });
                          if (firstMatch) {
                            setFormState((prev) => ({ ...prev, studentId: firstMatch.id }));
                          }
                        }
                      }}
                      placeholder="Cari Nama Santri, NIS/NISN, atau Kelas..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                )}

                <select
                  id="violation-student-select"
                  aria-label="Pilih Santri"
                  value={formState.studentId}
                  onChange={(e) => setFormState({ ...formState, studentId: e.target.value })}
                  disabled={Boolean(editingRecord)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:bg-slate-50"
                  required
                >
                  <option value="">-- Pilih Santri Aktif --</option>
                  {filteredActiveStudentsForPicker.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {formatNisOrNisn(st)} — Kelas {getClassName(st.classId)}
                    </option>
                  ))}
                  {editingRecord &&
                    !activeStudentsList.some((s) => s.id === editingRecord.studentId) && (() => {
                      const archived = resolveStudentFromMaster(editingRecord);
                      return (
                        <option value={editingRecord.studentId}>
                          {archived.name} — {archived.nisnLabel} — Kelas {archived.className} (Nonaktif)
                        </option>
                      );
                    })()}
                </select>

                {/* Preview Format: Nama Santri, NIS/NISN, Kelas */}
                {formState.studentId && (() => {
                  const selectedSt = students.find((s) => s.id === formState.studentId);
                  const dispName = selectedSt?.name || editingRecord?.studentName || '-';
                  const dispNisn = formatNisOrNisn(
                    selectedSt,
                    editingRecord?.nisn,
                    editingRecord?.nis
                  );
                  const dispClass = selectedSt
                    ? getClassName(selectedSt.classId)
                    : editingRecord?.className || '-';
                  return (
                    <div className="p-2.5 bg-teal-50/60 border border-teal-200 rounded-xl flex items-center justify-between">
                      <div className="leading-snug">
                        <div className="font-bold text-slate-900">{dispName}</div>
                        <div className="font-mono text-[11px] text-slate-700">{dispNisn}</div>
                        <div className="font-semibold text-[11px] text-teal-700">
                          Kelas {dispClass}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-teal-700 border border-teal-200">
                        Master Siswa
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* B. Tanggal Kejadian *, C. Waktu Kejadian, D. Kelas (Otomatis) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    B. Tanggal Kejadian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formState.date}
                    onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    C. Waktu Kejadian
                  </label>
                  <input
                    type="time"
                    value={formState.incidentTime}
                    onChange={(e) => setFormState({ ...formState, incidentTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    D. Kelas (Otomatis)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={(() => {
                      const st = students.find((s) => s.id === formState.studentId);
                      return st
                        ? `Kelas ${getClassName(st.classId)}`
                        : editingRecord?.className
                        ? `Kelas ${editingRecord.className}`
                        : 'Otomatis sesuai santri';
                    })()}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* E. Jenis Pelanggaran * & F. Tingkat Pelanggaran * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    E. Jenis Pelanggaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formState.violationCategoryName}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matched = kesantrianViolationCategories.find(
                        (c) => c.name === selectedName
                      );
                      setFormState({
                        ...formState,
                        violationCategoryId: matched?.id || '',
                        violationCategoryName: selectedName,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  >
                    {activeCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {editingRecord &&
                      !activeCategories.some(
                        (c) => c.name === formState.violationCategoryName
                      ) && (
                        <option value={formState.violationCategoryName}>
                          {formState.violationCategoryName} (Kategori Nonaktif)
                        </option>
                      )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    F. Tingkat Pelanggaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formState.violationLevel}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        violationLevel: e.target.value as KesantrianViolationLevel,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  >
                    {VIOLATION_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* G. Kronologi / Keterangan * */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  G. Kronologi / Keterangan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Tuliskan kronologi atau keterangan lengkap kejadian pelanggaran..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              {/* H. Tindakan / Pembinaan */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="font-semibold text-slate-700">H. Tindakan / Pembinaan</label>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_ACTION_SUGGESTIONS.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            actionTaken: prev.actionTaken
                              ? `${prev.actionTaken}, ${item}`
                              : item,
                          }))
                        }
                        className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition cursor-pointer"
                      >
                        +{item}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={formState.actionTaken}
                  onChange={(e) => setFormState({ ...formState, actionTaken: e.target.value })}
                  placeholder="Contoh: Teguran lisan, nasihat pribadi, pemanggilan wali santri, atau tindakan pembinaan lainnya..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* I. Status Penanganan & K. Petugas Pencatat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    I. Status Penanganan
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        status: e.target.value as KesantrianViolationStatus,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {VIOLATION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    K. Petugas Pencatat
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${
                      editingRecord?.createdByName ||
                      editingRecord?.recordedByName ||
                      currentActorName
                    } (${
                      editingRecord?.createdByRole ||
                      editingRecord?.recordedByRole ||
                      currentOfficerLabel
                    })`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* J. Catatan Tambahan & Komunikasi Wali Santri */}
              <div className="space-y-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    J. Catatan Tambahan
                  </label>
                  <input
                    type="text"
                    value={formState.additionalNotes}
                    onChange={(e) =>
                      setFormState({ ...formState, additionalNotes: e.target.value })
                    }
                    placeholder="Catatan tambahan (opsional)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.parentContacted}
                      onChange={(e) =>
                        setFormState({ ...formState, parentContacted: e.target.checked })
                      }
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-700">
                      Wali Santri telah dihubungi / dipanggil
                    </span>
                  </label>
                  {formState.parentContacted && (
                    <input
                      type="text"
                      value={formState.parentContactNote}
                      onChange={(e) =>
                        setFormState({ ...formState, parentContactNote: e.target.value })
                      }
                      placeholder="Catatan hasil komunikasi / pemanggilan wali santri..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pelanggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: DETAIL PELANGGARAN, DATA WALI, & TINDAK LANJUT PEMBINAAN
         ===================================================================== */}
      {detailRecord && (() => {
        const resolved = resolveStudentFromMaster(detailRecord);
        const catName = getViolationCategoryName(detailRecord);
        const level = getViolationLevel(detailRecord);
        const status = getViolationStatus(detailRecord);
        const followUps = detailRecord.followUps || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Detail Pelanggaran Santri
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Informasi santri, wali, kejadian, audit, dan riwayat pembinaan berkelanjutan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailRecordId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
                {/* Data Santri & Data Wali Santri (Dari Master Data Siswa) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      Data Santri (Master Siswa)
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{resolved.name}</div>
                    <div className="font-mono text-slate-600">{resolved.nisnLabel}</div>
                    <div className="font-semibold text-teal-700">Kelas {resolved.className}</div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Data Wali Santri (Master Siswa)
                    </div>
                    <div className="font-semibold text-slate-900">
                      Wali: {resolved.parentName}
                    </div>
                    <div className="font-mono text-slate-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{resolved.parentPhone}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{resolved.address}</div>
                    {detailRecord.parentContacted && (
                      <div className="pt-1 text-[11px] font-semibold text-emerald-700">
                        ✓ Wali telah dihubungi/dipanggil
                        {detailRecord.parentContactNote
                          ? `: ${detailRecord.parentContactNote}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Data Kejadian */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{catName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getLevelBadgeClass(
                          level
                        )}`}
                      >
                        {level}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Status:</span>
                      <select
                        value={status}
                        onChange={(e) =>
                          handleQuickStatusChange(
                            detailRecord,
                            e.target.value as KesantrianViolationStatus
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${getStatusBadgeClass(
                          status
                        )}`}
                      >
                        {VIOLATION_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-slate-800">
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Tanggal Kejadian</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {detailRecord.date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Waktu Kejadian</span>
                      <span className="font-mono text-slate-800">
                        {detailRecord.incidentTime || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Periode Akademik</span>
                      <span className="text-slate-800">
                        {detailRecord.academicYearName} ({detailRecord.semester})
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] mb-1">
                      Kronologi / Keterangan:
                    </span>
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-800 whitespace-pre-wrap">
                      {detailRecord.description || detailRecord.title || '-'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] mb-1">
                      Tindakan / Pembinaan Awal:
                    </span>
                    <div className="p-2.5 bg-teal-50/50 border border-teal-100 rounded-xl text-teal-900 whitespace-pre-wrap">
                      {detailRecord.actionTaken || '-'}
                    </div>
                  </div>

                  {detailRecord.additionalNotes && (
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-1">
                        Catatan Tambahan:
                      </span>
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700">
                        {detailRecord.additionalNotes}
                      </div>
                    </div>
                  )}

                  {/* Audit Trail */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      Dicatat oleh:{' '}
                      <strong className="text-slate-700">
                        {detailRecord.createdByName ||
                          detailRecord.recordedByName ||
                          detailRecord.createdBy ||
                          '-'}
                      </strong>{' '}
                      <span className="text-teal-700 font-semibold">
                        ({detailRecord.createdByRole || detailRecord.recordedByRole || 'Petugas Kesantrian'})
                      </span>
                      <div className="font-mono text-[10px]">
                        Waktu Pencatatan:{' '}
                        {detailRecord.createdAt
                          ? new Date(detailRecord.createdAt).toLocaleString('id-ID')
                          : detailRecord.date || '-'}
                      </div>
                    </div>
                    <div>
                      Terakhir Diperbarui Oleh:{' '}
                      <strong className="text-slate-700">
                        {detailRecord.updatedByName ||
                          detailRecord.updatedBy ||
                          detailRecord.createdByName ||
                          '-'}
                      </strong>
                      {detailRecord.updatedByRole ? ` (${detailRecord.updatedByRole})` : ''}
                      <div className="font-mono text-[10px]">
                        Waktu Diperbarui:{' '}
                        {detailRecord.updatedAt
                          ? new Date(detailRecord.updatedAt).toLocaleString('id-ID')
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirement 14: Catatan Pembinaan Berkelanjutan (Tindak Lanjut) */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <MessageSquarePlus className="w-4 h-4 text-teal-600" />
                        <span>Catatan Pembinaan Berkelanjutan (Tindak Lanjut)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Satu pelanggaran dapat memiliki beberapa riwayat tindak lanjut pembinaan
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                      {followUps.length} Tindak Lanjut
                    </span>
                  </div>

                          {/* Daftar Riwayat Tindak Lanjut */}
                  {followUps.length > 0 ? (
                    <div className="space-y-2">
                      {followUps.map((fu) => (
                        <div
                          key={fu.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-teal-700">{fu.date}</span>
                              {fu.actionType && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                                  {fu.actionType}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400">
                              Petugas: <strong className="text-slate-700">{fu.createdBy}</strong>
                              {fu.createdByRole ? ` (${fu.createdByRole})` : ''} &bull;{' '}
                              {fu.createdAt
                                ? new Date(fu.createdAt).toLocaleString('id-ID')
                                : ''}
                            </span>
                          </div>
                          <div className="text-slate-800 whitespace-pre-wrap">{fu.note}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
                      Belum ada catatan tindak lanjut pembinaan.
                    </div>
                  )}

                  {/* Form Tambah Tindak Lanjut */}
                  <form onSubmit={handleAddFollowUp} className="pt-2 space-y-2">
                    {followUpError && (
                      <div className="text-[11px] text-rose-600 font-medium">{followUpError}</div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Tanggal Tindak Lanjut
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Catatan Pembinaan ({currentActorName})
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={followUpNote}
                            onChange={(e) => setFollowUpNote(e.target.value)}
                            placeholder="Tuliskan perkembangan / catatan pembinaan lanjutan..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs whitespace-nowrap cursor-pointer"
                          >
                            + Simpan Tindak Lanjut
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const targetStudentId = detailRecord.studentId;
                    setDetailRecordId(null);
                    setHistoryStudentId(targetStudentId);
                    setIsStudentHistoryOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold hover:bg-teal-100 cursor-pointer"
                >
                  Lihat Seluruh Riwayat Santri Ini
                </button>
                <button
                  type="button"
                  onClick={() => setDetailRecordId(null)}
                  className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL 3: RIWAYAT PER SANTRI (Requirement 13 — Tanpa Peringkat/Ranking)
         ===================================================================== */}
      {isStudentHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Riwayat Pelanggaran Per Santri
                </h3>
                <p className="text-[11px] text-slate-400">
                  Rekapitulasi catatan pelanggaran individu berdasarkan tingkat (Ringan, Sedang, Berat)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentHistoryOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Pilih Santri untuk melihat riwayatnya (termasuk siswa nonaktif yang punya riwayat lama) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Santri dari Master Data Siswa
                </label>
                <select
                  value={historyStudentId}
                  onChange={(e) => setHistoryStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {formatNisOrNisn(st)} — Kelas {getClassName(st.classId)}
                      {st.status !== 'Aktif' ? ` (${st.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {studentHistoryData && (
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {studentHistoryData.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-600">
                        {studentHistoryData.nisnLabel} &bull; Kelas {studentHistoryData.className}
                      </div>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Total Pelanggaran
                      </div>
                      <div className="text-xl font-bold text-slate-900">
                        {studentHistoryData.total}
                      </div>
                    </div>
                  </div>

                  {/* Jumlah Berdasarkan Tingkat: Ringan, Sedang, Berat */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-center">
                      <div className="text-[11px] font-semibold text-sky-700">Ringan</div>
                      <div className="text-lg font-bold text-sky-900 mt-0.5">
                        {studentHistoryData.ringanCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <div className="text-[11px] font-semibold text-amber-700">Sedang</div>
                      <div className="text-lg font-bold text-amber-900 mt-0.5">
                        {studentHistoryData.sedangCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                      <div className="text-[11px] font-semibold text-rose-700">Berat</div>
                      <div className="text-lg font-bold text-rose-900 mt-0.5">
                        {studentHistoryData.beratCount}
                      </div>
                    </div>
                  </div>

                  {/* Daftar Riwayat Pelanggaran Santri */}
                  <div className="space-y-2">
                    <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Daftar Riwayat:
                    </div>
                    {studentHistoryData.records.length > 0 ? (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {studentHistoryData.records.map((r) => {
                          const cName = getViolationCategoryName(r);
                          const lvl = getViolationLevel(r);
                          return (
                            <div
                              key={r.id}
                              className="p-3 bg-white hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                            >
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {r.date} &mdash; {cName} &mdash;{' '}
                                  <span className="font-bold">{lvl}</span>
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                  {r.description || r.title}
                                </div>
                                {r.actionTaken && (
                                  <div className="text-[11px] text-teal-700 mt-0.5">
                                    Pembinaan: {r.actionTaken}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`self-start sm:self-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadgeClass(
                                  getViolationStatus(r)
                                )}`}
                              >
                                {getViolationStatus(r)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        Santri ini tidak memiliki riwayat catatan pelanggaran.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStudentHistoryOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: KELOLA KATEGORI PELANGGARAN (Admin & Kepala Kesantrian)
         ===================================================================== */}
      {isCategoryModalOpen && (role === 'ADMIN' || isKepalaKesantrian) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden my-6">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Kelola Master Kategori Pelanggaran
                </h3>
                <p className="text-[11px] text-slate-400">
                  Kategori yang sudah digunakan pada riwayat akan dinonaktifkan (bukan dihapus permanen)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
              {categoryNotice && (
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl">
                  {categoryNotice}
                </div>
              )}

              <form onSubmit={handleSaveCategory} className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">
                  {editingCategory ? `Ubah Kategori: ${editingCategory.name}` : 'Tambah Kategori Baru'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Nama Kategori (misal: Kebersihan)"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, description: e.target.value })
                    }
                    placeholder="Deskripsi singkat..."
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.isActive}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, isActive: e.target.checked })
                      }
                    />
                    <span className="font-medium text-slate-700">Kategori Aktif</span>
                  </label>
                  <div className="flex gap-1.5">
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(null);
                          setCategoryForm({ id: '', name: '', description: '', isActive: true });
                        }}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-600"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3 py-1 rounded-lg bg-teal-600 text-white font-semibold cursor-pointer"
                    >
                      {editingCategory ? 'Simpan Perubahan' : '+ Tambah'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {kesantrianViolationCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-white flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{cat.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            cat.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {cat.isActive !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      {cat.description && (
                        <div className="text-[11px] text-slate-400">{cat.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            id: cat.id,
                            name: cat.name,
                            description: cat.description || '',
                            isActive: cat.isActive !== false,
                          });
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 cursor-pointer"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrDeactivateCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Hapus / Nonaktifkan Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: KONFIRMASI SOFT DELETE CATATAN PELANGGARAN
         ===================================================================== */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Hapus Catatan Pelanggaran?
                </h3>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Catatan pelanggaran ini akan dinonaktifkan (soft delete) dari daftar aktif tanpa menghapus data siswa di Master Data Siswa, dan tetap tercatat pada arsip audit Admin.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Ya, Hapus Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
