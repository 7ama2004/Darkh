import { App, TFile } from "obsidian";
import { FlashcardCreationResult } from "./types";

/**
 * Service for updating source notes with flashcard links
 */
export class FlashcardLinkUpdater {
	private app: App;
	
	constructor(app: App) {
		this.app = app;
	}
	
	/**
	 * Update the source file by replacing flashcard blocks with links
	 * @param sourceFile The source file to update
	 * @param results Array of flashcard creation results
	 */
	async updateSourceFile(
		sourceFile: TFile,
		results: FlashcardCreationResult[]
	): Promise<void> {
		// Read current content
		let content = await this.app.vault.read(sourceFile);
		
		// Sort results in reverse order by position to preserve positions during replacement
		const sortedResults = [...results].sort((a, b) => b.originalBlock.startPos - a.originalBlock.startPos);
		
		// Replace each block with a link
		for (const result of sortedResults) {
			const { originalBlock, flashcardPath, sourceBlockId } = result;
			
			// Create the replacement link with block reference
			// Format: [[path/to/flashcard.md]] ^block-id
			const replacementLink = `[[${flashcardPath}]] ^${sourceBlockId}`;
			
			// Replace the block content with the link
			content = this.replaceBlock(content, originalBlock.startPos, originalBlock.endPos, replacementLink);
		}
		
		// Write updated content back to file
		await this.app.vault.modify(sourceFile, content);
	}
	
	/**
	 * Replace a block in the content with a link
	 * @param content Full content string
	 * @param startPos Start position of block
	 * @param endPos End position of block
	 * @param replacement Replacement string
	 * @returns Updated content
	 */
	private replaceBlock(
		content: string,
		startPos: number,
		endPos: number,
		replacement: string
	): string {
		const before = content.substring(0, startPos);
		const after = content.substring(endPos);
		
		return before + replacement + after;
	}
}

