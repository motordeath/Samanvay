export interface CreateVolunteerNeedDTO {
  organizationId: string;
  eventId?: string;

  title: string;
  description?: string;

  requiredCount: number;

  location?: string;

  startDate: string;
  endDate: string;
}