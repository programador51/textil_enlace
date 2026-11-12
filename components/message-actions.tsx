"use client";

import { whatsappHref } from "@/lib/message";
import { CopyButton } from "@/components/copy-button";

export function MessageActions({
  phone,
  message,
  intent = "enviar",
}: {
  phone: string;
  message: string;
  intent?: "enviar" | "responder";
}) {
  const digits = phone.replace(/\D/g, "");
  const canChat = digits.length >= 10;
  const href = !canChat
    ? null
    : intent === "enviar"
      ? whatsappHref(phone, message)
      : `https://wa.me/${digits.length === 10 ? `52${digits}` : digits}`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {href ? (
        <a className="btn btn-teal" href={href} target="_blank" rel="noopener noreferrer">
          {intent === "enviar" ? "Abrir WhatsApp" : "Abrir chat con esta persona"}
        </a>
      ) : (
        <p className="text-sm text-ink-soft">Este contacto no es un teléfono. Cópialo para responder por otro medio.</p>
      )}
      <CopyButton text={message} label={intent === "responder" ? "Copiar la solicitud" : "Copiar mensaje"} />
    </div>
  );
}
