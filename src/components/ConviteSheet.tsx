/**
 * Convite para amigos — folha de compartilhamento da aplicação.
 *
 * Diferente do ShareSheet (que envia localização/coordenadas da rota SOS),
 * esta folha divulga o aplicativo em si: mensagem de convite traduzida no
 * idioma do operador + link canônico, com os mesmos canais diretos da folha
 * de localização (WhatsApp, Telegram, SMS, e-mail, X, Facebook), folha
 * nativa do aparelho e cópia para a área de transferência.
 *
 * `BotaoConvidar` é o ponto de entrada reutilizável: um botão que já traz
 * a folha acoplada, usado em Ajustes, Painel de dados e tela final do
 * treinamento de bússola.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Share2, Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  IconeEmail,
  IconeFacebook,
  IconeSms,
  IconeTelegram,
  IconeWhatsApp,
  IconeX,
} from "@/components/brand-icons";
import { useI18n } from "@/lib/i18n";
import {
  TITULO_CONVITE,
  URL_APP,
  URL_BANNER_CONVITE,
  carregarBannerConvite,
  compartilharConvite,
  contagemConvites,
  conviteCompleto,
  registrarConviteLocal,
  type ResultadoConvite,
} from "@/lib/convite";

export function ConviteSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [manual, setManual] = useState(false);
  const [convites, setConvites] = useState(0);
  // Banner do aplicativo: carregado quando a folha abre (cache local) e
  // anexado na folha nativa quando o aparelho aceita arquivos.
  const [banner, setBanner] = useState<File | null>(null);
  const completo = conviteCompleto();
  const enc = encodeURIComponent(completo);

  // Contagem recarregada a cada abertura (inclui envios feitos nesta sessão).
  useEffect(() => {
    if (!open) return;
    setConvites(contagemConvites());
    void carregarBannerConvite().then(setBanner);
  }, [open]);

  /** Executa o compartilhamento, trata o resultado e atualiza o contador. */
  const enviar = async (run: () => Promise<ResultadoConvite>) => {
    const resultado = await run();
    setConvites(contagemConvites());
    switch (resultado) {
      case "nativo":
        toast.success(t("Obrigado por divulgar o Manual"));
        onOpenChange(false);
        break;
      case "copiado":
        toast.success(t("Convite copiado — cole na conversa"));
        onOpenChange(false);
        break;
      case "cancelado":
        break;
      case "manual":
        setManual(true);
        toast.error(t("Não foi possível copiar — selecione o texto"));
        break;
    }
  };

  const openUrl = (url: string) => {
    registrarConviteLocal();
    setConvites(contagemConvites());
    onOpenChange(false);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const options: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Classe extra de cor para ícones neutros (sem cor de marca própria). */
    tone?: string;
    run: () => void;
  }> = [
    {
      label: "WhatsApp",
      icon: IconeWhatsApp,
      run: () => openUrl(`https://wa.me/?text=${enc}`),
    },
    {
      label: "Telegram",
      icon: IconeTelegram,
      run: () =>
        openUrl(
          `https://t.me/share/url?url=${encodeURIComponent(URL_APP)}&text=${encodeURIComponent(textoDoConviteSemLink(completo))}`,
        ),
    },
    {
      label: "SMS",
      icon: IconeSms,
      run: () => openUrl(`sms:?&body=${enc}`),
    },
    {
      label: "E-mail",
      icon: IconeEmail,
      run: () => openUrl(`mailto:?subject=${encodeURIComponent(TITULO_CONVITE)}&body=${enc}`),
    },
    {
      label: "Facebook",
      icon: IconeFacebook,
      run: () =>
        openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_APP)}`),
    },
    {
      label: "X",
      icon: IconeX,
      run: () => openUrl(`https://twitter.com/intent/tweet?text=${enc}`),
    },
    {
      label: t("Compartilhar do aparelho"),
      icon: Share2,
      tone: "text-tactical-orange",
      run: () => void enviar(() => compartilharConvite({ banner })),
    },
    {
      label: t("Copiar convite"),
      icon: Copy,
      tone: "text-tactical-orange",
      run: () =>
        void enviar(async () => {
          try {
            await navigator.clipboard.writeText(completo);
            return "copiado";
          } catch {
            return "manual";
          }
        }),
    },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setManual(false);
        onOpenChange(o);
      }}
    >
      <SheetContent side="bottom" className="bg-card border-border">
        <SheetHeader>
          <SheetTitle className="mono text-tactical-orange">{t("CONVOQUE O ESQUADRÃO")}</SheetTitle>
          <SheetDescription>{t("Escolha para onde enviar o convite.")}</SheetDescription>
        </SheetHeader>

        {/* Banner do aplicativo: vai anexado na folha nativa e aparece na
            prévia do link (og:image) no WhatsApp, Telegram e Facebook. */}
        <div className="mt-3 overflow-hidden rounded-md border border-border bg-background/60">
          <img
            src={URL_BANNER_CONVITE}
            alt={t("Banner do convite")}
            data-test="convite-banner"
            className="aspect-[1200/630] w-full object-cover"
            loading="lazy"
          />
          <p className="mono px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            {t(
              "Mensagem pronta com o link — a imagem vai junto na folha nativa e na prévia do WhatsApp e Telegram.",
            )}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={o.run}
              className="glove-tap rounded-md border border-border bg-background/60 hover:border-tactical-orange/60 p-3 flex flex-col items-center gap-2 mono text-[10px] uppercase tracking-wider text-center"
            >
              <o.icon className={`h-6 w-6 ${o.tone ?? ""}`} />
              {o.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-border bg-background/50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("Convites enviados")}: <span className="text-tactical-orange">{convites}</span>
            </span>
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {URL_APP}
            </span>
          </div>
          <textarea
            readOnly
            value={completo}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-28 bg-background border border-border rounded-md p-2 mono text-sm"
          />
          {manual && (
            <p className="text-xs text-muted-foreground mt-2">
              {t("Não foi possível copiar — selecione o texto")}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Recorta o link da mensagem para canais que exibem o link à parte (Telegram). */
function textoDoConviteSemLink(completo: string): string {
  return completo.replace(`\n${URL_APP}`, "");
}

/** Botão reutilizável que abre o ConviteSheet — uma linha em cada tela. */
export function BotaoConvidar({
  className,
  variant = "default",
  label,
}: {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive";
  label?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>
        <Users className="h-4 w-4" /> {label ?? t("Convidar amigos")}
      </Button>
      <ConviteSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
