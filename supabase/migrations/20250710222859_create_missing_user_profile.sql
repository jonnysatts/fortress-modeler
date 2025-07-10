-- Fix Automatic Profile Creation System
-- This migration fixes schema mismatch and restores automatic profile creation for all users

-- 1. Ensure profiles table exists with the correct schema that matches application expectations
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    company_domain VARCHAR(255),
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist (defensive approach)
DO $$
BEGIN
    -- Add name column if it doesn't exist (may be called full_name)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
        -- Check if full_name exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
            ALTER TABLE profiles RENAME COLUMN full_name TO name;
        ELSE
            ALTER TABLE profiles ADD COLUMN name VARCHAR(255);
        END IF;
    END IF;

    -- Add picture column if it doesn't exist (may be called avatar_url)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'picture') THEN
        -- Check if avatar_url exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
            ALTER TABLE profiles RENAME COLUMN avatar_url TO picture;
        ELSE
            ALTER TABLE profiles ADD COLUMN picture TEXT;
        END IF;
    END IF;

    -- Add other columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_domain') THEN
        ALTER TABLE profiles ADD COLUMN company_domain VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
        ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Ensure email column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT UNIQUE;
    END IF;
END $$;

-- 2. Drop existing profiles policies and create proper ones
DROP POLICY IF EXISTS profiles_policy ON profiles;

-- Allow users to INSERT, SELECT, and UPDATE their own profiles
CREATE POLICY profiles_select_policy ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_insert_policy ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_policy ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Create/restore automatic profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, picture, company_domain, preferences)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'hd',
        '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        picture = COALESCE(EXCLUDED.picture, profiles.picture),
        company_domain = COALESCE(EXCLUDED.company_domain, profiles.company_domain),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create function to backfill profiles for existing authenticated users
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    profiles_created INTEGER := 0;
BEGIN
    -- Loop through all authenticated users who don't have profiles
    FOR user_record IN 
        SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        -- Create profile for this user
        INSERT INTO public.profiles (id, email, name, picture, company_domain, preferences, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name', 
                user_record.raw_user_meta_data->>'name', 
                split_part(user_record.email, '@', 1),
                'User'
            ),
            user_record.raw_user_meta_data->>'avatar_url',
            user_record.raw_user_meta_data->>'hd',
            '{}'::jsonb,
            user_record.created_at,
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        profiles_created := profiles_created + 1;
    END LOOP;
    
    RETURN profiles_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Execute backfill to create profiles for any existing users
SELECT public.backfill_missing_profiles() as profiles_created;

-- 6. Verify the fixes
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    missing_profiles INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    missing_profiles := user_count - profile_count;
    
    RAISE NOTICE 'Profile creation fix completed:';
    RAISE NOTICE 'Total authenticated users: %', user_count;
    RAISE NOTICE 'Total profiles: %', profile_count;
    RAISE NOTICE 'Missing profiles: %', missing_profiles;
    
    IF missing_profiles = 0 THEN
        RAISE NOTICE '✅ All authenticated users now have profiles!';
    ELSE
        RAISE WARNING '⚠️ % users still missing profiles', missing_profiles;
    END IF;
END $$;

-- 7. Display current profiles for verification
SELECT 
    id, 
    email, 
    name,
    CASE WHEN picture IS NOT NULL THEN 'Yes' ELSE 'No' END as has_picture,
    CASE WHEN company_domain IS NOT NULL THEN company_domain ELSE 'None' END as company_domain,
    created_at
FROM profiles 
ORDER BY created_at;
