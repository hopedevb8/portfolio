import React, { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getApiBaseUrl } from '@utils';
import initialPortfolio from '../data/portfolio.json';

const PortfolioContext = createContext({
  portfolio: initialPortfolio,
  isRemoteDataLoaded: false,
});

export const PortfolioProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [isRemoteDataLoaded, setIsRemoteDataLoaded] = useState(false);

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      setIsRemoteDataLoaded(true);
      return undefined;
    }

    let isMounted = true;

    const loadPortfolio = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/portfolio`);

        if (!response.ok) {
          throw new Error(`Unexpected status code: ${response.status}`);
        }

        const payload = await response.json();

        if (isMounted && payload?.data) {
          setPortfolio(payload.data);
        }
      } catch (error) {
        console.warn('Failed to load portfolio data from API, using local fallback.', error);
      } finally {
        if (isMounted) {
          setIsRemoteDataLoaded(true);
        }
      }
    };

    loadPortfolio();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PortfolioContext.Provider value={{ portfolio, isRemoteDataLoaded }}>
      {children}
    </PortfolioContext.Provider>
  );
};

PortfolioProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const usePortfolio = () => useContext(PortfolioContext);
