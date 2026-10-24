import { db } from "@/lib/db";
import { AdminAuditService } from "@/modules/admin/admin-audit.service";

export interface RecordConsentParams {
  userId: string;
  consentType: string; // "TERMS_OF_SERVICE" | "PRIVACY_POLICY" | "MARKETING_EMAILS" | "AI_DATA_PROCESSING"
  version: string;
  granted?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateDsrParams {
  userId?: string;
  email: string;
  requestType: "ACCESS" | "RECTIFICATION" | "DELETION" | "REVOCATION" | "PORTABILITY";
  details?: string;
}

export class PrivacyService {
  /**
   * Registra o consentimento ou revogação formal de um usuário (Art. 7º e 8º da LGPD).
   */
  static async recordConsent(params: RecordConsentParams) {
    return db.consentRecord.create({
      data: {
        userId: params.userId,
        consentType: params.consentType,
        version: params.version,
        granted: params.granted !== undefined ? params.granted : true,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  }

  /**
   * Verifica se o usuário possui consentimento ativo concedido para determinado termo.
   */
  static async hasActiveConsent(userId: string, consentType: string, version?: string): Promise<boolean> {
    const where: any = {
      userId,
      consentType,
      granted: true,
    };
    if (version) {
      where.version = version;
    }
    const record = await db.consentRecord.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });
    return !!record;
  }

  /**
   * Lista o histórico de consentimentos de um titular.
   */
  static async listUserConsents(userId: string) {
    return db.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Cria uma solicitação formal de Direitos do Titular (Art. 18 da LGPD - DSAR).
   */
  static async createDataSubjectRequest(params: CreateDsrParams) {
    return db.dataSubjectRequest.create({
      data: {
        userId: params.userId || null,
        email: params.email.trim().toLowerCase(),
        requestType: params.requestType,
        status: "PENDING",
        details: params.details || null,
      },
    });
  }

  /**
   * Lista as solicitações de titulares para a administração da plataforma.
   */
  static async listDataSubjectRequests(params: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }

    const [requests, total] = await Promise.all([
      db.dataSubjectRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      db.dataSubjectRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Atualiza o status e registra o desfecho de uma solicitação de titular com auditoria.
   */
  static async resolveDataSubjectRequest(
    adminUserId: string,
    requestId: string,
    resolution: string,
    status: "COMPLETED" | "REJECTED" | "IN_REVIEW",
    context?: { ip?: string; ua?: string }
  ) {
    const dsr = await db.dataSubjectRequest.findUnique({
      where: { id: requestId },
    });

    if (!dsr) {
      throw new Error("Solicitação de titular não encontrada.");
    }

    const updated = await db.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status,
        resolution,
        resolvedAt: status === "COMPLETED" || status === "REJECTED" ? new Date() : null,
      },
    });

    await AdminAuditService.logAction({
      adminUserId,
      action: `DSR_${status}`,
      targetType: "DataSubjectRequest",
      targetId: requestId,
      result: "SUCCESS",
      details: {
        requestEmail: dsr.email,
        requestType: dsr.requestType,
        resolution,
        status,
      },
      ipAddress: context?.ip,
      userAgent: context?.ua,
    });

    return updated;
  }
}
