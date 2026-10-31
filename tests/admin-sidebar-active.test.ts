import { describe, it, expect } from "vitest";
import { ADMIN_NAV_GROUPS, isItemActive, ALL_ADMIN_HREFS } from "@/components/admin/admin-nav.config";

describe("AdminSidebar - Destaque Único de Item Ativo", () => {
  const getActiveItems = (pathname: string) => {
    return ALL_ADMIN_HREFS.filter((href) => isItemActive(href, pathname));
  };

  it("deve ativar exclusivamente 'APIs Gemini' quando a rota for /admin/settings/gemini", () => {
    const active = getActiveItems("/admin/settings/gemini");
    expect(active).toEqual(["/admin/settings/gemini"]);
  });

  it("deve ativar exclusivamente 'Banco de Dados' quando a rota for /admin/settings/database", () => {
    const active = getActiveItems("/admin/settings/database");
    expect(active).toEqual(["/admin/settings/database"]);
  });

  it("deve ativar exclusivamente 'Configurações Gerais' quando a rota for /admin/settings", () => {
    const active = getActiveItems("/admin/settings");
    expect(active).toEqual(["/admin/settings"]);
  });

  it("deve ativar exclusivamente 'Personalização' quando a rota for /admin/customization", () => {
    const active = getActiveItems("/admin/customization");
    expect(active).toEqual(["/admin/customization"]);
  });

  it("deve ativar exclusivamente 'APIs Gemini' na rota legada /admin/gemini-keys", () => {
    const active = getActiveItems("/admin/gemini-keys");
    expect(active).toEqual(["/admin/settings/gemini"]);
  });

  it("deve ativar exclusivamente 'Usuários' em sub-rotas como /admin/users/cmv123", () => {
    const active = getActiveItems("/admin/users/cmv123");
    expect(active).toEqual(["/admin/users"]);
  });

  it("deve ativar exclusivamente 'Dashboard' na rota raiz /admin", () => {
    const active = getActiveItems("/admin");
    expect(active).toEqual(["/admin"]);
  });

  it("não deve permitir mais de 1 item selecionado simultaneamente em qualquer rota do sistema", () => {
    for (const href of ALL_ADMIN_HREFS) {
      const active = getActiveItems(href);
      expect(active).toHaveLength(1);
      expect(active[0]).toBe(href);
    }
  });
});
