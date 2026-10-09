export type Category = "school" | "hospital" | "highway" | "normal";
export type Priority = "high" | "medium" | "low";

export const categories: Category[] = ["school", "hospital", "highway", "normal"];

export interface WeatherContext {
  available: boolean;
  source: string;
  assessedAt: string;
  locationQuery: string;
  resolvedLocation?: string;
  precipitationMm?: number;
  rainProbability?: number;
  summary?: string;
  note: string;
}

/** Image evidence is the primary signal. Weather can only raise a medium result when the
 * provider reports current/recent or near-term rain above the configured thresholds. */
export function computePriority(
  severity: "low" | "medium" | "high" | "unknown",
  weather: WeatherContext | undefined,
  category: Category,
): { priority: Priority; reason: string } {
  if (severity === "high") {
    return { priority: "high", reason: "AI image assessment found substantial visible road damage." };
  }
  if (severity === "medium") {
    const wet = Boolean(weather?.available && ((weather.precipitationMm ?? 0) >= 5 || (weather.rainProbability ?? 0) >= 60));
    if (wet) {
      return { priority: "high", reason: "AI image assessment found a medium defect; location-specific wet-weather risk raises attention." };
    }
    return { priority: "medium", reason: "AI image assessment found a clearly visible moderate road defect." };
  }
  if (severity === "low") {
    return { priority: "low", reason: "AI image assessment found a minor, localized road defect." };
  }

  // A review state is separate from the three priority labels. Keep a conservative queue value
  // for sorting without presenting it as an AI decision.
  if (category === "school" || category === "hospital") return { priority: "high", reason: "Needs Review: image evidence is insufficient; location category is retained for queueing." };
  if (category === "highway") return { priority: "medium", reason: "Needs Review: image evidence is insufficient; road category is retained for queueing." };
  return { priority: "low", reason: "Needs Review: image evidence is insufficient for a reliable priority decision." };
}
