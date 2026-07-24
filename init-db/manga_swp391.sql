-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql:3306
-- Generation Time: Jul 19, 2026 at 09:29 AM
-- Server version: 8.0.46
-- PHP Version: 8.3.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `manga_swp391`
--

-- --------------------------------------------------------

--
-- Table structure for table `assets`
--

CREATE TABLE `assets` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `uploaded_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `series_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_type` enum('reference','brush','screentone','font','character_sheet','background_ref') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `actor_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `before_data` json DEFAULT NULL,
  `after_data` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `board_votes`
--

CREATE TABLE `board_votes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `submission_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `voter_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vote` enum('yes','no','abstain') COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `voted_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `board_votes`
--

INSERT INTO `board_votes` (`id`, `submission_id`, `voter_id`, `vote`, `comment`, `voted_at`) VALUES
('1233d993-76dd-45c7-9f60-a785aa1c18e8', '58ce5921-08e1-4f35-8ffa-b9722fc61e15', '6c8c44ae-ba6f-40b0-9478-c33ac9aae5e4', 'yes', 'Câu chuyện khép lại với việc Naruto kết hôn cùng Hinata và có hai người con, trong đó cậu con trai cả Boruto là nhân vật chính tiếp nối thế hệ.Để hiểu sâu hơn về toàn bộ diễn biến, hành trình trưởng thành của các nhân vật và những bí ẩn của thế giới ninja, video sau sẽ là tóm tắt lý tưởng:', '2026-07-18 13:44:48.237770'),
('3df30d32-2706-4802-823b-870531f84a4e', '04307b1b-5b78-49bc-b141-afdbbc9d8e6a', '5808322c-625e-11f1-af1c-82b638d82996', 'yes', 'Không tìm thấy publish_schedule trong bảng lookup: biweekly', '2026-07-18 07:47:16.320628'),
('5871690c-2ac4-4a6c-8d9c-16e08bf6de8a', '58ce5921-08e1-4f35-8ffa-b9722fc61e15', '5808322c-625e-11f1-af1c-82b638d82996', 'no', 'Để hiểu sâu hơn về toàn bộ diễn biến, hành trình trưởng thành của các nhân vật và những bí ẩn của thế giới ninja, video sau sẽ là tóm tắt lý tưởng', '2026-07-19 02:41:33.741126'),
('7a5d467a-ba10-4f86-800e-7fdb6096fd97', '58ce5921-08e1-4f35-8ffa-b9722fc61e15', '58081b7c-625e-11f1-af1c-82b638d82996', 'no', 'Câu chuyện khép lại với việc Naruto kết hôn cùng Hinata và có hai người con, trong đó cậu con trai cả Boruto là nhân vật chính tiếp nối thế hệ.Để hiểu sâu hơn về toàn bộ diễn biến, hành trình trưởng thành của các nhân vật và những bí ẩn của thế giới ninja, video sau sẽ là tóm tắt lý tưởng:', '2026-07-18 13:45:08.072298'),
('a54757b5-8ee3-44d0-9b37-e78ed78f97ad', '04307b1b-5b78-49bc-b141-afdbbc9d8e6a', '58081b7c-625e-11f1-af1c-82b638d82996', 'no', 'Giới phê bình thường mô tả Blue Lock là một tác phẩm \"Phản Shōnen\" (Anti-Shōnen) hoặc \"Trò chơi sinh tử trong bóng đá\" (Sports Death Game).[90] Rebecca Silverman từ Anime News Network nhận định tác phẩm đã tách mình khỏi khuôn mẫu \"sức mạnh tình bạn\" thường thấy trong manga thể thao truyền thống để khai thác góc nhìn đen tối và thực tế hơn về sự cạnh tranh cá nhân.', '2026-07-18 07:26:03.927379'),
('ce03524d-d307-41eb-be1f-ccb892f4b391', '04307b1b-5b78-49bc-b141-afdbbc9d8e6a', '6c8c44ae-ba6f-40b0-9478-c33ac9aae5e4', 'yes', 'Blue Lock được Kaneshiro Muneyuki viết kịch bản và được Nomura Yūsuke đảm nhận phần vẽ minh hoạ. Bộ truyện đã được đăng trên Tuần san Shōnen Magazine của Kodansha từ ngày 1 tháng 8 năm 2018 cho đến nay.[4] Kodansha đã phân chia các chương của bộ truyện thành các tập tankōbon riêng lẻ với tập đầu tiên được phát hành vào ngày 16 tháng 11 năm 2018. Tính đến ngày 17 tháng 6 năm 2026, bộ truyện đã phát hành được 39 tập. \n', '2026-07-18 07:09:25.399343');

-- --------------------------------------------------------

--
-- Table structure for table `chapters`
--

CREATE TABLE `chapters` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `series_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chapter_number` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('in_progress','pending_review','editor_review','approved','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_progress',
  `deadline` date DEFAULT NULL,
  `published_at` date DEFAULT NULL,
  `total_pages` int NOT NULL DEFAULT '0',
  `completed_pages` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chapters`
--

INSERT INTO `chapters` (`id`, `series_id`, `chapter_number`, `title`, `status`, `deadline`, `published_at`, `total_pages`, `completed_pages`, `created_at`, `updated_at`, `deleted_at`, `notes`) VALUES
('6b680df0-e7de-496c-940f-23823d7220c7', '96fdc757-ae7f-4fcf-aa60-051a85d56eb9', 1, 'Khởi đầu của Blue Lock', 'in_progress', '2026-07-23', NULL, 2, 0, '2026-07-18 12:07:40.689444', '2026-07-18 12:08:08.628629', NULL, '');

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `author_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` enum('page','chapter','manuscript','panel_task') COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `annotation_data` json DEFAULT NULL,
  `parent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_resolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolved_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `editorial_actions`
--

CREATE TABLE `editorial_actions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `series_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `decided_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_type_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `effective_date` date NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `editorial_action_types`
--

