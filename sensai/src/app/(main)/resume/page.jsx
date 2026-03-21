import { redirect } from "next/navigation";
import { getResume } from "@/actions/resume";
import { getUserOnboardingStatus } from "@/actions/user";
import ResumeEditor from "./_components/resume-editor";

export default async function ResumePage() {
  const { isOnboarded } = await getUserOnboardingStatus();
  if (!isOnboarded) {
    redirect("/onboarding");
  }

  const resume = await getResume();

  return (
    <div>
      <h1 className="text-6xl font-bold gradient-title mb-2">Build Resume</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Edit your resume as Markdown and save. You can use headings, lists, and
        emphasis for a clear ATS-friendly structure.
      </p>
      <ResumeEditor initialContent={resume?.content ?? undefined} />
    </div>
  );
}
