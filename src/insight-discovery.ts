import { App, TFile, TFolder } from "obsidian";
import { InsightFile } from "./types";
import { YAMLFrontmatterService } from "./yaml-service";
import { Scheduler } from "./scheduler";

/**
 * Service for discovering and filtering insight files
 */
export class InsightDiscoveryService {
	private app: App;
	private yamlService: YAMLFrontmatterService;
	
	constructor(app: App, yamlService: YAMLFrontmatterService) {
		this.app = app;
		this.yamlService = yamlService;
	}
	
	/**
	 * Get all markdown files in the flashcard folder
	 */
	async getAllInsightFiles(folderPath: string): Promise<TFile[]> {
		if (!folderPath || folderPath.trim() === '') {
			return [];
		}
		
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		
		if (!folder || !(folder instanceof TFolder)) {
			return [];
		}
		
		return this.getMarkdownFilesRecursive(folder);
	}
	
	/**
	 * Get all due cards for review session
	 */
	async getDueInsightFiles(folderPath: string): Promise<InsightFile[]> {
		const allFiles = await this.getAllInsightFiles(folderPath);
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Start of day
		
		const insightFiles: InsightFile[] = [];
		
		for (const file of allFiles) {
			const state = await this.yamlService.readScheduleState(file);
			
			// Include if:
			// 1. No due date set (new card)
			// 2. Due date is today or in the past
			if (!state || !state.due || Scheduler.isDue(state, today)) {
				insightFiles.push({
					file,
					due: state?.due
				});
			}
		}
		
		// Sort by due date (oldest first), with unscheduled cards first
		insightFiles.sort((a, b) => {
			// Unscheduled cards come first
			if (!a.due && !b.due) return 0;
			if (!a.due) return -1;
			if (!b.due) return 1;
			
			// Compare due dates
			return a.due.localeCompare(b.due);
		});
		
		return insightFiles;
	}
	
	/**
	 * Recursively get all markdown files in a folder
	 */
	private getMarkdownFilesRecursive(folder: TFolder): TFile[] {
		const files: TFile[] = [];
		
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === 'md') {
				files.push(child);
			} else if (child instanceof TFolder) {
				files.push(...this.getMarkdownFilesRecursive(child));
			}
		}
		
		return files;
	}
	
	/**
	 * Check if folder exists and is valid
	 */
	async validateFolder(folderPath: string): Promise<boolean> {
		if (!folderPath || folderPath.trim() === '') {
			return false;
		}
		
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		return folder !== null && folder instanceof TFolder;
	}
	
	/**
	 * Get statistics about the flashcard folder
	 */
	async getStatistics(folderPath: string): Promise<{
		total: number;
		due: number;
		new: number;
	}> {
		const allFiles = await this.getAllInsightFiles(folderPath);
		const dueFiles = await this.getDueInsightFiles(folderPath);
		
		let newCount = 0;
		for (const insightFile of dueFiles) {
			if (!insightFile.due) {
				newCount++;
			}
		}
		
		return {
			total: allFiles.length,
			due: dueFiles.length,
			new: newCount,
		};
	}
}

