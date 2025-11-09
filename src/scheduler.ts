import { ReviewState, Rating } from "./types";
import { DarkhSRSSettings } from "./settings";

/**
 * SM-2 based spaced repetition scheduler
 */
export class Scheduler {
	/**
	 * Calculate the next review schedule based on rating
	 * @param state Current review state
	 * @param rating User's rating (again, hard, good, easy)
	 * @param today Today's date
	 * @param settings Plugin settings for ease/interval limits
	 * @returns Updated review state
	 */
	static scheduleNext(
		state: ReviewState | null, 
		rating: Rating, 
		today: Date,
		settings: DarkhSRSSettings
	): ReviewState {
		// Initialize state if null (new card)
		if (!state) {
			state = {
				ease: settings.initialEase,
				interval: 0,
				reps: 0,
				lapses: 0,
			};
		}
		
		// Clone state to avoid mutation
		const newState: ReviewState = { ...state };
		const todayStr = this.dateToISOString(today);
		
		// Update last review date
		newState.last_review = todayStr;
		
		// Calculate new schedule based on rating
		switch (rating) {
			case "again":
				// Failed - reset progress
				newState.lapses = (newState.lapses || 0) + 1;
				newState.reps = 0;
				newState.interval = 1; // Review tomorrow
				newState.ease = Math.max(settings.minEase, newState.ease - 0.2);
				break;
				
			case "hard":
				// Difficult - minimal interval increase
				newState.reps = (newState.reps || 0) + 1;
				
				if (newState.reps === 1) {
					newState.interval = 1;
				} else if (newState.reps === 2) {
					newState.interval = 3;
				} else {
					// Increase by 1.2x (less than good's ease factor)
					newState.interval = Math.max(1, Math.floor(newState.interval * 1.2));
				}
				
				// Slightly decrease ease or keep it the same
				newState.ease = Math.max(settings.minEase, newState.ease - 0.15);
				break;
				
			case "good":
				// Standard SM-2 algorithm
				newState.reps = (newState.reps || 0) + 1;
				
				if (newState.reps === 1) {
					newState.interval = 1;
				} else if (newState.reps === 2) {
					newState.interval = 6;
				} else {
					newState.interval = Math.round(newState.interval * newState.ease);
				}
				
				// Small ease increase
				newState.ease = newState.ease + 0.1;
				break;
				
			case "easy":
				// Easy - boost interval and ease more
				newState.reps = (newState.reps || 0) + 1;
				
				if (newState.reps === 1) {
					newState.interval = 4;
				} else if (newState.reps === 2) {
					newState.interval = 10;
				} else {
					// Boost by 1.3x the ease factor
					newState.interval = Math.round(newState.interval * newState.ease * 1.3);
				}
				
				// Larger ease increase
				newState.ease = newState.ease + 0.15;
				break;
		}
		
		// Apply maximum interval cap
		if (settings.maxInterval && newState.interval > settings.maxInterval) {
			newState.interval = settings.maxInterval;
		}
		
		// Ensure interval is at least 1
		newState.interval = Math.max(1, newState.interval);
		
		// Calculate due date
		const dueDate = new Date(today);
		dueDate.setDate(dueDate.getDate() + newState.interval);
		newState.due = this.dateToISOString(dueDate);
		
		// Mark as SRS card
		newState.sr = true;
		
		return newState;
	}
	
	/**
	 * Convert Date to ISO string (YYYY-MM-DD)
	 */
	static dateToISOString(date: Date): string {
		return date.toISOString().split('T')[0];
	}
	
	/**
	 * Parse ISO string to Date
	 */
	static parseISOString(dateStr: string): Date {
		return new Date(dateStr);
	}
	
	/**
	 * Check if a card is due for review
	 */
	static isDue(state: ReviewState | null, today: Date): boolean {
		if (!state || !state.due) {
			// New card or unscheduled - consider it due
			return true;
		}
		
		const dueDate = this.parseISOString(state.due);
		return dueDate <= today;
	}
	
	/**
	 * Get the number of days until next review
	 */
	static daysUntilDue(state: ReviewState | null, today: Date): number {
		if (!state || !state.due) {
			return 0;
		}
		
		const dueDate = this.parseISOString(state.due);
		const diffTime = dueDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}
}

