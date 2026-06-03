import { AppShell } from "@/components/app-shell";
import { ProfileView } from "@/features/profile/profile-view";
import { getMyProfile } from "@/services/profile";

export default async function ProfilePage() {
  const { company, profile } = await getMyProfile();

  return (
    <AppShell>
      <ProfileView company={company} profile={profile} />
    </AppShell>
  );
}
