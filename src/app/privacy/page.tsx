"use client";

import { useState } from "react";
import Link from "next/link";

export default function PrivacyPage() {
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState("ACCESS");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmitDsr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setResultMessage(null);

    try {
      const res = await fetch("/api/users/dsr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, requestType, details }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResultMessage({
        type: "success",
        text: `${data.message} Protocolo: ${data.protocol}`,
      });
      setDetails("");
    } catch (err: any) {
      setResultMessage({
        type: "error",
        text: err.message || "Erro ao protocolar solicitação.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#07090e] text-white flex flex-col">
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-8 md:p-12 space-y-8">
          <div className="border-b border-white/10 pb-6">
            <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
              Privacidade e Proteção de Dados (LGPD)
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
              Política de Privacidade da Tomadix
            </h1>
            <p className="text-xs text-white/50 mt-2 font-mono">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD) | Versão 2.1
            </p>
          </div>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">1. Princípios de Coleta e Minimização</h2>
            <p>
              A Tomadix atua sob o princípio da <strong>necessidade e minimização de dados</strong>. Coletamos apenas as informações estritamente indispensáveis para autenticação, controle de segurança e prestação dos serviços contratados:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-white/70">
              <li><strong>Dados Cadastrais:</strong> Nome de exibição, endereço de e-mail e hash criptográfico de senha (via bcrypt com salt).</li>
              <li><strong>Dados de Telemetria Técnica:</strong> Endereço IP e User-Agent gravados temporariamente para proteção contra invasões, geração de sessões ativas e auditoria legal (Art. 15 do Marco Civil da Internet).</li>
              <li><strong>Dados Transacionais:</strong> Histórico de pagamentos e faturas emitidas para conformidade contábil e fiscal.</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">2. Provedores e Compartilhamento com Terceiros</h2>
            <p>
              Não comercializamos nem compartilhamos dados pessoais com terceiros para fins publicitários. Compartilhamos dados exclusivamente com operadores essenciais de infraestrutura:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-bold text-white block">Google Gemini API</span>
                <span className="text-xs text-white/50 mt-1 block">
                  Processamento de prompts narrativos e geração estruturada de cenas.
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-bold text-white block">Supabase / PostgreSQL</span>
                <span className="text-xs text-white/50 mt-1 block">
                  Banco de dados em nuvem criptografado em repouso (AES-256) e em trânsito (TLS 1.3).
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-bold text-white block">Gateways de Pagamento</span>
                <span className="text-xs text-white/50 mt-1 block">
                  Processamento seguro de faturas em conformidade PCI-DSS (Stripe / Mercado Pago).
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">3. Direitos dos Titulares de Dados (Art. 18 da LGPD)</h2>
            <p>
              Você, como titular de dados pessoais, tem o direito de solicitar a qualquer momento:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-white/70">
              <li>Confirmação da existência de tratamento e acesso aos dados.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>Portabilidade e exportação completa dos seus dados em formato JSON interoperável (disponível em seu perfil).</li>
              <li>Eliminação de dados pessoais tratados com consentimento.</li>
              <li>Revogação formal de consentimentos previamente concedidos.</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">4. Políticas de Retenção e Obrigações Legais de Guarda</h2>
            <p>
              A solicitação de exclusão definitiva de conta apaga imediatamente perfis, workspaces pessoais, sessões e projetos narrativos. No entanto, por determinação expressa do <strong>Artigo 16, inciso I da LGPD</strong>, dados necessários para o cumprimento de obrigação legal ou regulatória serão preservados:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-white/70">
              <li><strong>Registros Fiscais e Faturas:</strong> Preservados por 5 (cinco) anos para fins de auditoria tributária (Art. 173 do Código Tributário Nacional).</li>
              <li><strong>Logs de Conexão:</strong> Mantidos sob sigilo por 6 (seis) meses conforme exigência do Art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet).</li>
            </ul>
          </section>

          {/* Interactive DSR Form */}
          <section className="rounded-2xl border border-primary/30 bg-primary/15 p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-primary">
                Canal de Atendimento ao Titular (DSAR - LGPD)
              </h2>
              <p className="text-xs text-white/70 mt-1">
                Utilize o formulário oficial abaixo para exercer seus direitos como titular de dados pessoais. O prazo de retorno legal do nosso Encarregado de Proteção de Dados (DPO) é de até 15 dias.
              </p>
            </div>

            {resultMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs ${
                  resultMessage.type === "success"
                    ? "bg-primary/20 border border-primary/40 text-primary"
                    : "bg-rose-500/20 border border-rose-500/40 text-rose-200"
                }`}
              >
                {resultMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitDsr} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 block mb-1">Seu E-mail Cadastrado *</label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@estudio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 block mb-1">Tipo de Solicitação *</label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:border-primary focus:outline-none"
                  >
                    <option value="ACCESS">Acesso / Confirmação de Tratamento</option>
                    <option value="RECTIFICATION">Correção de Dados Cadastrais</option>
                    <option value="PORTABILITY">Portabilidade / Exportação</option>
                    <option value="REVOCATION">Revogação de Consentimentos</option>
                    <option value="DELETION">Exclusão Definitiva de Conta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/60 block mb-1">Detalhes Adicionais da Solicitação</label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhes específicos da sua solicitação..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting || !email}
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary hover:opacity-90 disabled:opacity-40 transition shadow-md shadow-primary/20"
                >
                  {submitting ? "Protocolando..." : "Protocolar Solicitação LGPD"}
                </button>
              </div>
            </form>
          </section>

          <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
            <span>Encarregado de Dados (DPO): dpo@cineprompt.ai</span>
            <Link href="/terms" className="text-amber-400 hover:underline">
              Ver Termos de Uso ➔
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
