import { useState, useEffect } from 'react';
import { getAllEvents } from '../services/eventService';
import confetti from 'canvas-confetti';

const Winners = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await getAllEvents();
        setEvents(data || []);
      } catch (err) {
        console.error('Failed to load events on Winners page:', err);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const triggerCelebrate = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#A78BFA', '#F59E0B', '#EF4444', '#10B981', '#3B82F6']
    });
  };

  // Preset theme descriptions and styles
  const themes = {
    car_race: {
      label: 'Car Race',
      accent: '#A78BFA',
      glow: 'rgba(167, 139, 250, 0.25)',
      bg: 'linear-gradient(135deg, rgba(8, 8, 12, 0.9) 0%, rgba(20, 10, 45, 0.95) 100%)',
      cardBorder: 'rgba(167, 139, 250, 0.15)',
      badge: '🏎️ CAR RACE'
    },
    bike_race: {
      label: 'Bike Race',
      accent: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.25)',
      bg: 'linear-gradient(135deg, rgba(8, 8, 12, 0.9) 0%, rgba(45, 20, 10, 0.95) 100%)',
      cardBorder: 'rgba(245, 158, 11, 0.15)',
      badge: '🏍️ BIKE RACE'
    },
    sky_race: {
      label: 'Sky Race',
      accent: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.25)',
      bg: 'linear-gradient(135deg, rgba(8, 8, 12, 0.9) 0%, rgba(5, 25, 55, 0.95) 100%)',
      cardBorder: 'rgba(59, 130, 246, 0.15)',
      badge: '✈️ SKY RACE'
    },
    custom: {
      label: 'Championship',
      accent: '#E2E8F0',
      glow: 'rgba(255, 255, 255, 0.15)',
      bg: 'linear-gradient(135deg, rgba(15, 15, 20, 0.9) 0%, rgba(5, 5, 8, 0.95) 100%)',
      cardBorder: 'rgba(255, 255, 255, 0.08)',
      badge: '🏁 SPECIAL EVENT'
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  // Active / Spotlight Event is the first 'active' event, or just the latest event
  const spotlightEvent = events.find(e => e.active) || events[0];
  const pastEvents = events.filter(e => e.id !== spotlightEvent?.id);

  // Filter events
  const filteredPastEvents = pastEvents.filter(e => {
    if (activeFilter === 'all') return true;
    return e.type === activeFilter;
  });

  const spotlightTheme = spotlightEvent ? (themes[spotlightEvent.type] || themes.car_race) : themes.car_race;

  const spotlightHeroBgStyle = spotlightEvent?.type === 'custom' && spotlightEvent.customBgUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.92) 80%, #000 100%), url("${spotlightEvent.customBgUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: `radial-gradient(circle at top, ${spotlightTheme.accent}12 0%, rgba(0,0,0,0) 60%), ${spotlightTheme.bg}`
      };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      
      {/* ===== HERO SPOTLIGHT CHAMPIONSHIP ===== */}
      {spotlightEvent ? (
        <section 
          style={{
            ...spotlightHeroBgStyle,
            minHeight: '85vh',
            display: 'flex',
            alignItems: 'center',
            paddingTop: '140px',
            paddingBottom: '60px',
            position: 'relative',
            borderBottom: '1px solid rgba(167, 139, 250, 0.05)'
          }}
        >
          {/* Checkered side decals for racing atmosphere */}
          <div className="checkered-pattern" style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '12px',
            background: 'repeating-conic-gradient(#fff 0% 25%, #000 0% 50%) 50% / 12px 12px',
            opacity: 0.08, pointerEvents: 'none'
          }} />
          <div className="checkered-pattern" style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: '12px',
            background: 'repeating-conic-gradient(#fff 0% 25%, #000 0% 50%) 50% / 12px 12px',
            opacity: 0.08, pointerEvents: 'none'
          }} />

          <div className="sc-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', position: 'relative', zIndex: 10 }}>
            
            {/* Left Column: Event details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="winners-hero-info">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span 
                  onClick={triggerCelebrate}
                  style={{
                    padding: '6px 14px', borderRadius: '30px', fontSize: '0.65rem',
                    fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer',
                    background: `${spotlightTheme.accent}15`, color: spotlightTheme.accent,
                    border: `1px solid ${spotlightTheme.accent}40`,
                    boxShadow: `0 0 10px ${spotlightTheme.accent}15`
                  }}
                  title="Click to celebrate this championship!"
                >
                  ⚡ Active Championship
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                  📅 {spotlightEvent.date}
                </span>
              </div>

              <h1 style={{
                fontFamily: '"Outfit", sans-serif',
                fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.1
              }}>
                {spotlightEvent.title}
              </h1>
              
              <p style={{
                color: '#94a3b8',
                fontSize: '1.05rem',
                lineHeight: 1.7,
                maxWidth: '520px'
              }}>
                {spotlightEvent.description}
              </p>

              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button onClick={triggerCelebrate} className="sc-btn" style={{ padding: '12px 28px', fontSize: '0.75rem' }}>
                  Celebrate Winners! 🎉
                </button>
              </div>
            </div>

            {/* Right Column: 3D Podium */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', width: '100%', perspective: '1000px' }} className="winners-hero-podium">
              
              {/* 2nd Place */}
              {spotlightEvent.winners?.second && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '170px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'rgba(192, 192, 192, 0.1)', border: '2px solid #C0C0C0',
                    boxShadow: '0 0 12px rgba(192, 192, 192, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: '8px'
                  }}>🥈</div>
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(192, 192, 192, 0.05) 0%, rgba(192, 192, 192, 0.2) 100%)',
                    border: '1px solid rgba(192, 192, 192, 0.2)',
                    borderRadius: '14px 14px 8px 8px',
                    padding: '16px 10px', minHeight: '110px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#C0C0C0', textTransform: 'uppercase', marginBottom: '2px' }}>2nd Place</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {spotlightEvent.winners.second.name}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#8A95A5', fontWeight: 700, fontStyle: 'italic' }}>
                        {spotlightEvent.winners.second.reward}
                      </div>
                      {spotlightEvent.winners.second.details && (
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                          {spotlightEvent.winners.second.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {spotlightEvent.winners?.first && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.1, maxWidth: '200px', zIndex: 5 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%) rotate(-4deg)', fontSize: '1.25rem', animation: 'float 3s ease-in-out infinite' }}>👑</span>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: 'rgba(255, 215, 0, 0.12)', border: '2.5px solid #FFD700',
                      boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', marginBottom: '10px'
                    }}>🥇</div>
                  </div>
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(255, 215, 0, 0.08) 0%, rgba(255, 215, 0, 0.25) 100%)',
                    border: '1.5px solid rgba(255, 215, 0, 0.4)',
                    borderRadius: '18px 18px 10px 10px',
                    padding: '20px 12px', minHeight: '145px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,215,0,0.1)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Champion</div>
                      <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff' }}>
                        {spotlightEvent.winners.first.name}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#FFEFA3', fontWeight: 800 }}>
                        {spotlightEvent.winners.first.reward}
                      </div>
                      {spotlightEvent.winners.first.details && (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 600 }}>
                          {spotlightEvent.winners.first.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {spotlightEvent.winners?.third && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '170px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'rgba(205, 127, 50, 0.1)', border: '2px solid #CD7F32',
                    boxShadow: '0 0 12px rgba(205, 127, 50, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginBottom: '8px'
                  }}>🥉</div>
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(205, 127, 50, 0.05) 0%, rgba(205, 127, 50, 0.2) 100%)',
                    border: '1px solid rgba(205, 127, 50, 0.2)',
                    borderRadius: '14px 14px 8px 8px',
                    padding: '16px 10px', minHeight: '90px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#CD7F32', textTransform: 'uppercase', marginBottom: '2px' }}>3rd Place</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {spotlightEvent.winners.third.name}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#D4B290', fontWeight: 700, fontStyle: 'italic' }}>
                        {spotlightEvent.winners.third.reward}
                      </div>
                      {spotlightEvent.winners.third.details && (
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                          {spotlightEvent.winners.third.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>
      ) : (
        <section style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px' }}>
          <div className="sc-card" style={{ padding: '60px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 700, color: '#A78BFA', letterSpacing: '2px' }}>
              No Tournaments Registered Yet
            </h2>
            <p style={{ color: '#64748b', marginTop: '12px' }}>Admins can register new tournaments in the dashboard!</p>
          </div>
        </section>
      )}

      {/* ===== PAST CHAMPIONSHIPS / EVENTS LIST ===== */}
      {spotlightEvent && (
        <section style={{ paddingTop: '80px' }}>
          <div className="sc-container">
            
            {/* Filter controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
                  Tournament <span style={{ color: '#A78BFA' }}>Records</span>
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Browse all past racing events and historical winners</p>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(8,8,12,0.6)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                {[
                  { id: 'all', label: '🏁 All Events' },
                  { id: 'car_race', label: '🏎️ Car Races' },
                  { id: 'bike_race', label: '🏍️ Bike Races' },
                  { id: 'sky_race', label: '✈️ Sky Races' },
                ].map(filterTab => (
                  <button 
                    key={filterTab.id}
                    onClick={() => setActiveFilter(filterTab.id)}
                    style={{
                      padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px',
                      transition: 'all 0.2s',
                      background: activeFilter === filterTab.id ? '#A78BFA' : 'transparent',
                      color: activeFilter === filterTab.id ? '#000' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {filterTab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timelines Grid */}
            {filteredPastEvents.length === 0 ? (
              <div className="sc-card" style={{ padding: '80px', textAlign: 'center', opacity: 0.4 }}>
                <p style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 800, letterSpacing: '1.5px', color: '#94a3b8' }}>
                  No historical matches found for this category.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '28px' }}>
                {filteredPastEvents.map(event => {
                  const theme = themes[event.type] || themes.car_race;
                  
                  const customCardBg = event.type === 'custom' && event.customBgUrl
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(8,8,12,0.96) 0%, rgba(15,10,30,0.97) 100%), url("${event.customBgUrl}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {};

                  return (
                    <div 
                      key={event.id}
                      className="sc-card dc-winners-card"
                      style={{
                        ...customCardBg,
                        padding: '32px',
                        border: `1px solid ${theme.cardBorder}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '24px',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = theme.accent;
                        e.currentTarget.style.boxShadow = `0 15px 35px ${theme.glow}`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = theme.cardBorder;
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.25)';
                      }}
                    >
                      <div>
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 900,
                            padding: '3px 10px', borderRadius: '4px',
                            background: `${theme.accent}15`, color: theme.accent,
                            border: `1px solid ${theme.accent}30`,
                            textTransform: 'uppercase', letterSpacing: '1px'
                          }}>
                            {theme.badge}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                            {event.date}
                          </span>
                        </div>

                        <h3 style={{
                          fontFamily: '"Outfit", sans-serif',
                          fontSize: '1.4rem',
                          fontWeight: 900,
                          color: '#fff',
                          marginBottom: '8px'
                        }}>
                          {event.title}
                        </h3>

                        <p style={{
                          color: '#94a3b8',
                          fontSize: '0.85rem',
                          lineHeight: 1.6,
                          marginBottom: '0'
                        }}>
                          {event.description}
                        </p>
                      </div>

                      {/* Winners breakdown row */}
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        
                        {/* 1st Place */}
                        {event.winners?.first && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.1rem' }}>🥇</span>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                                  {event.winners.first.name}
                                </div>
                                {event.winners.first.details && (
                                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                                    {event.winners.first.details}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FFD700' }}>
                              {event.winners.first.reward}
                            </span>
                          </div>
                        )}

                        {/* 2nd Place */}
                        {event.winners?.second && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.1rem' }}>🥈</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>
                                  {event.winners.second.name}
                                </div>
                                {event.winners.second.details && (
                                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                                    {event.winners.second.details}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C0C0C0' }}>
                              {event.winners.second.reward}
                            </span>
                          </div>
                        )}

                        {/* 3rd Place */}
                        {event.winners?.third && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.1rem' }}>🥉</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>
                                  {event.winners.third.name}
                                </div>
                                {event.winners.third.details && (
                                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                                    {event.winners.third.details}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#CD7F32' }}>
                              {event.winners.third.reward}
                            </span>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </section>
      )}

      {/* Media Queries Styling for Columns */}
      <style>{`
        @media (max-width: 900px) {
          .winners-hero-info {
            order: 1;
            text-align: center;
            align-items: center;
          }
          .winners-hero-podium {
            order: 2;
          }
          section > div.sc-container {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Winners;
