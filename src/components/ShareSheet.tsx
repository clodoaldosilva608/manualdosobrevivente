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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
      <SheetContent side="bottom" className="bg-card border-border max-h-[90vh] overflow-y-auto">
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
