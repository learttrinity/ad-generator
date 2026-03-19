import type {
  User,
  Client,
  BrandProfile,
  ClientAsset,
  Campaign,
  GenerationRun,
  CreativeAsset,
  ClientDriveMapping,
  UserRole,
  ClientStatus,
  BrandProfileStatus,
  CampaignStatus,
  GenerationRunStatus,
  CreativeAssetStatus,
  ClientAssetType,
} from "@prisma/client";

export type {
  User,
  Client,
  BrandProfile,
  ClientAsset,
  Campaign,
  GenerationRun,
  CreativeAsset,
  ClientDriveMapping,
  UserRole,
  ClientStatus,
  BrandProfileStatus,
  CampaignStatus,
  GenerationRunStatus,
  CreativeAssetStatus,
  ClientAssetType,
};

// ─── Extended types with relations ───────────────────────────────────────────

export type ClientWithProfile = Client & {
  brandProfile: (Pick<BrandProfile, "approved" | "confidenceScore" | "reviewStatus" | "primaryColor">) | null;
  _count: { campaigns: number };
};

export type CampaignWithClient = Campaign & {
  client: Pick<Client, "id" | "name" | "initials">;
  _count: { runs: number };
};

export type GenerationRunWithAssets = GenerationRun & {
  assets: CreativeAsset[];
};

// ─── Brand Profile form types ─────────────────────────────────────────────────

export type ComponentRules = {
  pricingStyle?: string;
  overlayStyle?: string;
  logoProminence?: string;
  borderRadiusStyle?: string;
  textDensity?: string;
  urgencyStyle?: string;
};

export type Restrictions = {
  forbiddenColors: string[];
  forbiddenStyles: string[];
  forbiddenWording: string[];
  notes: string;
};

// ─── Form input types ─────────────────────────────────────────────────────────

export type ClientFormInput = {
  initials: string;
  name: string;
  website?: string;
  instagram?: string;
  status: ClientStatus;
};

export type CampaignFormInput = {
  clientId: string;
  title: string;
  offerType: string;
  headline: string;
  subheadline?: string;
  urgencyText?: string;
  ctaText?: string;
  locationLine?: string;
  startDate?: string;
  priceNew?: string;
  priceOld?: string;
  billingInterval?: string;
  contractTerm?: string;
  notes?: string;
  status: CampaignStatus;
  aworkTaskId?: string;
};

// ─── NextAuth session extension ───────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}
