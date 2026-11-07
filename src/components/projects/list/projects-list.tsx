"use client";

import { ToastNotification } from "@/components/ui/toast";
import { TransferProjectModal, SpaceShareModal, PlanLimitModal } from "./helpers";
import { useProjectsListTab } from "./use-projects-list";
import { ProjectsHeader } from "./projects-header";
import { ProjectLimitBanner } from "./project-limit-banner";
import { ProjectsFilters } from "./projects-filters";
import { ProjectsContent } from "./projects-content";
import { PresetsModal } from "./presets-modal";
import { ProjectFormModal } from "./project-form-modal";
import { DeleteProjectModal } from "./delete-project-modal";

export type { UsageSummary, ProjectCounts, ProjectConfig, Project } from "./types";

export default function ProjectsList() {
  const s = useProjectsListTab();
  const { projects, projectToTransfer, setProjectToTransfer, projectToShare, setProjectToShare, usageSummary, planLimitModal, setPlanLimitModal, toastMessage, setToastMessage, showToast, loadUsage, fetchProjects } = s;

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary selection:text-on-primary relative overflow-hidden">
      {/* Luz ambiente de fundo */}

      <main className="relative w-full px-4 sm:px-6 lg:px-8 pt-8 pb-20 flex flex-col gap-8">
      <ProjectsHeader s={s} />

      <ProjectLimitBanner s={s} />

      <ProjectsFilters s={s} />

      <ProjectsContent s={s} />
      </main>

      {s.isPresetsModalOpen && (
        <PresetsModal s={s} />
      )}

      {s.isCreateModalOpen && (
        <ProjectFormModal s={s} />
      )}

      {s.projectToDelete && (
        <DeleteProjectModal s={s} />
      )}

      {/* Modal de Compartilhamento do Space */}
      {projectToShare && (
        <SpaceShareModal
          projectId={projectToShare.id}
          projectTitle={projectToShare.title}
          isOpen={Boolean(projectToShare)}
          onClose={() => setProjectToShare(null)}
          onUpdated={() => {
            showToast("Configurações de compartilhamento do Space atualizadas!");
            fetchProjects();
          }}
        />
      )}

      {/* Modal de Transferência de Projeto entre Workspaces */}
      {projectToTransfer && (
        <TransferProjectModal
          projectId={projectToTransfer.id}
          projectTitle={projectToTransfer.title}
          currentWorkspaceId={projectToTransfer.workspaceId}
          isOpen={Boolean(projectToTransfer)}
          onClose={() => setProjectToTransfer(null)}
          onSuccess={() => {
            showToast("Projeto transferido com sucesso para o novo workspace!");
            fetchProjects();
            loadUsage();
          }}
        />
      )}

      {/* Modal Visual de Limite de Assinatura */}
      <PlanLimitModal
        isOpen={planLimitModal.isOpen}
        onClose={() => setPlanLimitModal({ isOpen: false })}
        title={planLimitModal.title}
        message={planLimitModal.message}
        planName={planLimitModal.planName || usageSummary?.planName || "Plano Gratuito"}
        currentUsage={planLimitModal.currentUsage ?? usageSummary?.projectsCount ?? projects.length}
        maxLimit={planLimitModal.maxLimit ?? usageSummary?.maxProjects ?? 2}
        limitType="projects"
      />

      {/* Toast Notification Flutuante */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
