import { NextRequest, NextResponse } from "next/server";
import listingCache from "@/app/lib/listing-cache";

export async function GET(req: NextRequest) {
  try {
    const stats = listingCache.getStats();
    
    return NextResponse.json({
      success: true,
      cache: {
        size: stats.size,
        entries: stats.entries,
        summary: {
          totalEntries: stats.size,
          totalListings: stats.entries.reduce((sum, entry) => sum + entry.listingCount, 0),
          avgAge: stats.entries.length > 0 
            ? Math.round(stats.entries.reduce((sum, entry) => sum + entry.age, 0) / stats.entries.length)
            : 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error getting cache status:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to get cache status",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    listingCache.clear();
    
    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to clear cache",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
