"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SignInForm = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim().toLowerCase();
    const password = String(formData.get("password"));

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid credentials");
      return;
    }

    const session = await getSession();
    const destination = session?.user?.isPlatformAdmin ? "/admin" : "/marketplace";
    router.push(destination);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" required />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
};
