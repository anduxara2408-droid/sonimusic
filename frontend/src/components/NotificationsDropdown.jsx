import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Bell } from 'lucide-react';

const API_URL = 'https://sonimusic-1.onrender.com';

const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const isAuthenticated = !!(token && user);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(response.data || []);
      const unread = (response.data || []).filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API_URL}/api/notifications/read`, 
        { notificationId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <button className="relative text-gray-400 hover:text-white transition-colors">
        <Bell className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1e1e1e] border border-gray-800 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-800">
            <span className="text-white font-medium">Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-gray-400 text-sm text-center">
              Aucune notification
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`px-4 py-3 border-b border-gray-800 hover:bg-[#2a2a2a] transition-colors cursor-pointer ${
                  !notif.read ? 'bg-orange-500/5' : ''
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <p className="text-white text-sm">{notif.title || 'Notification'}</p>
                <p className="text-gray-400 text-xs mt-1">{notif.message || ''}</p>
              </div>
            ))
          )}
          <div className="p-2 border-t border-gray-800">
            <Link
              to="/notifications"
              className="block text-center text-orange-400 hover:text-orange-300 text-sm py-1"
              onClick={() => setIsOpen(false)}
            >
              Voir toutes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
