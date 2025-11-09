import { FlashcardMetadata } from '../types';

export interface ParsedFrontmatter {
	metadata: Partial<FlashcardMetadata>;
	body: string;
	frontmatterText: string;
}

/**
 * Parse YAML frontmatter and body from file content
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
	// Match frontmatter: --- followed by content, then ---, then body
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return {
			metadata: {},
			body: content,
			frontmatterText: '',
		};
	}

	const frontmatterText = match[1].trim();
	const body = match[2] || '';

	// Parse YAML (simple parser for our use case)
	const metadata: Partial<FlashcardMetadata> = {};
	const lines = frontmatterText.split('\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.substring(0, colonIndex).trim();
		let value = line.substring(colonIndex + 1).trim();

		// Remove quotes if present
		if ((value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		switch (key) {
			case 'due':
			case 'created':
				metadata[key] = value;
				break;
			case 'interval':
			case 'ease':
				metadata[key] = parseFloat(value);
				break;
			case 'tags':
				// Handle array format: [tag1, tag2] or - tag1\n- tag2
				if (value.startsWith('[') && value.endsWith(']')) {
					metadata.tags = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''));
				} else {
					metadata.tags = [value];
				}
				break;
		}
	}

	return { metadata, body, frontmatterText };
}

/**
 * Update frontmatter with new metadata
 */
export function updateFrontmatter(
	content: string,
	updates: Partial<FlashcardMetadata>
): string {
	const parsed = parseFrontmatter(content);
	const metadata = { ...parsed.metadata, ...updates };

	// Build new frontmatter
	const frontmatterLines: string[] = [];
	
	if (metadata.due) frontmatterLines.push(`due: ${metadata.due}`);
	if (metadata.interval !== undefined) frontmatterLines.push(`interval: ${metadata.interval}`);
	if (metadata.ease !== undefined) frontmatterLines.push(`ease: ${metadata.ease}`);
	if (metadata.created) frontmatterLines.push(`created: ${metadata.created}`);
	if (metadata.tags && metadata.tags.length > 0) {
		frontmatterLines.push(`tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]`);
	}

	const newFrontmatter = `---\n${frontmatterLines.join('\n')}\n---\n`;

	return newFrontmatter + parsed.body;
}

/**
 * Ensure file has required frontmatter fields
 */
export function ensureDefaultFrontmatter(content: string): string {
	const parsed = parseFrontmatter(content);
	const today = new Date().toISOString().split('T')[0];
	
	const metadata: FlashcardMetadata = {
		due: parsed.metadata.due || today,
		interval: parsed.metadata.interval ?? 1,
		ease: parsed.metadata.ease ?? 230,
		created: parsed.metadata.created || today,
		tags: parsed.metadata.tags || [],
	};

	return updateFrontmatter(content, metadata);
}
