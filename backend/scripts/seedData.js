import bcrypt from "bcryptjs";
import db from "../config/database.js";

const seedData = async () => {
  let connection;
  try {
    console.log("🌱 Seeding database with initial data...");

    // Test database connection
    connection = db.promise();
    await connection.execute("SELECT 1");
    console.log("✅ Database connection established");

    // Hash passwords
    const adminPassword = await bcrypt.hash("admin", 12);
    const user1Password = await bcrypt.hash("user1", 12);
    const user2Password = await bcrypt.hash("user2", 12);
    const user3Password = await bcrypt.hash("user3", 12);

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("🧹 Clearing existing data...");
    await connection.execute("DELETE FROM payments");
    await connection.execute("DELETE FROM payment_history");
    await connection.execute("DELETE FROM placement_status");
    await connection.execute("DELETE FROM selection_status");
    await connection.execute("DELETE FROM registrations");
    await connection.execute("DELETE FROM programs");
    await connection.execute("DELETE FROM program_categories");
    await connection.execute("DELETE FROM users WHERE id > 0");

    // Reset auto increments
    await connection.execute("ALTER TABLE users AUTO_INCREMENT = 1");
    await connection.execute(
      "ALTER TABLE program_categories AUTO_INCREMENT = 1"
    );
    await connection.execute("ALTER TABLE programs AUTO_INCREMENT = 1");

    // Insert admin user
    await connection.execute(
      `INSERT INTO users (id, email, password, full_name, user_type) 
       VALUES (?, ?, ?, ?, 'admin')`,
      [1, "admin@gmail.com", adminPassword, "Administrator"]
    );

    // Insert sample users
    await connection.execute(
      `INSERT INTO users (id, email, password, full_name, phone, address, user_type) VALUES
      (?, ?, ?, ?, ?, ?, 'participant'),
      (?, ?, ?, ?, ?, ?, 'participant'),
      (?, ?, ?, ?, ?, ?, 'participant')`,
      [
        2,
        "user1@gmail.com",
        user1Password,
        "User 1",
        "08882124339",
        "",
        3,
        "user2@gmail.com",
        user2Password,
        "User 2",
        "083821612483",
        "",
        4,
        "user3@gmail.com",
        user3Password,
        "User 3",
        "08333333333",
        "Jl. User 3",
      ]
    );

    // Insert program categories
    await connection.execute(`
      INSERT INTO program_categories (id, name, description) VALUES
      (1, 'Regular', 'Program magang di bidang teknologi informasi dan pengembangan software'),
      (2, 'Hybrid', 'Program magang di bidang analisis data dan machine learning'),
      (3, 'Fast Track', 'Program magang di bidang pemasaran digital dan media sosial')
    `);

    // Data lengkap untuk programs
    const programsData = [
      {
        id: 1,
        category_id: 1,
        name: "Program Regular",
        description:
          "Skema terbaik untuk persiapan intensif dan komprehensif. Dengan metode offline (Tatap Muka)",
        requirements:
          "- Mahasiswa TI/S1\n- Menguasai dasar pemrograman\n- Memahami konsep database",
        schedule: "Senin-Jumat, 09:00-17:00",
        duration: "4 bulan",
        capacity: 20,
        current_participants: 0,
        status: "active",
        contact_info:
          "Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123",
        registration_deadline: "2024-12-31",
        start_date: "2024-02-01",
        end_date: "2024-04-30",
        location: "Jakarta, Indonesia & Jepang",
        training_cost: "16000000.00",
        departure_cost: "30000000.00",
        installment_plan: "4_installments",
        bridge_fund: "Tersedia (Jaminan dari perusahaan pengirim)",
        curriculum_json: JSON.stringify([
          {
            phase: "Fase 1 Dasar",
            weeks: [
              "Minggu 1: Pengenalan Bahasa Jepang (Hiragana & Katakana)",
              "Minggu 2: Salam dasar, perkenalan diri, dan ungkapan sehari-hari",
              "Minggu 3: Angka, waktu, tanggal, dan kalimat sederhana",
              "Minggu 4: Tata bahasa dasar & kosakata untuk aktivitas harian",
            ],
          },
          {
            phase: "Fase 2 Pengembangan Bahasa",
            weeks: [
              "Minggu 5: Pengenalan dan latihan Kanji",
              "Minggu 6: Pola kalimat untuk bertanya & menjawab",
              "Minggu 7: Kosakata seputar pekerjaan, makanan, transportasi, dan kesehatan",
              "Minggu 8: Latihan mendengar & berbicara (role-play & percakapan)",
            ],
          },
          {
            phase: "Fase 3 Budaya & Persiapan Kerja",
            weeks: [
              "Minggu 9: Budaya Jepang, adat istiadat, dan tata krama",
              "Minggu 10: Etika kerja dan perilaku profesional",
              "Minggu 11: Keterampilan komunikasi & penyelesaian masalah",
              "Minggu 12: Simulasi wawancara & skenario dunia kerja",
            ],
          },
          {
            phase: "Fase 4 Kesiapan Karier & Review Akhir",
            weeks: [
              "Minggu 13: Latihan menulis (Kanji dasar & kalimat seputar pekerjaan)",
              "Minggu 14: Persiapan ujian (Latihan JLPT / NAT Test)",
              "Minggu 15: Presentasi akhir & simulasi wawancara kerja",
              "Minggu 16: Review, evaluasi, dan sesi konseling karier",
            ],
          },
        ]),
        facilities_json: JSON.stringify({
          dormitory: [
            "Kamar tidur bersih & nyaman (kapasitas sesuai kebutuhan)",
            "Tempat tidur, lemari, meja belajar, dan kipas/AC",
            "Dapur bersama lengkap dengan peralatan memasak",
            "Kamar mandi dan toilet bersih (laki-laki & perempuan terpisah)",
            "Ruang makan & ruang santai",
            "Area olahraga ringan (lapangan kecil / gym sederhana)",
            "Laundry area (cuci & jemur pakaian)",
            "Lingkungan aman dengan pengawasan pengelola asrama",
          ],
          education: [
            "Ruang kelas nyaman dengan meja dan kursi belajar",
            "Perangkat multimedia (proyektor, audio, dan papan tulis)",
            "Perpustakaan mini dengan buku dan materi bahasa Jepang",
            "Laboratorium bahasa untuk latihan mendengar dan berbicara",
            "Area diskusi dan ruang belajar bersama",
            "Akses internet (Wi-Fi) untuk mendukung pembelajaran",
          ],
        }),
        timeline_json: JSON.stringify([
          { month: "Bulan 1", title: "Dasar Bahasa & Adaptasi" },
          { month: "Bulan 2", title: "Pengembangan Bahasa" },
          { month: "Bulan 3", title: "Budaya & Persiapan Kerja" },
          { month: "Bulan 4", title: "Persiapan Akhir & Evaluasi" },
        ]),
        fee_details_json: JSON.stringify({
          training_fee_items: [
            "Biaya administrasi pendaftaran",
            "Seragam pelatihan",
            "Modul & buku pelajaran bahasa Jepang",
            "Akses ke fasilitas kelas & laboratorium bahasa",
            "Fasilitas asrama (akomodasi & utilitas dasar selama pelatihan)",
            "Pendampingan & bimbingan belajar",
          ],
          departure_fee_items: [
            "Tiket pesawat ke Jepang",
            "Visa & dokumen keberangkatan",
            "Asuransi perjalanan & kesehatan",
            "Biaya penempatan kerja di Jepang",
            "Pendampingan proses keberangkatan hingga penyaluran",
          ],
        }),
        requirements_list: JSON.stringify([
          "Usia minimal 18 tahun",
          "Pendidikan minimal SMA/SMK sederajat",
          "Sehat jasmani & rohani (dibuktikan dengan surat keterangan sehat)",
          "Tidak memiliki catatan kriminal (SKCK)",
          "Memiliki laptop/komputer pribadi",
          "Dasar pemahaman komputer (tidak perlu pengalaman coding)",
          "Bersedia mengikuti seluruh rangkaian pelatihan hingga selesai",
        ]),
      },
      {
        id: 2,
        category_id: 2,
        name: "Program Hybrid",
        description:
          "Fleksibilitas pelatihan. Dengan metode offline (Tatap Muka) pemantapan di asrama dan online (Virtual)",
        requirements:
          "- Mahasiswa TI/DKV\n- Menguasai HTML, CSS, JavaScript\n- Pengalaman dengan framework frontend",
        schedule: "Senin-Jumat, 09:00-17:00",
        duration: "6 bulan",
        capacity: 15,
        current_participants: 0,
        status: "active",
        contact_info:
          "Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123",
        registration_deadline: "2024-12-31",
        start_date: "2024-02-01",
        end_date: "2024-04-30",
        location: "Jakarta, Indonesia & Jepang",
        training_cost: "7150000.00",
        departure_cost: "30000000.00",
        installment_plan: "6_installments",
        bridge_fund: "Tersedia (Jaminan dari perusahaan pengirim)",
        curriculum_json: JSON.stringify([
          {
            phase: "Fase 1 Dasar",
            weeks: [
              "Minggu 1: Pengenalan Bahasa Jepang (Hiragana & Katakana)",
              "Minggu 2: Salam dasar, perkenalan diri, dan ungkapan sehari-hari",
              "Minggu 3: Angka, waktu, tanggal, dan kalimat sederhana",
              "Minggu 4: Tata bahasa dasar & kosakata untuk aktivitas harian",
            ],
          },
          {
            phase: "Fase 2 Pengembangan Bahasa",
            weeks: [
              "Minggu 5: Pengenalan dan latihan Kanji",
              "Minggu 6: Pola kalimat untuk bertanya & menjawab",
              "Minggu 7: Kosakata seputar pekerjaan, makanan, transportasi, dan kesehatan",
              "Minggu 8: Latihan mendengar & berbicara (role-play & percakapan)",
            ],
          },
          {
            phase: "Fase 3 Budaya & Persiapan Kerja",
            weeks: [
              "Minggu 9: Budaya Jepang, adat istiadat, dan tata krama",
              "Minggu 10: Etika kerja dan perilaku profesional",
              "Minggu 11: Keterampilan komunikasi & penyelesaian masalah",
              "Minggu 12: Simulasi wawancara & skenario dunia kerja",
            ],
          },
          {
            phase: "Fase 4 Kesiapan Karier & Review Akhir",
            weeks: [
              "Minggu 13: Latihan menulis (Kanji dasar & kalimat seputar pekerjaan)",
              "Minggu 14: Persiapan ujian (Latihan JLPT / NAT Test)",
              "Minggu 15: Presentasi akhir & simulasi wawancara kerja",
              "Minggu 16: Review, evaluasi, dan sesi konseling karier",
            ],
          },
        ]),
        facilities_json: JSON.stringify({
          dormitory: [
            "Kamar tidur bersih & nyaman (kapasitas sesuai kebutuhan)",
            "Tempat tidur, lemari, meja belajar, dan kipas/AC",
            "Dapur bersama lengkap dengan peralatan memasak",
            "Kamar mandi dan toilet bersih (laki-laki & perempuan terpisah)",
            "Ruang makan & ruang santai",
            "Area olahraga ringan (lapangan kecil / gym sederhana)",
            "Laundry area (cuci & jemur pakaian)",
            "Lingkungan aman dengan pengawasan pengelola asrama",
          ],
          education: [
            "Ruang kelas nyaman dengan meja dan kursi belajar",
            "Perangkat multimedia (proyektor, audio, dan papan tulis)",
            "Perpustakaan mini dengan buku dan materi bahasa Jepang",
            "Laboratorium bahasa untuk latihan mendengar dan berbicara",
            "Area diskusi dan ruang belajar bersama",
            "Akses internet (Wi-Fi) untuk mendukung pembelajaran",
          ],
        }),
        timeline_json: JSON.stringify([
          { month: "Bulan 1", title: "Dasar Bahasa & Adaptasi" },
          { month: "Bulan 2", title: "Pengembangan Bahasa" },
          { month: "Bulan 3", title: "Budaya & Persiapan Kerja" },
          { month: "Bulan 4", title: "Persiapan Akhir & Evaluasi" },
        ]),
        fee_details_json: JSON.stringify({
          training_fee_items: [
            "Biaya administrasi pendaftaran",
            "Seragam pelatihan",
            "Modul & buku pelajaran bahasa Jepang",
            "Akses ke fasilitas kelas & laboratorium bahasa",
            "Fasilitas asrama (akomodasi & utilitas dasar selama pelatihan)",
            "Pendampingan & bimbingan belajar",
          ],
          departure_fee_items: [
            "Tiket pesawat ke Jepang",
            "Visa & dokumen keberangkatan",
            "Asuransi perjalanan & kesehatan",
            "Biaya penempatan kerja di Jepang",
            "Pendampingan proses keberangkatan hingga penyaluran",
          ],
        }),
        requirements_list: JSON.stringify([
          "Usia minimal 18 tahun",
          "Pendidikan minimal SMA/SMK sederajat",
          "Sehat jasmani & rohani (dibuktikan dengan surat keterangan sehat)",
          "Tidak memiliki catatan kriminal (SKCK)",
          "Memiliki laptop/komputer pribadi",
          "Dasar pemahaman komputer (tidak perlu pengalaman coding)",
          "Bersedia mengikuti seluruh rangkaian pelatihan hingga selesai",
        ]),
      },
      {
        id: 3,
        category_id: 3,
        name: "Program Fast Track",
        description:
          "Jalur cepat untuk yang sudah memiliki sertifikat Noryoku Shiken N4 dan Specified Skilled Worker",
        requirements:
          "- Mahasiswa Statistika/TI/Matematika\n- Menguasai dasar statistik\n- Familiar dengan Python/R",
        schedule: "Senin-Jumat, 09:00-17:00",
        duration: "1 bulan",
        capacity: 12,
        current_participants: 0,
        status: "active",
        contact_info:
          "Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123",
        registration_deadline: "2024-12-31",
        start_date: "2024-02-01",
        end_date: "2024-05-31",
        location: "Jakarta, Indonesia & Jepang",
        training_cost: "4000000.00",
        departure_cost: "30000000.00",
        installment_plan: "none",
        bridge_fund: "Tersedia (Jaminan dari perusahaan pengirim)",
        curriculum_json: JSON.stringify([
          {
            phase: "Fase 1 Dasar",
            weeks: [
              "Minggu 1: Pengenalan Bahasa Jepang (Hiragana & Katakana)",
              "Minggu 2: Salam dasar, perkenalan diri, dan ungkapan sehari-hari",
              "Minggu 3: Angka, waktu, tanggal, dan kalimat sederhana",
              "Minggu 4: Tata bahasa dasar & kosakata untuk aktivitas harian",
            ],
          },
          {
            phase: "Fase 2 Pengembangan Bahasa",
            weeks: [
              "Minggu 5: Pengenalan dan latihan Kanji",
              "Minggu 6: Pola kalimat untuk bertanya & menjawab",
              "Minggu 7: Kosakata seputar pekerjaan, makanan, transportasi, dan kesehatan",
              "Minggu 8: Latihan mendengar & berbicara (role-play & percakapan)",
            ],
          },
          {
            phase: "Fase 3 Budaya & Persiapan Kerja",
            weeks: [
              "Minggu 9: Budaya Jepang, adat istiadat, dan tata krama",
              "Minggu 10: Etika kerja dan perilaku profesional",
              "Minggu 11: Keterampilan komunikasi & penyelesaian masalah",
              "Minggu 12: Simulasi wawancara & skenario dunia kerja",
            ],
          },
          {
            phase: "Fase 4 Kesiapan Karier & Review Akhir",
            weeks: [
              "Minggu 13: Latihan menulis (Kanji dasar & kalimat seputar pekerjaan)",
              "Minggu 14: Persiapan ujian (Latihan JLPT / NAT Test)",
              "Minggu 15: Presentasi akhir & simulasi wawancara kerja",
              "Minggu 16: Review, evaluasi, dan sesi konseling karier",
            ],
          },
        ]),
        facilities_json: JSON.stringify({
          dormitory: [
            "Kamar tidur bersih & nyaman (kapasitas sesuai kebutuhan)",
            "Tempat tidur, lemari, meja belajar, dan kipas/AC",
            "Dapur bersama lengkap dengan peralatan memasak",
            "Kamar mandi dan toilet bersih (laki-laki & perempuan terpisah)",
            "Ruang makan & ruang santai",
            "Area olahraga ringan (lapangan kecil / gym sederhana)",
            "Laundry area (cuci & jemur pakaian)",
            "Lingkungan aman dengan pengawasan pengelola asrama",
          ],
          education: [
            "Ruang kelas nyaman dengan meja dan kursi belajar",
            "Perangkat multimedia (proyektor, audio, dan papan tulis)",
            "Perpustakaan mini dengan buku dan materi bahasa Jepang",
            "Laboratorium bahasa untuk latihan mendengar dan berbicara",
            "Area diskusi dan ruang belajar bersama",
            "Akses internet (Wi-Fi) untuk mendukung pembelajaran",
          ],
        }),
        timeline_json: JSON.stringify([
          { month: "Bulan 1", title: "Dasar Bahasa & Adaptasi" },
          { month: "Bulan 2", title: "Pengembangan Bahasa" },
          { month: "Bulan 3", title: "Budaya & Persiapan Kerja" },
          { month: "Bulan 4", title: "Persiapan Akhir & Evaluasi" },
        ]),
        fee_details_json: JSON.stringify({
          training_fee_items: [
            "Biaya administrasi pendaftaran",
            "Seragam pelatihan",
            "Modul & buku pelajaran bahasa Jepang",
            "Akses ke fasilitas kelas & laboratorium bahasa",
            "Fasilitas asrama (akomodasi & utilitas dasar selama pelatihan)",
            "Pendampingan & bimbingan belajar",
          ],
          departure_fee_items: [
            "Tiket pesawat ke Jepang",
            "Visa & dokumen keberangkatan",
            "Asuransi perjalanan & kesehatan",
            "Biaya penempatan kerja di Jepang",
            "Pendampingan proses keberangkatan hingga penyaluran",
          ],
        }),
        requirements_list: JSON.stringify([
          "Usia minimal 18 tahun",
          "Pendidikan minimal SMA/SMK sederajat",
          "Sehat jasmani & rohani (dibuktikan dengan surat keterangan sehat)",
          "Tidak memiliki catatan kriminal (SKCK)",
          "Memiliki laptop/komputer pribadi",
          "Dasar pemahaman komputer (tidak perlu pengalaman coding)",
          "Bersedia mengikuti seluruh rangkaian pelatihan hingga selesai",
        ]),
      },
    ];

    // Insert semua program
    for (const program of programsData) {
      await connection.execute(
        `INSERT INTO programs (
          id, category_id, name, description, requirements, schedule, duration, 
          capacity, current_participants, status, contact_info, registration_deadline, 
          start_date, end_date, location, training_cost, departure_cost, installment_plan, 
          bridge_fund, curriculum_json, facilities_json, timeline_json, fee_details_json, requirements_list
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          program.id,
          program.category_id,
          program.name,
          program.description,
          program.requirements,
          program.schedule,
          program.duration,
          program.capacity,
          program.current_participants,
          program.status,
          program.contact_info,
          program.registration_deadline,
          program.start_date,
          program.end_date,
          program.location,
          program.training_cost,
          program.departure_cost,
          program.installment_plan,
          program.bridge_fund,
          program.curriculum_json,
          program.facilities_json,
          program.timeline_json,
          program.fee_details_json,
          program.requirements_list,
        ]
      );
    }

    console.log("✅ Database seeded successfully!");
    console.log("📋 Login credentials:");
    console.log("   Admin: admin@gmail.com / admin");
    console.log("   User 1: user1@gmail.com / user1");
    console.log("   User 2: user2@gmail.com / user2");
    console.log("   User 3: user3@gmail.com / user3");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

seedData();
