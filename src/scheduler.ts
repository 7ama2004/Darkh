/**
 * SM-2 algorithm implementation for spaced repetition
 * Based on SuperMemo 2 algorithm
 */

export interface SchedulingData {
	due: string; // ISO date string
	interval: number; // days
	ease: number; // ease factor (default 250, minimum 130)
	created?: string; // ISO date string
}

export type ReviewQuality = 'again' | 'hard' | 'good' | 'easy';

/**
 * Calculate new scheduling parameters based on review quality
 * @param currentData Current scheduling data from frontmatter
 * @param quality User's feedback on the review
 * @returns Updated scheduling data
 */
export function calculateNextReview(
	currentData: SchedulingData,
	quality: ReviewQuality
): SchedulingData {
	const today = new Date().toISOString().split('T')[0];
	const created = currentData.created || today;
	
	let ease = currentData.ease || 250;
	let interval = currentData.interval || 0;
	
	// Calculate new ease factor
	if (quality === 'again') {
		ease = Math.max(130, ease - 20);
		interval = 0; // Reset interval
	} else if (quality === 'hard') {
		ease = Math.max(130, ease - 15);
		interval = interval === 0 ? 1 : Math.max(1, interval * 1.2);
	} else if (quality === 'good') {
		// No change to ease for 'good'
		if (interval === 0) {
			interval = 1;
		} else {
			interval = interval * (ease / 100);
		}
	} else if (quality === 'easy') {
		ease = Math.min(250, ease + 15);
		if (interval === 0) {
			interval = 4;
		} else {
			interval = interval * (ease / 100) * 1.3;
		}
	}
	
	// Round interval to nearest day
	interval = Math.round(interval);
	
	// Calculate next due date
	const dueDate = new Date();
	dueDate.setDate(dueDate.getDate() + interval);
	const due = dueDate.toISOString().split('T')[0];
	
	return {
		due,
		interval,
		ease: Math.round(ease),
		created,
	};
}

/**
 * Check if a card is due for review
 */
export function isDue(schedulingData: SchedulingData): boolean {
	if (!schedulingData.due) return true;
	const today = new Date().toISOString().split('T')[0];
	return schedulingData.due <= today;
}
