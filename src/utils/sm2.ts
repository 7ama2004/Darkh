import { FlashcardMetadata } from '../types';

/**
 * SM-2 algorithm for spaced repetition
 * Based on SuperMemo 2 algorithm
 */
export function calculateNextReview(
	currentMetadata: FlashcardMetadata,
	quality: number // 0=Again, 1=Hard, 2=Good, 3=Easy
): { interval: number; ease: number; due: string } {
	let { interval, ease } = currentMetadata;

	// Update ease factor
	if (quality < 2) {
		// Again or Hard: decrease ease
		ease = Math.max(130, ease - 15);
	} else if (quality === 2) {
		// Good: no change to ease
		ease = ease;
	} else {
		// Easy: increase ease
		ease = Math.min(250, ease + 15);
	}

	// Calculate new interval
	if (quality < 2) {
		// Again: reset to 1 day
		interval = 1;
	} else if (quality === 1) {
		// Hard: reduce interval
		interval = Math.max(1, interval * 0.8);
	} else if (quality === 2) {
		// Good: normal progression
		if (interval === 0) {
			interval = 1;
		} else {
			interval = Math.round(interval * (ease / 100));
		}
	} else {
		// Easy: larger interval
		interval = Math.round(interval * (ease / 100) * 1.3);
	}

	// Calculate due date
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dueDate = new Date(today);
	dueDate.setDate(dueDate.getDate() + interval);

	return {
		interval,
		ease: Math.round(ease),
		due: dueDate.toISOString().split('T')[0],
	};
}
