import readline from "readline";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setupSupabase() {
  console.log("🚀 Supabase Setup Wizard\n");
  console.log("This will configure Supabase REST API connection (no DATABASE_URL needed)\n");

  // Check if .env.local exists
  const envPath = join(process.cwd(), ".env.local");
  let envContent = "";
  
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, "utf-8");
    console.log("✅ Found existing .env.local file\n");
  } else {
    console.log("ℹ️  Creating new .env.local file\n");
  }

  // Remove old DATABASE_URL if exists (no longer needed)
  if (envContent.includes("DATABASE_URL=")) {
    console.log("⚠️  Found DATABASE_URL in .env.local (no longer needed)");
    const remove = await question("Remove it? (y/n, default: y): ") || "y";
    if (remove.toLowerCase() === "y") {
      envContent = envContent.replace(/DATABASE_URL=.*\n/g, "");
      console.log("✅ Removed DATABASE_URL\n");
    }
  }

  console.log("\n📋 Please provide Supabase connection details:\n");

  // Get Project URL
  const projectUrl = await question("1. Supabase Project URL (e.g., https://xxxxx.supabase.co): ");
  if (!projectUrl || !projectUrl.includes("supabase.co")) {
    console.error("❌ Invalid Project URL");
    rl.close();
    return;
  }

  // Check if URL already exists
  const urlPattern = /NEXT_PUBLIC_SUPABASE_URL=.*\n/;
  if (urlPattern.test(envContent)) {
    const overwrite = await question("   NEXT_PUBLIC_SUPABASE_URL already exists. Update? (y/n): ");
    if (overwrite.toLowerCase() === "y") {
      envContent = envContent.replace(urlPattern, "");
    } else {
      console.log("   Skipping URL update\n");
    }
  }

  // Get Service Role Key
  console.log("\n2. Service Role Key (from Supabase Dashboard → Settings → API → service_role key)");
  console.log("   ⚠️  Keep this secret! Only use in server-side code");
  const serviceRoleKey = await question("   Service Role Key: ");
  if (!serviceRoleKey) {
    console.error("❌ Service Role Key is required");
    rl.close();
    return;
  }

  // Check if key already exists
  const keyPattern = /SUPABASE_SERVICE_ROLE_KEY=.*\n/;
  if (keyPattern.test(envContent)) {
    const overwrite = await question("   SUPABASE_SERVICE_ROLE_KEY already exists. Update? (y/n): ");
    if (overwrite.toLowerCase() === "y") {
      envContent = envContent.replace(keyPattern, "");
    } else {
      console.log("   Skipping key update\n");
    }
  }

  // Add environment variables
  let newEnvLines = "";
  
  // Add Supabase URL if not already present
  if (!envContent.includes("NEXT_PUBLIC_SUPABASE_URL=")) {
    newEnvLines += `NEXT_PUBLIC_SUPABASE_URL=${projectUrl}\n`;
  } else if (!urlPattern.test(envContent)) {
    newEnvLines += `NEXT_PUBLIC_SUPABASE_URL=${projectUrl}\n`;
  }
  
  // Add Service Role Key if not already present
  if (!envContent.includes("SUPABASE_SERVICE_ROLE_KEY=")) {
    newEnvLines += `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\n`;
  } else if (!keyPattern.test(envContent)) {
    newEnvLines += `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\n`;
  }

  const updatedEnv = envContent + (envContent && !envContent.endsWith("\n") ? "\n" : "") + newEnvLines;

  writeFileSync(envPath, updatedEnv);
  console.log("\n✅ Supabase configuration added to .env.local\n");
  console.log("📝 Next steps:");
  console.log("   1. Run the migration SQL in Supabase Dashboard → SQL Editor:");
  console.log("      - Use: supabase-complete-migration.sql");
  console.log("   2. Restart your development server");
  console.log("   3. Your app is ready to use Supabase REST API!\n");

  rl.close();
}

setupSupabase().catch((error) => {
  console.error("❌ Setup failed:", error);
  rl.close();
  process.exit(1);
});
