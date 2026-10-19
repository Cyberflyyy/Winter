export const HABIT_COLORS: { id: string; label: string; value: string }[] = [
  { id: "purple", label: "Purple", value: "oklch(65% 0.2 300)" },
  { id: "blue", label: "Blue", value: "oklch(68.5% 0.155 249)" },
  { id: "red", label: "Red", value: "oklch(63.7% 0.208 25.33)" },
  { id: "green", label: "Green", value: "oklch(72.3% 0.192 149.58)" },
  { id: "orange", label: "Orange", value: "oklch(75% 0.16 62)" },
  { id: "teal", label: "Teal", value: "oklch(78.8% 0.135 181.9)" },
  { id: "yellow", label: "Yellow", value: "oklch(79.5% 0.162 86.05)" },
  { id: "pink", label: "Pink", value: "oklch(70% 0.19 350)" },
];

export function habitColor(id: string): string {
  return HABIT_COLORS.find((c) => c.id === id)?.value ?? HABIT_COLORS[1].value;
}

export const AREAS: { id: string; label: string; emoji: string }[] = [
  { id: "health", label: "Health & Fitness", emoji: "💪" },
  { id: "career", label: "Career Growth", emoji: "📈" },
  { id: "finances", label: "Finances & Wealth", emoji: "💰" },
  { id: "relationships", label: "Relationships", emoji: "🧡" },
  { id: "romance", label: "Romance & Love", emoji: "💖" },
  { id: "spirituality", label: "Spirituality", emoji: "✨" },
  { id: "home", label: "Home", emoji: "🏡" },
  { id: "adventure", label: "Adventure & Travel", emoji: "✈️" },
  { id: "fun", label: "Fun & Hobbies", emoji: "🎲" },
  { id: "community", label: "Community", emoji: "🌍" },
];

export function areaOf(id: string) {
  return AREAS.find((a) => a.id === id) ?? AREAS[0];
}

/** Freeze tokeny: startowa pula + 1 token za każde N „idealnych dni” (100% nawyków dziennych). */
export const FREEZE_START = 3;
export const PERFECT_DAYS_PER_TOKEN = 2;

export const RIVAL_COLOR = "oklch(75% 0.16 62)";
