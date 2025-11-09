import { Plugin } from 'obsidian';
import { ReviewManager } from './review/review-manager';
import { SpacedRepetitionSettings } from './settings';

export function registerCommands(
	plugin: Plugin,
	reviewManager: ReviewManager,
	settings: SpacedRepetitionSettings
) {
	// Ad-hoc review command
	plugin.addCommand({
		id: 'start-adhoc-review',
		name: 'Start review (current file)',
		callback: async () => {
			await reviewManager.startAdHocReview();
		},
	});

	// Session review command
	plugin.addCommand({
		id: 'start-session-review',
		name: 'Start review session',
		callback: async () => {
			await reviewManager.startSessionReview();
		},
	});

	// Stop review command
	plugin.addCommand({
		id: 'stop-review',
		name: 'Stop review',
		callback: () => {
			reviewManager.stopReview();
		},
	});
}
