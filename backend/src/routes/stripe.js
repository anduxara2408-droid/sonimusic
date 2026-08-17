
import express from 'express';
import stripe, { PLANS } from '../config/stripe.js';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// 1. Récupérer les plans
router.get('/plans', async (req, res) => {
  try {
    res.json({ plans: PLANS });
  } catch (error) {
    console.error('Erreur plans:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des plans' });
  }
});

// 2. Créer une session de paiement
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    // Vérifier si l'utilisateur a déjà un abonnement actif
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'active'
      }
    });

    if (existingSub) {
      return res.status(400).json({ 
        error: 'Vous avez déjà un abonnement actif' 
      });
    }

    // Créer ou récupérer un client Stripe
    let customerId = existingSub?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name || 'Utilisateur',
        metadata: {
          userId: userId.toString()
        }
      });
      customerId = customer.id;
    }

    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: PLANS[plan].currency,
            product_data: {
              name: PLANS[plan].name,
              description: `Abonnement ${PLANS[plan].interval} à SONIMUSIC Premium`,
            },
            unit_amount: PLANS[plan].price * 100,
            recurring: {
              interval: PLANS[plan].interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing?canceled=true`,
      metadata: {
        userId: userId.toString(),
        plan: plan
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Erreur création session:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la session' });
  }
});

// 3. Webhook Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`⚠️ Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = parseInt(session.metadata.userId);
        const plan = session.metadata.plan;

        // Récupérer l'abonnement Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        // Créer l'abonnement en base
        await prisma.subscription.create({
          data: {
            userId: userId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status: 'active',
            plan: plan,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          }
        });

        // Mettre à jour le rôle
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'PREMIUM' }
        });

        console.log(`✅ Abonnement Premium créé pour l'utilisateur ${userId}`);
        break;

      case 'invoice.paid':
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await prisma.subscription.update({
            where: { stripeSubscriptionId: invoice.subscription },
            data: {
              status: 'active',
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            }
          });
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        await prisma.subscription.update({
          where: { stripeSubscriptionId: deletedSub.id },
          data: { status: 'canceled' }
        });
        
        // Retirer le rôle Premium
        const subToUpdate = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: deletedSub.id }
        });
        if (subToUpdate) {
          await prisma.user.update({
            where: { id: subToUpdate.userId },
            data: { role: 'LISTENER' }
          });
        }
        console.log(`❌ Abonnement annulé: ${deletedSub.id}`);
        break;

      default:
        console.log(`Événement non traité: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erreur webhook:', error);
    res.status(500).json({ error: 'Erreur lors du traitement du webhook' });
  }
});

// 4. Récupérer l'abonnement de l'utilisateur
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'active'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ subscription });
  } catch (error) {
    console.error('Erreur récupération abonnement:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// 5. Annuler l'abonnement
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'active'
      }
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Aucun abonnement actif trouvé' });
    }

    // Annuler chez Stripe
    await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Mettre à jour en base
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        status: 'canceled'
      }
    });

    res.json({ 
      message: 'Abonnement annulé avec succès',
      cancelAtPeriodEnd: true 
    });
  } catch (error) {
    console.error('Erreur annulation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation' });
  }
});

export default router;
