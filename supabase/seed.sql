-- Fortress Modeler Seed Data
-- This script populates the database with initial data for development and testing.
-- It is executed automatically when you run `supabase db reset`.

-- 1. Create an auth user first
-- This creates a user in the auth.users table, which will trigger the handle_new_user function
-- to automatically create the corresponding profile
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('testpassword123', gen_salt('bf')),
    now(),
    now(),
    '',
    now(),
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test User"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
) ON CONFLICT (id) DO NOTHING;

-- 1b. Make sure the profile exists (the trigger should have created it, but let's be sure)
INSERT INTO public.profiles (id, email, name)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert a sample project for the test user
INSERT INTO public.projects (id, user_id, name, description, product_type, target_audience)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000001', 'Project Phoenix', 'A sample project for demonstrating financial modeling capabilities.', 'SaaS Platform', 'Enterprise Customers');

-- 3. Insert a sample financial model for the project
INSERT INTO public.financial_models (id, project_id, user_id, name, assumptions)
VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000001', 'Q3 2025 Forecast', '{
        "revenue": [
            { "name": "Subscriptions", "value": 5000, "type": "recurring", "frequency": "monthly" }
        ],
        "costs": [
            { "name": "Server Hosting", "value": 1000, "type": "fixed", "category": "operations" },
            { "name": "Marketing Spend", "value": 500, "type": "fixed", "category": "marketing" }
        ],
        "growthModel": { "type": "linear", "rate": 0.1 }
    }');

-- 4. Insert a sample risk for the project
INSERT INTO public.risks (id, project_id, user_id, title, category, priority, status, mitigation_plan)
VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000001', 'Market Competition', 'market', 'high', 'identified', 'Develop unique feature set and strong marketing campaign.');

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Seed data loaded successfully.';
END $$;
