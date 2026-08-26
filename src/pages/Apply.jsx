import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signInWithDiscord } from '../services/authService';
import { submitApplication, subscribeToAppSettings, getUserApplications } from '../services/applicationService';
import DiscordLoading from '../components/DiscordLoading';
import confetti from 'canvas-confetti';

const DEPT_QUESTIONS = {
  civilian: [
    { id: 'q1', label: 'What is Roleplay (RP)?' },
    { id: 'q2', label: 'During a police chase, your friend tells you on Discord where cops are waiting. Can you use it?' },
    { id: 'q3', label: 'What is Power Gaming?' },
    { id: 'q4', label: 'What is Random Death Match (RDM)?' },
    { id: 'q5', label: 'What is Vehicle Death Match (VDM)?' },
    { id: 'q6', label: 'What is New Life Rule (NLR)?' },
    { id: 'q7', label: 'What is Fail RP?' },
    { id: 'q8', label: 'Someone insults you repeatedly. Can you kill them?' },
    { id: 'q9', label: 'If police stop you, what do you do?' },
    { id: 'q10', label: 'EMS revives your friend in middle of shootout. Can he rejoin fight instantly?' },
    { id: 'q11', label: 'If someone breaks rules against you, what do you do?' }
  ],
  police: [
    { id: 'pd1', label: 'Do you have any prior experience in roleplay as a police officer? If yes, please describe.' },
    { id: 'pd2', label: 'Why do you want to join the Police Department on this server?' },
    { id: 'pd3', label: 'If you encounter a civilian who is verbally disrespectful but non-violent, how would you handle the situation?' },
    { id: 'pd4', label: 'During a traffic stop, a civilian refuses to provide their ID and begins arguing with you. What would your next steps be?' },
    { id: 'pd5', label: 'How would you ensure that civilians understand their fines during processing?' },
    { id: 'pd6', label: 'If a civilian flees during an arrest, what measures would you take to maintain realistic and balanced roleplay?' },
    { id: 'pd7', label: 'A civilian accuses you of unfairly issuing a fine. How would you respond while staying in character?' }
  ],
  ems: [
    { id: 'ems1', label: 'You arrive at a scene with: One unconscious patient breathing and One conscious patient shouting in pain. Who do you treat first, and why?' },
    { id: 'ems2', label: 'You reach an accident, but the area is still unsafe (fire / active threat). Do you enter or hold position? Explain your reasoning.' },
    { id: 'ems3', label: 'A patient is talking normally and suddenly collapses. List your first 3 actions in order.' },
    { id: 'ems4', label: 'Write how you would assess an unconscious patient in proper EMS roleplay.' },
    { id: 'ems5', label: 'Another EMS skips all steps and instantly "heals" the patient. What do you do?' },
    { id: 'ems6', label: 'Most of the Players stopped joining the server as EMS and many people aren\'t really co-operative with you. In this situation what will you be doing, 1) leave EMS and join PD? 2) still be in EMS and take control yourself? Choose an option and explain it.' }
  ],
  mechanic: [
    { id: 'mech1', label: 'Why do you want to join the Mechanic Department?' },
    { id: 'mech2', label: 'What qualities make a good mechanic?' },
    { id: 'mech3', label: 'A customer comes in angry and demands instant service. What do you do?' },
    { id: 'mech4', label: 'Two vehicles arrive at once: one flat tire, one engine smoking. Which do you help first?' },
    { id: 'mech5', label: 'A police vehicle needs emergency repairs during an active scene. What do you do?' }
  ],
  doj: [
    { id: 'doj1', label: 'Why do you want to join the Department of Justice?' },
    { id: 'doj2', label: 'What responsibilities do you believe a DOJ member has within the city?' },
    { id: 'doj3', label: 'What qualities make you a suitable candidate for the Department of Justice?' },
    { id: 'doj4', label: 'How would you ensure fair roleplay while performing DOJ duties?' },
    { id: 'doj5', label: 'Are you willing to attend DOJ meetings, training sessions, and court proceedings when required?' }
  ]
};

