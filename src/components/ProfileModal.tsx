import React, { useState, useEffect } from 'react';
import { X, User, Trophy, Star, Settings, Eye, EyeOff, Save, Twitter, Instagram, Youtube, Twitch, Github, ExternalLink, Calendar, Target, Clock, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ProfileAPI, UserProfile } from '../api/profiles';
import { LeaderboardAPI } from '../api/leaderboard';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // If provided, shows public profile view
}

export default function ProfileModal({ isOpen, onClose, userId }: ProfileModalProps) {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bestScore, setBestScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'stats' | 'customization' | 'social' | 'privacy'>('info');
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    instagram: '',
    youtube: '',
    twitch: '',
    github: ''
  });
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!isOpen || !targetUserId) return;

    const loadProfile = async () => {
      setLoading(true);
      
      try {
        // Load profile data
        const profileData = isOwnProfile 
          ? await ProfileAPI.getUserProfile(targetUserId)
          : await ProfileAPI.getPublicProfile(targetUserId);
        
        if (profileData) {
          setProfile(profileData);
          setSocialLinks(profileData.social_links || {});
          
          // Load best score
          const userBest = await LeaderboardAPI.getUserBestScore(targetUserId);
          setBestScore(userBest);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, targetUserId, isOwnProfile]);

  // Color wheel functionality
  const handleColorWheelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isOwnProfile) return;
    
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    const distance = Math.sqrt(x * x + y * y);
    
    if (distance <= radius) {
      const angle = Math.atan2(y, x);
      const hue = ((angle * 180 / Math.PI) + 360) % 360;
      const saturation = Math.min(distance / radius * 100, 100);
      const lightness = 60;
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      setProfile(prev => prev ? { ...prev, cursor_color: color } : null);
      setPreviewColor(null);
    }
  };

  const handleColorWheelMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isOwnProfile) return;
    
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    const distance = Math.sqrt(x * x + y * y);
    
    if (distance <= radius) {
      const angle = Math.atan2(y, x);
      const hue = ((angle * 180 / Math.PI) + 360) % 360;
      const saturation = Math.min(distance / radius * 100, 100);
      const lightness = 60;
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      setPreviewColor(color);
    } else {
      setPreviewColor(null);
    }
  };

  const drawColorWheel = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      for (let r = 0; r < radius; r += 1) {
        const saturation = (r / radius) * 100;
        const lightness = 60;
        const color = `hsl(${angle}, ${saturation}%, ${lightness}%)`;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const colorWheelRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    if (showColorWheel && colorWheelRef.current) {
      drawColorWheel(colorWheelRef.current);
    }
  }, [showColorWheel]);

  // Preset colors
  const presetColors = [
    { name: 'Cyan', color: '#06b6d4' },
    { name: 'Purple', color: '#8b5cf6' },
    { name: 'Green', color: '#10b981' },
    { name: 'Orange', color: '#f59e0b' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Yellow', color: '#eab308' }
  ];

  // Social link handlers
  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
    
    // Clear previous error
    setSocialErrors(prev => ({ ...prev, [platform]: '' }));
    
    // Validate if not empty
    if (value.trim()) {
      const validation = ProfileAPI.validateSocialLink(platform, value);
      if (!validation.isValid) {
        setSocialErrors(prev => ({ ...prev, [platform]: validation.error || 'Invalid handle' }));
      }
    }
  };

  const getSocialIcon = (platform: string) => {
    const icons = {
      twitter: Twitter,
      instagram: Instagram,
      youtube: Youtube,
      twitch: Twitch,
      github: Github
    };
    return icons[platform as keyof typeof icons] || ExternalLink;
  };

  const getSocialUrl = (platform: string, handle: string) => {
    if (!handle) return '';
    const validation = ProfileAPI.validateSocialLink(platform, handle);
    return validation.url || '';
  };

  // Save profile
  const handleSave = async () => {
    if (!profile || !isOwnProfile) return;
    
    setSaving(true);
    
    try {
      // Validate social links
      const validatedSocialLinks: Record<string, string> = {};
      let hasErrors = false;
      
      for (const [platform, handle] of Object.entries(socialLinks)) {
        if (handle.trim()) {
          const validation = ProfileAPI.validateSocialLink(platform, handle);
          if (validation.isValid) {
            validatedSocialLinks[platform] = handle.replace(/^@/, '');
          } else {
            setSocialErrors(prev => ({ ...prev, [platform]: validation.error || 'Invalid handle' }));
            hasErrors = true;
          }
        }
      }
      
      if (hasErrors) {
        setSaving(false);
        return;
      }
      
      const success = await ProfileAPI.updateProfile(profile.id, {
        username: profile.username,
        bio: profile.bio,
        cursor_color: profile.cursor_color,
        social_links: validatedSocialLinks,
        is_public: profile.is_public
      });
      
      if (success) {
        // Update game settings with new cursor color
        const currentSettings = JSON.parse(localStorage.getItem('avoidGameSettings') || '{}');
        const newSettings = { ...currentSettings, cursorColor: profile.cursor_color };
        localStorage.setItem('avoidGameSettings', JSON.stringify(newSettings));
        
        // Dispatch event to update game
        window.dispatchEvent(new CustomEvent('gameSettingsChanged', { detail: newSettings }));
        
        onClose();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-500 max-w-md w-full p-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            <span className="ml-3 text-cyan-300">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg shadow-2xl border border-red-500 max-w-md w-full p-8">
          <div className="text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-2">Profile Not Found</h2>
            <p className="text-gray-300 mb-4">
              {isOwnProfile ? 'Unable to load your profile.' : 'This profile is private or does not exist.'}
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border border-cyan-500 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
              style={{ backgroundColor: profile.cursor_color }}
            >
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">{profile.username}</h2>
                <Star className="w-5 h-5 text-cyan-300" title="Verified Player" />
              </div>
              <p className="text-cyan-100">
                {isOwnProfile ? 'Your Profile' : 'Verified Player'}
              </p>
              {profile.bio && (
                <p className="text-cyan-200 text-sm mt-1 italic">"{profile.bio}"</p>
              )}
            </div>
          </div>

          {/* Tab Navigation - Only show for own profile */}
          {isOwnProfile && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {[
                { id: 'info', label: 'Info', icon: User },
                { id: 'stats', label: 'Stats', icon: Trophy },
                { id: 'customization', label: 'Cursor', icon: Target },
                { id: 'social', label: 'Social', icon: ExternalLink },
                { id: 'privacy', label: 'Privacy', icon: Eye }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                    activeTab === id
                      ? 'bg-white text-cyan-600'
                      : 'bg-cyan-700 text-white hover:bg-cyan-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {!isOwnProfile || activeTab === 'info' ? (
            /* Profile Info */
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isOwnProfile ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                        <input
                          type="text"
                          value={profile.username || ''}
                          onChange={(e) => setProfile(prev => prev ? { ...prev, username: e.target.value } : null)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          maxLength={30}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Bio (Optional)</label>
                        <input
                          type="text"
                          value={profile.bio || ''}
                          onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="Tell others about yourself..."
                          maxLength={100}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Member since</span>
                      </div>
                      <p className="text-white">{new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Game Stats */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Game Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 border border-yellow-600/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-yellow-300">Best Score</span>
                    </div>
                    <p className="text-lg font-bold text-white">{bestScore.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-600/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-blue-300">Games Played</span>
                    </div>
                    <p className="text-lg font-bold text-white">{profile.total_games_played}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border border-red-600/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-300">Meteors Destroyed</span>
                    </div>
                    <p className="text-lg font-bold text-white">{profile.total_meteors_destroyed}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border border-green-600/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-300">Survival Time</span>
                    </div>
                    <p className="text-lg font-bold text-white">{Math.floor(profile.total_survival_time)}s</p>
                  </div>
                </div>
                {profile.total_games_played > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Average Survival:</span>
                        <span className="text-white ml-2">
                          {(profile.total_survival_time / profile.total_games_played).toFixed(1)}s
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Meteors per Game:</span>
                        <span className="text-white ml-2">
                          {(profile.total_meteors_destroyed / profile.total_games_played).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links Display */}
              {Object.values(profile.social_links || {}).some(link => link) && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Social Links
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(profile.social_links || {}).map(([platform, handle]) => {
                      if (!handle) return null;
                      const Icon = getSocialIcon(platform);
                      const url = getSocialUrl(platform, handle);
                      
                      return (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors duration-200"
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">@{handle}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'stats' ? (
            /* Detailed Stats */
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Detailed Statistics</h3>
                <p className="text-gray-400 text-sm">
                  Game statistics are automatically tracked and updated after each game session.
                </p>
                {/* Stats content same as above but with more detail */}
              </div>
            </div>
          ) : activeTab === 'customization' ? (
            /* Cursor Customization */
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: previewColor || profile.cursor_color }}
                  />
                  Cursor Color
                </h3>
                
                <div className="space-y-4">
                  {/* Current Color Display */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Current Color:</span>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: previewColor || profile.cursor_color }}
                        onClick={() => setShowColorWheel(!showColorWheel)}
                      />
                      <span className="text-sm text-gray-400 font-mono">
                        {previewColor || profile.cursor_color}
                      </span>
                    </div>
                  </div>

                  {/* Preset Colors */}
                  <div>
                    <label className="text-gray-300 block mb-2">Preset Colors:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {presetColors.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => setProfile(prev => prev ? { ...prev, cursor_color: preset.color } : null)}
                          className={`w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                            profile.cursor_color === preset.color 
                              ? 'border-white shadow-lg ring-2 ring-cyan-500' 
                              : 'border-gray-600 hover:border-white'
                          }`}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Color Wheel Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Custom Color Wheel:</span>
                    <button
                      onClick={() => setShowColorWheel(!showColorWheel)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                        showColorWheel 
                          ? 'bg-cyan-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {showColorWheel ? 'Hide Wheel' : 'Show Wheel'}
                    </button>
                  </div>

                  {/* Color Wheel */}
                  {showColorWheel && (
                    <div className="flex flex-col items-center space-y-3">
                      <canvas
                        ref={colorWheelRef}
                        width={200}
                        height={200}
                        className="cursor-crosshair rounded-full shadow-lg border-2 border-gray-600"
                        onClick={handleColorWheelClick}
                        onMouseMove={handleColorWheelMouseMove}
                        onMouseLeave={() => setPreviewColor(null)}
                      />
                      <p className="text-xs text-gray-400 text-center">
                        Click anywhere on the wheel to select a color
                      </p>
                      {previewColor && (
                        <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                          <p className="text-sm text-gray-300">
                            Preview: <span className="font-mono text-cyan-300">{previewColor}</span>
                          </p>
                          <div 
                            className="w-full h-4 rounded mt-2 border border-gray-500"
                            style={{ backgroundColor: previewColor }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'social' ? (
            /* Social Links */
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Social Media Links</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Add your social media handles to let other players connect with you.
                </p>
                
                <div className="space-y-4">
                  {Object.entries(socialLinks).map(([platform, handle]) => {
                    const Icon = getSocialIcon(platform);
                    const error = socialErrors[platform];
                    
                    return (
                      <div key={platform}>
                        <label className="block text-sm font-medium text-gray-300 mb-2 capitalize flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {platform}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                          <input
                            type="text"
                            value={handle}
                            onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                            className={`w-full pl-8 pr-4 py-2 bg-gray-700 border rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                              error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'
                            }`}
                            placeholder={`your${platform}handle`}
                          />
                        </div>
                        {error && (
                          <p className="text-red-400 text-xs mt-1">{error}</p>
                        )}
                        {handle && !error && (
                          <p className="text-green-400 text-xs mt-1">
                            Will link to: {getSocialUrl(platform, handle)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : activeTab === 'privacy' ? (
            /* Privacy Settings */
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Privacy Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-gray-300 font-medium">Public Profile</label>
                      <p className="text-gray-400 text-sm">
                        Allow other players to view your profile and stats
                      </p>
                    </div>
                    <button
                      onClick={() => setProfile(prev => prev ? { ...prev, is_public: !prev.is_public } : null)}
                      className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
                        profile.is_public ? 'bg-cyan-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                        profile.is_public ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {profile.is_public ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium text-gray-300">
                        {profile.is_public ? 'Profile is Public' : 'Profile is Private'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {profile.is_public 
                        ? 'Other players can view your profile, stats, and social links'
                        : 'Only you can view your profile information'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer - Only show save button for own profile */}
        {isOwnProfile && (
          <div className="bg-gray-800 p-4 border-t border-gray-700 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Changes are saved to your profile and applied to the game
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}