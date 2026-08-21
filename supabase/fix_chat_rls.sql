-- Disable Row Level Security on chat_messages table
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions to public roles
GRANT ALL ON TABLE chat_messages TO anon, authenticated, service_role;
