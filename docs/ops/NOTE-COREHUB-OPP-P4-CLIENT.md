# CoreHub Opportunities P4.3 client patch

## Status
- `lib/corehub.ts` on this branch: Bearer-only opportunities client (no owner fields).
- `app/page.tsx` still needs the unified patch: `docs/ops/corehub-opp-p4-page.patch`.

## Why
Production CoreHub returns:
- `400 owner_fields_not_accepted` if `owner_key` / `device_id` appear in query/body
- `401 auth_required` without `Authorization: Bearer`

Scope is derived server-side from principal → `auth_owner_links`.

## Client behaviour after full apply
1. Never send owner fields on opportunities GET/PATCH
2. If no session token in localStorage (`corehub_session` / `sb-*-auth-token`) → skip network, empty list (no console 400)
3. If Bearer present → GET/PATCH with `Authorization` only

## Apply page.tsx
```bash
git checkout fix/corehub-opp-p4-bearer-v2
git apply docs/ops/corehub-opp-p4-page.patch
git add app/page.tsx
git commit -m "fix(ui): wire page opportunities to P4.3 corehub client"
```

Or copy the full patched file from the PR discussion / local artifacts `page.tsx.COREHUB_OPP_P4`.
