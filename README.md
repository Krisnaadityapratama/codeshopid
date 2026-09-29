# Codeshop Technical Hub

The application uses Supabase Auth for sessions, `profiles` for account roles, and the `app_content` table for products, troubleshooting articles, software, tutorials, playlists, and IPOS help articles.

## Supabase Setup

1. Open the Supabase project SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). It creates the tables, profile trigger, Row Level Security policies, and starter content.
2. In Supabase Authentication, create the first user with an email and password.
3. Promote that user to the initial administrator by running this SQL with the same email:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = lower('admin@your-company.com');
   ```

4. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project URL and publishable/anon key from Supabase Project Settings > API. Never put the `service_role` key in a `VITE_` variable or client-side file.
5. Install dependencies and start the app:

   ```powershell
   npm install
   npm run dev
   ```

6. To manage Auth users from the admin page, install the Supabase CLI, log in, link this project, then deploy the Edge Function:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase functions deploy manage-user
   ```

   The function uses Supabase's server-side `SUPABASE_SERVICE_ROLE_KEY`; it verifies the caller's Auth token and admin profile before creating or deleting an account. Keep that key out of the browser.

## Access Model

- Authenticated users can read the knowledge-base content.
- Only profiles with `role = 'admin'` can create, update, or delete content. PostgreSQL RLS enforces this even if someone bypasses the UI.
- User creation and deletion use the `manage-user` Edge Function because the Auth Admin API must never run with a service-role key in the browser.
- New Auth users receive a `sales` profile by default. Promote the first administrator with the SQL above.
- Content rows use `(collection, record_id)` as their key. App data is stored in JSONB payloads so product specifications and playlist lessons retain their shape.

## Existing Browser Data

On the first sign-in as an administrator, the app imports legacy browser content into Supabase only when a matching record ID is not already present. Existing cloud records are never overwritten. Legacy content keys are removed after a successful import, and an import marker prevents deleted records from being recreated later.

Local demo accounts and password hashes are not imported. Create accounts in Supabase Auth; then promote the initial administrator as described above. If legacy local content has already been deleted by the browser, restore it from a backup before running the app against Supabase.

## Development Checks

```powershell
npm run build
npm run lint
```
