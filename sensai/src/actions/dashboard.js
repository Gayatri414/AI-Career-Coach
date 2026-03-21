"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash"];

async function generateWithFallback(prompt) {
  let lastError;
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function parseJsonResponse(text) {
  const cleanedText = text.replace(/```(?:json)?\n?/gi, "").trim();
  const start = cleanedText.indexOf("{");
  const end = cleanedText.lastIndexOf("}");
  const jsonText =
    start !== -1 && end > start
      ? cleanedText.slice(start, end + 1)
      : cleanedText;
  return JSON.parse(jsonText);
}

function getFallbackInsights(industry) {
  const industryName = (industry || "your").split("-")[0];
  return {
    salaryRanges: [
      { role: "Junior Specialist", min: 35000, max: 55000, median: 45000, location: "Global" },
      { role: "Mid-Level Specialist", min: 55000, max: 85000, median: 70000, location: "Global" },
      { role: "Senior Specialist", min: 85000, max: 120000, median: 100000, location: "Global" },
      { role: "Lead", min: 110000, max: 145000, median: 127000, location: "Global" },
      { role: "Manager", min: 120000, max: 165000, median: 140000, location: "Global" },
    ],
    growthRate: 8.5,
    demandLevel: "Medium",
    topSkills: ["Communication", "Problem Solving", "Domain Knowledge", "Data Literacy", "Collaboration"],
    marketOutlook: "Neutral",
    keyTrends: [
      `Increased automation in ${industryName}`,
      "Higher focus on measurable impact",
      "Cross-functional collaboration",
      "Continuous upskilling",
      "AI-assisted workflows",
    ],
    recommendedSkills: ["Strategic Thinking", "Technical Fundamentals", "Project Ownership", "Documentation", "AI Tooling"],
  };
}

export const generateAIInsights = async (industry) => {
  const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

  try {
    const text = await generateWithFallback(prompt);
    return parseJsonResponse(text);
  } catch (error) {
    console.warn("AI insights unavailable, using fallback insights:", error?.message);
    return getFallbackInsights(industry);
  }
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist, generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  return user.industryInsight;
}