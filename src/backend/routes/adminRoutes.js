// ==========================================
// © bighosting by bigmanjtech™
// Admin Routes – Manage Users, Plans, Servers
// ==========================================

import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { authenticate, adminOnly } from '../middleware/auth.js';
import {
  suspendServer,
  unsuspendServer,
  deleteServer,
} from '../services/pterodactylService.js';

const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// 1. DASHBOARD STATISTICS
// ==========================================

router.get('/stats', authenticate, adminOnly, async (req, res) => {
  try {
    const [
      totalUsers,
      totalServers,
      totalOrders,
      totalRevenue,
      pendingOrders,
      activeServers,
      suspendedServers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.order.count(),
      prisma.payment.aggregate({
        where: { status: 'SUCCESSFUL' },
        _sum: { amount: true },
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.server.count({ where: { status: 'RUNNING' } }),
      prisma.server.count({ where: { suspended: true } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalServers,
        totalOrders,
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingOrders,
        activeServers,
        suspendedServers,
      },
    });

  } catch (error) {
    console.error('❌ Get Stats Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load statistics',
    });
  }
});

// ==========================================
// 2. GET ALL USERS (Admin)
// ==========================================

router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isSuspended: true,
          suspensionReason: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              servers: true,
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('❌ Get Users Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load users',
    });
  }
});

// ==========================================
// 3. GET USER DETAILS (Admin)
// ==========================================

router.get('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        servers: true,
        orders: {
          include: {
            plan: true,
          },
        },
        payments: true,
        tickets: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });

  } catch (error) {
    console.error('❌ Get User Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load user details',
    });
  }
});

// ==========================================
// 4. SUSPEND USER (Admin)
// ==========================================

router.post('/users/:id/suspend', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        servers: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Suspend user
    await prisma.user.update({
      where: { id },
      data: {
        isSuspended: true,
        suspensionReason: reason || 'Suspended by admin',
      },
    });

    // Suspend all user's servers
    for (const server of user.servers) {
      try {
        await suspendServer(server.serverIdentifier);
      } catch (e) {
        console.warn(`⚠️ Could not suspend server ${server.id}:`, e.message);
      }
    }

    await prisma.server.updateMany({
      where: { userId: id },
      data: {
        suspended: true,
        suspensionReason: reason || 'Suspended by admin',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SUSPEND_USER',
        targetType: 'USER',
        targetId: id,
        details: { reason: reason || 'Suspended by admin' },
      },
    });

    res.json({
      success: true,
      message: 'User suspended successfully',
    });

  } catch (error) {
    console.error('❌ Suspend User Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user',
    });
  }
});

// ==========================================
// 5. UNSUSPEND USER (Admin)
// ==========================================

router.post('/users/:id/unsuspend', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        servers: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Unsuspend user
    await prisma.user.update({
      where: { id },
      data: {
        isSuspended: false,
        suspensionReason: null,
      },
    });

    // Unsuspend all user's servers
    for (const server of user.servers) {
      try {
        await unsuspendServer(server.serverIdentifier);
      } catch (e) {
        console.warn(`⚠️ Could not unsuspend server ${server.id}:`, e.message);
      }
    }

    await prisma.server.updateMany({
      where: { userId: id },
      data: {
        suspended: false,
        suspensionReason: null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UNSUSPEND_USER',
        targetType: 'USER',
        targetId: id,
        details: {},
      },
    });

    res.json({
      success: true,
      message: 'User unsuspended successfully',
    });

  } catch (error) {
    console.error('❌ Unsuspend User Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to unsuspend user',
    });
  }
});

// ==========================================
// 6. DELETE USER (Admin)
// ==========================================

router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        servers: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete all user's servers from Pterodactyl
    for (const server of user.servers) {
      try {
        await deleteServer(server.serverIdentifier, true);
      } catch (e) {
        console.warn(`⚠️ Could not delete server ${server.id}:`, e.message);
      }
    }

    // Delete user (cascade will delete servers, orders, payments)
    await prisma.user.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_USER',
        targetType: 'USER',
        targetId: id,
        details: { email: user.email },
      },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('❌ Delete User Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
});

