import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 print:hidden">
      {/* A plain link (full page load) so "home" always resets an interview in progress. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="flex items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm">IP</span>
        InterviewPilot
      </a>
      <nav className="flex items-center gap-1 text-sm sm:gap-3">
        {user ? (
          <>
            <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-zinc-300 transition hover:bg-white/5 hover:text-white">
              Dashboard
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white" title="Sign out">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/30 text-xs font-semibold text-violet-100">
                    {(user.name ?? "U").slice(0, 1)}
                  </span>
                )}
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </>
        ) : (
          <Link href="/signin" className="rounded-lg bg-white/10 px-4 py-1.5 font-medium text-white transition hover:bg-white/15">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
