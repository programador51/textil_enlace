import { PrismaClient, WorkshopSize } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "TextilEnlace.demo";

const processes = [
  { slug: "serigrafia", name: "Serigrafía", sortOrder: 1 },
  { slug: "dtf", name: "DTF", sortOrder: 2 },
  { slug: "dtg", name: "DTG", sortOrder: 3 },
  { slug: "sublimacion", name: "Sublimación", sortOrder: 4 },
  { slug: "vinil", name: "Vinil textil", sortOrder: 5 },
];

const garments = [
  { slug: "playera", name: "Playera", sortOrder: 1 },
  { slug: "sudadera", name: "Sudadera", sortOrder: 2 },
  { slug: "gorra", name: "Gorra", sortOrder: 3 },
  { slug: "uniforme", name: "Uniforme", sortOrder: 4 },
  { slug: "bolsa", name: "Bolsa", sortOrder: 5 },
  { slug: "otra", name: "Otra prenda", sortOrder: 6 },
];

const rules = [
  {
    slug: "pocas-piezas",
    title: "Pocas piezas",
    explanation:
      "Para una pieza o muy pocas no hace falta preparar pantallas. Suelen usarse DTF, DTG o vinil textil.",
    conditions: { maxQuantity: 12 },
    processes: ["dtf", "dtg", "vinil"],
    sortOrder: 10,
  },
  {
    slug: "varias-pocos-colores",
    title: "Varias piezas y pocos colores",
    explanation:
      "Con varias piezas y pocos colores planos suele usarse serigrafía: el preparado se reparte entre las piezas.",
    conditions: { minQuantity: 13, designClasses: ["POCOS_COLORES"] },
    processes: ["serigrafia"],
    sortOrder: 20,
  },
  {
    slug: "foto",
    title: "Foto o muchos colores",
    explanation: "Una foto, un degradado o muchos colores suelen imprimirse en DTF o DTG.",
    conditions: { designClasses: ["FOTO"] },
    processes: ["dtf", "dtg"],
    sortOrder: 30,
  },
  {
    slug: "uniforme",
    title: "Prenda deportiva",
    explanation:
      "En un uniforme de poliéster suele usarse sublimación, cuando la tela lo permite. La tela la confirma el taller.",
    conditions: { garmentSlugs: ["uniforme"] },
    processes: ["sublimacion"],
    sortOrder: 40,
  },
  {
    slug: "nombre-numero",
    title: "Nombre y número",
    explanation: "Para nombre y número suelen usarse vinil textil o DTF.",
    conditions: { designClasses: ["NOMBRE_NUMERO"] },
    processes: ["vinil", "dtf"],
    sortOrder: 50,
  },
  {
    slug: "cercanos",
    title: "No encaja en un solo caso",
    explanation:
      "Con lo que describiste no hay un solo proceso típico. Estos son los procesos cercanos. También puedes escribirle a un taller de otro proceso, desde la lista completa.",
    conditions: { fallback: true },
    processes: ["serigrafia", "dtf", "dtg", "sublimacion", "vinil"],
    sortOrder: 90,
  },
];

