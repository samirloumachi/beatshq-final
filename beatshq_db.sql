-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Feb 28, 2026 at 09:33 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `beatshq_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `credit_grants`
--

CREATE TABLE `credit_grants` (
  `id` int(11) NOT NULL,
  `grantor_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `amount` int(11) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `credit_grants`
--

INSERT INTO `credit_grants` (`id`, `grantor_id`, `recipient_id`, `amount`, `note`, `created_at`) VALUES
(1, 2, 1, 5, 'demo', '2026-02-16 02:24:01'),
(2, 2, 3, 50, 'class demo', '2026-02-16 05:47:00');

-- --------------------------------------------------------

--
-- Table structure for table `samples`
--

CREATE TABLE `samples` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'sample',
  `credits` int(11) NOT NULL DEFAULT 1,
  `bpm` int(11) DEFAULT NULL,
  `pack_id` int(11) NOT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `samples`
--

INSERT INTO `samples` (`id`, `title`, `filename`, `type`, `credits`, `bpm`, `pack_id`, `uploaded_by`, `upload_date`) VALUES
(2, 'Without Restrictions', 'without_restrictions.mp3', 'track', 3, 120, 1, 2, '2026-02-01 05:46:28'),
(3, 'Basketball', 'basketball.mp3', 'track', 3, 140, 2, 2, '2026-02-01 07:07:25'),
(4, 'King Around Here', 'king_around_here.mp3', 'track', 3, 140, 8, 2, '2026-02-09 04:18:13'),
(5, 'Power & Motivation', 'power___motivation.mp3', 'track', 3, 83, 8, 2, '2026-02-09 04:40:47'),
(6, 'Bombshell Rock', 'bombshell_rock.mp3', 'track', 3, 96, 8, 2, '2026-02-09 04:42:40'),
(7, 'Energy Rock', 'energy_rock.mp3', 'track', 3, 116, 8, 2, '2026-02-09 04:43:50'),
(8, 'Background Jazz', 'jazz_background.mp3', 'track', 3, 100, 7, 2, '2026-02-09 04:44:49'),
(9, 'Cafe Jazz', 'cafe_jazz.mp3', 'track', 3, 125, 7, 2, '2026-02-09 04:45:41'),
(10, 'Calm Night Jazz', 'calm_night_jazz.mp3', 'track', 3, 104, 7, 2, '2026-02-09 04:46:38'),
(11, 'Sunset Jazz', 'sunset_jazz.mp3', 'track', 3, 119, 7, 2, '2026-02-09 04:47:46'),
(12, 'Fashion House', 'fashion_house.mp3', 'track', 3, 120, 1, 2, '2026-02-09 07:45:11'),
(13, 'Lounge House', 'lounge_house.mp3', 'track', 3, 106, 1, 2, '2026-02-09 07:47:56'),
(14, 'Amapiano Vibez', 'amapiano_vibez.mp3', 'track', 3, 113, 3, 2, '2026-02-09 08:00:09'),
(15, 'Bambelela', 'bambelela.mp3', 'track', 3, 113, 3, 2, '2026-02-09 08:01:48'),
(16, 'Long Weekend', 'long_weekend.mp3', 'track', 3, 112, 2, 2, '2026-02-09 08:04:03'),
(17, 'Jungle Waves', 'jungle_waves.mp3', 'track', 3, 170, 4, 2, '2026-02-09 08:10:47'),
(18, 'Hyper Garden', 'hyper_garden.mp3', 'track', 3, 87, 4, 2, '2026-02-09 08:11:36'),
(19, 'Neon Sky', 'neon_sky.mp3', 'track', 3, 171, 4, 2, '2026-02-09 08:13:00'),
(20, 'Hip-Hop Funk', 'hip_hop_funk.mp3', 'track', 3, 180, 2, 2, '2026-02-09 08:15:15'),
(21, 'Hip-Hop Funk Drum Loop', 'hip_hop_funk_drum_loop.mp3', 'loop', 2, 90, 10, 2, '2026-02-09 08:21:08'),
(22, 'Relaxing Guitar Loop', 'relaxing_guitar_loop.mp3', 'loop', 2, 84, 10, 2, '2026-02-09 08:22:12'),
(23, 'Kick One-Shot', 'kick_one_shot.mp3', 'sample', 1, NULL, 11, 2, '2026-02-09 08:23:05'),
(24, 'TR-808 Clap', 'tr_808_clap.mp3', 'sample', 1, NULL, 11, 2, '2026-02-09 08:23:49'),
(25, 'Music Track 1', 'music_track_1.wav', 'track', 3, 120, 12, 2, '2026-02-16 05:53:03');

