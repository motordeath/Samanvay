export const PERMISSIONS = {
  OWNER: [
    'all'
  ],
  ADMIN: [
    'manage_members',
    'manage_resources',
    'manage_transfers'
  ],
  COORDINATOR: [
    'create_needs',
    'create_offers',
    'update_transfers'
  ],
  VOLUNTEER: [
    'create_needs'
  ],
  VIEWER: [
    'read_only'
  ]
};

export type Role = keyof typeof PERMISSIONS;