// ==========================================
// 7. GET ALL PLANS (Admin)
// ==========================================

router.get('/plans', authenticate, adminOnly, async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      plans,
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
// 8. CREATE PLAN (Admin)
// ==========================================

router.post('/plans', authenticate, adminOnly, async (req, res) => {
  try {
    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      cpuLimit,
      ramLimit,
      diskLimit,
      botSizeLimit,
      isActive,
      sortOrder,
    } = req.body;

    // Validate
    if (!name || priceMonthly === undefined || ramLimit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, priceMonthly, and ramLimit are required',
      });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        description: description || '',
        priceMonthly: parseInt(priceMonthly),
        priceYearly: parseInt(priceYearly) || parseInt(priceMonthly) * 10,
        cpuLimit: parseInt(cpuLimit) || 100,
        ramLimit: parseInt(ramLimit),
        diskLimit: parseInt(diskLimit) || 1024,
        botSizeLimit: parseInt(botSizeLimit) || 1,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: parseInt(sortOrder) || 0,
        currency: 'TSh',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_PLAN',
        targetType: 'PLAN',
        targetId: plan.id,
        details: { name: plan.name },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      plan,
    });

  } catch (error) {
    console.error('❌ Create Plan Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
    });
  }
});

// ==========================================
// 9. UPDATE PLAN (Admin)
// ==========================================

router.put('/plans/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      cpuLimit,
      ramLimit,
      diskLimit,
      botSizeLimit,
      isActive,
      sortOrder,
    } = req.body;

    const existing = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        priceMonthly: priceMonthly !== undefined ? parseInt(priceMonthly) : existing.priceMonthly,
        priceYearly: priceYearly !== undefined ? parseInt(priceYearly) : existing.priceYearly,
        cpuLimit: cpuLimit !== undefined ? parseInt(cpuLimit) : existing.cpuLimit,
        ramLimit: ramLimit !== undefined ? parseInt(ramLimit) : existing.ramLimit,
        diskLimit: diskLimit !== undefined ? parseInt(diskLimit) : existing.diskLimit,
        botSizeLimit: botSizeLimit !== undefined ? parseInt(botSizeLimit) : existing.botSizeLimit,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existing.sortOrder,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PLAN',
        targetType: 'PLAN',
        targetId: id,
        details: { name: plan.name },
      },
    });

    res.json({
      success: true,
      message: 'Plan updated successfully',
      plan,
    });

  } catch (error) {
    console.error('❌ Update Plan Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
    });
  }
});

// ==========================================
// 10. DELETE PLAN (Admin)
// ==========================================

router.delete('/plans/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.plan.findUnique({
      where: { id },
      include: {
        orders: true,
        servers: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Check if plan has orders or servers
    if (existing.orders.length > 0 || existing.servers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with existing orders or servers. Deactivate it instead.',
      });
    }

    await prisma.plan.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_PLAN',
        targetType: 'PLAN',
        targetId: id,
        details: { name: existing.name },
      },
    });

    res.json({
      success: true,
      message: 'Plan deleted successfully',
    });

  } catch (error) {
    console.error('❌ Delete Plan Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
    });
  }
});

// ==========================================
// 11. GET ALL ORDERS (Admin)
// ==========================================

router.get('/orders', authenticate, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: true,
          payments: true,
          servers: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('❌ Get Orders Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load orders',
    });
  }
});

// ==========================================
// 12. GET ALL PAYMENTS (Admin)
// ==========================================

router.get('/payments', authenticate, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          order: {
            include: {
              plan: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.payment.count(),
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('❌ Get Payments Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load payments',
    });
  }
});

// ==========================================
// 13. GET AUDIT LOGS (Admin)
// ==========================================

router.get('/audit-logs', authenticate, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count(),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('❌ Get Audit Logs Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load audit logs',
    });
  }
});

export default router;