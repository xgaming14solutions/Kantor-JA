/**
 * AKSARA - Data Referensi Al-Qur'an 114 Surah, 30 Juz, dan Kitab Hadis
 * Berdasarkan Standar Mushaf Madinah (Mujamma' Malik Fahd) 604 Halaman.
 * Digunakan untuk perhitungan otomatis hafalan Al-Qur'an dan Hadis santri
 * tanpa mengarang data dan menjamin akurasi mutlak.
 */

export interface SurahReference {
  number: number;
  name: string; // Nama Latin, e.g. "Al-Baqarah"
  arabic: string; // Tulisan Arab, e.g. "البقرة"
  meaning: string; // Arti, e.g. "Sapi Betina"
  ayahCount: number; // Total ayat
  startPage: number; // Halaman awal mushaf standar (1 - 604)
  endPage: number; // Halaman akhir mushaf standar (1 - 604)
  startJuz: number; // Juz awal (1 - 30)
  endJuz: number; // Juz akhir (1 - 30)
}

export interface JuzBoundary {
  juz: number;
  name: string;
  startSurah: number;
  startSurahName: string;
  startAyah: number;
  endSurah: number;
  endSurahName: string;
  endAyah: number;
  startPage: number;
  endPage: number;
}

export interface HadithBookMetadata {
  id: string;
  name: string;
  author: string;
  totalHadith: number; // Total hadis resmi dalam kitab
  description: string;
}

