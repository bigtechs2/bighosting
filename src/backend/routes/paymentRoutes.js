// ==========================================
// © bighosting by bigmanjtech™
// Payment Routes – Stripe Integration
// Hybrid Currency: TSh + USD
// ==========================================

import express from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { authenticate } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const EXCHANGE_RATE = parseFloat(process.env.EXCHANGE_RATE) || 2500;
const PRIMARY_CURRENCY = process.env.PRIMARY_CURRENCY || 'TSh';

// ==========================================
// Helper: Generate Unique Order Number
// ==========================================

function generateOrderNumber() {
  const prefix = 'BH';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ==========================================
// Helper: Convert TSh to USD Cents
// ==========================================

function tshToUsdCents(amountTSh) {
  const usd = amountTSh / EXCHANGE_RATE;
  return Math.round(usd * 100);
}

// ==========================================
// 1. CREATE CHECKOUT SESSION (Hybrid Currency)
// ==========================================

router.post('/create-checkout', authenticate, async (req, res) => {
  try {
    const { planId, interval, currency } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required',
      });
    }

    // Get plan from database
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Determine price based on interval and currency
    let amount = 0;
    let displayCurrency = currency || 'TSh';

    if (interval === 'yearly') {
      amount = plan.priceYearly;
    } else {
      amount = plan.priceMonthly;
    }

    // Calculate Stripe amount in cents (always USD)
    let amountInCents;
    if (displayCurrency === 'TSh') {
      amountInCents = tshToUsdCents(amount);
    } else {
      // USD
      amountInCents = amount * 100;
    }

    // Create order record
    const orderNumber = generateOrderNumber();
    const order = await prisma.order.create({
      data: {
        orderNumber: orderNumber,
        userId: req.user.id,
        planId: plan.id,
        quantity: 1,
        totalAmount: amount,
        currency: displayCurrency,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    // Get plan name with size info
    const planName = plan.name;
    const planDisplay = plan.ramLimit === 0 ? '∞ Unlimited' : `${plan.ramLimit}MB RAM, ${plan.diskLimit}MB Disk`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `bighosting - ${planName}`,
              description: `${planDisplay} | ${plan.cpuLimit}% CPU | Bot Size: ${plan.botSizeLimit}MB`,
              metadata: {
                planId: plan.id,
                planName: plan.name,
                interval: interval || 'month',
                currency: displayCurrency,
              },
            },
            unit_amount: amountInCents,
            recurring: {
              interval: interval === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'http://localhost:5000'}/dashboard.html?payment=success`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5000'}/#pricing?payment=cancelled`,
      metadata: {
        orderId: order.id,
        userId: req.user.id,
        planId: plan.id,
        currency: displayCurrency,
        amount: amount.toString(),
      },
      customer_email: req.user.email,
    });

    res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      orderId: order.id,
      currency: displayCurrency,
      amount: amount,
      amountInUsd: (amountInCents / 100).toFixed(2),
      exchangeRate: EXCHANGE_RATE,
    });

  } catch (error) {
    console.error('❌ Create Checkout Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session',
    });
  }
});

