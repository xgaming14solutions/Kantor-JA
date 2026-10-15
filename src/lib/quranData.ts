/**
 * AKSARA - Data Referensi Al-Qur'an 114 Surah (Standar Mushaf Utsmani / Madinah 604 Halaman)
 * Digunakan untuk panduan pencatatan hafalan santri yang akurat tanpa mengarang data.
 */

export interface SurahReference {
  number: number;
  name: string; // Nama Latin, e.g. "Al-Baqarah"
  arabic: string; // Tulisan Arab, e.g. "البقرة"
  meaning: string; // Arti, e.g. "Sapi Betina"
  ayahCount: number; // Total ayat
  startPage: number; // Halaman awal mushaf standar
  endPage: number; // Halaman akhir mushaf standar
  startJuz: number; // Juz awal
  endJuz: number; // Juz akhir
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

export const HADITH_BOOKS: string[] = [
  'Arba\'in An-Nawawi',
  'Umdatul Ahkam',
  'Bulughul Maram',
  'Riyadus Shalihin',
  'Hadits Pilihan / Adab Santri'
];

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
 * Accurately calculates progress delta between starting position and ending position.
 * Handles same surah, multiple surahs, and page ranges.
 */
export function calculateQuranProgress(
  startSurahNum: number,
  startAyah: number,
  startPage: number,
  endSurahNum: number,
  endAyah: number,
  endPage: number
): { calculatedPages: number; calculatedAyahs: number } {
  // Page delta
  let calculatedPages = 0;
  if (startPage > 0 && endPage > 0) {
    if (endPage >= startPage) {
      calculatedPages = endPage - startPage + 1;
    } else {
      calculatedPages = 0;
    }
  }

  // Ayah delta
  let calculatedAyahs = 0;
  if (startSurahNum > 0 && endSurahNum > 0 && startAyah > 0 && endAyah > 0) {
    if (startSurahNum === endSurahNum) {
      if (endAyah >= startAyah) {
        calculatedAyahs = endAyah - startAyah + 1;
      }
    } else if (endSurahNum > startSurahNum) {
      const startSurah = getSurahByNumber(startSurahNum);
      if (startSurah) {
        calculatedAyahs += Math.max(0, startSurah.ayahCount - startAyah + 1);
      }
      for (let s = startSurahNum + 1; s < endSurahNum; s++) {
        const intermediate = getSurahByNumber(s);
        if (intermediate) {
          calculatedAyahs += intermediate.ayahCount;
        }
      }
      calculatedAyahs += endAyah;
    }
  }

  return { calculatedPages, calculatedAyahs };
}
