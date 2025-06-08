/**
 * Utility to check and diagnose Supabase configuration issues
 */

export interface SupabaseHealthCheck {
  isConfigured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlValid: boolean;
  authEndpointReachable: boolean;
  issues: string[];
  recommendations: string[];
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthCheck> {
  const result: SupabaseHealthCheck = {
    isConfigured: false,
    hasUrl: false,
    hasAnonKey: false,
    urlValid: false,
    authEndpointReachable: false,
    issues: [],
    recommendations: []
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Check if environment variables exist
  result.hasUrl = !!supabaseUrl;
  result.hasAnonKey = !!supabaseAnonKey;

  if (!result.hasUrl) {
    result.issues.push('VITE_SUPABASE_URL environment variable is missing');
    result.recommendations.push('Add VITE_SUPABASE_URL to your .env file');
  }

  if (!result.hasAnonKey) {
    result.issues.push('VITE_SUPABASE_ANON_KEY environment variable is missing');
    result.recommendations.push('Add VITE_SUPABASE_ANON_KEY to your .env file');
  }

  // Validate URL format
  if (result.hasUrl) {
    try {
      const url = new URL(supabaseUrl);
      result.urlValid = url.hostname.includes('supabase.co') || url.hostname.includes('localhost');
      
      if (!result.urlValid) {
        result.issues.push('Supabase URL format appears invalid');
        result.recommendations.push('Ensure URL is in format: https://your-project.supabase.co');
      }
    } catch (error) {
      result.urlValid = false;
      result.issues.push('Supabase URL is malformed');
      result.recommendations.push('Check URL format in .env file');
    }
  }

  // Test auth endpoint reachability
  if (result.hasUrl && result.urlValid) {
    try {
      const authUrl = `${supabaseUrl}/auth/v1/settings`;
      const response = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey || ''}`
        }
      });

      result.authEndpointReachable = response.status < 500;
      
      if (!result.authEndpointReachable) {
        result.issues.push(`Auth endpoint returned ${response.status}: ${response.statusText}`);
        
        if (response.status === 401 || response.status === 403) {
          result.recommendations.push('Check your anon key is correct and has proper permissions');
        } else if (response.status === 404) {
          result.recommendations.push('Verify your Supabase project URL is correct');
        } else {
          result.recommendations.push('Check Supabase project status and network connectivity');
        }
      }
    } catch (error) {
      result.authEndpointReachable = false;
      result.issues.push(`Cannot reach auth endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.recommendations.push('Check network connectivity and Supabase project status');
    }
  }

  result.isConfigured = result.hasUrl && result.hasAnonKey && result.urlValid && result.authEndpointReachable;

  return result;
}

/**
 * Log Supabase health check results to console
 */
export async function logSupabaseHealth(): Promise<void> {
  console.group('🔍 Supabase Health Check');
  
  const health = await checkSupabaseHealth();
  
  if (health.isConfigured) {
    console.log('✅ Supabase is properly configured and reachable');
  } else {
    console.warn('⚠️ Supabase configuration issues detected');
    
    if (health.issues.length > 0) {
      console.group('❌ Issues:');
      health.issues.forEach(issue => console.error(`• ${issue}`));
      console.groupEnd();
    }
    
    if (health.recommendations.length > 0) {
      console.group('💡 Recommendations:');
      health.recommendations.forEach(rec => console.info(`• ${rec}`));
      console.groupEnd();
    }
  }
  
  console.groupEnd();
}

/**
 * Get user-friendly Supabase status
 */
export function getSupabaseStatusMessage(health: SupabaseHealthCheck): string {
  if (health.isConfigured) {
    return '✅ Supabase is working correctly';
  }
  
  if (!health.hasUrl || !health.hasAnonKey) {
    return '⚠️ Missing environment variables - check your .env file';
  }
  
  if (!health.urlValid) {
    return '❌ Invalid Supabase URL format';
  }
  
  if (!health.authEndpointReachable) {
    return '❌ Cannot connect to Supabase - check project status';
  }
  
  return '❌ Unknown configuration issue';
} 