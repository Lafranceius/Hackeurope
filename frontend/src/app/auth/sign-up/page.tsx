import Link from "next/link";

import { SignUpForm } from "@/components/forms/sign-up-form";

const SignUpPage = () => (
  <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
    <div className="panel w-full p-6">
      <h1 className="text-[32px] leading-[40px] font-semibold tracking-[-0.02em]">Create Account</h1>
      <p className="mt-2 text-sm text-textMuted">Set up your organization and start trading data.</p>
      <div className="mt-5">
        <SignUpForm />
      </div>
      <p className="mt-4 text-sm text-textMuted">
        Already have an account? <Link className="text-brand" href="/auth/sign-in">Sign in</Link>
      </p>
    </div>
  </main>
);

export default SignUpPage;
