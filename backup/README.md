# Backup Files

This folder contains old files from the perspective visualization project that were replaced during the modularization process.

## Contents

### Original Files (Pre-Modularization)
- `combined_perspective_backup.html` (82KB) - Original monolithic file with 1943 lines
- `hemispherical_projection.html` (33KB) - Standalone hemispherical projection demo
- `linear_projection.html` (23KB) - Standalone linear projection demo
- `combined_perspective.html` (6.8KB) - Intermediate version during modularization

### Development/Debug Files
- `debug.html` - Early debug interface
- `debug-projection.html` - Projection system debugging tool
- `test-modules.html` - Module loading validation tool
- `simple-test.html` - Basic Three.js functionality test

## Current Project Structure

The main project now uses:
- `index.html` - Clean modular entry point (156 lines, was 1943 lines)
- `js/` - Modular JavaScript architecture (19 files)
- `css/` - Separated stylesheets (3 files)

## Modularization Results

- **92% reduction** in main HTML complexity
- **Professional ES6 module system** with clean separation of concerns
- **100% feature preservation** with enhanced performance
- **Maintainable architecture** for future development

These backup files are kept for reference and can be safely archived or removed if needed. 