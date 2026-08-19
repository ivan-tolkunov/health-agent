import Link from "next/link";

import { displayDashboardDate, shiftDate } from "@/lib/dashboard/date";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
	const path =
		direction === "left"
			? "M15 9H3m0 0 5-5M3 9l5 5"
			: "M3 9h12m0 0-5-5m5 5-5 5";
	return (
		<svg aria-hidden="true" viewBox="0 0 18 18">
			<path
				d={path}
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function DayNavigator({ date, today }: { date: string; today: string }) {
	const isToday = date === today;
	const previous = shiftDate(date, -1);
	const next = shiftDate(date, 1);

	return (
		<nav className="day-navigator" aria-label="Dashboard day">
			<Link
				className="day-arrow"
				href={`/?date=${previous}`}
				scroll={false}
				aria-label={`View ${displayDashboardDate(previous)}`}
			>
				<ArrowIcon direction="left" />
			</Link>
			<div className="selected-day">
				<p className="eyebrow">{isToday ? "TODAY" : "SELECTED DAY"}</p>
				<h2>{displayDashboardDate(date)}</h2>
			</div>
			{isToday ? (
				<span className="day-arrow disabled" aria-hidden="true">
					<ArrowIcon direction="right" />
				</span>
			) : (
				<Link
					className="day-arrow"
					href={`/?date=${next}`}
					scroll={false}
					aria-label={`View ${displayDashboardDate(next)}`}
				>
					<ArrowIcon direction="right" />
				</Link>
			)}
		</nav>
	);
}
