import type { Metadata } from "next";
import { ReactNode } from "react";

import { Providers } from "@/components/providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Data Marketplace + Contracting",
  description: "Enterprise data brokerage and contracting platform"
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
