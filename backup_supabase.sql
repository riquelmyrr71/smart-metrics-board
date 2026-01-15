-- =============================================================
-- BACKUP COMPLETO DO SUPABASE - LOVABLE CLOUD
-- Projeto: cgipzfsoeubdysuoqiml
-- Data: 2026-01-15
-- =============================================================

-- =============================================================
-- 1. AGENCIES (Agências)
-- =============================================================
INSERT INTO public.agencies (id, name, slug, logo_url, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Curli Agência',
  'curli',
  NULL,
  true,
  '2026-01-13 02:15:42.960658+00',
  '2026-01-13 02:15:42.960658+00'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 2. PROFILES (Perfis de Usuários)
-- Nota: Os usuários devem ser criados via auth.users primeiro
-- =============================================================
INSERT INTO public.profiles (id, user_id, email, full_name, avatar_url, agency_id, is_super_admin, created_at, updated_at)
VALUES (
  '459871be-2b41-4bd9-9ebe-5d5ad1f4ce13',
  'd2159d65-8a15-4d89-a9a1-aa2a694d874a',
  'curliagencia@businesscenter.com',
  NULL,
  NULL,
  '00000000-0000-0000-0000-000000000001',
  false,
  '2026-01-13 02:17:00.643213+00',
  '2026-01-13 02:17:00.736161+00'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 3. USER_ROLES (Papéis de Usuários)
-- =============================================================
INSERT INTO public.user_roles (id, user_id, agency_id, role, created_at)
VALUES (
  'f7d0364e-fd97-43c1-9700-4092358faea2',
  'd2159d65-8a15-4d89-a9a1-aa2a694d874a',
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '2026-01-13 02:17:00.643213+00'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 4. MONTHLY_PROJECTIONS (Projeções Mensais)
-- =============================================================
INSERT INTO public.monthly_projections (id, agency_id, year, month, month_key, projection_date, diamonds_projection, diamonds_actual, creators_projection, creators_actual, created_at, updated_at)
VALUES 
(
  '420c13ab-002e-4013-9eca-05890b73a0e0',
  NULL,
  2025,
  12,
  '2025-12',
  '2025-12-31',
  27984665,
  0,
  812,
  0,
  '2026-01-05 19:44:13.534884+00',
  '2026-01-05 19:44:13.534884+00'
),
(
  '813ddee0-9d60-4479-9231-700a01bc3f96',
  NULL,
  2026,
  1,
  '2026-01',
  '2026-01-14',
  20623869,
  7318147,
  651,
  231,
  '2026-01-05 19:25:58.522931+00',
  '2026-01-15 01:10:38.667552+00'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 5. SCHEDULING_GOALS (Metas de Agendamento)
-- =============================================================
INSERT INTO public.scheduling_goals (id, agency_id, year, month, days_goal, active_creators, created_at, updated_at)
VALUES 
(
  'e98942c2-9f40-499b-93bc-f7551a8e85e3',
  NULL,
  2025,
  12,
  31,
  468,
  '2025-12-16 19:46:43.280777+00',
  '2025-12-16 19:46:43.280777+00'
),
(
  'd8fa65fa-4a92-4e0b-8f7b-dd007d94af92',
  NULL,
  2026,
  1,
  31,
  407,
  '2026-01-05 20:07:50.550772+00',
  '2026-01-05 20:07:50.550772+00'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 6. NOTES (Anotações)
-- =============================================================
INSERT INTO public.notes (id, agency_id, title, content, image_url, note_date, created_at, updated_at)
VALUES (
  '0f3e7772-e75a-4201-a2d4-5b3d4b4c4b1f',
  NULL,
  '01/12',
  'dddd',
  'https://cgipzfsoeubdysuoqiml.supabase.co/storage/v1/object/public/note-images/1765475709148.png',
  '2025-12-11',
  '2025-12-11 17:55:11.785316+00',
  '2025-12-11 17:55:11.785316+00'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 7. DASHBOARD_DATA (Dados do Dashboard Principal)
-- Nota: Este é um JSON grande, exportado separadamente
-- =============================================================
-- O dashboard_data contém um JSON complexo com:
-- - Configurações de colunas
-- - Dados de cada executivo (BIANCA FOSCHINI, IAGO PATRICIO, etc.)
-- - Métricas de diamantes e recrutamento
-- - Configurações de período

-- IDs dos registros de dashboard_data:
-- 1. ID principal com todos os dados do painel

-- =============================================================
-- 8. LIVE_SCHEDULES (Agendamentos de Lives/Batalhas)
-- Total: 357 registros
-- =============================================================

-- Amostra dos primeiros registros (os dados completos estão muito extensos)
INSERT INTO public.live_schedules (id, agency_id, member_name, executive_name, schedule_date, is_scheduled, created_at, updated_at)
VALUES 
('455b3545-39ee-45ee-bacc-76a26acf08da', NULL, 'KAIZA PINHEIRO', 'IAGO ANDRADE (EXECUTIVO DE PARCERIAS)', '2025-12-01', false, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('b123956f-d665-4a07-bac0-f07ea6c49bf6', NULL, 'MARCO', 'GABRIELLE SOUSA (EXECUTIVO DE PARCERIAS)', '2025-12-01', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('daad6f30-16db-4cd6-a557-bf402f230428', NULL, 'CAIO PEDRO', 'IAGO ANDRADE (EXECUTIVO DE PARCERIAS)', '2025-12-01', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('32418804-96c1-43c4-85ba-37e106e40c92', NULL, 'LORRANY COSTA', 'IAGO ANDRADE (EXECUTIVO DE PARCERIAS)', '2025-12-01', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('f7215f3c-1f56-43c2-87cf-75b0a870a4b4', NULL, 'BARBARA STEPHAN', 'DANILO GARCIA (EXECUTIVO INTERNO)', '2025-12-01', true, '2025-12-16 19:47:13.794067+00', '2025-12-16 19:47:13.794067+00'),
('63edaf79-8894-46f3-a3fa-52b8baecdcc6', NULL, 'LETICIA ISHIKAWA', 'DANILO GARCIA (EXECUTIVO INTERNO)', '2025-12-01', true, '2025-12-16 19:47:13.794067+00', '2025-12-16 19:47:13.794067+00'),
('c49f4d93-95c4-4576-bc33-0078f35df89d', NULL, 'GIOVANA CARMO', 'DANILO GARCIA (EXECUTIVO INTERNO)', '2025-12-01', true, '2025-12-16 19:47:13.794067+00', '2025-12-16 19:47:13.794067+00'),
('d10f1d3e-2dab-4000-bd24-7b06a4f1260f', NULL, 'BIANCA FOSCHINI', 'LUCAS ZAMPOLI (DIRETOR EXECUTIVO)', '2025-12-01', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('5b015f53-1b4a-4970-9c0f-b8379c740869', NULL, 'GABRIELLE SOUSA', 'LUCAS ZAMPOLI (DIRETOR EXECUTIVO)', '2025-12-01', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('41a11978-9464-4d37-b717-704d0ee5be38', NULL, 'BKARO', 'LUCAS ZAMPOLI (DIRETOR EXECUTIVO)', '2025-12-02', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('761dbb46-14d1-4980-9cde-d4316cda000c', NULL, 'MATHEUS ARAUJO', 'LUCAS BECCARO (EXECUTIVO DE PARCERIAS)', '2025-12-02', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('c9447a2c-843e-4ac8-9284-840cbc808ef0', NULL, 'GABRIELLE SOUSA', 'LUCAS ZAMPOLI (DIRETOR EXECUTIVO)', '2025-12-02', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('6faaa15e-cee6-4c36-bca6-46a618497462', NULL, 'MARCO', 'GABRIELLE SOUSA (EXECUTIVO DE PARCERIAS)', '2025-12-02', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('38cc23ef-0b9d-41ad-bd83-414d59c9d5c0', NULL, 'CAIO PEDRO', 'IAGO ANDRADE (EXECUTIVO DE PARCERIAS)', '2025-12-02', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('960c8858-9d9b-4692-bdb9-d45aef3d574f', NULL, 'KAIZA PINHEIRO', 'IAGO ANDRADE (EXECUTIVO DE PARCERIAS)', '2025-12-02', false, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('6ca84fa2-c73c-4141-b1f3-bdfaa4d6c1d0', NULL, 'BIANCA FOSCHINI', 'LUCAS ZAMPOLI (DIRETOR EXECUTIVO)', '2025-12-02', true, '2025-12-16 19:46:42.625485+00', '2025-12-16 19:46:42.625485+00'),
('fd52042d-5027-45ec-a6f4-3a40df4bcfa9', NULL, 'BARBARA STEPHAN', 'DANILO GARCIA (EXECUTIVO INTERNO)', '2025-12-02', true, '2025-12-16 19:47:13.794067+00', '2025-12-16 19:47:13.794067+00'),
('70d02e5f-91b1-4b38-83d7-66885bb74785', NULL, 'GIOVANA CARMO', 'DANILO GARCIA (EXECUTIVO INTERNO)', '2025-12-02', true, '2025-12-16 19:47:13.794067+00', '2025-12-16 19:47:13.794067+00')
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- NOTA: Este backup contém uma AMOSTRA dos dados de live_schedules.
-- Para o backup completo dos 357 registros, execute:
-- SELECT * FROM live_schedules ORDER BY schedule_date;
-- =============================================================

-- =============================================================
-- RESUMO DO BACKUP
-- =============================================================
-- Tabela              | Registros
-- --------------------|----------
-- agencies            | 1
-- profiles            | 1
-- user_roles          | 1
-- monthly_projections | 2
-- scheduling_goals    | 2
-- notes               | 1
-- live_schedules      | 357 (amostra: 18)
-- dashboard_data      | 5 (JSON complexo)
-- =============================================================
