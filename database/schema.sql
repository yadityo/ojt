-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 14, 2025 at 12:05 PM
-- Server version: 8.0.30
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `intern_registration_test`
--

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','success','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT '0',
  `related_entity` enum('registration','payment','selection','placement') DEFAULT NULL,
  `related_entity_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int NOT NULL,
  `registration_id` int DEFAULT NULL,
  `invoice_number` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `amount_paid` decimal(15,2) DEFAULT '0.00',
  `payment_method` enum('transfer','cash','credit_card') DEFAULT 'transfer',
  `bank_name` varchar(100) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `status` enum('pending','installment_1','installment_2','installment_3','installment_4','installment_5','installment_6','paid','overdue','cancelled') DEFAULT 'pending',
  `due_date` date DEFAULT NULL,
  `proof_image` varchar(255) DEFAULT NULL,
  `payment_date` timestamp NULL DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_history`
--

CREATE TABLE `payment_history` (
  `id` int NOT NULL,
  `payment_id` int DEFAULT NULL,
  `old_status` enum('pending','installment_1','installment_2','installment_3','installment_4','installment_5','installment_6','paid','overdue','cancelled') DEFAULT NULL,
  `new_status` enum('pending','installment_1','installment_2','installment_3','installment_4','installment_5','installment_6','paid','overdue','cancelled') DEFAULT NULL,
  `amount_changed` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `changed_by` int DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `old_amount_paid` decimal(15,2) DEFAULT NULL,
  `new_amount_paid` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `placement_status`
--

CREATE TABLE `placement_status` (
  `id` int NOT NULL,
  `registration_id` int DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `status` enum('proses','lolos','ditempatkan') DEFAULT 'proses',
  `placement_date` date DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `requirements` text,
  `schedule` text,
  `duration` varchar(100) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `current_participants` int DEFAULT '0',
  `status` enum('active','inactive','full') DEFAULT 'active',
  `contact_info` text,
  `registration_deadline` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `location` varchar(255) DEFAULT 'Jakarta, Indonesia & Jepang',
  `training_cost` decimal(10,2) DEFAULT '16000000.00',
  `departure_cost` decimal(10,2) DEFAULT '30000000.00',
  `installment_plan` varchar(20) DEFAULT 'none',
  `bridge_fund` varchar(255) DEFAULT 'Tersedia (Jaminan dari perusahaan pengirim)',
  `curriculum_json` json DEFAULT NULL,
  `facilities_json` json DEFAULT NULL,
  `timeline_json` json DEFAULT NULL,
  `fee_details_json` json DEFAULT NULL,
  `requirements_list` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`id`, `category_id`, `name`, `description`, `requirements`, `schedule`, `duration`, `capacity`, `current_participants`, `status`, `contact_info`, `registration_deadline`, `start_date`, `end_date`, `created_at`, `updated_at`, `location`, `training_cost`, `departure_cost`, `installment_plan`, `bridge_fund`, `curriculum_json`, `facilities_json`, `timeline_json`, `fee_details_json`, `requirements_list`) VALUES
(1, 1, 'Program Regular', 'Skema terbaik untuk persiapan intensif dan komprehensif. Dengan metode offline (Tatap Muka)', '- Mahasiswa TI/S1\n- Menguasai dasar pemrograman\n- Memahami konsep database', 'Senin-Jumat, 09:00-17:00', '4 bulan', 20, 0, 'active', 'Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123', '2024-12-31', '2024-02-01', '2024-04-30', '2025-10-02 07:08:29', '2025-10-14 12:05:12', 'Jakarta, Indonesia & Jepang', '16000000.00', '30000000.00', '4_installments', 'Tersedia (Jaminan dari perusahaan pengirim)', '\"[\\n  {\\n    \\\"phase\\\": \\\"Fase 1 Dasar\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 1: Pengenalan Bahasa Jepang (Hiragana & Katakana)\\\",\\n      \\\"Minggu 2: Salam dasar, perkenalan diri, dan ungkapan sehari-hari\\\",\\n      \\\"Minggu 3: Angka, waktu, tanggal, dan kalimat sederhana\\\",\\n      \\\"Minggu 4: Tata bahasa dasar & kosakata untuk aktivitas harian\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 2 Pengembangan Bahasa\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 5: Pengenalan dan latihan Kanji\\\",\\n      \\\"Minggu 6: Pola kalimat untuk bertanya & menjawab\\\",\\n      \\\"Minggu 7: Kosakata seputar pekerjaan, makanan, transportasi, dan kesehatan\\\",\\n      \\\"Minggu 8: Latihan mendengar & berbicara (role-play & percakapan)\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 3 Budaya & Persiapan Kerja\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 9: Budaya Jepang, adat istiadat, dan tata krama\\\",\\n      \\\"Minggu 10: Etika kerja dan perilaku profesional\\\",\\n      \\\"Minggu 11: Keterampilan komunikasi & penyelesaian masalah\\\",\\n      \\\"Minggu 12: Simulasi wawancara & skenario dunia kerja\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 4 Kesiapan Karier & Review Akhir\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 13: Latihan menulis (Kanji dasar & kalimat seputar pekerjaan)\\\",\\n      \\\"Minggu 14: Persiapan ujian (Latihan JLPT / NAT Test)\\\",\\n      \\\"Minggu 15: Presentasi akhir & simulasi wawancara kerja\\\",\\n      \\\"Minggu 16: Review, evaluasi, dan sesi konseling karier\\\"\\n    ]\\n  }\\n]\"', '\"{\\n  \\\"dormitory\\\": [\\n    \\\"Kamar tidur bersih & nyaman (kapasitas sesuai kebutuhan)\\\",\\n    \\\"Tempat tidur, lemari, meja belajar, dan kipas/AC\\\",\\n    \\\"Dapur bersama lengkap dengan peralatan memasak\\\",\\n    \\\"Kamar mandi dan toilet bersih (laki-laki & perempuan terpisah)\\\",\\n    \\\"Ruang makan & ruang santai\\\",\\n    \\\"Area olahraga ringan (lapangan kecil / gym sederhana)\\\",\\n    \\\"Laundry area (cuci & jemur pakaian)\\\",\\n    \\\"Lingkungan aman dengan pengawasan pengelola asrama\\\"\\n  ],\\n  \\\"education\\\": [\\n    \\\"Ruang kelas nyaman dengan meja dan kursi belajar\\\",\\n    \\\"Perangkat multimedia (proyektor, audio, dan papan tulis)\\\",\\n    \\\"Perpustakaan mini dengan buku dan materi bahasa Jepang\\\",\\n    \\\"Laboratorium bahasa untuk latihan mendengar dan berbicara\\\",\\n    \\\"Area diskusi dan ruang belajar bersama\\\",\\n    \\\"Akses internet (Wi-Fi) untuk mendukung pembelajaran\\\"\\n  ]\\n}\"', '\"[\\n  {\\n    \\\"month\\\": \\\"Bulan 1\\\",\\n    \\\"title\\\": \\\"Dasar Bahasa & Adaptasi\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 2\\\",\\n    \\\"title\\\": \\\"Pengembangan Bahasa\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 3\\\",\\n    \\\"title\\\": \\\"Budaya & Persiapan Kerja\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 4\\\",\\n    \\\"title\\\": \\\"Persiapan Akhir & Evaluasi\\\"\\n  }\\n]\"', '\"{\\n  \\\"training_fee_items\\\": [\\n    \\\"Biaya administrasi pendaftaran\\\",\\n    \\\"Seragam pelatihan\\\",\\n    \\\"Modul & buku pelajaran bahasa Jepang\\\",\\n    \\\"Akses ke fasilitas kelas & laboratorium bahasa\\\",\\n    \\\"Fasilitas asrama (akomodasi & utilitas dasar selama pelatihan)\\\",\\n    \\\"Pendampingan & bimbingan belajar\\\"\\n  ],\\n  \\\"departure_fee_items\\\": [\\n    \\\"Tiket pesawat ke Jepang\\\",\\n    \\\"Visa & dokumen keberangkatan\\\",\\n    \\\"Asuransi perjalanan & kesehatan\\\",\\n    \\\"Biaya penempatan kerja di Jepang\\\",\\n    \\\"Pendampingan proses keberangkatan hingga penyaluran\\\"\\n  ]\\n}\"', '\"[\\n  \\\"Usia minimal 18 tahun\\\",\\n  \\\"Pendidikan minimal SMA/SMK sederajat\\\",\\n  \\\"Sehat jasmani & rohani (dibuktikan dengan surat keterangan sehat)\\\",\\n  \\\"Tidak memiliki catatan kriminal (SKCK)\\\",\\n  \\\"Memiliki laptop/komputer pribadi\\\",\\n  \\\"Dasar pemahaman komputer (tidak perlu pengalaman coding)\\\",\\n  \\\"Bersedia mengikuti seluruh rangkaian pelatihan hingga selesai\\\"\\n]\"'),
(2, 2, 'Program Hybrid', 'Fleksibilitas pelatihan. Dengan metode offline (Tatap Muka) pemantapan di asrama dan online (Virtual)', '- Mahasiswa TI/DKV\n- Menguasai HTML, CSS, JavaScript\n- Pengalaman dengan framework frontend', 'Senin-Jumat, 09:00-17:00', '6 bulan', 15, 0, 'active', 'Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123', '2024-12-31', '2024-02-01', '2024-04-30', '2025-10-02 07:08:29', '2025-10-14 10:05:44', 'Jakarta, Indonesia & Jepang', '7150000.00', '30000000.00', '6_installments', 'Tersedia (Jaminan dari perusahaan pengirim)', '\"[\\n  {\\n    \\\"phase\\\": \\\"Fase 1 Dasar\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 1: Pengenalan Bahasa Jepang (Hiragana & Katakana)\\\",\\n      \\\"Minggu 2: Salam dasar, perkenalan diri, dan ungkapan sehari-hari\\\",\\n      \\\"Minggu 3: Angka, waktu, tanggal, dan kalimat sederhana\\\",\\n      \\\"Minggu 4: Tata bahasa dasar & kosakata untuk aktivitas harian\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 2 Pengembangan Bahasa\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 5: Pengenalan dan latihan Kanji\\\",\\n      \\\"Minggu 6: Pola kalimat untuk bertanya & menjawab\\\",\\n      \\\"Minggu 7: Kosakata seputar pekerjaan, makanan, transportasi, dan kesehatan\\\",\\n      \\\"Minggu 8: Latihan mendengar & berbicara (role-play & percakapan)\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 3 Budaya & Persiapan Kerja\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 9: Budaya Jepang, adat istiadat, dan tata krama\\\",\\n      \\\"Minggu 10: Etika kerja dan perilaku profesional\\\",\\n      \\\"Minggu 11: Keterampilan komunikasi & penyelesaian masalah\\\",\\n      \\\"Minggu 12: Simulasi wawancara & skenario dunia kerja\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 4 Kesiapan Karier & Review Akhir\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 13: Latihan menulis (Kanji dasar & kalimat seputar pekerjaan)\\\",\\n      \\\"Minggu 14: Persiapan ujian (Latihan JLPT / NAT Test)\\\",\\n      \\\"Minggu 15: Presentasi akhir & simulasi wawancara kerja\\\",\\n      \\\"Minggu 16: Review, evaluasi, dan sesi konseling karier\\\"\\n    ]\\n  }\\n]\"', '\"{\\n  \\\"dormitory\\\": [\\n    \\\"Kamar tidur bersih & nyaman (kapasitas sesuai kebutuhan)\\\",\\n    \\\"Tempat tidur, lemari, meja belajar, dan kipas/AC\\\",\\n    \\\"Dapur bersama lengkap dengan peralatan memasak\\\",\\n    \\\"Kamar mandi dan toilet bersih (laki-laki & perempuan terpisah)\\\",\\n    \\\"Ruang makan & ruang santai\\\",\\n    \\\"Area olahraga ringan (lapangan kecil / gym sederhana)\\\",\\n    \\\"Laundry area (cuci & jemur pakaian)\\\",\\n    \\\"Lingkungan aman dengan pengawasan pengelola asrama\\\"\\n  ],\\n  \\\"education\\\": [\\n    \\\"Ruang kelas nyaman dengan meja dan kursi belajar\\\",\\n    \\\"Perangkat multimedia (proyektor, audio, dan papan tulis)\\\",\\n    \\\"Perpustakaan mini dengan buku dan materi bahasa Jepang\\\",\\n    \\\"Laboratorium bahasa untuk latihan mendengar dan berbicara\\\",\\n    \\\"Area diskusi dan ruang belajar bersama\\\",\\n    \\\"Akses internet (Wi-Fi) untuk mendukung pembelajaran\\\"\\n  ]\\n}\"', '\"[\\n  {\\n    \\\"month\\\": \\\"Bulan 1\\\",\\n    \\\"title\\\": \\\"Dasar Bahasa & Adaptasi\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 2\\\",\\n    \\\"title\\\": \\\"Pengembangan Bahasa\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 3\\\",\\n    \\\"title\\\": \\\"Budaya & Persiapan Kerja\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 4\\\",\\n    \\\"title\\\": \\\"Persiapan Akhir & Evaluasi\\\"\\n  }\\n]\"', '\"{\\n  \\\"training_fee_items\\\": [\\n    \\\"Biaya administrasi pendaftaran\\\",\\n    \\\"Seragam pelatihan\\\",\\n    \\\"Modul & buku pelajaran bahasa Jepang\\\",\\n    \\\"Akses ke fasilitas kelas & laboratorium bahasa\\\",\\n    \\\"Fasilitas asrama (akomodasi & utilitas dasar selama pelatihan)\\\",\\n    \\\"Pendampingan & bimbingan belajar\\\"\\n  ],\\n  \\\"departure_fee_items\\\": [\\n    \\\"Tiket pesawat ke Jepang\\\",\\n    \\\"Visa & dokumen keberangkatan\\\",\\n    \\\"Asuransi perjalanan & kesehatan\\\",\\n    \\\"Biaya penempatan kerja di Jepang\\\",\\n    \\\"Pendampingan proses keberangkatan hingga penyaluran\\\"\\n  ]\\n}\"', '\"[\\n  \\\"Usia minimal 18 tahun\\\",\\n  \\\"Pendidikan minimal SMA/SMK sederajat\\\",\\n  \\\"Sehat jasmani & rohani (dibuktikan dengan surat keterangan sehat)\\\",\\n  \\\"Tidak memiliki catatan kriminal (SKCK)\\\",\\n  \\\"Memiliki laptop/komputer pribadi\\\",\\n  \\\"Dasar pemahaman komputer (tidak perlu pengalaman coding)\\\",\\n  \\\"Bersedia mengikuti seluruh rangkaian pelatihan hingga selesai\\\"\\n]\"'),
(3, 3, 'Program Fast Track', 'Jalur cepat untuk yang sudah memiliki sertifikat Noryoku Shiken N4 dan Specified Skilled Worker', '- Mahasiswa Statistika/TI/Matematika\n- Menguasai dasar statistik\n- Familiar dengan Python/R', 'Senin-Jumat, 09:00-17:00', '1 bulan', 12, 0, 'active', 'Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123', '2024-12-31', '2024-02-01', '2024-05-31', '2025-10-02 07:08:29', '2025-10-14 12:05:12', 'Jakarta, Indonesia & Jepang', '4000000.00', '30000000.00', 'none', 'Tersedia (Jaminan dari perusahaan pengirim)', '\"[\\n  {\\n    \\\"phase\\\": \\\"Fase 1 Dasar\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 1: Pengenalan Bahasa Jepang (Hiragana & Katakana)\\\",\\n      \\\"Minggu 2: Salam dasar, perkenalan diri, dan ungkapan sehari-hari\\\",\\n      \\\"Minggu 3: Angka, waktu, tanggal, dan kalimat sederhana\\\",\\n      \\\"Minggu 4: Tata bahasa dasar & kosakata untuk aktivitas harian\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 2 Pengembangan Bahasa\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 5: Pengenalan dan latihan Kanji\\\",\\n      \\\"Minggu 6: Pola kalimat untuk bertanya & menjawab\\\",\\n      \\\"Minggu 7: Kosakata seputar pekerjaan, makanan, transportasi, dan kesehatan\\\",\\n      \\\"Minggu 8: Latihan mendengar & berbicara (role-play & percakapan)\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 3 Budaya & Persiapan Kerja\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 9: Budaya Jepang, adat istiadat, dan tata krama\\\",\\n      \\\"Minggu 10: Etika kerja dan perilaku profesional\\\",\\n      \\\"Minggu 11: Keterampilan komunikasi & penyelesaian masalah\\\",\\n      \\\"Minggu 12: Simulasi wawancara & skenario dunia kerja\\\"\\n    ]\\n  },\\n  {\\n    \\\"phase\\\": \\\"Fase 4 Kesiapan Karier & Review Akhir\\\",\\n    \\\"weeks\\\": [\\n      \\\"Minggu 13: Latihan menulis (Kanji dasar & kalimat seputar pekerjaan)\\\",\\n      \\\"Minggu 14: Persiapan ujian (Latihan JLPT / NAT Test)\\\",\\n      \\\"Minggu 15: Presentasi akhir & simulasi wawancara kerja\\\",\\n      \\\"Minggu 16: Review, evaluasi, dan sesi konseling karier\\\"\\n    ]\\n  }\\n]\"', '\"{\\n  \\\"dormitory\\\": [\\n    \\\"Kamar tidur bersih & nyaman (kapasitas sesuai kebutuhan)\\\",\\n    \\\"Tempat tidur, lemari, meja belajar, dan kipas/AC\\\",\\n    \\\"Dapur bersama lengkap dengan peralatan memasak\\\",\\n    \\\"Kamar mandi dan toilet bersih (laki-laki & perempuan terpisah)\\\",\\n    \\\"Ruang makan & ruang santai\\\",\\n    \\\"Area olahraga ringan (lapangan kecil / gym sederhana)\\\",\\n    \\\"Laundry area (cuci & jemur pakaian)\\\",\\n    \\\"Lingkungan aman dengan pengawasan pengelola asrama\\\"\\n  ],\\n  \\\"education\\\": [\\n    \\\"Ruang kelas nyaman dengan meja dan kursi belajar\\\",\\n    \\\"Perangkat multimedia (proyektor, audio, dan papan tulis)\\\",\\n    \\\"Perpustakaan mini dengan buku dan materi bahasa Jepang\\\",\\n    \\\"Laboratorium bahasa untuk latihan mendengar dan berbicara\\\",\\n    \\\"Area diskusi dan ruang belajar bersama\\\",\\n    \\\"Akses internet (Wi-Fi) untuk mendukung pembelajaran\\\"\\n  ]\\n}\"', '\"[\\n  {\\n    \\\"month\\\": \\\"Bulan 1\\\",\\n    \\\"title\\\": \\\"Dasar Bahasa & Adaptasi\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 2\\\",\\n    \\\"title\\\": \\\"Pengembangan Bahasa\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 3\\\",\\n    \\\"title\\\": \\\"Budaya & Persiapan Kerja\\\"\\n  },\\n  {\\n    \\\"month\\\": \\\"Bulan 4\\\",\\n    \\\"title\\\": \\\"Persiapan Akhir & Evaluasi\\\"\\n  }\\n]\"', '\"{\\n  \\\"training_fee_items\\\": [\\n    \\\"Biaya administrasi pendaftaran\\\",\\n    \\\"Seragam pelatihan\\\",\\n    \\\"Modul & buku pelajaran bahasa Jepang\\\",\\n    \\\"Akses ke fasilitas kelas & laboratorium bahasa\\\",\\n    \\\"Fasilitas asrama (akomodasi & utilitas dasar selama pelatihan)\\\",\\n    \\\"Pendampingan & bimbingan belajar\\\"\\n  ],\\n  \\\"departure_fee_items\\\": [\\n    \\\"Tiket pesawat ke Jepang\\\",\\n    \\\"Visa & dokumen keberangkatan\\\",\\n    \\\"Asuransi perjalanan & kesehatan\\\",\\n    \\\"Biaya penempatan kerja di Jepang\\\",\\n    \\\"Pendampingan proses keberangkatan hingga penyaluran\\\"\\n  ]\\n}\"', '\"[\\n  \\\"Usia minimal 18 tahun\\\",\\n  \\\"Pendidikan minimal SMA/SMK sederajat\\\",\\n  \\\"Sehat jasmani & rohani (dibuktikan dengan surat keterangan sehat)\\\",\\n  \\\"Tidak memiliki catatan kriminal (SKCK)\\\",\\n  \\\"Memiliki laptop/komputer pribadi\\\",\\n  \\\"Dasar pemahaman komputer (tidak perlu pengalaman coding)\\\",\\n  \\\"Bersedia mengikuti seluruh rangkaian pelatihan hingga selesai\\\"\\n]\"');

-- --------------------------------------------------------

--
-- Table structure for table `program_categories`
--

CREATE TABLE `program_categories` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `program_categories`
--

INSERT INTO `program_categories` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'Regular', 'Program magang di bidang teknologi informasi dan pengembangan software', '2025-10-02 07:08:29'),
(2, 'Hybrid', 'Program magang di bidang analisis data dan machine learning', '2025-10-02 07:08:29'),
(3, 'Fast Track', 'Program magang di bidang pemasaran digital dan media sosial', '2025-10-02 07:08:29');

