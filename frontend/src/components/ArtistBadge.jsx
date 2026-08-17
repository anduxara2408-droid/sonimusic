import React from 'react';

function ArtistBadge({ verified, type = 'artist' }) {
  if (!verified) return null;

  const badges = {
    artist: {
      icon: '⭐',
      label: 'Artiste vérifié',
      color: 'bg-[#c9a25c]/20 text-[#c9a25c]',
    },
    label: {
      icon: '🏷️',
      label: 'Label vérifié',
      color: 'bg-blue-500/20 text-blue-400',
    },
    producer: {
      icon: '🎧',
      label: 'Producteur vérifié',
      color: 'bg-purple-500/20 text-purple-400',
    },
  };

  const badge = badges[type] || badges.artist;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
      <span>{badge.icon}</span>
      {badge.label}
    </span>
  );
}

export default ArtistBadge;
