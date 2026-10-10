/**
 * Pop-ups de crescimento — cartões ÚNICOS no dashboard do mapa (um por vez,
 * canto inferior esquerdo): seguir nas redes, apoiar e compartilhar.
 *
 * Pacing amigável: o primeiro cartão entra após `primeiro_minutos` no mapa
 * e os demais a cada `intervalo_minutos` (config do admin em
 * /admin › Configurações). Em tela limpa nada aparece. Cada cartão tem
 * dispensa simples e "não mostrar novamente" (persistido por aparelho).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HeartHandshake, Share2, ThumbsDown, Users, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  CONFIG_PADRAO,
  CHAVE_SILENCIADOS,
  lerConfigPopups,
  lerSilenciados,
  proximoPopup,
  silenciarParaSempre,
  TEXTOS_POPUP,
  type ConfigPopups,
  type TipoPopup,
} from "@/lib/popups";

/** Overrides de teste (E2E): encurtam os tempos sem tocar na configuração. */
interface OverridesTeste {
  primeiro_segundos?: number;
  intervalo_segundos?: number;
}

function lerOverrides(): OverridesTeste {
  try {
    return JSON.parse(localStorage.getItem("manual:popups-teste") ?? "{}") as OverridesTeste;
  } catch {
    return {};
  }
}

export default function PopupsCrescimento({ ativo }: { ativo: boolean }) {
  const { t } = useI18n();
  const [config, setConfig] = useState<ConfigPopups>(CONFIG_PADRAO);
  const [visivel, setVisivel] = useState<TipoPopup | null>(null);
  const cicloRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  // Configuração do admin (uma leitura por montagem; o mapa remonta ao entrar).
  useEffect(() => {
    void lerConfigPopups().then(setConfig);
  }, []);

  const disponiveis = useMemo<Record<TipoPopup, boolean>>(
    () => ({
      social: Boolean(config.instagram_url || config.youtube_url || config.telegram_url),
      apoiar: true,
      compartilhar: true,
    }),
    [config.instagram_url, config.youtube_url, config.telegram_url],
  );

  const agendar = useCallback(
    (milissegundos: number) => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const proximo = proximoPopup(cicloRef.current, lerSilenciados(), disponiveis);
        if (!proximo) return;
        cicloRef.current = proximo.ciclo;
        setVisivel(proximo.tipo);
      }, milissegundos);
    },
    [disponiveis],
  );

  // Agenda a sequência; reage se o admin mudar intervalos ou o operador
  // reativar os cartões. limpar "não mostrar" só vale no próximo load.
  useEffect(() => {
    if (!ativo || !config.ativo) return;
    const ov = lerOverrides();
    const primeiroMs = (ov.primeiro_segundos ?? config.primeiro_minutos * 60) * 1000;
    agendar(Math.min(Math.max(primeiroMs, 1000), 30 * 60 * 1000));
    return () => window.clearTimeout(timerRef.current);
  }, [ativo, config.ativo, config.primeiro_minutos, agendar]);

  const dispensar = useCallback(() => {
    setVisivel(null);
    if (!config.ativo) return;
    const ov = lerOverrides();
    const intervaloMs = (ov.intervalo_segundos ?? config.intervalo_minutos * 60) * 1000;
    agendar(Math.min(Math.max(intervaloMs, 5000), 60 * 60 * 1000));
  }, [agendar, config.ativo, config.intervalo_minutos]);

  const nuncaMais = useCallback(
    (tipo: TipoPopup) => {
      silenciarParaSempre(tipo);
      setVisivel(null);
      window.clearTimeout(timerRef.current);
      toast.success(t("Feito — este cartão não aparece mais"));
    },
    [t],
  );

  const compartilhar = useCallback(async () => {
    const dados = {
      title: t("Manual do Sobrevivente"),
      text: t(
        "App gratuito de sobrevivência: mapa tático, manual offline e assistente IA — salve este link.",
      ),
      url: window.location.origin,
    };
    try {
      const navegador = navigator as Navigator & { share?: (d: unknown) => Promise<void> };
      if (navegador.share) {
        await navegador.share(dados);
        dispensar();
        return;
      }
      await navegador.clipboard?.writeText(dados.url);
      toast.success(t("Link copiado — cole para quem você quiser salvar"));
    } catch {
      /* compartilhamento cancelado */
    }
    dispensar();
  }, [dispensar, t]);

  if (!ativo || !config.ativo || !visivel) return null;

  const textos = TEXTOS_POPUP[visivel];

  return (
    <div
      data-test={`popup-${visivel}`}
      className="hud-panel absolute bottom-[calc(7.75rem+env(safe-area-inset-bottom))] left-2 z-20 w-[min(330px,calc(100vw-1rem))] rounded-md p-3 md:bottom-24 md:left-4"
    >
      <div className="flex items-start gap-2">
        <span className="text-tactical-orange mt-0.5">
          {visivel === "social" ? (
            <Users className="h-4 w-4" />
          ) : visivel === "apoiar" ? (
            <HeartHandshake className="h-4 w-4" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="mono text-tactical-orange text-[11px] font-bold uppercase tracking-widest">
            {t(textos.titulo)}
          </p>
          <p className="mt-1 text-xs leading-relaxed">{t(textos.descricao)}</p>

          {visivel === "social" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {config.instagram_url && (
                <a
                  href={config.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glove-tap bg-tactical-orange rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background"
                >
                  Instagram
                </a>
              )}
              {config.youtube_url && (
                <a
                  href={config.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glove-tap bg-tactical-orange rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background"
                >
                  YouTube
                </a>
              )}
              {config.telegram_url && (
                <a
                  href={config.telegram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glove-tap bg-tactical-orange rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background"
                >
                  Telegram
                </a>
              )}
            </div>
          ) : visivel === "apoiar" ? (
            <Link
              to="/apoiar"
              className="glove-tap bg-tactical-orange mt-2 inline-block rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background"
              onClick={dispensar}
            >
              {t(textos.cta)}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void compartilhar()}
              className="glove-tap bg-tactical-orange mt-2 rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background"
            >
              {t(textos.cta)}
            </button>
          )}

          <button
            type="button"
            onClick={() => nuncaMais(visivel)}
            className="text-muted-foreground mt-2 flex items-center gap-1 text-[10px] hover:text-foreground"
          >
            <ThumbsDown className="h-3 w-3" /> {t("Não mostrar novamente")}
          </button>
        </div>
        <button
          type="button"
          onClick={dispensar}
          aria-label={t("Fechar")}
          className="text-muted-foreground -mr-1 -mt-1 p-1 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Reexportado para testes unitários da chave de persistência. */
export { CHAVE_SILENCIADOS };
