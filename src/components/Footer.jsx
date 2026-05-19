import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{
      background: '#000',
      borderTop: '1px solid rgba(167, 139, 250, 0.06)',
      padding: '64px 0 32px',
    }}>
      <div className="sc-container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '48px',
          marginBottom: '48px',
        }}>
          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', marginBottom: '16px' }}>
              <img 
                src="/images/logo.png" 
                alt="Dream City" 
                style={{ height: '48px', width: 'auto' }}
              />
            </Link>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '300px' }}>
              Your legacy starts here. Join the most immersive roleplay community.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {[
                { name: 'Discord', href: 'https://discord.gg/GdKgR2qTgr', icon: <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01a13.98 13.98 0 0 0 12.084 0a.074.074 0 0 1 .078.01a10.122 10.122 0 0 0 .372.292a.077.077 0 0 1-.007.128a12.253 12.253 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.082.082 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.966 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/> },
                { name: 'YouTube', href: 'https://www.youtube.com/watch?v=l3vUF2e-Mdc', icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.017 3.017 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.930-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/> }
              ].map(s => (
                <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8', textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#A78BFA'; e.currentTarget.style.color = '#A78BFA'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    {s.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#fff', marginBottom: '20px' }}>
              Navigation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Home', path: '/' },
                { label: 'Rules', path: '/rules' },
                { label: 'Team', path: '/team' },
                { label: 'Store', path: '/store' },
                { label: 'Applications', path: '/apply' },
              ].map(link => (
                <Link key={link.label} to={link.path} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = '#94a3b8'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Discord CTA */}
          <div>
            <h4 style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#fff', marginBottom: '20px' }}>
              Community
            </h4>
            <div style={{
              background: 'rgba(167, 139, 250, 0.04)',
              border: '1px solid rgba(167, 139, 250, 0.1)',
              borderRadius: '16px',
              padding: '24px',
            }}>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '16px' }}>
                Join our official Discord for updates, events, and support.
              </p>
              <a href="https://discord.gg/GdKgR2qTgr" target="_blank" rel="noopener noreferrer" className="sc-btn" style={{ width: '100%', padding: '12px', fontSize: '0.75rem' }}>
                Join Community
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            © {new Date().getFullYear()} DCRP S2. Not affiliated with Rockstar Games.
          </span>
          <div style={{ display: 'flex', gap: '24px' }}>
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Privacy Policy
            </Link>
            <Link to="/terms" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
