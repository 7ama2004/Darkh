import { Plugin } from 'obsidian';
import { SpacedRepetitionSettings, DEFAULT_SETTINGS } from './src/settings';
import { ReviewManager } from './src/review/review-manager';
import { registerCommands } from './src/commands';
import { SpacedRepetitionSettingTab } from './src/settings-tab';

export default class SpacedRepetitionPlugin extends Plugin {
	settings: SpacedRepetitionSettings;
	private reviewManager: ReviewManager | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize review manager
		this.reviewManager = new ReviewManager(this.app, this.settings.flashcardFolder);

		// Register commands
		registerCommands(this, this.reviewManager, this.settings);

		// Add settings tab
		this.addSettingTab(new SpacedRepetitionSettingTab(this.app, this));
	}

	onunload() {
		// Clean up any active reviews
		if (this.reviewManager) {
			this.reviewManager.stopReview();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	updateReviewManager() {
		// Recreate review manager with new folder path
		if (this.reviewManager) {
			this.reviewManager.stopReview();
		}
		this.reviewManager = new ReviewManager(this.app, this.settings.flashcardFolder);
		// Re-register commands
		registerCommands(this, this.reviewManager, this.settings);
	}
}

// Export for settings tab
export { SpacedRepetitionPlugin };
