# Deploy Stock X to Vercel

The root `api/index.js` exports the Express adapter in `server/vercel.js`.
The adapter initializes MongoDB before dispatching to the existing API routes.
Vercel serves the frontend from `client/Final Project ADVWEBDEV/dist`.

1. In the existing Vercel project, set **Root Directory** to the repository root
   (clear the client subdirectory) and **Framework Preset** to **Other**.
   Clear old install/build/output overrides so `vercel.json` controls them.
2. Add these server environment variables for **Production**:
   - `MONGO_URI`: the existing MongoDB Atlas connection string and database name.
   - `JWT_SECRET`: a random secret of at least 32 characters.
   - `CLIENT_ORIGIN`: the production site's HTTPS origin, with no trailing slash.
   - `NODE_ENV`: `production`.
   Add the variables for Preview too if preview deployments will be used.
   `CLIENT_ORIGIN` accepts comma-separated origins.
3. Ensure MongoDB's network rules allow connections from the deployment.
   Do not commit database credentials or JWT secrets to the repository.
4. Deploy the commit after updating settings and environment variables.

Verification on the deployed domain:

- `/api/health`: HTTP 200, `{"status":"ok"}`.
- `/api/auth/me` without a session: HTTP 401 with JSON code `UNAUTHENTICATED`.
- `/login`: the login form loads, including after a direct refresh.
- Sign in and refresh to verify that the session cookie persists.

If `/api/health` returns 503, check the function logs and database configuration.
If it returns HTML or 404, check the Root Directory and deployment branch.

Local development still uses `npm run setup` followed by `npm run dev`.
Run backend regression tests with `npm --prefix server test`.
