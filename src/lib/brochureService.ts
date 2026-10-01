import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase';
import { SpmbBrochure } from '../types';

export const DEFAULT_BROCHURE_ID = 'brochure_spmb_2027_2028';

/**
 * Generates high-clarity SVG Data URLs for the official 2-page brochure
 * "SPMB Mutiara Insan Tahun Ajaran 2027–2028" so it is immediately available
 * at crisp vector resolution on all devices and can be downloaded as PNG/JPG or PDF.
 */
function createOfficialBrochurePage1SvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1700" width="1200" height="1700">
  <defs>
    <linearGradient id="bgGrad1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#042f24"/>
      <stop offset="26%" stop-color="#064e3b"/>
      <stop offset="26.1%" stop-color="#FAF8F5"/>
      <stop offset="100%" stop-color="#FAF8F5"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="1700" fill="url(#bgGrad1)"/>

  <!-- Top Decorative Islamic Frame Border -->
  <rect x="36" y="36" width="1128" height="1628" rx="24" fill="none" stroke="#d97706" stroke-width="3" stroke-opacity="0.55"/>

  <!-- Header Area -->
  <text x="600" y="98" text-anchor="middle" fill="#fde68a" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="3">LEMBAGA PENDIDIKAN ISLAM &amp; TAHFIZ AL-QUR'AN</text>
  <text x="600" y="156" text-anchor="middle" fill="#ffffff" font-family="Cormorant Garamond, Georgia, serif" font-size="52" font-weight="700">PESANTREN ISLAM MUTIARA INSAN</text>
  <text x="600" y="200" text-anchor="middle" fill="#fef3c7" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="25">“Menumbuhkan Generasi Qur’ani yang Hafizh, Berilmu, Berakhlak, dan Mandiri.”</text>

  <!-- SPMB Main Title Banner -->
  <rect x="90" y="232" width="1020" height="150" rx="22" fill="#022c22" stroke="#fbbf24" stroke-width="2.5"/>
  <text x="600" y="286" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="36" font-weight="800" letter-spacing="2">SPMB MUTIARA INSAN</text>
  <text x="600" y="330" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="1.5">TAHUN AJARAN 2027–2028</text>
  <text x="600" y="364" text-anchor="middle" fill="#a7f3d0" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2">JENJANG PENDIDIKAN: TK  –  SD  –  SMP  –  SMA</text>

  <!-- 3 Highlight Boxes: Gelombang 1, Promo, Trial Class -->
  <rect x="80" y="418" width="326" height="130" rx="18" fill="#ffffff" stroke="#065f46" stroke-width="2"/>
  <text x="243" y="456" text-anchor="middle" fill="#065f46" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="1">GELOMBANG PENDAFTARAN</text>
  <text x="243" y="492" text-anchor="middle" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="23" font-weight="800">Gelombang 1</text>
  <text x="243" y="524" text-anchor="middle" fill="#047857" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">September – Oktober 2026</text>

  <rect x="437" y="418" width="326" height="130" rx="18" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
  <text x="600" y="456" text-anchor="middle" fill="#92400e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="1">PROMO PENDAFTARAN</text>
  <text x="600" y="492" text-anchor="middle" fill="#78350f" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="800">Free Biaya Pendaftaran</text>
  <text x="600" y="524" text-anchor="middle" fill="#b45309" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="18" font-weight="700">Untuk 5 Orang Pertama</text>

  <rect x="794" y="418" width="326" height="130" rx="18" fill="#ffffff" stroke="#065f46" stroke-width="2"/>
  <text x="957" y="456" text-anchor="middle" fill="#065f46" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="1">PROGRAM AKAN DATANG</text>
  <text x="957" y="492" text-anchor="middle" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">“Trial Class”</text>
  <text x="957" y="524" text-anchor="middle" fill="#44403c" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="17" font-weight="600">Khusus Calon Santri Baru</text>

  <!-- Section Title: TARGET LULUSAN -->
  <rect x="80" y="582" width="1040" height="54" rx="14" fill="#064e3b"/>
  <text x="600" y="618" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2">TARGET LULUSAN PESANTREN ISLAM MUTIARA INSAN</text>

  <!-- Card 1: TK -->
  <rect x="80" y="656" width="330" height="390" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <rect x="80" y="656" width="330" height="60" rx="18" fill="#065f46"/>
  <text x="245" y="694" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="800">Taman Kanak-kanak (TK)</text>
  <g font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="18.5" fill="#1c1917" font-weight="600">
    <text x="108" y="762">1. Hafal Juz 30</text>
    <text x="108" y="814">2. Hafal Doa &amp; Hadits Pilihan</text>
    <text x="108" y="866">3. Kosa Kata Bahasa Arab</text>
    <text x="132" y="894">pilihan</text>
    <text x="108" y="944">4. Mampu Calistung</text>
    <text x="108" y="996">5. Memiliki Adab Islami</text>
  </g>

  <!-- Card 2: Setara SD -->
  <rect x="435" y="656" width="330" height="390" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <rect x="435" y="656" width="330" height="60" rx="18" fill="#065f46"/>
  <text x="600" y="694" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="800">Setara SD</text>
  <g font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="18.5" fill="#1c1917" font-weight="600">
    <text x="463" y="762">1. Hafal 4 Juz Al-Qur'an</text>
    <text x="463" y="818">2. Hafal 50 Doa &amp; Hadits</text>
    <text x="487" y="846">Pilihan</text>
    <text x="463" y="902">3. Mampu Percakapan Bahasa</text>
    <text x="487" y="930">Arab Sehari-hari</text>
    <text x="463" y="986">4. Memiliki Adab Islami</text>
  </g>

  <!-- Card 3: Setara SMP & SMA -->
  <rect x="790" y="656" width="330" height="390" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <rect x="790" y="656" width="330" height="60" rx="18" fill="#065f46"/>
  <text x="955" y="694" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="800">Setara SMP &amp; SMA</text>
  <g font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="18.5" fill="#1c1917" font-weight="600">
    <text x="818" y="762">1. Hafal 30 Juz Al-Qur'an</text>
    <text x="818" y="814">2. Hafal Kitab Umdatul Ahkam</text>
    <text x="842" y="842">420 Hadits</text>
    <text x="818" y="894">3. Mampu Berbahasa Arab</text>
    <text x="842" y="922">Lisan dan Tulisan</text>
    <text x="818" y="974">4. Menguasai Cabang Ilmu Syar'i</text>
    <text x="818" y="1022">5. Hafal Beberapa Mutun</text>
  </g>

  <!-- Section Title: PERSYARATAN PENDAFTARAN -->
  <rect x="80" y="1082" width="1040" height="54" rx="14" fill="#064e3b"/>
  <text x="600" y="1118" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2">PERSYARATAN PENDAFTARAN</text>

  <rect x="80" y="1154" width="1040" height="350" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <g font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" fill="#1c1917" font-weight="600">
    <text x="120" y="1210">1. Mengisi Formulir Pendaftaran</text>
    <text x="120" y="1260">2. Pas Foto Berwarna 3×4 sebanyak 2 lembar</text>
    <text x="120" y="1310">3. Fotokopi Kartu Keluarga (KK) dan KTP Orang Tua</text>
    <text x="120" y="1360">4. Fotokopi Surat Keterangan Lulus untuk jenjang SMP dan SMA</text>
    <text x="120" y="1410">5. Untuk TK, genap berusia 4,5 tahun pada bulan Juli 2027</text>
    <text x="120" y="1460">6. Membayar Uang Pendaftaran Rp150.000 (Free untuk 5 orang pertama)</text>
  </g>

  <!-- Footer Banner Page 1 -->
  <rect x="80" y="1534" width="1040" height="92" rx="16" fill="#042f24"/>
  <text x="600" y="1574" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="20" font-weight="800">INFORMASI PENDAFTARAN: 0812-1098-876 (Abu Al Fatih)</text>
  <text x="600" y="1605" text-anchor="middle" fill="#e7e5e4" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16.5" font-weight="500">Jln. Tuan Rio II, Tiyuh Bandar Dewa (Samping Pos Polisi Kalim Kaliming), Kec. Tulang Bawang Tengah, Kab. Tulang Bawang Barat, Lampung  •  Halaman 1 / 2</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createOfficialBrochurePage2SvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1700" width="1200" height="1700">
  <defs>
    <linearGradient id="bgGrad2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#042f24"/>
      <stop offset="16%" stop-color="#064e3b"/>
      <stop offset="16.1%" stop-color="#FAF8F5"/>
      <stop offset="100%" stop-color="#FAF8F5"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="1700" fill="url(#bgGrad2)"/>
  <rect x="36" y="36" width="1128" height="1628" rx="24" fill="none" stroke="#d97706" stroke-width="3" stroke-opacity="0.55"/>

  <!-- Header Page 2 -->
  <text x="600" y="102" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="2">SPMB PESANTREN ISLAM MUTIARA INSAN • TAHUN AJARAN 2027–2028</text>
  <text x="600" y="152" text-anchor="middle" fill="#ffffff" font-family="Cormorant Garamond, Georgia, serif" font-size="46" font-weight="700">RINCIAN BIAYA, EKSTRAKURIKULER &amp; INFORMASI</text>
  <text x="600" y="198" text-anchor="middle" fill="#a7f3d0" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="600">Transparansi Biaya Pendidikan Jenjang TK, SD, SMP, dan SMA</text>

  <!-- Section Title: RINCIAN BIAYA PENDIDIKAN -->
  <rect x="80" y="246" width="1040" height="52" rx="14" fill="#064e3b"/>
  <text x="600" y="280" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="23" font-weight="800" letter-spacing="2">RINCIAN BIAYA PENDIDIKAN TAHUN AJARAN 2027–2028</text>

  <!-- Tuition Card 1: TK -->
  <rect x="80" y="318" width="505" height="260" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <rect x="80" y="318" width="505" height="54" rx="18" fill="#065f46"/>
  <text x="110" y="353" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">JENJANG TK</text>
  <text x="555" y="353" text-anchor="end" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">Total: Rp2.000.000</text>
  <text x="110" y="404" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• Daftar Ulang: Rp1.900.000</text>
  <text x="110" y="438" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• SPP Bulan Juli: Rp100.000</text>
  <text x="110" y="482" fill="#44403c" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="600">Keterangan Daftar Ulang:</text>
  <text x="110" y="508" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">Mencakup seragam 3 stel, buku pelajaran, pengembangan,</text>
  <text x="110" y="532" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">dan outing class (kegiatan dalam satu tahun).</text>

  <!-- Tuition Card 2: SD -->
  <rect x="615" y="318" width="505" height="260" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <rect x="615" y="318" width="505" height="54" rx="18" fill="#065f46"/>
  <text x="645" y="353" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">JENJANG SD</text>
  <text x="1090" y="353" text-anchor="end" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">Total: Rp2.500.000</text>
  <text x="645" y="404" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• Daftar Ulang: Rp2.365.000</text>
  <text x="645" y="438" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• SPP Bulan Juli: Rp135.000</text>
  <text x="645" y="482" fill="#44403c" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="600">Keterangan Daftar Ulang:</text>
  <text x="645" y="508" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">Mencakup seragam 3 stel, buku pelajaran, pengembangan,</text>
  <text x="645" y="532" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">dan UAS ganjil/genap.</text>

  <!-- Tuition Card 3: SMP -->
  <rect x="80" y="600" width="505" height="260" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <rect x="80" y="600" width="505" height="54" rx="18" fill="#065f46"/>
  <text x="110" y="635" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">JENJANG SMP</text>
  <text x="555" y="635" text-anchor="end" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">Total: Rp6.500.000</text>
  <text x="110" y="686" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• Daftar Ulang: Rp5.750.000</text>
  <text x="110" y="720" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• SPP Bulan Juli: Rp750.000</text>
  <text x="110" y="764" fill="#44403c" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="600">Keterangan Daftar Ulang:</text>
  <text x="110" y="790" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">Mencakup seragam, buku pelajaran, pengembangan,</text>
  <text x="110" y="814" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">ekstrakurikuler, rihlah, dan UAS ganjil/genap.</text>

  <!-- Tuition Card 4: SMA -->
  <rect x="615" y="600" width="505" height="260" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <rect x="615" y="600" width="505" height="54" rx="18" fill="#065f46"/>
  <text x="645" y="635" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">JENJANG SMA</text>
  <text x="1090" y="635" text-anchor="end" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">Total: Rp5.500.000</text>
  <text x="645" y="686" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• Daftar Ulang: Rp4.750.000</text>
  <text x="645" y="720" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="19" font-weight="700">• SPP Bulan Juli: Rp750.000</text>
  <text x="645" y="764" fill="#44403c" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="600">Keterangan Daftar Ulang:</text>
  <text x="645" y="790" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">Mencakup seragam, buku pelajaran, pengembangan,</text>
  <text x="645" y="814" fill="#57534e" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="15.5">ekstrakurikuler, rihlah, dan UAS ganjil/genap.</text>

  <!-- Section Title: EKSTRAKURIKULER -->
  <rect x="80" y="896" width="1040" height="52" rx="14" fill="#064e3b"/>
  <text x="600" y="930" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="23" font-weight="800" letter-spacing="2">KEGIATAN EKSTRAKURIKULER &amp; LIFE SKILL SANTRI</text>

  <rect x="80" y="968" width="460" height="220" rx="18" fill="#ffffff" stroke="#d6d3d1" stroke-width="2"/>
  <text x="115" y="1018" fill="#065f46" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">Olahraga &amp; Ketangkasan</text>
  <text x="115" y="1068" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="700">• Futsal</text>
  <text x="115" y="1116" fill="#1c1917" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="700">• Renang</text>

  <rect x="565" y="968" width="555" height="220" rx="18" fill="#022c22" stroke="#065f46" stroke-width="2"/>
  <text x="600" y="1018" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="800">Program Kemandirian (Life Skill)</text>
  <text x="600" y="1068" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="700">• Pertanian</text>
  <text x="860" y="1068" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="700">• Perikanan</text>
  <text x="600" y="1118" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="700">• Peternakan</text>
  <text x="860" y="1118" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="700">• Perkebunan</text>

  <!-- Section Title: ALAMAT & INFORMASI PENDAFTARAN -->
  <rect x="80" y="1224" width="1040" height="390" rx="22" fill="#042f24" stroke="#fbbf24" stroke-width="2.5"/>
  <text x="600" y="1282" text-anchor="middle" fill="#fbbf24" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="2">ALAMAT &amp; INFORMASI PENDAFTARAN</text>

  <text x="600" y="1340" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22" font-weight="700">Jln. Tuan Rio II, Tiyuh Bandar Dewa (Samping Pos Polisi Kalim Kaliming)</text>
  <text x="600" y="1376" text-anchor="middle" fill="#a7f3d0" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="21" font-weight="600">Kec. Tulang Bawang Tengah, Kab. Tulang Bawang Barat, Lampung</text>

  <rect x="270" y="1414" width="660" height="126" rx="18" fill="#fbbf24"/>
  <text x="600" y="1462" text-anchor="middle" fill="#022c22" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="20" font-weight="800" letter-spacing="1.5">HUBUNGI PANITIA PENDAFTARAN (WHATSAPP / TELP)</text>
  <text x="600" y="1512" text-anchor="middle" fill="#022c22" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="34" font-weight="800">0812-1098-876  (Abu Al Fatih)</text>

  <text x="600" y="1584" text-anchor="middle" fill="#e7e5e4" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16.5" font-weight="500">Website Resmi: https://mutiarainsantbb.vercel.app/  •  Halaman 2 / 2</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_SPMB_BROCHURE: SpmbBrochure = {
  id: DEFAULT_BROCHURE_ID,
  title: 'SPMB Mutiara Insan Tahun Ajaran 2027–2028',
  academicYear: '2027/2028',
  description:
    'Brosur resmi Seleksi Penerimaan Santri Baru (SPMB) Pesantren Islam Mutiara Insan Tahun Ajaran 2027–2028 untuk jenjang TK, SD, SMP, dan SMA beserta Target Lulusan, Persyaratan, Rincian Biaya, dan Ekstrakurikuler.',
  imageUrls: ['/assets/brosur-spmb-halaman-1.jpg', '/assets/brosur-spmb-halaman-2.jpg'],
  storagePaths: [],
  pageDocIds: [],
  isActive: true,
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-30T08:00:00.000Z',
  uploadedBy: 'admin',
  uploadedByName: 'Administrator AKSARA',
};

