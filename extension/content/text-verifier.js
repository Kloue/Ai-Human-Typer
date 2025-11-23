/**
 * Text Verifier
 * verifies typed text matches expected
 * (not really used much now, kept for future)
 * 
 * Kloue - 2025-11-23
 */

class TextVerifier {
  constructor() {
    this.lastVerifiedPosition = 0;
  }
  
  // get text from element
  getActualText(element) {
    if (!element) return '';
    
    // different element types
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.value;
    } else if (element.isContentEditable) {
      return element.innerText || element.textContent || '';
    }
    
    return '';
  }
  
  // verify text at position
  // returns: { isCorrect, actualText, expectedText, errorPosition }
  verify(element, expectedText, currentPosition) {
    const actualText = this.getActualText(element);
    
    // compare up to current position
    const expectedPart = expectedText.substring(0, currentPosition);
    const actualPart = actualText.substring(0, currentPosition);
    
    if (expectedPart === actualPart) {
      this.lastVerifiedPosition = currentPosition;
      return {
        isCorrect: true,
        actualText: actualPart,
        expectedText: expectedPart,
        errorPosition: -1
      };
    }
    
    // find error position
    let errorPosition = 0;
    for (let i = 0; i < Math.min(expectedPart.length, actualPart.length); i++) {
      if (expectedPart[i] !== actualPart[i]) {
        errorPosition = i;
        break;
      }
    }
    
    // length mismatch
    if (expectedPart.length !== actualPart.length && errorPosition === 0) {
      errorPosition = Math.min(expectedPart.length, actualPart.length);
    }
    
    console.warn('❌ Verification failed!');
    console.warn(`Expected: "${expectedPart}"`);
    console.warn(`Actual: "${actualPart}"`);
    console.warn(`Error at: ${errorPosition}`);
    
    return {
      isCorrect: false,
      actualText: actualPart,
      expectedText: expectedPart,
      errorPosition: errorPosition,
      actualFull: actualText,
      expectedFull: expectedText
    };
  }
  
  // find differences
  findDifferences(expected, actual) {
    const differences = [];
    const maxLength = Math.max(expected.length, actual.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (expected[i] !== actual[i]) {
        differences.push({
          position: i,
          expected: expected[i] || '[END]',
          actual: actual[i] || '[END]'
        });
      }
    }
    
    return differences;
  }
}

// make available
if (typeof window !== 'undefined') {
  window.TextVerifier = TextVerifier;
}

console.log('✅ Text Verifier loaded');