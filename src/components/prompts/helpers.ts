

export function getTemplateCreditCost(templateKey: string): number {
  switch (templateKey) {
    case "image_prompt":
      return 2;
    case "video_prompt":
      return 8;
    case "visual_bible":
      return 10;
    case "character_definition":
      return 5;
    case "environment_definition":
      return 3;
    case "scene_sequence":
      return 12;
    case "individual_scene":
      return 5;
    default:
      return 2;
  }
}

