"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Chargement de données côté client **infaillible**.
 *
 * Pourquoi ce hook existe : un `fetch` sans garde laisse un écran de chargement
 * tourner à l'infini si la requête traîne ou échoue (`setLoading(false)` jamais
 * appelé). Inoffensif pour un humain, mais une automatisation de navigateur
 * (agent IA en auto-pilote) attend que la page se « stabilise » → elle boucle
 * sans fin et fait exploser la mémoire → le Mac fige. Voir la fiche
 * `DIAGNOSTIC-FREEZE.md` à la racine du workspace.
 *
 * Garanties de ce hook : la page atteint TOUJOURS un état terminal
 * (`data` rempli, ou `error` rempli) en moins de `timeoutMs`. Jamais de
 * chargement sans fin.
 *
 * @example
 * "use client";
 * import { useData } from "@/lib/use-data";
 *
 * function Page() {
 *   const { data, error, loading, refresh } = useData<MyType>("/api/data");
 *   if (loading) return <Spinner />;          // borné par le timeout
 *   if (error)   return <ErrorState msg={error} onRetry={refresh} />; // état STATIQUE
 *   return <Dashboard data={data!} />;
 * }
 */
export interface UseDataResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Recharge manuellement (après un POST, un bouton « Réessayer », etc.). */
  refresh: () => Promise<void>;
}

export interface UseDataOptions extends Omit<RequestInit, "signal"> {
  /** Délai max avant d'abandonner et de basculer en erreur. Défaut : 12 000 ms. */
  timeoutMs?: number;
}

export function useData<T>(url: string, options: UseDataOptions = {}): UseDataResult<T> {
  const { timeoutMs = 12_000, ...init } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        ...init,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Le serveur a répondu ${res.status}`);
      setData((await res.json()) as T);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? `Le chargement a expiré (${Math.round(timeoutMs / 1000)} s) — le serveur ne répond pas.`
          : err instanceof Error
            ? err.message
            : "Chargement impossible.",
      );
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
    // `init` est volontairement hors deps : passe des options stables (objet
    // littéral à chaque rendu = boucle). url + timeout suffisent à réagir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, timeoutMs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}
