import { Plugin, MarkdownView, Notice, WorkspaceLeaf } from "obsidian";
import { EditorView } from "@codemirror/view";
import { DarkhSRSSettings, DEFAULT_SETTINGS, DarkhSRSSettingTab } from "./settings";
import { ReviewViewController } from "./review-view-controller";
import { SessionManager } from "./session-manager";
import { YAMLFrontmatterService } from "./yaml-service";
import { InsightDiscoveryService } from "./insight-discovery";
import { Scheduler } from "./scheduler";
import { Rating } from "./types";
import { HotkeyManager } from "./hotkey-manager";
import { ReviewToolbar } from "./ui/review-toolbar";
import { SessionProgress } from "./ui/session-progress";
import { formatDate } from "./ui/utils";

export default class DarkhSRSPlugin extends Plugin {
	settings: DarkhSRSSettings;
	reviewViewController: ReviewViewController;
	sessionManager: SessionManager;
	yamlService: YAMLFrontmatterService;
	insightDiscovery: InsightDiscoveryService;
	hotkeyManager: HotkeyManager;
	sessionProgress: SessionProgress;
	
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
		this.sessionManager = new SessionManager(this);
		this.hotkeyManager = new HotkeyManager(this);
		this.sessionProgress = new SessionProgress(this);
		
		// Register CodeMirror 6 extension
		this.registerEditorExtension(this.reviewViewController.getExtension());
		
		// Register commands
		this.registerCommands();
		
		// Register hotkeys
		this.hotkeyManager.registerHotkeys();
		
		// Add settings tab
		this.addSettingTab(new DarkhSRSSettingTab(this.app, this));
		
		// Listen to session events
		this.setupSessionListeners();
		
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
		
		// End any active session
		this.sessionManager.endSession();
		
		// Hide session progress
		this.sessionProgress.hide();
		
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
		
		// Start Review Session
		this.addCommand({
			id: "start-review-session",
			name: "Start review session",
			callback: async () => {
				await this.startReviewSession();
			}
		});
		
		// End Review Session
		this.addCommand({
			id: "end-review-session",
			name: "End review session",
			checkCallback: (checking: boolean) => {
				const isActive = this.sessionManager.isActive();
				
				if (!checking && isActive) {
					this.sessionManager.endSession(true);
				}
				
				return isActive;
			}
		});
	}
	
	/**
	 * Setup session event listeners
	 */
	private setupSessionListeners(): void {
		this.sessionManager.on("session-started", (state) => {
			const progress = this.sessionManager.getProgress();
			this.sessionProgress.show(progress.current, progress.total);
			
			// Enable review mode for first file
			const view = this.getActiveEditorView();
			if (view) {
				this.enableReviewMode(view);
			}
		});
		
		this.sessionManager.on("session-progress", (state) => {
			const progress = this.sessionManager.getProgress();
			this.sessionProgress.update(progress.current, progress.total);
			
			// Enable review mode for next file
			const view = this.getActiveEditorView();
			if (view) {
				this.enableReviewMode(view);
			}
		});
		
		this.sessionManager.on("session-ended", (data) => {
			this.sessionProgress.hide();
			
			// Optionally disable review mode
			const view = this.getActiveEditorView();
			if (view && this.reviewViewController.isReviewMode(view)) {
				// Keep review mode on, just remove toolbar
				if (this.activeToolbar) {
					this.activeToolbar.hide();
				}
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
			
			// If in session, advance to next card
			if (this.sessionManager.isActive()) {
				await this.sessionManager.advanceSession();
			} else {
				// Ad-hoc mode - reveal all clozes and keep on same file
				const view = this.getActiveEditorView();
				if (view) {
					this.reviewViewController.revealAll(view);
				}
			}
		} catch (error) {
			console.error("Error rating card:", error);
			new Notice("Failed to save rating. Check console for details.");
		}
	}
	
	/**
	 * Start a review session
	 */
	private async startReviewSession(): Promise<void> {
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
		new Notice("Building review queue...");
		const dueInsights = await this.insightDiscovery.getDueInsightFiles(this.settings.flashcardFolder);
		
		if (dueInsights.length === 0) {
			new Notice("No cards due for review! 🎉");
			return;
		}
		
		// Start session
		const files = dueInsights.map(insight => insight.file);
		await this.sessionManager.startSession(files);
	}
	
	/**
	 * Handle file open event - auto-enable review mode for flashcards
	 */
	private async handleFileOpen(file: TFile): Promise<void> {
		// Skip if auto-enable is disabled in settings
		if (!this.settings.autoEnableReviewMode) {
			return;
		}
		
		// Skip if already in a session (session handles review mode automatically)
		if (this.sessionManager.isActive()) {
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
}

