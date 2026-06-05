import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Preloader from './components/Preloader';
import ParticleBackground from './components/ParticleBackground';
import CarAnimation from './components/CarAnimation';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Apply from './pages/Apply';
import AdminDashboard from './pages/AdminDashboard';
import Rules from './pages/Rules';
import Team from './pages/Team';
import Store from './pages/Store';
import Events from './pages/Events';
import WinnersPopup from './components/WinnersPopup';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

function App() {
  const [loading, setLoading] = useState(true);

  // Global Click Sound
  useEffect(() => {
    const clickSound = new Audio('https://www.soundjay.com/buttons/button-16.mp3');
    clickSound.volume = 0.2;
    clickSound.preload = 'auto';

    const handleGlobalClick = (e) => {
      // Play sound for all interactive elements
      const target = e.target.closest('button, a, .sc-btn, .sc-btn-outline, input[type="submit"], select, [role="button"]');
      if (target) {
        clickSound.currentTime = 0;
        clickSound.play().catch(() => {});
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <div className={`flex flex-col min-h-screen ${loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000'}`}>
        <ParticleBackground />
        <CarAnimation />
        <Navbar />
        <WinnersPopup />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/events" element={<Events />} />
            <Route path="/winners" element={<Events />} />
            <Route path="/team" element={<Team />} />
            <Route path="/store" element={<Store />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            
            {/* Public application route (No Login Required) */}
            <Route path="/apply" element={<Apply />} />

            {/* Admin Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <Analytics />
    </>
  );
}

export default App;
