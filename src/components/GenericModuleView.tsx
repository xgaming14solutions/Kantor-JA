import React from 'react';
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
import {
  BookOpen,
  ClipboardList,
  CalendarDays,
  Award,
  UserCog,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  Database
} from 'lucide-react';

export const GenericModuleView: React.FC<{ tab: string }> = ({ tab }) => {
  const { role } = useAuth();
  const { activeAcademicYear, classes, students } = useMasterData();

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
            Daftar akun dan hak akses pengguna KantoJA pada Firestore collection <code>users</code>
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

  // Settings View
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan Sekolah</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Konfigurasi umum identitas sekolah dan integrasi sistem
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lembaga Sekolah</label>
          <input
            type="text"
            readOnly
            value="SMP / MTs Unggulan KantoJA"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">NPSN</label>
          <input
            type="text"
            readOnly
            value="20108899"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Sekolah</label>
          <textarea
            readOnly
            rows={2}
            value="Jl. Pendidikan Nasional No. 45, Kompleks Akademika, Indonesia"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
          />
        </div>
        <div className="pt-2">
          <button
            onClick={() => alert('Pengaturan tersimpan.')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};
