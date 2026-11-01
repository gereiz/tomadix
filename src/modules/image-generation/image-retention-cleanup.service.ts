import { db } from "@/lib/db";
import { ImageStorageService } from "./image-storage.service";
import { SubscriptionStatus } from "@prisma/client";

export interface CleanupResult {
  timestamp: string;
  totalDeleted: number;
  workspacesScanned: number;
  details: Array<{
    workspaceId: string;
    planTier: string;
    retentionDays: number;
    deletedCount: number;
  }>;
}

export class ImageRetentionCleanupService {
  /**
   * Executa a limpeza automática de imagens geradas expiradas com base na política de retenção de cada plano.
   */
  static async cleanupExpiredImages(): Promise<CleanupResult> {
    const details: CleanupResult["details"] = [];
    let totalDeleted = 0;
    let workspacesScanned = 0;

    // 1. Obter todos os planos cadastrados
    const plans = await db.plan.findMany({
      where: {
        unlimitedImageRetention: false,
        imageRetentionDays: { gt: 0 },
      },
    });

    for (const plan of plans) {
      const retentionDays = plan.imageRetentionDays;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // 2. Buscar todas as assinaturas vinculadas a este plano
      const subscriptions = await db.subscription.findMany({
        where: {
          planTier: plan.tier,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
        },
        select: { workspaceId: true },
      });

      const workspaceIds = subscriptions.map((s) => s.workspaceId);

      for (const workspaceId of workspaceIds) {
        workspacesScanned++;

        const expiredImages = await db.generatedImage.findMany({
          where: {
            workspaceId,
            createdAt: { lt: cutoffDate },
          },
          select: {
            id: true,
            imageUrl: true,
            storageKey: true,
          },
        });

        if (expiredImages.length === 0) continue;

        let deletedForWorkspace = 0;

        for (const img of expiredImages) {
          try {
            // Excluir arquivos físicos
            await ImageStorageService.deleteImage(img.imageUrl);
            if (img.storageKey) {
              await ImageStorageService.deleteImage(img.storageKey);
            }

            // Excluir registro do banco
            await db.generatedImage.delete({
              where: { id: img.id },
            });

            deletedForWorkspace++;
          } catch (err) {
            console.warn(`[ImageRetentionCleanup] Erro ao excluir imagem expirada ${img.id}:`, err);
          }
        }

        if (deletedForWorkspace > 0) {
          totalDeleted += deletedForWorkspace;
          details.push({
            workspaceId,
            planTier: plan.tier,
            retentionDays,
            deletedCount: deletedForWorkspace,
          });
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalDeleted,
      workspacesScanned,
      details,
    };
  }
}

