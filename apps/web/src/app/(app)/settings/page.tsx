import { getSettingsPreferences } from "@/features/settings/server/preferences";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await requireSession();

  const preferences = await getSettingsPreferences(session.user.id);

  return (
    <>
      <AppTopbar title="Settings" />
      <SettingsClient
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        }}
        preferences={preferences}
      />
    </>
  );
}
