import { PlanTier, SubscriptionStatus, BillingInterval, CreditOrigin, CreditLotStatus } from "@prisma/client";

export { PlanTier, SubscriptionStatus, BillingInterval, CreditOrigin, CreditLotStatus };

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthly: number; // em centavos (ex: 8900 = R$ 89,00)
  priceYearly: number;  // em centavos (ex: 89000 = R$ 890,00)
  currency: string;
  maxProjects: number;  // -1 para ilimitado
  unlimitedProjects?: boolean;
  maxMembers: number;
  unlimitedMembers?: boolean;
  monthlyCredits: number;
  adhesionCredits?: number;
  dailyCredits?: number;
  dailyCreditsAccumulative?: boolean;
  isFreePlan?: boolean;
  features: string[];
  enabledTemplates: string[]; // ["*"] para todos
  exportAllowed: boolean;
  visualBibleAdvanced: boolean;
}

export interface WorkspaceUsageSummary {
  workspaceId: string;
  workspaceName: string;
  planTier: PlanTier;
  planName: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  projectsCount: number;
  maxProjects: number;
  membersCount: number;
  maxMembers: number;
  creditsBalance: number;
  monthlyCredits: number;
  adhesionCredits?: number;
  dailyCredits?: number;
  dailyCreditsAccumulative?: boolean;
  canCreateProject: boolean;
  canAddMember: boolean;
  features: string[];
}

export interface NormalizedWebhookEvent {
  id: string; // Event ID único para idempotência
  type:
    | "checkout.completed"
    | "subscription.updated"
    | "subscription.canceled"
    | "invoice.paid"
    | "invoice.payment_failed"
    | "unknown";
  timestamp: Date;
  customerId?: string;
  subscriptionId?: string;
  workspaceId?: string;
  billingUserId?: string;
  planTier?: PlanTier;
  interval?: BillingInterval;
  status?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  amountPaid?: number; // em centavos
  currency?: string;
  invoiceId?: string;
  hostedInvoiceUrl?: string;
  rawPayload: any;
}
