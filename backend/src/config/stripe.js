import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  monthly: {
    name: 'Abonnement Mensuel',
    price: 9.99,
    interval: 'month',
    currency: 'eur',
    features: [
      'Écoute illimitée',
      'Qualité audio HD',
      'Téléchargement hors-ligne',
      'Sans publicité',
      'Support prioritaire'
    ]
  },
  yearly: {
    name: 'Abonnement Annuel',
    price: 99.99,
    interval: 'year',
    currency: 'eur',
    features: [
      'Écoute illimitée',
      'Qualité audio HD',
      'Téléchargement hors-ligne',
      'Sans publicité',
      'Support prioritaire',
      'Économie de 16%'
    ]
  }
};

export default stripe;
