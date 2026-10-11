import { afterEach, describe, expect, it, beforeEach } from "vitest";
import {
  detectarIntent,
  mapearCamada,
  mapearBase,
  buscarConhecimentoGlobal,
} from "@/lib/assistente/cerebro";
import {
  registrarPar,
  buscarNaMemoria,
  similaridade,
  tokens,
  limparMemoria,
} from "@/lib/assistente/memoria";
import { buscarBaseLocal, BASE_LOCAL } from "@/lib/assistente/conhecimento";
import { proximoPopup, CONFIG_PADRAO } from "@/lib/popups";
import {
  configTemChave,
  modeloPadrao,
  lerConfigIA,
  salvarConfigIA,
  CONFIG_PADRAO_IA,
} from "@/lib/assistente/config";
import { extrairComando, montarSistema } from "@/lib/assistente/provedor";
import { responder } from "@/lib/assistente/cerebro";
import { personaAtiva, nomeIAEfetivo, blocoPersona } from "@/lib/assistente/persona";
import type { Personagem } from "@/lib/personagens";

/* O ambiente é node: o localStorage é simulado em memória (padrão convite.spec). */
const LS_ORIGINAL = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const saco = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: {
    getItem: (k: string) => (saco.has(k) ? (saco.get(k) as string) : null),
    setItem: (k: string, v: string) => void saco.set(k, String(v)),
    removeItem: (k: string) => void saco.delete(k),
    clear: () => void saco.clear(),
    key: () => null,
    get length() {
      return saco.size;
    },
  },
});

beforeEach(() => {
  saco.clear();
  limparMemoria();
});

describe("cérebro — intenções de ação", () => {
  it("detecta pedido de rota", () => {
    const intent = detectarIntent("Trace uma rota até o centro de Recife");
    expect(intent.tipo).toBe("rota");
    expect(intent.destino?.toLowerCase()).toContain("recife");
  });

  it("detecta rota na forma curta e 'me leve'", () => {
    expect(detectarIntent("rota para o Cristo Redentor").tipo).toBe("rota");
    expect(detectarIntent("me leve até a praia de Boa Viagem").tipo).toBe("rota");
  });

  it("detecta centralizar (ir para)", () => {
    const intent = detectarIntent("vá para o centro de São Paulo");
    expect(intent.tipo).toBe("irpara");
  });

  it("detecta camadas por vocabulário comum e estado", () => {
    const ligar = detectarIntent("ative o radar de chuva");
    expect(ligar.tipo).toBe("camada");
    expect(ligar.camada).toBe("radar");
    expect(ligar.ligar).toBe(true);

    const desligar = detectarIntent("desligue o radar");
    expect(desligar.tipo).toBe("camada");
    expect(desligar.ligar).toBe(false);

    expect(detectarIntent("mostre os terremotos recentes").camada).toBe("sismos");
    expect(detectarIntent("ative os ciclones").camada).toBe("ciclones");
    expect(detectarIntent("abre os focos de calor").camada).toBe("incendios");
  });

  it("detecta base do mapa", () => {
    expect(detectarIntent("mude a base para satélite").tipo).toBe("base");
    expect(detectarIntent("base topográfica").base).toBe("topo");
    expect(mapearBase("troque a vista para o mapa escuro")).toBe("dark");
  });

  it("detecta ações diretas do mapa", () => {
    expect(detectarIntent("limpe a tela").tipo).toBe("limpar");
    expect(detectarIntent("abra o boletim de inteligência").tipo).toBe("boletim");
    expect(detectarIntent("quero medir distância").tipo).toBe("medir");
    expect(detectarIntent("marque um waypoint").tipo).toBe("marcador");
    expect(detectarIntent("onde estou?").tipo).toBe("posicao");
  });

  it("detecta notícias e previsão", () => {
    expect(detectarIntent("quais são as principais notícias no momento?").tipo).toBe("noticias");
    expect(detectarIntent("como está a previsão para hoje?").tipo).toBe("previsao");
    expect(detectarIntent("vai chover?").tipo).toBe("previsao");
  });

  it("não inventa intenção em pergunta comum", () => {
    expect(detectarIntent("como purificar água?").tipo).toBeNull();
  });
});

describe("memória que aprende", () => {
  it("tokens remove stopwords e acentos", () => {
    expect(tokens("Como está a PREVISÃO de chuva?")).toContain("previsao");
    expect(tokens("a o de que")).toHaveLength(0);
  });

  it("similaridade alta para perguntas iguais, baixa para distintas", () => {
    expect(similaridade("como purificar água", "como purificar água")).toBe(1);
    expect(similaridade("como purificar água", "previsão de chuva")).toBeLessThan(0.2);
  });

  it("registra e recupera par parecido", () => {
    registrarPar("Como acender fogo sem fósforo?", "Use sílex ou lente.", "local");
    const ache = buscarNaMemoria("como acender fogo sem fosforo?");
    expect(ache).not.toBeNull();
    expect(ache?.par.resposta).toBe("Use sílex ou lente.");
  });

  it("funde perguntas parecidas em um único par", () => {
    registrarPar("Como purificar água de rio?", "Ferva 1 minuto.", "local");
    registrarPar("como purificar água do rio?", "Ferva 1 minuto e filtre.", "local");
    // duas perguntas quase iguais viram UM par (a resposta nova vence)
    expect(buscarNaMemoria("purificar água de rio")?.par.resposta).toBe("Ferva 1 minuto e filtre.");
  });
});

