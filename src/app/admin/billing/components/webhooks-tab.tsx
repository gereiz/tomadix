"use client";

import { useState, useEffect } from "react";

interface WebhookEvent {
  id: string;
  eventId: string;
  gateway: string;
  environment: string;
  eventType: string;
  status: "RECEIVED" | "PROCESSED" | "FAILED";
  attempts: number;
  lastError: string | null;
  rawPayload: any;
  processedAt: string | null;
  createdAt: string;
  gatewayConfig?: {
    name: string;
    identifier: string;
    provider: string;
  };
}

export function WebhooksTab({ onNotify }: { onNotify: (type: "success" | "error", message: string) => void }) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("ALL");
  const [gatewayFilter, setGatewayFilter] = useState<string>("ALL");

  // Modal de Payload & Reprocessamento
  const [viewPayloadModal, setViewPayloadModal] = useState<WebhookEvent | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "15");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (environmentFilter !== "ALL") params.set("environment", environmentFilter);
      if (gatewayFilter !== "ALL") params.set("gateway", gatewayFilter.toLowerCase());

      const res = await fetch(`/api/admin/billing/webhooks?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      } else {
        onNotify("error", data.error || "Erro ao consultar webhooks.");
      }
    } catch (err: any) {
      onNotify("error", "Erro de rede: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, statusFilter, environmentFilter, gatewayFilter]);

  const handleReprocess = async (event: WebhookEvent) => {
    setReprocessingId(event.id);
    try {
      const res = await fetch(`/api/admin/billing/webhooks/${event.id}/reprocess`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        onNotify("success", `Evento ${event.eventId} reprocessado com sucesso!`);
        loadEvents();
      } else {
        onNotify("error", data.error || "Falha ao reprocessar evento.");
      }
    } catch (err: any) {
      onNotify("error", "Erro ao executar reprocessamento: " + err.message);
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📡</span> Monitoramento & Auditoria de Webhooks
          </h2>
          <p className="text-xs text-white/50">
            Registro de eventos recebidos dos gateways com validação criptográfica, idempotência estrita, tentativas de processamento e reexecução segura.
          </p>
        </div>

        <button
          onClick={loadEvents}
          disabled={loading}
          className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/20 transition flex items-center gap-1.5"
        >
          <span>🔄</span> {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-white/5 p-3 rounded-2xl border border-white/10">
        <div>
          <label className="text-white/40 block text-[10px] uppercase font-bold mb-1">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-[#0d111c] px-3 py-1.5 text-white"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PROCESSED">Processados (Sucesso)</option>
            <option value="FAILED">Falhas (Erro)</option>
            <option value="RECEIVED">Recebidos (Pendente)</option>
          </select>
        </div>

        <div>
          <label className="text-white/40 block text-[10px] uppercase font-bold mb-1">Ambiente:</label>
          <select
            value={environmentFilter}
            onChange={(e) => {
              setEnvironmentFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-[#0d111c] px-3 py-1.5 text-white"
          >
            <option value="ALL">Todos os Ambientes</option>
            <option value="SANDBOX">🧪 Sandbox</option>
            <option value="PRODUCTION">🚀 Produção</option>
          </select>
        </div>

        <div>
          <label className="text-white/40 block text-[10px] uppercase font-bold mb-1">Gateway:</label>
          <select
            value={gatewayFilter}
            onChange={(e) => {
              setGatewayFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-[#0d111c] px-3 py-1.5 text-white"
          >
            <option value="ALL">Todos os Provedores</option>
            <option value="stripe">Stripe</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="sandbox">Sandbox Interno</option>
          </select>
        </div>
      </div>

      {/* Tabela de Eventos */}
      <div className="rounded-2xl border border-white/10 bg-[#0d111c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/50 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Evento ID</th>
                <th className="p-3">Provedor & Ambiente</th>
                <th className="p-3">Tipo do Evento</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tentativas</th>
                <th className="p-3">Data Recebimento</th>
                <th className="p-3">Erro Resumido</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-white/40 font-sans">
                    Nenhum evento de webhook encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-3 font-bold text-white max-w-[140px] truncate" title={evt.eventId}>
                      {evt.eventId}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-sans">
                        <span className="font-semibold text-white/80 uppercase text-[10px]">
                          {evt.gateway}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            evt.environment === "PRODUCTION"
                              ? "bg-primary/20 text-primary"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {evt.environment}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-amber-300 font-semibold">{evt.eventType}</td>
                    <td className="p-3 font-sans">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          evt.status === "PROCESSED"
                            ? "bg-primary/20 text-primary"
                            : evt.status === "FAILED"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {evt.status === "PROCESSED"
                          ? "Processado"
                          : evt.status === "FAILED"
                          ? "Falha"
                          : "Recebido"}
                      </span>
                    </td>
                    <td className="p-3 text-white/70">{evt.attempts}</td>
                    <td className="p-3 text-white/50">
                      {new Date(evt.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 max-w-[200px] truncate text-rose-300 text-[10px]" title={evt.lastError || ""}>
                      {evt.lastError || "—"}
                    </td>
                    <td className="p-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewPayloadModal(evt)}
                          className="rounded-lg bg-white/5 px-2.5 py-1 text-white/70 hover:text-white hover:bg-white/10 transition text-[11px]"
                        >
                          Payload
                        </button>
                        <button
                          onClick={() => handleReprocess(evt)}
                          disabled={reprocessingId === evt.id}
                          className="rounded-lg bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 text-amber-300 hover:bg-amber-400/20 transition text-[11px] font-semibold disabled:opacity-50"
                        >
                          {reprocessingId === evt.id ? "Reprocessando..." : "Reprocessar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-white/5 px-3 py-1 hover:bg-white/10 disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-white/5 px-3 py-1 hover:bg-white/10 disabled:opacity-30"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: VISUALIZAR PAYLOAD ORIGINAL */}
      {viewPayloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-2xl w-full rounded-2xl border border-white/10 bg-[#0d111c] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📄</span> Payload Original do Webhook
                </h3>
                <p className="text-[11px] font-mono text-white/40">
                  Evento: {viewPayloadModal.eventId} ({viewPayloadModal.eventType})
                </p>
              </div>
              <span className="text-[10px] font-mono bg-white/5 text-white/60 px-2 py-0.5 rounded">
                Imutável
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono text-primary whitespace-pre-wrap break-all">
                {JSON.stringify(viewPayloadModal.rawPayload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => handleReprocess(viewPayloadModal)}
                disabled={reprocessingId === viewPayloadModal.id}
                className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50"
              >
                {reprocessingId === viewPayloadModal.id ? "Reprocessando..." : "Reprocessar Este Evento"}
              </button>
              <button
                type="button"
                onClick={() => setViewPayloadModal(null)}
                className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20"
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
