import { useEffect, useState } from "react";
import { authHeaders } from "../utils/apiClient";

export function usePdfSource(fileUrl: string | undefined) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setSource(""); setError("");
    if (!fileUrl) return;
    if (!fileUrl.startsWith("/api/knowledge/documents/")) {
      if (/^(https?:\/\/|\/docs\/)/.test(fileUrl)) setSource(fileUrl);
      else setError("This document has no supported PDF link.");
      return;
    }
    const abort = new AbortController();
    let objectUrl = "";
    void fetch(fileUrl, { headers: authHeaders(), signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Could not load original PDF.");
      if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("The server did not return a PDF.");
      const blob = await response.blob();
      if (abort.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setSource(objectUrl);
    }).catch(error => { if (!abort.signal.aborted) setError(error.message); });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileUrl]);
  return { source, error };
}
