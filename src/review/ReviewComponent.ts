import { Editor, MarkdownView } from 'obsidian';
import { ReviewQuality } from '../scheduler';
import { findHighlights, HighlightMatch } from '../utils/highlight';
import { parseFrontmatter, serializeFrontmatter, getSchedulingData, updateSchedulingData } from '../utils/frontmatter';
import { calculateNextReview } from '../scheduler';
import { TFile } from 'obsidian';

export class ReviewComponent {
	private editor: Editor;
	private view: MarkdownView;
	private file: TFile;
	private highlights: HighlightMatch[] = [];
	private revealedIndices: Set<number> = new Set();
	private reviewContainer: HTMLElement | null = null;
	private revealButton: HTMLElement | null = null;
	private feedbackButtons: HTMLElement | null = null;
	private onComplete: (() => void) | null = null;
	private frontmatterOffset: number = 0;
	private observer: MutationObserver | null = null;
	private highlightSpans: Map<number, HTMLElement> = new Map();
	
	constructor(
		editor: Editor,
		view: MarkdownView,
		file: TFile,
		onComplete?: () => void
	) {
		this.editor = editor;
		this.view = view;
		this.file = file;
		this.onComplete = onComplete || null;
	}
	
	async initialize() {
		const content = this.editor.getValue();
		const { body } = parseFrontmatter(content);
		
		// Calculate frontmatter offset
		const frontmatterMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
		this.frontmatterOffset = frontmatterMatch ? frontmatterMatch[0].length : 0;
		
		// Find all highlights in body
		this.highlights = findHighlights(body);
		
		if (this.highlights.length === 0) {
			new (this.view.app as any).Notice('No highlights (==...==) found in this file.');
			return;
		}
		
		// Create review UI
		this.createReviewUI();
		
		// Apply CSS styles
		this.applyHighlightStyles();
		
		// Set up highlight hiding
		this.setupHighlightHiding();
		
		// Update button state
		this.updateButtonState();
	}
	
	private createReviewUI() {
		const containerEl = this.view.containerEl;
		
		// Create review container
		this.reviewContainer = containerEl.createDiv('spaced-repetition-review-container');
		
		// Create reveal button
		this.revealButton = this.reviewContainer.createEl('button', {
			text: 'Reveal Next',
			cls: 'spaced-repetition-reveal-button',
		});
		
		this.revealButton.addEventListener('click', () => {
			this.revealNext();
		});
		
		// Create feedback buttons container (initially hidden)
		this.feedbackButtons = this.reviewContainer.createDiv('spaced-repetition-feedback-buttons');
		this.feedbackButtons.style.display = 'none';
		
		const qualities: Array<{ quality: ReviewQuality; label: string; cls: string }> = [
			{ quality: 'again', label: 'Again', cls: 'spaced-repetition-again' },
			{ quality: 'hard', label: 'Hard', cls: 'spaced-repetition-hard' },
			{ quality: 'good', label: 'Good', cls: 'spaced-repetition-good' },
			{ quality: 'easy', label: 'Easy', cls: 'spaced-repetition-easy' },
		];
		
		for (const { quality, label, cls } of qualities) {
			const button = this.feedbackButtons.createEl('button', {
				text: label,
				cls: `spaced-repetition-feedback-button ${cls}`,
			});
			
			button.addEventListener('click', () => {
				this.handleFeedback(quality);
			});
		}
	}
	
