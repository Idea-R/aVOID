import React, { useState, useEffect } from 'react';
import { X, User, Trophy, Star, Save, Twitter, Instagram, Youtube, Twitch, Github, ExternalLink, Target, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { UserProfile } from '../api/profiles';
import { ProfileDataManager } from './ProfileData';
import { ProfileInfo, CursorCustomization, SocialLinks, PrivacySettings } from './ProfileTabs';

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
  const [socialLinks, setSocialLinks] = useState(ProfileDataManager.getDefaultSocialLinks());
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!isOpen || !targetUserId) return;

    const loadProfile = async () => {
      setLoading(true);
      
      try {
        const { profile: profileData, bestScore: userBest } = await ProfileDataManager.loadProfile(
          targetUserId,
          isOwnProfile
        );
        
        if (profileData) {
          setProfile(profileData);
          setSocialLinks(profileData.social_links || ProfileDataManager.getDefaultSocialLinks());
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

  const presetColors = ProfileDataManager.getPresetColors();

  // Social link handlers
  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
    
    // Clear previous error
    setSocialErrors(prev => ({ ...prev, [platform]: '' }));
    
    // Validate if not empty
    if (value.trim()) {
      const validation = ProfileDataManager.validateSocialLink(platform, value);
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

  // Save profile
  const handleSave = async () => {
    if (!profile || !isOwnProfile) return;
    
    setSaving(true);
    
    try {
      const result = await ProfileDataManager.saveProfile(profile, socialLinks);
      
      if (result.success) {
        onClose();
      } else if (result.errors) {
        setSocialErrors(result.errors);
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

  const avgStats = ProfileDataManager.calculateAverageStats(profile);
  const tabConfig = ProfileDataManager.getTabConfig();

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
              {tabConfig.map(({ id, label, icon }) => {
                const IconComponent = {
                  User, Trophy, Target, ExternalLink, Eye
                }[icon as keyof typeof { User, Trophy, Target, ExternalLink, Eye }] || User;
                
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                      activeTab === id
                        ? 'bg-white text-cyan-600'
                        : 'bg-cyan-700 text-white hover:bg-cyan-600'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {(!isOwnProfile || activeTab === 'info') && (
            <ProfileInfo 
              profile={profile}
              isOwnProfile={isOwnProfile}
              setProfile={setProfile}
              avgStats={avgStats}
              getSocialIcon={getSocialIcon}
            />
          )}
          
          {isOwnProfile && activeTab === 'customization' && (
            <CursorCustomization
              profile={profile}
              previewColor={previewColor}
              setProfile={setProfile}
              presetColors={presetColors}
              showColorWheel={showColorWheel}
              setShowColorWheel={setShowColorWheel}
              colorWheelRef={colorWheelRef}
              handleColorWheelClick={handleColorWheelClick}
              handleColorWheelMouseMove={handleColorWheelMouseMove}
              setPreviewColor={setPreviewColor}
            />
          )}
          
          {isOwnProfile && activeTab === 'social' && (
            <SocialLinks
              socialLinks={socialLinks}
              socialErrors={socialErrors}
              handleSocialLinkChange={handleSocialLinkChange}
              getSocialIcon={getSocialIcon}
            />
          )}
          
          {isOwnProfile && activeTab === 'privacy' && (
            <PrivacySettings
              profile={profile}
              setProfile={setProfile}
            />
          )}
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