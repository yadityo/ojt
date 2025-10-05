-- Database untuk sistem pendaftaran intern
CREATE DATABASE IF NOT EXISTS intern_registration;
USE intern_registration;

-- Tabel users (untuk semua jenis user)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    user_type ENUM('participant', 'admin') DEFAULT 'participant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_user_type (user_type)
);

-- Tabel program categories
CREATE TABLE program_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel programs
CREATE TABLE programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    schedule TEXT,
    duration VARCHAR(100),
    cost DECIMAL(10,2),
    capacity INT,
    current_participants INT DEFAULT 0,
    status ENUM('active', 'inactive', 'full') DEFAULT 'active',
    contact_info TEXT,
    registration_deadline DATE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES program_categories(id),
    INDEX idx_status (status),
    INDEX idx_category (category_id)
);

-- Tabel pendaftaran (registrations)
CREATE TABLE registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    program_id INT,
    registration_code VARCHAR(50) UNIQUE NOT NULL,
    application_letter TEXT,
    cv_path VARCHAR(255),
    portfolio_path VARCHAR(255),
    status ENUM('pending', 'under_review', 'accepted', 'rejected', 'waiting_list') DEFAULT 'pending',
    selection_notes TEXT,
    placement_preference TEXT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_program (user_id, program_id),
    INDEX idx_status (status),
    INDEX idx_program (program_id),
    INDEX idx_registration_code (registration_code)
);

-- Tabel status seleksi
CREATE TABLE selection_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    registration_id INT,
    test_score DECIMAL(5,2),
    interview_score DECIMAL(5,2),
    final_score DECIMAL(5,2),
    status ENUM('menunggu', 'lolos_tahap_1', 'lolos_tahap_2', 'tidak_lolos') DEFAULT 'menunggu',
    notes TEXT,
    evaluated_by INT,
    evaluated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluated_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_registration (registration_id)
);

-- Tabel status penyaluran
CREATE TABLE placement_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    registration_id INT,
    company_name VARCHAR(255),
    position VARCHAR(255),
    department VARCHAR(255),
    status ENUM('proses', 'lolos', 'ditempatkan', 'gagal') DEFAULT 'proses',
    placement_date DATE NULL,
    supervisor_name VARCHAR(255),
    supervisor_contact VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_registration (registration_id)
);

-- Tabel pembayaran
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    registration_id INT,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_method ENUM('transfer', 'cash', 'credit_card') DEFAULT 'transfer',
    bank_name VARCHAR(100),
    account_number VARCHAR(100),
    status ENUM('pending', 'down_payment', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    due_date DATE,
    proof_image VARCHAR(255),
    payment_date TIMESTAMP NULL,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    receipt_number VARCHAR(100) UNIQUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_invoice (invoice_number),
    INDEX idx_receipt (receipt_number)
);

-- Tabel payment history (untuk audit trail)
CREATE TABLE payment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT,
    old_status ENUM('pending', 'down_payment', 'paid', 'overdue', 'cancelled'),
    new_status ENUM('pending', 'down_payment', 'paid', 'overdue', 'cancelled'),
    amount_changed DECIMAL(10,2),
    notes TEXT,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_payment (payment_id)
);

-- Tabel documents (untuk menyimpan semua dokumen)
CREATE TABLE documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    registration_id INT,
    document_type ENUM('application_letter', 'cv', 'portfolio', 'certificate', 'other'),
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
    INDEX idx_registration (registration_id),
    INDEX idx_document_type (document_type)
);

-- Tabel notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_entity ENUM('registration', 'payment', 'selection', 'placement'),
    related_entity_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read)
);

-- Tabel program content management (untuk admin update konten)
CREATE TABLE program_content (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_id INT,
    section_name VARCHAR(100) NOT NULL,
    content_type ENUM('text', 'image', 'file') DEFAULT 'text',
    content TEXT,
    file_path VARCHAR(255),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_program (program_id),
    INDEX idx_section (section_name)
);

-- Insert data awal
-- Admin user (password: admin123)
INSERT INTO users (email, password, full_name, user_type) 
VALUES ('admin@company.com', '$2a$12$l8jTIDqxNfr5LPaBWSlLROLvmXgi/WJxjTgr251lQiPFPHHIz7GOi', 'Administrator', 'admin');

-- Program categories
INSERT INTO program_categories (name, description) VALUES
('Teknologi Informasi', 'Program magang di bidang teknologi informasi dan pengembangan software'),
('Data Science', 'Program magang di bidang analisis data dan machine learning'),
('Digital Marketing', 'Program magang di bidang pemasaran digital dan media sosial');

-- Sample programs
INSERT INTO programs (category_id, name, description, requirements, schedule, duration, cost, capacity, contact_info, registration_deadline, start_date, end_date) VALUES
(1, 'Program Intern Backend Developer', 'Program magang untuk pengembangan backend menggunakan Node.js, Python, dan database', '- Mahasiswa TI/S1\n- Menguasai dasar pemrograman\n- Memahami konsep database', 'Senin-Jumat, 09:00-17:00', '3 bulan', 500000, 20, 'Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123', '2024-12-31', '2024-02-01', '2024-04-30'),
(1, 'Program Intern Frontend Developer', 'Program magang untuk pengembangan frontend menggunakan React.js, Vue.js, dan CSS', '- Mahasiswa TI/DKV\n- Menguasai HTML, CSS, JavaScript\n- Pengalaman dengan framework frontend', 'Senin-Jumat, 09:00-17:00', '3 bulan', 500000, 15, 'Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123', '2024-12-31', '2024-02-01', '2024-04-30'),
(2, 'Program Intern Data Analyst', 'Program magang untuk analisis data menggunakan Python, SQL, dan tools visualisasi', '- Mahasiswa Statistika/TI/Matematika\n- Menguasai dasar statistik\n- Familiar dengan Python/R', 'Senin-Jumat, 09:00-17:00', '4 bulan', 450000, 12, 'Email: hr@company.com\nTelp: 021-1234567\nAlamat: Jl. Contoh No. 123', '2024-12-31', '2024-02-01', '2024-05-31');

-- Sample program content
INSERT INTO program_content (program_id, section_name, content_type, content, display_order) VALUES
(1, 'description', 'text', 'Program magang intensif untuk menjadi Backend Developer profesional. Peserta akan belajar mengembangkan aplikasi server-side yang scalable dan maintainable.', 1),
(1, 'benefits', 'text', '- Mendapatkan mentorship dari developer berpengalaman\n- Project based learning\n- Sertifikat kelulusan\n- Peluang diterima sebagai karyawan tetap\n- Networking dengan profesional IT', 2),
(1, 'curriculum', 'text', 'Minggu 1-2: Fundamental Backend Development\nMinggu 3-6: Database Design & API Development\nMinggu 7-10: Advanced Topics & Final Project', 3);