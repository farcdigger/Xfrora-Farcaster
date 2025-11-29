import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env.mjs";
import type { FarcasterUser } from "@/lib/types";

/**
 * Get current Farcaster user session from cookie
 * This allows the frontend to check if user is still authenticated
 * after page refresh
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("farcaster_user_session");
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      });
    }
    
    try {
      // Decrypt session data
      const crypto = require("crypto");
      const secretKey = (env.FARCASTER_CLIENT_SECRET || env.X_CLIENT_SECRET || "").substring(0, 32);
      
      if (!secretKey) {
        console.error("❌ FARCASTER_CLIENT_SECRET not configured - cannot decrypt session");
        return NextResponse.json({ 
          authenticated: false,
          user: null 
        });
      }

      const [ivHex, encrypted] = sessionCookie.value.split(":");
      
      if (!ivHex || !encrypted) {
        return NextResponse.json({ 
          authenticated: false,
          user: null 
        });
      }
      
      const iv = Buffer.from(ivHex, "hex");
      const secretKeyBuffer = Buffer.from(secretKey.padEnd(32, "0"));
      const decipher = crypto.createDecipheriv("aes-256-cbc", secretKeyBuffer, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      
      const sessionData = JSON.parse(decrypted);
      
      // Check if session is expired (older than 7 days)
      const sessionAge = Date.now() - (sessionData.timestamp || 0);
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      if (sessionAge > maxAge) {
        // Session expired
        return NextResponse.json({ 
          authenticated: false,
          user: null 
        });
      }
      
      const user: FarcasterUser = {
        fid: sessionData.fid,
        username: sessionData.username,
        display_name: sessionData.display_name,
        pfp_url: sessionData.pfp_url || "",
        bio: sessionData.bio,
      };
      
      return NextResponse.json({
        authenticated: true,
        user,
      });
    } catch (decryptError) {
      console.error("Failed to decrypt session cookie:", decryptError);
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      });
    }
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ 
      authenticated: false,
      user: null 
    }, { status: 500 });
  }
}

/**
 * Save Farcaster user session
 */
export async function POST(request: NextRequest) {
  try {
    const user: FarcasterUser = await request.json();
    
    if (!user.fid || !user.username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const secretKey = (env.FARCASTER_CLIENT_SECRET || env.X_CLIENT_SECRET || "").substring(0, 32);
    
    if (!secretKey) {
      console.error("❌ FARCASTER_CLIENT_SECRET not configured - cannot encrypt session");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const crypto = require("crypto");
    const iv = crypto.randomBytes(16);
    const sessionData = JSON.stringify({
      fid: user.fid,
      username: user.username,
      display_name: user.display_name,
      pfp_url: user.pfp_url,
      bio: user.bio,
      timestamp: Date.now(),
    });
    const secretKeyBuffer = Buffer.from(secretKey.padEnd(32, "0"));
    const cipher = crypto.createCipheriv("aes-256-cbc", secretKeyBuffer, iv);
    let encrypted = cipher.update(sessionData, "utf8", "hex");
    encrypted += cipher.final("hex");
    const encryptedSession = iv.toString("hex") + ":" + encrypted;
    
    // Set session cookie (lasts 7 days)
    const response = NextResponse.json({ success: true });
    response.cookies.set("farcaster_user_session", encryptedSession, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    
    console.log("✅ Farcaster session cookie set for user:", {
      username: user.username,
      fid: user.fid,
      expiresIn: "7 days",
    });
    
    return response;
  } catch (error) {
    console.error("Session save error:", error);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}

/**
 * Clear Farcaster user session (logout)
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("farcaster_user_session");
  return response;
}

