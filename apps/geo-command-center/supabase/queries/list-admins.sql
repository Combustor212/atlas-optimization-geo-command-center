-- Query to list all administrators in the system
-- Run this in your Supabase SQL Editor to see all admins

SELECT 
  p.id,
  p.full_name,
  au.email,
  p.role,
  a.name as agency_name,
  a.slug as agency_slug,
  p.created_at,
  au.last_sign_in_at,
  au.created_at as auth_created_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
LEFT JOIN agencies a ON p.agency_id = a.id
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;

-- Query to count users by role
SELECT 
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;

-- Query to find admins with no agency assigned (needs fixing)
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.role,
  p.agency_id
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.role = 'admin' 
  AND p.agency_id IS NULL;

-- Query to promote a user to admin (replace USER_ID with actual UUID)
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE id = 'USER_ID';

-- Query to assign agency to a user (replace USER_ID and AGENCY_ID)
-- UPDATE profiles 
-- SET agency_id = 'AGENCY_ID' 
-- WHERE id = 'USER_ID';
