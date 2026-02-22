import Link from "next/link";
import { cookies } from "next/headers";

import { getAuthSession } from "@/server/auth";
import { TopNavSearch } from "@/components/layout/top-nav-search";

export const TopNav = async () => {
  const session = await getAuthSession();
  const activeOrgId = (await cookies()).get("activeOrgId")?.value ?? session?.user.activeOrgId;
  const consoleHref = session?.user
    ? `/org/${activeOrgId ?? session.user.memberships[0]?.orgId}/analytics`
    : null;

  return (
    <header className="sticky top-0 z-30 subtle-divider bg-white/92 backdrop-blur">
      <div className="container-shell flex h-16 items-center justify-between gap-5">
        <Link href="/" className="text-[18px] font-semibold tracking-[-0.01em] text-textPrimary">
          DataMarket
        </Link>
        <TopNavSearch />
        <nav className="flex items-center gap-1 text-sm text-textSecondary">
          <Link href="/marketplace" className="rounded-md px-3 py-2 hover:bg-mutedSurface hover:text-textPrimary">
            Marketplace
          </Link>
          <Link href="/requests" className="rounded-md px-3 py-2 hover:bg-mutedSurface hover:text-textPrimary">
            Requests
          </Link>
          {consoleHref ? (
            <Link href={consoleHref} className="rounded-md px-3 py-2 hover:bg-mutedSurface hover:text-textPrimary">
              Console
            </Link>
          ) : null}
          {session?.user?.isPlatformAdmin ? (
            <Link href="/admin" className="rounded-md px-3 py-2 hover:bg-mutedSurface hover:text-textPrimary">
              Admin
            </Link>
          ) : null}
          {session?.user ? (
            <Link
              href="/api/auth/signout?callbackUrl=/"
              className="rounded-md border border-border px-3 py-2 hover:border-borderStrong hover:bg-mutedSurface"
            >
              Log out
            </Link>
          ) : (
            <>
              <Link href="/auth/sign-in" className="rounded-md px-3 py-2 hover:bg-mutedSurface hover:text-textPrimary">
                Log in
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-md bg-brand px-3 py-2 font-semibold text-white shadow-sm hover:bg-brandStrong"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
