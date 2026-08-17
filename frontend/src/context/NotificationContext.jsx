import React, { createContext, useState, useContext } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Musique approuvée !',
      message: 'Votre morceau "Kankan" a été approuvé par l\'administrateur.',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      type: 'info',
      title: 'Nouveau commentaire',
      message: 'Demba Tandia a commenté votre morceau.',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  const addNotification = (notification) => {
    setNotifications([{ ...notification, id: Date.now(), read: false }, ...notifications]);
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
