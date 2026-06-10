import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import userRoutes from './routes/user.routes';
import membershipRoutes from './routes/membership.routes';
import partnershipRoutes from './routes/partnership.routes';
import eventRoutes from './routes/event.routes';

import resourceRoutes from './routes/resource.routes';
import resourceLotRoutes from './routes/resource-lot.routes';
import resourceNeedRoutes from './routes/resource-need.routes';
import resourceOfferRoutes from './routes/resource-offer.routes';
import transferRoutes from './routes/transfer.routes';
import auditRoutes from './routes/audit.routes';

// Volunteer Engine imports
import volunteerRoutes from './modules/volunteers/volunteer/routes';
import skillRoutes from './modules/volunteers/skills/routes';
import certificationRoutes from './modules/volunteers/certifications/routes';
import availabilityRoutes from './modules/volunteers/availability/routes';
import needRoutes from './modules/volunteers/needs/routes';
import matchingRoutes from './modules/volunteers/matching/routes';
import invitationRoutes from './modules/volunteers/invitations/routes';
import assignmentRoutes from './modules/volunteers/assignments/routes';
import attendanceRoutes from './modules/volunteers/attendance/routes';

const app = express();

const allowedOrigins = [
  env.FRONTEND_URL,

  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',

  'https://samanvay-onega.vercel.app',
  'https://samanvay-frontend-76y6.vercel.app',

  'https://samanvay-git-stabilization-testing-motordeaths-projects.vercel.app'
].filter(Boolean) as string[];

app.use(cors({
  origin: function (origin, callback) {

    console.log('ALLOWED ORIGINS:', allowedOrigins);
    console.log('REQUEST ORIGIN:', origin);

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('Blocked by CORS:', origin);

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },

  credentials: true,

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-org-id',
    'x-request-id'
  ],

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ]
}));
app.use(express.json());

// Health check endpoint (must be before routes and 404 handler)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    layer: 'backend'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/partnerships', partnershipRoutes);
app.use('/api/events', eventRoutes);

app.use('/api/resources', resourceRoutes);
app.use('/api/resource-lots', resourceLotRoutes);
app.use('/api/resource-needs', resourceNeedRoutes);  // ← change this
app.use('/api/offers', resourceOfferRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/audit', auditRoutes);

import notificationRoutes from './modules/notifications/notification.routes';

// Volunteer Engine routes mounting
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/volunteer-needs', needRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Notification Engine routes mounting
app.use('/api/notifications', notificationRoutes);

// Activity Engine routes mounting
import activityRoutes from './modules/activity/activity.routes';
app.use('/api/activity', activityRoutes);

// Dashboard routes mounting
import dashboardRoutes from './modules/dashboard/dashboard.routes';
app.use('/api/dashboard', dashboardRoutes);

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    meta: {},
    errors: [{ code: 'ROUTE_NOT_FOUND', message: 'Route not found' }],
  });
});

app.use(errorHandler);

export default app;

