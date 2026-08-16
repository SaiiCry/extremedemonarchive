import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Unlock, Search, Check, Youtube, ExternalLink, 
  ChevronDown, ChevronUp, RefreshCw, Sparkles, Gamepad2, Info, Star,
  CheckCircle2, Video, UploadCloud
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import levelsData from '@/data/levels.json';
import ParticleField from '@/components/ParticleField';
import RotatingBackground from '@/components/RotatingBackground';

// Define TS Interfaces
interface ExtremeDemon {
  name: string;
  creator: string;
  rating?: string; // normal | featured | epic | legendary | mythic
}

type LevelStatus_Status = 'indefinite' | 'pending_record' | 'pending_upload';
type LevelRating = 'normal' | 'featured' | 'epic' | 'legendary' | 'mythic';

interface LevelStatus {
  level_name: string;
  level_type: 'demon' | 'platformer';
  level_uid?: string;
  completed: boolean;
  youtube_url: string | null;
  favorite?: boolean;
  status?: LevelStatus_Status;
  status_set_at?: string | null;
  rating?: LevelRating;
  creator?: string;
  rank?: number;
}

// Rating config
const RATINGS: { key: LevelRating; label: string; img: string }[] = [
  { key: 'normal',    label: 'Normal',    img: 'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/06/25/01KVXGKZPZRCK0RMMDETWA4XQP.png?imageMogr2/format/webp' },
  { key: 'featured',  label: 'Featured',  img: 'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/06/25/01KVXGM3M6PMEBEHD8B1961TCG.png?imageMogr2/format/webp' },
  { key: 'epic',      label: 'Epic',      img: 'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/06/25/01KVXGM7ZGDB269RFVKJQZ5BD7.png?imageMogr2/format/webp' },
  { key: 'legendary', label: 'Legendary', img: 'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/06/25/01KVXGMBBCJC469CH4N4TCJZCH.png?imageMogr2/format/webp' },
  { key: 'mythic',    label: 'Mythic',    img: 'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/06/25/01KVXGMEY4RM208K8RF1TC79Q3.png?imageMogr2/format/webp' },
];

const STATUS_OPTIONS: { key: LevelStatus_Status; label: string; color: string }[] = [
  { key: 'indefinite',     label: 'Published',        color: 'text-green-400' },
  { key: 'pending_record', label: 'Pending Record',   color: 'text-amber-400' },
  { key: 'pending_upload', label: 'Pending Upload',   color: 'text-blue-400' },
];

// Pinned demon level that must always appear first in the Extreme Demons list
const PINNED_DEMON: ExtremeDemon = { name: 'blank', creator: 'no ob' };

// Make a unique identifier per demon (name + creator)
const makeDemonUid = (name: string, creator: string) => `${name}|||${creator}`;
// For platformers
const makePlatUid = (name: string, rank: number) => `plat|||${rank}|||${name}`;

interface PlatformerLevel {
  name: string;
  rank: number;
}

