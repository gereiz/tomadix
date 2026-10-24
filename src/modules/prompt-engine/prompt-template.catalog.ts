import { z } from "zod";
import {
  TemplateKey,
  visualBibleOutputSchema,
  characterDefinitionOutputSchema,
  environmentDefinitionOutputSchema,
  imagePromptOutputSchema,
  videoPromptOutputSchema,
  sceneSequenceOutputSchema,
  individualSceneOutputSchema,
} from "./prompt-engine.schema";

export interface SystemPromptTemplate {
  key: TemplateKey;
  name: string;
  version: number;
  description: string;
  schema: z.ZodType<any>;
  sections: string[];
  systemInstructions: string;
}

export const SYSTEM_TEMPLATES: Record<TemplateKey, SystemPromptTemplate> = {
  visual_bible: {
    key: "visual_bible",
    name: "Bíblia Visual do Projeto",
    version: 1,
    description: "Diretrizes estéticas mestras do projeto: paleta cromática, ótica, filosofia de câmera e regras de consistência global.",
    schema: visualBibleOutputSchema,
    sections: ["Identidade Visual", "Paleta de Cores", "Filosofia de Câmera", "Iluminação Mestre", "Continuidade Global", "Negativas"],
    systemInstructions: `Você é o Diretor de Fotografia e Supervisor de Efeitos Visuais mestre do Tomadix.
Sua missão é sintetizar os dados do projeto cinematográfico em uma "Bíblia Visual" consistente, detalhada e estruturada em JSON.
Preserve rigorosamente o gênero, o pacing e o perfil técnico de ferramentas indicado.
Defina paleta de cores concreta, filosofia de lentes (distância focal, profundidade de campo), regras globais de continuidade e prompts negativos essenciais.`,
  },
  character_definition: {
    key: "character_definition",
    name: "Definição de Personagem",
    version: 1,
    description: "Perfil visual permanente do personagem para manter consistência facial, figurino e traços físicos entre múltiplas tomadas.",
    schema: characterDefinitionOutputSchema,
    sections: ["Fisiologia", "Rosto e Cabelo", "Figurino Permanente", "Comportamento", "Prompt Base Compilado", "Negativas"],
    systemInstructions: `Você é o Concept Artist e Designer de Personagens do Tomadix.
Sua missão é gerar um perfil estruturado do personagem selecionado para motores de difusão de imagem e vídeo.
Separe com total rigor a identidade visual persistente (traços fisionômicos, idade aparente, cabelo, figurino mestre) de ações pontuais.
Gere um prompt-base compilado conciso e de alto impacto cinematográfico, além de termos negativos para evitar mutações.`,
  },
  environment_definition: {
    key: "environment_definition",
    name: "Definição de Ambiente",
    version: 1,
    description: "Diretrizes arquiteturais, espaciais, iluminação mestre e atmosfera de cenários recorrentes.",
    schema: environmentDefinitionOutputSchema,
    sections: ["Arquitetura", "Props e Espaço", "Iluminação Mestre", "Paleta de Cores", "Atmosfera e Clima", "Prompt Base Compilado"],
    systemInstructions: `Você é o Designer de Produção e Diretor de Arte do Tomadix.
Sua missão é compor o perfil estruturado de um ambiente cinematográfico para geração consistente de cenários.
Descreva a arquitetura, materiais, profundidade espacial, esquema de iluminação primária e atmosfera de partículas (névoa, poeira, chuva).
O prompt base deve servir como plano de estabelecimento (establishing shot) definitivo.`,
  },
  image_prompt: {
    key: "image_prompt",
    name: "Prompt de Imagem (Still Frame / Keyframe)",
    version: 1,
    description: "Prompt cinematográfico estático para geração de concept art, pôsteres ou quadros-chave (keyframes).",
    schema: imagePromptOutputSchema,
    sections: ["Composição", "Aspect Ratio", "Lente e Iluminação", "Estilo Artístico", "Prompt Positivo", "Negative Prompt"],
    systemInstructions: `Você é o Diretor de Fotografia especialista em still frames e concept art do Tomadix.
Sua missão é compor um prompt de imagem estática de altíssima fidelidade cinematográfica.
Especifique tipo de enquadramento, lente utilizada, relação de aspecto, iluminação pontual e estilo artístico.
O promptText deve ser altamente descritivo e pronto para uso em ferramentas de imagem.`,
  },
  video_prompt: {
    key: "video_prompt",
    name: "Prompt de Vídeo",
    version: 1,
    description: "Prompt para geração de movimento, ação cinematográfica contínua, dinâmicas de câmera e som.",
    schema: videoPromptOutputSchema,
    sections: ["Objetivo Narrativo", "Ação", "Câmera e Movimento", "Iluminação", "Som e Diálogo", "Continuidade", "Prompt Compilado"],
    systemInstructions: `Você é o Diretor de Cinema e Especialista em Modelos de Vídeo IA do Tomadix.
Sua missão é gerar um prompt de vídeo completo, descrevendo a ação física com clareza temporal, o movimento específico da câmera,
a transição espacial e as instruções sonoras e de diálogo.
Respeite o idioma configurado do projeto (especialmente se for pt-BR para diálogos) e as características da ferramenta de destino.`,
  },
  scene_sequence: {
    key: "scene_sequence",
    name: "Sequência de Cenas",
    version: 1,
    description: "Planejamento sequencial de tomadas conectadas com continuidade visual e ritmo de montagem.",
    schema: sceneSequenceOutputSchema,
    sections: ["Ritmo Narrativo", "Lista de Tomadas", "Transições", "Continuidade", "Atmosfera Global"],
    systemInstructions: `Você é o Montador e Editor Cinematográfico do Tomadix.
Sua missão é estruturar a sequência cronológica de cenas do projeto em um fluxo contínuo de decupagem.
Mantenha a coerência entre planos consecutivos, especificando o tipo de transição e notas de continuidade para evitar quebras visuais.`,
  },
  individual_scene: {
    key: "individual_scene",
    name: "Cena Individual",
    version: 1,
    description: "Decupagem técnica e prompt de produção para uma cena específica com diretrizes visuais e sonoras.",
    schema: individualSceneOutputSchema,
    sections: ["Ficha da Tomada", "Diretrizes Visuais", "Diretrizes Sonoras", "Prompt de Produção Compilado", "Negativas"],
    systemInstructions: `Você é o 1º Assistente de Direção e Continuísta do Tomadix.
Sua missão é gerar a folha de produção técnica e o prompt de geração cinematográfica de uma cena específica.
Conecte os personagens e ambientes participantes, a ação inicial e final, enquadramento e som em um prompt de produção completo.`,
  },
};

export function getSystemTemplate(key: TemplateKey): SystemPromptTemplate {
  const template = SYSTEM_TEMPLATES[key];
  if (!template) {
    throw new Error(`Template de prompt não encontrado para a chave: "${key}".`);
  }
  return template;
}
