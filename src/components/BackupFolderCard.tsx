import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderPlus, FolderCheck, RefreshCw, Undo2, Unlink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatInteger } from "@/lib/format";
import {
  escolherPastaBackup,
  estadoPastaBackup,
  gravarBackupNaPasta,
  desconectarPastaBackup,
  restaurarDaPasta,
  obterUltimoBackupAt,
  seletorPastaSuportado,
} from "@/lib/backup";

type Estado = "carregando" | "sem-pasta" | "precisa-permissao" | "conectada";

export function BackupFolderCard() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [nomePasta, setNomePasta] = useState<string | null>(null);
  const [ultimoAt, setUltimoAt] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<"backup" | "restaurar" | null>(null);
  const suportado = seletorPastaSuportado();

  const atualizar = useCallback(async () => {
    try {
      const [{ estado: e, nome }, ultimo] = await Promise.all([
        estadoPastaBackup(),
        obterUltimoBackupAt(),
      ]);
      setEstado(e);
      setNomePasta(nome);
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
      await escolherPastaBackup();
      toast.success("Pasta de backup conectada");
      await atualizar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/abort/i.test(msg))
        toast.error("Não foi possível conectar a pasta", { description: msg });
    }
  };

  const reconectar = async () => {
    try {
      await gravarBackupNaPasta(); // pede permissão quando necessário (gesto do usuário)
      toast.success("Permissão reativada e backup atualizado");
      await atualizar();
    } catch {
      toast.error("Permissão não concedida", {
        description: "Toque em “Conectar pasta” e selecione a pasta novamente.",
      });
    }
  };

  const fazerBackup = async () => {
    setOcupado("backup");
    try {
      const b = await gravarBackupNaPasta(null, { forcar: true });
      toast.success(
        `Backup salvo: ${formatInteger(b.contagens.waypoints)} waypoints, ${formatInteger(b.contagens.mochila)} itens`,
      );
      await atualizar();
    } catch (e) {
      toast.error("Falha ao gravar o backup", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setOcupado(null);
    }
  };

  const restaurar = async () => {
    if (
      !window.confirm(
        "Restaurar os dados do backup nesta pasta? Registros mais recentes vencem os locais.",
      )
    )
      return;
    setOcupado("restaurar");
    try {
      const r = await restaurarDaPasta(null);
      toast.success(
        `Restaurado: ${formatInteger(r.waypoints)} waypoints, ${formatInteger(r.mochila)} itens, ${formatInteger(r.mochilas)} mochilas, ${formatInteger(r.checklist)} marcações`,
      );
    } catch (e) {
      toast.error("Falha ao restaurar", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setOcupado(null);
    }
  };

  const desconectar = async () => {
    if (!window.confirm("Desconectar a pasta de backup? Os arquivos gravados permanecem nela."))
      return;
    await desconectarPastaBackup();
    toast.success("Pasta desconectada");
    await atualizar();
  };

  if (!suportado && estado === "sem-pasta") return null;

  return (
    <section className="rounded-md border border-border bg-card p-4 space-y-3">
      <h2 className="mono text-xs uppercase tracking-widest text-muted-foreground">
        Pasta de backup
      </h2>

      {!suportado ? (
        <p className="text-sm text-muted-foreground">
          Este navegador não permite escolher pastas. Use “Backup completo” acima para gerar o
          arquivo manualmente.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm">
            {estado === "carregando" && (
              <span className="text-muted-foreground">Verificando pasta…</span>
            )}
            {estado === "sem-pasta" && (
              <span className="text-muted-foreground">Nenhuma pasta conectada.</span>
            )}
            {estado === "precisa-permissao" && (
              <span className="text-tactical-amber">
                Pasta “{nomePasta}” aguardando permissão de acesso.
              </span>
            )}
            {estado === "conectada" && (
              <span className="flex items-center gap-2 text-tactical-green">
                <FolderCheck className="h-4 w-4" /> Pasta “{nomePasta}” conectada
              </span>
            )}
          </div>
          {ultimoAt && estado === "conectada" && (
            <p className="text-xs text-muted-foreground">
              Último backup: {formatDateTime(ultimoAt)} · gravação automática a cada alteração
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {estado === "sem-pasta" && (
              <Button onClick={conectar} className="glove-tap w-full sm:col-span-2">
                <FolderPlus className="h-4 w-4" /> Conectar pasta de backup
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
                  onClick={fazerBackup}
                  disabled={ocupado !== null}
                  className="glove-tap w-full"
                >
                  {ocupado === "backup" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Backup agora
                </Button>
                <Button
                  onClick={restaurar}
                  disabled={ocupado !== null}
                  variant="secondary"
                  className="glove-tap w-full"
                >
                  {ocupado === "restaurar" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Undo2 className="h-4 w-4" />
                  )}
                  Restaurar do backup
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
    </section>
  );
}
