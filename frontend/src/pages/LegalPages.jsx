import React from 'react';
import { Link } from 'react-router-dom';
import { openCookieSettings } from '../components/CookieConsent';

const Page = ({ title, updated, children }) => (
  <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
    <h1 className="text-3xl font-black text-white">{title}</h1>
    {updated && <p className="mt-1 text-sm text-gray-500">Dernière mise à jour : {updated}</p>}
    <div className="legal mt-8 space-y-6 text-sm leading-relaxed text-gray-300">{children}</div>
  </div>
);

const H = ({ children }) => <h2 className="pt-2 text-lg font-bold text-white">{children}</h2>;

export const Confidentialite = () => (
  <Page title="Politique de confidentialité" updated="27 novembre 2026">
    <p>SONIMUSIC respecte ta vie privée. Cette page explique quelles données nous collectons, pourquoi, et comment tu peux les contrôler.</p>
    <H>1. Données collectées</H>
    <ul className="list-disc space-y-1 pl-5">
      <li><b>Compte :</b> nom, adresse e-mail, mot de passe (stocké chiffré, jamais lisible), rôle (auditeur, artiste, label), photo de profil si tu en ajoutes une.</li>
      <li><b>Activité :</b> titres écoutés, j'aime, abonnements, commentaires, partages. Ces données servent aux statistiques et aux classements.</li>
      <li><b>Auditeurs non connectés :</b> pour compter les écoutes sans tricherie, nous calculons une empreinte anonyme irréversible. L'adresse IP n'est jamais enregistrée en clair.</li>
      <li><b>Achats (bientôt) :</b> projet acheté, montant, moyen de paiement et référence de transaction. Nous ne stockons jamais de code secret ni de mot de passe de portefeuille mobile.</li>
    </ul>
    <H>2. Données publiques et privées</H>
    <p>Sont <b>publics</b> : ton nom affiché, ta photo, tes commentaires et, pour les artistes, la biographie, les titres et les statistiques d'écoute. Restent <b>privés</b> : ton e-mail, ton numéro de téléphone, tes achats, tes messages privés et ton historique d'écoute détaillé.</p>
    <H>3. Pourquoi nous utilisons ces données</H>
    <p>Faire fonctionner ton compte, sécuriser la connexion, calculer les classements, rémunérer les artistes, répondre à tes demandes au service client. Nous ne vendons jamais tes données.</p>
    <H>4. Prestataires</H>
    <p>Hébergement du site et de l'API (Render), base de données (Neon, Union européenne), envoi d'e-mails (Resend). Ils n'utilisent tes données que pour nous fournir leur service.</p>
    <H>5. Durée de conservation</H>
    <p>Tant que ton compte existe ; à sa suppression, ton activité est anonymisée. Les données de facturation sont gardées le temps exigé par la loi.</p>
    <H>6. Tes droits</H>
    <p>Tu peux consulter, corriger, exporter ou supprimer tes données à tout moment. Écris-nous depuis la page <Link to="/contact" className="text-amber-400">Service client</Link> ou à contact@sonimusic.online.</p>
    <H>7. Sécurité</H>
    <p>Connexion chiffrée (HTTPS), mots de passe hachés, vérification de l'adresse e-mail, limitation des tentatives de connexion. La double authentification par application arrive très bientôt.</p>
  </Page>
);

export const Cookies = () => (
  <Page title="Politique cookies" updated="27 novembre 2026">
    <p>Un cookie est un petit fichier enregistré par ton navigateur. SONIMUSIC en utilise très peu.</p>
    <H>Cookies indispensables (toujours actifs)</H>
    <ul className="list-disc space-y-1 pl-5">
      <li><b>Connexion :</b> garde ta session ouverte.</li>
      <li><b>Choix cookies :</b> mémorise ta réponse pour ne plus te reposer la question (12 mois).</li>
      <li><b>Préférences :</b> mode ordinateur sur téléphone, thème.</li>
    </ul>
    <H>Mesure d'audience (avec ton accord)</H>
    <p>Statistiques anonymes de fréquentation pour améliorer le site.</p>
    <H>Personnalisation (avec ton accord)</H>
    <p>Recommandations de titres basées sur tes écoutes.</p>
    <p>Nous n'utilisons aucun cookie publicitaire.</p>
    <button onClick={openCookieSettings} className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-black">Gérer mes cookies</button>
  </Page>
);

export const ArtistesLabels = () => (
  <Page title="Artistes & labels : publier et vendre sur SONIMUSIC">
    <p>SONIMUSIC aide les artistes et labels à se faire entendre et à vivre de leur musique. Voici comment ça marche, en toute transparence.</p>
    <H>Publier gratuitement</H>
    <p>Crée un compte <b>Artiste</b>, puis publie tes titres depuis ton espace artiste. Chaque titre est vérifié par l'équipe avant d'être mis en ligne (qualité du son, droits, contenu).</p>
    <H>Vendre des albums, EP et mixtapes</H>
    <ul className="list-disc space-y-1 pl-5">
      <li>Seuls les comptes artistes ou labels <b>vérifiés</b> peuvent mettre un projet en vente.</li>
      <li>Tu fixes le prix. Les fans paient par portefeuille mobile (Wave, Bankily, Masrvi, Sedad, Click, selon les pays disponibles).</li>
      <li>SONIMUSIC encaisse le paiement et garde une <b>commission de 15 %</b> qui couvre l'hébergement, les frais de paiement et la promotion.</li>
      <li>Tu reçois <b>85 %</b> de chaque vente. Chaque achat est enregistré automatiquement et visible dans tes statistiques.</li>
      <li>Les reversements sont faits chaque mois sur ton portefeuille mobile, dès 5 000 FCFA (ou équivalent en MRU) de solde, avec un relevé détaillé.</li>
    </ul>
    <H>Tes droits</H>
    <p>Tu restes propriétaire de ta musique. Tu donnes seulement à SONIMUSIC le droit de la diffuser et de la vendre sur la plateforme. Tu peux retirer un titre ou un projet à tout moment ; les achats déjà faits restent accessibles aux acheteurs.</p>
    <H>Tes engagements</H>
    <p>Tu garantis détenir les droits (texte, musique, samples, visuels) de ce que tu publies. Un contenu qui viole les droits d'un autre artiste est retiré et les revenus correspondants sont bloqués.</p>
    <H>Statistiques</H>
    <p>Écoutes (comptées après 30 secondes, anti-triche), auditeurs uniques, j'aime, partages, abonnés, ventes et revenus, par jour, semaine et mois.</p>
    <p>Une question ? <Link to="/contact" className="text-amber-400">Contacte le service artistes</Link>.</p>
    <div className="flex flex-wrap gap-3 pt-2">
      <Link to="/register" className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-black">Créer un compte artiste</Link>
      <Link to="/cgu" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white">Conditions d'utilisation</Link>
    </div>
  </Page>
);
