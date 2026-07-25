import { NextResponse } from "next/server";
import { fetchEconomicCalendar } from "@/lib/economicCalendar/services/calendarService";
import type { EconomicEvent, CalendarPreferences } from "@/types/economicCalendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const dateRange = searchParams.get("dateRange");
    const currenciesParam = searchParams.get("currencies");
    const impactsParam = searchParams.get("impacts");
    const search = searchParams.get("search");

    let startDate: string | undefined;
    let endDate: string | undefined;
    if (dateRange) {
      const parts = dateRange.split(",");
      startDate = parts[0]?.trim() || undefined;
      endDate = parts[1]?.trim() || undefined;
    }

    const currencies = currenciesParam
      ? currenciesParam.split(",").map((c) => c.trim().toUpperCase())
      : [];
    const impacts = impactsParam
      ? impactsParam.split(",").map((i) => i.trim())
      : [];

    const response = await fetchEconomicCalendar({ startDate, endDate });

    let filtered = response.events;

    if (currencies.length > 0) {
      filtered = filtered.filter((e) => currencies.includes(e.currency.toUpperCase()));
    }

    if (impacts.length > 0) {
      filtered = filtered.filter((e) =>
        impacts.some((imp) => imp.toLowerCase() === e.impact.toLowerCase())
      );
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.eventName.toLowerCase().includes(term) ||
          e.country.toLowerCase().includes(term) ||
          e.currency.toLowerCase().includes(term)
      );
    }

    const released = filtered.filter((e) => e.status === "Released").length;
    const upcoming = filtered.filter((e) => e.status === "Upcoming").length;
    const pending = filtered.filter((e) => e.status === "Pending").length;

    return NextResponse.json({
      events: filtered,
      lastSync: response.lastSync,
      source: response.source,
      stats: {
        total: filtered.length,
        released,
        upcoming,
        pending,
        highImpact: filtered.filter((e) => e.impact === "High").length,
        mediumImpact: filtered.filter((e) => e.impact === "Medium").length,
        lowImpact: filtered.filter((e) => e.impact === "Low").length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[economic-calendar] GET error:", message);
    return NextResponse.json(
      { error: "Failed to fetch economic calendar" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: CalendarPreferences = await request.json();

    return NextResponse.json({
      success: true,
      preferences: body,
      message: "Calendar preferences saved",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[economic-calendar] POST error:", message);
    return NextResponse.json(
      { error: "Failed to save calendar preferences" },
      { status: 500 }
    );
  }
}
