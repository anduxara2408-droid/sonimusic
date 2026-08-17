import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Link } from 'react-router-dom';

function Notifications() {
  const { notifications, markAsRead, deleteNotification } = useNotifications();

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400 bg-green-500/20';
      case 'error': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">🔔 Notifications</h1>

        {notifications.length === 0 ? (
          <div className="bg-gray-900/50 rounded-2xl p-12 text-center border border-gray-800/50">
            <p className="text-6xl mb-4">🔔</p>
            <p className="text-gray-400">Aucune notification</p>
            <p className="text-gray-500 text-sm mt-2">Vous serez notifié des activités importantes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 flex items-start gap-4 transition-all ${
                  !notification.read ? 'border-[#c9a25c]/30' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{notification.title}</p>
                  <p className="text-gray-400 text-sm">{notification.message}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs text-[#c9a25c] hover:underline"
                    >
                      Marquer lu
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
