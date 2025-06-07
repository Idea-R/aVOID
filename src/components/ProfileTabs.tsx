import React from 'react';
import { Trophy, ExternalLink, Calendar, Target, Clock, Zap, Eye, EyeOff, Twitter, Instagram, Youtube, Twitch, Github } from 'lucide-react';
import { UserProfile } from '../api/profiles';
import { ProfileDataManager } from './ProfileData';

interface ProfileInfoProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  avgStats: { avgSurvival: number; avgMeteors: number; avgDistance: number };
  getSocialIcon: (platform: string) => any;
}

export function ProfileInfo({ profile, isOwnProfile, setProfile, avgStats, getSocialIcon }: ProfileInfoProps) {
  return (
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
                  value={profile?.username || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, username: e.target.value } : null)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bio (Optional)</label>
                <input
                  type="text"
                  value={profile?.bio || ''}
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

      {/* Comprehensive Stats Section */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Game Statistics
        </h3>
        
        {/* Best Game Stats */}
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
          <h4 className="text-yellow-300 font-semibold mb-3 text-center">🏆 Personal Best</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-yellow-300">Score</span>
              </div>
              <p className="text-lg font-bold text-white">{ProfileDataManager.formatNumber(profile.best_game_score)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-300">Meteors</span>
              </div>
              <p className="text-lg font-bold text-white">{profile.best_game_meteors}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-300">Time</span>
              </div>
              <p className="text-lg font-bold text-white">{ProfileDataManager.formatTime(profile.best_game_time)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-300">Distance</span>
              </div>
              <p className="text-lg font-bold text-white">{ProfileDataManager.formatDistance(profile.best_game_distance)}</p>
            </div>
          </div>
        </div>
        
        {/* Overall Statistics */}
        <h4 className="text-cyan-300 font-semibold mb-3">📊 Overall Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 border border-yellow-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-blue-300">Games</span>
            </div>
            <p className="text-lg font-bold text-white">{profile.total_games_played}</p>
          </div>
          <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border border-red-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-300">Meteors</span>
            </div>
            <p className="text-lg font-bold text-white">{profile.total_meteors_destroyed}</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border border-green-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-300">Time</span>
            </div>
            <p className="text-lg font-bold text-white">{ProfileDataManager.formatTime(profile.total_survival_time)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-600/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-purple-300">Distance</span>
            </div>
            <p className="text-lg font-bold text-white">{ProfileDataManager.formatDistance(profile.total_distance_traveled)}</p>
          </div>
        </div>
        
        {/* Average Stats */}
        {profile.total_games_played > 0 && (
          <div className="pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Average Survival:</span>
                <span className="text-white ml-2">{avgStats.avgSurvival.toFixed(1)}s</span>
              </div>
              <div>
                <span className="text-gray-400">Meteors per Game:</span>
                <span className="text-white ml-2">{avgStats.avgMeteors.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-gray-400">Avg Distance:</span>
                <span className="text-white ml-2">{Math.floor(avgStats.avgDistance)}px</span>
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
              const url = ProfileDataManager.getSocialUrl(platform, handle);
              
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
  );
}

interface CursorCustomizationProps {
  profile: UserProfile;
  previewColor: string | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  presetColors: Array<{ name: string; color: string }>;
  showColorWheel: boolean;
  setShowColorWheel: (show: boolean) => void;
  colorWheelRef: React.RefObject<HTMLCanvasElement>;
  handleColorWheelClick: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleColorWheelMouseMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  setPreviewColor: (color: string | null) => void;
}

export function CursorCustomization({
  profile,
  previewColor,
  setProfile,
  presetColors,
  showColorWheel,
  setShowColorWheel,
  colorWheelRef,
  handleColorWheelClick,
  handleColorWheelMouseMove,
  setPreviewColor
}: CursorCustomizationProps) {
  return (
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
  );
}

interface SocialLinksProps {
  socialLinks: Record<string, string>;
  socialErrors: Record<string, string>;
  handleSocialLinkChange: (platform: string, value: string) => void;
  getSocialIcon: (platform: string) => any;
}

export function SocialLinks({ socialLinks, socialErrors, handleSocialLinkChange, getSocialIcon }: SocialLinksProps) {
  return (
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
                    Will link to: {ProfileDataManager.getSocialUrl(platform, handle)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface PrivacySettingsProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

export function PrivacySettings({ profile, setProfile }: PrivacySettingsProps) {
  return (
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
  );
}