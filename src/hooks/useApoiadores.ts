/**
 * Apoiadores do banco (tabela manual_apoiadores — gerenciados no /admin)
 * prontos para os letreiros da Redline.
 *
 * Enquanto a consulta não chega, falha ou volta vazia (aplicativo offline,
 * por exemplo), o hook devolve null — o chamador cai na lista semente
 * estática e o letreiro NUNCA fica sem nomes. A leitura é pública (RLS de
 * leitura para ativos) e fica 10 minutos em cache.
 */
import { useQuery } from "@tanstack/react-query";
import { listarApoiadores } from "@/lib/apoiadores";

/** Nomes ativos do mural, na ordem do mural; null quando sem dados do banco. */
export function useApoiadoresRedline(): string[] | null {
  const { data } = useQuery({
    queryKey: ["apoiadores-redline"],
    queryFn: listarApoiadores,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  if (!data) return null;
  const nomes = data.map((apoiador) => apoiador.nome).filter((nome) => nome.trim() !== "");
  return nomes.length > 0 ? nomes : null;
}
