import type { WorkshopSize } from "@/lib/labels";

export type PublicProcess = {
  slug: string;
  name: string;
};

export type PublicGarment = {
  slug: string;
  name: string;
};

export type PublicWorkshop = {
  id: string;
  name: string;
  size: WorkshopSize;
  zone: string;
  contactName: string;
  phone: string;
  phrase: string;
  processes: PublicProcess[];
  garments: PublicGarment[];
};

export type ProcessOption = PublicProcess & {
  custom: boolean;
};

export type OrientationView = {
  title: string;
  explanation: string;
  processes: string[];
};

export type ReceiptWorkshop = {
  id: string;
  name: string;
  phone: string;
  zone: string;
};

export type Receipt = {
  folio: string;
  message: string;
  workshops: ReceiptWorkshop[];
};
