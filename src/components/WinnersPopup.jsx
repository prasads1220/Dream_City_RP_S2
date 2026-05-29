import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { getAllEvents } from '../services/eventService';

// Module level state to prevent popping up on route changes in the same session,
// but reset on reload/refresh so it always shows when the page is refreshed.
let wasDismissedInSession = false;

const WinnersPopup = () => {
  const [winnerEvents, setWinnerEvents] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [animateClose, setAnimateClose] = useState(false);

  // Swipe & Drag gesture states
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchAndCheckEvent = async () => {
      try {
        const allEvents = await getAllEvents();
        // Filter events that are published and have winners
        const declared = (allEvents || []).filter(e => e.published !== false && !!e.winners?.first?.name);
        
        if (declared.length > 0) {
          setWinnerEvents(declared);
          
          if (!wasDismissedInSession) {
            setShow(true);
            
            // Fire premium confetti burst when popup mounts
            setTimeout(() => {
              triggerChampionshipConfetti();
            }, 800);
          }
        }
      } catch (err) {
        console.error('Error fetching events for winners popup:', err);
      }
    };

    fetchAndCheckEvent();
  }, []);

  // Slide automatically every 5 seconds, resetting on user manual interaction
  useEffect(() => {
    if (!show || winnerEvents.length <= 1 || isDragging) return;
    
    const timer = setTimeout(() => {
      setCurrentSlideIndex(prev => (prev + 1) % winnerEvents.length);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [currentSlideIndex, show, winnerEvents.length, isDragging]);

  const triggerChampionshipConfetti = () => {
    // Left side burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.5 },
      colors: ['#A78BFA', '#F59E0B', '#EF4444', '#10B981', '#3B82F6']
    });
    // Right side burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.9, y: 0.5 },
      colors: ['#A78BFA', '#F59E0B', '#EF4444', '#10B981', '#3B82F6']
    });
    
    // Center delayed spray
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 90,
        spread: 100,
        origin: { x: 0.5, y: 0.8 },
        colors: ['#FFE066', '#A78BFA', '#FFF', '#FFD700']
      });
    }, 450);
  };

  const handleClose = () => {
    wasDismissedInSession = true;
    setAnimateClose(true);
    setTimeout(() => {
      setShow(false);
      setAnimateClose(false);
    }, 400); // match animation speed
  };

  // Touch Swipe Handlers
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    if (winnerEvents.length <= 1) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (winnerEvents.length <= 1 || !touchStart) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    const offset = currentX - touchStart;
    setDragOffset(offset);
    setIsDragging(true);
  };

  const handleTouchEnd = () => {
    if (winnerEvents.length <= 1 || !touchStart || !touchEnd) {
      setDragOffset(0);
      setIsDragging(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      setCurrentSlideIndex(prev => (prev + 1) % winnerEvents.length);
    } else if (isRightSwipe) {
      setCurrentSlideIndex(prev => (prev === 0 ? winnerEvents.length - 1 : prev - 1));
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setDragOffset(0);
    setIsDragging(false);
  };

  // Mouse Drag Handlers for Desktop
  const handleMouseDown = (e) => {
    if (winnerEvents.length <= 1) return;
    if (e.button !== 0) return; // only left click
    if (e.target.closest('button, a, .sc-btn, .sc-btn-outline')) return; // ignore clicks on buttons/links
    
    setDragStart(e.clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleMouseMove = (e) => {
    if (winnerEvents.length <= 1 || !isDragging || dragStart === null) return;
    const currentX = e.clientX;
    const offset = currentX - dragStart;
    setDragOffset(offset);
  };

  const handleMouseUp = () => {
    if (winnerEvents.length <= 1 || !isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(dragOffset) > minSwipeDistance) {
      if (dragOffset < 0) {
        // Dragged left -> next slide
        setCurrentSlideIndex(prev => (prev + 1) % winnerEvents.length);
      } else {
        // Dragged right -> prev slide
        setCurrentSlideIndex(prev => (prev === 0 ? winnerEvents.length - 1 : prev - 1));
      }
    }
    
    setDragStart(null);
    setDragOffset(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  if (!show || winnerEvents.length === 0) return null;

  // Background styling mapping
  const themes = {
    car_race: {
      accent: '#A78BFA',
      glow: 'rgba(167, 139, 250, 0.4)',
      bg: 'linear-gradient(135deg, rgba(8, 8, 12, 0.95) 0%, rgba(20, 10, 40, 0.98) 100%)',
      overlayIcon: '🏎️',
      title: 'MIDNIGHT RACING CHAMPION'
    },
    bike_race: {
      accent: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.4)',
      bg: 'linear-gradient(135deg, rgba(8, 8, 12, 0.95) 0%, rgba(45, 20, 5, 0.98) 100%)',
      overlayIcon: '🏍️',
      title: 'BIKE RACING CHAMPION'
    },
    sky_race: {
      accent: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.4)',
      bg: 'linear-gradient(135deg, rgba(8, 8, 12, 0.95) 0%, rgba(5, 25, 55, 0.98) 100%)',
      overlayIcon: '✈️',
      title: 'SKY RACING CHAMPION'
    },
    custom: {
      accent: '#A78BFA',
      glow: 'rgba(167, 139, 250, 0.4)',
      bg: 'linear-gradient(135deg, rgba(8, 8, 12, 0.92) 0%, rgba(10, 10, 15, 0.95) 100%)',
      overlayIcon: '🏁',
      title: 'EVENT CHAMPIONSHIP'
    }
  };

  const currentEvent = winnerEvents[currentSlideIndex];
  const currentTheme = themes[currentEvent.type] || themes.car_race;

  const modalBgStyle = currentEvent.type === 'custom' && currentEvent.customBgUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.85), rgba(10,5,25,0.95)), url("${currentEvent.customBgUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: currentTheme.bg };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      animation: animateClose ? 'fade-out 0.4s ease-in both' : 'fade-in 0.4s ease-out both',
    }}>
      {/* Confetti button to trigger manual celebratory bursts */}
      <div 
        onClick={triggerChampionshipConfetti}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: 'pointer',
          zIndex: -1
        }}
        title="Click background to fire confetti!"
      />

      <div 
        className="sc-card"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          ...modalBgStyle,
          width: '100%',
          maxWidth: '850px',
          borderRadius: '24px',
          border: `1px solid ${currentTheme.accent}40`,
          boxShadow: `0 0 50px ${currentTheme.accent}20`,
          padding: '40px',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          transition: isDragging ? 'none' : 'all 0.5s ease',
          animation: animateClose ? 'scale-down 0.4s ease-in both' : 'scale-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
          cursor: winnerEvents.length > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Floating Theme Preset Overlay Indicator */}
        <div 
          key={`icon-${currentSlideIndex}`}
          style={{
            position: 'absolute',
            top: '-30px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(15, 15, 20, 0.95)',
            border: `2px solid ${currentTheme.accent}`,
            boxShadow: `0 0 25px ${currentTheme.accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            zIndex: 10,
            animation: 'float 4s ease-in-out infinite'
          }}
        >
          {currentTheme.overlayIcon}
        </div>

        {/* Close Button */}
        <button 
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8',
            fontSize: '1rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 15
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          ✕
        </button>

        {/* Left Navigation Arrow */}
        {winnerEvents.length > 1 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlideIndex(prev => (prev === 0 ? winnerEvents.length - 1 : prev - 1));
            }}
            style={{
              position: 'absolute',
              left: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(15, 15, 20, 0.95)',
              border: `2px solid ${currentTheme.accent}`,
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 15px ${currentTheme.accent}40`,
              zIndex: 30,
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              e.currentTarget.style.boxShadow = `0 0 25px ${currentTheme.accent}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = `0 0 15px ${currentTheme.accent}40`;
            }}
          >
            ◀
          </button>
        )}

        {/* Right Navigation Arrow */}
        {winnerEvents.length > 1 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlideIndex(prev => (prev + 1) % winnerEvents.length);
            }}
            style={{
              position: 'absolute',
              right: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(15, 15, 20, 0.95)',
              border: `2px solid ${currentTheme.accent}`,
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 15px ${currentTheme.accent}40`,
              zIndex: 30,
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              e.currentTarget.style.boxShadow = `0 0 25px ${currentTheme.accent}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = `0 0 15px ${currentTheme.accent}40`;
            }}
          >
            ▶
          </button>
        )}

        {/* Swipe Slide Content Wrapper */}
        <div
          style={{
            width: '100%',
            transform: `translateX(${dragOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Main Sliding Content */}
          <div 
            key={currentSlideIndex}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'slide-fade-in 0.5s ease-out both'
            }}
          >
            {/* Header Title */}
            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '4px',
                color: currentTheme.accent,
                textShadow: `0 0 10px ${currentTheme.accent}40`,
                display: 'inline-block',
                marginBottom: '4px',
              }}>
                🏆 {currentTheme.title}
              </span>
              <h2 style={{
                fontFamily: '"Outfit", sans-serif',
                fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1.2
              }}>
                {currentEvent.title}
              </h2>
              <p style={{
                color: '#94a3b8',
                fontSize: '0.9rem',
                maxWidth: '550px',
                margin: '8px auto 0',
                lineHeight: 1.5
              }}>
                {currentEvent.description}
              </p>
            </div>

            {/* 3D Podium Layout */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '16px',
              width: '100%',
              margin: '32px 0 12px',
              perspective: '1000px',
            }}>
              
              {/* 2nd Place (Silver) - Left */}
              {currentEvent.winners?.second && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  maxWidth: '180px',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(192, 192, 192, 0.1)',
                    border: '2.5px solid #C0C0C0',
                    boxShadow: '0 0 15px rgba(192, 192, 192, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    marginBottom: '10px',
                  }}>
                    🥈
                  </div>
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(192, 192, 192, 0.08) 0%, rgba(192, 192, 192, 0.25) 100%)',
                    border: '1.5px solid rgba(192, 192, 192, 0.3)',
                    borderRadius: '16px 16px 12px 12px',
                    padding: '20px 12px',
                    minHeight: '130px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C0C0C0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        2nd Place
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentEvent.winners.second.name}>
                        {currentEvent.winners.second.name}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#8A95A5', fontWeight: 700, fontStyle: 'italic', wordBreak: 'break-word' }}>
                        {currentEvent.winners.second.reward}
                      </div>
                      {currentEvent.winners.second.details && (
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {currentEvent.winners.second.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold) - Center */}
              {currentEvent.winners?.first && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1.1,
                  maxWidth: '220px',
                  zIndex: 2,
                }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(-5deg)',
                      fontSize: '1.4rem',
                      filter: 'drop-shadow(0 2px 5px rgba(255, 215, 0, 0.5))',
                      animation: 'float 3s ease-in-out infinite'
                    }}>
                      👑
                    </span>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(255, 215, 0, 0.12)',
                      border: '3px solid #FFD700',
                      boxShadow: '0 0 25px rgba(255, 215, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.6rem',
                      marginBottom: '14px',
                    }}>
                      🥇
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.3) 100%)',
                    border: '2px solid rgba(255, 215, 0, 0.5)',
                    borderRadius: '20px 20px 14px 14px',
                    padding: '24px 16px',
                    minHeight: '175px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.15)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                        🏆 Champion
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentEvent.winners.first.name}>
                        {currentEvent.winners.first.name}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '0.9rem', color: '#FFEFA3', fontWeight: 800, wordBreak: 'break-word', letterSpacing: '0.2px' }}>
                        {currentEvent.winners.first.reward}
                      </div>
                      {currentEvent.winners.first.details && (
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                          {currentEvent.winners.first.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) - Right */}
              {currentEvent.winners?.third && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  maxWidth: '180px',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(205, 127, 50, 0.1)',
                    border: '2.5px solid #CD7F32',
                    boxShadow: '0 0 15px rgba(205, 127, 50, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    marginBottom: '10px',
                  }}>
                    🥉
                  </div>
                  <div style={{
                    width: '100%',
                    background: 'linear-gradient(to top, rgba(205, 127, 50, 0.08) 0%, rgba(205, 127, 50, 0.25) 100%)',
                    border: '1.5px solid rgba(205, 127, 50, 0.3)',
                    borderRadius: '16px 16px 12px 12px',
                    padding: '20px 12px',
                    minHeight: '130px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#CD7F32', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        3rd Place
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentEvent.winners.third.name}>
                        {currentEvent.winners.third.name}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#D4B290', fontWeight: 700, fontStyle: 'italic', wordBreak: 'break-word' }}>
                        {currentEvent.winners.third.reward}
                      </div>
                      {currentEvent.winners.third.details && (
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {currentEvent.winners.third.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Pagination Dots */}
        {winnerEvents.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', margin: '16px 0 8px', zIndex: 10 }}>
            {winnerEvents.map((_, idx) => (
              <button 
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex(idx);
                }}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: idx === currentSlideIndex ? currentTheme.accent : 'rgba(255,255,255,0.2)',
                  boxShadow: idx === currentSlideIndex ? `0 0 8px ${currentTheme.accent}` : 'none',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>
        )}

        {/* Interactive Close & Congrats action */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', zIndex: 10 }}>
          <button 
            onClick={triggerChampionshipConfetti}
            className="sc-btn"
            style={{
              padding: '12px 24px',
              fontSize: '0.72rem',
              background: '#fff',
              color: '#000',
              boxShadow: '0 0 15px rgba(255,255,255,0.3)',
              borderRadius: '30px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(255,255,255,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
            }}
          >
            🎉 Congratulate!
          </button>
          <button 
            onClick={handleClose}
            className="sc-btn-outline"
            style={{
              padding: '12px 24px',
              fontSize: '0.72rem',
              borderRadius: '30px',
              border: `2px solid ${currentTheme.accent}`,
              color: currentTheme.accent,
              background: 'transparent'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${currentTheme.accent}12`;
              e.currentTarget.style.boxShadow = `0 0 20px ${currentTheme.accent}40`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Dismiss Page
          </button>
        </div>
      </div>

      {/* Embedded Animations CSS */}
      <style>{`
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.85) translateY(30px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scale-down {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.9) translateY(20px); }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slide-fade-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default WinnersPopup;
