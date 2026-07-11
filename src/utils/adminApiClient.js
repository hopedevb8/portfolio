import { getApiBaseUrl } from '@utils';

class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 500;
    this.payload = options.payload || null;
  }
}

let accessToken = null;
let refreshPromise = null;

const requestInterceptors = [];
const responseErrorInterceptors = [];
const authStateListeners = new Set();

const emitAuthState = nextState => {
  authStateListeners.forEach(listener => {
    listener(nextState);
  });
};

const parseResponsePayload = async response => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const textPayload = await response.text();
  return textPayload ? { raw: textPayload } : null;
};

const cloneHeaders = headers => {
  if (headers instanceof Headers) {
    return new Headers(headers);
  }

  return new Headers(headers || {});
};

const refreshAdminSession = async () => {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new ApiError('API is not available.', { status: 500 });
  }

  const response = await fetch(`${apiBaseUrl}/api/admin/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const payload = await parseResponsePayload(response);

  if (!response.ok || !payload?.data?.accessToken) {
    accessToken = null;
    emitAuthState({
      status: 'unauthenticated',
      user: null,
      reason: 'refresh_failed',
    });
    throw new ApiError(payload?.error || 'Failed to refresh admin session.', {
      status: response.status,
      payload,
    });
  }

  accessToken = payload.data.accessToken;
  emitAuthState({
    status: 'authenticated',
    user: payload.data.user || null,
    reason: 'session_refreshed',
  });
  return payload.data;
};

requestInterceptors.push(async config => {
  const nextHeaders = cloneHeaders(config.headers);

  if (config.attachAccessToken !== false && accessToken) {
    nextHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  return {
    ...config,
    headers: nextHeaders,
  };
});

responseErrorInterceptors.push(async errorContext => {
  const { error, retry } = errorContext;

  if (
    error.status !== 401 ||
    errorContext.config.retryOnUnauthorized === false ||
    errorContext.config._retryAttempted ||
    errorContext.config.skipSessionRefresh
  ) {
    throw error;
  }

  if (!refreshPromise) {
    refreshPromise = refreshAdminSession().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    await refreshPromise;
    return retry({
      ...errorContext.config,
      _retryAttempted: true,
    });
  } catch (refreshError) {
    accessToken = null;
    throw refreshError;
  }
});

const runRequestInterceptors = async config => {
  let currentConfig = config;

  for (const interceptor of requestInterceptors) {
    currentConfig = await interceptor(currentConfig);
  }

  return currentConfig;
};

const runResponseErrorInterceptors = async context => {
  let lastError = context.error;

  for (const interceptor of responseErrorInterceptors) {
    try {
      return await interceptor({
        ...context,
        error: lastError,
      });
    } catch (nextError) {
      lastError = nextError;
    }
  }

  throw lastError;
};

const executeRequest = async (endpoint, options = {}) => {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new ApiError('API is not available.', { status: 500 });
  }

  const initialConfig = {
    method: 'GET',
    credentials: 'include',
    attachAccessToken: true,
    retryOnUnauthorized: true,
    ...options,
    url: `${apiBaseUrl}${endpoint}`,
  };

  const config = await runRequestInterceptors(initialConfig);

  const response = await fetch(config.url, {
    method: config.method,
    headers: config.headers,
    body: config.body,
    credentials: config.credentials,
  });
  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    const apiError = new ApiError(payload?.error || 'API request failed.', {
      status: response.status,
      payload,
    });

    return runResponseErrorInterceptors({
      config,
      error: apiError,
      retry: nextConfig =>
        executeRequest(endpoint, {
          ...nextConfig,
          url: undefined,
        }),
    });
  }

  return payload;
};

export const adminApiClient = {
  setAccessToken: token => {
    accessToken = token || null;
  },

  clearAccessToken: () => {
    accessToken = null;
  },

  addRequestInterceptor: interceptor => {
    requestInterceptors.push(interceptor);
  },

  addResponseErrorInterceptor: interceptor => {
    responseErrorInterceptors.push(interceptor);
  },

  subscribeAuthState: listener => {
    authStateListeners.add(listener);

    return () => {
      authStateListeners.delete(listener);
    };
  },

  request: (endpoint, options) => executeRequest(endpoint, options),

  login: async credentials => {
    const payload = await executeRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      attachAccessToken: false,
      retryOnUnauthorized: false,
      skipSessionRefresh: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    accessToken = payload.data.accessToken;
    emitAuthState({
      status: 'authenticated',
      user: payload.data.user || null,
      reason: 'login_success',
    });
    return payload.data;
  },

  restoreSession: async () => {
    const payload = await refreshAdminSession();
    return payload;
  },

  logout: async () => {
    try {
      await executeRequest('/api/admin/logout', {
        method: 'POST',
        attachAccessToken: false,
        retryOnUnauthorized: false,
        skipSessionRefresh: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } finally {
      accessToken = null;
      emitAuthState({
        status: 'unauthenticated',
        user: null,
        reason: 'logout',
      });
    }
  },
};

export { ApiError };
