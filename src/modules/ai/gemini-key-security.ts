import crypto from "crypto";

// Chave mestra de criptografia obtida de variável de ambiente ou derivada
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Deriva uma chave simétrica de 32 bytes compatível com AES-256 a partir do segredo.
 */
function getDerivedKey(): Buffer {
  const secret = process.env.TOMADIX_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "TOMADIX_ENCRYPTION_KEY (ou NEXTAUTH_SECRET) não está definido. Defina a variável de ambiente antes de iniciar em produção."
    );
  }
  // Fallback fixo apenas para desenvolvimento/testes.
  const effective = secret || "tomadix-secure-gemini-key-encryption-secret-32b";
  return crypto.createHash("sha256").update(effective).digest();
}

/**
 * Mascara uma API Key para exibição segura na interface (ex: AIzaSy...X9kP).
 * Nunca expõe o corpo central da chave.
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== "string") {
    return "••••••••";
  }
  const clean = apiKey.trim();
  if (clean.length <= 10) {
    return clean.slice(0, 3) + "..." + clean.slice(-2);
  }
  const prefix = clean.slice(0, 6);
  const suffix = clean.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Criptografa a API Key antes de persistir no banco de dados.
 */
export function encryptApiKey(plainKey: string): string {
  if (!plainKey) return "";
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Formato: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Descriptografa a API Key para uso exclusivo na execução de requisições no backend.
 */
export function decryptApiKey(encryptedData: string): string {
  if (!encryptedData) return "";
  
  // Se a chave não estiver no formato iv:tag:encrypted (ex: chave legada em texto puro), retorna diretamente
  if (!encryptedData.includes(":")) {
    return encryptedData;
  }

  try {
    const [ivHex, tagHex, encryptedHex] = encryptedData.split(":");
    if (!ivHex || !tagHex || !encryptedHex) {
      return encryptedData;
    }

    const key = getDerivedKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // Se falhar a descriptografia, pode ser texto puro prévio
    return encryptedData;
  }
}

