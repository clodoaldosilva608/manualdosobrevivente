import { describe, expect, it } from "vitest";
import {
  nomeArquivoSeguro,
  notaBoletimMarkdown,
  notaLocalizacaoMarkdown,
  notaWaypointMarkdown,
  uriObsidianNovaNota,
} from "../src/lib/obsidian";
import type { LocalWaypoint } from "../src/lib/db";
import type {
  IntelAlerta,
  IntelAr,
  IntelIss,
  IntelNoticia,
  IntelSnapshot,
} from "../src/lib/intel.types";

const wp: LocalWaypoint = {
  id: "abcdef12-3456-7890-abcd-ef1234567890",
  user_id: null,
  title: "Ponto d'Água — Serra Fina",
  description: "Nascente perene, água clara. Ferver antes de beber.",
  category: "custom",
  icon: null,
  color: "#FF6B35",
  latitude: -23.5505,
  longitude: -46.6333,
  elevation: 760.4,
  created_at: "2026-10-04T12:00:00.000Z",
  updated_at: "2026-10-04T13:00:00.000Z",
};

describe("nomeArquivoSeguro", () => {
  it("remove acentos, espaços e caracteres especiais", () => {
    expect(nomeArquivoSeguro("Ponto d'Água — Serra Fina")).toBe("ponto-d-agua-serra-fina.md");
  });

  it("limita o tamanho do nome", () => {
    const nome = nomeArquivoSeguro("x".repeat(200));
    expect(nome.length).toBeLessThan(70);
  });

  it("acrescenta sufixo único e carimbo de data", () => {
    const nome = nomeArquivoSeguro("Boletim", {
      sufixo: wp.id.slice(0, 8),
      data: new Date(2026, 9, 4, 9, 30).getTime(),
    });
    expect(nome).toBe("boletim-abcdef12-2026-10-04-0930.md");
  });

  it("não devolve nome vazio", () => {
    expect(nomeArquivoSeguro("/// ***")).toBe("nota.md");
  });
});

describe("notaWaypointMarkdown", () => {
  const md = notaWaypointMarkdown(wp);

  it("tem frontmatter com location no formato do Map View", () => {
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain('location: "-23.55050,-46.63330"');
    expect(md).toContain("tipo: waypoint");
    expect(md).toContain("- sobrevivencia");
  });

  it("traz coordenadas em DD, DMS e MGRS", () => {
    expect(md).toContain("-23.55050, -46.63330");
    expect(md).toMatch(/DMS:\*\* \d/);
    expect(md).toMatch(/MGRS:\*\* 23K/);
  });

  it("inclui título, descrição e altitude", () => {
    expect(md).toContain("# Ponto d'Água — Serra Fina");
    expect(md).toContain("Nascente perene");
    expect(md).toContain("**Altitude:** 760 m");
  });
});

describe("notaBoletimMarkdown", () => {
  it("funciona sem nenhum dado (todas as seções nulas)", () => {
    const md = notaBoletimMarkdown({
      geradoEm: new Date(2026, 9, 4, 9, 0).getTime(),
      intel: null,
      ar: null,
      alertas: null,
      iss: null,
      noticias: null,
    });
    expect(md).toContain("# Boletim de inteligência");
    expect(md).toContain("Nenhum alerta laranja/vermelho");
    expect(md).toContain("Nenhum sismo M4,5+");
  });

  it("inclui os dados quando existem", () => {
    const intel: IntelSnapshot = {
      sismos: [
        {
          id: "s1",
          lng: -71.2,
          lat: -30.1,
          mag: 5.4,
          profundidade: 30,
          lugar: "Coquimbo, Chile",
          hora: Date.now(),
          url: "",
          tsunami: false,
        },
      ],
      eventos: [],
      incendios: [],
      incendiosDisponivel: true,
      climaEspacial: {
        kp: 5.3,
        classificacao: "Tempestade G1",
        nivel: "tempestade",
        medidoEm: new Date().toISOString(),
      },
      atualizadoEm: Date.now(),
      falhas: [],
    };
    const alertas: IntelAlerta[] = [
      {
        id: "a1",
        tipoId: "EQ",
        tipo: "Terremoto",
        nome: "Sismo 5.7",
        pais: "Chile",
        nivel: "Orange",
        lng: -71,
        lat: -30,
        inicio: new Date().toISOString(),
        url: "",
      },
    ];
    const ar: IntelAr = {
      aqiEuropeu: 42,
      usAqi: 38,
      pm25: 9.1,
      pm10: 18.2,
      ozonio: 64.4,
      classificacao: "boa",
      nivel: "boa",
      medidoEm: new Date().toISOString(),
    };
    const iss: IntelIss = {
      lng: -45,
      lat: -10,
      altitudeKm: 418.2,
      velocidadeKmh: 27580,
      visibilidade: "daylight",
      pegadaKm: 2200,
      hora: Date.now(),
      trajetoria: [],
    };
    const noticias: IntelNoticia[] = [
      {
        titulo: "Ciclone se aproxima da costa",
        url: "",
        fonte: "reuters.com",
        pais: "BRA",
        hora: Date.now(),
      },
    ];
    const md = notaBoletimMarkdown({
      geradoEm: new Date(2026, 9, 4, 9, 0).getTime(),
      intel,
      ar,
      alertas,
      iss,
      noticias,
    });
    expect(md).toContain("KP 5,3 — Tempestade G1");
    expect(md).toContain("M5,4 — Coquimbo, Chile");
    expect(md).toContain("**Terremoto** — Chile");
    expect(md).toContain("IQAr 42 — boa");
    expect(md).toContain("Altitude 418 km");
    expect(md).toContain("Ciclone se aproxima da costa — reuters.com");
  });
});

describe("notaLocalizacaoMarkdown", () => {
  it("monta título, texto e link do mapa", () => {
    const md = notaLocalizacaoMarkdown({
      titulo: "Localização SOS",
      texto: "-23.5505, -46.6333\n23LJC9120351713",
      mapUrl: "https://maps.google.com/?q=-23.5505,-46.6333",
    });
    expect(md).toContain("# Localização SOS");
    expect(md).toContain("23LJC9120351713");
    expect(md).toContain("[Ver no mapa](https://maps.google.com/?q=-23.5505,-46.6333)");
    expect(md).toContain("tipo: localizacao");
  });
});

describe("uriObsidianNovaNota", () => {
  it("monta o URI obsidian://new com caminho e conteúdo", () => {
    const uri = uriObsidianNovaNota({
      caminho: "Manual do Sobrevivente/Localizações/nota.md",
      conteudo: "# Olá\n\nCorpo.",
    });
    expect(uri).not.toBeNull();
    expect(uri!.startsWith("obsidian://new?file=")).toBe(true);
    expect(uri).toContain(encodeURIComponent("Manual do Sobrevivente"));
    expect(uri).toContain(encodeURIComponent("# Olá"));
  });

  it("recusa conteúdo acima do limite seguro do URI", () => {
    const uri = uriObsidianNovaNota({
      caminho: "n.md",
      conteudo: "x".repeat(40000),
    });
    expect(uri).toBeNull();
  });
});
