import { describe, it, expect } from "vitest";
import { ParameterResolver } from "@/modules/parameters/parameter-resolver.service";

describe("Deduplicação de Parâmetros Cinematográficos nos Escopos", () => {
  it("garante que parâmetros de escopo GLOBAL não vazem para Personagens", () => {
    const isApplicable = ParameterResolver.isScopeApplicable("GLOBAL", "CHARACTER");
    expect(isApplicable).toBe(false);
  });

  it("garante que parâmetros de escopo GLOBAL não vazem para Ambientes", () => {
    const isApplicable = ParameterResolver.isScopeApplicable("GLOBAL", "ENVIRONMENT");
    expect(isApplicable).toBe(false);
  });

  it("garante que parâmetros de escopo SCENE sejam aplicáveis apenas a Cenas", () => {
    expect(ParameterResolver.isScopeApplicable("SCENE", "SCENE")).toBe(true);
    expect(ParameterResolver.isScopeApplicable("SCENE", "CHARACTER")).toBe(false);
    expect(ParameterResolver.isScopeApplicable("SCENE", "ENVIRONMENT")).toBe(false);
  });

  it("garante que parâmetros de CHARACTER sejam aplicáveis apenas a Personagens", () => {
    expect(ParameterResolver.isScopeApplicable("CHARACTER", "CHARACTER")).toBe(true);
    expect(ParameterResolver.isScopeApplicable("CHARACTER", "SCENE")).toBe(false);
    expect(ParameterResolver.isScopeApplicable("CHARACTER", "ENVIRONMENT")).toBe(false);
  });

  it("garante que parâmetros de ENVIRONMENT sejam aplicáveis apenas a Ambientes", () => {
    expect(ParameterResolver.isScopeApplicable("ENVIRONMENT", "ENVIRONMENT")).toBe(true);
    expect(ParameterResolver.isScopeApplicable("ENVIRONMENT", "CHARACTER")).toBe(false);
    expect(ParameterResolver.isScopeApplicable("ENVIRONMENT", "SCENE")).toBe(false);
  });
});
