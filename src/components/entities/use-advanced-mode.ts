"use client";

import { useCallback, useEffect, useState } from "react";

export const ADVANCED_MODE_STORAGE_KEY = "tomadix_advanced_mode";

/** Lê a preferência salva; qualquer falha de storage (modo privado, bloqueio) vira "desligado". */
export function readAdvancedMode(storage?: Pick<Storage, "getItem">): boolean {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    return s?.getItem(ADVANCED_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAdvancedMode(value: boolean, storage?: Pick<Storage, "setItem">): void {
  try {
    const s = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    s?.setItem(ADVANCED_MODE_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // sem storage: a preferência vale só durante a sessão da tela
  }
}

/**
 * Preferência "Modo avançado" dos formulários de cena, personagem e ambiente.
 * Começa desligada; persiste por navegador e vale para os três formulários.
 */
export function useAdvancedMode(): [boolean, (value: boolean) => void] {
  const [advanced, setAdvancedState] = useState(false);

  useEffect(() => {
    setAdvancedState(readAdvancedMode());
  }, []);

  const setAdvanced = useCallback((value: boolean) => {
    setAdvancedState(value);
    writeAdvancedMode(value);
  }, []);

  return [advanced, setAdvanced];
}
