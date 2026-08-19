const TIME_ZONE = "America/Toronto";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parts(isoDate: string) {
	const [year, month, day] = isoDate.split("-").map(Number);
	return { year, month, day };
}

function isCalendarDate(value: string) {
	if (!ISO_DATE.test(value)) return false;
	const { year, month, day } = parts(value);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

export function torontoDateForInstant(instant: Date) {
	const values = new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.formatToParts(instant)
		.reduce<Record<string, string>>((result, part) => {
			if (part.type !== "literal") result[part.type] = part.value;
			return result;
		}, {});
	return `${values.year}-${values.month}-${values.day}`;
}

export function torontoToday(now = new Date()) {
	return torontoDateForInstant(now);
}

export function selectedDashboardDate(value: string | string[] | undefined) {
	const today = torontoToday();
	if (typeof value !== "string" || !isCalendarDate(value) || value > today) {
		return today;
	}
	return value;
}

export function shiftDate(isoDate: string, days: number) {
	const { year, month, day } = parts(isoDate);
	const shifted = new Date(Date.UTC(year, month - 1, day + days));
	return shifted.toISOString().slice(0, 10);
}

export function displayDashboardDate(isoDate: string) {
	const date = new Date(`${isoDate}T12:00:00Z`);
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(date);
}
