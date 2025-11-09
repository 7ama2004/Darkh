import { App, MarkdownView, TFile } from 'obsidian';
import { ReviewUI } from './review-ui';
import { ReviewQuality, calculateNextReview, CardSchedule } from '../scheduling/sm2';
import { getCardSchedule, updateCardSchedule, initializeCardSchedule } from '../utils/frontmatter';
import { Notice } from 'obsidian';

export class ReviewManager {
	private app: App;
	private currentReviewUI: ReviewUI | null = null;
	private sessionQueue: TFile[] = [];
	private isSessionMode: boolean = false;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Start ad-hoc review for the currently open file
	 */
	async startAdHocReview(): Promise<void> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice('Please open a flashcard file to review.');
			return;
		}

		const file = view.file;
		if (!file) {
			new Notice('No file is open.');
			return;
		}

		// Check if file has schedule, initialize if not
		let schedule = await getCardSchedule(this.app, file);
		if (!schedule) {
			await initializeCardSchedule(this.app, file);
			schedule = await getCardSchedule(this.app, file);
			if (!schedule) {
				new Notice('Could not initialize card schedule.');
				return;
			}
		}

		this.isSessionMode = false;
		await this.startReviewForFile(file, view);
	}

	/**
	 * Start a review session with all due cards
	 */
	async startSessionReview(flashcardFolder: string): Promise<void> {
		const { scanForDueCards } = await import('../utils/file-scanner');
		const dueCards = await scanForDueCards(this.app, flashcardFolder);

		if (dueCards.length === 0) {
			new Notice('No cards due for review!');
			return;
		}

		this.sessionQueue = dueCards;
		this.isSessionMode = true;

		// Open first card
		await this.loadNextCardInSession();
	}

	/**
	 * Start review for a specific file
	 */
	private async startReviewForFile(file: TFile, view?: MarkdownView): Promise<void> {
		// Get or open the view
		if (!view) {
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
			view = leaf.view as MarkdownView;
		}

		// Wait for view to be ready
		await new Promise(resolve => setTimeout(resolve, 100));

		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView || markdownView.file !== file) {
			new Notice('Could not open file for review.');
			return;
		}

		// End any existing review
		if (this.currentReviewUI) {
			this.currentReviewUI.endReview();
		}

		// Start new review
		this.currentReviewUI = new ReviewUI(markdownView);
		this.currentReviewUI.startReview(async (quality: ReviewQuality) => {
			await this.handleFeedback(file, quality);
		});
	}

	/**
	 * Handle feedback button click
	 */
	private async handleFeedback(file: TFile, quality: ReviewQuality): Promise<void> {
		try {
			const schedule = await getCardSchedule(this.app, file);
			if (!schedule) {
				new Notice('Could not read card schedule.');
				return;
			}

			const newSchedule = calculateNextReview(schedule, quality);
			await updateCardSchedule(this.app, file, {
				...newSchedule,
				created: schedule.created
			});

			// End review for this card
			if (this.currentReviewUI) {
				this.currentReviewUI.endReview();
				this.currentReviewUI = null;
			}

			if (this.isSessionMode) {
				// Load next card in session
				await this.loadNextCardInSession();
			} else {
				new Notice(`Card updated. Next review: ${newSchedule.due}`);
			}
		} catch (error) {
			console.error('Error handling feedback:', error);
			new Notice('Error updating card schedule.');
		}
	}

	/**
	 * Load next card in session queue
	 */
	private async loadNextCardInSession(): Promise<void> {
		if (this.sessionQueue.length === 0) {
			new Notice('Review session complete! All cards reviewed.');
			this.isSessionMode = false;
			return;
		}

		const nextFile = this.sessionQueue.shift();
		if (!nextFile) {
			return;
		}

		await this.startReviewForFile(nextFile);
	}

	/**
	 * End current review
	 */
	endCurrentReview(): void {
		if (this.currentReviewUI) {
			this.currentReviewUI.endReview();
			this.currentReviewUI = null;
		}
		this.isSessionMode = false;
		this.sessionQueue = [];
	}
}
