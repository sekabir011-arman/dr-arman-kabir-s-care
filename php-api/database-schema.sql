-- ============================================
-- Dr. Arman Kabir's Care - Database Schema
-- For cPanel MySQL/MariaDB
-- ============================================

-- Drop existing tables (optional, use with caution)
-- DROP TABLE IF EXISTS prescriptions;
-- DROP TABLE IF EXISTS visits;
-- DROP TABLE IF EXISTS patients;
-- DROP TABLE IF EXISTS users;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'patient') DEFAULT 'patient',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Patients Table
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    name_bn VARCHAR(255),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    blood_group VARCHAR(10),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    allergies JSON,
    chronic_conditions JSON,
    past_surgical_history TEXT,
    patient_type ENUM('admitted', 'outdoor') DEFAULT 'outdoor',
    consultant_email VARCHAR(255),
    consultant_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_patient_type (patient_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Visits Table
-- ============================================
CREATE TABLE IF NOT EXISTS visits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    visit_date DATETIME NOT NULL,
    chief_complaint TEXT NOT NULL,
    history_of_present_illness TEXT,
    blood_pressure VARCHAR(50),
    pulse VARCHAR(50),
    temperature VARCHAR(50),
    respiratory_rate VARCHAR(50),
    oxygen_saturation VARCHAR(50),
    physical_examination TEXT,
    diagnosis TEXT,
    notes TEXT,
    visit_type ENUM('admitted', 'outdoor') DEFAULT 'outdoor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id),
    INDEX idx_visit_date (visit_date),
    INDEX idx_visit_type (visit_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Prescriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    visit_id INT,
    prescription_date DATETIME NOT NULL,
    diagnosis TEXT,
    medications JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL,
    INDEX idx_patient_id (patient_id),
    INDEX idx_visit_id (visit_id),
    INDEX idx_prescription_date (prescription_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    name VARCHAR(255),
    profile_picture VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Appointments Table (From clinical-data-engine)
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATETIME NOT NULL,
    duration_minutes INT,
    status ENUM('scheduled', 'completed', 'cancelled', 'no-show') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Audit Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255),
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Alerts Table
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    alert_type VARCHAR(50),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    message TEXT,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id),
    INDEX idx_is_dismissed (is_dismissed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Create default admin user (optional)
-- ============================================
-- Password: admin123 (hashed with bcrypt)
INSERT IGNORE INTO users (email, password_hash, full_name, role) 
VALUES ('admin@drakarmankabir.com', '$2y$10$YourHashedPasswordHere', 'Admin User', 'admin');
