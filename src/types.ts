export interface FlashcardMetadata {
	due: string; // ISO date string
	interval: number; // days
	ease: number; // ease factor (typically 130-250)
	created: string; // ISO date string
	tags?: string[];
}

export interface ReviewState {
	filePath: string;
	revealedCount: number;
	totalBlocks: number;
	isComplete: boolean;
}
