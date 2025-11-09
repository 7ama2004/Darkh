import { App, PluginSettingTab, Setting } from 'obsidian';
import { SpacedRepetitionPlugin } from '../main';
import { SpacedRepetitionSettings } from './settings';

export class SpacedRepetitionSettingTab extends PluginSettingTab {
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
					this.plugin.settings.flashcardFolder = value || 'flashcards';
					await this.plugin.saveSettings();
					// Update review manager
					this.plugin.updateReviewManager();
				}));

		containerEl.createEl('h3', { text: 'How to Use' });

		const instructions = containerEl.createEl('div');
		instructions.style.cssText = 'margin-top: 10px; line-height: 1.6;';

		instructions.createEl('p', { text: '1. Create markdown files in your flashcard folder with YAML frontmatter:' });
		const example1 = instructions.createEl('pre', { text: `---
due: 2025-01-10
interval: 2.5
ease: 230
created: 2025-01-09
tags: [flashcard]
---

Your question here.

==Your answer here.==` });
		example1.style.cssText = 'background: var(--background-secondary); padding: 10px; border-radius: 4px; overflow-x: auto;';

		instructions.createEl('p', { text: '2. Wrap answers in double equals: ==answer==' });
		instructions.createEl('p', { text: '3. Use "Start review (current file)" to review a single file, or "Start review session" to review all due cards.' });
	}
}
