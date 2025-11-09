import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { SpacedRepetitionSettings, DEFAULT_SETTINGS } from './src/settings';
import { ReviewManager } from './src/review/review-manager';
import { registerCommands } from './src/commands';

export default class SpacedRepetitionPlugin extends Plugin {
	settings: SpacedRepetitionSettings;
	private reviewManager: ReviewManager;

	async onload() {
		await this.loadSettings();

		// Initialize review manager
		this.reviewManager = new ReviewManager(this.app);

		// Register commands
		registerCommands(this, this.reviewManager, this.settings);

		// Add settings tab
		this.addSettingTab(new SpacedRepetitionSettingTab(this.app, this));

		// Auto-start review when a flashcard file is opened (optional - can be disabled)
		// This enables the ad-hoc workflow automatically
		this.registerEvent(
			this.app.workspace.on('file-open', async (file) => {
				if (file && file.extension === 'md') {
					// Check if file is in flashcard folder
					const filePath = file.path;
					if (filePath.includes(this.settings.flashcardFolder)) {
						// Small delay to ensure view is ready
						setTimeout(() => {
							// Only auto-start if no review is active
							if (!this.reviewManager['currentReviewUI']) {
							}
						}, 500);
					}
				}
			})
		);
	}

	onunload() {
		// Clean up any active reviews
		this.reviewManager.endCurrentReview();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SpacedRepetitionSettingTab extends PluginSettingTab {
	plugin: SpacedRepetitionPlugin;

	constructor(app: App, plugin: SpacedRepetitionPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Spaced Repetition Settings' });

		new Setting(containerEl)
			.setName('Flashcard folder')
			.setDesc('Folder path where your flashcard files are stored (e.g., "flashcards" or "notes/flashcards")')
			.addText(text => text
				.setPlaceholder('flashcards')
				.setValue(this.plugin.settings.flashcardFolder)
				.onChange(async (value) => {
					this.plugin.settings.flashcardFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
