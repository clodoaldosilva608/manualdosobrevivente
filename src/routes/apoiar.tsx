import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  HeartHandshake,
  LogIn,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatMoeda, formatDateTime } from "@/lib/format";
import { montarPixCopiaECola } from "@/lib/pix.brcode";
import {
  lerConfigPix,
  minhasContribuicoes,
  perfilAtual,
  registrarContribuicao,
  type ConfigPix,
  type Contribuicao,
  type PerfilManual,
} from "@/lib/colaboracao";

export const Route = createFileRoute("/apoiar")({
  head: () => ({
    meta: [
      { title: "Apoiar o projeto — Manual do Sobrevivente" },
      {
        name: "description",
        content:
          "Contribua com qualquer valor via PIX para manter o Manual do Sobrevivente gratuito e no ar. QR Code e chave copia e cola.",
      },
      { property: "og:title", content: "Apoiar o projeto — Manual do Sobrevivente" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Apoiar,
});

async function gerarQr(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: "#111111", light: "#ffffff" },
  });
}

function Apoiar() {
  const { t } = useI18n();
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilManual | null>(null);
  const [config, setConfig] = useState<ConfigPix | null>(null);
  const [minhas, setMinhas] = useState<Contribuicao[]>([]);

  const [valor, setValor] = useState<number>(25);
  const [valorLivre, setValorLivre] = useState("");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [qr, setQr] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [sessao, cfg] = await Promise.all([
        perfilAtual().catch(() => null),
        lerConfigPix().catch(() => null),
      ]);
      setPerfil(sessao);
      setConfig(cfg);
      if (sessao) {
        setNomeExibicao(sessao.nome_exibicao ?? "");
        setMinhas(await minhasContribuicoes().catch(() => []));
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const valorFinal = useMemo(() => {
    const livre = Number(valorLivre.replace(",", "."));
    if (valorLivre.trim() && Number.isFinite(livre) && livre > 0) return livre;
    return valor > 0 ? valor : 0;
  }, [valor, valorLivre]);

  const payloadPix = useMemo(() => {
    if (!config?.chave || !config.nome_recebedor || !config.cidade) return "";
    return montarPixCopiaECola({
      chave: config.chave,
      nomeRecebedor: config.nome_recebedor,
      cidade: config.cidade,
      valor: valorFinal > 0 ? valorFinal : undefined,
    });
  }, [config, valorFinal]);

  useEffect(() => {
    let vivo = true;
    if (!payloadPix) {
      setQr("");
      return;
    }
    void gerarQr(payloadPix).then((dataUrl) => {
      if (vivo) setQr(dataUrl);
    });
    return () => {
      vivo = false;
    };
  }, [payloadPix]);

  const copiar = async (texto: string, aviso: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(aviso);
    } catch {
      toast.error(t("Não foi possível copiar — copie manualmente"));
    }
  };

  const enviar = async () => {
    if (valorFinal <= 0) {
      toast.error(t("Informe um valor maior que zero"));
      return;
    }
    setEnviando(true);
    try {
      await registrarContribuicao({
        valor: valorFinal,
        mensagem,
        nomeExibicao: nomeExibicao || perfil?.nome_exibicao || "Operador",
      });
      toast.success(t("Contribuição registrada! Aguarde a aprovação"), {
        description: t(
          "Assim que o recebimento for confirmado, seu perfil entra na redline de colaboradores.",
        ),
      });
      setMensagem("");
      setValorLivre("");
      setEnviado(true);
      setMinhas(await minhasContribuicoes().catch(() => []));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Falha ao registrar a contribuição"));
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="mx-auto w-full max-w-xl p-4 md:p-8">
        <div className="mono rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("Verificando sessão…")}
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 p-4 pb-10 md:p-8">
        <BotaoVoltar />
        <div
          className="space-y-4 rounded-md border border-border bg-card p-6 text-center"
          data-test="apoiar-sem-sessao"
        >
          <LogIn className="text-tactical-orange mx-auto h-8 w-8" />
          <h1 className="mono text-xl font-bold tracking-wider">{t("ENTRE PARA COLABORAR")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Para registrar sua contribuição e entrar na redline de colaboradores, você precisa estar autenticado na sua conta.",
            )}
          </p>
          <Button
            asChild
            className="glove-tap w-full bg-tactical-orange text-background hover:bg-tactical-orange/90"
          >
            <Link to="/login">
              <LogIn className="h-4 w-4" /> {t("Entrar na conta")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!config?.chave) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 p-4 pb-10 md:p-8">
        <BotaoVoltar />
        <div className="space-y-3 rounded-md border border-border bg-card p-6">
          <h1 className="mono text-xl font-bold tracking-wider">{t("PIX EM CONFIGURAÇÃO")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "A chave PIX do projeto ainda não foi configurada no painel administrativo. Volte em breve — ou, se você administra o projeto, defina a chave nas configurações do painel.",
            )}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/admin">{t("Abrir painel administrativo")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 p-4 pb-10 md:p-8" data-test="apoiar">
      <BotaoVoltar />

      <header className="space-y-1">
        <h1 className="mono text-tactical-orange text-2xl font-bold tracking-wider">
          {t("SEJA UM COLABORADOR")}
        </h1>
        {config.mensagem_apoio && (
          <p className="text-sm text-muted-foreground">{config.mensagem_apoio}</p>
        )}
      </header>

      {enviado && (
        <div
          className="flex items-start gap-3 rounded-md border border-primary/50 bg-primary/10 p-4"
          data-test="apoiar-confirmado"
        >
          <CheckCircle2 className="text-tactical-orange mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm leading-relaxed">
            {t(
              "Contribuição registrada! Confirme o pagamento no app do seu banco e aguarde: após a aprovação, seu perfil entra na redline.",
            )}
          </p>
        </div>
      )}

      <div className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-[auto_1fr]">
        <div className="mx-auto flex flex-col items-center gap-2">
          {qr ? (
            <img
              src={qr}
              alt={t("QR Code PIX para contribuir")}
              className="h-44 w-44 rounded-md border border-border bg-white p-1"
              data-test="apoiar-qr"
            />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center rounded-md border border-dashed border-border">
              <QrCode className="text-muted-foreground h-10 w-10" />
            </div>
          )}
          <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("Escaneie com o app do banco")}
          </span>
        </div>

        <div className="min-w-0 space-y-2">
          <p className="mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("PIX copia e cola")}
          </p>
          <div className="rounded-md border border-border bg-background p-2">
            <p
              className="mono break-all text-[11px] leading-snug text-muted-foreground"
              data-test="apoiar-chave"
            >
              {payloadPix}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="glove-tap"
              onClick={() => void copiar(payloadPix, t("Código PIX copiado"))}
              data-test="apoiar-copiar"
            >
              <Copy className="h-4 w-4" /> {t("Copiar código")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="glove-tap"
              onClick={() => void copiar(config.chave, t("Chave PIX copiada"))}
            >
              <Copy className="h-4 w-4" /> {t("Copiar chave")}
            </Button>
          </div>
          <p className="mono text-[10px] text-muted-foreground">
            {t("Recebedor")}: <span className="text-foreground">{config.nome_recebedor}</span> ·{" "}
            {t("Chave")}: <span className="mono text-foreground">{config.chave}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <p className="mono text-[10px] font-bold uppercase tracking-widest text-tactical-orange">
          {t("Escolha o valor (R$)")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(config.valores_sugeridos.length ? config.valores_sugeridos : [10, 25, 50]).map(
            (sugerido) => (
              <Button
                key={sugerido}
                type="button"
                variant={valorFinal === sugerido && !valorLivre ? "default" : "outline"}
                size="sm"
                className={`glove-tap ${
                  valorFinal === sugerido && !valorLivre ? "bg-tactical-orange text-background" : ""
                }`}
                onClick={() => {
                  setValor(sugerido);
                  setValorLivre("");
                }}
              >
                {formatMoeda(sugerido)}
              </Button>
            ),
          )}
          <Input
            inputMode="decimal"
            placeholder={t("Outro valor")}
            className="mono h-9 w-28"
            value={valorLivre}
            onChange={(e) => setValorLivre(e.target.value)}
            data-test="apoiar-valor-livre"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="apoiar-nome">{t("Nome na redline")}</Label>
            <Input
              id="apoiar-nome"
              value={nomeExibicao}
              onChange={(e) => setNomeExibicao(e.target.value)}
              placeholder={t("Como você quer aparecer")}
              maxLength={40}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="apoiar-mensagem">{t("Mensagem (opcional)")}</Label>
            <Input
              id="apoiar-mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder={t("Uma frase de apoio ao projeto")}
              maxLength={280}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="mono text-sm">
            {t("Total")}:{" "}
            <span className="text-tactical-orange font-bold">{formatMoeda(valorFinal || 0)}</span>
          </span>
          <Button
            className="glove-tap bg-tactical-orange text-background hover:bg-tactical-orange/90"
            onClick={() => void enviar()}
            disabled={enviando || valorFinal <= 0}
            data-test="apoiar-enviar"
          >
            <HeartHandshake className="h-4 w-4" />
            {enviando ? t("Registrando…") : t("Já paguei — registrar contribuição")}
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t(
            "Pague o valor no app do seu banco e clique em registrar. A contribuição passa por confirmação manual do administrador para entrar na redline — normalmente em poucas horas.",
          )}
        </p>
      </div>

      {minhas.length > 0 && (
        <div
          className="space-y-2 rounded-md border border-border bg-card p-4"
          data-test="apoiar-minhas"
        >
          <div className="flex items-center justify-between">
            <p className="mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Minhas contribuições")}
            </p>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => void recarregar()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {minhas.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="mono truncate">
                {formatMoeda(Number(item.valor))}
                <span className="text-muted-foreground">
                  {" "}
                  · {formatDateTime(new Date(item.created_at).getTime())}
                </span>
              </span>
              <Badge
                variant={item.status === "aprovada" ? "default" : "secondary"}
                className="mono shrink-0 text-[10px]"
              >
                {item.status === "aprovada" ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : (
                  <Clock3 className="mr-1 h-3 w-3" />
                )}
                {item.status === "aprovada"
                  ? t("Na redline")
                  : item.status === "pendente"
                    ? t("Em confirmação")
                    : t("Não aprovada")}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BotaoVoltar() {
  const { t } = useI18n();
  return (
    <Button asChild variant="ghost" size="sm" className="glove-tap self-start">
      <Link to="/colaboradores">
        <ArrowLeft className="h-4 w-4" /> {t("Voltar aos colaboradores")}
      </Link>
    </Button>
  );
}
