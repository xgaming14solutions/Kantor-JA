import React, { useState, useMemo } from 'react';
import {
  KesantrianRecord,
  MabitPeriod,
  Student,
} from '../types';
import { useMasterData } from '../context/MasterDataContext';
import { formatIndonesianDate } from './MabitKepulanganSection';
import {
  FileSpreadsheet,
  Filter,
  Download,
  Printer,
  Search,
  ShieldAlert,
  HeartPulse,
  DoorOpen,
  Moon,
  Pill,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface UnifiedReportEntry {
  id: string;
  sourceRecordId?: string;
  mabitPeriodId?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  month: string; // YYYY-MM or MM
  semester: 'Ganjil' | 'Genap';
  academicYearId: string;
  academicYearName: string;
  studentId: string;
  studentName: string;
  nisnLabel: string;
  classId: string;
  className: string;
  incidentType: 'PELANGGARAN' | 'SAKIT' | 'IZIN_PULANG' | 'MABIT' | 'OBAT_P3K';
  incidentTypeLabel: string;
  category: string;
  title: string;
  description: string;
  actionTaken: string;
  status: string;
  followUpCount: number;
  sickDays?: number;
  needsParentPickup?: boolean;
  estimatedReturnDate?: string;
  conditionAtReturn?: string;
  headEvaluationNote?: string;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
}

interface LaporanKesantrianSectionProps {
  onSelectRecordDetail?: (recordId: string) => void;
  onNavigateToMabit?: () => void;
}

const MONTH_OPTIONS = [
  { value: 'ALL', label: 'Semua Bulan' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export const LaporanKesantrianSection: React.FC<LaporanKesantrianSectionProps> = ({
  onSelectRecordDetail,
  onNavigateToMabit,
}) => {
  const {
    students = [],
    classes = [],
    academicYears = [],
    activeAcademicYear,
    kesantrianRecords = [],
    mabitPeriods = [],
  } = useMasterData();

  // Filter States (Requirement 8: tanggal/periode, bulan, semester, tahun ajaran, kelas, jenis kejadian, status)
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Helper: Class name from Master Data Kelas
  const getClassName = (classId?: string) => {
    if (!classId) return '-';
    const found = classes.find((c) => c && c.id === classId);
    return found ? found.name : classId;
  };

  // Helper: Format NIS/NISN from Master Data Siswa
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

  const INCIDENT_TYPE_LABELS: Record<UnifiedReportEntry['incidentType'], string> = {
    PELANGGARAN: 'Pelanggaran Santri',
    SAKIT: 'Santri Sakit',
    IZIN_PULANG: 'Izin/Pulang Santri',
    MABIT: 'Mabit & Kepulangan',
    OBAT_P3K: 'Obat & P3K',
  };

  // Build unified report entries from all 5 Kesantrian modules connected to Master Data Siswa via studentId
  const unifiedEntries = useMemo<UnifiedReportEntry[]>(() => {
    const list: UnifiedReportEntry[] = [];

    // 1. From kesantrianRecords (Pelanggaran, Sakit, Izin/Pulang, Obat & P3K)
    kesantrianRecords
      .filter((r) => !r.isDeleted)
      .forEach((rec: KesantrianRecord) => {
        const st = students.find((s) => s && s.id === rec.studentId);
        const classId = st?.classId || rec.classId || '';
        const className = classId ? getClassName(classId) : rec.className || '-';
        const studentName = st?.name || rec.studentName || '-';
        const nisnLabel = formatNisOrNisn(st, rec.nisn, rec.nis);
        const dateStr = rec.date || '';
        const monthPart = dateStr.length >= 7 ? dateStr.slice(5, 7) : '';

        let sickDays: number | undefined;
        if (rec.type === 'SAKIT' && dateStr) {
          const todayStr = new Date().toISOString().split('T')[0];
          const isDone = rec.status === 'Sudah Sembuh' || rec.status === 'Selesai';
          const endDateRef = isDone
            ? rec.recoveredConfirmedDate || rec.returnToPesantrenDate || rec.returnDate || todayStr
            : todayStr;
          const startMs = new Date(dateStr).getTime();
          const endMs = new Date(endDateRef).getTime();
          if (!isNaN(startMs) && !isNaN(endMs)) {
            sickDays = Math.max(1, Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
          } else {
            sickDays = 1;
          }
        }

        list.push({
          id: `rep_rec_${rec.id}`,
          sourceRecordId: rec.id,
          date: dateStr,
          time: rec.incidentTime || rec.time,
          month: monthPart,
          semester: rec.semester || activeAcademicYear?.semester || 'Ganjil',
          academicYearId: rec.academicYearId || activeAcademicYear?.id || '',
          academicYearName: rec.academicYearName || activeAcademicYear?.name || '2026/2027',
          studentId: rec.studentId,
          studentName,
          nisnLabel,
          classId,
          className,
          incidentType: rec.type,
          incidentTypeLabel: INCIDENT_TYPE_LABELS[rec.type] || rec.type,
          category: rec.violationCategoryName || rec.category || '-',
          title: rec.title || '-',
          description: rec.description || '',
          actionTaken: rec.actionTaken || '',
          status: rec.status || 'Tercatat',
          followUpCount: (rec.followUps || []).length,
          sickDays,
          needsParentPickup: Boolean(
            rec.needsParentPickup ||
              rec.status === 'Perlu Dijemput Orang Tua' ||
              rec.status === 'Dipulangkan karena Sakit'
          ),
          estimatedReturnDate: rec.estimatedReturnDate || rec.returnDate,
          conditionAtReturn: rec.conditionAtReturn,
          headEvaluationNote: rec.headEvaluationNote,
          createdBy: rec.createdBy || rec.recordedByUserId || 'kesantrian',
          createdByName:
            rec.createdByName || rec.recordedByName || rec.createdBy || 'Petugas Kesantrian',
          createdByRole:
            rec.createdByRole || rec.recordedByRole || 'Musyrif Kesantrian',
          createdAt: rec.createdAt || dateStr,
        });
      });

    // 2. From mabitPeriods (Mabit & Kepulangan Santri per peserta santri)
    mabitPeriods.forEach((period: MabitPeriod) => {
      const dateStr = period.departureDate || '';
      const monthPart = dateStr.length >= 7 ? dateStr.slice(5, 7) : '';
      (period.participants || []).forEach((pt) => {
        const st = students.find((s) => s && s.id === pt.studentId);
        const classId = st?.classId || '';
        const className = classId ? getClassName(classId) : '-';
        const studentName = st?.name || 'Santri';
        const nisnLabel = formatNisOrNisn(st);

        list.push({
          id: `rep_mabit_${period.id}_${pt.studentId}`,
          mabitPeriodId: period.id,
          date: dateStr,
          time: pt.departureTime || period.departureTime,
          month: monthPart,
          semester: period.semester || activeAcademicYear?.semester || 'Ganjil',
          academicYearId: period.academicYearId || activeAcademicYear?.id || '',
          academicYearName: period.academicYearName || activeAcademicYear?.name || '2026/2027',
          studentId: pt.studentId,
          studentName,
          nisnLabel,
          classId,
          className,
          incidentType: 'MABIT',
          incidentTypeLabel: 'Mabit & Kepulangan',
          category: period.periodName || 'Kepulangan Mabit',
          title: `${period.periodName} (Pulang: ${period.departureDate}, Kembali: ${period.returnDate})`,
          description: pt.notes || period.generalNotes || '',
          actionTaken:
            pt.status === 'Sudah Kembali'
              ? `Sudah kembali (${pt.actualReturnTime || period.returnTime})`
              : `Jadwal kembali: ${period.returnDate} ${period.returnTime}`,
          status: pt.status || 'Belum Kembali',
          followUpCount: 0,
          createdBy: period.createdBy || 'kesantrian',
          createdByName:
            period.createdByName || period.createdBy || 'Petugas Kesantrian',
          createdByRole: period.createdByRole || 'Musyrif Kesantrian',
          createdAt: period.createdAt || dateStr,
        });
      });
    });

    return list.sort(
      (a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
    );
  }, [kesantrianRecords, mabitPeriods, students, classes, activeAcademicYear]);

  // Distinct Academic Year Names for filter
  const academicYearOptions = useMemo(() => {
    const names = new Set<string>();
    academicYears.forEach((ay) => {
      if (ay.name) names.add(ay.name);
    });
    unifiedEntries.forEach((e) => {
      if (e.academicYearName) names.add(e.academicYearName);
    });
    return Array.from(names);
  }, [academicYears, unifiedEntries]);

  // Distinct Status options
  const statusOptions = useMemo(() => {
    const statuses = new Set<string>([
      'Belum Ditangani',
      'Dalam Pembinaan',
      'Selesai',
      'Sedang Sakit',
      'Masa Pemulihan',
      'Sudah Sembuh',
      'Sedang Izin',
      'Sudah Kembali',
      'Terlambat Kembali',
      'Belum Kembali',
      'Sudah Diberikan',
      'Konsumsi Rutin',
    ]);
    unifiedEntries.forEach((e) => {
      if (e.status) statuses.add(e.status);
    });
    return Array.from(statuses);
  }, [unifiedEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedEntries.filter((entry) => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      if (selectedMonth !== 'ALL' && entry.month !== selectedMonth) return false;
      if (selectedSemester !== 'ALL' && entry.semester !== selectedSemester) return false;
      if (
        selectedAcademicYear !== 'ALL' &&
        entry.academicYearName !== selectedAcademicYear &&
        entry.academicYearId !== selectedAcademicYear
      ) {
        return false;
      }
      if (selectedClassId !== 'ALL' && entry.classId !== selectedClassId) return false;
      if (selectedIncidentType !== 'ALL' && entry.incidentType !== selectedIncidentType) {
        return false;
      }
      if (selectedStatus !== 'ALL' && entry.status !== selectedStatus) return false;

      if (q) {
        const matchesText =
          entry.studentName.toLowerCase().includes(q) ||
          entry.nisnLabel.toLowerCase().includes(q) ||
          entry.className.toLowerCase().includes(q) ||
          entry.title.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.createdByName.toLowerCase().includes(q) ||
          entry.createdByRole.toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      return true;
    });
  }, [
    unifiedEntries,
    searchQuery,
    startDate,
    endDate,
    selectedMonth,
    selectedSemester,
    selectedAcademicYear,
    selectedClassId,
    selectedIncidentType,
    selectedStatus,
  ]);

  // Summary counts from filtered entries
  const summaryStats = useMemo(() => {
    return {
      total: filteredEntries.length,
      pelanggaran: filteredEntries.filter((e) => e.incidentType === 'PELANGGARAN').length,
      sakit: filteredEntries.filter((e) => e.incidentType === 'SAKIT').length,
      izin: filteredEntries.filter((e) => e.incidentType === 'IZIN_PULANG').length,
      mabit: filteredEntries.filter((e) => e.incidentType === 'MABIT').length,
      obat: filteredEntries.filter((e) => e.incidentType === 'OBAT_P3K').length,
      uniqueStudents: new Set(filteredEntries.map((e) => e.studentId)).size,
    };
  }, [filteredEntries]);

  // Recap per Class
  const classRecap = useMemo(() => {
    return classes.map((cls) => {
      const clsEntries = filteredEntries.filter((e) => e.classId === cls.id);
      return {
        classId: cls.id,
        className: cls.name,
        total: clsEntries.length,
        pelanggaran: clsEntries.filter((e) => e.incidentType === 'PELANGGARAN').length,
        sakit: clsEntries.filter((e) => e.incidentType === 'SAKIT').length,
        izin: clsEntries.filter((e) => e.incidentType === 'IZIN_PULANG').length,
        mabit: clsEntries.filter((e) => e.incidentType === 'MABIT').length,
        obat: clsEntries.filter((e) => e.incidentType === 'OBAT_P3K').length,
      };
    });
  }, [classes, filteredEntries]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('ALL');
    setSelectedSemester('ALL');
    setSelectedAcademicYear('ALL');
    setSelectedClassId('ALL');
    setSelectedIncidentType('ALL');
    setSelectedStatus('ALL');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Tanggal',
      'Tahun Ajaran',
      'Semester',
      'Nama Santri',
      'NIS/NISN',
      'Kelas',
      'Jenis Kejadian',
      'Kategori',
      'Keterangan / Judul',
      'Tindakan / Penanganan',
      'Status',
      'Dicatat Oleh',
      'Jabatan Petugas',
    ];
    const rows = filteredEntries.map((e) => [
      e.date,
      e.academicYearName,
      e.semester,
      `"${(e.studentName || '').replace(/"/g, '""')}"`,
      `"${(e.nisnLabel || '').replace(/"/g, '""')}"`,
      `Kelas ${e.className}`,
      e.incidentTypeLabel,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.actionTaken || '').replace(/"/g, '""')}"`,
      e.status,
      `"${(e.createdByName || '').replace(/"/g, '""')}"`,
      `"${(e.createdByRole || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Kesantrian_AKSARA_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Laporan Kesantrian */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-teal-600" />
            <span>Laporan Kesantrian Terpadu</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi dan detail kejadian otomatis dari Pelanggaran Santri, Santri Sakit, Izin/Pulang Santri, Mabit &amp; Kepulangan, serta Obat &amp; P3K.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Filter Panel Lengkap (Requirement 8) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>Filter Laporan Kesantrian</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Pencarian */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Cari Santri / Kejadian / Petugas
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama santri, NISN, petugas..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Jenis Kejadian */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Jenis Kejadian</label>
            <select
              value={selectedIncidentType}
              onChange={(e) => setSelectedIncidentType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Jenis Kejadian</option>
              <option value="PELANGGARAN">Pelanggaran Santri</option>
              <option value="SAKIT">Santri Sakit</option>
              <option value="IZIN_PULANG">Izin/Pulang Santri</option>
              <option value="MABIT">Mabit &amp; Kepulangan</option>
              <option value="OBAT_P3K">Obat &amp; P3K</option>
            </select>
          </div>

          {/* Kelas */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Status Penanganan</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="ALL">Semua Status</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Mulai (Periode) */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Tanggal Selesai (Periode) */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Bulan */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun Ajaran & Semester */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Tahun Ajaran</label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="ALL">Semua TA</option>
                {academicYearOptions.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="ALL">Semua</option>
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Kartu Rekapitulasi Laporan Kesantrian */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">Total Kejadian</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {summaryStats.total}
          </div>
          <div className="text-[11px] text-teal-700 font-medium mt-0.5">
            {summaryStats.uniqueStudents} santri tercatat
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Pelanggaran</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono tabular-nums">
            {summaryStats.pelanggaran}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Catatan disiplin</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Santri Sakit</span>
            <HeartPulse className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1 font-mono tabular-nums">
            {summaryStats.sakit}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pemeriksaan &amp; rawat</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Izin / Pulang</span>
            <DoorOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono tabular-nums">
            {summaryStats.izin}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Perizinan keluar</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Mabit &amp; Pulang</span>
            <Moon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1 font-mono tabular-nums">
            {summaryStats.mabit}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Peserta periode Mabit</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Obat &amp; P3K</span>
            <Pill className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">
            {summaryStats.obat}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Distribusi obat</div>
        </div>
      </div>

      {/* Tabel Rekapitulasi Per Kelas */}
      {classes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Rekapitulasi Kejadian Kesantrian Per Kelas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3 text-center">Pelanggaran</th>
                  <th className="py-2.5 px-3 text-center">Santri Sakit</th>
                  <th className="py-2.5 px-3 text-center">Izin/Pulang</th>
                  <th className="py-2.5 px-3 text-center">Mabit</th>
                  <th className="py-2.5 px-3 text-center">Obat &amp; P3K</th>
                  <th className="py-2.5 px-3 text-center">Total Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {classRecap.map((cr) => (
                  <tr key={cr.classId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                      Kelas {cr.className}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-700 font-semibold">
                      {cr.pelanggaran}
                    </td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">
                      {cr.sakit}
                    </td>
                    <td className="py-2.5 px-3 text-center text-blue-700 font-semibold">
                      {cr.izin}
                    </td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 font-semibold">
                      {cr.mabit}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                      {cr.obat}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {cr.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabel Detail Kejadian Kesantrian */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Detail Kejadian Kesantrian ({filteredEntries.length} Data)
            </h3>
            <p className="text-xs text-slate-500">
              Setiap catatan menampilkan identitas santri dari Master Data Siswa serta identitas petugas pencatat beserta jabatannya.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
              <tr>
                <th className="py-3 px-3">Tanggal &amp; Periode</th>
                <th className="py-3 px-3">Santri &amp; Kelas</th>
                <th className="py-3 px-3">Jenis Kejadian</th>
                <th className="py-3 px-3">Detail Kejadian &amp; Penanganan</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Identitas Petugas Pencatat</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 font-mono">
                      {formatIndonesianDate(entry.date)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      TA {entry.academicYearName} &middot; {entry.semester}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{entry.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {entry.nisnLabel} &middot; Kelas {entry.className}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800">{entry.incidentTypeLabel}</div>
                    <div className="text-[11px] text-slate-500">{entry.category}</div>
                  </td>
                  <td className="py-3 px-3 max-w-xs space-y-0.5">
                    <div className="font-semibold text-slate-900">{entry.title}</div>
                    {entry.incidentType === 'SAKIT' && entry.sickDays && (
                      <div className="text-[11px] text-amber-800 font-medium">
                        Lama Sakit: <strong>{entry.sickDays} Hari</strong>
                        {entry.needsParentPickup ? ' • Perlu Dijemput Ortu' : ''}
                        {entry.estimatedReturnDate
                          ? ` • Est. Kembali: ${entry.estimatedReturnDate}`
                          : ''}
                      </div>
                    )}
                    {entry.incidentType === 'IZIN_PULANG' && entry.estimatedReturnDate && (
                      <div className="text-[11px] text-blue-800 font-medium">
                        Jadwal Kembali: <strong>{entry.estimatedReturnDate}</strong>
                      </div>
                    )}
                    {entry.actionTaken && (
                      <div className="text-[11px] text-slate-600">
                        Penanganan: {entry.actionTaken}
                      </div>
                    )}
                    {entry.conditionAtReturn && (
                      <div className="text-[11px] text-emerald-700">
                        Kondisi Kembali: {entry.conditionAtReturn}
                      </div>
                    )}
                    {entry.headEvaluationNote && (
                      <div className="text-[11px] text-indigo-700 font-medium">
                        Arahan Kepala: {entry.headEvaluationNote}
                      </div>
                    )}
                    {entry.followUpCount > 0 && (
                      <div className="text-[11px] text-teal-700 font-medium">
                        +{entry.followUpCount} catatan tindak lanjut
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800">{entry.status}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-900 font-semibold">
                      Dicatat oleh: {entry.createdByName}
                    </div>
                    <div className="text-[11px] text-teal-700 font-medium">
                      Jabatan: {entry.createdByRole}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Tanggal: {formatIndonesianDate(entry.date)}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {entry.sourceRecordId && onSelectRecordDetail ? (
                      <button
                        type="button"
                        onClick={() => onSelectRecordDetail(entry.sourceRecordId!)}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    ) : entry.mabitPeriodId && onNavigateToMabit ? (
                      <button
                        type="button"
                        onClick={onNavigateToMabit}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Mabit</span>
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ada data kejadian kesantrian yang sesuai dengan filter laporan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
