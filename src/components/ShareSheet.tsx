import { useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Send,
  Mail,
  MapPin,
  Share2,
  Copy,
  Facebook,
  Twitter,
  Smartphone,
  NotebookPen,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  abrirUriObsidian,
  conectarPastaObsidian,
  estadoPastaObsidian,
  nomeArquivoSeguro,
  notaLocalizacaoMarkdown,
  obsidianSuportado,
  salvarNotaObsidian,
  uriObsidianNovaNota,
  SUBPASTA_LOCALIZACOES,
} from "@/lib/obsidian";
import { downloadText } from "@/lib/gpx-kml";

export interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  /** Link de mapa (Google Maps) quando houver posição. */
  mapUrl?: string | null;
}

export function ShareSheet({ open, onOpenChange, title, text, mapUrl }: ShareSheetProps) {
  const [manual, setManual] = useState(false);
  const full = mapUrl ? `${text}\n${mapUrl}` : text;
  const enc = encodeURIComponent(full);

  const openUrl = (url: string) => {
    onOpenChange(false);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /** Guarda a localização como nota no Obsidian (3 níveis de degradê). */
  const salvarNoObsidian = async () => {
    try {
      const markdown = notaLocalizacaoMarkdown({ titulo: title, texto: full, mapUrl });
      const nome = nomeArquivoSeguro(title || "localizacao", { data: Date.now() });
      let estado = await estadoPastaObsidian();
      if (estado.estado !== "conectada" && obsidianSuportado()) {
        if (
          !window.confirm(
            "Conectar ao Obsidian agora? O aplicativo criará a pasta “Manual do Sobrevivente” dentro da pasta que você escolher (de preferência o seu vault) e salvará a localização lá.",
          )
        )
          return;
        if (estado.estado === "sem-pasta") {
          await conectarPastaObsidian();
          toast.success("Pasta do Obsidian conectada");
        }
        estado = await estadoPastaObsidian();
      }
      if (estado.estado === "conectada") {
        await salvarNotaObsidian({
          subpasta: SUBPASTA_LOCALIZACOES,
          nomeArquivo: nome,
          markdown,
        });
        toast.success("Localização salva como nota no Obsidian");
        onOpenChange(false);
        return;
      }
      // Sem pasta (navegador sem seletor): tenta o URI obsidian:// ...
      const uri = uriObsidianNovaNota({
        caminho: `Manual do Sobrevivente/${SUBPASTA_LOCALIZACOES}/${nome}`,
        conteudo: markdown,
      });
      if (uri) {
        toast.info(
          "Abrindo o Obsidian… se nada acontecer, instale o Obsidian (obsidian.md) ou conecte uma pasta no Chrome/Edge.",
        );
        abrirUriObsidian(uri);
        return;
      }
      // ... e se o texto for longo demais para URI, baixa o arquivo .md
      downloadText(nome, markdown, "text/markdown");
      toast.info("Texto longo demais para o Obsidian — a nota foi baixada como arquivo .md");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/abort/i.test(msg))
        toast.error("Não foi possível salvar no Obsidian", { description: msg });
    }
  };

  const options = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      run: () => openUrl(`https://wa.me/?text=${enc}`),
    },
    {
      label: "Telegram",
      icon: Send,
      run: () =>
        openUrl(
          `https://t.me/share/url?url=${encodeURIComponent(mapUrl ?? "")}&text=${encodeURIComponent(text)}`,
        ),
    },
    {
      label: "SMS",
      icon: Smartphone,
      run: () => openUrl(`sms:?&body=${enc}`),
    },
    {
      label: "E-mail",
      icon: Mail,
      run: () => openUrl(`mailto:?subject=${encodeURIComponent(title)}&body=${enc}`),
    },
    {
      label: "Google Maps",
      icon: MapPin,
      run: () => (mapUrl ? openUrl(mapUrl) : toast.error("Sem posição GPS ainda")),
    },
    {
      label: "Facebook",
      icon: Facebook,
      run: () =>
        mapUrl
          ? openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(mapUrl)}`)
          : toast.error("Sem posição GPS ainda"),
    },
    {
      label: "X",
      icon: Twitter,
      run: () => openUrl(`https://twitter.com/intent/tweet?text=${enc}`),
    },
    {
      label: "Obsidian",
      icon: NotebookPen,
      run: () => void salvarNoObsidian(),
    },
    {
      label: "Compartilhar do aparelho",
      icon: Share2,
      run: async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
          try {
            await navigator.share({ title, text: full });
            onOpenChange(false);
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return;
          }
        }
        toast.error("Compartilhamento do aparelho indisponível");
      },
    },
    {
      label: "Copiar texto",
      icon: Copy,
      run: async () => {
        try {
          await navigator.clipboard.writeText(full);
          toast.success("Copiado para a área de transferência");
          onOpenChange(false);
        } catch {
          setManual(true);
          toast.error("Copie manualmente o texto exibido");
        }
      },
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
          <SheetTitle className="mono text-tactical-orange">COMPARTILHAR LOCALIZAÇÃO</SheetTitle>
          <SheetDescription>Escolha para onde enviar suas coordenadas.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={o.run}
              className="glove-tap rounded-md border border-border bg-background/60 hover:border-tactical-orange/60 p-3 flex flex-col items-center gap-2 mono text-[10px] uppercase tracking-wider text-center"
            >
              <o.icon className="h-6 w-6 text-tactical-orange" />
              {o.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-border bg-background/50 p-3">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Texto que será enviado
          </div>
          <textarea
            readOnly
            value={full}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-28 bg-background border border-border rounded-md p-2 mono text-sm"
          />
          {manual && (
            <p className="text-xs text-muted-foreground mt-2">
              Selecione o texto acima e copie manualmente.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
