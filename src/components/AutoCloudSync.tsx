import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { pullAll, pushAll } from "@/lib/sync.functions";
import { pullCloudToLocal, pushLocalToCloud } from "@/lib/cloud-sync";
import { getSetting } from "@/lib/db";

export const CLOUD_SYNC_EVENT = "tactical-gis:local-data-changed";
const AUTO_SYNC_KEY = "cloud-auto-sync";

/** A nuvem é opcional: o aplicativo roda com o banco local do aparelho e
 * só sincroniza quando o usuário ativou a sincronização automática. */
async function autoSyncLigado(): Promise<boolean> {
  try {
    return (await getSetting<boolean>(AUTO_SYNC_KEY)) === true;
  } catch {
    return false;
  }
}

export function AutoCloudSync() {
  const callPush = useServerFn(pushAll);
  const callPull = useServerFn(pullAll);

  useEffect(() => {
    let timer: number | null = null;
    let active = true;
    const syncInitial = async () => {
      if (!(await autoSyncLigado())) return;
      const { data } = await supabase.auth.getSession();
      if (!active || !data.session || !navigator.onLine) return;
      try {
        await pullCloudToLocal(callPull as never);
        await pushLocalToCloud(callPush as never);
      } catch {
        // A sincronização automática tenta novamente na próxima alteração ou conexão.
      }
    };
    const schedulePush = async () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (!(await autoSyncLigado())) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session || !navigator.onLine) return;
        try {
          await pushLocalToCloud(callPush as never);
        } catch {
          // Mantém os dados locais para a próxima tentativa.
        }
      }, 1200);
    };
    void syncInitial();
    window.addEventListener(CLOUD_SYNC_EVENT, schedulePush);
    window.addEventListener("online", syncInitial);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(CLOUD_SYNC_EVENT, schedulePush);
      window.removeEventListener("online", syncInitial);
    };
  }, [callPull, callPush]);

  return null;
}
