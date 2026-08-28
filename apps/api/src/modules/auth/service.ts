import type { FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { businessUsers, businesses, sessions, users } from "../../db/schema.js";
import type { Business, Session, User } from "../../db/schema.js";
import { db } from "../../db/index.js";

export const SESSION_COOKIE = "ib_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      user: User;
      businessId?: string;
      business?: Business | null;
    };
  }
}

export async function resolveSession(request: FastifyRequest): Promise<void> {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      session: sessions,
      user: users,
      business: businesses,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(businessUsers, eq(businessUsers.userId, users.id))
    .leftJoin(businesses, eq(businessUsers.businessId, businesses.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return;
  request.auth = {
    user: row.user,
    businessId: row.business?.id,
    business: row.business,
  };
}

export async function requireAuth(request: FastifyRequest): Promise<void> {
  if (!request.auth) {
    throw new Error("Unauthorized");
  }
}

export async function requireBusiness(request: FastifyRequest): Promise<void> {
  requireAuth(request);
  if (!request.auth?.businessId) {
    throw new Error("Business not setup");
  }
}