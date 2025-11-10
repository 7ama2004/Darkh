import { FlashcardBlock } from "./types";

/**
 * Service for parsing flashcard blocks from note content
 */
export class FlashcardParser {
	/**
	 * Find all flashcard blocks in the given content
	 * @param content The full content of the note
	 * @returns Array of flashcard blocks found
	 * @throws Error if blocks are malformed (unclosed start, etc.)
	 */
	static parseFlashcardBlocks(content: string): FlashcardBlock[] {
		const blocks: FlashcardBlock[] = [];
		const lines = content.split('\n');
		
		let inBlock = false;
		let blockStartLine = -1;
		let blockStartPos = -1;
		let blockContent: string[] = [];
		
		// Track character position as we iterate through lines
		let currentPos = 0;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();
			
			if (trimmedLine === 'start') {
				if (inBlock) {
					throw new Error(`Found nested 'start' marker at line ${i + 1}. Nested blocks are not supported.`);
				}
				
				// Start of a new block
				inBlock = true;
				blockStartLine = i;
				blockStartPos = currentPos;
				blockContent = [line];
			} else if (trimmedLine === 'end') {
				if (!inBlock) {
					throw new Error(`Found 'end' marker at line ${i + 1} without matching 'start'.`);
				}
				
				// End of block
				blockContent.push(line);
				
				// Calculate end position (after the newline following 'end')
				const blockEndPos = currentPos + line.length;
				
				// Create flashcard block
				const fullContent = blockContent.join('\n');
				blocks.push({
					content: fullContent,
					startPos: blockStartPos,
					endPos: blockEndPos,
					startLine: blockStartLine + 1, // 1-indexed for display
				});
				
				// Reset state
				inBlock = false;
				blockStartLine = -1;
				blockStartPos = -1;
				blockContent = [];
			} else if (inBlock) {
				// Inside a block, accumulate content
				blockContent.push(line);
			}
			
			// Advance position counter (line length + newline)
			currentPos += line.length + 1;
		}
		
		// Check for unclosed blocks
		if (inBlock) {
			throw new Error(`Found 'start' marker at line ${blockStartLine + 1} without matching 'end'.`);
		}
		
		return blocks;
	}
	
	/**
	 * Extract the inner content of a flashcard block (without start/end markers)
	 * @param blockContent Full block content including start/end
	 * @returns Content between start and end markers
	 */
	static extractInnerContent(blockContent: string): string {
		const lines = blockContent.split('\n');
		
		// Remove first line (start) and last line (end)
		if (lines.length <= 2) {
			// Only start and end, no content
			return '';
		}
		
		return lines.slice(1, -1).join('\n');
	}
}