export interface ProcessedBrochurePage {
  previewDataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  fileName: string;
  mimeType: string;
  file: File;
}

const ALLOWED_BROCHURE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

const MAX_BROCHURE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per page

/**
 * Validates and prepares a brochure image file without degrading text readability.
 * - If the file is already <= 580 KB, keeps the original untouched DataURL so zero compression occurs.
 * - If larger, scales up to a generous 2000px maximum dimension at 0.92 quality so all small brochure text stays razor-sharp.
 */
export async function validateAndProcessBrochureFile(
  file: File
): Promise<ProcessedBrochurePage> {
  if (!file) {
    throw new Error('Tidak ada file gambar yang dipilih.');
  }

  const lowerName = (file.name || '').toLowerCase();
  const validExt =
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp');
  const validMime = ALLOWED_BROCHURE_MIME_TYPES.includes((file.type || '').toLowerCase());

  if (!validExt && !validMime) {
    throw new Error(
      'Format file tidak didukung. Gunakan gambar dengan format JPG, JPEG, PNG, atau WEBP.'
    );
  }

  if (file.size > MAX_BROCHURE_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Ukuran file terlalu besar (${mb} MB). Maksimal 10 MB per halaman brosur.`);
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Gagal membaca file gambar brosur.'));
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar brosur.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('File gambar tidak valid atau rusak.'));
    image.src = rawDataUrl;
  });

  const naturalWidth = img.naturalWidth || img.width || 1200;
  const naturalHeight = img.naturalHeight || img.height || 1700;

  // Preserve original untouched image if already compact enough for cloud document storage
  if (rawDataUrl.length <= 680_000) {
    return {
      previewDataUrl: rawDataUrl,
      width: naturalWidth,
      height: naturalHeight,
      originalSize: file.size,
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      file,
    };
  }

  // Otherwise render at high resolution (up to 1900px) with high-clarity quality (0.92)
  const MAX_DIM = 1900;
  let targetW = naturalWidth;
  let targetH = naturalHeight;
  if (naturalWidth > MAX_DIM || naturalHeight > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / naturalWidth, MAX_DIM / naturalHeight);
    targetW = Math.max(1, Math.round(naturalWidth * ratio));
    targetH = Math.max(1, Math.round(naturalHeight * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      previewDataUrl: rawDataUrl,
      width: naturalWidth,
      height: naturalHeight,
      originalSize: file.size,
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      file,
    };
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let highResDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  if (highResDataUrl.length > 740_000) {
    highResDataUrl = canvas.toDataURL('image/jpeg', 0.86);
  }
  if (highResDataUrl.length > 740_000) {
    const scale2 = 1550 / Math.max(targetW, targetH);
    const w2 = Math.max(1, Math.round(targetW * scale2));
    const h2 = Math.max(1, Math.round(targetH * scale2));
    canvas.width = w2;
    canvas.height = h2;
    const ctx2 = canvas.getContext('2d');
    if (ctx2) {
      ctx2.fillStyle = '#FFFFFF';
      ctx2.fillRect(0, 0, w2, h2);
      ctx2.imageSmoothingEnabled = true;
      ctx2.imageSmoothingQuality = 'high';
      ctx2.drawImage(img, 0, 0, w2, h2);
      highResDataUrl = canvas.toDataURL('image/jpeg', 0.86);
      targetW = w2;
      targetH = h2;
    }
  }

  return {
    previewDataUrl: highResDataUrl,
    width: targetW,
    height: targetH,
    originalSize: file.size,
    fileName: file.name,
    mimeType: 'image/jpeg',
    file,
  };
}

const LOCAL_BROCHURES_CACHE_KEY = 'kantoja_spmb_brochures_v1';

function readLocalBrochuresCache(): SpmbBrochure[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_BROCHURES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeLocalBrochuresCache(list: SpmbBrochure[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_BROCHURES_CACHE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Persists a single brochure page in Firestore (`brochurePages/{pageDocId}`)
 * and returns a compact reference (`firestore-page:{pageDocId}`) so the parent
 * `brochures/{brochureId}` document stays tiny and never hits the 1 MiB Firestore limit.
 */
async function uploadSingleBrochurePage(
  brochureId: string,
  pageIndex: number,
  pageInput: ProcessedBrochurePage | string
): Promise<{ imageUrl: string; storagePath: string; pageDocId: string; resolvedUrl: string }> {
  const pageDocId = `${brochureId}_page_${pageIndex + 1}`;
  const nowIso = new Date().toISOString();

  // Case 1: Existing URL or DataURL string (when editing a brochure without replacing this page)
  if (typeof pageInput === 'string') {
    const isHttpUrl = pageInput.startsWith('http://') || pageInput.startsWith('https://');
    if (isHttpUrl) {
      return {
        imageUrl: pageInput,
        storagePath: '',
        pageDocId,
        resolvedUrl: pageInput,
      };
    }

    await setDoc(
      doc(db, 'brochurePages', pageDocId),
      {
        id: pageDocId,
        brochureId,
        pageIndex,
        dataUrl: pageInput,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    return {
      imageUrl: `firestore-page:${pageDocId}`,
      storagePath: '',
      pageDocId,
      resolvedUrl: pageInput,
    };
  }

  // Case 2: Newly uploaded ProcessedBrochurePage
  const dataUrlToSave = pageInput.previewDataUrl;

  await setDoc(
    doc(db, 'brochurePages', pageDocId),
    {
      id: pageDocId,
      brochureId,
      pageIndex,
      dataUrl: dataUrlToSave,
      storageUrl: '',
      storagePath: '',
      updatedAt: nowIso,
    },
    { merge: true }
  );

  return {
    imageUrl: `firestore-page:${pageDocId}`,
    storagePath: '',
    pageDocId,
    resolvedUrl: dataUrlToSave,
  };
}

/**
 * Resolves `firestore-page:...` references or pageDocIds from Firestore `brochurePages` in parallel.
 */
export async function hydrateBrochurePages(brochure: SpmbBrochure): Promise<SpmbBrochure> {
  const rawUrls = Array.isArray(brochure.imageUrls) ? brochure.imageUrls : [];
  const pageDocIds = Array.isArray(brochure.pageDocIds) ? brochure.pageDocIds : [];

  const needsHydration =
    rawUrls.some((u) => typeof u === 'string' && u.startsWith('firestore-page:')) ||
    (rawUrls.length === 0 && pageDocIds.length > 0);

  if (!needsHydration) {
    return brochure;
  }

  const targetCount = Math.max(rawUrls.length, pageDocIds.length);
  const indices = Array.from({ length: targetCount }, (_, i) => i);

  const pageResults = await Promise.all(
    indices.map(async (i) => {
      const rawUrl = rawUrls[i] || '';
      if (rawUrl && !rawUrl.startsWith('firestore-page:')) {
        return rawUrl;
      }

      const docId = rawUrl.startsWith('firestore-page:')
        ? rawUrl.replace('firestore-page:', '')
        : pageDocIds[i] || `${brochure.id}_page_${i + 1}`;

      try {
        const pageSnap = await getDoc(doc(db, 'brochurePages', docId));
        if (pageSnap.exists()) {
          const data = pageSnap.data();
          if (
            data?.storageUrl &&
            typeof data.storageUrl === 'string' &&
            data.storageUrl.startsWith('http')
          ) {
            return data.storageUrl;
          }
          if (data?.dataUrl && typeof data.dataUrl === 'string') {
            return data.dataUrl;
          }
        }
      } catch {
        // ignore individual page read error
      }
      return '';
    })
  );

  const resolvedUrls = pageResults.filter((u) => Boolean(u));

  // If still empty, check local cache for matching brochure pages
  if (resolvedUrls.length === 0) {
    const cachedList = readLocalBrochuresCache();
    const cachedMatch = cachedList?.find((c) => c.id === brochure.id);
    if (cachedMatch && Array.isArray(cachedMatch.imageUrls) && cachedMatch.imageUrls.length > 0) {
      return {
        ...brochure,
        imageUrls: cachedMatch.imageUrls,
      };
    }
  }

  return {
    ...brochure,
    imageUrls:
      resolvedUrls.length > 0
        ? resolvedUrls
        : DEFAULT_SPMB_BROCHURE.imageUrls,
  };
}

/**
 * Fetches all brochures from Firestore, seeding the default official 2027–2028 brochure if none exist yet.
 */
export async function fetchBrochuresFromFirestore(): Promise<SpmbBrochure[]> {
  try {
    const snap = await getDocs(collection(db, 'brochures'));
    if (snap.empty) {
      const cached = readLocalBrochuresCache();
      return cached && cached.length > 0 ? cached : [DEFAULT_SPMB_BROCHURE];
    }

    const validDocs = snap.docs
      .map((d) => d.data() as SpmbBrochure & { isDeleted?: boolean })
      .filter((raw) => raw && raw.id && !raw.isDeleted);

    if (validDocs.length === 0) {
      return [];
    }

    const hydratedList = await Promise.all(validDocs.map((raw) => hydrateBrochurePages(raw)));
    hydratedList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    writeLocalBrochuresCache(hydratedList);
    return hydratedList;
  } catch {
    const cached = readLocalBrochuresCache();
    return cached && cached.length > 0 ? cached : [DEFAULT_SPMB_BROCHURE];
  }
}

/**
 * Subscribes to real-time updates of the `brochures` collection in Firestore.
 */
export function subscribeToBrochures(
  onUpdate: (brochures: SpmbBrochure[]) => void
): () => void {
  const cached = readLocalBrochuresCache();
  if (cached && cached.length > 0) {
    onUpdate(cached);
  }

  const colRef = collection(db, 'brochures');
  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        const local = readLocalBrochuresCache();
        onUpdate(local && local.length > 0 ? local : [DEFAULT_SPMB_BROCHURE]);
        return;
      }

      const validDocs = snapshot.docs
        .map((d) => d.data() as SpmbBrochure & { isDeleted?: boolean })
        .filter((raw) => raw && raw.id && !raw.isDeleted);

      if (validDocs.length === 0) {
        writeLocalBrochuresCache([]);
        onUpdate([]);
        return;
      }

      const list = await Promise.all(validDocs.map((raw) => hydrateBrochurePages(raw)));
      list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      writeLocalBrochuresCache(list);
      onUpdate(list);
    },
    () => {
      const local = readLocalBrochuresCache();
      onUpdate(local && local.length > 0 ? local : [DEFAULT_SPMB_BROCHURE]);
    }
  );
  return unsubscribe;
}

/**
 * Creates or updates a brochure in Firestore (`brochures` + `brochurePages`) and local cache.
 */
export async function saveBrochureToCloud(params: {
  id?: string;
  title: string;
  academicYear: string;
  description: string;
  pages: Array<ProcessedBrochurePage | string>;
  isActive: boolean;
  uploadedBy: string;
  uploadedByName?: string;
}): Promise<SpmbBrochure> {
  const brochureId = params.id || `brochure_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const imageUrls: string[] = [];
  const resolvedUrls: string[] = [];
  const storagePaths: string[] = [];
  const pageDocIds: string[] = [];

  for (let i = 0; i < params.pages.length; i++) {
    const pageItem = params.pages[i];
    if (!pageItem) continue;
    const uploaded = await uploadSingleBrochurePage(brochureId, i, pageItem);
    imageUrls.push(uploaded.imageUrl);
    resolvedUrls.push(uploaded.resolvedUrl);
    if (uploaded.storagePath) storagePaths.push(uploaded.storagePath);
    pageDocIds.push(uploaded.pageDocId);
  }

  let existingCreatedAt = nowIso;
  try {
    const existingSnap = await getDoc(doc(db, 'brochures', brochureId));
    if (existingSnap.exists() && existingSnap.data()?.createdAt) {
      existingCreatedAt = existingSnap.data().createdAt;
    }
  } catch {
    // ignore
  }

  const firestoreRecord: SpmbBrochure & { isDeleted?: boolean } = {
    id: brochureId,
    title: params.title.trim() || 'SPMB Mutiara Insan Tahun Ajaran 2027–2028',
    academicYear: params.academicYear.trim() || '2027/2028',
    description: params.description.trim(),
    imageUrls,
    storagePaths,
    pageDocIds,
    isActive: params.isActive,
    isDeleted: false,
    createdAt: existingCreatedAt,
    updatedAt: nowIso,
    uploadedBy: params.uploadedBy || 'admin',
    uploadedByName: params.uploadedByName || 'Administrator',
  };

  await setDoc(doc(db, 'brochures', brochureId), firestoreRecord, { merge: true });

  const hydratedRecord: SpmbBrochure = {
    ...firestoreRecord,
    imageUrls: resolvedUrls,
  };

  // Update local cache immediately
  const currentCache = readLocalBrochuresCache() || [];
  const filteredCache = currentCache.filter((c) => c.id !== brochureId);
  const nextCache = [hydratedRecord, ...filteredCache].sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
  writeLocalBrochuresCache(nextCache);

  return hydratedRecord;
}

/**
 * Toggles active/inactive status of a brochure in Firestore.
 */
export async function setBrochureActiveStatus(
  brochure: SpmbBrochure,
  nextActive: boolean
): Promise<void> {
  const nowIso = new Date().toISOString();
  // If toggling the default brochure before it was saved to Firestore, persist its pages first
  if (brochure.id === DEFAULT_BROCHURE_ID) {
    const snap = await getDoc(doc(db, 'brochurePages', `${DEFAULT_BROCHURE_ID}_page_1`));
    if (!snap.exists()) {
      await saveBrochureToCloud({
        id: DEFAULT_BROCHURE_ID,
        title: brochure.title,
        academicYear: brochure.academicYear,
        description: brochure.description,
        pages: brochure.imageUrls,
        isActive: nextActive,
        uploadedBy: brochure.uploadedBy || 'admin',
        uploadedByName: brochure.uploadedByName || 'Administrator',
      });
      return;
    }
  }
  await setDoc(
    doc(db, 'brochures', brochure.id),
    {
      isActive: nextActive,
      updatedAt: nowIso,
    },
    { merge: true }
  );
}

/**
 * Deletes a brochure document from Firestore and cleans up its pages & storage objects.
 */
export async function deleteBrochureFromCloud(brochure: SpmbBrochure): Promise<void> {
  if (storage && Array.isArray(brochure.storagePaths)) {
    for (const p of brochure.storagePaths) {
      if (!p) continue;
      try {
        await deleteObject(storageRef(storage, p));
      } catch {
        // ignore if already removed
      }
    }
  }

  if (Array.isArray(brochure.pageDocIds)) {
    for (const pageId of brochure.pageDocIds) {
      if (!pageId) continue;
      try {
        await deleteDoc(doc(db, 'brochurePages', pageId));
      } catch {
        // ignore
      }
    }
  }

  if (brochure.id === DEFAULT_BROCHURE_ID) {
    // Mark default brochure as deleted so it does not re-seed when collection is empty
    await setDoc(
      doc(db, 'brochures', DEFAULT_BROCHURE_ID),
      {
        id: DEFAULT_BROCHURE_ID,
        isActive: false,
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } else {
    await deleteDoc(doc(db, 'brochures', brochure.id));
  }

  const currentCache = readLocalBrochuresCache() || [];
  writeLocalBrochuresCache(currentCache.filter((c) => c.id !== brochure.id));
}

/**
 * Helper to load any image URL / DataURL into an HTMLImageElement and render it onto a high-res Canvas.
 */
async function loadImageToCanvas(src: string): Promise<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gagal memuat gambar brosur untuk diunduh.'));
    image.src = src;
  });

  const width = img.naturalWidth || img.width || 1200;
  const height = img.naturalHeight || img.height || 1700;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
  }
  return { canvas, width, height };
}

