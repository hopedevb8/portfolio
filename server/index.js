const http = require('node:http');
const {
  databaseFilePath,
  readPortfolio,
  writePortfolio,
  readJobs,
  createJob,
  readJobById,
  updateJob,
  deleteJob,
  readProjects,
  createProject,
  readProjectById,
  updateProject,
  deleteProject,
  readFeaturedProjects,
  createFeaturedProject,
  readFeaturedProjectById,
  updateFeaturedProject,
  deleteFeaturedProject,
  readMessages,
  createMessage,
  readMessageById,
  updateMessageStatus,
  deleteMessage,
  createAdminSession,
  readAdminSessionById,
  updateAdminSession,
  revokeAdminSession,
} = require('./database');
const {
  validateAdminCredentials,
  createRefreshTokenRecord,
  createAuthPayload,
  serializeRefreshCookie,
  clearRefreshCookie,
  getRefreshCookiePayload,
  hashRefreshToken,
  isSessionActive,
  verifyAccessToken,
  isAllowedOrigin,
  assertLoginAttemptAllowed,
  recordFailedLoginAttempt,
  clearLoginAttempts,
} = require('./auth');

const HOST = process.env.API_HOST || '127.0.0.1';
const PORT = Number(process.env.API_PORT || 3001);
const validSections = new Set(['site', 'profile', 'hero', 'about', 'contact']);

const createBaseHeaders = req => {
  const requestOrigin = req.headers.origin;
  const allowedOrigin = isAllowedOrigin(requestOrigin) ? requestOrigin : null;

  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
};

const sendJson = (req, res, statusCode, payload, extraHeaders = {}) => {
  res.writeHead(statusCode, {
    ...createBaseHeaders(req),
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
};

const parseRequestBody = req =>
  new Promise((resolve, reject) => {
    let rawBody = '';

    req.on('data', chunk => {
      rawBody += chunk;

      if (rawBody.length > 1_000_000) {
        reject(new Error('Request body too large.'));
      }
    });

    req.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });

const ensureObjectPayload = payload => {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error('Payload must be a JSON object.');
  }
};

const slugify = value =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const createJobId = job => `${slugify(job.company || job.title || 'job')}-${job.date || Date.now()}`;

const normalizeJobPayload = payload => {
  ensureObjectPayload(payload);

  const normalizedPayload = {
    id: payload.id,
    date: payload.date,
    title: payload.title,
    company: payload.company,
    location: payload.location || '',
    range: payload.range || '',
    url: payload.url || '',
    highlights: payload.highlights,
  };

  if (!normalizedPayload.date || !normalizedPayload.title || !normalizedPayload.company) {
    throw new Error('Job payload must include date, title, and company.');
  }

  if (!Array.isArray(normalizedPayload.highlights)) {
    throw new Error('Job payload must include highlights as an array.');
  }

  return {
    ...normalizedPayload,
    id: normalizedPayload.id || createJobId(normalizedPayload),
  };
};

const normalizeProjectPayload = payload => {
  ensureObjectPayload(payload);

  const normalizedPayload = {
    id: payload.id,
    date: payload.date,
    title: payload.title,
    github: payload.github || '',
    external: payload.external || '',
    tech: payload.tech,
    company: payload.company || '',
    showInProjects: payload.showInProjects !== false,
    ios: payload.ios || '',
    android: payload.android || '',
    description: payload.description,
  };

  if (!normalizedPayload.date || !normalizedPayload.title || !normalizedPayload.description) {
    throw new Error('Project payload must include date, title, and description.');
  }

  if (!Array.isArray(normalizedPayload.tech)) {
    throw new Error('Project payload must include tech as an array.');
  }

  return {
    ...normalizedPayload,
    id: normalizedPayload.id || createJobId(normalizedPayload),
  };
};

const normalizeFeaturedPayload = payload => {
  ensureObjectPayload(payload);

  const normalizedPayload = {
    id: payload.id,
    date: payload.date,
    title: payload.title,
    imageUrl: payload.imageUrl || '',
    github: payload.github || '',
    external: payload.external || '',
    cta: payload.cta || '',
    tech: payload.tech,
    description: payload.description,
  };

  if (
    !normalizedPayload.date ||
    !normalizedPayload.title ||
    !normalizedPayload.imageUrl ||
    !normalizedPayload.description
  ) {
    throw new Error('Featured payload must include date, title, imageUrl, and description.');
  }

  if (!Array.isArray(normalizedPayload.tech)) {
    throw new Error('Featured payload must include tech as an array.');
  }

  return {
    ...normalizedPayload,
    id: normalizedPayload.id || createJobId(normalizedPayload),
  };
};

const normalizeMessagePayload = payload => {
  ensureObjectPayload(payload);

  const normalizedPayload = {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim(),
    subject: String(payload.subject || '').trim(),
    message: String(payload.message || '').trim(),
    status: String(payload.status || 'new').trim() || 'new',
  };

  if (!normalizedPayload.name || !normalizedPayload.email || !normalizedPayload.subject || !normalizedPayload.message) {
    throw new Error('Message payload must include name, email, subject, and message.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPayload.email)) {
    throw new Error('Message email must be valid.');
  }

  return normalizedPayload;
};

const parseAdminLoginPayload = payload => {
  ensureObjectPayload(payload);

  return {
    username: String(payload.username || '').trim(),
    password: String(payload.password || ''),
  };
};

const readAccessToken = req => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
};

const sendUnauthorized = (req, res, message = 'Authentication required.') => {
  sendJson(req, res, 401, { error: message, code: 'UNAUTHORIZED' });
};

const getRequestIdentifier = req => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map(value => value.trim())
    .find(Boolean);

  return forwardedFor || req.socket.remoteAddress || 'unknown';
};

