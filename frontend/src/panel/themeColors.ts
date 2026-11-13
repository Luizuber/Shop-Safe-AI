export interface ThemeColors {
    bgPrimary: string;
    bgSecondary: string;
    bgCard: string;
    bgCardHover: string;
    bgHeader: string;
    bgFooter: string;
    borderPrimary: string;
    borderSubtle: string;
    borderAccent: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textLabel: string;
    accent: string;
    accentSubtle: string;
    accentGlow: string;
    scoreGreen: string;
    scoreYellow: string;
    scoreRed: string;
    scoreGreenGlow: string;
    scoreYellowGlow: string;
    scoreRedGlow: string;
    progressTrack: string;
    progressGradientGreen: string;
    progressGradientYellow: string;
    progressGradientRed: string;
    btnPrimaryBg: string;
    btnPrimaryBorder: string;
    btnPrimaryGlow: string;
    warningBg: string;
    warningBorder: string;
    warningText: string;
    priceCardBg: string;
    priceCardBorder: string;
    priceGreen: string;
    panelBorder: string;
    panelShadow: string;
    floatingBg: string;
    floatingBorder: string;
    floatingGlow: string;
    floatingIcon: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    toggleOn: string;
    toggleOff: string;
    toggleGlow: string;
    scrollThumb: string;
    scrollThumbHover: string;
}

export const lightColors: ThemeColors = {
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgCard: '#ffffff',
    bgCardHover: '#f8fafc',
    bgHeader: '#ffffff',
    bgFooter: '#ffffff',
    borderPrimary: '#e2e8f0',
    borderSubtle: '#e5e7eb',
    borderAccent: '#bfdbfe',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    textLabel: '#1f2937',
    accent: '#2563eb',
    accentSubtle: '#eff6ff',
    accentGlow: 'transparent',
    scoreGreen: '#15803d',
    scoreYellow: '#b45309',
    scoreRed: '#b91c1c',
    scoreGreenGlow: 'transparent',
    scoreYellowGlow: 'transparent',
    scoreRedGlow: 'transparent',
    progressTrack: '#e5e7eb',
    progressGradientGreen: '#15803d',
    progressGradientYellow: '#d97706',
    progressGradientRed: '#dc2626',
    btnPrimaryBg: '#2563eb',
    btnPrimaryBorder: '#2563eb',
    btnPrimaryGlow: 'none',
    warningBg: '#fef2f2',
    warningBorder: '#fecaca',
    warningText: '#991b1b',
    priceCardBg: '#f0fdf4',
    priceCardBorder: '#bbf7d0',
    priceGreen: '#15803d',
    panelBorder: '1px solid #d1d5db',
    panelShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
    floatingBg: '#2563eb',
    floatingBorder: '1px solid #1d4ed8',
    floatingGlow: '0 4px 12px rgba(15, 23, 42, 0.18)',
    floatingIcon: '#ffffff',
    badgeBg: '#eff6ff',
    badgeBorder: '1px solid #bfdbfe',
    badgeText: '#1d4ed8',
    toggleOn: '#2563eb',
    toggleOff: '#d1d5db',
    toggleGlow: 'none',
    scrollThumb: '#cbd5e1',
    scrollThumbHover: '#94a3b8',
};

export const darkColors: ThemeColors = {
    bgPrimary: '#111827',
    bgSecondary: '#0f172a',
    bgCard: '#1f2937',
    bgCardHover: '#273449',
    bgHeader: '#111827',
    bgFooter: '#111827',
    borderPrimary: '#374151',
    borderSubtle: '#374151',
    borderAccent: '#1e40af',
    textPrimary: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    textLabel: '#f3f4f6',
    accent: '#60a5fa',
    accentSubtle: '#172554',
    accentGlow: 'transparent',
    scoreGreen: '#4ade80',
    scoreYellow: '#fbbf24',
    scoreRed: '#f87171',
    scoreGreenGlow: 'transparent',
    scoreYellowGlow: 'transparent',
    scoreRedGlow: 'transparent',
    progressTrack: '#374151',
    progressGradientGreen: '#22c55e',
    progressGradientYellow: '#f59e0b',
    progressGradientRed: '#ef4444',
    btnPrimaryBg: '#2563eb',
    btnPrimaryBorder: '#3b82f6',
    btnPrimaryGlow: 'none',
    warningBg: '#3f1d22',
    warningBorder: '#7f1d1d',
    warningText: '#fecaca',
    priceCardBg: '#142d20',
    priceCardBorder: '#166534',
    priceGreen: '#4ade80',
    panelBorder: '1px solid #374151',
    panelShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
    floatingBg: '#2563eb',
    floatingBorder: '1px solid #3b82f6',
    floatingGlow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    floatingIcon: '#ffffff',
    badgeBg: '#172554',
    badgeBorder: '1px solid #1e40af',
    badgeText: '#93c5fd',
    toggleOn: '#3b82f6',
    toggleOff: '#4b5563',
    toggleGlow: 'none',
    scrollThumb: '#4b5563',
    scrollThumbHover: '#6b7280',
};

export function getColors(theme: 'light' | 'dark'): ThemeColors {
    return theme === 'dark' ? darkColors : lightColors;
}
