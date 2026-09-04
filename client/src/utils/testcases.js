/**
 * Normalizes test cases from any problem object into a consistent structure:
 * [
 *   {
 *     input: string,
 *     expected_output: string,
 *     explanation?: string
 *   }
 * ]
 */
export const normalizeTestCases = (prob) => {
  if (!prob) return [];

  const extractItem = (item) => {
    if (!item) return null;
    const inputVal = item.input !== undefined && item.input !== null
      ? String(item.input)
      : item.stdin !== undefined && item.stdin !== null
      ? String(item.stdin)
      : '';

    const expectedVal = item.expected_output !== undefined && item.expected_output !== null
      ? String(item.expected_output)
      : item.output !== undefined && item.output !== null
      ? String(item.output)
      : item.expected !== undefined && item.expected !== null
      ? String(item.expected)
      : '';

    return {
      input: inputVal,
      expected_output: expectedVal,
      explanation: item.explanation || '',
    };
  };

  let cases = [];

  // 1. Check sample_test_cases (explicit samples, exclude any hidden)
  if (Array.isArray(prob.sample_test_cases) && prob.sample_test_cases.length > 0) {
    cases = prob.sample_test_cases
      .filter((c) => c && c.is_hidden !== true)
      .map(extractItem)
      .filter((c) => c && (c.input !== '' || c.expected_output !== ''));
  }

  // 2. Check test_cases if still empty - ONLY include explicit sample cases!
  if (cases.length === 0 && Array.isArray(prob.test_cases) && prob.test_cases.length > 0) {
    cases = prob.test_cases
      .filter((c) => c && (c.is_sample === true || c.is_sample === 'true') && c.is_hidden !== true)
      .map(extractItem)
      .filter((c) => c && (c.input !== '' || c.expected_output !== ''));
  }

  // 3. Fallback to sample_input & sample_output
  if (cases.length === 0 && (prob.sample_input !== undefined || prob.sample_output !== undefined)) {
    const rawInput = prob.sample_input !== undefined && prob.sample_input !== null ? String(prob.sample_input) : '';
    const rawOutput = prob.sample_output !== undefined && prob.sample_output !== null ? String(prob.sample_output) : '';
    if (rawInput !== '' || rawOutput !== '') {
      cases.push({
        input: rawInput,
        expected_output: rawOutput,
        explanation: '',
      });
    }
  }

  return cases;
};