export default function HomePage() {
  // Core level lists states
  const [extremeDemons, setExtremeDemons] = useState<ExtremeDemon[]>(levelsData.extremeDemons || []);
  const [platformers, setPlatformers] = useState<PlatformerLevel[]>(levelsData.extremesPlataforma || []);
  
  // Database records
  const [dbRecords, setDbRecords] = useState<LevelStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isSyncingPlatformers, setIsSyncingPlatformers] = useState(false);

  // Admin access state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // UI States: Search & Filter
  const [demonSearch, setDemonSearch] = useState('');
  const [platformerSearch, setPlatformerSearch] = useState('');
  const [demonFilter, setDemonFilter] = useState<'all' | 'completed' | 'pending' | 'favorites'>('all');
  const [demonRatingFilter, setDemonRatingFilter] = useState<'all' | 'epic' | 'legendary' | 'mythic'>('all');
  const [platformerFilter, setPlatformerFilter] = useState<'all' | 'completed' | 'pending' | 'favorites'>('all');

  // UI States: Limits for list expansion
  const [demonLimit, setDemonLimit] = useState(15);
  const [platformerLimit, setPlatformerLimit] = useState(15);

  // Edit Video Modal state
  const [editingLevel, setEditingLevel] = useState<LevelStatus | null>(null);
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const CACHE_KEY = 'hyu_level_records_cache';

  // 1. Initial Load of DB records and checks
  useEffect(() => {
    // Load cached records immediately so progress shows right away
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setDbRecords(JSON.parse(cached));
      } catch { /* ignore parse errors */ }
    }

    // Check if user is already logged in as admin
    const storedAdmin = localStorage.getItem('hyu_admin_logged');
    if (storedAdmin === 'true') setIsAdmin(true);

    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: recordsData, error: recordsError } = await supabase
          .from('level_records')
          .select('*');

        if (recordsError) throw recordsError;
        if (recordsData) {
          setDbRecords(recordsData);
          localStorage.setItem(CACHE_KEY, JSON.stringify(recordsData));
        }
      } catch (err) {
        console.error('Error fetching data from database:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // 2. Live Synchronization with Google Sheets (CORS-friendly CSV format)
  const syncGoogleSheets = async (silent = false) => {
    if (!silent) setIsSyncingSheets(true);
    try {
      const sheetId = '1_YUqTbK7IxCYdGjMEhQK-qFQf8_KMC9uNlClQRKZjoM';
      const gid = '1548697241';
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const csvText = await response.text();
      
      // Parse CSV
      const lines = csvText.split('\n');
      const parsedDemons: ExtremeDemon[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // CSV row split supporting quotes
        let inQuotes = false;
        const row: string[] = [];
        let currentField = '';
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        row.push(currentField.trim());
        
        if (row.length >= 3) {
          // Column A = rank/number, Column B = Level name, Column C = Publisher, Column D = Rating
          const name = row[1].replace(/^"|"$/g, '').trim();
          const creator = row[2].replace(/^"|"$/g, '').trim();
          const rawRating = (row[3] || '').replace(/^"|"$/g, '').trim().toLowerCase();
          
          const ratingMap: Record<string, LevelRating> = {
            normal: 'normal', featured: 'featured', epic: 'epic',
            legendary: 'legendary', mythic: 'mythic',
          };
          const rating: LevelRating = ratingMap[rawRating] ?? 'normal';
          
          if (name && creator && 
              name.toLowerCase() !== 'nivel' && 
              name.toLowerCase() !== 'level' && 
              name.toLowerCase() !== 'name') {
            parsedDemons.push({ name, creator, rating });
          }
        }
      }
      
      if (parsedDemons.length > 0) {
        // Sort alphabetically as requested
        parsedDemons.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        setExtremeDemons(parsedDemons);
        if (!silent) showToast('Extreme Demons synced from Google Sheets!', 'success');
      }
    } catch (err) {
      console.error('Error syncing Google Sheets:', err);
      if (!silent) showToast('Error syncing with Google Sheets. Using saved list.', 'error');
    } finally {
      if (!silent) setIsSyncingSheets(false);
    }
  };

  // Auto-sync from sheets on load
  useEffect(() => {
    syncGoogleSheets(true);
  }, []);

  // 2b. Live Synchronization with gdplatformerlist.com (CORS-enabled public API)
  const syncPlatformerList = async (silent = false) => {
    if (!silent) setIsSyncingPlatformers(true);
    try {
      const response = await fetch('https://gdplatformerlist.com/api/levels');
      if (!response.ok) throw new Error('Network response was not ok');
      const data: Array<{ name: string; creator?: string[] }> = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const parsedPlatformers: PlatformerLevel[] = data.map((level, index) => ({
          name: level.name,
          rank: index + 1,
        }));
        setPlatformers(parsedPlatformers);
        if (!silent) showToast('Extremes Platformer synced from gdplatformerlist.com!', 'success');
      }
    } catch (err) {
      console.error('Error syncing gdplatformerlist.com:', err);
      if (!silent) showToast('Error syncing with gdplatformerlist.com. Using saved list.', 'error');
    } finally {
      if (!silent) setIsSyncingPlatformers(false);
    }
  };

  // Auto-sync platformer list on load + refresh every 5 minutes for "real-time" updates
  useEffect(() => {
    syncPlatformerList(true);
    const interval = setInterval(() => syncPlatformerList(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper: Extract YouTube ID
  const getYouTubeId = (url: string | null): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Helper: Extract YouTube Thumbnail URL
  const getThumbnailUrl = (url: string | null): string => {
    const videoId = getYouTubeId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    // High-quality dark fallback demon art
    return 'https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/06/24/01KVVWX5BXV2X950PJBVBGGBY6.png?imageMogr2/format/webp';
  };

  // Export Extreme Demons data as CSV (importable into Google Sheets)
  const handleExportDemonsCsv = () => {
    const statusLabels: Record<string, string> = {
      indefinite: 'Published',
      pending_record: 'Pending Record',
      pending_upload: 'Pending Upload',
    };
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const header = ['Level', 'Publisher', 'Rating', 'Completed', 'Status', 'Favorite', 'YouTube Link'];
    const rows = mergedDemons.map(d => [
      escapeCsv(d.name),
      escapeCsv(d.creator),
      d.rating ?? 'normal',
      d.completed ? 'Yes' : 'No',
      statusLabels[d.status ?? 'indefinite'],
      d.favorite ? 'Yes' : 'No',
      d.youtube_url ?? '',
    ]);
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `extreme-demons-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exported. You can import it into Google Sheets.', 'success');
  };

  // Helper: Calculate days since status set
  const getDaysSinceStatus = (statusSetAt: string | null): number | null => {
    if (!statusSetAt) return null;
    const now = new Date();
    const setDate = new Date(statusSetAt);
    const diffMs = now.getTime() - setDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 3. Merging lists with DB records
  const mergedDemons = useMemo(() => {
    // Always keep the pinned level first, regardless of sheet sync/order
    const rest = extremeDemons.filter(
      d => !(d.name.toLowerCase() === PINNED_DEMON.name.toLowerCase() && d.creator.toLowerCase() === PINNED_DEMON.creator.toLowerCase())
    );
    const orderedDemons = [PINNED_DEMON, ...rest];
    return orderedDemons.map(demon => {
      const uid = makeDemonUid(demon.name, demon.creator);
      // Match by uid first (new), fall back to name+type match (legacy records)
      const dbMatch = dbRecords.find(r => r.level_uid === uid) 
        ?? dbRecords.find(r => r.level_name.toLowerCase() === demon.name.toLowerCase() && r.level_type === 'demon' && !r.level_uid);
      return {
        uid,
        name: demon.name,
        creator: demon.creator,
        sheetRating: demon.rating ?? 'normal',
        completed: dbMatch ? dbMatch.completed : false,
        youtube_url: dbMatch ? dbMatch.youtube_url : null,
        favorite: dbMatch ? (dbMatch.favorite ?? false) : false,
        status: (dbMatch?.status as LevelStatus_Status) ?? 'indefinite',
        status_set_at: dbMatch?.status_set_at ?? null,
        rating: (dbMatch?.rating as LevelRating) ?? demon.rating ?? 'normal',
      };
    });
  }, [extremeDemons, dbRecords]);

  const mergedPlatformers = useMemo(() => {
    const sortedList = [...platformers].sort((a, b) => a.rank - b.rank);
    return sortedList.map(plat => {
      const uid = makePlatUid(plat.name, plat.rank);
      const dbMatch = dbRecords.find(r => r.level_uid === uid)
        ?? dbRecords.find(r => r.level_name.toLowerCase() === plat.name.toLowerCase() && r.level_type === 'platformer' && !r.level_uid);
      return {
        uid,
        name: plat.name,
        rank: plat.rank,
        completed: dbMatch ? dbMatch.completed : false,
        youtube_url: dbMatch ? dbMatch.youtube_url : null,
        favorite: dbMatch ? (dbMatch.favorite ?? false) : false,
        status: (dbMatch?.status as LevelStatus_Status) ?? 'indefinite',
        status_set_at: dbMatch?.status_set_at ?? null,
      };
    });
  }, [platformers, dbRecords]);

  // Filters and searches
  const filteredDemons = useMemo(() => {
    return mergedDemons.filter(demon => {
      const matchesSearch = demon.name.toLowerCase().includes(demonSearch.toLowerCase()) || 
                            demon.creator.toLowerCase().includes(demonSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (demonFilter === 'completed') return demon.completed;
      if (demonFilter === 'pending') return !demon.completed;
      if (demonFilter === 'favorites') return demon.favorite;
      if (demonRatingFilter !== 'all' && demon.rating !== demonRatingFilter) return false;
      return true;
    });
  }, [mergedDemons, demonSearch, demonFilter, demonRatingFilter]);

  const filteredPlatformers = useMemo(() => {
    return mergedPlatformers.filter(plat => {
      const matchesSearch = plat.name.toLowerCase().includes(platformerSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (platformerFilter === 'completed') return plat.completed;
      if (platformerFilter === 'pending') return !plat.completed;
      if (platformerFilter === 'favorites') return plat.favorite;
      return true;
    });
  }, [mergedPlatformers, platformerSearch, platformerFilter]);

  const stats = useMemo(() => {
    const totalDemons = mergedDemons.length;
    const completedDemons = mergedDemons.filter(d => d.completed).length;
    const totalPlats = mergedPlatformers.length;
    const completedPlats = mergedPlatformers.filter(p => p.completed).length;

    const epicCount      = mergedDemons.filter(d => d.rating === 'epic').length;
    const legendaryCount = mergedDemons.filter(d => d.rating === 'legendary').length;
    const mythicCount    = mergedDemons.filter(d => d.rating === 'mythic').length;
    const highRatedTotal = epicCount + legendaryCount + mythicCount;

    // Status breakdown (all levels)
    const allLevels = [...mergedDemons, ...mergedPlatformers];
    const publishedCount     = allLevels.filter(l => l.status === 'indefinite').length;
    const pendingRecordCount = allLevels.filter(l => l.status === 'pending_record').length;
    const pendingUploadCount = allLevels.filter(l => l.status === 'pending_upload').length;

    return {
      demonsTotal: totalDemons,
      demonsCompleted: completedDemons,
      platsTotal: totalPlats,
      platsCompleted: completedPlats,
      epicCount,
      legendaryCount,
      mythicCount,
      highRatedTotal,
      publishedCount,
      pendingRecordCount,
      pendingUploadCount,
      totalLevels: totalDemons + totalPlats,
    };
  }, [mergedDemons, mergedPlatformers]);

  // 4. Interaction Handlers
  // Offline-safe upsert: always saves locally first (localStorage), then tries the database.
  // If the database is unreachable (offline / personal use), the local save still succeeds silently.
  const upsertRecord = async (uid: string, patch: Partial<LevelStatus> & { level_name: string; level_type: 'demon' | 'platformer' }) => {
    const updatedRecords = [...dbRecords];
    const idx = updatedRecords.findIndex(r => r.level_uid === uid);
    if (idx > -1) {
      updatedRecords[idx] = { ...updatedRecords[idx], ...patch, level_uid: uid };
    } else {
      updatedRecords.push({ completed: false, youtube_url: null, ...patch, level_uid: uid });
    }
    // Save locally first — this always succeeds, even fully offline
    setDbRecords(updatedRecords);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updatedRecords));

    // Try to sync to the database, but don't fail the whole operation if it's unreachable
    try {
      const { error } = await supabase.from('level_records').upsert(
        { completed: false, youtube_url: null, ...patch, level_uid: uid },
        { onConflict: 'level_uid' }
      );
      if (error) console.error('Database sync error (saved locally):', error);
    } catch (networkErr) {
      console.error('Database unreachable (saved locally):', networkErr);
    }
  };

  const handleToggleCompletion = async (
    uid: string, levelName: string, levelType: 'demon' | 'platformer',
    currentCompleted: boolean, youtubeUrl: string | null,
    creator?: string, rank?: number
  ) => {
    if (!isAdmin) { showToast('Please activate Editor Mode first.', 'info'); return; }
    // If marking as complete and no URL yet — force open the video modal
    if (!currentCompleted && !youtubeUrl) {
      setEditingLevel({
        level_uid: uid,
        level_name: levelName,
        level_type: levelType,
        completed: false,
        youtube_url: null,
        creator,
        rank,
      });
      setYoutubeInputUrl('');
      showToast('Please add the showcase URL to mark as completed.', 'info');
      return;
    }
    // If un-marking, just toggle
    try {
      await upsertRecord(uid, { level_name: levelName, level_type: levelType, completed: !currentCompleted, creator, rank });
      showToast(!currentCompleted ? `Completed: ${levelName}` : `Unmarked: ${levelName}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error saving to database.', 'error');
    }
  };

  const handleToggleFavorite = async (uid: string, levelName: string, currentFavorite: boolean, creator?: string) => {
    if (!isAdmin) { showToast('Please activate Editor Mode first.', 'info'); return; }
    try {
      await upsertRecord(uid, { level_name: levelName, level_type: 'demon', favorite: !currentFavorite, creator });
    } catch (err) {
      console.error(err);
      showToast('Error saving favorite.', 'error');
    }
  };

  const handleToggleFavoritePlat = async (uid: string, levelName: string, currentFavorite: boolean, rank: number) => {
    if (!isAdmin) { showToast('Please activate Editor Mode first.', 'info'); return; }
    try {
      await upsertRecord(uid, { level_name: levelName, level_type: 'platformer', favorite: !currentFavorite, rank });
    } catch (err) {
      console.error(err);
      showToast('Error saving favorite.', 'error');
    }
  };

  const handleSetStatus = async (uid: string, levelName: string, levelType: 'demon' | 'platformer', newStatus: LevelStatus_Status, creator?: string, rank?: number) => {
    if (!isAdmin) { showToast('Please activate Editor Mode first.', 'info'); return; }
    try {
      // Set timestamp only for pending statuses
      const statusSetAt = (newStatus === 'pending_record' || newStatus === 'pending_upload') ? new Date().toISOString() : null;
      await upsertRecord(uid, { level_name: levelName, level_type: levelType, status: newStatus, status_set_at: statusSetAt, creator, rank });
    } catch (err) {
      console.error(err);
      showToast('Error saving status.', 'error');
    }
  };

  const handleSetRating = async (uid: string, levelName: string, newRating: LevelRating, creator?: string) => {
    if (!isAdmin) { showToast('Please activate Editor Mode first.', 'info'); return; }
    try {
      await upsertRecord(uid, { level_name: levelName, level_type: 'demon', rating: newRating, creator });
    } catch (err) {
      console.error(err);
      showToast('Error saving rating.', 'error');
    }
  };

  // Open Edit Video Panel
  const openEditVideo = (level: { uid: string; name: string; completed: boolean; youtube_url: string | null; creator?: string; rank?: number }, type: 'demon' | 'platformer') => {
    if (!isAdmin) { showToast('Please activate Editor Mode first.', 'info'); return; }
    setEditingLevel({
      level_uid: level.uid,
      level_name: level.name,
      level_type: type,
      completed: level.completed,
      youtube_url: level.youtube_url,
      creator: level.creator,
      rank: level.rank
    });
    setYoutubeInputUrl(level.youtube_url || '');
  };

  // Save Video Url — also auto-completes the level
  const handleSaveVideo = async () => {
    if (!editingLevel) return;
    setIsSavingVideo(true);
    try {
      const cleanUrl = youtubeInputUrl.trim() || null;
      const uid = editingLevel.level_uid!;
      // Save url AND mark completed=true atomically
      await upsertRecord(uid, {
        level_name: editingLevel.level_name,
        level_type: editingLevel.level_type,
        youtube_url: cleanUrl,
        completed: cleanUrl ? true : editingLevel.completed,
        creator: editingLevel.creator,
        rank: editingLevel.rank,
      });
      showToast(`Video saved for ${editingLevel.level_name}`, 'success');
      setEditingLevel(null);
    } catch (err) {
      console.error('Error saving video:', err);
      showToast('Error saving the YouTube video.', 'error');
    } finally {
      setIsSavingVideo(false);
    }
  };

  // 5. Password Authentication Dialog
  const handleAdminLogin = () => {
    if (adminPassword === 'arlisrmf6969') {
      setIsAdmin(true);
      localStorage.setItem('hyu_admin_logged', 'true');
      setShowAdminModal(false);
      setAdminError('');
      setAdminPassword('');
      showToast('Editor Mode activated!', 'success');
    } else {
      setAdminError('Incorrect password.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('hyu_admin_logged');
    showToast('Editor Mode deactivated.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-accent font-sans bg-grid-overlay relative overflow-x-hidden">
      
      {/* Rotating blurred backdrop (changes every 4 hours) + ambient particles */}
      <RotatingBackground />
      <ParticleField />

      {/* Background Neon Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#ff1e27] opacity-[0.06] blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#8b5cf6] opacity-[0.05] blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#ff1e27] opacity-[0.05] blur-[120px] pointer-events-none"></div>

      {/* Floating Status Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl border flex items-center gap-3 backdrop-blur-xl shadow-2xl ${
              toast.type === 'success' ? 'bg-[#0d2118]/90 border-emerald-500/30 text-emerald-400' :
              toast.type === 'error' ? 'bg-[#290d11]/90 border-red-500/30 text-red-400' :
              'bg-[#101726]/90 border-[#1f2633] text-blue-400'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-400 animate-pulse' :
              toast.type === 'error' ? 'bg-red-400 animate-pulse' :
              'bg-blue-400 animate-pulse'
            }`} />
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#06070a]/85 border-b border-[#111622] shadow-[0_4px_30px_rgba(0,0,0,0.3)] py-5 px-6 md:px-12 flex justify-between items-center">
        <a href="#hero" className="flex items-center gap-3 group">
          <span className="font-display font-extrabold text-xl tracking-wider bg-gradient-to-r from-white via-neutral-200 to-primary bg-clip-text text-transparent group-hover:tracking-widest transition-all duration-300">
            EDA
          </span>
        </a>

        {/* Minimal Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
          <a href="#hero" className="text-[#94a3b8] hover:text-white transition-colors">Home</a>
          <a href="#demons" className="text-[#94a3b8] hover:text-white transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Extreme Demons
          </a>
          <a href="#platformers" className="text-[#94a3b8] hover:text-white transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Platformers
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Admin Switch */}
          {isAdmin ? (
            <motion.button 
              onClick={handleAdminLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-glow-red"
              title="Cerrar Modo Admin"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor Active</span>
            </motion.button>
          ) : (
            <motion.button 
              onClick={() => {
                setShowAdminModal(true);
                setAdminError('');
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-neutral-900 border border-border text-muted hover:text-white hover:border-neutral-700 transition-colors"
              title="Entrar como administrador para actualizar progreso"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor Mode</span>
            </motion.button>
          )}

          {/* YouTube channel button */}
          <motion.a 
            href="https://www.youtube.com/channel/UCpgzwqaT5MDHDwv1h8MgdNg" 
            target="_blank" 
            rel="noopener noreferrer" 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs md:text-sm font-bold tracking-wide px-4 py-2 rounded-lg transition-colors shadow-glow-red"
          >
            <Youtube className="w-4 h-4 fill-white" />
            <span>hyu's channel</span>
          </motion.a>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="hero" className="relative min-h-[80vh] md:min-h-[85vh] flex items-center justify-center py-16 px-6 md:px-12 border-b border-[#0f1118] overflow-hidden">
        {/* Extreme Demon Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,30,39,0.06),transparent_65%)] pointer-events-none"></div>

        <div className="container mx-auto grid md:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero Left Content */}
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Geometry Dash Extreme Tracker
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="font-display font-black text-5xl sm:text-6xl lg:text-7xl uppercase tracking-tight leading-none text-white"
            >
              EXTREME<br />
              <span className="bg-gradient-to-r from-primary via-[#ff6065] to-secondary bg-clip-text text-transparent">
                DEMON ARCHIVE
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="text-[#94a3b8] text-base md:text-lg lg:text-xl max-w-xl font-light leading-relaxed"
            >
              The definitive tracker of Extreme Demons and Platformer levels recorded and completed for <span className="text-white font-bold">hyu</span>'s channel. Recorded, organized, and synchronized in real time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <motion.a 
                href="#demons" 
                whileHover={{ scale: 1.045, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 bg-[#ff1e27] hover:bg-primary-hover text-white font-extrabold px-8 py-4 rounded-xl shadow-glow-red transition-colors duration-300"
              >
                <span>Check tracker</span>
                <Gamepad2 className="w-5 h-5" />
              </motion.a>
              <motion.a 
                href="https://www.youtube.com/channel/UCpgzwqaT5MDHDwv1h8MgdNg" 
                target="_blank" 
                rel="noopener noreferrer" 
                whileHover={{ scale: 1.045, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 bg-neutral-900/60 border border-border hover:border-neutral-700 hover:bg-neutral-950 text-white font-bold px-8 py-4 rounded-xl transition-colors duration-300"
              >
                <Youtube className="w-5 h-5 fill-white" />
                <span>hyu's channel</span>
              </motion.a>
            </motion.div>
          </div>

          {/* Hero Right Visual (Demon Logo Card) */}
          <div className="md:col-span-5 flex justify-center">
            <motion.div 
              initial={{ rotate: -5, scale: 0.9, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative w-[280px] sm:w-[350px] aspect-square rounded-3xl border border-primary/20 bg-[#0e1117]/80 backdrop-blur-sm p-8 flex flex-col items-center justify-center shadow-glow-red-strong"
            >
              {/* Flame Effect Behind Image */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/20 filter blur-3xl animate-pulse-slow"></div>
              
              <img 
                src="https://cdn.wegic.ai/assets/onepage/uploads/2069629453812817922/image/2026/06/24/01KVVY7H4ASXMZ6YMVV73AJF2R.jpg?imageMogr2/format/webp"
                alt="hyu" 
                className="w-48 h-48 object-cover object-center relative z-10 hover:scale-105 transition-transform duration-500 rounded-2xl"
              />
            </motion.div>
          </div>

        </div>
      </section>

      {/* STATS SECTION */}
      <section id="stats" className="py-12 px-6 md:px-12 border-b border-[#0f1118]">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-6">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Stat 1: Extreme Demons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.4 }}
                className="relative bg-gradient-to-br from-[#12141c] to-[#0a0b10] border border-white/[0.06] p-6 rounded-3xl flex flex-col justify-between hover:border-primary/50 transition-colors shadow-glow-red group overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted group-hover:text-primary transition-colors">Extreme Demons</span>
                    <h3 className="font-display font-black text-4xl text-white">
                      {stats.demonsCompleted} <span className="text-lg text-muted font-normal">/ {stats.demonsTotal}</span>
                    </h3>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-glow-red">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-6 relative z-10">
                  <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Progress</span>
                    <span className="font-bold text-white">
                      {stats.demonsTotal > 0 ? ((stats.demonsCompleted / stats.demonsTotal) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="w-full bg-[#181d29] h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${stats.demonsTotal > 0 ? (stats.demonsCompleted / stats.demonsTotal) * 100 : 0}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="bg-gradient-to-r from-primary to-[#ff6065] h-full rounded-full"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Stat 2: Platformers */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="relative bg-gradient-to-br from-[#12141c] to-[#0a0b10] border border-white/[0.06] p-6 rounded-3xl flex flex-col justify-between hover:border-secondary/50 transition-colors shadow-glow-purple group overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary/10 blur-2xl group-hover:bg-secondary/20 transition-all duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted group-hover:text-secondary transition-colors">Extremes Platformer</span>
                    <h3 className="font-display font-black text-4xl text-white">
                      {stats.platsCompleted} <span className="text-lg text-muted font-normal">/ {stats.platsTotal}</span>
                    </h3>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-glow-purple">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-6 relative z-10">
                  <div className="flex justify-between text-xs text-muted mb-2">
                    <span>Progress</span>
                    <span className="font-bold text-white">
                      {stats.platsTotal > 0 ? ((stats.platsCompleted / stats.platsTotal) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                  <div className="w-full bg-[#181d29] h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${stats.platsTotal > 0 ? (stats.platsCompleted / stats.platsTotal) * 100 : 0}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="bg-gradient-to-r from-secondary to-[#a78bfa] h-full rounded-full"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Stat 3: High-rated levels (Epic / Legendary / Mythic) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative bg-gradient-to-br from-[#12141c] to-[#0a0b10] border border-white/[0.06] p-6 rounded-3xl flex flex-col justify-between hover:border-purple-500/50 transition-colors group overflow-hidden"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted group-hover:text-purple-400 transition-colors">High-Rated Levels</span>
                    <h3 className="font-display font-black text-4xl text-white">
                      {stats.highRatedTotal}
                    </h3>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                    <img src={RATINGS.find(r => r.key === 'mythic')!.img} alt="Mythic" className="w-6 h-6 object-contain" />
                  </div>
                </div>

                <div className="mt-4 space-y-2 relative z-10">
                  {[
                    { key: 'epic',      label: 'Epic',      count: stats.epicCount,      color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    { key: 'legendary', label: 'Legendary', count: stats.legendaryCount, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                    { key: 'mythic',    label: 'Mythic',    count: stats.mythicCount,    color: 'text-purple-400', bg: 'bg-purple-400/10' },
                  ].map(({ key, label, count, color, bg }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={RATINGS.find(r => r.key === key)!.img} alt={label} className="w-4 h-4 object-contain" />
                        <span className={`text-xs font-bold ${color}`}>{label}</span>
                      </div>
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${bg} ${color}`}>{count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>

            {/* Status Breakdown: Published / Pending Record / Pending Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {[
                { label: 'Published', count: stats.publishedCount, icon: CheckCircle2, color: 'text-green-400', from: 'from-green-500/10', border: 'border-green-500/25', glow: 'rgba(34,197,94,0.25)' },
                { label: 'Pending Record', count: stats.pendingRecordCount, icon: Video, color: 'text-amber-400', from: 'from-amber-500/10', border: 'border-amber-500/25', glow: 'rgba(245,158,11,0.25)' },
                { label: 'Pending Upload', count: stats.pendingUploadCount, icon: UploadCloud, color: 'text-blue-400', from: 'from-blue-500/10', border: 'border-blue-500/25', glow: 'rgba(59,130,246,0.25)' },
              ].map(({ label, count, icon: Icon, color, from, border, glow }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -3, boxShadow: `0 0 30px ${glow}` }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className={`bg-gradient-to-br ${from} to-transparent border ${border} rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 border ${border} flex items-center justify-center ${color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</span>
                  </div>
                  <span className={`font-display font-black text-3xl ${color}`}>{count}</span>
                </motion.div>
              ))}
            </div>
            </>
          )}

          {/* Admin Panel: Export */}
          {isAdmin && !isLoading && (
            <div className="mt-6 bg-gradient-to-br from-[#0e1117] to-[#0a0c10] border border-amber-500/20 rounded-2xl p-5 shadow-lg flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-amber-400">Editor Tools</h3>
              </div>
              <button
                onClick={handleExportDemonsCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
                title="Export Extreme Demons data as CSV (importable into Google Sheets)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Export Demons CSV
              </button>
            </div>
          )}
        </div>
      </section>

      {/* TRACKER CORE LISTS GRID */}
      <section id="tracker" className="py-16 px-4 md:px-12">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: EXTREME DEMONS (RED ACCENT) */}
          <motion.div
            id="demons"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 bg-[#0e1117]/60 border border-[#1f2633] rounded-3xl p-6 md:p-8 relative"
          >
            <div className="absolute top-0 right-1/3 w-32 h-32 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
            
            {/* Column Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <h2 className="font-display font-extrabold text-2xl uppercase tracking-wider text-white">Extreme Demons</h2>
                </div>
                <p className="text-xs text-muted">Auto-synced from Google Sheets</p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => syncGoogleSheets()}
                  disabled={isSyncingSheets}
                  className="p-2 rounded-lg bg-neutral-900 border border-border hover:bg-neutral-800 text-muted hover:text-white transition-colors disabled:opacity-50"
                  title="Sync Google Sheets now"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                </button>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                  {stats.demonsTotal}
                </span>
              </div>
            </div>

            {/* Searches and Filters */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input 
                    type="text" 
                    value={demonSearch}
                    onChange={(e) => setDemonSearch(e.target.value)}
                    placeholder="Search level or creator..."
                    className="w-full bg-[#06070a] border border-[#1f2633] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-[#06070a] p-1 rounded-xl border border-border shrink-0 overflow-x-auto">
                  {(['all', 'completed', 'pending', 'favorites'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => { setDemonFilter(f); if (f !== 'all') setDemonRatingFilter('all'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                        demonFilter === f ? 'bg-primary text-white' : 'text-muted hover:text-white'
                      }`}
                    >
                      {f === 'favorites' && <Star className="w-3 h-3" />}
                      {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : f === 'pending' ? 'Remaining' : 'Favorites'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Filter Row — only when on 'all' tab */}
              {demonFilter === 'all' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted font-semibold uppercase tracking-wider mr-1">Rating:</span>
                  {(['all', 'epic', 'legendary', 'mythic'] as const).map(r => {
                    const cfg = r !== 'all' ? RATINGS.find(x => x.key === r) : null;
                    return (
                      <button
                        key={r}
                        onClick={() => setDemonRatingFilter(r)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                          demonRatingFilter === r
                            ? r === 'epic' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                              : r === 'legendary' ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                              : r === 'mythic' ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                              : 'bg-neutral-700 border-neutral-600 text-white'
                            : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'
                        }`}
                      >
                        {cfg && <img src={cfg.img} alt={cfg.label} className="w-3 h-3 object-contain" />}
                        {r === 'all' ? 'All Ratings' : cfg?.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Level list items */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filteredDemons.length === 0 ? (
              <div className="text-center py-16 bg-[#06070a]/40 rounded-2xl border border-dashed border-[#1f2633] text-muted text-sm space-y-2">
                <Info className="w-6 h-6 mx-auto text-muted/60" />
                <p>No levels found in this category.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {filteredDemons.slice(0, demonLimit).map((demon) => {
                  const statusCfg = STATUS_OPTIONS.find(s => s.key === demon.status) ?? STATUS_OPTIONS[0];
                  const ratingCfg = RATINGS.find(r => r.key === demon.rating) ?? RATINGS[0];
                  const isDimmed = demon.status !== 'indefinite';
                  const isIndefinite = demon.status === 'indefinite';
                  return (
                  <motion.div 
                    key={demon.uid}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    whileHover={{ y: -4, scale: 1.012 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={`flex items-center gap-5 bg-[#0d0f14]/80 border ${
                      demon.completed ? 'border-primary/30 shadow-glow-red/5 bg-[#170e0f]/40' : 'border-[#1f2633]'
                    } p-5 md:p-6 rounded-3xl hover:bg-card-hover/60 hover:shadow-glow-red hover:border-primary/40 transition-all duration-300 relative group ${isDimmed ? 'opacity-40' : ''} ${isIndefinite ? 'animate-indefinite' : ''}`}
                  >
                    {/* Favorite Star — top-left */}
                    <button
                      onClick={() => handleToggleFavorite(demon.uid, demon.name, demon.favorite, demon.creator)}
                      disabled={!isAdmin}
                      className={`absolute top-2 left-2 z-10 transition-all duration-200 ${
                        isAdmin ? 'cursor-pointer' : 'cursor-default'
                      } ${demon.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                      title={isAdmin ? (demon.favorite ? 'Remove from favorites' : 'Mark as favorite') : ''}
                    >
                      <Star className={`w-3.5 h-3.5 transition-all duration-200 ${
                        demon.favorite ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]' : 'text-amber-400/60'
                      }`} />
                    </button>

                    {/* Rating icon — top-right */}
                    <div className="absolute top-2 right-2 z-10">
                      {isAdmin ? (
                        <div className="relative group/rating">
                          <img src={ratingCfg.img} alt={ratingCfg.label} className="w-5 h-5 object-contain cursor-pointer hover:scale-125 transition-transform" title={ratingCfg.label} />
                          {/* Rating picker dropdown */}
                          <div className="absolute right-0 top-6 hidden group-hover/rating:flex flex-col bg-[#0e1117] border border-border rounded-xl p-1.5 gap-1 shadow-xl z-20 min-w-[130px]">
                            {RATINGS.map(r => (
                              <button
                                key={r.key}
                                onClick={() => handleSetRating(demon.uid, demon.name, r.key, demon.creator)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors text-left ${demon.rating === r.key ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
                              >
                                <img src={r.img} alt={r.label} className="w-4 h-4 object-contain" />
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <img src={ratingCfg.img} alt={ratingCfg.label} className="w-5 h-5 object-contain" title={ratingCfg.label} />
                      )}
                    </div>
                    {/* YouTube Video Thumbnail */}
                    <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border border-border/40 shrink-0 bg-neutral-950">
                      <img 
                        src={getThumbnailUrl(demon.youtube_url)} 
                        alt={demon.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      {demon.youtube_url && (
                        <a 
                          href={demon.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Youtube className="w-7 h-7 text-red-500 fill-white" />
                        </a>
                      )}
                    </div>

                    {/* Level details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-base sm:text-lg text-white truncate flex items-center gap-2">
                        {demon.name}
                        {demon.youtube_url && (
                          <a 
                            href={demon.youtube_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-white transition-colors"
                            title="Watch on YouTube"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </h4>
                      <p className="text-xs text-muted">by <span className="text-neutral-400 font-medium">{demon.creator}</span></p>

                      {/* Status selector + Days counter */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {isAdmin ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {STATUS_OPTIONS.map(s => (
                              <button
                                key={s.key}
                                onClick={() => handleSetStatus(demon.uid, demon.name, 'demon', s.key, demon.creator)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                  demon.status === s.key
                                    ? s.key === 'indefinite'
                                      ? 'text-green-400 border-green-500/60 bg-green-500/10'
                                      : `${s.color} border-current bg-current/10`
                                    : 'text-neutral-600 border-neutral-800 hover:border-neutral-600 hover:text-neutral-400'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold ${
                            demon.status === 'indefinite' ? 'text-green-400' : statusCfg.color
                          }`}>{statusCfg.label}</span>
                        )}
                        {/* Days counter for pending statuses */}
                        {(demon.status === 'pending_record' || demon.status === 'pending_upload') && (() => {
                          const days = getDaysSinceStatus(demon.status_set_at);
                          return days !== null ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[9px] font-extrabold text-neutral-400">
                              {days}d
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-3 shrink-0 mt-4">
                      {/* Video Button */}
                      {isAdmin && (
                        <button 
                          onClick={() => openEditVideo(demon, 'demon')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            demon.youtube_url 
                              ? 'bg-neutral-900 border-primary/20 text-primary hover:bg-primary/10' 
                              : 'bg-neutral-950 border-border text-muted hover:text-white hover:border-neutral-700'
                          }`}
                          title="Link YouTube video"
                        >
                          <Youtube className="w-4 h-4" />
                        </button>
                      )}

                      {/* Checkbox */}
                      <button 
                        onClick={() => handleToggleCompletion(demon.uid, demon.name, 'demon', demon.completed, demon.youtube_url, demon.creator)}
                        disabled={!isAdmin}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          demon.completed 
                            ? 'bg-primary border-primary text-white shadow-glow-red' 
                            : 'border-border bg-[#06070a] hover:border-neutral-500'
                        } ${!isAdmin ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-90'}`}
                      >
                        {demon.completed && <Check className="w-4 h-4 stroke-[3px]" />}
                      </button>
                    </div>
                  </motion.div>
                  );
                })}

                {/* Pagination expansion footer */}
                {filteredDemons.length > demonLimit && (
                  <button 
                    onClick={() => setDemonLimit(prev => prev + 15)}
                    className="w-full py-3.5 mt-4 rounded-xl border border-dashed border-[#1f2633] hover:border-primary/40 bg-neutral-900/10 hover:bg-[#170e0f]/10 text-xs font-bold text-muted hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <span>Load more Extreme Demons ({filteredDemons.length - demonLimit} remaining)</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}

                {demonLimit > 15 && (
                  <button 
                    onClick={() => setDemonLimit(15)}
                    className="w-full py-2 mt-2 rounded-xl text-xs text-muted hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Show less</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* COLUMN 2: EXTREMES PLATAFORMA (PURPLE ACCENT) */}
          <motion.div
            id="platformers"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-6 bg-[#0e1117]/60 border border-[#1f2633] rounded-3xl p-6 md:p-8 relative"
          >
            <div className="absolute top-0 left-1/3 w-32 h-32 rounded-full bg-secondary/5 blur-3xl pointer-events-none"></div>

            {/* Column Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                  <h2 className="font-display font-extrabold text-2xl uppercase tracking-wider text-white">Extremes Platformer</h2>
                </div>
                <p className="text-xs text-muted">Auto-synced from gdplatformerlist.com</p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => syncPlatformerList()}
                  disabled={isSyncingPlatformers}
                  className="p-2 rounded-lg bg-neutral-900 border border-border hover:bg-neutral-800 text-muted hover:text-white transition-colors disabled:opacity-50"
                  title="Sync gdplatformerlist.com now"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingPlatformers ? 'animate-spin' : ''}`} />
                </button>
                <span className="px-2.5 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold">
                  {stats.platsTotal}
                </span>
              </div>
            </div>

            {/* Searches and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="text" 
                  value={platformerSearch}
                  onChange={(e) => setPlatformerSearch(e.target.value)}
                  placeholder="Search platformer..."
                  className="w-full bg-[#06070a] border border-[#1f2633] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-secondary/50 transition-colors"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-[#06070a] p-1 rounded-xl border border-border shrink-0 overflow-x-auto">
                {(['all', 'completed', 'pending', 'favorites'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPlatformerFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                      platformerFilter === f ? 'bg-secondary text-white' : 'text-muted hover:text-white'
                    }`}
                  >
                    {f === 'favorites' && <Star className="w-3 h-3" />}
                    {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : f === 'pending' ? 'Remaining' : 'Favorites'}
                  </button>
                ))}
              </div>
            </div>

            {/* Level list items */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <RefreshCw className="w-8 h-8 text-secondary animate-spin" />
              </div>
            ) : filteredPlatformers.length === 0 ? (
              <div className="text-center py-16 bg-[#06070a]/40 rounded-2xl border border-dashed border-[#1f2633] text-muted text-sm space-y-2">
                <Info className="w-6 h-6 mx-auto text-muted/60" />
                <p>No levels found in this category.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {filteredPlatformers.slice(0, platformerLimit).map((plat) => {
                  const statusCfg = STATUS_OPTIONS.find(s => s.key === plat.status) ?? STATUS_OPTIONS[0];
                  const isDimmed = plat.status !== 'indefinite';
                  const isIndefinite = plat.status === 'indefinite';
                  return (
                  <motion.div 
                    key={plat.uid}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    whileHover={{ y: -4, scale: 1.012 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={`flex items-center gap-5 bg-[#0d0f14]/80 border ${
                      plat.completed ? 'border-secondary/30 shadow-glow-purple/5 bg-[#120e17]/40' : 'border-[#1f2633]'
                    } p-5 md:p-6 rounded-3xl hover:bg-card-hover/60 hover:shadow-glow-purple hover:border-secondary/40 transition-all duration-300 relative group ${isDimmed ? 'opacity-40' : ''} ${isIndefinite ? 'animate-indefinite' : ''}`}
                  >
                    {/* Favorite Star — top-left */}
                    <button
                      onClick={() => handleToggleFavoritePlat(plat.uid, plat.name, plat.favorite, plat.rank)}
                      disabled={!isAdmin}
                      className={`absolute top-2 left-2 z-10 transition-all duration-200 ${
                        isAdmin ? 'cursor-pointer' : 'cursor-default'
                      } ${plat.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                      title={isAdmin ? (plat.favorite ? 'Remove from favorites' : 'Mark as favorite') : ''}
                    >
                      <Star className={`w-3.5 h-3.5 transition-all duration-200 ${
                        plat.favorite ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]' : 'text-amber-400/60'
                      }`} />
                    </button>
                    {/* YouTube Video Thumbnail */}
                    <div className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border border-border/40 shrink-0 bg-neutral-950">
                      <img 
                        src={getThumbnailUrl(plat.youtube_url)} 
                        alt={plat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      {plat.youtube_url && (
                        <a 
                          href={plat.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Youtube className="w-7 h-7 text-purple-500 fill-white" />
                        </a>
                      )}
                    </div>

                    {/* Level details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-base sm:text-lg text-white truncate flex items-center gap-2">
                        {plat.name}
                        {plat.youtube_url && (
                          <a 
                            href={plat.youtube_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-secondary hover:text-white transition-colors"
                            title="Watch on YouTube"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </h4>
                      <p className="text-xs text-muted flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 font-bold">#{plat.rank}</span>
                        <span>Platformer</span>
                      </p>
                      {/* Status selector + Days counter */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {isAdmin ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {STATUS_OPTIONS.map(s => (
                              <button
                                key={s.key}
                                onClick={() => handleSetStatus(plat.uid, plat.name, 'platformer', s.key, undefined, plat.rank)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                  plat.status === s.key
                                    ? s.key === 'indefinite'
                                      ? 'text-green-400 border-green-500/60 bg-green-500/10'
                                      : `${s.color} border-current bg-current/10`
                                    : 'text-neutral-600 border-neutral-800 hover:border-neutral-600 hover:text-neutral-400'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold ${
                            plat.status === 'indefinite' ? 'text-green-400' : statusCfg.color
                          }`}>{statusCfg.label}</span>
                        )}
                        {/* Days counter for pending statuses */}
                        {(plat.status === 'pending_record' || plat.status === 'pending_upload') && (() => {
                          const days = getDaysSinceStatus(plat.status_set_at);
                          return days !== null ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[9px] font-extrabold text-neutral-400">
                              {days}d
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-3 shrink-0 mt-4">
                      {/* Video Button */}
                      {isAdmin && (
                        <button 
                          onClick={() => openEditVideo(plat, 'platformer')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            plat.youtube_url 
                              ? 'bg-neutral-900 border-secondary/20 text-secondary hover:bg-secondary/10' 
                              : 'bg-neutral-950 border-border text-muted hover:text-white hover:border-neutral-700'
                          }`}
                          title="Link YouTube video"
                        >
                          <Youtube className="w-4 h-4" />
                        </button>
                      )}

                      {/* Checkbox */}
                      <button 
                        onClick={() => handleToggleCompletion(plat.uid, plat.name, 'platformer', plat.completed, plat.youtube_url, undefined, plat.rank)}
                        disabled={!isAdmin}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          plat.completed 
                            ? 'bg-secondary border-secondary text-white shadow-glow-purple' 
                            : 'border-border bg-[#06070a] hover:border-neutral-500'
                        } ${!isAdmin ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-90'}`}
                      >
                        {plat.completed && <Check className="w-4 h-4 stroke-[3px]" />}
                      </button>
                    </div>
                  </motion.div>
                  );
                })}

                {/* Pagination expansion footer */}
                {filteredPlatformers.length > platformerLimit && (
                  <button 
                    onClick={() => setPlatformerLimit(prev => prev + 15)}
                    className="w-full py-3.5 mt-4 rounded-xl border border-dashed border-[#1f2633] hover:border-secondary/40 bg-neutral-900/10 hover:bg-[#120e17]/10 text-xs font-bold text-muted hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <span>Load more Extremes Platformer ({filteredPlatformers.length - platformerLimit} remaining)</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}

                {platformerLimit > 15 && (
                  <button 
                    onClick={() => setPlatformerLimit(15)}
                    className="w-full py-2 mt-2 rounded-xl text-xs text-muted hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Show less</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </motion.div>

        </div>
      </section>

      {/* HOW IT WORKS / GENERAL OVERVIEW */}
      <section id="about" className="py-16 px-6 md:px-12 bg-neutral-950/40 border-t border-[#0f1118]">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Section 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 bg-[#0e1117]/40 border border-border p-6 rounded-2xl hover:border-primary/30 hover:shadow-glow-red transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-display text-lg">
                01
              </div>
              <h3 className="font-display font-extrabold text-lg text-white">Full Synchronization</h3>
              <p className="text-muted text-sm leading-relaxed">
                This tracker auto-syncs classic level lists from the channel's Google Sheet and platformers from gdplatformerlist, keeping them perfectly up to date at all times.
              </p>
            </motion.div>

            {/* Section 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="space-y-4 bg-[#0e1117]/40 border border-border p-6 rounded-2xl hover:border-primary/30 hover:shadow-glow-red transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-display text-lg">
                02
              </div>
              <h3 className="font-display font-extrabold text-lg text-white">Progress Controls</h3>
              <p className="text-muted text-sm leading-relaxed">
                Each level has a dedicated checkbox stored in the database. Only the creator can edit them securely through the admin panel — visitors can view progress but cannot modify it.
              </p>
            </motion.div>

            {/* Section 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="space-y-4 bg-[#0e1117]/40 border border-border p-6 rounded-2xl hover:border-primary/30 hover:shadow-glow-red transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold font-display text-lg">
                03
              </div>
              <h3 className="font-display font-extrabold text-lg text-white">Integrated Showcases</h3>
              <p className="text-muted text-sm leading-relaxed">
                Adding a YouTube link to a level will automatically load its video thumbnail inside the list, providing a highly interactive and visual experience.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-neutral-950 border-t border-[#0f1118] py-12 px-6 md:px-12 text-center md:text-left">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-4 col-span-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <span className="font-display font-black text-2xl tracking-wider text-white">hyu TRACKER</span>
            </div>
            <p className="text-muted text-sm max-w-sm">
              Extreme Demons, records and showcases. Tracker built for the community and followers of hyu's YouTube channel.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider">Navigation</h4>
            <ul className="text-sm text-muted space-y-2">
              <li><a href="#hero" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#demons" className="hover:text-white transition-colors">Extreme Demons</a></li>
              <li><a href="#platformers" className="hover:text-white transition-colors">Extremes Platformer</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider">YouTube Channel</h4>
            <a 
              href="https://www.youtube.com/channel/UCpgzwqaT5MDHDwv1h8MgdNg" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm bg-[#120e0e] border border-red-500/20 text-red-400 hover:text-white hover:bg-primary/20 px-4 py-2.5 rounded-xl transition-all"
            >
              <Youtube className="w-4 h-4 fill-red-400 group-hover:fill-white" />
              <span>Subscribe to hyu</span>
            </a>
          </div>

        </div>

        <div className="container mx-auto max-w-6xl mt-12 pt-6 border-t border-[#111] flex flex-col sm:flex-row justify-between items-center text-xs text-muted gap-4">
          <p>© {new Date().getFullYear()} hyu Tracker. All rights reserved. Geometry Dash is property of RobTop Games.</p>
          <div className="flex gap-4">
            <a href="https://www.youtube.com/channel/UCpgzwqaT5MDHDwv1h8MgdNg" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
            <span className="text-neutral-800">|</span>
            <span className="text-neutral-500">Thanks to ArioM, <a href="https://gdplatformerlist.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline underline-offset-2">gdplatformerlist.com</a>, BloxyBloom</span>
          </div>
        </div>
      </footer>

      {/* ADMIN PASSWORD LOGIN MODAL */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#0e1117] border border-border p-8 rounded-3xl shadow-glow-red-strong z-10"
            >
              <h3 className="font-display font-extrabold text-xl text-white mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Admin Access (hyu)
              </h3>
              <p className="text-xs text-muted mb-6">
                Enter the tracker password to mark levels as completed and link showcase videos.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">Password</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="Enter password here..."
                    className="w-full bg-[#06070a] border border-[#1f2633] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 text-sm"
                    autoFocus
                  />
                  {adminError && <span className="text-xs text-red-500 mt-1.5 block">{adminError}</span>}
                  <span className="text-[11px] text-muted mt-2 block italic">Hint: The default key is "hyu"</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowAdminModal(false)}
                    className="flex-1 py-3 text-xs font-bold text-muted bg-neutral-900 border border-border rounded-xl hover:bg-neutral-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAdminLogin}
                    className="flex-1 py-3 text-xs font-extrabold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-glow-red transition-all"
                  >
                    Activate Editor Mode
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT VIDEO LINK MODAL */}
      <AnimatePresence>
        {editingLevel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingLevel(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[#0e1117] border border-border p-8 rounded-3xl shadow-glow-red-strong z-10"
            >
              <h3 className="font-display font-extrabold text-lg text-white mb-2 flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500 fill-white" />
                Link Showcase Video
              </h3>
              <p className="text-xs text-muted mb-6">
                Enter the YouTube link for the showcase of <span className="text-white font-bold">{editingLevel.level_name}</span>. The thumbnail will be extracted automatically.
              </p>

              <div className="space-y-5">
                {/* Current preview */}
                <div className="border border-border p-4 rounded-2xl bg-neutral-950 flex items-center gap-4">
                  <img 
                    src={getThumbnailUrl(youtubeInputUrl)} 
                    alt="Thumbnail preview" 
                    className="w-24 aspect-video object-cover rounded-lg border border-neutral-800 shrink-0"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted">Thumbnail Preview</span>
                    <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{editingLevel.level_name}</h4>
                    <p className="text-xs text-muted">Make sure to paste a valid YouTube URL</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5">YouTube Link</label>
                  <input 
                    type="url" 
                    value={youtubeInputUrl}
                    onChange={(e) => setYoutubeInputUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#06070a] border border-[#1f2633] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 text-sm"
                  />
                  {youtubeInputUrl && !getYouTubeId(youtubeInputUrl) && (
                    <span className="text-xs text-amber-500 mt-1.5 block">This doesn't look like a valid YouTube video URL, but you can save it anyway.</span>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setEditingLevel(null)}
                    className="flex-1 py-3 text-xs font-bold text-muted bg-neutral-900 border border-border rounded-xl hover:bg-neutral-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveVideo}
                    disabled={isSavingVideo}
                    className="flex-1 py-3 text-xs font-extrabold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-glow-red transition-all disabled:opacity-50"
                  >
                    {isSavingVideo ? 'Saving...' : 'Save Showcase'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
