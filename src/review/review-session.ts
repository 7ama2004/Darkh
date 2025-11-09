import { App, TFile } from 'obsidian';
import { parseFrontmatter } from '../utils/frontmatter';
import { FlashcardMetadata } from '../types';

interface FileWithDueDate {
	file: TFile;
	due: string;
}

export class ReviewSession {
	private app: App;
	private flashcardFolder: string;
	private queue: FileWithDueDate[] = [];
	private currentIndex: number = 0;

	constructor(app: App, flashcardFolder: string) {
		this.app = app;
		this.flashcardFolder = flashcardFolder;
	}

	async initialize(): Promise<boolean> {
		// Find all markdown files in the flashcard folder
		const folder = this.app.vault.getAbstractFileByPath(this.flashcardFolder);
		if (!folder) {
			return false;
		}

		const files: TFile[] = [];
		const today = new Date().toISOString().split('T')[0];

		// Recursively find all markdown files
		const collectFiles = (file: any) => {
			if (file instanceof TFile && file.extension === 'md') {
				files.push(file);
			} else if (file.children) {
				file.children.forEach(collectFiles);
			}
		};

		collectFiles(folder);

		// Filter files that are due for review
		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const parsed = parseFrontmatter(content);
				const due = parsed.metadata.due || today;

				if (due <= today) {
					this.queue.push({ file, due });
				}
			} catch (error) {
				console.error(`Error reading file ${file.path}:`, error);
			}
		}

		// Sort by due date (earliest first)
		this.queue.sort((a, b) => {
			return a.due.localeCompare(b.due);
		});

		this.currentIndex = 0;
		return this.queue.length > 0;
	}

	getCurrentFile(): TFile | null {
		if (this.currentIndex >= this.queue.length) {
			return null;
		}
		return this.queue[this.currentIndex].file;
	}

	async moveToNext(): Promise<TFile | null> {
		this.currentIndex++;
		return this.getCurrentFile();
	}

	getProgress(): { current: number; total: number } {
		return {
			current: this.currentIndex + 1,
			total: this.queue.length,
		};
	}

	hasMore(): boolean {
		return this.currentIndex < this.queue.length;
	}

	getRemainingCount(): number {
		return Math.max(0, this.queue.length - this.currentIndex);
	}
}
