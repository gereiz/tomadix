import {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageModelDefinition,
  ImageProviderCapabilities,
  ImageConnectionTestResult,
} from "./image-generation.types";

export interface ImageGenerationProvider {
  /** Identificador único do provedor (ex: "pollinations") */
  readonly id: string;
  
  /** Nome amigável de exibição */
  readonly name: string;

  /** Consulta as capacidades estruturais do provedor */
  getCapabilities(): ImageProviderCapabilities;

  /** Consulta a lista de modelos suportados e dinamicamente disponibilizados pela API */
  listModels(apiKey?: string, baseUrl?: string): Promise<ImageModelDefinition[]>;

  /** Realiza teste de conexão e validação de autenticação sem gerar imagem nem consumir saldo de usuário */
  testConnection(apiKey: string, baseUrl?: string): Promise<ImageConnectionTestResult>;

  /** Executa a geração direta de imagem a partir das opções fornecidas */
  generateImage(
    options: ImageGenerationOptions,
    apiKey: string,
    baseUrl?: string
  ): Promise<ImageGenerationResult>;
}

