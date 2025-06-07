import { ProfileAPI, UserProfile } from '../api/profiles';
import { LeaderboardAPI } from '../api/leaderboard';

export interface ProfileState {
  profile: UserProfile | null;
  bestScore: number;
  loading: boolean;
  saving: boolean;
  activeTab: 'info' | 'stats' | 'customization' | 'social' | 'privacy';
  showColorWheel: boolean;
  previewColor: string | null;
  socialLinks: Record<string, string>;
  socialErrors: Record<string, string>;
}

export class ProfileDataManager {
  /**
   * Load profile data for a user
   */
  static async loadProfile(
    targetUserId: string,
    isOwnProfile: boolean
  ): Promise<{ profile: UserProfile | null; bestScore: number }> {
    try {
      // Load profile data
      const profileData = isOwnProfile 
        ? await ProfileAPI.getUserProfile(targetUserId)
        : await ProfileAPI.getPublicProfile(targetUserId);
      
      if (profileData) {
        // Load best score
        const userBest = await LeaderboardAPI.getUserBestScore(targetUserId);
        return { profile: profileData, bestScore: userBest };
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    
    return { profile: null, bestScore: 0 };
  }

  /**
   * Validate social link
   */
  static validateSocialLink(platform: string, value: string): { isValid: boolean; error?: string } {
    if (!value.trim()) return { isValid: true };
    
    const validation = ProfileAPI.validateSocialLink(platform, value);
    return {
      isValid: validation.isValid,
      error: validation.error
    };
  }

  /**
   * Save profile changes
   */
  static async saveProfile(
    profile: UserProfile,
    socialLinks: Record<string, string>
  ): Promise<{ success: boolean; errors?: Record<string, string> }> {
    if (!profile) return { success: false };
    
    try {
      // Validate social links
      const validatedSocialLinks: Record<string, string> = {};
      const errors: Record<string, string> = {};
      let hasErrors = false;
      
      for (const [platform, handle] of Object.entries(socialLinks)) {
        if (handle.trim()) {
          const validation = ProfileAPI.validateSocialLink(platform, handle);
          if (validation.isValid) {
            validatedSocialLinks[platform] = handle.replace(/^@/, '');
          } else {
            errors[platform] = validation.error || 'Invalid handle';
            hasErrors = true;
          }
        }
      }
      
      if (hasErrors) {
        return { success: false, errors };
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
        
        return { success: true };
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
    
    return { success: false };
  }

  /**
   * Get full social media URL for a platform and handle
   */
  static getSocialUrl(platform: string, handle: string): string {
    if (!handle) return '';
    const validation = ProfileAPI.validateSocialLink(platform, handle);
    return validation.url || '';
  }

  /**
   * Get preset color options
   */
  static getPresetColors(): Array<{ name: string; color: string }> {
    return [
      { name: 'Cyan', color: '#06b6d4' },
      { name: 'Purple', color: '#8b5cf6' },
      { name: 'Green', color: '#10b981' },
      { name: 'Orange', color: '#f59e0b' },
      { name: 'Pink', color: '#ec4899' },
      { name: 'Red', color: '#ef4444' },
      { name: 'Blue', color: '#3b82f6' },
      { name: 'Yellow', color: '#eab308' }
    ];
  }

  /**
   * Get social platform icon names
   */
  static getSocialPlatforms(): Array<{ platform: string; icon: string }> {
    return [
      { platform: 'twitter', icon: 'Twitter' },
      { platform: 'instagram', icon: 'Instagram' },
      { platform: 'youtube', icon: 'Youtube' },
      { platform: 'twitch', icon: 'Twitch' },
      { platform: 'github', icon: 'Github' }
    ];
  }

  /**
   * Initialize default social links
   */
  static getDefaultSocialLinks(): Record<string, string> {
    return {
      twitter: '',
      instagram: '',
      youtube: '',
      twitch: '',
      github: ''
    };
  }

  /**
   * Calculate average statistics
   */
  static calculateAverageStats(profile: UserProfile): {
    avgSurvival: number;
    avgMeteors: number;
    avgDistance: number;
  } {
    if (!profile || profile.total_games_played === 0) {
      return { avgSurvival: 0, avgMeteors: 0, avgDistance: 0 };
    }

    return {
      avgSurvival: profile.total_survival_time / profile.total_games_played,
      avgMeteors: profile.total_meteors_destroyed / profile.total_games_played,
      avgDistance: profile.total_distance_traveled / profile.total_games_played
    };
  }

  /**
   * Format time for display
   */
  static formatTime(seconds: number): string {
    return `${Math.floor(seconds)}s`;
  }

  /**
   * Format distance for display
   */
  static formatDistance(pixels: number): string {
    return `${Math.floor(pixels)}px`;
  }

  /**
   * Format number with locale string
   */
  static formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Get tab configuration
   */
  static getTabConfig(): Array<{
    id: 'info' | 'stats' | 'customization' | 'social' | 'privacy';
    label: string;
    icon: string;
  }> {
    return [
      { id: 'info', label: 'Info', icon: 'User' },
      { id: 'stats', label: 'Stats', icon: 'Trophy' },
      { id: 'customization', label: 'Cursor', icon: 'Target' },
      { id: 'social', label: 'Social', icon: 'ExternalLink' },
      { id: 'privacy', label: 'Privacy', icon: 'Eye' }
    ];
  }
}