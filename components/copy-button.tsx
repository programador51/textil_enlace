"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar mensaje" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copiado" : label}
    </button>
  );
}
