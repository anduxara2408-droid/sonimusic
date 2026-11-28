import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import AdminLayout from './components/admin/AdminLayout';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import ConfirmEmailChange from './pages/ConfirmEmailChange';
import Publish from './pages/studio/Publish';
import { AdminReleases, AdminReleaseDetail } from './pages/admin/AdminReleases';
import MySongs from './pages/MySongs';
import ArtistDashboard from './pages/ArtistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminArtists from './pages/AdminArtists';
import AdminSongs from './pages/admin/AdminSongs';
import AdminUpload from './pages/admin/AdminUpload';
import AdminAddSong from './pages/admin/AdminAddSong';
import AdminAddArtist from './pages/admin/AdminAddArtist';
import AdminAlbums from './pages/admin/AdminAlbums';
import AdminUsers from './pages/admin/AdminUsers';
import Discover from './pages/Discover';
import ArtistProfile from './pages/ArtistProfile';
import About from './pages/About';
import Albums from './pages/Albums';
import SongPage from './pages/SongPage';
import Feed from './pages/Feed';
import { Confidentialite, Cookies, ArtistesLabels } from './pages/LegalPages';
import { PlayerProvider } from './context/PlayerContext';
import { LikesProvider } from './context/LikesContext';
import Library from './pages/Library';
import LikedSongs from './pages/LikedSongs';
import Notifications from './pages/Notifications';
import Playlists from './pages/Playlists';
import Radio from './pages/Radio';
import Search from './pages/Search';
import Top from './pages/Top';
import Cgu from './pages/Cgu';
import Mentions from './pages/Mentions';
import Artists from './pages/Artists';
import Contact from './pages/Contact';
import UserProfile from './pages/UserProfile';
import EditProfile from './pages/EditProfile';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
       <LikesProvider>
       <PlayerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/register" element={<Layout><Register /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
            <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
            <Route path="/discover" element={<Layout><Discover /></Layout>} />
            <Route path="/artist/:id" element={<Layout><ArtistProfile /></Layout>} />
            <Route path="/verify" element={<Layout><VerifyEmail /></Layout>} />
            <Route path="/confirm-email-change" element={<Layout><ConfirmEmailChange /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/albums" element={<Layout><Albums /></Layout>} />
            <Route path="/feed" element={<Layout><Feed /></Layout>} />
            <Route path="/song/:id" element={<Layout><SongPage /></Layout>} />
            <Route path="/confidentialite" element={<Layout><Confidentialite /></Layout>} />
            <Route path="/cookies" element={<Layout><Cookies /></Layout>} />
            <Route path="/artistes-labels" element={<Layout><ArtistesLabels /></Layout>} />
            <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
            <Route path="/radio" element={<Layout><Radio /></Layout>} />
            <Route path="/search" element={<Layout><Search /></Layout>} />
            <Route path="/top" element={<Layout><Top /></Layout>} />
            <Route path="/cgu" element={<Layout><Cgu /></Layout>} />
            <Route path="/mentions" element={<Layout><Mentions /></Layout>} />
            <Route path="/artists" element={<Layout><Artists /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/user/:id" element={<Layout><UserProfile /></Layout>} />
            
            <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
            <Route path="/edit-profile" element={<PrivateRoute><Layout><EditProfile /></Layout></PrivateRoute>} />
            <Route path="/studio/publish" element={<PrivateRoute><Layout><Publish /></Layout></PrivateRoute>} />
            <Route path="/add-song" element={<Navigate to="/studio/publish" replace />} />
            <Route path="/my-songs" element={<PrivateRoute><Layout><MySongs /></Layout></PrivateRoute>} />
            <Route path="/favorites" element={<PrivateRoute><Layout><LikedSongs /></Layout></PrivateRoute>} />
            <Route path="/playlists" element={<PrivateRoute><Layout><Playlists /></Layout></PrivateRoute>} />
            <Route path="/library" element={<PrivateRoute><Layout><Library /></Layout></PrivateRoute>} />
            <Route path="/artist-dashboard" element={<PrivateRoute><Layout><ArtistDashboard /></Layout></PrivateRoute>} />
            
            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
            <Route path="/admin/releases" element={<AdminRoute><AdminLayout><AdminReleases /></AdminLayout></AdminRoute>} />
            <Route path="/admin/releases/:id" element={<AdminRoute><AdminLayout><AdminReleaseDetail /></AdminLayout></AdminRoute>} />
            <Route path="/admin/upload" element={<AdminRoute><AdminLayout><AdminUpload /></AdminLayout></AdminRoute>} />
            <Route path="/admin/songs" element={<AdminRoute><AdminLayout><AdminSongs /></AdminLayout></AdminRoute>} />
            <Route path="/admin/artists" element={<AdminRoute><AdminLayout><AdminArtists /></AdminLayout></AdminRoute>} />
            <Route path="/admin/add-song" element={<AdminRoute><AdminLayout><AdminAddSong /></AdminLayout></AdminRoute>} />
            <Route path="/admin/add-artist" element={<AdminRoute><AdminLayout><AdminAddArtist /></AdminLayout></AdminRoute>} />
            <Route path="/admin/albums" element={<AdminRoute><AdminLayout><AdminAlbums /></AdminLayout></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
       </PlayerProvider>
       </LikesProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
