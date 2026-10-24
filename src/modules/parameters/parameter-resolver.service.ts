import { ParameterDefinition, ParameterValue } from "@prisma/client";

export class ParameterValidationError extends Error {
  constructor(message: string, public readonly issues?: Record<string, string>) {
    super(message);
    this.name = "ParameterValidationError";
  }
}

export type TargetContext = {
  type: "PROJECT" | "CHARACTER" | "ENVIRONMENT" | "SCENE" | "OUTPUT";
  id?: string | null;
};

export type ResolvedParameter = {
  definitionId: string;
  key: string;
  label: string;
  description?: string | null;
  scope: string;
  scopes?: string[] | null;
  type: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: unknown;
  validationRules?: unknown;
  order?: number;
  value: unknown;
  source: "EXPLICIT" | "INHERITED" | "DEFAULT" | "EMPTY";
  promptMapping?: unknown;
};

export class ParameterResolver {
  /**
   * Verifica se o escopo de uma definição de parâmetro é aplicável ao tipo de alvo solicitado.
   * Suporta tanto o escopo primário (def.scope) quanto múltiplos escopos (def.scopes).
   */
  static isScopeApplicable(
    scopeOrDef: string | { scope: string; scopes?: unknown },
    targetType: TargetContext["type"]
  ): boolean {
    const mainScope = typeof scopeOrDef === "string" ? scopeOrDef : scopeOrDef.scope;
    let scopesList: string[] = [];
    if (typeof scopeOrDef === "object" && scopeOrDef !== null) {
      if (Array.isArray(scopeOrDef.scopes)) {
        scopesList = scopeOrDef.scopes as string[];
      }
    }

    const checkSingle = (s: string) => {
      if (s === "GLOBAL" || s === "ALL") return true;
      if (targetType === "PROJECT") return s === "GLOBAL" || s === "OUTPUT";
      if (targetType === "ENVIRONMENT") return s === "ENVIRONMENT";
      if (targetType === "CHARACTER") return s === "CHARACTER";
      if (targetType === "SCENE") return s === "SCENE";
      if (targetType === "OUTPUT") return s === "OUTPUT";
      return false;
    };

    if (checkSingle(mainScope)) return true;
    if (scopesList.some(checkSingle)) return true;
    return false;
  }

  /**
   * Avalia a regra declarativa de visibilidade de um parâmetro baseada nos valores já resolvidos.
   */
  static isVisible(
    definition: ParameterDefinition,
    currentResolvedValues: Record<string, unknown>
  ): boolean {
    const rules = definition.visibilityRules as {
      dependsOn?: string;
      operator?: "equals" | "notEquals" | "in" | "contains" | "truthy" | "falsy";
      value?: unknown;
    } | null;

    if (!rules || !rules.dependsOn) return true;

    const dependentValue = currentResolvedValues[rules.dependsOn];
    const operator = rules.operator || "equals";

    switch (operator) {
      case "truthy":
        return Boolean(dependentValue);
      case "falsy":
        return !dependentValue;
      case "equals":
        return dependentValue === rules.value;
      case "notEquals":
        return dependentValue !== rules.value;
      case "in":
        return Array.isArray(rules.value) && rules.value.includes(dependentValue);
      case "contains":
        return Array.isArray(dependentValue) && dependentValue.includes(rules.value);
      default:
        return true;
    }
  }

