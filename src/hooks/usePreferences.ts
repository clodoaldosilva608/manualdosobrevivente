import { useCallback, useEffect, useState } from "react";
import { getSetting, setSetting } from "@/lib/db";
import {
  INTEL_CHAVES_PADRAO,
  INTEL_VIS_PADRAO,
  type IntelChaves,
  type IntelVisibilidade,
} from "@/lib/intel.types";
import { VIS_OSIRIS_PADRAO, type VisOsiris } from "@/components/map/visao-osiris-camadas";
import { TELA_VIS_PADRAO, type TelaVisibilidade } from "@/components/map/tela-elementos";

export type ModoMapa = "tatico" | "osiris";

/** Contexto de vida do operador, escolhido no wizard de prontidão. */
export type PerfilProntidao = "urbano" | "trilha" | "litoral" | "rural" | "nenhum";

export interface Preferences {
  units: "metric" | "nautical";
  coordFormat: "DD" | "DMS" | "MGRS";
  northRef: "true" | "magnetic";
  /** Modo do mapa: navegação tática ou inteligência global (Osiris). */
  mapMode: ModoMapa;
  /** Visibilidade persistida das camadas de inteligência do modo Osiris. */
  intelVis: IntelVisibilidade;
  /** Chaves de serviço do usuário (FIRMS/AIS) — ficam só no aparelho. */
  intelKeys: IntelChaves;
  /** Camadas ativas da Visão Osiris (globo 3D self-hosted). */
  osirisVis: VisOsiris;
  /** Elementos da tela do mapa tático visíveis (HUD, bússola, waypoints…). */
  telaVis: TelaVisibilidade;
  /** O mapa gira junto com a bússola (sensor do aparelho). */
  mapaRotaciona: boolean;
  /** Centro do mapa travado em coordenadas digitadas (nulo = livre). */
  posicaoTravada: { lat: number; lng: number } | null;
  /** Projeção do mapa tático: plana (mercator) ou globo 3D. */
  projecao: "mercator" | "globe";
  /** Modo noturno: visão vermelha que preserva a adaptação ao escuro. */
  visaoNoturna: boolean;
  /** Intensidade da tinta vermelha (0–1). */
  noturnoVermelho: number;
  /** Escurecimento adicional da tela (0–0,75). */
  noturnoEscurecer: number;
  /** Perfil de prontidão do wizard (curadoria de mochila, manual e depósito). */
  perfil: PerfilProntidao;
  /** Wizard de perfil já concluído (não re-oferecer automaticamente). */
  wizardPerfilFeito: boolean;
  /**
   * Legado do protótipo "Manual Pro" — mantido só por compatibilidade com
   * as preferências já salvas. O projeto é gratuito e se sustenta por
   * contribuições voluntárias (/colaboradores); nunca por assinatura.
   */
  pro: boolean;
  /** Tela limpa: só o mapa à vista — um toque traz todos os elementos de volta. */
  telaLimpa: boolean;
  /** Versão das preferências (migrações aplicadas a quem já usava o app). */
  versaoPrefs: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  units: "metric",
  coordFormat: "DD",
  northRef: "true",
  mapMode: "tatico",
  intelVis: INTEL_VIS_PADRAO,
  intelKeys: INTEL_CHAVES_PADRAO,
  osirisVis: VIS_OSIRIS_PADRAO,
  telaVis: TELA_VIS_PADRAO,
  mapaRotaciona: false,
  posicaoTravada: null,
  projecao: "mercator",
  visaoNoturna: false,
  noturnoVermelho: 0.85,
  noturnoEscurecer: 0.2,
  perfil: "nenhum",
  wizardPerfilFeito: false,
  pro: false,
  telaLimpa: false,
  versaoPrefs: 2,
};

/** Versão atual das migrações de preferências (ver aplicarMigracoes). */
const VERSAO_PREFS = 2;

const KEY = "preferences";

/**
 * Migrações de preferências: ajustes que precisam alcançar também quem já
 * usava o aplicativo (os defaults só valem para instalação nova).
 *
 * v2 — paridade Zoom Earth: radar de chuva e ciclones ligados por padrão
 *      (eram opt-in; quem abria o mapa não via nenhum elemento de clima).
 */
function aplicarMigracoes(
  salvas: Partial<Preferences> | null | undefined,
): Partial<Preferences> | null {
  if (!salvas) return salvas ?? null;
  const versao = typeof salvas.versaoPrefs === "number" ? salvas.versaoPrefs : 1;
  const migrado: Partial<Preferences> = { ...salvas, versaoPrefs: VERSAO_PREFS };
  if (versao < 2 && salvas.intelVis) {
    migrado.intelVis = { ...salvas.intelVis, radar: true, ciclones: true };
  }
  return migrado;
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getSetting<Partial<Preferences>>(KEY)
      .then((v) => {
        if (!alive) return;
        const salvas = aplicarMigracoes(v);
        setPrefs({
          ...DEFAULT_PREFERENCES,
          ...(salvas ?? {}),
          intelVis: { ...INTEL_VIS_PADRAO, ...(salvas?.intelVis ?? {}) },
          intelKeys: { ...INTEL_CHAVES_PADRAO, ...(salvas?.intelKeys ?? {}) },
          osirisVis: { ...VIS_OSIRIS_PADRAO, ...(salvas?.osirisVis ?? {}) },
          telaVis: { ...TELA_VIS_PADRAO, ...(salvas?.telaVis ?? {}) },
        });
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  // Outras instâncias do hook (ex.: AppNav reagindo ao "tela limpa" alternado
  // no MapShell) acompanham as mudanças pelo barramento de dados locais.
  useEffect(() => {
    const recarregar = async () => {
      try {
        const v = await getSetting<Partial<Preferences>>(KEY);
        setPrefs((atual) => {
          const proximo: Preferences = {
            ...DEFAULT_PREFERENCES,
            ...(v ?? {}),
            intelVis: { ...INTEL_VIS_PADRAO, ...(v?.intelVis ?? {}) },
            intelKeys: { ...INTEL_CHAVES_PADRAO, ...(v?.intelKeys ?? {}) },
            osirisVis: { ...VIS_OSIRIS_PADRAO, ...(v?.osirisVis ?? {}) },
            telaVis: { ...TELA_VIS_PADRAO, ...(v?.telaVis ?? {}) },
          };
          return JSON.stringify(proximo) === JSON.stringify(atual) ? atual : proximo;
        });
      } catch {
        /* armazenamento indisponível */
      }
    };
    window.addEventListener("tactical-gis:local-data-changed", recarregar);
    return () => window.removeEventListener("tactical-gis:local-data-changed", recarregar);
  }, []);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      void setSetting(KEY, next)
        .then(() => window.dispatchEvent(new Event("tactical-gis:local-data-changed")))
        .catch(() => {});
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}
