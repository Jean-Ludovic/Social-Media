import { User } from '@prisma/client';

/**
 * Representation of the authenticated user's own account (login, register, /users/me).
 * `passwordHash` is never included.
 */
export function sanitizeUser(user: User) {
  const { id, email, displayName, bio, avatarUrl, createdAt } = user;
  return { id, email, displayName, bio, avatarUrl, createdAt };
}

/** Representation of any other user: no email, no credentials. */
export function toPublicUser(user: User) {
  const { id, displayName, bio, avatarUrl, createdAt } = user;
  return { id, displayName, bio, avatarUrl, createdAt };
}