-- --------------------------------------------------------

--
-- Table structure for table `sample_downloads`
--

CREATE TABLE `sample_downloads` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `sample_id` int(11) NOT NULL,
  `credits_spent` int(11) NOT NULL,
  `downloaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sample_downloads`
--

INSERT INTO `sample_downloads` (`id`, `user_id`, `sample_id`, `credits_spent`, `downloaded_at`) VALUES
(1, 2, 2, 3, '2026-02-01 05:49:33'),
(2, 2, 3, 3, '2026-02-01 07:08:06'),
(3, 2, 4, 3, '2026-02-09 06:58:37'),
(4, 2, 5, 3, '2026-02-09 06:58:37'),
(5, 2, 6, 3, '2026-02-09 06:58:37'),
(6, 2, 7, 3, '2026-02-09 06:58:37'),
(7, 2, 8, 3, '2026-02-09 07:09:26'),
(8, 2, 9, 3, '2026-02-09 07:09:26'),
(9, 2, 10, 3, '2026-02-09 07:09:26'),
(10, 2, 11, 3, '2026-02-09 07:09:26'),
(11, 2, 12, 3, '2026-02-09 07:51:27'),
(12, 2, 13, 3, '2026-02-09 07:51:27'),
(13, 3, 7, 3, '2026-02-16 05:48:32'),
(14, 3, 4, 3, '2026-02-16 05:48:38'),
(15, 3, 5, 3, '2026-02-16 05:48:38'),
(16, 3, 6, 3, '2026-02-16 05:48:38'),
(17, 3, 21, 2, '2026-02-16 05:50:20'),
(18, 3, 22, 2, '2026-02-16 05:50:20');

-- --------------------------------------------------------

--
-- Table structure for table `sample_packs`
--

