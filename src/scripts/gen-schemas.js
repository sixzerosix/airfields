#!/usr/bin/env node

/**
 * gen-schemas.js
 * 
 * Генерирует Zod схемы из TypeScript типов и config.json
 * 
 * WORKFLOW:
 * 1. Читает generated/types/database.ts
 * 2. Парсит типы таблиц (Row)
 * 3. Применяет правила из config.json
 * 4. Генерирует Zod схемы в schemas/*.ts
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * node scripts/gen-schemas.js
 * 
 * ИЛИ через npm:
 * npm run gen-schemas
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================

const TYPES_FILE = path.join(__dirname, '../generated/types/database.ts');
const CONFIG_FILE = path.join(__dirname, '../lib/validators/config.json');
const OUTPUT_DIR = path.join(__dirname, '../src/lib/schemas');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Парсинг TypeScript типа в простой объект
 * Это упрощённый парсер для базовых случаев
 */
function parseTypeDefinition(typeString) {
  const fields = {};
  
  // Простой regex для парсинга: field_name: type | null
  const fieldRegex = /(\w+):\s*([^;|\n]+)(?:\s*\|\s*null)?/g;
  
  let match;
  while ((match = fieldRegex.exec(typeString)) !== null) {
    const [, fieldName, typeStr] = match;
    const isNullable = typeString.includes(`${fieldName}:`) && typeString.includes('| null');
    
    // Определить базовый тип
    let baseType = 'string';
    if (typeStr.includes('number')) baseType = 'number';
    else if (typeStr.includes('boolean')) baseType = 'boolean';
    else if (typeStr.includes('Date')) baseType = 'datetime';
    else if (typeStr.includes('string')) baseType = 'string';
    
    fields[fieldName] = { type: baseType, nullable: isNullable };
  }
  
  return fields;
}

/**
 * Применить правила из config
 */
function applyConfigRules(fieldName, fieldType, config, tableName) {
  const rules = [];
  
  // 1. Проверить table-specific overrides
  if (config.tableMappings?.[tableName]?.[fieldName]) {
    return config.tableMappings[tableName][fieldName];
  }
  
  // 2. Проверить field-specific overrides
  if (config.overrides[fieldName]) {
    return config.overrides[fieldName];
  }
  
  // 3. Применить defaults по типу
  const baseType = fieldType.type;
  if (config.defaults[baseType]) {
    rules.push(...config.defaults[baseType]);
  }
  
  // 4. Добавить nullable если нужно
  if (fieldType.nullable) {
    rules.push('nullable()');
  }
  
  return rules;
}

/**
 * Сгенерировать Zod схему для таблицы
 */
function generateZodSchema(tableName, fields, config) {
  let schema = `import { z } from 'zod'\n\n`;
  schema += `// Auto-generated from Supabase types\n`;
  schema += `// Table: ${tableName}\n\n`;
  
  const pascalName = tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  schema += `export const ${pascalName.toLowerCase()}Schema = z.object({\n`;
  
  for (const [fieldName, fieldType] of Object.entries(fields)) {
    const rules = applyConfigRules(fieldName, fieldType, config, tableName);
    const zodChain = rules.join('.');
    
    let zodType = 'z.string()';
    if (fieldType.type === 'number') zodType = 'z.number()';
    else if (fieldType.type === 'boolean') zodType = 'z.boolean()';
    else if (fieldType.type === 'datetime') zodType = 'z.string().datetime()';
    
    const fullChain = zodChain 
      ? `${zodType}.${zodChain}`
      : (fieldType.nullable ? `${zodType}.nullable()` : zodType);
    
    schema += `  ${fieldName}: ${fullChain},\n`;
  }
  
  schema += `})\n\n`;
  
  // Export type
  schema += `export type ${pascalName} = z.infer<typeof ${pascalName.toLowerCase()}Schema>\n`;
  
  return schema;
}

// ============================================================================
// MAIN
// ============================================================================

console.log('🔧 Generating Zod schemas...');
console.log('');

try {
  // Проверить что файлы существуют
  if (!fs.existsSync(TYPES_FILE)) {
    console.error('❌ Error: Types file not found');
    console.error(`   Expected: ${TYPES_FILE}`);
    console.error('');
    console.error('Run `npm run gen-types` first!');
    console.error('');
    process.exit(1);
  }
  
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('❌ Error: Config file not found');
    console.error(`   Expected: ${CONFIG_FILE}`);
    console.error('');
    process.exit(1);
  }
  
  // Читать файлы
  const typesContent = fs.readFileSync(TYPES_FILE, 'utf-8');
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  
  console.log('📖 Reading configuration...');
  console.log(`   Tables mapped: ${Object.keys(config.tableMappings || {}).length}`);
  console.log(`   Override rules: ${Object.keys(config.overrides || {}).length}`);
  console.log('');
  
  // Создать output директорию
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Парсинг таблиц (упрощённый)
  // Ищем паттерн: export type Tables = { table_name: { Row: { ... } } }
  const tableRegex = /(\w+):\s*\{[^}]*Row:\s*\{([^}]+)\}/g;
  
  let match;
  let generatedCount = 0;
  
  while ((match = tableRegex.exec(typesContent)) !== null) {
    const [, tableName, rowFields] = match;
    
    console.log(`🔨 Generating schema for: ${tableName}`);
    
    // Парсинг полей
    const fields = parseTypeDefinition(rowFields);
    
    if (Object.keys(fields).length === 0) {
      console.log(`   ⚠️  No fields found, skipping`);
      continue;
    }
    
    // Генерировать Zod схему
    const schema = generateZodSchema(tableName, fields, config);
    
    // Записать в файл
    const outputFile = path.join(OUTPUT_DIR, `${tableName}.ts`);
    fs.writeFileSync(outputFile, schema);
    
    console.log(`   ✅ Generated: ${outputFile}`);
    console.log(`   📊 Fields: ${Object.keys(fields).length}`);
    
    generatedCount++;
  }
  
  // Создать index.ts
  console.log('');
  console.log('📝 Generating index.ts...');
  
  const indexContent = `// Auto-generated index
// Export all schemas

${Array.from({ length: generatedCount }).map((_, i) => {
  // Тут нужно получить реальные имена таблиц, но для упрощения пока пропускаем
  return '';
}).join('')}

// NOTE: Add your table exports here manually or update the generator
`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent);
  
  console.log('');
  console.log('✅ Schemas generated successfully!');
  console.log(`   Generated: ${generatedCount} schemas`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log('');
  console.log('⚠️  IMPORTANT: This is a simplified generator.');
  console.log('   Review generated schemas and adjust as needed.');
  console.log('');
  console.log('Next step: Update registry.tsx to use new schemas');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('❌ Error generating schemas:');
  console.error('');
  console.error(error.message);
  console.error('');
  process.exit(1);
}