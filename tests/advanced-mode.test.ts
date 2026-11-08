import { describe, it, expect } from "vitest";
import { ADVANCED_MODE_STORAGE_KEY, readAdvancedMode, writeAdvancedMode } from "@/components/entities/use-advanced-mode";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    data,
  };
}

describe("Modo avançado dos formulários", () => {
  it("começa desligado quando não há preferência salva", () => {
    expect(readAdvancedMode(fakeStorage())).toBe(false);
  });

  it("persiste e lê a preferência", () => {
    const st = fakeStorage();
    writeAdvancedMode(true, st);
    expect(st.data[ADVANCED_MODE_STORAGE_KEY]).toBe("1");
    expect(readAdvancedMode(st)).toBe(true);
    writeAdvancedMode(false, st);
    expect(readAdvancedMode(st)).toBe(false);
  });

  it("não quebra quando o storage lança erro", () => {
    const broken = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(readAdvancedMode(broken)).toBe(false);
    expect(() => writeAdvancedMode(true, broken)).not.toThrow();
  });
});
