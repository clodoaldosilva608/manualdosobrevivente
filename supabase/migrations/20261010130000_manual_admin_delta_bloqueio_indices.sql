-- Delta do ecossistema de colaboração — endurecimentos aplicados no banco
-- core além da migration 20261010120000_manual_colaboradores_parceiros_admin.
--
-- 1) manual_perfil_usuarios.bloqueado — espelho do banimento de conta para
--    listagens administrativas rápidas (o banimento real vive no auth).
-- 2) Índices de apoio para a fila de contribuições e a vitrine.
--
-- Idempotente.

alter table public.manual_perfil_usuarios
  add column if not exists bloqueado boolean not null default false;

create index if not exists manual_contribuicoes_status_idx
  on public.manual_contribuicoes (status, created_at desc);
create index if not exists manual_contribuicoes_user_idx
  on public.manual_contribuicoes (user_id);
create index if not exists manual_contribuicoes_aprovada_idx
  on public.manual_contribuicoes (approved_at desc) where status = 'aprovada';
create index if not exists manual_parceiros_ordem_idx
  on public.manual_parceiros (ordem);
