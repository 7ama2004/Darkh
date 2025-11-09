import { App, MarkdownView, Notice } from 'obsidian';
import { ReviewComponent } from './review-component';
import { ReviewSession } from './review-session';
import { TFile } from 'obsidian';

export class ReviewManager {
	private app: App;
	private flashcardFolder: string;
	private activeReview: ReviewComponent | null = null;
	private session: ReviewSession | null = null;

	constructor(app: App, flashcardFolder: string) {
		this.app = app;
		this.flashcardFolder = flashcardFolder;
	}

	/**
	 * Start ad-hoc review for the currently open file
	 */
	async startAdHocReview(): Promise<void> {
		// Clean up any existing review
		if (this.activeReview) {
			this.activeReview.cleanup();
			this.activeReview = null;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('Please open a flashcard file to review.');
			return;
		}

		const file = activeView.file;
		if (!file) {
			new Notice('No file is currently open.');
			return;
		}

		// Check if file is in flashcard folder
		if (!file.path.startsWith(this.flashcardFolder)) {
			new Notice(`File is not in the flashcard folder (${this.flashcardFolder}).`);
			return;
		}

		const editor = activeView.editor;
		if (!editor) {
			new Notice('Editor is not available.');
			return;
		}

		// Create review component
		this.activeReview = new ReviewComponent(
			editor,
			activeView,
			file,
			async () => {
				// On complete - cleanup for ad-hoc review
				if (this.activeReview) {
					this.activeReview.cleanup();
					this.activeReview = null;
				}
			}
		);
	}

	/**
	 * Start a review session (queue-based)
	 */
	async startSessionReview(): Promise<void> {
		// Clean up any existing review
		if (this.activeReview) {
			this.activeReview.cleanup();
			this.activeReview = null;
		}

		// Initialize session
		this.session = new ReviewSession(this.app, this.flashcardFolder);
		const hasCards = await this.session.initialize();

		if (!hasCards) {
			new Notice('No flashcards are due for review.');
			return;
		}

		const progress = this.session.getProgress();
		new Notice(`Starting review session: ${progress.total} cards due.`);

		// Open first file
		await this.openNextCard();
	}

	/**
	 * Open the next card in the session
	 */
	private async openNextCard(): Promise<void> {
		if (!this.session) return;

		const file = this.session.getCurrentFile();
		if (!file) {
			new Notice('Review session complete!');
			this.session = null;
			return;
		}

		// Open file
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);

		// Wait for view to be ready
		await new Promise(resolve => setTimeout(resolve, 100));

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.editor) {
			new Notice('Failed to open file.');
			return;
		}

		// Create review component
		this.activeReview = new ReviewComponent(
			view.editor,
			view,
			file,
			async () => {
				// On complete - move to next card
				if (this.activeReview) {
					this.activeReview.cleanup();
					this.activeReview = null;
				}

				// Move to next
				await this.openNextCard();
			}
		);

		// Show progress
		const progress = this.session.getProgress();
		new Notice(`Card ${progress.current} of ${progress.total}`);
	}

	/**
	 * Stop current review
	 */
	stopReview(): void {
		if (this.activeReview) {
			this.activeReview.cleanup();
			this.activeReview = null;
		}
		this.session = null;
	}

	/**
	 * Check if a review is currently active
	 */
	isReviewActive(): boolean {
		return this.activeReview !== null;
	}
}
