import { useCallback, useEffect, useState } from "react";
import { getSetting, setSetting } from "@/lib/db";
import {
  INTEL_CHAVES_PADRAO,
  INTEL_VIS_PADRAO,
  type IntelChaves,
  type IntelVisibilidade,
} from "@/lib/intel.types";
import { VIS_OSIRIS_PADRAO, type VisOsiris } from "@/components/map/visao-osiris-camadas";

export type ModoMapa = "tatico" | "osiris";

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
}

export const DEFAULT_PREFERENCES: Preferences = {
  units: "metric",
  coordFormat: "DD",
  northRef: "true",
  mapMode: "tatico",
  intelVis: INTEL_VIS_PADRAO,
  intelKeys: INTEL_CHAVES_PADRAO,
  osirisVis: VIS_OSIRIS_PADRAO,
};

const KEY = "preferences";

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getSetting<Partial<Preferences>>(KEY)
      .then((v) => {
        if (!alive) return;
        setPrefs({
          ...DEFAULT_PREFERENCES,
          ...(v ?? {}),
          intelVis: { ...INTEL_VIS_PADRAO, ...(v?.intelVis ?? {}) },
          intelKeys: { ...INTEL_CHAVES_PADRAO, ...(v?.intelKeys ?? {}) },
          osirisVis: { ...VIS_OSIRIS_PADRAO, ...(v?.osirisVis ?? {}) },
        });
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
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
