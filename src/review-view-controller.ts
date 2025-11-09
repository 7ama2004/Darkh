import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { StateField, StateEffect, EditorState } from "@codemirror/state";
import { ClozeParser } from "./cloze-parser";
import { ClozeBlock, ReviewViewState } from "./types";
import type DarkhSRSPlugin from "./main";

/**
 * State effect to enable review mode
 */
const enableReviewMode = StateEffect.define<boolean>();

/**
 * State effect to reveal next cloze
 */
const revealNextCloze = StateEffect.define<void>();

/**
 * State effect to reveal all clozes
 */
const revealAllClozes = StateEffect.define<void>();

/**
 * State effect to disable review mode
 */
const disableReviewMode = StateEffect.define<void>();

/**
 * StateField to manage review mode state
 */
const reviewStateField = StateField.define<ReviewViewState>({
	create(): ReviewViewState {
		return {
			isReviewMode: false,
			clozes: [],
			revealedCount: 0,
		};
	},
	
	update(value: ReviewViewState, tr): ReviewViewState {
		let newValue = value;
		
		// Handle state effects
		for (const effect of tr.effects) {
			if (effect.is(enableReviewMode)) {
				// Parse clozes from document
				const text = tr.state.doc.toString();
				const clozes = ClozeParser.parse(text);
				newValue = {
					isReviewMode: true,
					clozes,
					revealedCount: 0,
				};
			} else if (effect.is(revealNextCloze)) {
				if (newValue.revealedCount < newValue.clozes.length) {
					newValue = {
						...newValue,
						revealedCount: newValue.revealedCount + 1,
					};
				}
			} else if (effect.is(revealAllClozes)) {
				newValue = {
					...newValue,
					revealedCount: newValue.clozes.length,
				};
			} else if (effect.is(disableReviewMode)) {
				newValue = {
					isReviewMode: false,
					clozes: [],
					revealedCount: 0,
				};
			}
		}
		
		// If document changed and in review mode, re-parse clozes
		// But keep the same revealed count
		if (newValue.isReviewMode && tr.docChanged) {
			const text = tr.state.doc.toString();
			const clozes = ClozeParser.parse(text);
			newValue = {
				...newValue,
				clozes,
				// Keep revealed count, but cap at new cloze count
				revealedCount: Math.min(newValue.revealedCount, clozes.length),
			};
		}
		
		return newValue;
	},
	
	provide(field): any {
		return EditorView.decorations.from(field, state => {
			if (!state.isReviewMode) {
				return Decoration.none;
			}
			
			// Create decorations for hidden clozes
			const decorations = [];
			for (const cloze of state.clozes) {
				if (cloze.id >= state.revealedCount) {
					// This cloze should be hidden
					decorations.push(
						Decoration.mark({
							class: "darkh-srs-cloze-hidden",
						}).range(cloze.from, cloze.to)
					);
				}
			}
			
			return Decoration.set(decorations, true);
		});
	}
});

/**
 * Review View Controller for CodeMirror 6 integration
 */
export class ReviewViewController {
	private plugin: DarkhSRSPlugin;
	
	constructor(plugin: DarkhSRSPlugin) {
		this.plugin = plugin;
	}
	
	/**
	 * Get the CodeMirror 6 extension
	 */
	getExtension() {
		return [reviewStateField];
	}
	
	/**
	 * Enable review mode for the active editor
	 */
	enableReviewMode(view: EditorView): void {
		view.dispatch({
			effects: enableReviewMode.of(true),
		});
	}
	
	/**
	 * Disable review mode for the active editor
	 */
	disableReviewMode(view: EditorView): void {
		view.dispatch({
			effects: disableReviewMode.of(),
		});
	}
	
	/**
	 * Reveal the next cloze
	 */
	revealNext(view: EditorView): void {
		view.dispatch({
			effects: revealNextCloze.of(),
		});
	}
	
	/**
	 * Reveal all clozes
	 */
	revealAll(view: EditorView): void {
		view.dispatch({
			effects: revealAllClozes.of(),
		});
	}
	
	/**
	 * Get the current review state from an editor view
	 */
	getState(view: EditorView): ReviewViewState | null {
		const state = view.state.field(reviewStateField, false);
		return state || null;
	}
	
	/**
	 * Check if review mode is active
	 */
	isReviewMode(view: EditorView): boolean {
		const state = this.getState(view);
		return state?.isReviewMode || false;
	}
	
	/**
	 * Check if all clozes are revealed
	 */
	isFullyRevealed(view: EditorView): boolean {
		const state = this.getState(view);
		if (!state || !state.isReviewMode) {
			return false;
		}
		return state.revealedCount >= state.clozes.length;
	}
	
	/**
	 * Get the number of clozes in the current document
	 */
	getClozeCount(view: EditorView): number {
		const state = this.getState(view);
		return state?.clozes.length || 0;
	}
	
	/**
	 * Get the number of revealed clozes
	 */
	getRevealedCount(view: EditorView): number {
		const state = this.getState(view);
		return state?.revealedCount || 0;
	}
}

/**
 * Export state effects for use in other modules
 */
export { enableReviewMode, revealNextCloze, revealAllClozes, disableReviewMode };

