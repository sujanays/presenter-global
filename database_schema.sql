-- =========================================================================
-- DATABASE SCHEMA: PRESENTER PLATFORM (PostgreSQL)
-- =========================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Devices Table (Both Mobile & Desktop Agents)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_uid VARCHAR(255) UNIQUE NOT NULL, -- Hardware UUID or custom generated unique id
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'desktop', 'mobile'
    os_name VARCHAR(50),
    os_version VARCHAR(50),
    push_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Trusted Pairs (Secure persistent relationship between Mobile & Desktop)
CREATE TABLE IF NOT EXISTS trusted_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    desktop_device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    mobile_device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    pair_name VARCHAR(100) DEFAULT 'Trusted Mobile Remote',
    auth_secret VARCHAR(255) NOT NULL, -- Shared AES key or signature key for pairing verification
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_desktop_mobile_pair UNIQUE(desktop_device_id, mobile_device_id)
);

-- 4. Sessions (Presentation / Control Sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    desktop_device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 5. Active WebSocket Connections (Presence & Horizontal Scaling Routing Map)
CREATE TABLE IF NOT EXISTS websocket_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    socket_id VARCHAR(100) UNIQUE NOT NULL,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    server_node_id VARCHAR(100) NOT NULL, -- Node ID serving this socket
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Logs (Security Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- 'PAIR_REQUEST', 'DEVICE_REVOKED', 'AUTH_FAILURE'
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_pairs_desktop ON trusted_pairs(desktop_device_id);
CREATE INDEX IF NOT EXISTS idx_trusted_pairs_mobile ON trusted_pairs(mobile_device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_ws_device ON websocket_connections(device_id);
