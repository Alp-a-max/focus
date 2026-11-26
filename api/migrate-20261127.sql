-- Yalnızca 27 Kasım 2026'dan ÖNCE schema.sql içe aktarılmışsa çalıştırın (yeni kurulumda gerekmez).
ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN google_sub VARCHAR(64) NULL AFTER password_hash;
ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER google_sub;
ALTER TABLE users ADD COLUMN trial_until DATETIME NULL AFTER email_verified_at;
ALTER TABLE users ADD UNIQUE KEY uq_users_google (google_sub);
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;
CREATE TABLE IF NOT EXISTS settings (k VARCHAR(64) NOT NULL PRIMARY KEY, v TEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS email_codes (user_id INT UNSIGNED NOT NULL PRIMARY KEY, code_hash CHAR(64) NOT NULL, expires_at DATETIME NOT NULL, attempts TINYINT UNSIGNED NOT NULL DEFAULT 0, sent_at DATETIME NOT NULL, CONSTRAINT fk_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
