// Service client et réclamations : chaque demande reçoit un numéro de suivi,
// est enregistrée en base et confirmée par e-mail.

export const SUPPORT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Ticket" (
  id          SERIAL PRIMARY KEY,
  ref         TEXT UNIQUE NOT NULL,
  "userId"    INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  category    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  "songId"    INTEGER,
  "orderRef"  TEXT,
  status      TEXT NOT NULL DEFAULT 'OPEN',
  "adminNote" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Ticket_user_idx" ON "Ticket" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket" (status, "createdAt");
`;

export const TICKET_CATEGORIES = {
  question: 'Question générale',
  compte: 'Mon compte / connexion',
  paiement: 'Paiement ou achat',
  reclamation: 'Réclamation',
  droits: "Droits d'auteur / revendication",
  artiste: 'Espace artiste ou label',
  technique: 'Problème technique',
  autre: 'Autre',
};

export function registerSupportRoutes(app, deps) {
  const { pool, optionalAuth, authenticateToken, rateLimit, sendEmail, escapeHtml, normalizeEmail, isValidEmail, supportEmail } = deps;

  const limiter = rateLimit({ name: 'ticket', windowMs: 60 * 60 * 1000, max: 6 });
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

  app.post('/api/support/tickets', limiter, optionalAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const category = TICKET_CATEGORIES[body.category] ? body.category : null;
      const name = clean(body.name, 100);
      const email = normalizeEmail(body.email);
      const subject = clean(body.subject, 150);
      const message = clean(body.message, 5000);
      const orderRef = clean(body.orderRef, 60) || null;
      const songId = Number.isInteger(Number(body.songId)) && Number(body.songId) > 0 ? Number(body.songId) : null;
      // Champ piège invisible : les robots le remplissent, pas les humains.
      if (clean(body.website, 200)) return res.json({ success: true, ref: 'SM-T-000000' });

      if (!category) return res.status(400).json({ error: 'Choisis le type de demande' });
      if (name.length < 2) return res.status(400).json({ error: 'Indique ton nom' });
      if (!isValidEmail(email)) return res.status(400).json({ error: 'Adresse e-mail invalide' });
      if (subject.length < 3) return res.status(400).json({ error: "Indique l'objet de ta demande" });
      if (message.length < 10) return res.status(400).json({ error: 'Explique ta demande en quelques phrases (10 caractères minimum)' });

      const userId = Number.isInteger(Number(req.user?.id)) ? Number(req.user.id) : null;
      const ins = await pool.query(
        `INSERT INTO "Ticket" (ref, "userId", name, email, category, subject, message, "songId", "orderRef")
         VALUES ('TMP-' || md5(random()::text), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [userId, name, email, category, subject, message, songId, orderRef]
      );
      const id = ins.rows[0].id;
      const ref = `SM-T-${String(id).padStart(6, '0')}`;
      await pool.query('UPDATE "Ticket" SET ref = $1 WHERE id = $2', [ref, id]);

      const label = TICKET_CATEGORIES[category];
      sendEmail({
        to: email,
        subject: `[${ref}] Nous avons bien reçu ta demande`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
          <h2 style="color:#b45309">SONIMUSIC · Service client</h2>
          <p>Bonjour ${escapeHtml(name)},</p>
          <p>Ta demande a bien été enregistrée sous le numéro <strong>${ref}</strong>.</p>
          <p><strong>Type :</strong> ${escapeHtml(label)}<br><strong>Objet :</strong> ${escapeHtml(subject)}</p>
          <p>Nous te répondons en général sous 48 heures ouvrées. Garde ce numéro pour le suivi.</p>
          <p style="color:#666;font-size:12px">Ceci est un message automatique, merci de ne pas y répondre.</p></div>`,
      }).catch(() => {});
      if (supportEmail) {
        sendEmail({
          to: supportEmail,
          subject: `[${ref}] ${label} : ${subject}`,
          html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;${userId ? ` (compte n°${userId})` : ''}</p>
            <p><strong>Type :</strong> ${escapeHtml(label)}${orderRef ? `<br><strong>Commande :</strong> ${escapeHtml(orderRef)}` : ''}${songId ? `<br><strong>Titre n° :</strong> ${songId}` : ''}</p>
            <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
        }).catch(() => {});
      }
      res.status(201).json({ success: true, ref });
    } catch (error) {
      console.error('Erreur ticket:', error.message);
      res.status(500).json({ error: "Impossible d'enregistrer la demande pour le moment" });
    }
  });

  app.get('/api/support/my-tickets', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT ref, category, subject, status, "createdAt", "updatedAt" FROM "Ticket" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
        [req.user.id]
      );
      res.json(r.rows);
    } catch {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
}
