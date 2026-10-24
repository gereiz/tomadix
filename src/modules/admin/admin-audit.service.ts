import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Sanitiza recursivamente objetos removendo campos confidenciais como senhas, tokens e segredos.
 */
function sanitizeAuditDetails(details: any): any {
  if (!details || typeof details !== "object") {
    return details;
  }

  if (Array.isArray(details)) {
    return details.map(sanitizeAuditDetails);
  }

  const sensitiveKeys = [
    "password",
    "passwordhash",
    "token",
    "tokenhash",
    "secret",
    "cookie",
    "credential",
    "authorization",
    "apikey",
    "privatekey",
  ];

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((s) => lowerKey.includes(s));

    if (isSensitive) {
      sanitized[key] = "[CONFIDENCIAL/REMOVIDO]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeAuditDetails(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface LogActionParams {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  result?: "SUCCESS" | "FAILURE";
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AdminAuditService {
  /**
   * Registra uma ação administrativa no log auditado da plataforma.
   * Garante a não-gravação de segredos e credenciais.
   */
  static async logAction(params: LogActionParams) {
    const sanitizedDetails = params.details ? sanitizeAuditDetails(params.details) : undefined;

    return db.platformAuditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        result: params.result || "SUCCESS",
        details: sanitizedDetails ? (sanitizedDetails as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  }

  /**
   * Consulta registros de auditoria com filtros e paginação.
   */
  static async listLogs(params: {
    action?: string;
    targetType?: string;
    targetId?: string;
    adminUserId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.PlatformAuditLogWhereInput = {};

    if (params.action) {
      where.action = params.action;
    }
    if (params.targetType) {
      where.targetType = params.targetType;
    }
    if (params.targetId) {
      where.targetId = params.targetId;
    }
    if (params.adminUserId) {
      where.adminUserId = params.adminUserId;
    }

    const [logs, total] = await Promise.all([
      db.platformAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          adminUser: {
            select: {
              id: true,
              email: true,
              displayName: true,
              platformRole: true,
            },
          },
        },
      }),
      db.platformAuditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
