-- Create profile for the authenticated user
INSERT INTO profiles (id, email, name, picture, company_domain, preferences, created_at, updated_at)
VALUES (
    'f7c090db-286e-41c7-aff3-7310f71fbd6d',
    'jon@fortress.games',
    'Jon',
    NULL,
    'fortress.games',
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Verify the profile was created
SELECT id, email, name, created_at FROM profiles WHERE id = 'f7c090db-286e-41c7-aff3-7310f71fbd6d';
