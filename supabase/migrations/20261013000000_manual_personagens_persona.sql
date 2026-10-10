-- =====================================================================
-- MANUAL DO SOBREVIVENTE — personagens como PERSONA do assistente IA
-- Banco compartilhado "sobrevivência-core" (Supabase mbterwktxczsyevcudoz).
--
-- O que este arquivo faz:
--   1) manual_personagens: colunas novas para a persona da IA —
--      · slug   — identificador estável (ex.: "prepper-urbano");
--      · perfil — linha de perfil/especialidades do personagem;
--      · frase  — frase-símbolo ("lema") que a IA assina.
--   2) Índice único no slug (a escolha da persona persiste por slug).
--
-- Idempotente: pode ser executado várias vezes sem efeito colateral.
-- =====================================================================

alter table public.manual_personagens
  add column if not exists slug text,
  add column if not exists perfil text,
  add column if not exists frase text;

-- Slug único quando preenchido (personagens legados sem slug continuam válidos;
-- constraint UNIQUE permite múltiplos NULL e serve de alvo do ON CONFLICT do seed).
-- dedupe defensivo antes da constraint (mantém o de menor ordem)
with duplicados as (
  select id, row_number() over (partition by slug order by ordem, created_at) as rn
  from public.manual_personagens where slug is not null
)
update public.manual_personagens set slug = null
where slug is not null
  and id in (select id from duplicados where rn > 1);

-- limpa vestígios de execuções anteriores (índice parcial da 1ª versão)
drop index if exists manual_personagens_slug_uidx;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'manual_personagens_slug_key'
      and conrelid = 'public.manual_personagens'::regclass
  ) then
    alter table public.manual_personagens
      add constraint manual_personagens_slug_key unique (slug);
  end if;
end $$;
