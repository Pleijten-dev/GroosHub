import { getDbConnection } from '../connection';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getAllOrganizations(): Promise<Organization[]> {
  const db = getDbConnection();
  const result = await db`
    SELECT id, name, slug, settings, is_active, created_at, updated_at
    FROM org_organizations
    ORDER BY created_at DESC
  `;
  return result as Organization[];
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const db = getDbConnection();
  const result = await db`
    SELECT id, name, slug, settings, is_active, created_at, updated_at
    FROM org_organizations
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return result.length > 0 ? (result[0] as Organization) : null;
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const db = getDbConnection();
  const result = await db`
    SELECT id, name, slug, settings, is_active, created_at, updated_at
    FROM org_organizations
    WHERE id = ${id}
    LIMIT 1
  `;
  return result.length > 0 ? (result[0] as Organization) : null;
}
