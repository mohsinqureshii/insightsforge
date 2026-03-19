import type { Role, Permission } from '@/types/insightsforge'
import { PERMISSIONS, ROLE_HIERARCHY } from '@/types/insightsforge'
import { getUserTenantRole } from '@/lib/tenant'

// ============================================================
// Permission checking
// ============================================================

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly Role[]
  return allowedRoles.includes(role)
}

export function hasMinRole(role: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

export function isAtLeast(role: Role, target: Role): boolean {
  return hasMinRole(role, target)
}

// ============================================================
// Server-side authorization helpers
// ============================================================

/**
 * Check if a user has the required permission in a tenant.
 * Returns the role if authorized, throws otherwise.
 */
export async function requirePermission(
  userId: string,
  tenantId: string,
  permission: Permission,
): Promise<Role> {
  const role = await getUserTenantRole(userId, tenantId)

  if (!role) {
    throw new AuthorizationError('Not a member of this organization')
  }

  if (!hasPermission(role as Role, permission)) {
    throw new AuthorizationError(
      `Insufficient permissions: requires ${PERMISSIONS[permission].join(' or ')}`,
    )
  }

  return role as Role
}

/**
 * Check if a user has at least the minimum role in a tenant.
 */
export async function requireRole(
  userId: string,
  tenantId: string,
  minRole: Role,
): Promise<Role> {
  const role = await getUserTenantRole(userId, tenantId)

  if (!role) {
    throw new AuthorizationError('Not a member of this organization')
  }

  if (!hasMinRole(role as Role, minRole)) {
    throw new AuthorizationError(`Requires at least ${minRole} role`)
  }

  return role as Role
}

/**
 * Check ownership: either the user owns the resource, or has elevated role.
 */
export async function requireOwnerOrRole(
  userId: string,
  tenantId: string,
  ownerId: string,
  minRole: Role,
): Promise<void> {
  if (userId === ownerId) return

  await requireRole(userId, tenantId, minRole)
}

// ============================================================
// Super admin check
// ============================================================

export async function requireSuperAdmin(
  userId: string,
  tenantId: string,
): Promise<void> {
  const role = await getUserTenantRole(userId, tenantId)
  if (role !== 'super_admin') {
    throw new AuthorizationError('Requires super admin access')
  }
}

// ============================================================
// Role display helpers
// ============================================================

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Admin',
  analytics_admin: 'Analytics Admin',
  builder: 'Builder',
  viewer: 'Viewer',
  api_user: 'API User',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'Platform-level administrator with full access',
  tenant_admin: 'Full access to all organization resources and settings',
  analytics_admin: 'Manage data sources and all reports & dashboards',
  builder: 'Create and edit reports and dashboards',
  viewer: 'View-only access to shared reports and dashboards',
  api_user: 'Programmatic access via API keys only',
}

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role
}

export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  // Users can only assign roles lower than their own
  return ROLE_HIERARCHY[assignerRole] > ROLE_HIERARCHY[targetRole]
}

export function getAssignableRoles(assignerRole: Role): Role[] {
  return (Object.keys(ROLE_HIERARCHY) as Role[]).filter(
    (role) => ROLE_HIERARCHY[assignerRole] > ROLE_HIERARCHY[role],
  )
}

// ============================================================
// Errors
// ============================================================

export class AuthorizationError extends Error {
  readonly statusCode = 403

  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class AuthenticationError extends Error {
  readonly statusCode = 401

  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}
