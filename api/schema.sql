-- FOCUS hesap ve abonelik şeması (MySQL 5.7+/MariaDB 10.3+, utf8mb4).
-- InfinityFree: phpMyAdmin > veritabanını seç > İçe aktar (Import) ile bu dosyayı yükleyin.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(80) NOT NULL,
  organization VARCHAR(120) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  failed_logins SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  session_version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  last_login_at DATETIME NULL,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  plan_id VARCHAR(20) NOT NULL,
  billing ENUM('month','year') NOT NULL,
  status ENUM('pending','active','rejected','cancelled','expired') NOT NULL,
  reference VARCHAR(16) NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  period_start DATETIME NULL,
  period_end DATETIME NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  decided_at DATETIME NULL,
  decided_by INT UNSIGNED NULL,
  UNIQUE KEY uq_sub_reference (reference),
  KEY idx_sub_user_status (user_id, status),
  KEY idx_sub_status (status),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usage_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  request_id CHAR(32) NOT NULL,
  hours SMALLINT UNSIGNED NOT NULL,
  plan_id VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_usage_request (user_id, request_id),
  KEY idx_usage_user_time (user_id, created_at),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket CHAR(64) NOT NULL PRIMARY KEY,
  window_start INT UNSIGNED NOT NULL,
  hits INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=ascii;

CREATE TABLE IF NOT EXISTS audit_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(40) NOT NULL,
  detail VARCHAR(255) NOT NULL DEFAULT '',
  ip_hash CHAR(16) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_audit_time (created_at),
  KEY idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- İlk yönetici: önce sitede normal kayıt olun, sonra phpMyAdmin > SQL sekmesinde:
-- UPDATE users SET role = 'admin' WHERE email = 'sizin-adresiniz@ornek.com';