	private applyHighlightStyles() {
		if (!document.getElementById('spaced-repetition-styles')) {
			const style = document.createElement('style');
			style.id = 'spaced-repetition-styles';
			style.textContent = `
				.sr-highlight-wrapper {
					display: inline;
					position: relative;
				}
				
				.sr-highlight-wrapper.sr-hidden {
					filter: blur(5px);
					user-select: text;
					cursor: text;
					transition: filter 0.3s ease;
				}
				
				.sr-highlight-wrapper.sr-revealed {
					filter: none !important;
					background-color: rgba(255, 255, 0, 0.2);
					transition: filter 0.3s ease, background-color 0.3s ease;
				}
				
				.spaced-repetition-review-container {
					position: fixed;
					bottom: 20px;
					left: 50%;
					transform: translateX(-50%);
					z-index: 1000;
					display: flex;
					gap: 10px;
					background: var(--background-primary);
					padding: 10px 20px;
					border-radius: 8px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
					border: 1px solid var(--background-modifier-border);
				}
				
				.spaced-repetition-reveal-button,
				.spaced-repetition-feedback-button {
					padding: 8px 16px;
					border: none;
					border-radius: 4px;
					cursor: pointer;
					font-size: 14px;
					font-weight: 500;
					transition: background-color 0.2s;
				}
				
				.spaced-repetition-reveal-button {
					background-color: var(--interactive-accent);
					color: var(--text-on-accent);
				}
				
				.spaced-repetition-reveal-button:hover {
					background-color: var(--interactive-accent-hover);
				}
				
				.spaced-repetition-feedback-buttons {
					display: flex;
					gap: 8px;
				}
				
				.spaced-repetition-again {
					background-color: #dc3545;
					color: white;
				}
				
				.spaced-repetition-hard {
					background-color: #ffc107;
					color: #000;
				}
				
				.spaced-repetition-good {
					background-color: #28a745;
					color: white;
				}
				
				.spaced-repetition-easy {
					background-color: #17a2b8;
					color: white;
				}
				
				.spaced-repetition-feedback-button:hover {
					opacity: 0.9;
				}
				
				@media (max-width: 768px) {
					.spaced-repetition-review-container {
						bottom: 10px;
						left: 10px;
						right: 10px;
						transform: none;
						flex-direction: column;
						padding: 10px;
					}
					
					.spaced-repetition-feedback-buttons {
						flex-wrap: wrap;
					}
					
					.spaced-repetition-feedback-button {
						flex: 1;
						min-width: calc(50% - 4px);
					}
				}
			`;
			document.head.appendChild(style);
		}
	}
	
	private setupHighlightHiding() {
		// Wrap highlights in spans
		this.wrapHighlights();
		
		// Set up observer to re-wrap on content changes
		const cm = (this.editor as any).cm;
		if (!cm) return;
		
		const editorEl = cm.dom;
		
		this.observer = new MutationObserver(() => {
			// Debounce re-wrapping
			setTimeout(() => this.wrapHighlights(), 200);
		});
		
		this.observer.observe(editorEl, {
			childList: true,
			subtree: true,
		});
	}
	
	private wrapHighlights() {
		const content = this.editor.getValue();
		const { body } = parseFrontmatter(content);
		
		// Re-find highlights
		const bodyHighlights = findHighlights(body);
		this.highlights = bodyHighlights.map(h => ({
			...h,
			start: h.start + this.frontmatterOffset,
			end: h.end + this.frontmatterOffset,
		}));
		
		// Get CodeMirror view
		const cm = (this.editor as any).cm;
		if (!cm || !cm.view) return;
		
		const view = cm.view;
		const editorEl = cm.dom;
		
		// Find text nodes containing highlights and wrap them
		// This is a simplified approach - we'll search for == patterns in the DOM
		this.findAndWrapHighlights(editorEl);
	}
	
	private findAndWrapHighlights(container: HTMLElement) {
		// Clear existing spans
		this.highlightSpans.clear();
		
		// Get current content
		const content = this.editor.getValue();
		
		// For each highlight, find it in the content and try to wrap it
		// Since CodeMirror manages its own DOM, we'll use a simpler approach:
		// Apply CSS classes to lines containing highlights
		
		const cm = (this.editor as any).cm;
		if (!cm || !cm.view) return;
		
		// Use CodeMirror's line information to find highlights
		const editorContent = this.editor.getValue();
		const { body } = parseFrontmatter(editorContent);
		
		// Re-find highlights in body
		const bodyHighlights = findHighlights(body);
		
		// For each highlight, find the line it's on and mark that line
		const lines = body.split('\n');
		let charOffset = 0;
		
		for (let i = 0; i < bodyHighlights.length; i++) {
			const highlight = bodyHighlights[i];
			const highlightText = `==${highlight.text}==`;
			
			// Find which line contains this highlight
			for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
				const line = lines[lineIdx];
				const lineStart = charOffset;
				const lineEnd = charOffset + line.length;
				
				if (highlight.start >= lineStart && highlight.start < lineEnd) {
					// This line contains the highlight
					// Mark the line in CodeMirror
					this.markLineForHighlight(lineIdx, i, highlightText);
					break;
				}
				
				charOffset = lineEnd + 1; // +1 for newline
			}
		}
		
