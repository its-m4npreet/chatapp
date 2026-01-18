# Settings Icons - Background Fix

## Issue
Settings page icons for notifications, sound, read receipts, typing indicators, and language had shrunken/changed backgrounds in light mode.

## Root Cause
The light mode CSS rules in `App.css` were overriding the colored background classes without preserving their opacity and colors.

## Fix Applied
Added comprehensive CSS rules to `App.css` to preserve all colored icon backgrounds and text colors in light mode:

### Colored Icon Backgrounds Preserved:
- ✅ `bg-green-600/20` (Notifications) 
- ✅ `bg-cyan-600/20` (Sound)
- ✅ `bg-blue-600/20` (Read Receipts)
- ✅ `bg-emerald-600/20` (Online Status)
- ✅ `bg-purple-600/20` (Typing Indicator)
- ✅ `bg-orange-600/20` (Language)
- ✅ `bg-red-600/20` (Delete Account)
- ✅ `bg-teal-600/20` (Data & Storage)
- ✅ `bg-sky-600/20` (Help Center)
- ✅ `bg-amber-600/20` (Report Bug)
- ✅ `bg-gray-600/20` (App Version)
- ✅ `bg-[#4f38f7]/20` (Dark Mode)

### Icon Text Colors Preserved:
- ✅ `text-green-400` (bright green)
- ✅ `text-cyan-400` (bright cyan)
- ✅ `text-blue-400` (bright blue)
- ✅ `text-emerald-400` (bright emerald)
- ✅ `text-purple-400` (bright purple)
- ✅ `text-orange-400` (bright orange)
- ✅ `text-red-400` (bright red)
- ✅ `text-teal-400` (bright teal)
- ✅ `text-sky-400` (bright sky)
- ✅ `text-amber-400` (bright amber)
- ✅ `text-indigo-400` (bright indigo)
- ✅ `text-[#4f38f7]` (custom purple)

## Result
✅ All icon backgrounds display correctly in both dark and light modes
✅ Icon colors remain vibrant and consistent
✅ No more shrunken/changed backgrounds
✅ Settings page looks perfect in both themes

## Files Modified
- `src/App.css` - Added 50+ lines of color preservation rules
