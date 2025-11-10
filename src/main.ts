import { Plugin, MarkdownView, Notice, TFile } from "obsidian";
import { EditorView } from "@codemirror/view";
import { DarkhSRSSettings, DEFAULT_SETTINGS, DarkhSRSSettingTab } from "./settings";
import { ReviewViewController } from "./review-view-controller";
import { YAMLFrontmatterService } from "./yaml-service";
import { InsightDiscoveryService } from "./insight-discovery";
import { Scheduler } from "./scheduler";
import { Rating } from "./types";
import { HotkeyManager } from "./hotkey-manager";
import { ReviewToolbar } from "./ui/review-toolbar";
import { formatDate } from "./ui/utils";
import { FlashcardParser } from "./flashcard-parser";
import { FlashcardCreator } from "./flashcard-creator";
import { FlashcardLinkUpdater } from "./flashcard-link-updater";

export default class DarkhSRSPlugin extends Plugin {
	settings: DarkhSRSSettings;
	reviewViewController: ReviewViewController;
	yamlService: YAMLFrontmatterService;
	insightDiscovery: InsightDiscoveryService;
	hotkeyManager: HotkeyManager;
	
	// Active toolbar for current view
	private activeToolbar: ReviewToolbar | null = null;
	
	async onload() {
		console.log("Loading Darkh SRS plugin");
		
		// Load settings
		await this.loadSettings();
		
		// Apply custom highlight color
		this.applyClozeHighlightColor();
		
		// Initialize services
		this.yamlService = new YAMLFrontmatterService(this.app);
		this.insightDiscovery = new InsightDiscoveryService(this.app, this.yamlService);
		this.reviewViewController = new ReviewViewController(this);
		this.hotkeyManager = new HotkeyManager(this);
		
		// Register CodeMirror 6 extension
		this.registerEditorExtension(this.reviewViewController.getExtension());
		
		// Register commands
		this.registerCommands();
		
		// Register hotkeys
		this.hotkeyManager.registerHotkeys();
		
		// Add ribbon icon for "Go to next note"
		this.addRibbonIcon('dice', 'Go to next note', async () => {
			await this.goToNextNote();
		});
		
		// Add settings tab
		this.addSettingTab(new DarkhSRSSettingTab(this.app, this));
		
		// Listen to active leaf changes to update toolbar
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.updateToolbarForActiveView();
			})
		);
		
		// Listen to file open events to auto-enable review mode for flashcards
		this.registerEvent(
			this.app.workspace.on("file-open", async (file) => {
				if (file) {
					await this.handleFileOpen(file);
				}
			})
		);
	}
	
	onunload() {
		console.log("Unloading Darkh SRS plugin");
		
		// Clean up toolbar
		if (this.activeToolbar) {
			this.activeToolbar.destroy();
			this.activeToolbar = null;
		}
	}
	
	/**
	 * Register plugin commands
	 */
	private registerCommands(): void {
		// Toggle Review View
		this.addCommand({
			id: "toggle-review-view",
			name: "Toggle review view",
			editorCheckCallback: (checking: boolean, editor, view) => {
				const editorView = this.getActiveEditorView();
				if (!editorView) {
					return false;
				}
				
				if (!checking) {
					this.toggleReviewView(editorView);
				}
				
				return true;
			}
		});
		
		// Go to Next Note
		this.addCommand({
			id: "go-to-next-note",
			name: "Go to next note",
			callback: async () => {
				await this.goToNextNote();
			}
		});
		
		// Parse Flashcards in Current Note
		this.addCommand({
			id: "parse-flashcards-in-note",
			name: "Parse flashcards in current note",
			callback: async () => {
				await this.parseFlashcardsInCurrentNote();
			}
		});
	}
	
	
	/**
	 * Toggle review view for the active editor
	 */
	private toggleReviewView(view: EditorView): void {
		const isReviewMode = this.reviewViewController.isReviewMode(view);
		
		if (isReviewMode) {
			this.disableReviewMode(view);
		} else {
			this.enableReviewMode(view);
		}
	}
	
	/**
	 * Enable review mode
	 */
	private enableReviewMode(view: EditorView): void {
		this.reviewViewController.enableReviewMode(view);
		
		// Check if there are clozes
		const clozeCount = this.reviewViewController.getClozeCount(view);
		
		if (clozeCount === 0) {
			// No clozes found - show rating buttons immediately
			new Notice("No clozes found. You can rate this card directly.");
			this.showToolbar(view, true);
		} else {
			// Show reveal button
			this.showToolbar(view, false);
		}
	}
	
	/**
	 * Disable review mode
	 */
	private disableReviewMode(view: EditorView): void {
		this.reviewViewController.disableReviewMode(view);
		
		// Hide toolbar
		if (this.activeToolbar) {
			this.activeToolbar.destroy();
			this.activeToolbar = null;
		}
	}
	
	/**
	 * Show toolbar for review
	 */
	private showToolbar(view: EditorView, showRating: boolean): void {
		// Clean up existing toolbar
		if (this.activeToolbar) {
			this.activeToolbar.destroy();
		}
		
		// Find the markdown view container
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) {
			return;
		}
		
		// Create toolbar
		const container = markdownView.contentEl;
		this.activeToolbar = new ReviewToolbar(this, container);
		
		// Setup callbacks
		this.activeToolbar.onReveal(() => {
			this.handleRevealNext();
		});
		
		this.activeToolbar.onRating((rating) => {
			this.handleRating(rating);
		});
		
		// Show appropriate buttons
		if (showRating) {
			this.activeToolbar.showRatingButtons();
		} else {
			this.activeToolbar.showRevealButton();
		}
	}
	
	/**
	 * Update toolbar based on active view state
	 */
	private updateToolbarForActiveView(): void {
		const view = this.getActiveEditorView();
		if (!view) {
			// No active editor - hide toolbar
			if (this.activeToolbar) {
				this.activeToolbar.destroy();
				this.activeToolbar = null;
			}
			return;
		}
		
		const isReviewMode = this.reviewViewController.isReviewMode(view);
		if (!isReviewMode) {
			// Not in review mode - hide toolbar
			if (this.activeToolbar) {
				this.activeToolbar.destroy();
				this.activeToolbar = null;
			}
			return;
		}
		
		// In review mode - update toolbar state
		const isFullyRevealed = this.reviewViewController.isFullyRevealed(view);
		this.showToolbar(view, isFullyRevealed);
	}
	
	/**
	 * Handle reveal next action
	 */
	handleRevealNext(): void {
		const view = this.getActiveEditorView();
		if (!view) {
			return;
		}
		
		this.reviewViewController.revealNext(view);
		
		// Check if all clozes are now revealed
		const isFullyRevealed = this.reviewViewController.isFullyRevealed(view);
		if (isFullyRevealed && this.activeToolbar) {
			// Switch to rating buttons
			this.activeToolbar.showRatingButtons();
		}
	}
	
	/**
	 * Handle rating action
	 */
	async handleRating(rating: Rating): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			new Notice("No active file");
			return;
		}
		
		// Handle skip - just go to next note without updating schedule
		if (rating === "skip") {
			await this.goToNextNote();
			return;
		}
		
		try {
			// Read current state
			const currentState = await this.yamlService.readScheduleState(file);
			
			// Calculate new schedule
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const newState = Scheduler.scheduleNext(currentState, rating, today, this.settings);
			
			// Write updated state
			await this.yamlService.writeScheduleState(file, newState);
			
			// Show feedback
			const dueStr = newState.due ? formatDate(newState.due) : "unknown";
			new Notice(`Card rated as "${rating}". Next review: ${dueStr}`);
			
			// Automatically go to next note after rating
			await this.goToNextNote();
		} catch (error) {
			console.error("Error rating card:", error);
			new Notice("Failed to save rating. Check console for details.");
		}
	}
	
	/**
	 * Go to the next due note
	 */
	private async goToNextNote(): Promise<void> {
		// Check if folder is configured
		if (!this.settings.flashcardFolder || this.settings.flashcardFolder.trim() === "") {
			new Notice("Please configure flashcards folder in settings first");
			return;
		}
		
		// Validate folder exists
		const isValid = await this.insightDiscovery.validateFolder(this.settings.flashcardFolder);
		if (!isValid) {
			new Notice(`Flashcards folder "${this.settings.flashcardFolder}" not found`);
			return;
		}
		
		// Get due cards
		const dueInsights = await this.insightDiscovery.getDueInsightFiles(this.settings.flashcardFolder);
		
		if (dueInsights.length === 0) {
			new Notice("No cards due for review! 🎉");
			return;
		}
		
		// Get current file
		const currentFile = this.app.workspace.getActiveFile();
		
		// Find next card (skip current file if it's in the list)
		let nextFile = dueInsights[0].file;
		
		if (currentFile) {
			const currentIndex = dueInsights.findIndex(insight => insight.file.path === currentFile.path);
			if (currentIndex !== -1 && currentIndex < dueInsights.length - 1) {
				// Move to next card after current
				nextFile = dueInsights[currentIndex + 1].file;
			} else if (currentIndex === dueInsights.length - 1) {
				// At the end, loop back to first or stay at current
				new Notice("No more cards due for review! 🎉");
				return;
			}
		}
		
		// Open the next file
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(nextFile);
	}
	
	/**
	 * Handle file open event - auto-enable review mode for flashcards
	 */
	private async handleFileOpen(file: TFile): Promise<void> {
		// Skip if auto-enable is disabled in settings
		if (!this.settings.autoEnableReviewMode) {
			return;
		}
		
		// Check if file has SRS frontmatter
		const state = await this.yamlService.readScheduleState(file);
		if (!state || !state.sr) {
			return;
		}
		
		// Wait a bit for the editor to be ready
		setTimeout(() => {
			const view = this.getActiveEditorView();
			if (view && !this.reviewViewController.isReviewMode(view)) {
				this.enableReviewMode(view);
			}
		}, 100);
	}
	
	/**
	 * Get the active editor view (CodeMirror 6)
	 */
	getActiveEditorView(): EditorView | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			return null;
		}
		
		// Access the CodeMirror 6 editor
		const editor = (view.editor as any)?.cm;
		if (!editor || !(editor instanceof EditorView)) {
			return null;
		}
		
		return editor;
	}
	
	/**
	 * Load settings
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	
	/**
	 * Save settings
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	/**
	 * Apply the custom cloze highlight color to the document
	 */
	applyClozeHighlightColor(): void {
		// Set CSS custom property on the document root
		document.body.style.setProperty("--darkh-cloze-color", this.settings.clozeHighlightColor);
	}
	
	/**
	 * Parse flashcards in the current note
	 */
	private async parseFlashcardsInCurrentNote(): Promise<void> {
		// Get the active file
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			new Notice("No active file");
			return;
		}
		
		// Validate flashcard folder is configured
		if (!this.settings.flashcardFolder || this.settings.flashcardFolder.trim() === "") {
			new Notice("Please configure flashcard folder in settings first");
			return;
		}
		
		try {
			// Read file content
			const content = await this.app.vault.read(file);
			
			// Parse flashcard blocks
			const blocks = FlashcardParser.parseFlashcardBlocks(content);
			
			if (blocks.length === 0) {
				new Notice("No flashcard blocks found. Use 'start' and 'end' markers.");
				return;
			}
			
			// Create flashcard files
			const creator = new FlashcardCreator(this.app, this.settings.flashcardFolder, this.settings);
			const results = await creator.createFlashcards(blocks, file);
			
			// Update source file with links
			const updater = new FlashcardLinkUpdater(this.app);
			await updater.updateSourceFile(file, results);
			
			// Show success message
			const count = results.length;
			const plural = count === 1 ? '' : 's';
			new Notice(`Created ${count} flashcard${plural} successfully`);
			
		} catch (error) {
			console.error("Error parsing flashcards:", error);
			new Notice(`Error: ${error.message}`);
		}
	}
}

