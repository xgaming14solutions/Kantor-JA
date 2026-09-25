import React, { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, Subject } from '../types';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Save,
  Search,
  School,
  ArrowLeft,
  Info
} from 'lucide-react';

interface ExtracurricularParticipantsViewProps {
  userRole?: UserRole;
  initialExtracurricular?: Subject | null;
  onBack?: () => void;
}

export const ExtracurricularParticipantsView: React.FC<ExtracurricularParticipantsViewProps> = ({
  userRole,
  initialExtracurricular,
  onBack
}) => {
  const { role } = useAuth();
  const currentRole = userRole || role;

  const {
    academicYears,
    activeAcademicYear,
    classes,
    students,
    subjects,
    extracurricularParticipants,
    saveExtracurricularParticipants
  } = useMasterData();

  // 1. Filter only subjects with type === 'extracurricular'
  const extracurriculars = useMemo(() => {
    return subjects.filter((s) => s.type === 'extracurricular' && s.isActive !== false);
  }, [subjects]);

  // Active or first available academic year
  const initialYearId = activeAcademicYear?.id || academicYears[0]?.id || 'ay_2026_2027_1';
  const initialSemester = (activeAcademicYear?.semester || 'Ganjil') as 'Ganjil' | 'Genap';

  // Step selection state
  const [selectedYearId, setSelectedYearId] = useState<string>(initialYearId);
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(initialSemester);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedExtracurricularId, setSelectedExtracurricularId] = useState<string>(
    initialExtracurricular?.id || ''
  );

  // Search filter for students list
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');

  // Selected student IDs in current scope
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Update selected extracurricular when initialExtracurricular prop changes
  useEffect(() => {
    if (initialExtracurricular?.id) {
      setSelectedExtracurricularId(initialExtracurricular.id);
    }
  }, [initialExtracurricular]);

  // Auto-select class & extracurricular if not selected
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      const activeClass = classes.find((c) => c.isActive !== false) || classes[0];
      setSelectedClassId(activeClass.id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!selectedExtracurricularId && extracurriculars.length > 0) {
      setSelectedExtracurricularId(extracurriculars[0].id);
    }
  }, [extracurriculars, selectedExtracurricularId]);

  // Sync selectedStudentIds whenever the scope (Year, Semester, Class, Extracurricular) changes
  useEffect(() => {
    if (!selectedExtracurricularId || !selectedClassId || !selectedYearId || !selectedSemester) {
      setSelectedStudentIds([]);
      setIsDirty(false);
      return;
    }

    // Query participants in this exact scope from MasterDataContext
    const matched = extracurricularParticipants.filter(
      (p) =>
        p.extracurricularId === selectedExtracurricularId &&
        p.classId === selectedClassId &&
        p.academicYearId === selectedYearId &&
        p.semester === selectedSemester &&
        p.status !== 'inactive'
    );

    const ids = matched.map((p) => p.studentId);
    setSelectedStudentIds(ids);
    setIsDirty(false);
  }, [
    selectedExtracurricularId,
    selectedClassId,
    selectedYearId,
    selectedSemester,
    extracurricularParticipants
  ]);

  // Students belonging to the chosen class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students
      .filter((s) => s.classId === selectedClassId && s.status === 'Aktif')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  // Filtered students for quick search inside the list
  const filteredStudents = useMemo(() => {
    if (!searchStudentQuery.trim()) return classStudents;
    const q = searchStudentQuery.toLowerCase().trim();
    return classStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nis && s.nis.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }, [classStudents, searchStudentQuery]);

  // Handlers for checkboxes
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const exists = prev.includes(studentId);
      const next = exists ? prev.filter((id) => id !== studentId) : [...prev, studentId];
      setIsDirty(true);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = classStudents.map((s) => s.id);
    setSelectedStudentIds(allIds);
    setIsDirty(true);
  };

  const handleUnselectAll = () => {
    setSelectedStudentIds([]);
    setIsDirty(true);
  };

  // Save to database
  const handleSave = async () => {
    if (!selectedExtracurricularId) {
      setErrorMsg('Harap pilih ekstrakurikuler terlebih dahulu.');
      return;
    }
    if (!selectedClassId) {
      setErrorMsg('Harap pilih kelas rombel terlebih dahulu.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await saveExtracurricularParticipants(
        selectedExtracurricularId,
        selectedClassId,
        selectedYearId,
        selectedSemester,
        selectedStudentIds
      );

      setIsDirty(false);
      const eksName = extracurriculars.find((e) => e.id === selectedExtracurricularId)?.name || 'Ekstrakurikuler';
      const className = classes.find((c) => c.id === selectedClassId)?.name || 'Kelas';
      setNotice(`Peserta ekstrakurikuler ${eksName} kelas ${className} (${selectedStudentIds.length} siswa) berhasil disimpan.`);
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      console.error('Failed to save extracurricular participants:', err);
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menyimpan data peserta ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentExtracurricular =
    extracurriculars.find((e) => e.id === selectedExtracurricularId) ||
    initialExtracurricular ||
    null;
  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with optional Back to Mata Pelajaran button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                title="Kembali ke Daftar Mata Pelajaran & Ekstrakurikuler"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  Kelola Peserta: {currentExtracurricular?.name || 'Ekstrakurikuler'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  {currentExtracurricular?.code || 'EKS'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tentukan siswa yang mengikuti kegiatan {currentExtracurricular?.name || 'ekstrakurikuler'} per kelas dan semester.
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Kembali ke Mapel
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSubmitting || !selectedExtracurricularId || !selectedClassId}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition shadow-xs cursor-pointer disabled:opacity-50 ${
              isDirty
                ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Peserta'}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Panel Alur Penggunaan (Filter 4 Tingkat) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filter Alur Pemetaan Peserta
            </span>
          </div>
          {isDirty && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Ada perubahan belum disimpan
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Pilih Tahun Ajaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              1. Tahun Ajaran
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isActive ? '★ (Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pilih Semester */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              2. Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* 3. Pilih Kelas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-slate-400" />
              3. Kelas / Rombel
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              {classes.length === 0 ? (
                <option value="">Belum ada kelas</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name} (Tingkat {c.gradeLevel})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 4. Pilih Ekstrakurikuler (Strictly type === 'extracurricular') */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              4. Ekstrakurikuler
            </label>
            <select
              value={selectedExtracurricularId}
              onChange={(e) => setSelectedExtracurricularId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-purple-200 bg-purple-50/40 focus:bg-white font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
            >
              {extracurriculars.length === 0 ? (
                <option value="">Tidak ada ekstrakurikuler aktif</option>
              ) : (
                extracurriculars.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.code || 'EKS'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Warning if no extracurriculars exist */}
        {extracurriculars.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Belum ada kegiatan ekstrakurikuler.</strong> Silakan tambahkan ekstrakurikuler terlebih dahulu pada menu <strong>Mata Pelajaran</strong> dengan memilih jenis data <em>Ekstrakurikuler</em> (contoh: Pertanian, Pramuka, dsb.).
            </div>
          </div>
        )}
      </div>

      {/* Main Student Participants Selection Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Daftar Siswa Kelas {currentClass?.name || '-'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {selectedStudentIds.length} dari {classStudents.length} siswa terpilih
            </span>
          </div>

          {/* Quick Search & Batch Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama siswa / NIS..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 w-48 sm:w-56"
              />
            </div>

            {/* Tombol Centang Semua */}
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={classStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Centang Semua
            </button>

            {/* Tombol Batalkan Semua */}
            <button
              type="button"
              onClick={handleUnselectAll}
              disabled={selectedStudentIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5" />
              Batalkan Semua
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-16 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">Jenis Kelamin</th>
                <th className="py-3 px-4 text-center w-28">Ikut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada siswa terdaftar pada kelas ini atau pencarian tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, index) => {
                  const isChecked = selectedStudentIds.includes(st.id);
                  return (
                    <tr
                      key={st.id}
                      onClick={() => handleToggleStudent(st.id)}
                      className={`hover:bg-indigo-50/40 transition cursor-pointer select-none ${
                        isChecked ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>

                      {/* Nama Siswa */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{st.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          ID: {st.id}
                        </span>
                      </td>

                      {/* NIS / NISN */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {st.nis || '-'}{st.nisn ? ` / ${st.nisn}` : ''}
                      </td>

                      {/* Jenis Kelamin */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            st.gender === 'L'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>

                      {/* Checkbox Ikut */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <label className="inline-flex items-center justify-center cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStudent(st.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary and Action */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            Ekstrakurikuler: <strong className="text-purple-900">{currentExtracurricular?.name || '-'}</strong> |
            Kelas: <strong className="text-slate-800">{currentClass?.name || '-'}</strong> |
            Jumlah Peserta: <strong className="text-emerald-700">{selectedStudentIds.length} Siswa</strong>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition text-xs cursor-pointer"
              >
                Kembali
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSubmitting || !selectedExtracurricularId || !selectedClassId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Peserta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
