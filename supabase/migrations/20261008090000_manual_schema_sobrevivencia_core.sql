-- =====================================================================
-- MANUAL DO SOBREVIVENTE — esquema no banco compartilhado "sobrevivência-core"
-- Projeto Supabase: mbterwktxczsyevcudoz (sa-east-1) — o MESMO banco do
-- Centro de Sobrevivência (portal).
--
-- REGRA DE OURO DO ECOSSISTEMA:
--   * Nenhum projeto modifica o CÓDIGO do outro. Os dois apps apenas
--     compartilham o mesmo banco e se linkam.
--   * Todas as tabelas do Manual usam o prefixo manual_* (domínio
--     exclusivo) — jamais tocam as tabelas do portal (products, ebooks,
--     courses, waypoints, profiles, routes, ...).
--   * Isolamento garantido por Row Level Security: cada operador só vê
--     as próprias linhas; o anônimo não vê nada.
--   * auth.users é a identidade compartilhada (1 login para os dois apps).
--
-- Idempotente: pode ser executado várias vezes sem efeito colateral.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Função de trigger exclusiva do domínio Manual (nome próprio para
--    nunca conflitar com funções do portal, ex.: update_updated_at)
-- ---------------------------------------------------------------------
create or replace function public.manual_touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1) manual_waypoints — pontos táticos marcados no mapa
-- ---------------------------------------------------------------------
create table if not exists public.manual_waypoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'geral',
  icon text,
  color text not null default '#FF6B35',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  elevation double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) manual_gear_items — itens de equipamento/mochila
-- ---------------------------------------------------------------------
create table if not exists public.manual_gear_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'geral',
  quantity integer not null default 1 check (quantity between 1 and 9999),
  weight_g integer not null default 0 check (weight_g between 0 and 1000000),
  notes text,
  expires_at date,
  packed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) manual_checklist_state — progresso dos checklists do manual
-- ---------------------------------------------------------------------
create table if not exists public.manual_checklist_state (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ---------------------------------------------------------------------
-- 4) manual_app_preferences — preferências do aplicativo por operador
-- ---------------------------------------------------------------------
create table if not exists public.manual_app_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  units text not null default 'metric' check (units in ('metric', 'nautical')),
  coord_format text not null default 'DD' check (coord_format in ('DD', 'DMS', 'MGRS')),
  north_ref text not null default 'true' check (north_ref in ('true', 'magnetic')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5) manual_weekly_report_settings — configuração do relatório semanal
-- ---------------------------------------------------------------------
create table if not exists public.manual_weekly_report_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  weekday smallint not null default 1 check (weekday between 0 and 6),
  local_time time not null default '08:00',
  timezone text not null default 'America/Sao_Paulo',
  recipient_email text not null,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6) manual_report_delivery_history — histórico de envios do relatório
-- ---------------------------------------------------------------------
create table if not exists public.manual_report_delivery_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  waypoint_count integer not null default 0,
  gear_count integer not null default 0,
  checklist_count integer not null default 0,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Triggers de updated_at (nome exclusivo por tabela)
-- ---------------------------------------------------------------------
drop trigger if exists manual_waypoints_touch on public.manual_waypoints;
create trigger manual_waypoints_touch before update on public.manual_waypoints
  for each row execute function public.manual_touch_updated_at();

drop trigger if exists manual_gear_items_touch on public.manual_gear_items;
create trigger manual_gear_items_touch before update on public.manual_gear_items
  for each row execute function public.manual_touch_updated_at();

drop trigger if exists manual_checklist_touch on public.manual_checklist_state;
create trigger manual_checklist_touch before update on public.manual_checklist_state
  for each row execute function public.manual_touch_updated_at();

drop trigger if exists manual_app_prefs_touch on public.manual_app_preferences;
create trigger manual_app_prefs_touch before update on public.manual_app_preferences
  for each row execute function public.manual_touch_updated_at();

drop trigger if exists manual_report_settings_touch on public.manual_weekly_report_settings;
create trigger manual_report_settings_touch before update on public.manual_weekly_report_settings
  for each row execute function public.manual_touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — o coração do isolamento
-- ---------------------------------------------------------------------
alter table public.manual_waypoints enable row level security;
alter table public.manual_gear_items enable row level security;
alter table public.manual_checklist_state enable row level security;
alter table public.manual_app_preferences enable row level security;
alter table public.manual_weekly_report_settings enable row level security;
alter table public.manual_report_delivery_history enable row level security;

