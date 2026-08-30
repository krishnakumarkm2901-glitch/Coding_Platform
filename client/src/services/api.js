import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = rawApiUrl 
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`) 
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — session expiry + automatic retry on network errors
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000; // 1 second base, doubles each retry (exponential backoff)

function shouldRetry(error) {
  // Retry on network errors and 502/503/504 gateway issues
  if (!error.response) return true; // network / timeout
  const status = error.response.status;
  return status === 502 || status === 503 || status === 504;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Don't retry POST/PUT/DELETE unless idempotent
    const isIdempotent = ['get', 'head', 'options'].includes((config.method || '').toLowerCase());

    // Retry logic
    config.__retryCount = config.__retryCount || 0;
    if (shouldRetry(error) && isIdempotent && config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      const delay = RETRY_DELAY_MS * Math.pow(2, config.__retryCount - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    // 401 — session expired
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (currentPath.startsWith('/admin')) {
          window.location.href = '/loginadmin';
        } else {
          window.location.href = '/';
        }
      }
    }

    // 429 — rate limited
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.data?.retry_after_seconds || 10;
      console.warn(`Rate limited. Retry after ${retryAfter}s`);
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Request deduplication — prevent double-click submissions
// ---------------------------------------------------------------------------

const _inflight = new Map();

/**
 * Deduplicated POST request.  If an identical request (same URL + body)
 * is already in-flight, returns the same promise instead of firing a
 * duplicate.  Use for submit / run endpoints.
 */
export function deduplicatedPost(url, data, config = {}) {
  const key = `${url}::${JSON.stringify(data)}`;
  if (_inflight.has(key)) {
    return _inflight.get(key);
  }
  const promise = api.post(url, data, config).finally(() => {
    _inflight.delete(key);
  });
  _inflight.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Submission polling helper
// ---------------------------------------------------------------------------

/**
 * Poll a queued submission until it completes or times out.
 *
 * @param {string} submissionId  - MongoDB submission _id
 * @param {object} options
 * @param {number} options.intervalMs   - Poll interval (default 1500ms)
 * @param {number} options.maxAttempts  - Max polls (default 60 = ~90s)
 * @param {function} options.onProgress - Called each poll with { status, passed_test_cases, ... }
 * @returns {Promise<object>} Final submission result
 */
export async function pollSubmissionResult(submissionId, options = {}) {
  const {
    intervalMs = 1500,
    maxAttempts = 60,
    onProgress = null,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await api.get(`/submissions/${submissionId}/status`);
      const data = res.data;

      if (onProgress) {
        onProgress(data);
      }

      if (data.is_complete) {
        // Fetch full submission details
        const full = await api.get(`/submissions/${submissionId}`);
        return {
          success: true,
          ...full.data.submission,
          // Merge status-level fields
          status: data.status,
          passed_test_cases: data.passed_test_cases,
          total_test_cases: data.total_test_cases,
          runtime: data.runtime,
          error_message: data.error_message,
        };
      }
    } catch (err) {
      // Ignore transient errors during polling
      console.warn('Polling error (will retry):', err.message);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // Timed out
  return {
    success: false,
    status: 'Polling Timeout',
    error_message: 'Evaluation is taking longer than expected. Check your submissions page for results.',
    passed_test_cases: 0,
    total_test_cases: 0,
    runtime: 0,
  };
}

export default api;
