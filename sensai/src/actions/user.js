"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

function getProfileUpdateErrorMessage(error) {
  const message = error?.message?.toLowerCase?.() || "";

  if (message.includes("unauthorized")) {
    return "Your session expired. Please sign in again and retry.";
  }

  if (message.includes("user not found")) {
    return "Your account profile was not found. Please sign out and sign in again.";
  }

  if (
    message.includes("api key") ||
    message.includes("gemini") ||
    message.includes("model") ||
    message.includes("quota") ||
    message.includes("rate limit")
  ) {
    return "AI insights are temporarily unavailable. Please try again in a minute.";
  }

  if (message.includes("timeout")) {
    return "Profile setup took too long. Please retry once.";
  }

  return "Failed to update profile. Please check your details and try again.";
}

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!data?.industry) throw new Error("Please select your industry");
  if (typeof data?.experience !== "number" || Number.isNaN(data.experience)) {
    throw new Error("Please provide valid years of experience");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Start a transaction to handle both operations
    const result = await db.$transaction(
      async (tx) => {
        // First check if industry exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry doesn't exist, create it with default values
        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Now update the user
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills ?? [],
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 30000, // allow AI insight generation before transaction timeout
      }
    );

    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true, user: result.updatedUser };
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error(getProfileUpdateErrorMessage(error));
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}