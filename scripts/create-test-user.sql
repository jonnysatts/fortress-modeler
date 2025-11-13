-- Create test user profile
INSERT INTO auth.users (id, email, password_hash) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'testuser@example.com',
  crypt('testpass123', gen_salt('bf'))
);

INSERT INTO public.profiles (id, email, name) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'testuser@example.com',
  'Test User'
);
