/**
 * Assistente IA flutuante — o orbe minimizado é FUNCIONAL como a bússola:
 * anel girando com o rumo real do aparelho (sensor de orientação), ponto
 * na cor do provedor ativo (local = verde da IA local, laranja = nuvem).
 *
 * Ao toque, expande o chat completo: texto, áudio (microfone), imagem e
 * vídeo como entrada; texto sempre e áudio (TTS do aparelho) como saída.
 * Executa funcionalidades do app ("trace uma rota até X", "ative o radar"),
 * responde clima/notícias e aprende com cada conversa (memória local).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Camera,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Settings2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/hooks/usePreferences";
import { useSensorBussola } from "@/lib/bussola-sensor";
import {
  CONFIG_PADRAO_IA,
  configTemChave,
  lerConfigIA,
  salvarConfigIA,
  type ConfigIA,
} from "@/lib/assistente/config";
import { registrarPar, type ParMemoria } from "@/lib/assistente/memoria";
import { responder, type RespostaIA } from "@/lib/assistente/cerebro";
import type { AnexoMensagem, MensagemChat } from "@/lib/assistente/provedor";
import { listarConhecimentoPublico, type EntradaConhecimento } from "@/lib/ia-conhecimento";
import { fetchWeather } from "@/lib/weather.functions";
import { buscarNoticiasNavegador } from "@/lib/noticias-gdelt";

const CHAVE_CHAT = "manual:ia-chat";

interface MensagemTela extends MensagemChat {
  id: string;
  origem?: RespostaIA["origem"];
  /** Anexos da mensagem do usuário (para exibir na bolha). */
  anexos?: AnexoMensagem[];
}