/**
 * Triggers a genuine file download in the browser (never just opens a new tab).
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) link.parentNode.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 1500);
}

/**
 * Downloads a single brochure page as a high-resolution PNG/JPG image file.
 */
export async function downloadBrochurePageImage(
  imageUrl: string,
  pageNumber: number,
  brochureTitle = 'Brosur-SPMB-Mutiara-Insan-2027-2028'
): Promise<void> {
  const safeBase = brochureTitle
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${safeBase}-Halaman-${pageNumber}.png`;

  // Convert SVG or raster image to high-resolution PNG blob so it works on all Android/iOS/Desktop image viewers
  const { canvas } = await loadImageToCanvas(imageUrl);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Gagal menyiapkan file unduhan.'));
      },
      'image/png',
      1.0
    );
  });

  triggerBlobDownload(blob, filename);
}

/**
 * Converts a base64 JPEG data URL into a Uint8Array of raw JPEG bytes.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Builds a genuine, multi-page PDF 1.4 document embedding full-resolution JPEG streams
 * (`/Filter /DCTDecode`) with zero quality loss, and downloads it to the user's device.
 */
export async function downloadAllBrochurePagesAsPdf(
  brochure: SpmbBrochure
): Promise<void> {
  const pages = brochure.imageUrls || [];
  if (pages.length === 0) return;

  const preparedPages: Array<{
    jpegBytes: Uint8Array;
    widthPx: number;
    heightPx: number;
  }> = [];

  for (const pageUrl of pages) {
    const { canvas, width, height } = await loadImageToCanvas(pageUrl);
    // High-clarity 0.95 JPEG stream for direct DCTDecode PDF embedding without quality degradation
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
    preparedPages.push({
      jpegBytes,
      widthPx: width,
      heightPx: height,
    });
  }

  // Construct valid PDF 1.4 binary with 1 catalog (obj 1), 1 pages root (obj 2),
  // and 3 objects per page: Page object, Content stream, Image XObject
  const encoder = new TextEncoder();
  const chunks: BlobPart[] = [];
  const offsets: number[] = [0]; // index 0 is free object
  let currentOffset = 0;

  const pushStr = (str: string) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes as unknown as BlobPart);
    currentOffset += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes as unknown as BlobPart);
    currentOffset += bytes.length;
  };

  // PDF Header
  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object 1: Catalog
  offsets[1] = currentOffset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Reserve Object 2: Pages Root (we know page object numbers: 3, 6, 9, ...)
  const pageObjNums = preparedPages.map((_, idx) => 3 + idx * 3);
  offsets[2] = currentOffset;
  pushStr(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums
      .map((n) => `${n} 0 R`)
      .join(' ')}] /Count ${preparedPages.length} >>\nendobj\n`
  );

  // Create Page, Content, and Image XObject for each brochure page
  preparedPages.forEach((p, idx) => {
    const pageObjNum = 3 + idx * 3;
    const contentObjNum = pageObjNum + 1;
    const imgObjNum = pageObjNum + 2;

    // Fit onto standard A4 width (595.28 pt) with proportional height
    const pdfWidthPt = 595.28;
    const pdfHeightPt = Number(((p.heightPx / p.widthPx) * pdfWidthPt).toFixed(2));

    // Page Object
    offsets[pageObjNum] = currentOffset;
    pushStr(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidthPt} ${pdfHeightPt}] /Resources << /XObject << /Im${idx} ${imgObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
    );

    // Content Stream
    const contentStream = `q\n${pdfWidthPt} 0 0 ${pdfHeightPt} 0 0 cm\n/Im${idx} Do\nQ\n`;
    offsets[contentObjNum] = currentOffset;
    pushStr(
      `${contentObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
    );

    // Image XObject
    offsets[imgObjNum] = currentOffset;
    pushStr(
      `${imgObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.widthPx} /Height ${p.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`
    );
    pushBytes(p.jpegBytes);
    pushStr('\nendstream\nendobj\n');
  });

  const totalObjects = 2 + preparedPages.length * 3;
  const xrefOffset = currentOffset;
  pushStr(`xref\n0 ${totalObjects + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i <= totalObjects; i++) {
    const padded = String(offsets[i] || 0).padStart(10, '0');
    pushStr(`${padded} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  const pdfBlob = new Blob(chunks, { type: 'application/pdf' });
  const safeBase = (brochure.title || 'Brosur-SPMB-Mutiara-Insan-2027-2028')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  triggerBlobDownload(pdfBlob, `${safeBase}.pdf`);
}
