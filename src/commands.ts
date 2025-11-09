import { Plugin } from 'obsidian';
import { ReviewManager } from './review/review-manager';
import { SpacedRepetitionSettings } from './settings';

export function registerCommands(plugin: Plugin, reviewManager: ReviewManager, settings: SpacedRepetitionSettings): void {
	// Command: Start ad-hoc review
	plugin.addCommand({
		id: 'start-adhoc-review',
		name: 'Start review (current file)',
		callback: () => {
			reviewManager.startAdHocReview();
		}
	});

	// Command: Start review session
	plugin.addCommand({
		id: 'start-review-session',
		name: 'Start review session',
		callback: () => {
			reviewManager.startSessionReview(settings.flashcardFolder);
		}
	});

	// Command: End current review
	plugin.addCommand({
		id: 'end-review',
		name: 'End current review',
		checkCallback: (checking: boolean) => {
			// Only show if a review is active
			if (checking) {
				return reviewManager['currentReviewUI'] !== null;
			}
			reviewManager.endCurrentReview();
			return true;
		}
	});
}
