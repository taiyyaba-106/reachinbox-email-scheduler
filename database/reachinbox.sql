create database reachinbox;
use reachinbox;
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    google_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE senders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(150),
    smtp_host VARCHAR(255),
    smtp_port INT,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sender_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
CREATE TABLE email_campaigns (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    delay_seconds INT NOT NULL,
    hourly_limit INT NOT NULL,
    source_filename VARCHAR(255),
    status ENUM(
        'SCHEDULED',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_campaign_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campaign_sender
        FOREIGN KEY (sender_id)
        REFERENCES senders(id)
        ON DELETE RESTRICT
);
CREATE TABLE campaign_recipients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    rownumber INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recipient_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES email_campaigns(id)
        ON DELETE CASCADE
);
CREATE TABLE email_jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    recipient_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,

    scheduled_at DATETIME NOT NULL,
    sent_at DATETIME NULL,

    status ENUM(
        'SCHEDULED',
        'PROCESSING',
        'SENT',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'SCHEDULED',

    bullmq_job_id VARCHAR(255) UNIQUE,
    attempts INT NOT NULL DEFAULT 0,

    message_id VARCHAR(500),
    error_message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_job_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES email_campaigns(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_job_recipient
        FOREIGN KEY (recipient_id)
        REFERENCES campaign_recipients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_job_sender
        FOREIGN KEY (sender_id)
        REFERENCES senders(id)
        ON DELETE RESTRICT
);
CREATE TABLE slack_connections (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL UNIQUE,

    slack_user_id VARCHAR(255),
    slack_team_id VARCHAR(255),

    access_token TEXT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_slack_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
CREATE TABLE rate_limit_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender_id BIGINT NOT NULL,
    campaign_id BIGINT,
    hour_window DATETIME NOT NULL,
    limit_value INT NOT NULL,
    current_count INT NOT NULL,
    slack_notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rate_sender
        FOREIGN KEY (sender_id)
        REFERENCES senders(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rate_campaign
        FOREIGN KEY (campaign_id)
        REFERENCES email_campaigns(id)
        ON DELETE SET NULL
);
show tables;