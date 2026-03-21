"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash"];

async function generateTextWithFallback(prompt) {
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

function buildFallbackImprovedContent(current, type) {
  const text = (current || "").trim();
  if (!text) {
    return "Delivered measurable results across cross-functional projects, improved process efficiency, and collaborated with stakeholders to ship high-quality outcomes.";
  }

  if (type?.toLowerCase?.().includes("summary")) {
    const compact = text.replace(/\s+/g, " ").trim();
    return `${compact} Focused on measurable impact, ownership, and continuous improvement across team deliverables.`;
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = line.replace(/^[-*]\s*/, "");
      return `- ${cleaned}${
        /%|x|reduced|increased|improved|delivered|optimized|led|built/i.test(cleaned)
          ? ""
          : " (add measurable outcome where possible)"
      }`;
    })
    .join("\n");
}

export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords
    
    Format the response as a single paragraph without any additional text or explanations.
  `;

  try {
    return await generateTextWithFallback(prompt);
  } catch (error) {
    console.warn("AI content improvement unavailable, using fallback improvement:", error?.message);
    return buildFallbackImprovedContent(current, type);
  }
}

function buildFallbackResumeDraft({ fullName, targetRole, yearsOfExperience, skills, achievements, education }) {
  return `# ${fullName || "Your Name"}

## Professional Summary
${fullName || "I"} am a ${targetRole || "professional"} with ${
    yearsOfExperience || "several"
  } years of experience delivering measurable outcomes in collaborative environments.

## Core Skills
${skills
    ? skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `- ${s}`)
        .join("\n")
    : "- Problem solving\n- Communication\n- Stakeholder management"}

## Experience Highlights
${achievements
    ? achievements
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join("\n")
    : "- Delivered key projects with measurable impact\n- Improved team efficiency through process optimization"}

## Education
${education || "Add your degree, institution, and graduation year here."}
`;
}

export async function generateResumeWithAI(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    You are an expert resume writer.
    Generate a concise ATS-friendly resume in clean markdown.

    Candidate details:
    - Full name: ${data.fullName || user.name || "Not provided"}
    - Target role: ${data.targetRole || "Not provided"}
    - Industry: ${user.industry || "Not provided"}
    - Years of experience: ${data.yearsOfExperience || user.experience || "Not provided"}
    - Skills: ${data.skills || (user.skills?.join(", ") ?? "Not provided")}
    - Notable achievements:
    ${data.achievements || "Not provided"}
    - Education:
    ${data.education || "Not provided"}
    - Certifications:
    ${data.certifications || "Not provided"}

    Requirements:
    1. Return markdown only.
    2. Sections: Professional Summary, Core Skills, Experience Highlights, Education, Certifications.
    3. Use bullet points for skills and highlights.
    4. Keep language impact-focused and quantified where possible.
  `;

  try {
    return await generateTextWithFallback(prompt);
  } catch (error) {
    console.warn("AI resume generation unavailable, using fallback draft:", error?.message);
    return buildFallbackResumeDraft(data);
  }
}