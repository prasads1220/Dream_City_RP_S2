import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';

const Navbar = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/rules', label: 'Rules' },
    { path: '/team', label: 'Team' },
    { path: '/store', label: 'Store' },
    { path: '/apply', label: 'Applications' },
  ];

  const externalLinks = [
    // Removed 'Watch Live'
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(167, 139, 250, 0.06)',
    }}>
      <div className="sc-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '76px',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img 
            src="/images/logo.png" 
            alt="Dream City" 
            style={{ 
              height: '64px', 
              width: 'auto',
              filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.3))',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          />
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="desktop-nav">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: isActive(link.path) ? '#A78BFA' : 'rgba(255,255,255,0.6)',
                background: isActive(link.path) ? 'rgba(167, 139, 250, 0.08)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", sans-serif',
              }}
              onMouseEnter={e => { if (!isActive(link.path)) { e.target.style.color = '#fff'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}}
              onMouseLeave={e => { if (!isActive(link.path)) { e.target.style.color = 'rgba(255,255,255,0.6)'; e.target.style.background = 'transparent'; }}}
            >
              {isActive(link.path) && <span style={{ marginRight: '6px', fontSize: '0.5rem' }}>●</span>}
              {link.label}
            </Link>
          ))}
          {externalLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              {link.live && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00FF88', display: 'inline-block', boxShadow: '0 0 8px #00FF88' }} />}
              {link.label} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{link.icon}</span>
            </a>
          ))}
        </div>

        {/* Right side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {userData?.role === 'admin' && (
                <Link to="/admin" className="sc-btn" style={{ 
                  padding: '8px 16px', fontSize: '0.7rem', textTransform: 'uppercase', 
                  letterSpacing: '1px', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.3)', color: '#A78BFA'
                }}>
                  Dashboard
                </Link>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px 4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img 
                  src={userData?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                  alt="Avatar" 
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(167, 139, 250, 0.3)' }} 
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{userData?.discordUsername || userData?.name}</span>
              </div>
              <button 
                onClick={handleSignOut} 
                title="Logout"
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </button>
            </div>
          ) : (
            <Link to="/login" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.15)'}
            >
              Staff
            </Link>
          )}

          {/* Connect Button */}
          <a
            href="fivem://connect/dreamcityrp.com"
            className="sc-btn nav-connect-btn"
            style={{ padding: '10px 24px', fontSize: '0.75rem' }}
          >
            <span style={{
              display: 'inline-flex', position: 'relative', width: '8px', height: '8px',
            }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%', background: '#000',
                animation: 'pulse-cyan 2s ease-in-out infinite', opacity: 0.6,
              }} />
              <span style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: '#000', display: 'block' }} />
            </span>
            Connect
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px',
            }}
            className="mobile-toggle"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'absolute', top: '76px', left: 0, width: '100vw',
            height: 'calc(100vh - 76px)',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 89,
            animation: 'fade-in 0.3s ease-out',
          }}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div style={{
        position: 'absolute', top: '76px', right: 0, 
        height: 'calc(100vh - 76px)',
        width: '100vw',
        background: 'rgba(5, 5, 8, 0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(167, 139, 250, 0.15)',
        padding: '32px 24px',
        zIndex: 90,
        transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '-15px 0 40px rgba(0,0,0,0.7)',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'block', padding: '14px 0',
                fontSize: '1.25rem', fontWeight: 700,
                lineHeight: 1.5,
                color: isActive(link.path) ? '#A78BFA' : 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                letterSpacing: '0.5px'
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Responsive CSS for mobile toggle */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
        @media (max-width: 500px) {
          .logo-text { display: none !important; }
          .nav-connect-btn { padding: 8px 16px !important; font-size: 0.65rem !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
