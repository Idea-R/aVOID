# Code Restructuring Checklist - aVOID Optimization Project

**Date:** 2025-01-06  
**Objective:** Reduce all files to <500 lines for performance and maintainability  
**Current Status:** 4 CRITICAL violations, 1 WARNING

## 🚨 **CRITICAL VIOLATIONS (>500 lines)**

### **EMERGENCY PRIORITY FILES:**
1. **Engine.ts**: 1,257 lines (151% OVER LIMIT) 🔴
2. **DefenseSystem.ts**: 921 lines (84% OVER LIMIT) 🔴  
3. **RenderSystem.ts**: 729 lines (46% OVER LIMIT) 🔴
4. **ProfileModal.tsx**: 723 lines (45% OVER LIMIT) 🔴

### **WARNING FILES (450-500 lines):**
5. **GameEngine.ts**: 466 lines (WARNING) 🟡

---

## 📋 **PHASE 1: EMERGENCY REFACTORING (CRITICAL FILES)**

### **Task 1.1: Engine.ts (1,257 lines → 4 modules)**
**Target:** Split into ~300 line modules

**ENGINE.TS ANALYSIS COMPLETE:**
- **Total lines:** 1,315 (even worse than expected!)
- **Main sections identified:**
  - **GameLoop & State:** Lines 1-270 (~270 lines)
  - **Input Handling:** Lines 302-465 (~160 lines)  
  - **Game Logic & Updates:** Lines 466-980 (~515 lines)
  - **API & Settings:** Lines 980-1315 (~335 lines)

**WBS Subtasks:**
- [x] **1.1a:** Backup current Engine.ts to `/archive/Engine_backup_20250106.md` ✅
- [x] **1.1b:** Extract GameLoop module (~300 lines) ✅ **288 lines**
  - Core requestAnimationFrame loop (lines 1056-1080)
  - Delta time calculations
  - Game state transitions (start/stop/pause/resume)
  - FPS tracking and performance monitoring
  - **CREATED:** `src/game/GameLoop.ts` (288 lines) ✅
- [ ] **1.1c:** Extract InputHandler module (~200 lines)
  - Mouse/touch event handling (lines 302-465)
  - Input coordinate transformations
  - Mobile optimizations
  - Double-click and knockback handling
- [ ] **1.1d:** Extract GameLogic module (~400 lines)
  - Game mechanics and updates (lines 466-980)
  - Meteor spawning and management
  - Collision detection coordination
  - Screen shake and visual effects
- [ ] **1.1e:** Extract EngineCore module (~300 lines)
  - Constructor and initialization (lines 1-200)
  - Settings management (lines 1219-1315)
  - System coordination
  - API integration
- [ ] **1.1f:** Test all game functionality works
- [ ] **1.1g:** Update imports in dependent files

**Success Criteria:**
- ✅ All modules <350 lines
- ✅ No functionality regression
- ✅ Same 60fps performance
- ✅ All tests pass

**CURRENT STATUS:** Task 1.1b COMPLETE ✅, Ready for 1.1c

**PROGRESS:** 1/4 modules extracted (25% complete)

---

### **Task 1.2: DefenseSystem.ts (921 lines → 3 modules)**
**Target:** Split into ~300 line modules

**WBS Subtasks:**
- [ ] **1.2a:** Backup DefenseSystem.ts to `/archive/DefenseSystem_backup_20250106.md`
- [ ] **1.2b:** Extract DefenseCore module (~300 lines)
  - Core defense mechanics
  - Defense state management
  - Basic defense operations
- [ ] **1.2c:** Extract DefenseRenderer module (~300 lines)
  - Defense visual rendering
  - Effect drawing
  - Animation handling
- [ ] **1.2d:** Extract DefenseEffects module (~300 lines)
  - Special effects system
  - Particle interactions
  - Visual enhancements
- [ ] **1.2e:** Test defense system functionality
- [ ] **1.2f:** Update Engine.ts integration

**Success Criteria:**
- ✅ All modules <350 lines
- ✅ Defense mechanics unchanged
- ✅ Visual quality maintained
- ✅ Performance preserved

---

### **Task 1.3: RenderSystem.ts (729 lines → 3 modules)**
**Target:** Split into ~250 line modules

**WBS Subtasks:**
- [ ] **1.3a:** Backup RenderSystem.ts to `/archive/RenderSystem_backup_20250106.md`
- [ ] **1.3b:** Extract CoreRenderer module (~250 lines)
  - Basic rendering operations
  - Canvas management
  - Transform calculations
- [ ] **1.3c:** Extract GradientCache module (~200 lines)
  - Gradient caching system
  - Cache management
  - Performance optimization
- [ ] **1.3d:** Extract EffectRenderer module (~250 lines)
  - Special effects rendering
  - Advanced drawing operations
  - Shader-like operations
- [ ] **1.3e:** Test rendering performance
- [ ] **1.3f:** Verify visual quality unchanged

**Success Criteria:**
- ✅ All modules <300 lines
- ✅ Same rendering performance
- ✅ Gradient caching preserved
- ✅ No visual regressions

---

### **Task 1.4: ProfileModal.tsx (723 lines → 2 modules)**
**Target:** Split into UI component + custom hook

**WBS Subtasks:**
- [ ] **1.4a:** Backup ProfileModal.tsx to `/archive/ProfileModal_backup_20250106.md`
- [ ] **1.4b:** Extract useProfile custom hook (~350 lines)
  - Profile data management
  - Form state handling
  - API interactions
  - Validation logic
