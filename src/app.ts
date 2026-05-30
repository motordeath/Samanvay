import express from 'express';
import { errorHandler } from './middleware/error.middleware';

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

const app = express();

app.use(express.json());

app.use('/organizations', organizationRoutes);
app.use('/users', userRoutes);
app.use('/memberships', membershipRoutes);
app.use('/partnerships', partnershipRoutes);
app.use('/events', eventRoutes);

app.use('/api/resources', resourceRoutes);
app.use('/api/resource-lots', resourceLotRoutes);
app.use('/api/needs', resourceNeedRoutes);
app.use('/api/offers', resourceOfferRoutes);
app.use('/api/transfers', transferRoutes);

app.use(errorHandler);

export default app;
