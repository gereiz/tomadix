import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace, AuthenticationError, AuthorizationError } from "@/lib/auth";
import { ProjectService } from "@/modules/projects/project.service";
import { CharacterService } from "@/modules/characters/character.service";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { SceneService } from "@/modules/scenes/scene.service";
import { PromptEngineService } from "@/modules/prompt-engine/prompt-engine.service";
import { CreditExecutionService } from "@/modules/billing/credit-execution.service";
import { db } from "@/lib/db";
import { z } from "zod";

const quickCreateSchema = z.object({
  type: z.enum(["PROJECT", "CHARACTER", "ENVIRONMENT", "SCENE", "PROMPT"]),
  prompt: z.string().trim().min(2, "Informe uma descrição para criar o conteúdo.").max(3000),
  projectId: z.string().optional().nullable(),
  title: z.string().trim().max(120).optional(),
  references: z
    .object({
      characterIds: z.array(z.string()).optional(),
      environmentIds: z.array(z.string()).optional(),
      sceneIds: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getCurrentWorkspace(null, "projects:create");
    const body = await request.json();
    const validated = quickCreateSchema.parse(body);

    let effectiveProjectId = validated.projectId;

    // Se o tipo requer projeto e nenhum foi especificado, busca ou cria um projeto padrão
    if (validated.type !== "PROJECT" && !effectiveProjectId) {
      const firstProject = await db.project.findFirst({
        where: { workspaceId: workspace.id, isArchived: false },
        orderBy: { updatedAt: "desc" },
      });

      if (firstProject) {
        effectiveProjectId = firstProject.id;
      } else {
        const autoProject = await ProjectService.createProject(workspace.id, {
          title: "Estúdio Principal",
          description: "Projeto padrão criado automaticamente pelo Estúdio Rápido.",
          genre: "Ficção Científica",
          language: "pt-BR",
        });
        effectiveProjectId = autoProject.id;
      }
    }

    // 1. CRIAÇÃO DE PROJETO
    if (validated.type === "PROJECT") {
      const generatedTitle =
        validated.title?.trim() ||
        validated.prompt
          .split(/[\n.]/)[0]
          .slice(0, 50)
          .trim() ||
        "Novo Projeto Cinematográfico";

      const created = await ProjectService.createProject(workspace.id, {
        title: generatedTitle,
        description: validated.prompt,
        genre: "Geral",
        language: "pt-BR",
      });

      return NextResponse.json(
        {
          message: "Projeto criado com sucesso no estúdio.",
          data: {
            id: created.id,
            type: "PROJECT",
            title: created.title,
            href: `/projects/${created.id}`,
          },
        },
        { status: 201 }
      );
    }

    // 2. CRIAÇÃO DE PERSONAGEM
    if (validated.type === "CHARACTER") {
      const name =
        validated.title?.trim() ||
        validated.prompt
          .split(/[\n,.]/)[0]
          .slice(0, 40)
          .trim() ||
        "Novo Personagem";

      const execution = await CreditExecutionService.executeWithCredits(
        {
          workspaceId: workspace.id,
          operationCode: "GEN_CHARACTER",
          description: `Criação Rápida de Personagem (${name})`,
          projectId: effectiveProjectId || undefined,
        },
        async () => {
          return await CharacterService.createCharacter(
            effectiveProjectId!,
            workspace.id,
            {
              name,
              description: validated.prompt,
              attributes: {
                apparentAge: "Indefinida",
                visualIdentity: validated.prompt.slice(0, 300),
                basePrompt: validated.prompt,
              },
            }
          );
        }
      );

      const character = execution.result;

      return NextResponse.json(
        {
          message: `Personagem '${character.name}' criado com sucesso.`,
          data: {
            id: character.id,
            type: "CHARACTER",
            title: character.name,
            href: `/projects/${effectiveProjectId}?tab=characters`,
          },
          creditCost: execution.creditCost,
          newBalance: execution.newBalance,
        },
        { status: 201 }
      );
    }

    // 3. CRIAÇÃO DE AMBIENTE
    if (validated.type === "ENVIRONMENT") {
      const name =
        validated.title?.trim() ||
        validated.prompt
          .split(/[\n,.]/)[0]
          .slice(0, 40)
          .trim() ||
        "Novo Cenário";

      const execution = await CreditExecutionService.executeWithCredits(
        {
          workspaceId: workspace.id,
          operationCode: "GEN_ENVIRONMENT",
          description: `Criação Rápida de Ambiente (${name})`,
          projectId: effectiveProjectId || undefined,
        },
        async () => {
          return await EnvironmentService.createEnvironment(
            effectiveProjectId!,
            workspace.id,
            {
              name,
              description: validated.prompt,
              attributes: {
                locationContext: "Cinematográfico",
                visualStyle: validated.prompt.slice(0, 300),
                basePrompt: validated.prompt,
              },
            }
          );
        }
      );

      const environment = execution.result;

      return NextResponse.json(
        {
          message: `Ambiente '${environment.name}' configurado com sucesso.`,
          data: {
            id: environment.id,
            type: "ENVIRONMENT",
            title: environment.name,
            href: `/projects/${effectiveProjectId}?tab=environments`,
          },
          creditCost: execution.creditCost,
          newBalance: execution.newBalance,
        },
        { status: 201 }
      );
    }

    // 4. CRIAÇÃO DE CENA
    if (validated.type === "SCENE") {
      const title =
        validated.title?.trim() ||
        validated.prompt
          .split(/[\n.]/)[0]
          .slice(0, 50)
          .trim() ||
        "Nova Cena";

      const execution = await CreditExecutionService.executeWithCredits(
        {
          workspaceId: workspace.id,
          operationCode: "GEN_SCENE_SEQUENCE",
          description: `Criação Rápida de Cena (${title})`,
          projectId: effectiveProjectId || undefined,
        },
        async () => {
          return await SceneService.createScene(
            effectiveProjectId!,
            workspace.id,
            {
              title,
              description: validated.prompt,
              characterIds: validated.references?.characterIds || [],
              environmentIds: validated.references?.environmentIds || [],
              durationSeconds: 10,
            }
          );
        }
      );

      const scene = execution.result;

      if (!scene) {
        throw new Error("Não foi possível gerar a cena.");
      }

      return NextResponse.json(
        {
          message: `Cena #${scene.order} decupada com sucesso.`,
          data: {
            id: scene.id,
            type: "SCENE",
            title: scene.title,
            href: `/projects/${effectiveProjectId}?tab=scenes`,
          },
          creditCost: execution.creditCost,
          newBalance: execution.newBalance,
        },
        { status: 201 }
      );
    }

    // 5. CRIAÇÃO / GERAÇÃO DE PROMPT
    if (validated.type === "PROMPT") {
      const promptResult = await PromptEngineService.generate(
        effectiveProjectId!,
        workspace.id,
        {
          targetTool: "google_flow",
          templateKey: "visual_bible",
          customInstructions: validated.prompt,
          references: validated.references,
        }
      );

      return NextResponse.json(
        {
          message: "Prompt gerado com sucesso pela IA.",
          data: {
            id: promptResult.versionId,
            type: "PROMPT",
            title: `Prompt v${promptResult.templateVersion}`,
            href: `/projects/${effectiveProjectId}?tab=prompts`,
            preview: promptResult.data,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Tipo de criação inválido." }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos.", issues: error.issues.map((i) => i.message) },
        { status: 422 }
      );
    }
    console.error("Erro na criação rápida do estúdio:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno ao processar criação rápida." },
      { status: 500 }
    );
  }
}
