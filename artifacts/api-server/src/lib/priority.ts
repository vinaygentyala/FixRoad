export type Category = "school" | "hospital" | "highway" | "normal";
export type Priority = "high" | "medium" | "low";

export const categories: Category[] = ["school", "hospital", "highway", "normal"];

export function isHighPrioritySeason(date: Date = new Date()): boolean {
  const month = date.getMonth();
  // October (9) through February (1) — rain and freeze-thaw damage peaks.
  return month >= 9 || month <= 1;
}

export function computePriority(
  category: Category,
  date: Date = new Date(),
): { priority: Priority; reason: string } {
  if (isHighPrioritySeason(date)) {
    return {
      priority: "high",
      reason:
        "High-priority season (October–February): every new report is treated as high priority.",
    };
  }
  if (category === "school" || category === "hospital") {
    return {
      priority: "high",
      reason: "Located near a school or hospital zone.",
    };
  }
  if (category === "highway") {
    return { priority: "medium", reason: "Located on a highway or main road." };
  }
  return { priority: "low", reason: "Standard residential or city road." };
}