CREATE TABLE `sample_packs` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `genre` varchar(100) DEFAULT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sample_packs`
--

INSERT INTO `sample_packs` (`id`, `name`, `description`, `genre`, `cover_image`, `created_by`, `created_at`) VALUES
(1, 'House Tracks', 'A curated collection of full-length house music tracks driven by groove, rhythm, and melody. Designed for DJs, producers, and creators, these tracks are ready for club play, mixes, videos, and commercial projects.', 'House', 'house-tracks.jpg', 2, '2026-02-01 05:40:54'),
(2, 'Hip-Hop Tracks', 'A curated collection of full-length hip hop tracks featuring modern and classic influences. Perfect for artists, creators, and media projects, with ready-to-use songs suited for music releases, videos, and commercial use.', 'Hip-Hop', 'hip-hop-tracks.jpg', 2, '2026-02-01 07:02:12'),
(3, 'Amapiano Tracks', 'A curated collection of full-length Amapiano tracks featuring deep grooves and contemporary influences. Perfect for artists, creators, and media projects, with ready-to-use songs suited for music releases, videos, and commercial use.', 'Amapiano', 'amapiano-tracks.jpg', 2, '2026-02-04 07:18:07'),
(4, 'Drum & Bass Tracks', 'A curated collection of full-length drum & bass tracks featuring high-energy rhythms and modern influences. Perfect for artists, creators, and media projects, with ready-to-use songs suited for music releases, videos, and commercial use.', 'Drum & Bass', 'drum-bass-tracks.jpg', 2, '2026-02-04 07:20:35'),
(7, 'Jazz Tracks', 'A curated collection of full-length jazz tracks featuring rich harmonies and timeless influences. Perfect for artists, creators, and media projects, with ready-to-use songs suited for music releases, videos, and commercial use.', 'Jazz', 'jazz-tracks.jpg', 2, '2026-02-09 03:17:55'),
(8, 'Rock Tracks', 'A curated collection of full-length rock tracks featuring powerful energy and classic influences. Perfect for artists, creators, and media projects, with ready-to-use songs suited for music releases, videos, and commercial use.', 'Rock', 'rock-tracks.jpg', 2, '2026-02-09 04:12:25'),
(10, 'Loops Kit', 'A curated collection of high-quality loops spanning multiple styles and genres, featuring drums, basslines, melodies, and textures. Perfect for producers and creators, with ready-to-use sounds designed for fast workflow, inspiration, and professional music production.', 'Multi', 'loops-kit.png', 2, '2026-02-09 08:17:42'),
(11, 'One-Shots Kit', 'A curated collection of high-quality one-shots spanning multiple styles and genres, featuring drums, bass, melodic hits, and sound effects. Perfect for producers and creators, with ready-to-use sounds designed for fast workflow, inspiration, and professional music production.', 'Multi', 'one-shots-kit.png', 2, '2026-02-09 08:19:10'),
(12, 'Brent\'s Drum Pack', 'This is my friend\'s funk drum kit.', 'Funk', 'brent-s-drum-pack.jpg', 2, '2026-02-16 05:51:45');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `salt` varchar(255) NOT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `credits` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `salt`, `is_admin`, `credits`, `created_at`) VALUES
(1, 'samirpc', 'samirpc@gmail.com', 'dc48399603b3b689f1e2d6d476a60c3d1bfb5c48487403b1c51993551194bced79c9a36d75ed2798c9a540c5e1e94f9047bc14d26a0f4c9e79aeccaac1850267', '066d9f5cee60fce4682c27e81af827e5', 0, 5, '2026-02-01 04:26:23'),
(2, 'samir', 'admin@beatshq.com', 'f237f848fdedf442ec3fad0064a8b9affed9b93266f6034f9f618e2ef4c7f21155040cc76a4ae8f6ae1721d8db365d77d98afd8b6735e2370b4abc2ef2e5ec18', '2457f59ffafb2219d59907e164294a3e', 1, 964, '2026-02-01 04:27:39'),
(3, 'test', 'test@gmail.com', '07e2cbe62e1e2e697f73b149b8bcbf4e51ec66cbd68b7363adb3b860711ddb4239fbaadb7f7c83bc6a97c6587d09d04c17fb89cf2c8e4403200153679784ff76', '7c0ccb1316b0afcab363b4e38b01b3e3', 0, 34, '2026-02-16 05:45:24');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `credit_grants`
--
ALTER TABLE `credit_grants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_credit_grants_grantor` (`grantor_id`),
  ADD KEY `idx_credit_grants_recipient` (`recipient_id`),
  ADD KEY `idx_credit_grants_created` (`created_at`);

--
-- Indexes for table `samples`
--
ALTER TABLE `samples`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_samples_pack` (`pack_id`),
  ADD KEY `idx_samples_uploader` (`uploaded_by`);

--
-- Indexes for table `sample_downloads`
--
ALTER TABLE `sample_downloads`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_sample` (`user_id`,`sample_id`),
  ADD KEY `idx_downloads_user` (`user_id`),
  ADD KEY `idx_downloads_sample` (`sample_id`);

--
-- Indexes for table `sample_packs`
--
ALTER TABLE `sample_packs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_packs_creator` (`created_by`),
  ADD KEY `idx_packs_genre` (`genre`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `credit_grants`
--
ALTER TABLE `credit_grants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `samples`
--
ALTER TABLE `samples`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `sample_downloads`
--
ALTER TABLE `sample_downloads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `sample_packs`
--
ALTER TABLE `sample_packs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `credit_grants`
--
ALTER TABLE `credit_grants`
  ADD CONSTRAINT `credit_grants_ibfk_1` FOREIGN KEY (`grantor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `credit_grants_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `samples`
--
ALTER TABLE `samples`
  ADD CONSTRAINT `samples_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `samples_ibfk_2` FOREIGN KEY (`pack_id`) REFERENCES `sample_packs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sample_downloads`
--
ALTER TABLE `sample_downloads`
  ADD CONSTRAINT `sample_downloads_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sample_downloads_ibfk_2` FOREIGN KEY (`sample_id`) REFERENCES `samples` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sample_packs`
--
ALTER TABLE `sample_packs`
  ADD CONSTRAINT `sample_packs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
