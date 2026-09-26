import React, { useState, useEffect } from 'react';
import { MyClassesView } from './MyClassesView';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_REPORT_CARDS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ACADEMIC_YEARS,
  DEMO_USERS
} from '../lib/mockData';
import { useAuth } from '../context/AuthContext';
import { useMasterData } from '../context/MasterDataContext';
import { formatReportProgram } from '../lib/dbService';
import {
  BookOpen,
  ClipboardList,
  CalendarDays,
  Award,
  UserCog,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  Database,
  School,
  UserCheck,
  MapPin,
  Save,
  AlertCircle,
  Info
} from 'lucide-react';

export const GenericModuleView: React.FC<{ tab: string }> = ({ tab }) => {
  const { role } = useAuth();
  const { activeAcademicYear, classes, students, schoolIdentity, saveSchoolIdentity } = useMasterData();

  const [formData, setFormData] = useState({
    schoolName: schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan',
    programName: schoolIdentity.programName || 'PKBM AL-QOLAM',
    npsn: schoolIdentity.npsn || '',
    address:
      schoolIdentity.address ||
      'Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung',
    mudirName: schoolIdentity.mudirName || '',
    mudirNip: schoolIdentity.mudirNip || '',
    leaderTitle: schoolIdentity.leaderTitle || 'Mudir / Kepala Sekolah',
    city: schoolIdentity.city || 'Tulang Bawang Barat',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync form state whenever schoolIdentity loads or updates from Firestore
  useEffect(() => {
    setFormData({
      schoolName: schoolIdentity.schoolName || 'Pesantren Islam Mutiara Insan',
      programName: schoolIdentity.programName || 'PKBM AL-QOLAM',
      npsn: schoolIdentity.npsn || '',
      address:
        schoolIdentity.address ||
        'Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung',
      mudirName: schoolIdentity.mudirName || '',
      mudirNip: schoolIdentity.mudirNip || '',
      leaderTitle: schoolIdentity.leaderTitle || 'Mudir / Kepala Sekolah',
      city: schoolIdentity.city || 'Tulang Bawang Barat',
    });
  }, [schoolIdentity]);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);

    if (!formData.schoolName.trim()) {
      setSaveError('Nama Lembaga/Sekolah wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      await saveSchoolIdentity({
        schoolName: formData.schoolName.trim(),
        programName: formData.programName.trim() || 'PKBM AL-QOLAM',
        npsn: formData.npsn.trim(),
        address: formData.address.trim(),
        mudirName: formData.mudirName.trim(),
        mudirNip: formData.mudirNip.trim(),
        leaderTitle: formData.leaderTitle.trim() || 'Mudir / Kepala Sekolah',
        city: formData.city.trim() || 'Tulang Bawang Barat',
      });
      setSaveSuccess('Identitas Sekolah, Program, Alamat, dan Data Mudir berhasil disimpan ke database.');
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setSaveError(err?.message || 'Gagal menyimpan pengaturan identitas sekolah.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mata Pelajaran View
  if (tab === 'subjects') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Mata Pelajaran</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kurikulum mata pelajaran dan Kriteria Ketuntasan Minimal (KKM)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode Mapel</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-center">Standar KKM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_SUBJECTS.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{s.code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-indigo-600">{s.kkm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Penugasan Guru View
  if (tab === 'assignments') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Penugasan Guru (Jadwal & Rombel)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Relasi penugasan: teacherId &harr; classId &harr; subjectId &harr; academicYearId
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Beban Ajar</th>
                <th className="py-3 px-4">Tahun Ajaran / Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_ASSIGNMENTS.map((asg) => {
                const t = INITIAL_TEACHERS.find((item) => item.id === asg.teacherId);
                const c = INITIAL_CLASSES.find((item) => item.id === asg.classId);
                const s = INITIAL_SUBJECTS.find((item) => item.id === asg.subjectId);

                return (
                  <tr key={asg.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{t?.name || asg.teacherId}</div>
                      <div className="text-[11px] text-slate-400 font-mono">NIP. {t?.nip}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-indigo-700">{s?.name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c?.name}</td>
                    <td className="py-3 px-4 text-slate-600">{asg.totalHoursPerWeek} Jam/Minggu</td>
                    <td className="py-3 px-4 text-slate-500">2025/2026 ({asg.semester})</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Kelas & Mapel Saya (Khusus Guru Mapel)
  if (tab === 'my-classes') {
    return <MyClassesView />;
  }

  // Rapor View
  if (tab === 'report-cards') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Rapor Siswa</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi pencapaian akademik, kehadiran, dan catatan perkembangan peserta didik
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>Tahun Ajaran:</span>
            <strong className="text-slate-900 font-semibold">
              {activeAcademicYear ? `${activeAcademicYear.name} - ${activeAcademicYear.semester}` : 'Belum Ada'}
            </strong>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">Rata-Rata Nilai</th>
                <th className="py-3 px-4">Kehadiran (H/S/I/A)</th>
                <th className="py-3 px-4">Catatan Wali Kelas</th>
                <th className="py-3 px-4">Status Rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_REPORT_CARDS.map((rc) => {
                const st = INITIAL_STUDENTS.find((item) => item.id === rc.studentId);
                const cl = INITIAL_CLASSES.find((item) => item.id === rc.classId);

                return (
                  <tr key={rc.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{st?.name}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{cl?.name}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-600">{rc.averageScore}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {rc.attendanceSummary?.hadir} / {rc.attendanceSummary?.sakit} / {rc.attendanceSummary?.izin} / {rc.attendanceSummary?.alpa}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic max-w-xs">{rc.homeroomNotes}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {rc.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Tahun Ajaran View
  if (tab === 'academic-years') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tahun Ajaran</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen periode kalender akademik dan semester aktif
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tahun Ajaran</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INITIAL_ACADEMIC_YEARS.map((ay) => (
                <tr key={ay.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{ay.name}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{ay.semester}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {ay.startDate} s/d {ay.endDate}
                  </td>
                  <td className="py-3 px-4">
                    {ay.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                        Arsip
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Pengguna View (Users & Roles)
  if (tab === 'users') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna (RBAC)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar akun dan hak akses pengguna AKSARA pada Firestore collection <code>users</code>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Role Akses</th>
                <th className="py-3 px-4">Relasi Guru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_USERS.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-3 px-4 text-slate-700">{u.email}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{u.nip || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {u.teacherId || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Settings View (Pengaturan Sekolah & Data Mudir)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <School className="w-6 h-6 text-indigo-600" />
            Pengaturan Sekolah &amp; Data Mudir
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi resmi identitas lembaga dan data pimpinan (Mudir/Kepala Sekolah) sebagai sumber data utama Cetak Rapor
          </p>
        </div>
        {schoolIdentity.updatedAt && (
          <div className="text-[11px] text-slate-400 font-mono">
            Terakhir diperbarui: {new Date(schoolIdentity.updatedAt).toLocaleString('id-ID')}
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Edit Identitas Sekolah & Data Mudir */}
        <form
          onSubmit={handleSaveIdentity}
          className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5"
        >
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600" />
              1. Identitas Lembaga / Sekolah
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Data ini akan langsung tampil pada kop dan informasi sekolah di lembar Cetak Rapor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lembaga/Sekolah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                placeholder="Contoh: Pesantren Islam Mutiara Insan"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Program (PKBM / Penyelenggara) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.programName}
                onChange={(e) => setFormData({ ...formData, programName: e.target.value })}
                placeholder="Contoh: PKBM AL-QOLAM"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Keterangan <strong>(Paket B)</strong> untuk Kelas VII–IX dan <strong>(Paket C)</strong> untuk Kelas X–XII akan ditambahkan secara otomatis pada Cetak Rapor sesuai kelas siswa.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NPSN
              </label>
              <input
                type="text"
                value={formData.npsn}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                placeholder="Contoh: 20108899"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kota/Kabupaten (Tempat Tanda Tangan Rapor)
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Contoh: Tulang Bawang Barat"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Sekolah <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Contoh: Jl. Tuan Rio II RT 10/RW 05 Bandar Dewa Tulang Bawang Barat - Lampung"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>
          </div>

          <div className="border-t border-b border-slate-100 py-3 pt-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              2. Data Pimpinan (Mudir / Kepala Sekolah)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Digunakan khusus untuk identitas pimpinan yang menandatangani rapor. Mudir tidak perlu dimasukkan ke menu Data Guru apabila tidak mengajar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Mudir/Kepala Sekolah
              </label>
              <input
                type="text"
                value={formData.mudirName}
                onChange={(e) => setFormData({ ...formData, mudirName: e.target.value })}
                placeholder="Contoh: Ust. H. Ahmad Fauzi, Lc., M.Ag."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP/NIK Mudir
              </label>
              <input
                type="text"
                value={formData.mudirNip}
                onChange={(e) => setFormData({ ...formData, mudirNip: e.target.value })}
                placeholder="Contoh: 197503122000031001 atau -"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jabatan Pimpinan
              </label>
              <input
                type="text"
                value={formData.leaderTitle}
                onChange={(e) => setFormData({ ...formData, leaderTitle: e.target.value })}
                placeholder="Contoh: Mudir / Kepala Sekolah"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>

        {/* Live Preview Panel for Report Card */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Info className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pratinjau pada Cetak Rapor
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Identitas Sekolah di Rapor:
              </div>
              <div className="grid grid-cols-[105px_8px_1fr] gap-y-1.5 text-[11px]">
                <span className="text-slate-500">Nama Sekolah</span>
                <span>:</span>
                <span className="font-bold text-slate-900">{formData.schoolName || '-'}</span>

                <span className="text-slate-500">Program (VII–IX)</span>
                <span>:</span>
                <span className="font-semibold text-indigo-700">
                  {formatReportProgram(formData.programName, { name: 'VII', gradeLevel: 7 })}
                </span>

                <span className="text-slate-500">Program (X–XII)</span>
                <span>:</span>
                <span className="font-semibold text-indigo-700">
                  {formatReportProgram(formData.programName, { name: 'X', gradeLevel: 10 })}
                </span>

                <span className="text-slate-500">Alamat</span>
                <span>:</span>
                <span className="text-slate-800">{formData.address || '-'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
                Blok Tanda Tangan Pimpinan:
              </div>
              <div className="pt-1 text-[11px] text-slate-600">
                <p className="text-right text-[10px] text-slate-500 mb-2">
                  {formData.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p>Mengetahui</p>
                <p className="font-semibold text-slate-800">
                  {formData.leaderTitle || 'Mudir / Kepala Sekolah'}
                </p>
                <div className="h-10" />
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-36">
                  {formData.mudirName || '(..........................................)'}
                </p>
                {formData.mudirNip && (
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    NIP/NIK. {formData.mudirNip}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-800 leading-relaxed">
              Perubahan yang disimpan pada halaman ini akan langsung tersimpan di Firestore dan otomatis digunakan pada halaman <strong>Cetak Rapor</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
