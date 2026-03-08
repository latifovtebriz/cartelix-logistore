/**
 * Phone number normalization utilities for Azerbaijan phone numbers
 * Supports various formats: +994XXXXXXXXX, 994XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX
 */

/**
 * Normalize phone number to standard format: +994XXXXXXXXX
 * @param phone - Phone number in any format
 * @returns Normalized phone number starting with +994
 */
export const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters except +
    let clean = phone.replace(/[^\d+]/g, '');

    // Remove plus if present
    if (clean.startsWith('+')) {
        clean = clean.substring(1);
    }

    // If starts with 0, remove leading 0 and add 994
    if (clean.startsWith('0')) {
        clean = '994' + clean.substring(1);
    }

    // If doesn't start with 994, add it
    if (!clean.startsWith('994')) {
        clean = '994' + clean;
    }

    return '+' + clean;
};

/**
 * Compare two phone numbers for equality
 * @returns true if both phones represent the same number
 */
export const isSamePhone = (phone1: string, phone2: string): boolean => {
    return normalizePhone(phone1) === normalizePhone(phone2);
};

/**
 * Format phone for display: +994 (XX) XXX-XX-XX
 */
export const formatPhoneDisplay = (phone: string): string => {
    const normalized = normalizePhone(phone);
    // +994XXXXXXXXX -> +994 (XX) XXX-XX-XX
    if (normalized.length === 13) {
        return `${normalized.slice(0, 4)} (${normalized.slice(4, 6)}) ${normalized.slice(6, 9)}-${normalized.slice(9, 11)}-${normalized.slice(11, 13)}`;
    }
    return phone;
};

/**
 * Validate Azerbaijan phone number format
 * Valid formats: 50, 51, 55, 60, 70, 77, 10, 99
 */
export const validateAzPhone = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    // +994 followed by valid operator code and 7 digits
    const azPhoneRegex = /^\+994(10|50|51|55|60|70|77|99)\d{7}$/;
    return azPhoneRegex.test(normalized);
};
