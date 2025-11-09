/**
 * SM-2 Algorithm for spaced repetition
 * Based on SuperMemo 2 algorithm
 */

export interface CardSchedule {
	due: string; // ISO date string (YYYY-MM-DD)
	interval: number; // days
	ease: number; // ease factor (default 250, minimum 130)
	created: string; // ISO date string
}

export type ReviewQuality = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewResult {
	due: string;
	interval: number;
	ease: number;
}

/**
 * Calculate new scheduling parameters based on review quality
 */
export function calculateNextReview(
	currentSchedule: CardSchedule,
	quality: ReviewQuality
): ReviewResult {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayStr = today.toISOString().split('T')[0];

	let newEase = currentSchedule.ease;
	let newInterval = currentSchedule.interval;
	let newDue: Date;

	// Calculate new ease factor
	if (quality === 'again') {
		newEase = Math.max(130, currentSchedule.ease - 20);
		newInterval = 1; // Review again tomorrow
	} else if (quality === 'hard') {
		newEase = Math.max(130, currentSchedule.ease - 15);
		newInterval = Math.max(1, Math.round(currentSchedule.interval * 1.2));
	} else if (quality === 'good') {
		// Ease stays the same for 'good'
		newInterval = Math.max(1, Math.round(currentSchedule.interval * (newEase / 100)));
	} else if (quality === 'easy') {
		newEase = Math.min(250, currentSchedule.ease + 15);
		newInterval = Math.max(1, Math.round(currentSchedule.interval * (newEase / 100) * 1.3));
	}

	// Calculate new due date
	newDue = new Date(today);
	newDue.setDate(newDue.getDate() + newInterval);
	const newDueStr = newDue.toISOString().split('T')[0];

	return {
		due: newDueStr,
		interval: newInterval,
		ease: newEase
	};
}

/**
 * Initialize schedule for a new card
 */
export function initializeSchedule(): CardSchedule {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayStr = today.toISOString().split('T')[0];

	return {
		due: todayStr,
		interval: 1,
		ease: 250,
		created: todayStr
	};
}