function novoId(): string {
  return `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function carregarChat(): MensagemTela[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CHAT) ?? "[]") as MensagemTela[];
  } catch {
    return [];
  }
}

function salvarChat(mensagens: MensagemTela[]): void {
  try {
    localStorage.setItem(CHAVE_CHAT, JSON.stringify(mensagens.slice(-30)));
  } catch {
    /* armazenamento indisponível */
  }
}

/** Comprime imagem para data URL leve (máx. 1024 px, JPEG 0.8). */
async function comprimirImagem(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

function lerDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("leitura falhou"));
    r.readAsDataURL(arquivo);
  });
}

export default function AssistenteFlutuante() {
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { prefs } = usePreferences();
  const sensor = useSensorBussola();

  const [config, setConfig] = useState<ConfigIA>(CONFIG_PADRAO_IA);
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemTela[]>([]);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<AnexoMensagem[]>([]);
  const [pensando, setPensando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [falando, setFalando] = useState(false);
  const [global, setGlobal] = useState<EntradaConhecimento[]>([]);
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);

  // Estado inicial: chat da sessão anterior (contexto persiste no reload)
  // e a configuração mais recente (localStorage só existe no navegador).
  useEffect(() => {
    setConfig(lerConfigIA());
    setMensagens(carregarChat());
  }, []);

  // Conhecimento global curado pelo admin (cache offline de 6 h).
  useEffect(() => {
    void listarConhecimentoPublico().then(setGlobal);
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto, pensando]);

  const provedorNuvem = configTemChave(config);
  const status = provedorNuvem ? config.provider : "local";

  /** Fala um texto com a voz do aparelho (pt-BR preferida). */
  const falar = useCallback(
    (texto: string) => {
      try {
        if (!("speechSynthesis" in window)) {
          toast.error(t("Este aparelho não suporta resposta falada"));
          return;
        }
        window.speechSynthesis.cancel();
        const fala = new SpeechSynthesisUtterance(texto.slice(0, 600));
        fala.lang = "pt-BR";
        fala.onend = () => setFalando(false);
        fala.onerror = () => setFalando(false);
        setFalando(true);
        window.speechSynthesis.speak(fala);
      } catch {
        setFalando(false);
      }
    },
    [t],
  );

  const silenciar = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* nada falando */
    }
    setFalando(false);
  }, []);

  const enviar = useCallback(
    async (pergunta: string, anexosMsg: AnexoMensagem[]) => {
      const perguntaLimpa = pergunta.trim();
      if ((!perguntaLimpa && anexosMsg.length === 0) || pensando) return;
      setPensando(true);
      setTexto("");
      setAnexos([]);

      const minha: MensagemTela = {
        id: novoId(),
        papel: "usuario",
        texto: perguntaLimpa || t("(anexo enviado)"),
        anexos: anexosMsg,
      };
      setMensagens((ms) => {
        const proximas = [...ms, minha];
        salvarChat(proximas);
        return proximas;
      });

      try {
        const resposta = await responder({
          pergunta: perguntaLimpa || t("Descreva o anexo que enviei"),
          config,
          contexto: {
            centro: (() => {
              try {
                const bruto = localStorage.getItem("tgis:last-position");
                if (bruto) return JSON.parse(bruto) as { lat: number; lng: number };
              } catch {
                /* sem posição salva */
              }
              return undefined;
            })(),
          },
          historico: mensagens.map((m) => ({ papel: m.papel, texto: m.texto })),
          global,
          deps: {
            buscarNoticias: async () => {
              const ns = await buscarNoticiasNavegador();
              return ns.map((n) => ({ titulo: n.titulo, url: n.url, fonte: n.fonte }));
            },
            buscarClima: async (centro) => {
              const w = await fetchWeather({ data: centro });
              if (!w) return null;
              return {
                temperatura: w.temperature,
                condicao: w.condition,
                vento: w.windSpeed,
                umidade: w.humidity,
              };
            },
          },
        });

        const ia: MensagemTela = {
          id: novoId(),
          papel: "ia",
          texto: resposta.texto,
          origem: resposta.origem,
        };
        setMensagens((ms) => {
          const proximas = [...ms, ia];
          salvarChat(proximas);
          return proximas;
        });
        if (config.falarRespostas) falar(resposta.texto);
      } catch {
        const erro: MensagemTela = {
          id: novoId(),
          papel: "ia",
          texto: t("Tive um problema para responder. Tente de novo."),
          origem: "sem-resposta",
        };
        setMensagens((ms) => {
          const proximas = [...ms, erro];
          salvarChat(proximas);
          return proximas;
        });
      } finally {
        setPensando(false);
      }
    },
    [pensando, config, mensagens, global, falar, t],
  );

  /* ---------------- Anexos (imagem, vídeo) ---------------- */
  const anexarArquivo = useCallback(
    async (arquivo: File) => {
      try {
        if (arquivo.type.startsWith("image/")) {
          const dataUrl = await comprimirImagem(arquivo);
          setAnexos((a) => [...a, { tipo: "imagem", dataUrl }]);
        } else if (arquivo.type.startsWith("video/")) {
          if (arquivo.size > 12 * 1024 * 1024) {
            toast.error(t("Vídeo muito grande para anexar (máx. 12 MB)"));
            return;
          }
          const dataUrl = await lerDataUrl(arquivo);
          setAnexos((a) => [...a, { tipo: "video", dataUrl }]);
        } else if (arquivo.type.startsWith("audio/")) {
          const dataUrl = await lerDataUrl(arquivo);
          setAnexos((a) => [...a, { tipo: "audio", dataUrl }]);
        } else {
          toast.error(t("Formato não suportado — use imagem, áudio ou vídeo"));
        }
      } catch {
        toast.error(t("Não consegui ler o arquivo"));
      }
    },
    [t],
  );

  /* ---------------- Microfone (MediaRecorder) ---------------- */
  const alternarGravacao = useCallback(async () => {
    if (gravando) {
      gravadorRef.current?.stop();
      return;
    }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(fluxo);
      pedacosRef.current = [];
      gravador.ondataavailable = (e) => {
        if (e.data.size > 0) pedacosRef.current.push(e.data);
      };
      gravador.onstop = async () => {
        fluxo.getTracks().forEach((tr) => tr.stop());
        setGravando(false);
        const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || "audio/webm" });
        if (blob.size < 800) return; // toque acidental
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(blob);
        });
        // Áudio: com provedor de nuvem vai como input_audio; no modo local,
        // registra como nota de voz na memória (transcrição é da nuvem).
        if (configTemChave(config)) {
          await enviar("", [{ tipo: "audio", dataUrl }]);
        } else {
          toast.message(t("Áudio gravado"), {
            description: t(
              "A transcrição de áudio precisa de uma chave API (Google AI Studio) — vou guardar como nota de voz.",
            ),
          });
          const nota: ParMemoria["origem"] = "operador";
          registrarPar(
            t("Nota de voz"),
            t("O operador gravou um áudio de {n} segundos nesta conversa.", {
              n: String(Math.max(1, Math.round(blob.size / 16000))),
            }),
            nota,
          );
          await enviar(t("Como usar a minha nota de voz?"), []);
        }
      };
      gravador.start();
      gravadorRef.current = gravador;
      setGravando(true);
    } catch {
      toast.error(t("Sem permissão de microfone"));
    }
  }, [gravando, config, enviar, t]);

  /* ---------------- Orbe: rumo real do aparelho ---------------- */
  const rumo = sensor.rumoAparelho;
  const corProvedor = useMemo(() => (provedorNuvem ? "#FF6B35" : "#34D399"), [provedorNuvem]);

  // Modo mapa limpo: o orbe some junto com todo o HUD.
  if (prefs.telaLimpa && path === "/") return null;

  return (
    <>
      {/* Orbe minimizado — anel funcional com o rumo do aparelho */}
      {!aberto && (
        <button
          type="button"
          data-test="assistente-orbe"
          onClick={() => setAberto(true)}
          aria-label={t("Abrir assistente IA")}
          className="glove-tap fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-card shadow-lg md:bottom-6 md:right-6"
        >
          <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full">
            {/* Anel externo: roda com o rumo do aparelho (como a mini bússola) */}
            <g
              style={{
                transform: `rotate(${-(rumo ?? 0)}deg)`,
                transformOrigin: "28px 28px",
                transition: "transform 120ms linear",
              }}
            >
              <circle cx="28" cy="6" r="2.6" fill={corProvedor} />
              <circle cx="28" cy="50" r="1.6" fill="#888" />
              <circle cx="6" cy="28" r="1.6" fill="#888" />
              <circle cx="50" cy="28" r="1.6" fill="#888" />
            </g>
            <circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke={corProvedor}
              strokeOpacity="0.55"
              strokeWidth="1.4"
              strokeDasharray="3 4"
            />
          </svg>
          <Bot className="text-tactical-orange h-6 w-6" />
          <span className="mono absolute -bottom-1 rounded-full bg-background px-1 text-[8px] uppercase tracking-wider text-muted-foreground">
            {status === "local"
              ? "IA local"
              : config.provider === "google"
                ? "Gemini"
                : config.provider === "huggingface"
                  ? "HF"
                  : "API"}
          </span>
        </button>
      )}

      {/* Painel do chat */}
      {aberto && (
        <div
          data-test="assistente-painel"
          className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-2 left-2 z-40 flex h-[min(70dvh,560px)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl md:bottom-6 md:left-auto md:right-6 md:w-[380px]"
        >
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="bg-tactical-orange/15 text-tactical-orange flex h-8 w-8 items-center justify-center rounded-full">
              <Bot className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mono truncate text-sm font-bold">{config.nomeIA}</p>
              <p className="text-muted-foreground truncate text-[10px] uppercase tracking-wider">
                {provedorNuvem
                  ? t("Conectada · memória local ativa")
                  : t("IA local · sem chave, funciona offline")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const proxima = !config.falarRespostas;
                const nova = { ...config, falarRespostas: proxima };
                setConfig(nova);
                salvarConfigIA(nova);
                if (proxima && mensagens.length > 0) {
                  const ultima = [...mensagens].reverse().find((m) => m.papel === "ia");
                  if (ultima) falar(ultima.texto);
                } else silenciar();
              }}
              aria-label={t("Resposta falada")}
              title={t("Resposta falada")}
              className={`p-1.5 ${config.falarRespostas ? "text-tactical-orange" : "text-muted-foreground hover:text-foreground"}`}
            >
              {falando ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <a
              href="/settings#assistente-ia"
              aria-label={t("Configurar assistente")}
              className="text-muted-foreground p-1.5 hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
            </a>
            <button
              type="button"
              data-test="assistente-fechar"
              onClick={() => {
                silenciar();
                setAberto(false);
              }}
              aria-label={t("Minimizar assistente")}
              className="text-muted-foreground p-1.5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mensagens */}
          <div
            className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
            data-test="assistente-mensagens"
          >
            {mensagens.length === 0 && (
              <div className="text-muted-foreground space-y-2 text-xs leading-relaxed">
                <p className="text-tactical-orange mono text-[11px] font-bold uppercase tracking-widest">
                  {t("{n} à sua disposição", { n: config.nomeIA })}
                </p>
                <p>
                  {t(
                    "Peça ações do app, sobrevivência, clima e notícias — eu executo e respondo, e aprendo com cada conversa.",
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    t("Trace uma rota até o centro de Recife"),
                    t("Ative o radar de chuva"),
                    t("Quais as principais notícias?"),
                    t("Previsão para hoje"),
                    t("Como purificar água?"),
                  ].map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => void enviar(sugestao, [])}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:border-tactical-orange/60 hover:text-tactical-orange"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.papel === "usuario" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] space-y-1.5 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    m.papel === "usuario"
                      ? "bg-tactical-orange/15 text-foreground"
                      : "bg-background/70 border border-border"
                  }`}
                >
                  {m.anexos?.map((a, i) =>
                    a.tipo === "imagem" ? (
                      <img key={i} src={a.dataUrl} alt="" className="max-h-32 rounded" />
                    ) : (
                      <span key={i} className="text-muted-foreground mono text-[10px] uppercase">
                        {a.tipo}
                      </span>
                    ),
                  )}
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  {m.papel === "ia" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => (falando ? silenciar() : falar(m.texto))}
                        className="text-muted-foreground flex items-center gap-1 text-[10px] hover:text-foreground"
                      >
                        {falando ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        {t("Ouvir")}
                      </button>
                      {m.origem && m.origem !== "provedor" && (
                        <span className="text-muted-foreground/70 mono text-[9px] uppercase">
                          {m.origem === "memoria"
                            ? t("memória")
                            : m.origem === "global"
                              ? t("conhecimento oficial")
                              : m.origem === "local"
                                ? t("base local")
                                : m.origem === "acao"
                                  ? t("executado no app")
                                  : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {pensando && (
              <div className="flex justify-start">
                <div className="bg-background/70 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                  <Loader2 className="text-tactical-orange h-3.5 w-3.5 animate-spin" />
                  {t("Pensando…")}
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Anexos pendentes */}
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 pt-2">
              {anexos.map((a, i) => (
                <span
                  key={i}
                  className="text-muted-foreground flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px]"
                >
                  {a.tipo === "imagem" ? (
                    <img src={a.dataUrl} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <Paperclip className="h-3 w-3" />
                  )}
                  {a.tipo}
                  <button
                    type="button"
                    onClick={() => setAnexos((arr) => arr.filter((_, j) => j !== i))}
                    aria-label={t("Remover anexo")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Entrada: texto + mídia + voz */}
          <div className="flex items-end gap-1.5 border-t border-border p-2">
            <input
              ref={arquivoRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void anexarArquivo(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => arquivoRef.current?.click()}
              aria-label={t("Anexar imagem, áudio ou vídeo")}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-test="assistente-mic"
              onClick={() => void alternarGravacao()}
              aria-label={t("Gravar áudio")}
              className={`p-2 ${gravando ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Mic className="h-4 w-4" />
            </button>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar(texto, anexos);
                }
              }}
              rows={1}
              placeholder={t("Pergunte ou peça uma ação…")}
              className="bg-input text-foreground max-h-24 min-h-10 flex-1 resize-none rounded-md border border-border px-3 py-2 text-sm"
              data-test="assistente-input"
            />
            <button
              type="button"
              data-test="assistente-enviar"
              onClick={() => void enviar(texto, anexos)}
              disabled={pensando || (!texto.trim() && anexos.length === 0)}
              aria-label={t("Enviar")}
              className="glove-tap bg-tactical-orange text-background flex h-10 w-10 items-center justify-center rounded-md disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-muted-foreground/60 pb-1.5 text-center text-[9px]">
            <Camera className="mr-1 inline h-2.5 w-2.5" />
            {t("Imagem, áudio e vídeo entram aqui · a chave API fica só no seu aparelho")}
          </p>
        </div>
      )}
    </>
  );
}
