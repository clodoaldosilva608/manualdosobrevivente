-- =====================================================================
-- MANUAL DO SOBREVIVENTE — apoiadores: valor já arrecadado por pessoa
--
-- Cada apoiador do mural passa a poder registrar o VALOR que já
-- contribuiu (a dinheiro vivo, fora do fluxo PIX do aplicativo).
-- O campo é OPCIONAL (null = não informado) e alimenta:
--   * o letreiro do mapa e o ticker de /colaboradores — nome seguido do
--     valor ("Ricardo Menezes · R$ 25,00") quando existir;
--   * o total ARRECADADO da redline (soma dos valores dos apoiadores +
--     contribuições PIX aprovadas em manual_contribuicoes).
--
-- Idempotente: pode ser executado várias vezes sem efeito colateral.
-- =====================================================================

alter table public.manual_apoiadores
  add column if not exists valor numeric(10, 2);

-- Guarda de sanidade: valor negativo não existe no mundo real.
-- (check adiável: a constraint só é validada em novos writes se a tabela
-- já tiver nulls — null passa em check normal, então é seguro direto.)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'manual_apoiadores_valor_positivo'
  ) then
    alter table public.manual_apoiadores
      add constraint manual_apoiadores_valor_positivo check (valor is null or valor > 0);
  end if;
end $$;

comment on column public.manual_apoiadores.valor is
  'Valor total já arrecadado deste apoiador (opcional; null = não informado). Alimenta o letreiro da redline e o total ARRECADADO.';
