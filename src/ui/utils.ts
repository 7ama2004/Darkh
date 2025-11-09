/**
 * UI utility functions
 */

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;
	
	return function(...args: Parameters<T>) {
		if (timeout) {
			clearTimeout(timeout);
		}
		
		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr: string): string {
	try {
		const date = new Date(dateStr);
		const now = new Date();
		
		// Calculate days difference
		const diffTime = date.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) {
			return "today";
		} else if (diffDays === 1) {
			return "tomorrow";
		} else if (diffDays === -1) {
			return "yesterday";
		} else if (diffDays > 1 && diffDays < 7) {
			return `in ${diffDays} days`;
		} else if (diffDays < -1 && diffDays > -7) {
			return `${Math.abs(diffDays)} days ago`;
		} else {
			return date.toLocaleDateString();
		}
	} catch (e) {
		return dateStr;
	}
}

