"use client";

import { useEffect, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Download, FileText, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateResumeWithAI, improveWithAI, saveResume } from "@/actions/resume";
import useFetch from "@/hooks/use-fetch";

const DEFAULT_MARKDOWN = `# Your Name

## Professional Summary

## Experience

## Education

## Skills
`;

export default function ResumeEditor({ initialContent }) {
  const [content, setContent] = useState(initialContent || DEFAULT_MARKDOWN);
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [achievements, setAchievements] = useState("");
  const [education, setEducation] = useState("");
  const [certifications, setCertifications] = useState("");

  const {
    loading: saveLoading,
    fn: saveFn,
    data: saved,
  } = useFetch(saveResume);
  const { loading: generateLoading, fn: generateFn, data: generated } = useFetch(generateResumeWithAI);
  const { loading: improveLoading, fn: improveFn, data: improved } = useFetch(improveWithAI);

  useEffect(() => {
    if (saved) {
      toast.success("Resume saved");
    }
  }, [saved]);

  useEffect(() => {
    if (generated) {
      setContent(generated);
      toast.success("Resume generated with AI");
    }
  }, [generated]);

  useEffect(() => {
    if (improved) {
      setContent(improved);
      toast.success("Summary improved with AI");
    }
  }, [improved]);

  const exportMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resume.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-4 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Resume Builder Assistant
          </CardTitle>
          <CardDescription>
            Fill a few details, generate with AI, then edit and save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Target Role</Label>
            <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Frontend Developer" />
          </div>
          <div className="space-y-2">
            <Label>Years of Experience</Label>
            <Input
              type="number"
              min="0"
              max="50"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
              placeholder="4"
            />
          </div>
          <div className="space-y-2">
            <Label>Skills (comma separated)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Next.js, TypeScript" />
          </div>
          <div className="space-y-2">
            <Label>Achievements</Label>
            <Textarea
              className="min-h-24"
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="One point per line"
            />
          </div>
          <div className="space-y-2">
            <Label>Education</Label>
            <Textarea
              className="min-h-20"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="B.Sc in Computer Science - XYZ University"
            />
          </div>
          <div className="space-y-2">
            <Label>Certifications</Label>
            <Textarea
              className="min-h-20"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="AWS Certified Developer, Google Analytics..."
            />
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            disabled={generateLoading}
            onClick={() =>
              generateFn({
                fullName,
                targetRole,
                yearsOfExperience,
                skills,
                achievements,
                education,
                certifications,
              })
            }
          >
            {generateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate with AI
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Resume Editor
          </CardTitle>
          <CardDescription>
            Edit your markdown resume, improve summary with AI, then save or export.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => saveFn(content)} disabled={saveLoading} className="gap-2">
              {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => improveFn({ current: content, type: "resume summary and bullets" })}
              disabled={improveLoading}
              className="gap-2"
            >
              {improveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Improve with AI
            </Button>
            <Button type="button" variant="outline" onClick={exportMarkdown} className="gap-2">
              <Download className="h-4 w-4" />
              Export .md
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()} className="gap-2">
              <Download className="h-4 w-4" />
              Save as PDF
            </Button>
          </div>

          <div data-color-mode="light" className="rounded-md border border-border overflow-hidden">
            <MDEditor value={content} onChange={(v) => setContent(v ?? "")} height={640} />
          </div>
          <div className="hidden print:block">
            <MDEditor.Markdown source={content} />
          </div>
        </CardContent>
      </Card>
      <style jsx global>{`
        @media print {
          button {
            display: none !important;
          }
          .w-md-editor-toolbar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
