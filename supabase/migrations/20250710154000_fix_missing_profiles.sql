-- Fix missing profiles for existing auth users
-- This ensures all auth.users have corresponding profiles

DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Insert missing profiles for any auth users that don't have them
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au 
        LEFT JOIN public.profiles p ON au.id = p.id 
        WHERE p.id IS NULL AND au.deleted_at IS NULL
    LOOP
        INSERT INTO public.profiles (id, email, name, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'name', user_record.raw_user_meta_data->>'full_name', split_part(user_record.email, '@', 1)),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created profile for user: % (%)', user_record.email, user_record.id;
    END LOOP;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Missing profiles migration completed';
END $$;