-- --------------------------------------------------------

--
-- Table structure for table `registrations`
--

CREATE TABLE `registrations` (
  `id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `program_id` int DEFAULT NULL,
  `registration_code` varchar(50) NOT NULL,
  `selection_notes` text,
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `nik` varchar(20) DEFAULT NULL,
  `gender` enum('L','P') DEFAULT NULL,
  `birth_place` varchar(100) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `last_education` varchar(50) DEFAULT NULL,
  `major` varchar(255) DEFAULT NULL,
  `education_institution` varchar(255) DEFAULT NULL,
  `current_activity` varchar(50) DEFAULT NULL,
  `marital_status` varchar(50) DEFAULT NULL,
  `parent_phone` varchar(20) DEFAULT NULL,
  `parent_relationship` varchar(20) DEFAULT NULL,
  `ktp_province_code` varchar(10) DEFAULT NULL,
  `ktp_province_name` varchar(100) DEFAULT NULL,
  `ktp_city_code` varchar(20) DEFAULT NULL,
  `ktp_city_name` varchar(100) DEFAULT NULL,
  `ktp_address` text,
  `domicile_province_code` varchar(10) DEFAULT NULL,
  `domicile_province_name` varchar(100) DEFAULT NULL,
  `domicile_city_code` varchar(20) DEFAULT NULL,
  `domicile_city_name` varchar(100) DEFAULT NULL,
  `domicile_address` text,
  `photo_path` varchar(255) DEFAULT NULL,
  `n4_certificate_path` varchar(255) DEFAULT NULL,
  `ssw_certificate_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `selection_status`
--

CREATE TABLE `selection_status` (
  `id` int NOT NULL,
  `registration_id` int DEFAULT NULL,
  `status` enum('menunggu','lolos','tidak_lolos') DEFAULT 'menunggu',
  `notes` text,
  `evaluated_by` int DEFAULT NULL,
  `evaluated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `user_type` enum('participant','admin') DEFAULT 'participant',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `birth_place` varchar(100) DEFAULT NULL,
  `birth_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone`, `address`, `user_type`, `created_at`, `updated_at`, `birth_place`, `birth_date`) VALUES
(1, 'admin@gmail.com', '$2a$12$xJy3WDCbb37u0BCUepQTk.QL7A7B8hrka0.ZH6gh1NwN3PljrMufG', 'Administrator', NULL, NULL, 'admin', '2025-10-02 07:08:29', '2025-10-08 14:18:35', NULL, NULL),
(2, 'user1@gmail.com', '$2b$12$fUFKEx8PzceLegKWIkl22ORmWbNR7lT31Tl1yziq6M0wnGqx3AZDy', 'User 1', '08882124339', '', 'participant', '2025-10-14 03:54:40', '2025-10-14 10:20:52', NULL, NULL),
(3, 'user2@gmail.com', '$2b$12$sxC10o8ST9Ui3GUun736Xuf0q2OFaxiclZ0SxBytLrLmcNkJUhThy', 'User 2', '083821612483', '', 'participant', '2025-10-14 09:11:09', '2025-10-14 10:12:29', NULL, NULL),
(4, 'user3@gmail.com', '$2b$12$9vyFQn4ULHMhyC/u/VPVsOsKBQk8Biow.Cv6Wdq.Jp/VKl3a0c0eS', 'User 3', '08333333333', 'Jl. User 3', 'participant', '2025-10-14 09:43:06', '2025-10-14 09:45:34', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `registration_id` (`registration_id`),
  ADD KEY `verified_by` (`verified_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_invoice` (`invoice_number`),
  ADD KEY `idx_receipt` (`receipt_number`);

--
-- Indexes for table `payment_history`
--
ALTER TABLE `payment_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `changed_by` (`changed_by`),
  ADD KEY `idx_payment` (`payment_id`);

--
-- Indexes for table `placement_status`
--
ALTER TABLE `placement_status`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_registration` (`registration_id`);

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_category` (`category_id`);

--
-- Indexes for table `program_categories`
--
ALTER TABLE `program_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `registrations`
--
ALTER TABLE `registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `registration_code` (`registration_code`),
  ADD UNIQUE KEY `unique_user_program` (`user_id`,`program_id`),
  ADD KEY `idx_program` (`program_id`),
  ADD KEY `idx_registration_code` (`registration_code`);

--
-- Indexes for table `selection_status`
--
ALTER TABLE `selection_status`
  ADD PRIMARY KEY (`id`),
  ADD KEY `evaluated_by` (`evaluated_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_registration` (`registration_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_user_type` (`user_type`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_history`
--
ALTER TABLE `payment_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `placement_status`
--
ALTER TABLE `placement_status`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `program_categories`
--
ALTER TABLE `program_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `registrations`
--
ALTER TABLE `registrations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `selection_status`
--
ALTER TABLE `selection_status`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payment_history`
--
ALTER TABLE `payment_history`
  ADD CONSTRAINT `payment_history_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payment_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `placement_status`
--
ALTER TABLE `placement_status`
  ADD CONSTRAINT `placement_status_ibfk_1` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `programs`
--
ALTER TABLE `programs`
  ADD CONSTRAINT `programs_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `program_categories` (`id`);

--
-- Constraints for table `registrations`
--
ALTER TABLE `registrations`
  ADD CONSTRAINT `registrations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `registrations_ibfk_2` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `selection_status`
--
ALTER TABLE `selection_status`
  ADD CONSTRAINT `selection_status_ibfk_1` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `selection_status_ibfk_2` FOREIGN KEY (`evaluated_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
