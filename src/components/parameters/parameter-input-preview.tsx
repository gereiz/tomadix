"use client";

import { useState } from "react";
import { ParameterType, ParameterOption } from "@/modules/parameters/parameter.schema";

interface ParameterInputPreviewProps {
  type: ParameterType;
  label: string;
  description?: string | null;
  required?: boolean;
  defaultValue?: unknown;
  options?: ParameterOption[] | null;
  validationRules?: {
    min?: number;
    max?: number;
    isInteger?: boolean;
    minLength?: number;
    maxLength?: number;
    step?: number;
  } | null;
}

export function ParameterInputPreview({
  type,
  label,
  description,
  required = false,
  defaultValue,
  options = [],
  validationRules,
}: ParameterInputPreviewProps) {
  const [val, setVal] = useState<any>(defaultValue ?? (type === "BOOLEAN" ? false : type === "MULTISELECT" ? [] : ""));

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-white flex items-center gap-1.5">
          {label || "Nome do Campo"}
          {required && <span className="text-emerald-400 font-bold">*</span>}
        </label>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/50">
          {type}
        </span>
      </div>

      {description && (
        <p className="text-[11px] text-white/50 mb-3">{description}</p>
      )}

      {/* Renderização Condicional conforme o Tipo */}
      {type === "TEXT" && (
        <input
          type="text"
          value={val || ""}
          onChange={(e) => setVal(e.target.value)}
          placeholder={`Digite ${label.toLowerCase()}...`}
          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none"
        />
      )}

      {type === "TEXTAREA" && (
        <textarea
          rows={3}
          value={val || ""}
          onChange={(e) => setVal(e.target.value)}
          placeholder={`Descreva ${label.toLowerCase()} detalhadamente...`}
          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none"
        />
      )}

      {type === "NUMBER" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={validationRules?.step ?? (validationRules?.isInteger ? "1" : "any")}
            min={validationRules?.min}
            max={validationRules?.max}
            value={val ?? ""}
            onChange={(e) => setVal(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none font-mono"
          />
          {validationRules?.min !== undefined && validationRules?.max !== undefined && (
            <span className="text-[10px] text-white/40 whitespace-nowrap">
              ({validationRules.min} a {validationRules.max})
            </span>
          )}
        </div>
      )}

      {type === "BOOLEAN" && (
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={() => setVal(!val)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              val ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                val ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-xs text-white/70">
            {val ? "Ativado / Sim" : "Desativado / Não"}
          </span>
        </div>
      )}

      {type === "SELECT" && (
        <select
          value={val || ""}
          onChange={(e) => setVal(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
        >
          <option value="">Selecione uma opção...</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === "MULTISELECT" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {options?.map((opt) => {
              const selected = Array.isArray(val) && val.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const current = Array.isArray(val) ? [...val] : [];
                    if (selected) {
                      setVal(current.filter((item) => item !== opt.value));
                    } else {
                      setVal([...current, opt.value]);
                    }
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    selected
                      ? "bg-emerald-400 text-black font-semibold"
                      : "bg-white/10 text-white/70 hover:bg-white/15"
                  }`}
                >
                  {selected ? "✓ " : "+ "}
                  {opt.label}
                </button>
              );
            })}
          </div>
          {(!options || options.length === 0) && (
            <p className="text-[10px] text-white/30 italic">Nenhuma opção configurada ainda.</p>
          )}
        </div>
      )}

      {type === "RANGE" && (
        <div className="space-y-2 mt-1">
          <div className="flex justify-between text-[11px] font-mono text-white/60">
            <span>Mín: {validationRules?.min ?? 0}</span>
            <span className="font-bold text-emerald-400">{val ?? validationRules?.min ?? 0}</span>
            <span>Máx: {validationRules?.max ?? 100}</span>
          </div>
          <input
            type="range"
            min={validationRules?.min ?? 0}
            max={validationRules?.max ?? 100}
            step={validationRules?.step ?? 1}
            value={val ?? validationRules?.min ?? 0}
            onChange={(e) => setVal(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>
      )}

      {type === "DURATION" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={val ?? ""}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Ex: 30"
            className="w-32 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none font-mono"
          />
          <span className="text-xs text-white/60">segundos</span>
        </div>
      )}

      {type === "DATE" && (
        <input
          type="date"
          value={val || ""}
          onChange={(e) => setVal(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
        />
      )}

      {type === "JSON" && (
        <textarea
          rows={3}
          value={typeof val === "object" ? JSON.stringify(val, null, 2) : val || ""}
          onChange={(e) => setVal(e.target.value)}
          placeholder='{"chave": "valor"}'
          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 font-mono text-xs text-emerald-300 focus:border-emerald-400 focus:outline-none"
        />
      )}
    </div>
  );
}
