-- Optional seed for development
-- Run after schema.sql

-- Insert demo agency
INSERT INTO agencies (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Demo Agency', 'demo-agency')
ON CONFLICT DO NOTHING;

-- Link your first user (replace with actual auth.users id)
-- UPDATE profiles SET agency_id = 'a0000000-0000-0000-0000-000000000001', role = 'admin' WHERE id = 'YOUR-USER-UUID';
