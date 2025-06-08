import React, { useState, useEffect } from 'react';
import { Bug, Users, Mail, Database, Shield } from 'lucide-react';
import { AuthDebugger, type AuthDebugResult } from '../utils/authDebugger';
import { useAuthStore } from '../store/authStore';

export default function AuthTestPanel() {
  const [diagnosticResults, setDiagnosticResults] = useState<AuthDebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');
  const [authResult, setAuthResult] = useState<string>('');
  
  const { signUp, signIn, resetPassword } = useAuthStore();

  const runDiagnostic = async () => {
    setIsRunning(true);
    const authDebugger = new AuthDebugger();
    const results = await authDebugger.runFullDiagnostic();
    setDiagnosticResults(results);
    setIsRunning(false);
  };

  const testSignUp = async () => {
    setAuthResult('Testing sign up...');
    const result = await signUp(testEmail, testPassword, 'Test User');
    setAuthResult(`Sign Up: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || 'Account created'}`);
  };

  const testSignIn = async () => {
    setAuthResult('Testing sign in...');
    const result = await signIn(testEmail, testPassword);
    setAuthResult(`Sign In: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || 'Logged in'}`);
  };

  const testPasswordReset = async () => {
    setAuthResult('Testing password reset...');
    const result = await resetPassword(testEmail);
    setAuthResult(`Password Reset: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || 'Email sent'}`);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 w-96 bg-gray-900 border border-cyan-500 rounded-lg p-4 z-50 max-h-96 overflow-y-auto text-sm">
      <div className="flex items-center gap-2 mb-4">
        <Bug className="w-5 h-5 text-cyan-400" />
        <h2 className="text-cyan-300 font-bold">Auth Debugger</h2>
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="ml-auto px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Re-run'}
        </button>
      </div>

      {/* Diagnostic Results */}
      <div className="space-y-2 mb-4">
        {diagnosticResults.map((result, index) => (
          <div key={index} className={`flex items-start gap-2 p-2 bg-gray-800 rounded text-xs ${getStatusColor(result.status)}`}>
            <span>{getStatusIcon(result.status)}</span>
            <div className="flex-1">
              <div className="font-medium">{result.step}</div>
              <div className="text-gray-300">{result.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Auth Tests */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-cyan-300 font-medium mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Quick Auth Tests
        </h3>
        
        <div className="space-y-2 mb-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Test email"
            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
          />
          <input
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            placeholder="Test password"
            className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
          />
        </div>

        <div className="grid grid-cols-3 gap-1 mb-3">
          <button
            onClick={testSignUp}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
          >
            Sign Up
          </button>
          <button
            onClick={testSignIn}
            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
          >
            Sign In
          </button>
          <button
            onClick={testPasswordReset}
            className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded"
          >
            Reset
          </button>
        </div>

        {authResult && (
          <div className="p-2 bg-gray-800 border border-gray-600 rounded text-xs">
            <div className="text-gray-300">{authResult}</div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="border-t border-gray-700 pt-2 mt-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-green-400">{diagnosticResults.filter(r => r.status === 'success').length}</div>
            <div className="text-gray-400">Success</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-400">{diagnosticResults.filter(r => r.status === 'warning').length}</div>
            <div className="text-gray-400">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-red-400">{diagnosticResults.filter(r => r.status === 'error').length}</div>
            <div className="text-gray-400">Errors</div>
          </div>
        </div>
      </div>
    </div>
  );
} 