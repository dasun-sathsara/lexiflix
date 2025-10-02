import { headers } from "next/headers";

import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { auth } from "@/lib/auth";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <AppTopbar title="Settings" />
      <SettingsClient
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        }}
      />
    </>
  );
}
