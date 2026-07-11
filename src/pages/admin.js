import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Helmet } from 'react-helmet';
import { Layout } from '@components';
import { getApiBaseUrl } from '@utils';
import { AdminAuthProvider, useAdminAuth } from '../context/adminAuth';

const StyledMainContainer = styled.main`
  max-width: 1400px;
`;

const StyledAdminPage = styled.div`
  display: grid;
  gap: 32px;

  .admin-header {
    display: grid;
    gap: 12px;
  }

  .admin-utility-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .admin-title {
    margin: 0;
    font-size: clamp(36px, 5vw, 52px);
  }

  .admin-subtitle {
    max-width: 760px;
    color: var(--light-slate);
    font-size: var(--fz-lg);
  }

  .admin-warning {
    padding: 18px 20px;
    border: 1px solid rgba(245, 125, 255, 0.35);
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(245, 125, 255, 0.12), rgba(87, 203, 255, 0.08));
    color: var(--lightest-slate);
    font-size: var(--fz-sm);
  }

  .auth-card {
    ${({ theme }) => theme.mixins.boxShadow};
    width: min(100%, 560px);
    padding: 32px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(17, 34, 64, 0.98), rgba(2, 12, 27, 1));
  }

  .auth-title {
    margin: 0 0 8px;
    font-size: clamp(28px, 4vw, 38px);
  }

  .auth-copy {
    margin-bottom: 24px;
    color: var(--light-slate);
    font-size: var(--fz-md);
    line-height: 1.7;
  }

  .admin-grid {
    display: grid;
    grid-template-columns: 1;
    gap: 24px;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .tabs {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .tab-button {
    ${({ theme }) => theme.mixins.smallButton};
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    border-color: ${({ isActive }) => (isActive ? 'var(--green)' : 'var(--lightest-navy)')};
    color: ${({ isActive }) => (isActive ? 'var(--green)' : 'var(--light-slate)')};
    box-shadow: ${({ isActive }) => (isActive ? '3px 3px 0 0 var(--green)' : 'none')};
    transform: ${({ isActive }) => (isActive ? 'translate(-4px, -4px)' : 'none')};

    &:hover,
    &:focus-visible {
      border-color: var(--green);
    }
  }

  .panel {
    ${({ theme }) => theme.mixins.boxShadow};
    padding: 28px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(17, 34, 64, 0.96), rgba(10, 25, 47, 0.98));
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;

    @media (max-width: 768px) {
      flex-direction: column;
    }
  }

  .panel-title {
    margin: 0 0 8px;
    font-size: clamp(26px, 4vw, 34px);
  }

  .panel-copy {
    color: var(--light-slate);
    font-size: var(--fz-md);
  }

  .status-pill {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(100, 255, 218, 0.12);
    color: var(--green);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    white-space: nowrap;
  }

  .status-pill.error {
    background: rgba(255, 107, 107, 0.12);
    color: #ff8a8a;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
    gap: 24px;

    @media (max-width: 1080px) {
      grid-template-columns: 1fr;
    }
  }

  .editor-card,
  .list-card {
    border: 1px solid var(--lightest-navy);
    border-radius: 14px;
    background: rgba(17, 34, 64, 0.72);
    padding: 20px;
  }

  .editor-card h3,
  .list-card h3 {
    margin: 0 0 16px;
    font-size: var(--fz-xl);
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 14px;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }

  .field label {
    color: var(--lightest-slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    letter-spacing: 0.02em;
  }

  .field input,
  .field textarea,
  .field select {
    width: 100%;
    border: 1px solid var(--lightest-navy);
    border-radius: 10px;
    background: rgba(2, 12, 27, 0.82);
    color: var(--lightest-slate);
    padding: 12px 14px;
    font-size: var(--fz-sm);
    transition: var(--transition);

    &:focus {
      outline: none;
      border-color: var(--green);
      box-shadow: 0 0 0 1px var(--green);
    }
  }

  .field textarea {
    min-height: 120px;
    resize: vertical;
  }

  .field small {
    color: var(--light-slate);
    font-size: var(--fz-xxs);
    line-height: 1.6;
  }

  .form-status {
    margin-top: 14px;
    color: var(--light-slate);
    font-size: var(--fz-sm);
    line-height: 1.6;
  }

  .form-status.error {
    color: #ff8a8a;
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    color: var(--lightest-slate);
    font-size: var(--fz-sm);
  }

  .checkbox-field input {
    width: auto;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .primary-button {
    ${({ theme }) => theme.mixins.bigButton};
  }

  .secondary-button {
    ${({ theme }) => theme.mixins.smallButton};
    border-color: var(--lightest-navy);
    color: var(--light-slate);
  }

  .ghost-button {
    ${({ theme }) => theme.mixins.link};
    color: var(--light-slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xs);
  }

  .item-list {
    display: grid;
    gap: 14px;
  }

  .item-card {
    padding: 16px;
    border: 1px solid var(--lightest-navy);
    border-radius: 12px;
    background: rgba(2, 12, 27, 0.58);
  }

  .item-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 10px;

    @media (max-width: 600px) {
      flex-direction: column;
    }
  }

  .item-title {
    margin: 0 0 6px;
    font-size: var(--fz-lg);
  }

  .item-meta {
    color: var(--light-slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    line-height: 1.7;
  }

  .item-copy {
    color: var(--light-slate);
    font-size: var(--fz-sm);
    line-height: 1.7;
    white-space: pre-line;
  }

  .item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }

  .item-tags li {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(100, 255, 218, 0.12);
    color: var(--green);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
  }

  .item-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .item-action {
    ${({ theme }) => theme.mixins.smallButton};
    padding: 0.65rem 0.9rem;
    font-size: var(--fz-xxs);
  }

  .item-action.delete {
    border-color: rgba(255, 107, 107, 0.5);
    color: #ff8a8a;
  }

  .empty-state {
    padding: 18px;
    border: 1px dashed var(--lightest-navy);
    border-radius: 12px;
    color: var(--light-slate);
    text-align: center;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(2, 12, 27, 0.78);
    backdrop-filter: blur(8px);
  }

  .modal-card {
    width: min(100%, 520px);
    padding: 28px;
    border: 1px solid rgba(255, 107, 107, 0.28);
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(17, 34, 64, 0.98), rgba(2, 12, 27, 1));
    box-shadow: 0 22px 60px rgba(2, 12, 27, 0.55);
  }

  .modal-eyebrow {
    margin-bottom: 10px;
    color: #ff8a8a;
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .modal-title {
    margin: 0 0 10px;
    font-size: clamp(24px, 3vw, 32px);
  }

  .modal-copy {
    color: var(--light-slate);
    font-size: var(--fz-sm);
    line-height: 1.7;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    flex-wrap: wrap;
  }
`;

