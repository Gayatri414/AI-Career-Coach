import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const db =
  globalForPrisma.db ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.db = db;
}
// globalThis.prisma :this global variables ensures that the prisma client instance is
// reused across hot reloads during development.without this ,each time your application
// reloads ,a new instance of the prisma client would be created ,potentially loading 
// to connection issues