CREATE TABLE `editorial_action_types` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `editorial_action_types`
--

INSERT INTO `editorial_action_types` (`id`, `name`, `description`) VALUES
('0b478d27-63ce-11f1-8e85-b22bcecafffa', 'approve_series', 'Duyệt series'),
('0b479f1a-63ce-11f1-8e85-b22bcecafffa', 'cancel_series', 'Hủy series'),
('0b47a814-63ce-11f1-8e85-b22bcecafffa', 'change_schedule', 'Đổi lịch xuất bản'),
('0b47acc2-63ce-11f1-8e85-b22bcecafffa', 'put_on_hiatus', 'Tạm ngưng'),
('0b47b23d-63ce-11f1-8e85-b22bcecafffa', 'resume_publishing', 'Tiếp tục xuất bản'),
('0b47b7ca-63ce-11f1-8e85-b22bcecafffa', 'override_ranking', 'Ghi đè xếp hạng');

-- --------------------------------------------------------

--
-- Table structure for table `editorial_proposals`
--

CREATE TABLE `editorial_proposals` (
  `id` varchar(255) NOT NULL,
  `action_type` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `decided_at` datetime(6) DEFAULT NULL,
  `new_schedule` varchar(255) DEFAULT NULL,
  `proposed_by` varchar(255) NOT NULL,
  `reason` text NOT NULL,
  `series_id` varchar(255) NOT NULL,
  `status` enum('voting','approved','rejected') NOT NULL,
  `vote_abstain` int NOT NULL,
  `vote_no` int NOT NULL,
  `vote_yes` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `editorial_votes`
--

CREATE TABLE `editorial_votes` (
  `id` varchar(255) NOT NULL,
  `comment` text,
  `proposal_id` varchar(255) NOT NULL,
  `vote` enum('yes','no','abstain') NOT NULL,
  `voted_at` datetime(6) NOT NULL,
  `voter_id` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `manuscripts`
--

CREATE TABLE `manuscripts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `series_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','submitted','under_review','approved','rejected','revision_requested','publishing') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime(6) DEFAULT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `manuscripts`
--

INSERT INTO `manuscripts` (`id`, `series_id`, `submitted_by`, `version`, `file_url`, `description`, `status`, `rejection_reason`, `submitted_at`, `reviewed_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
('79c46d64-9969-4028-931e-d1afbca679ab', '36db2def-8405-478f-b000-a6f930ed11d6', 'a673055d-40f5-4769-93d1-e977fdac5462', 1, 'pending_upload', '\n[Target]: teens\n[Schedule]: weekly\n[Characters]: ', 'rejected', NULL, '2026-07-18 13:20:52.039039', '2026-07-18 13:44:02.628306', '2026-07-18 13:20:52.080208', '2026-07-19 02:41:33.764596', NULL),
('d74ea2f2-9e94-434d-aeee-befb19a8d69d', '96fdc757-ae7f-4fcf-aa60-051a85d56eb9', 'a673055d-40f5-4769-93d1-e977fdac5462', 1, 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/manuscripts/d6f9a49b-1890-4888-a035-21ae479d9c00.jpg', '\n[Target]: teens\n[Schedule]: weekly\n[Characters]: ', 'publishing', NULL, '2026-07-18 07:05:46.195558', '2026-07-18 07:09:05.082759', '2026-07-18 07:05:46.234598', '2026-07-18 07:47:16.372666', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `manuscript_annotations`
--

CREATE TABLE `manuscript_annotations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `manuscript_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `editor_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `x` double DEFAULT NULL,
  `y` double DEFAULT NULL,
  `page_number` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `manuscript_pages`
--

CREATE TABLE `manuscript_pages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manuscript_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_number` int NOT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail_url` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `manuscript_pages`
--

INSERT INTO `manuscript_pages` (`id`, `manuscript_id`, `page_number`, `image_url`, `thumbnail_url`, `notes`, `created_at`) VALUES
('4a38792a-283f-4592-b652-dcd72df3e63d', '79c46d64-9969-4028-931e-d1afbca679ab', 2, 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/manuscripts/79c46d64-9969-4028-931e-d1afbca679ab/pages/d1f554c0-0f44-4497-ad68-980f6c9b65f8.png', 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/manuscripts/79c46d64-9969-4028-931e-d1afbca679ab/pages/thumbnails/thumb_600592fc-24d9-4d56-95ad-e618b748fdcc.jpg', NULL, '2026-07-18 13:20:57.650144'),
('6c24fd7b-73e2-4576-aa84-4e187a8e2772', '79c46d64-9969-4028-931e-d1afbca679ab', 1, 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/manuscripts/79c46d64-9969-4028-931e-d1afbca679ab/pages/d1e84ff4-37bd-40a0-a328-8af98640f96f.jpg', 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/manuscripts/79c46d64-9969-4028-931e-d1afbca679ab/pages/thumbnails/thumb_b189fb64-87b2-4cb7-b174-8944edda50d2.jpg', NULL, '2026-07-18 13:20:57.645145');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `type` enum('task_assigned','task_approved','revision_requested','deadline_warning','series_at_risk','poll_updated','series_cancelled','submission_result') COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `notification_type_id`, `reference_id`, `reference_type`, `message`, `is_read`, `read_at`, `created_at`, `type`) VALUES
('bb81708b-976a-426e-9790-f5c21f5bb18b', 'a673055d-40f5-4769-93d1-e977fdac5462', '028d531b-63ce-11f1-8e85-b22bcecafffa', '36db2def-8405-478f-b000-a6f930ed11d6', 'series', 'Series \"Naruto\" đã bị Hội đồng biên tập từ chối. Bạn có thể cập nhật và nộp lại.', 0, NULL, '2026-07-19 02:41:33.752061', 'submission_result');

-- --------------------------------------------------------

--
-- Table structure for table `notification_types`
--

CREATE TABLE `notification_types` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notification_types`
--

INSERT INTO `notification_types` (`id`, `name`, `description`) VALUES
('028d3840-63ce-11f1-8e85-b22bcecafffa', 'task_assigned', 'Task được giao'),
('028d48b0-63ce-11f1-8e85-b22bcecafffa', 'task_approved', 'Task được duyệt'),
('028d4b4e-63ce-11f1-8e85-b22bcecafffa', 'revision_requested', 'Yêu cầu chỉnh sửa'),
('028d4c6b-63ce-11f1-8e85-b22bcecafffa', 'deadline_warning', 'Cảnh báo deadline'),
('028d4db9-63ce-11f1-8e85-b22bcecafffa', 'series_at_risk', 'Series nguy cơ bị hủy'),
('028d4f52-63ce-11f1-8e85-b22bcecafffa', 'poll_updated', 'Cập nhật poll'),
('028d50ba-63ce-11f1-8e85-b22bcecafffa', 'series_cancelled', 'Series bị hủy'),
('028d531b-63ce-11f1-8e85-b22bcecafffa', 'submission_result', 'Kết quả xét duyệt');

-- --------------------------------------------------------

--
-- Table structure for table `pages`
--

CREATE TABLE `pages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `chapter_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_number` int NOT NULL,
  `raw_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `final_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','in_progress','completed','reviewing','approved','revision_needed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `mangaka_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pages`
--

INSERT INTO `pages` (`id`, `chapter_id`, `page_number`, `raw_file_url`, `final_file_url`, `status`, `mangaka_notes`, `created_at`, `updated_at`, `image_url`, `notes`, `thumbnail_url`, `deleted_at`) VALUES
('86078d9d-f2f2-4ac2-83a2-bca51237eb96', '6b680df0-e7de-496c-940f-23823d7220c7', 2, 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/chapters/6b680df0-e7de-496c-940f-23823d7220c7/pages/356a0111-136f-45cf-8df7-515374b3053e.jpg', 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/chapters/6b680df0-e7de-496c-940f-23823d7220c7/pages/thumbnails/thumb_854b4ef1-5cc9-4e3a-ab52-66099b76c29d.jpg', 'in_progress', 'PDF trang 2', '2026-07-18 12:08:08.618417', '2026-07-18 12:08:08.618417', NULL, NULL, NULL, NULL),
('971d8e18-a716-4c78-bc22-7f4f8b0a14ed', '6b680df0-e7de-496c-940f-23823d7220c7', 1, 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/chapters/6b680df0-e7de-496c-940f-23823d7220c7/pages/44240300-5a56-40f3-850e-a74b9fb105b3.jpg', 'https://cusp-zoology-tightness.ngrok-free.dev/uploads/chapters/6b680df0-e7de-496c-940f-23823d7220c7/pages/thumbnails/thumb_7609988c-65dd-4755-b15d-60e215b4499c.jpg', 'in_progress', 'PDF trang 1', '2026-07-18 12:08:08.614564', '2026-07-18 12:08:08.614564', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `panel_tasks`
--

CREATE TABLE `panel_tasks` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `page_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_to` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `task_type_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `panel_region` json DEFAULT NULL,
  `priority_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','in_progress','submitted','approved','revision_needed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `revision_notes` text COLLATE utf8mb4_unicode_ci,
  `result_file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_amount` decimal(10,2) DEFAULT NULL,
  `is_paid` tinyint(1) NOT NULL DEFAULT '0',
  `due_date` datetime(6) DEFAULT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `approved_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_type` enum('background','shading','effect','screentone','dialog','touch_up','other') COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiry_date` datetime(6) NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_records`
--

CREATE TABLE `payment_records` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `assistant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `panel_task_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `status` enum('pending','approved','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_month` date NOT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `priorities`
--

CREATE TABLE `priorities` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` int NOT NULL DEFAULT '0',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `priorities`
--

INSERT INTO `priorities` (`id`, `name`, `level`, `description`) VALUES
('f775fd9c-63cd-11f1-8e85-b22bcecafffa', 'low', 1, 'Ưu tiên thấp'),
('f7762654-63cd-11f1-8e85-b22bcecafffa', 'normal', 2, 'Bình thường'),
('f7762d9c-63cd-11f1-8e85-b22bcecafffa', 'high', 3, 'Ưu tiên cao'),
('f776307b-63cd-11f1-8e85-b22bcecafffa', 'urgent', 4, 'Khẩn cấp');

-- --------------------------------------------------------

--
-- Table structure for table `publish_schedules`
--

CREATE TABLE `publish_schedules` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `publish_schedules`
--

INSERT INTO `publish_schedules` (`id`, `name`, `description`) VALUES
('1282e9d2-63ce-11f1-8e85-b22bcecafffa', 'weekly', 'Hàng tuần'),
('1282f9fa-63ce-11f1-8e85-b22bcecafffa', 'monthly', 'Hàng tháng'),
('d894b070-827c-11f1-8200-da906409cc8f', 'biweekly', 'Hai tuần một lần');

-- --------------------------------------------------------

--
-- Table structure for table `reader_polls`
--

CREATE TABLE `reader_polls` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `series_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entered_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `poll_period` int NOT NULL,
  `poll_year` int NOT NULL,
  `rank_position` int NOT NULL,
  `vote_count` int NOT NULL DEFAULT '0',
  `reader_score` double DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `poll_date` date NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `reader_vote_count` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `description`) VALUES
('dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'mangaka', 'Tác giả manga'),
('dcd2e6ad-63cd-11f1-8e85-b22bcecafffa', 'assistant', 'Trợ lý sản xuất'),
('dcd2f773-63cd-11f1-8e85-b22bcecafffa', 'editor', 'Biên tập viên'),
('dcd2fae8-63cd-11f1-8e85-b22bcecafffa', 'board_member', 'Thành viên Hội đồng'),
('dcd30051-63cd-11f1-8e85-b22bcecafffa', 'admin', 'Quản trị viên');

-- --------------------------------------------------------

--
-- Table structure for table `series`
--

CREATE TABLE `series` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `mangaka_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `editor_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `synopsis` text COLLATE utf8mb4_unicode_ci,
  `genre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','under_editorial_review','submitted','approved','publishing','on_hiatus','rejected','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `publish_schedule_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cover_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_rank` int DEFAULT NULL,
  `previous_rank` int DEFAULT NULL,
  `cancellation_risk` tinyint(1) NOT NULL DEFAULT '0',
  `approved_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  `cover_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `schedule` enum('weekly','monthly','one_shot') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publish_schedule` enum('weekly','biweekly','monthly') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publish_start_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `series`
--

INSERT INTO `series` (`id`, `mangaka_id`, `editor_id`, `title`, `slug`, `synopsis`, `genre`, `status`, `publish_schedule_id`, `cover_image_url`, `current_rank`, `previous_rank`, `cancellation_risk`, `approved_at`, `created_at`, `updated_at`, `deleted_at`, `cover_url`, `schedule`, `publish_schedule`, `publish_start_date`) VALUES
('36db2def-8405-478f-b000-a6f930ed11d6', 'a673055d-40f5-4769-93d1-e977fdac5462', 'aa907671-4745-49be-8a52-22366ee81822', 'Naruto', 'naruto-1784380845409', 'Naruto là câu chuyện về Uzumaki Naruto, một cậu bé mồ côi bị Làng Lá xa lánh do mang trong mình Cửu Vĩ hồ ly. Bất chấp sự kỳ thị, cậu nuôi ước mơ trở thành Hokage để được mọi người công nhận. Trải qua nhiều trận chiến sinh tử và huấn luyện khắc nghiệt, cậu cùng bạn bè đánh bại tổ chức khủng bố Akatsuki và kết thúc Đại chiến Nhẫn giả lần thứ tư, cuối cùng hoàn thành tâm nguyện trở thành Hokage đệ Thất', 'Action', 'rejected', NULL, NULL, NULL, NULL, 0, NULL, '2026-07-18 13:20:45.415651', '2026-07-19 08:35:39.364017', NULL, NULL, NULL, NULL, NULL),
('96fdc757-ae7f-4fcf-aa60-051a85d56eb9', 'a673055d-40f5-4769-93d1-e977fdac5462', '6188b2aa-6002-11f1-9f66-0290164f7f47', 'Blue Lock', 'blue-lock-1784358337263', 'Blue Lock (Nhật: ブルーロック Hepburn: Burū Rokku?) là một bộ shounen manga mang đề tài bóng đá được viết bởi Kaneshiro Muneyuki và minh họa bởi Nomura Yūsuke. Bắt đầu từ tháng 8 năm 2018, bộ truyện được đăng định kì trên Tuần san Shounen Magazine của nhà xuất bản Kodansha. Tính đến ngày 9 tháng 6 năm 2026, bộ truyện đã phát hành vượt mốc 60 triệu bản trên toàn thế giới. Anime chuyển thể từ truyện do Eight Bit sản xuất bắt đầu lên sóng từ tháng 10 năm 2022 đến tháng 3 năm 2023; mùa thứ hai dự kiến lên sóng vào tháng 10 năm 2024. Ngày 15 tháng 1 năm 2022, bộ truyện đã được Nhà xuất bản Kim Đồng công bố bản quyền tiếng Việt và được ấn định lịch phát hành vào đầu năm 2023 tại thị trường Việt Nam.\r\n', 'Sports', 'publishing', 'd894b070-827c-11f1-8200-da906409cc8f', NULL, NULL, NULL, 0, '2026-07-18 07:47:16.285849', '2026-07-18 07:05:37.272234', '2026-07-18 07:47:16.536969', NULL, NULL, NULL, 'biweekly', '2026-07-23');

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `manuscript_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submission_round` int NOT NULL DEFAULT '1',
  `cover_letter` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','voting','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `vote_yes` int NOT NULL DEFAULT '0',
  `vote_no` int NOT NULL DEFAULT '0',
  `vote_abstain` int NOT NULL DEFAULT '0',
  `voting_deadline` datetime(6) DEFAULT NULL,
  `decided_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `audience_summary` text COLLATE utf8mb4_unicode_ci,
  `marketing_angle` text COLLATE utf8mb4_unicode_ci,
  `why_it_will_sell` text COLLATE utf8mb4_unicode_ci,
  `editor_note` text COLLATE utf8mb4_unicode_ci,
  `recommended_schedule` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `submissions`
--

INSERT INTO `submissions` (`id`, `manuscript_id`, `submitted_by`, `submission_round`, `cover_letter`, `status`, `vote_yes`, `vote_no`, `vote_abstain`, `voting_deadline`, `decided_at`, `created_at`, `updated_at`, `audience_summary`, `marketing_angle`, `why_it_will_sell`, `editor_note`, `recommended_schedule`) VALUES
('04307b1b-5b78-49bc-b141-afdbbc9d8e6a', 'd74ea2f2-9e94-434d-aeee-befb19a8d69d', '6188b2aa-6002-11f1-9f66-0290164f7f47', 2, '', 'approved', 2, 1, 0, '2026-07-25 07:09:05.144805', '2026-07-18 07:47:16.266533', '2026-07-18 07:09:05.147722', '2026-07-18 07:47:16.338662', 'Nam', '', 'Sau thất bại thảm hại tại World Cup 2018, đội tuyển Nhật Bản gặp nhiều khó khăn trong việc hội quân trở lại. Một câu hỏi được đặt ra, rốt cuộc họ còn thiếu điều gì để giành được chức vô địch? Đội tuyển Nhật Bản có đầy đủ tố chất nhưng cuối cùng, họ nhận ra họ thiếu đi người tiền đạo chủ lực có thể dẫn dắt họ \"chạm tay\" vào chiến thắng. Vì thế, Hiệp hội bóng đá Nhật Bản cho ra đời \"Dự án Blue Lock\" tập hợp 300 tiền đạo trẻ xuất sắc nhất từ khắp nơi trên đất nước Nhật Bản. Mục đích của dự án này là tạo ra một và chỉ duy nhất một tiền đạo luôn \"khát\" bàn thắng và \"thèm muốn\" chiến thắng hơn bất kì ai, người có thể tạo bước ngoặt quyết định để xoay chuyển cả trận đấu... \"Cái tôi\" nào đủ nổi bật để giành lấy vị trí độc nhất đó? Và liệu 300 cậu trai trẻ có thể vượt qua tất cả những thử thách đang cản đường họ? ', '', 'biweekly'),
('58ce5921-08e1-4f35-8ffa-b9722fc61e15', '79c46d64-9969-4028-931e-d1afbca679ab', 'aa907671-4745-49be-8a52-22366ee81822', 2, '', 'rejected', 1, 2, 0, '2026-07-25 13:44:02.714381', '2026-07-19 02:41:33.713613', '2026-07-18 13:44:02.788638', '2026-07-19 02:41:33.756772', 'Nam 15+', '', 'Phần 1: Naruto cùng Sasuke và Sakura lập thành Đội 7 dưới sự dẫn dắt của thầy Kakashi. Trong khi Naruto không ngừng tiến bộ, người bạn thiên tài Sasuke lại bị ám ảnh bởi việc trả thù anh trai mình và quyết định rời Làng Lá để tìm kiếm sức mạnh từ kẻ ác Orochimaru. Naruto thề sẽ mang bạn mình trở về.', '', 'biweekly'),
('8f377645-b95b-4a74-babb-9ea7b47789ed', 'd74ea2f2-9e94-434d-aeee-befb19a8d69d', 'a673055d-40f5-4769-93d1-e977fdac5462', 1, '', 'pending', 0, 0, 0, '2026-07-25 07:05:46.250379', NULL, '2026-07-18 07:05:46.255384', '2026-07-18 07:05:46.255384', NULL, NULL, NULL, NULL, NULL),
('ec8d7569-821f-4759-b737-eb3a15a21f0f', '79c46d64-9969-4028-931e-d1afbca679ab', 'a673055d-40f5-4769-93d1-e977fdac5462', 1, '', 'pending', 0, 0, 0, '2026-07-25 13:20:52.843966', NULL, '2026-07-18 13:20:52.845965', '2026-07-18 13:20:52.846965', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `task_types`
--

CREATE TABLE `task_types` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `task_types`
--

INSERT INTO `task_types` (`id`, `name`, `description`) VALUES
('e5115b9f-63cd-11f1-8e85-b22bcecafffa', 'background', 'Vẽ nền'),
('e511706c-63cd-11f1-8e85-b22bcecafffa', 'shading', 'Tô bóng'),
('e51176a2-63cd-11f1-8e85-b22bcecafffa', 'effect', 'Hiệu ứng'),
('e5117c5f-63cd-11f1-8e85-b22bcecafffa', 'screentone', 'Screentone'),
('e5117f62-63cd-11f1-8e85-b22bcecafffa', 'dialog', 'Hộp thoại'),
('e5118281-63cd-11f1-8e85-b22bcecafffa', 'touch_up', 'Chỉnh sửa nhỏ'),
('e51186ca-63cd-11f1-8e85-b22bcecafffa', 'other', 'Khác');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` datetime DEFAULT NULL,
  `personal_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role_id`, `display_name`, `avatar_url`, `is_active`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`, `personal_email`, `name`, `password`) VALUES
('06c502b9-3941-4aee-8090-5af47a9b592b', 'ketahax684_1892', 'ketahax684@5nek.com', '$2a$10$j9MIlq/VMFR.AtRs9LEece9/3bAswOdE9Wl1.mesLJ.USumbfCko2', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'test56', NULL, 1, NULL, '2026-06-05 06:21:12.140685', '2026-06-09 06:38:45.523571', NULL, NULL, NULL, NULL),
('1ad793f5-b799-4c69-b9a3-9be27197a1e3', 'assistant1_8492', 'assistant1@test.com', '$2b$10$7hO80nOPHTu8qYujYNkmTOQ/6468/c.PRlBAi..i8x31PNSlKXuIO', 'dcd2e6ad-63cd-11f1-8e85-b22bcecafffa', 'Yamada Hiroshi', NULL, 1, '2026-07-17 07:28:35', '2026-06-02 12:23:08.739345', '2026-07-17 07:28:35.310805', NULL, NULL, NULL, NULL),
('4253fca7-b425-43d5-9dab-b9a51533e8bb', 'satthutromcho10112003_4327', 'satthutromcho10112003@gmail.com', '$2a$10$s8G9HbcentPX.v/TxYQ6oeOLQhg0N8w4XcfNA3Qz05DF73lXODu16', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'TestUser1234', NULL, 1, '2026-06-05 06:35:56', '2026-06-05 06:34:34.553021', '2026-06-09 06:38:45.523571', NULL, NULL, NULL, NULL),
('48cdae98-9da6-40f8-80f9-7dfe9fda09eb', 'testpersonal_9781', 'testpersonal@company.com', '$2a$10$BwQKDjzQwIDA4YXLwJhP6eDoNhCZoqApS5qsWtnSKvuJWs/vR2ZMC', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'Test Personal', NULL, 1, NULL, '2026-06-14 10:36:49.917710', '2026-06-14 10:36:49.917728', NULL, 'danghuy05022003@gmail.com', NULL, NULL),
('49d8f819-11d5-451c-9225-a132c040c214', 'assistant_8525', 'assistant@gmail.com', '$2a$10$2IeK05c.DG4/RrZ62L3XCeLqckOPZW0cM3qN.jOVOwVSSBlkz8ZnW', 'dcd2e6ad-63cd-11f1-8e85-b22bcecafffa', 'Test Assistant', NULL, 1, '2026-06-21 14:51:19', '2026-06-05 05:43:58.779908', '2026-06-21 14:51:19.443177', NULL, NULL, NULL, NULL),
('58081b7c-625e-11f1-af1c-82b638d82996', 'board2', 'board2@test.com', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd2fae8-63cd-11f1-8e85-b22bcecafffa', 'Board Member 2', NULL, 1, '2026-07-18 13:44:55', '2026-06-07 10:47:56.855197', '2026-07-18 13:44:54.809296', NULL, NULL, NULL, NULL),
('5808322c-625e-11f1-af1c-82b638d82996', 'board3', 'board3@test.com', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd2fae8-63cd-11f1-8e85-b22bcecafffa', 'Board Member 3', NULL, 1, '2026-07-19 02:41:09', '2026-06-07 10:47:56.855197', '2026-07-19 02:41:08.615052', NULL, NULL, NULL, NULL),
('6188b2aa-6002-11f1-9f66-0290164f7f47', 'editor1', 'editor1@test.com', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd2f773-63cd-11f1-8e85-b22bcecafffa', 'Editor Test 1', NULL, 1, '2026-07-18 13:17:28', '2026-06-04 10:44:36.773987', '2026-07-18 13:17:28.033882', NULL, NULL, NULL, NULL),
('6c8c44ae-ba6f-40b0-9478-c33ac9aae5e4', 'board1_500', 'board1@test.com', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd2fae8-63cd-11f1-8e85-b22bcecafffa', 'Yamamoto Kenji', NULL, 1, '2026-07-18 13:44:09', '2026-06-03 14:47:00.799788', '2026-07-18 13:44:09.152375', NULL, NULL, NULL, NULL),
('80e62b84-721c-40e9-bdaf-42f65f54ea9c', 'yaxaf37679_8586', 'yaxaf37679@herojp.com', '$2a$10$1JtU15VauH.ySM6bFZNyEetRZBJQMiXIWNJ29Bx7xSu/zn/rKoyci', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'TestRun', NULL, 1, NULL, '2026-06-05 06:19:08.965541', '2026-06-09 06:38:45.523571', NULL, NULL, NULL, NULL),
('a673055d-40f5-4769-93d1-e977fdac5462', 'mangaka1_2511', 'mangaka1@test.com', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'Tanaka Kenji', NULL, 1, '2026-07-19 07:42:20', '2026-06-02 12:07:52.808935', '2026-07-19 07:42:20.481520', NULL, NULL, NULL, NULL),
('aa907671-4745-49be-8a52-22366ee81822', 'realtest123_4918', 'realtest123@test.com', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd2f773-63cd-11f1-8e85-b22bcecafffa', 'Editor Test', NULL, 1, '2026-07-18 13:41:50', '2026-06-05 07:31:25.226072', '2026-07-18 13:41:50.349647', NULL, NULL, NULL, NULL),
('b87de735-d18f-44fc-996e-ce55e96a451e', 'testpersonal2_2271', 'testpersonal2@company.com', '$2a$10$NAxmWGd17YTV5CBpnkU.5ehD9riRLsr0R/cD/c4/dmKUAFD/ZaAC.', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'Test Personal 2', NULL, 1, NULL, '2026-06-14 10:42:22.427524', '2026-06-14 10:42:22.427524', NULL, 'danghuy05022003@gmail.com', NULL, NULL),
('c58f7b82-e8fc-4867-ac0a-d7c375a6fe36', 'h02052003aitest_3020', 'h02052003aitest@gmail.com', '$2a$10$pcEWjk2Z9DhCmgw/6yBwKOFRirwuDU7ugm//I7.ad8eSs/2Su2zya', 'dcd2fae8-63cd-11f1-8e85-b22bcecafffa', 'EditorialBoardTest', NULL, 1, '2026-06-08 10:00:40', '2026-06-05 07:16:53.307288', '2026-06-09 06:38:45.523571', NULL, NULL, NULL, NULL),
('e2577f5f-75d0-11f1-a50a-5ef7ed90ec8a', 'seed_mangaka_atrisk', 'seed.mangaka.atrisk@manga-cwpm.local', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'Seed Mangaka (At-Risk Test)', NULL, 1, NULL, '2026-07-02 04:45:43.607561', '2026-07-02 04:45:43.607561', NULL, NULL, 'Seed Mangaka (At-Risk Test)', NULL),
('e25bc290-75d0-11f1-a50a-5ef7ed90ec8a', 'seed_board_atrisk', 'seed.board.atrisk@manga-cwpm.local', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'dcd2fae8-63cd-11f1-8e85-b22bcecafffa', 'Seed Board Member (At-Risk Test)', NULL, 1, NULL, '2026-07-02 04:45:43.650507', '2026-07-02 04:45:43.650507', NULL, NULL, 'Seed Board Member (At-Risk Test)', NULL),
('e69123ea-f57e-4f7b-9150-7dd87623d646', 'neweditor_9668', 'neweditor@company.com', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd2f773-63cd-11f1-8e85-b22bcecafffa', 'Nguyen Van B', NULL, 1, '2026-07-14 06:44:54', '2026-06-14 10:16:39.785679', '2026-07-14 06:44:54.331406', NULL, NULL, NULL, NULL),
('e999d34b-3c55-4eb9-ac1d-3bc52173e976', 'newmangaka_3564', 'newmangaka@company.com', '$2a$10$LpLoMOYQlDyuOygl3TkCWudYEh/IdIZDODkZVtJYRcyN6azENfteW', 'dcd1ccf9-63cd-11f1-8e85-b22bcecafffa', 'Test User', NULL, 1, NULL, '2026-06-14 10:29:23.787650', '2026-06-14 10:29:23.787650', NULL, 'danghuy05022003@gmail.com', NULL, NULL),
('f9b0e71f-5d77-11f1-950a-4ec2ffb75ee3', 'admin', 'admin@manga-cwpm.local', '$2b$10$3De3YGJ3VuQnA6tWc9ro4uBz2CgwIkp.KpoF0NZYrN4VegVbytwN2', 'dcd30051-63cd-11f1-8e85-b22bcecafffa', 'System Admin', NULL, 1, '2026-07-18 07:08:16', '2026-06-01 05:08:49.640863', '2026-07-18 07:08:15.581593', NULL, NULL, '', '');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assets_series` (`series_id`),
  ADD KEY `idx_assets_type` (`asset_type`),
  ADD KEY `idx_assets_uploaded_by` (`uploaded_by`),
  ADD KEY `idx_assets_deleted_at` (`deleted_at`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_actor` (`actor_id`),
  ADD KEY `idx_audit_target` (`target_type`,`target_id`),
  ADD KEY `idx_audit_created_at` (`created_at`);

--
-- Indexes for table `board_votes`
--
ALTER TABLE `board_votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_board_votes_submission_voter` (`submission_id`,`voter_id`),
  ADD KEY `idx_board_votes_submission` (`submission_id`),
  ADD KEY `fk_board_votes_voter` (`voter_id`);

--
-- Indexes for table `chapters`
--
ALTER TABLE `chapters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_chapters_series_number` (`series_id`,`chapter_number`),
  ADD KEY `idx_chapters_series` (`series_id`),
  ADD KEY `idx_chapters_status` (`status`),
  ADD KEY `idx_chapters_deadline` (`deadline`),
  ADD KEY `idx_chapters_deleted_at` (`deleted_at`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_comments_target` (`target_type`,`target_id`),
  ADD KEY `idx_comments_author` (`author_id`),
  ADD KEY `idx_comments_parent` (`parent_id`),
  ADD KEY `idx_comments_resolved` (`is_resolved`),
  ADD KEY `idx_comments_deleted_at` (`deleted_at`);

--
-- Indexes for table `editorial_actions`
--
ALTER TABLE `editorial_actions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_editorial_series` (`series_id`),
  ADD KEY `idx_editorial_effective_date` (`effective_date`),
  ADD KEY `fk_editorial_decided_by` (`decided_by`),
  ADD KEY `fk_editorial_actions_type` (`action_type_id`);

--
-- Indexes for table `editorial_action_types`
--
ALTER TABLE `editorial_action_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_editorial_action_types_name` (`name`);

--
-- Indexes for table `editorial_proposals`
--
ALTER TABLE `editorial_proposals`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `editorial_votes`
--
ALTER TABLE `editorial_votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_editorial_votes_proposal_voter` (`proposal_id`,`voter_id`);

--
-- Indexes for table `manuscripts`
--
ALTER TABLE `manuscripts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_manuscripts_series_version` (`series_id`,`version`),
  ADD KEY `idx_manuscripts_series` (`series_id`),
  ADD KEY `idx_manuscripts_status` (`status`),
  ADD KEY `idx_manuscripts_deleted_at` (`deleted_at`),
  ADD KEY `fk_manuscripts_submitted_by` (`submitted_by`);

--
-- Indexes for table `manuscript_annotations`
--
ALTER TABLE `manuscript_annotations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_annotations_manuscript` (`manuscript_id`),
  ADD KEY `idx_annotations_editor` (`editor_id`);

--
-- Indexes for table `manuscript_pages`
--
ALTER TABLE `manuscript_pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_manuscript_page` (`manuscript_id`,`page_number`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user_unread` (`user_id`,`is_read`),
  ADD KEY `idx_notifications_created_at` (`created_at`),
  ADD KEY `fk_notifications_type` (`notification_type_id`);

--
-- Indexes for table `notification_types`
--
ALTER TABLE `notification_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_notification_types_name` (`name`);

--
-- Indexes for table `pages`
--
ALTER TABLE `pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_pages_chapter_number` (`chapter_id`,`page_number`),
  ADD KEY `idx_pages_chapter` (`chapter_id`),
  ADD KEY `idx_pages_status` (`status`);

--
-- Indexes for table `panel_tasks`
--
ALTER TABLE `panel_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_panel_tasks_page` (`page_id`),
  ADD KEY `idx_panel_tasks_assigned_to` (`assigned_to`),
  ADD KEY `idx_panel_tasks_assigned_by` (`assigned_by`),
  ADD KEY `idx_panel_tasks_status` (`status`),
  ADD KEY `idx_panel_tasks_due_date` (`due_date`),
  ADD KEY `idx_panel_tasks_is_paid` (`is_paid`),
  ADD KEY `fk_panel_tasks_task_type` (`task_type_id`),
  ADD KEY `fk_panel_tasks_priority` (`priority_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_prt_token` (`token`),
  ADD KEY `idx_prt_user_id` (`user_id`),
  ADD KEY `idx_prt_expiry` (`expiry_date`);

--
-- Indexes for table `payment_records`
--
ALTER TABLE `payment_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_payment_records_task` (`panel_task_id`),
  ADD KEY `idx_payment_assistant_month` (`assistant_id`,`payment_month`),
  ADD KEY `idx_payment_status` (`status`);

--
-- Indexes for table `priorities`
--
ALTER TABLE `priorities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_priorities_name` (`name`);

--
-- Indexes for table `publish_schedules`
--
ALTER TABLE `publish_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_publish_schedules_name` (`name`);

--
-- Indexes for table `reader_polls`
--
ALTER TABLE `reader_polls`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_reader_polls_series_period` (`series_id`,`poll_period`,`poll_year`),
  ADD KEY `idx_reader_polls_series` (`series_id`),
  ADD KEY `idx_reader_polls_rank` (`rank_position`),
  ADD KEY `idx_reader_polls_poll_date` (`poll_date`),
  ADD KEY `fk_reader_polls_entered_by` (`entered_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_roles_name` (`name`);

--
-- Indexes for table `series`
--
ALTER TABLE `series`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_series_slug` (`slug`),
  ADD KEY `idx_series_mangaka` (`mangaka_id`),
  ADD KEY `idx_series_editor` (`editor_id`),
  ADD KEY `idx_series_status` (`status`),
  ADD KEY `idx_series_rank` (`current_rank`),
  ADD KEY `idx_series_cancellation_risk` (`cancellation_risk`),
  ADD KEY `idx_series_deleted_at` (`deleted_at`),
  ADD KEY `fk_series_publish_schedule` (`publish_schedule_id`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_submissions_manuscript` (`manuscript_id`),
  ADD KEY `idx_submissions_status` (`status`),
  ADD KEY `idx_submissions_voting_deadline` (`voting_deadline`),
  ADD KEY `fk_submissions_submitted` (`submitted_by`);

--
-- Indexes for table `task_types`
--
ALTER TABLE `task_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_task_types_name` (`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_users_email` (`email`),
  ADD UNIQUE KEY `uk_users_username` (`username`),
  ADD KEY `idx_users_deleted_at` (`deleted_at`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assets`
--
ALTER TABLE `assets`
  ADD CONSTRAINT `fk_assets_series` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`),
  ADD CONSTRAINT `fk_assets_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `board_votes`
--
ALTER TABLE `board_votes`
  ADD CONSTRAINT `fk_board_votes_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`),
  ADD CONSTRAINT `fk_board_votes_voter` FOREIGN KEY (`voter_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `chapters`
--
ALTER TABLE `chapters`
  ADD CONSTRAINT `fk_chapters_series` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`);

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `fk_comments_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`);

--
-- Constraints for table `editorial_actions`
--
ALTER TABLE `editorial_actions`
  ADD CONSTRAINT `fk_editorial_actions_type` FOREIGN KEY (`action_type_id`) REFERENCES `editorial_action_types` (`id`),
  ADD CONSTRAINT `fk_editorial_decided_by` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_editorial_series` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`);

--
-- Constraints for table `manuscripts`
--
ALTER TABLE `manuscripts`
  ADD CONSTRAINT `fk_manuscripts_series` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`),
  ADD CONSTRAINT `fk_manuscripts_submitted_by` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `manuscript_annotations`
--
ALTER TABLE `manuscript_annotations`
  ADD CONSTRAINT `fk_annotations_editor` FOREIGN KEY (`editor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_annotations_manuscript` FOREIGN KEY (`manuscript_id`) REFERENCES `manuscripts` (`id`);

--
-- Constraints for table `manuscript_pages`
--
ALTER TABLE `manuscript_pages`
  ADD CONSTRAINT `fk_ms_page_manuscript` FOREIGN KEY (`manuscript_id`) REFERENCES `manuscripts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_type` FOREIGN KEY (`notification_type_id`) REFERENCES `notification_types` (`id`),
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `pages`
--
ALTER TABLE `pages`
  ADD CONSTRAINT `fk_pages_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`);

--
-- Constraints for table `panel_tasks`
--
ALTER TABLE `panel_tasks`
  ADD CONSTRAINT `fk_panel_tasks_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_panel_tasks_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_panel_tasks_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`),
  ADD CONSTRAINT `fk_panel_tasks_priority` FOREIGN KEY (`priority_id`) REFERENCES `priorities` (`id`),
  ADD CONSTRAINT `fk_panel_tasks_task_type` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`);

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `fk_prt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `payment_records`
--
ALTER TABLE `payment_records`
  ADD CONSTRAINT `fk_payment_records_assistant` FOREIGN KEY (`assistant_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_payment_records_panel_task` FOREIGN KEY (`panel_task_id`) REFERENCES `panel_tasks` (`id`);

--
-- Constraints for table `reader_polls`
--
ALTER TABLE `reader_polls`
  ADD CONSTRAINT `fk_reader_polls_entered_by` FOREIGN KEY (`entered_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_reader_polls_series` FOREIGN KEY (`series_id`) REFERENCES `series` (`id`);

--
-- Constraints for table `series`
--
ALTER TABLE `series`
  ADD CONSTRAINT `fk_series_editor` FOREIGN KEY (`editor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_series_mangaka` FOREIGN KEY (`mangaka_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_series_publish_schedule` FOREIGN KEY (`publish_schedule_id`) REFERENCES `publish_schedules` (`id`);

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `fk_submissions_manuscript` FOREIGN KEY (`manuscript_id`) REFERENCES `manuscripts` (`id`),
  ADD CONSTRAINT `fk_submissions_submitted` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
