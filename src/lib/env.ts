/**
 * Environment variable validation
 *
 * Import this module to ensure required env vars are present.
 * Throws a descriptive error at startup instead of failing at runtime.
 */

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}. ` +
            `Add it to .env.local or your hosting provider's env settings.`
        );
    }
    return value;
}

export const GEMINI_API_KEY = requireEnv("GEMINI_API_KEY");
