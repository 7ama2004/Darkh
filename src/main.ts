import { Plugin, PluginSettingTab, Setting } from 'obsidian';
import { SpacedRepetitionSettings, DEFAULT_SETTINGS } from './settings';
import { registerCommands } from './commands';

export default class SpacedRepetitionPlugin extends Plugin {
	settings: SpacedRepetitionSettings;

	async onload() {
		await this.loadSettings();

		// Register commands
		registerCommands(this, this.settings);

		// Add settings tab
		this.addSettingTab(new SpacedRepetitionSettingTab(this.app, this));
	}

	onunload() {
		// Clean up review manager if it exists
		const reviewManager = (this as any).reviewManager;
		if (reviewManager) {
			reviewManager.cleanup();
		}
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

	constructor(app: any, plugin: SpacedRepetitionPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Spaced Repetition Settings' });

		new Setting(containerEl)
			.setName('Flashcard folder')
			.setDesc('Folder path where flashcard files are stored (e.g., "flashcards" or "notes/flashcards")')
			.addText(text => text
				.setPlaceholder('flashcards')
				.setValue(this.plugin.settings.flashcardFolder)
				.onChange(async (value) => {
					this.plugin.settings.flashcardFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
