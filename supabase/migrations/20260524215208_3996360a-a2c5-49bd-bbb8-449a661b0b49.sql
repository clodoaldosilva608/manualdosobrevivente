
-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles
  for select using (auth.uid() = user_id);

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  units text not null default 'metric',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Waypoints
create table public.waypoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'custom',
  icon text,
  color text not null default '#FF6B35',
  latitude double precision not null,
  longitude double precision not null,
  elevation double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.waypoints enable row level security;
create policy "wp_select_own" on public.waypoints for select using (auth.uid() = user_id);
create policy "wp_insert_own" on public.waypoints for insert with check (auth.uid() = user_id);
create policy "wp_update_own" on public.waypoints for update using (auth.uid() = user_id);
create policy "wp_delete_own" on public.waypoints for delete using (auth.uid() = user_id);
create trigger waypoints_touch before update on public.waypoints for each row execute function public.touch_updated_at();
create index waypoints_user_idx on public.waypoints(user_id);

-- Routes
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  geometry jsonb not null,
  distance_m double precision,
  elevation_gain_m double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.routes enable row level security;
create policy "rt_select_own" on public.routes for select using (auth.uid() = user_id);
create policy "rt_insert_own" on public.routes for insert with check (auth.uid() = user_id);
create policy "rt_update_own" on public.routes for update using (auth.uid() = user_id);
create policy "rt_delete_own" on public.routes for delete using (auth.uid() = user_id);
create trigger routes_touch before update on public.routes for each row execute function public.touch_updated_at();
create index routes_user_idx on public.routes(user_id);

-- Gear items
create table public.gear_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'tools',
  quantity integer not null default 1,
  weight_g integer not null default 0,
  notes text,
  expires_at date,
  packed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gear_items enable row level security;
create policy "gi_select_own" on public.gear_items for select using (auth.uid() = user_id);
create policy "gi_insert_own" on public.gear_items for insert with check (auth.uid() = user_id);
create policy "gi_update_own" on public.gear_items for update using (auth.uid() = user_id);
create policy "gi_delete_own" on public.gear_items for delete using (auth.uid() = user_id);
create trigger gear_touch before update on public.gear_items for each row execute function public.touch_updated_at();
create index gear_user_idx on public.gear_items(user_id);

-- Custom tile sources
create table public.custom_tile_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'xyz',
  url text not null,
  attribution text,
  min_zoom integer not null default 0,
  max_zoom integer not null default 19,
  created_at timestamptz not null default now()
);
alter table public.custom_tile_sources enable row level security;
create policy "ts_select_own" on public.custom_tile_sources for select using (auth.uid() = user_id);
create policy "ts_insert_own" on public.custom_tile_sources for insert with check (auth.uid() = user_id);
create policy "ts_update_own" on public.custom_tile_sources for update using (auth.uid() = user_id);
create policy "ts_delete_own" on public.custom_tile_sources for delete using (auth.uid() = user_id);

-- Saved maps (view configurations)
create table public.saved_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  zoom double precision not null default 12,
  active_layer text not null default 'topo',
  created_at timestamptz not null default now()
);
alter table public.saved_maps enable row level security;
create policy "sm_select_own" on public.saved_maps for select using (auth.uid() = user_id);
create policy "sm_insert_own" on public.saved_maps for insert with check (auth.uid() = user_id);
create policy "sm_update_own" on public.saved_maps for update using (auth.uid() = user_id);
create policy "sm_delete_own" on public.saved_maps for delete using (auth.uid() = user_id);
