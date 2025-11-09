/**
 * Find all highlight markers (==...==) in text and return their positions
 */
export interface HighlightMatch {
	start: number;
	end: number;
	text: string;
}

export function findHighlights(text: string): HighlightMatch[] {
	const matches: HighlightMatch[] = [];
	const regex = /==([^=]+)==/g;
	let match;
	
	while ((match = regex.exec(text)) !== null) {
		matches.push({
			start: match.index,
			end: match.index + match[0].length,
			text: match[1],
		});
	}
	
	return matches;
}
