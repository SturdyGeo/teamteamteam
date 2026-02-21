import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TEST_PASSWORD = "integration-test-password-123!";

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Ensure Supabase local dev is running and env vars are set.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function createTestUser(
  admin: SupabaseClient,
  email: string,
): Promise<TestUser> {
  // Create user via admin API (auto-confirmed)
  const { data: userData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

  if (createError) {
    throw new Error(`Failed to create test user ${email}: ${createError.message}`);
  }

  // Sign in with anon client to get a real JWT
  const anonClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });

  if (signInError || !signInData.session) {
    throw new Error(
      `Failed to sign in test user ${email}: ${signInError?.message ?? "No session returned"}`,
    );
  }

  return {
    id: userData.user.id,
    email,
    accessToken: signInData.session.access_token,
  };
}