const workshops: {
  email: string;
  name: string;
  size: WorkshopSize;
  zone: string;
  contactName: string;
  phone: string;
  phrase: string;
  processes: string[];
  garments: string[];
}[] = [
  {
    email: "norte@demo.textilenlace.mx",
    name: "Taller Norte",
    size: "CHICO",
    zone: "Monterrey",
    contactName: "Laura Méndez",
    phone: "8100000001",
    phrase: "Ficha de demostración. Grupos y pedidos de varias playeras.",
    processes: ["serigrafia"],
    garments: ["playera", "sudadera"],
  },
  {
    email: "regina@demo.textilenlace.mx",
    name: "Impresos Regina",
    size: "MEDIANO",
    zone: "Guadalupe",
    contactName: "Ricardo Salinas",
    phone: "8100000002",
    phrase: "Ficha de demostración. Desde una pieza y también grupos.",
    processes: ["serigrafia", "dtf"],
    garments: ["playera", "uniforme", "bolsa"],
  },
  {
    email: "obispado@demo.textilenlace.mx",
    name: "DTF Obispado",
    size: "CHICO",
    zone: "Monterrey",
    contactName: "Ana Beltrán",
    phone: "8100000003",
    phrase: "Ficha de demostración. Fotos y encargos de pocas piezas.",
    processes: ["dtf", "dtg"],
    garments: ["playera", "sudadera", "gorra"],
  },
  {
    email: "cumbres@demo.textilenlace.mx",
    name: "Sublima Cumbres",
    size: "CHICO",
    zone: "Monterrey",
    contactName: "Diego Carrillo",
    phone: "8100000004",
    phrase: "Ficha de demostración. Uniformes claros de poliéster.",
    processes: ["sublimacion"],
    garments: ["uniforme", "playera"],
  },
  {
    email: "sannicolas@demo.textilenlace.mx",
    name: "Vinilos San Nicolás",
    size: "CHICO",
    zone: "San Nicolás de los Garza",
    contactName: "Patricia Leal",
    phone: "8100000005",
    phrase: "Ficha de demostración. Nombres, números y encargos chicos.",
    processes: ["vinil", "dtf"],
    garments: ["playera", "gorra", "uniforme"],
  },
  {
    email: "apodaca@demo.textilenlace.mx",
    name: "Taller del Parque",
    size: "MEDIANO",
    zone: "Apodaca",
    contactName: "Hugo Treviño",
    phone: "8100000006",
    phrase: "Ficha de demostración. Escuelas, equipos y negocios chicos.",
    processes: ["serigrafia", "dtg", "vinil"],
    garments: ["playera", "sudadera", "bolsa"],
  },
];

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, 12);

  for (const process of processes) {
    await prisma.process.upsert({
      where: { slug: process.slug },
      update: { name: process.name, sortOrder: process.sortOrder, custom: false },
      create: process,
    });
  }

  for (const garment of garments) {
    await prisma.garment.upsert({
      where: { slug: garment.slug },
      update: { name: garment.name, sortOrder: garment.sortOrder },
      create: garment,
    });
  }

  await prisma.orientationRuleProcess.deleteMany();
  await prisma.orientationRule.deleteMany();

  for (const rule of rules) {
    await prisma.orientationRule.create({
      data: {
        slug: rule.slug,
        title: rule.title,
        explanation: rule.explanation,
        conditions: rule.conditions,
        sortOrder: rule.sortOrder,
        processes: {
          create: rule.processes.map((slug) => ({
            process: { connect: { slug } },
          })),
        },
      },
    });
  }

  for (const workshop of workshops) {
    await prisma.workshop.upsert({
      where: { email: workshop.email },
      update: {
        passwordHash,
        name: workshop.name,
        size: workshop.size,
        zone: workshop.zone,
        contactName: workshop.contactName,
        phone: workshop.phone,
        phrase: workshop.phrase,
        published: true,
      },
      create: {
        email: workshop.email,
        passwordHash,
        name: workshop.name,
        size: workshop.size,
        zone: workshop.zone,
        contactName: workshop.contactName,
        phone: workshop.phone,
        phrase: workshop.phrase,
        published: true,
      },
    });
  }
}

async function linkWorkshopCatalog() {
  const processRows = await prisma.process.findMany();
  const garmentRows = await prisma.garment.findMany();
  const processId = new Map(processRows.map((row) => [row.slug, row.id]));
  const garmentId = new Map(garmentRows.map((row) => [row.slug, row.id]));

  for (const workshop of workshops) {
    const saved = await prisma.workshop.findUniqueOrThrow({ where: { email: workshop.email } });
    await prisma.workshopProcess.deleteMany({ where: { workshopId: saved.id } });
    await prisma.workshopGarment.deleteMany({ where: { workshopId: saved.id } });
    await prisma.workshopProcess.createMany({
      data: workshop.processes.map((slug) => ({
        workshopId: saved.id,
        processId: processId.get(slug)!,
      })),
    });
    await prisma.workshopGarment.createMany({
      data: workshop.garments.map((slug) => ({
        workshopId: saved.id,
        garmentId: garmentId.get(slug)!,
      })),
    });
  }
}

main()
  .then(() => linkWorkshopCatalog())
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
