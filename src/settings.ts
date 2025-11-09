import { App, PluginSettingTab, Setting, Platform } from "obsidian";
import type DarkhSRSPlugin from "./main";

/**
 * Plugin settings interface
 */
export interface DarkhSRSSettings {
	flashcardFolder: string;         // Required, e.g. "flashcards/"
	initialEase: number;             // Default 2.5
	minEase: number;                 // Default 1.3
	maxInterval: number;             // Optional cap on interval (days)
	
	// Deprecated hotkey fields (kept for backward compatibility)
	// Users should now use Settings → Hotkeys in Obsidian
	hotkeyReveal?: string;
	hotkeyAgain?: string;
	hotkeyHard?: string;
	hotkeyGood?: string;
	hotkeyEasy?: string;
	
	// UI customization
	clozeHighlightColor: string;     // Color for hidden clozes
	
	// Mobile UI
	bottomToolbar: boolean;          // Default true on mobile
	largeButtons: boolean;           // Default true on mobile
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: DarkhSRSSettings = {
	flashcardFolder: "",
	initialEase: 2.5,
	minEase: 1.3,
	maxInterval: 365,
	
	clozeHighlightColor: "#ffd900",
	
	bottomToolbar: Platform.isMobile,
	largeButtons: Platform.isMobile,
};

/**
 * Settings tab for configuring the plugin
 */
export class DarkhSRSSettingTab extends PluginSettingTab {
	plugin: DarkhSRSPlugin;

	constructor(app: App, plugin: DarkhSRSPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Darkh SRS Settings" });

		// Flashcard folder
		new Setting(containerEl)
			.setName("Flashcard folder")
			.setDesc("Folder containing your flashcard notes (e.g., 'flashcards/'). Leave empty to require manual setup.")
			.addText(text => text
				.setPlaceholder("flashcards/")
				.setValue(this.plugin.settings.flashcardFolder)
				.onChange(async (value) => {
					this.plugin.settings.flashcardFolder = value.trim();
					await this.plugin.saveSettings();
				}));

		// Scheduler settings
		containerEl.createEl("h3", { text: "Scheduler parameters" });

		new Setting(containerEl)
			.setName("Initial ease factor")
			.setDesc("Starting ease factor for new cards (default: 2.5)")
			.addText(text => text
				.setPlaceholder("2.5")
				.setValue(String(this.plugin.settings.initialEase))
				.onChange(async (value) => {
					const num = parseFloat(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.initialEase = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName("Minimum ease factor")
			.setDesc("Minimum ease factor (default: 1.3)")
			.addText(text => text
				.setPlaceholder("1.3")
				.setValue(String(this.plugin.settings.minEase))
				.onChange(async (value) => {
					const num = parseFloat(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.minEase = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName("Maximum interval (days)")
			.setDesc("Maximum interval between reviews in days (default: 365)")
			.addText(text => text
				.setPlaceholder("365")
				.setValue(String(this.plugin.settings.maxInterval))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.maxInterval = num;
						await this.plugin.saveSettings();
					}
				}));

		// UI customization
		containerEl.createEl("h3", { text: "Appearance" });

		new Setting(containerEl)
			.setName("Hidden cloze color")
			.setDesc("Color used to hide cloze answers (applies on plugin reload)")
			.addColorPicker(color => color
				.setValue(this.plugin.settings.clozeHighlightColor)
				.onChange(async (value) => {
					this.plugin.settings.clozeHighlightColor = value;
					await this.plugin.saveSettings();
					// Apply the color immediately
					this.plugin.applyClozeHighlightColor();
				}));

		// Hotkey information
		containerEl.createEl("h3", { text: "Review hotkeys" });
		
		const hotkeyInfo = containerEl.createDiv({ cls: "setting-item-description" });
		hotkeyInfo.createEl("p", { 
			text: "Review commands are available when Review View is active. Assign hotkeys in Settings → Hotkeys."
		});
		hotkeyInfo.createEl("p", { text: "Available commands:" });
		const commandList = hotkeyInfo.createEl("ul");
		commandList.createEl("li", { text: "Reveal next cloze" });
		commandList.createEl("li", { text: "Rate card as 'Again'" });
		commandList.createEl("li", { text: "Rate card as 'Hard'" });
		commandList.createEl("li", { text: "Rate card as 'Good'" });
		commandList.createEl("li", { text: "Rate card as 'Easy'" });

		// Mobile UI settings
		containerEl.createEl("h3", { text: "Mobile UI" });

		new Setting(containerEl)
			.setName("Bottom-anchored toolbar")
			.setDesc("Display review toolbar at the bottom of the screen (recommended for mobile)")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.bottomToolbar)
				.onChange(async (value) => {
					this.plugin.settings.bottomToolbar = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Large buttons")
			.setDesc("Use larger buttons for better touch accessibility")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.largeButtons)
				.onChange(async (value) => {
					this.plugin.settings.largeButtons = value;
					await this.plugin.saveSettings();
				}));
	}
}

