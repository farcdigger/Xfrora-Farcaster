import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Temporary image storage directory (in public folder so images are accessible)
const TEMP_IMAGE_DIR = join(process.cwd(), 'public', 'temp-images');

// Ensure temp directory exists
async function ensureTempDir() {
  if (!existsSync(TEMP_IMAGE_DIR)) {
    await mkdir(TEMP_IMAGE_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTempDir();
    
    const body = await request.json();
    const { imageData } = body; // base64 data URL
    
    if (!imageData || !imageData.startsWith('data:image')) {
      return NextResponse.json(
        { error: "Invalid image data. Expected base64 data URL." },
        { status: 400 }
      );
    }
    
    // Extract image data
    const base64Match = imageData.match(/data:image\/([^;]+);base64,(.+)/);
    if (!base64Match) {
      return NextResponse.json(
        { error: "Invalid base64 format" },
        { status: 400 }
      );
    }
    
    const mimeType = base64Match[1] || 'png';
    const base64Data = base64Match[2];
    
    // Generate unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${mimeType}`;
    const filePath = join(TEMP_IMAGE_DIR, filename);
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Write file
    await writeFile(filePath, buffer);
    
    // Return public URL (use production URL to avoid preview URLs)
    const PRODUCTION_URL = "https://xfrora-farcaster-web.vercel.app";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || PRODUCTION_URL;
    
    const imageUrl = `${baseUrl}/temp-images/${filename}`;
    
    console.log("✅ Temporary image uploaded:", imageUrl);
    
    return NextResponse.json({ 
      url: imageUrl,
      filename 
    });
    
  } catch (error: any) {
    console.error("❌ Error uploading temporary image:", error);
    return NextResponse.json(
      { error: "Failed to upload image", details: error.message },
      { status: 500 }
    );
  }
}

