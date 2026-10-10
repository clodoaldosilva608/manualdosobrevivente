/**
 * Provedores de IA na nuvem — chamadas DIRETAS do navegador do operador:
 * a chave API sai do aparelho apenas dentro da HTTPS ao provedor escolhido
 * (Google AI Studio, Hugging Face ou qualquer endpoint compatível com
 * OpenAI). Nenhum servidor do Manual vê a chave.
 *
 * O formato é o compatível com OpenAI /chat/completions — os três
 * provedores suportados usam a mesma forma de mensagem, o que mantém
 * "aceita qualquer tipo de chave" simples de verdade. Imagens vão como
 * data URL; áudio/vídeo como input_audio (suportado pelo Gemini).
 */
import { configTemChave, modeloPadrao, urlProvedor, type ConfigIA } from "@/lib/assistente/config";
import type { EntradaConhecimento } from "@/lib/ia-conhecimento";
import { topoMemoria, type ParMemoria } from "@/lib/assistente/memoria";

export interface AnexoMensagem {
  /** imagem | audio | video */
  tipo: "imagem" | "audio" | "video";
  /** data URL (base64) do arquivo comprimido. */
  dataUrl: string;
}

export interface MensagemChat {
  papel: "usuario" | "ia";
  texto: string;
}

/** Prompt de sistema montado a partir da configuração + memória + base. */
export function montarSistema(
  config: ConfigIA,
  global: EntradaConhecimento[],
  memTop: ParMemoria[],
): string {
  const linhas: string[] = [];
  linhas.push(`Seu nome é "${config.nomeIA}".`);
  linhas.push(
    config.nomeUsuario.trim()
      ? `O operador se chama ${config.nomeUsuario.trim()} — chame-o pelo nome.`
      : "Você não sabe o nome do operador — nunca invente.",
  );
  if (config.comportamento.trim()) linhas.push(config.comportamento.trim());
  if (config.prompts.length > 0) {
    linhas.push("Instruções adicionais do operador:");
    for (const p of config.prompts) linhas.push(`- ${p.titulo}: ${p.texto}`);
  }
  if (config.skills.length > 0) {
    linhas.push("Skills ensinadas pelo operador (trate como especialidades suas):");
    for (const s of config.skills) linhas.push(`- ${s.titulo}: ${s.texto}`);
  }
  linhas.push(
    "Você vive dentro do app Manual do Sobrevivente (mapa tático, manual offline, mochila, bússola). " +
      "Você PODE executar ações do app: se o pedido for um comando (traçar rota, ligar camada, limpar tela…), " +
      "responda APENAS com uma linha no formato <<EXECUTAR:habilidade:arg>> seguida de uma frase curta. " +
      "Habilidades válidas: rota:<endereço>; camada:<id>:<on|off>; base:<satellite|topo|streets|dark>; limpar; boletim; medir; marcador; posicao. " +
      "Quando executar, escreva a frase ANTES da linha <<EXECUTAR…>>. Nada de markdown pesado.",
  );
  if (memTop.length > 0) {
    linhas.push("Memória das conversas com ESTE operador (mais usadas):");
    for (const m of memTop.slice(0, 8))
      linhas.push(`- P: ${m.pergunta} → R: ${m.resposta.slice(0, 200)}`);
  }
  if (global.length > 0) {
    linhas.push("Conhecimento oficial do app (curado pelo administrador):");
    for (const g of global.slice(0, 15))
      linhas.push(`- ${g.pergunta}: ${g.resposta.slice(0, 220)}`);
  }
  return linhas.join("\n");
}

export class ErroProvedor extends Error {
  status: number;
  constructor(mensagem: string, status = 0) {
    super(mensagem);
    this.name = "ErroProvedor";
    this.status = status;
  }
}

/** Contexto opcional do app injetado na conversa (clima, notícias, posição). */
export interface ContextoApp {
  bloco?: string;
}

