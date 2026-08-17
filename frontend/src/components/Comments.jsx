import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Heart, Trash2, Reply, X } from 'lucide-react';

const Comments = ({ songId }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const replyInputRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [songId]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`https://sonimusic-api.anduxara2408.workers.dev/api/comments?songId=${songId}`);
      setComments(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
      setError('Impossible de charger les commentaires');
      setLoading(false);
    }
  };

  const handleSubmit = async (e, parentId = null) => {
    e.preventDefault();
    const content = parentId ? replyInputRef.current?.value : newComment;
    if (!content?.trim()) return;
    if (!isAuthenticated) {
      alert('Veuillez vous connecter pour commenter');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post('https://sonimusic-api.anduxara2408.workers.dev/api/comments',
        { songId: parseInt(songId), content: content.trim(), parentId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (parentId) {
        setComments(comments.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), response.data.comment] };
          }
          return c;
        }));
        setReplyTo(null);
        if (replyInputRef.current) replyInputRef.current.value = '';
      } else {
        setComments([response.data.comment, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
      setError('Erreur lors de l\'ajout du commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId) => {
    if (!isAuthenticated) {
      alert('Veuillez vous connecter pour liker');
      return;
    }

    try {
      const response = await axios.post(`https://sonimusic-api.anduxara2408.workers.dev/api/comments/${commentId}/like`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const updateComment = (commentsList) => {
        return commentsList.map(c => {
          if (c.id === commentId) {
            return { ...c, likes: response.data.likes, liked: response.data.liked };
          }
          if (c.replies) {
            return { ...c, replies: updateComment(c.replies) };
          }
          return c;
        });
      };
      setComments(updateComment(comments));
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Supprimer ce commentaire ?')) return;

    try {
      await axios.delete(`https://sonimusic-api.anduxara2408.workers.dev/api/comments/${commentId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const filterComments = (list) => {
        return list.filter(c => {
          if (c.id === commentId) return false;
          if (c.replies) {
            c.replies = filterComments(c.replies);
          }
          return true;
        });
      };
      setComments(filterComments(comments));
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'à l\'instant';
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitials = (name) => {
    return name?.charAt(0).toUpperCase() || 'U';
  };

  const getProfilePic = (comment) => {
    if (comment.userProfilePic) return comment.userProfilePic;
    return '/images/artists/default.jpg';
  };

  const renderComment = (comment, isReply = false) => {
    const isOwnComment = user?.email === comment.userEmail;
    const isLiked = comment.likedBy?.includes(user?.email) || false;

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 mt-3' : 'mb-4'}`}>
        <div className="bg-[#1e1e1e] rounded-lg p-3">
          <div className="flex items-start gap-3">
            {/* Avatar utilisateur */}
            <Link to={`/user/${comment.userId}`} className="flex-shrink-0">
              <img
                src={getProfilePic(comment)}
                alt={comment.userName}
                className="w-8 h-8 rounded-full object-cover border border-gray-700"
                onError={(e) => e.target.src = '/images/artists/default.jpg'}
              />
            </Link>

            <div className="flex-1 min-w-0">
              {/* En-tête du commentaire */}
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/user/${comment.userId}`}
                  className="text-white text-sm font-medium hover:underline hover:text-orange-400 transition-colors"
                >
                  {comment.userName}
                </Link>
                <span className="text-gray-500 text-xs">•</span>
                <span className="text-gray-500 text-xs">{formatDate(comment.createdAt)}</span>
              </div>

              {/* Contenu */}
              <p className="text-gray-300 text-sm mt-1 break-words">{comment.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => handleLike(comment.id)}
                  className={`flex items-center gap-1 text-xs transition-all ${
                    isLiked ? 'text-orange-500' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {isLiked ? <Heart className="w-3.5 h-3.5 fill-orange-500" /> : <Heart className="w-3.5 h-3.5" />}
                  <span>{comment.likes || 0}</span>
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => setReplyTo(comment)}
                    className="text-gray-400 hover:text-white text-xs transition-all flex items-center gap-1"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Répondre
                  </button>
                )}

                {isOwnComment && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-gray-400 hover:text-red-400 text-xs transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Réponses */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}

        {/* Formulaire de réponse */}
        {replyTo?.id === comment.id && (
          <div className="mt-2 ml-8">
            <form onSubmit={(e) => handleSubmit(e, comment.id)} className="flex gap-2">
              <input
                ref={replyInputRef}
                type="text"
                placeholder={`Répondre à ${comment.userName}...`}
                className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-orange-500 outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-500 text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-400 transition-all disabled:opacity-50"
              >
                Répondre
              </button>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-gray-400 text-sm">Chargement des commentaires...</div>;
  }

  return (
    <div className="mt-8 border-t border-gray-800 pt-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        💬 Commentaires
        <span className="text-gray-400 text-sm font-normal">({comments.length})</span>
      </h3>

      {/* Formulaire principal */}
      <form onSubmit={(e) => handleSubmit(e, null)} className="mb-6">
        <div className="flex gap-2">
          {isAuthenticated ? (
            <img
              src={user?.profilePic || '/images/artists/default.jpg'}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => e.target.src = '/images/artists/default.jpg'}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm">
              {getInitials('?')}
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAuthenticated ? "Écris un commentaire..." : "Connecte-toi pour commenter"}
              className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-orange-500 outline-none"
              disabled={!isAuthenticated || submitting}
            />
            <button
              type="submit"
              disabled={!isAuthenticated || !newComment.trim() || submitting}
              className="bg-orange-500 text-black px-6 py-2 rounded-lg font-semibold text-sm hover:bg-orange-400 transition-all disabled:opacity-50"
            >
              {submitting ? '...' : 'Envoyer'}
            </button>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </form>

      {/* Liste des commentaires */}
      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          Aucun commentaire pour le moment. Sois le premier ! 💬
        </p>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
};

export default Comments;
