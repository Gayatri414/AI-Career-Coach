import { auth } from "@clerk/nextjs/server";

export async function checkUser() {
  const { userId } = auth();

  if (!userId) {
    return null;
  }

  return userId;
}