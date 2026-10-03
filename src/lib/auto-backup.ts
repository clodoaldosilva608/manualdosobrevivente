/**
 * Backup automático para a pasta do usuário.
 *
 * Ouve o evento de alteração de dados locais (emitido por db.ts) e grava o
 * snapshot na pasta conectada, com debounce. Falhas são silenciosas — o backup
 * nunca deve atrapalhar o uso do aplicativo.
 */
import { gravarBackupNaPasta, obterPastaBackup } from "@/lib/backup";

const CLOUD_SYNC_EVENT = "tactical-gis:local-data-changed";
const DEBOUNCE_MS = 4000;
let timer: number | null = null;
let iniciado = false;

async function gravar() {
  try {
    const pasta = await obterPastaBackup();
    if (!pasta) return;
    await gravarBackupNaPasta(pasta);
  } catch {
    /* sem permissão nesta sessão ou pasta indisponível — tenta no próximo evento */
  }
}

export function iniciarAutoBackup() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;

  window.addEventListener(
    CLOUD_SYNC_EVENT,
    () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void gravar(), DEBOUNCE_MS);
    },
    { passive: true },
  );

  // Backup de segurança ao abrir o aplicativo.
  window.setTimeout(() => void gravar(), 6000);
}
