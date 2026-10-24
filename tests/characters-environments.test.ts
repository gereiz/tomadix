import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ProjectService } from "@/modules/projects/project.service";
import { CharacterService } from "@/modules/characters/character.service";
import { EnvironmentService } from "@/modules/environments/environment.service";
import { characterPromptOutputSchema } from "@/modules/characters/character.schema";
import { environmentPromptOutputSchema } from "@/modules/environments/environment.schema";

// Helper de resiliência para conexões remotas em ambiente de teste
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}

describe("Characters & Environments Service - Bibliotecas Cinematográficas", () => {
  let workspaceAId: string;
  let workspaceBId: string;
  let projectId: string;
  let createdCharId: string;
  let createdEnvId: string;

  beforeAll(async () => {
    // 1. Criar Workspace A e Projeto
    const wsA = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Estúdio Cinema Alpha",
          slug: `alpha-studio-${Date.now()}`,
        },
      })
    );
    workspaceAId = wsA.id;

    const project = await withRetry(() =>
      ProjectService.createProject(workspaceAId, {
        title: "Cyber Metropolis 2088",
        description: "Produção cinematográfica sci-fi em neon e chuva constante.",
        genre: "Sci-Fi Noir",
        language: "pt-BR",
        configuration: {
          aspectRatio: "2.39:1",
          targetPlatform: "Google Flow",
        },
      })
    );
    projectId = project.id;

    // 2. Criar Workspace B para testes de isolamento
    const wsB = await withRetry(() =>
      db.workspace.create({
        data: {
          name: "Estúdio Cinema Beta",
          slug: `beta-studio-${Date.now()}`,
        },
      })
    );
    workspaceBId = wsB.id;
  });

  afterAll(async () => {
    if (workspaceAId) {
      await db.workspace.delete({ where: { id: workspaceAId } }).catch(() => {});
    }
    if (workspaceBId) {
      await db.workspace.delete({ where: { id: workspaceBId } }).catch(() => {});
    }
  });

  describe("Módulo de Personagens (Characters)", () => {
    it("1. Deve criar um personagem com atributos visuais permanentes completos", async () => {
      const char = await withRetry(() =>
        CharacterService.createCharacter(projectId, workspaceAId, {
          name: "Kaelen Voss",
          description: "Ex-detetive cibernético em busca de redenção.",
          attributes: {
            apparentAge: "38 anos",
            visualIdentity: "Detetive cyberpunk melancólico, iluminação de neon lateral",
            physicalCharacteristics: "1.85m, porte atlético, cicatriz no queixo",
            hairAndFace: "Cabelo preto raspado nas laterais, barba cerrada por fazer",
            costumeAndAccessories: "Sobretudo cinza escuro impermeável com gola alta e relógio analógico",
            personalityAndBehavior: "Expressão reservada, olhar atento e postura rígida",
            voiceAndLanguage: "Voz rouca e pausada, português com sotaque metropolitano",
            restrictions: "Nunca sorrir abertamente, sem armas de fogo convencionais modernas",
            basePrompt: "cinematic raw photograph of Kaelen Voss, sharp facial features, dramatic rim lighting",
          },
        })
      );

      expect(char).toBeDefined();
      expect(char.id).toBeDefined();
      expect(char.name).toBe("Kaelen Voss");
      expect(char.isArchived).toBe(false);
      expect((char.attributes as any)?.apparentAge).toBe("38 anos");
      createdCharId = char.id;
    });

    it("2. Deve listar personagens com filtros de busca e estado", async () => {
      const activeList = await withRetry(() =>
        CharacterService.listCharacters(projectId, workspaceAId, {
          status: "active",
          search: "Kaelen",
        })
      );
      expect(activeList.length).toBe(1);
      expect(activeList[0].name).toBe("Kaelen Voss");

      const emptySearch = await withRetry(() =>
        CharacterService.listCharacters(projectId, workspaceAId, {
          search: "InexistenteXYZ",
        })
      );
      expect(emptySearch.length).toBe(0);
    });

    it("3. Deve atualizar atributos do personagem", async () => {
      const updated = await withRetry(() =>
        CharacterService.updateCharacter(createdCharId, projectId, workspaceAId, {
          description: "Detetive cibernético veterano em busca de justiça.",
          attributes: {
            apparentAge: "40 anos",
            visualIdentity: "Detetive cyberpunk experiente",
            physicalCharacteristics: "1.85m, porte atlético",
            hairAndFace: "Cabelo preto raspado nas laterais",
            costumeAndAccessories: "Sobretudo escuro",
            personalityAndBehavior: "Estóico e focado",
            voiceAndLanguage: "Voz rouca",
            restrictions: "Sem armas modernas",
            basePrompt: "cinematic portrait of Kaelen Voss",
          },
        })
      );

      expect(updated.description).toBe("Detetive cibernético veterano em busca de justiça.");
      expect((updated.attributes as any)?.apparentAge).toBe("40 anos");
    });

    it("4. Deve duplicar o personagem preservando todos os atributos visuais", async () => {
      const duplicated = await withRetry(() =>
        CharacterService.duplicateCharacter(createdCharId, projectId, workspaceAId, {
          name: "Kaelen Voss (Versão Alternativa)",
        })
      );

      expect(duplicated.id).not.toBe(createdCharId);
      expect(duplicated.name).toBe("Kaelen Voss (Versão Alternativa)");
      expect((duplicated.attributes as any)?.apparentAge).toBe("40 anos");
    });

    it("5. Deve compilar o prompt-base estruturado em JSON com validação de schema", async () => {
      const promptJson = await withRetry(() =>
        CharacterService.generatePromptJson(createdCharId, projectId, workspaceAId)
      );

      expect(promptJson.schemaVersion).toBe("1.0");
      expect(promptJson.type).toBe("character_prompt");
      expect(promptJson.name).toBe("Kaelen Voss");
      expect(promptJson.permanentFeatures.identity).toBe("Detetive cyberpunk experiente");
      expect(promptJson.compiledPromptText).toContain("Kaelen Voss");

      // Validar contra Zod schema
      const parseResult = characterPromptOutputSchema.safeParse(promptJson);
      expect(parseResult.success).toBe(true);
    });

    it("6. Deve arquivar e restaurar o personagem", async () => {
      const archived = await withRetry(() =>
        CharacterService.archiveCharacter(createdCharId, projectId, workspaceAId)
      );
      expect(archived.isArchived).toBe(true);
      expect(archived.archivedAt).toBeDefined();

      const restored = await withRetry(() =>
        CharacterService.restoreCharacter(createdCharId, projectId, workspaceAId)
      );
      expect(restored.isArchived).toBe(false);
      expect(restored.archivedAt).toBeNull();
    });

    it("7. Deve impedir acesso cruzado entre workspaces (isolamento multitenant)", async () => {
      await expect(
        CharacterService.getCharacterById(createdCharId, projectId, workspaceBId)
      ).rejects.toThrow("Projeto não encontrado ou acesso não permitido.");
    });
  });

  describe("Módulo de Ambientes (Environments)", () => {
    it("8. Deve criar um ambiente com características arquiteturais e iluminação", async () => {
      const env = await withRetry(() =>
        EnvironmentService.createEnvironment(projectId, workspaceAId, {
          name: "Beco das Sombras Neon",
          description: "Beco estreito entre arranha-céus com vapor saindo de bueiros.",
          attributes: {
            locationContext: "Distrito Baixo de Neo-Tóquio",
            architecture: "Arranha-céus de concreto e vidro com fiação exposta e passarelas metálicas suspensas",
            propsAndElements: "Placas holográficas em japonês, poças de água reflexivas, latões de lixo de aço",
            lighting: "Contraste forte com iluminação prática de letreiros neon magenta e ciano refletindo no asfalto molhado",
            colorPalette: "Azul petróleo profundo, magenta elétrico e preto asfalto",
            weatherAndAtmosphere: "Chuva torrencial fina, garoa incessante e névoa densa",
            historicalEra: "Século XXII pós-singularidade",
            visualStyle: "Estética Blade Runner 2049, lentes Master Prime anamórficas",
            basePrompt: "cinematic ultra wide establishing shot of a wet cybernetic alley, neon reflections on asphalt",
          },
        })
      );

      expect(env).toBeDefined();
      expect(env.id).toBeDefined();
      expect(env.name).toBe("Beco das Sombras Neon");
      expect(env.isArchived).toBe(false);
      expect((env.attributes as any)?.locationContext).toBe("Distrito Baixo de Neo-Tóquio");
      createdEnvId = env.id;
    });

    it("9. Deve listar ambientes com filtros de busca e estado", async () => {
      const activeList = await withRetry(() =>
        EnvironmentService.listEnvironments(projectId, workspaceAId, {
          status: "active",
          search: "Beco",
        })
      );
      expect(activeList.length).toBe(1);
      expect(activeList[0].name).toBe("Beco das Sombras Neon");
    });

    it("10. Deve atualizar atributos do ambiente", async () => {
      const updated = await withRetry(() =>
        EnvironmentService.updateEnvironment(createdEnvId, projectId, workspaceAId, {
          description: "Beco escuro com neblina e letreiros chineses e japoneses.",
          attributes: {
            locationContext: "Distrito Baixo de Neo-Tóquio - Setor 7",
            architecture: "Concreto brutalista e passarelas suspensas",
            propsAndElements: "Placas holográficas e cabos caídos",
            lighting: "Neon magenta suave e sombras densas",
            colorPalette: "Magenta e ciano",
            weatherAndAtmosphere: "Garoa fina",
            historicalEra: "Ano 2088",
            visualStyle: "Anamórfico 35mm",
            basePrompt: "cinematic shot of alley sector 7",
          },
        })
      );

      expect((updated.attributes as any)?.locationContext).toBe("Distrito Baixo de Neo-Tóquio - Setor 7");
    });

    it("11. Deve duplicar o ambiente preservando todos os atributos espaciais", async () => {
      const duplicated = await withRetry(() =>
        EnvironmentService.duplicateEnvironment(createdEnvId, projectId, workspaceAId, {
          name: "Beco das Sombras Neon (Versão Noturna)",
        })
      );

      expect(duplicated.id).not.toBe(createdEnvId);
      expect(duplicated.name).toBe("Beco das Sombras Neon (Versão Noturna)");
    });

    it("12. Deve compilar o prompt-base do ambiente em formato JSON estruturado", async () => {
      const promptJson = await withRetry(() =>
        EnvironmentService.generatePromptJson(createdEnvId, projectId, workspaceAId)
      );

      expect(promptJson.schemaVersion).toBe("1.0");
      expect(promptJson.type).toBe("environment_prompt");
      expect(promptJson.name).toBe("Beco das Sombras Neon");
      expect(promptJson.permanentFeatures.palette).toBe("Magenta e ciano");

      // Validar contra Zod schema
      const parseResult = environmentPromptOutputSchema.safeParse(promptJson);
      expect(parseResult.success).toBe(true);
    });

    it("13. Deve arquivar e restaurar o ambiente", async () => {
      const archived = await withRetry(() =>
        EnvironmentService.archiveEnvironment(createdEnvId, projectId, workspaceAId)
      );
      expect(archived.isArchived).toBe(true);
      expect(archived.archivedAt).toBeDefined();

      const restored = await withRetry(() =>
        EnvironmentService.restoreEnvironment(createdEnvId, projectId, workspaceAId)
      );
      expect(restored.isArchived).toBe(false);
      expect(restored.archivedAt).toBeNull();
    });

    it("14. Deve excluir personagem e ambiente garantindo limpeza referencial", async () => {
      const charDel = await withRetry(() =>
        CharacterService.deleteCharacter(createdCharId, projectId, workspaceAId)
      );
      expect(charDel.success).toBe(true);

      const envDel = await withRetry(() =>
        EnvironmentService.deleteEnvironment(createdEnvId, projectId, workspaceAId)
      );
      expect(envDel.success).toBe(true);

      const charAfterDelete = await withRetry(() =>
        CharacterService.getCharacterById(createdCharId, projectId, workspaceAId)
      );
      expect(charAfterDelete).toBeNull();

      const envAfterDelete = await withRetry(() =>
        EnvironmentService.getEnvironmentById(createdEnvId, projectId, workspaceAId)
      );
      expect(envAfterDelete).toBeNull();
    });
  });
});
