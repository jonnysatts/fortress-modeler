-- Check if user profile exists and diagnose auth issues
SELECT 
    'User ID: ' || auth.uid()::text as current_user_info,
    CASE 
        WHEN auth.uid() IS NULL THEN 'No authenticated user'
        ELSE 'User is authenticated'
    END as auth_status;

-- Check if profile exists for the authenticated user
SELECT 
    'Profile exists: ' || CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid()) THEN 'YES' ELSE 'NO' END as profile_status;

-- If profile doesn't exist, create it
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
    auth.uid(),
    (auth.jwt() -> 'email')::text,
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'full_name'), (auth.jwt() -> 'email')::text),
    NOW(),
    NOW()
WHERE auth.uid() IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Verify tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'profiles' THEN (SELECT COUNT(*) FROM profiles)::text || ' profiles'
        WHEN table_name = 'projects' THEN (SELECT COUNT(*) FROM projects)::text || ' projects'
        ELSE 'exists'
    END as table_info
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'projects', 'financial_models', 'risks')
ORDER BY table_name;
