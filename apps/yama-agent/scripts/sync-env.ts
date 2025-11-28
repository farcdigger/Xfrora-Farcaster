/**
 * Bu script apps/web/.env.local dosyasındaki değerleri
 * apps/yama-agent/.env dosyasına kopyalar
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const webEnvPath = path.join(__dirname, "../../web/.env.local");
const agentEnvPath = path.join(__dirname, "../.env");

console.log("🔄 Syncing environment variables from apps/web/.env.local...");

if (!fs.existsSync(webEnvPath)) {
  console.error("❌ apps/web/.env.local dosyası bulunamadı!");
  process.exit(1);
}

// .env.local dosyasını oku
const webEnvContent = fs.readFileSync(webEnvPath, "utf-8");

// Gerekli değişkenleri parse et
const envVars: Record<string, string> = {};

// INFERENCE_API_KEY
const inferenceMatch = webEnvContent.match(/^INFERENCE_API_KEY=(.+)$/m);
if (inferenceMatch) {
  envVars.INFERENCE_API_KEY = inferenceMatch[1].trim().replace(/^["']|["']$/g, "");
}

// SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL'dan al)
const supabaseUrlMatch = webEnvContent.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
if (supabaseUrlMatch) {
  envVars.SUPABASE_URL = supabaseUrlMatch[1].trim().replace(/^["']|["']$/g, "");
}

// SUPABASE_SERVICE_ROLE_KEY
const supabaseKeyMatch = webEnvContent.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
if (supabaseKeyMatch) {
  envVars.SUPABASE_SERVICE_ROLE_KEY = supabaseKeyMatch[1].trim().replace(/^["']|["']$/g, "");
}

// SERVER_SIGNER_PRIVATE_KEY (PRIVATE_KEY olarak)
const privateKeyMatch = webEnvContent.match(/^SERVER_SIGNER_PRIVATE_KEY=(.+)$/m);
if (privateKeyMatch) {
  envVars.PRIVATE_KEY = privateKeyMatch[1].trim().replace(/^["']|["']$/g, "");
}

// YAMA Agent specific vars
const agentNameMatch = webEnvContent.match(/^AGENT_NAME=(.+)$/m);
if (agentNameMatch) {
  envVars.AGENT_NAME = agentNameMatch[1].trim().replace(/^["']|["']$/g, "");
}

const agentDescMatch = webEnvContent.match(/^AGENT_DESCRIPTION=(.+)$/m);
if (agentDescMatch) {
  envVars.AGENT_DESCRIPTION = agentDescMatch[1].trim().replace(/^["']|["']$/g, "");
}

const paymentsAddrMatch = webEnvContent.match(/^PAYMENTS_RECEIVABLE_ADDRESS=(.+)$/m);
if (paymentsAddrMatch) {
  envVars.PAYMENTS_RECEIVABLE_ADDRESS = paymentsAddrMatch[1].trim().replace(/^["']|["']$/g, "");
}

// PAYMENTS_NETWORK (NETWORK olarak da ekle)
const paymentsNetworkMatch = webEnvContent.match(/^PAYMENTS_NETWORK=(.+)$/m);
if (paymentsNetworkMatch) {
  const network = paymentsNetworkMatch[1].trim().replace(/^["']|["']$/g, "");
  envVars.PAYMENTS_NETWORK = network;
  envVars.NETWORK = network; // paymentsFromEnv() için
}

// FACILITATOR_URL (PAYMENTS_FACILITATOR_URL'den veya direkt FACILITATOR_URL'den)
const facilitatorUrlMatch = webEnvContent.match(/^PAYMENTS_FACILITATOR_URL=(.+)$/m);
if (facilitatorUrlMatch) {
  envVars.FACILITATOR_URL = facilitatorUrlMatch[1].trim().replace(/^["']|["']$/g, "");
  envVars.PAYMENTS_FACILITATOR_URL = facilitatorUrlMatch[1].trim().replace(/^["']|["']$/g, "");
}

const directFacilitatorMatch = webEnvContent.match(/^FACILITATOR_URL=(.+)$/m);
if (directFacilitatorMatch && !envVars.FACILITATOR_URL) {
  envVars.FACILITATOR_URL = directFacilitatorMatch[1].trim().replace(/^["']|["']$/g, "");
}

// Mevcut .env dosyasını oku (varsa)
let agentEnvContent = "";
if (fs.existsSync(agentEnvPath)) {
  agentEnvContent = fs.readFileSync(agentEnvPath, "utf-8");
}

// Değerleri güncelle
let updated = false;
for (const [key, value] of Object.entries(envVars)) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(agentEnvContent)) {
    agentEnvContent = agentEnvContent.replace(regex, `${key}=${value}`);
    updated = true;
  } else {
    // Yeni satır ekle
    agentEnvContent += `\n${key}=${value}`;
    updated = true;
  }
}

// Dosyayı yaz
fs.writeFileSync(agentEnvPath, agentEnvContent, "utf-8");

console.log("✅ Environment variables synced!");
console.log("\n📋 Synced variables:");
for (const [key, value] of Object.entries(envVars)) {
  const displayValue = key.includes("KEY") || key.includes("SECRET") || key.includes("PRIVATE")
    ? `${value.substring(0, 10)}...`
    : value;
  console.log(`   ${key}=${displayValue}`);
}

