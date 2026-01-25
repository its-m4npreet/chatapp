import { Home } from './pages/home';
import './App.css';
import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import SignIn from './components/Signin';
import SignUp from './components/Signup';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import Settings from './components/Settings';
import VerifyEmail from './components/VerifyEmail';
import ChangePasswordPage from './components/changePasswordPage';
import SetNewPassword from './components/setNewPassword';
import ForgotPassword from './components/forgetpass';
import BugReport from './components/BugReport';
import HelpCenter from './components/HelpCenter';
import { useState, useEffect } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import GroupProfilePage from './components/groupViewPage';
import axios from './lib/axios';


// Component to view another user's profile
function ViewUserProfile({ currentUser }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [viewingUser, setViewingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/users/${userId}`);
        setViewingUser(response.data.user);
        setError('');
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setError('User not found');
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-[#0b0e12]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-[#0b0e12]">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <Profile 
      currentUser={currentUser} 
      viewingUser={viewingUser} 
      onClose={() => navigate(-1)}
      isMobile={true}
    />
  );
}

function AppRoutes({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/signup' element={<SignUp />} />
      <Route path='/signin' element={<SignIn />} />
      <Route path='/verify-email' element={<VerifyEmail />} />
      <Route path='/profile' element={<Profile currentUser={currentUser} viewingUser={null} onClose={() => navigate(-1)} onEditProfile={() => navigate('/edit-profile')} />} />
      <Route path='/profile/:userId' element={<ViewUserProfile currentUser={currentUser} />} />
      <Route path='/edit-profile' element={<EditProfile currentUser={currentUser} onClose={() => navigate(-1)} onSave={(updatedUser) => { setCurrentUser(updatedUser); localStorage.setItem('user', JSON.stringify(updatedUser)); navigate(-1); }} isMobile={true} />} />
      <Route path='/settings' element={<Settings />} />
      <Route path='/change-password' element={<ChangePasswordPage />} />
      <Route path='/set-new-password' element={<SetNewPassword />} />
      <Route path='/forgot-password' element={<ForgotPassword />} />
      <Route path='/report-bug' element={<BugReport />} />
      <Route path='/help-center' element={<HelpCenter />} />
      <Route path='/group/:groupId' element={<GroupProfilePage />} />
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