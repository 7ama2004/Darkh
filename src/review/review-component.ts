import { Editor, MarkdownView, Notice } from 'obsidian';
import { FlashcardMetadata, ReviewState } from '../types';
import { calculateNextReview } from '../utils/sm2';
import { parseFrontmatter, updateFrontmatter } from '../utils/frontmatter';
import { TFile } from 'obsidian';

interface HighlightMatch {
	fullMatch: string;
	content: string;
	index: number;
	revealed: boolean;
}

export class ReviewComponent {
	private editor: Editor;
	private view: MarkdownView;
	private file: TFile;
	private state: ReviewState;
	private metadata: FlashcardMetadata;
	private controlBar: HTMLElement | null = null;
	private onComplete: (quality: number) => Promise<void>;
	private highlights: HighlightMatch[] = [];
	private originalContent: string = '';

	constructor(
		editor: Editor,
		view: MarkdownView,
		file: TFile,
		onComplete: (quality: number) => Promise<void>
	) {
		this.editor = editor;
		this.view = view;
		this.file = file;
		this.onComplete = onComplete;
		this.state = {
			filePath: file.path,
			revealedCount: 0,
			totalBlocks: 0,
			isComplete: false,
		};

		// Parse metadata
		const content = editor.getValue();
		this.originalContent = content;
		const parsed = parseFrontmatter(content);
		this.metadata = {
			due: parsed.metadata.due || new Date().toISOString().split('T')[0],
			interval: parsed.metadata.interval ?? 1,
			ease: parsed.metadata.ease ?? 230,
			created: parsed.metadata.created || new Date().toISOString().split('T')[0],
			tags: parsed.metadata.tags || [],
		};

		this.initialize();
	}

	private initialize() {
		// Find all ==highlight== blocks
		this.findHighlightBlocks();
		
		// Hide all blocks initially using CSS
		this.setupHiding();
		
		// Create control bar
		this.createControlBar();
	}

	private findHighlightBlocks() {
		const content = this.editor.getValue();
		const highlightRegex = /==([^=\n]+?)==/g;
		let match;

		this.highlights = [];
		while ((match = highlightRegex.exec(content)) !== null) {
			this.highlights.push({
				fullMatch: match[0],
				content: match[1],
				index: match.index,
				revealed: false,
			});
		}

		// Sort by index to process in order
		this.highlights.sort((a, b) => a.index - b.index);
		this.state.totalBlocks = this.highlights.length;
	}

	private setupHiding() {
		// Add CSS to hide ==highlight== blocks
		const style = document.createElement('style');
		style.id = 'spaced-repetition-hide-style';
		style.textContent = `
			.spaced-repetition-review-active .cm-line {
				position: relative;
			}
			/* Hide unrevealed highlights in source view */
			.spaced-repetition-review-active .cm-line .spaced-rep-hidden-highlight {
				filter: blur(10px);
				user-select: none;
				pointer-events: none;
				background-color: rgba(0, 0, 0, 0.15);
				border-radius: 3px;
				display: inline-block;
				padding: 2px 4px;
				opacity: 0.6;
			}
			/* Show revealed highlights */
			.spaced-repetition-review-active .cm-line .spaced-rep-revealed-highlight {
				filter: none !important;
				user-select: auto;
				pointer-events: auto;
				background-color: transparent;
				opacity: 1;
			}
			/* Hide in preview view */
			.spaced-repetition-review-active .markdown-preview-view mark:not(.spaced-rep-revealed) {
				filter: blur(10px);
				user-select: none;
				pointer-events: none;
				background-color: rgba(0, 0, 0, 0.15) !important;
				opacity: 0.6;
			}
		`;
		document.head.appendChild(style);

		// Add class to editor container
		const contentEl = (this.view as any).contentEl;
		if (contentEl) {
			contentEl.classList.add('spaced-repetition-review-active');
		}

		// Process content to wrap highlights
		this.processContentForHiding();
	}

	private processContentForHiding() {
		// We'll use a marker system: replace ==text== with [[HIDDEN:text]] for tracking
		// But actually, let's keep the original and use DOM manipulation
		// For source view, we need to work with CodeMirror
		
		// Since CodeMirror 6 is complex, let's use a simpler approach:
		// Replace ==text== with a temporary marker, then use CSS
		// Actually, let's keep ==text== and just track which are revealed
		
		// The hiding will be done via CSS on the rendered view
		// For source view, we'll need to process the content differently
		
		// For now, let's use a simple replacement approach when revealing
	}

