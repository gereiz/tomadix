import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { escapeHtml, getWelcomeEmail, getWorkspaceInviteEmail } from "@/modules/email/email-templates";
import { EMAIL_TEMPLATE_CATALOG, renderTemplateSample } from "@/modules/email/email-template-catalog";
import { TransactionalEmailService } from "@/modules/email/transactional-email.service";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");

describe("E-mails transacionais padrão", () => {
  it("todo modelo do catálogo renderiza com assunto, HTML completo e sem placeholders soltos", () => {
    expect(EMAIL_TEMPLATE_CATALOG.map((t) => t.key)).toEqual(
      expect.arrayContaining([
        "welcome",
        "email_confirmation",
        "password_reset",
        "password_changed",
        "workspace_invite",
        "subscription_confirmed",
        "credits_added",
        "low_credits",
      ])
    );
    for (const t of EMAIL_TEMPLATE_CATALOG) {
      const rendered = renderTemplateSample(t.key);
      expect(rendered, t.key).not.toBeNull();
      expect(rendered!.subject.length, t.key).toBeGreaterThan(5);
      expect(rendered!.html, t.key).toContain("TOMADIX");
      expect(rendered!.html, t.key).not.toContain("undefined");
      expect(rendered!.html, t.key).not.toContain("${");
    }
    expect(renderTemplateSample("inexistente")).toBeNull();
  });

  it("escapa HTML vindo de usuários (nome, workspace) para evitar injeção", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).not.toContain("<script>");
    const welcome = getWelcomeEmail({ name: "<img src=x onerror=alert(1)>" });
    expect(welcome.html).not.toContain("<img src=x");
    expect(welcome.html).toContain("&lt;img");

    const invite = getWorkspaceInviteEmail({
      inviterName: "<b>Eu</b>",
      workspaceName: "<i>Estúdio</i>",
      roleLabel: "Membro",
      acceptUrl: "https://x.com/invite/abc",
    });
    expect(invite.html).not.toContain("<i>Estúdio</i>");
  });

  it("os e-mails de cadastro e senha não mencionam geração de imagens/vídeos (chaves do admin)", () => {
    for (const key of ["welcome", "credits_added", "low_credits"]) {
      const html = renderTemplateSample(key)!.html.toLowerCase();
      expect(html, key).not.toContain("geração de imagens");
      expect(html, key).not.toContain("gerando imagens");
    }
  });

  it("em testes automatizados nada é enviado de verdade", async () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(await TransactionalEmailService.sendWelcome({ to: "x@example.com", name: "X", confirmToken: "t" })).toBe(false);
    expect(await TransactionalEmailService.sendPasswordReset({ to: "x@example.com", resetToken: "t" })).toBe(false);
  });

  it("fluxos de auth enviam e-mail e as rotas não expõem tokens em produção", () => {
    const auth = read("src/modules/auth/auth.service.ts");
    expect(auth).toContain("TransactionalEmailService.sendWelcome");
    expect(auth).toContain("TransactionalEmailService.sendPasswordReset");
    expect(auth).toContain("TransactionalEmailService.sendPasswordChanged");
    expect(auth).toContain("TransactionalEmailService.sendAdminNotification");
    expect(read("src/modules/workspaces/invite.service.ts")).toContain("TransactionalEmailService.sendWorkspaceInvite");
    expect(read("src/app/api/auth/forgot-password/route.ts")).toContain('process.env.NODE_ENV === "production"');
    expect(read("src/app/api/auth/register/route.ts")).toContain('process.env.NODE_ENV === "production"');
  });
});
