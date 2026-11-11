"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

interface ImportResult {
  tables: { table: string; rows: number }[];
  totalRows: number;
  schemaCreated: boolean;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/30 font-mono focus:border-primary focus:outline-none";

export function AdminDatabaseDump() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState<"pgdump" | "sql" | "json">("pgdump");
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      const res = await fetch("/api/admin/database/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: sourceUrl.trim() || undefined, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao exportar o banco de dados.");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || `tomadix-dump.${format}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);

      const warnings = decodeURIComponent(res.headers.get("X-Dump-Warnings") || "");
      setExportMessage({
        type: "success",
        text: `Dump gerado (${res.headers.get("X-Dump-Total-Rows") || "?"} registros) e baixado como ${name}.${warnings ? ` Avisos: ${warnings}` : ""}`,
      });
    } catch (err) {
      setExportMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao exportar o banco de dados." });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (targetUrl.trim()) form.append("targetUrl", targetUrl.trim());
      const res = await fetch("/api/admin/database/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar o dump.");
      setImportResult(data);
      setConfirmed(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro ao importar o dump.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
        <p className="font-bold">Antes de migrar</p>
        <ul className="list-disc pl-4 space-y-1 text-amber-200/80">
          <li>O dump contém dados sensíveis (usuários, hashes de senha, chaves e credenciais criptografadas). Guarde o arquivo com cuidado e apague depois.</li>
          <li>As credenciais criptografadas só funcionam no destino com a mesma chave de criptografia do app atual.</li>
          <li>Sessões de login não migram: todos entram de novo. Imagens e vídeos salvos em arquivo (pasta de uploads) não fazem parte do dump.</li>
          <li>O SQL completo (pg_dump) cria as tabelas e insere os dados: rode em um banco novo e vazio. O pg_dump precisa estar instalado no servidor e ter versão igual ou maior que a do banco de origem.</li>
          <li>O banco de destino da importação por JSON precisa estar vazio. Se faltarem tabelas, o sistema tenta criá-las; se não conseguir, rode <code>npx prisma migrate deploy</code> nele.</li>
        </ul>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">1. Exportar dump</h3>
          <p className="mt-1 text-xs text-white/50">
            Gera o arquivo com todas as tabelas. Deixe a conexão em branco para exportar o banco que o app usa agora.
          </p>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-white/70 mb-1.5">Formato</legend>
          {[
            { id: "pgdump", label: "SQL completo (pg_dump)", hint: 'Estrutura + dados. Importe direto no banco novo: psql "<conexão>" -v ON_ERROR_STOP=1 -f arquivo.sql' },
            { id: "sql", label: "SQL só de dados (gerado pelo Tomadix)", hint: "Não precisa do pg_dump no servidor; o destino já deve ter as tabelas (npx prisma migrate deploy)." },
            { id: "json", label: "JSON (.json)", hint: "Arquivo que a importação abaixo, nesta tela, lê." },
          ].map((opt) => (
            <label key={opt.id} className="flex items-start gap-2 text-xs text-white/70 cursor-pointer">
              <input
                type="radio"
                name="dump-format"
                checked={format === opt.id}
                onChange={() => setFormat(opt.id as "pgdump" | "sql" | "json")}
                className="mt-0.5"
              />
              <span>
                <span className="font-semibold text-white">{opt.label}</span>
                <span className="block text-white/50">{opt.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Banco de origem (opcional)</label>
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="postgresql://usuario:senha@host:5432/banco  (vazio = banco ativo)"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        {exportMessage && (
          <div
            role={exportMessage.type === "error" ? "alert" : "status"}
            className={`rounded-xl border p-3 text-xs ${
              exportMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {exportMessage.text}
          </div>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-black hover:bg-primary-fixed transition disabled:opacity-50 flex items-center gap-2"
        >
          {exporting ? (
            <>
              <Spinner block className="h-3 w-3 border-2 border-black" />
              <span>Gerando dump...</span>
            </>
          ) : (
            <span>Gerar e baixar dump</span>
          )}
        </button>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">2. Importar dump</h3>
          <p className="mt-1 text-xs text-white/50">
            Envie o arquivo gerado acima. A importação é uma transação única: ou entra tudo ou nada. Só roda em banco vazio.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Arquivo do dump (.json)</label>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Banco de destino (opcional)</label>
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="postgresql://usuario:senha@host:5432/banco  (vazio = banco ativo)"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <label className="flex items-start gap-2 text-xs text-white/70 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          <span>Entendo que o destino precisa estar vazio e que o dump contém dados sensíveis.</span>
        </label>
        {importError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {importError}
          </div>
        )}
        {importResult && (
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-2">
            <p className="font-bold">
              Importação concluída: {importResult.totalRows} registros em {importResult.tables.length} tabelas
              {importResult.schemaCreated ? " (tabelas criadas no destino)" : ""}.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-[320px] w-full text-left">
                <tbody>
                  {importResult.tables.map((t) => (
                    <tr key={t.table} className="border-t border-emerald-500/10">
                      <td className="py-1 pr-4 font-mono">{t.table}</td>
                      <td className="py-1 text-right font-mono">{t.rows}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || !file || !confirmed}
          className="min-h-11 rounded-xl border border-amber-500/40 bg-amber-500/20 px-5 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition disabled:opacity-50 flex items-center gap-2"
        >
          {importing ? (
            <>
              <Spinner block className="h-3 w-3 border-2 border-amber-300" />
              <span>Importando...</span>
            </>
          ) : (
            <span>Importar dump</span>
          )}
        </button>
      </section>
    </div>
  );
}
