import bcrypt from "bcryptjs";
import db from "../config/database.js";

const seedData = async () => {
  try {
    console.log("🌱 Seeding database with initial data...");

    // Hash passwords
    const adminPassword = await bcrypt.hash("admin123", 12);
    const userPassword = await bcrypt.hash("user123", 12);

    // Insert admin user
    await db.promise().query(
      `INSERT IGNORE INTO users (email, password, full_name, user_type) 
       VALUES (?, ?, ?, 'admin')`,
      ["admin@company.com", adminPassword, "System Administrator"]
    );

    // Insert sample user
    await db.promise().query(
      `INSERT IGNORE INTO users (email, password, full_name, phone, address, user_type) 
       VALUES (?, ?, ?, ?, ?, 'participant')`,
      [
        "user@example.com",
        userPassword,
        "John Doe",
        "081234567890",
        "Jakarta, Indonesia",
      ]
    );

    // Insert program categories
    await db.promise().query(`
      INSERT IGNORE INTO program_categories (id, name, description) VALUES
      (1, 'Teknologi Informasi', 'Program magang di bidang teknologi informasi dan pengembangan software'),
      (2, 'Data Science', 'Program magang di bidang analisis data dan machine learning'),
      (3, 'Digital Marketing', 'Program magang di bidang pemasaran digital dan media sosial')
    `);

    // Insert sample programs dengan field baru
    await db.promise().query(`
      INSERT IGNORE INTO programs (
        id, category_id, name, description, requirements, schedule, duration, 
        cost, capacity, contact_info, registration_deadline, start_date, end_date,
        location, training_cost, departure_cost, bridge_fund
      ) VALUES
      (1, 1, 'Program Intern Backend Developer', 
       'Program magang untuk pengembangan backend menggunakan Node.js, Python, dan database', 
       '- Mahasiswa TI/S1\\n- Menguasai dasar pemrograman\\n- Memahami konsep database', 
       'Senin-Jumat, 09:00-17:00', '3 bulan', 500000, 20, 
       'Email: hr@company.com\\nTelp: 021-1234567\\nAlamat: Jl. Contoh No. 123', 
       '2024-12-31', '2024-02-01', '2024-04-30',
       'Jakarta, Indonesia & Jepang', 16000000.00, 30000000.00, 
       'Tersedia (Jaminan dari perusahaan pengirim)'),
      
      (2, 1, 'Program Intern Frontend Developer', 
       'Program magang untuk pengembangan frontend menggunakan React.js, Vue.js, dan CSS', 
       '- Mahasiswa TI/DKV\\n- Menguasai HTML, CSS, JavaScript\\n- Pengalaman dengan framework frontend', 
       'Senin-Jumat, 09:00-17:00', '3 bulan', 500000, 15, 
       'Email: hr@company.com\\nTelp: 021-1234567\\nAlamat: Jl. Contoh No. 123', 
       '2024-12-31', '2024-02-01', '2024-04-30',
       'Jakarta, Indonesia & Jepang', 15000000.00, 28000000.00, 
       'Tersedia (Jaminan dari perusahaan pengirim)'),
      
      (3, 2, 'Program Intern Data Analyst', 
       'Program magang untuk analisis data menggunakan Python, SQL, dan tools visualisasi', 
       '- Mahasiswa Statistika/TI/Matematika\\n- Menguasai dasar statistik\\n- Familiar dengan Python/R', 
       'Senin-Jumat, 09:00-17:00', '4 bulan', 450000, 12, 
       'Email: hr@company.com\\nTelp: 021-1234567\\nAlamat: Jl. Contoh No. 123', 
       '2024-12-31', '2024-02-01', '2024-05-31',
       'Jakarta, Indonesia & Jepang', 14000000.00, 32000000.00, 
       'Tersedia (Jaminan dari perusahaan pengirim)')
    `);

    await db.promise().query(`
      INSERT IGNORE INTO programs (
        id, category_id, name, description, requirements, schedule, duration, 
        cost, capacity, contact_info, registration_deadline, start_date, end_date,
        location, training_cost, departure_cost, bridge_fund,
        curriculum_json, facilities_json, timeline_json, fee_details_json, requirements_list
      ) VALUES
      (1, 1, 'Program Intern Backend Developer', 
      'Program magang untuk pengembangan backend menggunakan Node.js, Python, dan database', 
      '- Mahasiswa TI/S1\\n- Menguasai dasar pemrograman\\n- Memahami konsep database', 
      'Senin-Jumat, 09:00-17:00', '3 bulan', 500000, 20, 
      'Email: hr@company.com\\nTelp: 021-1234567\\nAlamat: Jl. Contoh No. 123', 
      '2024-12-31', '2024-02-01', '2024-04-30',
      'Jakarta, Indonesia & Jepang', 16000000.00, 30000000.00, 
      'Tersedia (Jaminan dari perusahaan pengirim)',
      '${JSON.stringify([
        {
          phase: "Fase 1 Dasar",
          weeks: [
            "Minggu 1: Pengenalan Bahasa Jepang (Hiragana & Katakana)",
            "Minggu 2: Salam dasar, perkenalan diri, dan ungkapan sehari-hari",
            "Minggu 3: Angka, waktu, tanggal, dan kalimat sederhana",
            "Minggu 4: Tata bahasa dasar & kosakata untuk aktivitas harian",
          ],
        },
      ])}',
      '${JSON.stringify({
        education: [
          "Ruang kelas nyaman dengan meja dan kursi belajar",
          "Perangkat multimedia",
        ],
        dormitory: [
          "Kamar tidur bersih & nyaman",
          "Tempat tidur, lemari, meja belajar",
        ],
      })}',
      '${JSON.stringify([
        { month: "Bulan 1", title: "Dasar Bahasa & Adaptasi" },
        { month: "Bulan 2", title: "Pengembangan Bahasa" },
      ])}',
      '${JSON.stringify({
        training_fee_items: [
          "Biaya administrasi pendaftaran",
          "Seragam pelatihan",
        ],
        departure_fee_items: [
          "Tiket pesawat ke Jepang",
          "Visa & dokumen keberangkatan",
        ],
      })}',
      '${JSON.stringify([
        "Usia minimal 18 tahun",
        "Pendidikan minimal SMA/SMK sederajat",
      ])}'
      )
      -- ... program lainnya
    `);

    console.log("✅ Database seeded successfully!");
    console.log("📋 Default login credentials:");
    console.log("   Admin: admin@company.com / admin123");
    console.log("   User:  user@example.com / user123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedData();
