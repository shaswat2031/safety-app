-- ==============================================================================
-- VEDANTA EMPLOYEE SAFETY & EMERGENCY MANAGEMENT SYSTEM
-- SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('worker', 'response_team', 'command_operator', 'admin');
CREATE TYPE zone_type AS ENUM ('safe', 'hazard', 'restricted', 'no_network');
CREATE TYPE sos_status AS ENUM ('active', 'acknowledged', 'dispatched', 'resolved', 'false_alarm');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE dispatch_status AS ENUM ('assigned', 'en_route', 'on_site', 'closed');

-- 2. PROFILES TABLE (Role-Based Access Control linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'worker' NOT NULL,
    department VARCHAR(100),
    phone VARCHAR(20),
    blood_group VARCHAR(10),
    emergency_contact VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. GEOFENCE & SAFETY ZONES
CREATE TABLE IF NOT EXISTS geofence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(100) NOT NULL,
    zone_type zone_type NOT NULL DEFAULT 'hazard',
    polygon_coordinates JSONB NOT NULL, -- Array of [lat, lng] coordinates or GeoJSON
    site_location VARCHAR(100) DEFAULT 'Vedanta Plant Main Site',
    speed_limit_kmh INT DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SOS EMERGENCY ALERTS
CREATE TABLE IF NOT EXISTS sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status sos_status DEFAULT 'active' NOT NULL,
    severity severity_level DEFAULT 'critical' NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    battery_level INT,
    trigger_type VARCHAR(50) DEFAULT 'manual_sos', -- 'manual_sos', 'geofence_breach', 'lone_worker'
    remarks TEXT,
    resolved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 5. LIVE WORKER TELEMETRY & GPS
CREATE TABLE IF NOT EXISTS worker_locations (
    worker_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    speed_kmh DOUBLE PRECISION DEFAULT 0,
    accuracy DOUBLE PRECISION,
    is_sos_active BOOLEAN DEFAULT false,
    current_zone_id UUID REFERENCES geofence_zones(id) ON DELETE SET NULL,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. INCIDENT REPORTS (Photos, Videos, Hazards)
CREATE TABLE IF NOT EXISTS incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'fire', 'gas_leak', 'machinery', 'fall', 'spill', 'near_miss'
    description TEXT NOT NULL,
    severity severity_level DEFAULT 'medium' NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    media_urls TEXT[] DEFAULT '{}', -- Array of Supabase Storage bucket URLs
    audio_note_url TEXT,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_review', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. RESPONSE TEAM DISPATCHES
CREATE TABLE IF NOT EXISTS response_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID REFERENCES sos_alerts(id) ON DELETE CASCADE NOT NULL,
    responder_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    dispatch_status dispatch_status DEFAULT 'assigned' NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    arrived_at TIMESTAMP WITH TIME ZONE,
    equipment_shutdown_requested BOOLEAN DEFAULT false,
    closure_notes TEXT,
    closure_proof_media TEXT[] DEFAULT '{}'
);

-- 8. AUDIT TRAILS & HISTORICAL COMPLIANCE
CREATE TABLE IF NOT EXISTS safety_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. ENABLE SUPABASE REALTIME REPLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE worker_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE incident_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE response_dispatches;
