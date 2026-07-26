import { NextResponse } from "next/server";
import { fetchEconomicCalendar } from "@/lib/economicCalendar/services/calendarService";
import type { CalendarPreferences, EconomicImpact } from "@/types/economicCalendar";

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

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (dateRange === "today") {
      startDate = todayStr;
      endDate = todayStr;
    } else if (dateRange === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tStr = tomorrow.toISOString().split("T")[0];
      startDate = tStr;
      endDate = tStr;
    } else if (dateRange === "thisWeek") {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      startDate = startOfWeek.toISOString().split("T")[0];
      endDate = endOfWeek.toISOString().split("T")[0];
    }

    const currencies = currenciesParam
      ? currenciesParam.split(",").map((c) => c.trim().toUpperCase())
      : [];
    const impacts = impactsParam
      ? impactsParam.split(",").map((i) => i.trim()) as EconomicImpact[]
      : [];

    const response = await fetchEconomicCalendar({ startDate, endDate });

    let filtered = response.events;

    if (currencies.length > 0) {
      filtered = filtered.filter((e) => currencies.includes(e.currency.toUpperCase()));
    }

    if (impacts.length > 0) {
      filtered = filtered.filter((e) => impacts.includes(e.importance));
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.event.toLowerCase().includes(term) ||
          e.country.toLowerCase().includes(term) ||
          e.currency.toLowerCase().includes(term)
      );
    }

    return NextResponse.json({
      events: filtered,
      lastSync: response.lastSync,
      source: response.source,
      stats: response.stats,
      ...(response.debug ? { debug: response.debug } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[economic-calendar] GET error:", message);

    const status = message.includes("401") ? 401 :
      message.includes("403") ? 403 :
      message.includes("429") ? 429 :
      message.includes("404") ? 404 :
      500;

    return NextResponse.json(
      { error: "Failed to fetch economic calendar", detail: message },
      { status }
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
