# API Patterns & Conventions

## Auth pattern in API routes

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // ...
}
```

## Prisma singleton

Always import from `@/lib/prisma`:
```typescript
import { prisma } from "@/lib/prisma";
```
Never instantiate `new PrismaClient()` directly.

## Activity logging

Use `logActivity()` from `src/lib/adminActivity.ts`. It is silent-fail — never throws.
```typescript
import { logActivity } from "@/lib/adminActivity";

await logActivity({
  userId: session.user.id,
  userName: session.user.name ?? session.user.email,
  action: "Benutzer erstellt",
  entity: "User",
  entityId: newUser.id,
  details: `E-Mail: ${newUser.email}`,
});
```

## Encryption for stored secrets

```typescript
import { encrypt, decrypt } from "@/lib/encryption";

const encrypted = encrypt(plaintext);   // returns "iv:ciphertext" hex string
const plaintext = decrypt(encrypted);   // reverses it
```
Requires `APP_ENCRYPTION_KEY` env var (32-byte hex). If key is wrong, decrypt throws.

## Error response shape

All API errors follow this shape:
```json
{ "error": "Human-readable message" }
```
With appropriate HTTP status code (400, 401, 403, 404, 500).

## File uploads

Uploads go through `POST /api/upload` with multipart form data:
- `file`: the binary file
- `clientId`: the client this asset belongs to
- `assetType`: `ClientAssetType` enum value

Files are saved to `public/uploads/{clientId}/{filename}` and a `ClientAsset` record is created.

## Prisma schema changes

```bash
# After editing prisma/schema.prisma:
npx prisma db push         # applies changes to local DB
npx prisma generate        # regenerates Prisma client types

# NEVER use:
npx prisma migrate dev     # requires interactive input, breaks in shell
```

## Repository pattern

All DB queries go through repositories in `src/repositories/`:
- `clientRepository` — Client queries
- `brandProfileRepository` — BrandProfile queries
- `campaignRepository` — Campaign queries
- `generationRunRepository` — GenerationRun queries + progress updates
- `creativeAssetRepository` — CreativeAsset queries + status updates
- `clientAssetRepository` — ClientAsset (logos, PDFs) queries

Services call repositories, not Prisma directly (in most cases).
Some older API routes still call `prisma` directly — this is acceptable.

## IntegrationSetting keys

| Key | Value type | Notes |
|---|---|---|
| `image_provider.active` | `"higgsfield"` \| `"mock"` | Provider selection |
| `anthropic.api_key` | encrypted string | Claude API key |
| `google.drive.credentials` | encrypted JSON | Drive OAuth credentials |

## AppSetting keys

| Key | Example value |
|---|---|
| `agency.name` | `"Trinity Fitness Marketing"` |
| `agency.timezone` | `"Europe/Berlin"` |
| `generation.default_offer_type` | `"mitgliedschaft"` |
| `generation.max_runs_per_day` | `"50"` |
| `notifications.email_enabled` | `"true"` \| `"false"` |