const resourceTabs = [
  {
    id: 'featured',
    label: 'Featured',
    description: 'Manage the Selected Work section on the homepage.',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    description: 'Add, edit, or delete experience items.',
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Manage cards in the More Projects section.',
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Review contact form submissions from the site.',
  },
];

const initialJobForm = {
  date: '',
  title: '',
  company: '',
  location: '',
  range: '',
  url: '',
  highlightsText: '',
};

const initialFeaturedForm = {
  date: '',
  title: '',
  imageUrl: '',
  github: '',
  external: '',
  cta: '',
  techText: '',
  description: '',
};

const initialProjectForm = {
  date: '',
  title: '',
  github: '',
  external: '',
  techText: '',
  company: '',
  ios: '',
  android: '',
  description: '',
  showInProjects: true,
};

const messageStatusOptions = ['new', 'reviewed', 'archived'];

const normalizeLines = value =>
  value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

const normalizeCommaList = value =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const formatJobForm = job => ({
  date: job.date || '',
  title: job.title || '',
  company: job.company || '',
  location: job.location || '',
  range: job.range || '',
  url: job.url || '',
  highlightsText: Array.isArray(job.highlights) ? job.highlights.join('\n') : '',
});

const formatFeaturedForm = project => ({
  date: project.date || '',
  title: project.title || '',
  imageUrl: project.imageUrl || '',
  github: project.github || '',
  external: project.external || '',
  cta: project.cta || '',
  techText: Array.isArray(project.tech) ? project.tech.join(', ') : '',
  description: project.description || '',
});

const formatProjectForm = project => ({
  date: project.date || '',
  title: project.title || '',
  github: project.github || '',
  external: project.external || '',
  techText: Array.isArray(project.tech) ? project.tech.join(', ') : '',
  company: project.company || '',
  ios: project.ios || '',
  android: project.android || '',
  description: project.description || '',
  showInProjects: project.showInProjects !== false,
});

