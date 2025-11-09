import { MarkdownView, TFile } from 'obsidian';
import { ReviewComponent } from './ReviewComponent';
import { parseFrontmatter } from '../utils/frontmatter';

export class ReviewManager {
	private activeReview: ReviewComponent | null = null;
	
	/**
	 * Start an ad-hoc review for a single file
	 */
	async startAdHocReview(view: MarkdownView): Promise<void> {
		// Clean up any existing review
		if (this.activeReview) {
			this.activeReview.cleanup();
		}
		
		const file = view.file;
		if (!file) return;
		
		this.activeReview = new ReviewComponent(
			view.editor,
			view,
			file
		);
		
		await this.activeReview.initialize();
	}
	
	/**
	 * Start a session review (queue-based)
	 */
	async startSessionReview(
		app: any,
		flashcardFolder: string,
		onComplete?: () => void
	): Promise<void> {
		// Find all due cards
		const dueCards = await this.findDueCards(app, flashcardFolder);
		
		if (dueCards.length === 0) {
			new (app as any).Notice('No cards due for review!');
			return;
		}
		
		// Start reviewing the first card
		await this.reviewNextCard(app, dueCards, 0, onComplete);
	}
	
	private async reviewNextCard(
		app: any,
		cards: TFile[],
		index: number,
		onComplete?: () => void
	): Promise<void> {
		if (index >= cards.length) {
			// All cards reviewed
			if (onComplete) onComplete();
			new (app as any).Notice(`Finished reviewing ${cards.length} card(s)!`);
			return;
		}
		
		const card = cards[index];
		
		// Open the file
		const leaf = app.workspace.getLeaf();
		await leaf.openFile(card);
		
		// Wait for the view to be ready
		await new Promise(resolve => setTimeout(resolve, 100));
		
		const view = leaf.view as MarkdownView;
		if (!view) {
			// Try next card
			await this.reviewNextCard(app, cards, index + 1, onComplete);
			return;
		}
		
		// Clean up any existing review
		if (this.activeReview) {
			this.activeReview.cleanup();
		}
		
		// Start review
		this.activeReview = new ReviewComponent(
			view.editor,
			view,
			card,
			async () => {
				// On completion, move to next card
				await this.reviewNextCard(app, cards, index + 1, onComplete);
			}
		);
		
		await this.activeReview.initialize();
	}
	
	private async findDueCards(app: any, folderPath: string): Promise<TFile[]> {
		const folder = app.vault.getAbstractFileByPath(folderPath);
		if (!folder || !(folder as any).children) {
			return [];
		}
		
		const today = new Date().toISOString().split('T')[0];
		const dueCards: TFile[] = [];
		
		const files = (folder as any).children.filter(
			(file: any) => file instanceof TFile && file.extension === 'md'
		) as TFile[];
		
		for (const file of files) {
			try {
				const content = await app.vault.read(file);
				const { frontmatter } = parseFrontmatter(content);
				
				if (frontmatter.due && frontmatter.due <= today) {
					dueCards.push(file);
				} else if (!frontmatter.due) {
					// No due date, treat as due
					dueCards.push(file);
				}
			} catch (e) {
				// Skip files that can't be read
				continue;
			}
		}
		
		return dueCards;
	}
	
	cleanup() {
		if (this.activeReview) {
			this.activeReview.cleanup();
			this.activeReview = null;
		}
	}
}
