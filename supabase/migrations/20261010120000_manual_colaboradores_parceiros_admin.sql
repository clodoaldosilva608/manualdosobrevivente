-- =====================================================================
-- MANUAL DO SOBREVIVENTE — colaborações (PIX), parceiros e administração
-- Banco compartilhado "sobrevivência-core" (Supabase mbterwktxczsyevcudoz).
--
-- REGRA DE OURO DO ECOSSISTEMA (inalterada):
--   * Nenhum projeto modifica o CÓDIGO do outro; a única ponte é o banco
--     compartilhado + deep links.
--   * Todas as tabelas deste arquivo usam o prefixo manual_* (domínio
--     exclusivo do Manual) — jamais tocam as tabelas do portal.
--
-- O que este arquivo cria:
--   1) manual_perfil_usuarios — espelho administrável de auth.users com o
--      papel do operador (usuario | admin).
--   2) manual_contribuicoes — pedidos de contribuição voluntária (PIX):
--      entram "pendente", o admin aprova e o perfil entra na redline.
--   3) manual_parceiros — marcas patrocinadoras exibidas na aplicação.
--   4) manual_configuracoes — configurações globais do app (chave PIX,
--      nome do recebedor, cidade e valores sugeridos) em jsonb.
--   5) manual_eh_admin() — guarda usada pelas policies de RLS.
--   6) Realtime para manual_contribuicoes (notificação ao vivo no painel).
--
-- Idempotente: pode ser executado várias vezes sem efeito colateral.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) manual_perfil_usuarios — identidade administrável do Manual
-- ---------------------------------------------------------------------
create table if not exists public.manual_perfil_usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome_exibicao text,
  avatar_url text,
  papel text not null default 'usuario' check (papel in ('usuario', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill: todo usuário existente do auth ganha um perfil do Manual.
insert into public.manual_perfil_usuarios (id, email, nome_exibicao, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'nome',
    u.raw_user_meta_data ->> 'name',
    u.raw_user_meta_data ->> 'full_name',
    split_part(u.email, '@', 1)
  ),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;

-- Novos cadastros entram automaticamente no espelho (security definer
-- porque o RLS da tabela ainda não permite insert direto ao público).
create or replace function public.manual_novo_perfil() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.manual_perfil_usuarios (id, email, nome_exibicao, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'nome',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists manual_ao_criar_usuario on auth.users;
create trigger manual_ao_criar_usuario
  after insert on auth.users
  for each row execute function public.manual_novo_perfil();

-- Guarda de papel: só um admin pode promover/rebaixar (e o id é imutável).
-- Conexões privilegiadas sem JWT (donas do banco / service_role no terminal)
-- também podem alterar papéis — qualquer request via PostgREST sempre traz
-- claims (anon ou usuário), então o anon-key NUNCA consegue burlar a guarda.
create or replace function public.manual_guarda_papel() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_ausente boolean;
  jwt_role text;
begin
  if (new.id is distinct from old.id) then
    raise exception 'O id do perfil não pode ser alterado';
  end if;
  if (new.papel is distinct from old.papel) then
    jwt_ausente := current_setting('request.jwt.claims', true) is null;
    jwt_role := coalesce(auth.role(), '');
    if not (
      jwt_ausente
      or jwt_role = 'service_role'
      or exists (
        select 1 from public.manual_perfil_usuarios p
        where p.id = auth.uid() and p.papel = 'admin'
      )
    ) then
      raise exception 'Apenas administradores podem alterar papéis';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists manual_papel_touch on public.manual_perfil_usuarios;
create trigger manual_papel_touch before update on public.manual_perfil_usuarios
  for each row execute function public.manual_guarda_papel();

-- ---------------------------------------------------------------------
-- 2) manual_eh_admin() — guarda central das policies
-- ---------------------------------------------------------------------
create or replace function public.manual_eh_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.manual_perfil_usuarios
    where id = auth.uid() and papel = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 3) manual_contribuicoes — colaborações voluntárias (PIX)
--    Fluxo: operador envia (pendente) → admin aprova → entra na redline.
-- ---------------------------------------------------------------------
create table if not exists public.manual_contribuicoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome_exibicao text not null,
  email text,
  valor numeric(10, 2) not null check (valor > 0),
  mensagem text check (char_length(coalesce(mensagem, '')) <= 280),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  origem text not null default 'pix',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4) manual_parceiros — marcas que patrocinam o ecossistema
