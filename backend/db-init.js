// Création du schéma de la base s'il n'existe pas encore.
// Toutes les instructions utilisent IF NOT EXISTS : sans effet sur une base déjà initialisée.
// Les colonnes sont déduites des requêtes de server-pg.js et des champs lus par le frontend.

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "User" (
  id                  SERIAL PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  password            TEXT NOT NULL,
  name                TEXT,
  role                TEXT NOT NULL DEFAULT 'LISTENER',
  "artistName"        TEXT,
  bio                 TEXT,
  country             TEXT,
  socials             JSONB,
  "profilePic"        TEXT,
  "emailVerified"     BOOLEAN NOT NULL DEFAULT false,
  "verificationToken" TEXT,
  "verificationTokenExpiry" TIMESTAMPTZ,
  "resetToken"        TEXT,
  "resetTokenExpiry"  TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_key" ON "User" (LOWER(email));
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "Song" (
  id                SERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  artist            TEXT,
  genre             TEXT,
  description       TEXT,
  credits           JSONB,
  "audioFile"       TEXT,
  "coverArt"        TEXT,
  duration          INTEGER,
  plays             INTEGER NOT NULL DEFAULT 0,
  "artistId"        INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  "isVerified"      BOOLEAN NOT NULL DEFAULT false,
  "rejectionReason" TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Song_status_idx" ON "Song" (status);
CREATE INDEX IF NOT EXISTS "Song_artistId_idx" ON "Song" ("artistId");

CREATE TABLE IF NOT EXISTS "Favorite" (
  id          SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "songId"    INTEGER NOT NULL REFERENCES "Song"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "songId")
);

CREATE TABLE IF NOT EXISTS "Playlist" (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  "isPublic"  BOOLEAN NOT NULL DEFAULT true,
  "userId"    INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PlaylistSong" (
  id           SERIAL PRIMARY KEY,
  "playlistId" INTEGER NOT NULL REFERENCES "Playlist"(id) ON DELETE CASCADE,
  "songId"     INTEGER NOT NULL REFERENCES "Song"(id) ON DELETE CASCADE,
  "addedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("playlistId", "songId")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  id          SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type        TEXT,
  title       TEXT,
  message     TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Comment" (
  id          SERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  "userId"    INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "songId"    INTEGER NOT NULL,
  "parentId"  INTEGER REFERENCES "Comment"(id) ON DELETE CASCADE,
  likes       INTEGER NOT NULL DEFAULT 0,
  "likedBy"   JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Comment_songId_idx" ON "Comment" ("songId");
`;

export async function ensureSchema(pool) {
  await pool.query(SCHEMA_SQL);
}
