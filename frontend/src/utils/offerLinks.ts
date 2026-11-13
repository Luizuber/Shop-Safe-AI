export function isGoogleShoppingUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return /(^|\.)google\.[a-z.]+$/i.test(url.hostname);
    } catch {
        return false;
    }
}
