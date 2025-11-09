import { App, TFile } from 'obsidian';
import { getCardSchedule } from './frontmatter';

/**
 * Check if a card is due for review
 */
export function isCardDue(dueDate: string): boolean {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);
	return due <= today;
}

/**
 * Scan folder for all due cards
 */
export async function scanForDueCards(
	app: App,
	folderPath: string
): Promise<TFile[]> {
	// Normalize folder path (remove leading/trailing slashes)
	const normalizedPath = folderPath.replace(/^\/+|\/+$/g, '');
	
	const files = app.vault.getFiles();
	const folderFiles = files.filter(file => {
		if (file.extension !== 'md') return false;
		
		const filePath = file.path;
		// Check if file is in the folder (handle root folder case)
		if (normalizedPath === '') {
			// Root folder - files without a slash
			return !filePath.includes('/');
		}
		
		return filePath.startsWith(normalizedPath + '/') || filePath === normalizedPath;
	});

	const dueCards: TFile[] = [];

	for (const file of folderFiles) {
		try {
			const schedule = await getCardSchedule(app, file);
			if (schedule && isCardDue(schedule.due)) {
				dueCards.push(file);
			}
		} catch (error) {
			// Skip files that can't be parsed
			console.error(`Error reading card ${file.path}:`, error);
		}
	}

	return dueCards;
}
