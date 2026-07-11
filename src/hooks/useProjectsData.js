import { useEffect, useState } from 'react';
import initialProjects from '../data/projects.json';
import { getApiBaseUrl } from '@utils';

const sortProjects = projects =>
  [...projects].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

export const useProjectsData = () => {
  const [projects, setProjects] = useState(sortProjects(initialProjects));
  const [isRemoteDataLoaded, setIsRemoteDataLoaded] = useState(false);

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      setIsRemoteDataLoaded(true);
      return undefined;
    }

    let isMounted = true;

    const loadProjects = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/projects`);

        if (!response.ok) {
          throw new Error(`Unexpected status code: ${response.status}`);
        }

        const payload = await response.json();

        if (isMounted && Array.isArray(payload?.data)) {
          setProjects(sortProjects(payload.data));
        }
      } catch (error) {
        console.warn('Failed to load projects from API, using local fallback.', error);
      } finally {
        if (isMounted) {
          setIsRemoteDataLoaded(true);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  return { projects, isRemoteDataLoaded };
};
