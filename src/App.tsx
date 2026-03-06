import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

import {
  Settings, RefreshCcw, MoreVertical, Plus, CheckCircle, XCircle, Cloud, Folder, Loader2, Clock, History, Home as HomeIcon, Sun,
  Moon, Search, Github, HardDrive, ExternalLink, Sparkles, Image as ImageIcon, Paintbrush, Palette, Bot, SortAsc, SortDesc, LayoutDashboard,
  Save, Calendar, HardDriveUpload, HardDriveDownload, Trash2, Edit, FolderOpen, MapPin, Bell, Activity, Database, FileWarning, Droplets, Code,
  UploadCloud, DownloadCloud, FileText, FolderDown, Filter, Play, Info, Archive, Server, Gamepad2, BellDot, FileUp, FileDown,
  ChevronsLeft,
  ChevronsRight,
  BarChart2,
  Lightbulb,
  ArrowLeft,
  ChevronLeft,
  Edit3,
  PlusCircle,
  Upload,
  Timer,
  Shield,
  User as UserIcon,
  LogOut,
  Tag,
  Building2,
  PlayCircle,
  Maximize2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { auth, logOut } from './firebase';


import { onAuthStateChanged, User as AuthUser, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';


interface GameCardProps {
  game: Game;
  onSync: (gameId: string, provider?: Checkpoint['provider'] | 'Local') => Promise<void>;
  onToggleEnable: (gameId: string, enabled: boolean) => void;
  onEditGame: (game: Game) => void;
  onDelete: (gameId: string) => void;
  onOpenDirectory: (gamePath: string) => void;
  onChangeLocation: (gameId: string) => void;
  onCreateLocalCheckpoint: (gameId: string) => void;
  onViewDetails: (game: Game) => void;
  onLaunchGame: (game: Game) => void;
  onInitiateSync: (gameId: string) => void;
  defaultSyncProvider: AppSettings['defaultSyncProvider'];
  isGoogleDriveConnected: boolean;
  isGithubConnected: boolean;
  addNotification: (message: string, type: NotificationMessage['type'], options?: { icon?: React.ReactNode; force?: boolean }) => void;
  glassmorphismIntensity: number;
}


interface EditGameModalProps {
  game: Game;
  onSave: (editedGame: Game) => void;
  onCancel: () => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info', options?: { icon?: React.ReactNode; force?: boolean }) => void;
  onBrowse: (type: 'file' | 'folder' | 'any', setter: React.Dispatch<React.SetStateAction<string>>) => void;
  currentUser: AppUser | null;
}


interface GameForMenu {
  id: string;
  name: string;
  path: string;
}

// Define the props this component needs
interface GameCardMoreOptionsMenuProps {
  game: GameForMenu;
  onEdit: (gameId: string) => void;
  onDelete: (gameId: string) => void;
  onOpenDirectory: (gamePath: string) => void;
  onChangeLocation: (gameId: string) => void;
  onCreateLocalCheckpoint: (gameId: string) => void;
  isSyncing?: boolean;
}


const GameCardMoreOptionsMenu: React.FC<GameCardMoreOptionsMenuProps> = ({
  game,
  onEdit,
  onDelete,
  onOpenDirectory,
  onChangeLocation,
  onCreateLocalCheckpoint,
  isSyncing = false,
}) => {
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowMoreMenu(false);
  };

  const MenuItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: (e: React.MouseEvent) => void;
    isDestructive?: boolean;
  }> = ({ icon, label, onClick, isDestructive = false }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center px-3 py-1.5 text-sm w-full text-left rounded-sm transition-colors",
        isDestructive
          ? "text-red-400 hover:bg-destructive/80 hover:text-destructive-foreground"
          : "hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`More options for ${game.name}`}
                className="hover:bg-white/10 h-7 w-7"
                onClick={(e) => e.stopPropagation()} // Keep this to prevent card's main click
                disabled={isSyncing}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[200px] p-1 bg-black/50 text-foreground border border-white/20 rounded-md shadow-xl backdrop-blur-xl"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <MenuItem
                  icon={<Edit className="mr-2 h-4 w-4" />}
                  label="Edit Details"
                  onClick={(e) => handleAction(e, () => onEdit(game.id))}
                />
                <MenuItem
                  icon={<FolderDown className="mr-2 h-4 w-4" />}
                  label="Create Local Checkpoint"
                  onClick={(e) => handleAction(e, () => onCreateLocalCheckpoint(game.id))}
                />
                <MenuItem
                  icon={<FolderOpen className="mr-2 h-4 w-4" />}
                  label="Open Save Directory"
                  onClick={(e) => handleAction(e, () => onOpenDirectory(game.path))}
                />
                <MenuItem
                  icon={<MapPin className="mr-2 h-4 w-4" />}
                  label="Change Save Location"
                  onClick={(e) => handleAction(e, () => onChangeLocation(game.id))}
                />
                <hr className="my-1 border-white/10" />
                <MenuItem
                  icon={<Trash2 className="mr-2 h-4 w-4" />}
                  label="Delete Game"
                  onClick={(e) => handleAction(e, () => onDelete(game.id))}
                  isDestructive
                />
              </div>
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent>
          <p>More Options</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
// --- END: Extracted Component ---


// Define the structure for a Game object
interface Game {
  id: string;
  name: string;
  path: string; // Save file path
  launchPath?: string; // Optional launch executable path
  lastSynced: string;
  icon?: string; // Using string for emoji/simple icon, now optional
  enabled: boolean;
  bannerUrl?: string;
  coverArtUrl?: string;
  summary?: string;
  customBannerUrl?: string;
  searchPreviewUrl?: string;
  localBannerPath?: string;
  customIconUrl?: string;
  localIconPath?: string;
  developer?: string;
  platform?: string;
  iconUrl?: string;
  publisher?: string;
  genre?: string | string[];
  size?: number; // Save path folder size in bytes
}

// Define the structure for an internal AppUser object
interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string;
  customAvatarPath?: string;
}


const formatPlayTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const stripEmoji = (name: string) => {
  // Basic regex to strip common emoji/icons if they exist at start
  return name.replace(/^[\s\p{Emoji}\u200d\W]+/gu, '').trim();
};


// Define the structure for Theme Settings
interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
}

// Define the structure for App Settings
interface AppSettings {
  bannerDisplayMode: 'banner' | 'cover';
  autoSyncInterval: number;
  autoCheckpointFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  masterNotificationsEnabled: boolean;
  showSuccessNotifications: boolean;
  showErrorNotifications: boolean;
  defaultLocalSyncPath: string;
  localCheckpointsBasePath: string;
  defaultSyncProvider: 'ask_every_time' | Checkpoint['provider'] | 'Local';
}

// Define the structure for a Checkpoint (Local and Cloud)
interface Checkpoint {
  id: string;
  gameId: string;
  gameName: string;
  time: string;
  description: string;
  provider?: 'GitHub' | 'Google Drive' | 'Local';
  size?: string;
  type: 'individual' | 'folder';
  path?: string;
  cloudLink?: string;
  cloudFileId?: string;
}

// Define the structure for an Activity Log Entry
interface ActivityLogEntry {
  id: string;
  type: 'sync' | 'checkpoint_create' | 'checkpoint_restore' | 'checkpoint_delete' | 'error' | 'info' | 'cloud_checkpoint_all' | 'cloud_connect' | 'cloud_disconnect';
  timestamp: string;
  message: string;
  gameName?: string;
  status: 'success' | 'fail' | 'info';
}


// Define the structure for Account Info
interface AccountInfo {
  isLoggedIn: boolean;
  name: string;
  email: string;
  profilePictureUrl?: string;
}

// Define the structure for a Notification message
interface NotificationMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  icon?: React.ReactNode;
  progress?: number; // 0-100
}

// Type for games "found" by auto-detect before they are fully processed
type PotentialGame = Omit<Game, 'id' | 'lastSynced' | 'enabled'> & { tempId: string };

// NEW: Interface for found pre-restore backups
interface FoundBackup {
  gameId: string;
  gameName: string;
  backupPath: string;
}

// Custom hook for managing state in localStorage


