"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash"];

function buildCoverLetterPrompt(user, data) {
  return `
    Write a professional cover letter for a ${data.jobTitle} position at ${
    data.companyName
  }.

    About the candidate:
    - Industry: ${user.industry ?? "Not specified"}
    - Years of Experience: ${user.experience ?? "Not specified"}
    - Skills: ${user.skills?.length ? user.skills.join(", ") : "Not specified"}
    - Professional Background: ${user.bio ?? "Not specified"}

    Job Description:
    ${data.jobDescription}

    Requirements:
    1. Use a professional, enthusiastic tone
    2. Highlight relevant skills and experience
    3. Show understanding of the company's needs
    4. Keep it concise (max 400 words)
    5. Use proper business letter formatting in markdown
    6. Include specific examples of achievements
    7. Relate candidate's background to job requirements

    Format the letter in markdown.
  `;
}

function buildFallbackCoverLetter(user, data) {
  const candidateName = user.name || "Hiring Team";
  const skills = user.skills?.length ? user.skills.join(", ") : "relevant skills";
  const experience =
    typeof user.experience === "number"
      ? `${user.experience}+ years of experience`
      : "hands-on experience";
  const background = user.bio?.trim()
    ? user.bio.trim()
    : "I have built practical projects and delivered measurable results across teams.";

  return `Dear Hiring Manager,

I am excited to apply for the ${data.jobTitle} role at ${data.companyName}. With ${experience} in ${user.industry || "my field"}, I am confident I can contribute quickly and effectively to your team.

My background includes ${background} I have developed strengths in ${skills}, which align well with the expectations in your job description.

I am particularly interested in this opportunity because it combines meaningful impact with the chance to solve real business problems. I would welcome the opportunity to bring a strong work ethic, ownership mindset, and collaborative approach to ${data.companyName}.

Thank you for your time and consideration. I would be glad to discuss how my background fits your needs.

Sincerely,
${candidateName}`;
}

async function generateCoverLetterContent(user, data) {
  const prompt = buildCoverLetterPrompt(user, data);
  let lastError;
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  let content;
  try {
    content = await generateCoverLetterContent(user, data);
  } catch (error) {
    console.warn("AI cover letter unavailable, using fallback template:", error?.message);
    content = buildFallbackCoverLetter(user, data);
  }

  const coverLetter = await db.coverLetter.create({
    data: {
      content,
      jobDescription: data.jobDescription,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      status: "completed",
      userId: user.id,
    },
  });

  revalidatePath("/ai-cover-letter");
  return coverLetter;
}

export async function regenerateCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const existing = await db.coverLetter.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!existing) throw new Error("Cover letter not found");

  const data = {
    jobTitle: existing.jobTitle,
    companyName: existing.companyName,
    jobDescription:
      existing.jobDescription?.trim() ||
      "No job description was saved; infer a strong generic letter from the role and company name.",
  };

  let content;
  try {
    content = await generateCoverLetterContent(user, data);
  } catch (error) {
    console.warn("AI regenerate unavailable, using fallback template:", error?.message);
    content = buildFallbackCoverLetter(user, data);
  }

  const updated = await db.coverLetter.update({
    where: { id },
    data: {
      content,
      status: "completed",
    },
  });

  revalidatePath("/ai-cover-letter");
  revalidatePath(`/ai-cover-letter/${id}`);
  return updated;
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}