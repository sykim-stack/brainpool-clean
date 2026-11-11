import type { NextRequest } from 'next/server';

export type PrincipalType = 'device' | 'user' | 'service';

export interface Principal {
  type: PrincipalType;
  id: string;
  deviceId?: string;
  userId?: string;
  /** Platform 통합 아이디 (사람 단위). 없으면 device 전용 동작 */
  ownerKey?: string;
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
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
 * - x-device-id : 기기 식별자 (기존과 동일, 유지)
 * - x-owner-key : Platform 사람 식별자 (optional). 있으면 Principal.ownerKey에 부착
 *
 * Body/query identifiers must be checked against this result by callers and are never
 * promoted to a principal automatically.
 */
export function getPrincipal(
  request: Request | NextRequest,
  options: { allowServiceToken?: boolean } = {},
): PrincipalResult {
  const deviceId = normalize(request.headers.get('x-device-id'));
  const ownerKeyHeader = normalize(request.headers.get('x-owner-key'));

  if (deviceId) {
    if (!isValidDeviceId(deviceId)) {
      return {
        principal: null,
        error: { code: 'INVALID_PRINCIPAL', message: 'invalid x-device-id' },
      };
    }

    let ownerKey: string | undefined;
    if (ownerKeyHeader) {
      if (!isValidUserId(ownerKeyHeader)) {
        return {
          principal: null,
          error: { code: 'INVALID_PRINCIPAL', message: 'invalid x-owner-key' },
        };
      }
      ownerKey = ownerKeyHeader;
    }

    return {
      principal: {
        type: 'device',
        id: deviceId,
        deviceId,
        ownerKey,
      },
      error: null,
    };
  }

  // device_id 없이 owner_key만 온 경우 — 사람 단위 principal 허용
  if (ownerKeyHeader) {
    if (!isValidUserId(ownerKeyHeader)) {
      return {
        principal: null,
        error: { code: 'INVALID_PRINCIPAL', message: 'invalid x-owner-key' },
      };
    }
    return {
      principal: {
        type: 'user',
        id: ownerKeyHeader,
        userId: ownerKeyHeader,
        ownerKey: ownerKeyHeader,
      },
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
      message: 'x-device-id or x-owner-key header required',
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
    principal: {
      type: 'user',
      id: normalized,
      userId: normalized,
      ownerKey: normalized,
    },
    error: null,
  };
}

/**
 * identifier가 이 principal에 속하는지 확인.
 * device / user / ownerKey 모두 허용 (기존 호환 + 통합).
 */
export function principalOwnsIdentifier(
  principal: Principal,
  identifier: string | null | undefined,
): boolean {
  const value = normalize(identifier);
  if (!value) return false;
  if (principal.type === 'service') return true;

  return (
    value === principal.id ||
    value === principal.deviceId ||
    value === principal.userId ||
    value === principal.ownerKey
  );
}

/**
 * CoreHub Fact 등 사람 단위 id가 필요할 때 사용.
 * ownerKey 우선, 없으면 device/user id로 fallback (기존 동작 유지).
 */
export function resolveOwnerKey(principal: Principal): string {
  return (
    principal.ownerKey ||
    principal.userId ||
    principal.deviceId ||
    principal.id
  );
}
