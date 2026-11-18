import type { Metadata } from "next";

export const SITE_NAME = "TextilEnlace";
export const DEFAULT_TITLE = "TextilEnlace · Impresión textil en Monterrey";
export const DEFAULT_DESCRIPTION =
  "Conecta a quien necesita impresión textil con talleres chicos y medianos de Monterrey y su área metropolitana. Incluye separador de tintas planas en el navegador. La cotización la hace cada taller.";

export const ROOT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "TextilEnlace · Impresión textil con talleres chicos y medianos de Monterrey",
  type: "image/png",
};

export const ROOT_TWITTER_IMAGE = {
  url: "/twitter-image",
  width: 1200,
  height: 600,
  alt: "TextilEnlace · Impresión textil con talleres chicos y medianos de Monterrey",
};

export const SEPARATOR_OG_IMAGE = {
  url: "/separar/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Separador de tintas planas · Capas, base blanca, receta y PSD en el navegador",
  type: "image/png",
};

export const SEPARATOR_TWITTER_IMAGE = {
  url: "/separar/twitter-image",
  width: 1200,
  height: 600,
  alt: "Separador de tintas planas · Capas, base blanca, receta y PSD en el navegador",
};

export function resolveMetadataBase(): URL {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  try {
    return new URL(configured);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function buildPageMetadata({
  title,
  absoluteTitle,
  description,
  path,
  ogImage = ROOT_OG_IMAGE,
  twitterImage = ROOT_TWITTER_IMAGE,
}: {
  title: string;
  absoluteTitle?: string;
  description: string;
  path: string;
  ogImage?: { url: string; width: number; height: number; alt: string; type?: string };
  twitterImage?: { url: string; width: number; height: number; alt: string };
}): Metadata {
  const socialTitle = absoluteTitle ?? `${title} · ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName: SITE_NAME,
      url: path,
      title: socialTitle,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [twitterImage],
    },
  };
}