  /**
   * Valida se um valor está de acordo com as restrições e regras do tipo do parâmetro.
   */
  static validateValue(definition: ParameterDefinition, value: unknown): void {
    if (value === null || value === undefined || value === "") return;

    const rules = (definition.validationRules as any) || {};

    switch (definition.type) {
      case "NUMBER": {
        const num = Number(value);
        if (isNaN(num)) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' deve ser um número.`);
        }
        if (rules.isInteger && !Number.isInteger(num)) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' deve ser um número inteiro.`);
        }
        if (rules.min !== undefined && num < rules.min) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' não pode ser menor que ${rules.min}.`);
        }
        if (rules.max !== undefined && num > rules.max) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' não pode ser maior que ${rules.max}.`);
        }
        break;
      }
      case "RANGE": {
        const num = Number(value);
        if (isNaN(num)) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' deve ser numérico.`);
        }
        if (rules.min !== undefined && num < rules.min) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' deve estar no intervalo a partir de ${rules.min}.`);
        }
        if (rules.max !== undefined && num > rules.max) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' não pode ultrapassar ${rules.max}.`);
        }
        break;
      }
      case "DURATION": {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          throw new ParameterValidationError(`A duração em '${definition.label}' deve ser um número positivo em segundos.`);
        }
        break;
      }
      case "BOOLEAN": {
        if (typeof value !== "boolean" && value !== "true" && value !== "false") {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' deve ser booleano.`);
        }
        break;
      }
      case "SELECT": {
        const options = (definition.options as Array<{ value: string; label: string }>) || [];
        const validValues = options.map((o) => o.value);
        if (validValues.length > 0 && !validValues.includes(String(value))) {
          throw new ParameterValidationError(`Opção '${value}' inválida para o parâmetro '${definition.label}'.`);
        }
        break;
      }
      case "MULTISELECT": {
        if (!Array.isArray(value)) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' deve ser uma lista de opções.`);
        }
        const options = (definition.options as Array<{ value: string; label: string }>) || [];
        const validValues = options.map((o) => o.value);
        for (const item of value) {
          if (!validValues.includes(String(item))) {
            throw new ParameterValidationError(`Opção '${item}' inválida para '${definition.label}'.`);
          }
        }
        break;
      }
      case "DATE": {
        const parsed = Date.parse(String(value));
        if (isNaN(parsed)) {
          throw new ParameterValidationError(`O parâmetro '${definition.label}' deve ser uma data válida.`);
        }
        break;
      }
      case "TEXT":
      case "TEXTAREA": {
        const str = String(value);
        if (rules.minLength !== undefined && str.length < rules.minLength) {
          throw new ParameterValidationError(`'${definition.label}' deve ter no mínimo ${rules.minLength} caracteres.`);
        }
        if (rules.maxLength !== undefined && str.length > rules.maxLength) {
          throw new ParameterValidationError(`'${definition.label}' deve ter no máximo ${rules.maxLength} caracteres.`);
        }
        break;
      }
    }
  }

  /**
   * Resolve todos os parâmetros para um determinado contexto aplicando estritamente
   * a ordem de precedência:
   * 1. Valor explícito no contexto específico (targetType + targetId).
   * 2. Valor herdado do escopo GLOBAL do projeto (quando permitido).
   * 3. Valor padrão (defaultValue) definido no parâmetro.
   * 4. Ausência de valor (quando opcional).
   *
   * Garante o isolamento entre alvos diferentes (Personagem A não herda de Personagem B).
   */
  static resolveForTarget(
    definitions: ParameterDefinition[],
    allProjectValues: ParameterValue[],
    target: TargetContext
  ): {
    resolved: Record<string, unknown>;
    details: ResolvedParameter[];
    missingRequired: string[];
  } {
    const resolved: Record<string, unknown> = {};
    const details: ResolvedParameter[] = [];
    const missingRequired: string[] = [];

    // Ordenar definições pelo campo order
    const sortedDefs = [...definitions].sort((a, b) => a.order - b.order);

    for (const def of sortedDefs) {
      if (!def.enabled) continue;

      // 0. Verificar pertinência do escopo ao alvo
      if (!this.isScopeApplicable(def, target.type)) continue;

      // 1. Verificar se a visibilidade permite a inclusão deste parâmetro
      const visible = this.isVisible(def, resolved);
      if (!visible) continue;

      // 2. Tentar buscar valor explícito no alvo atual
      const explicitVal = allProjectValues.find((pv) => {
        if (pv.parameterDefinitionId !== def.id) return false;
        if (pv.targetType !== target.type) return false;
        if (target.id) {
          return pv.targetId === target.id;
        }
        return true;
      });

      let finalValue: unknown = undefined;
      let source: ResolvedParameter["source"] = "EMPTY";

      if (explicitVal && explicitVal.value !== null && explicitVal.value !== undefined && explicitVal.value !== "") {
        finalValue = explicitVal.value;
        source = "EXPLICIT";
      } else if (
        target.type !== "PROJECT" &&
        (def.scope === "GLOBAL" || (Array.isArray((def as any).scopes) && (def as any).scopes.includes("GLOBAL")))
      ) {
        // 3. Herança permitida: se o parâmetro tem escopo GLOBAL e estamos avaliando
        // um submódulo do projeto, busca valor global do projeto
        const globalVal = allProjectValues.find(
          (pv) => pv.parameterDefinitionId === def.id && pv.targetType === "PROJECT"
        );
        if (globalVal && globalVal.value !== null && globalVal.value !== undefined && globalVal.value !== "") {
          finalValue = globalVal.value;
          source = "INHERITED";
        }
      }

      // 4. Valor padrão configurado na definição
      if (finalValue === undefined && def.defaultValue !== null && def.defaultValue !== undefined && def.defaultValue !== "") {
        finalValue = def.defaultValue;
        source = "DEFAULT";
      }

      // 5. Validação de Obrigatoriedade
      const isMissing = finalValue === undefined || finalValue === null || finalValue === "";
      if (def.required && isMissing) {
        missingRequired.push(`'${def.label}' (${def.key}) no contexto ${target.type}`);
      }

      // 6. Validação do tipo do valor
      if (!isMissing) {
        this.validateValue(def, finalValue);
        resolved[def.key] = finalValue;
      }

      details.push({
        definitionId: def.id,
        key: def.key,
        label: def.label,
        description: def.description,
        scope: def.scope,
        scopes: (def as any).scopes || null,
        type: def.type,
        required: def.required,
        defaultValue: def.defaultValue,
        options: def.options,
        validationRules: def.validationRules,
        order: def.order,
        value: finalValue,
        source,
        promptMapping: def.promptMapping,
      });
    }

    return { resolved, details, missingRequired };
  }
}
