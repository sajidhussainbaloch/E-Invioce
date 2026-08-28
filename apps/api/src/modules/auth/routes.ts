import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { Algorithm, hash, verify } from "@node-rs/argon2";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "@invoice-bank/validation";
import {
  businesses,
  settings as settingsTable,
  users,
} from "../../db/schema.js";
import { db } from "../../db/index.js";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSession,
  deleteSession,
  pruneExpiredSessions,
  requireAuth,
} from "./service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const passwordHash = await hash(body.password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    let user;
    try {
      [user] = await db
        .insert(users)
        .values({ name: body.name, email: body.email, passwordHash })
        .returning();
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        return reply.status(409).send({ message: "An account with this email already exists" });
      }
      throw err;
    }
    const token = await createSession(user.id);
    reply.setCookie(SESSION_COOKIE, token, cookieOptions());
    return { user: publicUser(user) };
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (!user) {
      return reply.status(401).send({ message: "Invalid email or password" });
    }
    const valid = await verify(user.passwordHash, body.password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    if (!valid) {
      return reply.status(401).send({ message: "Invalid email or password" });
    }
    await pruneExpiredSessions();
    const token = await createSession(user.id);
    reply.setCookie(SESSION_COOKIE, token, cookieOptions());
    return { user: publicUser(user) };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    await deleteSession(token ?? "");
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (request) => {
    const auth = request.auth!;
    let business = null;
    if (auth.business) {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, auth.business.id))
        .limit(1);
      const [settingsRow] = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.businessId, auth.business.id))
        .limit(1);
      business = { ...biz, settings: settingsRow ?? null };
    }
    return { user: publicUser(auth.user), business, hasBusiness: auth.businessId != null };
  });

  app.patch("/api/auth/password", { preHandler: requireAuth }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body);
    const auth = request.auth!;
    const valid = await verify(auth.user.passwordHash, body.currentPassword, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    if (!valid) {
      return reply.status(401).send({ message: "Current password is incorrect" });
    }
    const passwordHash = await hash(body.newPassword, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await db.update(users).set({ passwordHash }).where(eq(users.id, auth.user.id));
    await deleteSession(request.cookies[SESSION_COOKIE] ?? "");
    const token = await createSession(auth.user.id);
    reply.setCookie(SESSION_COOKIE, token, cookieOptions());
    return { ok: true };
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}

function publicUser(user: { id: string; name: string; email: string; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}
