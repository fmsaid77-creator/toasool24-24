export interface ValidationResult {
  valid: boolean;
  code?: 'NOT_DIGITS' | 'MUST_START_WITH_8' | 'INVALID_LENGTH' | 'MUST_BE_ODD' | 'ALREADY_TAKEN';
  message: string;
}

/**
 * Validates a Tawasol 24 number according to the requirements:
 * 1. Starts strictly with digit 8.
 * 2. Length between 6 digits minimum and 9 digits maximum.
 * 3. Must be an odd number (ends with 1, 3, 5, 7, or 9).
 */
export function validateTawasolNumber(rawNumber: string): ValidationResult {
  const clean = rawNumber.trim();

  if (!clean) {
    return {
      valid: false,
      code: 'INVALID_LENGTH',
      message: 'يرجى إدخال الرقم المعتمد للتفعيل.',
    };
  }

  if (!/^\d+$/.test(clean)) {
    return {
      valid: false,
      code: 'NOT_DIGITS',
      message: 'يجب أن يحتوي الرقم على خانات رقمية فقط بدون مسافات أو حروف.',
    };
  }

  // 1. Must start with 8
  if (!clean.startsWith('8')) {
    return {
      valid: false,
      code: 'MUST_START_WITH_8',
      message: '⚠️ تنبيه إجباري: يجب أن يبدأ الرقم بالرقم 8!',
    };
  }

  // 2. Length 6 to 9 digits
  if (clean.length < 6 || clean.length > 9) {
    return {
      valid: false,
      code: 'INVALID_LENGTH',
      message: `يتكون الرقم من 6 إلى 9 أرقام (الرقم الحالي يتكون من ${clean.length} أرقام).`,
    };
  }

  // 3. Must be odd (فردي)
  const lastChar = clean.charAt(clean.length - 1);
  const oddDigits = ['1', '3', '5', '7', '9'];
  if (!oddDigits.includes(lastChar)) {
    return {
      valid: false,
      code: 'MUST_BE_ODD',
      message: '⚠️ تنبيه: يجب أن يكون الرقم فردياً (ينتهي برقم فردي: 1 أو 3 أو 5 أو 7 أو 9).',
    };
  }

  return {
    valid: true,
    message: 'الرقم متوافق تماماً مع جميع الشروط المعتمدة في تواصل 24.',
  };
}

/**
 * Generates a valid random odd number starting with 8, length between 6 and 9.
 */
export function generateRandomValidNumber(): string {
  const length = Math.floor(Math.random() * 4) + 6; // 6, 7, 8, or 9
  let result = '8';
  for (let i = 1; i < length - 1; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  const oddDigits = ['1', '3', '5', '7', '9'];
  result += oddDigits[Math.floor(Math.random() * oddDigits.length)];
  return result;
}

/**
 * Generates 5 distinct valid numbers for the dropdown list.
 */
export function generateFiveSuggestions(excludeNumbers: string[] = []): string[] {
  const set = new Set<string>();
  let safety = 0;
  while (set.size < 5 && safety < 200) {
    safety++;
    const cand = generateRandomValidNumber();
    if (!excludeNumbers.includes(cand)) {
      set.add(cand);
    }
  }
  while (set.size < 5) {
    set.add(generateRandomValidNumber());
  }
  return Array.from(set);
}