		// Also try direct DOM approach as fallback
		this.tryDirectDOMWrapping(container);
	}
	
	private markLineForHighlight(lineIdx: number, highlightIndex: number, highlightText: string) {
		const cm = (this.editor as any).cm;
		if (!cm || !cm.view) return;
		
		// Get line element from CodeMirror
		const lineEl = cm.view.dom.querySelector(`.cm-line:nth-child(${lineIdx + 1})`);
		if (!lineEl) return;
		
		// Find the highlight text in this line
		const walker = document.createTreeWalker(
			lineEl,
			NodeFilter.SHOW_TEXT,
			null
		);
		
		let textNode: Text | null = null;
		let node;
		while ((node = walker.nextNode())) {
			const text = (node as Text).textContent || '';
			if (text.includes(highlightText)) {
				textNode = node as Text;
				break;
			}
		}
		
		if (textNode) {
			this.wrapTextNode(textNode, highlightText, highlightIndex);
		}
	}
	
	private tryDirectDOMWrapping(container: HTMLElement) {
		// Walk through text nodes and find ==...== patterns
		const walker = document.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
			null
		);
		
		const textNodes: Text[] = [];
		let node;
		while ((node = walker.nextNode())) {
			textNodes.push(node as Text);
		}
		
		// For each highlight, try to find and wrap it
		for (let i = 0; i < this.highlights.length; i++) {
			if (this.highlightSpans.has(i)) continue; // Already wrapped
			
			const highlight = this.highlights[i];
			const highlightText = `==${highlight.text}==`;
			
			// Find text node containing this highlight
			for (const textNode of textNodes) {
				const text = textNode.textContent || '';
				const index = text.indexOf(highlightText);
				
				if (index !== -1) {
					// Found it! Wrap it in a span
					this.wrapTextNode(textNode, highlightText, i);
					break;
				}
			}
		}
	}
	
	private wrapTextNode(textNode: Text, highlightText: string, highlightIndex: number) {
		// Check if already wrapped
		if (this.highlightSpans.has(highlightIndex)) {
			return;
		}
		
		const parent = textNode.parentElement;
		if (!parent) return;
		
		// Check if parent is already a wrapper
		if (parent.classList.contains('sr-highlight-wrapper')) {
			return;
		}
		
		const text = textNode.textContent || '';
		const index = text.indexOf(highlightText);
		
		if (index === -1) return;
		
		// Split the text node
		const beforeText = text.substring(0, index);
		const afterText = text.substring(index + highlightText.length);
		
		// Create wrapper span
		const wrapper = document.createElement('span');
		wrapper.className = 'sr-highlight-wrapper sr-hidden';
		wrapper.setAttribute('data-sr-index', highlightIndex.toString());
		wrapper.textContent = highlightText;
		
		// Replace text node with fragments
		const fragment = document.createDocumentFragment();
		if (beforeText) {
			fragment.appendChild(document.createTextNode(beforeText));
		}
		fragment.appendChild(wrapper);
		if (afterText) {
			fragment.appendChild(document.createTextNode(afterText));
		}
		
		parent.replaceChild(fragment, textNode);
		
		// Store reference
		this.highlightSpans.set(highlightIndex, wrapper);
	}
	
	private revealNext() {
		// Find next unrevealed highlight
		for (let i = 0; i < this.highlights.length; i++) {
			if (!this.revealedIndices.has(i)) {
				this.revealedIndices.add(i);
				this.updateButtonState();
				this.updateHighlightVisibility(i);
				return;
			}
		}
	}
	
	private updateHighlightVisibility(highlightIndex: number) {
		const span = this.highlightSpans.get(highlightIndex);
		if (span) {
			span.classList.remove('sr-hidden');
			span.classList.add('sr-revealed');
		}
	}
	
	private updateButtonState() {
		if (!this.revealButton || !this.feedbackButtons) return;
		
		if (this.revealedIndices.size >= this.highlights.length) {
			this.revealButton.style.display = 'none';
			this.feedbackButtons.style.display = 'flex';
		} else {
			this.revealButton.style.display = 'block';
			this.feedbackButtons.style.display = 'none';
			this.revealButton.textContent = `Reveal Next (${this.revealedIndices.size}/${this.highlights.length})`;
		}
	}
	
	private async handleFeedback(quality: ReviewQuality) {
		const content = await this.view.app.vault.read(this.file);
		const { frontmatter, body } = parseFrontmatter(content);
		
		const currentData = getSchedulingData(frontmatter);
		const newData = calculateNextReview(currentData, quality);
		const updatedFrontmatter = updateSchedulingData(frontmatter, newData);
		
		const newContent = serializeFrontmatter(updatedFrontmatter, body);
		await this.view.app.vault.modify(this.file, newContent);
		
		this.cleanup();
		
		if (this.onComplete) {
			this.onComplete();
		}
	}
	
	cleanup() {
		if (this.reviewContainer) {
			this.reviewContainer.remove();
		}
		
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		
		// Remove wrappers (optional - they don't hurt if left)
		this.highlightSpans.clear();
	}
}
