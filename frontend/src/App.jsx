import { Home } from './pages/home';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Register from './components/Register';
import SignIn from './components/Signin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      <Route path='/register' element={<Register />} />
      <Route path='/Signin' element={<SignIn />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;