import { supabase } from '../lib/supabase';

export interface AuthDebugResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export class AuthDebugger {
  private results: AuthDebugResult[] = [];

  async runFullDiagnostic(): Promise<AuthDebugResult[]> {
    this.results = [];
    
    console.group('🔍 SUPABASE AUTH DIAGNOSTIC');
    
    await this.checkEnvironmentVariables();
    await this.checkSupabaseConnection();
    await this.checkAuthEndpoints();
    await this.checkDatabaseTables();
    await this.checkRLSPolicies();
    await this.testBasicAuth();
    
    console.groupEnd();
    
    return this.results;
  }

  private addResult(step: string, status: 'success' | 'error' | 'warning', message: string, details?: any) {
    const result = { step, status, message, details };
    this.results.push(result);
    
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
    console.log(`${emoji} ${step}: ${message}`);
    if (details) console.log('   Details:', details);
  }

  private async checkEnvironmentVariables() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      this.addResult('Environment', 'error', 'VITE_SUPABASE_URL is missing');
      return;
    }
    
    if (!supabaseAnonKey) {
      this.addResult('Environment', 'error', 'VITE_SUPABASE_ANON_KEY is missing');
      return;
    }
    
    // Validate URL format
    try {
      const url = new URL(supabaseUrl);
      if (!url.hostname.includes('supabase.co')) {
        this.addResult('Environment', 'warning', 'URL format seems unusual', { url: supabaseUrl });
      } else {
        this.addResult('Environment', 'success', 'Environment variables found and valid');
      }
    } catch (error) {
      this.addResult('Environment', 'error', 'Invalid URL format', { url: supabaseUrl });
    }
  }

  private async checkSupabaseConnection() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        this.addResult('Connection', 'error', 'Failed to connect to Supabase', { error: error.message });
      } else {
        this.addResult('Connection', 'success', 'Successfully connected to Supabase', { hasSession: !!data.session });
      }
    } catch (error) {
      this.addResult('Connection', 'error', 'Network error connecting to Supabase', { error: error instanceof Error ? error.message : error });
    }
  }

  private async checkAuthEndpoints() {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!baseUrl || !anonKey) return;
    
    const endpoints = [
      { name: 'Auth Settings', path: '/auth/v1/settings' },
      { name: 'Auth Users', path: '/auth/v1/admin/users' },
      { name: 'Rest API', path: '/rest/v1/' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          }
        });
        
        if (response.status < 400) {
          this.addResult('Endpoints', 'success', `${endpoint.name} accessible`);
        } else if (response.status === 401 || response.status === 403) {
          this.addResult('Endpoints', 'warning', `${endpoint.name} auth required (normal)`, { status: response.status });
        } else {
          this.addResult('Endpoints', 'error', `${endpoint.name} error`, { status: response.status, statusText: response.statusText });
        }
      } catch (error) {
        this.addResult('Endpoints', 'error', `${endpoint.name} unreachable`, { error: error instanceof Error ? error.message : error });
      }
    }
  }

  private async checkDatabaseTables() {
    try {
      // Check if user_profiles table exists and is accessible
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        this.addResult('Database', 'error', 'Cannot access user_profiles table', { error: error.message });
      } else {
        this.addResult('Database', 'success', 'user_profiles table accessible', { count: data });
      }
    } catch (error) {
      this.addResult('Database', 'error', 'Database connection error', { error: error instanceof Error ? error.message : error });
    }
    
    try {
      // Check leaderboard table
      const { data, error } = await supabase
        .from('leaderboard')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        this.addResult('Database', 'warning', 'leaderboard table issues', { error: error.message });
      } else {
        this.addResult('Database', 'success', 'leaderboard table accessible', { count: data });
      }
    } catch (error) {
      this.addResult('Database', 'warning', 'leaderboard table error', { error: error instanceof Error ? error.message : error });
    }
  }

  private async checkRLSPolicies() {
    try {
      // Test RLS by trying to read from auth.users (should fail)
      const { data, error } = await supabase
        .from('auth.users')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('permission denied')) {
        this.addResult('Security', 'success', 'RLS is properly configured (auth.users protected)');
      } else if (error) {
        this.addResult('Security', 'warning', 'Unexpected RLS behavior', { error: error.message });
      } else {
        this.addResult('Security', 'warning', 'RLS may be misconfigured (can access auth.users)', { data });
      }
    } catch (error) {
      this.addResult('Security', 'warning', 'Cannot test RLS policies', { error: error instanceof Error ? error.message : error });
    }
  }

  private async testBasicAuth() {
    try {
      // Test auth flow with invalid credentials (should fail gracefully)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@invalid-domain-12345.com',
        password: 'invalid'
      });
      
      if (error && error.message.includes('Invalid login credentials')) {
        this.addResult('Auth Flow', 'success', 'Auth endpoints working (correctly rejected invalid login)');
      } else if (error) {
        this.addResult('Auth Flow', 'error', 'Auth flow error', { error: error.message });
      } else {
        this.addResult('Auth Flow', 'error', 'Auth flow issue - invalid login succeeded', { data });
      }
    } catch (error) {
      this.addResult('Auth Flow', 'error', 'Auth flow crashed', { error: error instanceof Error ? error.message : error });
    }
  }

  generateReport(): string {
    const successCount = this.results.filter(r => r.status === 'success').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    
    let report = `
🔍 SUPABASE AUTH DIAGNOSTIC REPORT
=================================
✅ Success: ${successCount}
⚠️  Warnings: ${warningCount}
❌ Errors: ${errorCount}

ISSUES FOUND:
`;
    
    this.results.filter(r => r.status === 'error').forEach(result => {
      report += `❌ ${result.step}: ${result.message}\n`;
    });
    
    if (errorCount === 0) {
      report += "No critical errors found!\n";
    }
    
    report += `
WARNINGS:
`;
    
    this.results.filter(r => r.status === 'warning').forEach(result => {
      report += `⚠️  ${result.step}: ${result.message}\n`;
    });
    
    if (warningCount === 0) {
      report += "No warnings!\n";
    }
    
    return report;
  }
}

// Quick diagnostic function
export async function quickAuthDiagnostic(): Promise<void> {
  const authDebugger = new AuthDebugger();
  const results = await authDebugger.runFullDiagnostic();
  
  console.log('\n' + authDebugger.generateReport());
  
  // Return actionable recommendations
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.group('🚨 IMMEDIATE ACTIONS NEEDED:');
    errors.forEach(error => {
      console.error(`• Fix ${error.step}: ${error.message}`);
    });
    console.groupEnd();
  }
} 