import { NextRequest, NextResponse } from "next/server";
import { pinToIPFS } from "@/lib/ipfs";
import { env } from "@/env.mjs";
import { optimizeImage } from "@/lib/image-optimizer";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
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
    
    // Convert base64 to buffer
    let buffer = Buffer.from(base64Data, 'base64');
    
    console.log("📤 Optimizing image for cast (original size:", buffer.length, "bytes)");
    
    // Optimize image specifically for cast: smaller size (384x384) for faster loading
    // Cast images don't need to be as large as display images
    // Smaller size = faster loading on mobile and desktop
    buffer = await optimizeImage(buffer, 384, 384, 0.85);
    
    console.log("✅ Image optimized for cast (final size:", buffer.length, "bytes)");
    
    // Generate unique filename
    const filename = `cast-${Date.now()}-${Math.random().toString(36).substring(7)}.${mimeType}`;
    
    // Upload to Pinata (IPFS) for temporary storage
    // This works in Vercel serverless environment
    console.log("📤 Uploading optimized image to Pinata for cast...");
    
    let imageUrl: string;
    try {
      const ipfsUrl = await pinToIPFS(buffer, filename);
      
      // Convert IPFS URL to Pinata gateway URL
      if (ipfsUrl.startsWith("ipfs://")) {
        const ipfsHash = ipfsUrl.replace("ipfs://", "");
        imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      } else {
        imageUrl = ipfsUrl;
      }
      
      console.log("✅ Temporary image uploaded to Pinata:", imageUrl);
    } catch (pinataError: any) {
      console.error("❌ Pinata upload failed:", pinataError);
      
      // If Pinata fails and we're in development, return a data URL (won't work in cast but at least won't crash)
      if (process.env.NODE_ENV === 'development') {
        console.warn("⚠️ Development mode: Returning data URL (won't work in cast)");
        return NextResponse.json({
          url: imageData, // Return data URL as fallback
          filename,
          warning: "Using data URL - may not work in Farcaster cast"
        });
      }
      
      throw new Error(`Failed to upload to Pinata: ${pinataError.message || 'Unknown error'}`);
    }
    
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

