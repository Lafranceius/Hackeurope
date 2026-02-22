import Link from "next/link";

import { SignInForm } from "@/components/forms/sign-in-form";

const SignInPage = () => (
  <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
    <div className="panel w-full p-6">
      <h1 className="text-[32px] leading-[40px] font-semibold tracking-[-0.02em]">Sign In</h1>
      <p className="mt-2 text-sm text-textMuted">Access your organization workspace.</p>
      <div className="mt-5">
        <SignInForm />
      </div>
      <p className="mt-4 text-sm text-textMuted">
        No account? <Link className="text-brand" href="/auth/sign-up">Create one</Link>
      </p>
    </div>
  </main>
);

export default SignInPage;
