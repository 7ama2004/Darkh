import { App, TFile, normalizePath } from "obsidian";
import { FlashcardBlock, FlashcardCreationResult } from "./types";
import { FlashcardParser } from "./flashcard-parser";
import { DarkhSRSSettings } from "./settings";
import { Scheduler } from "./scheduler";

/**
 * Service for creating flashcard files from parsed blocks
 */
export class FlashcardCreator {
	private app: App;
	private flashcardFolder: string;
	private settings: DarkhSRSSettings;
	
	constructor(app: App, flashcardFolder: string, settings: DarkhSRSSettings) {
		this.app = app;
		this.flashcardFolder = flashcardFolder;
		this.settings = settings;
	}
	
	/**
	 * Create flashcard files for all blocks
	 * @param blocks Array of flashcard blocks to create files for
	 * @param sourceFile The source file where blocks came from
	 * @returns Array of creation results
	 */
	async createFlashcards(
		blocks: FlashcardBlock[],
		sourceFile: TFile
	): Promise<FlashcardCreationResult[]> {
		// Ensure flashcard folder exists
		await this.ensureFolderExists();
		
		const results: FlashcardCreationResult[] = [];
		const timestamp = this.generateTimestamp();
		
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i];
			
			// Generate unique filename and block ID
			const suffix = blocks.length > 1 ? `-${i}` : '';
			const filename = `flashcard-${timestamp}${suffix}.md`;
			const blockId = `fc-${timestamp}${suffix}`;
			
			// Extract inner content (without start/end markers)
			const innerContent = FlashcardParser.extractInnerContent(block.content);
			
			// Create flashcard file
			const flashcardPath = await this.createFlashcardFile(
				filename,
				sourceFile,
				blockId,
				innerContent
			);
			
			results.push({
				flashcardPath,
				sourceBlockId: blockId,
				originalBlock: block,
			});
		}
		
		return results;
	}
	
	/**
	 * Create a single flashcard file
	 * @param filename Name of the flashcard file
	 * @param sourceFile Source file reference
	 * @param blockId Block reference ID
	 * @param content Inner content to write
	 * @returns Path to created flashcard file
	 */
	private async createFlashcardFile(
		filename: string,
		sourceFile: TFile,
		blockId: string,
		content: string
	): Promise<string> {
		// Construct full path
		const flashcardPath = normalizePath(`${this.flashcardFolder}/${filename}`);
		
		// Get source file name (without extension)
		const sourceFileName = sourceFile.basename;
		
		// Get today's date for due field
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayISO = Scheduler.dateToISOString(today);
		
		// Create YAML frontmatter with initial SRS state
		const frontmatter = `---
sr: true
ease: ${this.settings.initialEase}
interval: 0
reps: 0
lapses: 0
due: ${todayISO}
---`;
		
		// Create flashcard content with frontmatter, source link, and content
		const flashcardContent = `${frontmatter}
[[${sourceFileName}#^${blockId}]]

${content}`;
		
		// Create the file
		await this.app.vault.create(flashcardPath, flashcardContent);
		
		return flashcardPath;
	}
	
	/**
	 * Ensure the flashcard folder exists, create if it doesn't
	 */
	private async ensureFolderExists(): Promise<void> {
		const folder = this.flashcardFolder;
		const normalizedPath = normalizePath(folder);
		
		// Check if folder exists
		const folderExists = await this.app.vault.adapter.exists(normalizedPath);
		
		if (!folderExists) {
			// Create folder (this creates parent folders too if needed)
			await this.app.vault.createFolder(normalizedPath);
		}
	}
	
	/**
	 * Generate timestamp string for filenames
	 * Format: YYYYMMDD-HHMMSS
	 */
	private generateTimestamp(): string {
		const now = new Date();
		
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		
		return `${year}${month}${day}-${hours}${minutes}${seconds}`;
	}
}

