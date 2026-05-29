import { useState, useEffect } from 'react';
import { getAllEvents, submitEventApplication, getAllEventApplications } from '../services/eventService';
import confetti from 'canvas-confetti';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [eventApplications, setEventApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Custom spotlight event state (when clicking past events)
  const [selectedSpotlightEvent, setSelectedSpotlightEvent] = useState(null);
  
  // Application modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedEventForApply, setSelectedEventForApply] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);
  
  const [toast, setToast] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getAllEvents();
      setEvents(data || []);
      const apps = await getAllEventApplications();
      setEventApplications(apps || []);
    } catch (err) {
      console.error('Failed to load events on Events page:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
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

  const handleOpenApplyModal = (eventObj) => {
    setSelectedEventForApply(eventObj);
    setCharacterName('');
    setDiscordId('');
    setShowApplyModal(true);
  };

  const handleCloseApplyModal = () => {
    setShowApplyModal(false);
    setSelectedEventForApply(null);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!selectedEventForApply) return;
    if (!characterName.trim() || !discordId.trim()) {
      setToast({ type: 'error', message: 'Please fill in all fields!' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSubmittingApp(true);
    try {
      await submitEventApplication(selectedEventForApply.id, {
        characterName: characterName.trim(),
        discordId: discordId.trim()
      });
      setToast({ type: 'success', message: 'Application submitted successfully!' });
      triggerCelebrate();
      handleCloseApplyModal();
    } catch (err) {
      console.error('Failed to submit application:', err);
      setToast({ type: 'error', message: 'Failed to submit application. Try again.' });
    }
    setSubmittingApp(false);
    setTimeout(() => setToast(null), 4000);
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

  // Only display events that are published (published !== false)
  const publishedEvents = events.filter(e => e.published !== false);

  // Active / Spotlight Event is the first 'active' event, or just the latest event
  const baseSpotlightEvent = publishedEvents.find(e => e.active) || publishedEvents[0];
  const spotlightEvent = selectedSpotlightEvent || baseSpotlightEvent;
  const pastEvents = publishedEvents.filter(e => e.id !== spotlightEvent?.id);

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

  // Helper to check if winners are declared
  const hasWinnersDeclared = (eventObj) => {
    return !!(eventObj?.winners?.first?.name);
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      
      {toast && (
        <div style={{
          position: 'fixed', top: '100px', right: '24px', padding: '14px 24px',
          borderRadius: '14px', fontWeight: 700, zIndex: 3000,
          background: toast.type === 'success' ? '#A78BFA' : '#ef4444',
          color: toast.type === 'success' ? '#000' : '#fff',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          animation: 'slide-up 0.3s ease-out',
        }}>
          {toast.message}
        </div>
      )}

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
                  onClick={hasWinnersDeclared(spotlightEvent) ? triggerCelebrate : undefined}
                  style={{
                    padding: '6px 14px', borderRadius: '30px', fontSize: '0.65rem',
                    fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer',
                    background: `${spotlightTheme.accent}15`, color: spotlightTheme.accent,
                    border: `1px solid ${spotlightTheme.accent}40`,
                    boxShadow: `0 0 10px ${spotlightTheme.accent}15`
                  }}
                  title={hasWinnersDeclared(spotlightEvent) ? "Click to celebrate this championship!" : "Event is live!"}
                >
                  {hasWinnersDeclared(spotlightEvent) ? '⚡ Championship Spotlight' : '🔥 Registrations Open'}
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
                {hasWinnersDeclared(spotlightEvent) ? (
                  <button onClick={triggerCelebrate} className="sc-btn" style={{ padding: '12px 28px', fontSize: '0.75rem' }}>
                    Celebrate Winners! 🎉
                  </button>
                ) : (
                  <button onClick={() => handleOpenApplyModal(spotlightEvent)} className="sc-btn" style={{ padding: '12px 28px', fontSize: '0.75rem', background: '#A78BFA', color: '#000', boxShadow: '0 0 20px rgba(167, 139, 250, 0.4)' }}>
                    📝 Apply for Event Now
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: 3D Podium OR Registration Form Call-to-action */}
            {hasWinnersDeclared(spotlightEvent) ? (
              /* Podium Columns */
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
            ) : (
              /* Application Call-to-action details */
              <div 
                className="sc-card" 
                style={{
                  padding: '32px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255, 255, 255, 0.01)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  boxShadow: `0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px ${spotlightTheme.accent}10`
                }}
              >
                <div>
                  <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>🏁</span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>Be part of the race!</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, marginTop: '6px' }}>
                    Registrations for this tournament are currently open. Enter your details to secure a spot grid.
                  </p>
                </div>

                <button 
                  onClick={() => handleOpenApplyModal(spotlightEvent)}
                  className="sc-btn"
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: '0.8rem',
                    background: spotlightTheme.accent,
                    color: '#000',
                    fontWeight: 900,
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📝 Enter Application Form
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px' }}>
          <div className="sc-card" style={{ padding: '60px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 700, color: '#A78BFA', letterSpacing: '2px' }}>
              No Events Registered Yet
            </h2>
            <p style={{ color: '#64748b', marginTop: '12px' }}>Admins can register and publish new events in the dashboard!</p>
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
                  Tournaments & <span style={{ color: '#A78BFA' }}>Events</span>
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Browse current schedules, register to race, and check podium details</p>
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

                  const openForApplications = !hasWinnersDeclared(event);

                  return (
                    <div 
                      key={event.id}
                      onClick={() => {
                        setSelectedSpotlightEvent(event);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
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
                        cursor: 'pointer'
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
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 900,
                              padding: '3px 10px', borderRadius: '4px',
                              background: `${theme.accent}15`, color: theme.accent,
                              border: `1px solid ${theme.accent}30`,
                              textTransform: 'uppercase', letterSpacing: '1px'
                            }}>
                              {theme.badge}
                            </span>
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 800,
                              padding: '3px 10px', borderRadius: '4px',
                              background: 'rgba(255,255,255,0.03)', color: '#94a3b8',
                              border: '1px solid rgba(255,255,255,0.08)'
                            }}>
                              📝 {eventApplications.filter(app => app.eventId === event.id).length} Entries
                            </span>
                          </div>
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

                      {/* Winners breakdown row OR registrations count */}
                      {openForApplications ? (
                        /* Open applications indicator */
                        <div style={{
                          background: 'rgba(167, 139, 250, 0.03)',
                          borderRadius: '12px',
                          padding: '16px',
                          border: '1px solid rgba(167, 139, 250, 0.1)',
                          textAlign: 'center'
                        }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            🔥 Open for Entry (Click to Apply)
                          </span>
                        </div>
                      ) : (
                        /* Winners Columns */
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </section>
      )}

      {/* ===== REGISTRATION / APPLICATION MODAL ===== */}
      {showApplyModal && selectedEventForApply && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000,
          padding: '24px'
        }}>
          <div 
            className="sc-card" 
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '36px',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.7), 0 0 20px rgba(167, 139, 250, 0.1)',
              background: 'linear-gradient(135deg, rgba(8,8,12,0.98) 0%, rgba(15,10,25,0.99) 100%)',
              position: 'relative',
              animation: 'scale-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            {/* Close */}
            <button 
              onClick={handleCloseApplyModal}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#94a3b8', width: '32px', height: '32px', borderRadius: '50%',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              ✕
            </button>

            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>📝</span>
            <h2 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '1.6rem', color: '#fff', lineHeight: 1.2 }}>
              Event Application
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '6px', marginBottom: '24px' }}>
              Applying to: <strong style={{ color: '#A78BFA' }}>{selectedEventForApply.title}</strong>
            </p>

            <form onSubmit={handleSubmitApplication} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Character Name
                </label>
                <input 
                  className="sc-input" 
                  placeholder="e.g. John Doe" 
                  required 
                  value={characterName} 
                  onChange={e => setCharacterName(e.target.value)} 
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Discord ID
                </label>
                <input 
                  className="sc-input" 
                  placeholder="e.g. johndoe#1234 or johndoe" 
                  required 
                  value={discordId} 
                  onChange={e => setDiscordId(e.target.value)} 
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="submit" 
                  disabled={submittingApp} 
                  className="sc-btn" 
                  style={{ flex: 1, background: '#A78BFA', color: '#000', fontWeight: 900 }}
                >
                  {submittingApp ? 'Submitting...' : '💾 Submit Entry'}
                </button>
                <button 
                  type="button" 
                  onClick={handleCloseApplyModal} 
                  className="sc-btn-outline" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
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
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Events;
