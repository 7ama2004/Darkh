import { App, TFile } from "obsidian";
import * as yaml from "js-yaml";
import { ReviewState } from "./types";

/**
 * Service for reading and writing YAML frontmatter
 */
export class YAMLFrontmatterService {
	private app: App;
	
	constructor(app: App) {
		this.app = app;
	}
	
	/**
	 * Read review state from file's YAML frontmatter
	 */
	async readScheduleState(file: TFile): Promise<ReviewState | null> {
		try {
			const content = await this.app.vault.read(file);
			const frontmatter = this.extractFrontmatter(content);
			
			if (!frontmatter) {
				return null;
			}
			
			const parsed = yaml.load(frontmatter) as any;
			
			if (!parsed || typeof parsed !== 'object') {
				return null;
			}
			
			// Extract only SRS-related fields
			const state: ReviewState = {
				ease: typeof parsed.ease === 'number' ? parsed.ease : 2.5,
				interval: typeof parsed.interval === 'number' ? parsed.interval : 0,
				reps: typeof parsed.reps === 'number' ? parsed.reps : 0,
				lapses: typeof parsed.lapses === 'number' ? parsed.lapses : 0,
			};
			
			if (parsed.sr !== undefined) {
				state.sr = !!parsed.sr;
			}
			
			if (typeof parsed.due === 'string') {
				state.due = parsed.due;
			}
			
			if (typeof parsed.last_review === 'string') {
				state.last_review = parsed.last_review;
			}
			
			return state;
		} catch (error) {
			console.error('Error reading schedule state:', error);
			return null;
		}
	}
	
	/**
	 * Write review state to file's YAML frontmatter
	 */
	async writeScheduleState(file: TFile, state: ReviewState): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const { frontmatter, body } = this.splitContentAndFrontmatter(content);
			
			// Parse existing frontmatter or create new object
			let frontmatterObj: any = {};
			if (frontmatter) {
				try {
					frontmatterObj = yaml.load(frontmatter) as any || {};
				} catch (e) {
					console.warn('Failed to parse existing frontmatter, creating new:', e);
				}
			}
			
			// Ensure it's an object
			if (typeof frontmatterObj !== 'object' || Array.isArray(frontmatterObj)) {
				frontmatterObj = {};
			}
			
			// Update SRS fields
			frontmatterObj.sr = state.sr ?? true;
			frontmatterObj.ease = state.ease;
			frontmatterObj.interval = state.interval;
			frontmatterObj.reps = state.reps;
			frontmatterObj.lapses = state.lapses;
			
			if (state.due) {
				frontmatterObj.due = state.due;
			}
			
			if (state.last_review) {
				frontmatterObj.last_review = state.last_review;
			}
			
			// Convert back to YAML
			const newFrontmatter = yaml.dump(frontmatterObj, {
				indent: 2,
				lineWidth: -1, // Don't wrap lines
				noRefs: true,
			});
			
			// Reconstruct file content
			const newContent = `---\n${newFrontmatter}---\n${body}`;
			
			await this.app.vault.modify(file, newContent);
		} catch (error) {
			console.error('Error writing schedule state:', error);
			throw error;
		}
	}
	
	/**
	 * Extract frontmatter from content
	 */
	private extractFrontmatter(content: string): string | null {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const match = content.match(frontmatterRegex);
		return match ? match[1] : null;
	}
	
	/**
	 * Split content into frontmatter and body
	 */
	private splitContentAndFrontmatter(content: string): { frontmatter: string | null; body: string } {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
		const match = content.match(frontmatterRegex);
		
		if (match) {
			const frontmatter = match[1];
			const body = content.slice(match[0].length);
			return { frontmatter, body };
		}
		
		return { frontmatter: null, body: content };
	}
	
	/**
	 * Check if file has any frontmatter
	 */
	async hasFrontmatter(file: TFile): Promise<boolean> {
		const content = await this.app.vault.read(file);
		return this.extractFrontmatter(content) !== null;
	}
}

