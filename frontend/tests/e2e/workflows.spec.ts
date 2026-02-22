import { expect, test } from "@playwright/test";

test("seller publish and buyer purchase flow shell", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await expect(page.getByText("Sign In")).toBeVisible();
});

test("request to bid to contract flow shell", async ({ page }) => {
  await page.goto("/requests");
  await expect(page.getByText("Collection Requests")).toBeVisible();
});
