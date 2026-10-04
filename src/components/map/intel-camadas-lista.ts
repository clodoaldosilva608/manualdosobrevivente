/**
 * Catálogo das camadas de inteligência do modo Osiris — compartilhado entre
 * a Plataforma Osiris (painel de camadas do centro de comando) e a folha
 * "Camadas do mapa" do modo tático. A cor acompanha a identidade visual da
 * camada no mapa (pontos, círculos e ícones definidos em intel-layers.ts).
 */
import type { IntelVisibilidade } from "@/lib/intel.types";

export interface LinhaIntel {
  id: keyof IntelVisibilidade;
  nome: string;
  dica: string;
  /** Cor da identidade visual da camada (dot do painel). */
  cor: string;
}

export const LINHAS_INTEL: LinhaIntel[] = [
  { id: "sismos", nome: "Sismos", dica: "USGS · M2,5+ nas últimas 24 horas", cor: "#FACC15" },
  {
    id: "eventos",
    nome: "Eventos naturais",
    dica: "NASA EONET · ciclones, vulcões, gelo",
    cor: "#FB923C",
  },
  {
    id: "incendios",
    nome: "Focos de calor",
    dica: "NASA FIRMS · satélite VIIRS, últimas 24 horas",
    cor: "#F97316",
  },
  {
    id: "conflitos",
    nome: "Zonas de conflito",
    dica: "Referência curada — não é feed ao vivo",
    cor: "#EF4444",
  },
  {
    id: "voos",
    nome: "Voos ao vivo",
    dica: "Rede ADS-B · militares no mundo + civis perto do centro",
    cor: "#38BDF8",
  },
  {
    id: "satelites",
    nome: "ISS (satélite)",
    dica: "Estação Espacial Internacional · posição, trajetória e pegada",
    cor: "#7DD3FC",
  },
  {
    id: "alertas",
    nome: "Alertas oficiais",
    dica: "GDACS (UE/ONU) · terremotos, ciclones, vulcões, enchentes, incêndios",
    cor: "#F87171",
  },
  {
    id: "maritimo",
    nome: "Rotas marítimas",
    dica: "Estreitos estratégicos e maiores portos — referência curada",
    cor: "#22D3EE",
  },
  {
    id: "nuclear",
    nome: "Centrais nucleares",
    dica: "~100 instalações no mundo — referência curada",
    cor: "#A3E635",
  },
  { id: "noite", nome: "Dia e noite", dica: "Terminador solar em tempo real", cor: "#94A3B8" },
  {
    id: "navios",
    nome: "Navios ao vivo (AIS)",
    dica: "AISStream.io · transponders ao redor do mapa (chave do servidor ou pessoal em Ajustes)",
    cor: "#67E8F9",
  },
];
