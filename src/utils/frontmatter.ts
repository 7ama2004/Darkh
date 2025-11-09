import { TFile } from 'obsidian';
import { SchedulingData } from '../scheduler';

/**
 * Parse YAML frontmatter from file content
 */
export function parseFrontmatter(content: string): {
	frontmatter: Record<string, any>;
	body: string;
} {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);
	
	if (!match) {
		return { frontmatter: {}, body: content };
	}
	
	const frontmatterText = match[1];
	const body = match[2];
	
	const frontmatter: Record<string, any> = {};
	const lines = frontmatterText.split('\n');
	
	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;
		
		const key = line.substring(0, colonIndex).trim();
		let value = line.substring(colonIndex + 1).trim();
		
		// Try to parse as JSON (for arrays, numbers, etc.)
		try {
			value = JSON.parse(value);
		} catch {
			// If not JSON, keep as string (remove quotes if present)
			value = value.replace(/^["']|["']$/g, '');
		}
		
		frontmatter[key] = value;
	}
	
	return { frontmatter, body };
}

/**
 * Serialize frontmatter and body back to file content
 */
export function serializeFrontmatter(
	frontmatter: Record<string, any>,
	body: string
): string {
	const frontmatterLines: string[] = [];
	
	for (const [key, value] of Object.entries(frontmatter)) {
		if (value === undefined || value === null) continue;
		
		if (Array.isArray(value)) {
			frontmatterLines.push(`${key}: ${JSON.stringify(value)}`);
		} else if (typeof value === 'number') {
			frontmatterLines.push(`${key}: ${value}`);
		} else if (typeof value === 'boolean') {
			frontmatterLines.push(`${key}: ${value}`);
		} else {
			frontmatterLines.push(`${key}: "${String(value)}"`);
		}
	}
	
	if (frontmatterLines.length === 0) {
		return body;
	}
	
	return `---\n${frontmatterLines.join('\n')}\n---\n${body}`;
}

/**
 * Extract scheduling data from frontmatter
 */
export function getSchedulingData(frontmatter: Record<string, any>): SchedulingData {
	const today = new Date().toISOString().split('T')[0];
	
	return {
		due: frontmatter.due || today,
		interval: frontmatter.interval || 0,
		ease: frontmatter.ease || 250,
		created: frontmatter.created || today,
	};
}

/**
 * Update scheduling data in frontmatter
 */
export function updateSchedulingData(
	frontmatter: Record<string, any>,
	schedulingData: SchedulingData
): Record<string, any> {
	return {
		...frontmatter,
		due: schedulingData.due,
		interval: schedulingData.interval,
		ease: schedulingData.ease,
		created: schedulingData.created,
	};
}
