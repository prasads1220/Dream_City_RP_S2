import { useState, useEffect } from 'react';
import { 
  getAllApplications, 
  processApplicationDecision, 
  deleteApplications, 
  subscribeToAppSettings, 
  updateAppLock,
  updateApplicationMetadata 
} from '../services/applicationService';
import { getAllUsers, updateUserRole, signUp, createAdminAccount, fetchAdminsFromBackend } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { fetchLivePlayers, performPlayerAction, sendAnnouncement } from '../services/txAdminService';
import axios from 'axios';
import { createEvent, getAllEvents, deleteEvent, setActiveEvent, updateEvent, getAllEventApplications, deleteEventApplication } from '../services/eventService';

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
  ]
};

const DEPT_RANKS = {
  police: [
    'CHIEF', 'ASSISTANT CHIEF', 'COMMANDER', 'CAPTAIN', 'LIEUTENANT', 
    'HEAD SERGEANT', 'SERGEANT', 'CORPORAL', 'LANCE CORPORAL', 
    'SENIOR LEAD OFFICER', 'SENIOR OFFICER', 'OFFICER', 
    'PROBATIONARY OFFICER', 'SOLO CADET', 'CADET'
  ],
  ems: [
    'EMS Chief', 'EMS Co-Chief', 'EMS', 'Surgeon', 'Paramedic', 
    'Intern Doctor', 'Trainee'
  ],
  mechanic: [
    'Mechanic Chief', 'Garage Manager', 'Asst Manager', 
    'Sr Mechanic', 'Jr Mechanic', 'Recruit'
  ]
};