const AdminPage = ({ location }) => {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const { authStatus, user, authReason, login, logout, apiClient, isAuthenticated } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('jobs');
  const [featuredItems, setFeaturedItems] = useState([]);
  const [jobItems, setJobItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  const [messageItems, setMessageItems] = useState([]);
  const [featuredForm, setFeaturedForm] = useState(initialFeaturedForm);
  const [jobForm, setJobForm] = useState(initialJobForm);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [editingFeaturedId, setEditingFeaturedId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({
    kind: 'idle',
    text: '',
  });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  const request = async (endpoint, options = {}) => {
    const nextHeaders = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    return apiClient.request(endpoint, {
      ...options,
      headers: nextHeaders,
    });
  };

  const loadAllResources = async ({ clearStatus = true } = {}) => {
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);
    if (clearStatus) {
      setStatusMessage({
        kind: 'idle',
        text: '',
      });
    }

    try {
      const [featuredResponse, jobsResponse, projectsResponse, messagesResponse] = await Promise.all([
        request('/api/featured'),
        request('/api/jobs'),
        request('/api/projects'),
        request('/api/messages'),
      ]);

      setFeaturedItems(featuredResponse.data || []);
      setJobItems(jobsResponse.data || []);
      setProjectItems(projectsResponse.data || []);
      setMessageItems(messagesResponse.data || []);
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllResources();
      return;
    }

    setFeaturedItems([]);
    setJobItems([]);
    setProjectItems([]);
    setMessageItems([]);
  }, [isAuthenticated]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      setAuthError('');
      return;
    }

    if (authReason === 'refresh_failed' || authReason === 'session_missing') {
      setAuthError('Your admin session expired. Sign in again to continue.');
      setPendingDelete(null);
      return;
    }

    if (authReason === 'logout') {
      setAuthError('');
      setPendingDelete(null);
    }
  }, [authReason, authStatus]);

  const handleCredentialChange = event => {
    const { name, value } = event.target;

    setCredentials(currentState => ({
      ...currentState,
      [name]: value,
    }));
  };

  const handleFeaturedChange = event => {
    const { name, value } = event.target;
    setFeaturedForm(currentState => ({
      ...currentState,
      [name]: value,
    }));
  };

  const handleLogin = async event => {
    event.preventDefault();

    if (!apiBaseUrl) {
      setAuthError('API is not available. Start the backend before using admin login.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      await login(credentials);
      setCredentials({
        username: '',
        password: '',
      });
    } catch (error) {
      setAuthError(error.message || 'Login failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleJobChange = event => {
    const { name, value } = event.target;
    setJobForm(currentState => ({
      ...currentState,
      [name]: value,
    }));
  };

  const handleProjectChange = event => {
    const { name, value, type, checked } = event.target;
    setProjectForm(currentState => ({
      ...currentState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetJobEditor = () => {
    setEditingJobId(null);
    setJobForm(initialJobForm);
  };

  const resetFeaturedEditor = () => {
    setEditingFeaturedId(null);
    setFeaturedForm(initialFeaturedForm);
  };

  const resetProjectEditor = () => {
    setEditingProjectId(null);
    setProjectForm(initialProjectForm);
  };

  const submitFeatured = async event => {
    event.preventDefault();

    const payload = {
      date: featuredForm.date,
      title: featuredForm.title,
      imageUrl: featuredForm.imageUrl,
      github: featuredForm.github,
      external: featuredForm.external,
      cta: featuredForm.cta,
      tech: normalizeCommaList(featuredForm.techText),
      description: featuredForm.description,
    };

    try {
      setIsLoading(true);
      const endpoint = editingFeaturedId ? `/api/featured/${editingFeaturedId}` : '/api/featured';
      const method = editingFeaturedId ? 'PATCH' : 'POST';

      await request(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setStatusMessage({
        kind: 'success',
        text: editingFeaturedId ? 'Featured project updated.' : 'Featured project created.',
      });
      resetFeaturedEditor();
      await loadAllResources({ clearStatus: false });
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error.message,
      });
      setIsLoading(false);
    }
  };

  const submitJob = async event => {
    event.preventDefault();

    const payload = {
      date: jobForm.date,
      title: jobForm.title,
      company: jobForm.company,
      location: jobForm.location,
      range: jobForm.range,
      url: jobForm.url,
      highlights: normalizeLines(jobForm.highlightsText),
    };

    try {
      setIsLoading(true);
      const endpoint = editingJobId ? `/api/jobs/${editingJobId}` : '/api/jobs';
      const method = editingJobId ? 'PATCH' : 'POST';

      await request(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setStatusMessage({
        kind: 'success',
        text: editingJobId ? 'Job updated.' : 'Job created.',
      });
      resetJobEditor();
      await loadAllResources({ clearStatus: false });
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error.message,
      });
      setIsLoading(false);
    }
  };

  const submitProject = async event => {
    event.preventDefault();

    const payload = {
      date: projectForm.date,
      title: projectForm.title,
      github: projectForm.github,
      external: projectForm.external,
      tech: normalizeCommaList(projectForm.techText),
      company: projectForm.company,
      ios: projectForm.ios,
      android: projectForm.android,
      description: projectForm.description,
      showInProjects: projectForm.showInProjects,
    };

    try {
      setIsLoading(true);
      const endpoint = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
      const method = editingProjectId ? 'PATCH' : 'POST';

      await request(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setStatusMessage({
        kind: 'success',
        text: editingProjectId ? 'Project updated.' : 'Project created.',
      });
      resetProjectEditor();
      await loadAllResources({ clearStatus: false });
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error.message,
      });
      setIsLoading(false);
    }
  };

  const openDeleteModal = ({ endpoint, successText, title, description }) => {
    setPendingDelete({
      endpoint,
      successText,
      title,
      description,
    });
  };

  const closeDeleteModal = () => {
    if (isLoading) {
      return;
    }

    setPendingDelete(null);
  };

  const confirmDeleteResource = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      setIsLoading(true);
      await request(pendingDelete.endpoint, { method: 'DELETE' });
      setStatusMessage({
        kind: 'success',
        text: pendingDelete.successText,
      });
      setPendingDelete(null);
      await loadAllResources({ clearStatus: false });
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error.message,
      });
      setIsLoading(false);
    }
  };

  const updateMessageStatus = async (id, status) => {
    try {
      setIsLoading(true);
      await request(`/api/messages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setStatusMessage({
        kind: 'success',
        text: `Message #${id} marked as ${status}.`,
      });
      await loadAllResources({ clearStatus: false });
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error.message,
      });
      setIsLoading(false);
    }
  };

  const renderFeaturedPanel = () => (
    <div className="panel-grid">
      <div className="editor-card">
        <h3>{editingFeaturedId ? 'Edit Featured Project' : 'Create Featured Project'}</h3>

        <form onSubmit={submitFeatured}>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="featured-date">Date</label>
              <input
                id="featured-date"
                name="date"
                type="date"
                value={featuredForm.date}
                onChange={handleFeaturedChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="featured-title">Title</label>
              <input
                id="featured-title"
                name="title"
                type="text"
                value={featuredForm.title}
                onChange={handleFeaturedChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="featured-image-url">Image URL</label>
            <input
              id="featured-image-url"
              name="imageUrl"
              type="text"
              value={featuredForm.imageUrl}
              onChange={handleFeaturedChange}
              placeholder="/featured/example-cover.png"
              required
            />
            <small>
              Featured images now use static paths. Put files in `static/featured` and reference
              them like `/featured/your-image.png`.
            </small>
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="featured-github">GitHub URL</label>
              <input
                id="featured-github"
                name="github"
                type="url"
                value={featuredForm.github}
                onChange={handleFeaturedChange}
              />
            </div>

            <div className="field">
              <label htmlFor="featured-external">External URL</label>
              <input
                id="featured-external"
                name="external"
                type="url"
                value={featuredForm.external}
                onChange={handleFeaturedChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="featured-cta">CTA URL</label>
            <input
              id="featured-cta"
              name="cta"
              type="url"
              value={featuredForm.cta}
              onChange={handleFeaturedChange}
            />
          </div>

          <div className="field">
            <label htmlFor="featured-tech">Tech (comma-separated)</label>
            <input
              id="featured-tech"
              name="techText"
              type="text"
              value={featuredForm.techText}
              onChange={handleFeaturedChange}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="featured-description">Description</label>
            <textarea
              id="featured-description"
              name="description"
              value={featuredForm.description}
              onChange={handleFeaturedChange}
              required
            />
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isLoading}>
              {editingFeaturedId ? 'Update Featured Project' : 'Create Featured Project'}
            </button>
            {editingFeaturedId && (
              <button className="secondary-button" type="button" onClick={resetFeaturedEditor}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="list-card">
        <h3>Featured Projects ({featuredItems.length})</h3>

        <div className="item-list">
          {featuredItems.length === 0 ? (
            <div className="empty-state">No featured projects yet.</div>
          ) : (
            featuredItems.map(project => (
              <article className="item-card" key={project.id}>
                <div className="item-head">
                  <div>
                    <h4 className="item-title">{project.title}</h4>
                    <div className="item-meta">
                      {project.date}
                      <br />
                      {project.imageUrl}
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="item-action"
                      type="button"
                      onClick={() => {
                        setEditingFeaturedId(project.id);
                        setFeaturedForm(formatFeaturedForm(project));
                      }}>
                      Edit
                    </button>
                    <button
                      className="item-action delete"
                      type="button"
                      onClick={() =>
                        openDeleteModal({
                          endpoint: `/api/featured/${project.id}`,
                          successText: 'Featured project deleted.',
                          title: `Delete ${project.title}?`,
                          description:
                            'This will permanently remove the project from the Selected Work section and the public featured API.',
                        })
                      }>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="item-copy">{project.description}</div>
                <ul className="item-tags">
                  {project.tech.map(tag => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderJobsPanel = () => (
    <div className="panel-grid">
      <div className="editor-card">
        <h3>{editingJobId ? 'Edit Job' : 'Create Job'}</h3>

        <form onSubmit={submitJob}>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="job-date">Date</label>
              <input id="job-date" name="date" type="date" value={jobForm.date} onChange={handleJobChange} required />
            </div>

            <div className="field">
              <label htmlFor="job-range">Range</label>
              <input id="job-range" name="range" type="text" value={jobForm.range} onChange={handleJobChange} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="job-title">Title</label>
            <input id="job-title" name="title" type="text" value={jobForm.title} onChange={handleJobChange} required />
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="job-company">Company</label>
              <input id="job-company" name="company" type="text" value={jobForm.company} onChange={handleJobChange} required />
            </div>

            <div className="field">
              <label htmlFor="job-location">Location</label>
              <input id="job-location" name="location" type="text" value={jobForm.location} onChange={handleJobChange} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="job-url">Company URL</label>
            <input id="job-url" name="url" type="url" value={jobForm.url} onChange={handleJobChange} />
          </div>

          <div className="field">
            <label htmlFor="job-highlights">Highlights (one line per item)</label>
            <textarea
              id="job-highlights"
              name="highlightsText"
              value={jobForm.highlightsText}
              onChange={handleJobChange}
              required
            />
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isLoading}>
              {editingJobId ? 'Update Job' : 'Create Job'}
            </button>
            {editingJobId && (
              <button className="secondary-button" type="button" onClick={resetJobEditor}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="list-card">
        <h3>Jobs ({jobItems.length})</h3>

        <div className="item-list">
          {jobItems.length === 0 ? (
            <div className="empty-state">No jobs yet.</div>
          ) : (
            jobItems.map(job => (
              <article className="item-card" key={job.id}>
                <div className="item-head">
                  <div>
                    <h4 className="item-title">{job.title}</h4>
                    <div className="item-meta">
                      {job.company} · {job.location || 'N/A'}
                      <br />
                      {job.range} · {job.date}
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="item-action"
                      type="button"
                      onClick={() => {
                        setEditingJobId(job.id);
                        setJobForm(formatJobForm(job));
                      }}>
                      Edit
                    </button>
                    <button
                      className="item-action delete"
                      type="button"
                      onClick={() =>
                        openDeleteModal({
                          endpoint: `/api/jobs/${job.id}`,
                          successText: 'Job deleted.',
                          title: `Delete ${job.title}?`,
                          description: `This will permanently remove the ${job.company} experience entry from the CMS and the public jobs API.`,
                        })
                      }>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="item-copy">{job.highlights.join('\n')}</div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderProjectsPanel = () => (
    <div className="panel-grid">
      <div className="editor-card">
        <h3>{editingProjectId ? 'Edit Project' : 'Create Project'}</h3>

        <form onSubmit={submitProject}>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="project-date">Date</label>
              <input
                id="project-date"
                name="date"
                type="date"
                value={projectForm.date}
                onChange={handleProjectChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="project-company">Company</label>
              <input
                id="project-company"
                name="company"
                type="text"
                value={projectForm.company}
                onChange={handleProjectChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="project-title">Title</label>
            <input
              id="project-title"
              name="title"
              type="text"
              value={projectForm.title}
              onChange={handleProjectChange}
              required
            />
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="project-github">GitHub URL</label>
              <input id="project-github" name="github" type="url" value={projectForm.github} onChange={handleProjectChange} />
            </div>

            <div className="field">
              <label htmlFor="project-external">External URL</label>
              <input
                id="project-external"
                name="external"
                type="url"
                value={projectForm.external}
                onChange={handleProjectChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="project-tech">Tech (comma-separated)</label>
            <input id="project-tech" name="techText" type="text" value={projectForm.techText} onChange={handleProjectChange} required />
          </div>

          <div className="field-grid">
            <div className="field">
              <label htmlFor="project-ios">iOS URL</label>
              <input id="project-ios" name="ios" type="url" value={projectForm.ios} onChange={handleProjectChange} />
            </div>

            <div className="field">
              <label htmlFor="project-android">Android URL</label>
              <input
                id="project-android"
                name="android"
                type="url"
                value={projectForm.android}
                onChange={handleProjectChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              name="description"
              value={projectForm.description}
              onChange={handleProjectChange}
              required
            />
          </div>

          <label className="checkbox-field" htmlFor="project-show">
            <input
              id="project-show"
              name="showInProjects"
              type="checkbox"
              checked={projectForm.showInProjects}
              onChange={handleProjectChange}
            />
            Show in project grid
          </label>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isLoading}>
              {editingProjectId ? 'Update Project' : 'Create Project'}
            </button>
            {editingProjectId && (
              <button className="secondary-button" type="button" onClick={resetProjectEditor}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="list-card">
        <h3>Projects ({projectItems.length})</h3>

        <div className="item-list">
          {projectItems.length === 0 ? (
            <div className="empty-state">No projects yet.</div>
          ) : (
            projectItems.map(project => (
              <article className="item-card" key={project.id}>
                <div className="item-head">
                  <div>
                    <h4 className="item-title">{project.title}</h4>
                    <div className="item-meta">
                      {project.company || 'Independent'} · {project.date}
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="item-action"
                      type="button"
                      onClick={() => {
                        setEditingProjectId(project.id);
                        setProjectForm(formatProjectForm(project));
                      }}>
                      Edit
                    </button>
                    <button
                      className="item-action delete"
                      type="button"
                      onClick={() =>
                        openDeleteModal({
                          endpoint: `/api/projects/${project.id}`,
                          successText: 'Project deleted.',
                          title: `Delete ${project.title}?`,
                          description: 'This will permanently remove the project card from the CMS and the public projects API.',
                        })
                      }>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="item-copy">{project.description}</div>
                <ul className="item-tags">
                  {project.tech.map(tag => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderMessagesPanel = () => (
    <div className="panel-grid">
      <div className="editor-card">
        <h3>Inbox Actions</h3>
        <p className="item-copy">
          Messages come from the contact form on the public portfolio. Use status updates to track
          whether a lead is new, reviewed, or archived. Delete only when you intentionally want to
          remove a record from the inbox.
        </p>
      </div>

      <div className="list-card">
        <h3>Messages ({messageItems.length})</h3>

        <div className="item-list">
          {messageItems.length === 0 ? (
            <div className="empty-state">Inbox is empty.</div>
          ) : (
            messageItems.map(message => (
              <article className="item-card" key={message.id}>
                <div className="item-head">
                  <div>
                    <h4 className="item-title">{message.subject}</h4>
                    <div className="item-meta">
                      #{message.id} · {message.name} · {message.email}
                      <br />
                      {message.createdAt} · status: {message.status}
                    </div>
                  </div>

                  <div className="item-actions">
                    {messageStatusOptions
                      .filter(status => status !== message.status)
                      .map(status => (
                        <button
                          className="item-action"
                          key={status}
                          type="button"
                          onClick={() => updateMessageStatus(message.id, status)}>
                          Mark {status}
                        </button>
                      ))}
                    <button
                      className="item-action delete"
                      type="button"
                      onClick={() =>
                        openDeleteModal({
                          endpoint: `/api/messages/${message.id}`,
                          successText: 'Message deleted.',
                          title: `Delete message #${message.id}?`,
                          description: 'This will permanently remove the contact submission from the inbox.',
                        })
                      }>
                      Delete
                    </button>
                  </div>
                </div>

                <div className="item-copy">{message.message}</div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const activeTabConfig = resourceTabs.find(tab => tab.id === activeTab) || resourceTabs[0];

  return (
    <Layout location={location}>
      <Helmet title="Admin CMS" />

      <StyledMainContainer>
        <StyledAdminPage>
          <div className="admin-header">
            <div className="admin-utility-row">
              <h1 className="admin-title">Portfolio CMS</h1>
              {isAuthenticated && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={async () => {
                    await logout();
                    setStatusMessage({
                      kind: 'idle',
                      text: '',
                    });
                  }}>
                  Logout {user?.username ? `(${user.username})` : ''}
                </button>
              )}
            </div>
            <div className="admin-subtitle">
              Manage portfolio content directly from the project. This page talks to your local API
              and uses a SQLite-backed backend with short-lived access tokens and refresh-session
              auth for admin actions.
            </div>
            <div className="admin-warning">
              This CMS is now protected by backend auth. For production use, set strong admin
              credentials and token secrets in your environment.
            </div>
          </div>

          {authStatus === 'checking' && (
            <div className="auth-card">
              <h2 className="auth-title">Checking admin session</h2>
              <div className="auth-copy">
                Restoring your session through the refresh flow before loading the CMS.
              </div>
            </div>
          )}

          {authStatus === 'unavailable' && (
            <div className="auth-card">
              <h2 className="auth-title">API unavailable</h2>
              <div className="auth-copy">
                The admin CMS needs the Node.js backend running. Start `npm run api`, then reload
                this page.
              </div>
            </div>
          )}

          {authStatus === 'unauthenticated' && (
            <div className="auth-card">
              <h2 className="auth-title">Admin login</h2>
              <div className="auth-copy">
                Sign in with the admin credentials configured for the backend. Access tokens are
                short-lived and the frontend refreshes them automatically through the centralized
                API client.
              </div>

              <form onSubmit={handleLogin}>
                <div className="field">
                  <label htmlFor="admin-username">Username</label>
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={credentials.username}
                    onChange={handleCredentialChange}
                    disabled={isAuthenticating}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="admin-password">Password</label>
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={credentials.password}
                    onChange={handleCredentialChange}
                    disabled={isAuthenticating}
                    required
                  />
                  <small>
                    Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`, and
                    `ADMIN_ACCESS_TOKEN_SECRET` in your local environment before deploying.
                  </small>
                </div>

                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={isAuthenticating}>
                    {isAuthenticating ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>

                {authError && <p className="form-status error">{authError}</p>}
              </form>
            </div>
          )}

          {isAuthenticated && (
            <div className="admin-grid">
              <div className="tabs">
                {resourceTabs.map(tab => (
                  <button
                    key={tab.id}
                    className="tab-button"
                    isActive={activeTab === tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}>
                    {tab.label}
                  </button>
                ))}
                <button className="ghost-button" type="button" onClick={loadAllResources}>
                  {isLoading ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">{activeTabConfig.label}</h2>
                    <div className="panel-copy">{activeTabConfig.description}</div>
                  </div>

                  {statusMessage.text && (
                    <div className={`status-pill ${statusMessage.kind === 'error' ? 'error' : ''}`}>
                      {statusMessage.text}
                    </div>
                  )}
                </div>

                {activeTab === 'featured' && renderFeaturedPanel()}
                {activeTab === 'jobs' && renderJobsPanel()}
                {activeTab === 'projects' && renderProjectsPanel()}
                {activeTab === 'messages' && renderMessagesPanel()}
              </div>
            </div>
          )}

          {pendingDelete && (
            <div className="modal-backdrop" role="presentation">
              <div
                className="modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-confirm-title">
                <div className="modal-eyebrow">Confirm Delete</div>
                <h3 className="modal-title" id="delete-confirm-title">
                  {pendingDelete.title}
                </h3>
                <div className="modal-copy">{pendingDelete.description}</div>

                <div className="modal-actions">
                  <button className="secondary-button" type="button" onClick={closeDeleteModal}>
                    Cancel
                  </button>
                  <button className="item-action delete" type="button" onClick={confirmDeleteResource}>
                    {isLoading ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </StyledAdminPage>
      </StyledMainContainer>
    </Layout>
  );
};

const AdminPageWithAuth = ({ location }) => (
  <AdminAuthProvider>
    <AdminPage location={location} />
  </AdminAuthProvider>
);

AdminPage.propTypes = {
  location: PropTypes.object.isRequired,
};

AdminPageWithAuth.propTypes = {
  location: PropTypes.object.isRequired,
};

export default AdminPageWithAuth;
