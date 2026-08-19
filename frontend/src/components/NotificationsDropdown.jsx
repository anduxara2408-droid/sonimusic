import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Bell, X, Check } from 'lucide-react';

const NotificationsDropdown = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('https://sonimusic-1.onrender.com/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = response.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post('https://sonimusic-1.onrender.com/api/notifications/read',
        { notificationId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative text-gray-400 hover:text-white transition-all p-2 rounded-full hover:bg-[#1a1a1a]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1e1e1e] border border-gray-800 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-white font-semibold">🔔 Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">Aucune notification</div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className={`p-3 border-b border-gray-800 ${notif.read ? 'opacity-70' : 'bg-[#2a2a2a]/30'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{notif.title}</p>
                    <p className="text-gray-400 text-sm">{notif.message}</p>
                    <p className="text-gray-500 text-xs mt-1">{new Date(notif.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {!notif.read && (
                    <button onClick={() => markAsRead(notif.id)} className="text-orange-500 hover:text-orange-400">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
