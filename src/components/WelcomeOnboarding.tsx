import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderPlus, ShieldCheck, MapPinned, Backpack, BookOpen, Siren } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSetting, setSetting } from "@/lib/db";
import { escolherPastaBackup, seletorPastaSuportado } from "@/lib/backup";
import { usePwaInstall } from "@/lib/pwa";

const CHAVE_ONBOARDING = "onboarding-done";

type Passo = "boas-vindas" | "pasta" | "instalacao";

export function WelcomeOnboarding() {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>("boas-vindas");
  const [escolhendo, setEscolhendo] = useState(false);
  const [pastaOk, setPastaOk] = useState(false);
  const { podeInstalar, instalar, plataforma } = usePwaInstall();

  useEffect(() => {
    let alive = true;
    const verificar = async () => {
      try {
        const feito = await getSetting<boolean>(CHAVE_ONBOARDING);
        if (!alive || feito) return;
        // O onboarding só abre DEPOIS da autenticação: com o portão de login
        // na frente, o modal Radix por baixo trunca o foco e o aria do portão
        // (aria-hidden nos irmãos) — o operador não conseguiria digitar.
        const { data } = await supabase.auth.getSession();
        if (!alive || !data.session) return;
        // Pequena pausa para o mapa/tela inicial assentarem antes do modal.
        window.setTimeout(() => {
          if (alive) setAberto(true);
        }, 900);
      } catch {
        /* armazenamento indisponível — não abre */
      }
    };
    void verificar();
    return () => {
      alive = false;
    };
  }, []);

  const concluir = useCallback(async () => {
    setAberto(false);
    try {
      await setSetting(CHAVE_ONBOARDING, true);
    } catch {
      /* segue sem persistir — modal volta no próximo acesso */
    }
  }, []);

  const conectarPasta = async () => {
    setEscolhendo(true);
    try {
      await escolherPastaBackup();
      setPastaOk(true);
      toast.success("Pasta de backup conectada");
      setPasso("instalacao");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/abort/i.test(msg)) {
        // usuário fechou o seletor — permanece no passo
      } else {
        toast.error("Não foi possível conectar a pasta", { description: msg });
      }
    } finally {
      setEscolhendo(false);
    }
  };

  const dicaInstalacao =
    plataforma === "ios"
      ? "No iPhone/iPad: toque no botão Compartilhar na barra do Safari e escolha “Adicionar à Tela de Início”."
      : plataforma === "android"
        ? "No Chrome do Android, toque em ⋮ e escolha “Instalar aplicativo”."
        : "Use o ícone de instalação na barra de endereço do navegador.";

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && void concluir()}>
      <DialogContent className="max-w-md bg-card border-border gap-0">
        {passo === "boas-vindas" && (
          <>
            <DialogHeader>
              <DialogTitle className="mono text-tactical-orange tracking-wider">
                BEM-VINDO, OPERADOR
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Este aplicativo guarda tudo{" "}
                <strong className="text-foreground">no seu aparelho</strong> — sem necessidade de
                conta e funcionando sem internet.
              </DialogDescription>
            </DialogHeader>
            <ul className="my-4 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-tactical-orange" />
                <span>Mapa tático com MGRS, medições e waypoints salvos localmente</span>
              </li>
              <li className="flex items-start gap-3">
                <Backpack className="mt-0.5 h-5 w-5 shrink-0 text-tactical-orange" />
                <span>Mochila de emergência com controle de peso e validade</span>
              </li>
              <li className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-tactical-orange" />
                <span>Manual de sobrevivência disponível para baixar e ler offline</span>
              </li>
              <li className="flex items-start gap-3">
                <Siren className="mt-0.5 h-5 w-5 shrink-0 text-tactical-orange" />
                <span>S.O.S com sinalização luminosa e coordenadas para resgate</span>
              </li>
            </ul>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={() => setPasso("pasta")}
                className="w-full bg-tactical-orange text-background glove-tap"
              >
                Continuar
              </Button>
              <button
                type="button"
                onClick={() => void concluir()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Pular configuração
              </button>
            </DialogFooter>
          </>
        )}

        {passo === "pasta" && (
          <>
            <DialogHeader>
              <DialogTitle className="mono text-tactical-orange tracking-wider">
                PASTA DE BACKUP
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Escolha (ou crie) uma pasta no aparelho. Todas as suas atividades — waypoints,
                mochila e checklist — serão salvas nela automaticamente, servindo de backup para
                restauração.
              </DialogDescription>
            </DialogHeader>

            {seletorPastaSuportado() ? (
              <div className="my-4 space-y-3">
                {pastaOk ? (
                  <p className="flex items-center gap-2 text-sm text-tactical-green">
                    <ShieldCheck className="h-5 w-5" /> Pasta conectada com sucesso.
                  </p>
                ) : (
                  <Button
                    onClick={() => void conectarPasta()}
                    disabled={escolhendo}
                    variant="outline"
                    className="w-full h-auto py-4 glove-tap"
                  >
                    <FolderPlus className="h-5 w-5 mr-2 shrink-0" />
                    <span className="text-left leading-tight">
                      {escolhendo ? "Abrindo seletor…" : "Escolher pasta de backup"}
                    </span>
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Nada é enviado para a internet. O aplicativo grava apenas nesta pasta.
                </p>
              </div>
            ) : (
              <div className="my-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Este navegador não permite escolher uma pasta. Seus dados continuarão salvos e
                  seguros no aparelho, e você poderá gerar backups em{" "}
                  <strong className="text-foreground">Ajustes → Backup completo</strong> quando
                  quiser.
                </p>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={() => setPasso("instalacao")}
                className="w-full bg-tactical-orange text-background glove-tap"
              >
                Continuar
              </Button>
              <button
                type="button"
                onClick={() => void concluir()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Agora não
              </button>
            </DialogFooter>
          </>
        )}

        {passo === "instalacao" && (
          <>
            <DialogHeader>
              <DialogTitle className="mono text-tactical-orange tracking-wider">
                INSTALAR NO APARELHO
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Instale o aplicativo para abrir em tela cheia e funcionar direto da sua tela de
                início, mesmo sem sinal.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-3">
              {podeInstalar ? (
                <Button
                  onClick={() => void instalar()}
                  className="w-full bg-tactical-orange text-background glove-tap"
                >
                  Instalar aplicativo
                </Button>
              ) : (
                <p className="rounded-md border border-border bg-background/50 p-3 text-sm text-muted-foreground">
                  {dicaInstalacao}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => void concluir()}
                variant="outline"
                className="w-full glove-tap"
              >
                Começar a usar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