// ==========================================
// 2. STRIPE WEBHOOK
// ==========================================

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { orderId, userId, planId, currency, amount } = session.metadata;

        // Get order
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { plan: true },
        });

        if (!order) {
          console.error('❌ Order not found:', orderId);
          break;
        }

        // Update order status
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
          },
        });

        // Create payment record
        await prisma.payment.create({
          data: {
            transactionId: session.id,
            userId: userId,
            orderId: orderId,
            amount: parseInt(amount) || order.totalAmount,
            currency: currency || 'TSh',
            gateway: 'STRIPE',
            status: 'SUCCESSFUL',
            paidAt: new Date(),
            metadata: session,
          },
        });

        // Create invoice
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
        await prisma.invoice.create({
          data: {
            invoiceNumber: invoiceNumber,
            userId: userId,
            orderId: orderId,
            amount: parseInt(amount) || order.totalAmount,
            currency: currency || 'TSh',
            status: 'PAID',
            dueDate: new Date(),
            paidAt: new Date(),
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId: userId,
            title: 'Payment Successful',
            message: `Your payment for ${order.plan.name} plan (${currency} ${amount}) was successful. Your server will be ready in a few moments.`,
            type: 'PAYMENT',
            link: '/dashboard.html',
          },
        });

        console.log(`✅ Payment completed for order: ${orderId}`);
        console.log(`💳 Amount: ${currency} ${amount}`);
        console.log(`🚀 Server provisioning triggered for user: ${userId}`);

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;

        if (customerEmail) {
          const user = await prisma.user.findUnique({
            where: { email: customerEmail },
          });

          if (user) {
            await prisma.notification.create({
              data: {
                userId: user.id,
                title: 'Payment Failed',
                message: 'Your recent payment failed. Please update your payment method to keep your server running.',
                type: 'BILLING',
                link: '/dashboard.html',
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerEmail = subscription.customer_email;

        if (customerEmail) {
          const user = await prisma.user.findUnique({
            where: { email: customerEmail },
          });

          if (user) {
            await prisma.server.updateMany({
              where: { userId: user.id },
              data: {
                suspended: true,
                suspensionReason: 'Subscription cancelled - payment failed',
              },
            });

            await prisma.notification.create({
              data: {
                userId: user.id,
                title: 'Subscription Cancelled',
                message: 'Your subscription has been cancelled. Your servers have been suspended. Contact support to reactivate.',
                type: 'BILLING',
                link: '/dashboard.html',
              },
            });
          }
        }
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ==========================================
// 3. GET PAYMENT HISTORY
// ==========================================

router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      include: {
        order: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      gateway: p.gateway,
      planName: p.order?.plan?.name || 'Unknown',
      orderNumber: p.order?.orderNumber || 'N/A',
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));

    res.json({
      success: true,
      payments: formatted,
      count: formatted.length,
    });

  } catch (error) {
    console.error('❌ Get Payment History Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load payment history',
    });
  }
});

// ==========================================
// 4. GET INVOICES
// ==========================================

router.get('/invoices', authenticate, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
      include: {
        order: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      planName: inv.order?.plan?.name || 'Unknown',
      orderNumber: inv.order?.orderNumber || 'N/A',
    }));

    res.json({
      success: true,
      invoices: formatted,
      count: formatted.length,
    });

  } catch (error) {
    console.error('❌ Get Invoices Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load invoices',
    });
  }
});

// ==========================================
// 5. GET EXCHANGE RATE (Public)
// ==========================================

router.get('/exchange-rate', async (req, res) => {
  res.json({
    success: true,
    rate: EXCHANGE_RATE,
    currency: PRIMARY_CURRENCY,
    lastUpdated: new Date().toISOString(),
  });
});

// ==========================================
// 6. GET PLANS (Public)
// ==========================================

router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Add USD conversion to each plan
    const plansWithConversion = plans.map((plan) => ({
      ...plan,
      priceMonthlyUsd: (plan.priceMonthly / EXCHANGE_RATE).toFixed(2),
      priceYearlyUsd: (plan.priceYearly / EXCHANGE_RATE).toFixed(2),
    }));

    res.json({
      success: true,
      plans: plansWithConversion,
      exchangeRate: EXCHANGE_RATE,
    });

  } catch (error) {
    console.error('❌ Get Plans Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load plans',
    });
  }
});

// ==========================================
// 7. GET PLAN BY ID
// ==========================================

router.get('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.plan.findUnique({
      where: { id: id },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.json({
      success: true,
      plan: {
        ...plan,
        priceMonthlyUsd: (plan.priceMonthly / EXCHANGE_RATE).toFixed(2),
        priceYearlyUsd: (plan.priceYearly / EXCHANGE_RATE).toFixed(2),
      },
      exchangeRate: EXCHANGE_RATE,
    });

  } catch (error) {
    console.error('❌ Get Plan Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load plan',
    });
  }
});

// ==========================================
// 8. CANCEL SUBSCRIPTION
// ==========================================

router.post('/cancel-subscription', authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required',
      });
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
    });

  } catch (error) {
    console.error('❌ Cancel Subscription Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel subscription',
    });
  }
});

export default router;