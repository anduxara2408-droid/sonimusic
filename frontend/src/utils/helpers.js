// frontend/src/utils/helpers.js

export const getProfilePic = (user) => {
  if (!user) return '/images/artists/default.jpg';
  if (user.profilePic) return user.profilePic;

  const emailMap = {
    'contact@sonimusic.online': '/images/artists/demba-tandia.jpg',
    'demba.tandia@sonimusic.online': '/images/artists/demba-tandia.jpg',
    'jkeria@sonimusic.online': '/images/artists/jkeria.jpg',
    'david.soni@sonimusic.online': '/images/artists/david-soni.jpg',
    'lass.ko@sonimusic.online': '/images/artists/lass-ko.jpg',
    'mister.gang@sonimusic.online': '/images/artists/mister-gang.jpg',
    'pispa@sonimusic.online': '/images/artists/pispa-le-roi.jpg',
  };

  if (user.email && emailMap[user.email]) {
    return emailMap[user.email];
  }

  return '/images/artists/default.jpg';
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}m`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${months} mois`;
  if (days < 365) return `il y a ${months} mois`;
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
};
