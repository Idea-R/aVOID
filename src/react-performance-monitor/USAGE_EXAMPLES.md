# React Performance Monitor - Usage Examples

## 🚀 Quick Copy-Paste Examples

### 1. One-Line Setup (App.tsx)
```typescript
import { setupPerformanceMonitoring } from './react-performance-monitor';

// Add this line anywhere in your app
setupPerformanceMonitoring();
```

### 2. Component Profiling
```typescript
import { RenderProfiler, useRenderTracker } from './react-performance-monitor';

// Method A: Wrapper (recommended)
<RenderProfiler id="UserDashboard">
  <UserDashboard items={users} />
</RenderProfiler>

// Method B: Hook
function APIStatus() {
  useRenderTracker('APIStatus');
  return <div>Status: Online</div>;
}

// Method C: HOC  
const ProfiledUserList = withRenderProfiler(UserList, 'UserList');
```

### 3. Browser Console Commands (How to Trigger)
```javascript
// 🎯 PRIMARY COMMANDS
perf.copy()      // Copy performance issues to clipboard (agent-ready)
perf.quick()     // Quick summary of problem components
perf.summary()   // Full detailed performance report

// 🔧 UTILITY COMMANDS
perf.culprits()  // Get raw performance violator data
perf.reset()     // Reset all tracking metrics
perf.export()    // Export complete dataset as JSON
```

## 📋 Agent-Ready Output Example

When you run `perf.copy()`, you get this in clipboard:

```
🚨 REACT PERFORMANCE ISSUES:

UserDashboard: 847 renders, 2.3ms avg, 45ms max - Excessive renders
NavigationMenu: 156 renders, 1.8ms avg
TokenDisplay: 89 renders, 0.9ms avg - Slow render
APIStatus: 67 renders, 1.2ms avg

Fix excessive re-renders using React.memo, useCallback, useMemo.
```

**Perfect for pasting directly into AI chat for targeted performance fixes!**

## ⚡ Quick Integration Steps

1. **Copy** the entire `react-performance-monitor/` folder to your project
2. **Add** one import to your App.tsx: `import { setupPerformanceMonitoring } from './react-performance-monitor';`
3. **Call** `setupPerformanceMonitoring();` 
4. **Wrap** suspicious components with `<RenderProfiler id="ComponentName">`
5. **Open** browser console and run `perf.copy()` to get performance report
6. **Paste** the output to your AI assistant for instant fixes

## 🎯 Real-World Examples

### Debug Slow Dashboard
```typescript
// Before: Slow rendering dashboard
function UserDashboard({ userData, notifications, metrics }) {
  return (
    <div>
      <UserProfile user={userData} />
      <NotificationCenter notifications={notifications} />
      <MetricsWidget metrics={metrics} />
    </div>
  );
}

// After: Add profiling
<RenderProfiler id="UserDashboard">
  <UserDashboard userData={userData} notifications={notifications} metrics={metrics} />
</RenderProfiler>

// Check results: perf.copy() → paste to AI → get optimized code
```

### Monitor Form Components
```typescript
import { useRenderTracker } from './react-performance-monitor';

function LoginForm() {
  useRenderTracker('LoginForm');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  return (
    <form>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Track Data Processing
```typescript
import { useOperationTracker } from './react-performance-monitor';

function DataProcessor() {
  const trackOperation = useOperationTracker('DataProcessing');
  
  const processUserData = () => {
    trackOperation(() => {
      // Expensive data processing here
      transformLargeDataset(rawData);
      calculateMetrics(processedData);
      generateReports(metrics);
    });
  };
  
  return <button onClick={processUserData}>Process Data</button>;
}
```

### Monitor List Rendering
```typescript
// High-frequency re-rendering list
function UserList({ users, filters, sortBy }) {
  return (
    <RenderProfiler id="UserList">
      <div>
        {users
          .filter(user => matchesFilters(user, filters))
          .sort((a, b) => sortUsers(a, b, sortBy))
          .map(user => (
            <RenderProfiler key={user.id} id={`UserCard-${user.id}`}>
              <UserCard user={user} />
            </RenderProfiler>
          ))
        }
      </div>
    </RenderProfiler>
  );
}
```

## 🔧 Configuration Examples

### High-Performance Apps
```typescript
// For apps that need maximum performance
setupPerformanceMonitoring({
  maxRendersPerSecond: 10,  // Very strict
  maxRenderTime: 8,         // 8ms threshold
  warningThreshold: 3,      // Warn after 3 renders
  enableConsoleLogging: true
});
```

### Development Debugging
```typescript
// For debugging during development
setupPerformanceMonitoring({
  maxRendersPerSecond: 60,
  enableConsoleLogging: true,
  logLevel: 'debug',
  onExcessiveRenders: (metric) => {
    console.error(`🚨 ${metric.componentName} is over-rendering!`);
    // Could trigger debugger, send alerts, etc.
  }
});
```

### Production Monitoring
```typescript
// For production apps with analytics
setupPerformanceMonitoring({
  maxRendersPerSecond: 30,
  enableConsoleLogging: false,
  onExcessiveRenders: (metric) => {
    // Send to analytics service
    analytics.track('performance_issue', {
      component: metric.componentName,
      renderCount: metric.renderCount,
      avgTime: metric.averageRenderTime
    });
  }
});
```

## 📊 Advanced Usage Patterns

### Conditional Profiling
```typescript
// Only profile in development
const shouldProfile = process.env.NODE_ENV === 'development';

function ExpensiveComponent() {
  const content = <ComplexUI />;
  
  return shouldProfile ? (
    <RenderProfiler id="ExpensiveComponent">
      {content}
    </RenderProfiler>
  ) : content;
}
```

### Profile Specific User Flows
```typescript
// Profile checkout flow specifically
function CheckoutFlow() {
  return (
    <RenderProfiler id="CheckoutFlow">
      <div>
        <RenderProfiler id="CartSummary">
          <CartSummary />
        </RenderProfiler>
        
        <RenderProfiler id="PaymentForm">
          <PaymentForm />
        </RenderProfiler>
        
        <RenderProfiler id="OrderConfirmation">
          <OrderConfirmation />
        </RenderProfiler>
      </div>
    </RenderProfiler>
  );
}
```

### Smart Component Monitoring
```typescript
// Automatically wrap components that take props
const SmartProfiler = ({ children, componentName, enabled = true }) => {
  if (!enabled || process.env.NODE_ENV === 'production') {
    return children;
  }
  
  return (
    <RenderProfiler id={componentName}>
      {children}
    </RenderProfiler>
  );
};

// Usage
<SmartProfiler componentName="UserProfile" enabled={showProfiling}>
  <UserProfile user={currentUser} />
</SmartProfiler>
```

## 🎯 Troubleshooting Commands

```javascript
// Check if monitoring is active
console.log('Monitoring active:', window.performanceMonitor ? 'Yes' : 'No');

// Get current metrics count
perf.summary(); // Shows total components tracked

// Find worst performers
perf.culprits().slice(0, 3); // Top 3 worst components

// Reset and start fresh
perf.reset();

// Export data for detailed analysis
const data = perf.export();
console.log(JSON.stringify(data, null, 2));
```

## 🔧 Share with Team

**Copy this entire folder** to share with colleagues:
- Zero dependencies (only React)
- TypeScript ready
- Works with any React framework
- One-line integration
- Instant agent-ready reports

**Folder size**: ~50KB
**Setup time**: 30 seconds
**Value**: Instant performance debugging 