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
  const navLinkClass =
    "rounded-md px-3 py-2 font-medium text-[#111111] hover:bg-[#eef2f7] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/15";

  return (
    <header className="sticky top-0 z-30 subtle-divider bg-white/92 backdrop-blur">
      <div className="container-shell flex h-16 items-center justify-between gap-5">
        <Link
          href="/"
          className="text-[24px] leading-none font-extrabold tracking-[-0.02em] text-textPrimary sm:text-[28px]"
        >
          Kiva
        </Link>
        <TopNavSearch />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/marketplace" className={navLinkClass}>
            Marketplace
          </Link>
          <Link href="/requests" className={navLinkClass}>
            Requests
          </Link>
          {consoleHref ? (
            <Link href={consoleHref} className={navLinkClass}>
              Console
            </Link>
          ) : null}
          {session?.user?.isPlatformAdmin ? (
            <Link href="/admin" className={navLinkClass}>
              Admin
            </Link>
          ) : null}
          {session?.user ? (
            <Link
              href="/api/auth/signout?callbackUrl=/"
              className="rounded-md border border-border px-3 py-2 font-medium text-[#111111] hover:border-borderStrong hover:bg-[#eef2f7]"
            >
              Log out
            </Link>
          ) : (
            <>
              <Link href="/auth/sign-in" className={navLinkClass}>
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
