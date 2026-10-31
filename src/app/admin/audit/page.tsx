"use client";

import { useEffect, useState } from "react";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        action: actionFilter,
        targetType: targetTypeFilter,
      });

      const res = await fetch(`/api/admin/audit?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, targetTypeFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes("SUSPEND")) {
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    }
    if (action.includes("REACTIVATE")) {
      return "bg-primary/15 text-primary border-primary/30";
    }
    if (action.includes("CREDIT")) {
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
    if (action.includes("PLAN")) {
      return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
    }
    return "bg-white/10 text-white/80 border-white/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Trilha de Auditoria da Plataforma</h1>
        <p className="text-xs text-white/50">
          Registro imutável e higienizado de todas as operações administrativas executadas no SaaS.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-3">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="">Todas as Ações</option>
          <option value="USER_SUSPEND">Suspensão de Usuário</option>
          <option value="USER_REACTIVATE">Reativação de Usuário</option>
          <option value="CREDIT_ADJUST">Ajuste de Créditos</option>
          <option value="PLAN_CREATE">Criação de Plano</option>
          <option value="PLAN_UPDATE">Atualização de Plano</option>
          <option value="PLAN_TOGGLE_ACTIVE">Ativação/Desativação de Plano</option>
          <option value="USER_ROLE_CHANGE">Alteração de Papel Plataforma</option>
        </select>

        <select
          value={targetTypeFilter}
          onChange={(e) => {
            setTargetTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
        >
          <option value="">Todos os Tipos de Recurso</option>
          <option value="User">Usuários</option>
          <option value="Workspace">Workspaces</option>
          <option value="Plan">Planos</option>
          <option value="Subscription">Assinaturas</option>
        </select>

        <span className="text-xs text-white/40 ml-auto font-mono">
          Total de {pagination.total} evento(s) auditado(s)
        </span>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-white/50 animate-pulse">
            Carregando eventos de auditoria...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-white/50">
            Nenhum evento de auditoria encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/50">
                  <th className="p-3.5 font-medium">Data / Hora</th>
                  <th className="p-3.5 font-medium">Operador Admin</th>
                  <th className="p-3.5 font-medium">Ação Auditada</th>
                  <th className="p-3.5 font-medium">Recurso Afetado</th>
                  <th className="p-3.5 font-medium">Resultado</th>
                  <th className="p-3.5 font-medium">Origem (IP)</th>
                  <th className="p-3.5 font-medium text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-3.5 font-mono text-[11px] text-white/60 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-white">
                        {log.adminUser?.displayName || log.adminUser?.email || "Sistema"}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono">
                        {log.adminUser?.platformRole || "ADMIN"}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="text-white/80 font-medium">{log.targetType}</div>
                      {log.targetId && (
                        <div className="text-[10px] text-white/40 font-mono truncate max-w-[120px]">
                          {log.targetId}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          log.result === "SUCCESS"
                            ? "bg-primary/10 text-primary"
                            : "bg-rose-500/10 text-rose-300"
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-white/40">
                      {log.ipAddress || "—"}
                    </td>

                    <td className="p-3.5 text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                        >
                          Inspecionar
                        </button>
                      ) : (
                        <span className="text-white/30 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 text-xs text-white/50">
          <span>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-white/10 px-3 py-1 text-white hover:bg-white/5 disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 px-3 py-1 text-white hover:bg-white/5 disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Inspecionar Detalhes Sanitizados */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-2xl border border-white/15 bg-[#0f1422] p-6 space-y-4 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Inspeção de Auditoria</h3>
                <span className="text-[11px] font-mono text-amber-400">{selectedLog.action}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-white/60 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-white/60">
                <span>Operador:</span>
                <strong className="text-white">{selectedLog.adminUser?.email}</strong>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Timestamp:</span>
                <strong className="text-white">{new Date(selectedLog.createdAt).toISOString()}</strong>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Recurso Afetado:</span>
                <strong className="text-white">
                  {selectedLog.targetType} ({selectedLog.targetId || "Global"})
                </strong>
              </div>
              <div className="flex justify-between text-white/60">
                <span>IP / User-Agent:</span>
                <span className="text-white/80 font-mono text-[10px]">
                  {selectedLog.ipAddress || "N/A"} - {selectedLog.userAgent || "N/A"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-white/60 block mb-1.5 font-semibold">
                Carga de Dados Higienizada (JSON):
              </span>
              <pre className="rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[11px] text-primary overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
