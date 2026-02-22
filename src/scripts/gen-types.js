#!/usr/bin/env node

/**
 * gen-types.js
 * 
 * Генерирует TypeScript типы из Supabase базы данных.
 * Это обёртка над командой `supabase gen types typescript`.
 * 
 * ТРЕБОВАНИЯ:
 * - Установленный Supabase CLI: npm install -g supabase
 * - Настроенный .env с SUPABASE_PROJECT_ID
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * node scripts/gen-types.js
 * 
 * ИЛИ через npm:
 * npm run gen-types
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '../generated/types');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'database.ts');

// Supabase project ID (из .env или аргумента)
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || process.argv[2];

// ============================================================================
// VALIDATION
// ============================================================================

if (!PROJECT_ID) {
  console.error('❌ Error: SUPABASE_PROJECT_ID not found');
  console.log('');
  console.log('Please set it in .env:');
  console.log('  SUPABASE_PROJECT_ID=your-project-id');
  console.log('');
  console.log('Or pass as argument:');
  console.log('  node scripts/gen-types.js your-project-id');
  console.log('');
  process.exit(1);
}

// ============================================================================
// MAIN
// ============================================================================

console.log('🔧 Generating TypeScript types from Supabase...');
console.log('');

try {
  // Создать директорию если не существует
  if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	console.log('✅ Created directory:', OUTPUT_DIR);
  }
  
  // Генерировать типы через Supabase CLI
  console.log('📡 Fetching schema from Supabase...');
  console.log(`   Project ID: ${PROJECT_ID}`);
  console.log('');
  
  const command = `supabase gen types typescript --project-id=${PROJECT_ID} --schema=public`;
  
  const types = execSync(command, {
	encoding: 'utf-8',
	stdio: ['pipe', 'pipe', 'inherit'] // stderr в консоль, stdout в переменную
  });
  
  // Записать в файл
  fs.writeFileSync(OUTPUT_FILE, types);
  
  console.log('');
  console.log('✅ Types generated successfully!');
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log('');
  console.log('📊 Stats:');
  console.log(`   Size: ${(types.length / 1024).toFixed(2)} KB`);
  console.log(`   Lines: ${types.split('\n').length}`);
  console.log('');
  console.log('Next step: Run `npm run gen-schemas` to generate Zod schemas');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('❌ Error generating types:');
  console.error('');
  
  if (error.message.includes('command not found')) {
	console.error('Supabase CLI not installed.');
	console.error('Install it with: npm install -g supabase');
  } else if (error.message.includes('not logged in')) {
	console.error('Not logged in to Supabase.');
	console.error('Run: supabase login');
  } else {
	console.error(error.message);
  }
  
  console.error('');
  process.exit(1);
}