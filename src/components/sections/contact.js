import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { srConfig } from '@config';
import { getApiBaseUrl } from '@utils';
import sr from '@utils/sr';
import { usePrefersReducedMotion } from '@hooks';
import { usePortfolio } from '../../context/portfolio';

const StyledContactSection = styled.section`
  max-width: 600px;
  margin: 0 auto 100px;
  text-align: center;

  @media (max-width: 768px) {
    margin: 0 auto 50px;
  }

  .overline {
    display: block;
    margin-bottom: 20px;
    color: var(--green);
    font-family: var(--font-mono);
    font-size: var(--fz-md);
    font-weight: 400;

    &:before {
      bottom: 0;
      font-size: var(--fz-sm);
    }

    &:after {
      display: none;
    }
  }

  .title {
    font-size: clamp(40px, 5vw, 60px);
  }

  p {
    margin-bottom: 0;
  }

  .contact-form {
    margin-top: 40px;
    text-align: left;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  label {
    color: var(--lightest-slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xs);
  }

  input,
  textarea {
    width: 100%;
    border: 1px solid var(--lightest-navy);
    border-radius: var(--border-radius);
    background: var(--light-navy);
    color: var(--lightest-slate);
    padding: 14px 16px;
    font-size: var(--fz-sm);
    transition: var(--transition);

    &:focus {
      outline: none;
      border-color: var(--green);
      box-shadow: 0 0 0 1px var(--green);
    }
  }

  textarea {
    min-height: 160px;
    resize: vertical;
  }

  .form-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 24px;
  }

  .submit-button {
    ${({ theme }) => theme.mixins.bigButton};
  }

  .email-link {
    ${({ theme }) => theme.mixins.inlineLink};
    font-family: var(--font-mono);
    font-size: var(--fz-xs);
  }

  .form-status {
    margin-top: 20px;
    font-size: var(--fz-sm);
    color: var(--green);
  }

  .form-status.error {
    color: #ff6b6b;
  }
`;

const Contact = () => {
  const revealContainer = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { portfolio } = usePortfolio();
  const email = portfolio.profile?.email || '';
  const contact = portfolio.contact || {};
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [formState, setFormState] = useState({
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    sr.reveal(revealContainer.current, srConfig());
  }, []);

  const handleChange = event => {
    const { name, value } = event.target;

    setFormValues(currentState => ({
      ...currentState,
      [name]: value,
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      setFormState({
        status: 'error',
        message: 'API is not available in this environment. Run the Node.js backend to submit messages.',
      });
      return;
    }

    setFormState({
      status: 'submitting',
      message: '',
    });

    try {
      const response = await fetch(`${apiBaseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formValues),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to submit message.');
      }

      setFormValues({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
      setFormState({
        status: 'success',
        message: 'Message sent successfully. I will see it in the backend inbox.',
      });
    } catch (error) {
      setFormState({
        status: 'error',
        message: error.message || 'Failed to submit message.',
      });
    }
  };

  return (
    <StyledContactSection id="contact" ref={revealContainer}>
      <h2 className="numbered-heading overline">{contact.overline}</h2>

      <h2 className="title">{contact.title}</h2>

      <p>{contact.description}</p>

      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formValues.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formValues.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="subject">Subject</label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={formValues.subject}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            value={formValues.message}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-actions">
          <button className="submit-button" type="submit" disabled={formState.status === 'submitting'}>
            {formState.status === 'submitting' ? 'Sending...' : contact.ctaLabel}
          </button>

          <a className="email-link" href={`mailto:${email}`}>
            Prefer email directly?
          </a>
        </div>

        {formState.message && (
          <p className={`form-status ${formState.status === 'error' ? 'error' : ''}`}>
            {formState.message}
          </p>
        )}
      </form>
    </StyledContactSection>
  );
};

export default Contact;
