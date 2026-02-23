-- Fresh Database Setup for BeatsHQ (Hybrid Model: Individual & Pack Downloads)
-- This schema supports both individual sample downloads and full pack downloads.
-- Each sample has an individual credit value; packs are purchased by sum of contained samples.

-- Optional: reset the database during local development.
-- DROP DATABASE IF EXISTS beatshq_db;
CREATE DATABASE IF NOT EXISTS beatshq_db;
USE beatshq_db;

-- Users table (auth + roles + credits).
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample packs table (organizational container).
CREATE TABLE IF NOT EXISTS sample_packs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    cover_image VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Samples table (individual audio files with per-sample credits).
CREATE TABLE IF NOT EXISTS samples (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'sample',
    credits INT NOT NULL DEFAULT 1,
    bpm INT,
    pack_id INT NOT NULL,
    uploaded_by INT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (pack_id) REFERENCES sample_packs(id) ON DELETE CASCADE
);

-- Sample downloads table (tracks individual sample purchases).
-- Each row = one sample owned by one user.
-- Full pack download = one row per sample inserted.
CREATE TABLE IF NOT EXISTS sample_downloads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    sample_id INT NOT NULL,
    credits_spent INT NOT NULL,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
    UNIQUE KEY user_sample (user_id, sample_id)
);

-- Credit grants table (admin audit log for credit allocations).
CREATE TABLE IF NOT EXISTS credit_grants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grantor_id INT NOT NULL,
    recipient_id INT NOT NULL,
    amount INT NOT NULL,
    note VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grantor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optional: indexes for common queries.
CREATE INDEX idx_samples_pack ON samples(pack_id);
CREATE INDEX idx_samples_uploader ON samples(uploaded_by);
CREATE INDEX idx_downloads_user ON sample_downloads(user_id);
CREATE INDEX idx_downloads_sample ON sample_downloads(sample_id);
CREATE INDEX idx_packs_creator ON sample_packs(created_by);
CREATE INDEX idx_packs_genre ON sample_packs(genre);
CREATE INDEX idx_credit_grants_grantor ON credit_grants(grantor_id);
CREATE INDEX idx_credit_grants_recipient ON credit_grants(recipient_id);
CREATE INDEX idx_credit_grants_created ON credit_grants(created_at);

-- Seed data (safe starter content for demos).
-- NOTE: Replace the password_hash and salt values to enable login.
INSERT INTO users (name, email, password_hash, salt, is_admin, credits) VALUES
('admin', 'admin@beatshq.local', 'REPLACE_WITH_HASH', 'REPLACE_WITH_SALT', TRUE, 150),
('student', 'student@beatshq.local', 'REPLACE_WITH_HASH', 'REPLACE_WITH_SALT', FALSE, 35);

INSERT INTO sample_packs (name, description, genre, cover_image, created_by) VALUES
('Neon Drums Vol. 1', 'Punchy one-shots and crisp snares built for modern hip hop.', 'Hip Hop', NULL, 1),
('Analog Atmospheres', 'Warm pads and textures for cinematic scoring.', 'Cinematic', NULL, 1);

INSERT INTO samples (title, filename, type, credits, bpm, pack_id, uploaded_by) VALUES
('Neon Kick 01', 'neon_kick_01.wav', 'sample', 1, NULL, 1, 1),
('Neon Snare 02', 'neon_snare_02.wav', 'sample', 1, NULL, 1, 1),
('Analog Pad Loop', 'analog_pad_loop.wav', 'loop', 3, 90, 2, 1);

-- Demo SQL commands (for class walkthroughs).
-- 1) Check current balances:
--    SELECT id, name, credits FROM users ORDER BY credits DESC;
-- 2) Grant credits manually (admin -> student):
--    UPDATE users SET credits = credits + 20 WHERE name = 'student';
-- 3) Record an audit log entry for the grant:
--    INSERT INTO credit_grants (grantor_id, recipient_id, amount, note) VALUES (1, 2, 20, 'Class demo');
-- 4) Show recent credit activity:
--    SELECT cg.id, g.name AS grantor, r.name AS recipient, cg.amount, cg.note, cg.created_at
--    FROM credit_grants cg
--    JOIN users g ON g.id = cg.grantor_id
--    JOIN users r ON r.id = cg.recipient_id
--    ORDER BY cg.created_at DESC;
