import { Notice, TFile, WorkspaceLeaf } from "obsidian";
import { SessionState } from "./types";
import { Events } from "obsidian";
import type DarkhSRSPlugin from "./main";

/**
 * Session manager for queue-based review sessions
 */
export class SessionManager extends Events {
	private plugin: DarkhSRSPlugin;
	private state: SessionState;
	
	constructor(plugin: DarkhSRSPlugin) {
		super();
		this.plugin = plugin;
		this.state = {
			active: false,
			queue: [],
			currentIndex: 0,
		};
	}
	
	/**
	 * Start a new review session with the provided queue
	 */
	async startSession(queue: TFile[]): Promise<void> {
		if (queue.length === 0) {
			new Notice("No cards due for review");
			return;
		}
		
		this.state = {
			active: true,
			queue: queue,
			currentIndex: 0,
		};
		
		// Trigger session started event
		this.trigger("session-started", this.state);
		
		// Open the first file
		await this.openCurrentFile();
		
		new Notice(`Starting review session: ${queue.length} card${queue.length > 1 ? 's' : ''}`);
	}
	
	/**
	 * Advance to the next card in the session
	 */
	async advanceSession(): Promise<void> {
		if (!this.state.active) {
			return;
		}
		
		// Check if user is still on a queue file
		const activeFile = this.plugin.app.workspace.getActiveFile();
		if (!activeFile || !this.isQueueFile(activeFile)) {
			// User navigated away - end session
			this.endSession(true);
			return;
		}
		
		this.state.currentIndex++;
		
		// Check if session is complete
		if (this.state.currentIndex >= this.state.queue.length) {
			this.endSession(false);
			new Notice("Review session complete! 🎉");
			return;
		}
		
		// Trigger progress update
		this.trigger("session-progress", this.state);
		
		// Open next file
		await this.openCurrentFile();
	}
	
	/**
	 * End the current session
	 */
	endSession(cancelled: boolean = false): void {
		if (!this.state.active) {
			return;
		}
		
		this.state.active = false;
		this.state.queue = [];
		this.state.currentIndex = 0;
		
		this.trigger("session-ended", { cancelled });
		
		if (cancelled) {
			new Notice("Review session ended");
		}
	}
	
	/**
	 * Get current session state
	 */
	getState(): SessionState {
		return { ...this.state };
	}
	
	/**
	 * Check if a session is currently active
	 */
	isActive(): boolean {
		return this.state.active;
	}
	
	/**
	 * Get the current file in the session
	 */
	getCurrentFile(): TFile | null {
		if (!this.state.active || this.state.currentIndex >= this.state.queue.length) {
			return null;
		}
		return this.state.queue[this.state.currentIndex];
	}
	
	/**
	 * Check if a file is part of the current queue
	 */
	isQueueFile(file: TFile): boolean {
		return this.state.queue.some(f => f.path === file.path);
	}
	
	/**
	 * Get session progress (current/total)
	 */
	getProgress(): { current: number; total: number } {
		return {
			current: this.state.currentIndex + 1,
			total: this.state.queue.length,
		};
	}
	
	/**
	 * Open the current file in the session
	 */
	private async openCurrentFile(): Promise<void> {
		const file = this.getCurrentFile();
		if (!file) {
			return;
		}
		
		// Open in the active leaf
		const leaf = this.plugin.app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}
}

