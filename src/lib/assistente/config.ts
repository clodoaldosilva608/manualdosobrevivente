/**
 * Configuração do assistente IA — guardada POR APARELHO (localStorage).
 *
 * O operador é o dono da sua IA: dá nome a ela, diz quem é (a IA passa a
 * chamá-lo pelo nome), define como ela deve se comportar, adiciona prompts
 * e skills próprias. A chave API fica SOMENTE neste aparelho — nunca sai
 * dele exceto dentro da chamada HTTPS ao provedor escolhido.
 *
 * Provedores aceitos (qualquer chave):
 *  · google — Google AI Studio (Gemini) — texto, imagem, áudio e vídeo;
 *  · huggingface — Hugging Face Inference (rota OpenAI-compat);
 *  · compat — qualquer endpoint compatível com OpenAI /chat/completions;
 *  · local — sem chave: cérebro local (sobrevivência + app + memória).
 */
import { tGlobal } from "@/lib/i18n";

export type ProvedorIA = "local" | "google" | "huggingface" | "compat";

export interface PromptCustom {
  id: string;
  titulo: string;
  texto: string;
}

export interface ConfigIA {
  /** Nome da IA (o operador escolhe; padrão "Sertão"). */
  nomeIA: string;
  /** Como o operador quer ser chamado. */
  nomeUsuario: string;
  /** Contexto de comportamento livre (ex.: "seja direto e use tom militar"). */
  comportamento: string;
  /** Prompts customizados ensinados pelo operador. */
  prompts: PromptCustom[];
  /** Skills customizadas: título + instrução somada ao conhecimento. */
  skills: PromptCustom[];
  /**
   * Personagem que encarna a IA (slug de manual_personagens — Ajustes ›
   * Assistente IA › Personagem da IA). Vazio = IA padrão do app.
   */
  personagemSlug: string;
  provider: ProvedorIA;
  /** Chave API do provedor (só sai do aparelho na chamada ao provedor). */
  chave: string;
  /** Modelo (opcional — tem padrão por provedor). */
  modelo: string;
  /** Base URL para provedor compatível OpenAI. */
  baseUrl: string;
  /** Aprender com as conversas (memória local). */
  aprender: boolean;
  /** Responder em áudio por padrão (TTS do aparelho). */
  falarRespostas: boolean;
  /**
   * Semente dos exemplos já aplicada (prompt e skill pré-preenchidos).
   * Garante que REMOVER o exemplo o mantenha removido — sem reaparecer.
   */
  sementesAplicadas: boolean;
}

/** Prompt pré-preenchido — exemplo vivo que o operador edita ou remove. */
export const PROMPT_PADRAO_ID = "prompt-padrao";
export const SKILL_PADRAO_ID = "skill-padrao";

/** Textos da semente (passam pelo dicionário ativo na hora da sementeira). */
export function sementePrompt(): PromptCustom {
  return {
    id: PROMPT_PADRAO_ID,
    titulo: tGlobal("Estilo de campo"),
    texto: tGlobal(
      "Responda sempre como um instrutor de campo: passos numerados e curtos, linguagem simples, e termine cada resposta com uma dica de segurança prática.",
    ),
  };
}

export function sementeSkill(): PromptCustom {
  return {
    id: SKILL_PADRAO_ID,
    titulo: tGlobal("Kit 72 horas"),
    texto: tGlobal(
      "Quando eu pedir ajuda com mochila ou kit de emergência, monte a lista de 72 horas: 3 litros de água por pessoa por dia, alimentos não perecíveis, documentos protegidos, rádio, lanterna, pilhas, primeiros socorros, ferramenta multiuso, agasalho e higiene — adaptada ao meu perfil.",
    ),
  };
}

export const CONFIG_PADRAO_IA: ConfigIA = {
  nomeIA: "Sertão",
  nomeUsuario: "",
  comportamento:
    "Você é uma assistente de sobrevivência dentro do app Manual do Sobrevivente. Responda em português, de forma prática e direta, priorizando segurança. Quando a pergunta envolver o app, explique onde tocar passo a passo.",
  prompts: [],
  skills: [],
  personagemSlug: "",
  provider: "local",
  chave: "",
  modelo: "",
  baseUrl: "",
  aprender: true,
  falarRespostas: false,
  sementesAplicadas: false,
};

