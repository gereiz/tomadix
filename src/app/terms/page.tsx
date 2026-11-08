import Link from "next/link";

export const metadata = {
  title: "Termos de Uso | Tomadix",
  description: "Condições gerais de contratação e uso da plataforma Tomadix.",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[#07090e] text-white flex flex-col">
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-white/10 bg-[#0d111c] p-8 md:p-12 space-y-8">
          <div className="border-b border-white/10 pb-6">
            <span className="text-xs font-mono font-semibold text-amber-400 tracking-wider uppercase">
              Documento Legal
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
              Termos de Uso da Tomadix
            </h1>
            <p className="text-xs text-white/50 mt-2 font-mono">
              Última atualização: 22 de Outubro de 2026 | Versão 2.1
            </p>
          </div>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">1. Objeto e Aceitação</h2>
            <p>
              O presente documento estabelece as condições de uso da <strong>Tomadix</strong>, um software como serviço (SaaS) projetado para diretores, roteiristas e produtoras cinematográficas gerenciarem bíblias visuais, personagens, ambientes e engenharia estruturada de prompts cinematográficos integrados à Google Gemini API.
            </p>
            <p>
              Ao criar uma conta ou utilizar os serviços, você declara ter plena capacidade jurídica e concordar integralmente com estes Termos.
            </p>
          </section>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">2. Propriedade Intelectual e Criação</h2>
            <p>
              <strong>2.1 Conteúdo do Usuário:</strong> Todo o material autoral inserido (roteiros, descrições de personagens, universos, bíblias narrativas) e os prompts estruturados finais gerados pertencem <em>exclusivamente</em> a você e ao respectivo workspace contratante. A Tomadix não reivindica direitos autorais sobre suas criações.
            </p>
            <p>
              <strong>2.2 Propriedade da Plataforma:</strong> Os códigos-fonte, modelos de prompt internos, marcas, arquitetura de software e interfaces são de propriedade exclusiva da Tomadix.
            </p>
          </section>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">3. Integração com Provedores de IA (Google Gemini)</h2>
            <p>
              As inferências generativas e decupagem automática de cenas utilizam modelos de linguagem da Google Gemini API. O usuário se compromete a:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-white/70">
              <li>Não submeter instruções que violem leis vigentes, incitem ódio, violência ou conteúdo explícito ilegal.</li>
              <li>Reconhecer que modelos probabilísticos de IA podem gerar imprecisões ou alucinações técnicas que exigem curadoria humana profissional antes da produção cinematográfica.</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">4. Planos, Cobrança e Cancelamento</h2>
            <p>
              <strong>4.1 Assinaturas:</strong> O acesso é disponibilizado mediante planos gratuitos ou por assinatura periódica (mensal ou anual). Cada plano especifica os limites de projetos, membros de equipe e créditos mensais de geração.
            </p>
            <p>
              <strong>4.2 Política de Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento através do painel do workspace. O cancelamento entrará em vigor ao término do período contratado vigente (mês ou ano), mantendo o acesso até essa data.
            </p>
            <p>
              <strong>4.3 Preservação de Condições (Grandparenting):</strong> Reajustes de tabela de preços do catálogo comercial não alterarão silenciosamente os valores de planos vigentes, salvo mediante comunicação prévia formal.
            </p>
          </section>

          <section className="space-y-3 text-sm text-white/80 leading-relaxed">
            <h2 className="text-lg font-bold text-white">5. Disponibilidade e SLA</h2>
            <p>
              Empenhamos os melhores esforços técnicos para garantir 99.5% de disponibilidade operacional. Paradas programadas de manutenção técnica serão comunicadas previamente quando possível.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
            <span>Dúvidas contratuais: juridico@cineprompt.ai</span>
            <Link href="/privacy" className="text-amber-400 hover:underline">
              Ver Política de Privacidade (LGPD) ➔
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
