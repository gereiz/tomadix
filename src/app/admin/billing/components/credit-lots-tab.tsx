"use client";

import { useEffect, useState } from "react";

interface CreditLotItem {
  id: string;
  workspaceId: string;
  origin: string;
  amountGranted: number;
  amountAvailable: number;
  amountConsumed: number;
  status: string;
  isAccumulative: boolean;
  validFrom: string;
  expiresAt: string | null;
  reason: string;
  workspace?: { id: string; name: string; slug: string };
  user?: { id: string; displayName: string; email: string };
}

interface ReconciliationSummary {
  totalWorkspaces: number;
  consistentWorkspaces: number;
  inconsistentWorkspaces: number;
}

export function CreditLotsTab() {
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState<CreditLotItem[]>([]);
  const [totalLots, setTotalLots] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [filterWorkspaceId, setFilterWorkspaceId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");

  // Conciliação
  const [reconSummary, setReconSummary] = useState<ReconciliationSummary | null>(null);
  const [reconReports, setReconReports] = useState<any[]>([]);
  const [checkingReconciliation, setCheckingReconciliation] = useState(false);

  // Modal de Concessão Manual
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantForm, setGrantForm] = useState({
    workspaceId: "",
    amount: 100,
    origin: "ADMIN_OVERRIDE",
    reason: "",
    isAccumulative: true,
    expiresAt: "",
  });

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadLots = async (currentPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "15");
      if (filterWorkspaceId) params.set("workspaceId", filterWorkspaceId);
      if (filterStatus) params.set("status", filterStatus);
      if (filterOrigin) params.set("origin", filterOrigin);

      const res = await fetch(`/api/admin/credit-lots?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLots(data.items || []);
      setTotalLots(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao consultar lotes: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setCheckingReconciliation(true);
    try {
      const res = await fetch("/api/admin/credits/reconciliation");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReconSummary(data.summary);
      setReconReports(data.reports || []);
      setNotification({
        type: "success",
        text: `Diagnóstico executado: ${data.summary.consistentWorkspaces} consistentes de ${data.summary.totalWorkspaces} auditados.`,
      });
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro na conciliação: " + err.message });
    } finally {
      setCheckingReconciliation(false);
    }
  };

  const handleMigrateLegacy = async () => {
    if (!confirm("Deseja criar lotes 'LEGACY' para todos os workspaces com saldo pré-existente sem lotes vinculados?")) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/credits/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "migrate-legacy" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", text: data.message });
      loadLots(1);
      runReconciliation();
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao migrar saldos legados: " + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunDailyMaintenance = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/cron/credits-maintenance", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({
        type: "success",
        text: `Manutenção diária concluída: ${data.result.dailyLotsGranted} lotes diários concedidos, ${data.result.expiredLotsCount} lotes expirados.`,
      });
      loadLots(1);
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao executar rotina diária: " + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantLot = async (e: React.FormEvent) => {
    e.preventDefault();
    setGranting(true);
    try {
      const res = await fetch("/api/admin/credit-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grantForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", text: data.message });
      setShowGrantModal(false);
      setGrantForm({
        workspaceId: "",
        amount: 100,
        origin: "ADMIN_OVERRIDE",
        reason: "",
        isAccumulative: true,
        expiresAt: "",
      });
      loadLots(1);
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao conceder lote: " + err.message });
    } finally {
      setGranting(false);
    }
  };

  useEffect(() => {
    loadLots(1);
    runReconciliation();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">ATIVO</span>;
      case "EXHAUSTED":
        return <span className="bg-white/10 text-white/60 border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold">ESGOTADO</span>;
      case "EXPIRED":
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-bold">EXPIRADO</span>;
      case "REVOKED":
        return <span className="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[10px] font-bold">REVOGADO</span>;
      default:
        return <span className="bg-white/5 text-white/50 px-2 py-0.5 rounded text-[10px]">{status}</span>;
    }
  };

  const getOriginBadge = (origin: string, isAccumulative: boolean) => {
    let color = "text-amber-300 bg-amber-500/10 border-amber-500/30";
    if (origin === "ADHESION") color = "text-sky-300 bg-sky-500/10 border-sky-500/30";
    if (origin === "DAILY_RENEWAL") color = "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
    if (origin === "PURCHASED") color = "text-purple-300 bg-purple-500/10 border-purple-500/30";
    if (origin === "REFUND") color = "text-blue-300 bg-blue-500/10 border-blue-500/30";

    return (
      <div className="flex flex-col">
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${color}`}>
          {origin}
        </span>
        {origin === "DAILY_RENEWAL" && (
          <span className="text-[9px] text-white/40 mt-0.5 font-mono">
            {isAccumulative ? "Acumulativo" : "Não-acumulativo"}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Notificação */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex justify-between items-center transition ${
            notification.type === "success"
              ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-4 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Card de Conciliação e Ações Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sumário de Consistência */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#0d111c] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🛡️ Conciliação & Integridade Financeira</span>
                {reconSummary && (
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      reconSummary.inconsistentWorkspaces === 0
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {reconSummary.inconsistentWorkspaces === 0 ? "100% Consistente" : `${reconSummary.inconsistentWorkspaces} Inconsistências`}
                  </span>
                )}
              </h4>
              <p className="text-xs text-white/50 mt-0.5">
                Valida em tempo real se o saldo do workspace bate exatamente com a soma dos lotes ativos e o livro-razão imutável (CreditLedger).
              </p>
            </div>
            <button
              onClick={runReconciliation}
              disabled={checkingReconciliation}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition"
            >
              {checkingReconciliation ? "Auditando..." : "Reauditar"}
            </button>
          </div>

          {reconSummary && (
            <div className="grid grid-cols-3 gap-3 pt-4 text-center">
              <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                <span className="text-[10px] text-white/40 block">Workspaces Auditados</span>
                <span className="text-lg font-bold font-mono text-white">{reconSummary.totalWorkspaces}</span>
              </div>
              <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                <span className="text-[10px] text-white/40 block">Totalmente Alinhados</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{reconSummary.consistentWorkspaces}</span>
              </div>
              <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                <span className="text-[10px] text-white/40 block">Com Divergência</span>
                <span className="text-lg font-bold font-mono text-rose-400">{reconSummary.inconsistentWorkspaces}</span>
              </div>
            </div>
          )}
        </div>

        {/* Painel de Comandos Administrativos */}
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-5 flex flex-col justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-white/60">Ações Rápidas</h4>
            <p className="text-[11px] text-white/40 mt-1">Gatilhos manuais para sincronização e concessões de lotes.</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowGrantModal(true)}
              className="w-full rounded-xl bg-amber-400 py-2 px-3 text-xs font-bold text-black hover:bg-amber-300 transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
            >
              <span>➕ Conceder Lote Manual</span>
            </button>

            <button
              onClick={handleMigrateLegacy}
              disabled={actionLoading}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-xs font-semibold text-white/80 hover:bg-white/10 transition flex items-center justify-center gap-1.5"
            >
              <span>📦 Migrar Saldos Legados para Lotes</span>
            </button>

            <button
              onClick={handleRunDailyMaintenance}
              disabled={actionLoading}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 px-3 text-xs font-semibold text-white/80 hover:bg-white/10 transition flex items-center justify-center gap-1.5"
            >
              <span>⏱️ Executar Rotina Diária Agora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros e Tabela de Lotes */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Filtrar por Workspace ID..."
            value={filterWorkspaceId}
            onChange={(e) => setFilterWorkspaceId(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="" className="bg-[#0d111c]">Todos os Status</option>
            <option value="ACTIVE" className="bg-[#0d111c]">Ativos</option>
            <option value="EXHAUSTED" className="bg-[#0d111c]">Esgotados</option>
            <option value="EXPIRED" className="bg-[#0d111c]">Expirados</option>
            <option value="REVOKED" className="bg-[#0d111c]">Revogados</option>
          </select>

          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="" className="bg-[#0d111c]">Todas as Origens</option>
            <option value="ADHESION" className="bg-[#0d111c]">Adesão (Boas-vindas)</option>
            <option value="MONTHLY_RENEWAL" className="bg-[#0d111c]">Renovação Mensal</option>
            <option value="DAILY_RENEWAL" className="bg-[#0d111c]">Cota Diária</option>
            <option value="PURCHASED" className="bg-[#0d111c]">Avulso Comprado</option>
            <option value="ADMIN_OVERRIDE" className="bg-[#0d111c]">Administrativo</option>
            <option value="REFUND" className="bg-[#0d111c]">Estorno</option>
            <option value="LEGACY" className="bg-[#0d111c]">Legado</option>
          </select>

          <button
            onClick={() => loadLots(1)}
            className="rounded-xl bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition ml-auto"
          >
            Filtrar
          </button>
        </div>

        {/* Tabela de Lotes */}
        {loading ? (
          <div className="p-8 text-center text-xs text-white/50">Carregando lotes de créditos...</div>
        ) : lots.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/40">Nenhum lote encontrado com os filtros selecionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-white/50">
                <tr>
                  <th className="p-3.5">Lote / Workspace</th>
                  <th className="p-3.5">Origem</th>
                  <th className="p-3.5 text-right">Concedido</th>
                  <th className="p-3.5 text-right">Disponível</th>
                  <th className="p-3.5 text-right">Consumido</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5">Validade / Expiração</th>
                  <th className="p-3.5">Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-white/[0.01]">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{lot.workspace?.name || lot.workspaceId}</div>
                      <div className="font-mono text-[10px] text-white/40">{lot.id}</div>
                    </td>
                    <td className="p-3.5">
                      {getOriginBadge(lot.origin, lot.isAccumulative)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-white">
                      +{lot.amountGranted.toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                      {lot.amountAvailable.toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3.5 text-right font-mono text-white/50">
                      {lot.amountConsumed.toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3.5 text-center">
                      {getStatusBadge(lot.status)}
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono text-[11px] text-white/70">
                        Início: {new Date(lot.validFrom).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="font-mono text-[10px] text-white/40">
                        {lot.expiresAt ? `Expira: ${new Date(lot.expiresAt).toLocaleDateString("pt-BR")}` : "Sem expiração"}
                      </div>
                    </td>
                    <td className="p-3.5 text-white/50 text-[11px] max-w-xs truncate" title={lot.reason}>
                      {lot.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
            <span>
              Página {page} de {totalPages} ({totalLots} lotes no total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => loadLots(page - 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white disabled:opacity-20"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => loadLots(page + 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white disabled:opacity-20"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Concessão Manual */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d111c] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Conceder Lote Manual de Créditos</h3>
            <p className="text-xs text-white/50 mb-4">
              Cria um novo lote auditável diretamente vinculado ao workspace com lançamento no livro-razão.
            </p>

            <form onSubmit={handleGrantLot} className="space-y-4 text-xs">
              <div>
                <label className="text-white/60 block mb-1">ID do Workspace *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: clv..."
                  value={grantForm.workspaceId}
                  onChange={(e) => setGrantForm({ ...grantForm, workspaceId: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Quantidade de Créditos *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={grantForm.amount}
                    onChange={(e) => setGrantForm({ ...grantForm, amount: parseInt(e.target.value || "1") })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-white/60 block mb-1">Origem do Lote</label>
                  <select
                    value={grantForm.origin}
                    onChange={(e) => setGrantForm({ ...grantForm, origin: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                  >
                    <option value="ADMIN_OVERRIDE" className="bg-[#0d111c]">ADMIN_OVERRIDE (Cortesia)</option>
                    <option value="PROMOTIONAL" className="bg-[#0d111c]">PROMOTIONAL (Promoção)</option>
                    <option value="PURCHASED" className="bg-[#0d111c]">PURCHASED (Avulso)</option>
                    <option value="REFUND" className="bg-[#0d111c]">REFUND (Estorno)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Justificativa Administrativa (Obrigatória) *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Motivo claro do crédito manual para fins de auditoria..."
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-white/60 block mb-1">Data de Expiração (Opcional)</label>
                <input
                  type="date"
                  value={grantForm.expiresAt}
                  onChange={(e) => setGrantForm({ ...grantForm, expiresAt: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white"
                />
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={grantForm.isAccumulative}
                  onChange={(e) => setGrantForm({ ...grantForm, isAccumulative: e.target.checked })}
                />
                <span>Lote Acumulativo (não zera ao fim do ciclo diário)</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="rounded-xl bg-white/10 px-4 py-2 font-semibold text-white/70 hover:bg-white/20"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={granting}
                  className="rounded-xl bg-amber-400 px-5 py-2 font-bold text-black hover:bg-amber-300 transition"
                >
                  {granting ? "Concedendo..." : "Conceder Créditos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

