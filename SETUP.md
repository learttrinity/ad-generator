# Trinity Ad Generator – Setup

## Phase 3 Update (Kampagnen-System & Generierungs-Setup)

Nach dem Phase-3-Update: Schema geändert (neue Felder in `Campaign` + `GenerationRun`, neue Enum-Werte).

```bash
# Bestehende DB zurücksetzen und neu aufbauen
npm run db:push
npm run db:seed
```

Oder falls du eine bestehende DB hast und Daten behalten willst:
```bash
npm run db:migrate   # erstellt eine Migration
```

---

## Voraussetzungen

- Node.js 18+ und npm (oder pnpm/yarn)
- PostgreSQL (lokal oder via Docker)
- Git

---

## 1. Node.js installieren (falls noch nicht vorhanden)

```bash
# Empfohlen: via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc   # oder ~/.bashrc
nvm install 20
nvm use 20
```

---

## 2. Abhängigkeiten installieren

```bash
cd trinity-ad-generator
npm install
```

---

## 3. PostgreSQL starten

### Option A – Docker (empfohlen)
```bash
docker run --name trinity-db \
  -e POSTGRES_USER=trinity \
  -e POSTGRES_PASSWORD=trinity123 \
  -e POSTGRES_DB=trinity_ad_generator \
  -p 5432:5432 \
  -d postgres:16
```

### Option B – Homebrew (macOS)
```bash
brew install postgresql@16
brew services start postgresql@16
createdb trinity_ad_generator
```

---

## 4. Umgebungsvariablen einrichten

```bash
cp .env.example .env.local
```

`.env.local` anpassen:
```
DATABASE_URL="postgresql://trinity:trinity123@localhost:5432/trinity_ad_generator"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

> `NEXTAUTH_SECRET` bitte mit `openssl rand -base64 32` generieren.

---

## 5. Datenbank einrichten

```bash
# Schema in die DB schreiben (erstellt alle Tabellen)
npm run db:push

# Testdaten einspielen
npm run db:seed
```

---

## 6. Entwicklungsserver starten

```bash
npm run dev
```

App ist verfügbar unter: **http://localhost:3000**

---

## Testzugänge

| Rolle       | E-Mail             | Passwort  |
|-------------|---------------------|-----------|
| Admin       | admin@trinity.de    | admin123  |
| Benutzer    | anna@trinity.de     | user123   |

---

## Verfügbare npm-Skripte

| Befehl            | Beschreibung                          |
|-------------------|---------------------------------------|
| `npm run dev`     | Entwicklungsserver starten            |
| `npm run build`   | Produktions-Build erstellen           |
| `npm run db:push` | Schema in DB schreiben (kein Migration-File) |
| `npm run db:migrate` | Migration erstellen & ausführen   |
| `npm run db:seed` | Testdaten einspielen                  |
| `npm run db:studio` | Prisma Studio öffnen (DB-Browser)  |
| `npm run db:reset` | DB komplett zurücksetzen             |

---

## Projektstruktur (kurz)

```
trinity-ad-generator/
├── prisma/
│   ├── schema.prisma       ← Alle Datenbankmodelle
│   └── seed.ts             ← Testdaten
└── src/
    ├── app/
    │   ├── (auth)/login/   ← Login-Seite
    │   ├── (app)/          ← Geschützter App-Bereich
    │   │   ├── kunden/     ← Kunden CRUD
    │   │   ├── kampagnen/  ← Kampagnen CRUD
    │   │   ├── markenprofile/
    │   │   ├── generator/
    │   │   ├── historie/
    │   │   └── admin/
    │   └── api/            ← REST API Routes
    ├── components/
    │   ├── ui/             ← Button, Input, Select, Badge, Card...
    │   ├── layout/         ← Sidebar, Header
    │   └── forms/          ← KundeForm, KampagneForm
    ├── services/           ← Business-Logik + Zod-Validierung
    ├── repositories/       ← Datenbankabfragen (Prisma)
    ├── lib/                ← prisma.ts, auth.ts, utils.ts
    └── types/              ← Globale TypeScript-Typen
```
