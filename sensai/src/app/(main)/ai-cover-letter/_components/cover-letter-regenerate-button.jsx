"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { regenerateCoverLetter } from "@/actions/cover-letter";
import useFetch from "@/hooks/use-fetch";

export default function CoverLetterRegenerateButton({ letterId }) {
  const router = useRouter();
  const {
    loading,
    fn: regenerateFn,
    data: updated,
  } = useFetch(regenerateCoverLetter);

  useEffect(() => {
    if (updated) {
      toast.success("New version generated with AI");
      router.refresh();
    }
  }, [updated, router]);

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={loading}
      onClick={() => regenerateFn(letterId)}
      className="gap-2 shrink-0"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      Generate with AI
    </Button>
  );
}
