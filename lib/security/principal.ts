import type { NextRequest } from 'next/server';

export type PrincipalType = 'device' | 'user' | 'service';

export interface Principal {
  type: PrincipalType;
  id: string;
  deviceId?: string;
  userId?: string;
}

export interface PrincipalError {
  code: 'MISSING_PRINCIPAL' | 'INVALID_PRINCIPAL';
  message: string;
}

export interface PrincipalResult {
  principal: Principal | null;
  error: PrincipalError | null;
}

const DEVICE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalize(value: string | null | undefined): string {
  return value?.trim() || '';
}

function isValidDeviceId(value: string): boolean {
  return DEVICE_ID_PATTERN.test(value);
}

function isValidUserId(value: string): boolean {
  return USER_ID_PATTERN.test(value);
}

/**
 * Resolve the current request principal without changing the existing anonymous-device model.
 *
 * The x-device-id header is the only trusted device identity at this boundary. Body/query
 * identifiers must be checked against this result by callers and are never promoted to a
 * principal automatically.
 */
export function getPrincipal(
  request: Request | NextRequest,
  options: { allowServiceToken?: boolean } = {},
): PrincipalResult {
  const deviceId = normalize(request.headers.get('x-device-id'));

  if (deviceId) {
    if (!isValidDeviceId(deviceId)) {
      return {
        principal: null,
        error: { code: 'INVALID_PRINCIPAL', message: 'invalid x-device-id' },
      };
    }

    return {
      principal: { type: 'device', id: deviceId, deviceId },
      error: null,
    };
  }

  if (options.allowServiceToken) {
    const expected = normalize(process.env.BRAINPOOL_INTERNAL_SERVICE_TOKEN);
    const supplied = normalize(request.headers.get('x-brainpool-service-token'));
    if (expected && supplied && supplied === expected) {
      return {
        principal: { type: 'service', id: 'brainpool-internal' },
        error: null,
      };
    }
  }

  return {
    principal: null,
    error: {
      code: 'MISSING_PRINCIPAL',
      message: 'x-device-id header required',
    },
  };
}

/**
 * Convert a verified UUID user id to a principal only when a future Auth adapter has already
 * established that identity. This intentionally does not read a user id from request input.
 */
export function principalFromUserId(userId: string): PrincipalResult {
  const normalized = normalize(userId);
  if (!isValidUserId(normalized)) {
    return {
      principal: null,
      error: { code: 'INVALID_PRINCIPAL', message: 'invalid user id' },
    };
  }

  return {
    principal: { type: 'user', id: normalized, userId: normalized },
    error: null,
  };
}

export function principalOwnsIdentifier(
  principal: Principal,
  identifier: string | null | undefined,
): boolean {
  const value = normalize(identifier);
  if (!value || principal.type === 'service') return principal.type === 'service';
  return value === principal.id || value === principal.deviceId || value === principal.userId;
}
