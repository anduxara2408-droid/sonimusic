import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

// Liste des morceaux aimés par l'utilisateur connecté (chargée depuis le serveur).
const LikesContext = createContext({ liked: new Set(), setLiked: () => {} });

export const LikesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [liked, setLikedSet] = useState(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setLikedSet(new Set());
      return;
    }
    api.get('/api/favorites/my-favorites')
      .then(({ data }) => setLikedSet(new Set((data || []).map((s) => s.id))))
      .catch(() => {});
  }, [isAuthenticated]);

  const setLiked = useCallback((songId, value) => {
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (value) next.add(songId);
      else next.delete(songId);
      return next;
    });
  }, []);

  return <LikesContext.Provider value={{ liked, setLiked }}>{children}</LikesContext.Provider>;
};

export const useLikes = () => useContext(LikesContext);
