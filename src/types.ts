import { TFile } from "obsidian";

/**
 * A parsed cloze block in the document
 */
export interface ClozeBlock {
	id: number;           // Index in order of appearance
	from: number;         // CodeMirror document offset start
	to: number;           // CodeMirror document offset end
	kind: "inline" | "multiline";
}

/**
 * Review state stored in YAML frontmatter
 */
export interface ReviewState {
	sr?: boolean;         // Optional flag marking this as SRS insight
	ease: number;         // SM-2 ease factor
	interval: number;     // Days until next review
	reps: number;         // Successful repetitions count
	lapses: number;       // Times graded "Again"/failed
	last_review?: string; // ISO date of last review
	due?: string;         // ISO date of next review
}

/**
 * Rating options for spaced repetition
 */
export type Rating = "again" | "hard" | "good" | "easy";

/**
 * Insight file with scheduling information
 */
export interface InsightFile {
	file: TFile;
	due?: string;         // ISO date, may be null if unscheduled
}

/**
 * Session state for queue management
 */
export interface SessionState {
	active: boolean;
	queue: TFile[];
	currentIndex: number;
}

/**
 * Review view state for a single editor
 */
export interface ReviewViewState {
	isReviewMode: boolean;
	clozes: ClozeBlock[];
	revealedCount: number;
}

