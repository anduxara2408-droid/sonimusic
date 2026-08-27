import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const isAuthenticated = !!(token && user);

  if (!isAuthenticated) {
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
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1e1e1e] border border-gray-800 rounded-lg shadow-2xl z-50">
          <div className="p-3 border-b border-gray-800">
            <span className="text-white font-medium">Notifications</span>
          </div>
          <div className="p-8 text-gray-400 text-sm text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p>Aucune notification</p>
            <p className="text-xs text-gray-600 mt-1">Revenez plus tard</p>
          </div>
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
