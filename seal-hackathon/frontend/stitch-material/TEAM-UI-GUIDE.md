# SEAL UI Reuse Guide (From Stitch Templates)

## Base source
- Split templates: `frontend/stitch-material/pages/*.html`
- Shared extracted CSS: `frontend/stitch-material/styles/seal-material.css`

## Reusable React layout already mapped
- Public shell (MUI): `frontend/src/components/layout/PublicShell.jsx`
  - Applied to: Landing, Login, Register
  - Contains top navbar + shared public footer

## Current Sprint-1 pages using these layouts
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/RegisterPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/LandingPage.jsx` (dynamic upcoming events from backend)

## Team rule for next features
1. Reuse existing layout components first (`PublicShell` for unauthenticated pages).
2. If adding new screen, pick a matching HTML page in `stitch-material/pages`.
3. Extract element pattern into a shared component in `src/components/layout` or `src/components/ui`.
4. Keep colors/spacing consistent with MUI theme in `src/theme.js`.
5. Do not add inline styles in React pages.

## Suggested mapping for upcoming work
- Account approval: use table/filter patterns from `30-seal-admin-user-management.html`
- Permission management: use toggle/grid patterns from `31-seal-admin-permission-management.html`
- Event/track/round management: use shells from `32`, `35`, `36` pages

## Public data endpoint for landing
- `GET /api/public/events/upcoming`
- Response includes event + rounds; landing must render only DB-backed events.
