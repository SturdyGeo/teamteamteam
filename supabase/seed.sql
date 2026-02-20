-- =============================================================
-- Seed Data for Development
-- =============================================================
-- Run via: doppler run -- bun run db:reset
-- Users are created in auth.users; the on_auth_user_created
-- trigger auto-creates public.users rows.
-- =============================================================

-- -----------------------------------------------
-- Create test users via auth.users
-- -----------------------------------------------

-- User 1: Alice (org owner)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'alice@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"display_name": "Alice Johnson"}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated'
);

-- User 2: Bob (org member)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'bob@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"display_name": "Bob Smith"}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated'
);

-- -----------------------------------------------
-- Create org
-- -----------------------------------------------
INSERT INTO public.orgs (id, name)
VALUES ('10000000-0000-0000-0000-000000000001', 'Demo Org');

-- -----------------------------------------------
-- Create memberships
-- -----------------------------------------------
INSERT INTO public.memberships (id, org_id, user_id, role) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member');

-- -----------------------------------------------
-- Create project
-- -----------------------------------------------
INSERT INTO public.projects (id, org_id, name, prefix)
VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Demo Project', 'DEMO');

-- -----------------------------------------------
-- Create workflow columns
-- -----------------------------------------------
INSERT INTO public.workflow_columns (id, project_id, name, position) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Backlog', 0),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'To Do', 1),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'In Progress', 2),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Done', 3);

-- -----------------------------------------------
-- Create tags
-- -----------------------------------------------
INSERT INTO public.tags (id, project_id, name) VALUES
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'bug'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'feature'),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'docs'),
  ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'ux');

-- -----------------------------------------------
-- Create sample tickets
-- -----------------------------------------------

-- DEMO-1: Backlog, unassigned
INSERT INTO public.tickets (id, project_id, number, title, description, status_column_id, assignee_id, reporter_id)
VALUES (
  '60000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  1,
  'Set up CI pipeline',
  'Configure GitHub Actions for automated testing and deployment.',
  '40000000-0000-0000-0000-000000000001',
  NULL,
  '00000000-0000-0000-0000-000000000001'
);

-- DEMO-2: To Do, assigned to Bob
INSERT INTO public.tickets (id, project_id, number, title, description, status_column_id, assignee_id, reporter_id)
VALUES (
  '60000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  2,
  'Implement user authentication',
  'Add magic link authentication flow using Supabase Auth.',
  '40000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001'
);

-- DEMO-3: In Progress, assigned to Alice
INSERT INTO public.tickets (id, project_id, number, title, description, status_column_id, assignee_id, reporter_id)
VALUES (
  '60000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  3,
  'Fix login redirect loop',
  'Users are getting stuck in a redirect loop after clicking the magic link. This is blocking all new signups.',
  '40000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

-- DEMO-4: Done, assigned to Bob, closed
INSERT INTO public.tickets (id, project_id, number, title, description, status_column_id, assignee_id, reporter_id, closed_at)
VALUES (
  '60000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000001',
  4,
  'Write project README',
  'Create a comprehensive README with setup instructions and architecture overview.',
  '40000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  now()
);

-- DEMO-5: To Do, unassigned
INSERT INTO public.tickets (id, project_id, number, title, description, status_column_id, assignee_id, reporter_id)
VALUES (
  '60000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000001',
  5,
  'Add keyboard shortcuts to TUI',
  'Implement vim-style navigation and action shortcuts for the terminal board view.',
  '40000000-0000-0000-0000-000000000002',
  NULL,
  '00000000-0000-0000-0000-000000000002'
);

-- DEMO-6: In Progress, assigned to Bob
INSERT INTO public.tickets (id, project_id, number, title, description, status_column_id, assignee_id, reporter_id)
VALUES (
  '60000000-0000-0000-0000-000000000006',
  '30000000-0000-0000-0000-000000000001',
  6,
  'Design org invitation flow',
  'Create the UX flow for inviting new members to an org via email.',
  '40000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001'
);

-- -----------------------------------------------
-- Create ticket_tags associations
-- -----------------------------------------------
INSERT INTO public.ticket_tags (ticket_id, tag_id) VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002'),  -- DEMO-1: feature
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002'),  -- DEMO-2: feature
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001'),  -- DEMO-3: bug
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003'),  -- DEMO-4: docs
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000004'),  -- DEMO-5: ux
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002'),  -- DEMO-5: feature
  ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000004');  -- DEMO-6: ux

-- -----------------------------------------------
-- Create activity events
-- -----------------------------------------------
INSERT INTO public.activity_events (id, ticket_id, actor_id, event_type, payload) VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ticket_created', '{}'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ticket_created', '{}'),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'assignee_changed', '{"from_assignee_id": null, "to_assignee_id": "00000000-0000-0000-0000-000000000002"}'),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'ticket_created', '{}'),
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'status_changed', '{"from_column_id": "40000000-0000-0000-0000-000000000001", "to_column_id": "40000000-0000-0000-0000-000000000003"}'),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ticket_created', '{}'),
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'ticket_closed', '{}'),
  ('70000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'ticket_created', '{}'),
  ('70000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'tag_added', '{"tag": "ux"}'),
  ('70000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ticket_created', '{}'),
  ('70000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'status_changed', '{"from_column_id": "40000000-0000-0000-0000-000000000001", "to_column_id": "40000000-0000-0000-0000-000000000003"}');
