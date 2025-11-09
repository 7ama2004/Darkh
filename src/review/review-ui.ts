import { MarkdownView, Editor } from 'obsidian';
import { ReviewQuality } from '../scheduling/sm2';

export class ReviewUI {
	private view: MarkdownView;
	private editor: Editor;
	private hiddenElements: HTMLElement[] = [];
	private currentRevealIndex: number = 0;
	private revealButton: HTMLElement | null = null;
	private feedbackButtons: HTMLElement | null = null;
	private onFeedbackCallback: ((quality: ReviewQuality) => void) | null = null;

	constructor(view: MarkdownView) {
		this.view = view;
		this.editor = view.editor;
	}

	/**
	 * Start review mode - hide all ==...== blocks
	 */
	startReview(onFeedback: (quality: ReviewQuality) => void): void {
		this.onFeedbackCallback = onFeedback;
		this.currentRevealIndex = 0;
		this.createUI();
		this.hideAnswers();
	}

	/**
	 * End review mode - restore all hidden content
	 */
	endReview(): void {
		this.revealAll();
		this.removeUI();
		this.hiddenElements = [];
		this.currentRevealIndex = 0;
		this.onFeedbackCallback = null;
	}

	/**
	 * Find and hide all ==...== marked text
	 */
	private hideAnswers(): void {
		const containerEl = this.view.containerEl;
		if (!containerEl) return;

		// Try to find elements immediately
		this.findAndHideElements(containerEl);

		// Also try after a short delay in case rendering isn't complete
		setTimeout(() => {
			this.findAndHideElements(containerEl);
		}, 200);
	}

	/**
	 * Find mark elements and hide them
	 */
	private findAndHideElements(containerEl: HTMLElement): void {
		// In source mode, we can't easily blur the raw markdown, so we'll work with preview mode
		// For now, we'll focus on preview/reading mode where ==text== renders as <mark>
		
		// Find all mark elements (Obsidian renders ==text== as <mark> elements in preview mode)
		const marks = containerEl.querySelectorAll('mark');
		const newElements = Array.from(marks) as HTMLElement[];

		// Add new elements that aren't already in our list
		newElements.forEach(el => {
			if (!this.hiddenElements.includes(el)) {
				this.hiddenElements.push(el);
			}
		});

		// If we're in preview mode and no marks found, try to find highlights in the preview view
		if (this.hiddenElements.length === 0) {
			const previewEl = containerEl.querySelector('.markdown-preview-view');
			if (previewEl) {
				const previewMarks = previewEl.querySelectorAll('mark');
				const previewElements = Array.from(previewMarks) as HTMLElement[];
				previewElements.forEach(el => {
					if (!this.hiddenElements.includes(el)) {
						this.hiddenElements.push(el);
					}
				});
			}
		}

		// Also check in the reading view
		if (this.hiddenElements.length === 0) {
			const readingEl = containerEl.querySelector('.markdown-reading-view');
			if (readingEl) {
				const readingMarks = readingEl.querySelectorAll('mark');
				const readingElements = Array.from(readingMarks) as HTMLElement[];
				readingElements.forEach(el => {
					if (!this.hiddenElements.includes(el)) {
						this.hiddenElements.push(el);
					}
				});
			}
		}

		// Apply blur to all hidden elements
		this.hiddenElements.forEach((el, index) => {
			el.classList.add('spaced-repetition-hidden');
			el.setAttribute('data-reveal-index', index.toString());
		});

		// Update UI if needed
		if (this.hiddenElements.length === 0 && this.revealButton && !this.feedbackButtons) {
			// No hidden elements, show feedback buttons immediately
			this.showFeedbackButtons();
		}
	}

