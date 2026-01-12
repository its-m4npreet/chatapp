import { Home } from './pages/home';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SignIn from './components/Signin';
import SignUp from './components/Signup';
import Profile from './components/Profile';
import Settings from './components/Settings';

function App() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/signin' element={<SignIn />} />
        <Route path='/profile' element={<Profile currentUser={currentUser} viewingUser={null} onClose={() => window.history.back()} onEditProfile={() => {}} />} />
        <Route path='/settings' element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;