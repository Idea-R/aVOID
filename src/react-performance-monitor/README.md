# React Performance Monitor

Universal React performance monitoring with agent-ready exports. Drop-in solution for detecting excessive re-renders and performance bottlenecks.

*Originally created during Bolt hackathon for aVOID game - now battle-tested and ready for any React app! 🏆*

## ⚡ Test It NOW (30 seconds)

**Your monitor is already active!** Open browser console (`F12`) and try:

```javascript
// Check if it's working
perf.quick()     // Show current issues (if any)
perf.summary()   // Full report 
perf.copy()      // Copy report to clipboard (paste to AI!)
```

**Nothing showing?** That's good! It means no performance issues detected. To force a test:

1. Open React DevTools
2. Start your game 
3. Let it run for 10 seconds
4. Run `perf.quick()` again

**Expected:** You'll see render counts for components like HUD, GameOverScreen, etc.

---

## 🚀 Quick Setup

```typescript
import { setupPerformanceMonitoring, RenderProfiler } from './react-performance-monitor';

// 1. Initialize monitoring (add to App.tsx)
setupPerformanceMonitoring();

// 2. Wrap problematic components  
<RenderProfiler id="UserDashboard">
  <UserDashboard />
</RenderProfiler>
```

## 📋 How to Trigger & Use

### Browser Console Commands
```javascript
// 🎯 PRIMARY COMMANDS
perf.copy()      // Copy performance issues to clipboard (agent-ready)
perf.quick()     // Show quick summary of problem components  
perf.summary()   // Detailed performance report

// 🔧 UTILITY COMMANDS  
perf.culprits()  // Get raw culprit data
perf.reset()     // Reset all tracking data
perf.export()    // Export full dataset as JSON
```

### Automatic Triggers
- **Excessive renders**: Warns when component renders >30 times/second
- **Slow renders**: Flags renders taking >16ms  
- **Console warnings**: Auto-logs performance issues
- **Snapshots**: Takes performance snapshots every 10 seconds

### Manual Triggers
```typescript
// Hook-based tracking
function UserProfile() {
  useRenderTracker('UserProfile');
  return <div>Profile content</div>;
}

// Operation tracking
const trackExpensiveOp = useOperationTracker('DataProcessing');
trackExpensiveOp(() => processLargeDataset());
```

## 📊 Agent Export Example

Running `perf.copy()` gives you this clipboard-ready prompt:

```
🚨 REACT PERFORMANCE ISSUES:

UserDashboard: 847 renders, 2.3ms avg, 45ms max - Excessive renders
NavigationMenu: 156 renders, 1.8ms avg
TokenDisplay: 89 renders, 0.9ms avg - Slow render

Fix excessive re-renders using React.memo, useCallback, useMemo.
```

**Perfect for pasting into AI assistants for targeted fixes!**

## 🎯 Integration Examples

### Basic Setup
```typescript
// App.tsx
import { setupPerformanceMonitoring } from './react-performance-monitor';

setupPerformanceMonitoring(); // ← Add this one line
```

### Component Profiling
```typescript
import { RenderProfiler, useRenderTracker } from './react-performance-monitor';

// Method 1: Wrapper (recommended)
<RenderProfiler id="GameUI">
  <GameUI />
</RenderProfiler>

// Method 2: Hook  
function UserToken() {
  useRenderTracker('UserToken');
  return <div className="token">🎯</div>;
}

// Method 3: HOC
const ProfiledComponent = withRenderProfiler(ExpensiveList, 'ExpensiveList');
```

### Custom Configuration
```typescript
// High-performance apps
setupPerformanceMonitoring({
  maxRendersPerSecond: 15,
  maxRenderTime: 8,
  warningThreshold: 5
});

// Development debugging  
setupPerformanceMonitoring({
  enableConsoleLogging: true,
  logLevel: 'debug',
  onExcessiveRenders: (metric) => {
    console.error(`🚨 ${metric.componentName} is re-rendering excessively!`);
  }
});
```

## ⚡ Real-World Usage Patterns

### Debug Slow Lists
```typescript
// Before: Slow user list
function UserList({ users }) {
  return users.map(user => <UserCard key={user.id} user={user} />);
}

// After: Monitored
<RenderProfiler id="UserList">  
  <UserList users={users} />
</RenderProfiler>

// Check results: perf.copy() → paste to AI
```

### Monitor API Components
```typescript
function APIStatus() {
  useRenderTracker('APIStatus');
  const [status, setStatus] = useState('loading');
  
  // Component logic...
  return <StatusIndicator status={status} />;
}
```

### Track Form Performance
```typescript
<RenderProfiler id="UserForm">
  <form onSubmit={handleSubmit}>
    <UserInput />
    <PasswordField />
    <SubmitButton />
  </form>
</RenderProfiler>
```

## 🔧 Configuration Presets

```typescript
import { presets } from './react-performance-monitor';

// Quick presets
presets.development();  // Verbose logging, low thresholds
presets.production();   // Silent, disabled  
presets.debugging();    // Maximum sensitivity
```

## 🎯 Advanced Features

### Smart Threshold Detection
```typescript
// Automatically adjusts thresholds based on your app's patterns
const smartThreshold = AgentExporter.getSmartThreshold();
```

### Memory & FPS Tracking
```typescript
setupPerformanceMonitoring({
  trackMemoryUsage: true,  // Chrome/Edge only
  trackFPS: true,          // Estimates FPS
});
```

### Custom Callbacks
```typescript
setupPerformanceMonitoring({
  onExcessiveRenders: (metric) => {
    // Send to analytics
    analytics.track('performance_issue', { component: metric.componentName });
  },
  onWarning: (component, warning) => {
    // Log to external service
    logger.warn(`Performance warning: ${component} - ${warning}`);
  }
});
```

## 📁 File Structure

```
react-performance-monitor/
├── index.ts                    # Main exports
├── core/
│   └── PerformanceMonitor.ts   # Core monitoring engine
├── components/  
│   └── RenderProfiler.tsx      # React profiler wrapper
├── hooks/
│   └── useRenderTracker.ts     # Performance hooks
├── utils/
│   └── AgentExporter.ts        # Agent-ready export utilities
├── setup/
│   └── quickSetup.ts           # One-line initialization
├── types/
│   └── PerformanceTypes.ts     # TypeScript definitions
├── config/
│   └── defaultConfig.ts        # Sensible defaults
└── USAGE_EXAMPLES.md           # Copy-paste examples
```

## 🌍 Framework Compatibility

- ✅ **Create React App** (CRA)
- ✅ **Vite** 
- ✅ **Next.js** (client-side only)
- ✅ **Remix** (browser bundle)
- ✅ **Gatsby**
- ✅ **Any React 16.9+** project

## 🚀 Future Roadmap

- **Vue Performance Monitor** - Same concept for Vue.js
- **Angular Performance Monitor** - Performance tracking for Angular
- **Svelte Performance Monitor** - Lightweight Svelte version
- **Universal Web Performance** - Framework-agnostic version

## 📦 Installation & Sharing

**No npm package needed!** Simply copy the `react-performance-monitor/` folder into any React project.

**Zero dependencies** - Only requires React 16.9+

**Share with team:** Send folder + one-line setup instruction

---

*Born in the fires of Bolt.new hackathon, now ready to optimize React apps everywhere! 🔥* 