const CHAVE_CONFIG = "manual:ia-config";

export function lerConfigIA(): ConfigIA {
  try {
    const bruto = localStorage.getItem(CHAVE_CONFIG);
    if (!bruto) {
      // Primeira leitura de um aparelho novo: nasce com os exemplos.
      const inicial: ConfigIA = {
        ...CONFIG_PADRAO_IA,
        prompts: [sementePrompt()],
        skills: [sementeSkill()],
        sementesAplicadas: true,
      };
      salvarConfigIA(inicial);
      return inicial;
    }
    const salva = JSON.parse(bruto) as Partial<ConfigIA> | null;
    const config: ConfigIA = { ...CONFIG_PADRAO_IA, ...(salva ?? {}) };
    if (!config.sementesAplicadas) {
      // Configuração antiga (ou limpa pelo operador): semeia UMA vez —
      // apagar depois fica apagado porque a sementeira é marcada aqui.
      if (!config.prompts.some((p) => p.id === PROMPT_PADRAO_ID)) {
        config.prompts = [...config.prompts, sementePrompt()];
      }
      if (!config.skills.some((s) => s.id === SKILL_PADRAO_ID)) {
        config.skills = [...config.skills, sementeSkill()];
      }
      config.sementesAplicadas = true;
      salvarConfigIA(config);
    }
    return config;
  } catch {
    return {
      ...CONFIG_PADRAO_IA,
      prompts: [sementePrompt()],
      skills: [sementeSkill()],
      sementesAplicadas: true,
    };
  }
}

export function salvarConfigIA(config: ConfigIA): void {
  try {
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify(config));
  } catch {
    /* armazenamento indisponível */
  }
}

export function configTemChave(config: ConfigIA): boolean {
  return (
    (config.provider === "google" ||
      config.provider === "huggingface" ||
      config.provider === "compat") &&
    config.chave.trim().length > 0
  );
}

/** Modelo padrão por provedor quando o operador não escolhe um. */
export function modeloPadrao(provider: ProvedorIA): string {
  switch (provider) {
    case "google":
      return "gemini-2.0-flash";
    case "huggingface":
      return "meta-llama/Llama-3.1-8B-Instruct";
    case "compat":
      return "gpt-4o-mini";
    default:
      return "local";
  }
}

/** Endpoint de geração por provedor (rota OpenAI-compat quando existe). */
export function urlProvedor(config: ConfigIA): string {
  switch (config.provider) {
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    case "huggingface":
      return "https://router.huggingface.co/v1/chat/completions";
    case "compat": {
      const base = config.baseUrl.trim().replace(/\/+$/, "");
      return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
    }
    default:
      return "";
  }
}

/** Passo a passo de cada provedor (exibido em Ajustes › Assistente IA). */
export function instrucoesProvedor(provider: ProvedorIA): string[] {
  switch (provider) {
    case "google":
      return [
        tGlobal("Abra aistudio.google.com/app/apikey e entre com sua conta Google"),
        tGlobal("Clique em “Create API key” e escolha um projeto (ou crie um novo)"),
        tGlobal("Copie a chave (começa com AIza…) e cole no campo abaixo"),
        tGlobal("A camada gratuita do Gemini cobre uso pessoal com folga"),
      ];
    case "huggingface":
      return [
        tGlobal("Abra huggingface.co/settings/tokens e entre com sua conta"),
        tGlobal("Clique em “Create new token”, tipo “Read”, com um nome qualquer"),
        tGlobal("Copie o token (começa com hf_…) e cole no campo abaixo"),
        tGlobal("Modelos abertos (Llama, Qwen…) respondem pela rota de inference"),
      ];
    case "compat":
      return [
        tGlobal("Cole a Base URL do serviço compatível com OpenAI (terminando em /v1)"),
        tGlobal("Cole a chave API fornecida pelo serviço"),
        tGlobal("Informe o modelo exato (ex.: gpt-4o-mini, llama-3.1-8b, deepseek-chat…)"),
      ];
    default:
      return [];
  }
}

/** Link direto da página de criação de chave de cada provedor. */
export function urlCriacaoChave(provider: ProvedorIA): string | null {
  switch (provider) {
    case "google":
      return "https://aistudio.google.com/app/apikey";
    case "huggingface":
      return "https://huggingface.co/settings/tokens";
    default:
      return null;
  }
}
