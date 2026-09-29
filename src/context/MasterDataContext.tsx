import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  StudentReportNote,
  Attendance,
  ExtracurricularParticipant,
  ExtracurricularScore,
  SchoolIdentity,
  KesantrianRecord,
  KesantrianMedicine,
  KesantrianViolationCategory,
  MabitPeriod,
  isKesantrianOfficerRole,
  getKesantrianOfficerLabel,
  isKepalaKesantrianUser,
  AtkCategory,
  AtkItem,
  AtkTransaction,
  AtkRequest,
  isAtkAdminRole,
  AcademicCalendarEvent,
  canManageAcademicCalendar
} from '../types';
import {
  fetchCollection,
  saveDocument,
  deleteDocument,
  setActiveAcademicYearDoc,
  seedDatabaseIfEmpty,
  normalizeAcademicYear,
  normalizeScore,
  assertTeacherScoreAccess,
  DEFAULT_SCHOOL_IDENTITY,
  normalizeSchoolIdentity,
  getInitialSchoolIdentity,
  fetchSchoolIdentity,
  saveSchoolIdentityDoc,
  fetchAtkConfig,
  saveAtkConfig
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

export const INITIAL_VIOLATION_CATEGORIES: KesantrianViolationCategory[] = [
  { id: 'vcat_kedisiplinan', name: 'Kedisiplinan', description: 'Pelanggaran waktu, apel, jadwal kegiatan', isActive: true },
  { id: 'vcat_adab_akhlak', name: 'Adab/Akhlak', description: 'Sikap, tutur kata, dan adab terhadap guru/sesama santri', isActive: true },
  { id: 'vcat_ibadah', name: 'Ibadah', description: 'Shalat berjamaah, dzikir, tilawah, dan kegiatan ibadah', isActive: true },
  { id: 'vcat_kehadiran', name: 'Kehadiran', description: 'Ketidakhadiran tanpa keterangan pada kegiatan pesantren', isActive: true },
  { id: 'vcat_kerapian', name: 'Kerapian', description: 'Seragam, atribut, kebersihan diri dan kamar', isActive: true },
  { id: 'vcat_tata_tertib', name: 'Tata Tertib', description: 'Aturan umum pondok pesantren dan asrama', isActive: true },
  { id: 'vcat_keamanan', name: 'Keamanan', description: 'Barang terlarang, keluar komplek tanpa izin, keamanan lingkungan', isActive: true },
  { id: 'vcat_lainnya', name: 'Lainnya', description: 'Kategori pelanggaran lain di luar daftar utama', isActive: true },
];

export const INITIAL_ATK_CATEGORIES: AtkCategory[] = [
  { id: 'atk_cat_atk', name: 'ATK', description: 'Alat tulis kantor umum (pulpen, pensil, penggaris, korektor, dll.)', isActive: true },
  { id: 'atk_cat_kertas', name: 'Kertas', description: 'Kertas HVS A4/F4, amplop, buku agenda, kertas sertifikat', isActive: true },
  { id: 'atk_cat_tinta', name: 'Tinta & Printer', description: 'Tinta printer, cartridge, toner, pita printer', isActive: true },
  { id: 'atk_cat_admin', name: 'Administrasi', description: 'Map snelhecter, ordner/bantex, staples, penjepit kertas, lakban', isActive: true },
  { id: 'atk_cat_kebersihan', name: 'Kebersihan', description: 'Sapu, pel, cairan pembersih, tisu, pengharum ruangan', isActive: true },
  { id: 'atk_cat_guru', name: 'Perlengkapan Guru', description: 'Spidol whiteboard, tinta spidol, penghapus papan tulis, buku absen', isActive: true },
  { id: 'atk_cat_lainnya', name: 'Lainnya', description: 'Kebutuhan operasional kantor dan sekolah lainnya', isActive: true },
];

export const INITIAL_ATK_ITEMS: AtkItem[] = [
  {
    id: 'atk_item_001',
    code: 'ATK-001',
    name: 'Kertas HVS A4 75gr',
    category: 'Kertas',
    unit: 'rim',
    stokSaatIni: 5,
    stokMinimum: 5,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 52000,
    keterangan: 'Kertas utama cetak dokumen, soal ujian, dan surat menyurat',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_002',
    code: 'ATK-002',
    name: 'Kertas HVS F4 / Folio 75gr',
    category: 'Kertas',
    unit: 'rim',
    stokSaatIni: 12,
    stokMinimum: 5,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 58000,
    keterangan: 'Kertas ukuran folio untuk berkas administrasi & rapor',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_003',
    code: 'ATK-003',
    name: 'Spidol Board Hitam',
    category: 'Perlengkapan Guru',
    unit: 'pcs',
    stokSaatIni: 18,
    stokMinimum: 10,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 9500,
    keterangan: 'Spidol papan tulis whiteboard untuk kegiatan mengajar di kelas',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_004',
    code: 'ATK-004',
    name: 'Spidol Board Biru',
    category: 'Perlengkapan Guru',
    unit: 'pcs',
    stokSaatIni: 0,
    stokMinimum: 8,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 9500,
    keterangan: 'Spidol whiteboard warna biru untuk penekanan materi di papan tulis',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_005',
    code: 'ATK-005',
    name: 'Tinta Isi Ulang Spidol Whiteboard Hitam',
    category: 'Perlengkapan Guru',
    unit: 'botol',
    stokSaatIni: 3,
    stokMinimum: 5,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 18500,
    keterangan: 'Refill tinta spidol whiteboard hitam',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_006',
    code: 'ATK-006',
    name: 'Penghapus Whiteboard Magnetik',
    category: 'Perlengkapan Guru',
    unit: 'buah',
    stokSaatIni: 14,
    stokMinimum: 6,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 8000,
    keterangan: 'Penghapus papan tulis ruang kelas',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_007',
    code: 'ATK-007',
    name: 'Tinta Printer Epson 003 Hitam',
    category: 'Tinta & Printer',
    unit: 'botol',
    stokSaatIni: 2,
    stokMinimum: 3,
    lokasiPenyimpanan: 'Lemari IT / TU',
    hargaPerkiraan: 85000,
    keterangan: 'Tinta printer utama ruang TU dan Kepala Sekolah',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_008',
    code: 'ATK-008',
    name: 'Pulpen Gel Hitam 0.5mm',
    category: 'ATK',
    unit: 'kotak',
    stokSaatIni: 7,
    stokMinimum: 3,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 28000,
    keterangan: '1 kotak isi 12 pcs untuk guru dan staf administrasi',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_009',
    code: 'ATK-009',
    name: 'Map Snelhecter Plastik Folio',
    category: 'Administrasi',
    unit: 'pak',
    stokSaatIni: 9,
    stokMinimum: 4,
    lokasiPenyimpanan: 'Lemari Arsip TU',
    hargaPerkiraan: 36000,
    keterangan: 'Map penyimpanan dokumen arsip siswa dan kurikulum',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_010',
    code: 'ATK-010',
    name: 'Ordner / Bantex F4',
    category: 'Administrasi',
    unit: 'buah',
    stokSaatIni: 0,
    stokMinimum: 6,
    lokasiPenyimpanan: 'Lemari Arsip TU',
    hargaPerkiraan: 32000,
    keterangan: 'Ordner tebal untuk arsip surat masuk/keluar dan keuangan',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_011',
    code: 'ATK-011',
    name: 'Amplop Putih Kabinet Panjang',
    category: 'Kertas',
    unit: 'kotak',
    stokSaatIni: 2,
    stokMinimum: 3,
    lokasiPenyimpanan: 'Ruang TU',
    hargaPerkiraan: 24000,
    keterangan: 'Amplop surat resmi undangan wali santri dan dinas',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'atk_item_012',
    code: 'ATK-012',
    name: 'Cairan Pembersih Lantai 800ml',
    category: 'Kebersihan',
    unit: 'botol',
    stokSaatIni: 0,
    stokMinimum: 4,
    lokasiPenyimpanan: 'Gudang Kebersihan',
    hargaPerkiraan: 16000,
    keterangan: 'Kebutuhan kebersihan ruang kantor, kelas, dan mushola',
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
];

export const INITIAL_ATK_TRANSACTIONS: AtkTransaction[] = [
  {
    id: 'atk_trx_001',
    type: 'MASUK',
    itemId: 'atk_item_001',
    itemCode: 'ATK-001',
    itemName: 'Kertas HVS A4 75gr',
    category: 'Kertas',
    unit: 'rim',
    jumlah: 10,
    tanggal: '2026-09-10',
    waktu: '08:30',
    stokSebelum: 0,
    stokSesudah: 10,
    sumberBarang: 'Pembelian Toko ATK Mulia',
    hargaSatuan: 52000,
    nomorNota: 'INV/ATK/2026/091',
    keterangan: 'Pengadaan rutin awal bulan',
    petugasId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    petugasNama: 'Administrator AKSARA',
    petugasRole: 'ADMIN',
    createdAt: '2026-09-10T08:30:00.000Z',
  },
  {
    id: 'atk_trx_002',
    type: 'KELUAR',
    itemId: 'atk_item_001',
    itemCode: 'ATK-001',
    itemName: 'Kertas HVS A4 75gr',
    category: 'Kertas',
    unit: 'rim',
    jumlah: 5,
    tanggal: '2026-09-18',
    waktu: '10:15',
    stokSebelum: 10,
    stokSesudah: 5,
    penerimaNama: 'Panitia Evaluasi & Kurikulum',
    keperluan: 'Pencetakan soal latihan dan modul pembelajaran',
    keterangan: 'Diserahkan untuk penggandaan soal kelas VII - XII',
    petugasId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    petugasNama: 'Administrator AKSARA',
    petugasRole: 'ADMIN',
    createdAt: '2026-09-18T10:15:00.000Z',
  },
  {
    id: 'atk_trx_003',
    type: 'KELUAR',
    itemId: 'atk_item_003',
    itemCode: 'ATK-003',
    itemName: 'Spidol Board Hitam',
    category: 'Perlengkapan Guru',
    unit: 'pcs',
    jumlah: 2,
    tanggal: '2026-09-22',
    waktu: '09:00',
    stokSebelum: 20,
    stokSesudah: 18,
    penerimaNama: 'Ustadz Ahmad Fauzi',
    keperluan: 'Mengajar di Kelas',
    requestId: 'atk_req_003',
    keterangan: 'Penyerahan permintaan ATK guru',
    petugasId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    petugasNama: 'Administrator AKSARA',
    petugasRole: 'ADMIN',
    createdAt: '2026-09-22T09:00:00.000Z',
  },
];

export const INITIAL_ATK_REQUESTS: AtkRequest[] = [
  {
    id: 'atk_req_001',
    itemId: 'atk_item_003',
    itemCode: 'ATK-003',
    itemName: 'Spidol Board Hitam',
    category: 'Perlengkapan Guru',
    unit: 'pcs',
    jumlahDiminta: 2,
    keperluan: 'Mengajar',
    catatan: 'Spidol di kelas VIII sudah habis tintanya',
    pemohonId: 'teacher_dwi',
    pemohonNama: 'Dwi Lestari',
    pemohonRole: 'GURU_MAPEL',
    tanggal: '2026-09-26',
    waktu: '08:15',
    status: 'Menunggu',
    createdAt: '2026-09-26T08:15:00.000Z',
    updatedAt: '2026-09-26T08:15:00.000Z',
  },
  {
    id: 'atk_req_002',
    itemId: 'atk_item_001',
    itemCode: 'ATK-001',
    itemName: 'Kertas HVS A4 75gr',
    category: 'Kertas',
    unit: 'rim',
    jumlahDiminta: 2,
    jumlahDisetujui: 2,
    keperluan: 'Ujian / Evaluasi Harian',
    catatan: 'Untuk cetak lembar soal ulangan harian Matematika & IPA',
    pemohonId: 'teacher_budi',
    pemohonNama: 'Budi Santoso',
    pemohonRole: 'WALI_KELAS',
    tanggal: '2026-09-25',
    waktu: '11:20',
    status: 'Disetujui',
    catatanAdmin: 'Disetujui, silakan ambil di Ruang TU',
    diprosesOlehId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    diprosesOlehNama: 'Administrator AKSARA',
    tanggalDiproses: '2026-09-25T13:00:00.000Z',
    createdAt: '2026-09-25T11:20:00.000Z',
    updatedAt: '2026-09-25T13:00:00.000Z',
  },
  {
    id: 'atk_req_003',
    itemId: 'atk_item_003',
    itemCode: 'ATK-003',
    itemName: 'Spidol Board Hitam',
    category: 'Perlengkapan Guru',
    unit: 'pcs',
    jumlahDiminta: 2,
    jumlahDisetujui: 2,
    keperluan: 'Mengajar',
    catatan: 'Kebutuhan mengajar pekan ini',
    pemohonId: 'teacher_fauzi',
    pemohonNama: 'Ustadz Ahmad Fauzi',
    pemohonRole: 'GURU_MAPEL',
    tanggal: '2026-09-22',
    waktu: '08:00',
    status: 'Sudah Diberikan',
    catatanAdmin: 'Sudah diserahkan langsung di Ruang TU',
    diprosesOlehId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    diprosesOlehNama: 'Administrator AKSARA',
    tanggalDiproses: '2026-09-22T08:45:00.000Z',
    diserahkanOlehId: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    diserahkanOlehNama: 'Administrator AKSARA',
    tanggalDiserahkan: '2026-09-22T09:00:00.000Z',
    transactionId: 'atk_trx_003',
    createdAt: '2026-09-22T08:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z',
  },
];

export const INITIAL_ACADEMIC_CALENDAR_EVENTS: AcademicCalendarEvent[] = [
  {
    id: 'cal_init_001',
    title: 'Hari Pertama Masuk & Awal Semester Ganjil 2026/2027',
    category: 'Awal Semester',
    startDate: '2026-07-13',
    endDate: '2026-07-13',
    startTime: '07:30',
    endTime: '12:00',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    classIds: [],
    location: 'Halaman Utama Pesantren Islam Mutiara Insan',
    personInCharge: 'Kepala Sekolah & Kepala Kesantrian',
    description: 'Apel pembukaan tahun ajaran baru 2026/2027, orientasi halaqah tahfiz, dan pembagian jadwal pembelajaran.',
    status: 'Selesai',
    createdBy: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    createdByName: 'Administrator AKSARA',
    createdByRole: 'ADMIN',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-13T12:00:00.000Z',
  },
  {
    id: 'cal_init_002',
    title: 'Rapat Koordinasi Guru & Evaluasi Pembelajaran Bulanan',
    category: 'Rapat Guru',
    startDate: '2026-09-28',
    endDate: '2026-09-28',
    startTime: '13:30',
    endTime: '15:30',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    classIds: [],
    location: 'Ruang Rapat Guru',
    personInCharge: 'Kepala Sekolah',
    description: 'Evaluasi ketuntasan materi, kesiapan soal Sumatif Tengah Semester, dan koordinasi wali kelas.',
    status: 'Terjadwal',
    createdBy: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    createdByName: 'Administrator AKSARA',
    createdByRole: 'ADMIN',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
  },
  {
    id: 'cal_init_003',
    title: 'Sumatif Tengah Semester (STS) Ganjil',
    category: 'Sumatif Tengah Semester',
    startDate: '2026-10-05',
    endDate: '2026-10-10',
    startTime: '07:30',
    endTime: '12:00',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    classIds: [],
    location: 'Seluruh Ruang Kelas',
    personInCharge: 'Panitia Evaluasi Akademik',
    description: 'Pelaksanaan ujian Sumatif Tengah Semester Ganjil untuk seluruh rombongan belajar.',
    status: 'Terjadwal',
    createdBy: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    createdByName: 'Administrator AKSARA',
    createdByRole: 'ADMIN',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
  },
  {
    id: 'cal_init_004',
    title: 'Ujian Tasmi’ & Evaluasi Capaian Tahfiz Al-Qur’an',
    category: 'Kegiatan Tahfiz',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
    startTime: '08:00',
    endTime: '15:00',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    classIds: [],
    location: 'Masjid & Ruang Tahfiz Pesantren',
    personInCharge: 'Koordinator Tahfiz',
    description: 'Simak hafalan Al-Qur’an santri sekali duduk (Tasmi’) dan evaluasi target ziyadah.',
    status: 'Terjadwal',
    createdBy: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    createdByName: 'Administrator AKSARA',
    createdByRole: 'ADMIN',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
  },
  {
    id: 'cal_init_005',
    title: 'Sumatif Akhir Semester (SAS) Ganjil',
    category: 'Sumatif Akhir Semester',
    startDate: '2026-12-07',
    endDate: '2026-12-12',
    startTime: '07:30',
    endTime: '12:00',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    classIds: [],
    location: 'Seluruh Ruang Kelas',
    personInCharge: 'Panitia Ujian Semester',
    description: 'Ujian Sumatif Akhir Semester Ganjil Tahun Ajaran 2026/2027.',
    status: 'Terjadwal',
    createdBy: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    createdByName: 'Administrator AKSARA',
    createdByRole: 'ADMIN',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
  },
  {
    id: 'cal_init_006',
    title: 'Pembagian Raport Hasil Belajar Semester Ganjil',
    category: 'Pembagian Raport',
    startDate: '2026-12-19',
    endDate: '2026-12-19',
    startTime: '08:00',
    endTime: '11:30',
    academicYearId: 'ay_2026_2027_1',
    semester: 'Ganjil',
    classIds: [],
    location: 'Aula & Ruang Kelas Masing-Masing',
    personInCharge: 'Kepala Sekolah & Wali Kelas',
    description: 'Penyerahan Lembar Hasil Belajar Siswa (Raport) kepada Orang Tua / Wali Santri.',
    status: 'Terjadwal',
    createdBy: 'bw4vhDGo40hZy6ekCs4xTGqpgwg1',
    createdByName: 'Administrator AKSARA',
    createdByRole: 'ADMIN',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
  },
];

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
  studentReportNotes: StudentReportNote[];
  attendance: Attendance[];
  extracurricularParticipants: ExtracurricularParticipant[];
  extracurricularScores: ExtracurricularScore[];
  schoolIdentity: SchoolIdentity;
  kesantrianRecords: KesantrianRecord[];
  kesantrianMedicines: KesantrianMedicine[];
  kesantrianViolationCategories: KesantrianViolationCategory[];
  mabitPeriods: MabitPeriod[];
  atkCategories: AtkCategory[];
  atkItems: AtkItem[];
  atkTransactions: AtkTransaction[];
  atkRequests: AtkRequest[];
  academicCalendarEvents: AcademicCalendarEvent[];
  allowTeacherViewAtkStock: boolean;
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
  deleteSubject: (id: string) => Promise<void>;
  saveTeacherAssignment: (data: TeacherAssignment) => Promise<void>;
  deleteTeacherAssignment: (id: string) => Promise<void>;
  saveUser: (data: UserProfile) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveScore: (data: Score) => Promise<void>;
  deleteScore: (id: string) => Promise<void>;
  saveReportCard: (data: ReportCard) => Promise<void>;
  getStudentReportNote: (
    studentId: string,
    academicYearId: string,
    semester: string,
    classId?: string
  ) => StudentReportNote | null;
  saveStudentReportNote: (data: {
    studentId: string;
    classId?: string;
    academicYearId: string;
    semester: 'Ganjil' | 'Genap' | 'GANJIL' | 'GENAP';
    note: string;
    status?: ReportCard['status'];
  }) => Promise<StudentReportNote>;
  saveAttendance: (data: Attendance) => Promise<void>;
  saveExtracurricularParticipants: (
    extracurricularId: string,
    classId: string,
    academicYearId: string,
    semester: string,
    selectedStudentIds: string[]
  ) => Promise<void>;
  saveExtracurricularScore: (
    data: Omit<ExtracurricularScore, 'id'> & { id?: string }
  ) => Promise<ExtracurricularScore>;
  deleteExtracurricularScore: (id: string) => Promise<void>;
  getAcademicSetting: (academicYearId: string, semester: 'Ganjil' | 'Genap') => AcademicSetting;
  saveAcademicSetting: (
    data: AcademicSetting,
    updatedByName: string,
    changeNotes?: string[]
  ) => Promise<void>;
  saveSchoolIdentity: (data: Partial<SchoolIdentity>) => Promise<SchoolIdentity>;
  saveKesantrianRecord: (data: KesantrianRecord) => Promise<void>;
  deleteKesantrianRecord: (id: string) => Promise<void>;
  restoreKesantrianRecord: (id: string) => Promise<void>;
  saveKesantrianMedicine: (data: KesantrianMedicine) => Promise<void>;
  deleteKesantrianMedicine: (id: string) => Promise<void>;
  saveKesantrianViolationCategory: (data: KesantrianViolationCategory) => Promise<void>;
  deleteKesantrianViolationCategory: (
    id: string
  ) => Promise<{ action: 'deleted' | 'deactivated'; message: string }>;
  saveMabitPeriod: (data: MabitPeriod) => Promise<void>;
  deleteMabitPeriod: (id: string) => Promise<void>;
  setAllowTeacherViewAtkStock: (allowed: boolean) => void;
  saveAtkCategory: (data: AtkCategory) => Promise<void>;
  deleteAtkCategory: (id: string) => Promise<{ action: 'deleted' | 'deactivated'; message: string }>;
  saveAtkItem: (data: AtkItem, isNewItem?: boolean) => Promise<void>;
  toggleAtkItemStatus: (id: string) => Promise<void>;
  recordAtkIncoming: (input: {
    itemId: string;
    jumlah: number;
    tanggal: string;
    sumberBarang: string;
    hargaSatuan?: number;
    nomorNota?: string;
    keterangan?: string;
    petugasNama?: string;
  }) => Promise<AtkTransaction>;
  recordAtkOutgoing: (input: {
    itemId: string;
    jumlah: number;
    tanggal: string;
    penerimaId?: string;
    penerimaNama: string;
    penerimaRole?: string;
    keperluan: string;
    keterangan?: string;
    requestId?: string;
    petugasNama?: string;
  }) => Promise<AtkTransaction>;
  createAtkRequest: (input: {
    itemId: string;
    jumlahDiminta: number;
    keperluan: string;
    catatan?: string;
  }) => Promise<AtkRequest>;
  approveAtkRequest: (
    requestId: string,
    jumlahDisetujui: number,
    catatanAdmin?: string
  ) => Promise<void>;
  rejectAtkRequest: (requestId: string, catatanAdmin: string) => Promise<void>;
  handoverAtkRequest: (
    requestId: string,
    jumlahDiberikan?: number,
    catatanAdmin?: string
  ) => Promise<void>;
  cancelAtkRequest: (requestId: string) => Promise<void>;
  saveAcademicCalendarEvent: (data: AcademicCalendarEvent) => Promise<void>;
  deleteAcademicCalendarEvent: (id: string) => Promise<void>;
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
  const [studentReportNotes, setStudentReportNotes] = useState<StudentReportNote[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>(INITIAL_ATTENDANCE);
  const [extracurricularParticipants, setExtracurricularParticipants] = useState<ExtracurricularParticipant[]>([]);
  const [extracurricularScores, setExtracurricularScores] = useState<ExtracurricularScore[]>([]);
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity>(() =>
    getInitialSchoolIdentity()
  );
  const lastSavedIdentityAtRef = useRef<string>('');
  const [kesantrianRecords, setKesantrianRecords] = useState<KesantrianRecord[]>([]);
  const [kesantrianMedicines, setKesantrianMedicines] = useState<KesantrianMedicine[]>([]);
  const [kesantrianViolationCategories, setKesantrianViolationCategories] = useState<KesantrianViolationCategory[]>(
    INITIAL_VIOLATION_CATEGORIES
  );
  const [mabitPeriods, setMabitPeriods] = useState<MabitPeriod[]>([]);
  const [atkCategories, setAtkCategories] = useState<AtkCategory[]>(INITIAL_ATK_CATEGORIES);
  const [atkItems, setAtkItems] = useState<AtkItem[]>(INITIAL_ATK_ITEMS);
  const [atkTransactions, setAtkTransactions] = useState<AtkTransaction[]>(INITIAL_ATK_TRANSACTIONS);
  const [atkRequests, setAtkRequests] = useState<AtkRequest[]>(INITIAL_ATK_REQUESTS);
  const [academicCalendarEvents, setAcademicCalendarEvents] = useState<AcademicCalendarEvent[]>(
    INITIAL_ACADEMIC_CALENDAR_EVENTS
  );
  const [allowTeacherViewAtkStock, setAllowTeacherViewAtkStockState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kantoja_allow_teacher_view_atk_stock');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
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
        rawAttList,
        rawEksPartList,
        rawEksScoreList,
        loadedSchoolIdentity,
        rawKesantrianRecords,
        rawKesantrianMedicines,
        rawViolationCategories,
        rawMabitPeriods,
        rawAtkCategories,
        rawAtkItems,
        rawAtkTransactions,
        rawAtkRequests,
        loadedAtkConfig,
        rawStudentReportNotes,
        rawAcademicCalendar
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
        fetchCollection<Attendance>('attendance', INITIAL_ATTENDANCE),
        fetchCollection<ExtracurricularParticipant>('extracurricularParticipants', []),
        fetchCollection<ExtracurricularScore>('extracurricularScores', []),
        fetchSchoolIdentity(),
        fetchCollection<KesantrianRecord>('kesantrianRecords', []),
        fetchCollection<KesantrianMedicine>('kesantrianMedicines', []),
        fetchCollection<KesantrianViolationCategory>(
          'kesantrianViolationCategories',
          INITIAL_VIOLATION_CATEGORIES
        ),
        fetchCollection<MabitPeriod>('kesantrianMabitPeriods', []),
        fetchCollection<AtkCategory>('atkCategories', INITIAL_ATK_CATEGORIES),
        fetchCollection<AtkItem>('atkItems', INITIAL_ATK_ITEMS),
        fetchCollection<AtkTransaction>('atkTransactions', INITIAL_ATK_TRANSACTIONS),
        fetchCollection<AtkRequest>('atkRequests', INITIAL_ATK_REQUESTS),
        fetchAtkConfig(),
        fetchCollection<StudentReportNote>('studentReportNotes', []),
        fetchCollection<AcademicCalendarEvent>('academicCalendar', INITIAL_ACADEMIC_CALENDAR_EVENTS)
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

      // Ensure assignments have teacherId & subjectId & academicYearId & status & semester
      const asgList = rawAsgList.map(a => ({
        ...a,
        academicYearId: a.academicYearId || (activeYear ? activeYear.id : 'ay_2026_2027_1'),
        semester: (a.semester || (activeYear ? activeYear.semester : 'Ganjil')) as 'Ganjil' | 'Genap',
        status: a.status || 'Aktif',
      }));

      // Ensure students have classId and academicYearId
      const stList = rawStList.map(s => ({
        ...s,
        academicYearId: s.academicYearId || (activeYear ? activeYear.id : 'ay_2026_2027_1'),
      }));

      // Ensure users have isActive defaults and normalized roles (Kepala Kesantrian & Musyrif Kesantrian as 2 separate accounts)
      let userList: UserProfile[] = rawUsers.map(u => {
        const isLegacyKesantrian = u.role === 'PETUGAS_KESANTRIAN';
        const resolvedRole = isLegacyKesantrian
          ? u.kesantrianRole === 'MUSYRIF_KESANTRIAN' ||
            u.username?.toLowerCase().includes('musyrif') ||
            u.email?.toLowerCase().includes('musyrif')
            ? 'MUSYRIF_KESANTRIAN'
            : 'KEPALA_KESANTRIAN'
          : u.role === 'kepala_kesantrian'
          ? 'KEPALA_KESANTRIAN'
          : u.role === 'musyrif_kesantrian'
          ? 'MUSYRIF_KESANTRIAN'
          : u.role;
        return {
          ...u,
          role: resolvedRole,
          isActive: u.isActive !== false,
        };
      });

      // Ensure both Kepala Kesantrian and Musyrif Kesantrian exist as 2 distinct user accounts
      const hasKepalaKesantrian = userList.some(
        u =>
          u.role === 'KEPALA_KESANTRIAN' ||
          u.role === 'kepala_kesantrian' ||
          u.username?.toLowerCase() === 'kepalakesantrian'
      );
      if (!hasKepalaKesantrian) {
        const defaultKepala = DEMO_USERS.find(u => u.id === 'u_kepala_kesantrian');
        if (defaultKepala) {
          userList.push(defaultKepala);
          saveDocument('users', defaultKepala).catch(() => {});
        }
      }

      const hasMusyrifKesantrian = userList.some(
        u =>
          u.role === 'MUSYRIF_KESANTRIAN' ||
          u.role === 'musyrif_kesantrian' ||
          u.username?.toLowerCase() === 'musyrifkesantrian'
      );
      if (!hasMusyrifKesantrian) {
        const defaultMusyrif = DEMO_USERS.find(u => u.id === 'u_musyrif_kesantrian');
        if (defaultMusyrif) {
          userList.push(defaultMusyrif);
          saveDocument('users', defaultMusyrif).catch(() => {});
        }
      }

      // Ensure subjects have safe fallback for category, nameArab, and type
      const subList = rawSubList.map(s => ({
        ...s,
        type: s.type || 'subject',
        category: s.category || (s.type === 'extracurricular' ? '' : 'Umum'),
        nameArab: s.nameArab || '',
        kkm: typeof s.kkm === 'number' ? s.kkm : 75,
      }));

      // Ensure default setting for active year exists (exclude school_identity & atk_config docs from academic grading settings)
      let settingsList = rawSettings.filter((s: any) => s.id !== 'school_identity' && s.id !== 'atk_config');
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

      const normalizeBrandText = (val?: string) =>
        val ? String(val).replace(/kanto\s*ja/gi, 'AKSARA') : val;

      setAcademicYears(ayList);
      setTeachers(tList);
      setClasses(cList);
      setStudents(stList);
      setSubjects(subList);
      setTeacherAssignments(asgList);
      setUsers(
        userList.map((u) => ({
          ...u,
          name: normalizeBrandText(u.name || u.displayName) || u.name,
          displayName: normalizeBrandText(u.displayName || u.name) || u.displayName,
        }))
      );
      setScores(scList);
      setAcademicSettings(settingsList);
      setAcademicSettingLogs(
        rawLogs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
      setReportCards(rawRepList);
      setStudentReportNotes(rawStudentReportNotes || []);

      let resolvedCalendar = rawAcademicCalendar || [];
      const calendarAlreadySeeded =
        typeof localStorage !== 'undefined' &&
        localStorage.getItem('kantoja_academic_calendar_seeded') === 'true';
      if (resolvedCalendar.length === 0 && !calendarAlreadySeeded) {
        resolvedCalendar = INITIAL_ACADEMIC_CALENDAR_EVENTS;
        try {
          localStorage.setItem('kantoja_academic_calendar_seeded', 'true');
        } catch {
          // ignore
        }
        INITIAL_ACADEMIC_CALENDAR_EVENTS.forEach((ev) => {
          saveDocument('academicCalendar', ev).catch(() => {});
        });
      } else if (resolvedCalendar.length > 0 && !calendarAlreadySeeded) {
        try {
          localStorage.setItem('kantoja_academic_calendar_seeded', 'true');
        } catch {
          // ignore
        }
      }

      setAcademicCalendarEvents(
        resolvedCalendar
          .map((ev) => ({
            ...ev,
            endDate: ev.endDate || ev.startDate,
            classIds: Array.isArray(ev.classIds) ? ev.classIds : [],
            status: ev.status || 'Terjadwal',
          }))
          .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
      );
      setAttendance(rawAttList);
      setExtracurricularParticipants(rawEksPartList || []);
      setExtracurricularScores(rawEksScoreList || []);
      setSchoolIdentity((prev) => {
        if (
          lastSavedIdentityAtRef.current &&
          (!loadedSchoolIdentity.updatedAt ||
            loadedSchoolIdentity.updatedAt < lastSavedIdentityAtRef.current)
        ) {
          return prev;
        }
        if (
          prev.updatedAt &&
          loadedSchoolIdentity.updatedAt &&
          prev.updatedAt > loadedSchoolIdentity.updatedAt
        ) {
          return prev;
        }
        return loadedSchoolIdentity;
      });
      setKesantrianRecords(
        (rawKesantrianRecords || []).sort(
          (a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime()
        )
      );
      setKesantrianMedicines(rawKesantrianMedicines || []);

      // Ensure master violation categories exist
      const vCatList =
        rawViolationCategories && rawViolationCategories.length > 0
          ? rawViolationCategories.map((c) => ({ ...c, isActive: c.isActive !== false }))
          : INITIAL_VIOLATION_CATEGORIES;
      setKesantrianViolationCategories(vCatList);
      setMabitPeriods(
        (rawMabitPeriods || []).sort(
          (a, b) =>
            new Date(b.departureDate || b.createdAt || '').getTime() -
            new Date(a.departureDate || a.createdAt || '').getTime()
        )
      );

      // ATK & Persediaan Kantor initialization
      if (loadedAtkConfig) {
        setAllowTeacherViewAtkStockState(loadedAtkConfig.allowTeacherViewAtkStock);
      }
      const resolvedAtkCategories =
        rawAtkCategories && rawAtkCategories.length > 0
          ? rawAtkCategories.map((c) => ({ ...c, isActive: c.isActive !== false }))
          : INITIAL_ATK_CATEGORIES;
      setAtkCategories(resolvedAtkCategories);

      const resolvedAtkItems =
        rawAtkItems && rawAtkItems.length > 0
          ? rawAtkItems.map((item) => ({
              ...item,
              stokSaatIni: Math.max(0, Number(item.stokSaatIni) || 0),
              stokMinimum: Math.max(0, Number(item.stokMinimum) || 0),
              isActive: item.isActive !== false,
            }))
          : INITIAL_ATK_ITEMS;
      setAtkItems(resolvedAtkItems);

      // Auto-seed initial ATK items to Firestore if none persisted yet so all roles share consistent data
      if (!rawAtkItems || rawAtkItems.length === 0) {
        INITIAL_ATK_ITEMS.forEach((item) => {
          saveDocument('atkItems', item).catch(() => {});
        });
      }

      setAtkTransactions(
        (rawAtkTransactions && rawAtkTransactions.length > 0
          ? rawAtkTransactions
          : INITIAL_ATK_TRANSACTIONS
        )
          .map((trx) => ({
            ...trx,
            petugasNama: normalizeBrandText(trx.petugasNama) || trx.petugasNama,
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt || `${b.tanggal}T${b.waktu || '00:00'}`).getTime() -
              new Date(a.createdAt || `${a.tanggal}T${a.waktu || '00:00'}`).getTime()
          )
      );

      setAtkRequests(
        (rawAtkRequests && rawAtkRequests.length > 0
          ? rawAtkRequests
          : INITIAL_ATK_REQUESTS
        )
          .map((req) => ({
            ...req,
            diprosesOlehNama: normalizeBrandText(req.diprosesOlehNama),
            diserahkanOlehNama: normalizeBrandText(req.diserahkanOlehNama),
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt || `${b.tanggal}T${b.waktu || '00:00'}`).getTime() -
              new Date(a.createdAt || `${a.tanggal}T${a.waktu || '00:00'}`).getTime()
          )
      );
    } catch (e) {
      console.warn('Error loading master data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [currentUser?.uid, currentUser?.id]);

  // Real-time Firestore listener for academicSettings/school_identity so logo & identity stay synced across reloads/navigation/devices
  useEffect(() => {
    const docRef = doc(db, 'academicSettings', 'school_identity');
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) return;
        const remote = normalizeSchoolIdentity({ id: snap.id, ...snap.data() });
        setSchoolIdentity((prev) => {
          if (
            lastSavedIdentityAtRef.current &&
            remote.updatedAt &&
            remote.updatedAt < lastSavedIdentityAtRef.current
          ) {
            return prev;
          }
          if (prev.updatedAt && remote.updatedAt && prev.updatedAt > remote.updatedAt) {
            return prev;
          }
          try {
            localStorage.setItem('kantoja_school_identity', JSON.stringify(remote));
            localStorage.setItem('kantoja_school_logo_url', remote.logoUrl || '');
          } catch {
            // ignore storage errors
          }
          return remote;
        });
      },
      () => {
        // ignore snapshot errors when offline
      }
    );
    return () => unsubscribe();
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
    if (isKesantrianOfficerRole(role)) {
      throw new Error('Akses Ditolak: Petugas Kesantrian tidak diizinkan mengubah data utama santri.');
    }
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
    if (isKesantrianOfficerRole(role)) {
      throw new Error('Akses Ditolak: Petugas Kesantrian tidak diizinkan mengubah status utama santri.');
    }
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
    const timestamp = new Date().toISOString();
    const cleanData: Subject = {
      ...data,
      type: data.type || 'subject',
      category: data.type === 'extracurricular' ? '' : (data.category || 'Umum'),
      nameArab: data.type === 'extracurricular' ? '' : (data.nameArab || ''),
      kkm: typeof data.kkm === 'number' ? data.kkm : 75,
      isActive: data.isActive !== false,
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp,
    };
    setSubjects(prev => {
      const idx = prev.findIndex(s => s.id === cleanData.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cleanData;
        return next;
      }
      return [cleanData, ...prev];
    });
    await saveDocument('subjects', cleanData);
  };

  const toggleSubjectStatus = async (id: string) => {
    const found = subjects.find(s => s.id === id);
    if (!found) return;
    const updated: Subject = {
      ...found,
      isActive: found.isActive === false ? true : false,
      updatedAt: new Date().toISOString()
    };
    await saveSubject(updated);
  };

  const deleteSubject = async (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    await deleteDocument('subjects', id);
  };

  // 6. Teacher Assignment actions (uses activeAcademicYear by default)
  const saveTeacherAssignment = async (data: TeacherAssignment) => {
    const timestamp = new Date().toISOString();
    const cleanData: TeacherAssignment = {
      ...data,
      status: data.status || 'Aktif',
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp,
    };
    setTeacherAssignments(prev => {
      const idx = prev.findIndex(a => a.id === cleanData.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cleanData;
        return next;
      }
      return [cleanData, ...prev];
    });
    await saveDocument('teacherAssignments', cleanData);
  };

  const deleteTeacherAssignment = async (id: string) => {
    setTeacherAssignments(prev => prev.filter(a => a.id !== id));
    await deleteDocument('teacherAssignments', id);
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
    if (isKesantrianOfficerRole(role)) {
      throw new Error('Akses Ditolak: Petugas Kesantrian tidak diizinkan menginput atau mengubah nilai akademik.');
    }
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
    if (isKesantrianOfficerRole(role)) {
      throw new Error('Akses Ditolak: Petugas Kesantrian tidak diizinkan menghapus nilai akademik.');
    }
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

  // 10. Report Cards, Student Individual Report Notes & Attendance Actions
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

  const getStudentReportNote = (
    studentId: string,
    academicYearId: string,
    semester: string,
    classId?: string
  ): StudentReportNote | null => {
    if (!studentId || !academicYearId || !semester) return null;

    const ayObj = academicYears.find(
      (ay) => ay.id === academicYearId || ay.name === academicYearId
    );
    const targetYearId = ayObj ? ayObj.id : academicYearId;
    const targetYearName = ayObj ? ayObj.name : academicYearId;
    const normSemester = semester.trim().toLowerCase() === 'genap' ? 'Genap' : 'Ganjil';

    // 1. Primary source: studentReportNotes collection (strictly per studentId + academicYearId + semester)
    const directNote = studentReportNotes.find((n) => {
      if (n.studentId !== studentId) return false;
      const yearMatches =
        n.academicYearId === targetYearId ||
        n.academicYearId === targetYearName ||
        n.academicYearId === academicYearId;
      if (!yearMatches) return false;
      const semMatches = (n.semester || '').trim().toLowerCase() === normSemester.toLowerCase();
      return semMatches;
    });

    if (directNote && typeof directNote.note === 'string' && directNote.note.trim().length > 0) {
      return directNote;
    }

    // 2. Backward compatibility fallback: check reportCards collection for this exact student + academicYear + semester
    const matchingRc = reportCards.find((rc) => {
      if (rc.studentId !== studentId) return false;
      if (classId && rc.classId && rc.classId !== classId) return false;
      const yearMatches =
        rc.academicYearId === targetYearId ||
        rc.academicYearId === targetYearName ||
        rc.academicYearId === academicYearId;
      if (!yearMatches) return false;
      const semMatches = (rc.semester || '').trim().toLowerCase() === normSemester.toLowerCase();
      return semMatches && Boolean(rc.homeroomNotes && rc.homeroomNotes.trim().length > 0);
    });

    if (matchingRc && matchingRc.homeroomNotes) {
      return {
        id: `srn_${studentId}_${targetYearId}_${normSemester}`.replace(/[^a-zA-Z0-9_]/g, '_'),
        studentId,
        classId: matchingRc.classId || classId,
        academicYearId: targetYearId,
        semester: normSemester,
        note: matchingRc.homeroomNotes,
        updatedBy: matchingRc.updatedBy || 'Wali Kelas',
        updatedAt: matchingRc.updatedAt || new Date().toISOString(),
      };
    }

    return null;
  };

  const saveStudentReportNote = async (data: {
    studentId: string;
    classId?: string;
    academicYearId: string;
    semester: 'Ganjil' | 'Genap' | 'GANJIL' | 'GENAP';
    note: string;
    status?: ReportCard['status'];
  }): Promise<StudentReportNote> => {
    if (isKesantrianOfficerRole(role) || role === 'MUDIR' || role === 'mudir') {
      throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk mengubah catatan raport akademik santri.');
    }

    const ayObj = academicYears.find(
      (ay) => ay.id === data.academicYearId || ay.name === data.academicYearId
    );
    const canonicalYearId = ayObj ? ayObj.id : data.academicYearId;
    const normSemester: 'Ganjil' | 'Genap' =
      String(data.semester).trim().toLowerCase() === 'genap' ? 'Genap' : 'Ganjil';

    const studentObj = students.find((s) => s.id === data.studentId);
    const resolvedClassId = data.classId || studentObj?.classId || '';

    const nowIso = new Date().toISOString();
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Wali Kelas / Admin';
    const actorId = currentUser?.uid || currentUser?.id || actorName;

    const noteId = `srn_${data.studentId}_${canonicalYearId}_${normSemester}`.replace(
      /[^a-zA-Z0-9_]/g,
      '_'
    );

    const cleanNote: StudentReportNote = {
      id: noteId,
      studentId: data.studentId,
      classId: resolvedClassId,
      academicYearId: canonicalYearId,
      semester: normSemester,
      note: data.note.trim(),
      updatedBy: actorId,
      updatedByName: actorName,
      updatedByRole: role || 'ADMIN',
      updatedAt: nowIso,
    };

    setStudentReportNotes((prev) => {
      const filtered = prev.filter(
        (n) =>
          !(
            n.studentId === cleanNote.studentId &&
            (n.academicYearId === canonicalYearId ||
              (ayObj && n.academicYearId === ayObj.name)) &&
            String(n.semester).trim().toLowerCase() === normSemester.toLowerCase()
          ) && n.id !== cleanNote.id
      );
      return [cleanNote, ...filtered];
    });

    await saveDocument('studentReportNotes', cleanNote);

    // Keep reportCards collection synchronized for backward compatibility
    const existingRc = reportCards.find(
      (rc) =>
        rc.studentId === data.studentId &&
        (rc.academicYearId === canonicalYearId || (ayObj && rc.academicYearId === ayObj.name)) &&
        String(rc.semester).trim().toLowerCase() === normSemester.toLowerCase()
    );

    const rcId =
      existingRc?.id ||
      `rc_${data.studentId}_${resolvedClassId}_${canonicalYearId}_${normSemester}`.replace(
        /[^a-zA-Z0-9_]/g,
        '_'
      );

    const syncedReportCard: ReportCard = {
      ...(existingRc || {
        id: rcId,
        studentId: data.studentId,
        classId: resolvedClassId,
        academicYearId: canonicalYearId,
        semester: normSemester,
        status: data.status || 'Draft',
      }),
      id: rcId,
      studentId: data.studentId,
      classId: resolvedClassId || existingRc?.classId || '',
      academicYearId: canonicalYearId,
      semester: normSemester,
      homeroomNotes: cleanNote.note,
      status: data.status || existingRc?.status || 'Draft',
      updatedBy: actorName,
      updatedAt: nowIso,
    };

    await saveReportCard(syncedReportCard);
    return cleanNote;
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

  // 11. Extracurricular Participants Actions
  const saveExtracurricularParticipants = async (
    extracurricularId: string,
    classId: string,
    academicYearId: string,
    semester: string,
    selectedStudentIds: string[]
  ) => {
    const timestamp = new Date().toISOString();
    const selectedSet = new Set(selectedStudentIds);

    // 1. Determine existing participants for this specific scope
    const existingInScope = extracurricularParticipants.filter(
      (p) =>
        p.extracurricularId === extracurricularId &&
        p.classId === classId &&
        p.academicYearId === academicYearId &&
        p.semester === semester
    );

    // Items to remove from database (previously selected, now unselected)
    const toRemove = existingInScope.filter((p) => !selectedSet.has(p.studentId));

    // Items to add (newly selected)
    const existingStudentIds = new Set(existingInScope.map((p) => p.studentId));
    const toAddIds = selectedStudentIds.filter((stId) => !existingStudentIds.has(stId));

    const newRecords: ExtracurricularParticipant[] = toAddIds.map((stId) => ({
      id: `ep_${stId}_${extracurricularId}_${academicYearId}_${semester}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      studentId: stId,
      extracurricularId,
      classId,
      academicYearId,
      semester,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    }));

    // Update in-memory state
    setExtracurricularParticipants((prev) => {
      const remaining = prev.filter(
        (p) =>
          !(
            p.extracurricularId === extracurricularId &&
            p.classId === classId &&
            p.academicYearId === academicYearId &&
            p.semester === semester &&
            !selectedSet.has(p.studentId)
          )
      );
      // Append new records that are not already present
      const combined = [...remaining];
      for (const rec of newRecords) {
        if (!combined.some((c) => c.id === rec.id)) {
          combined.push(rec);
        }
      }
      return combined;
    });

    // Delete unselected records from Firestore
    await Promise.all(toRemove.map((p) => deleteDocument('extracurricularParticipants', p.id)));

    // Save newly selected records to Firestore
    await Promise.all(newRecords.map((p) => saveDocument('extracurricularParticipants', p)));
  };

  // 12. Extracurricular Scores Actions (Upsert: 1 score per student + extracurricular + academicYear + semester)
  const saveExtracurricularScore = async (
    data: Omit<ExtracurricularScore, 'id'> & { id?: string }
  ): Promise<ExtracurricularScore> => {
    const timestamp = new Date().toISOString();
    const deterministicId = `es_${data.studentId}_${data.extracurricularId}_${data.academicYearId}_${data.semester}`.replace(
      /[^a-zA-Z0-9_]/g,
      '_'
    );

    const existingMatches = extracurricularScores.filter(
      (s) =>
        s.studentId === data.studentId &&
        s.extracurricularId === data.extracurricularId &&
        s.academicYearId === data.academicYearId &&
        s.semester === data.semester
    );

    const primaryExisting = existingMatches[0];
    const targetId = data.id || primaryExisting?.id || deterministicId;

    const recordToSave: ExtracurricularScore = {
      id: targetId,
      studentId: data.studentId.trim(),
      extracurricularId: data.extracurricularId.trim(),
      classId: data.classId.trim(),
      academicYearId: data.academicYearId.trim(),
      semester: data.semester.trim(),
      nilai: data.nilai.trim().toUpperCase(),
      keterangan: (data.keterangan || '').trim(),
      teacherId: data.teacherId || primaryExisting?.teacherId || currentUser?.teacherId || 't_001',
      createdAt: primaryExisting?.createdAt || data.createdAt || timestamp,
      updatedAt: timestamp
    };

    // Update in-memory state and remove any accidental duplicates for the same key
    setExtracurricularScores((prev) => {
      const filtered = prev.filter(
        (s) =>
          !(
            s.studentId === recordToSave.studentId &&
            s.extracurricularId === recordToSave.extracurricularId &&
            s.academicYearId === recordToSave.academicYearId &&
            s.semester === recordToSave.semester
          ) && s.id !== recordToSave.id
      );
      return [recordToSave, ...filtered];
    });

    // Clean up any duplicate documents in Firestore if another ID existed for the same combination
    const duplicateIds = existingMatches.map((m) => m.id).filter((id) => id !== targetId);
    if (duplicateIds.length > 0) {
      await Promise.all(duplicateIds.map((dupId) => deleteDocument('extracurricularScores', dupId)));
    }

    await saveDocument('extracurricularScores', recordToSave);
    return recordToSave;
  };

  const deleteExtracurricularScore = async (id: string): Promise<void> => {
    setExtracurricularScores((prev) => prev.filter((s) => s.id !== id));
    await deleteDocument('extracurricularScores', id);
  };

  // 13. School Identity & Mudir Configuration Actions
  const saveSchoolIdentity = async (data: Partial<SchoolIdentity>): Promise<SchoolIdentity> => {
    if (isKesantrianOfficerRole(role)) {
      throw new Error('Akses Ditolak: Petugas Kesantrian tidak diizinkan mengubah konfigurasi sekolah.');
    }
    if (data.logoUrl !== undefined && data.logoUrl !== schoolIdentity.logoUrl && role !== 'ADMIN') {
      throw new Error('Akses Ditolak: Hanya Administrator yang diizinkan mengubah atau menghapus logo sekolah.');
    }
    const updaterName = currentUser?.displayName || currentUser?.name || currentUser?.email || 'Administrator';
    const nowIso = new Date().toISOString();
    lastSavedIdentityAtRef.current = nowIso;
    const merged: Partial<SchoolIdentity> = {
      ...schoolIdentity,
      ...data,
      id: 'school_identity',
      updatedBy: updaterName,
      updatedAt: nowIso
    };
    const saved = await saveSchoolIdentityDoc(merged);
    if (saved.updatedAt) {
      lastSavedIdentityAtRef.current = saved.updatedAt;
    }
    setSchoolIdentity(saved);
    return saved;
  };

  // 14. Kesantrian Records, Violation Categories, & Medicines Actions
  const saveKesantrianRecord = async (data: KesantrianRecord): Promise<void> => {
    const nowIso = new Date().toISOString();
    const actorId = currentUser?.id || currentUser?.uid || currentUser?.username || 'kesantrian';
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Petugas Kesantrian';
    const actorRoleLabel = getKesantrianOfficerLabel(currentUser);
    const existing = kesantrianRecords.find((r) => r.id === data.id);

    const recordToSave: KesantrianRecord = {
      ...data,
      recordedByUserId:
        existing?.recordedByUserId || data.recordedByUserId || actorId,
      recordedByName:
        existing?.recordedByName || data.recordedByName || data.createdByName || actorName,
      recordedByRole:
        existing?.recordedByRole || data.recordedByRole || data.createdByRole || actorRoleLabel,
      createdBy: existing?.createdBy || data.createdBy || actorId,
      createdByName:
        existing?.createdByName || existing?.recordedByName || data.createdByName || data.recordedByName || actorName,
      createdByRole:
        existing?.createdByRole || existing?.recordedByRole || data.createdByRole || data.recordedByRole || actorRoleLabel,
      createdAt: existing?.createdAt || data.createdAt || nowIso,
      updatedBy: data.updatedBy || actorId,
      updatedByName: data.updatedByName || actorName,
      updatedByRole: data.updatedByRole || actorRoleLabel,
      updatedAt: nowIso,
      isDeleted: data.isDeleted === true ? true : false,
    };

    setKesantrianRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === recordToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = recordToSave;
        return next;
      }
      return [recordToSave, ...prev];
    });
    await saveDocument('kesantrianRecords', recordToSave);
  };

  // Requirement 18: Soft delete so deleted records do not appear in active list, remain auditable by Admin, and never affect student data
  const deleteKesantrianRecord = async (id: string): Promise<void> => {
    const existing = kesantrianRecords.find((r) => r.id === id);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Petugas Kesantrian';

    const softDeleted: KesantrianRecord = {
      ...existing,
      isDeleted: true,
      deletedAt: nowIso,
      deletedBy: actorName,
      updatedBy: actorName,
      updatedAt: nowIso,
    };

    setKesantrianRecords((prev) => prev.map((r) => (r.id === id ? softDeleted : r)));
    await saveDocument('kesantrianRecords', softDeleted);
  };

  const restoreKesantrianRecord = async (id: string): Promise<void> => {
    const existing = kesantrianRecords.find((r) => r.id === id);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Administrator';

    const restored: KesantrianRecord = {
      ...existing,
      isDeleted: false,
      updatedBy: actorName,
      updatedAt: nowIso,
    };

    setKesantrianRecords((prev) => prev.map((r) => (r.id === id ? restored : r)));
    await saveDocument('kesantrianRecords', restored);
  };

  // Requirement 6: Master Kategori Pelanggaran (Admin & Kepala Kesantrian)
  const saveKesantrianViolationCategory = async (
    data: KesantrianViolationCategory
  ): Promise<void> => {
    if (role !== 'ADMIN' && !isKepalaKesantrianUser(currentUser)) {
      throw new Error('Akses Ditolak: Hanya Admin atau Kepala Kesantrian yang dapat mengelola Master Kategori Pelanggaran.');
    }
    const nowIso = new Date().toISOString();
    const actorName = currentUser?.displayName || currentUser?.name || 'Administrator';
    const existing = kesantrianViolationCategories.find((c) => c.id === data.id);

    const catToSave: KesantrianViolationCategory = {
      ...data,
      name: data.name.trim(),
      description: (data.description || '').trim(),
      isActive: data.isActive !== false,
      createdAt: existing?.createdAt || data.createdAt || nowIso,
      createdBy: existing?.createdBy || data.createdBy || actorName,
      updatedAt: nowIso,
      updatedBy: actorName,
    };

    setKesantrianViolationCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === catToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = catToSave;
        return next;
      }
      return [...prev, catToSave];
    });
    await saveDocument('kesantrianViolationCategories', catToSave);
  };

  const deleteKesantrianViolationCategory = async (
    id: string
  ): Promise<{ action: 'deleted' | 'deactivated'; message: string }> => {
    if (role !== 'ADMIN' && !isKepalaKesantrianUser(currentUser)) {
      throw new Error('Akses Ditolak: Hanya Admin atau Kepala Kesantrian yang dapat menghapus/menonaktifkan kategori pelanggaran.');
    }
    const cat = kesantrianViolationCategories.find((c) => c.id === id);
    if (!cat) {
      return { action: 'deleted', message: 'Kategori tidak ditemukan.' };
    }

    // Requirement 6: Do NOT permanently delete a category if it is already used by any violation record!
    const isUsedInHistory = kesantrianRecords.some(
      (r) =>
        r.type === 'PELANGGARAN' &&
        (r.violationCategoryId === id ||
          (r.violationCategoryName || r.category || '').toLowerCase() === cat.name.toLowerCase())
    );

    if (isUsedInHistory) {
      const nowIso = new Date().toISOString();
      const actorName = currentUser?.displayName || currentUser?.name || 'Administrator';
      const deactivated: KesantrianViolationCategory = {
        ...cat,
        isActive: false,
        updatedAt: nowIso,
        updatedBy: actorName,
      };
      setKesantrianViolationCategories((prev) =>
        prev.map((c) => (c.id === id ? deactivated : c))
      );
      await saveDocument('kesantrianViolationCategories', deactivated);
      return {
        action: 'deactivated',
        message: `Kategori "${cat.name}" sudah digunakan pada riwayat pelanggaran sehingga tidak dihapus permanen, melainkan dinonaktifkan agar riwayat lama tetap terjaga.`,
      };
    }

    setKesantrianViolationCategories((prev) => prev.filter((c) => c.id !== id));
    await deleteDocument('kesantrianViolationCategories', id);
    return {
      action: 'deleted',
      message: `Kategori "${cat.name}" berhasil dihapus.`,
    };
  };

  const saveKesantrianMedicine = async (data: KesantrianMedicine): Promise<void> => {
    const nowIso = new Date().toISOString();
    const actorId = currentUser?.id || currentUser?.uid || currentUser?.username || 'kesantrian';
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Petugas Kesantrian';
    const actorRoleLabel = getKesantrianOfficerLabel(currentUser);
    const existing = kesantrianMedicines.find((m) => m.id === data.id);
    const medToSave: KesantrianMedicine = {
      ...data,
      createdBy: existing?.createdBy || data.createdBy || actorId,
      createdByName: existing?.createdByName || data.createdByName || actorName,
      createdByRole: existing?.createdByRole || data.createdByRole || actorRoleLabel,
      createdAt: existing?.createdAt || data.createdAt || nowIso,
      updatedAt: nowIso,
      updatedBy: actorId,
      updatedByName: actorName,
      updatedByRole: actorRoleLabel,
    };
    setKesantrianMedicines((prev) => {
      const idx = prev.findIndex((m) => m.id === medToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = medToSave;
        return next;
      }
      return [medToSave, ...prev];
    });
    await saveDocument('kesantrianMedicines', medToSave);
  };

  const deleteKesantrianMedicine = async (id: string): Promise<void> => {
    setKesantrianMedicines((prev) => prev.filter((m) => m.id !== id));
    await deleteDocument('kesantrianMedicines', id);
  };

  // Mabit Periods (Pencatatan Kepulangan Mabit Santri)
  const saveMabitPeriod = async (data: MabitPeriod): Promise<void> => {
    const nowIso = new Date().toISOString();
    const actorId = currentUser?.id || currentUser?.uid || currentUser?.username || 'kesantrian';
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Petugas Kesantrian';
    const actorRoleLabel = getKesantrianOfficerLabel(currentUser);
    const existing = mabitPeriods.find((p) => p.id === data.id);

    const periodToSave: MabitPeriod = {
      ...data,
      participants: Array.isArray(data.participants) ? data.participants : [],
      createdBy: existing?.createdBy || data.createdBy || actorId,
      createdByName: existing?.createdByName || data.createdByName || actorName,
      createdByRole: existing?.createdByRole || data.createdByRole || actorRoleLabel,
      createdAt: existing?.createdAt || data.createdAt || nowIso,
      updatedBy: actorId,
      updatedByName: actorName,
      updatedByRole: actorRoleLabel,
      updatedAt: nowIso,
    };

    setMabitPeriods((prev) => {
      const idx = prev.findIndex((p) => p.id === periodToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = periodToSave;
        return next;
      }
      return [periodToSave, ...prev];
    });
    await saveDocument('kesantrianMabitPeriods', periodToSave);
  };

  const deleteMabitPeriod = async (id: string): Promise<void> => {
    setMabitPeriods((prev) => prev.filter((p) => p.id !== id));
    await deleteDocument('kesantrianMabitPeriods', id);
  };

  // ==========================================================================
  // 15. 📦 ATK & PERSEDIAAN KANTOR ACTIONS
  // ==========================================================================

  const setAllowTeacherViewAtkStock = (allowed: boolean) => {
    if (!isAtkAdminRole(role)) return;
    setAllowTeacherViewAtkStockState(allowed);
    saveAtkConfig(allowed, currentUser?.displayName || currentUser?.name).catch(() => {});
  };

  const saveAtkCategory = async (data: AtkCategory): Promise<void> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Hanya Administrator atau Kepala Sekolah yang dapat mengelola kategori barang ATK.');
    }
    const nowIso = new Date().toISOString();
    const actorName = currentUser?.displayName || currentUser?.name || 'Administrator';
    const existing = atkCategories.find((c) => c.id === data.id);
    const catToSave: AtkCategory = {
      ...data,
      name: data.name.trim(),
      description: (data.description || '').trim(),
      isActive: data.isActive !== false,
      createdAt: existing?.createdAt || data.createdAt || nowIso,
      createdBy: existing?.createdBy || data.createdBy || actorName,
      updatedAt: nowIso,
      updatedBy: actorName,
    };
    setAtkCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === catToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = catToSave;
        return next;
      }
      return [...prev, catToSave];
    });
    await saveDocument('atkCategories', catToSave);
  };

  const deleteAtkCategory = async (
    id: string
  ): Promise<{ action: 'deleted' | 'deactivated'; message: string }> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Hanya Administrator atau Kepala Sekolah yang dapat menghapus kategori ATK.');
    }
    const cat = atkCategories.find((c) => c.id === id);
    if (!cat) {
      return { action: 'deleted', message: 'Kategori tidak ditemukan.' };
    }
    const isUsed = atkItems.some(
      (item) => item.category.toLowerCase() === cat.name.toLowerCase()
    );
    if (isUsed) {
      const deactivated: AtkCategory = {
        ...cat,
        isActive: false,
        updatedAt: new Date().toISOString(),
      };
      setAtkCategories((prev) => prev.map((c) => (c.id === id ? deactivated : c)));
      await saveDocument('atkCategories', deactivated);
      return {
        action: 'deactivated',
        message: `Kategori "${cat.name}" sedang digunakan oleh data barang sehingga dinonaktifkan agar histori tetap terjaga.`,
      };
    }
    setAtkCategories((prev) => prev.filter((c) => c.id !== id));
    await deleteDocument('atkCategories', id);
    return {
      action: 'deleted',
      message: `Kategori "${cat.name}" berhasil dihapus.`,
    };
  };

  const saveAtkItem = async (data: AtkItem, isNewItem?: boolean): Promise<void> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Guru/Staff tidak diizinkan mengubah data barang atau stok secara langsung.');
    }
    const nowIso = new Date().toISOString();
    const actorId = currentUser?.id || currentUser?.uid || 'admin';
    const actorName = currentUser?.displayName || currentUser?.name || 'Administrator';
    const existing = atkItems.find((i) => i.id === data.id);
    const hasTransactions = atkTransactions.some((t) => t.itemId === data.id);

    // Bagian 5: Jangan mengubah stok secara manual jika transaksi barang masuk/keluar sudah digunakan
    const resolvedStock =
      existing && hasTransactions && !isNewItem
        ? existing.stokSaatIni
        : Math.max(0, Number(data.stokSaatIni) || 0);

    const itemToSave: AtkItem = {
      ...data,
      code: (data.code || '').trim() || `ATK-${String(atkItems.length + 1).padStart(3, '0')}`,
      name: data.name.trim(),
      category: data.category.trim() || 'ATK',
      unit: data.unit || 'pcs',
      stokSaatIni: resolvedStock,
      stokMinimum: Math.max(0, Number(data.stokMinimum) || 0),
      lokasiPenyimpanan: (data.lokasiPenyimpanan || 'Ruang TU').trim(),
      hargaPerkiraan:
        data.hargaPerkiraan !== undefined && data.hargaPerkiraan !== null && Number(data.hargaPerkiraan) >= 0
          ? Number(data.hargaPerkiraan)
          : undefined,
      keterangan: (data.keterangan || '').trim(),
      isActive: data.isActive !== false,
      createdAt: existing?.createdAt || data.createdAt || nowIso,
      createdBy: existing?.createdBy || data.createdBy || actorName,
      updatedAt: nowIso,
      updatedBy: actorName,
    };

    setAtkItems((prev) => {
      const idx = prev.findIndex((i) => i.id === itemToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = itemToSave;
        return next;
      }
      return [itemToSave, ...prev];
    });
    await saveDocument('atkItems', itemToSave);

    // Jika barang baru ditambahkan dengan stok awal > 0, catat otomatis di riwayat barang masuk sebagai Saldo Awal
    if (!existing && itemToSave.stokSaatIni > 0) {
      const todayStr = nowIso.slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 5);
      const initialTrx: AtkTransaction = {
        id: `atk_trx_init_${Date.now()}`,
        type: 'MASUK',
        itemId: itemToSave.id,
        itemCode: itemToSave.code,
        itemName: itemToSave.name,
        category: itemToSave.category,
        unit: itemToSave.unit,
        jumlah: itemToSave.stokSaatIni,
        tanggal: todayStr,
        waktu: timeStr,
        stokSebelum: 0,
        stokSesudah: itemToSave.stokSaatIni,
        sumberBarang: 'Saldo Awal Persediaan',
        hargaSatuan: itemToSave.hargaPerkiraan,
        keterangan: 'Pencatatan stok awal saat penambahan barang baru',
        petugasId: actorId,
        petugasNama: actorName,
        petugasRole: role || 'ADMIN',
        createdAt: nowIso,
      };
      setAtkTransactions((prev) => [initialTrx, ...prev]);
      await saveDocument('atkTransactions', initialTrx);
    }
  };

  const toggleAtkItemStatus = async (id: string): Promise<void> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Hanya Administrator atau Kepala Sekolah yang dapat mengubah status barang.');
    }
    const found = atkItems.find((i) => i.id === id);
    if (!found) return;
    const updated: AtkItem = {
      ...found,
      isActive: !found.isActive,
      updatedAt: new Date().toISOString(),
    };
    setAtkItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await saveDocument('atkItems', updated);
  };

  const recordAtkIncoming = async (input: {
    itemId: string;
    jumlah: number;
    tanggal: string;
    sumberBarang: string;
    hargaSatuan?: number;
    nomorNota?: string;
    keterangan?: string;
    petugasNama?: string;
  }): Promise<AtkTransaction> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Hanya Administrator atau Kepala Sekolah yang dapat mencatat Barang Masuk.');
    }
    const item = atkItems.find((i) => i.id === input.itemId);
    if (!item) {
      throw new Error('Barang tidak ditemukan dalam Master Data Barang.');
    }
    const qty = Math.floor(Number(input.jumlah) || 0);
    if (qty <= 0) {
      throw new Error('Jumlah barang masuk harus lebih dari 0.');
    }

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toTimeString().slice(0, 5);
    const actorId = currentUser?.id || currentUser?.uid || 'admin';
    const actorName =
      (input.petugasNama || '').trim() ||
      currentUser?.displayName ||
      currentUser?.name ||
      'Administrator';

    const stokSebelum = Number(item.stokSaatIni) || 0;
    const stokSesudah = stokSebelum + qty;

    const updatedItem: AtkItem = {
      ...item,
      stokSaatIni: stokSesudah,
      hargaPerkiraan:
        input.hargaSatuan !== undefined && Number(input.hargaSatuan) > 0
          ? Number(input.hargaSatuan)
          : item.hargaPerkiraan,
      updatedAt: nowIso,
      updatedBy: actorName,
    };

    const trx: AtkTransaction = {
      id: `atk_trx_in_${Date.now()}`,
      type: 'MASUK',
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      unit: item.unit,
      jumlah: qty,
      tanggal: input.tanggal || nowIso.slice(0, 10),
      waktu: timeStr,
      stokSebelum,
      stokSesudah,
      sumberBarang: (input.sumberBarang || 'Pembelian Rutin').trim(),
      hargaSatuan:
        input.hargaSatuan !== undefined && Number(input.hargaSatuan) > 0
          ? Number(input.hargaSatuan)
          : undefined,
      nomorNota: (input.nomorNota || '').trim() || undefined,
      keterangan: (input.keterangan || '').trim() || undefined,
      petugasId: actorId,
      petugasNama: actorName,
      petugasRole: role || 'ADMIN',
      createdAt: nowIso,
    };

    setAtkItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));
    setAtkTransactions((prev) => [trx, ...prev]);

    await Promise.all([
      saveDocument('atkItems', updatedItem),
      saveDocument('atkTransactions', trx),
    ]);

    return trx;
  };

  const recordAtkOutgoing = async (input: {
    itemId: string;
    jumlah: number;
    tanggal: string;
    penerimaId?: string;
    penerimaNama: string;
    penerimaRole?: string;
    keperluan: string;
    keterangan?: string;
    requestId?: string;
    petugasNama?: string;
  }): Promise<AtkTransaction> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Hanya Administrator atau Kepala Sekolah yang dapat mencatat Barang Keluar.');
    }
    const item = atkItems.find((i) => i.id === input.itemId);
    if (!item) {
      throw new Error('Barang tidak ditemukan dalam Master Data Barang.');
    }
    const qty = Math.floor(Number(input.jumlah) || 0);
    if (qty <= 0) {
      throw new Error('Jumlah barang keluar harus lebih dari 0.');
    }
    const stokSebelum = Number(item.stokSaatIni) || 0;
    if (qty > stokSebelum) {
      throw new Error(
        `Stok "${item.name}" tidak mencukupi! Stok tersedia: ${stokSebelum} ${item.unit}, jumlah yang akan dikeluarkan: ${qty} ${item.unit}.`
      );
    }

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toTimeString().slice(0, 5);
    const actorId = currentUser?.id || currentUser?.uid || 'admin';
    const actorName =
      (input.petugasNama || '').trim() ||
      currentUser?.displayName ||
      currentUser?.name ||
      'Administrator';

    const stokSesudah = stokSebelum - qty;

    const updatedItem: AtkItem = {
      ...item,
      stokSaatIni: stokSesudah,
      updatedAt: nowIso,
      updatedBy: actorName,
    };

    const trx: AtkTransaction = {
      id: `atk_trx_out_${Date.now()}`,
      type: 'KELUAR',
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      unit: item.unit,
      jumlah: qty,
      tanggal: input.tanggal || nowIso.slice(0, 10),
      waktu: timeStr,
      stokSebelum,
      stokSesudah,
      penerimaId: input.penerimaId,
      penerimaNama: (input.penerimaNama || 'Guru / Staf').trim(),
      penerimaRole: input.penerimaRole,
      keperluan: (input.keperluan || 'Operasional Sekolah').trim(),
      requestId: input.requestId,
      keterangan: (input.keterangan || '').trim() || undefined,
      petugasId: actorId,
      petugasNama: actorName,
      petugasRole: role || 'ADMIN',
      createdAt: nowIso,
    };

    setAtkItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));
    setAtkTransactions((prev) => [trx, ...prev]);

    await Promise.all([
      saveDocument('atkItems', updatedItem),
      saveDocument('atkTransactions', trx),
    ]);

    return trx;
  };

  const createAtkRequest = async (input: {
    itemId: string;
    jumlahDiminta: number;
    keperluan: string;
    catatan?: string;
  }): Promise<AtkRequest> => {
    if (!currentUser) {
      throw new Error('Silakan masuk terlebih dahulu untuk membuat permintaan ATK.');
    }
    const item = atkItems.find((i) => i.id === input.itemId);
    if (!item) {
      throw new Error('Barang yang dipilih tidak ditemukan.');
    }
    const qty = Math.floor(Number(input.jumlahDiminta) || 0);
    if (qty <= 0) {
      throw new Error('Jumlah barang yang diminta harus lebih dari 0.');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const tanggalStr = nowIso.slice(0, 10);
    const waktuStr = now.toTimeString().slice(0, 5);

    const newReq: AtkRequest = {
      id: `atk_req_${Date.now()}`,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      unit: item.unit,
      jumlahDiminta: qty,
      keperluan: (input.keperluan || 'Mengajar').trim(),
      catatan: (input.catatan || '').trim() || undefined,
      pemohonId: currentUser.id || currentUser.uid || currentUser.username,
      pemohonNama: currentUser.displayName || currentUser.name || currentUser.username,
      pemohonRole: role || currentUser.role || 'GURU_MAPEL',
      tanggal: tanggalStr,
      waktu: waktuStr,
      status: 'Menunggu',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setAtkRequests((prev) => [newReq, ...prev]);
    await saveDocument('atkRequests', newReq);
    return newReq;
  };

  const approveAtkRequest = async (
    requestId: string,
    jumlahDisetujui: number,
    catatanAdmin?: string
  ): Promise<void> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Guru/Staff tidak diizinkan menyetujui permintaan ATK.');
    }
    const req = atkRequests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error('Data permintaan tidak ditemukan.');
    }
    const approvedQty = Math.max(1, Math.floor(Number(jumlahDisetujui) || req.jumlahDiminta));
    const nowIso = new Date().toISOString();
    const actorId = currentUser?.id || currentUser?.uid || 'admin';
    const actorName = currentUser?.displayName || currentUser?.name || 'Kepala Sekolah / Admin';

    const updatedReq: AtkRequest = {
      ...req,
      status: 'Disetujui',
      jumlahDisetujui: approvedQty,
      catatanAdmin: (catatanAdmin ?? req.catatanAdmin ?? '').trim() || undefined,
      diprosesOlehId: actorId,
      diprosesOlehNama: actorName,
      tanggalDiproses: nowIso,
      updatedAt: nowIso,
    };

    setAtkRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));
    await saveDocument('atkRequests', updatedReq);
  };

  const rejectAtkRequest = async (
    requestId: string,
    catatanAdmin: string
  ): Promise<void> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Hanya Administrator atau Kepala Sekolah yang dapat menolak permintaan ATK.');
    }
    const req = atkRequests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error('Data permintaan tidak ditemukan.');
    }
    const nowIso = new Date().toISOString();
    const actorId = currentUser?.id || currentUser?.uid || 'admin';
    const actorName = currentUser?.displayName || currentUser?.name || 'Kepala Sekolah / Admin';

    const updatedReq: AtkRequest = {
      ...req,
      status: 'Ditolak',
      catatanAdmin: (catatanAdmin || 'Permintaan belum dapat dipenuhi saat ini.').trim(),
      diprosesOlehId: actorId,
      diprosesOlehNama: actorName,
      tanggalDiproses: nowIso,
      updatedAt: nowIso,
    };

    setAtkRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));
    await saveDocument('atkRequests', updatedReq);
  };

  const handoverAtkRequest = async (
    requestId: string,
    jumlahDiberikan?: number,
    catatanAdmin?: string
  ): Promise<void> => {
    if (!isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Hanya Administrator atau Kepala Sekolah yang dapat menyerahkan barang ATK.');
    }
    const req = atkRequests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error('Data permintaan tidak ditemukan.');
    }
    if (req.status === 'Sudah Diberikan') {
      throw new Error('Permintaan ini sudah berstatus Sudah Diberikan.');
    }
    if (req.status === 'Ditolak' || req.status === 'Dibatalkan') {
      throw new Error(`Permintaan berstatus "${req.status}" tidak dapat diserahkan.`);
    }
    const item = atkItems.find((i) => i.id === req.itemId);
    if (!item) {
      throw new Error('Barang terkait permintaan ini tidak ditemukan di Master Data.');
    }

    const finalQty = Math.max(
      1,
      Math.floor(Number(jumlahDiberikan) || req.jumlahDisetujui || req.jumlahDiminta)
    );

    if (item.stokSaatIni < finalQty) {
      throw new Error(
        `Stok "${item.name}" tidak mencukupi untuk diserahkan! Stok saat ini: ${item.stokSaatIni} ${item.unit}, dibutuhkan: ${finalQty} ${item.unit}. Silakan catat Barang Masuk terlebih dahulu.`
      );
    }

    const nowIso = new Date().toISOString();
    const actorId = currentUser?.id || currentUser?.uid || 'admin';
    const actorName = currentUser?.displayName || currentUser?.name || 'Administrator';

    // Catat otomatis sebagai transaksi Barang Keluar & kurangi stokSaatIni
    const trx = await recordAtkOutgoing({
      itemId: item.id,
      jumlah: finalQty,
      tanggal: nowIso.slice(0, 10),
      penerimaId: req.pemohonId,
      penerimaNama: req.pemohonNama,
      penerimaRole: req.pemohonRole,
      keperluan: req.keperluan,
      requestId: req.id,
      keterangan:
        (catatanAdmin || req.catatan || `Penyerahan permintaan ATK (${req.pemohonNama})`).trim(),
      petugasNama: actorName,
    });

    const updatedReq: AtkRequest = {
      ...req,
      status: 'Sudah Diberikan',
      jumlahDisetujui: finalQty,
      catatanAdmin: (catatanAdmin ?? req.catatanAdmin ?? '').trim() || undefined,
      diprosesOlehId: req.diprosesOlehId || actorId,
      diprosesOlehNama: req.diprosesOlehNama || actorName,
      tanggalDiproses: req.tanggalDiproses || nowIso,
      diserahkanOlehId: actorId,
      diserahkanOlehNama: actorName,
      tanggalDiserahkan: nowIso,
      transactionId: trx.id,
      updatedAt: nowIso,
    };

    setAtkRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));
    await saveDocument('atkRequests', updatedReq);
  };

  const cancelAtkRequest = async (requestId: string): Promise<void> => {
    const req = atkRequests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error('Data permintaan tidak ditemukan.');
    }
    const isOwner =
      currentUser &&
      (req.pemohonId === currentUser.id ||
        req.pemohonId === currentUser.uid ||
        req.pemohonId === currentUser.username);
    if (!isOwner && !isAtkAdminRole(role)) {
      throw new Error('Akses Ditolak: Anda hanya dapat membatalkan permintaan milik Anda sendiri.');
    }
    if (req.status !== 'Menunggu') {
      throw new Error('Hanya permintaan yang masih berstatus Menunggu yang dapat dibatalkan.');
    }

    const nowIso = new Date().toISOString();
    const updatedReq: AtkRequest = {
      ...req,
      status: 'Dibatalkan',
      updatedAt: nowIso,
    };

    setAtkRequests((prev) => prev.map((r) => (r.id === requestId ? updatedReq : r)));
    await saveDocument('atkRequests', updatedReq);
  };

  // 16. Academic Calendar (Kalender Akademik) Actions
  const saveAcademicCalendarEvent = async (data: AcademicCalendarEvent): Promise<void> => {
    if (!canManageAcademicCalendar(role)) {
      throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk menambah atau mengubah agenda Kalender Akademik.');
    }

    const nowIso = new Date().toISOString();
    const actorName =
      currentUser?.displayName || currentUser?.name || currentUser?.username || 'Administrator';
    const actorId = currentUser?.uid || currentUser?.id || actorName;

    const cleanEvent: AcademicCalendarEvent = {
      ...data,
      id: data.id || `cal_${Date.now()}`,
      title: data.title.trim(),
      category: data.category || 'Kegiatan Sekolah',
      startDate: data.startDate,
      endDate: data.endDate && data.endDate >= data.startDate ? data.endDate : data.startDate,
      startTime: (data.startTime || '').trim(),
      endTime: (data.endTime || '').trim(),
      academicYearId: data.academicYearId || activeAcademicYear?.id || 'ay_2026_2027_1',
      semester: data.semester || activeAcademicYear?.semester || 'Ganjil',
      classIds: Array.isArray(data.classIds) ? data.classIds : [],
      location: (data.location || '').trim(),
      personInCharge: (data.personInCharge || '').trim(),
      description: (data.description || '').trim(),
      status: data.status || 'Terjadwal',
      createdBy: data.createdBy || actorId,
      createdByName: data.createdByName || actorName,
      createdByRole: data.createdByRole || role || 'ADMIN',
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
    };

    setAcademicCalendarEvents((prev) => {
      const idx = prev.findIndex((ev) => ev.id === cleanEvent.id);
      let next: AcademicCalendarEvent[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = cleanEvent;
      } else {
        next = [...prev, cleanEvent];
      }
      return next.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    });

    await saveDocument('academicCalendar', cleanEvent);
  };

  const deleteAcademicCalendarEvent = async (id: string): Promise<void> => {
    if (!canManageAcademicCalendar(role)) {
      throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk menghapus agenda Kalender Akademik.');
    }

    setAcademicCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));
    await deleteDocument('academicCalendar', id);
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
        studentReportNotes,
        attendance,
        extracurricularParticipants,
        extracurricularScores,
        schoolIdentity,
        kesantrianRecords,
        kesantrianMedicines,
        kesantrianViolationCategories,
        mabitPeriods,
        atkCategories,
        atkItems,
        atkTransactions,
        atkRequests,
        academicCalendarEvents,
        allowTeacherViewAtkStock,
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
        deleteSubject,
        saveTeacherAssignment,
        deleteTeacherAssignment,
        saveUser,
        toggleUserStatus,
        deleteUser,
        saveScore,
        deleteScore,
        saveReportCard,
        getStudentReportNote,
        saveStudentReportNote,
        saveAttendance,
        saveExtracurricularParticipants,
        saveExtracurricularScore,
        deleteExtracurricularScore,
        getAcademicSetting,
        saveAcademicSetting,
        saveSchoolIdentity,
        saveKesantrianRecord,
        deleteKesantrianRecord,
        restoreKesantrianRecord,
        saveKesantrianMedicine,
        deleteKesantrianMedicine,
        saveKesantrianViolationCategory,
        deleteKesantrianViolationCategory,
        saveMabitPeriod,
        deleteMabitPeriod,
        setAllowTeacherViewAtkStock,
        saveAtkCategory,
        deleteAtkCategory,
        saveAtkItem,
        toggleAtkItemStatus,
        recordAtkIncoming,
        recordAtkOutgoing,
        createAtkRequest,
        approveAtkRequest,
        rejectAtkRequest,
        handoverAtkRequest,
        cancelAtkRequest,
        saveAcademicCalendarEvent,
        deleteAcademicCalendarEvent,
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
