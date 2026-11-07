import type { EntityFormState } from "@/components/entities/use-entity-form";
import type { EntityAiState } from "@/components/entities/use-entity-ai";

export interface CharacterItem {
  id: string;
  projectId: string;
  name: string;
  description: string;
  attributes: {
    imageUrl?: string;
    visualIdentity?: string;
    physicalCharacteristics?: string;
    apparentAge?: string;
    hairAndFace?: string;
    costumeAndAccessories?: string;
    personalityAndBehavior?: string;
    voiceAndLanguage?: string;
    restrictions?: string;
    basePrompt?: string;
  };
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sceneLinks: number;
  };
}

export interface CharacterFormData extends Record<string, string> {
  name: string;
  description: string;
  apparentAge: string;
  visualIdentity: string;
  physicalCharacteristics: string;
  hairAndFace: string;
  costumeAndAccessories: string;
  personalityAndBehavior: string;
  voiceAndLanguage: string;
  restrictions: string;
  basePrompt: string;
}

export const EMPTY_CHARACTER_FORM: CharacterFormData = {
  name: "",
  description: "",
  apparentAge: "",
  visualIdentity: "",
  physicalCharacteristics: "",
  hairAndFace: "",
  costumeAndAccessories: "",
  personalityAndBehavior: "",
  voiceAndLanguage: "",
  restrictions: "",
  basePrompt: "",
};

export function characterToForm(entity: CharacterItem): CharacterFormData {
  const attrs = entity.attributes || {};
  return {
  name: entity.name || "",
  description: entity.description || "",
  apparentAge: attrs.apparentAge || "",
  visualIdentity: attrs.visualIdentity || "",
  physicalCharacteristics: attrs.physicalCharacteristics || "",
  hairAndFace: attrs.hairAndFace || "",
  costumeAndAccessories: attrs.costumeAndAccessories || "",
  personalityAndBehavior: attrs.personalityAndBehavior || "",
  voiceAndLanguage: attrs.voiceAndLanguage || "",
  restrictions: attrs.restrictions || "",
  basePrompt: attrs.basePrompt || "",
  };
}

export type CharacterAiFields = {
  archetype: string;
  role: string;
};

export type CharacterFormState = EntityFormState<CharacterItem, CharacterFormData>;
export type CharacterAiState = EntityAiState<CharacterAiFields>;
