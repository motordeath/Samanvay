import express from 'express';
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
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/partnerships', partnershipRoutes);
app.use('/api/events', eventRoutes);

app.use('/api/resources', resourceRoutes);
app.use('/api/resource-lots', resourceLotRoutes);
app.use('/api/needs', resourceNeedRoutes);
app.use('/api/offers', resourceOfferRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/audit', auditRoutes);

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

app.use(errorHandler);

export default app;

