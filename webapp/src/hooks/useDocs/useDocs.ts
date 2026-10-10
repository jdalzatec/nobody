import { useCallback, useEffect, useState } from "react";

import { fetchDocs } from "../../lib/api";

import type { Doc } from "../../types";

/** Fetches the list of documents the registry currently reports as open. */
export function useDocs() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDocs()
      .then((next) => {
        if (cancelled) return;
        setDocs(next);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { docs, loading, error, reload };
}
