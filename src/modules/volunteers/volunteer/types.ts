export interface CreateVolunteerDTO {
  userId: string;
  bio?: string | null;
  location?: string | null;
  experienceYears?: number | null;
}

export interface UpdateVolunteerDTO {
  bio?: string | null;
  location?: string | null;
  experienceYears?: number | null;
  isAvailable?: boolean;
}
