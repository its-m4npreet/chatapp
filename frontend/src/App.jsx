import { Home } from './pages/home';
import './App.css';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import SignIn from './components/Signin';
import SignUp from './components/Signup';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import Settings from './components/Settings';
import VerifyEmail from './components/VerifyEmail';
import { useState, useEffect } from 'react';
import { SettingsProvider } from './context/SettingsContext';

function AppRoutes({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path='/signup' element={<SignUp />} />
      <Route path='/signin' element={<SignIn />} />
      <Route path='/verify-email' element={<VerifyEmail />} />
      <Route path='/profile' element={<Profile currentUser={currentUser} viewingUser={null} onClose={() => navigate(-1)} onEditProfile={() => navigate('/edit-profile')} />} />
      <Route path='/edit-profile' element={<EditProfile currentUser={currentUser} onClose={() => navigate(-1)} onSave={(updatedUser) => { setCurrentUser(updatedUser); localStorage.setItem('user', JSON.stringify(updatedUser)); navigate(-1); }} isMobile={true} />} />
      <Route path='/settings' element={<Settings />} />
    </Routes>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  // Listen for storage changes (when user updates profile)
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUser(updatedUser);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppRoutes currentUser={currentUser} setCurrentUser={setCurrentUser} />
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;