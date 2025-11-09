-- M2Reporter Customer Portal Database Schema
-- This schema handles user authentication, company data, and file access control

-- Companies table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'past_due')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table with secure password storage
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    invite_token VARCHAR(255) UNIQUE,
    invite_expires TIMESTAMP,
    is_activated BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File access permissions
CREATE TABLE file_permissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    folder_name VARCHAR(255) NOT NULL,
    folder_type VARCHAR(50) NOT NULL CHECK (folder_type IN ('shared', 'company_specific', 'program_files')),
    blob_prefix VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for compliance
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_invite_token ON users(invite_token);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_file_permissions_company_id ON file_permissions(company_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Insert default shared folders
INSERT INTO file_permissions (company_id, folder_name, folder_type, blob_prefix)
VALUES
    (NULL, 'Program Files', 'program_files', 'shared/program-files/'),
    (NULL, '360 Solutions', 'shared', 'shared/360-solutions/');
