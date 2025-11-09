import { ClozeBlock } from "./types";

/**
 * Parse cloze markers from document text
 * 
 * Supports two formats:
 * 1. Inline: s;text; on the same line
 * 2. Multiline: s; on its own line, followed by content, then e; on its own line
 * 
 * Does NOT support nested clozes - inner markers are ignored if already inside a cloze.
 */
export class ClozeParser {
	/**
	 * Parse cloze blocks from text
	 * @param text The document text
	 * @returns Array of parsed cloze blocks
	 */
	static parse(text: string): ClozeBlock[] {
		const clozes: ClozeBlock[] = [];
		let id = 0;
		let insideCloze = false;
		
		// Split text into lines for multiline detection
		const lines = text.split('\n');
		let currentPosition = 0;
		let multilineStart: number | null = null;
		let multilineStartLine: number | null = null;
		
		// First pass: find multiline clozes
		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex];
			const lineStart = currentPosition;
			
			// Check if line is a multiline start marker (s; on its own line)
			if (!insideCloze && line.trim() === 's;') {
				insideCloze = true;
				multilineStart = lineStart;
				multilineStartLine = lineIndex;
			}
			// Check if line is a multiline end marker (e; on its own line)
			else if (insideCloze && line.trim() === 'e;') {
				if (multilineStart !== null && multilineStartLine !== null) {
					// End position is end of current line
					const multilineEnd = currentPosition + line.length;
					clozes.push({
						id: id++,
						from: multilineStart,
						to: multilineEnd,
						kind: "multiline"
					});
				}
				insideCloze = false;
				multilineStart = null;
				multilineStartLine = null;
			}
			
			currentPosition += line.length + 1; // +1 for newline character
		}
		
		// Second pass: find inline clozes (only in areas not covered by multiline)
		currentPosition = 0;
		const multilineRanges = clozes.map(c => ({ from: c.from, to: c.to }));
		
		// Inline pattern: s;...;
		// Match s; followed by any characters (non-greedy) until the next ;
		const inlinePattern = /s;(.*?);/g;
		let match: RegExpExecArray | null;
		
		while ((match = inlinePattern.exec(text)) !== null) {
			const matchStart = match.index;
			const matchEnd = match.index + match[0].length;
			
			// Check if this match is inside a multiline cloze
			const isInsideMultiline = multilineRanges.some(range => 
				matchStart >= range.from && matchEnd <= range.to
			);
			
			// Only add if not inside a multiline cloze
			if (!isInsideMultiline) {
				clozes.push({
					id: id++,
					from: matchStart,
					to: matchEnd,
					kind: "inline"
				});
			}
		}
		
		// Sort by position (from) to maintain document order
		clozes.sort((a, b) => a.from - b.from);
		
		// Re-assign IDs after sorting
		clozes.forEach((cloze, index) => {
			cloze.id = index;
		});
		
		return clozes;
	}
	
	/**
	 * Check if a position is inside any cloze
	 */
	static isInsideCloze(clozes: ClozeBlock[], position: number): boolean {
		return clozes.some(cloze => position >= cloze.from && position <= cloze.to);
	}
	
	/**
	 * Get the cloze at a specific position
	 */
	static getClozeAtPosition(clozes: ClozeBlock[], position: number): ClozeBlock | null {
		return clozes.find(cloze => position >= cloze.from && position <= cloze.to) || null;
	}
}

