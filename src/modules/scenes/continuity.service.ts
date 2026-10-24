import { ContinuityReport, ContinuityWarning } from "./scene.schema";

interface SceneWithRelations {
  id: string;
  order: number;
  title: string;
  description: string;
  durationSeconds: number | null;
  configuration: any;
  characters: Array<{
    characterId: string;
    configuration: any;
    character: {
      id: string;
      name: string;
    };
  }>;
  environments: Array<{
    environmentId: string;
    configuration: any;
    environment: {
      id: string;
      name: string;
    };
  }>;
}

export class ContinuityService {
  /**
   * Analisa a sequência cronológica de cenas de um projeto e detecta inconsistências de continuidade.
   */
  static analyze(
    projectId: string,
    scenes: SceneWithRelations[],
    projectLanguage: string = "pt-BR"
  ): ContinuityReport {
    const warnings: ContinuityWarning[] = [];

    // Ordenar cenas por order garantindo sequência
    const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

    for (let i = 0; i < sortedScenes.length; i++) {
      const current = sortedScenes[i];
      const next = sortedScenes[i + 1];
      const prev = sortedScenes[i - 1];

      const currentConfig = (current.configuration as any) || {};
      const currentChars = current.characters.map((c) => c.character);
      const currentEnvs = current.environments.map((e) => e.environment);

      // 1. Verificação Individual de Prontidão da Cena (Completeness / Readiness)
      if (!currentConfig.mainAction || currentConfig.mainAction.trim() === "") {
        warnings.push({
          type: "action_continuity",
          severity: "warning",
          sceneIdA: current.id,
          sceneOrderA: current.order,
          sceneTitleA: current.title,
          title: `Ação Principal não definida na Cena ${current.order}`,
          message: `A cena "${current.title}" não possui uma ação dramática principal descrita, dificultando a interpretação do motor de IA.`,
          suggestion: "Defina claramente a ação física ou dramática que ocorre nesta tomada.",
        });
      }

      if (currentChars.length === 0 && currentEnvs.length === 0) {
        warnings.push({
          type: "spatial_continuity",
          severity: "warning",
          sceneIdA: current.id,
          sceneOrderA: current.order,
          sceneTitleA: current.title,
          title: `Cena ${current.order} sem personagens nem ambientes vinculados`,
          message: `A cena "${current.title}" não possui referências à biblioteca visual, o que pode causar perda de consistência visual.`,
          suggestion: "Vincule ao menos um ambiente ou personagem à cena para herdar os atributos visuais permanentes.",
        });
      }

      // 2. Verificação de Som, Diálogo e Idioma
      const dialogue = currentConfig.dialogue || {};
      if (dialogue.enabled) {
        if (!dialogue.lines || dialogue.lines.trim() === "") {
          warnings.push({
            type: "sound_dialogue",
            severity: "info",
            sceneIdA: current.id,
            sceneOrderA: current.order,
            sceneTitleA: current.title,
            title: `Diálogo habilitado sem falas na Cena ${current.order}`,
            message: `A opção de diálogos está marcada como ativa na cena "${current.title}", mas nenhuma linha de diálogo foi cadastrada.`,
            suggestion: "Insira as falas dos personagens ou desabilite o diálogo nesta cena.",
          });
        }

        // Validação de Idioma pt-BR
        if (projectLanguage.startsWith("pt") && dialogue.language && !dialogue.language.startsWith("pt")) {
          warnings.push({
            type: "sound_dialogue",
            severity: "warning",
            sceneIdA: current.id,
            sceneOrderA: current.order,
            sceneTitleA: current.title,
            title: `Inconsistência de idioma do diálogo na Cena ${current.order}`,
            message: `O projeto está configurado para português do Brasil (${projectLanguage}), mas a cena indica o idioma "${dialogue.language}".`,
            suggestion: "Certifique-se de que a fala estrangeira é intencional ou altere o idioma do diálogo para pt-BR.",
          });
        }
      }

      // Se for a última cena, não há comparações sequenciais com a próxima
      if (!next) continue;

      const nextConfig = (next.configuration as any) || {};
      const nextChars = next.characters.map((c) => c.character);
      const nextEnvs = next.environments.map((e) => e.environment);

      // 3. Continuidade de Ação e Estado (Estado Final vs Estado Inicial)
      const currentFinalState = (currentConfig.finalState || "").toLowerCase();
      const nextInitialState = (nextConfig.initialState || "").toLowerCase();

      if (currentFinalState && nextInitialState) {
        // Detecção heurística de conflitos de estado físico
        const conflictingStates = [
          { a: "chão", b: "em pé" },
          { a: "deitado", b: "correndo" },
          { a: "ferido", b: "ileso" },
          { a: "molhado", b: "seco" },
          { a: "preso", b: "livre" },
          { a: "escuro", b: "iluminado" },
          { a: "desacordado", b: "conversando" },
        ];

        for (const pair of conflictingStates) {
          if (
            (currentFinalState.includes(pair.a) && nextInitialState.includes(pair.b)) ||
            (currentFinalState.includes(pair.b) && nextInitialState.includes(pair.a))
          ) {
            const transition = (nextConfig.transitionIn || "").toLowerCase();
            const hasTimeJumpTransition =
              transition.includes("dissolve") ||
              transition.includes("fade") ||
              transition.includes("elipse") ||
              transition.includes("tempo");

            if (!hasTimeJumpTransition) {
              warnings.push({
                type: "action_continuity",
                severity: "critical",
                sceneIdA: current.id,
                sceneOrderA: current.order,
                sceneTitleA: current.title,
                sceneIdB: next.id,
                sceneOrderB: next.order,
                sceneTitleB: next.title,
                title: `Possível salto de continuidade física entre Cenas ${current.order} e ${next.order}`,
                message: `O estado final da Cena ${current.order} indica "${currentConfig.finalState}", enquanto o estado inicial da Cena ${next.order} indica "${nextConfig.initialState}", sem uma transição de passagem de tempo.`,
                suggestion: `Adicione uma transição elíptica (ex: Fade to Black, Dissolve) ou descreva a recuperação/mudança na ação intermediária.`,
              });
            }
          }
        }
      }

      // 4. Continuidade de Ambiente e Localização Espacial
      const sharedEnvs = currentEnvs.filter((ce) => nextEnvs.some((ne) => ne.id === ce.id));
      const environmentChanged = currentEnvs.length > 0 && nextEnvs.length > 0 && sharedEnvs.length === 0;

      if (environmentChanged) {
        const transitionIn = (nextConfig.transitionIn || "").toLowerCase();
        const hasValidCut =
          transitionIn.includes("corte") ||
          transitionIn.includes("fade") ||
          transitionIn.includes("dissolve") ||
          transitionIn.includes("wipe");

        // Se o ambiente mudou e há personagens que continuam presentes sem transição clara
        const sharedCharacters = currentChars.filter((cc) => nextChars.some((nc) => nc.id === cc.id));
        if (sharedCharacters.length > 0 && !hasValidCut) {
          warnings.push({
            type: "spatial_continuity",
            severity: "warning",
            sceneIdA: current.id,
            sceneOrderA: current.order,
            sceneTitleA: current.title,
            sceneIdB: next.id,
            sceneOrderB: next.order,
            sceneTitleB: next.title,
            title: `Mudança abrupta de locação para ${sharedCharacters.map((c) => c.name).join(", ")}`,
            message: `O(s) personagem(ns) estava(m) em "${currentEnvs[0]?.name}" na Cena ${current.order} e passa(m) imediatamente para "${nextEnvs[0]?.name}" na Cena ${next.order}.`,
            suggestion: "Utilize uma transição explícita (Fade/Corte com plano geral) ou adicione um plano de transição para justificar o deslocamento.",
          });
        }
      }

      // 5. Continuidade de Iluminação e Hora do Dia (quando no mesmo ambiente)
      if (sharedEnvs.length > 0) {
        const lightA = (currentConfig.lighting || "").toLowerCase();
        const lightB = (nextConfig.lighting || "").toLowerCase();

        const isNightA = lightA.includes("noite") || lightA.includes("madrugada") || lightA.includes("dark");
        const isDayA = lightA.includes("dia") || lightA.includes("sol") || lightA.includes("golden hour") || lightA.includes("manhã");

        const isNightB = lightB.includes("noite") || lightB.includes("madrugada") || lightB.includes("dark");
        const isDayB = lightB.includes("dia") || lightB.includes("sol") || lightB.includes("golden hour") || lightB.includes("manhã");

        if ((isNightA && isDayB) || (isDayA && isNightB)) {
          const transition = (nextConfig.transitionIn || "").toLowerCase();
          const hasTimeTransition = transition.includes("fade") || transition.includes("dissolve") || transition.includes("elipse");

          if (!hasTimeTransition) {
            warnings.push({
              type: "lighting_continuity",
              severity: "critical",
              sceneIdA: current.id,
              sceneOrderA: current.order,
              sceneTitleA: current.title,
              sceneIdB: next.id,
              sceneOrderB: next.order,
              sceneTitleB: next.title,
              title: `Mudança radical de iluminação no mesmo ambiente (${sharedEnvs[0].name})`,
              message: `A Cena ${current.order} apresenta iluminação "${currentConfig.lighting}" e a Cena ${next.order} apresenta "${nextConfig.lighting}" no mesmo cenário sem indicação de elipse temporal.`,
              suggestion: "Defina uma transição temporal perceptível (Fade to Black / Dissolve lento) ou alinhe a iluminação mestre das duas tomadas.",
            });
          }
        }
      }

      // 6. Direção de Movimento e Eixo de 180 Graus
      const movementA = (currentConfig.characterMovement || "").toLowerCase();
      const movementB = (nextConfig.characterMovement || "").toLowerCase();

      if (movementA && movementB) {
        if (
          (movementA.includes("esquerda") && movementB.includes("direita") && !movementB.includes("para a esquerda")) ||
          (movementA.includes("direita") && movementB.includes("esquerda") && !movementB.includes("para a direita"))
        ) {
          warnings.push({
            type: "character_consistency",
            severity: "info",
            sceneIdA: current.id,
            sceneOrderA: current.order,
            sceneTitleA: current.title,
            sceneIdB: next.id,
            sceneOrderB: next.order,
            sceneTitleB: next.title,
            title: `Possível quebra da linha de ação (Regra dos 180°) entre Cenas ${current.order} e ${next.order}`,
            message: `O movimento dos personagens inverte de direção ("${currentConfig.characterMovement}" para "${nextConfig.characterMovement}").`,
            suggestion: "Verifique se a câmera cruzou o eixo dos 180° sem um plano neutro intermediário, o que pode desorientar o espectador.",
          });
        }
      }
    }

    const criticalCount = warnings.filter((w) => w.severity === "critical").length;
    const warningCount = warnings.filter((w) => w.severity === "warning").length;
    const infoCount = warnings.filter((w) => w.severity === "info").length;

    let status: "ok" | "needs_attention" | "critical" = "ok";
    if (criticalCount > 0) status = "critical";
    else if (warningCount > 0) status = "needs_attention";

    return {
      projectId,
      analyzedScenesCount: sortedScenes.length,
      status,
      summary: {
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
      },
      warnings,
    };
  }
}
