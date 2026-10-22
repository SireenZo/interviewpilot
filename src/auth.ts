import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { getDb, schema } from "@/db";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const providers: Provider[] = [];
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
// Local development only: sign in without setting up OAuth apps. Never available in production builds.
if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      id: "dev",
      name: "Test user",
      credentials: {},
      authorize: async () => ({ id: "dev-user", name: "Test User", email: "test-user@interviewpilot.localhost" }),
    }),
  );
}

export const providerList = providers.map((p) => {
  const config = typeof p === "function" ? p() : p;
  // Custom ids and names passed to a provider factory are kept in `options` until Auth.js merges them.
  const options = (config as { options?: { id?: string; name?: string } }).options;
  return { id: options?.id ?? config.id, name: options?.name ?? config.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  // JWT sessions keep sign-in fast (no session table lookups); our own users table is upserted at sign-in.
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        const db = await getDb();
        const values = {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: user.email ?? null,
          name: user.name ?? null,
          image: user.image ?? null,
        };
        const [row] = await db
          .insert(schema.users)
          .values(values)
          .onConflictDoUpdate({
            target: [schema.users.provider, schema.users.providerAccountId],
            set: { email: values.email, name: values.name, image: values.image },
          })
          .returning({ id: schema.users.id });
        token.uid = row.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
