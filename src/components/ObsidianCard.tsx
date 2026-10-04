import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Vault,
  FolderPlus,
  FolderCheck,
  RefreshCw,
  NotebookPen,
  Unlink,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatInteger } from "@/lib/format";
import {
  conectarPastaObsidian,
  desconectarPastaObsidian,
  estadoPastaObsidian,
  obterUltimaSincronizacaoObsidian,
  obsidianSuportado,
  sincronizarObsidian,
  abrirObsidianApp,
} from "@/lib/obsidian";

type Estado = "carregando" | "sem-pasta" | "precisa-permissao" | "conectada";

export function ObsidianCard() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [nomePasta, setNomePasta] = useState<string | null>(null);
  const [baseNome, setBaseNome] = useState<string | null>(null);
  const [ultimoAt, setUltimoAt] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<"sincronizar" | null>(null);
  const suportado = obsidianSuportado();

  const atualizar = useCallback(async () => {
    try {
      const [{ estado: e, nome, baseNome: b }, ultimo] = await Promise.all([
        estadoPastaObsidian(),
        obterUltimaSincronizacaoObsidian(),
      ]);
      setEstado(e);
      setNomePasta(nome);
      setBaseNome(b);
      setUltimoAt(ultimo);
    } catch {
      setEstado("sem-pasta");
    }
  }, []);

  useEffect(() => {
    void atualizar();
  }, [atualizar]);

  const conectar = async () => {
    try {
      const { baseNome: b } = await conectarPastaObsidian();
      toast.success("Pasta do Obsidian conectada", {
        description: b ? `Criada dentro de “${b}”.` : undefined,
        action: {
          label: "Sincronizar agora",
          onClick: () => void sincronizar(),
        },
      });
      await atualizar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/abort/i.test(msg))
        toast.error("Não foi possível conectar a pasta", { description: msg });
    }
  };

  const sincronizar = async () => {
    setOcupado("sincronizar");
    try {
      const r = await sincronizarObsidian();
      toast.success(`Sincronizado: ${formatInteger(r.waypoints)} waypoints como notas`);
      await atualizar();
    } catch (e) {
      toast.error("Falha ao gravar as notas", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setOcupado(null);
    }
  };

  const reconectar = async () => {
    try {
      await sincronizarObsidian(); // pede permissão de novo (gesto do usuário)
      toast.success("Permissão reativada e notas atualizadas");
      await atualizar();
    } catch {
      toast.error("Permissão não concedida", {
        description: "Toque em “Conectar pasta” e escolha a pasta novamente.",
      });
    }
  };

  const desconectar = async () => {
    if (!window.confirm("Desconectar a pasta do Obsidian? As notas gravadas permanecem nela."))
      return;
    await desconectarPastaObsidian();
    toast.success("Pasta desconectada");
    await atualizar();
  };

  return (
    <section
      data-test="obsidian-card"
      className="rounded-md border border-border bg-card p-4 space-y-3"
    >
      <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground">
        <Vault className="mr-1 inline h-4 w-4" /> Obsidian
      </h2>

      <p className="text-sm text-muted-foreground">
        Conecte o aplicativo ao Obsidian: waypoints, boletins de inteligência e localizações viram
        notas <span className="mono">.md</span> dentro do seu vault — sem servidor e sem internet.
      </p>

      <details className="rounded-md border border-border bg-background/50 p-3 text-sm">
        <summary className="cursor-pointer mono text-[11px] uppercase tracking-wider text-tactical-orange">
          O que é o Obsidian?
        </summary>
        <div className="mt-2 space-y-2 text-muted-foreground">
          <p>
            O Obsidian é um aplicativo de anotações que guarda tudo em arquivos Markdown simples,
            numa pasta do seu aparelho (o “vault” ou baú de notas). É gratuito, funciona offline e
            permite pesquisar, linkar e organizar o que você escreveu — ótimo para um diário de
            sobrevivência.
          </p>
          <p>
            Ao conectar, o Manual do Sobrevivente cria a pasta “Manual do Sobrevivente” dentro da
            pasta que você escolher (de preferência o seu vault) e grava lá as notas — o Obsidian
            reindexa sozinho.
          </p>
          <p>
            Não tem o Obsidian? Baixe em{" "}
            <a
              href="https://obsidian.md"
              target="_blank"
              rel="noreferrer"
              className="text-tactical-orange underline"
            >
              obsidian.md
            </a>
            .
          </p>
        </div>
      </details>

      {!suportado ? (
        <p className="text-sm text-tactical-amber">
          Este navegador não permite gravar em pastas (use Chrome ou Edge no PC ou Android).
          Alternativa: compartilhar localizações pelo esquema{" "}
          <span className="mono">obsidian://</span> quando o Obsidian estiver instalado, ou baixar
          arquivos .md.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm">
            {estado === "carregando" && (
              <span className="text-muted-foreground">Verificando pasta…</span>
            )}
            {estado === "sem-pasta" && (
              <span className="text-muted-foreground">
                Nenhuma pasta conectada. Conecte para criar a pasta e sincronizar.
              </span>
            )}
            {estado === "precisa-permissao" && (
              <span className="text-tactical-amber">
                Pasta “{nomePasta}” aguardando permissão de acesso.
              </span>
            )}
            {estado === "conectada" && (
              <span
                data-test="obsidian-estado"
                className="flex items-center gap-2 text-tactical-green"
              >
                <FolderCheck className="h-4 w-4" /> Pasta “{nomePasta}”
                {baseNome ? ` (dentro de “${baseNome}”)` : ""} conectada
              </span>
            )}
          </div>
          {ultimoAt && estado === "conectada" && (
            <p className="text-xs text-muted-foreground">
              Última sincronização: {formatDateTime(ultimoAt)}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {estado === "sem-pasta" && (
              <Button
                data-test="obsidian-conectar"
                onClick={conectar}
                className="glove-tap w-full sm:col-span-2"
              >
                <FolderPlus className="h-4 w-4" /> Conectar pasta do Obsidian
              </Button>
            )}
            {estado === "precisa-permissao" && (
              <Button onClick={reconectar} className="glove-tap w-full sm:col-span-2">
                <RefreshCw className="h-4 w-4" /> Reconectar pasta
              </Button>
            )}
            {estado === "conectada" && (
              <>
                <Button
                  data-test="obsidian-sincronizar"
                  onClick={sincronizar}
                  disabled={ocupado !== null}
                  className="glove-tap w-full"
                >
                  {ocupado === "sincronizar" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar agora
                </Button>
                <Button
                  onClick={() => abrirObsidianApp()}
                  variant="secondary"
                  className="glove-tap w-full"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir Obsidian
                </Button>
                <Button
                  onClick={desconectar}
                  variant="ghost"
                  className="glove-tap w-full text-muted-foreground sm:col-span-2"
                >
                  <Unlink className="h-4 w-4" /> Desconectar pasta
                </Button>
              </>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground flex items-start gap-1">
        <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Também dá para salvar direto: botão “Obsidian” no boletim de inteligência e na folha de
          compartilhar da página S.O.S.
        </span>
      </p>
    </section>
  );
}