-- 1) manual_waypoints
drop policy if exists manual_waypoints_select_own on public.manual_waypoints;
create policy manual_waypoints_select_own on public.manual_waypoints
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists manual_waypoints_insert_own on public.manual_waypoints;
create policy manual_waypoints_insert_own on public.manual_waypoints
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists manual_waypoints_update_own on public.manual_waypoints;
create policy manual_waypoints_update_own on public.manual_waypoints
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists manual_waypoints_delete_own on public.manual_waypoints;
create policy manual_waypoints_delete_own on public.manual_waypoints
  for delete to authenticated using (auth.uid() = user_id);

-- 2) manual_gear_items
drop policy if exists manual_gear_select_own on public.manual_gear_items;
create policy manual_gear_select_own on public.manual_gear_items
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists manual_gear_insert_own on public.manual_gear_items;
create policy manual_gear_insert_own on public.manual_gear_items
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists manual_gear_update_own on public.manual_gear_items;
create policy manual_gear_update_own on public.manual_gear_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists manual_gear_delete_own on public.manual_gear_items;
create policy manual_gear_delete_own on public.manual_gear_items
  for delete to authenticated using (auth.uid() = user_id);

-- 3) manual_checklist_state
drop policy if exists manual_checklist_select_own on public.manual_checklist_state;
create policy manual_checklist_select_own on public.manual_checklist_state
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists manual_checklist_insert_own on public.manual_checklist_state;
create policy manual_checklist_insert_own on public.manual_checklist_state
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists manual_checklist_update_own on public.manual_checklist_state;
create policy manual_checklist_update_own on public.manual_checklist_state
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists manual_checklist_delete_own on public.manual_checklist_state;
create policy manual_checklist_delete_own on public.manual_checklist_state
  for delete to authenticated using (auth.uid() = user_id);

-- 4) manual_app_preferences
drop policy if exists manual_prefs_select_own on public.manual_app_preferences;
create policy manual_prefs_select_own on public.manual_app_preferences
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists manual_prefs_insert_own on public.manual_app_preferences;
create policy manual_prefs_insert_own on public.manual_app_preferences
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists manual_prefs_update_own on public.manual_app_preferences;
create policy manual_prefs_update_own on public.manual_app_preferences
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists manual_prefs_delete_own on public.manual_app_preferences;
create policy manual_prefs_delete_own on public.manual_app_preferences
  for delete to authenticated using (auth.uid() = user_id);

-- 5) manual_weekly_report_settings
drop policy if exists manual_report_select_own on public.manual_weekly_report_settings;
create policy manual_report_select_own on public.manual_weekly_report_settings
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists manual_report_insert_own on public.manual_weekly_report_settings;
create policy manual_report_insert_own on public.manual_weekly_report_settings
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists manual_report_update_own on public.manual_weekly_report_settings;
create policy manual_report_update_own on public.manual_weekly_report_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists manual_report_delete_own on public.manual_weekly_report_settings;
create policy manual_report_delete_own on public.manual_weekly_report_settings
  for delete to authenticated using (auth.uid() = user_id);

-- 6) manual_report_delivery_history (somente leitura para o operador;
--    a escrita é feita pelo service_role no envio do relatório)
drop policy if exists manual_report_history_select_own on public.manual_report_delivery_history;
create policy manual_report_history_select_own on public.manual_report_delivery_history
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Índices de desempenho
-- ---------------------------------------------------------------------
create index if not exists manual_waypoints_user_idx on public.manual_waypoints(user_id);
create index if not exists manual_gear_items_user_idx on public.manual_gear_items(user_id);
create index if not exists manual_checklist_state_user_idx on public.manual_checklist_state(user_id);
create index if not exists manual_report_delivery_history_user_sent_idx
  on public.manual_report_delivery_history(user_id, sent_at desc);

-- ---------------------------------------------------------------------
-- Permissões (enumeradas — jamais ALL IN SCHEMA, que alcançaria o portal)
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.manual_waypoints to authenticated;
grant select, insert, update, delete on public.manual_gear_items to authenticated;
grant select, insert, update, delete on public.manual_checklist_state to authenticated;
grant select, insert, update, delete on public.manual_app_preferences to authenticated;
grant select, insert, update, delete on public.manual_weekly_report_settings to authenticated;
grant select on public.manual_report_delivery_history to authenticated;
grant all on public.manual_waypoints to service_role;
grant all on public.manual_gear_items to service_role;
grant all on public.manual_checklist_state to service_role;
grant all on public.manual_app_preferences to service_role;
grant all on public.manual_weekly_report_settings to service_role;
grant all on public.manual_report_delivery_history to service_role;
