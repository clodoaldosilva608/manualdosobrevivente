/**
 * Configuração do Assistente IA (Ajustes › Assistente IA) — o painel onde
 * o operador TREINA a própria IA:
 *
 *  · nome da IA e de quem ela cuida (ela passa a chamar pelo nome);
 *  · comportamento/contexto livre + prompts e skills customizadas;
 *  · chave API de qualquer provedor (Google AI Studio, Hugging Face ou
 *    endpoint compatível com OpenAI) com PASSO A PASSO e link direto da
 *    página de criação de chave;
 *  · interruptor de aprendizado (memória local) e de resposta falada;
 *  · limpar a memória quando quiser — os dados são só do aparelho.
 */
import { useEffect, useState } from "react";
import { Bot, Brain, ExternalLink, KeyRound, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import {
  CONFIG_PADRAO_IA,
  configTemChave,
  lerConfigIA,
  modeloPadrao,
  salvarConfigIA,
  urlCriacaoChave,
  type ProvedorIA,
} from "@/lib/assistente/config";
import { instrucoesProvedor } from "@/lib/assistente/config";
import { limparMemoria, lerMemoria } from "@/lib/assistente/memoria";

const PROVEDORES: Array<{ id: ProvedorIA; rotulo: string; dica: string }> = [
  { id: "local", rotulo: "IA local", dica: "Sem chave — sobrevivência, app, clima e notícias" },
  { id: "google", rotulo: "Google AI Studio", dica: "Gemini — texto, imagem, áudio e vídeo" },
  { id: "huggingface", rotulo: "Hugging Face", dica: "Modelos abertos (Llama, Qwen…)" },
  { id: "compat", rotulo: "Compatível OpenAI", dica: "Qualquer endpoint /v1/chat/completions" },
];

export function ConfigAssistente() {
  const { t } = useI18n();
  const [config, setConfig] = useState(CONFIG_PADRAO_IA);
  const [memoria, setMemoria] = useState(0);
  const [novaPrompt, setNovaPrompt] = useState("");
  const [novaSkill, setNovaSkill] = useState("");

  useEffect(() => {
    setConfig(lerConfigIA());
    setMemoria(lerMemoria().length);
  }, []);

  const atualizar = (mudancas: Partial<typeof config>) => {
    const nova = { ...config, ...mudancas };
    setConfig(nova);
    salvarConfigIA(nova);
  };

  return (
    <div className="space-y-4" data-test="assistente-config">
      {/* Identidade */}
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <header className="flex items-center gap-2">
          <Bot className="text-tactical-orange h-4 w-4" />
          <h2 className="mono text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
            {t("Assistente IA")}
          </h2>
          <span
            className={`mono ml-auto rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
              configTemChave(config)
                ? "bg-tactical-orange/15 text-tactical-orange"
                : "bg-emerald-500/15 text-emerald-400"
            }`}
            data-test="assistente-status"
          >
            {configTemChave(config) ? t("nuvem conectada") : t("IA local")}
          </span>
        </header>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t(
            "Esta é a sua IA: dê o nome que quiser, diga quem você é para ela sempre te chamar pelo nome e ensine como ela deve se comportar. Ela aprende com cada conversa (memória local) e executa ações do app: rotas, camadas, boletim, clima e notícias.",
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ia-nome" className="text-xs">
              {t("Nome da sua IA")}
            </Label>
            <Input
              id="ia-nome"
              value={config.nomeIA}
              onChange={(e) => atualizar({ nomeIA: e.target.value })}
              placeholder="Sertão"
              data-test="ia-nome"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ia-usuario" className="text-xs">
              {t("Como devo te chamar?")}
            </Label>
            <Input
              id="ia-usuario"
              value={config.nomeUsuario}
              onChange={(e) => atualizar({ nomeUsuario: e.target.value })}
              placeholder={t("ex.: Clodoaldo")}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ia-comportamento" className="text-xs">
            {t("Contexto de comportamento")}
          </Label>
          <textarea
            id="ia-comportamento"
            value={config.comportamento}
            onChange={(e) => atualizar({ comportamento: e.target.value })}
            rows={3}
            className="bg-input text-foreground w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder={t(
              "ex.: fale curto e direto, use tom de operador tático, sempre priorize segurança…",
            )}
          />
        </div>

        {/* Prompts e skills ensinadas */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> {t("Prompts do operador")}
            </Label>
            {config.prompts.map((p) => (
              <div key={p.id} className="flex items-start gap-1 rounded border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{p.titulo}</p>
                  <p className="text-muted-foreground line-clamp-2 text-[10px]">{p.texto}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    atualizar({ prompts: config.prompts.filter((x) => x.id !== p.id) })
                  }
                  aria-label={t("Remover prompt")}
                  className="text-muted-foreground p-1 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-1">
              <Input
                value={novaPrompt}
                onChange={(e) => setNovaPrompt(e.target.value)}
                placeholder={t("ex.: se eu perguntar de plantas, cite só as do nordeste")}
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-9"
                disabled={novaPrompt.trim().length < 4}
                onClick={() => {
                  atualizar({
                    prompts: [
                      ...config.prompts,
                      {
                        id: `p${Date.now()}`,
                        titulo: novaPrompt.trim().slice(0, 40),
                        texto: novaPrompt.trim(),
                      },
                    ],
                  });
                  setNovaPrompt("");
                  toast.success(t("Prompt ensinado"));
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> {t("Skills (especialidades)")}
            </Label>
            {config.skills.map((s) => (
              <div key={s.id} className="flex items-start gap-1 rounded border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{s.titulo}</p>
                  <p className="text-muted-foreground line-clamp-2 text-[10px]">{s.texto}</p>
                </div>
                <button
                  type="button"
                  onClick={() => atualizar({ skills: config.skills.filter((x) => x.id !== s.id) })}
                  aria-label={t("Remover skill")}
                  className="text-muted-foreground p-1 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-1">
              <Input
                value={novaSkill}
                onChange={(e) => setNovaSkill(e.target.value)}
                placeholder={t(
                  "ex.: sou veterano do Exército — me ajude com plano de defesa civil",
                )}
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-9"
                disabled={novaSkill.trim().length < 4}
                onClick={() => {
                  atualizar({
                    skills: [
                      ...config.skills,
                      {
                        id: `s${Date.now()}`,
                        titulo: novaSkill.trim().slice(0, 40),
                        texto: novaSkill.trim(),
                      },
                    ],
                  });
                  setNovaSkill("");
                  toast.success(t("Skill adicionada"));
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-xs font-bold">{t("Aprender com o uso")}</p>
              <p className="text-muted-foreground text-[10px]">
                {t("Cada resposta vira memória — a IA melhora com você")}
              </p>
            </div>
            <Switch
              checked={config.aprender}
              onCheckedChange={(v) => atualizar({ aprender: v })}
              aria-label={t("Aprender com o uso")}
              data-test="ia-aprender"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-xs font-bold">{t("Responder em áudio")}</p>
              <p className="text-muted-foreground text-[10px]">
                {t("Voz do aparelho (funciona offline)")}
              </p>
            </div>
            <Switch
              checked={config.falarRespostas}
              onCheckedChange={(v) => atualizar({ falarRespostas: v })}
              aria-label={t("Responder em áudio")}
            />
          </div>
        </div>
      </section>

      {/* Provedor e chave API */}
      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <header className="flex items-center gap-2">
          <KeyRound className="text-tactical-orange h-4 w-4" />
          <h2 className="mono text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
            {t("Chave API (opcional)")}
          </h2>
        </header>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t(
            "A IA local já responde sem chave. Com uma chave API, ela passa a responder QUALQUER assunto — e continua usando a memória local quando a internet cair. A chave fica somente neste aparelho.",
          )}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PROVEDORES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => atualizar({ provider: p.id, modelo: modeloPadrao(p.id) })}
              className={`rounded-md border p-2.5 text-left ${
                config.provider === p.id
                  ? "border-tactical-orange bg-tactical-orange/10"
                  : "border-border hover:border-foreground/40"
              }`}
              data-test={`ia-provedor-${p.id}`}
            >
              <p className="text-xs font-bold">{p.rotulo}</p>
              <p className="text-muted-foreground text-[10px] leading-snug">{t(p.dica)}</p>
            </button>
          ))}
        </div>

        {config.provider === "compat" && (
          <div className="space-y-1">
            <Label htmlFor="ia-baseurl" className="text-xs">
              {t("Base URL do serviço")}
            </Label>
            <Input
              id="ia-baseurl"
              value={config.baseUrl}
              onChange={(e) => atualizar({ baseUrl: e.target.value })}
              placeholder="https://api.exemplo.com/v1"
            />
          </div>
        )}

        {config.provider !== "local" && (
          <>
            <details
              className="rounded-md border border-border bg-background/40 p-3"
              data-test="ia-instrucoes"
            >
              <summary className="cursor-pointer text-xs font-bold">
                {t("Como conseguir a chave — passo a passo")}
              </summary>
              <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed">
                {instrucoesProvedor(config.provider).map((passo, i) => (
                  <li key={i}>{passo}</li>
                ))}
              </ol>
              {urlCriacaoChave(config.provider) && (
                <a
                  href={urlCriacaoChave(config.provider) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tactical-orange mt-2 inline-flex items-center gap-1 text-xs underline decoration-dotted"
                  data-test="ia-link-chave"
                >
                  {t("Abrir a página de criar a chave")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </details>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ia-chave" className="text-xs">
                  {t("Chave API")}
                </Label>
                <Input
                  id="ia-chave"
                  type="password"
                  value={config.chave}
                  onChange={(e) => atualizar({ chave: e.target.value })}
                  placeholder="AIza… / hf_… / sk-…"
                  autoComplete="off"
                  data-test="ia-chave"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ia-modelo" className="text-xs">
                  {t("Modelo")}
                </Label>
                <Input
                  id="ia-modelo"
                  value={config.modelo}
                  onChange={(e) => atualizar({ modelo: e.target.value })}
                  placeholder={modeloPadrao(config.provider)}
                />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="glove-tap"
              onClick={async () => {
                if (!config.chave.trim()) {
                  toast.error(t("Cole a chave primeiro"));
                  return;
                }
                toast.promise(
                  import("@/lib/assistente/provedor").then(({ chamarProvedor }) =>
                    chamarProvedor({
                      config,
                      historico: [],
                      pergunta: t("Responda apenas: chave funcionando"),
                      anexos: [],
                      global: [],
                    }).then(() => toast.success(t("Chave testada — a IA está conectada à nuvem"))),
                  ),
                  {
                    loading: t("Testando a chave…"),
                    error: (e) => (e instanceof Error ? e.message : t("A chave não funcionou")),
                  },
                );
              }}
              data-test="ia-testar"
            >
              {t("Testar chave")}
            </Button>
          </>
        )}
      </section>

      {/* Memória */}
      <section className="rounded-md border border-border bg-card p-4">
        <header className="flex items-center gap-2">
          <Brain className="text-tactical-orange h-4 w-4" />
          <h2 className="mono text-[11px] font-bold uppercase tracking-widest text-tactical-orange">
            {t("Memória da IA")}
          </h2>
          <span className="text-muted-foreground mono ml-auto text-[10px]">
            {memoria} {t("pares aprendidos")}
          </span>
        </header>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {t(
            "Tudo que você pergunta e eu respondo vira memória neste aparelho: quanto mais usamos, mais inteligente fico — inclusive sem internet.",
          )}
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="glove-tap mt-2"
          onClick={() => {
            if (!window.confirm(t("Apagar toda a memória da IA neste aparelho?"))) return;
            limparMemoria();
            setMemoria(0);
            toast.success(t("Memória apagada"));
          }}
        >
          <Trash2 className="h-4 w-4" /> {t("Limpar memória")}
        </Button>
      </section>
    </div>
  );
}
