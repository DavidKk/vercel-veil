const CHINESE_NUMBERS = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  百: 100,
  千: 1e3,
  万: 1e4,
  亿: 1e8,
}

/**
 * Check if all characters in the array are Chinese number characters
 * @param chars - Character array to check
 * @returns Returns true if all characters in the array are Chinese number characters, otherwise returns false
 */
export function isChineseNumber(chars: string[]): chars is (keyof typeof CHINESE_NUMBERS)[] {
  // Iterate through the character array and check if each character is in the CHINESE_NUMBERS object
  for (const char of chars) {
    if (!(char in CHINESE_NUMBERS)) {
      return false
    }
  }
  return true
}

/**
 * Convert Chinese number string to Arabic number
 * @param chineseNumber - Chinese number string
 * @returns Converted Arabic number, returns 0 if input is invalid
 */
export function chineseToNumber(chineseNumber: string): number {
  // Input validation, ensure it's a string type
  if (typeof chineseNumber !== 'string') {
    return 0
  }

  const chineseChars = chineseNumber.split('')

  // Check if all characters are Chinese number characters
  if (!isChineseNumber(chineseChars)) {
    return 0
  }

  /** Store final result */
  let result = 0
  /** Temporarily store current value */
  let temp = 0
  /** Store the billion (10^8) part */
  let billion = 0

  // Iterate through Chinese character array, processing each character sequentially
  for (let i = 0; i < chineseChars.length; i++) {
    const char = chineseChars[i]
    const num = CHINESE_NUMBERS[char]

    if (num === 1e8) {
      // Handle billion (10^8) case
      result += temp
      result *= num
      // Save the billion part
      billion = result
      // Reset temporary value
      temp = 0
      // Reset result
      result = 0
    } else if (num === 1e4) {
      // Handle ten thousand (10^4) case
      result += temp
      result *= num
      // Reset temporary value
      temp = 0
    } else if (num >= 10) {
      // Handle ten, hundred, thousand cases
      if (temp === 0) {
        // If there's no accumulated value, set to 1 (e.g., "十" should become 10)
        temp = 1
      }

      // Accumulate current value
      temp *= num
    } else {
      // Handle single digit (0-9) case
      // Add previously accumulated value to result
      result += temp
      // Set new value to start accumulating
      temp = num
    }
  }

  // Finally process accumulated temporary value and billion part
  result += temp
  result += billion

  return result
}
