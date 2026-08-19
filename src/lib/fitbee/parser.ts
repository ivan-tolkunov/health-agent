const MONTHS: Record<string, string> = {
	january: "01",
	february: "02",
	march: "03",
	april: "04",
	may: "05",
	june: "06",
	july: "07",
	august: "08",
	september: "09",
	october: "10",
	november: "11",
	december: "12",
};

const MEAL_NAMES = new Set(["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]);
const NUTRIENTS =
	/^([\d\s.,]+)\s*cal\s*\|\s*([\d.,]+)g\s+protein\s*\|\s*([\d.,]+)g\s+carbs\s*\|\s*([\d.,]+)g\s+fat$/i;

export type FitBeeFood = {
	meal: string;
	position: number;
	description: string;
	calories: number;
	proteinGrams: number;
	carbsGrams: number;
	fatGrams: number;
};

export type FitBeeReport = {
	reportDate: string;
	calories: number;
	targetCalories: number;
	proteinGrams: number;
	carbsGrams: number;
	fatGrams: number;
	steps: number | null;
	foods: FitBeeFood[];
};

export class FitBeeParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FitBeeParseError";
	}
}

function compactSpaces(value: string) {
	return value
		.replace(/[\u00a0\u202f]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function numberValue(value: string) {
	const parsed = Number(
		compactSpaces(value).replace(/ /g, "").replace(",", "."),
	);
	if (!Number.isFinite(parsed)) {
		throw new FitBeeParseError(`Invalid number in FitBee export: ${value}`);
	}
	return parsed;
}

function requiredMatch(text: string, pattern: RegExp, label: string) {
	const match = text.match(pattern);
	if (!match) throw new FitBeeParseError(`Could not find ${label}.`);
	return match;
}

function parseDate(firstLine: string) {
	const match = compactSpaces(firstLine).match(
		/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/,
	);
	if (!match)
		throw new FitBeeParseError(
			"The first line must contain a FitBee report date.",
		);

	const [, day, monthName, year] = match;
	const month = MONTHS[monthName.toLowerCase()];
	if (!month) throw new FitBeeParseError(`Unknown month: ${monthName}`);
	return `${year}-${month}-${day.padStart(2, "0")}`;
}

function parseFoods(lines: string[]) {
	const foods: FitBeeFood[] = [];
	let meal: string | undefined;
	let position = 0;

	for (let index = 0; index < lines.length; index += 1) {
		const line = compactSpaces(lines[index]);
		if (MEAL_NAMES.has(line)) {
			meal = line.toLowerCase();
			position = 0;
			continue;
		}
		if (!line.startsWith("• ") || !meal) continue;

		const description = line.slice(2).trim();
		const nutrientLine = lines
			.slice(index + 1)
			.find((candidate) => candidate.trim());
		const nutrients = nutrientLine
			? compactSpaces(nutrientLine).match(NUTRIENTS)
			: null;
		if (!nutrients) {
			throw new FitBeeParseError(
				`Could not parse nutrients for “${description}”.`,
			);
		}

		foods.push({
			meal,
			position,
			description,
			calories: numberValue(nutrients[1]),
			proteinGrams: numberValue(nutrients[2]),
			carbsGrams: numberValue(nutrients[3]),
			fatGrams: numberValue(nutrients[4]),
		});
		position += 1;
	}

	if (!foods.length) throw new FitBeeParseError("No meal entries were found.");
	return foods;
}

export function parseFitBeeText(rawText: string): FitBeeReport {
	if (!rawText.trim())
		throw new FitBeeParseError("Paste a FitBee text export first.");
	if (!rawText.includes("Exported from FitBee")) {
		throw new FitBeeParseError("This does not look like a FitBee text export.");
	}

	const normalized = rawText.replace(/\r\n?/g, "\n");
	const lines = normalized.split("\n");
	const firstLine = lines.find((line) => line.trim());
	if (!firstLine) throw new FitBeeParseError("The FitBee export is empty.");

	const calories = requiredMatch(
		normalized,
		/Calories:\s*([\d\s\u00a0\u202f]+)\s*\/\s*([\d\s\u00a0\u202f]+)\s*cal/i,
		"daily calories",
	);
	const protein = requiredMatch(
		normalized,
		/Protein:\s*([\d.,]+)g/i,
		"protein",
	);
	const carbs = requiredMatch(normalized, /Carbs:\s*([\d.,]+)g/i, "carbs");
	const fat = requiredMatch(normalized, /Fat:\s*([\d.,]+)g/i, "fat");
	const steps = normalized.match(/STEPS:\s*([\d\s\u00a0\u202f]+)\s*\//i);

	return {
		reportDate: parseDate(firstLine),
		calories: numberValue(calories[1]),
		targetCalories: numberValue(calories[2]),
		proteinGrams: numberValue(protein[1]),
		carbsGrams: numberValue(carbs[1]),
		fatGrams: numberValue(fat[1]),
		steps: steps ? numberValue(steps[1]) : null,
		foods: parseFoods(lines),
	};
}
