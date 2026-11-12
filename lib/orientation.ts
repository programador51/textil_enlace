export type RuleConditions = {
  minQuantity?: number;
  maxQuantity?: number;
  designClasses?: string[];
  fabric?: string[];
  garmentSlugs?: string[];
  fallback?: boolean;
};

export type OrientationInput = {
  quantity: number;
  designClass: string;
  fabric: string;
  garmentSlug: string;
};

export type OrientationProcess = {
  slug: string;
  name: string;
};

export type OrientationRuleLike = {
  slug: string;
  title: string;
  explanation: string;
  sortOrder: number;
  conditions: RuleConditions;
  processes: OrientationProcess[];
};

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : undefined;
}

export function asConditions(value: unknown): RuleConditions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    minQuantity: typeof record.minQuantity === "number" ? record.minQuantity : undefined,
    maxQuantity: typeof record.maxQuantity === "number" ? record.maxQuantity : undefined,
    designClasses: asStringArray(record.designClasses),
    fabric: asStringArray(record.fabric),
    garmentSlugs: asStringArray(record.garmentSlugs),
    fallback: record.fallback === true ? true : undefined,
  };
}

function conditionsMatch(conditions: RuleConditions, input: OrientationInput) {
  if (conditions.minQuantity != null && input.quantity < conditions.minQuantity) return false;
  if (conditions.maxQuantity != null && input.quantity > conditions.maxQuantity) return false;
  if (conditions.designClasses?.length && !conditions.designClasses.includes(input.designClass)) {
    return false;
  }
  if (conditions.fabric?.length && !conditions.fabric.includes(input.fabric)) return false;
  if (conditions.garmentSlugs?.length && !conditions.garmentSlugs.includes(input.garmentSlug)) {
    return false;
  }
  return true;
}

export function matchOrientation<T extends OrientationRuleLike>(rules: T[], input: OrientationInput) {
  const specific = rules
    .filter((rule) => !rule.conditions.fallback && conditionsMatch(rule.conditions, input))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (specific.length > 0) return specific;

  return rules
    .filter((rule) => rule.conditions.fallback)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function suggestedProcessSlugs(rules: { processes: { slug: string }[] }[]) {
  const slugs: string[] = [];
  for (const rule of rules) {
    for (const process of rule.processes) {
      if (!slugs.includes(process.slug)) slugs.push(process.slug);
    }
  }
  return slugs;
}

export function sortForRequest<T extends { name: string; processes: { slug: string }[] }>(
  workshops: T[],
  suggestedSlugs: string[],
) {
  const suggested = new Set(suggestedSlugs);
  return [...workshops].sort((a, b) => {
    const overlapA = a.processes.filter((process) => suggested.has(process.slug)).length;
    const overlapB = b.processes.filter((process) => suggested.has(process.slug)).length;
    if (overlapA !== overlapB) return overlapB - overlapA;
    return a.name.localeCompare(b.name, "es");
  });
}
