import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/features/settings/settings-view";
import { getCompanySettings } from "@/services/settings";

export default async function SettingsPage() {
  const company = await getCompanySettings();

  return (
    <AppShell>
      <SettingsView company={company} />
    </AppShell>
  );
}
