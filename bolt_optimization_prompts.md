# Bolt AI Optimization Prompts for aVOID Project

## 🚨 **CRITICAL PRIORITY: File Size Violations**

### **PROMPT 1: Split Engine.ts (723 lines → 4 modules)**

```
OBJECTIVE: Split Engine.ts into GameEngine.ts core module

CURRENT FILE: src/game/Engine.ts (723 lines)

EXTRACT TO NEW FILE: src/game/GameEngine.ts

RESPONSIBILITIES FOR GameEngine.ts:
- Core game loop (requestAnimationFrame)
- Game state management (gameState: 'playing' | 'paused' | 'gameOver')
- Basic physics timing and delta calculations
- Main update cycle coordination
- Game reset functionality

TARGET SIZE: 180-200 lines

PRESERVE COMPLETELY:
- All existing game mechanics and physics
- Current performance optimizations (gradient caching, shadow batching)
- Existing API compatibility with Game.tsx component
- All current game settings and configurations
- Mobile performance scaling system

EXCLUDE FROM THIS MODULE (keep in Engine.ts for now):
- Input handling (mouse/touch events)
- Settings management
- Performance monitoring
- UI state management

INTEGRATION REQUIREMENTS:
- Export GameEngine class as default
- Maintain same constructor parameters
- Keep all existing public methods
- Import existing systems (RenderSystem, CollisionSystem, etc.)

SUCCESS CRITERIA:
- GameEngine.ts: <200 lines
- No functionality changes
- Same 60fps performance
- All existing game features work
```

---

### **PROMPT 2: Split Engine.ts Input Handler (Part 2)**

```
OBJECTIVE: Extract input handling from Engine.ts into InputManager.ts

CURRENT FILE: src/game/Engine.ts (remaining after GameEngine split)

EXTRACT TO NEW FILE: src/game/InputManager.ts

RESPONSIBILITIES FOR InputManager.ts:
- Mouse event handling (mousedown, mouseup, mousemove)
- Touch event handling (touchstart, touchmove, touchend)
- Keyboard event handling
- Input coordinate transformations
- Mobile touch optimizations
- Multi-touch prevention

TARGET SIZE: 150-180 lines

PRESERVE COMPLETELY:
- All current touch controls (continuous tracking)
- Mobile-specific optimizations
- Coordinate transformation accuracy
- Touch ID tracking system
- preventDefault behavior

FEATURES TO INCLUDE:
- Canvas bounds checking
- Touch smoothing
- Input state management
- Event listener management

INTEGRATION:
- Export InputManager class
- Import into GameEngine.ts
- Maintain same input behavior
- Keep performance optimizations

SUCCESS CRITERIA:
- InputManager.ts: <180 lines
- Perfect touch/mouse controls
- No input lag on mobile
- Same responsive behavior
```

---

### **PROMPT 3: Split RenderSystem.ts (675 lines → 3 modules)**

```
OBJECTIVE: Split RenderSystem.ts into Renderer.ts core module

CURRENT FILE: src/game/systems/RenderSystem.ts (675 lines)

EXTRACT TO NEW FILE: src/game/systems/Renderer.ts

RESPONSIBILITIES FOR Renderer.ts:
- Core rendering loop
- Canvas context management
- Basic drawing operations (circles, rectangles)
- Transform calculations
- Viewport management

TARGET SIZE: 250-280 lines

PRESERVE COMPLETELY:
- All current rendering performance
- Gradient caching system integration
- Shadow batching optimizations
- Mobile performance scaling
- Visual quality on all devices

EXCLUDE FROM THIS MODULE:
- Gradient caching logic (separate file)
- Complex drawing utilities (separate file)
- Performance monitoring

INTEGRATION REQUIREMENTS:
- Export Renderer class as default
- Import GradientCache and DrawingUtils
- Maintain same rendering API
- Keep all performance optimizations

SUCCESS CRITERIA:
- Renderer.ts: <280 lines
- Same 60fps rendering performance
- No visual quality regression
- All effects work perfectly
```

---

### **PROMPT 4: Extract Gradient Cache from RenderSystem.ts**

```
OBJECTIVE: Extract gradient caching system into GradientCache.ts

CURRENT FILE: src/game/systems/RenderSystem.ts

EXTRACT TO NEW FILE: src/game/systems/GradientCache.ts

RESPONSIBILITIES FOR GradientCache.ts:
- Gradient creation and caching
- Cache key generation (${radius}_${color}_${isSuper})
- LRU eviction (200 entry limit)
- Cache hit/miss optimization
- Memory management

TARGET SIZE: 120-150 lines

PRESERVE COMPLETELY:
- Current caching performance gains (~20-30% improvement)
- LRU eviction logic
- Cache key format
- Memory efficiency

FEATURES TO INCLUDE:
- Map<string, GradientCacheEntry> storage
- Cache statistics (optional)
- Memory cleanup methods
- Performance monitoring integration

INTEGRATION:
- Export GradientCache class
- Import into Renderer.ts
- Maintain same caching API
- Keep performance benefits

SUCCESS CRITERIA:
- GradientCache.ts: <150 lines
- Same caching performance
- Memory usage optimized
- Easy integration
```

---

### **PROMPT 5: Split ProfileModal.tsx (723 lines → 2 modules)**

