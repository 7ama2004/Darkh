import { Rating } from "../types";
import type DarkhSRSPlugin from "../main";

/**
 * Review toolbar component
 */
export class ReviewToolbar {
	private plugin: DarkhSRSPlugin;
	private containerEl: HTMLElement;
	private onRevealCallback: (() => void) | null = null;
	private onRatingCallback: ((rating: Rating) => void) | null = null;
	
	constructor(plugin: DarkhSRSPlugin, parentEl: HTMLElement) {
		this.plugin = plugin;
		this.containerEl = parentEl.createDiv({ cls: "darkh-srs-toolbar" });
		this.applySettings();
	}
	
	/**
	 * Apply settings-based styling
	 */
	private applySettings(): void {
		const settings = this.plugin.settings;
		
		if (settings.bottomToolbar) {
			this.containerEl.addClass("darkh-srs-toolbar-bottom");
		}
		
		if (settings.largeButtons) {
			this.containerEl.addClass("darkh-srs-toolbar-large");
		}
	}
	
	/**
	 * Show reveal button
	 */
	showRevealButton(): void {
		this.containerEl.empty();
		
		const button = this.containerEl.createEl("button", {
			text: "Reveal Next",
			cls: "darkh-srs-button darkh-srs-button-reveal"
		});
		
		button.addEventListener("click", () => {
			if (this.onRevealCallback) {
				this.onRevealCallback();
			}
		});
	}
	
	/**
	 * Show rating buttons
	 */
	showRatingButtons(): void {
		this.containerEl.empty();
		
		const buttonConfigs = [
			{ rating: "again" as Rating, text: "Again", cls: "darkh-srs-button-again" },
			{ rating: "hard" as Rating, text: "Hard", cls: "darkh-srs-button-hard" },
			{ rating: "good" as Rating, text: "Good", cls: "darkh-srs-button-good" },
			{ rating: "easy" as Rating, text: "Easy", cls: "darkh-srs-button-easy" },
		];
		
		for (const config of buttonConfigs) {
			const button = this.containerEl.createEl("button", {
				text: config.text,
				cls: `darkh-srs-button darkh-srs-button-rating ${config.cls}`
			});
			
			button.addEventListener("click", () => {
				if (this.onRatingCallback) {
					this.onRatingCallback(config.rating);
				}
			});
		}
	}
	
	/**
	 * Hide the toolbar
	 */
	hide(): void {
		this.containerEl.empty();
		this.containerEl.style.display = "none";
	}
	
	/**
	 * Show the toolbar
	 */
	show(): void {
		this.containerEl.style.display = "";
	}
	
	/**
	 * Set reveal callback
	 */
	onReveal(callback: () => void): void {
		this.onRevealCallback = callback;
	}
	
	/**
	 * Set rating callback
	 */
	onRating(callback: (rating: Rating) => void): void {
		this.onRatingCallback = callback;
	}
	
	/**
	 * Remove the toolbar
	 */
	destroy(): void {
		this.containerEl.remove();
	}
}

