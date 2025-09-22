/**
 * Utilities for phone number normalization and validation
 * Handles Brazilian phone numbers with 10 and 11 digits
 */

/**
 * Normalizes a Brazilian phone number for comparison
 * Converts both 10-digit (DDD + 8) and 11-digit (DDD + 9) numbers to a comparable format
 * Example: 
 * - "92982653407" (11 digits) -> "82653407" (base 8 digits)
 * - "9282653407" (10 digits) -> "82653407" (base 8 digits)
 * - "(92) 98265-3407" -> "82653407" (base 8 digits)
 */
export const normalizePhoneNumber = (phone: string): string | null => {
  if (!phone) return null;

  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Must be 10 or 11 digits for Brazilian format
  if (digits.length !== 10 && digits.length !== 11) {
    return null;
  }

  // Extract DDD (area code) - first 2 digits
  const ddd = digits.substring(0, 2);

  // Validate DDD (Brazilian area codes range from 11 to 99)
  const dddNum = parseInt(ddd);
  if (dddNum < 11 || dddNum > 99) {
    return null;
  }

  // Get the number part after DDD
  const numberPart = digits.substring(2);

  if (digits.length === 11) {
    // 11-digit format: DDD + 9 + 8 digits
    // First digit after DDD should be 9 (mobile prefix)
    if (numberPart[0] !== '9') {
      return null;
    }
    // Return the base 8 digits (remove the '9' prefix)
    return numberPart.substring(1);
  } else {
    // 10-digit format: DDD + 8 digits (older mobile format)
    // Return the 8 digits directly
    return numberPart;
  }
};

/**
 * Validates if a phone number is in a valid Brazilian format
 * Accepts both 10-digit and 11-digit formats
 */
export const isValidBrazilianPhone = (phone: string): boolean => {
  if (!phone) return false;

  const digits = phone.replace(/\D/g, '');

  // Must be exactly 10 or 11 digits
  if (digits.length !== 10 && digits.length !== 11) {
    return false;
  }

  // Extract DDD (area code)
  const ddd = digits.substring(0, 2);
  const dddNum = parseInt(ddd);

  // Validate DDD range
  if (dddNum < 11 || dddNum > 99) {
    return false;
  }

  const numberPart = digits.substring(2);

  if (digits.length === 11) {
    // 11-digit format: must start with 9 after DDD
    return numberPart[0] === '9' && numberPart.length === 9;
  } else {
    // 10-digit format: 8 digits after DDD
    return numberPart.length === 8;
  }
};

/**
 * Formats a phone number for display
 * Returns formatted string like "(92) 98265-3407" or "(92) 8265-3407"
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11) {
    // Format: (DD) 9XXXX-XXXX
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  } else if (digits.length === 10) {
    // Format: (DD) XXXX-XXXX
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  }

  return phone; // Return original if invalid format
};

/**
 * Checks if two phone numbers are the same after normalization
 * Handles comparison between 10 and 11-digit formats
 */
export const arePhoneNumbersEqual = (phone1: string, phone2: string): boolean => {
  if (!phone1 || !phone2) return false;

  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);

  return normalized1 !== null && normalized2 !== null && normalized1 === normalized2;
};

/**
 * Gets validation error message for invalid phone numbers
 */
export const getPhoneValidationError = (phone: string): string | null => {
  if (!phone) return 'Telefone é obrigatório';

  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10) {
    return 'Telefone deve ter pelo menos 10 dígitos. Exemplos aceitos: 11987654321, (11) 8765-4321';
  }

  if (digits.length > 11) {
    return 'Telefone deve ter no máximo 11 dígitos. Exemplos aceitos: 11987654321, (21) 98765-4321';
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return 'Telefone deve ter exatamente 10 ou 11 dígitos. Exemplos: 1187654321 (10 dígitos) ou 11987654321 (11 dígitos)';
  }

  const ddd = digits.substring(0, 2);
  const dddNum = parseInt(ddd);

  if (dddNum < 11 || dddNum > 99) {
    return `DDD inválido: ${ddd}. Use DDDs válidos como 11, 21, 31, 41, 51, etc. Exemplo: 11987654321`;
  }

  if (digits.length === 11) {
    const numberPart = digits.substring(2);
    if (numberPart[0] !== '9') {
      return `Números de 11 dígitos devem ter 9 após o DDD. Exemplo: 11987654321 (correto) vs ${digits} (incorreto)`;
    }
  }

  return null; // No error
};