import { Rating } from "./types";
import type DarkhSRSPlugin from "./main";

/**
 * Manager for review hotkeys
 */
export class HotkeyManager {
	private plugin: DarkhSRSPlugin;
	
	constructor(plugin: DarkhSRSPlugin) {
		this.plugin = plugin;
	}
	
	/**
	 * Register all review commands
	 * These commands are only active when Review View is enabled.
	 * Users can assign hotkeys through Settings → Hotkeys in Obsidian.
	 */
	registerHotkeys(): void {
		// Reveal next cloze
		this.plugin.addCommand({
			id: "reveal-next-cloze",
			name: "Reveal next cloze",
			checkCallback: (checking: boolean) => {
				const canExecute = this.canExecuteReviewAction();
				
				if (!canExecute) {
					return false;
				}
				
				if (!checking) {
					this.plugin.handleRevealNext();
				}
				
				return true;
			}
		});
		
		// Rate as Again
		this.plugin.addCommand({
			id: "rate-again",
			name: "Rate card as 'Again'",
			checkCallback: (checking: boolean) => {
				const canExecute = this.canExecuteRating();
				
				if (!canExecute) {
					return false;
				}
				
				if (!checking) {
					this.plugin.handleRating("again");
				}
				
				return true;
			}
		});
		
		// Rate as Hard
		this.plugin.addCommand({
			id: "rate-hard",
			name: "Rate card as 'Hard'",
			checkCallback: (checking: boolean) => {
				const canExecute = this.canExecuteRating();
				
				if (!canExecute) {
					return false;
				}
				
				if (!checking) {
					this.plugin.handleRating("hard");
				}
				
				return true;
			}
		});
		
		// Rate as Good
		this.plugin.addCommand({
			id: "rate-good",
			name: "Rate card as 'Good'",
			checkCallback: (checking: boolean) => {
				const canExecute = this.canExecuteRating();
				
				if (!canExecute) {
					return false;
				}
				
				if (!checking) {
					this.plugin.handleRating("good");
				}
				
				return true;
			}
		});
		
		// Rate as Easy
		this.plugin.addCommand({
			id: "rate-easy",
			name: "Rate card as 'Easy'",
			checkCallback: (checking: boolean) => {
				const canExecute = this.canExecuteRating();
				
				if (!canExecute) {
					return false;
				}
				
				if (!checking) {
					this.plugin.handleRating("easy");
				}
				
				return true;
			}
		});
		
		// Skip card
		this.plugin.addCommand({
			id: "rate-skip",
			name: "Skip card",
			checkCallback: (checking: boolean) => {
				const canExecute = this.canExecuteRating();
				
				if (!canExecute) {
					return false;
				}
				
				if (!checking) {
					this.plugin.handleRating("skip");
				}
				
				return true;
			}
		});
	}
	
	/**
	 * Check if review action (reveal) can be executed
	 */
	private canExecuteReviewAction(): boolean {
		const view = this.plugin.getActiveEditorView();
		if (!view) {
			return false;
		}
		
		const isReviewMode = this.plugin.reviewViewController.isReviewMode(view);
		if (!isReviewMode) {
			return false;
		}
		
		const isFullyRevealed = this.plugin.reviewViewController.isFullyRevealed(view);
		return !isFullyRevealed;
	}
	
	/**
	 * Check if rating action can be executed
	 */
	private canExecuteRating(): boolean {
		const view = this.plugin.getActiveEditorView();
		if (!view) {
			return false;
		}
		
		const isReviewMode = this.plugin.reviewViewController.isReviewMode(view);
		if (!isReviewMode) {
			return false;
		}
		
		const isFullyRevealed = this.plugin.reviewViewController.isFullyRevealed(view);
		return isFullyRevealed;
	}
}