const Apply = () => {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('selection'); // selection, form
  const [appType, setAppType] = useState(null);
  const [step, setStep] = useState(1);
  
  const [appSettings, setAppSettings] = useState({
    policeLocked: true,
    emsLocked: true,
    mechanicLocked: true,
    dojLocked: true
  });

  const [userApplications, setUserApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Success Confetti
  useEffect(() => {
    if (submitted) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A78BFA', '#F59E0B', '#10B981', '#ffffff']
      });
    }
  }, [submitted]);

  // Subscribe to real-time locks
  useEffect(() => {
    const unsubscribe = subscribeToAppSettings((settings) => {
      setAppSettings(settings);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '', // Discord Handle
    discordName: '', // Discord Global Name
    age: '',
    discordId: '', // Numeric ID
    characterName: '',
    answers: {}, // Dynamic answers
    characterBackstory: '',
  });

  // Prefill when user data is available & Fetch applications
  useEffect(() => {
    if (userData) {
      console.log('👤 User data loaded:', { 
        discordId: userData.discordId, 
        role: userData.role, 
        name: userData.discordUsername 
      });

      setFormData(prev => ({
        ...prev,
        fullName: userData.discordUsername || '',
        discordName: userData.name || '',
        discordId: userData.discordId || '',
      }));

      // Fetch existing applications for this Discord ID
      const discordId = userData.discordId;
      if (discordId) {
        const fetchApps = async () => {
          setLoadingApps(true);
          try {
            const apps = await getUserApplications(discordId);
            console.log('📋 User applications loaded:', apps);
            setUserApplications(apps);
          } catch (err) {
            console.error('❌ Error fetching applications:', err);
          }
          setLoadingApps(false);
        };
        fetchApps();
      } else {
        console.warn('⚠️ No discordId found on user profile — cannot look up applications.');
      }
    }
  }, [userData]);

  // Determine standard role access fallback just in case, but global lock takes priority
  // Wait, user requested absolute admin control: if unlocked in admin, it's unlocked for everyone.
  // So we completely rely on appSettings.

  const departments = [
    { 
      id: 'civilian', 
      label: 'Whitelist Application', 
      desc: 'Submit your application to become a citizen of Dream City.',
      icon: '🏙️', 
      badge: 'SEASON 2', 
      badgeType: 'department',
      locked: false 
    },
    { 
      id: 'police', 
      label: 'Police Department', 
      desc: 'Join the LSPD and protect the streets of our city.',
      icon: '🚔', 
      badge: 'ALLOWLIST ONLY', 
      badgeType: 'membership',
      locked: appSettings.policeLocked
    },
    { 
      id: 'ems', 
      label: 'EMS Application', 
      desc: 'Save lives and provide medical assistance to help the injured.',
      icon: '🚑', 
      badge: 'ALLOWLIST ONLY', 
      badgeType: 'membership',
      locked: appSettings.emsLocked
    },
    { 
      id: 'mechanic', 
      label: 'Mechanic Application', 
      desc: 'Master the art of repair and help citizens with their vehicles.',
      icon: '🔧', 
      badge: 'ALLOWLIST ONLY', 
      badgeType: 'membership',
      locked: appSettings.mechanicLocked
    },
    { 
      id: 'doj', 
      label: 'DOJ Application', 
      desc: 'Join the Department of Justice and uphold the law.',
      icon: '⚖️', 
      badge: 'ALLOWLIST ONLY', 
      badgeType: 'membership',
      locked: appSettings.dojLocked
    },
  ];

  const handleDiscordLogin = async () => {
    setDiscordConnecting(true);
    setError('');
    try {
      await signInWithDiscord();
      // Stay on the selection view so the user can see their application statuses
    } catch (err) {
      console.error('Discord Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please complete the login process in the popup window.');
      } else {
        setError(`Login failed: ${err.message || 'Please disable Adblockers and ensure cookies are enabled.'}`);
      }
    } finally {
      setDiscordConnecting(false);
    }
  };

  const startApplication = (dept) => {
    if (dept.locked) return;
    setAppType(dept.id);
    setView('form');
    setStep(1);
  };

  const isDiscordIdValid = /^\d+$/.test(formData.discordId);

  const validateStep = (s) => {
    setError('');
    if (s === 1) {
      if (!isDiscordIdValid) {
        setError('Your Discord Identity is not set correctly. Please Log Out and Log In again.');
        return false;
      }
      if (!formData.fullName.trim()) { setError('Name is required'); return false; }
      if (!formData.characterName.trim()) { setError('Character Name is required'); return false; }
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 15) { setError('Minimum age for application is 15.'); return false; }
    } else if (s === 2) {
      const currentQuestions = DEPT_QUESTIONS[appType] || [];
      for (const q of currentQuestions) {
        const answer = formData.answers[q.id];
        if (!answer || answer.trim().length < 10) {
          setError('Please answer all department questions with more detail.');
          return false;
        }
      }
    } else if (s === 3) {
      if (formData.characterBackstory.trim().length < 150) { setError('Backstory is too short (min 150 chars).'); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep(step)) { setStep(p => p + 1); window.scrollTo(0, 0); } };
  const prevStep = () => { setStep(p => p - 1); window.scrollTo(0, 0); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      // Check for duplicates again just in case
      const apps = await getUserApplications(formData.discordId);
      // ONLY reject if there is a Pending or Approved app
      const isDuplicate = apps.some(app => app.type === appType && app.status !== 'rejected');
      
      const userRole = userData?.role?.toLowerCase() || '';
      const isMember = ['civilian', 'police', 'pd', 'ems', 'mechanic'].includes(userRole);
      let isRoleDuplicate = false;

      if (appType === 'civilian' && isMember) isRoleDuplicate = true;
      if (appType === 'police' && (userRole === 'police' || userRole === 'pd')) isRoleDuplicate = true;
      if (appType === 'ems' && userRole === 'ems') isRoleDuplicate = true;
      if (appType === 'mechanic' && userRole === 'mechanic') isRoleDuplicate = true;
      
      if (isDuplicate || isRoleDuplicate) {
        throw new Error(`You have already submitted a ${appType} application or already have this role.`);
      }

      await submitApplication(formData, appType, currentUser.uid);
      setSubmitted(true);
      
      // Refresh applications list
      const updatedApps = await getUserApplications(formData.discordId);
      setUserApplications(updatedApps);
    } catch (err) {
      setError(err.message || 'Failed to submit.');
    } finally { setLoading(false); }
  };

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loading-spinner" /></div>;

  if (!currentUser) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px' }}>
      {discordConnecting && <DiscordLoading />}
      <div className="sc-card" style={{ maxWidth: '450px', padding: '60px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '24px' }}>🛡️</div>
        <h1 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '2rem', marginBottom: '16px' }}>Application Portal</h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px', lineHeight: 1.6 }}>To ensure the quality of our roleplay community, please sign in with Discord to begin your application.</p>
        <button onClick={handleDiscordLogin} disabled={discordConnecting} className="sc-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          {discordConnecting ? 'Connecting...' : (
            <>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0a12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057a19.9 19.9 0 005.993 3.03a.078.078 0 00.084-.028a14.09 14.09 0 001.226-1.994a.076.076 0 00-.041-.106a13.107 13.107 0 01-1.872-.892a.077.077 0 01-.008-.128a10.2 10.2 0 00.372-.292a.074.074 0 01.077-.01a13.98 13.98 0 0012.084 0a.074.074 0 01.078.01a10.122 10.122 0 00.372.292a.077.077 0 01-.007.128a12.253 12.253 0 01-1.873.892a.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028a19.839 19.839 0 006.002-3.03a.082.082 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.966 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Continue with Discord
            </>
          )}
        </button>
        {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '16px' }}>{error}</p>}
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px' }}>
      <div className="sc-card" style={{ padding: '60px 48px', textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>✅</div>
        <h2 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '2rem', marginBottom: '16px' }}>Successfully Submitted!</h2>
        <p style={{ color: '#94a3b8', marginBottom: '32px', lineHeight: 1.7 }}>Your application for the <b>{appType.toUpperCase()}</b> position has been sent to our recruitment team. We will contact you via Discord soon.</p>
        <Link to="/" className="sc-btn">Home</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '80px', position: 'relative' }}>
      <div className="grid-lines" />
      
      <div className="sc-container" style={{ position: 'relative', zIndex: 1 }}>
        {view === 'selection' ? (
          <div>
            <div style={{ marginBottom: '60px' }}>
              <h1 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '12px' }}>Available <span style={{ color: '#A78BFA' }}>Applications</span></h1>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Select an application below to submit your form. All applications are reviewed by our team.</p>
              {loadingApps && (
                <p style={{ color: '#A78BFA', fontSize: '0.85rem', marginTop: '12px', fontWeight: 600 }}>⏳ Checking your application history...</p>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
              {departments.map(dept => {
                let existingApp = userApplications.find(app => app.type === dept.id);
                // If rejected, allows user to apply again (Reset existingApp for logic)
                if (existingApp?.status === 'rejected') existingApp = null;

                const isLocked = dept.locked;
                
                // Role-based status for existing members
                const userRole = userData?.role?.toLowerCase() || '';
                const isMember = ['civilian', 'police', 'pd', 'ems', 'mechanic'].includes(userRole);
                if (!existingApp) {
                  // Bypass removed: Do not fake an approved application just because the user has a role in Firestore, 
                  // as it causes confusion when actual applications are pending or when they are just testing the form.
                }
                
                return (
                  <div key={dept.id} className="sc-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`sc-badge sc-badge-${dept.badgeType}`}>{dept.badge}</span>
                      <span style={{ fontSize: '2rem' }}>{dept.icon}</span>
                    </div>
                    <div>
                      <h3 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '1.5rem', marginBottom: '8px' }}>{dept.label}</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>{dept.desc}</p>
                    </div>
                    
                    {isLocked ? (
                      <button 
                        className="sc-btn-outline" 
                        disabled 
                        style={{ 
                          marginTop: 'auto', width: '100%', borderRadius: '8px', 
                          opacity: 0.35, filter: 'grayscale(1)',
                          cursor: 'not-allowed',
                          display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        Recruitment Closed
                      </button>
                    ) : existingApp ? (
                      <div style={{ 
                        marginTop: 'auto', 
                        padding: '16px', 
                        borderRadius: '16px', 
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', fontWeight: 800, margin: 0 }}>Portal Status</p>
                        <span style={{
                          padding: '6px 16px', borderRadius: '20px', fontSize: '0.65rem',
                          fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px',
                          background: existingApp.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                          color: existingApp.status === 'approved' ? '#10b981' : '#A78BFA',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          {existingApp.status}
                        </span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startApplication(dept)} 
                        className="sc-btn" 
                        style={{ marginTop: 'auto', width: '100%', borderRadius: '8px' }}
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                );
              })}
              
              {/* Priority Placeholder Card */}
              <div className="sc-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px dashed rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="sc-badge sc-badge-priority">CLICK HERE TO BUY PRIORITY</span>
                  <span style={{ fontSize: '2rem' }}>⚡</span>
                </div>
                <div>
                  <h3 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '1.5rem', marginBottom: '8px' }}>Priority Application</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>Skip the queue and get your application reviewed within 24 hours.</p>
                </div>
                <Link to="/store" className="sc-btn-outline" style={{ marginTop: 'auto', width: '100%', borderRadius: '8px', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}>
                   Purchase Priority
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <button onClick={() => setView('selection')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '20px' }}>← Back to Selection</button>
              <h1 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '2.2rem', marginBottom: '10px' }}>
                Applying for <span style={{ color: '#A78BFA' }}>{departments.find(d => d.id === appType).label}</span>
              </h1>
              
              {/* Step indicator */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{ 
                    width: '30px', height: '4px', borderRadius: '2px', 
                    background: step === s ? '#A78BFA' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.3s'
                  }} />
                ))}
              </div>
            </div>

            <div className="sc-card" style={{ padding: '48px' }}>
              {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '14px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontSize: '0.9rem' }}>⚠️ {error}</div>}
              
              <form onSubmit={handleSubmit}>
                {step === 1 && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Discord Username</label>
                        <input className="sc-input" value={formData.fullName} disabled style={{ opacity: 0.8 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Age</label>
                        <input className="sc-input" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Character Name</label>
                      <input className="sc-input" value={formData.characterName} onChange={e => setFormData({...formData, characterName: e.target.value})} placeholder="Firstname Lastname" />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div style={{ background: 'rgba(167, 139, 250, 0.05)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(167, 139, 250, 0.1)' }}>
                       <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#A78BFA', marginBottom: '8px', fontWeight: 800 }}>
                         {appType.toUpperCase()} Application Questions
                       </h3>
                       <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Please demonstrate your understanding and suitability for this position.</p>
                    </div>

                    {(DEPT_QUESTIONS[appType] || []).map((q, idx) => (
                      <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                          {idx + 1}. {q.label}
                          {q.format && (
                            <span className="blink-text" style={{ marginLeft: '8px', color: '#f59e0b' }}>
                              ({q.format})
                            </span>
                          )}
                        </label>
                        {q.options ? (
                          <select 
                            className="sc-input" 
                            value={formData.answers[q.id] || ''} 
                            onChange={e => setFormData({
                              ...formData, 
                              answers: { ...formData.answers, [q.id]: e.target.value }
                            })}
                          >
                            <option value="">-- Select an option --</option>
                            {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <textarea 
                            className="sc-input" 
                            value={formData.answers[q.id] || ''} 
                            onChange={e => setFormData({
                              ...formData, 
                              answers: { ...formData.answers, [q.id]: e.target.value }
                            })} 
                            rows={3} 
                            style={{ resize: 'none' }} 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Character Backstory</label>
                    <textarea className="sc-input" value={formData.characterBackstory} onChange={e => setFormData({...formData, characterBackstory: e.target.value})} rows={10} style={{ resize: 'none' }} placeholder="Min 150 characters..." />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                      <p style={{ fontSize: '0.75rem', color: formData.characterBackstory.length < 150 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                        {formData.characterBackstory.length} / 150 characters
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                  {step > 1 && <button type="button" onClick={prevStep} className="sc-btn-outline" style={{ flex: 1, borderRadius: '12px' }}>Back</button>}
                  {step < 3 ? (
                    <button type="button" onClick={nextStep} className="sc-btn" style={{ flex: step > 1 ? 1 : '1 1 100%', borderRadius: '12px' }}>Next Step</button>
                  ) : (
                    <button type="submit" className="sc-btn" disabled={loading} style={{ flex: 1, borderRadius: '12px' }}>{loading ? 'Submitting...' : 'Complete Application'}</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Apply;
