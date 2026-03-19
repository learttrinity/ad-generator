import {
  PrismaClient,
  UserRole,
  ClientStatus,
  CampaignStatus,
  BrandProfileStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Users ────────────────────────────────────────────────────────────────
  const adminPw = await bcrypt.hash("admin123", 12);
  const userPw = await bcrypt.hash("user123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@trinity.de" },
    update: {},
    create: { email: "admin@trinity.de", name: "Admin Trinity", password: adminPw, role: UserRole.ADMIN },
  });

  const user1 = await prisma.user.upsert({
    where: { email: "anna@trinity.de" },
    update: {},
    create: { email: "anna@trinity.de", name: "Anna Müller", password: userPw, role: UserRole.USER },
  });

  console.log("✅ Users:", admin.email, user1.email);

  // ─── Font Library ─────────────────────────────────────────────────────────
  await prisma.fontLibrary.createMany({
    skipDuplicates: true,
    data: [
      { name: "Inter",            classification: "sans-serif" },
      { name: "Montserrat",       classification: "sans-serif" },
      { name: "Playfair Display", classification: "serif"      },
      { name: "Oswald",           classification: "display"    },
      { name: "Roboto",           classification: "sans-serif" },
    ],
  });

  // ─── Clients ──────────────────────────────────────────────────────────────
  const client1 = await prisma.client.upsert({
    where: { id: "seed-client-1" },
    update: {},
    create: {
      id: "seed-client-1", initials: "FP",
      name: "FitnessPark Hamburg",
      website: "https://www.fitnesspark-hamburg.de",
      instagram: "@fitnesspark_hh",
      status: ClientStatus.AKTIV,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "seed-client-2" },
    update: {},
    create: {
      id: "seed-client-2", initials: "MS",
      name: "McFit Studios Berlin",
      website: "https://www.mcfit-berlin.de",
      status: ClientStatus.AKTIV,
    },
  });

  const client3 = await prisma.client.upsert({
    where: { id: "seed-client-3" },
    update: {},
    create: {
      id: "seed-client-3", initials: "YO",
      name: "Yoga & Soul München",
      website: "https://www.yoga-soul-muenchen.de",
      instagram: "@yogasoul_munich",
      status: ClientStatus.AKTIV,
    },
  });

  console.log("✅ Clients:", client1.name, client2.name, client3.name);

  // ─── Brand Profiles ───────────────────────────────────────────────────────
  await prisma.brandProfile.upsert({
    where: { clientId: "seed-client-1" },
    update: {},
    create: {
      clientId: "seed-client-1",
      primaryColor: "#E63946",
      secondaryColors: ["#1D3557", "#457B9D"],
      accentColors: ["#F4A261"],
      neutralPalette: ["#F1FAEE", "#FFFFFF", "#1A1A2E"],
      fontPrimary: "Montserrat",
      fontSecondary: "Inter",
      fallbackFontPrimary: "Roboto",
      typographyClass: "Neo-Grotesk",
      visualTone: "Energetisch",
      imageTone: "Hochkontrast",
      componentRules: {
        pricingStyle: "dominant",
        overlayStyle: "solid",
        logoProminence: "mittel",
        borderRadiusStyle: "soft",
        textDensity: "mittel",
        urgencyStyle: "auffällig",
      },
      restrictions: {
        forbiddenColors: [],
        forbiddenStyles: ["Stockfoto-Look", "Pastellfarben"],
        forbiddenWording: ["günstig"],
        notes: "",
      },
      confidenceScore: 0.85,
      reviewStatus: BrandProfileStatus.FREIGEGEBEN,
      approved: true,
    },
  });

  await prisma.brandProfile.upsert({
    where: { clientId: "seed-client-3" },
    update: {},
    create: {
      clientId: "seed-client-3",
      primaryColor: "#7B9E87",
      secondaryColors: ["#F2E8DC", "#C9B99A"],
      accentColors: ["#D4A5A5"],
      neutralPalette: ["#FAF7F2", "#FFFFFF"],
      fontPrimary: "Playfair Display",
      fontSecondary: "Inter",
      typographyClass: "Elegante Serif",
      visualTone: "Boutique",
      imageTone: "Premium",
      componentRules: {
        pricingStyle: "dezent",
        overlayStyle: "transparent",
        logoProminence: "klein",
        borderRadiusStyle: "rounded",
        textDensity: "niedrig",
        urgencyStyle: "none",
      },
      restrictions: {
        forbiddenColors: [],
        forbiddenStyles: ["hartes Blitzlicht", "Aggressive Kontraste"],
        forbiddenWording: [],
        notes: "Ruhiger, hochwertiger Auftritt. Keine zu direkten Verkaufsaussagen.",
      },
      confidenceScore: 0.62,
      reviewStatus: BrandProfileStatus.IN_PRUEFUNG,
      approved: false,
    },
  });

  console.log("✅ Brand profiles created");

  // ─── Campaigns ────────────────────────────────────────────────────────────
  const campaign1 = await prisma.campaign.upsert({
    where: { id: "seed-campaign-1" },
    update: {},
    create: {
      id: "seed-campaign-1",
      clientId: "seed-client-1",
      title: "Sommeraktion 2025 – Mitgliedschaft",
      offerType: "Mitgliedschaft",
      headline: "Jetzt Mitglied werden & 2 Monate gratis trainieren",
      subheadline: "Dein Sommer-Deal bei FitnessPark Hamburg",
      urgencyText: "Nur bis 31. August 2025",
      ctaText: "Jetzt sichern",
      locationLine: "Hamburg-Mitte · Mo–So 6–23 Uhr",
      startDate: new Date("2025-06-01"),
      priceNew: 29.9, priceOld: 49.9,
      billingInterval: "monatlich", contractTerm: "12 Monate",
      notes: "Fokus auf junge Erwachsene 20–35, Social-First-Kampagne",
      status: CampaignStatus.BEREIT,
      createdById: user1.id,
    },
  });

  await prisma.campaign.upsert({
    where: { id: "seed-campaign-2" },
    update: {},
    create: {
      id: "seed-campaign-2",
      clientId: "seed-client-1",
      title: "Back to School – Studentenrabatt",
      offerType: "Rabattaktion",
      headline: "Studenten trainieren günstiger – 40% Rabatt",
      subheadline: "Exklusiv für Studenten & Azubis",
      urgencyText: "September & Oktober",
      ctaText: "Rabatt sichern",
      priceNew: 19.9, priceOld: 33.0,
      billingInterval: "monatlich",
      status: CampaignStatus.ENTWURF,
      createdById: user1.id,
    },
  });

  await prisma.campaign.upsert({
    where: { id: "seed-campaign-3" },
    update: {},
    create: {
      id: "seed-campaign-3",
      clientId: "seed-client-3",
      title: "Herbst-Yoga-Retreat Anmeldung",
      offerType: "Kurs / Event",
      headline: "Herbst-Retreat: 3 Tage Yoga & Entschleunigung",
      subheadline: "Bayerische Alpen, Oktober 2025",
      ctaText: "Jetzt anmelden",
      locationLine: "Berchtesgaden, Bayern",
      priceNew: 490.0, billingInterval: "einmalig",
      status: CampaignStatus.ENTWURF,
      createdById: admin.id,
    },
  });

  console.log("✅ Campaigns created");

  // ─── Generation Run ────────────────────────────────────────────────────────
  await prisma.generationRun.upsert({
    where: { campaignId_runNumber: { campaignId: "seed-campaign-1", runNumber: 1 } },
    update: {},
    create: {
      campaignId: "seed-campaign-1",
      runNumber: 1,
      directionKey: "klar_preisfokus",
      directionSummary: "Kräftige Typografie, Preis im Fokus, rote Akzente",
      directionMode: "automatisch",
      environmentMode: "STANDARD_STUDIO",
      messagePriority: "preisfokussiert",
      placements: ["feed_1080x1080", "story_1080x1920"],
      audienceMatrix: [
        { audience: "general", placement: "feed_1080x1080" },
        { audience: "general", placement: "story_1080x1920" },
        { audience: "young_adults", placement: "feed_1080x1080" },
        { audience: "young_adults", placement: "story_1080x1920" },
      ],
      normalizedPayload: {
        headline: "Jetzt Mitglied werden & 2 Monate gratis trainieren",
        subheadline: "Dein Sommer-Deal bei FitnessPark Hamburg",
        urgencyText: "Nur bis 31. August 2025",
        ctaText: "Jetzt sichern",
        locationLine: "Hamburg-Mitte · Mo–So 6–23 Uhr",
        priceNew: "29,90",
        priceOld: "49,90",
        showOldPrice: true,
        billingInterval: "monatlich",
        contractTerm: "12 Monate",
        offerType: "Mitgliedschaft",
      },
      warnings: [],
      manualOverrides: {},
      status: "FERTIG",
      totalAssets: 4,
      completedAssets: 4,
      failedAssets: 0,
      progressPercent: 100,
      triggeredById: user1.id,
      startedAt: new Date("2025-07-10T10:00:00Z"),
      finishedAt: new Date("2025-07-10T10:02:34Z"),
    },
  });

  console.log("✅ Generation run created");

  // ─── Seed creative assets for run 1 ────────────────────────────────────────
  const seedRun = await prisma.generationRun.findUnique({
    where: { campaignId_runNumber: { campaignId: "seed-campaign-1", runNumber: 1 } },
  });

  if (seedRun) {
    const assetMatrix = [
      { audienceKey: "frau_25_30", placement: "feed_1080x1080", dimensions: "1080x1080" },
      { audienceKey: "frau_25_30", placement: "story_1080x1920", dimensions: "1080x1920" },
      { audienceKey: "mann_25_30", placement: "feed_1080x1080", dimensions: "1080x1080" },
      { audienceKey: "mann_25_30", placement: "story_1080x1920", dimensions: "1080x1920" },
    ];

    for (const entry of assetMatrix) {
      // Use upsert-like logic: delete existing and recreate, or just try to create
      const existing = await prisma.creativeAsset.findFirst({
        where: { generationRunId: seedRun.id, audienceKey: entry.audienceKey, placement: entry.placement },
      });
      if (!existing) {
        await prisma.creativeAsset.create({
          data: {
            generationRunId: seedRun.id,
            audienceKey: entry.audienceKey,
            placement: entry.placement,
            dimensions: entry.dimensions,
            imagePrompt: `ultra-realistic commercial fitness photography, 50mm lens, full-frame camera, ${entry.audienceKey === "frau_25_30" ? "athletic woman, 25 to 30 years old" : "athletic man, 25 to 30 years old"}, athletic and toned, natural realistic physique, approachable commercial look, standing in a confident composed pose, wearing clean minimalist fitness clothing, solid neutral or dark tones, no logos, no text, clean commercial studio, sharp contrast, neutral gradient backdrop, ${entry.placement.includes("story") ? "vertical portrait composition, subject centered with breathing room above and below" : "balanced square composition, subject clearly visible and centered"}, soft box key light, even fill, clean commercial studio lighting, premium fitness advertising campaign quality, natural skin texture, sharp commercial focus, ad-ready composition, no watermarks, no text in image, no logos in image`,
            negativePrompt: "text, letters, words, numbers, logos, brand marks, watermarks, extra limbs, deformed anatomy, bad proportions, low quality, blurry, phone camera quality, random gym clutter, other people, flat lighting, plastic skin",
            promptBlocks: {
              qualityPreamble: "ultra-realistic commercial fitness photography, 50mm lens, full-frame camera, sharp focus, professional advertising quality",
              subjectBlock: `${entry.audienceKey === "frau_25_30" ? "athletic woman, 25 to 30 years old" : "athletic man, 25 to 30 years old"}, athletic and toned, natural realistic physique, approachable commercial look, premium fitness campaign subject`,
              poseBlock: "standing in a confident composed pose, looking slightly off-camera, relaxed and assured, premium fitness model posture, energetic natural presence",
              wardrobeBlock: "wearing clean minimalist fitness clothing, solid neutral or dark tones, no logos, no text, unbranded athletic wear",
              environmentBlock: "clean commercial studio, sharp contrast, neutral gradient backdrop, no gym equipment cluttering the frame, no other people, clean professional backdrop",
              compositionBlock: entry.placement.includes("story") ? "vertical portrait composition, subject centered with breathing room above and below, generous negative space in upper and lower thirds for text overlays, safe zone maintained" : "balanced square composition, subject clearly visible and centered, moderate negative space on sides for text copy, clean framing",
              lightingBlock: "soft box key light, even fill, clean commercial studio lighting, skin texture looks natural, no harsh underexposure, no blown-out highlights",
              finishBlock: "premium fitness advertising campaign quality, natural skin texture, sharp commercial focus, ad-ready composition, no watermarks, no text in image, no logos in image",
            },
            provider: "mock",
            providerJobId: `mock_seed_${entry.audienceKey}_${entry.placement}`,
            providerResponse: { mock: true },
            baseImageUrl: `https://placehold.co/${entry.dimensions}/1a1a2e/ffffff/png?text=BASE+IMAGE%0A${entry.dimensions}`,
            status: "FERTIG",
          },
        });
      }
    }
    console.log("✅ Creative assets created");
  }
  console.log("\n🎉 Seed complete!");
  console.log("\nTestzugänge:");
  console.log("  Admin: admin@trinity.de / admin123");
  console.log("  User:  anna@trinity.de  / user123");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