-- ---------------------------------------------------------------------
create table if not exists public.manual_parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  logo_url text,
  link text,
  nivel text not null default 'apoiador' check (nivel in ('apoiador', 'bronze', 'prata', 'ouro')),
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5) manual_configuracoes — chave/valor global do Manual (jsonb)
-- ---------------------------------------------------------------------
create table if not exists public.manual_configuracoes (
  chave text primary key,
  valor jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.manual_configuracoes (chave, valor) values
  (
    'pix',
    jsonb_build_object(
      'chave', '',
      'nome_recebedor', 'Clodoaldo Silva',
      'cidade', 'Recife',
      'valores_sugeridos', '[10, 25, 50]'::jsonb,
      'mensagem_apoio', ''
    )
  )
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- Triggers de updated_at (reaproveita a função exclusiva do Manual)
-- ---------------------------------------------------------------------
drop trigger if exists manual_perfil_usuarios_touch on public.manual_perfil_usuarios;
create trigger manual_perfil_usuarios_touch before update on public.manual_perfil_usuarios
  for each row execute function public.manual_touch_updated_at();

drop trigger if exists manual_contribuicoes_touch on public.manual_contribuicoes;
create trigger manual_contribuicoes_touch before update on public.manual_contribuicoes
  for each row execute function public.manual_touch_updated_at();

drop trigger if exists manual_parceiros_touch on public.manual_parceiros;
create trigger manual_parceiros_touch before update on public.manual_parceiros
  for each row execute function public.manual_touch_updated_at();

drop trigger if exists manual_configuracoes_touch on public.manual_configuracoes;
create trigger manual_configuracoes_touch before update on public.manual_configuracoes
  for each row execute function public.manual_touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — o coração do isolamento
-- ---------------------------------------------------------------------
alter table public.manual_perfil_usuarios enable row level security;
alter table public.manual_contribuicoes enable row level security;
alter table public.manual_parceiros enable row level security;
alter table public.manual_configuracoes enable row level security;

-- 1) manual_perfil_usuarios: cada um vê/edita o próprio perfil;
--    admin vê e edita todos; papel só muda pela guarda (trigger).
drop policy if exists manual_perfil_select_own_or_admin on public.manual_perfil_usuarios;
create policy manual_perfil_select_own_or_admin on public.manual_perfil_usuarios
  for select to authenticated using (auth.uid() = id or manual_eh_admin());
drop policy if exists manual_perfil_update_own_or_admin on public.manual_perfil_usuarios;
create policy manual_perfil_update_own_or_admin on public.manual_perfil_usuarios
  for update to authenticated using (auth.uid() = id or manual_eh_admin())
  with check (auth.uid() = id or manual_eh_admin());
drop policy if exists manual_perfil_delete_admin on public.manual_perfil_usuarios;
create policy manual_perfil_delete_admin on public.manual_perfil_usuarios
  for delete to authenticated using (manual_eh_admin());

-- 2) manual_contribuicoes: operador cria e lê as próprias; admin gerencia tudo.
drop policy if exists manual_contrib_select_own_or_admin on public.manual_contribuicoes;
create policy manual_contrib_select_own_or_admin on public.manual_contribuicoes
  for select to authenticated using (auth.uid() = user_id or manual_eh_admin());
drop policy if exists manual_contrib_insert_own on public.manual_contribuicoes;
create policy manual_contrib_insert_own on public.manual_contribuicoes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists manual_contrib_update_admin on public.manual_contribuicoes;
create policy manual_contrib_update_admin on public.manual_contribuicoes
  for update to authenticated using (manual_eh_admin()) with check (manual_eh_admin());
drop policy if exists manual_contrib_delete_admin on public.manual_contribuicoes;
create policy manual_contrib_delete_admin on public.manual_contribuicoes
  for delete to authenticated using (manual_eh_admin());

