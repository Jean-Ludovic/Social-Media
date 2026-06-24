import { User } from '@prisma/client';

/** Whitelists the fields safe to return to a client — `passwordHash` is never included. */
export function sanitizeUser(user: User) {
  const { id, email, displayName, bio, avatarUrl, createdAt } = user;
  return { id, email, displayName, bio, avatarUrl, createdAt };
}