describe("base local de conhecimento", () => {
  it("encontra resposta de sobrevivência sem rede", () => {
    const ache = buscarBaseLocal("como purificar água de um rio?");
    expect(ache).not.toBeNull();
    expect(ache?.entrada.resposta).toContain("Ferva");
  });

  it("encontra ajuda do app", () => {
    expect(buscarBaseLocal("como funciona a mochila?")?.entrada.id).toBe("app-mochila");
  });

  it("não responde com entrada aleatória para pergunta fora de escopo", () => {
    expect(buscarBaseLocal("qual o melhor time do brasil?")).toBeNull();
  });

  it("cobre os temas prometidos (água, fogo, abrigo, socorros, navegação, app)", () => {
    const ids = new Set(BASE_LOCAL.map((e) => e.id));
    for (const id of [
      "agua-purificar",
      "fogo-acender",
      "abrigo-montar",
      "socorros-hemorragia",
      "nav-sol-sombras",
      "app-offline",
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe("conhecimento global curado", () => {
  it("pontua palavras-chave do registro global", () => {
    const global = [
      {
        id: "1",
        pergunta: "Como purificar água em emergência?",
        palavras_chave: "purificar,água,fervura,cloro,hipoclorito",
        resposta: "Ferva por 1 minuto ou use hipoclorito.",
        ativo: true,
        ordem: 1,
        created_at: "",
      },
    ];
    const ache = buscarConhecimentoGlobal("preciso purificar água agora", global);
    expect(ache?.resposta).toContain("hipoclorito");
    expect(buscarConhecimentoGlobal("previsão de chuva", global)).toBeNull();
  });
});

describe("pop-ups de crescimento", () => {
  it("cicla social → apoiar → compartilhar", () => {
    const disponiveis = { social: true, apoiar: true, compartilhar: true };
    const p0 = proximoPopup(0, {}, disponiveis);
    expect(p0?.tipo).toBe("social");
    const p1 = proximoPopup(p0!.ciclo, {}, disponiveis);
    expect(p1?.tipo).toBe("apoiar");
    const p2 = proximoPopup(p1!.ciclo, {}, disponiveis);
    expect(p2?.tipo).toBe("compartilhar");
    const p3 = proximoPopup(p2!.ciclo, {}, disponiveis);
    expect(p3?.tipo).toBe("social");
  });

  it("cartão indisponível não repete o seguinte", () => {
    const disponiveis = { social: false, apoiar: true, compartilhar: true };
    const p0 = proximoPopup(0, {}, disponiveis);
    expect(p0?.tipo).toBe("apoiar");
    // ciclo avança PAST apoiar → o próximo é compartilhar, não apoiar de novo
    const p1 = proximoPopup(p0!.ciclo, {}, disponiveis);
    expect(p1?.tipo).toBe("compartilhar");
    const p2 = proximoPopup(p1!.ciclo, {}, disponiveis);
    expect(p2?.tipo).toBe("apoiar");
  });

  it("pula silenciados e só retorna null quando nada pode aparecer", () => {
    const silenciados = { apoiar: true, compartilhar: true };
    expect(
      proximoPopup(0, silenciados, { social: true, apoiar: true, compartilhar: true })?.tipo,
    ).toBe("social");
    expect(
      proximoPopup(
        0,
        { social: true, apoiar: true, compartilhar: true },
        { social: true, apoiar: true, compartilhar: true },
      ),
    ).toBeNull();
  });

  it("configuração padrão é amigável (não invade a tela)", () => {
    expect(CONFIG_PADRAO.ativo).toBe(true);
    expect(CONFIG_PADRAO.primeiro_minutos).toBeGreaterThanOrEqual(1);
    expect(CONFIG_PADRAO.intervalo_minutos).toBeGreaterThanOrEqual(5);
  });
});

describe("configuração da IA", () => {
  it("sem chave é IA local", () => {
    expect(configTemChave(CONFIG_PADRAO_IA)).toBe(false);
  });

  it("com chave do google/hf/compat é nuvem", () => {
    expect(configTemChave({ ...CONFIG_PADRAO_IA, provider: "google", chave: "AIza-x" })).toBe(true);
    expect(configTemChave({ ...CONFIG_PADRAO_IA, provider: "huggingface", chave: "hf_x" })).toBe(
      true,
    );
    expect(configTemChave({ ...CONFIG_PADRAO_IA, provider: "local", chave: "qualquer" })).toBe(
      false,
    );
  });

  it("modelo padrão por provedor", () => {
    expect(modeloPadrao("google")).toContain("gemini");
    expect(modeloPadrao("local")).toBe("local");
  });
});

describe("comando do provedor", () => {
  it("extrai <<EXECUTAR:…>> e limpa o texto", () => {
    const { texto, comando } = extrairComando(
      "Vou traçar a rota.\n<<EXECUTAR:rota:centro de Recife>>",
    );
    expect(texto).toBe("Vou traçar a rota.");
    expect(comando).toBe("rota:centro de Recife");
  });

  it("resposta sem comando vem limpa", () => {
    const { texto, comando } = extrairComando("Resposta normal sem comando.");
    expect(texto).toBe("Resposta normal sem comando.");
    expect(comando).toBeUndefined();
  });
});

describe("persona da IA (personagens)", () => {
  const persona: Personagem = {
    id: "p1",
    nome: "Prepper Urbano",
    descricao: "Especialista em preparação para emergências no ambiente urbano.",
    slug: "prepper-urbano",
    perfil: "Preparação urbana, organização e resposta a emergências.",
    frase: "Preparação é transformar conhecimento em segurança.",
    url_imagem: "https://exemplo.com/prepper.png",
    ativo: true,
    ordem: 1,
    created_at: "",
  };
  const inativo: Personagem = { ...persona, id: "p2", slug: "militar-de-campo", ativo: false };
  const lista = [persona, inativo];

  it("personaAtiva resolve pelo slug e ignora inativos", () => {
    expect(personaAtiva({ ...CONFIG_PADRAO_IA, personagemSlug: "prepper-urbano" }, lista)?.id).toBe(
      "p1",
    );
    expect(personaAtiva({ ...CONFIG_PADRAO_IA, personagemSlug: "militar-de-campo" }, lista)).toBe(
      null,
    );
    expect(personaAtiva(CONFIG_PADRAO_IA, lista)).toBe(null);
    expect(personaAtiva({ ...CONFIG_PADRAO_IA, personagemSlug: "fantasma" }, lista)).toBe(null);
  });

  it("nomeIAEfetivo: personagem assume o nome, apelido do operador vence", () => {
    expect(nomeIAEfetivo({ ...CONFIG_PADRAO_IA, personagemSlug: "prepper-urbano" }, persona)).toBe(
      "Prepper Urbano",
    );
    expect(
      nomeIAEfetivo(
        { ...CONFIG_PADRAO_IA, personagemSlug: "prepper-urbano", nomeIA: "Ágil" },
        persona,
      ),
    ).toBe("Ágil");
    expect(nomeIAEfetivo(CONFIG_PADRAO_IA, null)).toBe("Sertão");
  });

  it("blocoPersona carrega nome, especialidade e frase-símbolo", () => {
    const bloco = blocoPersona(persona).join("\n");
    expect(bloco).toContain("Prepper Urbano");
    expect(bloco).toContain("Preparação urbana");
    expect(bloco).toContain("Preparação é transformar conhecimento em segurança.");
  });

  it("montarSistema incorpora a persona e mantém apelido do operador", () => {
    const comPersona = montarSistema(
      { ...CONFIG_PADRAO_IA, personagemSlug: "prepper-urbano" },
      [],
      [],
      persona,
    );
    expect(comPersona).toContain("Prepper Urbano");
    expect(comPersona).not.toContain('Seu nome é "Sertão"');

    const renomeada = montarSistema({ ...CONFIG_PADRAO_IA, nomeIA: "Ágil" }, [], [], persona);
    expect(renomeada).toContain('apelido "Ágil"');

    const semPersona = montarSistema(CONFIG_PADRAO_IA, [], [], null);
    expect(semPersona).toContain('Seu nome é "Sertão"');
  });

  it("config persiste personagemSlug", () => {
    salvarConfigIA({ ...CONFIG_PADRAO_IA, personagemSlug: "campista-explorador" });
    expect(lerConfigIA().personagemSlug).toBe("campista-explorador");
  });

  it("resposta local sem saber o assunto assina com a persona", async () => {
    const resposta = await responder({
      pergunta: "qual a cor do cavalo branco de Napoleão?",
      config: CONFIG_PADRAO_IA,
      historico: [],
      global: [],
      persona,
      deps: { buscarNoticias: async () => [], buscarClima: async () => null },
    });
    expect(resposta.origem).toBe("sem-resposta");
    expect(resposta.texto).toContain("Preparação é transformar conhecimento em segurança.");
  });
});

afterEach(() => {
  if (LS_ORIGINAL) Object.defineProperty(globalThis, "localStorage", LS_ORIGINAL);
});
