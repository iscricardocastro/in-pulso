import { redirect } from "next/navigation";
import { resolveAuthenticatedHomePath } from "@/services/context";

export default async function HomePage() {
  redirect(await resolveAuthenticatedHomePath());
}
