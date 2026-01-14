-- Copy and paste this query into the Supabase Dashboard SQL Editor
-- Link: https://supabase.com/dashboard/project/cgipzfsoeubdysuoqiml/sql/new

SELECT 
    au.id as user_id,
    au.email,
    p.id as profile_id,
    p.agency_id,
    a.name as agency_name,
    a.slug as agency_slug,
    au.created_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
LEFT JOIN public.agencies a ON a.id = p.agency_id
WHERE au.email = 'curliagencia@businesscenter.com';
