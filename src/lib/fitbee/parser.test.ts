import { describe, expect, it } from "vitest";

import { FitBeeParseError, parseFitBeeText } from "./parser";

const exportText = `18 August 2026

═══════════════════════════════════════════════════

DAILY SUMMARY
Calories: 1 767 / 1 614 cal (153 over)
Protein: 89g
Carbs: 177g
Fat: 77g

═══════════════════════════════════════════════════

BREAKFAST
───────────────────────────────────────────────────
• Black Beans, 100 g
  72 cal | 5,6g protein | 14g carbs | 0,4g fat

Subtotal: 72 cal | 5,6g P | 14g C | 0,4g F

═══════════════════════════════════════════════════

DINNER
───────────────────────────────────────────────────
• Tomato Soup, 295ml
  130 cal | 5,9g protein | 18,9g carbs | 3,5g fat

Subtotal: 130 cal | 5,9g P | 18,9g C | 3,5g F

═══════════════════════════════════════════════════

STEPS: 17 799 / 10 000 steps

═══════════════════════════════════════════════════
Exported from FitBee`;

describe("parseFitBeeText", () => {
	it("parses daily totals, localized decimals, meals, and steps", () => {
		expect(parseFitBeeText(exportText)).toEqual({
			reportDate: "2026-08-18",
			calories: 1767,
			targetCalories: 1614,
			proteinGrams: 89,
			carbsGrams: 177,
			fatGrams: 77,
			steps: 17799,
			foods: [
				{
					meal: "breakfast",
					position: 0,
					description: "Black Beans, 100 g",
					calories: 72,
					proteinGrams: 5.6,
					carbsGrams: 14,
					fatGrams: 0.4,
				},
				{
					meal: "dinner",
					position: 0,
					description: "Tomato Soup, 295ml",
					calories: 130,
					proteinGrams: 5.9,
					carbsGrams: 18.9,
					fatGrams: 3.5,
				},
			],
		});
	});

	it("rejects text that is not a FitBee export", () => {
		expect(() => parseFitBeeText("some text")).toThrow(FitBeeParseError);
	});
});