	/**
	 * Hide answers in source mode (when viewing raw markdown)
	 */
	private hideAnswersInSource(): void {
		const containerEl = this.view.containerEl;
		if (!containerEl) return;

		// Get the editor content
		const content = this.editor.getValue();
		
		// Find all ==...== patterns
		const highlightRegex = /==([^=]+)==/g;
		let match;
		const matches: Array<{ start: number; end: number }> = [];

		while ((match = highlightRegex.exec(content)) !== null) {
			matches.push({
				start: match.index,
				end: match.index + match[0].length
			});
		}

		// In source mode, we need to work with the CodeMirror editor
		// This is more complex, so we'll primarily rely on the rendered view
		// For source mode, we can add a visual indicator
		if (this.view.getMode() === 'source') {
			// Add a class to the container to indicate review mode
			containerEl.classList.add('spaced-repetition-review-mode');
		}
	}

	/**
	 * Reveal the next hidden answer
	 */
	private revealNext(): void {
		if (this.currentRevealIndex < this.hiddenElements.length) {
			const element = this.hiddenElements[this.currentRevealIndex];
			element.classList.remove('spaced-repetition-hidden');
			element.classList.add('spaced-repetition-revealed');
			this.currentRevealIndex++;

			// Scroll to revealed element
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}

		// Check if all are revealed
		if (this.currentRevealIndex >= this.hiddenElements.length) {
			this.showFeedbackButtons();
		}
	}

	/**
	 * Reveal all answers
	 */
	private revealAll(): void {
		this.hiddenElements.forEach(el => {
			el.classList.remove('spaced-repetition-hidden');
			el.classList.remove('spaced-repetition-revealed');
		});
	}

	/**
	 * Create UI elements (buttons)
	 */
	private createUI(): void {
		this.removeUI(); // Clean up any existing UI

		const containerEl = this.view.containerEl;
		if (!containerEl) return;

		// Create container for review controls
		const container = document.createElement('div');
		container.className = 'spaced-repetition-controls';

		// Create reveal button
		this.revealButton = document.createElement('button');
		this.revealButton.className = 'spaced-repetition-button spaced-repetition-reveal';
		this.revealButton.textContent = 'Reveal Next';
		this.revealButton.addEventListener('click', () => this.revealNext());

		container.appendChild(this.revealButton);
		containerEl.appendChild(container);

		// If no hidden elements, show feedback buttons immediately
		if (this.hiddenElements.length === 0) {
			this.showFeedbackButtons();
		}
	}

	/**
	 * Show feedback buttons (Again, Hard, Good, Easy)
	 */
	private showFeedbackButtons(): void {
		if (this.revealButton) {
			this.revealButton.style.display = 'none';
		}

		if (this.feedbackButtons) {
			return; // Already showing
		}

		const containerEl = this.view.containerEl;
		if (!containerEl) return;

		const container = containerEl.querySelector('.spaced-repetition-controls');
		if (!container) return;

		this.feedbackButtons = document.createElement('div');
		this.feedbackButtons.className = 'spaced-repetition-feedback-buttons';

		const qualities: Array<{ quality: ReviewQuality; label: string; className: string }> = [
			{ quality: 'again', label: 'Again', className: 'again' },
			{ quality: 'hard', label: 'Hard', className: 'hard' },
			{ quality: 'good', label: 'Good', className: 'good' },
			{ quality: 'easy', label: 'Easy', className: 'easy' }
		];

		qualities.forEach(({ quality, label, className }) => {
			const button = document.createElement('button');
			button.className = `spaced-repetition-button spaced-repetition-feedback ${className}`;
			button.textContent = label;
			button.addEventListener('click', () => {
				if (this.onFeedbackCallback) {
					this.onFeedbackCallback(quality);
				}
			});
			if (this.feedbackButtons) {
				this.feedbackButtons.appendChild(button);
			}
		});

		if (this.feedbackButtons) {
			container.appendChild(this.feedbackButtons);
		}
	}

	/**
	 * Remove UI elements
	 */
	private removeUI(): void {
		const containerEl = this.view.containerEl;
		if (!containerEl) return;

		const container = containerEl.querySelector('.spaced-repetition-controls');
		if (container) {
			container.remove();
		}

		this.revealButton = null;
		this.feedbackButtons = null;
	}
}
