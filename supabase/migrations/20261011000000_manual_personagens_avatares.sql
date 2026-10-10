-- =====================================================================
-- MANUAL DO SOBREVIVENTE — personagens (avatares) e storage de fotos
-- Banco compartilhado "sobrevivência-core" (Supabase mbterwktxczsyevcudoz).
--
-- REGRA DE OURO DO ECOSSISTEMA (inalterada):
--   * Nenhum projeto modifica o CÓDIGO do outro; a única ponte é o banco
--     compartilhado + deep links.
--   * Todos os objetos deste arquivo usam o prefixo manual_* (domínio
--     exclusivo do Manual) — jamais tocam as tabelas do portal.
--
-- O que este arquivo cria:
--   1) manual_personagens — catálogo de avatares escolhíveis no cadastro;
--      o admin cadastra nome + imagem (upload ou URL), ordem e ativo.
--   2) Bucket público "avatares" — fotos de perfil dos operadores
--      (pasta por usuário: avatares/<uid>/…) e imagens dos personagens
--      (pasta avatares/personagens/…, escrita só do admin).
--   3) Policies de RLS da tabela e do storage.
--
-- Idempotente: pode ser executado várias vezes sem efeito colateral.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) manual_personagens — catálogo de personagens/avatares
-- ---------------------------------------------------------------------
create table if not exists public.manual_personagens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  url_imagem text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists manual_personagens_touch on public.manual_personagens;
create trigger manual_personagens_touch before update on public.manual_personagens
  for each row execute function public.manual_touch_updated_at();

alter table public.manual_personagens enable row level security;

-- Leitura pública dos ativos (cadastro precisa listar sem login);
-- o admin enxerga e edita tudo.
drop policy if exists manual_personagens_select_public on public.manual_personagens;
create policy manual_personagens_select_public on public.manual_personagens
  for select using (ativo or manual_eh_admin());
drop policy if exists manual_personagens_insert_admin on public.manual_personagens;
create policy manual_personagens_insert_admin on public.manual_personagens
  for insert to authenticated with check (manual_eh_admin());
drop policy if exists manual_personagens_update_admin on public.manual_personagens;
create policy manual_personagens_update_admin on public.manual_personagens
  for update to authenticated using (manual_eh_admin()) with check (manual_eh_admin());
drop policy if exists manual_personagens_delete_admin on public.manual_personagens;
create policy manual_personagens_delete_admin on public.manual_personagens
  for delete to authenticated using (manual_eh_admin());

create index if not exists manual_personagens_ativo_idx
  on public.manual_personagens (ativo, ordem);

-- ---------------------------------------------------------------------
-- 2) Bucket público "avatares"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3) Policies do storage:
--    - leitura pública (avatares aparecem no perfil e no cadastro);
--    - cada operador grava somente na própria pasta avatares/<uid>/…;
--    - admin grava em qualquer pasta (inclui avatares/personagens/…).
-- ---------------------------------------------------------------------
drop policy if exists "avatares leitura publica" on storage.objects;
create policy "avatares leitura publica" on storage.objects
  for select using (bucket_id = 'avatares');

drop policy if exists "avatares upload dono ou admin" on storage.objects;
create policy "avatares upload dono ou admin" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatares'
    and ((storage.foldername(name))[1] = auth.uid()::text or manual_eh_admin())
  );

drop policy if exists "avatares atualizacao dono ou admin" on storage.objects;
create policy "avatares atualizacao dono ou admin" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatares'
    and ((storage.foldername(name))[1] = auth.uid()::text or manual_eh_admin())
  ) with check (
    bucket_id = 'avatares'
    and ((storage.foldername(name))[1] = auth.uid()::text or manual_eh_admin())
  );

drop policy if exists "avatares exclusao dono ou admin" on storage.objects;
create policy "avatares exclusao dono ou admin" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatares'
    and ((storage.foldername(name))[1] = auth.uid()::text or manual_eh_admin())
  );

-- ---------------------------------------------------------------------
-- 4) Permissões enumeradas (jamais ALL IN SCHEMA)
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.manual_personagens to authenticated;
grant select on public.manual_personagens to anon;
grant all on public.manual_personagens to service_role;
