import { useAuth } from './AuthContext';

// Three role groups per BLUEPRINT.md §7. Use this instead of comparing
// `profile.role` directly so role-conditional UI is centralised.
export type RoleGroup = 'back_office' | 'pm' | 'foreman';

const BACK_OFFICE_ROLES = new Set(['ceo', 'vp', 'cfo', 'office_manager']);

export function useRoleGroup(): RoleGroup | null {
  const { profile } = useAuth();
  if (!profile) return null;
  if (BACK_OFFICE_ROLES.has(profile.role)) return 'back_office';
  if (profile.role === 'pm') return 'pm';
  if (profile.role === 'foreman') return 'foreman';
  return null;
}
