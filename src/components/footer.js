import React from 'react';
import styled from 'styled-components';
import { Icon } from '@components/icons';
import { usePortfolio } from '../context/portfolio';

const StyledFooter = styled.footer`
  ${({ theme }) => theme.mixins.flexCenter};
  flex-direction: column;
  min-height: 70px;
  padding: 15px;
  text-align: center;
`;

const StyledSocialLinks = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    width: 100%;
    max-width: 220px;
    margin: 0 auto 12px;
    color: var(--light-slate);
  }

  ul {
    ${({ theme }) => theme.mixins.flexBetween};
    padding: 0;
    margin: 0;
    list-style: none;

    a {
      padding: 10px;

      svg {
        width: 20px;
        height: 20px;
      }
    }
  }
`;

const StyledCredit = styled.div`
  color: var(--light-slate);
  font-family: var(--font-mono);
  font-size: var(--fz-xxs);
  line-height: 1.8;

  a {
    padding: 10px;
  }
`;

const Footer = () => {
  const { portfolio } = usePortfolio();
  const socialMedia = portfolio.profile?.socialMedia || [];
  const footer = portfolio.profile?.footer || {};

  return (
    <StyledFooter>
      <StyledSocialLinks>
        <ul>
          {socialMedia.map(({ name, url }, i) => (
            <li key={i}>
              <a href={url} aria-label={name}>
                <Icon name={name} />
              </a>
            </li>
          ))}
        </ul>
      </StyledSocialLinks>

      <StyledCredit tabIndex="-1">
        <a href={footer.creditLink}>{footer.creditLabel}</a>
        <div>{footer.creditText}</div>
      </StyledCredit>
    </StyledFooter>
  );
};

export default Footer;
