import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Deriva uma chave de 256 bits (32 bytes) a partir das variáveis de ambiente.
 * A chave de criptografia NUNCA é armazenada no banco de dados.
 */
function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.SESSION_SECRET ||
    "cineprompt-studio-super-master-key-32bytes-secret!";

  return crypto.createHash("sha256").update(secret).digest();
}

export interface EncryptedData {
  iv: string;
  data: string;
  authTag: string;
}

/**
 * Criptografa um objeto de credenciais confidenciais usando AES-256-GCM autenticado.
 */
export function encryptSecrets(credentials: Record<string, any>): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const plaintext = JSON.stringify(credentials);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    iv: iv.toString("hex"),
    data: encrypted,
    authTag,
  };
}

/**
 * Descriptografa um objeto de credenciais confidenciais.
 */
export function decryptSecrets(encrypted: EncryptedData | any): Record<string, any> {
  if (!encrypted || !encrypted.iv || !encrypted.data || !encrypted.authTag) {
    return {};
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getMasterKey(),
      Buffer.from(encrypted.iv, "hex"),
      { authTagLength: AUTH_TAG_LENGTH }
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, "hex"));

    let decrypted = decipher.update(encrypted.data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Falha ao descriptografar credenciais de gateway:", error);
    return {};
  }
}

/**
 * Mascara strings confidenciais para exibição segura na interface administrativa.
 * Nunca devolve o segredo completo ao cliente.
 */
export function maskSecretValue(value: string): string {
  if (!value || typeof value !== "string") return "";
  if (value.length <= 8) {
    return "••••••••";
  }

  const prefix = value.substring(0, Math.min(7, Math.floor(value.length / 4)));
  const suffix = value.substring(value.length - 4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Retorna uma versão mascarada de todas as chaves confidenciais.
 */
export function maskSecrets(credentials: Record<string, any>): Record<string, any> {
  if (!credentials || typeof credentials !== "object") return {};

  const masked: Record<string, any> = {};
  for (const [k, v] of Object.entries(credentials)) {
    if (typeof v === "string") {
      masked[k] = maskSecretValue(v);
    } else {
      masked[k] = v;
    }
  }
  return masked;
}