/**
 * Chamada ao provedor configurado. Devolve o texto da resposta.
 * Lança ErroProvedor com mensagem amigável em pt-BR quando falha.
 */
export async function chamarProvedor(params: {
  config: ConfigIA;
  historico: MensagemChat[];
  pergunta: string;
  anexos: AnexoMensagem[];
  global: EntradaConhecimento[];
  contexto?: ContextoApp;
}): Promise<string> {
  const { config } = params;
  if (!configTemChave(config)) {
    throw new ErroProvedor(
      "Nenhuma chave API configurada — a IA local responde, mas para respostas avançadas cadastre a chave em Ajustes › Assistente IA.",
    );
  }

  const modelo = config.modelo.trim() || modeloPadrao(config.provider);
  const url = urlProvedor(config);
  if (!url) throw new ErroProvedor("Provedor sem endpoint configurado.");

  const conteudo: unknown[] = [{ type: "text", text: params.pergunta }];
  for (const anexo of params.anexos.slice(0, 2)) {
    if (anexo.tipo === "imagem") {
      conteudo.push({ type: "image_url", image_url: { url: anexo.dataUrl } });
    } else if (anexo.tipo === "audio") {
      const [, base64] = anexo.dataUrl.split(",", 2);
      const formato =
        anexo.dataUrl.includes("mp4") || anexo.dataUrl.includes("aac") ? "mp4" : "wav";
      conteudo.push({ type: "input_audio", input_audio: { data: base64, format: formato } });
    } else {
      // vídeo: só o Gemini aceita inline — manda como imagem do 1º quadro não é
      // possível aqui; informamos de forma transparente.
      conteudo.push({
        type: "text",
        text: "[O operador anexou um vídeo — descreva que o vídeo foi recebido mas peça os pontos principais em texto se não conseguir ler.]",
      });
    }
  }

  const mensagens: unknown[] = [
    { role: "system", content: montarSistema(config, params.global, topoMemoria()) },
  ];
  if (params.contexto?.bloco) mensagens.push({ role: "system", content: params.contexto.bloco });
  for (const m of params.historico.slice(-8)) {
    mensagens.push({ role: m.papel === "ia" ? "assistant" : "user", content: m.texto });
  }
  mensagens.push({ role: "user", content: conteudo });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.chave.trim()}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: mensagens,
        temperature: 0.6,
        max_tokens: 900,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    throw new ErroProvedor(
      e instanceof DOMException && e.name === "TimeoutError"
        ? "O provedor demorou demais para responder."
        : "Sem contato com o provedor — verifique a rede. A IA local continua funcionando.",
    );
  }

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    const dica =
      res.status === 401 || res.status === 403
        ? "Chave API inválida ou sem permissão — confira em Ajustes › Assistente IA."
        : res.status === 429
          ? "Limite de uso do provedor atingido — tente de novo em instantes."
          : res.status === 404
            ? "Modelo não encontrado — confira o nome do modelo no provedor."
            : corpo.slice(0, 160);
    throw new ErroProvedor(`Provedor recusou (HTTP ${res.status}). ${dica}`, res.status);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
  };
  const escolha = json.choices?.[0]?.message?.content;
  const texto = Array.isArray(escolha)
    ? (escolha.map((p) => p.text ?? "").join("") ?? "")
    : (escolha ?? "");
  const resposta = texto.trim();
  if (!resposta) throw new ErroProvedor("O provedor respondeu vazio.");
  return resposta;
}

/** Extrai comando <<EXECUTAR:...>> de uma resposta do provedor. */
export function extrairComando(resposta: string): { texto: string; comando?: string } {
  const m = /<<EXECUTAR:([^>]+)>>/.exec(resposta);
  if (!m) return { texto: resposta.trim() };
  return { texto: resposta.replace(/<<EXECUTAR:[^>]+>>/g, "").trim(), comando: m[1].trim() };
}
