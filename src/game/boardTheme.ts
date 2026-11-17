/** Board theme changes every 10 levels so a long run keeps looking fresh. */
export const BOARD_THEMES = ['floor', 'garden', 'kitchen', 'roof', 'nursery', 'winter'];
export const boardBackground = (n: number) => `bg_board_${BOARD_THEMES[Math.floor((n - 1) / 10) % BOARD_THEMES.length]}`;
