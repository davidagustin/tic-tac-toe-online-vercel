#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying YOLO Mode Configuration...\n');

// Check if .cursorrules exists
const cursorRulesPath = path.join(process.cwd(), '.cursorrules');
if (fs.existsSync(cursorRulesPath)) {
    console.log('✅ .cursorrules file found');
    const content = fs.readFileSync(cursorRulesPath, 'utf8');
    if (content.includes('YOLO Mode')) {
        console.log('✅ YOLO Mode configuration detected in .cursorrules');
    } else {
        console.log('⚠️ YOLO Mode configuration not found in .cursorrules');
    }
} else {
    console.log('❌ .cursorrules file not found');
}

// Check if .vscode/settings.json exists
const settingsPath = path.join(process.cwd(), '.vscode', 'settings.json');
if (fs.existsSync(settingsPath)) {
    console.log('✅ .vscode/settings.json file found');
    const content = fs.readFileSync(settingsPath, 'utf8');
    if (content.includes('cursor.general.enableAutoComplete')) {
        console.log('✅ Cursor auto-completion settings detected');
    } else {
        console.log('⚠️ Cursor auto-completion settings not found');
    }
} else {
    console.log('❌ .vscode/settings.json file not found');
}

// Check if .vscode/keybindings.json exists
const keybindingsPath = path.join(process.cwd(), '.vscode', 'keybindings.json');
if (fs.existsSync(keybindingsPath)) {
    console.log('✅ .vscode/keybindings.json file found');
    const content = fs.readFileSync(keybindingsPath, 'utf8');
    if (content.includes('cursor.chat.focus')) {
        console.log('✅ Cursor keybindings detected');
    } else {
        console.log('⚠️ Cursor keybindings not found');
    }
} else {
    console.log('❌ .vscode/keybindings.json file not found');
}

// Check if CURSOR_YOLO_MODE.md exists
const guidePath = path.join(process.cwd(), 'CURSOR_YOLO_MODE.md');
if (fs.existsSync(guidePath)) {
    console.log('✅ CURSOR_YOLO_MODE.md guide found');
} else {
    console.log('❌ CURSOR_YOLO_MODE.md guide not found');
}

console.log('\n🎯 YOLO Mode Verification Complete!');
console.log('\n📋 To verify YOLO mode is working in Cursor:');
console.log('1. Open the test-yolo-mode.tsx file');
console.log('2. Place your cursor on the TODO comment');
console.log('3. Press Cmd+Shift+G to generate code');
console.log('4. Or use Cmd+Shift+L to open Cursor Chat');
console.log('5. Ask Cursor to implement the user profile component');
console.log('\n🚀 If Cursor generates complete code with TypeScript, Tailwind, and error handling, YOLO mode is working!'); 