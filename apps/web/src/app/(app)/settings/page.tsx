import { getAiServicesSettings, getSettingsPreferences } from "@/features/settings/server/queries";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth/guards";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await requireSession();

  const [preferences, aiServices] = await Promise.all([
    getSettingsPreferences(session.user.id),
    getAiServicesSettings({
      userId: session.user.id,
      isAdmin: session.user.role === "admin",
    }),
  ]);

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
        aiServices={aiServices}
      />
    </>
  );
}
