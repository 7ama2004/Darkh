import { Plugin, MarkdownView } from 'obsidian';
import { SpacedRepetitionSettings } from './settings';
import { ReviewManager } from './review/ReviewManager';

export function registerCommands(plugin: Plugin, settings: SpacedRepetitionSettings) {
	const reviewManager = new ReviewManager();
	
	// Ad-hoc review command
	plugin.addCommand({
		id: 'start-adhoc-review',
		name: 'Start review (current file)',
		checkCallback: (checking: boolean) => {
			const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				if (!checking) {
					reviewManager.startAdHocReview(view);
				}
				return true;
			}
			return false;
		},
	});
	
	// Session review command
	plugin.addCommand({
		id: 'start-session-review',
		name: 'Start review session',
		callback: () => {
			reviewManager.startSessionReview(plugin.app, settings.flashcardFolder);
		},
	});
	
	// Store review manager for cleanup
	(plugin as any).reviewManager = reviewManager;
}
