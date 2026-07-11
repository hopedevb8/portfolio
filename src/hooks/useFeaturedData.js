import { useEffect, useState } from 'react';
import initialFeaturedProjects from '../data/featured.json';
import { getApiBaseUrl } from '@utils';

const sortFeaturedProjects = projects =>
  [...projects].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

export const useFeaturedData = () => {
  const [featuredProjects, setFeaturedProjects] = useState(sortFeaturedProjects(initialFeaturedProjects));
  const [isRemoteDataLoaded, setIsRemoteDataLoaded] = useState(false);

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      setIsRemoteDataLoaded(true);
      return undefined;
    }

    let isMounted = true;

    const loadFeaturedProjects = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/featured`);

        if (!response.ok) {
          throw new Error(`Unexpected status code: ${response.status}`);
        }

        const payload = await response.json();

        if (isMounted && Array.isArray(payload?.data)) {
          setFeaturedProjects(sortFeaturedProjects(payload.data));
        }
      } catch (error) {
        console.warn('Failed to load featured projects from API, using local fallback.', error);
      } finally {
        if (isMounted) {
          setIsRemoteDataLoaded(true);
        }
      }
    };

    loadFeaturedProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  return { featuredProjects, isRemoteDataLoaded };
};
