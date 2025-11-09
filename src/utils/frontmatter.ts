import { TFile } from 'obsidian';
import { App } from 'obsidian';
import { CardSchedule, initializeSchedule } from '../scheduling/sm2';

/**
 * Parse YAML frontmatter from file content
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, any>, body: string } {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return { frontmatter: {}, body: content };
	}

	const frontmatterText = match[1];
	const body = match[2] || '';

	// Simple YAML parser for our use case
	const frontmatter: Record<string, any> = {};
	const lines = frontmatterText.split('\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.substring(0, colonIndex).trim();
		let value = line.substring(colonIndex + 1).trim();

		// Handle quoted strings
		if ((value.startsWith('"') && value.endsWith('"')) || 
		    (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		// Handle arrays (simple format: [item1, item2])
		if (value.startsWith('[') && value.endsWith(']')) {
			const arrayContent = value.slice(1, -1);
			frontmatter[key] = arrayContent.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
		}
		// Handle numbers
		else if (/^-?\d+\.?\d*$/.test(value)) {
			frontmatter[key] = parseFloat(value);
		}
		// Handle booleans
		else if (value === 'true' || value === 'false') {
			frontmatter[key] = value === 'true';
		}
		// Default to string
		else {
			frontmatter[key] = value;
		}
	}

	return { frontmatter, body };
}

/**
 * Serialize frontmatter to YAML string
 */
export function serializeFrontmatter(frontmatter: Record<string, any>): string {
	const lines: string[] = [];
	
	for (const [key, value] of Object.entries(frontmatter)) {
		if (Array.isArray(value)) {
			lines.push(`${key}: [${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`);
		} else if (typeof value === 'string') {
			// Escape quotes in strings
			const escaped = value.replace(/"/g, '\\"');
			lines.push(`${key}: "${escaped}"`);
		} else {
			lines.push(`${key}: ${value}`);
		}
	}

	return lines.join('\n');
}

/**
 * Get card schedule from file
 */
export async function getCardSchedule(app: App, file: TFile): Promise<CardSchedule | null> {
	const content = await app.vault.read(file);
	const { frontmatter } = parseFrontmatter(content);

	if (!frontmatter.due || !frontmatter.interval || !frontmatter.ease) {
		return null;
	}

	return {
		due: frontmatter.due,
		interval: frontmatter.interval,
		ease: frontmatter.ease,
		created: frontmatter.created || new Date().toISOString().split('T')[0]
	};
}

/**
 * Update card schedule in file
 */
export async function updateCardSchedule(
	app: App,
	file: TFile,
	schedule: CardSchedule
): Promise<void> {
	const content = await app.vault.read(file);
	const { frontmatter, body } = parseFrontmatter(content);

	// Update or add schedule fields (preserve other frontmatter fields)
	frontmatter.due = schedule.due;
	frontmatter.interval = schedule.interval;
	frontmatter.ease = schedule.ease;
	if (!frontmatter.created) {
		frontmatter.created = schedule.created;
	}

	// Serialize and write back
	const frontmatterStr = serializeFrontmatter(frontmatter);
	
	// Handle case where there was no frontmatter originally
	if (Object.keys(frontmatter).length === 0 && !content.startsWith('---')) {
		// No frontmatter existed, add it
		const newContent = `---\n${frontmatterStr}\n---\n${body}`;
		await app.vault.modify(file, newContent);
	} else {
		// Frontmatter existed or we just created it
		const newContent = `---\n${frontmatterStr}\n---\n${body}`;
		await app.vault.modify(file, newContent);
	}
}

/**
 * Initialize schedule for a new card file
 */
export async function initializeCardSchedule(
	app: App,
	file: TFile
): Promise<void> {
	const schedule = initializeSchedule();
	await updateCardSchedule(app, file, schedule);
}
