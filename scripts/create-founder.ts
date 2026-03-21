import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

async function main() {
  console.log("\n📋 FRAX Company - Create Founder Account\n");

  try {
    const email = await prompt("Email address: ");
    const name = await prompt("Full name: ");
    const password = await prompt("Password (will be hashed): ");

    if (!email || !name || !password) {
      console.error("❌ All fields are required");
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create founder
    const founder = await prisma.employee.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "FOUNDER",
        isApproved: true,
        mustChangePassword: false,
      },
    });

    console.log("\n✅ Founder account created successfully!");
    console.log("\nDetails:");
    console.log(`  ID: ${founder.id}`);
    console.log(`  Email: ${founder.email}`);
    console.log(`  Name: ${founder.name}`);
    console.log(`  Role: ${founder.role}`);
    console.log(`\nYou can now sign in at: http://localhost:3001/signin\n`);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      console.error("\n❌ Error: An account with this email already exists");
    } else {
      console.error("\n❌ Error creating founder account:", error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
