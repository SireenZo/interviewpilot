import { redirect } from "next/navigation";
import { auth, providerList, signIn } from "@/auth";
import Orb from "@/components/Orb";

export const metadata = { title: "Sign in · InterviewPilot" };

const ICONS: Record<string, string> = { github: "🐙", google: "🔵", dev: "🧪" };

function safeRedirect(target: string | undefined) {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const redirectTo = safeRedirect((await searchParams).callbackUrl);
  if ((await auth())?.user) redirect(redirectTo);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <Orb state="idle" size={96} />
      <h1 className="mt-6 text-3xl font-bold">Sign in to InterviewPilot</h1>
      <p className="mt-3 text-zinc-400">
        Get real AI interviews, a saved history with your progress over time, and scorecards you can share.
      </p>
      <div className="mt-8 w-full space-y-3">
        {providerList.length === 0 && (
          <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Sign-in isn&apos;t configured yet. You can still try the free demo.
          </p>
        )}
        {providerList.map((p) => (
          <form
            key={p.id}
            action={async () => {
              "use server";
              await signIn(p.id, { redirectTo });
            }}
          >
            <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3.5 font-medium transition hover:bg-white/10">
              <span aria-hidden>{ICONS[p.id] ?? "🔑"}</span>
              Continue with {p.name}
              {p.id === "dev" && <span className="rounded bg-amber-500/20 px-1.5 text-xs text-amber-200">dev only</span>}
            </button>
          </form>
        ))}
      </div>
      <p className="mt-8 text-xs text-zinc-500">
        By signing in you agree to our <a href="/privacy" className="underline hover:text-zinc-300">privacy policy</a>.
      </p>
    </main>
  );
}
