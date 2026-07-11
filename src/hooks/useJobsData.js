import { useEffect, useState } from 'react';
import initialJobs from '../data/jobs.json';
import { getApiBaseUrl } from '@utils';

const sortJobs = jobs =>
  [...jobs].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

export const useJobsData = () => {
  const [jobs, setJobs] = useState(sortJobs(initialJobs));
  const [isRemoteDataLoaded, setIsRemoteDataLoaded] = useState(false);

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      setIsRemoteDataLoaded(true);
      return undefined;
    }

    let isMounted = true;

    const loadJobs = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/jobs`);

        if (!response.ok) {
          throw new Error(`Unexpected status code: ${response.status}`);
        }

        const payload = await response.json();

        if (isMounted && Array.isArray(payload?.data)) {
          setJobs(sortJobs(payload.data));
        }
      } catch (error) {
        console.warn('Failed to load jobs from API, using local fallback.', error);
      } finally {
        if (isMounted) {
          setIsRemoteDataLoaded(true);
        }
      }
    };

    loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  return { jobs, isRemoteDataLoaded };
};
