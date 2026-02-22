"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SignUpForm = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      orgName: String(formData.get("orgName")),
      orgType: String(formData.get("orgType")),
      billingEmail: String(formData.get("billingEmail"))
    };

    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to create account");
      return;
    }

    router.push("/auth/sign-in");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="field-label">Full name</label>
        <Input name="name" required />
      </div>
      <div>
        <label className="field-label">Work email</label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <label className="field-label">Password</label>
        <Input name="password" type="password" required minLength={8} />
      </div>
      <div>
        <label className="field-label">Company name</label>
        <Input name="orgName" required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Org type</label>
          <select name="orgType" defaultValue="BOTH" className="w-full">
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div>
          <label className="field-label">Billing email</label>
          <Input name="billingEmail" type="email" />
        </div>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
};
