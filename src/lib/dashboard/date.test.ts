import { describe, expect, it } from "vitest";

import {
	displayDashboardDate,
	shiftDate,
	torontoDateForInstant,
	torontoToday,
} from "./date";

describe("dashboard dates", () => {
	it("uses Toronto boundaries rather than UTC boundaries", () => {
		const instant = new Date("2026-08-19T02:00:00Z");
		expect(torontoDateForInstant(instant)).toBe("2026-08-18");
		expect(torontoToday(instant)).toBe("2026-08-18");
	});

	it("moves across month boundaries", () => {
		expect(shiftDate("2026-08-01", -1)).toBe("2026-07-31");
		expect(shiftDate("2026-08-31", 1)).toBe("2026-09-01");
	});

	it("formats a selected date for the day navigator", () => {
		expect(displayDashboardDate("2026-08-18")).toBe("Tuesday, August 18, 2026");
	});
});
