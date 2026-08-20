import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Heart, Trash2, Reply, X } from 'lucide-react';

const API_URL = 'https://sonimusic-1.onrender.com';

const Comments = ({ songId }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);

  const getProfilePic = (commentUser) => {
    if (!commentUser) return '/images/artists/default.jpg';
    const emailMap = {
      'contact@sonimusic.online': '/images/artists/demba-tandia.jpg',
      'demba.tandia@sonimusic.online': '/images/artists/demba-tandia.jpg',
      'jkeria@sonimusic.online': '/images/artists/jkeria.jpg',
      'david.soni@sonimusic.online': '/images/artists/david-soni.jpg',
      'lass.ko@sonimusic.online': '/images/artists/lass-ko.jpg',
      'mister.gang@sonimusic.online': '/images/artists/mister-gang.jpg',
      'pispa@sonimusic.online': '/images/artists/pispa-le-roi.jpg',
    };
    if (commentUser.email && emailMap[commentUser.email]) {
      return emailMap[commentUser.email];
    }
    return '/images/artists/default.jpg';
  };

  const fetchComments = useCallback(async () => {
    if (!songId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/comments?songId=${songId}`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (isMounted.current) {
        setComments(response.data || []);
        setError('');
        setLoading(false);
      }
    } catch (error) {
      if (error.name !== 'CanceledError' && isMounted.current) {
        console.error('Erreur chargement commentaires:', error);
        setError('Impossible de charger les commentaires');
        setLoading(false);
      }
    }
  }, [songId]);

  useEffect(() => {
    isMounted.current = true;
    fetchComments();

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated || submitting) return;

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/comments`,
        {
          songId,
          content: newComment.trim(),
          parentId: replyTo?.id || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && isMounted.current) {
        setNewComment('');
        setReplyTo(null);
        await fetchComments();
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
      setError('Impossible d\'ajouter le commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;

    try {
      await axios.delete(
        `${API_URL}/api/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchComments();
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      setError('Impossible de supprimer le commentaire');
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes}m`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days < 7) return `il y a ${days}j`;
    return new Date(date).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-white font-semibold text-lg mb-4">
        Commentaires ({comments.length})
      </h3>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
          <button onClick={fetchComments} className="ml-2 text-orange-400 hover:text-orange-300">
            Réessayer
          </button>
        </div>
      )}

      {isAuthenticated ? (
        <form onSubmit={handleAddComment} className="mb-6">
          {replyTo && (
            <div className="flex items-center justify-between bg-gray-800/50 px-4 py-2 rounded-lg mb-2">
              <span className="text-gray-400 text-sm">
                Réponse à <span className="text-orange-400">{replyTo.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-gray-500 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <img
              src={getProfilePic(user)}
              alt={user?.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              onError={(e) => { e.target.src = '/images/artists/default.jpg'; }}
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? `Répondre à ${replyTo.name}...` : "Écrire un commentaire..."}
                className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="bg-orange-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 text-gray-400 bg-gray-800/30 rounded-lg mb-6">
          <Link to="/login" className="text-orange-400 hover:text-orange-300">
            Connectez-vous
          </Link>
          {' '}pour commenter
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Aucun commentaire pour l'instant. Soyez le premier !
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Link to={`/user/${comment.userId}`} className="flex-shrink-0">
                <img
                  src={getProfilePic({ email: comment.email })}
                  alt={comment.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-700 hover:border-orange-500 transition-colors"
                  onError={(e) => { e.target.src = '/images/artists/default.jpg'; }}
                />
              </Link>
              <div className="flex-1">
                <div className="bg-gray-800/50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/user/${comment.userId}`}
                      className="text-white font-medium hover:text-orange-400 text-sm transition-colors"
                    >
                      {comment.name}
                    </Link>
                    <span className="text-gray-500 text-xs">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-200 text-sm mt-1">{comment.content}</p>
                </div>

                <div className="flex items-center gap-4 mt-1 ml-1">
                  <button className="text-gray-500 hover:text-red-400 text-xs transition-colors flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{comment.likes || 0}</span>
                  </button>
                  {isAuthenticated && (
                    <button
                      onClick={() => setReplyTo(comment)}
                      className="text-gray-500 hover:text-orange-400 text-xs transition-colors flex items-center gap-1"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      Répondre
                    </button>
                  )}
                  {user?.id === comment.userId && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-gray-500 hover:text-red-400 text-xs transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
