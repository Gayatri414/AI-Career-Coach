import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCoverLetter } from "@/actions/cover-letter";
import CoverLetterPreview from "../_components/cover-letter-preview";
import CoverLetterRegenerateButton from "../_components/cover-letter-regenerate-button";

export default async function EditCoverLetterPage({ params }) {
  const { id } = await params;
  const coverLetter = await getCoverLetter(id);

  if (!coverLetter) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-2">
        <Link href="/ai-cover-letter">
          <Button variant="link" className="gap-2 pl-0">
            <ArrowLeft className="h-4 w-4" />
            Back to Cover Letters
          </Button>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <h1 className="text-4xl sm:text-6xl font-bold gradient-title pr-4">
            {coverLetter.jobTitle} at {coverLetter.companyName}
          </h1>
          <CoverLetterRegenerateButton letterId={coverLetter.id} />
        </div>
      </div>

      <CoverLetterPreview content={coverLetter.content} />
    </div>
  );
}