	private createControlBar() {
		// Remove existing control bar if any
		if (this.controlBar) {
			this.controlBar.remove();
		}

		// Create floating control bar
		this.controlBar = document.createElement('div');
		this.controlBar.className = 'spaced-repetition-control-bar';
		this.controlBar.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			background: var(--background-primary);
			border: 1px solid var(--background-modifier-border);
			border-radius: 8px;
			padding: 12px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			z-index: 10000;
			display: flex;
			flex-direction: column;
			gap: 8px;
			min-width: 200px;
			max-width: 320px;
		`;

		this.updateControlBar();
		document.body.appendChild(this.controlBar);
	}

	private updateControlBar() {
		if (!this.controlBar) return;

		this.controlBar.empty();

		if (!this.state.isComplete && this.state.totalBlocks > 0) {
			// Show "Reveal Next" button
			const revealBtn = document.createElement('button');
			revealBtn.textContent = 'Reveal Next';
			revealBtn.className = 'mod-cta';
			revealBtn.style.cssText = `
				padding: 10px 16px;
				border-radius: 4px;
				border: none;
				cursor: pointer;
				font-size: 14px;
				width: 100%;
			`;
			revealBtn.addEventListener('click', () => this.revealNext());
			this.controlBar.appendChild(revealBtn);

			// Show progress
			const progress = document.createElement('div');
			progress.textContent = `${this.state.revealedCount} / ${this.state.totalBlocks} revealed`;
			progress.style.cssText = `
				font-size: 12px;
				color: var(--text-muted);
				width: 100%;
				text-align: center;
				margin-top: 4px;
			`;
			this.controlBar.appendChild(progress);
		} else if (this.state.totalBlocks === 0) {
			// No highlights found
			const message = document.createElement('div');
			message.textContent = 'No highlights (==text==) found in this file.';
			message.style.cssText = `
				font-size: 12px;
				color: var(--text-muted);
				text-align: center;
				padding: 8px;
			`;
			this.controlBar.appendChild(message);

			// Still show feedback buttons
			this.addFeedbackButtons();
		} else {
			// All revealed, show feedback buttons
			this.addFeedbackButtons();
		}
	}

	private addFeedbackButtons() {
		if (!this.controlBar) return;

		const buttons = [
			{ label: 'Again', quality: 0, class: 'mod-warning' },
			{ label: 'Hard', quality: 1, class: '' },
			{ label: 'Good', quality: 2, class: 'mod-cta' },
			{ label: 'Easy', quality: 3, class: 'mod-success' },
		];

		const buttonContainer = document.createElement('div');
		buttonContainer.style.cssText = `
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 6px;
			width: 100%;
		`;

		buttons.forEach(({ label, quality, class: btnClass }) => {
			const btn = document.createElement('button');
			btn.textContent = label;
			btn.className = btnClass;
			btn.style.cssText = `
				padding: 10px 12px;
				border-radius: 4px;
				border: none;
				cursor: pointer;
				font-size: 13px;
			`;
			btn.addEventListener('click', () => this.handleFeedback(quality));
			buttonContainer.appendChild(btn);
		});

		this.controlBar.appendChild(buttonContainer);
	}

	private revealNext() {
		if (this.state.revealedCount >= this.state.totalBlocks) {
			this.state.isComplete = true;
			this.updateControlBar();
			return;
		}

		// Find the next unrevealed highlight (in order)
		const nextHighlight = this.highlights.find(h => !h.revealed);
		if (!nextHighlight) {
			this.state.isComplete = true;
			this.updateControlBar();
			return;
		}

		// Mark as revealed
		nextHighlight.revealed = true;
		this.state.revealedCount++;

		// Replace ==text== with just text (remove highlight markers)
		// We'll find and replace the first unrevealed match in the current content
		const content = this.editor.getValue();
		const highlightRegex = /==([^=\n]+?)==/g;
		let newContent = '';
		let lastIndex = 0;
		let match;
		let found = false;

		// Reset regex
		highlightRegex.lastIndex = 0;

		while ((match = highlightRegex.exec(content)) !== null) {
			if (match[1] === nextHighlight.content && !found) {
				// This is the one we want to reveal
				newContent += content.substring(lastIndex, match.index);
				// Replace ==text== with just text
				newContent += match[1];
				lastIndex = match.index + match[0].length;
				found = true;
				// Continue to add remaining content
			} else {
				// Keep this match as-is
				newContent += content.substring(lastIndex, match.index + match[0].length);
				lastIndex = match.index + match[0].length;
			}
		}

		// Add remaining content
		newContent += content.substring(lastIndex);

		if (found) {
			this.editor.setValue(newContent);
		} else {
			// Fallback: if we can't find it, just mark it as revealed anyway
			console.warn('Could not find highlight to reveal in content');
		}

		// Check if all are revealed
		if (this.state.revealedCount >= this.state.totalBlocks) {
			this.state.isComplete = true;
		}

		this.updateControlBar();
	}

	private async handleFeedback(quality: number) {
		// Calculate new scheduling
		const newSchedule = calculateNextReview(this.metadata, quality);
		
		// Get current content (may have been edited)
		let content = this.editor.getValue();
		
		// Update frontmatter
		content = updateFrontmatter(content, newSchedule);
		this.editor.setValue(content);
		
		// Save file
		await this.view.app.vault.modify(this.file, content);
		
		// Show notice
		const labels = ['Again', 'Hard', 'Good', 'Easy'];
		new Notice(`Marked as ${labels[quality]}. Next review: ${newSchedule.due}`);
		
		// Call completion callback
		await this.onComplete(quality);
	}

	public cleanup() {
		// Remove control bar
		if (this.controlBar) {
			this.controlBar.remove();
			this.controlBar = null;
		}

		// Remove CSS
		const hideStyle = document.getElementById('spaced-repetition-hide-style');
		if (hideStyle) hideStyle.remove();

		// Remove class from editor
		const contentEl = (this.view as any).contentEl;
		if (contentEl) {
			contentEl.classList.remove('spaced-repetition-review-active');
		}
	}
}