export const QURAN_SURAHS: SurahReference[] = [
  { number: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', meaning: 'Pembukaan', ayahCount: 7, startPage: 1, endPage: 1, startJuz: 1, endJuz: 1 },
  { number: 2, name: 'Al-Baqarah', arabic: 'البقرة', meaning: 'Sapi Betina', ayahCount: 286, startPage: 2, endPage: 49, startJuz: 1, endJuz: 3 },
  { number: 3, name: 'Ali \'Imran', arabic: 'آل عمران', meaning: 'Keluarga Imran', ayahCount: 200, startPage: 50, endPage: 76, startJuz: 3, endJuz: 4 },
  { number: 4, name: 'An-Nisa\'', arabic: 'النساء', meaning: 'Wanita', ayahCount: 176, startPage: 77, endPage: 106, startJuz: 4, endJuz: 6 },
  { number: 5, name: 'Al-Ma\'idah', arabic: 'المائدة', meaning: 'Jamuan Hidangan', ayahCount: 120, startPage: 106, endPage: 127, startJuz: 6, endJuz: 7 },
  { number: 6, name: 'Al-An\'am', arabic: 'الأنعام', meaning: 'Binatang Ternak', ayahCount: 165, startPage: 128, endPage: 150, startJuz: 7, endJuz: 8 },
  { number: 7, name: 'Al-A\'raf', arabic: 'الأعراف', meaning: 'Tempat Tertinggi', ayahCount: 206, startPage: 151, endPage: 176, startJuz: 8, endJuz: 9 },
  { number: 8, name: 'Al-Anfal', arabic: 'الأنفال', meaning: 'Rampasan Perang', ayahCount: 75, startPage: 177, endPage: 186, startJuz: 9, endJuz: 10 },
  { number: 9, name: 'At-Taubah', arabic: 'التوبة', meaning: 'Pengampunan', ayahCount: 129, startPage: 187, endPage: 207, startJuz: 10, endJuz: 11 },
  { number: 10, name: 'Yunus', arabic: 'يونس', meaning: 'Nabi Yunus', ayahCount: 109, startPage: 208, endPage: 221, startJuz: 11, endJuz: 11 },
  { number: 11, name: 'Hud', arabic: 'هود', meaning: 'Nabi Hud', ayahCount: 123, startPage: 221, endPage: 235, startJuz: 11, endJuz: 12 },
  { number: 12, name: 'Yusuf', arabic: 'يوسف', meaning: 'Nabi Yusuf', ayahCount: 111, startPage: 235, endPage: 248, startJuz: 12, endJuz: 13 },
  { number: 13, name: 'Ar-Ra\'d', arabic: 'الرعد', meaning: 'Guruh', ayahCount: 43, startPage: 249, endPage: 255, startJuz: 13, endJuz: 13 },
  { number: 14, name: 'Ibrahim', arabic: 'إبراهيم', meaning: 'Nabi Ibrahim', ayahCount: 52, startPage: 255, endPage: 261, startJuz: 13, endJuz: 13 },
  { number: 15, name: 'Al-Hijr', arabic: 'الحجر', meaning: 'Gunung Al-Hijr', ayahCount: 99, startPage: 262, endPage: 267, startJuz: 14, endJuz: 14 },
  { number: 16, name: 'An-Nahl', arabic: 'النحل', meaning: 'Lebah', ayahCount: 128, startPage: 267, endPage: 281, startJuz: 14, endJuz: 14 },
  { number: 17, name: 'Al-Isra\'', arabic: 'الإسراء', meaning: 'Perjalanan Malam', ayahCount: 111, startPage: 282, endPage: 293, startJuz: 15, endJuz: 15 },
  { number: 18, name: 'Al-Kahf', arabic: 'الكهف', meaning: 'Gua', ayahCount: 110, startPage: 293, endPage: 304, startJuz: 15, endJuz: 16 },
  { number: 19, name: 'Maryam', arabic: 'مريم', meaning: 'Siti Maryam', ayahCount: 98, startPage: 305, endPage: 312, startJuz: 16, endJuz: 16 },
  { number: 20, name: 'Ta-Ha', arabic: 'طه', meaning: 'Ta-Ha', ayahCount: 135, startPage: 312, endPage: 321, startJuz: 16, endJuz: 16 },
  { number: 21, name: 'Al-Anbiya\'', arabic: 'الأنبياء', meaning: 'Para Nabi', ayahCount: 112, startPage: 322, endPage: 331, startJuz: 17, endJuz: 17 },
  { number: 22, name: 'Al-Hajj', arabic: 'الحج', meaning: 'Haji', ayahCount: 78, startPage: 332, endPage: 341, startJuz: 17, endJuz: 17 },
  { number: 23, name: 'Al-Mu\'minun', arabic: 'المؤمنون', meaning: 'Orang-orang Mukmin', ayahCount: 118, startPage: 342, endPage: 349, startJuz: 18, endJuz: 18 },
  { number: 24, name: 'An-Nur', arabic: 'النور', meaning: 'Cahaya', ayahCount: 64, startPage: 350, endPage: 359, startJuz: 18, endJuz: 18 },
  { number: 25, name: 'Al-Furqan', arabic: 'الفرقان', meaning: 'Pembeda Benar-Salah', ayahCount: 77, startPage: 359, endPage: 366, startJuz: 18, endJuz: 19 },
  { number: 26, name: 'Asy-Syu\'ara\'', arabic: 'الشعراء', meaning: 'Para Penyair', ayahCount: 227, startPage: 367, endPage: 376, startJuz: 19, endJuz: 19 },
  { number: 27, name: 'An-Naml', arabic: 'النمل', meaning: 'Semut', ayahCount: 93, startPage: 377, endPage: 385, startJuz: 19, endJuz: 20 },
  { number: 28, name: 'Al-Qasas', arabic: 'القصص', meaning: 'Kisah-kisah', ayahCount: 88, startPage: 385, endPage: 396, startJuz: 20, endJuz: 20 },
  { number: 29, name: 'Al-\'Ankabut', arabic: 'العنكبوت', meaning: 'Laba-laba', ayahCount: 69, startPage: 396, endPage: 404, startJuz: 20, endJuz: 21 },
  { number: 30, name: 'Ar-Rum', arabic: 'الروم', meaning: 'Bangsa Romawi', ayahCount: 60, startPage: 404, endPage: 410, startJuz: 21, endJuz: 21 },
  { number: 31, name: 'Luqman', arabic: 'لقمان', meaning: 'Keluarga Luqman', ayahCount: 34, startPage: 411, endPage: 414, startJuz: 21, endJuz: 21 },
  { number: 32, name: 'As-Sajdah', arabic: 'السجدة', meaning: 'Sujud', ayahCount: 30, startPage: 415, endPage: 417, startJuz: 21, endJuz: 21 },
  { number: 33, name: 'Al-Ahzab', arabic: 'الأحزاب', meaning: 'Golongan yang Bersekutu', ayahCount: 73, startPage: 418, endPage: 427, startJuz: 21, endJuz: 22 },
  { number: 34, name: 'Saba\'', arabic: 'سبأ', meaning: 'Kaum Saba\'', ayahCount: 54, startPage: 428, endPage: 434, startJuz: 22, endJuz: 22 },
  { number: 35, name: 'Fatir', arabic: 'فاطر', meaning: 'Pencipta', ayahCount: 45, startPage: 434, endPage: 440, startJuz: 22, endJuz: 22 },
  { number: 36, name: 'Ya-Sin', arabic: 'يس', meaning: 'Ya-Sin', ayahCount: 83, startPage: 440, endPage: 445, startJuz: 22, endJuz: 23 },
  { number: 37, name: 'As-Saffat', arabic: 'الصافات', meaning: 'Barisan-barisan', ayahCount: 182, startPage: 446, endPage: 452, startJuz: 23, endJuz: 23 },
  { number: 38, name: 'Sad', arabic: 'ص', meaning: 'Shad', ayahCount: 88, startPage: 453, endPage: 458, startJuz: 23, endJuz: 23 },
  { number: 39, name: 'Az-Zumar', arabic: 'الزمر', meaning: 'Rombongan-rombongan', ayahCount: 75, startPage: 458, endPage: 467, startJuz: 23, endJuz: 24 },
  { number: 40, name: 'Ghafir', arabic: 'غافر', meaning: 'Maha Pengampun', ayahCount: 85, startPage: 467, endPage: 476, startJuz: 24, endJuz: 24 },
  { number: 41, name: 'Fussilat', arabic: 'فصلت', meaning: 'Yang Dijelaskan', ayahCount: 54, startPage: 477, endPage: 482, startJuz: 24, endJuz: 25 },
  { number: 42, name: 'Asy-Syura', arabic: 'الشورى', meaning: 'Musyawarah', ayahCount: 53, startPage: 483, endPage: 489, startJuz: 25, endJuz: 25 },
  { number: 43, name: 'Az-Zukhruf', arabic: 'الزخرف', meaning: 'Perhiasan Emas', ayahCount: 89, startPage: 489, endPage: 495, startJuz: 25, endJuz: 25 },
  { number: 44, name: 'Ad-Dukhan', arabic: 'الدخان', meaning: 'Kabut Asap', ayahCount: 59, startPage: 496, endPage: 498, startJuz: 25, endJuz: 25 },
  { number: 45, name: 'Al-Jasiyah', arabic: 'الجاثية', meaning: 'Yang Berlutut', ayahCount: 37, startPage: 499, endPage: 502, startJuz: 25, endJuz: 25 },
  { number: 46, name: 'Al-Ahqaf', arabic: 'الأحقاف', meaning: 'Bukit Pasir', ayahCount: 35, startPage: 502, endPage: 506, startJuz: 26, endJuz: 26 },
  { number: 47, name: 'Muhammad', arabic: 'محمد', meaning: 'Nabi Muhammad SAW', ayahCount: 38, startPage: 507, endPage: 510, startJuz: 26, endJuz: 26 },
  { number: 48, name: 'Al-Fath', arabic: 'الفتح', meaning: 'Kemenangan', ayahCount: 29, startPage: 511, endPage: 515, startJuz: 26, endJuz: 26 },
  { number: 49, name: 'Al-Hujurat', arabic: 'الحجرات', meaning: 'Kamar-kamar', ayahCount: 18, startPage: 515, endPage: 517, startJuz: 26, endJuz: 26 },
  { number: 50, name: 'Qaf', arabic: 'ق', meaning: 'Qaf', ayahCount: 45, startPage: 518, endPage: 520, startJuz: 26, endJuz: 26 },
  { number: 51, name: 'Az-Zariyat', arabic: 'الذاريات', meaning: 'Angin yang Menerbangkan', ayahCount: 60, startPage: 520, endPage: 523, startJuz: 26, endJuz: 27 },
  { number: 52, name: 'At-Tur', arabic: 'الطور', meaning: 'Bukit Thursina', ayahCount: 49, startPage: 523, endPage: 525, startJuz: 27, endJuz: 27 },
  { number: 53, name: 'An-Najm', arabic: 'النجم', meaning: 'Bintang', ayahCount: 62, startPage: 526, endPage: 528, startJuz: 27, endJuz: 27 },
  { number: 54, name: 'Al-Qamar', arabic: 'القمر', meaning: 'Bulan', ayahCount: 55, startPage: 528, endPage: 531, startJuz: 27, endJuz: 27 },
  { number: 55, name: 'Ar-Rahman', arabic: 'الرحمن', meaning: 'Maha Pemurah', ayahCount: 78, startPage: 531, endPage: 534, startJuz: 27, endJuz: 27 },
  { number: 56, name: 'Al-Waqi\'ah', arabic: 'الواقعة', meaning: 'Hari Kiamat', ayahCount: 96, startPage: 534, endPage: 537, startJuz: 27, endJuz: 27 },
  { number: 57, name: 'Al-Hadid', arabic: 'الحديد', meaning: 'Besi', ayahCount: 29, startPage: 537, endPage: 541, startJuz: 27, endJuz: 27 },
  { number: 58, name: 'Al-Mujadilah', arabic: 'المجادلة', meaning: 'Gugatan Wanita', ayahCount: 22, startPage: 542, endPage: 545, startJuz: 28, endJuz: 28 },
  { number: 59, name: 'Al-Hasyr', arabic: 'الحشر', meaning: 'Pengusiran', ayahCount: 24, startPage: 545, endPage: 548, startJuz: 28, endJuz: 28 },
  { number: 60, name: 'Al-Mumtahanah', arabic: 'الممتحنة', meaning: 'Wanita yang Diuji', ayahCount: 13, startPage: 549, endPage: 551, startJuz: 28, endJuz: 28 },
  { number: 61, name: 'As-Saff', arabic: 'الصف', meaning: 'Barisan', ayahCount: 14, startPage: 551, endPage: 552, startJuz: 28, endJuz: 28 },
  { number: 62, name: 'Al-Jumu\'ah', arabic: 'الجمعة', meaning: 'Hari Jumat', ayahCount: 11, startPage: 553, endPage: 554, startJuz: 28, endJuz: 28 },
  { number: 63, name: 'Al-Munafiqun', arabic: 'المنافقون', meaning: 'Kaum Munafik', ayahCount: 11, startPage: 554, endPage: 555, startJuz: 28, endJuz: 28 },
  { number: 64, name: 'At-Taghabun', arabic: 'التغابن', meaning: 'Hari Dinampakkan Kesalahan', ayahCount: 18, startPage: 556, endPage: 557, startJuz: 28, endJuz: 28 },
  { number: 65, name: 'At-Talaq', arabic: 'الطلاق', meaning: 'Perceraian', ayahCount: 12, startPage: 558, endPage: 559, startJuz: 28, endJuz: 28 },
  { number: 66, name: 'At-Tahrim', arabic: 'التحريم', meaning: 'Pengharaman', ayahCount: 12, startPage: 560, endPage: 561, startJuz: 28, endJuz: 28 },
  { number: 67, name: 'Al-Mulk', arabic: 'الملك', meaning: 'Kerajaan', ayahCount: 30, startPage: 562, endPage: 564, startJuz: 29, endJuz: 29 },
  { number: 68, name: 'Al-Qalam', arabic: 'القلم', meaning: 'Pena', ayahCount: 52, startPage: 564, endPage: 566, startJuz: 29, endJuz: 29 },
  { number: 69, name: 'Al-Haqqah', arabic: 'الحاقة', meaning: 'Hari Kiamat Nyata', ayahCount: 52, startPage: 566, endPage: 568, startJuz: 29, endJuz: 29 },
  { number: 70, name: 'Al-Ma\'arij', arabic: 'المعارج', meaning: 'Tempat Naik', ayahCount: 44, startPage: 568, endPage: 570, startJuz: 29, endJuz: 29 },
  { number: 71, name: 'Nuh', arabic: 'نوح', meaning: 'Nabi Nuh', ayahCount: 28, startPage: 570, endPage: 571, startJuz: 29, endJuz: 29 },
  { number: 72, name: 'Al-Jinn', arabic: 'الجن', meaning: 'Jin', ayahCount: 28, startPage: 572, endPage: 573, startJuz: 29, endJuz: 29 },
  { number: 73, name: 'Al-Muzzammil', arabic: 'المزمل', meaning: 'Orang Berselimut', ayahCount: 20, startPage: 574, endPage: 575, startJuz: 29, endJuz: 29 },
  { number: 74, name: 'Al-Muddassir', arabic: 'المدثر', meaning: 'Orang Berkemul', ayahCount: 56, startPage: 575, endPage: 577, startJuz: 29, endJuz: 29 },
  { number: 75, name: 'Al-Qiyamah', arabic: 'القيامة', meaning: 'Hari Kiamat', ayahCount: 40, startPage: 577, endPage: 578, startJuz: 29, endJuz: 29 },
  { number: 76, name: 'Al-Insan', arabic: 'الإنسان', meaning: 'Manusia', ayahCount: 31, startPage: 578, endPage: 580, startJuz: 29, endJuz: 29 },
  { number: 77, name: 'Al-Mursalat', arabic: 'المرسلات', meaning: 'Malaikat yang Diutus', ayahCount: 50, startPage: 580, endPage: 581, startJuz: 29, endJuz: 29 },
  { number: 78, name: 'An-Naba\'', arabic: 'النبأ', meaning: 'Berita Besar', ayahCount: 40, startPage: 582, endPage: 583, startJuz: 30, endJuz: 30 },
  { number: 79, name: 'An-Nazi\'at', arabic: 'النازعات', meaning: 'Malaikat Pencabut Nyawa', ayahCount: 46, startPage: 583, endPage: 584, startJuz: 30, endJuz: 30 },
  { number: 80, name: '\'Abasa', arabic: 'عبس', meaning: 'Ia Bermuka Masam', ayahCount: 42, startPage: 585, endPage: 586, startJuz: 30, endJuz: 30 },
  { number: 81, name: 'At-Takwir', arabic: 'التكوير', meaning: 'Menggulung Matahari', ayahCount: 29, startPage: 586, endPage: 586, startJuz: 30, endJuz: 30 },
  { number: 82, name: 'Al-Infitar', arabic: 'الانفطار', meaning: 'Langit Terbelah', ayahCount: 19, startPage: 587, endPage: 587, startJuz: 30, endJuz: 30 },
  { number: 83, name: 'Al-Mutaffifin', arabic: 'المطففين', meaning: 'Orang Curang', ayahCount: 36, startPage: 587, endPage: 589, startJuz: 30, endJuz: 30 },
  { number: 84, name: 'Al-Insyiqaq', arabic: 'الانشقاق', meaning: 'Langit Terbelah', ayahCount: 25, startPage: 589, endPage: 589, startJuz: 30, endJuz: 30 },
  { number: 85, name: 'Al-Buruj', arabic: 'البروج', meaning: 'Gugusan Bintang', ayahCount: 22, startPage: 590, endPage: 590, startJuz: 30, endJuz: 30 },
  { number: 86, name: 'At-Tariq', arabic: 'الطارق', meaning: 'Bintang Menembus Malam', ayahCount: 17, startPage: 591, endPage: 591, startJuz: 30, endJuz: 30 },
  { number: 87, name: 'Al-A\'la', arabic: 'الأعلى', meaning: 'Yang Maha Tinggi', ayahCount: 19, startPage: 591, endPage: 592, startJuz: 30, endJuz: 30 },
  { number: 88, name: 'Al-Ghasyiyah', arabic: 'الغاشية', meaning: 'Hari Pembalasan Dahsyat', ayahCount: 26, startPage: 592, endPage: 593, startJuz: 30, endJuz: 30 },
  { number: 89, name: 'Al-Fajr', arabic: 'الفجر', meaning: 'Waktu Fajar', ayahCount: 30, startPage: 593, endPage: 594, startJuz: 30, endJuz: 30 },
  { number: 90, name: 'Al-Balad', arabic: 'البلد', meaning: 'Negeri', ayahCount: 20, startPage: 594, endPage: 595, startJuz: 30, endJuz: 30 },
  { number: 91, name: 'Asy-Syams', arabic: 'الشمس', meaning: 'Matahari', ayahCount: 15, startPage: 595, endPage: 595, startJuz: 30, endJuz: 30 },
  { number: 92, name: 'Al-Lail', arabic: 'الليل', meaning: 'Malam', ayahCount: 21, startPage: 595, endPage: 596, startJuz: 30, endJuz: 30 },
  { number: 93, name: 'Ad-Duha', arabic: 'الضحى', meaning: 'Waktu Duha', ayahCount: 11, startPage: 596, endPage: 596, startJuz: 30, endJuz: 30 },
  { number: 94, name: 'Asy-Syarh', arabic: 'الشرح', meaning: 'Kelapangan Dada', ayahCount: 8, startPage: 596, endPage: 596, startJuz: 30, endJuz: 30 },
  { number: 95, name: 'At-Tin', arabic: 'التين', meaning: 'Buah Tin', ayahCount: 8, startPage: 597, endPage: 597, startJuz: 30, endJuz: 30 },
  { number: 96, name: 'Al-\'Alaq', arabic: 'العلق', meaning: 'Segumpal Darah', ayahCount: 19, startPage: 597, endPage: 597, startJuz: 30, endJuz: 30 },
  { number: 97, name: 'Al-Qadr', arabic: 'القدر', meaning: 'Kemuliaan', ayahCount: 5, startPage: 598, endPage: 598, startJuz: 30, endJuz: 30 },
  { number: 98, name: 'Al-Bayyinah', arabic: 'البينة', meaning: 'Bukti Nyata', ayahCount: 8, startPage: 598, endPage: 599, startJuz: 30, endJuz: 30 },
  { number: 99, name: 'Az-Zalzalah', arabic: 'الزلزلة', meaning: 'Keguncangan', ayahCount: 8, startPage: 599, endPage: 599, startJuz: 30, endJuz: 30 },
  { number: 100, name: 'Al-\'Adiyat', arabic: 'العاديات', meaning: 'Kuda Perang Cepat', ayahCount: 11, startPage: 599, endPage: 600, startJuz: 30, endJuz: 30 },
  { number: 101, name: 'Al-Qari\'ah', arabic: 'القارعة', meaning: 'Hari Kiamat yang Mengguncang', ayahCount: 11, startPage: 600, endPage: 600, startJuz: 30, endJuz: 30 },
  { number: 102, name: 'At-Takasur', arabic: 'التكاثر', meaning: 'Bermegah-megahan', ayahCount: 8, startPage: 600, endPage: 600, startJuz: 30, endJuz: 30 },
  { number: 103, name: 'Al-\'Asr', arabic: 'العصر', meaning: 'Masa / Waktu', ayahCount: 3, startPage: 601, endPage: 601, startJuz: 30, endJuz: 30 },
  { number: 104, name: 'Al-Humazah', arabic: 'الهمزة', meaning: 'Pengumpat', ayahCount: 9, startPage: 601, endPage: 601, startJuz: 30, endJuz: 30 },
  { number: 105, name: 'Al-Fil', arabic: 'الفيل', meaning: 'Pasukan Gajah', ayahCount: 5, startPage: 601, endPage: 601, startJuz: 30, endJuz: 30 },
  { number: 106, name: 'Quraisy', arabic: 'قريش', meaning: 'Suku Quraisy', ayahCount: 4, startPage: 602, endPage: 602, startJuz: 30, endJuz: 30 },
  { number: 107, name: 'Al-Ma\'un', arabic: 'الماعون', meaning: 'Barang yang Berguna', ayahCount: 7, startPage: 602, endPage: 602, startJuz: 30, endJuz: 30 },
  { number: 108, name: 'Al-Kausar', arabic: 'الكوثر', meaning: 'Nikmat yang Berlimpah', ayahCount: 3, startPage: 602, endPage: 602, startJuz: 30, endJuz: 30 },
  { number: 109, name: 'Al-Kafirun', arabic: 'الكافرون', meaning: 'Orang-orang Kafir', ayahCount: 6, startPage: 603, endPage: 603, startJuz: 30, endJuz: 30 },
  { number: 110, name: 'An-Nasr', arabic: 'النصر', meaning: 'Pertolongan', ayahCount: 3, startPage: 603, endPage: 603, startJuz: 30, endJuz: 30 },
  { number: 111, name: 'Al-Lahab', arabic: 'اللهب', meaning: 'Gejolak Api', ayahCount: 5, startPage: 603, endPage: 603, startJuz: 30, endJuz: 30 },
  { number: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', meaning: 'Memurnikan Keesaan Allah', ayahCount: 4, startPage: 604, endPage: 604, startJuz: 30, endJuz: 30 },
  { number: 113, name: 'Al-Falaq', arabic: 'الفلق', meaning: 'Waktu Subuh', ayahCount: 5, startPage: 604, endPage: 604, startJuz: 30, endJuz: 30 },
  { number: 114, name: 'An-Nas', arabic: 'الناس', meaning: 'Manusia', ayahCount: 6, startPage: 604, endPage: 604, startJuz: 30, endJuz: 30 }
];

/**
 * Pemetaan 30 Juz Al-Qur'an Standar Mushaf Madinah (604 Halaman)
 */
export const JUZ_BOUNDARIES: JuzBoundary[] = [
  { juz: 1, name: 'Juz 1', startSurah: 1, startSurahName: 'Al-Fatihah', startAyah: 1, endSurah: 2, endSurahName: 'Al-Baqarah', endAyah: 141, startPage: 1, endPage: 21 },
  { juz: 2, name: 'Juz 2', startSurah: 2, startSurahName: 'Al-Baqarah', startAyah: 142, endSurah: 2, endSurahName: 'Al-Baqarah', endAyah: 252, startPage: 22, endPage: 41 },
  { juz: 3, name: 'Juz 3', startSurah: 2, startSurahName: 'Al-Baqarah', startAyah: 253, endSurah: 3, endSurahName: 'Ali \'Imran', endAyah: 92, startPage: 42, endPage: 61 },
  { juz: 4, name: 'Juz 4', startSurah: 3, startSurahName: 'Ali \'Imran', startAyah: 93, endSurah: 4, endSurahName: 'An-Nisa\'', endAyah: 23, startPage: 62, endPage: 81 },
  { juz: 5, name: 'Juz 5', startSurah: 4, startSurahName: 'An-Nisa\'', startAyah: 24, endSurah: 4, endSurahName: 'An-Nisa\'', endAyah: 147, startPage: 82, endPage: 101 },
  { juz: 6, name: 'Juz 6', startSurah: 4, startSurahName: 'An-Nisa\'', startAyah: 148, endSurah: 5, endSurahName: 'Al-Ma\'idah', endAyah: 81, startPage: 102, endPage: 121 },
  { juz: 7, name: 'Juz 7', startSurah: 5, startSurahName: 'Al-Ma\'idah', startAyah: 82, endSurah: 6, endSurahName: 'Al-An\'am', endAyah: 110, startPage: 122, endPage: 141 },
  { juz: 8, name: 'Juz 8', startSurah: 6, startSurahName: 'Al-An\'am', startAyah: 111, endSurah: 7, endSurahName: 'Al-A\'raf', endAyah: 87, startPage: 142, endPage: 161 },
  { juz: 9, name: 'Juz 9', startSurah: 7, startSurahName: 'Al-A\'raf', startAyah: 88, endSurah: 8, endSurahName: 'Al-Anfal', endAyah: 40, startPage: 162, endPage: 181 },
  { juz: 10, name: 'Juz 10', startSurah: 8, startSurahName: 'Al-Anfal', startAyah: 41, endSurah: 9, endSurahName: 'At-Taubah', endAyah: 92, startPage: 182, endPage: 201 },
  { juz: 11, name: 'Juz 11', startSurah: 9, startSurahName: 'At-Taubah', startAyah: 93, endSurah: 11, endSurahName: 'Hud', endAyah: 5, startPage: 202, endPage: 221 },
  { juz: 12, name: 'Juz 12', startSurah: 11, startSurahName: 'Hud', startAyah: 6, endSurah: 12, endSurahName: 'Yusuf', endAyah: 52, startPage: 222, endPage: 241 },
  { juz: 13, name: 'Juz 13', startSurah: 12, startSurahName: 'Yusuf', startAyah: 53, endSurah: 14, endSurahName: 'Ibrahim', endAyah: 52, startPage: 242, endPage: 261 },
  { juz: 14, name: 'Juz 14', startSurah: 15, startSurahName: 'Al-Hijr', startAyah: 1, endSurah: 16, endSurahName: 'An-Nahl', endAyah: 128, startPage: 262, endPage: 281 },
  { juz: 15, name: 'Juz 15', startSurah: 17, startSurahName: 'Al-Isra\'', startAyah: 1, endSurah: 18, endSurahName: 'Al-Kahf', endAyah: 74, startPage: 282, endPage: 301 },
  { juz: 16, name: 'Juz 16', startSurah: 18, startSurahName: 'Al-Kahf', startAyah: 75, endSurah: 20, endSurahName: 'Ta-Ha', endAyah: 135, startPage: 302, endPage: 321 },
  { juz: 17, name: 'Juz 17', startSurah: 21, startSurahName: 'Al-Anbiya\'', startAyah: 1, endSurah: 22, endSurahName: 'Al-Hajj', endAyah: 78, startPage: 322, endPage: 341 },
  { juz: 18, name: 'Juz 18', startSurah: 23, startSurahName: 'Al-Mu\'minun', startAyah: 1, endSurah: 25, endSurahName: 'Al-Furqan', endAyah: 20, startPage: 342, endPage: 361 },
  { juz: 19, name: 'Juz 19', startSurah: 25, startSurahName: 'Al-Furqan', startAyah: 21, endSurah: 27, endSurahName: 'An-Naml', endAyah: 55, startPage: 362, endPage: 381 },
  { juz: 20, name: 'Juz 20', startSurah: 27, startSurahName: 'An-Naml', startAyah: 56, endSurah: 29, endSurahName: 'Al-\'Ankabut', endAyah: 45, startPage: 382, endPage: 401 },
  { juz: 21, name: 'Juz 21', startSurah: 29, startSurahName: 'Al-\'Ankabut', startAyah: 46, endSurah: 33, endSurahName: 'Al-Ahzab', endAyah: 30, startPage: 402, endPage: 421 },
  { juz: 22, name: 'Juz 22', startSurah: 33, startSurahName: 'Al-Ahzab', startAyah: 31, endSurah: 36, endSurahName: 'Ya-Sin', endAyah: 27, startPage: 422, endPage: 441 },
  { juz: 23, name: 'Juz 23', startSurah: 36, startSurahName: 'Ya-Sin', startAyah: 28, endSurah: 39, endSurahName: 'Az-Zumar', endAyah: 31, startPage: 442, endPage: 461 },
  { juz: 24, name: 'Juz 24', startSurah: 39, startSurahName: 'Az-Zumar', startAyah: 32, endSurah: 41, endSurahName: 'Fussilat', endAyah: 46, startPage: 462, endPage: 481 },
  { juz: 25, name: 'Juz 25', startSurah: 41, startSurahName: 'Fussilat', startAyah: 47, endSurah: 45, endSurahName: 'Al-Jasiyah', endAyah: 37, startPage: 482, endPage: 501 },
  { juz: 26, name: 'Juz 26', startSurah: 46, startSurahName: 'Al-Ahqaf', startAyah: 1, endSurah: 51, endSurahName: 'Az-Zariyat', endAyah: 30, startPage: 502, endPage: 521 },
  { juz: 27, name: 'Juz 27', startSurah: 51, startSurahName: 'Az-Zariyat', startAyah: 31, endSurah: 57, endSurahName: 'Al-Hadid', endAyah: 29, startPage: 522, endPage: 541 },
  { juz: 28, name: 'Juz 28', startSurah: 58, startSurahName: 'Al-Mujadilah', startAyah: 1, endSurah: 66, endSurahName: 'At-Tahrim', endAyah: 12, startPage: 542, endPage: 561 },
  { juz: 29, name: 'Juz 29', startSurah: 67, startSurahName: 'Al-Mulk', startAyah: 1, endSurah: 77, endSurahName: 'Al-Mursalat', endAyah: 50, startPage: 562, endPage: 581 },
  { juz: 30, name: 'Juz 30', startSurah: 78, startSurahName: 'An-Naba\'', startAyah: 1, endSurah: 114, endSurahName: 'An-Nas', endAyah: 6, startPage: 582, endPage: 604 }
];

/**
 * Katalog Kitab Hadis Resmi yang diajarkan di Ma'had AKSARA beserta batas total hadis
 */
export const HADITH_CATALOG: HadithBookMetadata[] = [
  {
    id: 'arbain',
    name: "Arba'in An-Nawawi",
    author: 'Imam An-Nawawi',
    totalHadith: 42,
    description: 'Kitab 42 hadis pokok dasar-dasar syariat Islam'
  },
  {
    id: 'umdatul_ahkam',
    name: 'Umdatul Ahkam',
    author: 'Imam Abdul Ghani Al-Maqdisi',
    totalHadith: 430,
    description: 'Kumpulan hadis hukum fiqih muttafaq \'alaih (Bukhari & Muslim)'
  },
  {
    id: 'bulughul_maram',
    name: 'Bulughul Maram',
    author: 'Al-Hafizh Ibnu Hajar Al-Asqalani',
    totalHadith: 1596,
    description: 'Kitab rujukan dalil hadis-hadis hukum syariat'
  },
  {
    id: 'riyadus_shalihin',
    name: 'Riyadus Shalihin',
    author: 'Imam An-Nawawi',
    totalHadith: 1896,
    description: 'Taman orang-orang shalih: hadis adab, akhlak, dan tazkiyatun nufus'
  },
  {
    id: 'hadits_pilihan',
    name: 'Hadits Pilihan / Adab Santri',
    author: 'Kurikulum Ma\'had AKSARA',
    totalHadith: 100,
    description: '100 hadis pilihan adab penuntut ilmu, akhlak mulia, dan ibadah harian'
  }
];

export const HADITH_BOOKS: string[] = HADITH_CATALOG.map((b) => b.name);

/**
 * Returns surah reference by 1-based number (1 to 114)
 */
export function getSurahByNumber(num: number): SurahReference | undefined {
  return QURAN_SURAHS.find((s) => s.number === num);
}

/**
 * Returns surah reference by name (fuzzy match)
 */
export function getSurahByName(name: string): SurahReference | undefined {
  if (!name) return undefined;
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return QURAN_SURAHS.find((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
}

/**
 * Menentukan Juz otomatis (1 - 30) dari posisi Surat dan Ayat Al-Qur'an
 */
export function getJuzFromSurahAyah(surahNum: number, ayahNum: number): number {
  if (surahNum < 1) return 1;
  if (surahNum > 114) return 30;

  for (const b of JUZ_BOUNDARIES) {
    const isAfterStart =
      surahNum > b.startSurah || (surahNum === b.startSurah && ayahNum >= b.startAyah);
    const isBeforeEnd =
      surahNum < b.endSurah || (surahNum === b.endSurah && ayahNum <= b.endAyah);

    if (isAfterStart && isBeforeEnd) {
      return b.juz;
    }
  }

  // Fallback berdasarkan data surah
  const s = getSurahByNumber(surahNum);
  return s ? s.startJuz : 30;
}

/**
 * Menentukan Juz otomatis (1 - 30) dari nomor Halaman Mushaf Madinah (1 - 604)
 */
export function getJuzFromPage(page: number): number {
  if (page <= 0) return 1;
  if (page >= 604) return 30;
  for (const b of JUZ_BOUNDARIES) {
    if (page >= b.startPage && page <= b.endPage) {
      return b.juz;
    }
  }
  return 30;
}

/**
 * Mendapatkan metadata kitab hadis berdasarkan nama
 */
export function getHadithBookByName(name: string): HadithBookMetadata | undefined {
  if (!name) return undefined;
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return HADITH_CATALOG.find((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
}

export interface QuranProgressResult {
  isValid: boolean;
  errorMessage?: string;
  calculatedPages: number;
  calculatedAyahs: number;
  startJuz: number;
  endJuz: number;
}

/**
 * Menghitung perkembangan hafalan Al-Qur'an secara akurat dan otomatis:
 * - Menghitung jumlah halaman baru (endPage - startPage + 1)
 * - Menghitung jumlah ayat baru berdasarkan urutan 114 surah dan ayahCount resmi
 * - Menentukan Juz awal dan akhir secara otomatis
 * - Memvalidasi batas input dan urutan posisi
 */
export function calculateQuranProgress(
  startSurahNum: number,
  startAyah: number,
  startPage: number,
  endSurahNum: number,
  endAyah: number,
  endPage: number
): QuranProgressResult {
  const startSurah = getSurahByNumber(startSurahNum);
  const endSurah = getSurahByNumber(endSurahNum);

  if (!startSurah || !endSurah) {
    return {
      isValid: false,
      errorMessage: 'Surat Al-Qur\'an awal atau akhir tidak valid (pilih 1 - 114).',
      calculatedPages: 0,
      calculatedAyahs: 0,
      startJuz: 1,
      endJuz: 1
    };
  }

  // Tentukan Juz otomatis
  const startJuz = getJuzFromSurahAyah(startSurahNum, startAyah || 1);
  const endJuz = getJuzFromSurahAyah(endSurahNum, endAyah || 1);

  // Validasi batas ayat
  if (startAyah < 1 || startAyah > startSurah.ayahCount) {
    return {
      isValid: false,
      errorMessage: `Ayat awal Surat ${startSurah.name} harus antara 1 dan ${startSurah.ayahCount}.`,
      calculatedPages: 0,
      calculatedAyahs: 0,
      startJuz,
      endJuz
    };
  }

  if (endAyah < 1 || endAyah > endSurah.ayahCount) {
    return {
      isValid: false,
      errorMessage: `Ayat akhir Surat ${endSurah.name} harus antara 1 dan ${endSurah.ayahCount}.`,
      calculatedPages: 0,
      calculatedAyahs: 0,
      startJuz,
      endJuz
    };
  }

  // Validasi batas halaman Mushaf Madinah (1 - 604)
  if (startPage < 1 || startPage > 604 || endPage < 1 || endPage > 604) {
    return {
      isValid: false,
      errorMessage: 'Halaman Al-Qur\'an harus berada di rentang 1 s.d. 604 (Mushaf Madinah).',
      calculatedPages: 0,
      calculatedAyahs: 0,
      startJuz,
      endJuz
    };
  }

  // Validasi urutan halaman
  if (endPage < startPage) {
    return {
      isValid: false,
      errorMessage: `Halaman akhir (${endPage}) tidak boleh lebih kecil dari halaman awal (${startPage}).`,
      calculatedPages: 0,
      calculatedAyahs: 0,
      startJuz,
      endJuz
    };
  }

  // Validasi urutan surat & ayat
  if (endSurahNum < startSurahNum || (endSurahNum === startSurahNum && endAyah < startAyah)) {
    return {
      isValid: false,
      errorMessage: 'Posisi akhir ayat Al-Qur\'an berada sebelum posisi awal.',
      calculatedPages: 0,
      calculatedAyahs: 0,
      startJuz,
      endJuz
    };
  }

  // Hitung jumlah halaman yang dilewati
  const calculatedPages = endPage - startPage + 1;

  // Hitung jumlah ayat yang dilewati
  let calculatedAyahs = 0;
  if (startSurahNum === endSurahNum) {
    calculatedAyahs = endAyah - startAyah + 1;
  } else {
    // Sisa ayat di surat awal
    calculatedAyahs += Math.max(0, startSurah.ayahCount - startAyah + 1);

    // Seluruh ayat di surat-surat perantara
    for (let s = startSurahNum + 1; s < endSurahNum; s++) {
      const intermediate = getSurahByNumber(s);
      if (intermediate) {
        calculatedAyahs += intermediate.ayahCount;
      }
    }

    // Ayat di surat akhir
    calculatedAyahs += endAyah;
  }

  return {
    isValid: true,
    calculatedPages,
    calculatedAyahs,
    startJuz,
    endJuz
  };
}

export interface HadithProgressResult {
  isValid: boolean;
  errorMessage?: string;
  newCount: number;
  formattedRange: string;
}

/**
 * Menghitung perkembangan hafalan Hadis secara akurat dan otomatis:
 * - Menghitung jumlah hadis baru berdasarkan rentang (endNum - startNum + 1)
 * - Memvalidasi urutan nomor (start <= end)
 * - Memvalidasi batas maksimal hadis sesuai data kitab
 */
export function calculateHadithProgress(
  bookName: string,
  startNum: number,
  endNum: number
): HadithProgressResult {
  const book = getHadithBookByName(bookName) || HADITH_CATALOG[0];

  if (!startNum || startNum < 1) {
    return {
      isValid: false,
      errorMessage: 'Nomor hadis awal minimal adalah 1.',
      newCount: 0,
      formattedRange: '-'
    };
  }

  if (!endNum || endNum < 1) {
    return {
      isValid: false,
      errorMessage: 'Nomor hadis akhir minimal adalah 1.',
      newCount: 0,
      formattedRange: '-'
    };
  }

  if (endNum < startNum) {
    return {
      isValid: false,
      errorMessage: `Nomor hadis akhir (${endNum}) tidak boleh lebih kecil dari nomor awal (${startNum}).`,
      newCount: 0,
      formattedRange: '-'
    };
  }

  if (book && endNum > book.totalHadith) {
    return {
      isValid: false,
      errorMessage: `Nomor hadis akhir (${endNum}) melebihi total hadis dalam kitab ${book.name} (maksimal ${book.totalHadith} hadis).`,
      newCount: 0,
      formattedRange: '-'
    };
  }

  const count = endNum - startNum + 1;
  const rangeStr =
    startNum === endNum
      ? `Hadits No. ${startNum}`
      : `Hadits No. ${startNum} s.d. ${endNum} (${count} hadis)`;

  return {
    isValid: true,
    newCount: count,
    formattedRange: rangeStr
  };
}
