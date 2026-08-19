import type { nutritionFoods, nutritionImports } from "@/lib/db/schema";

type NutritionImport = typeof nutritionImports.$inferSelect;
type NutritionFood = typeof nutritionFoods.$inferSelect;

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snacks"];

function displayDate(reportDate: string) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Toronto",
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date(`${reportDate}T12:00:00-04:00`));
}

export function NutritionPanel({
	nutrition,
	foods,
}: {
	nutrition: NutritionImport | undefined;
	foods: NutritionFood[];
}) {
	if (!nutrition) {
		return (
			<article className="panel nutrition-panel">
				<p className="eyebrow">FITBEE</p>
				<h2>Nutrition</h2>
				<p className="empty-state">
					Add your first FitBee text export to see calories, macros, and meals.
				</p>
			</article>
		);
	}

	const meals = MEAL_ORDER.map((name) => ({
		name,
		foods: foods.filter((food) => food.meal === name),
	})).filter((meal) => meal.foods.length > 0);

	return (
		<article className="panel nutrition-panel">
			<div className="panel-heading-row">
				<div>
					<p className="eyebrow">
						FITBEE · {displayDate(nutrition.reportDate)}
					</p>
					<h2>Nutrition</h2>
				</div>
				<strong>
					{nutrition.calories.toLocaleString("en-CA")} /{" "}
					{nutrition.targetCalories.toLocaleString("en-CA")} kcal
				</strong>
			</div>

			<div className="macro-row">
				<span>
					<strong>{nutrition.proteinGrams}g</strong> protein
				</span>
				<span>
					<strong>{nutrition.carbsGrams}g</strong> carbs
				</span>
				<span>
					<strong>{nutrition.fatGrams}g</strong> fat
				</span>
			</div>

			<ul className="meal-list">
				{meals.map((meal) => {
					const mealCalories = Math.round(
						meal.foods.reduce((total, food) => total + food.calories, 0),
					);
					return (
						<li key={meal.name}>
							<div>
								<strong>{meal.name}</strong>
								<span>
									{meal.foods.map((food) => food.description).join(", ")}
								</span>
							</div>
							<strong>{mealCalories} kcal</strong>
						</li>
					);
				})}
			</ul>
		</article>
	);
}
