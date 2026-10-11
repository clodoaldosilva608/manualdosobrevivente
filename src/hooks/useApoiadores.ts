/**
 * Apoiadores do banco (tabela manual_apoiadores — gerenciados no /admin)
 * prontos para os letreiros da Redline, com o valor já arrecadado.
 *
 * Enquanto a consulta não chega, falha ou volta vazia (aplicativo offline,
 * por exemplo), `nomes` devolve null — o chamador cai na lista semente
 * estática e o letreiro NUNCA fica sem nomes. A leitura é pública (RLS de
 * leitura para ativos) e fica 10 minutos em cache.
 *
 * `arrecadado` soma o valor registrado de cada apoiador + as contribuições
 * PIX aprovadas (view manual_redline_colaboradores). Se a consulta das
 * contribuições falhar, o total sai só com os apoiadores — nunca quebra o
 * letreiro.
 */
import { useQuery } from "@tanstack/react-query";
import { listarApoiadores } from "@/lib/apoiadores";
import { listarRedline } from "@/lib/colaboracao";
import { rotuloApoiador } from "@/lib/colaboradores";

export interface RedlineApoiadores {
  /** Rótulos "Nome · R$ X" (ou só nome); null quando sem dados do banco. */
  nomes: string[] | null;
  /** Total já arrecadado (apoiadores + contribuições aprovadas); null até o banco responder. */
  arrecadado: number | null;
}

export function useApoiadoresRedline(): RedlineApoiadores {
  const apoiadores = useQuery({
    queryKey: ["apoiadores-redline"],
    queryFn: listarApoiadores,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const contribuicoes = useQuery({
    queryKey: ["redline-arrecadado"],
    queryFn: listarRedline,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const dados = apoiadores.data;
  let nomes: string[] | null = null;
  if (dados) {
    const rotulos = dados.map((apoiador) =>
      rotuloApoiador(apoiador.nome, apoiador.valor == null ? null : Number(apoiador.valor)),
    );
    nomes = rotulos.length > 0 ? rotulos : null;
  }

  const somaApoiadores = (dados ?? []).reduce(
    (total, apoiador) => total + Number(apoiador.valor ?? 0),
    0,
  );
  const somaContribuicoes = (contribuicoes.data ?? []).reduce(
    (total, contribuicao) => total + Number(contribuicao.valor ?? 0),
    0,
  );
  const arrecadado = apoiadores.isSuccess ? somaApoiadores + somaContribuicoes : null;

  return { nomes, arrecadado };
}
