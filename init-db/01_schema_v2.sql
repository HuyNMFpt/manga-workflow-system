-- ================================================================
-- MANGA CW&PM — Database Schema (Updated)
-- MySQL 8.0 | utf8mb4_unicode_ci
-- Version: 2.0 — 09/06/2026
-- Thay đổi: Tách ENUM thành lookup tables, thêm bảng mới
-- ================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

USE manga_swp391;

-- ================================================================
-- LOOKUP TABLES (tách từ ENUM)
-- ================================================================

-- ─── ROLES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    name        VARCHAR(50)  NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (id, name, description) VALUES
(UUID(), 'mangaka',      'Tác giả manga'),
(UUID(), 'assistant',    'Trợ lý sản xuất'),
(UUID(), 'editor',       'Biên tập viên (Tantou Editor)'),
(UUID(), 'board_member', 'Thành viên Hội đồng biên tập'),
(UUID(), 'admin',        'Quản trị viên hệ thống');

-- ─── TASK_TYPES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_types (
    id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    name        VARCHAR(50)  NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uk_task_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO task_types (id, name, description) VALUES
(UUID(), 'background',  'Vẽ nền'),
(UUID(), 'shading',     'Tô bóng'),
(UUID(), 'effect',      'Hiệu ứng'),
(UUID(), 'screentone',  'Screentone'),
(UUID(), 'dialog',      'Hộp thoại'),
(UUID(), 'touch_up',    'Chỉnh sửa nhỏ'),
(UUID(), 'other',       'Khác');

-- ─── PRIORITIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS priorities (
    id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    name        VARCHAR(50)  NOT NULL,
    level       INT          NOT NULL DEFAULT 0,
    description VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uk_priorities_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO priorities (id, name, level, description) VALUES
(UUID(), 'low',    1, 'Ưu tiên thấp'),
(UUID(), 'normal', 2, 'Ưu tiên bình thường'),
(UUID(), 'high',   3, 'Ưu tiên cao'),
(UUID(), 'urgent', 4, 'Khẩn cấp');

-- ─── NOTIFICATION_TYPES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_types (
    id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uk_notification_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO notification_types (id, name, description) VALUES
(UUID(), 'task_assigned',      'Task được giao'),
(UUID(), 'task_approved',      'Task được duyệt'),
(UUID(), 'revision_requested', 'Yêu cầu chỉnh sửa'),
(UUID(), 'deadline_warning',   'Cảnh báo deadline'),
(UUID(), 'series_at_risk',     'Series có nguy cơ bị hủy'),
(UUID(), 'poll_updated',       'Cập nhật poll'),
(UUID(), 'series_cancelled',   'Series bị hủy'),
(UUID(), 'submission_result',  'Kết quả xét duyệt');

-- ─── EDITORIAL_ACTION_TYPES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS editorial_action_types (
    id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uk_editorial_action_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO editorial_action_types (id, name, description) VALUES
(UUID(), 'approve_series',    'Duyệt series'),
(UUID(), 'cancel_series',     'Hủy series'),
(UUID(), 'change_schedule',   'Đổi lịch xuất bản'),
(UUID(), 'put_on_hiatus',     'Tạm ngưng'),
(UUID(), 'resume_publishing', 'Tiếp tục xuất bản'),
(UUID(), 'override_ranking',  'Ghi đè xếp hạng');

-- ─── PUBLISH_SCHEDULES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publish_schedules (
    id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    name        VARCHAR(50)  NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uk_publish_schedules_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO publish_schedules (id, name, description) VALUES
(UUID(), 'weekly',  'Hàng tuần'),
(UUID(), 'monthly', 'Hàng tháng');

-- ================================================================
-- CORE TABLES
-- ================================================================

-- ─── USERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    username        VARCHAR(50)  NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         VARCHAR(36)  NOT NULL,
    display_name    VARCHAR(255),
    name            VARCHAR(255),
    avatar_url      VARCHAR(500),
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    last_login_at   DATETIME(6),
    created_at      DATETIME(6)  NOT NULL DEFAULT NOW(6),
    updated_at      DATETIME(6)  NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    deleted_at      DATETIME(6),
    password        VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email    (email),
    UNIQUE KEY uk_users_username (username),
    KEY idx_users_role_id        (role_id),
    KEY idx_users_deleted_at     (deleted_at),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SERIES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series (
    id                    VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    mangaka_id            VARCHAR(36)  NOT NULL,
    editor_id             VARCHAR(36),
    title                 VARCHAR(255) NOT NULL,
    slug                  VARCHAR(300) NOT NULL,
    synopsis              TEXT,
    genre                 VARCHAR(100),
    status                ENUM('draft','submitted','approved','publishing','on_hiatus','cancelled')
                              NOT NULL DEFAULT 'draft',
    publish_schedule_id   VARCHAR(36),
    cover_image_url       VARCHAR(500),
    current_rank          INT,
    previous_rank         INT,
    cancellation_risk     TINYINT(1)   NOT NULL DEFAULT 0,
    approved_at           DATETIME(6),
    created_at            DATETIME(6)  NOT NULL DEFAULT NOW(6),
    updated_at            DATETIME(6)  NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    deleted_at            DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_series_slug           (slug),
    KEY idx_series_mangaka              (mangaka_id),
    KEY idx_series_editor               (editor_id),
    KEY idx_series_status               (status),
    KEY idx_series_rank                 (current_rank),
    KEY idx_series_cancellation_risk    (cancellation_risk),
    KEY idx_series_deleted_at           (deleted_at),
    CONSTRAINT fk_series_mangaka          FOREIGN KEY (mangaka_id)          REFERENCES users(id),
    CONSTRAINT fk_series_editor           FOREIGN KEY (editor_id)           REFERENCES users(id),
    CONSTRAINT fk_series_publish_schedule FOREIGN KEY (publish_schedule_id) REFERENCES publish_schedules(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CHAPTERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
    id                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    series_id         VARCHAR(36)  NOT NULL,
    chapter_number    INT          NOT NULL,
    title             VARCHAR(255),
    notes             TEXT,
    status            ENUM('in_progress','pending_review','editor_review','approved','published')
                          NOT NULL DEFAULT 'in_progress',
    deadline          DATE,
    published_at      DATE,
    total_pages       INT          NOT NULL DEFAULT 0,
    completed_pages   INT          NOT NULL DEFAULT 0,
    created_at        DATETIME(6)  NOT NULL DEFAULT NOW(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    deleted_at        DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_chapters_series_number (series_id, chapter_number),
    KEY idx_chapters_series              (series_id),
    KEY idx_chapters_status              (status),
    KEY idx_chapters_deadline            (deadline),
    KEY idx_chapters_deleted_at          (deleted_at),
    CONSTRAINT fk_chapters_series FOREIGN KEY (series_id) REFERENCES series(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PAGES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
    id              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    chapter_id      VARCHAR(36)  NOT NULL,
    page_number     INT          NOT NULL,
    raw_file_url    VARCHAR(500),
    final_file_url  VARCHAR(500),
    status          ENUM('pending','in_progress','completed','reviewing','approved','revision_needed')
                        NOT NULL DEFAULT 'pending',
    mangaka_notes   TEXT,
    created_at      DATETIME(6)  NOT NULL DEFAULT NOW(6),
    updated_at      DATETIME(6)  NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_pages_chapter_number (chapter_id, page_number),
    KEY idx_pages_chapter              (chapter_id),
    KEY idx_pages_status               (status),
    CONSTRAINT fk_pages_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PANEL_TASKS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS panel_tasks (
    id               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
    page_id          VARCHAR(36)   NOT NULL,
    assigned_to      VARCHAR(36)   NOT NULL,
    assigned_by      VARCHAR(36)   NOT NULL,
    title            VARCHAR(255)  NOT NULL,
    description      TEXT,
    task_type_id     VARCHAR(36)   NOT NULL,
    panel_region     JSON,
    priority_id      VARCHAR(36)   NOT NULL,
    status           ENUM('pending','in_progress','submitted','approved','revision_needed')
                         NOT NULL DEFAULT 'pending',
    revision_notes   TEXT,
    result_file_url  VARCHAR(500),
    payment_amount   DECIMAL(10,2),
    is_paid          TINYINT(1)    NOT NULL DEFAULT 0,
    due_date         DATETIME(6),
    submitted_at     DATETIME(6),
    approved_at      DATETIME(6),
    created_at       DATETIME(6)   NOT NULL DEFAULT NOW(6),
    updated_at       DATETIME(6)   NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    PRIMARY KEY (id),
    KEY idx_panel_tasks_page         (page_id),
    KEY idx_panel_tasks_assigned_to  (assigned_to),
    KEY idx_panel_tasks_assigned_by  (assigned_by),
    KEY idx_panel_tasks_status       (status),
    KEY idx_panel_tasks_due_date     (due_date),
    KEY idx_panel_tasks_is_paid      (is_paid),
    CONSTRAINT fk_panel_tasks_page        FOREIGN KEY (page_id)       REFERENCES pages(id),
    CONSTRAINT fk_panel_tasks_assigned_to FOREIGN KEY (assigned_to)   REFERENCES users(id),
    CONSTRAINT fk_panel_tasks_assigned_by FOREIGN KEY (assigned_by)   REFERENCES users(id),
    CONSTRAINT fk_panel_tasks_task_type   FOREIGN KEY (task_type_id)  REFERENCES task_types(id),
    CONSTRAINT fk_panel_tasks_priority    FOREIGN KEY (priority_id)   REFERENCES priorities(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── MANUSCRIPTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manuscripts (
    id                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    series_id         VARCHAR(36)  NOT NULL,
    submitted_by      VARCHAR(36)  NOT NULL,
    version           INT          NOT NULL DEFAULT 1,
    file_url          VARCHAR(500) NOT NULL,
    description       TEXT,
    status            ENUM('draft','submitted','under_review','approved','rejected','revision_requested')
                          NOT NULL DEFAULT 'draft',
    rejection_reason  TEXT,
    submitted_at      DATETIME(6),
    reviewed_at       DATETIME(6),
    created_at        DATETIME(6)  NOT NULL DEFAULT NOW(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    deleted_at        DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_manuscripts_series_version (series_id, version),
    KEY idx_manuscripts_series               (series_id),
    KEY idx_manuscripts_status               (status),
    KEY idx_manuscripts_deleted_at           (deleted_at),
    CONSTRAINT fk_manuscripts_series       FOREIGN KEY (series_id)    REFERENCES series(id),
    CONSTRAINT fk_manuscripts_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── MANUSCRIPT_ANNOTATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS manuscript_annotations (
    id              VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    manuscript_id   VARCHAR(36)  NOT NULL,
    editor_id       VARCHAR(36)  NOT NULL,
    note            TEXT         NOT NULL,
    tag             VARCHAR(50),
    x               DOUBLE,
    y               DOUBLE,
    page_number     INT,
    created_at      DATETIME(6)  NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    KEY idx_annotations_manuscript (manuscript_id),
    KEY idx_annotations_editor     (editor_id),
    CONSTRAINT fk_annotations_manuscript FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id),
    CONSTRAINT fk_annotations_editor     FOREIGN KEY (editor_id)     REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SUBMISSIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
    id                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    manuscript_id     VARCHAR(36)  NOT NULL,
    submitted_by      VARCHAR(36)  NOT NULL,
    submission_round  INT          NOT NULL DEFAULT 1,
    cover_letter      TEXT,
    status            ENUM('pending','voting','approved','rejected') NOT NULL DEFAULT 'pending',
    vote_yes          INT          NOT NULL DEFAULT 0,
    vote_no           INT          NOT NULL DEFAULT 0,
    vote_abstain      INT          NOT NULL DEFAULT 0,
    voting_deadline   DATETIME(6),
    decided_at        DATETIME(6),
    created_at        DATETIME(6)  NOT NULL DEFAULT NOW(6),
    updated_at        DATETIME(6)  NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    PRIMARY KEY (id),
    KEY idx_submissions_manuscript       (manuscript_id),
    KEY idx_submissions_status           (status),
    KEY idx_submissions_voting_deadline  (voting_deadline),
    CONSTRAINT fk_submissions_manuscript FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id),
    CONSTRAINT fk_submissions_submitted  FOREIGN KEY (submitted_by)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── BOARD_VOTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_votes (
    id             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    submission_id  VARCHAR(36)  NOT NULL,
    voter_id       VARCHAR(36)  NOT NULL,
    vote           ENUM('yes','no','abstain') NOT NULL,
    comment        TEXT,
    voted_at       DATETIME(6)  NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_board_votes_submission_voter (submission_id, voter_id),
    KEY idx_board_votes_submission             (submission_id),
    CONSTRAINT fk_board_votes_submission FOREIGN KEY (submission_id) REFERENCES submissions(id),
    CONSTRAINT fk_board_votes_voter      FOREIGN KEY (voter_id)      REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── READER_POLLS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reader_polls (
    id             VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    series_id      VARCHAR(36)  NOT NULL,
    entered_by     VARCHAR(36)  NOT NULL,
    poll_period    INT          NOT NULL,
    poll_year      INT          NOT NULL,
    rank_position  INT          NOT NULL,
    vote_count     INT          NOT NULL DEFAULT 0,
    reader_score   INT,
    notes          TEXT,
    poll_date      DATE         NOT NULL,
    created_at     DATETIME(6)  NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_reader_polls_series_period (series_id, poll_period, poll_year),
    KEY idx_reader_polls_series              (series_id),
    KEY idx_reader_polls_rank                (rank_position),
    KEY idx_reader_polls_poll_date           (poll_date),
    CONSTRAINT fk_reader_polls_series     FOREIGN KEY (series_id)  REFERENCES series(id),
    CONSTRAINT fk_reader_polls_entered_by FOREIGN KEY (entered_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── EDITORIAL_ACTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS editorial_actions (
    id               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    series_id        VARCHAR(36)  NOT NULL,
    decided_by       VARCHAR(36)  NOT NULL,
    action_type_id   VARCHAR(36)  NOT NULL,
    reason           TEXT         NOT NULL,
    metadata         JSON,
    effective_date   DATE         NOT NULL,
    created_at       DATETIME(6)  NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    KEY idx_editorial_series         (series_id),
    KEY idx_editorial_action_type    (action_type_id),
    KEY idx_editorial_effective_date (effective_date),
    CONSTRAINT fk_editorial_series      FOREIGN KEY (series_id)      REFERENCES series(id),
    CONSTRAINT fk_editorial_decided_by  FOREIGN KEY (decided_by)     REFERENCES users(id),
    CONSTRAINT fk_editorial_action_type FOREIGN KEY (action_type_id) REFERENCES editorial_action_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── COMMENTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
    id               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    author_id        VARCHAR(36)  NOT NULL,
    target_type      ENUM('page','chapter','manuscript','panel_task') NOT NULL,
    target_id        VARCHAR(36)  NOT NULL,
    content          TEXT         NOT NULL,
    annotation_data  JSON,
    parent_id        VARCHAR(36),
    is_resolved      TINYINT(1)   NOT NULL DEFAULT 0,
    resolved_at      DATETIME(6),
    created_at       DATETIME(6)  NOT NULL DEFAULT NOW(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT NOW(6) ON UPDATE NOW(6),
    deleted_at       DATETIME(6),
    PRIMARY KEY (id),
    KEY idx_comments_target      (target_type, target_id),
    KEY idx_comments_author      (author_id),
    KEY idx_comments_parent      (parent_id),
    KEY idx_comments_resolved    (is_resolved),
    KEY idx_comments_deleted_at  (deleted_at),
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id),
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ASSETS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
    id           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    uploaded_by  VARCHAR(36)  NOT NULL,
    series_id    VARCHAR(36),
    filename     VARCHAR(255) NOT NULL,
    file_url     VARCHAR(500) NOT NULL,
    asset_type   ENUM('reference','brush','screentone','font','character_sheet','background_ref') NOT NULL,
    file_size    BIGINT       NOT NULL,
    mime_type    VARCHAR(100) NOT NULL,
    created_at   DATETIME(6)  NOT NULL DEFAULT NOW(6),
    deleted_at   DATETIME(6),
    PRIMARY KEY (id),
    KEY idx_assets_series       (series_id),
    KEY idx_assets_type         (asset_type),
    KEY idx_assets_uploaded_by  (uploaded_by),
    KEY idx_assets_deleted_at   (deleted_at),
    CONSTRAINT fk_assets_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id),
    CONSTRAINT fk_assets_series      FOREIGN KEY (series_id)   REFERENCES series(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id                    VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    user_id               VARCHAR(36)  NOT NULL,
    notification_type_id  VARCHAR(36),
    reference_id          VARCHAR(36),
    reference_type        VARCHAR(50),
    message               TEXT         NOT NULL,
    is_read               TINYINT(1)   NOT NULL DEFAULT 0,
    read_at               DATETIME(6),
    created_at            DATETIME(6)  NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    KEY idx_notifications_user_unread (user_id, is_read),
    KEY idx_notifications_created_at  (created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_notifications_type FOREIGN KEY (notification_type_id) REFERENCES notification_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PAYMENT_RECORDS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_records (
    id             VARCHAR(36)    NOT NULL DEFAULT (UUID()),
    assistant_id   VARCHAR(36)    NOT NULL,
    panel_task_id  VARCHAR(36)    NOT NULL,
    amount         DECIMAL(10,2)  NOT NULL,
    currency       CHAR(3)        NOT NULL DEFAULT 'VND',
    status         ENUM('pending','approved','paid') NOT NULL DEFAULT 'pending',
    payment_month  DATE           NOT NULL,
    paid_at        DATETIME(6),
    created_at     DATETIME(6)    NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_records_task  (panel_task_id),
    KEY idx_payment_assistant_month     (assistant_id, payment_month),
    KEY idx_payment_status              (status),
    CONSTRAINT fk_payment_records_assistant  FOREIGN KEY (assistant_id)  REFERENCES users(id),
    CONSTRAINT fk_payment_records_panel_task FOREIGN KEY (panel_task_id) REFERENCES panel_tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AUDIT_LOGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id           VARCHAR(36)   NOT NULL DEFAULT (UUID()),
    actor_id     VARCHAR(36),
    action       VARCHAR(50)   NOT NULL,
    target_type  VARCHAR(100)  NOT NULL,
    target_id    VARCHAR(36)   NOT NULL,
    before_data  JSON,
    after_data   JSON,
    ip_address   VARCHAR(45),
    created_at   DATETIME(6)   NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    KEY idx_audit_actor       (actor_id),
    KEY idx_audit_target      (target_type, target_id),
    KEY idx_audit_created_at  (created_at),
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PASSWORD_RESET_TOKENS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
    token        VARCHAR(255) NOT NULL,
    user_id      VARCHAR(36)  NOT NULL,
    expiry_date  DATETIME(6)  NOT NULL,
    used         TINYINT(1)   NOT NULL DEFAULT 0,
    created_at   DATETIME(6)  NOT NULL DEFAULT NOW(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_prt_token (token),
    KEY idx_prt_user_id     (user_id),
    KEY idx_prt_expiry      (expiry_date),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- SEED DATA
-- ================================================================

-- Admin account (password: Admin@123)
INSERT IGNORE INTO users (id, username, email, password_hash, role_id, display_name, name, is_active)
SELECT UUID(), 'admin', 'admin@manga-cwpm.local',
       '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
       r.id, 'System Admin', 'System Admin', 1
FROM roles r WHERE r.name = 'admin';

SELECT '✅ Schema v2.0 created successfully!' AS status;
