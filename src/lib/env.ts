// Small helper to read required env vars with a clear error if missing.
// Used by server-only modules (never imported into client components).

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example and set it in Railway.`,
    );
  }
  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
