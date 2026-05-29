import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import organizationRoutes from './routes/organization.routes';
import userRoutes from './routes/user.routes';
import membershipRoutes from './routes/membership.routes';
import partnershipRoutes from './routes/partnership.routes';
import eventRoutes from './routes/event.routes';

const app = express();

app.use(express.json());

app.use('/organizations', organizationRoutes);
app.use('/users', userRoutes);
app.use('/memberships', membershipRoutes);
app.use('/partnerships', partnershipRoutes);
app.use('/events', eventRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});
