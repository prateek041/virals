import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectsList } from "@/components/projects/projects-list";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectsList />
    </div>
  );
}
