import type { AccessScope } from './access-scope';

export interface OwnedProperty {
  id: string;
  ownerId: string;
  currency: string;
  isActive: boolean;
}

export interface OwnedRoom {
  id: string;
  propertyId: string;
  isActive: boolean;
}

/**
 * Współdzielona polityka własności (BR-12, apps/api/docs/application-layer.md#polityki-dostępu).
 * Brak zasobu, zasób usunięty (soft delete) i zasób innego właściciela dają ten sam `NotFoundError` (404).
 */
export interface OwnershipPolicy {
  assertProperty(propertyId: string, scope: AccessScope): Promise<OwnedProperty>;
  assertRoom(
    roomId: string,
    scope: AccessScope,
  ): Promise<{ room: OwnedRoom; property: OwnedProperty }>;
}

export const OWNERSHIP_POLICY = Symbol('OWNERSHIP_POLICY');
