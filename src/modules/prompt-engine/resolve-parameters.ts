export type ParameterValueRecord = {
  key: string;
  scope: "GLOBAL" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "OUTPUT";
  targetId?: string | null;
  value: unknown;
};

/**
 * Resolves values for one target. More specific scopes override global values.
 * The function is intentionally deterministic and does not call an AI provider.
 */
export function resolveParameters(
  values: ParameterValueRecord[],
  target: { type: "PROJECT" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "OUTPUT"; id?: string }
) {
  const result: Record<string, unknown> = {};
  const rank: Record<ParameterValueRecord["scope"], number> = {
    GLOBAL: 0,
    CHARACTER: 1,
    ENVIRONMENT: 1,
    SCENE: 2,
    OUTPUT: 3
  };

  const applicable = values.filter((item) => {
    if (item.scope === "GLOBAL") return true;
    if (item.scope === "SCENE") return target.type === "SCENE" && item.targetId === target.id;
    if (item.scope === "CHARACTER") return target.type === "CHARACTER" && item.targetId === target.id;
    if (item.scope === "ENVIRONMENT") return target.type === "ENVIRONMENT" && item.targetId === target.id;
    if (item.scope === "OUTPUT") return target.type === "OUTPUT";
    return false;
  });

  applicable.sort((a, b) => rank[a.scope] - rank[b.scope]);
  for (const item of applicable) result[item.key] = item.value;
  return result;
}
