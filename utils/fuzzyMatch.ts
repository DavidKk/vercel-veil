/**
 * Fuzzy matching function
 * @param text The text to match against
 * @param pattern The fuzzy matching pattern
 */
export function fuzzyMatch(text: string, pattern: string) {
  if (!pattern) {
    return { matched: true, score: 1 }
  }

  if (!text) {
    return { matched: false, score: 0 }
  }

  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase()
  const lowerPattern = pattern.toLowerCase()

  // Split text by spaces and non-English characters for more flexible matching
  // This allows both English word matching and character-by-character matching for other languages
  const splitRegex = /[\s\W]+|[^a-zA-Z0-9]/g
  const segments = lowerText.split(splitRegex).filter(Boolean)

  // Also include the original text as a segment for character-level matching
  const allSegments = [...segments, lowerText]

  // Split pattern by spaces
  const tokens = lowerPattern.split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    return { matched: true, score: 1 }
  }

  // Check for each token whether it can continuously match in some segment
  const matchedSegmentIndexes = new Set<number>()

  for (const token of tokens) {
    let tokenMatched = false
    for (let i = 0; i < allSegments.length; i++) {
      const segment = allSegments[i]
      // Check if token matches segment based on token type
      if (checkTokenMatch(segment, token)) {
        tokenMatched = true
        matchedSegmentIndexes.add(i)
        break // This token has matched a segment, check the next token
      }
    }
    if (!tokenMatched) {
      return { matched: false, score: 0 }
    }
  }

  // Scoring: Based on the number of segments covered by tokens and token-to-segment length ratio
  const coveredSegments = Array.from(matchedSegmentIndexes).length
  const segmentCoverageScore = Math.min(1, coveredSegments / Math.max(1, allSegments.length))

  // Bonus if the full text was matched
  const fullTextMatched = matchedSegmentIndexes.has(allSegments.length - 1)

  // Average ratio of token length to segment length
  let ratioSum = 0
  for (const token of tokens) {
    const segment = allSegments.find((s) => checkTokenMatch(s, token)) || ''
    ratioSum += token.length / Math.max(1, segment.length)
  }
  const avgRatio = ratioSum / tokens.length

  let score = 0.5 * segmentCoverageScore + 0.3 * avgRatio + (fullTextMatched ? 0.2 : 0)
  // More specific tokens bonus (up to +0.05)
  score += Math.min(0.05, tokens.length * 0.01)

  score = Math.max(0, Math.min(1, score))

  return { matched: true, score }
}

/**
 * Check if token matches segment based on the nature of the token
 * @param segment The text segment to search in
 * @param token The token to search for
 */
function checkTokenMatch(segment: string, token: string): boolean {
  // If token has non-English characters, use fuzzy character matching
  if (/[^a-zA-Z0-9]/.test(token)) {
    return isFuzzyCharacterMatch(segment, token)
  }
  // For English tokens, use substring matching
  return segment.includes(token)
}

/**
 * Check if all characters in pattern exist in text (for character fuzzy matching)
 * @param text The text to search in
 * @param pattern The pattern to search for
 */
function isFuzzyCharacterMatch(text: string, pattern: string): boolean {
  // For non-English characters, check if all characters in pattern exist in text
  for (const char of pattern) {
    if (!text.includes(char)) {
      return false
    }
  }
  return true
}
