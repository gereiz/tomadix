"use client";

import { useCallback, useEffect, useState } from "react";
import type { Recipe, RecipeInput } from "@/modules/recipes/recipe.schema";

interface RecipesBarProps {
  /** Configuração atual do painel, usada ao salvar uma receita. */
  current: Omit<RecipeInput, "name">;
  onApply: (recipe: Recipe) => void;
}

/** Receitas: combinações salvas (tipo + ferramenta + estilo + diretrizes) aplicadas com 1 clique. */
export function RecipesBar({ current, onApply }: RecipesBarProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) setRecipes(((await res.json()) as { data: Recipe[] }).data ?? []);
    } catch {
      // sem receitas: a barra simplesmente não aparece
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, name: name.trim() }),
      });
      const json = (await res.json()) as { data?: Recipe; error?: string };
      if (!res.ok || !json.data) throw new Error(json.error || "Não foi possível salvar a receita.");
      setRecipes((prev) => [...prev, json.data!]);
      setName("");
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar a receita.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "Não foi possível excluir.");
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir a receita.");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">Receitas</span>
        {!saving && (
          <button type="button" onClick={() => setSaving(true)} className="min-h-8 text-[11px] font-semibold text-primary hover:underline">
            + Salvar configuração atual
          </button>
        )}
      </div>

      {recipes.length === 0 && !saving && (
        <p className="text-[11px] text-white/40">Salve a combinação que você mais usa e aplique com 1 clique.</p>
      )}

      {recipes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipes.map((r) => (
            <span key={r.id} className="inline-flex items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <button
                type="button"
                onClick={() => onApply(r)}
                title={`${r.templateKey} · ${r.targetTool}`}
                className="min-h-9 px-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white"
              >
                ⚡ {r.name}
              </button>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={busy}
                aria-label={`Excluir receita ${r.name}`}
                className="min-h-9 px-2 text-xs text-white/40 hover:text-red-300 disabled:opacity-40"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {saving && (
        <form onSubmit={save} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Nome da receita (ex: Selfie amadora Kling)"
            className="min-h-10 flex-1 rounded-xl border border-white/10 bg-[#0f1218] px-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />
          <button type="submit" disabled={busy || name.trim().length < 2} className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-on-primary disabled:opacity-40">
            Salvar
          </button>
          <button type="button" onClick={() => setSaving(false)} className="min-h-10 rounded-xl border border-white/15 px-3 text-xs text-white/70">
            Cancelar
          </button>
        </form>
      )}

      {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
