// utils/domain-validator.ts

/**
 * Validates if a hostname is a valid domain format
 */
export function isValidDomain(hostname: string): boolean {
    // Remove port if present
    const domain = hostname.split(':')[0];
    
    // Basic checks
    if (!domain || domain.length > 253) return false;
    
    // Domain regex (simplified)
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    
    // Check format
    if (!domainRegex.test(domain)) return false;
    
    // Reject localhost variations
    if (domain === 'localhost' || domain.endsWith('.localhost')) return false;
    
    // Reject IP addresses (optional, but good practice)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(domain)) return false;
    
    return true;
}

/**
 * Check if domain is a platform domain
 */
export function isPlatformDomain(hostname: string, rootDomain: string): boolean {
    const platformDomains = [
        rootDomain,
        `www.${rootDomain}`,
    ];
    
    return platformDomains.includes(hostname);
}

/**
 * Extract subdomain from hostname
 */
export function extractSubdomain(hostname: string, rootDomain: string): string | null {
    if (!hostname.endsWith(`.${rootDomain}`)) return null;
    
    let subdomain = hostname.replace(`.${rootDomain}`, '');
    
    // Remove www prefix
    if (subdomain.startsWith('www.')) {
        subdomain = subdomain.slice(4);
    }
    
    return subdomain || null;
}