const AdminDashboard = () => {
  const { userData } = useAuth();
  const userRole = userData?.role || 'admin';
  const isMainAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState('applications'); // 'applications', 'staff', or 'server'
  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState([]);
  const [livePlayers, setLivePlayers] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState(new Set());
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', name: '', discordUsername: '', role: 'admin' });
  
  // Event Management States
  const [eventsList, setEventsList] = useState([]);
  const [eventApplications, setEventApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [expandedApplicationsId, setExpandedApplicationsId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    type: 'car_race',
    customBgUrl: '',
    description: '',
    active: false,
    published: true,
    winners: {
      first: { name: '', reward: '', details: '' },
      second: { name: '', reward: '', details: '' },
      third: { name: '', reward: '', details: '' }
    }
  });

  // Real-time app settings
  const [appSettings, setAppSettings] = useState({
    policeLocked: true,
    emsLocked: true,
    mechanicLocked: true
  });

  // New Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingApp, setSchedulingApp] = useState(null);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '' });
  const [selectedRank, setSelectedRank] = useState({}); // { appId: rank }
  const [adminMessages, setAdminMessages] = useState({}); // { appId: message }

  // Pagination State
  const [staffPage, setStaffPage] = useState(1);
  const [appPage, setAppPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to Application Locks
  useEffect(() => {
    const unsubscribe = subscribeToAppSettings((settings) => {
      setAppSettings(settings);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const fetchEventsList = async () => {
    try {
      const data = await getAllEvents();
      setEventsList(data || []);
    } catch (err) {
      console.error('Failed to load events in dashboard:', err);
    }
  };

  const fetchEventApps = async () => {
    setAppsLoading(true);
    try {
      const data = await getAllEventApplications();
      setEventApplications(data || []);
    } catch (err) {
      console.error('Failed to load event applications:', err);
    }
    setAppsLoading(false);
  };

  useEffect(() => { 
    fetchApps();
    fetchUsers();
    fetchPlayers();
    fetchEventsList();
    fetchEventApps();
  }, []);

  const fetchPlayers = async () => {
    try {
      const data = await fetchLivePlayers();
      setLivePlayers(data || []);
    } catch (err) {
      console.warn('Could not fetch live players:', err.message);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, newEvent);
        setToast({ type: 'success', message: 'Event updated successfully!' });
      } else {
        await createEvent(newEvent);
        setToast({ type: 'success', message: 'Event registered successfully!' });
      }
      setShowAddEvent(false);
      setEditingEventId(null);
      setNewEvent({
        title: '',
        date: '',
        type: 'car_race',
        customBgUrl: '',
        description: '',
        active: false,
        published: true,
        winners: {
          first: { name: '', reward: '', details: '' },
          second: { name: '', reward: '', details: '' },
          third: { name: '', reward: '', details: '' }
        }
      });
      await fetchEventsList();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to save event.' });
    }
    setLoading(false);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTogglePublish = async (id, currentPublished) => {
    setActionLoading(id);
    try {
      const isPub = currentPublished !== false;
      await updateEvent(id, { published: !isPub });
      setToast({ type: 'success', message: `Event ${!isPub ? 'published' : 'moved to draft'} successfully!` });
      await fetchEventsList();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update publication status.' });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteEventApp = async (appId) => {
    if (!window.confirm('Are you sure you want to remove this application?')) return;
    setActionLoading(appId);
    try {
      await deleteEventApplication(appId);
      setEventApplications(prev => prev.filter(app => app.id !== appId));
      setToast({ type: 'success', message: 'Application removed successfully.' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to remove application.' });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    setActionLoading(id);
    try {
      await deleteEvent(id);
      setEventsList(prev => prev.filter(e => e.id !== id));
      setToast({ type: 'success', message: 'Event deleted successfully.' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete event.' });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleEventActive = async (id) => {
    setActionLoading(id);
    try {
      await setActiveEvent(id);
      setToast({ type: 'success', message: 'Welcome popup activated for this event!' });
      await fetchEventsList();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to toggle active event.' });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownloadCSV = (event) => {
    const apps = eventApplications.filter(app => app.eventId === event.id);
    if (apps.length === 0) {
      setToast({ type: 'error', message: 'No applications found to download.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    const headers = 'Character Name,Discord ID\n';
    const rows = apps.map(app => 
      `"${(app.characterName || '').replace(/"/g, '""')}",` +
      `"${(app.discordId || '').replace(/"/g, '""')}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `registrations_${event.title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ type: 'success', message: 'CSV download started!' });
    setTimeout(() => setToast(null), 3000);
  };

  // Auto-refresh players when on server tab
  useEffect(() => {
    if (activeTab !== 'server') return;
    const interval = setInterval(fetchPlayers, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    setAppPage(1);
    setStaffPage(1);
  }, [filter, typeFilter, searchQuery]);

  const fetchApps = async () => {
    setLoading(true);
    try { setApplications(await getAllApplications()); } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try { 
      // Use backend-driven fetch for better reliability and linkage
      const adminList = await fetchAdminsFromBackend();
      setUsers(adminList);
    } catch (err) { 
      console.error('Fetch Users Error:', err); 
    }
    setLoading(false);
  };

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        let baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
        // Clean trailing slash
        baseUrl = baseUrl.replace(/\/$/, '');
        
        console.log('📡 Checking Backend Health at:', `${baseUrl}/api/health`);
        const res = await axios.get(`${baseUrl}/api/health`);
        setBackendOnline(res.data.status === 'online');
      } catch (err) {
        console.warn('❌ Health check failed:', err.message);
        setBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (app, status) => {
    setActionLoading(app.id);
    try {
      const adminMessage = adminMessages[app.id] || '';
      const metadata = { adminMessage };
      const result = await processApplicationDecision(app.id, status, app, metadata);
      
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status } : a));
      
      if (status === 'approved') {
        if (!result.discord) {
          setToast({ type: 'warning', message: `Approved, but Discord automation failed: ${result.error || 'Check Bot Status'}` });
        } else {
          setToast({ type: 'success', message: 'Application approved and Discord role assigned!' });
        }
      } else {
        setToast({ type: 'success', message: 'Application rejected.' });
      }
      
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setToast({ type: 'error', message: 'Action failed. Check your connection.' });
      setTimeout(() => setToast(null), 3000);
    }
    setActionLoading(null);
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!schedulingApp) return;
    setActionLoading(schedulingApp.id);
    try {
      // 1. Update Metadata in Firestore & Notify via Discord
      const metadata = { 
        interviewDate: scheduleData.date, 
        interviewTime: scheduleData.time 
      };

      await updateApplicationMetadata(schedulingApp.id, {
        status: 'scheduled',
        ...metadata
      });

      // 2. Trigger Discord Notification for Scheduling
      await processApplicationDecision(schedulingApp.id, 'scheduled', schedulingApp, metadata);

      setApplications(prev => prev.map(a => a.id === schedulingApp.id ? { 
        ...a, 
        status: 'scheduled', 
        ...metadata
      } : a));

      setToast({ type: 'success', message: 'Interview scheduled and Discord notified!' });
      setShowScheduleModal(false);
      setSchedulingApp(null);
      setScheduleData({ date: '', time: '' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to schedule interview.' });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApproveWithRank = async (app) => {
    const rank = selectedRank[app.id];
    if (app.type !== 'civilian' && !rank) {
      setToast({ type: 'error', message: 'Please select a rank first!' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    setActionLoading(app.id);
    try {
      const adminMessage = adminMessages[app.id] || '';
      
      // 1. Save rank to Firestore first
      if (rank) await updateApplicationMetadata(app.id, { jobRank: rank });
      
      // 2. Complete decision (Approved) + Notify with Rank
      const metadata = rank ? { jobRank: rank, adminMessage } : { adminMessage };
      const result = await processApplicationDecision(app.id, 'approved', app, metadata);
      
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved', jobRank: rank } : a));
      
      if (!result.discord) {
        setToast({ type: 'warning', message: `Approved${rank ? ` as ${rank}` : ''}, but Discord failed.` });
      } else {
        setToast({ type: 'success', message: `Approved${rank ? ` as ${rank}` : ''} and Discord role assigned!` });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Approval failed.' });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) return;
    setActionLoading(id);
    try {
      // Surgical Role Removal on Deletion
      const app = applications.find(a => a.id === id);
      if (app && app.status === 'approved' && app.discordId && ['police', 'ems', 'mechanic'].includes(app.type)) {
        try {
          let baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
          baseUrl = baseUrl.replace(/\/$/, '');
          await axios.post(`${baseUrl}/api/revoke-role`, { discordId: app.discordId, type: app.type });
          console.log(`✅ ${app.type} roles surgically revoked for`, app.discordId);
        } catch (revokeErr) {
          console.warn('⚠️ Failed to revoke Discord roles:', revokeErr.message);
        }
      }
      await deleteApplications([id]);
      setApplications(prev => prev.filter(a => a.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setToast({ type: 'success', message: 'Application deleted.' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', message: 'Delete failed.' });
      setTimeout(() => setToast(null), 3000);
    }
    setActionLoading(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!window.confirm(`Are you sure you want to delete ${ids.length} applications? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      // Surgical Role Removal on Bulk Deletion
      let baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
      baseUrl = baseUrl.replace(/\/$/, '');
      for (const id of ids) {
        const app = applications.find(a => a.id === id);
        if (app && app.status === 'approved' && app.discordId && ['police', 'ems', 'mechanic'].includes(app.type)) {
          try {
            await axios.post(`${baseUrl}/api/revoke-role`, { discordId: app.discordId, type: app.type });
          } catch (revokeErr) {
            console.warn(`⚠️ Failed to revoke ${app.type} roles for ${app.discordId}:`, revokeErr.message);
          }
        }
      }
      await deleteApplications(ids);
      setApplications(prev => prev.filter(a => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      setToast({ type: 'success', message: `${ids.length} applications deleted.` });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', message: 'Bulk delete failed.' });
      setTimeout(() => setToast(null), 3000);
    }
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRoleUpdate = async (uid, newRole) => {
    setActionLoading(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
      setToast({ type: 'success', message: `User role updated to ${newRole}` });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update role.' });
      setTimeout(() => setToast(null), 3000);
    }
    setActionLoading(null);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { email, password, name, discordUsername } = newAdmin;
      
      // Use Backend Silent Creation to prevent logout
      const selectedRole = newAdmin.role || 'admin';
      await createAdminAccount({ email, password, name, discordUsername, role: selectedRole });
      
      const roleLabel = { admin: 'Main Admin', police: 'Police', ems: 'EMS', mechanic: 'Mechanic' }[selectedRole] || selectedRole;
      setToast({ type: 'success', message: `${roleLabel} account for ${name} created successfully!` });
      setShowAddAdmin(false);
      setNewAdmin({ email: '', password: '', name: '', discordUsername: '', role: 'admin' });
      fetchUsers(); // Refresh list from backend
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to create admin.' });
    }
    setLoading(false);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteStaff = async (uid) => {
    const { deleteAdminAccount } = await import('../services/authService');
    if (!window.confirm('PERMANENT ACTION: This will delete the account from Login AND Database. They will NOT be able to login again. Proceed?')) return;
    
    setActionLoading(uid);
    try {
      await deleteAdminAccount(uid);
      setUsers(prev => prev.filter(u => u.id !== uid));
      setToast({ type: 'success', message: 'Staff member permanently deleted.' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePlayerAction = async (action, target, reason = '', targetName = '') => {
    setActionLoading(`player-${target}-${action}`);
    try {
      await performPlayerAction(action, target, { 
        reason, 
        staffName: userData?.name || 'Unknown Staff',
        targetName 
      });
      setToast({ type: 'success', message: `Action ${action} successful!` });
      fetchPlayers(); // Refresh list
    } catch (err) {
      setToast({ type: 'error', message: `Failed to ${action}: ${err.message}` });
    }
    setActionLoading(null);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcement.trim()) return;
    setLoading(true);
    try {
      await sendAnnouncement(announcement, userData?.name || 'Unknown Staff');
      setToast({ type: 'success', message: 'Announcement sent to server!' });
      setAnnouncement('');
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to send announcement.' });
    }
    setLoading(false);
    setTimeout(() => setToast(null), 3000);
  };

  const handleBulkDeleteStaff = async () => {
    const { deleteAdminAccount } = await import('../services/authService');
    const ids = Array.from(selectedStaffIds);
    if (!window.confirm(`PERMANENT ACTION: This will delete ${ids.length} staff accounts. They will NOT be able to login again. Proceed?`)) return;
    
    setLoading(true);
    try {
      for (const uid of ids) {
        await deleteAdminAccount(uid);
      }
      setUsers(prev => prev.filter(u => !selectedStaffIds.has(u.id)));
      setSelectedStaffIds(new Set());
      setToast({ type: 'success', message: `${ids.length} staff members removed.` });
    } catch (err) {
      setToast({ type: 'error', message: 'Bulk delete partially failed.' });
    }
    setLoading(false);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSelectStaff = (id) => {
    setSelectedStaffIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllStaff = () => {
    const admins = users.filter(u => u.role === 'admin');
    if (selectedStaffIds.size === admins.length && admins.length > 0) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(admins.map(u => u.id)));
    }
  };

  const STAFF_ROLES = ['admin', 'police', 'ems', 'mechanic'];
  const filteredAdmins = users.filter(u => {
    const isStaff = STAFF_ROLES.includes(u.role);
    const searchLower = searchQuery.toLowerCase();
    const searchName = u.name?.toLowerCase() || '';
    const searchEmail = u.email?.toLowerCase() || '';
    const searchDiscord = u.discordUsername?.toLowerCase() || '';
    const matchesSearch = !searchQuery || searchName.includes(searchLower) || searchEmail.includes(searchLower) || searchDiscord.includes(searchLower);
    return isStaff && matchesSearch;
  });
  const indexOfLastStaff = staffPage * itemsPerPage;
  const indexOfFirstStaff = indexOfLastStaff - itemsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirstStaff, indexOfLastStaff);
  const totalStaffPages = Math.ceil(filteredAdmins.length / itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  };

  // Role-based filtering: department users only see their department's applications
  const effectiveTypeFilter = isMainAdmin ? typeFilter : userRole;

  const filtered = applications.filter(a => {
    const matchesStatus = filter === 'all' || a.status === filter;
    const matchesType = effectiveTypeFilter === 'all' || a.type === effectiveTypeFilter;
    const searchLower = searchQuery.toLowerCase();
    const searchName = a.discordName?.toLowerCase() || '';
    const searchFullName = a.fullName?.toLowerCase() || '';
    const searchId = a.discordId ? String(a.discordId) : '';
    const matchesSearch = !searchQuery || searchName.includes(searchLower) || searchFullName.includes(searchLower) || searchId.includes(searchLower);
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const indexOfLastApp = appPage * itemsPerPage;
  const indexOfFirstApp = indexOfLastApp - itemsPerPage;
  const currentApps = filtered.slice(indexOfFirstApp, indexOfLastApp);
  const totalAppPages = Math.ceil(filtered.length / itemsPerPage);

  // Counts should reflect department-scoped data for department users
  const scopedApps = isMainAdmin ? applications : applications.filter(a => a.type === userRole);
  const counts = {
    all: scopedApps.length,
    civilian: scopedApps.filter(a => a.type === 'civilian').length,
    police: scopedApps.filter(a => a.type === 'police').length,
    ems: scopedApps.filter(a => a.type === 'ems').length,
    mechanic: scopedApps.filter(a => a.type === 'mechanic').length,
    pending: scopedApps.filter(a => a.status === 'pending').length,
    scheduled: scopedApps.filter(a => a.status === 'scheduled').length,
    approved: scopedApps.filter(a => a.status === 'approved').length,
    rejected: scopedApps.filter(a => a.status === 'rejected').length,
  };

  // Department label for header
  const deptLabels = { admin: '', police: 'Police', ems: 'EMS', mechanic: 'Mechanic' };
  const deptLabel = deptLabels[userRole] || '';

  const typeColors = {
    civilian: '#A78BFA',
    police: '#3B82F6',
    ems: '#EF4444',
    mechanic: '#F59E0B'
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', paddingTop: '120px', paddingBottom: '80px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '100px', right: '24px', padding: '14px 24px',
          borderRadius: '14px', fontWeight: 700, zIndex: 1000,
          background: toast.type === 'success' ? '#A78BFA' : '#ef4444',
          color: toast.type === 'success' ? '#000' : '#fff',
          boxShadow: '0 0 30px rgba(0,0,0,0.5)',
          animation: 'slide-up 0.3s ease-out',
        }}>
          {toast.message}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8,8,12,0.95)', border: '1px solid rgba(167,139,250,0.3)',
          padding: '16px 32px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '24px',
          zIndex: 1000, boxShadow: '0 10px 40px rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
          animation: 'slide-up 0.3s ease-out'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#A78BFA' }}>{selectedIds.size} Selected</span>
          <button onClick={handleBulkDelete} className="sc-btn" style={{ padding: '8px 20px', fontSize: '0.7rem', background: '#ef4444', color: '#fff', boxShadow: 'none' }}>
            Delete Selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Cancel
          </button>
        </div>
      )}


      <div className="sc-container">
        {/* Main Tab Switcher */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={() => setActiveTab('applications')}
            style={{ 
              padding: '16px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'applications' ? '#A78BFA' : '#64748b',
              fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px',
              borderBottom: activeTab === 'applications' ? '2px solid #A78BFA' : '2px solid transparent',
              transition: 'all 0.3s'
            }}
          >
            {isMainAdmin ? 'Applications' : `${deptLabel} Applications`}
          </button>
          {isMainAdmin && (
            <button 
              onClick={() => setActiveTab('staff')}
              style={{ 
                padding: '16px 4px', background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === 'staff' ? '#A78BFA' : '#64748b',
                fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px',
                borderBottom: activeTab === 'staff' ? '2px solid #A78BFA' : '2px solid transparent',
                transition: 'all 0.3s'
              }}
            >
              Staff Management
            </button>
          )}
          <button 
            onClick={() => setActiveTab('server')}
            style={{ 
              padding: '16px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'server' ? '#A78BFA' : '#64748b',
              fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px',
              borderBottom: activeTab === 'server' ? '2px solid #A78BFA' : '2px solid transparent',
              transition: 'all 0.3s'
            }}
          >
            Live Server
          </button>
          <button 
            onClick={() => setActiveTab('winners')}
            style={{ 
              padding: '16px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'winners' ? '#A78BFA' : '#64748b',
              fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px',
              borderBottom: activeTab === 'winners' ? '2px solid #A78BFA' : '2px solid transparent',
              transition: 'all 0.3s'
            }}
          >
            Events Management
          </button>
          {/* Department Role Badge */}
          {!isMainAdmin && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '0.65rem',
                fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px',
                background: userRole === 'police' ? 'rgba(59,130,246,0.15)' : userRole === 'ems' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                color: userRole === 'police' ? '#3B82F6' : userRole === 'ems' ? '#EF4444' : '#F59E0B',
                border: `1px solid ${userRole === 'police' ? '#3B82F640' : userRole === 'ems' ? '#EF444440' : '#F59E0B40'}`,
              }}>
                {deptLabel} Department
              </span>
            </div>
          )}
        </div>

        {/* Metrics Overview */}
        {activeTab === 'applications' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {isMainAdmin && (
              <>
                <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #A78BFA' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Total Staff Members</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff' }}>{users.length}</div>
                </div>
                <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #e879f9' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Civilian Apps</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#e879f9' }}>{counts.civilian}</div>
                </div>
                <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #3B82F6' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Police Apps</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#3B82F6' }}>{counts.police}</div>
                </div>
                <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #EF4444' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>EMS Apps</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#EF4444' }}>{counts.ems}</div>
                </div>
                <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #F59E0B' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Mechanic Apps</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#F59E0B' }}>{counts.mechanic}</div>
                </div>
              </>
            )}
            <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Pending Applications</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#F59E0B' }}>{counts.pending}</div>
            </div>
            <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #3B82F6' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Scheduled Interviews</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#3B82F6' }}>{counts.scheduled}</div>
            </div>
            <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Approved Applications</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981' }}>{counts.approved}</div>
            </div>
            <div className="sc-card" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px' }}>Rejected Applications</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ef4444' }}>{counts.rejected}</div>
            </div>
          </div>
        )}

        {/* Header & Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px', color: '#A78BFA' }}>
              {activeTab === 'applications' ? (isMainAdmin ? 'Recruitment' : deptLabel) : 'Staff'} <span style={{ color: '#fff' }}>Desk</span>
            </h1>
            <p style={{ color: '#94a3b8' }}>
              {activeTab === 'applications' ? (isMainAdmin ? 'Review and manage portal applications' : `Review and manage ${deptLabel} department applications`) : 'Manage administrative access and team members'}
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(8,8,12,0.8)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              {['all', 'pending', 'scheduled', 'approved', 'rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px',
                  transition: 'all 0.2s',
                  background: filter === f ? '#A78BFA' : 'transparent',
                  color: filter === f ? '#000' : 'rgba(255,255,255,0.3)',
                }}>
                  {f}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={toggleSelectAll}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '0.65rem',
                  fontWeight: 700, cursor: 'pointer', marginRight: '12px'
                }}
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? 'Unselect All' : 'Select All Filtered'}
              </button>
              
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%', 
                  background: backendOnline ? '#10b981' : '#ef4444',
                  boxShadow: backendOnline ? '0 0 10px #10b981' : 'none'
                }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: backendOnline ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Bot: {backendOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div style={{ position: 'relative', marginRight: '8px' }}>
                <input 
                  type="text"
                  placeholder={activeTab === 'applications' ? "Search Name or ID..." : "Search Admin..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(167,139,250,0.1)',
                    borderRadius: '10px', color: '#fff', padding: '8px 12px 8px 32px',
                    fontSize: '0.75rem', fontWeight: 600, outline: 'none', width: '200px'
                  }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem' }}>🔍</span>
              </div>

              {/* Department filter — only visible to main admin */}
              {isMainAdmin ? (
                <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(167,139,250,0.1)',
                    borderRadius: '10px', color: '#A78BFA', padding: '8px 12px',
                    fontSize: '0.75rem', fontWeight: 700, outline: 'none'
                  }}
                >
                  <option value="all">All Departments</option>
                  <option value="civilian">Civilian</option>
                  <option value="police">Police Dept</option>
                  <option value="ems">EMS</option>
                  <option value="mechanic">Mechanic</option>
                </select>
              ) : (
                <span style={{
                  padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700,
                  background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(167,139,250,0.1)', color: '#A78BFA'
                }}>
                  {deptLabel} Only
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Application Settings — Admin Only */}
        {activeTab === 'applications' && isMainAdmin && (
          <div className="sc-card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h3 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '1.2rem', fontWeight: 900, marginBottom: '4px' }}>Global Application Access</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Toggle these switches to instantly lock or unlock department applications for all users on the Apply page.</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {[
                { id: 'police', label: 'Police', locked: appSettings.policeLocked, color: '#3B82F6' },
                { id: 'ems', label: 'EMS', locked: appSettings.emsLocked, color: '#EF4444' },
                { id: 'mechanic', label: 'Mechanic', locked: appSettings.mechanicLocked, color: '#F59E0B' }
              ].map(dept => (
                <div key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.4)', padding: '10px 16px', borderRadius: '10px', border: `1px solid ${dept.color}30` }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: dept.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{dept.label}</span>
                    <span style={{ fontSize: '0.65rem', color: dept.locked ? '#ef4444' : '#10b981', fontWeight: 700 }}>{dept.locked ? 'LOCKED' : 'UNLOCKED'}</span>
                  </div>
                  <button 
                    onClick={() => updateAppLock(dept.id, !dept.locked)}
                    style={{
                      width: '40px', height: '22px', borderRadius: '20px',
                      background: dept.locked ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                      border: `1px solid ${dept.locked ? '#ef4444' : '#10b981'}`,
                      position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                    }}
                  >
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: dept.locked ? '#ef4444' : '#10b981',
                      position: 'absolute', top: '3px',
                      left: dept.locked ? '4px' : '20px',
                      transition: 'all 0.3s'
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applications List */}
        {activeTab === 'applications' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.length === 0 ? (
              <div className="sc-card" style={{ padding: '80px', textAlign: 'center', opacity: 0.3 }}>
                <p style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 700, letterSpacing: '2px' }}>Queue is empty</p>
              </div>
            ) : currentApps.map(app => (
              <div key={app.id} className="sc-card" style={{ border: selectedIds.has(app.id) ? '1px solid #A78BFA' : expandedId === app.id ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div 
                      onClick={() => toggleSelect(app.id)}
                      style={{ 
                        width: '20px', height: '20px', borderRadius: '6px', 
                        border: '2px solid rgba(167,139,250,0.3)', cursor: 'pointer',
                        background: selectedIds.has(app.id) ? '#A78BFA' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}
                    >
                      {selectedIds.has(app.id) && <span style={{ color: '#000', fontSize: '12px', fontWeight: 900 }}>✓</span>}
                    </div>

                    <div 
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}
                    >
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: '"Orbitron", sans-serif', fontWeight: 900, color: '#A78BFA',
                        fontSize: '1.2rem'
                      }}>
                        {(app.discordName || app.fullName || app.name || '?').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '2px' }}>
                          {app.discordName || app.fullName || app.name || 'Unknown User'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                           {app.fullName && <span style={{ fontSize: '0.7rem', color: '#A78BFA', fontWeight: 700 }}>@{app.fullName}</span>}
                           <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>ID: {app.discordId}</span>
                           <span style={{ 
                             fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', 
                             background: `${typeColors[app.type]}20`, color: typeColors[app.type],
                             border: `1px solid ${typeColors[app.type]}40`, fontWeight: 900, textTransform: 'uppercase'
                           }}>{app.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{
                      padding: '6px 16px', borderRadius: '20px', fontSize: '0.65rem',
                      fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px',
                      background: app.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : app.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                      color: app.status === 'approved' ? '#10b981' : app.status === 'rejected' ? '#ef4444' : '#A78BFA',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {app.status}
                    </span>
                    
                    <button 
                      onClick={() => handleDelete(app.id)}
                      disabled={actionLoading === app.id}
                      title="Delete Submission"
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '8px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                    </button>

                    <span 
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                      style={{ transition: 'transform 0.3s', transform: expandedId === app.id ? 'rotate(180deg)' : 'none', color: '#475569', cursor: 'pointer' }}
                    >▼</span>
                  </div>
                </div>

                {expandedId === app.id && (
                  <div style={{ padding: '32px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Age</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{app.age}</div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Character Name</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{app.characterName || 'N/A'}</div>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '24px', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase' }}>{app.type.toUpperCase()} Application Answers</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {(DEPT_QUESTIONS[app.type] || []).map((q, idx) => (
                          <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, marginBottom: '8px' }}>{q.label}</div>
                            <div style={{ fontSize: '0.9rem', color: '#fff', lineHeight: 1.5, wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                              {app.answers?.[q.id] || app[q.id] || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '24px', borderRadius: '16px', marginBottom: '40px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '12px', textTransform: 'uppercase' }}>Backstory</div>
                      <div style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{app.characterBackstory}</div>
                    </div>

                    {/* Action Flow */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Interview Info Overlay */}
                      {app.status === 'scheduled' && (
                        <div style={{ 
                          background: 'rgba(6, 182, 212, 0.05)', 
                          border: '1px solid rgba(6, 182, 212, 0.2)', 
                          borderRadius: '12px', padding: '16px', marginBottom: '20px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', gap: '20px' }}>
                            {app.type === 'civilian' ? (
                              <div>
                                <div style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>📌 Procedure</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Join WFS between 6PM - 10PM</div>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <div style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>📅 Interview Date</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{app.interviewDate || 'Not set'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>⏰ Interview Time</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{app.interviewTime || 'TBD'}</div>
                                </div>
                              </>
                            )}
                          </div>
                          {app.type !== 'civilian' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSchedulingApp(app);
                                setScheduleData({ date: app.interviewDate || '', time: app.interviewTime || '' });
                                setShowScheduleModal(true);
                              }}
                              className="sc-btn-outline"
                              style={{ padding: '8px 16px', fontSize: '0.7rem', borderColor: 'rgba(6, 182, 212, 0.3)', color: '#06b6d4', height: 'fit-content' }}
                            >
                              ✏️ Edit Schedule
                            </button>
                          )}
                        </div>
                      )}

                      {/* Status-Based Actions */}
                      {app.status === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Optional Message (Sent to Applicant)</div>
                            <textarea 
                              placeholder="Add a reason for rejection or a welcome message..."
                              value={adminMessages[app.id] || ''}
                              onChange={(e) => setAdminMessages(prev => ({ ...prev, [app.id]: e.target.value }))}
                              style={{
                                width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.2)',
                                borderRadius: '12px', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', minHeight: '60px'
                              }}
                            />
                          </div>
                          {app.type !== 'civilian' && (
                            <div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '12px', textTransform: 'uppercase', marginTop: '16px' }}>Select Job Position</div>
                              <select 
                                value={selectedRank[app.id] || ''} 
                                onChange={(e) => setSelectedRank(prev => ({ ...prev, [app.id]: e.target.value }))}
                                style={{
                                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.2)',
                                  borderRadius: '12px', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', outline: 'none', marginBottom: '16px'
                                }}
                              >
                                <option value="">-- Choose Level --</option>
                                {(DEPT_RANKS[app.type] || []).map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '16px' }}>
                          {['police', 'ems', 'mechanic'].includes(app.type) && (
                            <button 
                              onClick={() => {
                                setSchedulingApp(app);
                                setShowScheduleModal(true);
                              }} 
                              disabled={actionLoading === app.id} 
                              className="sc-btn" 
                              style={{ flex: 1, padding: '16px', background: 'rgba(6, 182, 212, 1)', border: 'none' }}
                            >
                              🗓️ Schedule Interview
                            </button>
                          )}
                          {app.type === 'civilian' && (
                            <button 
                              onClick={() => handleStatusUpdate(app, 'scheduled')} 
                              disabled={actionLoading === app.id} 
                              className="sc-btn" 
                              style={{ flex: 1, padding: '16px', background: 'rgba(6, 182, 212, 1)', border: 'none' }}
                            >
                              🗓️ Whitelist Interview
                            </button>
                          )}
                          <button onClick={() => handleApproveWithRank(app)} disabled={actionLoading === app.id} className="sc-btn" style={{ flex: 1, padding: '16px' }}>
                            {actionLoading === app.id ? 'Processing...' : (
                                app.type === 'civilian' ? '✓ Approve' : `✓ Approve ${selectedRank[app.id] ? `as ${selectedRank[app.id]}` : ''}`
                            )}
                          </button>
                          <button onClick={() => handleStatusUpdate(app, 'rejected')} disabled={actionLoading === app.id} className="sc-btn-outline" style={{ flex: 1, borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', padding: '16px' }}>
                            {actionLoading === app.id ? 'Processing...' : '✕ Reject'}
                          </button>
                        </div>
                        </div>
                      )}

                      {app.status === 'scheduled' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>Optional Message (Sent to Applicant)</div>
                            <textarea 
                              placeholder="Add a reason for rejection or a welcome message..."
                              value={adminMessages[app.id] || ''}
                              onChange={(e) => setAdminMessages(prev => ({ ...prev, [app.id]: e.target.value }))}
                              style={{
                                width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.2)',
                                borderRadius: '12px', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', minHeight: '60px'
                              }}
                            />
                          </div>
                          {app.type !== 'civilian' && (
                            <div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', marginBottom: '12px', textTransform: 'uppercase' }}>Select Job Position</div>
                              <select 
                                value={selectedRank[app.id] || ''} 
                                onChange={(e) => setSelectedRank(prev => ({ ...prev, [app.id]: e.target.value }))}
                                style={{
                                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.2)',
                                  borderRadius: '12px', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', outline: 'none'
                                }}
                              >
                                <option value="">-- Choose Level --</option>
                                {(DEPT_RANKS[app.type] || []).map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <button onClick={() => handleApproveWithRank(app)} disabled={actionLoading === app.id} className="sc-btn" style={{ flex: 1, padding: '16px' }}>
                              {actionLoading === app.id ? 'Processing...' : (
                                app.type === 'civilian' ? '✓ Confirm & Approve Whitelist' : `✓ Confirm & Approve as ${selectedRank[app.id] || '...'}`
                              )}
                            </button>
                            <button onClick={() => handleStatusUpdate(app, 'rejected')} disabled={actionLoading === app.id} className="sc-btn-outline" style={{ flex: 1, borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', padding: '16px' }}>
                              {actionLoading === app.id ? 'Processing...' : '✕ Reject'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Applications Pagination */}
            {totalAppPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
                <button 
                  disabled={appPage === 1}
                  onClick={() => setAppPage(p => p - 1)}
                  className="sc-btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', opacity: appPage === 1 ? 0.3 : 1 }}
                >
                  ← Previous
                </button>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Array.from({ length: totalAppPages }).map((_, i) => {
                    const startNum = (i * itemsPerPage) + 1;
                    const endNum = Math.min((i + 1) * itemsPerPage, filtered.length);
                    return (
                      <button
                        key={i}
                        onClick={() => setAppPage(i + 1)}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
                          background: appPage === i + 1 ? '#A78BFA' : 'rgba(255,255,255,0.03)',
                          color: appPage === i + 1 ? '#000' : '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                        }}
                      >
                        {startNum}-{endNum}
                      </button>
                    )
                  })}
                </div>
                <button 
                  disabled={appPage === totalAppPages}
                  onClick={() => setAppPage(p => p + 1)}
                  className="sc-btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', opacity: appPage === totalAppPages ? 0.3 : 1 }}
                >
                  Next →
                </button>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '12px' }}>
                  Total {filtered.length}
                </span>
              </div>
            )}
          </div>
        ) : activeTab === 'server' ? (
          /* Live Server Management View */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <div className="sc-card" style={{ padding: '32px' }}>
                <h3 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '1.2rem', fontWeight: 900, marginBottom: '16px', color: '#A78BFA' }}>📢 Global Announcement</h3>
                <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea 
                    placeholder="Type a message to send to all players..."
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(167,139,250,0.2)',
                      borderRadius: '12px', color: '#fff', padding: '12px 16px', fontSize: '0.9rem', outline: 'none', minHeight: '80px', resize: 'none'
                    }}
                  />
                  <button type="submit" className="sc-btn" style={{ fontSize: '0.75rem', padding: '12px' }}>
                    Send Announcement
                  </button>
                </form>
              </div>
              
              <div className="sc-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', marginBottom: '8px' }}>Active Players</div>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#A78BFA' }}>{livePlayers.length}</div>
                <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>● SERVER LIVE</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '1.5rem', fontWeight: 900 }}>Online <span style={{ color: '#A78BFA' }}>Players</span></h3>
              <button onClick={fetchPlayers} className="sc-btn-outline" style={{ fontSize: '0.7rem', padding: '8px 16px' }}>🔄 Refresh List</button>
            </div>

            <div className="sc-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 32px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 300px', fontWeight: 800, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <div>ID</div>
                <div>Player Name</div>
                <div>Ping</div>
                <div>Health</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {livePlayers.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', opacity: 0.5 }}>No players online or server unreachable.</div>
                ) : livePlayers.map(player => (
                  <div key={player.id} style={{ padding: '20px 32px', display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 300px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ fontWeight: 900, color: '#A78BFA' }}>#{player.id}</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{player.name}</div>
                    <div style={{ color: player.ping < 100 ? '#10b981' : '#f59e0b', fontWeight: 800, fontSize: '0.8rem' }}>{player.ping}ms</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <div style={{ width: '40px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${player.health || 100}%`, height: '100%', background: (player.health || 100) > 20 ? '#ef4444' : '#64748b' }} />
                       </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handlePlayerAction('heal', player.id, '', player.name)}
                        disabled={actionLoading === `player-${player.id}-heal`}
                        className="sc-btn" 
                        style={{ padding: '8px 12px', fontSize: '0.65rem', background: '#10b981' }}
                      >
                        ❤️ {actionLoading === `player-${player.id}-heal` ? '...' : 'Revive'}
                      </button>
                      <button 
                        onClick={() => {
                          const reason = window.prompt('Enter Kick Reason:');
                          if (reason !== null) handlePlayerAction('kick', player.id, reason, player.name);
                        }}
                        disabled={actionLoading === `player-${player.id}-kick`}
                        className="sc-btn-outline" 
                        style={{ padding: '8px 12px', fontSize: '0.65rem', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}
                      >
                        👢 {actionLoading === `player-${player.id}-kick` ? '...' : 'Kick'}
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to KILL player ${player.name}?`)) {
                            handlePlayerAction('command', player.id, { command: `kill ${player.id}` }, player.name);
                          }
                        }}
                        disabled={actionLoading === `player-${player.id}-command`}
                        className="sc-btn-outline" 
                        style={{ padding: '8px 12px', fontSize: '0.65rem', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                      >
                        💀 {actionLoading === `player-${player.id}-command` ? '...' : 'Kill'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'staff' ? (
          /* Staff Management View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={toggleSelectAllStaff}
                  className="sc-btn-outline"
                  style={{ borderRadius: '12px', fontSize: '0.75rem', padding: '10px 16px' }}
                >
                  {selectedStaffIds.size === filteredAdmins.length && filteredAdmins.length > 0 ? 'Deselect All' : 'Select All Admins'}
                </button>
                {selectedStaffIds.size > 0 && (
                  <button 
                    onClick={handleBulkDeleteStaff}
                    className="sc-btn-outline" 
                    style={{ borderRadius: '12px', fontSize: '0.75rem', padding: '10px 16px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                  >
                    🗑️ Delete Selected ({selectedStaffIds.size})
                  </button>
                )}
              </div>
              <button 
                onClick={() => setShowAddAdmin(true)}
                className="sc-btn" 
                style={{ borderRadius: '12px', fontSize: '0.8rem', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>➕</span> Add New Staff
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentAdmins.length === 0 ? (
                <div className="sc-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b', opacity: 0.6 }}>
                  No administrators found.
                </div>
              ) : currentAdmins.map(user => (
                <div key={user.id} className="sc-card" style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: selectedStaffIds.has(user.id) ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div 
                      onClick={() => toggleSelectStaff(user.id)}
                      style={{ 
                        width: '20px', height: '20px', borderRadius: '6px', border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedStaffIds.has(user.id) ? '#ef4444' : 'transparent',
                        borderColor: selectedStaffIds.has(user.id) ? '#ef4444' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {selectedStaffIds.has(user.id) && <span style={{ color: '#fff', fontSize: '0.7rem' }}>✓</span>}
                    </div>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px',
                      background: 'rgba(167,139,250,0.1)', 
                      border: '1px solid #A78BFA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: '"Orbitron", sans-serif', fontWeight: 900, color: '#A78BFA',
                    }}>
                      {user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{user.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{user.email}</span>
                        {user.discordUsername && <span style={{ fontSize: '0.7rem', color: '#A78BFA' }}>@{user.discordUsername}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '6px', fontSize: '0.6rem',
                      fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px',
                      background: user.role === 'police' ? 'rgba(59,130,246,0.15)' : 
                                  user.role === 'ems' ? 'rgba(239,68,68,0.15)' : 
                                  user.role === 'mechanic' ? 'rgba(245,158,11,0.15)' : 
                                  'rgba(167,139,250,0.15)',
                      color: user.role === 'police' ? '#3B82F6' : 
                             user.role === 'ems' ? '#EF4444' : 
                             user.role === 'mechanic' ? '#F59E0B' : 
                             '#A78BFA',
                      border: `1px solid ${user.role === 'police' ? '#3B82F640' : 
                                            user.role === 'ems' ? '#EF444440' : 
                                            user.role === 'mechanic' ? '#F59E0B40' : 
                                            '#A78BFA40'}`,
                    }}>
                      {user.role}
                    </span>
                    
                    <button 
                      onClick={() => handleDeleteStaff(user.id)}
                      disabled={actionLoading === user.id}
                      className="sc-btn-outline"
                      style={{ padding: '8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                      title="Delete Permanently"
                    >
                      {actionLoading === user.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Staff Pagination */}
            {totalStaffPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
                <button 
                  disabled={staffPage === 1}
                  onClick={() => setStaffPage(p => p - 1)}
                  className="sc-btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', opacity: staffPage === 1 ? 0.3 : 1 }}
                >
                  ← Previous
                </button>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Array.from({ length: totalStaffPages }).map((_, i) => {
                    const startNum = (i * itemsPerPage) + 1;
                    const endNum = Math.min((i + 1) * itemsPerPage, filteredAdmins.length);
                    return (
                      <button
                        key={i}
                        onClick={() => setStaffPage(i + 1)}
                        style={{
                          padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
                          background: staffPage === i + 1 ? '#A78BFA' : 'rgba(255,255,255,0.03)',
                          color: staffPage === i + 1 ? '#000' : '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                        }}
                      >
                        {startNum}-{endNum}
                      </button>
                    )
                  })}
                </div>
                <button 
                  disabled={staffPage === totalStaffPages}
                  onClick={() => setStaffPage(p => p + 1)}
                  className="sc-btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', opacity: staffPage === totalStaffPages ? 0.3 : 1 }}
                >
                  Next →
                </button>
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '12px' }}>
                  Showing {indexOfFirstStaff + 1}-{Math.min(indexOfLastStaff, filteredAdmins.length)} of {filteredAdmins.length}
                </span>
              </div>
            )}

            {/* Add Admin Modal */}
            {showAddAdmin && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
              }}>
                <div className="sc-card" style={{ maxWidth: '450px', width: '90%', padding: '40px' }}>
                  <h2 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '1.8rem', marginBottom: '24px' }}>Add New Staff Member</h2>
                  <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input 
                      className="sc-input" placeholder="Full Name" required 
                      value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} 
                    />
                    <input 
                      className="sc-input" type="email" placeholder="Email Address" required 
                      value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} 
                    />
                    <input 
                      className="sc-input" type="password" placeholder="Password" required 
                      value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} 
                    />
                    <input 
                      className="sc-input" placeholder="Discord Username or ID (Optional)" 
                      value={newAdmin.discordUsername} onChange={e => setNewAdmin({...newAdmin, discordUsername: e.target.value})} 
                    />
                    <select 
                      className="sc-input" 
                      value={newAdmin.role} 
                      onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                      style={{
                        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(167,139,250,0.1)',
                        borderRadius: '14px', color: '#fff', padding: '14px 18px',
                        fontSize: '0.95rem', fontFamily: '"Inter", sans-serif', outline: 'none',
                        cursor: 'pointer', appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A78BFA%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center'
                      }}
                    >
                      <option value="admin" style={{ background: '#0a0a0f' }}>🔑 Main Admin (Full Access)</option>
                      <option value="police" style={{ background: '#0a0a0f' }}>🚔 Police Department</option>
                      <option value="ems" style={{ background: '#0a0a0f' }}>🚑 EMS Department</option>
                      <option value="mechanic" style={{ background: '#0a0a0f' }}>🔧 Mechanic Department</option>
                    </select>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button type="submit" disabled={loading} className="sc-btn" style={{ flex: 1 }}>
                        {loading ? 'Creating...' : 'Create Account'}
                      </button>
                      <button type="button" onClick={() => setShowAddAdmin(false)} className="sc-btn-outline" style={{ flex: 1 }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'winners' ? (
          /* Events Management View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: '"Outfit", sans-serif', fontSize: '1.5rem', fontWeight: 900 }}>Championship <span style={{ color: '#A78BFA' }}>Events</span></h3>
              <button 
                onClick={() => {
                  setEditingEventId(null);
                  setNewEvent({
                    title: '',
                    date: '',
                    type: 'car_race',
                    customBgUrl: '',
                    description: '',
                    active: false,
                    published: true,
                    winners: {
                      first: { name: '', reward: '', details: '' },
                      second: { name: '', reward: '', details: '' },
                      third: { name: '', reward: '', details: '' }
                    }
                  });
                  setShowAddEvent(true);
                }}
                className="sc-btn" 
                style={{ borderRadius: '12px', fontSize: '0.8rem', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>🏆</span> Register Tournament
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {eventsList.length === 0 ? (
                <div className="sc-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b', opacity: 0.6 }}>
                  No tournaments registered yet. Create one to display events!
                </div>
              ) : eventsList.map(event => (
                <div key={event.id} className="sc-card" style={{ padding: '24px 32px', border: event.active ? '1px solid #A78BFA' : '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                    
                    {/* Event Info */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: event.active ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.02)', 
                        border: `1.5px solid ${event.active ? '#A78BFA' : 'rgba(255,255,255,0.1)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}>
                        {event.type === 'car_race' ? '🏎️' : event.type === 'bike_race' ? '🏍️' : event.type === 'sky_race' ? '✈️' : '🏁'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>{event.title}</h4>
                          <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                            {event.type.toUpperCase().replace('_', ' ')}
                          </span>
                          
                          {/* Publish Status Badge */}
                          <span style={{
                            fontSize: '0.6rem', padding: '3px 8px', borderRadius: '4px',
                            background: event.published !== false ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: event.published !== false ? '#A78BFA' : '#64748b',
                            border: `1px solid ${event.published !== false ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>
                            {event.published !== false ? '🌐 Published' : '📁 Draft'}
                          </span>

                          {event.active && (
                            <span style={{
                              fontSize: '0.6rem', padding: '3px 8px', borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 800,
                              textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}>
                              Active Welcome Popup
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                          📅 Event Date: {event.date}
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '8px', maxWidth: '550px', lineHeight: 1.5 }}>
                          {event.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* View Registrations Button */}
                      <button 
                        onClick={() => setExpandedApplicationsId(expandedApplicationsId === event.id ? null : event.id)}
                        className="sc-btn-outline"
                        style={{
                          borderRadius: '8px', fontSize: '0.7rem', padding: '8px 16px',
                          color: expandedApplicationsId === event.id ? '#A78BFA' : '#94a3b8',
                          borderColor: expandedApplicationsId === event.id ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'
                        }}
                      >
                        👁️ View Registrations ({eventApplications.filter(app => app.eventId === event.id).length})
                      </button>

                      {/* Download CSV Button */}
                      <button 
                        onClick={() => handleDownloadCSV(event)}
                        className="sc-btn"
                        style={{
                          borderRadius: '8px', fontSize: '0.7rem', padding: '8px 16px',
                          background: '#10b981', color: '#000', fontWeight: 800,
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        📥 Download CSV
                      </button>

                      {/* Publish Toggle */}
                      <button 
                        onClick={() => handleTogglePublish(event.id, event.published)}
                        disabled={actionLoading === event.id}
                        className="sc-btn-outline"
                        style={{
                          borderRadius: '8px', fontSize: '0.7rem', padding: '8px 16px',
                          color: '#A78BFA', borderColor: 'rgba(167,139,250,0.3)'
                        }}
                      >
                        {event.published !== false ? '📁 Unpublish' : '🌐 Publish'}
                      </button>

                      {/* Edit Details */}
                      <button 
                        onClick={() => {
                          setEditingEventId(event.id);
                          setNewEvent({
                            title: event.title || '',
                            date: event.date || '',
                            type: event.type || 'car_race',
                            customBgUrl: event.customBgUrl || '',
                            description: event.description || '',
                            active: event.active || false,
                            published: event.published !== false,
                            winners: {
                              first: { name: event.winners?.first?.name || '', reward: event.winners?.first?.reward || '', details: event.winners?.first?.details || '' },
                              second: { name: event.winners?.second?.name || '', reward: event.winners?.second?.reward || '', details: event.winners?.second?.details || '' },
                              third: { name: event.winners?.third?.name || '', reward: event.winners?.third?.reward || '', details: event.winners?.third?.details || '' }
                            }
                          });
                          setShowAddEvent(true);
                        }}
                        className="sc-btn-outline"
                        style={{
                          borderRadius: '8px', fontSize: '0.7rem', padding: '8px 16px',
                          color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)'
                        }}
                      >
                        ✏️ Edit Details
                      </button>

                      <button 
                        onClick={() => handleToggleEventActive(event.id)}
                        disabled={actionLoading === event.id || event.active}
                        className="sc-btn-outline"
                        style={{
                          borderRadius: '8px', fontSize: '0.7rem', padding: '8px 16px',
                          color: event.active ? '#64748b' : '#3B82F6',
                          borderColor: event.active ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.3)',
                          cursor: event.active ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ⭐ {event.active ? 'Active' : 'Set Welcome Popup'}
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={actionLoading === event.id}
                        className="sc-btn-outline"
                        style={{ borderRadius: '8px', fontSize: '0.7rem', padding: '8px 12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                      >
                        {actionLoading === event.id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Player Applications List */}
                  {expandedApplicationsId === event.id && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                      <div style={{ padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        {eventApplications.filter(app => app.eventId === event.id).length === 0 ? (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', padding: '8px 0' }}>No player registrations yet.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {eventApplications.filter(app => app.eventId === event.id).map(app => (
                              <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', gap: '24px' }}>
                                  <div>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Character Name</span>
                                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff' }}>{app.characterName}</span>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Discord ID</span>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#A78BFA' }}>{app.discordId}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteEventApp(app.id)}
                                  disabled={actionLoading === app.id}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                                  title="Remove Registration"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Winners preview */}
                  {!!(event.winners?.first?.name) && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px',
                      marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.02)'
                    }}>
                      {/* 1st */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>🥇</span>
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Champion</div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{event.winners.first.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#FFD700', fontWeight: 700 }}>{event.winners.first.reward}</div>
                        </div>
                      </div>
                      {/* 2nd */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>🥈</span>
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>2nd Place</div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{event.winners.second.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#C0C0C0', fontWeight: 700 }}>{event.winners.second.reward}</div>
                        </div>
                      </div>
                      {/* 3rd */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>🥉</span>
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>3rd Place</div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{event.winners.third.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#CD7F32', fontWeight: 700 }}>{event.winners.third.reward}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add/Edit Event Modal */}
            {showAddEvent && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                padding: '24px'
              }}>
                <div className="sc-card" style={{ maxWidth: '750px', width: '100%', padding: '36px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h2 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '1.8rem', marginBottom: '20px' }}>
                    {editingEventId ? '✏️ Edit Championship Event' : '🏆 Register Championship Tournament'}
                  </h2>
                  <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* General details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Event Title</label>
                        <input 
                          className="sc-input" placeholder="e.g. Los Santos Grand Prix" required 
                          value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Event Date</label>
                        <input 
                          type="date" className="sc-input" required 
                          value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Event Type / Background Theme</label>
                        <select 
                          className="sc-input" 
                          value={newEvent.type} 
                          onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          <option value="car_race" style={{ background: '#0a0a0f' }}>🏎️ Car Race (Speedy purple grid)</option>
                          <option value="bike_race" style={{ background: '#0a0a0f' }}>🏍️ Bike Race (Hot orange/yellow gravel)</option>
                          <option value="sky_race" style={{ background: '#0a0a0f' }}>✈️ Sky Race (Sleek aerodynamic cyan)</option>
                          <option value="custom" style={{ background: '#0a0a0f' }}>🖼️ Custom Background Image</option>
                        </select>
                      </div>
                      {newEvent.type === 'custom' ? (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Custom Background Image URL</label>
                          <input 
                            className="sc-input" placeholder="e.g. https://domain.com/background.jpg" required 
                            value={newEvent.customBgUrl} onChange={e => setNewEvent({...newEvent, customBgUrl: e.target.value})} 
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={newEvent.active} 
                              onChange={e => setNewEvent({...newEvent, active: e.target.checked})}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            Make Active Welcome Popup immediately
                          </label>
                        </div>
                      )}
                    </div>

                    {newEvent.type === 'custom' && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }}>
                          <input 
                            type="checkbox" 
                            checked={newEvent.active} 
                            onChange={e => setNewEvent({...newEvent, active: e.target.checked})}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          Make Active Welcome Popup immediately
                        </label>
                      </div>
                    )}

                    {/* Publish immediately checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={newEvent.published !== false} 
                          onChange={e => setNewEvent({...newEvent, published: e.target.checked})}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        Publish event on website immediately
                      </label>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Event Description</label>
                      <textarea 
                        className="sc-input" placeholder="Add some context e.g. A high-speed night sprint through Vinewood hills with strict checkpoint restrictions." required 
                        style={{ minHeight: '60px', resize: 'vertical' }}
                        value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} 
                      />
                    </div>

                    {/* Winners details */}
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#A78BFA', letterSpacing: '2px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '14px' }}>🏆 PODIUM WINNERS (OPTIONAL - FILL ONCE DECLARED)</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* 1st Place */}
                        <div style={{ background: 'rgba(255, 215, 0, 0.03)', border: '1px solid rgba(255, 215, 0, 0.1)', padding: '16px', borderRadius: '12px' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#FFD700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>🥇 1ST PLACE (CHAMPION)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Character Name" value={newEvent.winners.first.name} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, first: {...newEvent.winners.first, name: e.target.value}}})} />
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Prize (e.g. Bugatti + $500k)" value={newEvent.winners.first.reward} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, first: {...newEvent.winners.first, reward: e.target.value}}})} />
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Vehicle / Notes (e.g. Nissan GT-R)" value={newEvent.winners.first.details} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, first: {...newEvent.winners.first, details: e.target.value}}})} />
                          </div>
                        </div>

                        {/* 2nd Place */}
                        <div style={{ background: 'rgba(192, 192, 192, 0.03)', border: '1px solid rgba(192, 192, 192, 0.1)', padding: '16px', borderRadius: '12px' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#C0C0C0', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>🥈 2ND PLACE</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Character Name" value={newEvent.winners.second.name} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, second: {...newEvent.winners.second, name: e.target.value}}})} />
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Prize (e.g. $250k)" value={newEvent.winners.second.reward} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, second: {...newEvent.winners.second, reward: e.target.value}}})} />
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Vehicle / Notes" value={newEvent.winners.second.details} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, second: {...newEvent.winners.second, details: e.target.value}}})} />
                          </div>
                        </div>

                        {/* 3rd Place */}
                        <div style={{ background: 'rgba(205, 127, 50, 0.03)', border: '1px solid rgba(205, 127, 50, 0.1)', padding: '16px', borderRadius: '12px' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#CD7F32', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>🥉 3RD PLACE</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Character Name" value={newEvent.winners.third.name} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, third: {...newEvent.winners.third, name: e.target.value}}})} />
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Prize (e.g. $100k)" value={newEvent.winners.third.reward} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, third: {...newEvent.winners.third, reward: e.target.value}}})} />
                            <input className="sc-input" style={{ padding: '10px 14px', fontSize: '0.85rem' }} placeholder="Vehicle / Notes" value={newEvent.winners.third.details} onChange={e => setNewEvent({...newEvent, winners: {...newEvent.winners, third: {...newEvent.winners.third, details: e.target.value}}})} />
                          </div>
                        </div>

                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button type="submit" disabled={loading} className="sc-btn" style={{ flex: 1 }}>
                        {loading ? 'Saving...' : (editingEventId ? '💾 Save Changes' : '💾 Register Event')}
                      </button>
                      <button type="button" onClick={() => { setShowAddEvent(false); setEditingEventId(null); }} className="sc-btn-outline" style={{ flex: 1 }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Interview Scheduling Modal */}
        {showScheduleModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
          }}>
            <div className="sc-card" style={{ maxWidth: '450px', width: '90%', padding: '40px' }}>
              <h2 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '1.8rem', marginBottom: '8px' }}>Schedule Interview</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>
                Setting up interview for <strong>{schedulingApp?.discordName || schedulingApp?.fullName}</strong>
              </p>
              
              <form onSubmit={handleScheduleInterview} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>
                    📅 Select Date
                  </label>
                  <input 
                    type="date" className="sc-input" required
                    style={{ background: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.2)', paddingLeft: '45px' }}
                    value={scheduleData.date} onChange={e => setScheduleData({...scheduleData, date: e.target.value})}
                  />
                  <span style={{ position: 'absolute', left: '16px', bottom: '14px', fontSize: '1.2rem', opacity: 0.6 }}>🗓️</span>
                </div>

                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>
                    ⏰ Select Time
                  </label>
                  <input 
                    type="time" className="sc-input" required
                    style={{ background: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.2)', paddingLeft: '45px' }}
                    value={scheduleData.time} onChange={e => setScheduleData({...scheduleData, time: e.target.value})}
                  />
                  <span style={{ position: 'absolute', left: '16px', bottom: '14px', fontSize: '1.2rem', opacity: 0.6 }}>🕒</span>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" disabled={actionLoading === schedulingApp?.id} className="sc-btn" style={{ flex: 1, background: '#06b6d4' }}>
                    {actionLoading === schedulingApp?.id ? 'Saving...' : '💾 Confirm Schedule'}
                  </button>
                  <button type="button" onClick={() => { setShowScheduleModal(false); setSchedulingApp(null); }} className="sc-btn-outline" style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
