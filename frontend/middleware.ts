export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/datasets/new",
    "/org/:path*",
    "/contracts/:path*",
    "/admin",
    "/requests/new",
    "/requests/:requestId/bid"
  ]
};
