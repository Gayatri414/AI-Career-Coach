"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash"];

async function generateTextWithFallback(prompt) {
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

function parseQuizJson(text) {
  const cleaned = text.replace(/```(?:json)?\n?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice =
    start !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

function buildFallbackQuestions(industry) {
  const domain = industry || "your field";
  return [
    {
      question: `In ${domain}, what should you do first before implementing a major solution?`,
      options: [
        "Deploy immediately",
        "Define requirements and success metrics",
        "Skip stakeholder input",
        "Avoid documenting assumptions",
      ],
      correctAnswer: "Define requirements and success metrics",
      explanation:
        "Clear requirements and measurable outcomes reduce risk and improve delivery quality.",
    },
    {
      question: "Which approach most improves maintainability?",
      options: [
        "Large tightly-coupled functions",
        "Modular code with clear names",
        "No tests for fast shipping",
        "Copy-paste similar logic",
      ],
      correctAnswer: "Modular code with clear names",
      explanation:
        "Modular, readable code is easier to test, debug, and evolve safely.",
    },
    {
      question: "What best prevents regressions in production?",
      options: [
        "Manual checks only",
        "Automated tests plus review",
        "Skipping CI",
        "Hotfixes without validation",
      ],
      correctAnswer: "Automated tests plus review",
      explanation:
        "Automated tests catch behavior changes early, and reviews reduce defects.",
    },
    {
      question: "How should tasks be prioritized?",
      options: [
        "By complexity only",
        "By user and business impact",
        "By personal preference",
        "By random assignment",
      ],
      correctAnswer: "By user and business impact",
      explanation:
        "Impact-based prioritization aligns engineering work with outcomes.",
    },
    {
      question: "What improves team execution speed the most?",
      options: [
        "Late status updates",
        "Early risk communication",
        "Working in isolation",
        "No handoff notes",
      ],
      correctAnswer: "Early risk communication",
      explanation:
        "Early risk visibility helps teams unblock quickly and avoid delays.",
    },
    {
      question: "When is refactoring most valuable?",
      options: [
        "Only for style changes",
        "When it reduces complexity and bugs",
        "When adding unused abstractions",
        "When removing all comments",
      ],
      correctAnswer: "When it reduces complexity and bugs",
      explanation:
        "Effective refactoring simplifies future changes and lowers defect rates.",
    },
    {
      question: "Why is observability important in systems?",
      options: [
        "It replaces testing",
        "It helps detect and debug issues",
        "It should be added after incidents only",
        "It is unnecessary for production",
      ],
      correctAnswer: "It helps detect and debug issues",
      explanation:
        "Logs, metrics, and traces make production behavior visible and actionable.",
    },
    {
      question: "What is a practical API reliability practice?",
      options: [
        "Accept invalid input",
        "Validate input and return clear errors",
        "Always return HTTP 200",
        "Disable retries everywhere",
      ],
      correctAnswer: "Validate input and return clear errors",
      explanation:
        "Validation plus clear errors improves resilience and client behavior.",
    },
    {
      question: "How should secrets be handled?",
      options: [
        "Store plaintext credentials",
        "Use secure secret storage and least privilege",
        "Share keys in tickets",
        "Use one key for all environments",
      ],
      correctAnswer: "Use secure secret storage and least privilege",
      explanation:
        "Scoped access and secure storage are core security best practices.",
    },
    {
      question: "What is the strongest continuous improvement habit?",
      options: [
        "Ignore retrospective feedback",
        "Measure outcomes and iterate",
        "Avoid post-release reviews",
        "Change process every day",
      ],
      correctAnswer: "Measure outcomes and iterate",
      explanation:
        "Reviewing outcomes and iterating leads to stable long-term improvement.",
    },
  ];
}

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  if (!user.industry) {
    throw new Error("Complete your profile (industry) before starting a quiz");
  }

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const text = await generateTextWithFallback(prompt);
    const quiz = parseQuizJson(text);

    if (!quiz?.questions?.length) {
      throw new Error("Invalid quiz format from AI");
    }

    return quiz.questions;
  } catch (error) {
    console.warn("AI quiz unavailable, using fallback questions:", error?.message);
    return buildFallbackQuestions(user.industry);
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      improvementTip = (await generateTextWithFallback(improvementPrompt)).trim();
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}