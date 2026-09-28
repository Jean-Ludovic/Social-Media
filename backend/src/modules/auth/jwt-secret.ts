import { ConfigService } from '@nestjs/config';

/**
 * Returns the JWT secret or throws immediately.
 * No fallback on purpose: the app must never start (any environment)
 * with a missing — and therefore guessable — secret.
 */
export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Refusing to start — define it in the environment.');
  }
  return secret;
}