const authenticateAdminRequest = req => {
  const accessToken = readAccessToken(req);

  if (!accessToken) {
    throw new Error('Missing access token.');
  }

  const payload = verifyAccessToken(accessToken);
  const session = readAdminSessionById(payload.sid);

  if (!isSessionActive(session)) {
    throw new Error('Admin session is no longer active.');
  }

  return {
    session,
    user: {
      username: payload.sub,
    },
  };
};

const issueAdminSession = req => {
  const refreshTokenRecord = createRefreshTokenRecord(process.env.ADMIN_USERNAME || 'admin');
  const now = new Date().toISOString();

  const session = createAdminSession({
    id: refreshTokenRecord.sessionId,
    userName: refreshTokenRecord.userName,
    refreshTokenHash: refreshTokenRecord.refreshTokenHash,
    expiresAt: refreshTokenRecord.expiresAt,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    userAgent: req.headers['user-agent'] || '',
  });

  return {
    ...createAuthPayload({
      sessionId: session.id,
      userName: session.userName,
    }),
    refreshCookie: serializeRefreshCookie(req, refreshTokenRecord),
  };
};

const refreshAdminSession = req => {
  const refreshCookiePayload = getRefreshCookiePayload(req);

  if (!refreshCookiePayload) {
    throw new Error('Refresh cookie is missing.');
  }

  const currentSession = readAdminSessionById(refreshCookiePayload.sessionId);

  if (!isSessionActive(currentSession)) {
    throw new Error('Refresh session is not active.');
  }

  if (
    currentSession.refreshTokenHash !== hashRefreshToken(refreshCookiePayload.rawRefreshToken)
  ) {
    revokeAdminSession(currentSession.id);
    throw new Error('Refresh token is invalid.');
  }

  const nextRefreshToken = createRefreshTokenRecord(currentSession.userName);
  const now = new Date().toISOString();
  const updatedSession = updateAdminSession({
    ...currentSession,
    refreshTokenHash: nextRefreshToken.refreshTokenHash,
    expiresAt: nextRefreshToken.expiresAt,
    updatedAt: now,
    lastUsedAt: now,
    userAgent: req.headers['user-agent'] || currentSession.userAgent,
  });

  if (!updatedSession) {
    throw new Error('Failed to refresh admin session.');
  }

  return {
    ...createAuthPayload({
      sessionId: updatedSession.id,
      userName: updatedSession.userName,
    }),
    refreshCookie: serializeRefreshCookie(req, {
      ...nextRefreshToken,
      sessionId: updatedSession.id,
    }),
  };
};

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(req, res, 400, { error: 'Invalid request.' });
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const { pathname } = requestUrl;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, createBaseHeaders(req));
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(req, res, 200, {
        status: 'ok',
        service: 'portfolio-api',
        port: PORT,
        storage: 'sqlite',
        databaseFilePath,
      });
      return;
    }

    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const requestIdentifier = getRequestIdentifier(req);

      try {
        assertLoginAttemptAllowed(requestIdentifier);
      } catch (error) {
        sendJson(
          req,
          res,
          error.statusCode || 429,
          { error: error.message, code: error.code || 'LOGIN_RATE_LIMITED' },
          {
            'Retry-After': String(error.retryAfterSeconds || 60),
          },
        );
        return;
      }

      const credentials = parseAdminLoginPayload(await parseRequestBody(req));

      if (!validateAdminCredentials(credentials)) {
        recordFailedLoginAttempt(requestIdentifier);
        sendUnauthorized(req, res, 'Invalid admin credentials.');
        return;
      }

      clearLoginAttempts(requestIdentifier);
      const authSession = issueAdminSession(req);

      sendJson(
        req,
        res,
        200,
        {
          message: 'Admin login successful.',
          data: {
            accessToken: authSession.accessToken,
            accessTokenExpiresAt: authSession.accessTokenExpiresAt,
            user: authSession.user,
          },
        },
        {
          'Set-Cookie': authSession.refreshCookie,
        },
      );
      return;
    }

    if (pathname === '/api/admin/refresh' && req.method === 'POST') {
      try {
        const authSession = refreshAdminSession(req);

        sendJson(
          req,
          res,
          200,
          {
            message: 'Admin session refreshed.',
            data: {
              accessToken: authSession.accessToken,
              accessTokenExpiresAt: authSession.accessTokenExpiresAt,
              user: authSession.user,
            },
          },
          {
            'Set-Cookie': authSession.refreshCookie,
          },
        );
      } catch (error) {
        sendJson(
          req,
          res,
          401,
          { error: error.message, code: 'SESSION_REFRESH_FAILED' },
          {
            'Set-Cookie': clearRefreshCookie(),
          },
        );
      }

      return;
    }

    if (pathname === '/api/admin/logout' && req.method === 'POST') {
      const refreshCookiePayload = getRefreshCookiePayload(req);

      if (refreshCookiePayload?.sessionId) {
        revokeAdminSession(refreshCookiePayload.sessionId);
      }

      sendJson(
        req,
        res,
        200,
        {
          message: 'Admin session closed.',
        },
        {
          'Set-Cookie': clearRefreshCookie(),
        },
      );
      return;
    }

    if (pathname === '/api/admin/session' && req.method === 'GET') {
      try {
        const auth = authenticateAdminRequest(req);

        sendJson(req, res, 200, {
          data: {
            user: auth.user,
          },
        });
      } catch (error) {
        sendUnauthorized(req, res, error.message);
      }

      return;
    }

    if (pathname === '/api/portfolio') {
      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: readPortfolio() });
        return;
      }

      if (req.method === 'PUT') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        ensureObjectPayload(payload);
        writePortfolio(payload);
        sendJson(req, res, 200, { message: 'Portfolio updated.', data: payload });
        return;
      }
    }

    if (pathname === '/api/jobs') {
      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: readJobs() });
        return;
      }

      if (req.method === 'POST') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        const nextJob = normalizeJobPayload(payload);

        if (readJobById(nextJob.id)) {
          sendJson(req, res, 409, { error: `Job id already exists: ${nextJob.id}` });
          return;
        }

        sendJson(req, res, 201, { message: 'Job created.', data: createJob(nextJob) });
        return;
      }
    }

    if (pathname === '/api/projects') {
      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: readProjects() });
        return;
      }

      if (req.method === 'POST') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        const nextProject = normalizeProjectPayload(payload);

        if (readProjectById(nextProject.id)) {
          sendJson(req, res, 409, { error: `Project id already exists: ${nextProject.id}` });
          return;
        }

        sendJson(req, res, 201, { message: 'Project created.', data: createProject(nextProject) });
        return;
      }
    }

    if (pathname === '/api/featured') {
      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: readFeaturedProjects() });
        return;
      }

      if (req.method === 'POST') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        const nextFeaturedProject = normalizeFeaturedPayload(payload);

        if (readFeaturedProjectById(nextFeaturedProject.id)) {
          sendJson(req, res, 409, { error: `Featured project id already exists: ${nextFeaturedProject.id}` });
          return;
        }

        sendJson(req, res, 201, {
          message: 'Featured project created.',
          data: createFeaturedProject(nextFeaturedProject),
        });
        return;
      }
    }

    if (pathname === '/api/messages') {
      if (req.method === 'GET') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        sendJson(req, res, 200, { data: readMessages() });
        return;
      }

      if (req.method === 'POST') {
        const payload = await parseRequestBody(req);
        const nextMessage = normalizeMessagePayload(payload);
        sendJson(req, res, 201, {
          message: 'Message received.',
          data: createMessage(nextMessage),
        });
        return;
      }
    }

    const sectionMatch = pathname.match(/^\/api\/portfolio\/([^/]+)$/);

    if (sectionMatch) {
      const section = sectionMatch[1];

      if (!validSections.has(section)) {
        sendJson(req, res, 404, { error: `Unknown portfolio section: ${section}` });
        return;
      }

      const portfolio = readPortfolio();

      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: portfolio[section] });
        return;
      }

      if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        ensureObjectPayload(payload);

        portfolio[section] =
          req.method === 'PATCH'
            ? {
                ...(portfolio[section] || {}),
                ...payload,
              }
            : payload;

        writePortfolio(portfolio);
        sendJson(req, res, 200, {
          message: `${section} updated.`,
          data: portfolio[section],
        });
        return;
      }
    }

    const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);

    if (jobMatch) {
      const jobId = jobMatch[1];
      const currentJob = readJobById(jobId);

      if (!currentJob) {
        sendJson(req, res, 404, { error: `Unknown job id: ${jobId}` });
        return;
      }

      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: currentJob });
        return;
      }

      if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        const nextJob =
          req.method === 'PATCH'
            ? normalizeJobPayload({
                ...currentJob,
                ...payload,
                id: currentJob.id,
              })
            : normalizeJobPayload({
                ...payload,
                id: currentJob.id,
              });

        sendJson(req, res, 200, { message: 'Job updated.', data: updateJob(nextJob) });
        return;
      }

      if (req.method === 'DELETE') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        deleteJob(jobId);
        sendJson(req, res, 200, { message: 'Job deleted.' });
        return;
      }
    }

    const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);

    if (projectMatch) {
      const projectId = projectMatch[1];
      const currentProject = readProjectById(projectId);

      if (!currentProject) {
        sendJson(req, res, 404, { error: `Unknown project id: ${projectId}` });
        return;
      }

      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: currentProject });
        return;
      }

      if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        const nextProject =
          req.method === 'PATCH'
            ? normalizeProjectPayload({
                ...currentProject,
                ...payload,
                id: currentProject.id,
              })
            : normalizeProjectPayload({
                ...payload,
                id: currentProject.id,
              });

        sendJson(req, res, 200, { message: 'Project updated.', data: updateProject(nextProject) });
        return;
      }

      if (req.method === 'DELETE') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        deleteProject(projectId);
        sendJson(req, res, 200, { message: 'Project deleted.' });
        return;
      }
    }

    const featuredProjectMatch = pathname.match(/^\/api\/featured\/([^/]+)$/);

    if (featuredProjectMatch) {
      const featuredProjectId = featuredProjectMatch[1];
      const currentFeaturedProject = readFeaturedProjectById(featuredProjectId);

      if (!currentFeaturedProject) {
        sendJson(req, res, 404, { error: `Unknown featured project id: ${featuredProjectId}` });
        return;
      }

      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: currentFeaturedProject });
        return;
      }

      if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        const payload = await parseRequestBody(req);
        const nextFeaturedProject =
          req.method === 'PATCH'
            ? normalizeFeaturedPayload({
                ...currentFeaturedProject,
                ...payload,
                id: currentFeaturedProject.id,
              })
            : normalizeFeaturedPayload({
                ...payload,
                id: currentFeaturedProject.id,
              });

        sendJson(req, res, 200, {
          message: 'Featured project updated.',
          data: updateFeaturedProject(nextFeaturedProject),
        });
        return;
      }

      if (req.method === 'DELETE') {
        try {
          authenticateAdminRequest(req);
        } catch (error) {
          sendUnauthorized(req, res, error.message);
          return;
        }

        deleteFeaturedProject(featuredProjectId);
        sendJson(req, res, 200, { message: 'Featured project deleted.' });
        return;
      }
    }

    const messageMatch = pathname.match(/^\/api\/messages\/([^/]+)$/);

    if (messageMatch) {
      const messageId = Number(messageMatch[1]);

      if (!Number.isInteger(messageId) || messageId <= 0) {
        sendJson(req, res, 400, { error: 'Message id must be a positive integer.' });
        return;
      }

      try {
        authenticateAdminRequest(req);
      } catch (error) {
        sendUnauthorized(req, res, error.message);
        return;
      }

      const currentMessage = readMessageById(messageId);

      if (!currentMessage) {
        sendJson(req, res, 404, { error: `Unknown message id: ${messageId}` });
        return;
      }

      if (req.method === 'GET') {
        sendJson(req, res, 200, { data: currentMessage });
        return;
      }

      if (req.method === 'PATCH') {
        const payload = await parseRequestBody(req);
        const status = String(payload.status || '').trim();

        if (!status) {
          sendJson(req, res, 400, { error: 'Message status is required.' });
          return;
        }

        sendJson(req, res, 200, {
          message: 'Message status updated.',
          data: updateMessageStatus(messageId, status),
        });
        return;
      }

      if (req.method === 'DELETE') {
        deleteMessage(messageId);
        sendJson(req, res, 200, { message: 'Message deleted.' });
        return;
      }
    }

    sendJson(req, res, 404, { error: 'Route not found.' });
  } catch (error) {
    sendJson(req, res, 400, { error: error.message || 'Unexpected server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Portfolio API running at http://${HOST}:${PORT}`);
});