// Helper function to format time
const formatTime = (timeString: string) => {
  if (timeString === "Never") return timeString;
  try {
    const date = new Date(timeString);
    return date.toLocaleString();
  } catch (e) {
    return timeString;
  }
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// NEW: Helper function to parse checkpoint size string to MB
const parseSizeToMB = (sizeStr: string = '0 MB'): number => {
  try {
    const [value, unit] = sizeStr.split(' ');
    const numValue = parseFloat(value) || 0;
    if (unit.toUpperCase() === 'GB') {
      return numValue * 1024;
    }
    if (unit.toUpperCase() === 'KB') {
      return numValue / 1024;
    }
    return numValue;
  } catch {
    return 0;
  }
};

// Helper to generate a random checkpoint size string (for simulated/folder checkpoints)
const generateCheckpointSize = (): string => {
  const sizes = ['12 MB', '45 MB', '128 MB', '256 MB', '512 MB', '1.2 GB'];
  return sizes[Math.floor(Math.random() * sizes.length)];
};

// --- Notification Components ---
const Notification: React.FC<{
  notification: NotificationMessage;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  useEffect(() => {
    // Only auto-dismiss if there's no progress or progress is 100
    if (notification.progress === undefined || notification.progress >= 100) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.progress === 100 ? 2000 : 5000); // Shorter delay for completed progress

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.progress, onDismiss]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-400" />,
    error: <XCircle className="h-5 w-5 text-red-400" />,
    info: <ProgressSyncIcon />,
  };

  function ProgressSyncIcon() {
    return notification.progress !== undefined && notification.progress < 100 ? (
      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
    ) : (
      <Info className="h-5 w-5 text-blue-400" />
    );
  }

  const getIcon = () => {
    return notification.icon || icons[notification.type];
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      className="relative flex w-full max-w-sm flex-col rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/60 backdrop-blur-xl text-gray-100"
    >
      <div className="p-4 flex items-start space-x-4">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
        </div>
        <button
          className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-white/30 hover:bg-white/10 hover:text-white transition-colors"
          onClick={() => onDismiss(notification.id)}
          aria-label="Dismiss notification"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>

      {notification.progress !== undefined && (
        <div className="h-1 w-full bg-white/5">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${notification.progress}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
};

// Container for all notifications
const NotificationContainer: React.FC<{
  notifications: NotificationMessage[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-14 right-4 z-50 flex flex-col items-end space-y-2 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {notifications.map(notification => (
            <Notification
              key={notification.id}
              notification={notification}
              onDismiss={onDismiss}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value, icon, colorClass }: { label: string; value: string | number; icon: React.ReactNode; colorClass: string }) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/40 border border-white/10">
    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", colorClass)}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-white mb-1">{label}</p>
      <p className="text-2xl font-medium text-foreground">{value}</p>
    </div>
  </div>
);

// Component for displaying a single Game Card
const GameCard: React.FC<GameCardProps> = ({
  game,
  onSync,
  onToggleEnable,
  onEditGame,
  onDelete,
  onOpenDirectory,
  onChangeLocation,
  onCreateLocalCheckpoint,
  onViewDetails,
  onLaunchGame,
  onInitiateSync,
  defaultSyncProvider,
  isGoogleDriveConnected,
  isGithubConnected,
  addNotification,
  glassmorphismIntensity,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  };

  const handleSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      // Always show options modal now to allow choosing direction (To/From Cloud)
      onInitiateSync(game.id);
    } catch (error) {
      console.error("Sync error:", error);
      addNotification(`Sync failed for ${game.name}.`, 'error', { force: true });
    } finally {
      setIsSyncing(false);
    }
  };
  const handleViewDetails = () => onViewDetails(game);
  const handleLaunchGameClick = (e: React.MouseEvent) => { e.stopPropagation(); onLaunchGame(game); };
  const handleEditClick = (e: React.MouseEvent) => { e.stopPropagation(); onEditGame(game); };



  const createImageUrl = (filePath?: string): string | undefined => {
    if (!filePath) {
      return undefined;
    }
    if (filePath.startsWith('http')) {
      return filePath;
    }

    return `safe-file:///${filePath.replace(/\\/g, '/')}`;
  };







  const createDisplayUrl = () => {
    if (game.localBannerPath) {
      return `safe-file:///${game.localBannerPath.replace(/\\/g, '/')}`;
    }
    const url = game.customBannerUrl || game.coverArtUrl || game.bannerUrl;
    return url ? url.replace('header.jpg', 'library_hero.jpg') : undefined;
  };
  const displayImageUrl = createDisplayUrl();


  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          layout
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            opacity: { duration: 0.2 }
          }}
          className="hover:shadow-2xl transition-shadow duration-300 rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:border-primary/40 bg-black/20 group h-full"
          style={{ backdropFilter: `blur(${glassmorphismIntensity}px)` }}
          onClick={handleViewDetails}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="flex flex-col h-full border-none shadow-none bg-transparent text-foreground">
            {/* ✅ CORRECTED USAGE: The `src` attribute now receives a valid URL. */}
            {displayImageUrl && (
              <div className="relative w-full h-32 overflow-hidden">
                <motion.img
                  src={displayImageUrl}
                  alt={`${game.name} Banner`}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  onError={(e) => {
                    console.error(`Failed to load image: ${displayImageUrl}`);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
            )}
            {!displayImageUrl && (
              <div className="w-full h-32 flex items-center justify-center bg-white/5 text-muted-foreground">
                <Gamepad2 className="w-12 h-12 opacity-50" />
              </div>
            )}
            <div className="flex-1 flex flex-col p-4 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0 pr-2">
                  <CardTitle className="text-base font-bold text-foreground truncate">
                    {stripEmoji(game.name)}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 p-1 bg-black/60 backdrop-blur-xl border-white/10 shadow-2xl">
                      <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/70 focus:text-white focus:bg-white/10 rounded-lg transition-colors cursor-pointer" onClick={() => onEditGame(game)}>
                        <Edit className="w-3.5 h-3.5" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5 my-1" />
                      <DropdownMenuItem className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 focus:text-red-300 focus:bg-red-500/10 rounded-lg transition-colors cursor-pointer" onClick={() => onDelete(game.id)}>
                        <Trash2 className="w-3.5 h-3.5" /> Delete Game
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <Switch
                            checked={game.enabled}
                            onCheckedChange={(checked) => onToggleEnable(game.id, checked)}
                            className="data-[state=checked]:bg-emerald-500 scale-90"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSyncing}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{game.enabled ? 'Disable' : 'Enable'} Sync</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <CardContent className="flex-1 flex flex-col justify-end p-0">
                {/* Paths removed for cleaner list view as per user request */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>ID: {game.id.slice(0, 8)}</span>
                  <span>{game.enabled ? 'Sync Active' : 'Sync Disabled'}</span>
                </div>  {game.summary && !displayImageUrl && (
                  <p className="text-xs mt-2 italic text-muted-foreground line-clamp-2">{game.summary}</p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <Button className="w-full flex-1 font-bold" size="sm" variant="secondary" onClick={handleLaunchGameClick} disabled={!game.launchPath || isSyncing}>
                    <Play className="mr-1 h-3 w-3" /> Play
                  </Button>
                  <Button className="w-full flex-1 font-bold" size="sm" variant="default" onClick={handleSyncClick} disabled={!game.enabled || isSyncing}>
                    {isSyncing ? (<Loader2 className="mr-1 h-3 w-3 animate-spin" />) : (<RefreshCcw className="mr-1 h-3 w-3" />)} Sync
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 p-1 bg-black/60 backdrop-blur-xl border-white/10 shadow-2xl">
        <ContextMenuItem className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/70 focus:text-white focus:bg-white/10 rounded-lg transition-colors cursor-pointer" onClick={() => onEditGame(game)}>
          <Edit className="w-3.5 h-3.5" /> Edit Details
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/5 my-1" />
        <ContextMenuItem className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 focus:text-red-300 focus:bg-red-500/10 rounded-lg transition-colors cursor-pointer" onClick={() => onDelete(game.id)}>
          <Trash2 className="w-3.5 h-3.5" /> Delete Game
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};


const DashboardSummary = React.memo<{
  games: Game[];
  localCheckpoints: Checkpoint[];
  cloudCheckpoints: Checkpoint[];
  glassmorphismIntensity: number;
}>(({ games, localCheckpoints, cloudCheckpoints, glassmorphismIntensity }) => {
  const totalGames = games.length;
  const enabledForSync = games.filter(g => g.enabled).length;

  const summaryItems = useMemo(() => [
    {
      title: "Total Games",
      value: totalGames,
      icon: <Gamepad2 className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Enabled for Sync",
      value: `${enabledForSync} / ${totalGames}`,
      icon: <RefreshCcw className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Local Checkpoints",
      value: localCheckpoints.length,
      icon: <Save className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Cloud Checkpoints",
      value: cloudCheckpoints.length,
      icon: <Cloud className="h-4 w-4 text-muted-foreground" />,
    },
  ], [totalGames, enabledForSync, localCheckpoints.length, cloudCheckpoints.length]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {summaryItems.map((item, index) => (
        <Card key={index} className="border border-white/10 bg-black/20 text-white shadow-2xl backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
            <div className="text-primary/70">{item.icon}</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});





// Component for the Local Checkpoints tab
const LocalCheckpointsTab: React.FC<{
  checkpoints: Checkpoint[];
  onRestore: (checkpointId: string) => void;
  onDelete: (checkpointId: string) => void;
  games: Game[];
  onCreateLocalCheckpoint: (gameId: string, description: string) => void;
  onCreateCheckpointForAll: () => void;
  onOpenCheckpointDirectory: (checkpointId: string) => void;
  onOpenFolderCheckpointLocation: (checkpointId: string) => void;
}> = ({ checkpoints, onRestore, onDelete, games, onCreateLocalCheckpoint, onCreateCheckpointForAll, onOpenCheckpointDirectory, onOpenFolderCheckpointLocation }) => {
  const [sortBy, setSortBy] = useState<'time' | 'gameName' | 'size'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const sortedCheckpoints = [...checkpoints].sort((a, b) => {
    if (sortBy === 'time') {
      const dateA = new Date(a.time).getTime();
      const dateB = new Date(b.time).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    } else if (sortBy === 'gameName') {
      const nameA = a.gameName.toLowerCase();
      const nameB = b.gameName.toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    } else if (sortBy === 'size') {
      const sizeA = a.size || '0 MB';
      const sizeB = b.size || '0 MB';

      const parseSize = (sizeStr: string) => {
        const [value, unit] = sizeStr.split(' ');
        const numValue = parseFloat(value);
        if (unit === 'GB') return numValue * 1024;
        return numValue;
      };

      const numSizeA = parseSize(sizeA);
      const numSizeB = parseSize(sizeB);

      return sortOrder === 'desc' ? numSizeB - numSizeA : numSizeA - numSizeB;
    }
    return 0;
  });

  const filteredCheckpoints = sortedCheckpoints.filter(cp =>
    cp.gameName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cp.size?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const gamesForManualCreation = games.filter(g => g.enabled || checkpoints.some(cp => cp.gameId === g.id));


  return (
    <div className="space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto pr-4">
      <h2 className="text-2xl font-bold text-foreground">Local Checkpoints</h2>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder="Search checkpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground pl-8"
            />
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'gameName' | 'size')}
            className="p-1 text-sm border border-dashed rounded-md bg-transparent text-foreground border-white/20"
          >
            <option value="time">Time</option>
            <option value="gameName">Game Name</option>
            <option value="size">Size</option>
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  aria-label="Toggle sort order"
                  className="hover:bg-white/10"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Sort Order</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>
            <FolderDown className="mr-2 h-4 w-4" /> Create Local Checkpoint
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateCheckpointForAll}>
            <Sparkles className="mr-2 h-4 w-4" /> Checkpoint for All Games
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">
        Manage and restore your local game save checkpoints.
      </p>
      {filteredCheckpoints.length === 0 ? (
        <p className="text-center text-muted-foreground">No local checkpoints found matching your criteria.</p>
      ) : (
        filteredCheckpoints.map((checkpoint) => {
          const game = games.find(g => g.id === checkpoint.gameId);
          const imageUrl = game?.coverArtUrl || game?.bannerUrl;

          return (
            <Card key={checkpoint.id} className={cn("border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground overflow-hidden")}>
              <div className="flex justify-between items-stretch">
                <div className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {checkpoint.type === 'folder' ? <Folder className="inline-block mr-1 w-4 h-4" /> : null}
                      {checkpoint.gameName}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      <Clock className="inline-block mr-1 w-3 h-3" /> {formatTime(checkpoint.time)}
                      {checkpoint.size && <span className="ml-4"><Database className="inline-block mr-1 w-3 h-3" /> Size: {checkpoint.size}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">{checkpoint.description}</p>
                    <div className="mt-4 flex gap-2">
                      {checkpoint.type !== 'folder' && (
                        <Button variant="outline" size="sm" onClick={() => onRestore(checkpoint.id)}>
                          <History className="mr-2 h-4 w-4" /> Restore
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => onDelete(checkpoint.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                      {checkpoint.type === 'folder' ? (
                        <Button variant="ghost" size="sm" onClick={() => onOpenFolderCheckpointLocation(checkpoint.id)}>
                          <FolderOpen className="mr-2 h-4 w-4" /> Open Location
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => onOpenCheckpointDirectory(checkpoint.id)}>
                          <FolderOpen className="mr-2 h-4 w-4" /> Open Location
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>

              </div>
            </Card>
          )
        })
      )}

      <AnimatePresence>
        {showCreateModal && (
          <LocalCheckpointModal
            games={gamesForManualCreation}
            onCreateLocalCheckpoint={(gameId, description) => {
              onCreateLocalCheckpoint(gameId, description);
              setShowCreateModal(false);
            }}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


// Component for the Cloud Checkpoints tab
const CloudCheckpointsTab: React.FC<{
  cloudCheckpoints: Checkpoint[];
  onRestoreCloud: (checkpointId: string) => void;
  onDeleteCloud: (checkpointId: string) => void;
  onUploadCheckpoint: (gameId: string, provider: Checkpoint['provider'], description: string, type?: Checkpoint['type']) => Promise<any>;
  onUploadCheckpointForAll: () => void;
  games: Game[];
  onOpenFolderCheckpointLocation: (checkpointId: string) => void;
  onOpenCloudCheckpointLink: (checkpointId: string) => void;
  isGoogleDriveConnected: boolean;
  isGithubConnected: boolean;
  onRefreshCloud: () => void;
  addNotification: (message: string, type: NotificationMessage['type'], options?: { icon?: React.ReactNode; force?: boolean }) => void;
}> = ({ cloudCheckpoints, onRestoreCloud, onDeleteCloud, onUploadCheckpoint, onUploadCheckpointForAll, games, onOpenFolderCheckpointLocation, onOpenCloudCheckpointLink, isGoogleDriveConnected, isGithubConnected, onRefreshCloud, addNotification }) => {
  const [sortBy, setSortBy] = useState<'time' | 'gameName' | 'provider' | 'size'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const sortedCloudCheckpoints = [...cloudCheckpoints].sort((a, b) => {
    if (sortBy === 'time') {
      const dateA = new Date(a.time).getTime();
      const dateB = new Date(b.time).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    } else if (sortBy === 'gameName') {
      const nameA = a.gameName.toLowerCase();
      const nameB = b.gameName.toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    } else if (sortBy === 'provider') {
      const providerA = a.provider?.toLowerCase() || '';
      const providerB = b.provider?.toLowerCase() || '';
      if (providerA < providerB) return sortOrder === 'asc' ? -1 : 1;
      if (providerA > providerB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    } else if (sortBy === 'size') {
      const sizeA = a.size || '0 MB';
      const sizeB = b.size || '0 MB';

      const parseSize = (sizeStr: string) => {
        const [value, unit] = sizeStr.split(' ');
        const numValue = parseFloat(value);
        if (unit === 'GB') return numValue * 1024;
        return numValue;
      };

      const numSizeA = parseSize(sizeA);
      const numSizeB = parseSize(sizeB);

      return sortOrder === 'desc' ? numSizeB - numSizeA : numSizeA - numSizeB;
    }
    return 0;
  });

  // Filter checkpoints based on search term
  const filteredCloudCheckpoints = sortedCloudCheckpoints.filter(cp =>
    cp.gameName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cp.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (cp.size?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );


  // Helper to get provider icon
  const getProviderIcon = (provider?: Checkpoint['provider']) => {
    switch (provider) {
      case 'GitHub':
        return <Github className="w-4 h-4 mr-1 inline-block text-foreground" />;
      case 'Google Drive':
        return <HardDrive className="w-4 h-4 mr-1 inline-block text-foreground" />;
      default:
        return <Cloud className="w-4 h-4 mr-1 inline-block text-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-150px)] overflow-y-auto pr-4">
      <h2 className="text-xl font-bold text-foreground tracking-tight">Cloud Synchronization</h2>
      <p className="text-muted-foreground">
        Manage and restore your game save checkpoints stored in the cloud.
      </p>
      {/* Search, Sort, and Create Buttons */}
      <div className="flex justify-between items-center">
        {/* Sorting Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search checkpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground pl-8"
            />
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'gameName' | 'provider' | 'size')}
            className="p-1 text-sm border border-dashed rounded-md bg-transparent text-foreground border-white/20"
          >
            <option value="time">Time</option>
            <option value="gameName">Game Name</option>
            <option value="provider">Provider</option>
            <option value="size">Size</option>
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  aria-label="Toggle sort order"
                  className="hover:bg-white/10"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Sort Order</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onRefreshCloud} className="hover:bg-white/10 text-muted-foreground hover:text-foreground">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh from Cloud
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowUploadModal(true)}>
            <UploadCloud className="mr-2 h-4 w-4" /> Create Cloud Checkpoint
          </Button>
          <Button variant="outline" size="sm" onClick={onUploadCheckpointForAll}>
            <Sparkles className="mr-2 h-4 w-4" /> Checkpoint for All Games (Cloud)
          </Button>
        </div>
      </div>
      {filteredCloudCheckpoints.length === 0 ? (
        <p className="text-center text-muted-foreground">No cloud checkpoints found matching your criteria.</p>
      ) : (
        filteredCloudCheckpoints.map((checkpoint) => (
          <Card key={checkpoint.id} className={cn("border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground")}>
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {getProviderIcon(checkpoint.provider)}
                    {checkpoint.type === 'folder' ? <Folder className="inline-block mr-1 w-4 h-4" /> : null}
                    {checkpoint.gameName} ({checkpoint.provider})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    <Clock className="inline-block mr-1 w-3 h-3" /> {formatTime(checkpoint.time)}
                    {checkpoint.size && <span className="ml-4"><Database className="inline-block mr-1 w-3 h-3" /> Size: {checkpoint.size}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{checkpoint.description}</p>
                  <div className="mt-4 flex gap-2">
                    {checkpoint.type !== 'folder' && (
                      <Button variant="outline" size="sm" onClick={() => onRestoreCloud(checkpoint.id)}>
                        <DownloadCloud className="mr-2 h-4 w-4" /> Restore
                      </Button>
                    )}
                    {checkpoint.type === 'folder' && checkpoint.provider !== 'Local' && checkpoint.cloudLink && (
                      <Button variant="ghost" size="sm" onClick={() => onOpenCloudCheckpointLink(checkpoint.id)}>
                        <ExternalLink className="mr-2 h-4 w-4" /> Open Cloud Link
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => onDeleteCloud(checkpoint.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                    {checkpoint.type === 'folder' && checkpoint.provider === 'Local' ? (
                      <Button variant="ghost" size="sm" onClick={() => onOpenFolderCheckpointLocation(checkpoint.id)}>
                        <FolderOpen className="mr-2 h-4 w-4" /> Open Local Folder
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        ))
      )}


      {/* Cloud Checkpoint Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <CloudCheckpointModal
            games={games.filter(g => g.enabled)}
            onUploadCheckpoint={(gameId, provider, description) => {
              onUploadCheckpoint(gameId, provider, description);
              setShowUploadModal(false);
            }}
            onClose={() => setShowUploadModal(false)}
            isGoogleDriveConnected={isGoogleDriveConnected}
            isGithubConnected={isGithubConnected}
            addNotification={addNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


const CloudSyncTab: React.FC<{
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  games: Game[];
  addLogEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  addNotification: (message: string, type: NotificationMessage['type'], options?: { icon?: React.ReactNode; force?: boolean }) => void;
  isGoogleDriveConnected: boolean;
  setIsGoogleDriveConnected: React.Dispatch<React.SetStateAction<boolean>>;
  googleDriveLastSync: string;
  setGoogleDriveLastSync: React.Dispatch<React.SetStateAction<string>>;
  isGithubConnected: boolean;
  setIsGithubConnected: React.Dispatch<React.SetStateAction<boolean>>;
  githubLastSync: string;
  setGithubLastSync: React.Dispatch<React.SetStateAction<string>>;
  currentUser: AuthUser | null; // This line is important
}> = ({
  addLogEntry, addNotification, isGoogleDriveConnected, setIsGoogleDriveConnected, googleDriveLastSync, setGoogleDriveLastSync, isGithubConnected, setIsGithubConnected, githubLastSync, setGithubLastSync, currentUser
}) => {
    const [showGithubConfig, setShowGithubConfig] = useState(false);
    const [githubPatInput, setGithubPatInput] = useState('');
    const [githubRepoOwnerInput, setGithubRepoOwnerInput] = useState('');
    const [githubRepoNameInput, setGithubRepoNameInput] = useState('');
    const [isLoadingGithubConfig, setIsLoadingGithubConfig] = useState(false);

    useEffect(() => {
      const loadGithubConfig = async () => {
        setIsLoadingGithubConfig(true);
        try {
          if (window.electronAPI && typeof window.electronAPI.getGithubConfig === 'function') {
            const config = await window.electronAPI.getGithubConfig();
            if (config.success && config.pat && config.repoOwner && config.repoName) {
              setGithubPatInput(config.pat);
              setGithubRepoOwnerInput(config.repoOwner);
              setGithubRepoNameInput(config.repoName);
              setIsGithubConnected(true);
            } else {
              setIsGithubConnected(false);
            }
          } else {
            console.error("window.electronAPI.getGithubConfig is not available.");
            addNotification("Error: GitHub API bridge not found.", "error", { force: true });
            setIsGithubConnected(false);
          }
        } catch (e) {
          console.error("Error loading GitHub config:", e);
          addNotification("Could not load GitHub configuration.", "error", { force: true });
          setIsGithubConnected(false);
        }
        setIsLoadingGithubConfig(false);
      };
      loadGithubConfig();
    }, [setIsGithubConnected, addNotification]);

    const handleConnectGoogleDrive = () => { addNotification("Please log in via the Account tab to connect Google Drive.", "info"); };
    const handleDisconnectGoogleDrive = () => { addNotification("Please log out via the Account tab to disconnect Google Drive.", "info"); };
    const handleSaveGithubConfig = async () => { if (!githubPatInput.trim() || !githubRepoOwnerInput.trim() || !githubRepoNameInput.trim()) { addNotification("All GitHub fields are required.", 'error', { force: true }); return; } setIsLoadingGithubConfig(true); addNotification("Saving GitHub configuration...", "info", { icon: <Loader2 className="h-4 w-4 animate-spin" /> }); try { const result = await window.electronAPI.setGithubConfig({ pat: githubPatInput.trim(), repoOwner: githubRepoOwnerInput.trim(), repoName: githubRepoNameInput.trim(), }); if (result.success) { setIsGithubConnected(true); setGithubLastSync('Configured'); addLogEntry({ type: 'cloud_connect', message: `GitHub configured for repo: ${githubRepoOwnerInput.trim()}/${githubRepoNameInput.trim()}`, status: 'success' }); addNotification(`GitHub configured for ${githubRepoOwnerInput.trim()}/${githubRepoNameInput.trim()}`, 'success'); setShowGithubConfig(false); } else { throw new Error(result.error || "Failed to save GitHub config."); } } catch (error) { const msg = error instanceof Error ? error.message : "Unknown error."; addLogEntry({ type: 'error', message: `GitHub configuration failed: ${msg}`, status: 'fail' }); addNotification(`GitHub configuration failed: ${msg}`, 'error', { force: true }); setIsGithubConnected(false); } setIsLoadingGithubConfig(false); };
    const handleDisconnectGithub = async () => { setIsLoadingGithubConfig(true); addNotification("Disconnecting GitHub...", "info"); try { const result = await window.electronAPI.clearGithubConfig(); if (result.success) { setIsGithubConnected(false); setGithubLastSync('Never'); setGithubPatInput(''); setGithubRepoOwnerInput(''); setGithubRepoNameInput(''); addLogEntry({ type: 'cloud_disconnect', message: "GitHub disconnected.", status: 'success' }); addNotification("GitHub disconnected.", 'info'); setShowGithubConfig(true); } else { throw new Error(result.error || "Failed to clear GitHub config."); } } catch (error) { const msg = error instanceof Error ? error.message : "Unknown error."; addNotification(`Failed to disconnect GitHub: ${msg}`, 'error', { force: true }); } setIsLoadingGithubConfig(false); };

    return (
      <div className="space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto pr-4">
        <h2 className="text-2xl font-bold text-foreground">Cloud Sync</h2>
        <p className="text-muted-foreground">
          Connect and manage  cloud storage providers for synchronization.
        </p>
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Cloud Providers</h3>
          <Card className="border border-dashed p-4 space-y-4 border-white/10 bg-black/20 backdrop-blur-md text-foreground">
            <CardContent className="space-y-4 p-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-foreground" />
                  <h4 className="text-md font-medium text-foreground">Google Drive</h4>
                  <div className="flex items-center gap-1">
                    {currentUser ? (<CheckCircle className="text-green-500 w-4 h-4" />) : (<XCircle className="text-red-500 w-4 h-4" />)}
                    <span className={cn("text-xs", currentUser ? "text-green-500" : "text-red-500")}>
                      {currentUser ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleConnectGoogleDrive} disabled={currentUser != null}>
                    Configure
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDisconnectGoogleDrive} disabled={currentUser == null}>
                    Disconnect
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="inline-block mr-1 w-3 h-3" /> Last Sync: {formatTime(googleDriveLastSync)}
              </p>
              <p className="text-sm text-muted-foreground">
                Google Drive connection is managed by logging in on the Account tab.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-dashed p-4 space-y-4 border-white/10 bg-black/20 backdrop-blur-md text-foreground">
            <CardContent className="space-y-4 p-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-foreground" />
                  <h4 className="text-md font-medium text-foreground">GitHub</h4>
                  <div className="flex items-center gap-1">
                    {isGithubConnected ? (<CheckCircle className="text-green-500 w-4 h-4" />) : (<XCircle className="text-red-500 w-4 h-4" />)}
                    <span className={cn("text-xs", isGithubConnected ? "text-green-500" : "text-red-500")}>
                      {isGithubConnected ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowGithubConfig(!showGithubConfig)} disabled={isLoadingGithubConfig}>
                    {isGithubConnected ? (showGithubConfig ? "Hide Config" : "Reconfigure") : "Configure"}
                  </Button>
                  {isGithubConnected && (
                    <Button variant="destructive" size="sm" onClick={handleDisconnectGithub} disabled={isLoadingGithubConfig}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="inline-block mr-1 w-3 h-3" /> Last Sync: {formatTime(githubLastSync)}
              </p>
              <AnimatePresence>
                {showGithubConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-4 pt-2"
                  >
                    <div>
                      <Label htmlFor="github-pat-input" className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">Personal Access Token (PAT)</Label>
                      <Input
                        id="github-pat-input"
                        type="password"
                        placeholder="Enter GitHub PAT (with 'repo' scope)"
                        value={githubPatInput}
                        onChange={(e) => setGithubPatInput(e.target.value)}
                        className="bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                        disabled={isLoadingGithubConfig}
                      />
                    </div>
                    <div>
                      <Label htmlFor="github-repo-owner-input" className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">Repository Owner</Label>
                      <Input
                        id="github-repo-owner-input"
                        placeholder="e.g., YourGitHubUsername"
                        value={githubRepoOwnerInput}
                        onChange={(e) => setGithubRepoOwnerInput(e.target.value)}
                        className="bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                        disabled={isLoadingGithubConfig}
                      />
                    </div>
                    <div>
                      <Label htmlFor="github-repo-name-input" className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">Repository Name</Label>
                      <Input
                        id="github-repo-name-input"
                        placeholder="e.g., MyGameSaves"
                        value={githubRepoNameInput}
                        onChange={(e) => setGithubRepoNameInput(e.target.value)}
                        className="bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                        disabled={isLoadingGithubConfig}
                      />
                    </div>
                    <Button
                      onClick={handleSaveGithubConfig}
                      disabled={isLoadingGithubConfig || !githubPatInput.trim() || !githubRepoOwnerInput.trim() || !githubRepoNameInput.trim()}
                    >
                      {isLoadingGithubConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save GitHub Configuration
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };




const SettingsTab: React.FC<{
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  theme: ThemeSettings;
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  isGoogleDriveConnected: boolean;
  isGithubConnected: boolean;
  addNotification: (message: string, type: NotificationMessage['type'], options?: { icon?: React.ReactNode; force?: boolean }) => void;
  onResetSettings: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  // Account Props
  currentUser: AppUser | null;
  localCheckpoints: Checkpoint[];
  cloudCheckpoints: Checkpoint[];
  onLogin: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  onBrowse: (type: 'file' | 'folder' | 'any', setter: (path: string) => void) => void | Promise<void>;
  onUpdateUser: (updatedUser: Partial<AppUser>) => void | Promise<void>;
  onSwitchTab: (tab: string) => void;
}> = ({
  appSettings, setAppSettings, theme, setTheme,
  isGoogleDriveConnected, isGithubConnected,
  addNotification, onResetSettings, onExportData, onImportData,
  currentUser, localCheckpoints, cloudCheckpoints, onLogin, onLogout, onBrowse, onUpdateUser,
  onSwitchTab
}) => {
    const importInputRef = useRef<HTMLInputElement>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [username, setUsername] = useState(currentUser?.username || '');

    useEffect(() => {
      setUsername(currentUser?.username || '');
    }, [currentUser]);

    const handleSaveProfile = async () => {
      if (!currentUser) return;
      await onUpdateUser({ username: username.trim() });
      addNotification("Profile updated successfully!", "success");
    };

    const totalLocalSizeMB = useMemo(() => localCheckpoints.reduce((acc, cp) => acc + parseSizeToMB(cp.size), 0), [localCheckpoints]);
    const totalGoogleDriveSizeMB = useMemo(() =>
      cloudCheckpoints
        .filter(cp => cp.provider === 'Google Drive')
        .reduce((acc, cp) => acc + parseSizeToMB(cp.size), 0),
      [cloudCheckpoints]
    );
    const totalGithubSizeMB = useMemo(() =>
      cloudCheckpoints
        .filter(cp => cp.provider === 'GitHub')
        .reduce((acc, cp) => acc + parseSizeToMB(cp.size), 0),
      [cloudCheckpoints]
    );

    const formatTotalSize = (mb: number): string => {
      if (mb === 0) return '0 MB';
      if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
      return `${mb.toFixed(1)} MB`;
    };

    const handleLoginAttempt = async () => {
      setIsLoggingIn(true);
      addNotification("Opening Google Sign-In...", 'info', { icon: <Loader2 className="h-4 w-4 animate-spin" /> });
      await onLogin();
      setIsLoggingIn(false);
    };

    const handleThemeChange = (value: ThemeSettings['mode']) => { setTheme(prev => ({ ...prev, mode: value })); };
    const handleChoosePath = async (pathType: 'defaultLocalSyncPath' | 'localCheckpointsBasePath') => { try { const selectedPath = await window.electronAPI.selectPath({ mode: 'folder' }); if (selectedPath) { setAppSettings(prev => ({ ...prev, [pathType]: selectedPath })); addNotification("Path updated successfully.", 'success'); } } catch (error) { console.error("Failed to select directory:", error); addNotification("Could not select the directory.", 'error', { force: true }); } };
    const availableSyncProviders = [{ value: 'ask_every_time', label: 'Ask Every Time' }, { value: 'Local', label: 'Local Storage' }, { value: 'GitHub', label: 'GitHub', connected: isGithubConnected }, { value: 'Google Drive', label: 'Google Drive', connected: isGoogleDriveConnected },];
    const handleFileSelectedForImport = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { onImportData(file); } if (event.target) { event.target.value = ''; } };

    return (
      <div className="space-y-6 max-h-[calc(100vh-150px)] overflow-y-auto pr-4">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Settings</h2>

        {/* --- Account Information (Moved from AccountTab) --- */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-foreground">Account Information</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">Manage your account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {currentUser?.customAvatarPath ? (
                  <img
                    src={`safe-file:///${currentUser.customAvatarPath.replace(/\\/g, '/')}`}
                    alt="Custom Avatar"
                    className="w-16 h-16 rounded-full object-cover border border-dashed border-white/10"
                    onError={(e) => { e.currentTarget.src = `https://placehold.co/64x64/1a1a1a/eeeeee?text=${(currentUser.username || currentUser.name || 'G').charAt(0).toUpperCase()}`; }}
                  />
                ) : currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border border-dashed border-white/10"
                    onError={(e) => { e.currentTarget.src = `https://placehold.co/64x64/1a1a1a/eeeeee?text=${(currentUser.username || currentUser.name || 'G').charAt(0).toUpperCase()}`; }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border border-dashed border-white/10">
                    <UserIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-foreground tracking-tight">{currentUser?.username || currentUser?.name || 'Not Logged In'}</p>
                  {currentUser?.email && <p className="text-xs text-muted-foreground/60">{currentUser.email}</p>}
                </div>
              </div>

              {currentUser && (
                <div className="space-y-6 pt-4">
                  <div className="border-t border-dashed border-white/10 pt-6">
                    <Label htmlFor="username" className="text-sm font-bold text-white mb-4 block">Username (Display Name)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="flex-grow bg-transparent text-white font-medium border-white/10 rounded-lg h-10 text-sm focus:bg-white/5 transition-colors"
                        placeholder="e.g. GamerTag123"
                      />
                      <Button size="sm" onClick={handleSaveProfile} className="bg-primary hover:bg-primary/90 h-10 px-6 font-semibold text-sm">
                        Update
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-white/10 pt-6">
                    <Button
                      variant="ghost"
                      onClick={onLogout}
                      className="w-full bg-red-500/10 border border-dashed border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-sm h-12 transition-all group rounded-xl"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!currentUser ? (
            <Card className="border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground">
              <CardHeader><CardTitle className="text-center text-foreground">Sign In Required</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">Please sign in with your Google Account to sync your data across devices.</p>
                <Button variant="outline" onClick={handleLoginAttempt} disabled={isLoggingIn} className="w-full">
                  {isLoggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</> : 'Sign In with Google'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-foreground">Storage Usage</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">Overview of your consumption.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <Label htmlFor="local-storage" className="text-sm font-bold text-white flex items-center"><Save className="w-3.5 h-3.5 mr-2" />Total Local Size</Label>
                    <span className="text-sm font-bold text-foreground tracking-tight">{formatTotalSize(totalLocalSizeMB)}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-white/10 pt-4"></div>
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <Label htmlFor="gdrive-storage" className="text-sm font-bold text-white flex items-center"><HardDrive className="w-3.5 h-3.5 mr-2" />Google Drive Size</Label>
                    <span className="text-sm font-bold text-foreground tracking-tight">{formatTotalSize(totalGoogleDriveSizeMB)}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-white/10 pt-4"></div>
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <Label htmlFor="github-storage" className="text-sm font-bold text-white flex items-center"><Github className="w-3.5 h-3.5 mr-2" />GitHub Releases Size</Label>
                    <span className="text-sm font-bold text-foreground tracking-tight">{formatTotalSize(totalGithubSizeMB)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* --- App Settings --- */}
        <Card className="border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground">
          <CardHeader className="pb-4">
            <CardTitle className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">General Settings</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/60">Core application behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div>
              <Label htmlFor="auto-sync-interval" className="block mb-2 text-sm font-medium text-foreground">Auto Sync Interval</Label>
              <Input
                id="auto-sync-interval"
                type="number"
                min="0"
                value={appSettings.autoSyncInterval}
                onChange={(e) => setAppSettings(prev => ({ ...prev, autoSyncInterval: parseInt(e.target.value) || 0 }))}
                className="w-full bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <Label htmlFor="auto-checkpoint-frequency" className="block mb-2 text-sm font-medium text-foreground">Auto Local Checkpoint Frequency</Label>
              <Select value={appSettings.autoCheckpointFrequency} onValueChange={(value) => setAppSettings(prev => ({ ...prev, autoCheckpointFrequency: value as AppSettings['autoCheckpointFrequency'] }))}>
                <SelectTrigger id="auto-checkpoint-frequency" className="w-[180px] bg-input/60 text-foreground border-dashed border-white/20">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="default-sync-provider" className="block mb-2 text-sm font-medium text-foreground">Default Sync Destination</Label>
              <Select
                value={appSettings.defaultSyncProvider}
                onValueChange={(value) => setAppSettings(prev => ({ ...prev, defaultSyncProvider: value as AppSettings['defaultSyncProvider'] }))}
              >
                <SelectTrigger id="default-sync-provider" className="w-[220px] bg-input/60 text-foreground border-dashed border-white/20">
                  <SelectValue placeholder="Select default sync destination" />
                </SelectTrigger>
                <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                  {availableSyncProviders.map(provider => (
                    <SelectItem
                      key={provider.value}
                      value={provider.value}
                      disabled={provider.value !== 'ask_every_time' && provider.value !== 'Local' && !provider.connected}
                    >
                      <div className="flex items-center">
                        {provider.label}
                        {provider.value !== 'ask_every_time' && provider.value !== 'Local' && !provider.connected && (
                          <span className="ml-2 text-xs text-red-500">(Not Configured)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="default-local-sync-path" className="block mb-2 text-sm font-medium text-foreground">Default Local Sync Path</Label>
              <div className="flex gap-2">
                <Input
                  id="default-local-sync-path"
                  value={appSettings.defaultLocalSyncPath}
                  onChange={(e) => setAppSettings(prev => ({ ...prev, defaultLocalSyncPath: e.target.value }))}
                  className="flex-grow bg-input/60 text-foreground border-dashed border-white/20"
                />
                <Button variant="outline" size="sm" onClick={() => handleChoosePath('defaultLocalSyncPath')}>
                  Choose Path
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="local-checkpoints-base-path" className="block mb-2 text-sm font-medium text-foreground">Local Checkpoints Base Path</Label>
              <div className="flex gap-2">
                <Input
                  id="local-checkpoints-base-path"
                  value={appSettings.localCheckpointsBasePath}
                  onChange={(e) => setAppSettings(prev => ({ ...prev, localCheckpointsBasePath: e.target.value }))}
                  className="flex-grow bg-input/60 text-foreground border-dashed border-white/20"
                />
                <Button variant="outline" size="sm" onClick={() => handleChoosePath('localCheckpointsBasePath')}>
                  Choose Path
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Notifications</CardTitle>
            <CardDescription>Configure application pop-up notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="master-notifications" className="text-sm font-medium text-foreground">Enable All Notifications</Label>
              <Switch
                id="master-notifications"
                checked={appSettings.masterNotificationsEnabled}
                onCheckedChange={(checked) => setAppSettings(prev => ({ ...prev, masterNotificationsEnabled: checked }))}
              />
            </div>
            <hr className="my-2 border-white/10 border-dashed" />
            <div className="flex items-center justify-between">
              <Label htmlFor="success-notifications" className={cn("text-sm font-medium text-foreground transition-opacity", !appSettings.masterNotificationsEnabled && "opacity-50")}>Show Success Notifications</Label>
              <Switch
                id="success-notifications"
                checked={appSettings.showSuccessNotifications}
                onCheckedChange={(checked) => setAppSettings(prev => ({ ...prev, showSuccessNotifications: checked }))}
                disabled={!appSettings.masterNotificationsEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="error-notifications" className={cn("text-sm font-medium text-foreground transition-opacity", !appSettings.masterNotificationsEnabled && "opacity-50")}>Show Error Notifications</Label>
              <Switch
                id="error-notifications"
                checked={appSettings.showErrorNotifications}
                onCheckedChange={(checked) => setAppSettings(prev => ({ ...prev, showErrorNotifications: checked }))}
                disabled={!appSettings.masterNotificationsEnabled}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground">
          <CardHeader className="pb-4">
            <CardTitle className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Appearance</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/60">Customize the look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div>
              <Label htmlFor="theme-mode" className="block mb-2 text-sm font-medium text-foreground">Application Theme</Label>
              <Select value={theme.mode} onValueChange={handleThemeChange}>
                <SelectTrigger id="theme-mode" className="w-[180px] bg-input/60 text-foreground border-dashed border-white/20">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* --- Maintenance & Logs --- */}
        <Card className="border border-dashed border-white/10 bg-black/20 backdrop-blur-md text-foreground">
          <CardHeader className="pb-4">
            <CardTitle className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Maintenance & Logs</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/60">Troubleshoot and monitor application activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => onSwitchTab('activity-log')}
                className="w-full justify-start border-dashed border-white/10 hover:bg-white/5 h-11"
              >
                <Activity className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold">View Activity Log</span>
                  <span className="text-[10px] text-muted-foreground font-medium">History of checks and syncs</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.electronAPI.openLogsFolder()}
                className="w-full justify-start border-dashed border-white/10 hover:bg-white/5 h-11"
              >
                <FileText className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold">Open Technical Logs</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Folder containing raw run logs</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-dashed border-destructive/50 bg-destructive/10 backdrop-blur-md text-foreground">
          <CardHeader>
            <CardTitle className="text-destructive">Data Management</CardTitle>
            <CardDescription>Backup, restore, or reset your application data. These actions can be irreversible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-foreground">Backup & Restore</h3>
              <p className="text-xs text-muted-foreground mb-2">Save your currently loaded account data to a file, or restore from a backup.</p>
              <div className="flex gap-2">
                <Button onClick={onExportData}>
                  <FileUp className="mr-2 h-4 w-4" /> Export Data
                </Button>
                <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                  <FileDown className="mr-2 h-4 w-4" /> Import Data
                </Button>
                <input
                  type="file"
                  ref={importInputRef}
                  onChange={handleFileSelectedForImport}
                  accept=".json"
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            <div className="border-t border-dashed border-border my-4"></div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Reset Application Settings</h3>
              <p className="text-xs text-muted-foreground mb-2">Reset all general, notification, and appearance settings to their default values for your account.</p>
              <Button variant="destructive" onClick={onResetSettings}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };


// Component for the Activity Log tab
const ActivityLogTab: React.FC<{ logEntries: ActivityLogEntry[]; onDeleteLogEntry: (id: string) => void; onClearLog: () => void; }> = ({ logEntries, onDeleteLogEntry, onClearLog }) => {
  const sortedLogEntries = [...logEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getStatusIcon = (entry: ActivityLogEntry) => {
    if (entry.type === 'checkpoint_delete') {
      return <Trash2 className="text-red-500 w-4 h-4 mr-1 inline-block" />;
    }
    switch (entry.status) {
      case 'success':
        return <CheckCircle className="text-green-500 w-4 h-4 mr-1 inline-block" />;
      case 'fail':
        return <XCircle className="text-red-500 w-4 h-4 mr-1 inline-block" />;
      case 'info':
      default:
        return <Activity className="text-muted-foreground w-4 h-4 mr-1 inline-block" />;
    }
  };

  const getLogTextColorClass = (entry: ActivityLogEntry) => {
    if (entry.type === 'checkpoint_delete' || (entry.type === 'info' && entry.message.includes('Deleted game:'))) {
      return 'text-red-400';
    }
    if (entry.type === 'checkpoint_create' || (entry.type === 'info' && entry.message.includes('Added new game:'))) {
      return 'text-green-400';
    }
    return 'text-foreground';
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto pr-4">
      <h2 className="text-2xl font-bold text-foreground">Activity Log</h2>
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          View a history of application activities, including syncs and checkpoints.
        </p>
        <Button variant="outline" size="sm" onClick={onClearLog}>
          <Trash2 className="mr-2 h-4 w-4" /> Clear Log
        </Button>
      </div>
      {sortedLogEntries.length === 0 ? (
        <p className="text-center text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="space-y-3">
          {sortedLogEntries.map(entry => (
            <div
              key={entry.id}
              className={cn(
                "text-sm border border-dashed p-3 rounded-md flex justify-between items-center transition-colors",
                "bg-black/20 backdrop-blur-md hover:bg-white/5",
                entry.type === 'cloud_checkpoint_all' && 'bg-yellow-900/30 border-yellow-600 text-yellow-100',
                entry.type === 'checkpoint_delete' ? 'bg-red-900/20 border-red-600' : 'border-white/10'
              )}
            >
              <div className={getLogTextColorClass(entry)}>
                <p className="text-muted-foreground text-xs mb-1">
                  <Clock className="inline-block mr-1 w-3 h-3" /> {formatTime(entry.timestamp)}
                  {entry.gameName && <span className="ml-2">| Game: {entry.gameName}</span>}
                </p>
                <p>
                  {getStatusIcon(entry)}
                  {entry.message}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onDeleteLogEntry(entry.id)} className="flex-shrink-0">
                <XCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};




// --- Modal Components ---

const GameSearchResultsModal: React.FC<{
  results: Game[];
  onSelectGame: (game: Game) => void;
  onClose: () => void;
}> = ({ results, onSelectGame, onClose }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Game Search Results</DialogTitle>
          <DialogDescription>
            Select a game from the search results to add it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-96 overflow-y-auto pr-2">
          {results.length > 0 ? (
            results.map(game => (
              <div key={game.id} className="flex items-start justify-between p-2 rounded-md hover:bg-white/10 border border-dashed border-white/10">
                <div className="flex items-start gap-3">
                  <img
                    src={game.iconUrl || game.searchPreviewUrl || `https://placehold.co/60x60/1a1a1a/eeeeee?text=${game.name.charAt(0)}`}
                    alt={`${game.name} icon`}
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://placehold.co/60x60/1a1a1a/eeeeee?text=N/A`;
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{game.name}</span>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{game.summary || "No summary available."}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="flex-shrink-0 ml-4" onClick={() => onSelectGame(game)}>Select</Button>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No results found.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddGameOptionsModal: React.FC<{
  onManualClick: () => void;
  onClose: () => void;
}> = ({ onManualClick, onClose }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Game</DialogTitle>
          <DialogDescription>
            How would you like to add a new game?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button variant="outline" onClick={onManualClick}>
            <Plus className="mr-2 h-4 w-4" /> Add Manually
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const GameSearchInputModal: React.FC<{
  onSearch: (query: string) => void;
  onClose: () => void;
}> = ({ onSearch, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    await onSearch(searchQuery.trim());
    setIsSearching(false);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Search Game Info</DialogTitle>
          <DialogDescription>
            Enter the name of the game you want to search for.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="game-search-query" className="text-foreground">Game Name</Label>
            <Input
              id="game-search-query"
              placeholder="e.g., Elden Ring"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
              disabled={isSearching}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSearching}>Cancel</Button>
          <Button onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const ConfigureGamePathsModal: React.FC<{
  game: Game;
  onSave: (gameData: Omit<Game, 'id' | 'lastSynced' | 'enabled' | 'icon'>) => void;
  onClose: () => void;
  // This prop is required for the buttons to work
  onBrowse: (type: 'file' | 'folder' | 'any', setter: React.Dispatch<React.SetStateAction<string>>) => void;
}> = ({ game, onSave, onClose, onBrowse }) => {
  const [name, setName] = useState(game.name);
  const [path, setPath] = useState('');
  const [launchPath, setLaunchPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !path.trim()) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave({
      name: name.trim(),
      path: path.trim(),
      launchPath: launchPath.trim() || undefined,
      bannerUrl: game.bannerUrl,
      coverArtUrl: game.coverArtUrl,
      iconUrl: game.iconUrl,
      summary: game.summary,
      customBannerUrl: game.customBannerUrl,
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Configure Paths for {game.name}</DialogTitle>
          <DialogDescription>
            Use the browse buttons to select the save and launch paths.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="config-name" className="text-foreground">Game Name</Label>
            <Input
              id="config-name"
              value={name}
              className="w-full bg-input/60 text-foreground border-dashed border-white/20"
              disabled={true}
            />
          </div>
          <div>
            <Label htmlFor="config-save-path" className="block mb-1 text-foreground">Save File Path</Label>
            <div className="flex gap-2">
              <Input
                id="config-save-path"
                placeholder="Click Browse to select a folder..."
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-grow bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                disabled={isSaving}
              />
              {/* FIXED: This button now calls the onBrowse function */}
              <Button variant="outline" size="sm" onClick={() => onBrowse('any', setPath)} disabled={isSaving}>
                Browse
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="config-launch-path" className="block mb-1 text-foreground">Launch Path (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="config-launch-path"
                placeholder="Click Browse to select a file..."
                value={launchPath}
                onChange={(e) => setLaunchPath(e.target.value)}
                className="flex-grow bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                disabled={isSaving}
              />
              {/* FIXED: This button now calls the onBrowse function */}
              <Button variant="outline" size="sm" onClick={() => onBrowse('file', setLaunchPath)} disabled={isSaving}>
                Browse
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          {/* This button is now enabled once a save path is selected */}
          <Button onClick={handleSave} disabled={!path.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Game"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// NEW: Known games with suggested paths
const knownGamePaths: { [key: string]: { save: string; launch?: string } } = {
  "Cyberpunk 2077": { save: "%USERPROFILE%\\Saved Games\\CD Projekt Red\\Cyberpunk 2077", launch: "steam://rungameid/1091500" },
  "The Witcher 3: Wild Hunt": { save: "%USERPROFILE%\\Documents\\The Witcher 3\\gamesaves", launch: "steam://rungameid/292030" },
  "Baldur's Gate 3": { save: "%USERPROFILE%\\AppData\\Local\\Larian Studios\\Baldur's Gate 3\\PlayerProfiles\\Public\\Savegames\\Story", launch: "steam://rungameid/1086940" },
  "Stardew Valley": { save: "%APPDATA%\\StardewValley\\Saves", launch: "steam://rungameid/413150" },
  "Elden Ring": { save: "%APPDATA%\\EldenRing", launch: "steam://rungameid/1245620" }
};


const AddManualGameModal: React.FC<{
  onAddGame: (gameData: Omit<Game, 'id' | 'lastSynced' | 'enabled' | 'bannerUrl' | 'coverArtUrl' | 'summary' | 'customBannerUrl' | 'icon'>) => void;
  onClose: () => void;
  // NEW: Add an onBrowse prop to handle path selection
  onBrowse: (type: 'file' | 'folder' | 'any', setter: React.Dispatch<React.SetStateAction<string>>) => void;
}> = ({ onAddGame, onClose, onBrowse }) => {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [launchPath, setLaunchPath] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [suggestion, setSuggestion] = useState<{ save: string; launch?: string } | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSuggestion(knownGamePaths[newName] || null);
  };

  const applySuggestion = () => {
    if (suggestion) {
      setPath(suggestion.save);
      setLaunchPath(suggestion.launch || '');
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !path.trim()) return;
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onAddGame({
      name: name.trim(),
      path: path.trim(),
      launchPath: launchPath.trim() || undefined,
    });
    setName('');
    setPath('');
    setLaunchPath('');
    setIsAdding(false);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Game Manually</DialogTitle>
          <DialogDescription>
            Enter the details for your game. Path suggestions may appear for known games.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="manual-name" className="text-foreground">Game Name</Label>
            <Input
              id="manual-name"
              placeholder="e.g. Elden Ring"
              value={name}
              onChange={handleNameChange}
              className="w-full bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
              disabled={isAdding}
              list="known-games"
            />
            <datalist id="known-games">
              {Object.keys(knownGamePaths).map(gameName => <option key={gameName} value={gameName} />)}
            </datalist>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="manual-save-path" className="text-foreground">Save File Path</Label>
              {suggestion && (
                <Button variant="link" size="sm" className="p-0 h-auto text-primary" onClick={applySuggestion}>
                  <Lightbulb className="mr-1 h-3 w-3" /> Apply Suggestion
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="manual-save-path"
                placeholder="Enter or paste game save path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-grow bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                disabled={isAdding}
              />
              <Button variant="outline" size="sm" onClick={() => onBrowse('any', setPath)} disabled={isAdding}>Browse</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Use %APPDATA% or %USERPROFILE% for common directories.</p>
          </div>
          <div>
            <Label htmlFor="manual-launch-path" className="block mb-1 text-foreground">Launch Path (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="manual-launch-path"
                placeholder="Enter launch command or executable path"
                value={launchPath}
                onChange={(e) => setLaunchPath(e.target.value)}
                className="flex-grow bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                disabled={isAdding}
              />
              {/* FIXED: This button now works */}
              <Button variant="outline" size="sm" onClick={() => onBrowse('file', setLaunchPath)} disabled={isAdding}>Browse</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Use steam://rungameid/ for Steam games.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name.trim() || !path.trim() || isAdding}>
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Game"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const ChangeLocationModal: React.FC<{
  game: Game;
  onSave: (gameId: string, newLocation: string) => void;
  onCancel: () => void;
  // NEW: Add the onBrowse prop
  onBrowse: (type: 'file' | 'folder' | 'any', setter: React.Dispatch<React.SetStateAction<string>>) => void;
}> = ({ game, onSave, onCancel, onBrowse }) => {
  const [newLocation, setNewLocation] = useState(game.path);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newLocation.trim()) return;
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave(game.id, newLocation.trim());
    setIsSaving(false);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Change Location for {game.name}</DialogTitle>
          <DialogDescription>
            Enter the new save file location for this game.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-location" className="text-right block mb-1 text-foreground">
              New Save File Path
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="new-location"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="flex-grow bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                placeholder="e.g., C:\Users\...\MyGame\Saves"
                disabled={isSaving}
              />
              {/* FIXED: This button now opens a FOLDER dialog */}
              <Button variant="outline" size="sm" onClick={() => onBrowse('folder', setNewLocation)} disabled={isSaving}>
                Browse
              </Button>
            </div>
            <p className="col-start-2 col-span-3 text-xs text-muted-foreground mt-1">Select the new folder for game saves.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!newLocation.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RestoreBackupsTab: React.FC<{
  foundBackups: FoundBackup[];
  onDelete: (backupPath: string, gameName: string) => void;
  onScan: () => void;
  onOpenDirectory: (path: string) => void;
}> = ({ foundBackups, onDelete, onScan, onOpenDirectory }) => {

  // NEW: Use a ref to track if the initial scan has been performed.
  const initialScanPerformed = useRef(false);

  useEffect(() => {
    // Only run the scan if it hasn't been done before.
    if (!initialScanPerformed.current) {
      onScan();
      // Mark that the scan has now been done.
      initialScanPerformed.current = true;
    }
    // The empty dependency array [] ensures this effect runs only ONCE after the component mounts.
  }, [onScan]);  // Note the empty dependency array

  return (
    <div className="space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto pr-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Restore Backups</h2>
          <p className="text-sm text-muted-foreground">Automatic sync backups and manual snapshots</p>
        </div>
        <Button
          onClick={onScan}
          className="bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl px-6 h-10 transition-all active:scale-95"
        >
          {/* We'll assume scanning is fast enough for now or adding a local isScanning state if needed */}
          <RefreshCcw className="w-4 h-4 mr-2" /> Scan for Backups
        </Button>
      </div>
      <p className="text-muted-foreground">
        Manage pre-restore backups created by the app. You can safely delete these if you are happy with your restores.
      </p>
      {foundBackups.length === 0 ? (
        <div className="text-center text-muted-foreground border border-dashed rounded-lg p-8 mt-4">
          <Archive className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p>No pre-restore backups found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {foundBackups.map((backup) => (
            <Card key={backup.gameId} className="border-dashed border-white/10 bg-black/20 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex justify-between items-center">
                  <span>{backup.gameName}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onOpenDirectory(backup.backupPath)}>
                      <FolderOpen className="mr-2 h-4 w-4" /> Open
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(backup.backupPath, backup.gameName)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground truncate" title={backup.backupPath}>
                  Path: {backup.backupPath}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const CloudCheckpointModal: React.FC<{
  games: Game[];
  onUploadCheckpoint: (gameId: string, provider: Checkpoint['provider'], description: string) => void;
  onClose: () => void;
  isGoogleDriveConnected: boolean;
  isGithubConnected: boolean;
  addNotification: (message: string, type: NotificationMessage['type'], options?: { icon?: React.ReactNode; force?: boolean }) => void;
}> = ({ games, onUploadCheckpoint, onClose, isGoogleDriveConnected, isGithubConnected, addNotification }) => {
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<Checkpoint['provider'] | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedGameId || !provider) return;

    const isProviderReallyConnected =
      (provider === 'GitHub' && isGithubConnected) ||
      (provider === 'Google Drive' && isGoogleDriveConnected);

    if (!isProviderReallyConnected) {
      addNotification(`Please connect your ${provider} account first in the Cloud Sync tab.`, 'error');
      return;
    }

    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onUploadCheckpoint(selectedGameId, provider, description.trim());
    setIsUploading(false);
  };

  const availableProviders = [
    { value: 'Google Drive', label: 'Google Drive', connected: isGoogleDriveConnected },
    { value: 'GitHub', label: 'GitHub', connected: isGithubConnected },
    //  { value: 'Dropbox', label: 'Dropbox', connected: isDropboxConnected },
    // { value: 'OneDrive', label: 'OneDrive', connected: isOneDriveConnected },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Cloud Checkpoint</DialogTitle>
          <DialogDescription>
            Select a game and provider. Description is optional.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="game-select" className="text-right text-foreground">
              Game
            </Label>
            <Select value={selectedGameId} onValueChange={setSelectedGameId} disabled={isUploading}>
              <SelectTrigger id="game-select" className="col-span-3 bg-input/60 text-foreground border-dashed border-white/20">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                {games.map(game => (
                  <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="provider-select" className="text-right text-foreground">
              Provider
            </Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as Checkpoint['provider'])} disabled={isUploading}>
              <SelectTrigger id="provider-select" className="col-span-3 bg-input/60 text-foreground border-dashed border-white/20">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                {availableProviders.map(p => (
                  <SelectItem
                    key={p.value}
                    value={p.value}
                    disabled={!p.connected}
                  >
                    <div className="flex items-center">
                      {p.label}
                      {!p.connected && <span className="ml-2 text-xs text-red-500">(Not Configured)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Just before the final boss (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
              disabled={isUploading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!selectedGameId || !provider || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Checkpoint"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LocalCheckpointModal: React.FC<{
  games: Game[];
  onCreateLocalCheckpoint: (gameId: string, description: string) => void;
  onClose: () => void;
}> = ({ games, onCreateLocalCheckpoint, onClose }) => {
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedGameId) return;
    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onCreateLocalCheckpoint(selectedGameId, description.trim());
    setIsCreating(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Local Checkpoint</DialogTitle>
          <DialogDescription>
            Select a game. Description is optional.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="game-select" className="text-right text-foreground">
              Game
            </Label>
            <Select value={selectedGameId} onValueChange={setSelectedGameId} disabled={isCreating}>
              <SelectTrigger id="game-select" className="col-span-3 bg-input/60 text-foreground border-dashed border-white/20">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                {games.map(game => (
                  <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., Just before the final boss (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
              disabled={isCreating}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!selectedGameId || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Checkpoint"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CheckpointAllOptionsModal: React.FC<{
  onIndividual: (provider?: Checkpoint['provider']) => void;
  onFolder: (provider?: Checkpoint['provider']) => void;
  onClose: () => void;
  type: 'local' | 'cloud';
  isGoogleDriveConnected: boolean;
  isGithubConnected: boolean;
  addNotification: (message: string, type: NotificationMessage['type'], options?: { icon?: React.ReactNode; force?: boolean }) => void;
}> = ({ onIndividual, onFolder, onClose, type, isGoogleDriveConnected, isGithubConnected, addNotification }) => {
  const [selectedProvider, setSelectedProvider] = useState<Checkpoint['provider'] | undefined>(
    type === 'cloud' ? (isGoogleDriveConnected ? 'Google Drive' : isGithubConnected ? 'GitHub' : undefined) : undefined
  );

  const isProviderReallyConnected = (providerToCheck: Checkpoint['provider']) => {
    switch (providerToCheck) {
      case 'GitHub': return isGithubConnected;
      case 'Google Drive': return isGoogleDriveConnected;
      default: return false;
    }
  };

  const handleIndividualClick = () => {
    if (type === 'cloud' && (!selectedProvider || !isProviderReallyConnected(selectedProvider))) {
      addNotification(`Please connect your ${selectedProvider || 'chosen'} account first or select a connected one.`, 'error');
      return;
    }
    onIndividual(selectedProvider);
  };

  const handleFolderClick = () => {
    if (type === 'cloud' && (!selectedProvider || !isProviderReallyConnected(selectedProvider))) {
      addNotification(`Please connect your ${selectedProvider || 'chosen'} account first or select a connected one.`, 'error');
      return;
    }
    onFolder(selectedProvider);
  };

  const availableProviders = [
    { value: 'Google Drive', label: 'Google Drive', connected: isGoogleDriveConnected },
    { value: 'GitHub', label: 'GitHub', connected: isGithubConnected },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Checkpoint for All Games ({type === 'local' ? 'Local' : 'Cloud'})</DialogTitle>
          <DialogDescription>
            Choose how you want to create checkpoints for all enabled games.
            {type === 'cloud' && " Select a cloud provider first."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {type === 'cloud' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider-select" className="text-right text-foreground">
                Provider
              </Label>
              <Select value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as Checkpoint['provider'])}>
                <SelectTrigger id="provider-select" className="col-span-3 bg-input/60 text-foreground border-dashed border-white/20">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                  {availableProviders.map(p => (
                    <SelectItem
                      key={p.value}
                      value={p.value}
                      disabled={!p.connected}
                    >
                      <div className="flex items-center">
                        {p.label}
                        {!p.connected && <span className="ml-2 text-xs text-red-500">(Not Configured)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="secondary" onClick={handleIndividualClick} disabled={type === 'cloud' && !selectedProvider}>
            <Sparkles className="mr-2 h-4 w-4" /> Individual Checkpoints
          </Button>
          <Button variant="outline" onClick={handleFolderClick} disabled={type === 'cloud' && !selectedProvider}>
            <Folder className="mr-2 h-4 w-4" /> Folder Checkpoint
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const SyncOptionsModal: React.FC<{
  gameId?: string;
  onSync: (provider: Checkpoint['provider'] | 'Local', direction: 'to_cloud' | 'from_cloud', gameId?: string) => void;
  onClose: () => void;
  isGoogleDriveConnected: boolean;
  isGithubConnected: boolean;
  syncingAll?: boolean;
  addNotification: (message: string, type: NotificationMessage['type'], options?: { icon?: React.ReactNode; force?: boolean }) => void;
}> = ({
  gameId,
  onSync,
  onClose,
  isGoogleDriveConnected,
  isGithubConnected,
  syncingAll = false,
  addNotification,
}) => {
    const [selectedProvider, setSelectedProvider] = useState<Checkpoint['provider'] | 'Local'>('Local');
    const [syncDirection, setSyncDirection] = useState<'to_cloud' | 'from_cloud'>('to_cloud');

    const handleSyncClick = () => {
      if (selectedProvider !== 'Local') {
        const isProviderReallyConnected =
          (selectedProvider === 'Google Drive' && isGoogleDriveConnected) ||
          (selectedProvider === 'GitHub' && isGithubConnected);

        if (!isProviderReallyConnected) {
          addNotification(`Please connect your ${selectedProvider} account first in the Cloud Sync tab.`, 'error');
          return;
        }
      }

      onSync(selectedProvider, syncDirection, gameId);
      onClose();
    };

    const availableProviders = [
      { value: 'Local' as 'Local', label: 'Local Storage', icon: <HardDrive className="mr-2 h-4 w-4" />, connected: true },
      { value: 'Google Drive' as Checkpoint['provider'], label: 'Google Drive', icon: <HardDrive className="mr-2 h-4 w-4" />, connected: isGoogleDriveConnected },
      { value: 'GitHub' as Checkpoint['provider'], label: 'GitHub', icon: <Github className="mr-2 h-4 w-4" />, connected: isGithubConnected },
    ];

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">{syncingAll ? "Sync All Enabled Games" : "Sync Game"}</DialogTitle>
            <DialogDescription>
              Select where you want to sync {syncingAll ? "your games" : "this game"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold tracking-wide text-foreground ml-1 uppercase">Direction:</Label>
              <Tabs value={syncDirection} onValueChange={(v) => setSyncDirection(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/10 h-10 p-1">
                  <TabsTrigger value="to_cloud" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all">
                    <Cloud className="w-4 h-4" /> Sync To
                  </TabsTrigger>
                  <TabsTrigger value="from_cloud" className="data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all">
                    <DownloadCloud className="w-4 h-4" /> Sync From
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold tracking-wide text-foreground ml-1 uppercase">Provider:</Label>
              <Select value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as Checkpoint['provider'] | 'Local')}>
                <SelectTrigger className="w-full bg-input/60 text-foreground border-dashed border-white/20 h-11">
                  <SelectValue placeholder="Select a destination" />
                </SelectTrigger>
                <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                  {availableProviders.map(provider => (
                    <SelectItem
                      key={provider.value}
                      value={provider.value}
                      disabled={!provider.connected || (syncDirection === 'from_cloud' && provider.value === 'Local')}
                    >
                      <div className="flex items-center">
                        {provider.icon} {provider.label}
                        {!provider.connected && (
                          <span className="ml-2 text-xs text-red-500">(Not Configured)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {syncDirection === 'from_cloud' && selectedProvider === 'Local' && (
                <p className="text-[10px] text-yellow-400 mt-1 ml-1">"Sync From Local" is not currently supported. Please select a cloud provider.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5">Cancel</Button>
            <Button
              onClick={handleSyncClick}
              disabled={syncDirection === 'from_cloud' && selectedProvider === 'Local'}
              className={cn(
                "gap-2 transition-all",
                syncDirection === 'from_cloud' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"
              )}
            >
              {syncDirection === 'to_cloud' ? (
                <>
                  <UploadCloud className="w-4 h-4" />
                  {syncingAll ? "Upload All" : "Upload to Cloud"}
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  {syncingAll ? "Download All" : "Download from Cloud"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };


// In App.tsx

const EditGameModal: React.FC<EditGameModalProps> = ({
  game,
  onSave,
  onCancel,
  addNotification,
  onBrowse,
  currentUser,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for editable text fields
  const [editedGameName, setEditedGameName] = useState(game.name);
  const [editedGamePath, setEditedGamePath] = useState(game.path);
  const [editedLaunchPath, setEditedLaunchPath] = useState(game.launchPath || '');

  // State for images
  const [bannerUrl, setBannerUrl] = useState(game.customBannerUrl || game.bannerUrl || '');
  const [iconUrl, setIconUrl] = useState(game.customIconUrl || '');

  const [newBannerFile, setNewBannerFile] = useState<{ buffer: ArrayBuffer; name: string } | null>(null);
  const [newIconFile, setNewIconFile] = useState<{ buffer: ArrayBuffer; name: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'icon') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        if (type === 'banner') {
          setNewBannerFile({ buffer: arrayBuffer, name: file.name });
          setBannerUrl(`File selected: ${file.name}`);
        } else {
          setNewIconFile({ buffer: arrayBuffer, name: file.name });
          setIconUrl(`File selected: ${file.name}`);
        }
      }
    };
    reader.onerror = () => {
      addNotification(`Failed to read ${type} file.`, 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (!editedGameName.trim() || !editedGamePath.trim()) {
      addNotification("Game Name and Save File Path cannot be empty.", "error");
      return;
    }
    if (!currentUser) {
      addNotification("You must be logged in to upload assets.", "error");
      return;
    }
    setIsSaving(true);

    let finalBannerUrl: string | undefined = bannerUrl;
    let finalIconUrl: string | undefined = iconUrl;

    // Handle Banner
    if (newBannerFile) {
      const result = await window.electronAPI.uploadBannerToSupabase({
        uid: currentUser.id,
        fileData: newBannerFile
      });
      if (result.success && result.url) {
        if (game.customBannerUrl && game.customBannerUrl.startsWith('http')) {
          await window.electronAPI.deleteBannerFromSupabase({ url: game.customBannerUrl });
        }
        finalBannerUrl = result.url;
      } else {
        addNotification(`Failed to upload banner: ${result.error}`, "error", { force: true });
        setIsSaving(false);
        return;
      }
    } else if (!bannerUrl.trim() || bannerUrl.startsWith('File selected:')) {
      finalBannerUrl = undefined;
      if (game.customBannerUrl && game.customBannerUrl.startsWith('http')) {
        await window.electronAPI.deleteBannerFromSupabase({ url: game.customBannerUrl });
      }
    }

    // Handle Icon
    if (newIconFile) {
      const result = await window.electronAPI.uploadBannerToSupabase({ // Reusing same upload logic for icons
        uid: currentUser.id,
        fileData: newIconFile
      });
      if (result.success && result.url) {
        if (game.customIconUrl && game.customIconUrl.startsWith('http')) {
          await window.electronAPI.deleteBannerFromSupabase({ url: game.customIconUrl });
        }
        finalIconUrl = result.url;
      } else {
        addNotification(`Failed to upload icon: ${result.error}`, "error", { force: true });
        setIsSaving(false);
        return;
      }
    } else if (!iconUrl.trim() || iconUrl.startsWith('File selected:')) {
      finalIconUrl = undefined;
      if (game.customIconUrl && game.customIconUrl.startsWith('http')) {
        await window.electronAPI.deleteBannerFromSupabase({ url: game.customIconUrl });
      }
    }

    const updatedGame: Game = {
      ...game,
      name: editedGameName.trim(),
      path: editedGamePath.trim(),
      launchPath: editedLaunchPath.trim() || undefined,
      customBannerUrl: finalBannerUrl,
      customIconUrl: finalIconUrl,
    };

    onSave(updatedGame);
    setIsSaving(false);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-2xl border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Game: {game.name}</DialogTitle>
          <DialogDescription>
            Update the details for this game. Changes will be saved permanently.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Game Name</Label>
                <Input id="edit-name" value={editedGameName} onChange={(e) => setEditedGameName(e.target.value)} className="bg-input/60" disabled={isSaving} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-path">Save File Path</Label>
                <div className="flex gap-2">
                  <Input id="edit-path" value={editedGamePath} onChange={(e) => setEditedGamePath(e.target.value)} className="bg-input/60 truncate" disabled={isSaving} />
                  <Button variant="outline" size="icon" onClick={() => onBrowse('folder', setEditedGamePath)} disabled={isSaving}>
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-launch">Launch Executable (Optional)</Label>
                <div className="flex gap-2">
                  <Input id="edit-launch" value={editedLaunchPath} onChange={(e) => setEditedLaunchPath(e.target.value)} className="bg-input/60 truncate" disabled={isSaving} />
                  <Button variant="outline" size="icon" onClick={() => onBrowse('file', setEditedLaunchPath)} disabled={isSaving}>
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cover/Banner Artwork</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Image URL"
                    value={bannerUrl}
                    onChange={(e) => {
                      setBannerUrl(e.target.value);
                      setNewBannerFile(null);
                    }}
                    className="bg-input/60"
                    disabled={isSaving}
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                      <Upload className="mr-2 h-4 w-4" /> Upload Local
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'banner')} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Library Icon (Optional)</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Icon URL"
                    value={iconUrl}
                    onChange={(e) => {
                      setIconUrl(e.target.value);
                      setNewIconFile(null);
                    }}
                    className="bg-input/60"
                    disabled={isSaving}
                  />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    const iconInput = document.createElement('input');
                    iconInput.type = 'file';
                    iconInput.accept = 'image/*';
                    iconInput.onchange = (e) => handleFileSelect(e as any, 'icon');
                    iconInput.click();
                  }} disabled={isSaving}>
                    <Gamepad2 className="mr-2 h-4 w-4" /> Upload Icon
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !editedGameName.trim() || !editedGamePath.trim()} className="bg-primary text-primary-foreground min-w-[100px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// ─── GlobalSearchTab: Steam-like Search ───────────────────────────────────────
const GlobalSearchTab = ({
  searchTerm,
  setSearchTerm,
  onSearch,
  results,
  isLoading,
  onAddGame,
  onBack,
  currentPage,
  onPageChange,
  totalPages
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onSearch: (q: string, page: number) => void;
  results: any[];
  isLoading: boolean;
  onAddGame: (game: any) => void;
  onBack: () => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}) => {
  const isSearching = searchTerm.trim() !== '';
  const safeTotal = Math.max(1, totalPages);

  const pageNumbers = (() => {
    if (safeTotal <= 7) return Array.from({ length: safeTotal }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(safeTotal - 1, currentPage + 1); p++) pages.push(p);
    if (currentPage < safeTotal - 2) pages.push('...');
    pages.push(safeTotal);
    return pages;
  })();

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Sticky Header */}
      <div className="flex items-center gap-4 pb-6 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white/10 shrink-0 rounded-xl">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(searchTerm, 1); }}
            placeholder="Search Steam catalogue..."
            className="h-12 bg-black/50 border-white/10 pl-12 pr-4 text-base rounded-xl focus:ring-2 focus:ring-primary/50 focus:bg-black/70 transition-all"
            autoFocus
          />
          {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
        </div>
        {isSearching && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); onSearch('', 1); }} className="text-white/40 hover:text-white shrink-0 h-10 px-3 rounded-xl">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Section label */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
          {isSearching ? `Results for "${searchTerm}"` : '🔥 Top Sellers on Steam'}
        </span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Game Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="aspect-[460/215] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
            <Gamepad2 className="w-20 h-20 opacity-10" />
            <p className="text-lg font-medium">No games found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map((game, i) => (
              <motion.div
                key={`${game.id}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className="group relative rounded-xl overflow-hidden bg-black/40 border border-white/5 hover:border-white/20 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/40"
              >
                {/* Banner Image */}
                <div className="aspect-[460/215] relative overflow-hidden bg-black/60">
                  <img
                    src={game.bannerUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (!el.dataset.fb1) {
                        el.dataset.fb1 = '1';
                        el.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/capsule_616x353.jpg`;
                      } else if (!el.dataset.fb2) {
                        el.dataset.fb2 = '1';
                        el.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/capsule_231x87.jpg`;
                      } else {
                        el.style.opacity = '0';
                      }
                    }}
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Add button on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                      onClick={(e) => { e.stopPropagation(); onAddGame(game); }}
                      size="sm"
                      className="bg-primary/90 hover:bg-primary text-xs font-bold px-3 py-1.5 h-auto rounded-lg shadow-lg backdrop-blur-sm"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add to Library
                    </Button>
                  </div>
                </div>

                {/* Game info */}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-white/90 truncate leading-tight">{game.name}</p>
                  {game.genres && game.genres.length > 0 && (
                    <p className="text-[10px] text-white/30 truncate mt-0.5">{game.genres.slice(0, 2).map((g: any) => g.description || g).join(' · ')}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && results.length > 0 && safeTotal > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-5 mt-auto border-t border-white/5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="text-white/40 hover:text-white disabled:opacity-20 h-8 px-2 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {pageNumbers.map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="text-white/20 w-7 text-center text-xs">···</span>
            ) : (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-8 h-8 rounded-lg p-0 text-xs font-bold transition-all",
                  currentPage === p
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "text-white/40 hover:text-white hover:bg-white/10"
                )}
                onClick={() => onPageChange(p as number)}
                disabled={isLoading}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= safeTotal}
            onClick={() => onPageChange(currentPage + 1)}
            className="text-white/40 hover:text-white disabled:opacity-20 h-8 px-2 rounded-lg"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>

          <span className="text-white/20 text-xs ml-2">Page {currentPage} of {safeTotal}</span>
        </div>
      )}
    </div>
  );
};

// ─── GameDetailPage: Full-Screen Detail View ──────────────────────────────────
const GameDetailPage: React.FC<{
  game: Game;
  onBack: () => void;
  localCheckpoints: Checkpoint[];
  cloudCheckpoints: Checkpoint[];
  onLaunchGame: (game: Game) => void;
  onCreateLocalCheckpoint: (gameId: string, description?: string) => void;
  onInitiateSync: (gameId: string) => void;
  onRestoreLocalCheckpoint: (id: string) => void;
  onDeleteLocalCheckpoint: (id: string) => void;
  onRestoreCloudCheckpoint: (id: string) => void;
  onDeleteCloudCheckpoint: (id: string) => void;
  onOpenCloudCheckpointLink: (id: string) => void;
  onUploadCloudCheckpoint: (gameId: string, provider: Checkpoint['provider'], description: string, type?: Checkpoint['type']) => void;
  isGoogleDriveConnected: boolean;
  isGithubConnected: boolean;
  onEditGame?: (game: Game) => void;
}> = ({
  game,
  onBack,
  localCheckpoints,
  cloudCheckpoints,
  onLaunchGame,
  onCreateLocalCheckpoint,
  onInitiateSync,
  onRestoreLocalCheckpoint,
  onDeleteLocalCheckpoint,
  onRestoreCloudCheckpoint,
  onDeleteCloudCheckpoint,
  onOpenCloudCheckpointLink,
  onUploadCloudCheckpoint,
  isGoogleDriveConnected,
  isGithubConnected,
  onEditGame,
}) => {
    const storageKey = `playtime_${game.id}`;
    const [totalPlaySeconds, setTotalPlaySeconds] = useState<number>(() =>
      parseInt(localStorage.getItem(storageKey) || '0', 10)
    );
    const [showCloudUploadMenu, setShowCloudUploadMenu] = useState(false);

    const formatPlayTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (h === 0 && m === 0) return 'No time recorded';
      if (h === 0) return `${m}m`;
      return `${h}h ${m}m`;
    };

    const handleLaunch = () => {
      onLaunchGame(game);
      const newTotal = totalPlaySeconds + 1800;
      setTotalPlaySeconds(newTotal);
      localStorage.setItem(storageKey, newTotal.toString());
    };

    const displayImageUrl = (() => {
      if (game.localBannerPath) return `safe-file:///${game.localBannerPath.replace(/\\/g, '/')}`;
      return game.customBannerUrl || game.coverArtUrl || game.bannerUrl;
    })();

    const gameCloudCheckpoints = cloudCheckpoints.filter(cp => cp.gameId === game.id);
    const gameLocalCheckpoints = localCheckpoints.filter(cp => cp.gameId === game.id);

    const availableProviders = [
      isGoogleDriveConnected && 'Google Drive' as const,
      isGithubConnected && 'GitHub' as const,
    ].filter(Boolean) as Checkpoint['provider'][];

    const CheckpointItem: React.FC<{ checkpoint: Checkpoint; isCloud: boolean }> = ({ checkpoint, isCloud }) => (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCloud ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {isCloud ? <Cloud className="w-4 h-4" /> : <HardDrive className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{checkpoint.description || 'Checkpoint'}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(checkpoint.time)}{checkpoint.size ? ` · ${checkpoint.size}` : ''}{checkpoint.provider ? ` · ${checkpoint.provider}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isCloud && checkpoint.cloudLink && (
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/10" onClick={() => onOpenCloudCheckpointLink(checkpoint.id)} title="Open link">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/20" title="Restore"
            onClick={() => isCloud ? onRestoreCloudCheckpoint(checkpoint.id) : onRestoreLocalCheckpoint(checkpoint.id)}>
            <DownloadCloud className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-white/10" title="Delete"
            onClick={() => isCloud ? onDeleteCloudCheckpoint(checkpoint.id) : onDeleteLocalCheckpoint(checkpoint.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>
    );

    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [tempCheckpointData, setTempCheckpointData] = useState<{ type: 'local' | 'cloud', provider?: Checkpoint['provider'] } | null>(null);
    const [checkpointDescription, setCheckpointDescription] = useState("");

    const handleCheckpointClick = (type: 'local' | 'cloud', provider?: Checkpoint['provider']) => {
      setTempCheckpointData({ type, provider });
      setCheckpointDescription("");
      setIsDescriptionModalOpen(true);
    };

    const confirmCheckpointCreation = () => {
      if (!tempCheckpointData) return;
      const description = checkpointDescription || `Manual Backup - ${new Date().toLocaleString()}`;
      if (tempCheckpointData.type === 'local') {
        onCreateLocalCheckpoint(game.id, description);
      } else if (tempCheckpointData.type === 'cloud' && tempCheckpointData.provider) {
        onUploadCloudCheckpoint(game.id, tempCheckpointData.provider, description);
      }
      setIsDescriptionModalOpen(false);
      setTempCheckpointData(null);
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="flex flex-col bg-background/50 backdrop-blur-sm overflow-y-auto h-full rounded-2xl border border-white/5"
      >
        {/* Back Button Above Banner */}
        <div className="px-6 pt-6 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white/10 transition-colors text-white">
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </div>

        {/* Banner Section */}
        <div className="px-6 py-4 flex-shrink-0">
          <div className="relative w-full aspect-[192/62] overflow-hidden rounded-2xl border border-white/10 group shadow-2xl">
            {displayImageUrl ? (
              <img src={displayImageUrl} alt={game.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-background to-background flex items-center justify-center">
                <Gamepad2 className="w-16 h-16 text-primary/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Top Right - Edit Info */}
            <div className="absolute top-6 right-6 z-10">
              <Button
                variant="outline"
                size="default"
                className="bg-black/40 border-white/10 hover:bg-white/20 gap-2 text-white backdrop-blur-md h-11 px-5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl"
                onClick={() => onEditGame?.(game)}
              >
                <Edit3 className="w-5 h-5" />
                Edit Info
              </Button>
            </div>

            {/* Bottom Left - Action Buttons Overlay */}
            <div className="absolute bottom-6 left-6 flex items-center gap-2 z-10">
              <Button className="h-9 rounded-lg bg-black/40 border-white/10 hover:bg-white/20 backdrop-blur-md text-white" size="sm" variant="outline" onClick={() => handleCheckpointClick('local')}>
                <FolderDown className="mr-2 h-3.5 w-3.5 text-emerald-400" /> Local Checkpoint
              </Button>

              <div className="relative">
                <Button className="h-9 rounded-lg bg-black/40 border-white/10 hover:bg-white/20 backdrop-blur-md text-white" size="sm" variant="outline" onClick={() => setShowCloudUploadMenu(!showCloudUploadMenu)}>
                  <UploadCloud className="mr-2 h-3.5 w-3.5 text-blue-400" /> Cloud Checkpoint
                </Button>
                <AnimatePresence>
                  {showCloudUploadMenu && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 w-48 mb-2 p-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
                      {availableProviders.map(p => (
                        <button key={p} onClick={() => { handleCheckpointClick('cloud', p); setShowCloudUploadMenu(false); }}
                          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-white/10 rounded-md transition-colors flex items-center gap-2 text-white">
                          {p === 'Google Drive' ? <HardDrive className="w-3 h-3 text-blue-400" /> : <Github className="w-3 h-3 text-white" />}
                          {p}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button className="h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90" size="sm" variant="default" onClick={() => onInitiateSync(game.id)} disabled={!game.enabled}>
                <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Sync
              </Button>
            </div>

            {/* Bottom Right - Play Button Overlay */}
            <div className="absolute bottom-6 right-6 z-10">
              <Button
                variant="default"
                size="default"
                className="bg-white/10 border-2 border-white/20 hover:bg-white/20 text-white h-12 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-md group"
                onClick={handleLaunch}
                disabled={!game.launchPath}
              >
                <PlayCircle className="mr-2 h-6 w-6 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                <span className="text-lg">Play</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Checkpoint Description Dialog */}
        <Dialog open={isDescriptionModalOpen} onOpenChange={setIsDescriptionModalOpen}>
          <DialogContent className="sm:max-w-md border border-white/10 bg-black/50 backdrop-blur-xl text-foreground !rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-medium flex items-center gap-2">
                {tempCheckpointData?.type === 'local' ? <FolderDown className="w-5 h-5 text-emerald-400" /> : <UploadCloud className="w-5 h-5 text-blue-400" />}
                {tempCheckpointData?.type === 'local' ? "Create Local Checkpoint" : "Create Cloud Checkpoint"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter a description to help you identify this checkpoint later.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkpoint-desc" className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Checkpoint Description</Label>
                <Input
                  id="checkpoint-desc"
                  placeholder="e.g., Before the big boss fight, Level 25 completed..."
                  value={checkpointDescription}
                  onChange={(e) => setCheckpointDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmCheckpointCreation();
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDescriptionModalOpen(false)} className="hover:bg-white/5 text-muted-foreground font-medium">Cancel</Button>
              <Button
                onClick={confirmCheckpointCreation}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 rounded-xl"
              >
                Create Checkpoint
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoCard label="Play Time" value={formatPlayTime(totalPlaySeconds)} icon={<Timer className="w-5 h-5 text-violet-400" />} colorClass="bg-violet-500/20" />
            <InfoCard label="Cloud Saves" value={gameCloudCheckpoints.length} icon={<Cloud className="w-5 h-5 text-blue-400" />} colorClass="bg-blue-500/20" />
            <InfoCard label="Local Saves" value={gameLocalCheckpoints.length} icon={<HardDrive className="w-5 h-5 text-emerald-400" />} colorClass="bg-emerald-500/20" />
          </div>

          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
                <Folder className="w-3 h-3 text-muted-foreground" /> Save Location
              </h3>
              <p className="text-sm text-muted-foreground break-all bg-black/20 p-2 rounded-lg border border-white/5">{game.path}</p>
              {game.launchPath && (
                <>
                  <h3 className="text-sm font-medium text-white flex items-center gap-2 pt-1 mb-2">
                    <Play className="w-3 h-3 text-muted-foreground" /> Launch Path
                  </h3>
                  <p className="text-sm text-muted-foreground break-all bg-black/20 p-2 rounded-lg border border-white/5">{game.launchPath}</p>
                </>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-primary" /> Saves & Checkpoints
              </h2>
              <div className="space-y-2">
                {gameCloudCheckpoints.map(checkpoint => (
                  <CheckpointItem key={checkpoint.id} checkpoint={checkpoint} isCloud={true} />
                ))}
                {gameLocalCheckpoints.map(checkpoint => (
                  <CheckpointItem key={checkpoint.id} checkpoint={checkpoint} isCloud={false} />
                ))}
                {gameCloudCheckpoints.length === 0 && gameLocalCheckpoints.length === 0 && (
                  <div className="text-center py-12 bg-black/20 rounded-2xl border border-dashed border-white/5">
                    <Archive className="w-10 h-10 mx-auto mb-3 opacity-10" />
                    <p className="text-xs font-semibold text-white/20">No checkpoints found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  isDestructive?: boolean;
  isConfirming?: boolean;
  confirmPhrase?: string;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  isDestructive = false,
  isConfirming = false,
  confirmPhrase,
}) => {
    const [input, setInput] = useState("");
    const isConfirmationMatch = !confirmPhrase || input === confirmPhrase;

    useEffect(() => {
      if (!isOpen) {
        setInput("");
      }
    }, [isOpen]);

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {confirmPhrase && (
            <div className="py-2">
              <Label htmlFor="confirm-input">To confirm, please type "<span className="font-bold text-destructive">{confirmPhrase}</span>"</Label>
              <Input
                id="confirm-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-input/60 mt-2 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground"
                autoComplete="off"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isConfirming}>{cancelText}</Button>
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isConfirming || !isConfirmationMatch}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {confirmText}...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

const AutoDetectedGamesModal: React.FC<{
  detectedGames: PotentialGame[];
  onAddGames: (gamesToAdd: PotentialGame[]) => void;
  onClose: () => void;
  onScan: () => void;
}> = ({
  detectedGames,
  onAddGames,
  onClose,
  onScan
}) => {
    const [selectedGames, setSelectedGames] = useState<PotentialGame[]>(() => [...detectedGames]);

    const handleToggleSelectGame = (gameTempId: string) => {
      setSelectedGames(prevSelected => {
        const game = detectedGames.find(g => g.tempId === gameTempId);
        if (!game) return prevSelected;

        if (prevSelected.some(sg => sg.tempId === gameTempId)) {
          return prevSelected.filter(sg => sg.tempId !== gameTempId);
        } else {
          return [...prevSelected, game];
        }
      });
    };

    const handleAddSelected = () => {
      if (selectedGames.length > 0) {
        onAddGames(selectedGames);
      }
      onClose();
    };

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detected Games</DialogTitle>
            <DialogDescription>
              The following new games were detected on your system. Select the ones you want to add.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4 max-h-72 overflow-y-auto pr-2">
            {detectedGames.length > 0 ? (
              detectedGames.map(game => (
                <div key={game.tempId} className="flex items-center justify-between p-2 rounded-md hover:bg-white/5 border border-dashed border-white/10">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      id={`game-checkbox-${game.tempId}`}
                      checked={selectedGames.some(sg => sg.tempId === game.tempId)}
                      onCheckedChange={() => handleToggleSelectGame(game.tempId)}
                      className="mt-1"
                    />
                    <Label htmlFor={`game-checkbox-${game.tempId}`} className="cursor-pointer flex flex-col text-foreground">
                      <span className="font-medium">
                        <Gamepad2 className="w-4 h-4 inline-block mr-1 text-muted-foreground" />
                        {game.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate" title={game.path}>Save: {game.path}</span>
                      {game.launchPath && <span className="text-xs text-muted-foreground truncate" title={game.launchPath}>Launch: {game.launchPath}</span>}
                    </Label>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No new games detected.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="ghost" onClick={onScan} className="mr-auto">Scan Again</Button>
            <Button onClick={handleAddSelected} disabled={selectedGames.length === 0}>
              Add Selected ({selectedGames.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

const DiscoveryTab: React.FC<{
  detectedGames: PotentialGame[];
  onScan: () => void;
  onAddGames: (games: PotentialGame[]) => void;
}> = ({ detectedGames, onScan, onAddGames }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddSelected = () => {
    const gamesToAdd = detectedGames.filter(g => selectedIds.includes(g.tempId));
    onAddGames(gamesToAdd);
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === detectedGames.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(detectedGames.map(g => g.tempId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black/40 p-6 rounded-xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Game Discovery</h2>
            <p className="text-sm text-muted-foreground">Scan your system for installed games using the Ludusavi manifest.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={async () => {
              setIsScanning(true);
              await onScan();
              setIsScanning(false);
            }}
            disabled={isScanning}
            className="shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all"
          >
            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            {isScanning ? "Scanning System..." : "Deep Scan"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Detected Games ({detectedGames.length})
            </h3>
            {detectedGames.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-7 text-xs text-muted-foreground hover:text-white">
                {selectedIds.length === detectedGames.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
              <span className="text-xs text-muted-foreground mr-2 font-mono">
                Total Selection: {formatBytes(detectedGames.filter(g => selectedIds.includes(g.tempId)).reduce((acc, g) => acc + (g.size || 0), 0))}
              </span>
              <Button size="sm" onClick={handleAddSelected} className="h-8">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Selected ({selectedIds.length})
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-280px)] pr-4">
          {detectedGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
              {detectedGames.map(game => (
                <motion.div
                  key={game.tempId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "group relative overflow-hidden rounded-xl bg-black/40 border transition-all duration-300",
                    selectedIds.includes(game.tempId) ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "border-white/10 hover:border-white/20"
                  )}
                >
                  {/* Banner Image fallback */}
                  <div className="aspect-[16/9] w-full bg-muted/20 relative overflow-hidden">
                    {game.bannerUrl ? (
                      <img src={game.bannerUrl} alt={game.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gamepad2 className="w-12 h-12 text-white/5" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedIds.includes(game.tempId)}
                        onCheckedChange={() => handleToggleSelect(game.tempId)}
                        className="border-white/50 data-[state=checked]:bg-primary shadow-lg"
                      />
                    </div>

                    <div className="absolute bottom-2 left-2 right-2">
                      <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-primary transition-colors">{game.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 bg-black/50 border-white/10 text-white/70">
                          {game.path.includes('OnlineFix') ? 'OnlineFix' : game.path.includes('dodi') ? 'DODI' : 'Steam'}
                        </Badge>
                        {game.summary && <span className="text-[10px] text-white/50 truncate max-w-[100px]">{game.summary}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="space-y-1.5 pb-2 border-b border-white/5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium"><HardDrive className="w-3 h-3" /> Save Size</span>
                        <span className="font-mono text-primary/90">{formatBytes(game.size || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium"><Folder className="w-3 h-3" /> Location</span>
                        <span className="font-mono truncate max-w-[120px] text-foreground/60" title={game.path}>
                          {game.path.split(/[\\\/]/).filter(Boolean).pop() || "Saves"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant={selectedIds.includes(game.tempId) ? "default" : "secondary"}
                      size="sm"
                      className="w-full h-8 text-xs font-bold shadow-lg group-hover:shadow-primary/20 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddGames([game]);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add to Library
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-2xl border border-dashed border-white/10">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Gamepad2 className="w-10 h-10 text-white/10" />
              </div>
              <h3 className="text-xl font-medium text-white/80">No games discovered yet</h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-sm text-center">
                Click the "Deep Scan" button to search your system for installed games based on the Ludusavi manifest.
              </p>
              <Button variant="outline" className="mt-6 border-dashed" onClick={onScan}>
                <RefreshCcw className="w-4 h-4 mr-2" /> Start First Scan
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

const CheckpointList: React.FC<{ checkpoints: Checkpoint[]; title: string; icon: React.ReactNode }> = ({ checkpoints, title, icon }) => (
  <div>
    <h4 className="font-semibold text-sm mb-1 flex items-center">{icon}{title} ({checkpoints.length})</h4>
    <div className="text-xs text-muted-foreground space-y-1">
      {checkpoints.map(cp => (
        <p key={cp.id} className="truncate" title={cp.description}>- {cp.description || `Checkpoint from ${formatTime(cp.time)}`}</p>
      ))}
    </div>
  </div>
);

const DeleteGameModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteCheckpoints: boolean) => void;
  gameName: string;
  isConfirming?: boolean;
  associatedLocalCheckpoints: Checkpoint[];
  associatedCloudCheckpoints: Checkpoint[];
}> = ({
  isOpen,
  onClose,
  onConfirm,
  gameName,
  isConfirming = false,
  associatedLocalCheckpoints,
  associatedCloudCheckpoints,
}) => {
    const [deleteCheckpoints, setDeleteCheckpoints] = useState(false);
    const totalCheckpoints = associatedLocalCheckpoints.length + associatedCloudCheckpoints.length;

    // Reset state when the modal is closed
    useEffect(() => {
      if (!isOpen) {
        setDeleteCheckpoints(false);
      }
    }, [isOpen]);

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md border border-white/10 bg-black/50 backdrop-blur-xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive font-medium">Delete {gameName}?</DialogTitle>
            <DialogDescription>
              This will remove the game from your library. By default, all associated checkpoints will be preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {totalCheckpoints > 0 && (
              <div className="flex items-start space-x-3 p-3 rounded-md bg-destructive/10 border border-dashed border-destructive/30">
                <Checkbox
                  id="delete-checkpoints-checkbox"
                  checked={deleteCheckpoints}
                  onCheckedChange={(checked) => setDeleteCheckpoints(checked as boolean)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="delete-checkpoints-checkbox" className="font-semibold text-destructive-foreground cursor-pointer">
                    Also delete all associated checkpoints.
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete {totalCheckpoints} checkpoint(s) from local storage and the cloud. This action cannot be undone.
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence>
              {deleteCheckpoints && totalCheckpoints > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-2 border-t border-dashed border-border pt-3"
                >
                  {associatedLocalCheckpoints.length > 0 && (
                    <CheckpointList checkpoints={associatedLocalCheckpoints} title="Local Checkpoints" icon={<Save className="w-4 h-4 mr-2" />} />
                  )}
                  {associatedCloudCheckpoints.length > 0 && (
                    <CheckpointList checkpoints={associatedCloudCheckpoints} title="Cloud Checkpoints" icon={<Cloud className="w-4 h-4 mr-2" />} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isConfirming}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => onConfirm(deleteCheckpoints)}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Confirm Deletion"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };





// 1. Define initial value constants first
const initialAppSettings: AppSettings = {
  bannerDisplayMode: 'banner',
  autoSyncInterval: 0,
  autoCheckpointFrequency: 'never',
  masterNotificationsEnabled: true,
  showSuccessNotifications: true,
  showErrorNotifications: true,
  defaultLocalSyncPath: "C:\\GameSync\\LocalSyncs",
  localCheckpointsBasePath: "C:\\GameSync\\LocalCheckpoints",
  defaultSyncProvider: 'ask_every_time',
};

const initialThemeSettings: ThemeSettings = {
  mode: 'dark',
};

// --- Main App Component ---

export default function App() {
  // --- START OF FIX: REORDERED STATE AND CONSTANTS ---

  // 2. Declare ALL state hooks next
  const [foundBackups, setFoundBackups] = useState<FoundBackup[]>([]);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchInput, setGlobalSearchInput] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalSearchTotal, setGlobalSearchTotal] = useState(0);
  const [globalSearchTotalPages, setGlobalSearchTotalPages] = useState(1);
  const [selectedGlobalGenre, setSelectedGlobalGenre] = useState<string | null>(null);
  const [activeGlobalFilters, setActiveGlobalFilters] = useState<string[]>([]);
  const [globalSearchPage, setGlobalSearchPage] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // To show a loader while checking auth

  const [games, setGames] = useState<Game[]>([]);
  const [localCheckpoints, setLocalCheckpoints] = useState<Checkpoint[]>([]);
  const [cloudCheckpoints, setCloudCheckpoints] = useState<Checkpoint[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);
  const [theme, setTheme] = useState<ThemeSettings>(initialThemeSettings);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  // Cloud provider states
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState<boolean>(false);
  const [googleDriveLastSync, setGoogleDriveLastSync] = useState<string>('Never');
  const [isGithubConnected, setIsGithubConnected] = useState<boolean>(false);
  const [githubLastSync, setGithubLastSync] = useState<string>('Never');

  const [extraProfile, setExtraProfile] = useState<{ username: string; customAvatarPath: string }>({
    username: '',
    customAvatarPath: ''
  });

  const appUser: AppUser | null = useMemo(() => {
    if (!currentUser) return null;
    return {
      id: currentUser.uid,
      name: currentUser.displayName || '',
      email: currentUser.email || '',
      avatar: currentUser.photoURL || undefined,
      username: extraProfile.username || currentUser.displayName || '',
      customAvatarPath: extraProfile.customAvatarPath
    };
  }, [currentUser, extraProfile]);

  // Modal states
  const [showGameSearchResultsModal, setShowGameSearchResultsModal] = useState(false);
  const [gameSearchResults, setGameSearchResults] = useState<Game[]>([]);
  const [showChangeLocationModal, setShowChangeLocationModal] = useState(false);
  const [gameToChangeLocation, setGameToChangeLocation] = useState<Game | null>(null);
  const [showEditGameModal, setShowEditGameModal] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [selectedGameForDetailPage, setSelectedGameForDetailPage] = useState<Game | null>(null);
  const [showAddGameOptionsModal, setShowAddGameOptionsModal] = useState(false);
  const [showAddManualGameModal, setShowAddManualGameModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState<{
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmPhrase?: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showCheckpointAllOptionsModal, setShowCheckpointAllOptionsModal] = useState(false);
  const [checkpointAllType, setCheckpointAllType] = useState<'local' | 'cloud'>('local');
  const [showGameSearchInputModal, setShowGameSearchInputModal] = useState(false);
  const [showSyncOptionsModal, setShowSyncOptionsModal] = useState(false);
  const [syncingGameId, setSyncingGameId] = useState<string | undefined>(undefined);
  const [syncingAllGames, setSyncingAllGames] = useState(false);
  const [showConfigureGamePathsModal, setShowConfigureGamePathsModal] = useState(false);
  const [gameToConfigurePaths, setGameToConfigurePaths] = useState<Game | null>(null);
  const [showAutoDetectGamesModal, setShowAutoDetectGamesModal] = useState(false);
  const [autoDetectedGames, setAutoDetectedGames] = useState<PotentialGame[]>([]);

  // Home tab sorting and search state
  const [gamesSortBy, setGamesSortBy] = useState<'name' | 'lastSynced'>('name');
  const [gamesSortOrder, setGamesSortOrder] = useState<'asc' | 'desc'>('asc');
  const [gamesSearchTerm, setGamesSearchTerm] = useState('');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const syncNotificationIds = useRef<Record<string, string>>({});

  // 3. Notification and Logging Functions (useCallback for stability)
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: NotificationMessage['type'], options: { icon?: React.ReactNode; force?: boolean; progress?: number } = {}) => {
    const { icon, force = false, progress } = options;

    if (!force) {
      if (!appSettings.masterNotificationsEnabled) {
        console.log(`Notification suppressed by master switch: "${message}"`);
        return "";
      }
      if (type === 'success' && !appSettings.showSuccessNotifications) {
        console.log(`Success notification suppressed by settings: "${message}"`);
        return "";
      }
      if (type === 'error' && !appSettings.showErrorNotifications) {
        console.log(`Error notification suppressed by settings: "${message}"`);
        return "";
      }
    }

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newNotification: NotificationMessage = {
      id,
      message,
      type,
      icon,
      progress,
    };
    setNotifications(prev => [...prev, newNotification].slice(-4)); // Keep last 4 notifications
    return id;
  }, [appSettings.showSuccessNotifications, appSettings.showErrorNotifications, appSettings.masterNotificationsEnabled]);

  const updateNotificationProgress = useCallback((id: string, progress: number, message?: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, progress, message: message || n.message } : n
    ));
  }, []);

  const addLogEntry = useCallback((entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: ActivityLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setActivityLog(prevLog => [newEntry, ...prevLog].slice(0, 100));
  }, [setActivityLog]);

  // 4. Authentication and Data Persistence Hooks
  useEffect(() => {
    // This listener runs when the app starts and whenever the user logs in or out.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        // User is signed IN
        setCurrentUser(user);
        setIsGoogleDriveConnected(true); // If they logged in with Google, Drive is connected
        console.log("Auth state changed: User is LOGGED IN:", user.uid);

        // Fetch their profile from our Firestore backend via electron main process
        const { success, profile, error } = await window.electronAPI.getUserProfile(user.uid);

        if (success) {
          if (profile) {
            // A profile already exists, so we load it into the app's state
            console.log("User profile found in Firestore. Loading data.");
            setGames(profile.games || []);
            setLocalCheckpoints(profile.localCheckpoints || []);
            setCloudCheckpoints(profile.cloudCheckpoints || []);
            setAppSettings(profile.appSettings || initialAppSettings);
            setActivityLog(profile.activityLog || []);
            setTheme(profile.theme || initialThemeSettings);
            setExtraProfile({
              username: profile.username || '',
              customAvatarPath: profile.customAvatarPath || ''
            });
          } else {
            // This is a new user with no profile. Start them with a clean slate.
            console.log("New user detected. Initializing an empty profile.");
            setGames([]);
            setLocalCheckpoints([]);
            setCloudCheckpoints([]);
            setAppSettings(initialAppSettings);
            setActivityLog([]);
            setTheme(initialThemeSettings);
          }
        } else {
          addNotification(`Error fetching your cloud profile: ${error}`, 'error', { force: true });
        }
      } else {
        // User is signed OUT

        // --- THIS IS THE NEW LOGIC ---
        // 1. Capture the User ID *before* clearing the state.
        const uidToClear = currentUser?.uid;

        // 2. Now, clear the current user from state.
        setCurrentUser(null);
        setIsGoogleDriveConnected(false);
        console.log("Auth state changed: User is LOGGED OUT.");

        // 3. If we captured a UID, tell the backend to clear that user's cache.
        if (uidToClear) {
          window.electronAPI.clearBannerCache({ uid: uidToClear });
        }
        // --- END OF NEW LOGIC ---

        // Reset the rest of the app state as before
        setGames([]);
        setLocalCheckpoints([]);
        setCloudCheckpoints([]);
        setAppSettings(initialAppSettings);
        setActivityLog([]);
        setTheme(initialThemeSettings);
      }
      setIsLoading(false); // Finished loading/clearing data
    });

    return () => unsubscribe(); // Cleanup the listener when the app closes
  }, [addNotification]);



  useEffect(() => {
    const syncBannersToLocalCache = async () => {
      if (!currentUser) return; // Only run for logged-in users

      const gamesToCache = games.filter(g => g.customBannerUrl && !g.localBannerPath);
      if (gamesToCache.length === 0) return;

      console.log(`[Cache] Found ${gamesToCache.length} banners to cache.`);

      const updatedGames = [...games]; // Create a mutable copy

      for (const game of gamesToCache) {
        if (game.customBannerUrl) {
          const result = await window.electronAPI.downloadAndCacheBanner({
            url: game.customBannerUrl,
            uid: currentUser.uid
          });
          if (result.success && result.path) {
            const gameIndex = updatedGames.findIndex(g => g.id === game.id);
            if (gameIndex !== -1) {
              updatedGames[gameIndex].localBannerPath = result.path;
            }
          }
        }
      }
      setGames(updatedGames);
    };

    syncBannersToLocalCache();
  }, [games, currentUser]); // This hook runs whenever the games list or user changes

  const handlePathSelection = async (type: 'file' | 'folder' | 'any', setter: (path: string) => void) => {
    try {
      const path = await window.electronAPI.selectPath({ mode: type });
      if (path) setter(path);
    } catch (e) {
      console.error("Browse failed:", e);
    }
  };


  const handleUpdateUser = useCallback(async (updated: { username?: string; customAvatarPath?: string }) => {
    if (!currentUser) {
      addNotification("You must be logged in to update your profile.", "error");
      return;
    }

    setExtraProfile(prev => ({
      ...prev,
      ...(updated.username !== undefined && { username: updated.username }),
      ...(updated.customAvatarPath !== undefined && { customAvatarPath: updated.customAvatarPath })
    }));

    addNotification("Profile updated locally. Saving to cloud...", "info");
    // The debounce effect for saving to Firestore will pick this up.
  }, [currentUser, addNotification]);


  useEffect(() => {
    // This effect automatically SAVES the user's data whenever it changes.

    // Don't save if we're still loading or if no one is logged in.
    if (isLoading || !currentUser) {
      return;
    }

    // Use a timeout to "debounce" the save. This prevents saving on every single keystroke.
    const saveTimeout = setTimeout(() => {
      console.log("Data changed. Saving profile to Firestore for user:", currentUser.uid);

      const profileDataToSave = {
        games,
        localCheckpoints,
        cloudCheckpoints,
        appSettings,
        activityLog,
        theme,
        username: extraProfile.username,
        customAvatarPath: extraProfile.customAvatarPath,
        lastUpdated: new Date().toISOString(), // Good practice to store a timestamp
      };

      // Send the data to the main process to be saved securely in Firestore.
      window.electronAPI.setUserProfile({ uid: currentUser.uid, data: profileDataToSave });

    }, 2000); // 2-second delay

    // This cleanup function runs if the data changes again before the 2 seconds are up.
    // It cancels the previous save timeout, so only the latest changes get saved.
    return () => clearTimeout(saveTimeout);

  }, [games, localCheckpoints, cloudCheckpoints, appSettings, activityLog, theme, currentUser, isLoading, extraProfile]);


  // 5. Other Hooks and Handlers
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
      const effectiveMode = theme.mode === 'system' ? systemTheme : theme.mode;
      root.classList.add(effectiveMode);
    }
  }, [theme.mode]);

  useEffect(() => {
    if (typeof window.electronAPI.onSyncProgress === 'function') {
      window.electronAPI.onSyncProgress(({ gameName, progress, message }) => {
        const id = syncNotificationIds.current[gameName];
        if (id) {
          updateNotificationProgress(id, progress, message);
        }
      });
    }
  }, [updateNotificationProgress]);

  const handleScanForBackups = useCallback(async () => {
    addNotification("Scanning for backups...", 'info');
    // The `games` variable is now accessible here without error
    const backups = await window.electronAPI.scanForBackups(games);
    setFoundBackups(backups);
    if (backups.length > 0) {
      addNotification(`Found ${backups.length} backup(s).`, 'success');
    } else {
      addNotification(`No backups found.`, 'info');
    }
  }, [games, addNotification]);

  const handleDeleteBackup = (backupPath: string, gameName: string) => {
    setConfirmationDetails({
      title: `Delete Backup for ${gameName}?`,
      description: `This will permanently delete the backup folder at "${backupPath}". This action cannot be undone.`,
      confirmText: "Delete Backup",
      isDestructive: true,
      onConfirm: async () => {
        setIsConfirming(true);
        const result = await window.electronAPI.deleteBackup(backupPath);
        if (result.success) {
          addNotification(`Backup for ${gameName} deleted.`, 'success');
          setFoundBackups(currentBackups => currentBackups.filter(b => b.backupPath !== backupPath));
        } else {
          addNotification(`Error deleting backup: ${result.error}`, 'error', { force: true });
        }
        setIsConfirming(false);
        setShowConfirmationModal(false);
      }
    });
    setShowConfirmationModal(true);
  };


  const handleDeleteLogEntry = (id: string) => {
    setActivityLog(prevLog => prevLog.filter(entry => entry.id !== id));
  };

  const handleClearLog = () => {
    setActivityLog([]);
    addNotification("Activity log cleared.", 'info');
  };



  const handleAddGame = (newGameData: any) => {
    if (games.some(g => g.name.toLowerCase() === newGameData.name.toLowerCase())) {
      addNotification(`Game "${newGameData.name}" already exists.`, 'error');
      addLogEntry({ type: 'error', message: `Attempted to add duplicate game: ${newGameData.name}`, status: 'fail' });
      return;
    }

    const baseGame = { ...newGameData };
    // Set library hero image as the default banner and icon for newly added games
    // Prioritize coverUrl (Hero) if available from Steam Search, or bannerUrl if it's already Hero
    const heroUrl = baseGame.coverUrl || (baseGame.bannerUrl?.includes('library_hero') ? baseGame.bannerUrl : null);

    if (heroUrl) {
      baseGame.bannerUrl = heroUrl;
      baseGame.customBannerUrl = heroUrl;
    }

    // 4. Icon Logic: ALWAYS prefer the square community icon for the sidebar
    if (baseGame.iconUrl) {
      baseGame.customIconUrl = baseGame.iconUrl;
      baseGame.icon = baseGame.iconUrl; // For sidebar display fallback
    } else if (heroUrl) {
      // Last resort fallback
      baseGame.customIconUrl = heroUrl;
    }

    // Ensure no undefined values are passed to the game object to prevent Firestore crashes
    const safeGameData: any = {};
    Object.keys(baseGame).forEach(key => {
      safeGameData[key] = (baseGame[key] === undefined) ? null : baseGame[key];
    });

    const newGame: Game = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      lastSynced: "Never",
      enabled: true,
      ...safeGameData,
    } as Game;

    setGames(prevGames => [...prevGames, newGame]);
    addLogEntry({ type: 'info', message: `Added new game: ${newGame.name}`, status: 'info' });
    addNotification(`Added new game: ${newGame.name}`, 'success');
  };

  const handleSearchGameInfo = async (name: string) => {
    setGlobalSearchInput(name);
    setActiveTab('global-search');
    handlePerformGlobalSearch(name, 1);
  };

  const handlePerformGlobalSearch = async (query: string, page: number = 1) => {
    setIsSearchingGlobal(true);
    setGlobalSearchPage(page);
    try {
      const result = await window.electronAPI.searchSteam(query, {}, page) as any;
      const items = Array.isArray(result) ? result : (result?.items || []);
      setGlobalSearchResults(items);
      if (result?.total !== undefined) setGlobalSearchTotal(result.total);
      if (result?.totalPages !== undefined) setGlobalSearchTotalPages(result.totalPages);
      addLogEntry({ type: 'info', message: `Catalogue loaded: ${query || 'Top Sellers'} (Page ${page})`, status: 'info' });
    } catch (error) {
      console.error("Steam search error:", error);
      addNotification("Failed to load catalogue from Steam", "error");
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  // Initial Catalogue load - only run ONCE when tab is first opened
  const catalogueFetched = useRef(false);
  useEffect(() => {
    if (activeTab === 'global-search' && !catalogueFetched.current) {
      catalogueFetched.current = true;
      handlePerformGlobalSearch("", 1);
    }
    if (activeTab !== 'global-search') {
      // Reset so it reloads next time if results were cleared
      if (globalSearchResults.length === 0) {
        catalogueFetched.current = false;
      }
    }
  }, [activeTab]);

  const handleProcessGlobalSearchGame = async (steamGame: any) => {
    addNotification(`Fetching details for ${steamGame.name}...`, 'info', { icon: <Loader2 className="h-4 w-4 animate-spin" /> });
    try {
      const result = await window.electronAPI.getSteamAppDetails(steamGame.id);
      if (result.success) {
        const gameData: Game = {
          id: `steam-${steamGame.id}`,
          name: result.data.name,
          path: '', // Will be configured
          lastSynced: 'Never',
          enabled: true,
          bannerUrl: result.data.bannerUrl,
          coverArtUrl: result.data.coverArtUrl,
          summary: result.data.summary,
          developer: result.data.developer,
          genre: result.data.genres,
          icon: steamGame.iconUrl, // Use the high-quality community icon from search
          iconUrl: steamGame.iconUrl, // Also store it in iconUrl for consistency
        };
        setGameToConfigurePaths(gameData);
        setShowConfigureGamePathsModal(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      addNotification(`Failed to load details: ${error.message}`, 'error');
    }
  };

  const handleSelectGameFromSearch = async (selectedGame: Game) => {
    setShowGameSearchResultsModal(false);
    addNotification(`Fetching full game details for ${selectedGame.name}...`, 'info', { icon: <Loader2 className="h-4 w-4 animate-spin" /> });

    try {
      // Handle both IGDB and Steam style IDs
      const cleanId = selectedGame.id.replace('igdb-', '').replace('steam-', '');
      const detailsResult = await window.electronAPI.getSteamAppDetails(cleanId);

      const gameForConfig: Game = {
        ...selectedGame,
        bannerUrl: undefined,
        coverArtUrl: undefined,
        iconUrl: selectedGame.iconUrl, // Preserve the community icon from search
      };

      if (detailsResult.success) {
        addNotification(`Details for ${selectedGame.name} loaded!`, 'success');
        gameForConfig.summary = detailsResult.data.summary || selectedGame.summary;
        gameForConfig.bannerUrl = detailsResult.data.bannerUrl;
        gameForConfig.coverArtUrl = detailsResult.data.coverArtUrl;
        // Keep the iconUrl from search if details doesn't provide a better one
        gameForConfig.iconUrl = detailsResult.data.iconUrl || selectedGame.iconUrl;
      } else {
        addNotification(`Could not fetch full details for ${selectedGame.name}.`, 'info');
      }

      setGameToConfigurePaths(gameForConfig);
      setShowConfigureGamePathsModal(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addNotification(`Error fetching details: ${errorMessage}`, 'error', { force: true });
      setGameToConfigurePaths(selectedGame);
      setShowConfigureGamePathsModal(true);
    }
  };

  const handleAddGameAfterPathConfig = (gameData: Omit<Game, 'id' | 'lastSynced' | 'enabled' | 'icon'>) => {
    handleAddGame(gameData);
    setShowConfigureGamePathsModal(false);
    setGameToConfigurePaths(null);
  };

  const handleSyncGame = async (gameId: string, provider: Checkpoint['provider'] | 'Local' = 'Local', direction: 'to_cloud' | 'from_cloud' = 'to_cloud') => {
    const game = games.find(g => g.id === gameId);
    if (!game) {
      addNotification(`Game not found (ID: ${gameId}) for sync.`, 'error', { force: true });
      return;
    }
    const directionMsg = direction === 'to_cloud' ? 'to' : 'from';
    const notificationId = addNotification(`${direction === 'to_cloud' ? 'Syncing' : 'Downloading'} ${game.name} ${directionMsg} ${provider}...`, 'info', { progress: 0 });
    syncNotificationIds.current[game.name] = notificationId;
    try {
      if (direction === 'from_cloud') {
        const relevantCloudCheckpoints = cloudCheckpoints
          .filter(cp => cp.gameId === gameId && cp.provider === provider)
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        if (relevantCloudCheckpoints.length === 0) {
          addNotification(`No cloud backups found for ${game.name} on ${provider}.`, 'error');
          addLogEntry({ type: 'error', message: `Sync from cloud failed: No backups found for ${game.name} on ${provider}`, status: 'fail' });
          return;
        }

        const latestCheckpoint = relevantCloudCheckpoints[0];
        handleRestoreCloudCheckpoint(latestCheckpoint.id);
        return;
      }

      let resultMessage = '';
      let syncSuccessful = false;
      if (provider === 'Google Drive') {
        const result = await window.electronAPI.syncGameToGoogleDrive({ gameName: game.name, gamePath: game.path });
        if (!result.success) throw new Error(result.error || "Google Drive sync failed.");
        resultMessage = `Google Drive sync complete for ${game.name}.`;
        syncSuccessful = true;
        setGoogleDriveLastSync(new Date().toLocaleString());
      } else if (provider === 'Local') {
        updateNotificationProgress(notificationId, 50, "Copying files locally...");
        const destinationPath = `${appSettings.defaultLocalSyncPath}/${game.name.replace(/[^\w.-]/g, '_')}`;
        const localResult = await window.electronAPI.syncGameLocal({ sourcePath: game.path, destinationPath: destinationPath });
        if (!localResult.success) throw new Error(localResult.error || "Local sync failed in backend.");
        resultMessage = `Local sync complete for ${game.name}.`;
        syncSuccessful = true;
      } else if (provider === 'GitHub') {
        if (!isGithubConnected) {
          addNotification('GitHub is not configured. Please set it up in Cloud Sync settings.', 'error', { force: true });
          delete syncNotificationIds.current[game.name];
          removeNotification(notificationId);
          return;
        }
        updateNotificationProgress(notificationId, 50, "Zipping and pushing to GitHub...");
        const githubResult = await window.electronAPI.syncGameToGithub({ gameName: game.name, gamePath: game.path });
        if (!githubResult.success) {
          throw new Error(githubResult.error || "Unknown GitHub sync failed.");
        }
        resultMessage = `GitHub sync complete for ${game.name}. ${githubResult.url ? `View: ${githubResult.url}` : ''}`;
        syncSuccessful = true;
        setGithubLastSync(new Date().toLocaleString());
      }
      else {
        addNotification(`Simulating sync to ${provider} for ${game.name}...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 1500));
        resultMessage = `Simulated sync to ${provider} for ${game.name} complete.`;
        syncSuccessful = true;
      }
      if (syncSuccessful) {
        updateNotificationProgress(notificationId, 100, resultMessage);
        setGames(prevGames => prevGames.map(g => g.id === gameId ? { ...g, lastSynced: new Date().toLocaleString() } : g));
        addLogEntry({ type: 'sync', message: resultMessage, gameName: game.name, status: 'success' });
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unknown sync error occurred";
      addLogEntry({ type: 'sync', message: `Sync to ${provider} for ${game.name} FAILED: ${errorMessage}`, gameName: game.name, status: 'fail' });
      addNotification(`Sync to ${provider} for ${game.name} FAILED: ${errorMessage}`, 'error', { force: true });
    } finally {
      delete syncNotificationIds.current[game.name];
    }
  };

  const handleInitiateSingleGameSync = (gameId: string) => {
    // ALWAYS show the modal now, so user can choose direction (To Cloud / From Cloud)
    // as requested by the user.
    setSyncingGameId(gameId);
    setSyncingAllGames(false);
    setShowSyncOptionsModal(true);
  };

  const handleInitiateSyncAllEnabled = () => {
    // ALWAYS show the modal now, so user can choose direction (To Cloud / From Cloud)
    // for consistency with individual sync.
    setSyncingGameId(undefined);
    setSyncingAllGames(true);
    setShowSyncOptionsModal(true);
  };

  const handleSyncAllToProvider = async (provider: Checkpoint['provider'] | 'Local', direction: 'to_cloud' | 'from_cloud' = 'to_cloud') => {
    const enabledGames = games.filter(game => game.enabled);
    if (enabledGames.length === 0) {
      addLogEntry({ type: 'sync', message: "No enabled games to sync.", status: 'info' });
      addNotification("No enabled games to sync.", 'info');
      return;
    }
    addNotification(`${direction === 'to_cloud' ? 'Syncing' : 'Downloading'} all ${enabledGames.length} games ${direction === 'to_cloud' ? 'to' : 'from'} ${provider}...`, 'info', { icon: <Loader2 className="h-5 w-5 animate-spin" /> });
    for (const game of enabledGames) {
      await handleSyncGame(game.id, provider, direction);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    addLogEntry({ type: 'sync', message: `${direction === 'to_cloud' ? 'Sync' : 'Download'} all enabled games ${direction === 'to_cloud' ? 'to' : 'from'} ${provider} complete.`, status: 'success' });
    addNotification(`${direction === 'to_cloud' ? 'Sync' : 'Download'} all games to ${provider} complete.`, 'success');
  };

  const handleToggleEnableGame = (gameId: string, enabled: boolean) => {
    // Read the game BEFORE queuing the state update to avoid stale closure
    const game = games.find(g => g.id === gameId);
    setGames(prevGames =>
      prevGames.map(g =>
        g.id === gameId ? { ...g, enabled: enabled } : g
      )
    );
    if (game) {
      addLogEntry({ type: 'info', message: `${game.name} sync ${enabled ? 'enabled' : 'disabled'}.`, gameName: game.name, status: 'info' });
      addNotification(`${game.name} sync ${enabled ? 'enabled' : 'disabled'}.`, 'info');
    }
  };

  const handleEditGame = (gameId: string) => {
    const gameToEdit = games.find(game => game.id === gameId);
    if (gameToEdit) {
      setGameToEdit(gameToEdit);
      setShowEditGameModal(true);
    }
  };

  const handleSaveEditedGame = (editedGame: Game) => {
    setGames(prevGames =>
      prevGames.map(game =>
        game.id === editedGame.id ? editedGame : game
      )
    );
    setShowEditGameModal(false);
    setGameToEdit(null);
    addLogEntry({ type: 'info', message: `Edited game details for: ${editedGame.name}`, gameName: editedGame.name, status: 'info' });
    addNotification(`Game details for ${editedGame.name} updated.`, 'success');
  };

  const handleDeleteGame = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const associatedLocalCheckpoints = localCheckpoints.filter(cp => cp.gameId === gameId);
    const associatedCloudCheckpoints = cloudCheckpoints.filter(cp => cp.gameId === gameId);

    setConfirmationDetails({
      title: `Delete ${game.name}?`,
      description: `This will remove the game from your library.`,
      confirmText: "Delete Game",
      onConfirm: async () => {
        setIsConfirming(true);

        // --- THIS BLOCK DELETES THE BANNER ---
        if (game.customBannerUrl && game.customBannerUrl.startsWith('http')) {
          addNotification(`Deleting cloud banner for ${game.name}...`, 'info');
          await window.electronAPI.deleteBannerFromSupabase({ url: game.customBannerUrl });
        }
        // --- END BANNER DELETION ---

        // This line removes the game card from the UI
        setGames(prevGames => prevGames.filter(g => g.id !== gameId));

        // --- CHECKPOINT DELETION LINES ARE GONE ---
        // Notice that the lines to delete checkpoints are NOT here.
        // This means checkpoints are PRESERVED.

        await new Promise(resolve => setTimeout(resolve, 300));
        addNotification(`Deleted game entry: ${game.name}`, 'info');
        addLogEntry({ type: 'info', message: `Deleted game entry: ${game.name}. Checkpoints were preserved.`, status: 'info', gameName: game.name });
        setIsConfirming(false);
        setShowConfirmationModal(false);
      },
      isDestructive: true,
      confirmPhrase: 'delete',
    });
    setShowConfirmationModal(true);
  };

  const handleChangeGameLocation = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      setGameToChangeLocation(game);
      setShowChangeLocationModal(true);
    }
  };

  const handleSaveGameLocation = (gameId: string, newLocation: string) => {
    // Read the game BEFORE queuing the state update to avoid stale closure
    const game = games.find(g => g.id === gameId);
    setGames(prevGames =>
      prevGames.map(g =>
        g.id === gameId ? { ...g, path: newLocation } : g
      )
    );
    setShowChangeLocationModal(false);
    setGameToChangeLocation(null);
    if (game) {
      addLogEntry({ type: 'info', message: `Changed location for ${game.name} to: ${newLocation}`, gameName: game.name, status: 'info' });
      addNotification(`Location updated for ${game.name}`, 'success');
    }
  };

  const handleOpenDirectory = (gamePath: string) => {
    addLogEntry({ type: 'info', message: `Request to open directory: ${gamePath}`, status: 'info' });
    window.electronAPI.openPath(gamePath);
  };

  const handleViewGameDetails = (game: Game) => {
    setSelectedGameForDetailPage(game);
  };

  const handleLaunchGame = (game: Game) => {
    if (!game.launchPath) {
      addNotification(`No launch path configured for ${game.name}.`, 'error');
      return;
    }

    // Play time tracking: record session start time
    const storageKey = `playtime_${game.id}`;
    localStorage.setItem(`${storageKey}_sessionStart`, Date.now().toString());

    addNotification(`Launching ${game.name}...`, 'info');
    window.electronAPI.launchGame(game.launchPath);

    // For demo purposes, we also add some time immediately since we can't track process exit easily in this web-only logic
    const currentTotal = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const addedTime = 600; // adding 10 minutes simulated for now
    localStorage.setItem(storageKey, (currentTotal + addedTime).toString());
  };

  const handleAutoDetectGames = async () => {
    addNotification("Scanning for installed games via manifest...", 'info', { icon: <Loader2 className="h-5 w-5 animate-spin" /> });
    addLogEntry({ type: 'info', message: "Starting game auto-detection using Ludusavi manifest.", status: 'info' });

    try {
      const detected = await window.electronAPI.scanForGames();

      if (detected.length > 0) {
        addNotification(`Found ${detected.length} IDs. Resolving metadata...`, 'info', { icon: <RefreshCcw className="h-4 w-4 animate-spin" /> });

        // Resolve real names and metadata for each detected game
        const richDetected = await Promise.all(detected.map(async (game: any) => {
          try {
            const result = await window.electronAPI.getSteamAppDetails(game.steamId);
            if (result && result.success && result.data) {
              const details = result.data;
              return {
                ...game,
                name: details.name,
                summary: details.summary || details.short_description || "",
                bannerUrl: details.bannerUrl || game.bannerUrl,
                coverArtUrl: details.coverArtUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steamId}/library_600x900.jpg`,
                genre: details.genres || [],
                developer: details.developer,
                publisher: details.publisher,
                iconUrl: details.iconUrl,
              };
            }
          } catch (e) {
            console.warn(`Failed to resolve metadata for ${game.steamId}`, e);
          }
          return game;
        }));

        setAutoDetectedGames(richDetected);
        setActiveTab('discovery');
        addNotification(`Discovery complete! Found ${detected.length} games.`, 'success');
      } else {
        setAutoDetectedGames([]);
        setActiveTab('discovery');
        addNotification("Discovery complete. No new games found.", 'info');
      }
    } catch (error) {
      console.error("Discovery error:", error);
      addNotification("Discovery scan failed.", "error");
    }
  };

  const handleAddDetectedGamesFromDiscovery = (gamesToAdd: PotentialGame[]) => {
    let countAdded = 0;
    gamesToAdd.forEach(gameBlueprint => {
      const { tempId, ...newGameData } = gameBlueprint;

      // Check if game already exists by name or path
      const exists = games.some(g =>
        g.name.toLowerCase() === newGameData.name.toLowerCase() ||
        g.path.toLowerCase() === newGameData.path.toLowerCase()
      );

      if (!exists) {
        // We use Omit because handleAddGame expects clean data
        const cleanGameData = {
          name: newGameData.name,
          path: newGameData.path,
          bannerUrl: newGameData.bannerUrl,
          coverArtUrl: newGameData.coverArtUrl,
          summary: newGameData.summary,
          genre: gameBlueprint.genre,
          publisher: gameBlueprint.publisher,
          developer: gameBlueprint.developer,
          size: gameBlueprint.size,
          iconUrl: newGameData.iconUrl,
          icon: newGameData.iconUrl || newGameData.bannerUrl
        };

        handleAddGame(cleanGameData as any);
        countAdded++;
      }
    });

    if (countAdded > 0) {
      addNotification(`Successfully linked ${countAdded} game(s) to your library.`, 'success');
      addLogEntry({ type: 'info', message: `Added ${countAdded} games from Discovery tab.`, status: 'success' });
    } else if (gamesToAdd.length > 0) {
      addNotification(`Selected games are already in your library.`, 'info');
    }
  };

  const handleAddDetectedGamesFromModal = (gamesToAddFromModal: PotentialGame[]) => {
    let countAdded = 0;
    gamesToAddFromModal.forEach(gameBlueprint => {
      const { tempId, ...newGameData } = gameBlueprint;
      if (!games.some(g => g.name.toLowerCase() === newGameData.name.toLowerCase())) {
        handleAddGame(newGameData);
        countAdded++;
      }
    });
    if (countAdded > 0) {
      addNotification(`Added ${countAdded} game(s) from auto-detection.`, 'success');
    } else if (gamesToAddFromModal.length > 0) {
      addNotification(`Selected game(s) already exist.`, 'info');
    }
    setShowAutoDetectGamesModal(false);
    setAutoDetectedGames([]);
  };

  const handleCreateLocalCheckpoint = async (gameId: string, description: string = "Manual Checkpoint") => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    try {
      addNotification(`Creating checkpoint for ${game.name}...`, 'info');
      const result = await window.electronAPI.createLocalCheckpoint({
        gameId: game.id,
        gamePath: game.path,
        checkpointBasePath: appSettings.localCheckpointsBasePath,
        description: description,
      });
      // The 'result' object now includes 'size' in bytes
      if (result.success && result.path && result.size !== undefined) {
        const newCheckpoint: Checkpoint = {
          id: `cp-${Date.now()}`,
          gameId: game.id,
          gameName: game.name,
          time: new Date().toLocaleString(),
          description: description || "Manual Checkpoint",
          provider: 'Local',
          size: formatBytes(result.size), // Use the real size from the backend
          type: 'individual',
        };
        setLocalCheckpoints(prev => [...prev, newCheckpoint]);
        addNotification(`Local checkpoint created for ${game.name}.`, 'success');
      } else {
        throw new Error(result.error || "Checkpoint creation failed in the backend.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Checkpoint creation failed.";
      addNotification(`Failed to create checkpoint: ${errorMessage}`, 'error');
    }
  };

  const handleInitiateCreateCheckpointForAll = () => {
    setCheckpointAllType('local');
    setShowCheckpointAllOptionsModal(true);
  };

  const handleCreateIndividualLocalCheckpointsForAll = async () => {
    setShowCheckpointAllOptionsModal(false);
    const enabledGames = games.filter(game => game.enabled);
    if (enabledGames.length === 0) {
      addLogEntry({ type: 'checkpoint_create', message: "No enabled games to create checkpoints for.", status: 'info' });
      addNotification("No enabled games to create checkpoints for.", 'info');
      return;
    }
    for (const game of enabledGames) {
      handleCreateLocalCheckpoint(game.id, "Automatic checkpoint (All Enabled Games)");
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    addLogEntry({ type: 'checkpoint_create', message: "Creating individual local checkpoints for all enabled games complete.", status: 'success' });
    addNotification("Created local checkpoints for all enabled games.", 'success');
  };

  const handleCreateFolderLocalCheckpointForAll = async () => {
    setShowCheckpointAllOptionsModal(false);
    const enabledGames = games.filter(game => game.enabled);
    if (enabledGames.length === 0) {
      addLogEntry({ type: 'checkpoint_create', message: "No enabled games to create checkpoints for.", status: 'info' });
      addNotification("No enabled games to create checkpoints for.", 'info');
      return;
    }
    const now = new Date();
    const description = `Folder Checkpoint - All Enabled Games - ${now.toLocaleString()}`;
    const folderCheckpointGameId = 'all-enabled-games-folder';
    const newCheckpoint: Checkpoint = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      gameId: folderCheckpointGameId,
      gameName: "Folder Checkpoint",
      time: now.toLocaleString(),
      description: description,
      provider: 'Local',
      size: generateCheckpointSize(),
      type: 'folder',
    };
    setLocalCheckpoints(prevCheckpoints => [...prevCheckpoints, newCheckpoint]);
    addLogEntry({ type: 'checkpoint_create', message: `Created folder local checkpoint for all enabled games.`, status: 'success' });
    addNotification("Created local folder checkpoint for all games.", 'success');
  };

  const handleRestoreLocalCheckpoint = (checkpointId: string) => {
    const checkpoint = localCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint?.path) {
      addNotification("Checkpoint path is missing. Cannot restore.", 'error');
      return;
    }
    const game = games.find(g => g.id === checkpoint.gameId);

    setConfirmationDetails({
      title: `Confirm Restore Checkpoint`,
      description: game
        ? `This will overwrite your current saves for ${checkpoint.gameName}. A backup of your current save will be created first.`
        : `This checkpoint's game is missing from your library. Please select the folder where you want to restore these saves.`,
      confirmText: game ? "Restore" : "Select Folder & Restore",
      onConfirm: async () => {
        setIsConfirming(true);
        try {
          let targetPath = game?.path;

          if (!targetPath) {
            const selectedPath = await window.electronAPI.selectPath({ mode: 'folder' });
            if (!selectedPath) {
              setIsConfirming(false);
              setShowConfirmationModal(false);
              return;
            }
            targetPath = selectedPath;
          }

          const result = await window.electronAPI.restoreLocalCheckpoint({
            checkpointPath: checkpoint.path!,
            gamePath: targetPath
          });
          if (!result.success) {
            throw new Error(result.error);
          }
          addNotification(`Restored checkpoint for ${checkpoint.gameName}`, 'success');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Restore failed.";
          addNotification(`Restore failed: ${errorMessage}`, 'error', { force: true });
        } finally {
          setIsConfirming(false);
          setShowConfirmationModal(false);
        }
      },
      isDestructive: true,
    });
    setShowConfirmationModal(true);
  };

  const handleDeleteLocalCheckpoint = (checkpointId: string) => {
    const checkpoint = localCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint?.path) {
      addNotification("Checkpoint path is missing. Cannot delete from disk.", 'error');
      return;
    }
    setConfirmationDetails({
      title: `Confirm Delete Checkpoint`,
      description: `This will permanently delete the checkpoint folder from your hard drive. This action cannot be undone.`,
      confirmText: "Delete",
      onConfirm: async () => {
        setIsConfirming(true);
        try {
          const result = await window.electronAPI.deleteLocalCheckpoint({ checkpointPath: checkpoint.path! });
          if (result.success) {
            setLocalCheckpoints(prev => prev.filter(cp => cp.id !== checkpointId));
            addNotification(`Deleted local checkpoint for ${checkpoint.gameName}`, 'info');
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Deletion failed.";
          addNotification(`Deletion failed: ${errorMessage}`, 'error', { force: true });
        } finally {
          setIsConfirming(false);
          setShowConfirmationModal(false);
        }
      },
      isDestructive: true,
    });
    setShowConfirmationModal(true);
  };

  const handleOpenCheckpointDirectory = (checkpointId: string) => {
    const checkpoint = localCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) return;
    addLogEntry({ type: 'info', message: `Opening directory for local checkpoint: ${checkpoint.gameName}`, gameName: checkpoint.gameName, status: 'info' });
    if (checkpoint.path) {
      window.electronAPI.openPath(checkpoint.path);
    } else {
      addNotification("No path stored for this checkpoint.", 'error');
    }
  };

  const handleOpenFolderCheckpointLocation = (checkpointId: string) => {
    const checkpoint = localCheckpoints.find(cp => cp.id === checkpointId) || cloudCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint || checkpoint.type !== 'folder') return;
    addLogEntry({ type: 'info', message: `Request to open location for folder checkpoint: ${checkpoint.description}`, status: 'info' });
  };

  const handleUploadCloudCheckpointToGithub = async (
    gamesToBackupDetails: Array<{ id: string; name: string; path: string }>,
    isFolderType: boolean,
    description: string,
    providerGameNameOverride?: string
  ): Promise<{ success: boolean; url?: string; message?: string }> => {
    if (!isGithubConnected) {
      addNotification('GitHub is not configured. Please set it up in Cloud Sync settings.', 'error', { force: true });
      return { success: false, message: 'GitHub not configured.' };
    }
    if (!gamesToBackupDetails || gamesToBackupDetails.length === 0) {
      addNotification('No game(s) selected for GitHub checkpoint.', 'info');
      return { success: false, message: 'No games selected.' };
    }
    const gameNamesForNotif = isFolderType ? (providerGameNameOverride || 'Selected Games') : gamesToBackupDetails.map(g => g.name).join(', ');
    addNotification(`Creating GitHub checkpoint release for: ${gameNamesForNotif}...`, 'info', { icon: <Loader2 className="h-5 w-5 animate-spin" /> });
    try {
      const result = await window.electronAPI.createGithubCheckpointRelease({
        gamesToBackup: gamesToBackupDetails,
        isFolderCheckpoint: isFolderType,
        checkpointDescription: description,
        providerGameName: isFolderType ? (providerGameNameOverride || "Folder-Checkpoint") : undefined
      });
      if (result.success && result.url && result.size !== undefined) {
        addLogEntry({
          type: 'checkpoint_create',
          message: `GitHub checkpoint release '${result.releaseName}' created. URL: ${result.url}`,
          gameName: gameNamesForNotif,
          status: 'success'
        });
        addNotification(result.message || 'GitHub checkpoint release created successfully!', 'success');
        const newCheckpointEntry: Checkpoint = {
          id: result.releaseTag || `gh-cp-${Date.now()}`,
          gameId: isFolderType ? 'all-enabled-games-folder' : gamesToBackupDetails[0].id,
          gameName: isFolderType ? (providerGameNameOverride || 'Folder Checkpoint') : gamesToBackupDetails[0].name,
          time: new Date().toISOString(),
          description: `${description || 'GitHub Release Checkpoint'}`.trim(),
          provider: 'GitHub',
          size: formatBytes(result.size),
          type: isFolderType ? 'folder' : 'individual',
          cloudLink: result.url,
          path: undefined,
        };
        setCloudCheckpoints(prev => [...prev, newCheckpointEntry]);
        return { success: true, url: result.url, message: result.message };
      } else {
        throw new Error(result.error || "Failed to create GitHub checkpoint release in main process.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred with GitHub checkpoint.";
      addLogEntry({ type: 'error', message: `GitHub checkpoint creation FAILED for ${gameNamesForNotif}: ${errorMessage}`, gameName: gameNamesForNotif, status: 'fail' });
      addNotification(`GitHub Checkpoint FAILED: ${errorMessage}`, 'error', { force: true });
      return { success: false, message: errorMessage };
    }
  };

  const handleUploadCloudCheckpoint = async (gameId: string, provider: Checkpoint['provider'], description: string, type: Checkpoint['type'] = 'individual') => {
    const game = games.find(g => g.id === gameId);
    if (!game || !provider) return;
    if (provider === 'Google Drive') {
      addNotification(`Uploading checkpoint for ${game.name} to Google Drive...`, 'info', { icon: <Loader2 className="h-5 w-5 animate-spin" /> });
      try {
        const result = await window.electronAPI.createGoogleDriveCheckpoint({
          gamesToBackup: [{ name: game.name, path: game.path }],
          isFolderCheckpoint: false,
          description: description
        });
        if (result.success && result.fileId && result.size !== undefined) {
          const newCheckpoint: Checkpoint = {
            id: result.fileId,
            cloudFileId: result.fileId,
            gameId: game.id,
            gameName: game.name,
            time: new Date().toISOString(),
            description: description || `Checkpoint: ${result.fileName}`,
            provider: 'Google Drive',
            size: formatBytes(result.size),
            type: 'individual',
          };
          setCloudCheckpoints(prev => [...prev, newCheckpoint]);
          addLogEntry({ type: 'checkpoint_create', message: `Cloud checkpoint to Google Drive for: ${game.name}`, gameName: game.name, status: 'success' });
          addNotification(`Cloud checkpoint for ${game.name} created on Google Drive.`, 'success');
        } else {
          throw new Error(result.error || 'Failed to create Google Drive checkpoint.');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error.";
        addNotification(`Google Drive Checkpoint Failed: ${msg}`, 'error', { force: true });
      }
    } else if (provider === 'GitHub') {
      await handleUploadCloudCheckpointToGithub(
        [{ id: game.id, name: game.name, path: game.path }],
        false,
        description
      );
    } else {
      addNotification(`Simulating cloud checkpoint for ${game.name} to ${provider}...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newCheckpoint: Checkpoint = {
        id: `ccp-sim-${game.id}-${Date.now()}`,
        gameId: game.id,
        gameName: game.name,
        time: new Date().toISOString(),
        description: description || "Simulated Cloud Checkpoint",
        provider: provider,
        size: '123 MB', // Simulated size
        type: 'individual',
        cloudLink: `https://your-simulated-${provider.toLowerCase().replace(' ', '')}.com/link/to/${game.id}`,
        path: undefined,
      };
      setCloudCheckpoints(prev => [...prev, newCheckpoint]);
      addLogEntry({ type: 'checkpoint_create', message: `Simulated cloud checkpoint to ${provider} for: ${game.name}`, gameName: game.name, status: 'success' });
      addNotification(`Simulated cloud checkpoint for ${game.name} to ${provider} created.`, 'success');
    }
  };


  const handleInitiateUploadCheckpointForAll = () => {
    setCheckpointAllType('cloud');
    setShowCheckpointAllOptionsModal(true);
  };

  const handleCreateIndividualCloudCheckpointsForAll = async (provider?: Checkpoint['provider']) => {
    setShowCheckpointAllOptionsModal(false);
    if (!provider) {
      addNotification("Please select a cloud provider.", 'error');
      addLogEntry({ type: 'error', message: "No cloud provider selected for 'all games' individual checkpoint.", status: 'fail' });
      return;
    }
    const enabledGamesDetails = games.filter(game => game.enabled).map(g => ({ id: g.id, name: g.name, path: g.path }));
    if (enabledGamesDetails.length === 0) {
      addNotification("No enabled games to create cloud checkpoints for.", 'info');
      addLogEntry({ type: 'cloud_checkpoint_all', message: "No enabled games for 'all games' individual checkpoint.", status: 'info' });
      return;
    }
    addNotification(`Starting to create individual cloud checkpoints for ${enabledGamesDetails.length} games to ${provider}...`, 'info', { icon: <Loader2 className="h-5 w-5 animate-spin" /> });
    let successCount = 0;
    let failCount = 0;
    for (const gameDetail of enabledGamesDetails) {
      const description = `Automatic Individual Checkpoint - ${gameDetail.name} - ${new Date().toLocaleString()}`;
      let currentOperationSucceeded = false;
      try {
        if (provider === 'GitHub') {
          const result = await handleUploadCloudCheckpointToGithub([gameDetail], false, description);
          if (result.success) {
            currentOperationSucceeded = true;
          }
        } else {
          await handleUploadCloudCheckpoint(gameDetail.id, provider, description);
          currentOperationSucceeded = true;
        }
      } catch (error) {
        console.error(`Failed to create individual checkpoint for ${gameDetail.name}:`, error);
        currentOperationSucceeded = false;
      }
      if (currentOperationSucceeded) {
        successCount++;
      } else {
        failCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    const finalMessage = `Finished creating individual cloud checkpoints to ${provider}. Succeeded: ${successCount}, Failed: ${failCount}.`;
    const finalStatus = failCount > 0 ? (successCount > 0 ? 'info' : 'fail') : 'success';
    addLogEntry({ type: 'cloud_checkpoint_all', message: finalMessage, status: finalStatus });
    addNotification(finalMessage, finalStatus === 'fail' ? 'error' : (finalStatus === 'info' ? 'info' : 'success'));
  };

  const handleCreateFolderCloudCheckpointForAll = async (provider?: Checkpoint['provider']) => {
    setShowCheckpointAllOptionsModal(false);
    if (!provider) {
      addNotification("Please select a cloud provider.", 'error');
      addLogEntry({ type: 'error', message: "No cloud provider selected for 'all games' folder checkpoint.", status: 'fail' });
      return;
    }
    const enabledGamesDetails = games.filter(game => game.enabled).map(g => ({ name: g.name, path: g.path }));
    if (enabledGamesDetails.length === 0) {
      addNotification("No enabled games to create a folder cloud checkpoint for.", 'info');
      addLogEntry({ type: 'cloud_checkpoint_all', message: "No enabled games for 'all games' folder checkpoint.", status: 'info' });
      return;
    }
    const description = `Folder Checkpoint - All Enabled Games - ${new Date().toLocaleString()}`;
    const providerGameNameForUI = "Folder Checkpoint (All Games)";
    if (provider === 'Google Drive') {
      addNotification(`Creating folder checkpoint for all games on Google Drive...`, 'info', { icon: <Loader2 className="h-5 w-5 animate-spin" /> });
      try {
        const result = await window.electronAPI.createGoogleDriveCheckpoint({
          gamesToBackup: enabledGamesDetails,
          isFolderCheckpoint: true,
          description: description,
          providerGameName: providerGameNameForUI,
        });
        if (result.success && result.fileId) {
          const newCheckpoint: Checkpoint = {
            id: result.fileId,
            cloudFileId: result.fileId,
            gameId: 'all-enabled-games-folder',
            gameName: providerGameNameForUI,
            time: new Date().toISOString(),
            description: description,
            provider: 'Google Drive',
            size: generateCheckpointSize(),
            type: 'folder',
          };
          setCloudCheckpoints(prev => [...prev, newCheckpoint]);
          addLogEntry({ type: 'cloud_checkpoint_all', message: `Created folder cloud checkpoint to Google Drive.`, status: 'success' });
          addNotification(`Folder checkpoint created on Google Drive.`, 'success');
        } else {
          throw new Error(result.error || 'Failed to create folder checkpoint on Google Drive.');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error.";
        addLogEntry({ type: 'error', message: `Google Drive Folder Checkpoint FAILED: ${msg}`, status: 'fail' });
        addNotification(`Google Drive Folder Checkpoint FAILED: ${msg}`, 'error', { force: true });
      }
    } else if (provider === 'GitHub') {
      await handleUploadCloudCheckpointToGithub(enabledGamesDetails.map(g => ({ ...g, id: '' })), true, description, providerGameNameForUI);
    } else {
      addNotification(`Simulating folder cloud checkpoint for all enabled games to ${provider}...`, 'info');
      await new Promise(resolve => setTimeout(resolve, 1500));
      const newCheckpoint: Checkpoint = {
        id: `ccp-sim-all-folder-${Date.now()}`,
        gameId: 'all-enabled-games-folder',
        gameName: providerGameNameForUI,
        time: new Date().toISOString(),
        description: description,
        provider: provider,
        size: generateCheckpointSize(),
        type: 'folder',
        cloudLink: `https://your-simulated-${provider.toLowerCase().replace(/\s+/g, '')}.com/link/to/folder_${Date.now()}`,
        path: undefined,
      };
      setCloudCheckpoints(prev => [...prev, newCheckpoint]);
      addLogEntry({ type: 'cloud_checkpoint_all', message: `Simulated folder cloud checkpoint to ${provider} for all enabled games.`, status: 'success' });
      addNotification(`Simulated folder cloud checkpoint to ${provider} created.`, 'success');
    }
  };

  const handleRestoreCloudCheckpoint = (checkpointId: string) => {
    const checkpoint = cloudCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) { addNotification("Checkpoint not found.", "error"); return; }
    const game = games.find(g => g.id === checkpoint.gameId);
    setConfirmationDetails({
      title: `Confirm Restore Cloud Checkpoint`,
      description: game
        ? `This will overwrite your current saves for ${checkpoint.gameName}. A backup of current saves will be attempted.`
        : `This checkpoint's game is missing from your library. Please select the folder where you want to restore these saves.`,
      confirmText: game ? "Restore" : "Select Folder & Restore",
      onConfirm: async () => {
        setIsConfirming(true);
        let restoreSuccessful = false;
        let restoreMessage = "";
        if (!checkpoint.provider) {
          addNotification("Cannot restore: this checkpoint has no provider set.", 'error', { force: true });
          setIsConfirming(false); setShowConfirmationModal(false); return;
        }
        if (checkpoint.provider === 'Google Drive') {
          if (!checkpoint.cloudFileId) {
            addNotification("Google Drive file ID is missing. Cannot restore.", "error", { force: true });
            setIsConfirming(false); setShowConfirmationModal(false); return;
          }
          try {
            let targetPath = game?.path;
            if (!targetPath) {
              const selectedPath = await window.electronAPI.selectPath({ mode: 'folder' });
              if (!selectedPath) {
                setIsConfirming(false);
                setShowConfirmationModal(false);
                return;
              }
              targetPath = selectedPath;
            }

            const notificationId = addNotification(`Restoring ${checkpoint.gameName} from Google Drive...`, 'info', { progress: 0 });
            syncNotificationIds.current[checkpoint.gameName] = notificationId;

            const result = await window.electronAPI.restoreGoogleDriveCheckpoint({ fileId: checkpoint.cloudFileId, gamePath: targetPath, gameName: checkpoint.gameName });
            if (result.success) {
              restoreSuccessful = true;
              restoreMessage = `Restored ${checkpoint.gameName} from Google Drive.`;
              updateNotificationProgress(notificationId, 100, restoreMessage);
              if (game) {
                setGames(prevGames => prevGames.map(g => g.id === game.id ? { ...g, lastSynced: new Date().toISOString() } : g));
              }
              delete syncNotificationIds.current[checkpoint.gameName];
            } else {
              throw new Error(result.error || 'Failed to restore from Google Drive.');
            }
          } catch (error: any) {
            const errorMessage = error.message || "Unknown error restoring from Google Drive.";
            addNotification(`Google Drive Restore Failed: ${errorMessage}`, 'error', { force: true });
            delete syncNotificationIds.current[checkpoint.gameName];
          }
        } else if (checkpoint.provider === 'GitHub') {
          if (!checkpoint.id) {
            addNotification("GitHub checkpoint tag is missing. Cannot restore.", "error", { force: true });
            setIsConfirming(false); setShowConfirmationModal(false); return;
          }
          if (checkpoint.type === 'folder') {
            addNotification("Restoring 'folder' type GitHub checkpoints for all games requires a more specific restore process. This direct restore is for individual game checkpoints.", "info", { force: true });
            setIsConfirming(false); setShowConfirmationModal(false); return;
          }

          try {
            let targetPath = game?.path;
            if (!targetPath) {
              const selectedPath = await window.electronAPI.selectPath({ mode: 'folder' });
              if (!selectedPath) {
                setIsConfirming(false);
                setShowConfirmationModal(false);
                return;
              }
              targetPath = selectedPath;
            }

            addNotification(`Restoring ${checkpoint.gameName} from GitHub Release ${checkpoint.id}...`, 'info', { icon: <Loader2 className="h-5 w-5 animate-spin" /> });
            const result = await window.electronAPI.restoreGithubCheckpointRelease({ releaseTag: checkpoint.id, gamePath: targetPath, gameName: checkpoint.gameName });
            if (result.success) {
              restoreSuccessful = true;
              restoreMessage = result.message || `Restored ${checkpoint.gameName} from GitHub.`;
              if (game) {
                setGames(prevGames => prevGames.map(g => g.id === game.id ? { ...g, lastSynced: new Date().toISOString() } : g));
              }
            } else {
              throw new Error(result.error || "Failed to restore from GitHub release.");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error restoring from GitHub.";
            addNotification(`GitHub Restore Failed: ${errorMessage}`, 'error', { force: true });
            addLogEntry({ type: 'checkpoint_restore', message: `Attempt to restore ${checkpoint.gameName} from GitHub FAILED: ${errorMessage}`, gameName: checkpoint.gameName, status: 'fail' });
          }
        } else {
          addNotification(`Simulating restore of cloud checkpoint for ${checkpoint.gameName}...`, 'info');
          await new Promise(resolve => setTimeout(resolve, 2000));
          restoreSuccessful = true;
          restoreMessage = `Simulated restore of cloud checkpoint for ${checkpoint.gameName}.`;
        }
        if (restoreSuccessful) {
          addLogEntry({ type: 'checkpoint_restore', message: restoreMessage, gameName: checkpoint.gameName, status: 'success' });
          addNotification(restoreMessage, 'success');
        }
        setIsConfirming(false);
        setShowConfirmationModal(false);
      },
      isDestructive: true,
    });
    setShowConfirmationModal(true);
  };

  const handleDeleteCloudCheckpoint = (checkpointId: string) => {
    const checkpoint = cloudCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) return;
    setConfirmationDetails({
      title: `Confirm Delete Cloud Checkpoint`,
      description: `Are you sure you want to delete the cloud checkpoint for ${checkpoint.gameName} from ${formatTime(checkpoint.time)} (${checkpoint.provider})? This action cannot be undone.`,
      confirmText: "Delete",
      onConfirm: async () => {
        setIsConfirming(true);
        let deleteSuccessful = false;
        let deleteMessage = "";
        if (checkpoint.provider === 'Google Drive') {
          if (!checkpoint.cloudFileId) {
            addNotification("Google Drive file ID is missing. Cannot delete.", "error", { force: true });
            setIsConfirming(false); setShowConfirmationModal(false); return;
          }
          try {
            const result = await window.electronAPI.deleteGoogleDriveCheckpoint({ fileId: checkpoint.cloudFileId });
            if (result.success) {
              deleteSuccessful = true;
              deleteMessage = `Deleted Google Drive checkpoint for ${checkpoint.gameName}`;
            } else {
              throw new Error(result.error || 'Failed to delete from Google Drive.');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error deleting from Google Drive.";
            addNotification(`Google Drive Deletion Failed: ${errorMessage}`, 'error', { force: true });
          }
        } else if (checkpoint.provider === 'GitHub') {
          if (!checkpoint.id) {
            addNotification("Cannot delete GitHub checkpoint: Release tag is missing.", "error", { force: true });
            setIsConfirming(false);
            setShowConfirmationModal(false);
            return;
          }
          try {
            const result = await window.electronAPI.deleteGithubCheckpointRelease({ releaseTag: checkpoint.id });
            if (result.success) {
              deleteSuccessful = true;
              deleteMessage = result.message || `Deleted GitHub checkpoint for ${checkpoint.gameName}`;
            } else {
              throw new Error(result.error || "Failed to delete GitHub release.");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error deleting GitHub release.";
            addNotification(`GitHub Deletion Failed: ${errorMessage}`, 'error', { force: true });
            addLogEntry({ type: 'checkpoint_delete', message: `Attempt to delete GitHub release for ${checkpoint.gameName} FAILED: ${errorMessage}`, gameName: checkpoint.gameName, status: 'fail' });
          }
        } else {
          addNotification(`Simulating deletion of cloud checkpoint for ${checkpoint.gameName}...`, 'info');
          await new Promise(resolve => setTimeout(resolve, 500));
          deleteSuccessful = true;
          deleteMessage = `Simulated deletion of cloud checkpoint for ${checkpoint.gameName}`;
        }
        if (deleteSuccessful) {
          setCloudCheckpoints(prev => prev.filter(cp => cp.id !== checkpointId));
          addLogEntry({ type: 'checkpoint_delete', message: deleteMessage, gameName: checkpoint.gameName, status: 'success' });
          addNotification(deleteMessage, 'info', { icon: <Trash2 className="h-5 w-5 text-red-500" /> });
        }
        setIsConfirming(false);
        setShowConfirmationModal(false);
      },
      isDestructive: true,
    });
    setShowConfirmationModal(true);
  };

  const handleOpenCloudCheckpointLink = (checkpointId: string) => {
    const checkpoint = cloudCheckpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint || !checkpoint.cloudLink) return;
    addLogEntry({ type: 'info', message: `Opening cloud link for ${checkpoint.gameName} (${checkpoint.provider})`, status: 'info' });
    if (typeof window !== 'undefined') {
      window.open(checkpoint.cloudLink, '_blank');
    }
  };

  const handleRefreshCloudCheckpoints = async () => {
    if (!isGoogleDriveConnected) {
      addNotification("Please connect Google Drive first.", "info");
      return;
    }

    const notifId = addNotification("Scanning Google Drive for missing checkpoints...", "info", { icon: <Loader2 className="h-5 w-5 animate-spin" /> });

    try {
      const result = await window.electronAPI.listAllGoogleDriveCheckpoints();
      if (result.success) {
        const driveCheckpoints = result.checkpoints;

        let foundNewCount = 0;
        setCloudCheckpoints(prev => {
          const existingIds = new Set(prev.map(cp => cp.cloudFileId || cp.id));
          const newOnes = driveCheckpoints
            .filter((cp: any) => !existingIds.has(cp.cloudFileId))
            .map((cp: any) => ({
              ...cp,
              size: cp.size ? formatBytes(parseInt(cp.size)) : '0 Bytes'
            }));

          foundNewCount = newOnes.length;

          if (foundNewCount === 0) {
            return prev;
          }

          return [...prev, ...newOnes];
        });

        removeNotification(notifId);
        if (foundNewCount === 0) {
          addNotification("Your cloud checkpoints are already up to date.", "success");
        } else {
          addNotification(`Found ${foundNewCount} new checkpoints on Google Drive!`, "success");
          addLogEntry({ type: 'info', message: `Reconciled cloud checkpoints: Found ${foundNewCount} new entries.`, status: 'success' });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      removeNotification(notifId);
      addNotification(`Failed to refresh cloud checkpoints: ${error.message}`, "error");
    }
  };

  const handleResetSettings = () => {
    setConfirmationDetails({
      title: "Confirm Reset Settings",
      description: "Are you sure you want to reset all General, Notification, and Appearance settings to their default values?",
      confirmText: "Reset Settings",
      onConfirm: async () => {
        setIsConfirming(true);
        setAppSettings(initialAppSettings);
        setTheme(initialThemeSettings);
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsConfirming(false);
        setShowConfirmationModal(false);
        addNotification("All settings have been reset to default.", 'success');
        addLogEntry({ type: 'info', message: "Application settings reset to default.", status: 'info' });
      },
      isDestructive: true,
    });
    setShowConfirmationModal(true);
  };

  const handleExportData = () => {
    try {
      const dataToExport = { version: "1.0.0", exportedAt: new Date().toISOString(), games, appSettings, theme };
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `gamesync-pro-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addNotification("Data exported successfully!", 'success');
      addLogEntry({ type: 'info', message: 'User exported application data.', status: 'info' });
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addNotification(`Data export failed: ${errorMessage}`, 'error');
      addLogEntry({ type: 'error', message: `Data export failed: ${errorMessage}`, status: 'fail' });
    }
  };

  const handleImportData = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        addNotification("Failed to read the import file.", 'error');
        return;
      }
      try {
        const importedData = JSON.parse(text);
        if (!importedData.games || !Array.isArray(importedData.games) || !importedData.appSettings || typeof importedData.appSettings !== 'object') {
          throw new Error("Invalid file format. Missing required data.");
        }
        setConfirmationDetails({
          title: "Confirm Data Import",
          description: "This will overwrite all your current games and settings with the data from the selected file. This action cannot be undone. Are you sure you want to continue?",
          confirmText: "Yes, Import Data",
          onConfirm: () => {
            try {
              setGames(importedData.games);
              setAppSettings(importedData.appSettings);
              if (importedData.theme) {
                setTheme(importedData.theme);
              }
              setShowConfirmationModal(false);
              addNotification("Data imported successfully!", 'success');
              addLogEntry({ type: 'info', message: 'User imported application data, overwriting existing configuration.', status: 'success' });
              setActiveTab('home');
            } catch (stateError) {
              console.error("Error applying imported state:", stateError);
              const errorMessage = stateError instanceof Error ? stateError.message : "An unknown error occurred.";
              addNotification(`Failed to apply imported settings: ${errorMessage}`, 'error');
            }
          },
          isDestructive: true,
        });
        setShowConfirmationModal(true);
      } catch (error: any) {
        console.error("Import failed:", error);
        addNotification(`Import failed: ${error.message}`, 'error');
        addLogEntry({ type: 'error', message: `Data import failed: ${error.message}`, status: 'fail' });
      }
    };
    reader.readAsText(file);
  };

  const handleLogin = async () => {
    addNotification("Opening Google Sign-In...", 'info', { icon: <Loader2 className="h-4 w-4 animate-spin" /> });
    try {
      // 1. Call the main process to handle the entire OAuth flow
      const result = await window.electronAPI.googleLogin();

      if (result.success && result.id_token) {
        // 2. Create a Firebase credential with the Google ID token from the main process
        const credential = GoogleAuthProvider.credential(result.id_token);

        // 3. Sign in to Firebase with the credential. NO POP-UP NEEDED!
        await signInWithCredential(auth, credential);

        // The onAuthStateChanged listener will automatically handle the successful login state.
        addNotification("Login Successful!", 'success');
      } else {
        throw new Error(result.error || 'The login process was cancelled or failed.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      addNotification(`Login Failed: ${errorMessage}`, 'error', { force: true });
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      addNotification("Logout Successful!", 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      addNotification(`Logout Failed: ${errorMessage}`, 'error', { force: true });
    }
  };


  // 6. Loading state check
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // 7. Render logic
  const renderContent = () => {
    switch (activeTab) {
      case "home":
        const sortedGames = [...games].sort((a, b) => {
          if (gamesSortBy === 'name') {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return gamesSortOrder === 'asc' ? -1 : 1;
            if (nameA > nameB) return gamesSortOrder === 'asc' ? 1 : -1;
            return 0;
          } else if (gamesSortBy === 'lastSynced') {
            const dateAVal = (a.lastSynced === "Never") ? 0 : new Date(a.lastSynced).getTime();
            const dateBVal = (b.lastSynced === "Never") ? 0 : new Date(b.lastSynced).getTime();
            const finalDateA = isNaN(dateAVal) ? 0 : dateAVal;
            const finalDateB = isNaN(dateBVal) ? 0 : dateBVal;
            return gamesSortOrder === 'desc' ? finalDateB - finalDateA : finalDateA - finalDateB;
          }
          return 0;
        });

        const filteredGames = sortedGames.filter(game =>
          game.name.toLowerCase().includes(gamesSearchTerm.toLowerCase()) ||
          game.path.toLowerCase().includes(gamesSearchTerm.toLowerCase()) ||
          (game.launchPath?.toLowerCase().includes(gamesSearchTerm.toLowerCase()) ?? false) ||
          (game.summary?.toLowerCase().includes(gamesSearchTerm.toLowerCase()) ?? false)
        );

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Home Dashboard</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your games and sync status</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleAutoDetectGames}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Auto-Detect Games
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowAddGameOptionsModal(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add New Game
                </Button>
                <Button variant="default" size="sm" onClick={handleInitiateSyncAllEnabled}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Sync All Enabled
                </Button>
                <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>
                <div className="relative">
                  <Input
                    placeholder="Search games or add new..."
                    value={gamesSearchTerm}
                    onChange={(e) => setGamesSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && gamesSearchTerm.trim()) {
                        setGlobalSearchInput(gamesSearchTerm);
                        setActiveTab('global-search');
                        handlePerformGlobalSearch(gamesSearchTerm, 1);
                      }
                    }}
                    className="w-48 bg-input/60 text-foreground border-dashed border-white/20 placeholder:text-muted-foreground pl-8 h-9"
                  />
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <Select
                  value={gamesSortBy}
                  onValueChange={(v) => setGamesSortBy(v as 'name' | 'lastSynced')}
                >
                  <SelectTrigger className="w-auto gap-1 bg-input/60 border-dashed border-white/20 h-9">
                    <span className="text-muted-foreground text-sm hidden lg:inline">Sort:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/80 text-popover-foreground border-white/20 backdrop-blur-xl">
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="lastSynced">Last Synced</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-dashed"
                  onClick={() => setGamesSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  aria-label="Toggle sort order"
                >
                  {gamesSortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <DashboardSummary
              games={games}
              localCheckpoints={localCheckpoints}
              cloudCheckpoints={cloudCheckpoints} glassmorphismIntensity={0}
            />

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  //@ts-ignore
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 auto-rows-fr"
            >
              <AnimatePresence mode="popLayout">
                {filteredGames.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-muted-foreground col-span-full mt-10 flex flex-col items-center"
                  >
                    <Gamepad2 className="w-16 h-16 mb-4 opacity-50" />
                    {games.length === 0 ? (
                      <p>{currentUser ? "Your library is empty. Use 'Auto-Detect' or 'Add New Game' to get started!" : "Please log in to see your games."}</p>
                    ) : (
                      <p>No games found matching "{gamesSearchTerm}".</p>
                    )}
                  </motion.div>
                ) : (
                  filteredGames.map((game, index) => (
                    <motion.div
                      key={game.id}
                      layout
                    >
                      <TooltipProvider>
                        <GameCard
                          game={game}
                          onSync={handleSyncGame}
                          onToggleEnable={handleToggleEnableGame}
                          onEditGame={(g) => handleEditGame(g.id)}
                          onDelete={handleDeleteGame}
                          onOpenDirectory={handleOpenDirectory}
                          onChangeLocation={handleChangeGameLocation}
                          onCreateLocalCheckpoint={handleCreateLocalCheckpoint}
                          onViewDetails={handleViewGameDetails}
                          onLaunchGame={handleLaunchGame}
                          onInitiateSync={handleInitiateSingleGameSync}
                          defaultSyncProvider={appSettings.defaultSyncProvider}
                          isGoogleDriveConnected={isGoogleDriveConnected}
                          isGithubConnected={isGithubConnected}
                          addNotification={addNotification}
                          glassmorphismIntensity={0}
                        />
                      </TooltipProvider>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      case "local-checkpoints":
        return (
          <TooltipProvider>
            <LocalCheckpointsTab
              checkpoints={localCheckpoints}
              onRestore={handleRestoreLocalCheckpoint}
              onDelete={handleDeleteLocalCheckpoint}
              games={games}
              onCreateLocalCheckpoint={handleCreateLocalCheckpoint}
              onCreateCheckpointForAll={handleInitiateCreateCheckpointForAll}
              onOpenCheckpointDirectory={handleOpenCheckpointDirectory}
              onOpenFolderCheckpointLocation={handleOpenFolderCheckpointLocation}
            />
          </TooltipProvider>
        );
      case "cloud-checkpoints":
        return (
          <TooltipProvider>
            <CloudCheckpointsTab
              cloudCheckpoints={cloudCheckpoints}
              onRestoreCloud={handleRestoreCloudCheckpoint}
              onDeleteCloud={handleDeleteCloudCheckpoint}
              onUploadCheckpoint={handleUploadCloudCheckpoint}
              onUploadCheckpointForAll={handleInitiateUploadCheckpointForAll}
              games={games}
              onOpenFolderCheckpointLocation={handleOpenFolderCheckpointLocation}
              onOpenCloudCheckpointLink={handleOpenCloudCheckpointLink}
              isGoogleDriveConnected={isGoogleDriveConnected}
              isGithubConnected={isGithubConnected}
              onRefreshCloud={handleRefreshCloudCheckpoints}
              addNotification={addNotification}
            />
          </TooltipProvider>
        );
      case "cloud-sync":
        return (
          <CloudSyncTab
            appSettings={appSettings}
            setAppSettings={setAppSettings}
            games={games}
            addLogEntry={addLogEntry}
            addNotification={addNotification}
            isGoogleDriveConnected={isGoogleDriveConnected}
            setIsGoogleDriveConnected={setIsGoogleDriveConnected}
            googleDriveLastSync={googleDriveLastSync}
            setGoogleDriveLastSync={setGoogleDriveLastSync}
            isGithubConnected={isGithubConnected}
            setIsGithubConnected={setIsGithubConnected}
            githubLastSync={githubLastSync}
            setGithubLastSync={setGithubLastSync}
            currentUser={currentUser}
          />
        );


      case "settings":
        return (
          <SettingsTab
            appSettings={appSettings}
            setAppSettings={setAppSettings}
            theme={theme}
            setTheme={setTheme}
            isGoogleDriveConnected={isGoogleDriveConnected}
            isGithubConnected={isGithubConnected}
            addNotification={addNotification}
            onResetSettings={handleResetSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
            currentUser={appUser}
            localCheckpoints={localCheckpoints}
            cloudCheckpoints={cloudCheckpoints}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onBrowse={handlePathSelection}
            onUpdateUser={handleUpdateUser}
            onSwitchTab={setActiveTab}
          />
        );
      case "global-search":
        return (
          <GlobalSearchTab
            searchTerm={globalSearchInput}
            setSearchTerm={setGlobalSearchInput}
            onSearch={handlePerformGlobalSearch}
            results={globalSearchResults}
            isLoading={isSearchingGlobal}
            onAddGame={handleProcessGlobalSearchGame}
            onBack={() => setActiveTab("home")}
            currentPage={globalSearchPage}
            onPageChange={(p) => handlePerformGlobalSearch(globalSearchInput, p)}
            totalPages={globalSearchTotalPages}
          />
        );
      case "activity-log":
        return <ActivityLogTab logEntries={activityLog} onDeleteLogEntry={handleDeleteLogEntry} onClearLog={handleClearLog} />;
      case "restore-backups":
        return (
          <RestoreBackupsTab
            foundBackups={foundBackups}
            onScan={handleScanForBackups}
            onDelete={handleDeleteBackup}
            onOpenDirectory={handleOpenDirectory}
          />
        );
      case "discovery":
        return <DiscoveryTab detectedGames={autoDetectedGames} onScan={handleAutoDetectGames} onAddGames={handleAddDetectedGamesFromDiscovery} />;
      default:
        return <div>Select a tab</div>;
    }
  };

  const backgroundStyle = theme.mode === 'dark' || (theme.mode === 'system' && typeof window !== 'undefined' && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? {
      backgroundImage: `radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120, 119, 198, 0.3), rgba(255, 255, 255, 0))`,
    }
    : {
      backgroundImage: `radial-gradient(ellipse 80% 80% at 50% -20%, rgba(120, 119, 198, 0.15), rgba(255, 255, 255, 0))`,
    };






  return (
    <div className={cn("flex h-screen bg-background text-foreground antialiased bg-cover bg-center transition-colors duration-500")} style={backgroundStyle}>
      <style>{` ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } .dark ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; } .dark ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); } `}</style>

      <div className={cn("p-4 flex flex-col h-full bg-black/30 border-r border-white/10 text-foreground transition-all duration-300 ease-in-out overflow-hidden", isSidebarCollapsed ? "w-20" : "w-60")}>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h1 className={cn("text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden", isSidebarCollapsed && "opacity-0 scale-0")}> Game Sync </h1>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hover:bg-white/10 flex-shrink-0">
              {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
          </div>
          <TooltipProvider>
            <div className={cn("flex items-center gap-3 mb-8 p-2 rounded-lg bg-black/20 border border-dashed border-white/10", isSidebarCollapsed && "justify-center")}>
              <Tooltip>
                <TooltipTrigger>
                  {appUser?.customAvatarPath ? (
                    <img src={`safe-file:///${appUser.customAvatarPath.replace(/\\/g, '/')}`} alt="Profile" className="w-8 h-8 rounded-full object-cover border-white/10" />
                  ) : appUser?.avatar ? (
                    <img src={appUser.avatar} alt="Profile" className="w-8 h-8 rounded-full object-cover border-white/10" onError={(e) => { e.currentTarget.src = `https://placehold.co/40x40/1a1a1a/eeeeee?text=${(appUser.username || appUser.name || 'G').charAt(0).toUpperCase()}`; }} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center border border-white/10 flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </TooltipTrigger>
                {isSidebarCollapsed && (
                  <TooltipContent side="right">
                    <p>{appUser?.username || appUser?.name || 'Not Logged In'}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <div className={cn("flex flex-col text-xs truncate transition-opacity", isSidebarCollapsed && "opacity-0 hidden")}>
                <span className="font-semibold truncate text-foreground">{appUser?.username || appUser?.name || 'Not Logged In'}</span>
                <span className="text-[10px] text-muted-foreground truncate">{isGoogleDriveConnected || isGithubConnected ? "Cloud Synced" : "Local Sync Only"}</span>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {[
                { tab: "home", icon: <HomeIcon className="h-4 w-4" />, label: "Home" },
                { tab: "global-search", icon: <LayoutDashboard className="h-4 w-4" />, label: "Catalogue" },
                { tab: "local-checkpoints", icon: <Save className="h-4 w-4" />, label: "Local Checkpoints" },
                { tab: "cloud-checkpoints", icon: <UploadCloud className="h-4 w-4" />, label: "Cloud Checkpoints" },
                { tab: "restore-backups", icon: <History className="h-4 w-4" />, label: "Restore Backups" },
                { tab: "cloud-sync", icon: <Cloud className="h-4 w-4" />, label: "Cloud Sync" },
                { tab: "discovery", icon: <Sparkles className="h-4 w-4" />, label: "Auto-Discover" },
                { tab: "activity-log", icon: <Activity className="h-4 w-4" />, label: "Activity Log" },
              ].map(item => (
                <Tooltip key={item.tab}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTab === item.tab && !selectedGameForDetailPage ? "secondary" : "ghost"}
                      className={cn(
                        "justify-start text-sm h-9",
                        isSidebarCollapsed && "w-10 h-10 justify-center p-0",
                        (activeTab === item.tab && !selectedGameForDetailPage) ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-white/10 text-foreground'
                      )}
                      onClick={() => {
                        setActiveTab(item.tab);
                        setSelectedGameForDetailPage(null);
                      }}
                    >
                      <span className={cn("mr-2.5", isSidebarCollapsed && "mr-0")}>{item.icon}</span>
                      <span className={cn(isSidebarCollapsed && "sr-only")}>{item.label}</span>
                    </Button>
                  </TooltipTrigger>
                  {isSidebarCollapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                </Tooltip>
              ))}
            </nav>

            {!isSidebarCollapsed && (
              <div className="mt-8 mb-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
                  <h2 className="text-sm font-bold text-white">My Library</h2>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => setShowAddGameOptionsModal(true)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white">
                      <PlayCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="px-2 mb-4 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/40" />
                    <Input
                      placeholder="Filter library"
                      value={librarySearchTerm}
                      onChange={(e) => setLibrarySearchTerm(e.target.value)}
                      className="bg-black/20 border-white/5 h-8 text-xs pl-8 focus:bg-black/40 transition-colors placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-0.5 flex-1 overflow-y-auto pr-1">
                  {games
                    .filter(game => game.name.toLowerCase().includes(librarySearchTerm.toLowerCase()))
                    .map(game => (
                      <ContextMenu key={game.id}>
                        <ContextMenuTrigger asChild>
                          <div className="relative group/library-item">
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start text-[13px] h-9 px-2 hover:bg-white/5 transition-all",
                                selectedGameForDetailPage?.id === game.id ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-white/70 hover:text-white"
                              )}
                              onClick={() => setSelectedGameForDetailPage(game)}
                            >
                              <div className="flex items-center gap-3 truncate pr-6">
                                <div className="w-6 h-6 rounded flex-shrink-0 bg-white/5 border border-white/10 overflow-hidden">
                                  {game.customIconUrl || game.iconUrl || game.icon ? (
                                    <img
                                      src={game.customIconUrl || game.iconUrl || (game.icon?.startsWith('http') ? game.icon : undefined)}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Final fallback logic if the preferred icon fails
                                        const gameObj = game;
                                        const el = e.currentTarget;
                                        if (gameObj.bannerUrl || gameObj.coverArtUrl) {
                                          el.src = (gameObj.coverArtUrl || gameObj.bannerUrl || '').replace('header.jpg', 'library_hero.jpg');
                                        }
                                      }}
                                    />
                                  ) : game.localIconPath ? (
                                    <img src={`safe-file:///${game.localIconPath.replace(/\\/g, '/')}`} className="w-full h-full object-cover" />
                                  ) : game.coverArtUrl || game.bannerUrl ? (
                                    <img src={(game.coverArtUrl || game.bannerUrl)?.replace('header.jpg', 'library_hero.jpg')} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Gamepad2 className="w-3 h-3 text-white/20" />
                                    </div>
                                  )}
                                </div>
                                <span className="truncate font-medium">{game.name}</span>
                              </div>
                            </Button>

                            <div className="absolute right-1 top-1.5 opacity-0 group-hover/library-item:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-40 p-1 bg-black/60 backdrop-blur-xl border-white/10 shadow-2xl" side="right" align="start">
                                  <DropdownMenuItem
                                    className="h-8 text-xs font-medium text-white/70 focus:text-white focus:bg-white/10 px-2 rounded-lg cursor-pointer"
                                    onClick={() => handleEditGame(game.id)}
                                  >
                                    <Edit className="w-3 h-3 mr-2" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/5 my-0.5" />
                                  <DropdownMenuItem
                                    className="h-8 text-xs font-medium text-red-400 focus:text-red-300 focus:bg-red-500/10 px-2 rounded-lg cursor-pointer"
                                    onClick={() => handleDeleteGame(game.id)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-2" /> Delete Game
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-40 p-1 bg-black/60 backdrop-blur-xl border-white/10 shadow-2xl">
                          <ContextMenuItem
                            className="h-8 text-xs font-medium text-white/70 focus:text-white focus:bg-white/10 px-2 rounded-lg cursor-pointer"
                            onClick={() => handleEditGame(game.id)}
                          >
                            <Edit className="w-3 h-3 mr-2" /> Edit Details
                          </ContextMenuItem>
                          <ContextMenuSeparator className="bg-white/5 my-0.5" />
                          <ContextMenuItem
                            className="h-8 text-xs font-medium text-red-400 focus:text-red-300 focus:bg-red-500/10 px-2 rounded-lg cursor-pointer"
                            onClick={() => handleDeleteGame(game.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-2" /> Delete Game
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                </div>
              </div>
            )}
          </TooltipProvider>
        </div>

        <TooltipProvider>
          <div className="flex flex-col gap-1 mt-auto pt-4 flex-shrink-0">
            <hr className="my-2 border-white/10" />
            {[{ tab: "settings", icon: <Settings className="h-4 w-4" />, label: "Settings" },].map(item => (
              <Tooltip key={item.tab}>
                <TooltipTrigger asChild>
                  <Button variant={activeTab === item.tab ? "secondary" : "ghost"} className={cn("justify-start text-sm h-9", isSidebarCollapsed && "w-10 h-10 justify-center p-0", activeTab === item.tab ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-white/10 text-foreground')} onClick={() => { setActiveTab(item.tab); setSelectedGameForDetailPage(null); }}>
                    <span className={cn("mr-2.5", isSidebarCollapsed && "mr-0")}>{item.icon}</span>
                    <span className={cn(isSidebarCollapsed && "sr-only")}>{item.label}</span>
                  </Button>
                </TooltipTrigger>
                {isSidebarCollapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
              </Tooltip>
            ))}

          </div>
        </TooltipProvider>
      </div>

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {selectedGameForDetailPage ? (
            <motion.div key={selectedGameForDetailPage.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="h-full">
              <GameDetailPage
                game={selectedGameForDetailPage}
                onBack={() => setSelectedGameForDetailPage(null)}
                localCheckpoints={localCheckpoints}
                cloudCheckpoints={cloudCheckpoints}
                onLaunchGame={handleLaunchGame}
                onCreateLocalCheckpoint={handleCreateLocalCheckpoint}
                onInitiateSync={handleInitiateSingleGameSync}
                onRestoreLocalCheckpoint={handleRestoreLocalCheckpoint}
                onDeleteLocalCheckpoint={handleDeleteLocalCheckpoint}
                onRestoreCloudCheckpoint={handleRestoreCloudCheckpoint}
                onDeleteCloudCheckpoint={handleDeleteCloudCheckpoint}
                onOpenCloudCheckpointLink={(id) => {
                  const cp = cloudCheckpoints.find(c => c.id === id);
                  if (cp && cp.cloudLink) window.electronAPI.openPath(cp.cloudLink);
                }}
                onUploadCloudCheckpoint={handleUploadCloudCheckpoint}
                isGoogleDriveConnected={isGoogleDriveConnected}
                isGithubConnected={isGithubConnected}
                onEditGame={(game) => {
                  handleEditGame(game.id);
                }}
              />
            </motion.div>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="h-full">
              {renderContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <NotificationContainer notifications={notifications} onDismiss={removeNotification} />

      <AnimatePresence>
        {/* All modals stay here, unchanged */}
        {showGameSearchResultsModal && gameSearchResults.length > 0 && (<GameSearchResultsModal results={gameSearchResults} onSelectGame={handleSelectGameFromSearch} onClose={() => { setShowGameSearchResultsModal(false); setGameSearchResults([]); }} />)}
        {showConfigureGamePathsModal && gameToConfigurePaths && (<ConfigureGamePathsModal game={gameToConfigurePaths} onSave={handleAddGameAfterPathConfig} onClose={() => { setShowConfigureGamePathsModal(false); setGameToConfigurePaths(null); }} onBrowse={handlePathSelection} />)}
        {showChangeLocationModal && gameToChangeLocation && (<ChangeLocationModal game={gameToChangeLocation} onSave={handleSaveGameLocation} onCancel={() => { setShowChangeLocationModal(false); setGameToChangeLocation(null); }} onBrowse={handlePathSelection} />)}
        {showEditGameModal && gameToEdit && (<EditGameModal game={gameToEdit} onSave={handleSaveEditedGame} onCancel={() => { setShowEditGameModal(false); setGameToEdit(null); }} addNotification={addNotification} onBrowse={handlePathSelection} currentUser={appUser} />)}

        {showAddGameOptionsModal && (
          <AddGameOptionsModal
            onManualClick={() => {
              setShowAddGameOptionsModal(false);
              setShowAddManualGameModal(true);
            }}
            onClose={() => setShowAddGameOptionsModal(false)}
          />
        )}
        {showAddManualGameModal && (<AddManualGameModal onAddGame={handleAddGame} onClose={() => setShowAddManualGameModal(false)} onBrowse={handlePathSelection} />)}
        {showAutoDetectGamesModal && (<AutoDetectedGamesModal detectedGames={autoDetectedGames} onAddGames={handleAddDetectedGamesFromModal} onClose={() => { setShowAutoDetectGamesModal(false); setAutoDetectedGames([]); }} onScan={handleAutoDetectGames} />)}
        {showConfirmationModal && confirmationDetails && (<ConfirmationModal isOpen={showConfirmationModal} onClose={() => { setShowConfirmationModal(false); setIsConfirming(false); }} onConfirm={confirmationDetails.onConfirm} title={confirmationDetails.title} description={confirmationDetails.description} confirmText={confirmationDetails.confirmText} isDestructive={confirmationDetails.isDestructive} isConfirming={isConfirming} confirmPhrase={confirmationDetails.confirmPhrase} />)}
        {showCheckpointAllOptionsModal && (<CheckpointAllOptionsModal onClose={() => setShowCheckpointAllOptionsModal(false)} onIndividual={checkpointAllType === 'local' ? handleCreateIndividualLocalCheckpointsForAll : handleCreateIndividualCloudCheckpointsForAll} onFolder={checkpointAllType === 'local' ? handleCreateFolderLocalCheckpointForAll : handleCreateFolderCloudCheckpointForAll} type={checkpointAllType} isGoogleDriveConnected={isGoogleDriveConnected} isGithubConnected={isGithubConnected} addNotification={addNotification} />)}
        {showGameSearchInputModal && (<GameSearchInputModal onSearch={handleSearchGameInfo} onClose={() => setShowGameSearchInputModal(false)} />)}
        {showSyncOptionsModal && (<SyncOptionsModal gameId={syncingGameId} onSync={(provider, direction, id) => { if (syncingAllGames) { handleSyncAllToProvider(provider, direction); } else if (id) { handleSyncGame(id, provider, direction); } setShowSyncOptionsModal(false); }} onClose={() => setShowSyncOptionsModal(false)} isGoogleDriveConnected={isGoogleDriveConnected} isGithubConnected={isGithubConnected} syncingAll={syncingAllGames} addNotification={addNotification} />)}
        <div className="fixed bottom-4 right-6 z-[60] flex items-center gap-4 text-xs">
          <button
            onClick={() => window.open('https://github.com/darkbitt/Savra', '_blank')}
            className="text-muted-foreground hover:text-white transition-colors flex items-center gap-1.5"
            title="GitHub Repository"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="underline underline-offset-4 decoration-white/20 hover:decoration-white/50 font-medium">GitHub</span>
          </button>
          <button
            onClick={() => window.open('https://workwonders.app/', '_blank')}
            className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-primary/50 font-medium"
          >
            What's New?
          </button>
        </div>
      </AnimatePresence>
    </div>
  );
}
