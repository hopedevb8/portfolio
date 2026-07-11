const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const rootDir = path.join(__dirname, '..');
const dataDirectoryPath = path.join(__dirname, 'data');
const databaseFilePath = path.join(dataDirectoryPath, 'portfolio.sqlite');
const portfolioFilePath = path.join(rootDir, 'src', 'data', 'portfolio.json');
const jobsFilePath = path.join(rootDir, 'src', 'data', 'jobs.json');
const projectsFilePath = path.join(rootDir, 'src', 'data', 'projects.json');
const featuredFilePath = path.join(rootDir, 'src', 'data', 'featured.json');
const validSections = ['site', 'profile', 'hero', 'about', 'contact'];

const ensureDirectory = directoryPath => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

const readJsonFile = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJsonFile = (filePath, value) => {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const sortByDateDesc = items =>
  [...items].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

const mapJobRow = row => ({
  id: row.id,
  date: row.date,
  title: row.title,
  company: row.company,
  location: row.location,
  range: row.range,
  url: row.url,
  highlights: JSON.parse(row.highlights),
});

const mapProjectRow = row => ({
  id: row.id,
  date: row.date,
  title: row.title,
  github: row.github,
  external: row.external,
  tech: JSON.parse(row.tech),
  company: row.company,
  showInProjects: Boolean(row.show_in_projects),
  ios: row.ios,
  android: row.android,
  description: row.description,
});

const mapFeaturedRow = row => ({
  id: row.id,
  date: row.date,
  title: row.title,
  imageUrl: row.image_url,
  github: row.github,
  external: row.external,
  cta: row.cta,
  tech: JSON.parse(row.tech),
  description: row.description,
});

const createDatabase = () => {
  ensureDirectory(dataDirectoryPath);

  const database = new DatabaseSync(databaseFilePath);

  database.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_sections (
      section TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      range TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      highlights TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      github TEXT NOT NULL DEFAULT '',
      external TEXT NOT NULL DEFAULT '',
      tech TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      show_in_projects INTEGER NOT NULL DEFAULT 1,
      ios TEXT NOT NULL DEFAULT '',
      android TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS featured_projects (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      github TEXT NOT NULL DEFAULT '',
      external TEXT NOT NULL DEFAULT '',
      cta TEXT NOT NULL DEFAULT '',
      tech TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      refresh_token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_used_at TEXT,
      revoked_at TEXT,
      user_agent TEXT NOT NULL DEFAULT ''
    );
  `);

  return database;
};

const database = createDatabase();

const countRows = tableName => database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count;

const seedPortfolio = () => {
  if (countRows('portfolio_sections') > 0) {
    return;
  }

  const portfolio = readJsonFile(portfolioFilePath);
  const insertSection = database.prepare(`
    INSERT INTO portfolio_sections (section, data)
    VALUES (?, ?)
  `);

  database.exec('BEGIN');

  try {
    validSections.forEach(section => {
      insertSection.run(section, JSON.stringify(portfolio[section] || {}));
    });

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
};

const seedJobs = () => {
  if (countRows('jobs') > 0) {
    return;
  }

  const jobs = readJsonFile(jobsFilePath);
  const insertJob = database.prepare(`
    INSERT INTO jobs (id, date, title, company, location, range, url, highlights)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  database.exec('BEGIN');

  try {
    jobs.forEach(job => {
      insertJob.run(
        job.id,
        job.date,
        job.title,
        job.company,
        job.location || '',
        job.range || '',
        job.url || '',
        JSON.stringify(job.highlights || [])
      );
    });

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
};

const seedProjects = () => {
  if (countRows('projects') > 0) {
    return;
  }

  const projects = readJsonFile(projectsFilePath);
  const insertProject = database.prepare(`
    INSERT INTO projects (
      id,
      date,
      title,
      github,
      external,
      tech,
      company,
      show_in_projects,
      ios,
      android,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  database.exec('BEGIN');

  try {
    projects.forEach(project => {
      insertProject.run(
        project.id,
        project.date,
        project.title,
        project.github || '',
        project.external || '',
        JSON.stringify(project.tech || []),
        project.company || '',
        project.showInProjects === false ? 0 : 1,
        project.ios || '',
        project.android || '',
        project.description
      );
    });

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
};

const seedFeaturedProjects = () => {
  if (countRows('featured_projects') > 0) {
    return;
  }

  const featuredProjects = readJsonFile(featuredFilePath);
  const insertFeaturedProject = database.prepare(`
    INSERT INTO featured_projects (
      id,
      date,
      title,
      image_url,
      github,
      external,
      cta,
      tech,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  database.exec('BEGIN');

  try {
    featuredProjects.forEach(project => {
      insertFeaturedProject.run(
        project.id,
        project.date,
        project.title,
        project.imageUrl || '',
        project.github || '',
        project.external || '',
        project.cta || '',
        JSON.stringify(project.tech || []),
        project.description
      );
    });

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
};

const seedDatabase = () => {
  seedPortfolio();
  seedJobs();
  seedProjects();
  seedFeaturedProjects();
};

seedDatabase();

const readPortfolio = () => {
  const rows = database
    .prepare(`
      SELECT section, data
      FROM portfolio_sections
    `)
    .all();

  return rows.reduce((portfolio, row) => {
    portfolio[row.section] = JSON.parse(row.data);
    return portfolio;
  }, {});
};

const syncPortfolioSnapshot = () => {
  writeJsonFile(portfolioFilePath, readPortfolio());
};

const writePortfolio = portfolio => {
  const upsertSection = database.prepare(`
    INSERT INTO portfolio_sections (section, data)
    VALUES (?, ?)
    ON CONFLICT(section) DO UPDATE SET data = excluded.data
  `);

  database.exec('BEGIN');

  try {
    validSections.forEach(section => {
      upsertSection.run(section, JSON.stringify(portfolio[section] || {}));
    });

    database.exec('COMMIT');
    syncPortfolioSnapshot();
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
};

const readJobs = () =>
  sortByDateDesc(
    database
      .prepare(`
        SELECT id, date, title, company, location, range, url, highlights
        FROM jobs
      `)
      .all()
      .map(mapJobRow)
  );

const syncJobsSnapshot = () => {
  writeJsonFile(jobsFilePath, readJobs());
};

const createJob = job => {
  database
    .prepare(`
      INSERT INTO jobs (id, date, title, company, location, range, url, highlights)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      job.id,
      job.date,
      job.title,
      job.company,
      job.location || '',
      job.range || '',
      job.url || '',
      JSON.stringify(job.highlights || [])
    );

  syncJobsSnapshot();

  return job;
};

const readJobById = jobId => {
  const row = database
    .prepare(`
      SELECT id, date, title, company, location, range, url, highlights
      FROM jobs
      WHERE id = ?
    `)
    .get(jobId);

  return row ? mapJobRow(row) : null;
};

const updateJob = job => {
  const result = database
    .prepare(`
      UPDATE jobs
      SET date = ?,
          title = ?,
          company = ?,
          location = ?,
          range = ?,
          url = ?,
          highlights = ?
      WHERE id = ?
    `)
    .run(
      job.date,
      job.title,
      job.company,
      job.location || '',
      job.range || '',
      job.url || '',
      JSON.stringify(job.highlights || []),
      job.id
    );

  if (result.changes === 0) {
    return null;
  }

  syncJobsSnapshot();

  return job;
};

const deleteJob = jobId => {
  const result = database
    .prepare(`
      DELETE FROM jobs
      WHERE id = ?
    `)
    .run(jobId);

  if (result.changes > 0) {
    syncJobsSnapshot();
    return true;
  }

  return false;
};

const readProjects = () =>
  sortByDateDesc(
    database
      .prepare(`
        SELECT id, date, title, github, external, tech, company, show_in_projects, ios, android, description
        FROM projects
      `)
      .all()
      .map(mapProjectRow)
  );

const syncProjectsSnapshot = () => {
  writeJsonFile(projectsFilePath, readProjects());
};

const createProject = project => {
  database
    .prepare(`
      INSERT INTO projects (
        id,
        date,
        title,
        github,
        external,
        tech,
        company,
        show_in_projects,
        ios,
        android,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      project.id,
      project.date,
      project.title,
      project.github || '',
      project.external || '',
      JSON.stringify(project.tech || []),
      project.company || '',
      project.showInProjects === false ? 0 : 1,
      project.ios || '',
      project.android || '',
      project.description
    );

  syncProjectsSnapshot();

  return project;
};

const readProjectById = projectId => {
  const row = database
    .prepare(`
      SELECT id, date, title, github, external, tech, company, show_in_projects, ios, android, description
      FROM projects
      WHERE id = ?
    `)
    .get(projectId);

  return row ? mapProjectRow(row) : null;
};

const updateProject = project => {
  const result = database
    .prepare(`
      UPDATE projects
      SET date = ?,
          title = ?,
          github = ?,
          external = ?,
          tech = ?,
          company = ?,
          show_in_projects = ?,
          ios = ?,
          android = ?,
          description = ?
      WHERE id = ?
    `)
    .run(
      project.date,
      project.title,
      project.github || '',
      project.external || '',
      JSON.stringify(project.tech || []),
      project.company || '',
      project.showInProjects === false ? 0 : 1,
      project.ios || '',
      project.android || '',
      project.description,
      project.id
    );

  if (result.changes === 0) {
    return null;
  }

  syncProjectsSnapshot();

  return project;
};

const deleteProject = projectId => {
  const result = database
    .prepare(`
      DELETE FROM projects
      WHERE id = ?
    `)
    .run(projectId);

  if (result.changes > 0) {
    syncProjectsSnapshot();
    return true;
  }

  return false;
};

const readFeaturedProjects = () =>
  [...database
    .prepare(`
      SELECT id, date, title, image_url, github, external, cta, tech, description
      FROM featured_projects
    `)
    .all()
    .map(mapFeaturedRow)].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
  );

const syncFeaturedSnapshot = () => {
  writeJsonFile(featuredFilePath, readFeaturedProjects());
};

const createFeaturedProject = project => {
  database
    .prepare(`
      INSERT INTO featured_projects (
        id,
        date,
        title,
        image_url,
        github,
        external,
        cta,
        tech,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      project.id,
      project.date,
      project.title,
      project.imageUrl || '',
      project.github || '',
      project.external || '',
      project.cta || '',
      JSON.stringify(project.tech || []),
      project.description
    );

  syncFeaturedSnapshot();

  return project;
};

const readFeaturedProjectById = featuredProjectId => {
  const row = database
    .prepare(`
      SELECT id, date, title, image_url, github, external, cta, tech, description
      FROM featured_projects
      WHERE id = ?
    `)
    .get(featuredProjectId);

  return row ? mapFeaturedRow(row) : null;
};

const updateFeaturedProject = project => {
  const result = database
    .prepare(`
      UPDATE featured_projects
      SET date = ?,
          title = ?,
          image_url = ?,
          github = ?,
          external = ?,
          cta = ?,
          tech = ?,
          description = ?
      WHERE id = ?
    `)
    .run(
      project.date,
      project.title,
      project.imageUrl || '',
      project.github || '',
      project.external || '',
      project.cta || '',
      JSON.stringify(project.tech || []),
      project.description,
      project.id
    );

  if (result.changes === 0) {
    return null;
  }

  syncFeaturedSnapshot();

  return project;
};

const deleteFeaturedProject = featuredProjectId => {
  const result = database
    .prepare(`
      DELETE FROM featured_projects
      WHERE id = ?
    `)
    .run(featuredProjectId);

  if (result.changes > 0) {
    syncFeaturedSnapshot();
    return true;
  }

  return false;
};

const mapMessageRow = row => ({
  id: row.id,
  name: row.name,
  email: row.email,
  subject: row.subject,
  message: row.message,
  status: row.status,
  createdAt: row.created_at,
});

const readMessages = () =>
  database
    .prepare(`
      SELECT id, name, email, subject, message, status, created_at
      FROM messages
      ORDER BY datetime(created_at) DESC, id DESC
    `)
    .all()
    .map(mapMessageRow);

const createMessage = message => {
  const createdAt = message.createdAt || new Date().toISOString();

  const result = database
    .prepare(`
      INSERT INTO messages (name, email, subject, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(message.name, message.email, message.subject, message.message, message.status || 'new', createdAt);

  return {
    id: Number(result.lastInsertRowid),
    name: message.name,
    email: message.email,
    subject: message.subject,
    message: message.message,
    status: message.status || 'new',
    createdAt,
  };
};

const readMessageById = messageId => {
  const row = database
    .prepare(`
      SELECT id, name, email, subject, message, status, created_at
      FROM messages
      WHERE id = ?
    `)
    .get(messageId);

  return row ? mapMessageRow(row) : null;
};

const updateMessageStatus = (messageId, status) => {
  const result = database
    .prepare(`
      UPDATE messages
      SET status = ?
      WHERE id = ?
    `)
    .run(status, messageId);

  if (result.changes === 0) {
    return null;
  }

  return readMessageById(messageId);
};

const deleteMessage = messageId => {
  const result = database
    .prepare(`
      DELETE FROM messages
      WHERE id = ?
    `)
    .run(messageId);

  return result.changes > 0;
};

const mapAdminSessionRow = row => ({
  id: row.id,
  userName: row.user_name,
  refreshTokenHash: row.refresh_token_hash,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastUsedAt: row.last_used_at,
  revokedAt: row.revoked_at,
  userAgent: row.user_agent,
});

const createAdminSession = session => {
  database
    .prepare(`
      INSERT INTO admin_sessions (
        id,
        user_name,
        refresh_token_hash,
        expires_at,
        created_at,
        updated_at,
        last_used_at,
        revoked_at,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      session.id,
      session.userName,
      session.refreshTokenHash,
      session.expiresAt,
      session.createdAt,
      session.updatedAt,
      session.lastUsedAt || null,
      session.revokedAt || null,
      session.userAgent || '',
    );

  return readAdminSessionById(session.id);
};

const readAdminSessionById = sessionId => {
  const row = database
    .prepare(`
      SELECT id, user_name, refresh_token_hash, expires_at, created_at, updated_at, last_used_at, revoked_at, user_agent
      FROM admin_sessions
      WHERE id = ?
    `)
    .get(sessionId);

  return row ? mapAdminSessionRow(row) : null;
};

const updateAdminSession = session => {
  const result = database
    .prepare(`
      UPDATE admin_sessions
      SET refresh_token_hash = ?,
          expires_at = ?,
          updated_at = ?,
          last_used_at = ?,
          revoked_at = ?,
          user_agent = ?
      WHERE id = ?
    `)
    .run(
      session.refreshTokenHash,
      session.expiresAt,
      session.updatedAt,
      session.lastUsedAt || null,
      session.revokedAt || null,
      session.userAgent || '',
      session.id,
    );

  if (result.changes === 0) {
    return null;
  }

  return readAdminSessionById(session.id);
};

const revokeAdminSession = sessionId => {
  const now = new Date().toISOString();
  const result = database
    .prepare(`
      UPDATE admin_sessions
      SET revoked_at = ?,
          updated_at = ?,
          last_used_at = ?
      WHERE id = ?
    `)
    .run(now, now, now, sessionId);

  if (result.changes === 0) {
    return null;
  }

  return readAdminSessionById(sessionId);
};

module.exports = {
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
};
