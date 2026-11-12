import { Suspense } from "react";
import { PanelFrame } from "@/components/panel-frame";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-16 text-ink-soft">Cargando el taller…</p>}>
      <PanelFrame>{children}</PanelFrame>
    </Suspense>
  );
}