- [ ] **1.4c:** Refactor ProfileModal.tsx to UI only (~350 lines)
  - Modal layout and structure
  - Form components
  - Visual elements
  - Event handlers (calling hook functions)
- [ ] **1.4d:** Test profile functionality
- [ ] **1.4e:** Verify form validation works
- [ ] **1.4f:** Test mobile responsiveness

**Success Criteria:**
- ✅ ProfileModal.tsx <400 lines
- ✅ useProfile.ts <400 lines
- ✅ All functionality preserved
- ✅ Form validation working

---

## 📋 **PHASE 2: WARNING FILE OPTIMIZATION**

### **Task 2.1: GameEngine.ts (466 lines → 2 modules)**
**Target:** Split to ~250 line modules

**WBS Subtasks:**
- [ ] **2.1a:** Extract EngineCore module (~250 lines)
- [ ] **2.1b:** Extract PerformanceManager module (~200 lines)
- [ ] **2.1c:** Test integration with Engine.ts modules

---

## 📋 **PHASE 3: PERFORMANCE OPTIMIZATIONS**

### **Task 3.1: Mobile Performance Scaling**
- [ ] **3.1a:** Implement device detection
- [ ] **3.1b:** Add adaptive particle limits (150 mobile, 300 desktop)
- [ ] **3.1c:** Implement mobile-specific optimizations
- [ ] **3.1d:** Test on mobile devices

### **Task 3.2: Touch Control Enhancement**
- [ ] **3.2a:** Improve continuous touch tracking
- [ ] **3.2b:** Add touch smoothing
- [ ] **3.2c:** Optimize touch response time
- [ ] **3.2d:** Test on multiple devices

### **Task 3.3: Mobile UI Optimization**
- [ ] **3.3a:** Hide buttons during mobile gameplay
- [ ] **3.3b:** Improve touch targets
- [ ] **3.3c:** Add responsive spacing
- [ ] **3.3d:** Test mobile UX

---

## 🎯 **EXECUTION STRATEGY**

### **Sequential Order (MANDATORY):**
1. **Complete Task 1.1** (Engine.ts) - MOST CRITICAL ⏳ **IN PROGRESS (25% DONE)**
2. **Complete Task 1.2** (DefenseSystem.ts) - NEW CRITICAL  
3. **Complete Task 1.3** (RenderSystem.ts) - EXISTING CRITICAL
4. **Complete Task 1.4** (ProfileModal.tsx) - UI CRITICAL
5. **Complete Task 2.1** (GameEngine.ts) - WARNING

### **Safety Protocols:**
- ✅ **Backup files** to `/archive/` before changes
- ✅ **Test thoroughly** after each module split
- ✅ **Verify line counts** after each change
- ✅ **Check performance** after each optimization
- ✅ **Never skip testing** - Rule #3 compliance

### **Tools to Use:**
- **Manual refactoring** for critical splits
- **Bolt AI prompts** (from bolt_optimization_prompts.md) for smaller changes
- **Performance testing** after each change
- **Git branching** for safe rollback

---

## 📊 **SUCCESS METRICS**

### **File Size Targets:**
- ✅ **All files <500 lines** (compliance achieved)
- ✅ **Target <350 lines** per module (best practice)
- ✅ **No file >450 lines** (prevention)

### **Performance Targets:**
- ✅ **60fps desktop** maintained
- ✅ **45fps mobile** minimum
- ✅ **No functionality regression**
- ✅ **Faster development velocity**

### **Quality Targets:**
- ✅ **Clean separation of concerns**
- ✅ **Maintainable code structure**
- ✅ **Easy future modifications**
- ✅ **Bolt AI compatibility**

---

## 🚨 **RISK ASSESSMENT**

### **High Risk:**
- **Engine.ts split** - Core functionality, high complexity
- **Performance regression** - Critical for game experience

### **Medium Risk:**
- **DefenseSystem.ts** - New system, less tested
- **Integration issues** - Multiple file dependencies

### **Low Risk:**
- **ProfileModal.tsx** - UI component, well-contained
- **Mobile optimizations** - Additive improvements

---

## ✅ **PHASE COMPLETION CHECKLIST**

### **After Each Task:**
- [x] File backed up to `/archive/` ✅ **Engine.ts backed up**
- [x] All modules <500 lines ✅ **GameLoop.ts: 288 lines**
- [ ] Functionality tested and working
- [ ] Performance verified
- [ ] Git committed with clear message
- [ ] Update this checklist

### **After Each Phase:**
- [ ] All tasks in phase completed
- [ ] Integration testing passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Ready for next phase

---

## 📈 **CURRENT PROGRESS SUMMARY**

### **Completed Modules:**
1. ✅ **GameLoop.ts** (288 lines) - Game loop, FPS tracking, performance monitoring

### **Remaining Critical Work:**
- **InputHandler.ts** (~200 lines) - Next priority
- **GameLogic.ts** (~400 lines) - Core game mechanics  
- **EngineCore.ts** (~300 lines) - System coordination

### **Expected Impact:**
- **Engine.ts reduction:** 1,257 → ~200 lines remaining (84% reduction)
- **Maintainability:** Massive improvement in code organization
- **Bolt compatibility:** All modules will be <350 lines

---

**NEXT STEP: Task 1.1c - Extract InputHandler module from Engine.ts** 