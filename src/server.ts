import express from 'express';
import volunteerRoutes from "./modules/volunteers/routes/volunteer.routes";
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import organizationRoutes from './routes/organization.routes';
import userRoutes from './routes/user.routes';
import membershipRoutes from './routes/membership.routes';
import partnershipRoutes from './routes/partnership.routes';
import eventRoutes from './routes/event.routes';
import skillRoutes from "./modules/skills/routes/skill.routes";
import volunteerNeedRoutes from "./modules/volunteer-needs/routes/volunteer-need.routes";
import volunteerInvitationRoutes from "./modules/volunteer-invitations/routes/volunteer-invitation.routes";
import volunteerAssignmentRoutes from "./modules/volunteer-assignments/routes/volunteer-assignment.routes";
import volunteerAttendanceRoutes from "./modules/volunteer-attendance/routes/volunteer-attendance.routes";
import volunteerAvailabilityRoutes from "./modules/volunteer-availability/routes/volunteer-availability.routes";
import certificationRoutes from "./modules/certifications/routes/certification.routes";


const app = express();

app.use(express.json());

app.use('/organizations', organizationRoutes);
app.use('/users', userRoutes);
app.use('/memberships', membershipRoutes);
app.use('/partnerships', partnershipRoutes);
app.use('/events', eventRoutes);
app.use("/volunteers", volunteerRoutes);
app.use("/skills", skillRoutes);
app.use(
  "/volunteer-needs",
  volunteerNeedRoutes
);
app.use(errorHandler);

console.log(env);

app.use(
  "/invitations",
  volunteerInvitationRoutes
);

app.use(
  "/assignments",
  volunteerAssignmentRoutes
);

app.use(
  "/attendance",
  volunteerAttendanceRoutes
);

app.use(
  "/availability",
  volunteerAvailabilityRoutes
);

app.use(
  "/certifications",
  certificationRoutes
);


app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
  
});