-- 3) manual_parceiros: leitura pública dos ativos; escrita só do admin.
drop policy if exists manual_parceiros_select_public on public.manual_parceiros;
create policy manual_parceiros_select_public on public.manual_parceiros
  for select using (ativo or manual_eh_admin());
drop policy if exists manual_parceiros_insert_admin on public.manual_parceiros;
create policy manual_parceiros_insert_admin on public.manual_parceiros
  for insert to authenticated with check (manual_eh_admin());
drop policy if exists manual_parceiros_update_admin on public.manual_parceiros;
create policy manual_parceiros_update_admin on public.manual_parceiros
  for update to authenticated using (manual_eh_admin()) with check (manual_eh_admin());
drop policy if exists manual_parceiros_delete_admin on public.manual_parceiros;
create policy manual_parceiros_delete_admin on public.manual_parceiros
  for delete to authenticated using (manual_eh_admin());

-- 4) manual_configuracoes: leitura pública (o PIX é exibido na página de
--    apoio); escrita só do admin.
drop policy if exists manual_config_select_public on public.manual_configuracoes;
create policy manual_config_select_public on public.manual_configuracoes
  for select using (true);
drop policy if exists manual_config_write_admin on public.manual_configuracoes;
create policy manual_config_write_admin on public.manual_configuracoes
  for update to authenticated using (manual_eh_admin()) with check (manual_eh_admin());
drop policy if exists manual_config_insert_admin on public.manual_configuracoes;
create policy manual_config_insert_admin on public.manual_configuracoes
  for insert to authenticated with check (manual_eh_admin());
drop policy if exists manual_config_delete_admin on public.manual_configuracoes;
create policy manual_config_delete_admin on public.manual_configuracoes
  for delete to authenticated using (manual_eh_admin());

-- ---------------------------------------------------------------------
-- Índices de desempenho
-- ---------------------------------------------------------------------
create index if not exists manual_contribuicoes_user_idx
  on public.manual_contribuicoes(user_id);
create index if not exists manual_contribuicoes_status_idx
  on public.manual_contribuicoes(status, created_at desc);
create index if not exists manual_parceiros_ativo_idx
  on public.manual_parceiros(ativo, ordem);

-- ---------------------------------------------------------------------
-- View pública da redline de colaboradores: expõe APENAS os dados de
-- exibição das contribuições aprovadas (nome, valor e data) — nunca e-mail
-- nem identificador do usuário. Views do dono do banco leem por cima do
-- RLS de manual_contribuicoes, por isso o escopo é mínimamente reduzido.
-- ---------------------------------------------------------------------
drop view if exists public.manual_redline_colaboradores;
create view public.manual_redline_colaboradores as
select
  c.id,
  c.nome_exibicao,
  c.valor,
  c.approved_at
from public.manual_contribuicoes c
where c.status = 'aprovada'
order by c.approved_at desc;

grant select on public.manual_redline_colaboradores to anon, authenticated;
grant all on public.manual_redline_colaboradores to service_role;

-- ---------------------------------------------------------------------
-- Realtime: notificação ao vivo no painel quando chega contribuição
-- ---------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.manual_contribuicoes;
exception
  when duplicate_object then null; -- já publicada
end $$;

-- ---------------------------------------------------------------------
-- Permissões (enumeradas — jamais ALL IN SCHEMA, que alcançaria o portal)
-- ---------------------------------------------------------------------
grant select, update on public.manual_perfil_usuarios to authenticated;
grant select, insert, update, delete on public.manual_contribuicoes to authenticated;
grant select, insert, update, delete on public.manual_parceiros to authenticated;
grant select, insert, update, delete on public.manual_configuracoes to authenticated;
grant select on public.manual_parceiros to anon;
grant select on public.manual_configuracoes to anon;
grant all on public.manual_perfil_usuarios to service_role;
grant all on public.manual_contribuicoes to service_role;
grant all on public.manual_parceiros to service_role;
grant all on public.manual_configuracoes to service_role;

-- ---------------------------------------------------------------------
-- Admin do ecossistema: o dono do projeto (conta compartilhada dos apps)
-- ---------------------------------------------------------------------
update public.manual_perfil_usuarios
set papel = 'admin', updated_at = now()
where email = 'clodoaldo608@gmail.com'
  and papel <> 'admin';