```
OBJECTIVE: Split ProfileModal.tsx into ProfileModal.tsx (UI only)

CURRENT FILE: src/components/ProfileModal.tsx (723 lines)

REFACTOR CURRENT FILE: Keep UI structure and layout

EXTRACT TO NEW FILE: src/hooks/useProfile.ts

RESPONSIBILITIES FOR ProfileModal.tsx (UI only):
- Modal layout and structure
- Form rendering
- Tab navigation UI
- Button components
- Visual elements

TARGET SIZE: 300-350 lines

EXTRACT TO useProfile.ts:
- Profile data management
- Form state handling
- Validation logic
- API calls to profiles.ts
- Statistics calculations
- Achievement logic

PRESERVE COMPLETELY:
- All current UI functionality
- Form validation behavior
- Profile statistics display
- Achievement system
- Mobile responsive design

INTEGRATION:
- Create useProfile custom hook
- Import hook into ProfileModal.tsx
- Maintain same user experience
- Keep all features working

SUCCESS CRITERIA:
- ProfileModal.tsx: <350 lines
- useProfile.ts: <400 lines
- No functionality changes
- Same user experience
```

---

## 🚀 **PERFORMANCE OPTIMIZATION PROMPTS**

### **PROMPT 6: Mobile Performance Scaling**

```
OBJECTIVE: Enhance mobile performance scaling in GameEngine.ts

TARGET FILE: src/game/GameEngine.ts (after split from Engine.ts)

CURRENT MOBILE ISSUES:
- Frame drops on older devices
- 300 particle limit too high for mobile
- Shadow operations causing lag

MOBILE OPTIMIZATIONS TO ADD:
- Particle limit: 150 for mobile, 300 for desktop
- Disable trails on mobile devices
- Reduce shadow quality on mobile
- Lower particle spawn rate on mobile

PERFORMANCE REQUIREMENTS:
- Desktop: 60fps target
- Mobile: 45fps minimum
- Smooth gameplay on all devices
- Graceful degradation

INTEGRATION:
- Add device detection utility
- Implement adaptive settings
- Maintain desktop visual quality
- Preserve existing performance gains

SUCCESS CRITERIA:
- 45+ fps on mobile devices
- Smooth touch controls
- No visual quality loss on desktop
- Battery life improvements on mobile
```

---

### **PROMPT 7: Touch Control Enhancement**

```
OBJECTIVE: Enhance continuous touch movement in InputManager.ts

TARGET FILE: src/game/InputManager.ts (after split from Engine.ts)

CURRENT TOUCH STATE:
- Basic touch start/end working
- Continuous movement implemented
- Missing touch smoothing optimization

ENHANCEMENTS TO ADD:
- Touch position smoothing/interpolation
- Better multi-touch prevention
- Improved touch ID tracking
- Enhanced coordinate accuracy

MOBILE REQUIREMENTS:
- 60fps touch response
- No page scrolling during play
- Works on all screen sizes
- Smooth movement tracking

PRESERVE:
- All existing mouse controls
- Current knockback power activation
- Performance optimizations
- Cross-device compatibility

SUCCESS CRITERIA:
- Smooth continuous touch movement
- No input lag or jitter
- Perfect multi-touch prevention
- Responsive on all devices
```

---

### **PROMPT 8: Mobile UI Optimization**

```
OBJECTIVE: Hide gameplay buttons on mobile in HUD.tsx

TARGET FILE: src/components/HUD.tsx (218 lines - safe for Bolt)

CURRENT MOBILE ISSUES:
- Always-visible buttons cluttering mobile screens
- Fixed-size logo conflicts with game over screen
- Poor touch target sizing

MOBILE UI IMPROVEMENTS:
- Hide debug/settings buttons during gameplay on mobile
- Keep buttons visible in game over screen
- Improve button touch targets
- Add mobile-specific spacing

RESPONSIVE STRATEGY:
- Breakpoint: 768px width for mobile detection
- Touch device detection via CSS hover
- Conditional rendering based on device type
- Graceful fallbacks

PRESERVE:
- All desktop functionality
- Current responsive design patterns
- Existing component structure
- Game state integration

SUCCESS CRITERIA:
- Clean mobile gameplay screen
- Easy access to buttons when needed
- Better touch experience
- No desktop functionality loss
```

---

## 🎯 **SEQUENTIAL EXECUTION PLAN**

### **Phase 1: Critical File Splits (DO FIRST)**
1. **Engine.ts → GameEngine.ts** (Prompt 1)
2. **Engine.ts → InputManager.ts** (Prompt 2)  
3. **RenderSystem.ts → Renderer.ts** (Prompt 3)
4. **RenderSystem.ts → GradientCache.ts** (Prompt 4)
5. **ProfileModal.tsx → UI + useProfile hook** (Prompt 5)

### **Phase 2: Performance Optimizations**
6. **Mobile Performance Scaling** (Prompt 6)
7. **Touch Control Enhancement** (Prompt 7)
8. **Mobile UI Optimization** (Prompt 8)

## ⚠️ **BOLT EXECUTION NOTES**

### **Critical Success Factors:**
- **One prompt at a time** - Never combine multiple prompts
- **Test after each change** - Verify functionality before proceeding
- **File size verification** - Check line counts after each split
- **Performance testing** - Ensure no regressions

### **Risk Mitigation:**
- **Backup before changes** - Create git branches
- **Gradual implementation** - Don't rush the process
- **Functionality verification** - Test all game features
- **Performance monitoring** - Check frame rates

### **Expected Outcomes:**
- **All files <500 lines** - Bolt compatibility achieved
- **Performance improved** - 15-25% mobile gains expected
- **Code maintainability** - Better separation of concerns
- **Development velocity** - Faster future Bolt iterations

**Use these prompts in sequence, testing thoroughly between each step!** 