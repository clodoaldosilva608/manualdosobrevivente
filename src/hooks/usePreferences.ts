import { useCallback, useEffect, useState } from "react";
import { getSetting, setSetting } from "@/lib/db";

export interface Preferences {
  units: "metric" | "nautical";
  coordFormat: "DD" | "DMS" | "MGRS";
  northRef: "true" | "magnetic";
}

export const DEFAULT_PREFERENCES: Preferences = {
  units: "metric",
  coordFormat: "DD",
  northRef: "true",
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
        setPrefs({ ...DEFAULT_PREFERENCES, ...(v ?? {}) });
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
      void setSetting(KEY, next).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}
