import React, { useState, useEffect, useMemo } from 'react';
import { useMasterData } from '../context/MasterDataContext';
import { useAuth } from '../context/AuthContext';
import {
  AcademicSetting,
  AssessmentComponent,
  CalculationMethod,
  RoundingOption,
  UserRole
} from '../types';
import {
  createDefaultAcademicSetting,
  calculateStudentScore,
  DEFAULT_ASSESSMENT_COMPONENTS
} from '../lib/academicCalculation';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Info,
  History,
  RotateCcw,
  Plus,
  Trash2,
  ShieldCheck,
  Calculator,
  Layers,
  BookOpen,
  ArrowRight,
  Sparkles,
  Save,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface AcademicSettingsViewProps {
  userRole?: UserRole;
}

export const AcademicSettingsView: React.FC<AcademicSettingsViewProps> = ({ userRole }) => {
  const { currentUser, role } = useAuth();
  const effectiveRole = userRole || role;

  const {
    academicYears,
    activeAcademicYear,
    subjects,
    academicSettings,
    academicSettingLogs,
    getAcademicSetting,
    saveAcademicSetting
  } = useMasterData();

  // Period Selector State
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>(
    activeAcademicYear?.id || 'ay_2026_2027_1'
  );
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(
    activeAcademicYear?.semester || 'Ganjil'
  );

  // Active Tab: 'weights' | 'kkm' | 'method' | 'history'
  const [activeTab, setActiveTab] = useState<'weights' | 'kkm' | 'method' | 'history'>('weights');

  // Working draft of AcademicSetting being edited
  const [draftSetting, setDraftSetting] = useState<AcademicSetting>(() =>
    createDefaultAcademicSetting(
      activeAcademicYear?.id || 'ay_2026_2027_1',
      activeAcademicYear?.semester || 'Ganjil'
    )
  );

  // Confirmation Modal & Save States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [changeNotes, setChangeNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // New Custom Component Form State
  const [isAddingComponent, setIsAddingComponent] = useState<boolean>(false);
  const [newCompCode, setNewCompCode] = useState<string>('');
  const [newCompName, setNewCompName] = useState<string>('');
  const [newCompWeight, setNewCompWeight] = useState<number>(10);

  // Interactive Live Simulator State
  const [simTugas, setSimTugas] = useState<number | ''>(80);
  const [simUH, setSimUH] = useState<number | ''>(85);
  const [simSTS, setSimSTS] = useState<number | ''>(90);
  const [simSAS, setSimSAS] = useState<number | ''>(88);
  const [simSubjectKkm, setSimSubjectKkm] = useState<number>(75);

  // Synchronize draft when selected period changes
  useEffect(() => {
    const loadedSetting = getAcademicSetting(selectedAcademicYearId, selectedSemester);
    // Deep clone to allow safe editing
    setDraftSetting(JSON.parse(JSON.stringify(loadedSetting)));
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);
  }, [selectedAcademicYearId, selectedSemester, academicSettings]);

  // Synchronize default year if activeAcademicYear changes
  useEffect(() => {
    if (activeAcademicYear) {
      setSelectedAcademicYearId(activeAcademicYear.id);
      setSelectedSemester(activeAcademicYear.semester);
    }
  }, [activeAcademicYear?.id, activeAcademicYear?.semester]);

  // RBAC Permission Check
  const hasAccess = effectiveRole === 'KEPALA_SEKOLAH' || effectiveRole === 'ADMIN';

  // Selected Academic Year Object
  const selectedYearObj = academicYears.find((ay) => ay.id === selectedAcademicYearId);
  const isPeriodActive =
    activeAcademicYear &&
    activeAcademicYear.id === selectedAcademicYearId &&
    activeAcademicYear.semester === selectedSemester;

  // Active Components Calculation
  const activeComponents = useMemo(() => {
    return draftSetting.components.filter((c) => c.enabled);
  }, [draftSetting.components]);

  // Total Weight of Active Components
  const totalWeight = useMemo(() => {
    return activeComponents.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
  }, [activeComponents]);

  const isTotalWeightValid = totalWeight === 100;

  // Change detection for audit trail auto-summary
  const detectedChanges = useMemo(() => {
    const original = getAcademicSetting(selectedAcademicYearId, selectedSemester);
    const changes: string[] = [];

    if (draftSetting.calculationMethod !== original.calculationMethod) {
      changes.push(
        `Metode perhitungan diubah dari ${
          original.calculationMethod === 'WEIGHTED' ? 'Bobot' : 'Rata-rata'
        } ke ${draftSetting.calculationMethod === 'WEIGHTED' ? 'Bobot' : 'Rata-rata'}`
      );
    }

    if (draftSetting.rounding !== original.rounding) {
      changes.push(`Aturan pembulatan diubah dari ${original.rounding} ke ${draftSetting.rounding}`);
    }

    // Check components
    draftSetting.components.forEach((comp) => {
      const origComp = original.components.find((c) => c.code === comp.code);
      if (!origComp) {
        changes.push(`Menambahkan komponen baru: ${comp.name} (${comp.weight}%)`);
      } else {
        if (origComp.enabled !== comp.enabled) {
          changes.push(
            `${comp.name} ${comp.enabled ? 'diaktifkan' : 'dinonaktifkan'}`
          );
        }
        if (origComp.weight !== comp.weight) {
          changes.push(`Bobot ${comp.name}: ${origComp.weight}% → ${comp.weight}%`);
        }
        if (origComp.name !== comp.name) {
          changes.push(`Nama komponen diubah: "${origComp.name}" → "${comp.name}"`);
        }
      }
    });

    original.components.forEach((origComp) => {
      const stillExists = draftSetting.components.some((c) => c.code === origComp.code);
      if (!stillExists) {
        changes.push(`Menghapus komponen: ${origComp.name}`);
      }
    });

    // Check KKM overrides
    const origOverrides = original.subjectKkmOverrides || {};
    const draftOverrides = draftSetting.subjectKkmOverrides || {};
    subjects.forEach((sub) => {
      const origVal = origOverrides[sub.id];
      const draftVal = draftOverrides[sub.id];
      if (origVal !== draftVal) {
        if (draftVal !== undefined) {
          changes.push(`KKM ${sub.name}: ${origVal ?? sub.kkm} → ${draftVal}`);
        } else {
          changes.push(`KKM ${sub.name} dikembalikan ke default (${sub.kkm})`);
        }
      }
    });

    if (changes.length === 0 && changeNotes.trim()) {
      changes.push(changeNotes.trim());
    }

    return changes;
  }, [draftSetting, selectedAcademicYearId, selectedSemester, getAcademicSetting, subjects, changeNotes]);

  // Live Simulator Calculation
  const simResult = useMemo(() => {
    const mockScores: any[] = [];
    if (simTugas !== '') {
      mockScores.push({ id: 'sim_t', type: 'Tugas', value: Number(simTugas) });
    }
    if (simUH !== '') {
      mockScores.push({ id: 'sim_u', type: 'UH', value: Number(simUH) });
    }
    if (simSTS !== '') {
      mockScores.push({ id: 'sim_s', type: 'STS', value: Number(simSTS) });
    }
    if (simSAS !== '') {
      mockScores.push({ id: 'sim_a', type: 'SAS', value: Number(simSAS) });
    }

    return calculateStudentScore(draftSetting, mockScores, simSubjectKkm);
  }, [draftSetting, simTugas, simUH, simSTS, simSAS, simSubjectKkm]);

  // Component Modification Handlers
  const handleUpdateComponent = (
    index: number,
    field: keyof AssessmentComponent,
    value: any
  ) => {
    setDraftSetting((prev) => {
      const newComps = [...prev.components];
      newComps[index] = {
        ...newComps[index],
        [field]: value
      };
      return {
        ...prev,
        components: newComps
      };
    });
  };

  const handleAddComponent = () => {
    if (!newCompCode.trim() || !newCompName.trim()) {
      alert('Kode dan Nama komponen tidak boleh kosong');
      return;
    }
    const cleanCode = newCompCode.trim().toUpperCase().replace(/\s+/g, '_');
    if (draftSetting.components.some((c) => c.code === cleanCode)) {
      alert(`Komponen dengan kode "${cleanCode}" sudah ada.`);
      return;
    }

    setDraftSetting((prev) => ({
      ...prev,
      components: [
        ...prev.components,
        {
          code: cleanCode,
          name: newCompName.trim(),
          enabled: true,
          weight: Math.max(0, Math.min(100, Number(newCompWeight) || 0)),
          includedInFinalScore: true
        }
      ]
    }));

    setNewCompCode('');
    setNewCompName('');
    setNewCompWeight(10);
    setIsAddingComponent(false);
  };

  const handleRemoveComponent = (code: string) => {
    if (DEFAULT_ASSESSMENT_COMPONENTS.some((d) => d.code === code)) {
      if (
        !confirm(
          `Komponen ${code} adalah komponen standar sekolah. Anda cukup menonaktifkannya jika tidak ingin digunakan. Apakah Anda tetap ingin menghapusnya?`
        )
      ) {
        return;
      }
    }
    setDraftSetting((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.code !== code)
    }));
  };

  const handleResetToDefault = () => {
    if (
      confirm(
        'Kembalikan seluruh komponen dan bobot ke standar awal sekolah (Tugas 20%, UH 30%, STS 20%, SAS 30%)?'
      )
    ) {
      const defaultSetting = createDefaultAcademicSetting(
        selectedAcademicYearId,
        selectedSemester
      );
      setDraftSetting((prev) => ({
        ...prev,
        calculationMethod: defaultSetting.calculationMethod,
        components: defaultSetting.components,
        rounding: defaultSetting.rounding,
        passingGradeStatus: defaultSetting.passingGradeStatus
      }));
    }
  };

  const handleSubjectKkmChange = (subjectId: string, value: string) => {
    const num = value === '' ? undefined : Math.max(0, Math.min(100, Number(value)));
    setDraftSetting((prev) => {
      const currentOverrides = { ...(prev.subjectKkmOverrides || {}) };
      if (num === undefined) {
        delete currentOverrides[subjectId];
      } else {
        currentOverrides[subjectId] = num;
      }
      return {
        ...prev,
        subjectKkmOverrides: currentOverrides
      };
    });
  };

  const handleResetAllKkm = () => {
    if (confirm('Kembalikan seluruh KKM mata pelajaran ke KKM standar master data?')) {
      setDraftSetting((prev) => ({
        ...prev,
        subjectKkmOverrides: {}
      }));
    }
  };

  // Submit Save
  const handleSaveSettings = async () => {
    if (!isTotalWeightValid) {
      setSaveErrorMessage('Total bobot seluruh komponen aktif harus tepat 100%.');
      return;
    }

    setIsSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const updaterName = currentUser?.displayName || currentUser?.email || 'Kepala Sekolah';
      const notesList = detectedChanges.length > 0 ? detectedChanges : ['Pembaruan pengaturan penilaian akademik'];
      if (changeNotes.trim() && !notesList.includes(changeNotes.trim())) {
        notesList.unshift(changeNotes.trim());
      }

      await saveAcademicSetting(draftSetting, updaterName, notesList);

      setSaveSuccessMessage(
        `Pengaturan penilaian untuk tahun ajaran ${
          selectedYearObj?.name || selectedAcademicYearId
        } (${selectedSemester}) berhasil disimpan ke database (Versi ${
          (draftSetting.version || 1) + 1
        }).`
      );
      setIsConfirmModalOpen(false);
      setChangeNotes('');
    } catch (err) {
      console.error('Error saving academic settings:', err);
      setSaveErrorMessage('Gagal menyimpan pengaturan ke database. Silakan coba kembali.');
    } finally {
      setIsSaving(false);
    }
  };

  // RBAC Restricted Screen
  if (!hasAccess) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Akses Terbatas: Kepala Sekolah</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Halaman <strong>Pengaturan Akademik</strong> dikhususkan untuk akun Kepala Sekolah dan
          Administrator. Akun Anda dengan peran <strong>{effectiveRole}</strong> tidak memiliki
          wewenang untuk mengubah kebijakan penilaian sekolah.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Pengaturan Akademik
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                  Kepala Sekolah
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Atur bobot nilai, KKM, komponen penilaian, dan formula kelulusan sekolah secara fleksibel.
              </p>
            </div>
          </div>
        </div>

        {/* Academic Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
            <select
              id="select-academic-year"
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  T.A. {ay.name} {ay.isActive ? '(Aktif)' : ''}
                </option>
              ))}
            </select>

            <select
              id="select-semester"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <button
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={!isTotalWeightValid || isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Pengaturan
          </button>
        </div>
      </div>

      {/* Period Info & Status Banner */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <span>Periode Terpilih:</span>
            <span className="text-indigo-600 font-bold">
              {selectedYearObj?.name || selectedAcademicYearId} — {selectedSemester}
            </span>
          </div>
          {isPeriodActive ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Periode Aktif Sekolah
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">
              Arsip / Periode Lain
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-slate-500 text-[11px]">
          <div>
            Versi Pengaturan: <strong className="text-slate-800 font-mono">v{draftSetting.version || 1}</strong>
          </div>
          {draftSetting.updatedAt && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>
                Diperbarui: {new Date(draftSetting.updatedAt).toLocaleDateString('id-ID')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Success / Error Alerts */}
      {saveSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}
      {saveErrorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveErrorMessage}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('weights')}
            className={`py-2.5 px-4 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'weights'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Bobot & Komponen Penilaian
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isTotalWeightValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {totalWeight}%
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kkm')}
            className={`py-2.5 px-4 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'kkm'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            KKM Mata Pelajaran
            {Object.keys(draftSetting.subjectKkmOverrides || {}).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {Object.keys(draftSetting.subjectKkmOverrides || {}).length} Kustom
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('method')}
            className={`py-2.5 px-4 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'method'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Metode & Pembulatan
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-4 text-xs font-semibold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat Perubahan
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BOBOT & KOMPONEN PENILAIAN */}
      {/* ========================================================================= */}
      {activeTab === 'weights' && (
        <div className="space-y-6">
          {/* Total Bobot Progress Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isTotalWeightValid
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-rose-50/60 border-rose-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Status Validasi Total Bobot:
                  </h4>
                  {isTotalWeightValid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      100% — Tepat Sesuai Aturan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      {totalWeight}% — Total Belum 100%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600">
                  {isTotalWeightValid
                    ? 'Seluruh komponen aktif memiliki proporsi bobot yang sah dan siap diterapkan ke seluruh nilai siswa.'
                    : `Total bobot saat ini adalah ${totalWeight}%. Aturan sekolah mewajibkan total bobot bernilai tepat 100% sebelum dapat disimpan.`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  Standar 20/30/20/30
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingComponent(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Tambah Komponen
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex">
              {draftSetting.components
                .filter((c) => c.enabled)
                .map((comp, idx) => {
                  const colors = [
                    'bg-indigo-500',
                    'bg-emerald-500',
                    'bg-sky-500',
                    'bg-amber-500',
                    'bg-purple-500',
                    'bg-rose-500'
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={comp.code}
                      style={{ width: `${Math.max(0, comp.weight)}%` }}
                      className={`${color} h-full transition-all duration-300 relative group`}
                      title={`${comp.name}: ${comp.weight}%`}
                    />
                  );
                })}
            </div>
          </div>

          {/* New Custom Component Drawer / Form */}
          {isAddingComponent && (
            <div className="bg-indigo-50/50 rounded-2xl border border-indigo-200 p-4 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Tambah Komponen Penilaian Baru
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kode Komponen (Contoh: PROYEK, PRAKTIK)
                  </label>
                  <input
                    type="text"
                    value={newCompCode}
                    onChange={(e) => setNewCompCode(e.target.value.toUpperCase())}
                    placeholder="KODE"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Komponen
                  </label>
                  <input
                    type="text"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="Contoh: Tugas Proyek Mandiri"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Bobot Nilai (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCompWeight}
                    onChange={(e) => setNewCompWeight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingComponent(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  Tambahkan Komponen
                </button>
              </div>
            </div>
          )}

          {/* Components Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Status</th>
                    <th className="py-3 px-4">Nama Komponen</th>
                    <th className="py-3 px-4 w-28">Kode Sistem</th>
                    <th className="py-3 px-4 w-36 text-center">Bobot (%)</th>
                    <th className="py-3 px-4 text-center">Masuk Nilai Akhir</th>
                    <th className="py-3 px-4 w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftSetting.components.map((comp, idx) => (
                    <tr
                      key={comp.code}
                      className={`hover:bg-slate-50/70 transition ${
                        !comp.enabled ? 'opacity-50 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Toggle Enabled */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={comp.enabled}
                          onChange={(e) =>
                            handleUpdateComponent(idx, 'enabled', e.target.checked)
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={comp.name}
                          disabled={!comp.enabled}
                          onChange={(e) =>
                            handleUpdateComponent(idx, 'name', e.target.value)
                          }
                          className="w-full px-2.5 py-1 text-xs font-semibold text-slate-900 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100"
                        />
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 font-semibold">
                        {comp.code}
                      </td>

                      {/* Weight */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={comp.weight}
                            disabled={!comp.enabled}
                            onChange={(e) =>
                              handleUpdateComponent(
                                idx,
                                'weight',
                                Math.max(0, Math.min(100, Number(e.target.value)))
                              )
                            }
                            className="w-16 px-2 py-1 text-center text-xs font-bold text-slate-800 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100"
                          />
                          <span className="font-semibold text-slate-500">%</span>
                        </div>
                      </td>

                      {/* Included in Final Score */}
                      <td className="py-3 px-4 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={comp.includedInFinalScore}
                            disabled={!comp.enabled}
                            onChange={(e) =>
                              handleUpdateComponent(
                                idx,
                                'includedInFinalScore',
                                e.target.checked
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(comp.code)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus Komponen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer Info */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  Jika suatu komponen dinonaktifkan (misal STS ditiadakan), komponen tersebut tidak
                  akan tampil di input nilai guru dan tidak diperhitungkan ke nilai akhir.
                </span>
              </div>
              <div className="font-semibold text-slate-700">
                Total Aktif: <strong className="text-indigo-600">{totalWeight}%</strong> / 100%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KKM MATA PELAJARAN */}
      {/* ========================================================================= */}
      {activeTab === 'kkm' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Penetapan KKM Per Mata Pelajaran (Periode Ini)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kepala Sekolah dapat menetapkan KKM khusus untuk semester ini tanpa mengubah master data mata pelajaran.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAllKkm}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              Kembalikan ke KKM Default Master
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Nama Mata Pelajaran</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-center">KKM Master</th>
                    <th className="py-3 px-4 text-center w-40">KKM Periode Ini</th>
                    <th className="py-3 px-4 text-center">Status Aturan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((sub) => {
                    const override = draftSetting.subjectKkmOverrides?.[sub.id];
                    const isOverridden = override !== undefined;
                    const effectiveValue = isOverridden ? override : sub.kkm;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                          {sub.code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{sub.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                            {sub.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-500">
                          {sub.kkm}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={effectiveValue}
                              onChange={(e) => handleSubjectKkmChange(sub.id, e.target.value)}
                              className="w-16 px-2 py-1 text-center text-xs font-bold text-slate-900 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                            />
                            {isOverridden && (
                              <button
                                type="button"
                                onClick={() => handleSubjectKkmChange(sub.id, '')}
                                className="text-[10px] text-slate-400 hover:text-rose-600 p-0.5"
                                title="Reset ke default"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOverridden ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Khusus Periode Ini
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal bg-slate-100 text-slate-600">
                              Default Master
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: METODE & PEMBULATAN */}
      {/* ========================================================================= */}
      {activeTab === 'method' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Metode Perhitungan Nilai */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Metode Perhitungan Nilai Akhir
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Pilih cara sistem memproses nilai siswa dari berbagai komponen penilaian.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option A: WEIGHTED */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  draftSetting.calculationMethod === 'WEIGHTED'
                    ? 'border-indigo-600 bg-indigo-50/40 text-slate-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="calculationMethod"
                  value="WEIGHTED"
                  checked={draftSetting.calculationMethod === 'WEIGHTED'}
                  onChange={() =>
                    setDraftSetting((prev) => ({ ...prev, calculationMethod: 'WEIGHTED' }))
                  }
                  className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold flex items-center gap-2">
                    Rata-rata Berdasarkan Bobot (Weighted Average)
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                      Direkomendasikan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Setiap komponen diperhitungkan sesuai persentase bobot (contoh: Tugas 20%, UH 30%, STS 20%, SAS 30%).
                    Komponen yang belum diisi secara cerdas dinormalisasi sehingga tidak merugikan siswa baru.
                  </p>
                </div>
              </label>

              {/* Option B: SIMPLE_AVERAGE */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  draftSetting.calculationMethod === 'SIMPLE_AVERAGE'
                    ? 'border-indigo-600 bg-indigo-50/40 text-slate-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="calculationMethod"
                  value="SIMPLE_AVERAGE"
                  checked={draftSetting.calculationMethod === 'SIMPLE_AVERAGE'}
                  onChange={() =>
                    setDraftSetting((prev) => ({ ...prev, calculationMethod: 'SIMPLE_AVERAGE' }))
                  }
                  className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold">Rata-rata Biasa (Arithmetic Mean)</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Nilai akhir dihitung murni dari penjumlahan nilai yang sudah ada dibagi jumlah komponen yang telah dinilai, tanpa membedakan bobot persentase.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Card 2: Aturan Pembulatan Nilai */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Aturan Pembulatan Nilai
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Format angka nilai akhir yang ditampilkan di buku nilai dan rapor siswa.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: '1_decimal',
                  label: '1 Angka di Belakang Koma',
                  example: 'Contoh: 85.9 (Standar Kurikulum Nasional)'
                },
                {
                  id: 'round',
                  label: 'Bilangan Bulat Terdekat',
                  example: 'Contoh: 85.9 dibulatkan menjadi 86'
                },
                {
                  id: 'none',
                  label: 'Desimal Penuh / 2 Angka',
                  example: 'Contoh: 85.88 (Tanpa pembulatan ke atas)'
                }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    draftSetting.rounding === opt.id
                      ? 'border-indigo-600 bg-indigo-50/40 text-slate-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="rounding"
                    value={opt.id}
                    checked={draftSetting.rounding === opt.id}
                    onChange={() =>
                      setDraftSetting((prev) => ({
                        ...prev,
                        rounding: opt.id as RoundingOption
                      }))
                    }
                    className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.example}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Card 3: Label Status Ketuntasan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 md:col-span-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Pengaturan Label Status Ketuntasan
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Teks status yang muncul otomatis pada tabel nilai guru dan rapor.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                  Status Memenuhi KKM (Nilai &ge; KKM)
                </label>
                <input
                  type="text"
                  value={draftSetting.passingGradeStatus?.passingLabel || 'Tuntas'}
                  onChange={(e) =>
                    setDraftSetting((prev) => ({
                      ...prev,
                      passingGradeStatus: {
                        passingLabel: e.target.value,
                        remedialLabel: prev.passingGradeStatus?.remedialLabel || 'Perlu Remedial',
                        unassessedLabel: prev.passingGradeStatus?.unassessedLabel || 'Belum Dinilai'
                      }
                    }))
                  }
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-300 bg-emerald-50/30 text-emerald-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-800 mb-1">
                  Status Belum Memenuhi KKM (Nilai &lt; KKM)
                </label>
                <input
                  type="text"
                  value={draftSetting.passingGradeStatus?.remedialLabel || 'Perlu Remedial'}
                  onChange={(e) =>
                    setDraftSetting((prev) => ({
                      ...prev,
                      passingGradeStatus: {
                        passingLabel: prev.passingGradeStatus?.passingLabel || 'Tuntas',
                        remedialLabel: e.target.value,
                        unassessedLabel: prev.passingGradeStatus?.unassessedLabel || 'Belum Dinilai'
                      }
                    }))
                  }
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-300 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Status Belum Ada Nilai
                </label>
                <input
                  type="text"
                  value={draftSetting.passingGradeStatus?.unassessedLabel || 'Belum Dinilai'}
                  onChange={(e) =>
                    setDraftSetting((prev) => ({
                      ...prev,
                      passingGradeStatus: {
                        passingLabel: prev.passingGradeStatus?.passingLabel || 'Tuntas',
                        remedialLabel: prev.passingGradeStatus?.remedialLabel || 'Perlu Remedial',
                        unassessedLabel: e.target.value
                      }
                    }))
                  }
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-slate-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RIWAYAT PERUBAHAN (AUDIT TRAIL) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                Catatan Riwayat Perubahan Kebijakan Akademik
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Setiap perubahan bobot dan aturan penilaian dicatat secara transparan untuk akuntabilitas sekolah.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              Total Log: {academicSettingLogs.length}
            </span>
          </div>

          {academicSettingLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
              Belum ada riwayat perubahan pengaturan yang tercatat di sistem.
            </div>
          ) : (
            <div className="space-y-3">
              {academicSettingLogs.map((log, idx) => {
                const yearObj = academicYears.find((ay) => ay.id === log.academicYearId || ay.name === log.academicYearId);
                const periodLabel = `${yearObj?.name || log.academicYearId} - Semester ${log.semester}`;

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700">
                          Versi {log.version}
                        </span>
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-200 text-slate-700">
                          {periodLabel}
                        </span>
                        <strong className="text-slate-800">{log.updatedBy}</strong>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Versi Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400">
                        {new Date(log.updatedAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-2">
                      <div>
                        <p className="font-semibold text-slate-700 mb-1 text-[11px]">Rincian Perubahan:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                          {log.changes.map((ch, i) => (
                            <li key={i}>{ch}</li>
                          ))}
                        </ul>
                      </div>

                      {log.previousState && log.newState && (
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500">
                          <div>
                            <span className="font-medium text-slate-600">Metode: </span>
                            {log.previousState.calculationMethod || 'WEIGHTED'} &rarr;{' '}
                            <strong className="text-slate-700">{log.newState.calculationMethod || 'WEIGHTED'}</strong>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Pembulatan: </span>
                            {log.previousState.rounding || '1_decimal'} &rarr;{' '}
                            <strong className="text-slate-700">{log.newState.rounding || '1_decimal'}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE LIVE SIMULATOR: UJI COBA PERHITUNGAN LANGSUNG */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-300" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Simulator Perhitungan Nilai Langsung
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-800 text-indigo-200 border border-indigo-700">
                Uji Coba Real-Time
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              Gunakan simulator ini untuk memverifikasi secara langsung hasil akhir rumus dengan konfigurasi yang Anda buat saat ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Preset Test 1: 80, 85, 91, 89
                setSimTugas(80);
                setSimUH(85);
                setSimSTS(91);
                setSimSAS(89);
                setSimSubjectKkm(75);
              }}
              className="px-2.5 py-1 text-[11px] font-medium bg-indigo-800/80 hover:bg-indigo-700 rounded-lg transition border border-indigo-700 text-indigo-100 cursor-pointer"
            >
              Test 1: (80, 85, 91, 89)
            </button>
            <button
              type="button"
              onClick={() => {
                // Preset Test 2: 79 vs KKM 80
                setSimTugas(79);
                setSimUH(79);
                setSimSTS(79);
                setSimSAS(79);
                setSimSubjectKkm(80);
              }}
              className="px-2.5 py-1 text-[11px] font-medium bg-indigo-800/80 hover:bg-indigo-700 rounded-lg transition border border-indigo-700 text-indigo-100 cursor-pointer"
            >
              Test 2: Nilai 79 (KKM 80)
            </button>
            <button
              type="button"
              onClick={() => {
                // Preset Only UH 85
                setSimTugas('');
                setSimUH(85);
                setSimSTS('');
                setSimSAS('');
              }}
              className="px-2.5 py-1 text-[11px] font-medium bg-indigo-800/80 hover:bg-indigo-700 rounded-lg transition border border-indigo-700 text-indigo-100 cursor-pointer"
            >
              Uji: Hanya UH 85
            </button>
          </div>
        </div>

        {/* Simulator Input Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-indigo-200 mb-1">
              Tugas {draftSetting.components.find((c) => c.code === 'Tugas')?.weight}%
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={simTugas}
              onChange={(e) => setSimTugas(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Kosong"
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-indigo-200 mb-1">
              UH {draftSetting.components.find((c) => c.code === 'UH')?.weight}%
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={simUH}
              onChange={(e) => setSimUH(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Kosong"
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-indigo-200 mb-1">
              STS {draftSetting.components.find((c) => c.code === 'STS')?.weight}%
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={simSTS}
              onChange={(e) => setSimSTS(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Kosong"
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-indigo-200 mb-1">
              SAS {draftSetting.components.find((c) => c.code === 'SAS')?.weight}%
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={simSAS}
              onChange={(e) => setSimSAS(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Kosong"
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-medium text-indigo-200 mb-1">
              KKM Mapel
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={simSubjectKkm}
              onChange={(e) => setSimSubjectKkm(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold">
              Hasil Simulasi Nilai Akhir:
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-white">
                {simResult.formattedFinalScore ?? (simResult.finalScore !== null ? simResult.finalScore : '-')}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  simResult.isPassing
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : simResult.finalScore === null
                    ? 'bg-white/10 text-white/60'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}
              >
                {simResult.statusLabel}
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/70 font-mono">
              Metode:{' '}
              {draftSetting.calculationMethod === 'WEIGHTED'
                ? 'Rata-rata Berbobot'
                : 'Rata-rata Biasa'}{' '}
              | Pembulatan: {draftSetting.rounding}
            </p>
          </div>

          <div className="text-right text-xs text-indigo-100/90 sm:border-l sm:border-white/15 sm:pl-4 space-y-0.5">
            <div>
              {simTugas === 80 && simUH === 85 && simSTS === 91 && simSAS === 89 && (
                <span className="text-[11px] text-emerald-300 font-mono">
                  {draftSetting.calculationMethod === 'WEIGHTED'
                    ? `(80 × ${draftSetting.components[0]?.weight}%) + (85 × ${draftSetting.components[1]?.weight}%) + (91 × ${draftSetting.components[2]?.weight}%) + (89 × ${draftSetting.components[3]?.weight}%) = ${simResult.formattedFinalScore}`
                    : `(80 + 85 + 91 + 89) / 4 = ${simResult.formattedFinalScore}`}
                </span>
              )}
              {simTugas !== '' && simUH === 85 && simSTS === 90 && simSAS === 88 && (
                <span className="text-[11px] text-emerald-300 font-mono">
                  {draftSetting.calculationMethod === 'WEIGHTED'
                    ? `(80 × ${draftSetting.components[0]?.weight}%) + (85 × ${draftSetting.components[1]?.weight}%) + (90 × ${draftSetting.components[2]?.weight}%) + (88 × ${draftSetting.components[3]?.weight}%) = ${simResult.formattedFinalScore}`
                    : `(80 + 85 + 90 + 88) / 4 = ${simResult.formattedFinalScore}`}
                </span>
              )}
              {simTugas === '' && simUH === 85 && simSTS === '' && simSAS === '' && (
                <span className="text-[11px] text-emerald-300 font-mono">
                  Hanya UH diisi = 85. Komponen kosong tidak menurunkan nilai menjadi 21.25.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL BEFORE SAVING */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Pengaturan Penilaian
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apakah Anda yakin ingin menyimpan kebijakan penilaian ini?
                </p>
              </div>
            </div>

            {/* Change Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Periode Berlaku:</span>
                <span className="text-indigo-600 font-bold">
                  {selectedYearObj?.name || selectedAcademicYearId} — {selectedSemester}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Versi Baru:</span>
                <span className="font-mono font-bold text-slate-800">
                  v{(draftSetting.version || 1) + 1}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode Penilaian:</span>
                <span className="font-semibold text-slate-800">
                  {draftSetting.calculationMethod === 'WEIGHTED'
                    ? 'Rata-rata Berbobot'
                    : 'Rata-rata Biasa'}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-700 block mb-1">
                  Komponen Aktif & Bobot:
                </span>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                  {draftSetting.components
                    .filter((c) => c.enabled)
                    .map((c) => (
                      <div key={c.code}>
                        • {c.name}: <strong>{c.weight}%</strong>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Optional Change Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Perubahan (Opsional untuk Catatan Rilis/Log)
              </label>
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Contoh: Menyesuaikan bobot SAS menjadi 30% berdasarkan rapat dewan guru semester ganjil."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
