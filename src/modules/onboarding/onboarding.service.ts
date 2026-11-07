import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/auth";

import { STARTER_TEMPLATES } from "@/config/starter-templates";

export { STARTER_TEMPLATES };
export type { StarterTemplate } from "@/config/starter-templates";

export class OnboardingService {
  /**
   * Obtém o estado completo de onboarding do usuário.
   */
  static async getOnboardingState(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            workspace: {
              include: {
                subscription: {
                  include: { plan: true },
                },
                _count: {
                  select: { projects: true, memberships: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    const activeWorkspace =
      user.memberships.find((m) => (m.workspace._count?.projects || 0) > 0)?.workspace ||
      user.memberships[0]?.workspace;
    const hasProjects = (activeWorkspace?._count?.projects || 0) > 0;

    return {
      userId: user.id,
      displayName: user.displayName || user.email.split("@")[0],
      email: user.email,
      emailConfirmed: user.emailConfirmed,
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
      preferences: (user.preferences as Record<string, any>) || {},
      activeWorkspace: activeWorkspace
        ? {
            id: activeWorkspace.id,
            name: activeWorkspace.name,
            slug: activeWorkspace.slug,
            planName: activeWorkspace.subscription?.plan?.name || "Plano Gratuito",
            projectsCount: activeWorkspace._count?.projects || 0,
            hasProjects,
          }
        : null,
      starterTemplates: STARTER_TEMPLATES.map((t) => ({
        key: t.key,
        title: t.title,
        genre: t.genre,
        description: t.description,
        targetPlatform: t.targetPlatform,
        aspectRatio: t.aspectRatio,
      })),
    };
  }

  /**
   * Reinicia o onboarding completo do usuário do passo 1.
   */
  static async resetOnboarding(userId: string) {
    await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: false,
        onboardingStep: 1,
      },
    });
    return this.getOnboardingState(userId);
  }

  /**
   * Atualiza a etapa do onboarding ou conclui o fluxo.
   */
  static async updateStep(userId: string, step: number, completed = false) {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        onboardingStep: Math.max(1, Math.min(step, 7)),
        onboardingCompleted: completed || step >= 7,
      },
      select: {
        id: true,
        onboardingStep: true,
        onboardingCompleted: true,
      },
    });

    return updated;
  }

  /**
   * Pula o onboarding imediatamente.
   */
  static async skipOnboarding(userId: string) {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 7,
      },
      select: {
        id: true,
        onboardingCompleted: true,
      },
    });

    return updated;
  }

  /**
   * Cria um projeto inicial a partir de um dos templates fornecidos.
   */
  static async createStarterProject(userId: string, workspaceId: string, templateKey: string) {
    const template =
      STARTER_TEMPLATES.find((t) => t.key === templateKey) || STARTER_TEMPLATES[0];

    const project = await db.project.create({
      data: {
        workspaceId,
        title: template.title,
        genre: template.genre,
        description: template.description,
        language: "pt-BR",
        configuration: {
          aspectRatio: template.aspectRatio,
          targetPlatform: template.targetPlatform,
          colorGrade: template.colorGrade,
        },
        characters: {
          create: template.characters.map((c) => ({
            name: c.name,
            description: `${c.role}: ${c.description}`,
            attributes: c.physicalTraits,
          })),
        },
        environments: {
          create: template.environments.map((e) => ({
            name: e.name,
            description: e.description,
            attributes: { type: e.type, lighting: e.lighting },
          })),
        },
        scenes: {
          create: template.scenes.map((s) => ({
            title: s.title,
            order: s.order,
            description: s.description,
            configuration: {
              framing: s.framing,
              cameraMovement: s.cameraMovement,
            },
          })),
        },
      },
      include: {
        characters: true,
        environments: true,
        scenes: true,
      },
    });

    // Registra auditoria
    await db.auditLog.create({
      data: {
        userId,
        workspaceId,
        action: "STARTER_PROJECT_CREATED",
        details: {
          projectId: project.id,
          projectTitle: project.title,
          templateKey,
        },
      },
    });

    // Atualiza onboarding para concluído
    await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingStep: 7,
      },
    });

    return project;
  }
}
