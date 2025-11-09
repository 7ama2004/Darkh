import { Platform } from "obsidian";
import type DarkhSRSPlugin from "../main";

/**
 * Session progress indicator component
 */
export class SessionProgress {
	private plugin: DarkhSRSPlugin;
	private statusBarItem: HTMLElement | null = null;
	private bannerEl: HTMLElement | null = null;
	
	constructor(plugin: DarkhSRSPlugin) {
		this.plugin = plugin;
	}
	
	/**
	 * Show progress indicator
	 */
	show(current: number, total: number): void {
		if (Platform.isMobile) {
			this.showBanner(current, total);
		} else {
			this.showStatusBar(current, total);
		}
	}
	
	/**
	 * Hide progress indicator
	 */
	hide(): void {
		if (this.statusBarItem) {
			this.statusBarItem.setText("");
			this.statusBarItem = null;
		}
		
		if (this.bannerEl) {
			this.bannerEl.remove();
			this.bannerEl = null;
		}
	}
	
	/**
	 * Update progress
	 */
	update(current: number, total: number): void {
		if (Platform.isMobile) {
			this.updateBanner(current, total);
		} else {
			this.updateStatusBar(current, total);
		}
	}
	
	/**
	 * Show status bar (desktop)
	 */
	private showStatusBar(current: number, total: number): void {
		if (!this.statusBarItem) {
			this.statusBarItem = this.plugin.addStatusBarItem();
			this.statusBarItem.addClass("darkh-srs-status-bar");
		}
		this.updateStatusBar(current, total);
	}
	
	/**
	 * Update status bar text
	 */
	private updateStatusBar(current: number, total: number): void {
		if (this.statusBarItem) {
			this.statusBarItem.setText(`Reviewing: ${current}/${total}`);
		}
	}
	
	/**
	 * Show banner (mobile)
	 */
	private showBanner(current: number, total: number): void {
		if (!this.bannerEl) {
			// Find the workspace container
			const workspace = this.plugin.app.workspace.containerEl;
			this.bannerEl = workspace.createDiv({ cls: "darkh-srs-banner" });
		}
		this.updateBanner(current, total);
	}
	
	/**
	 * Update banner text
	 */
	private updateBanner(current: number, total: number): void {
		if (this.bannerEl) {
			this.bannerEl.setText(`Reviewing: ${current}/${total}`);
		}
	}
}

