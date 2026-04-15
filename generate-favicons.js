#!/usr/bin/env node
/**
 * generate-favicons.js
 * Генерирует все стандартные размеры фавиконок из одного исходного изображения.
 *
 * Установка зависимости:
 *   npm install sharp
 *
 * Использование:
 *   node generate-favicons.js [source]
 *
 * Примеры:
 *   node generate-favicons.js               # использует logo.svg по умолчанию
 *   node generate-favicons.js img/logo.png  # указать свой источник
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

/* ---- Источник ---- */
const source = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'logo.svg');

/* ---- Выходная папка (та же, что сам скрипт) ---- */
const outDir = __dirname;

/* ----
   Таблица всех нужных размеров.
   Формат: { file, size, bg }
   bg = цвет фона (null = прозрачный)
---------------------------------------------------------------- */
const SIZES = [
  // Стандартные favicon
  { file: 'favicon-16x16.png',   size: 16  },
  { file: 'favicon-32x32.png',   size: 32  },
  { file: 'favicon-96x96.png',   size: 96  },

  // Apple Touch Icons
  { file: 'apple-icon-57x57.png',   size: 57  },
  { file: 'apple-icon-60x60.png',   size: 60  },
  { file: 'apple-icon-72x72.png',   size: 72  },
  { file: 'apple-icon-76x76.png',   size: 76  },
  { file: 'apple-icon-114x114.png', size: 114 },
  { file: 'apple-icon-120x120.png', size: 120 },
  { file: 'apple-icon-144x144.png', size: 144 },
  { file: 'apple-icon-152x152.png', size: 152 },
  { file: 'apple-icon-180x180.png', size: 180 },

  // Android / PWA
  { file: 'android-icon-36x36.png',   size: 36  },
  { file: 'android-icon-48x48.png',   size: 48  },
  { file: 'android-icon-72x72.png',   size: 72  },
  { file: 'android-icon-96x96.png',   size: 96  },
  { file: 'android-icon-144x144.png', size: 144 },
  { file: 'android-icon-192x192.png', size: 192 },

  // Microsoft Tiles (белый фон)
  { file: 'ms-icon-70x70.png',   size: 70,  bg: '#ffffff' },
  { file: 'ms-icon-144x144.png', size: 144, bg: '#ffffff' },
  { file: 'ms-icon-150x150.png', size: 150, bg: '#ffffff' },
  { file: 'ms-icon-310x310.png', size: 310, bg: '#ffffff' },
];

/* ---- Helpers ---- */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
}

function pad(str, len) {
  return String(str).padEnd(len, ' ');
}

/* ---- Main ---- */
async function generate() {
  if (!fs.existsSync(source)) {
    console.error(`✗  Источник не найден: ${source}`);
    console.error('   Укажите путь вручную: node generate-favicons.js <путь-к-файлу>');
    process.exit(1);
  }

  const ext = path.extname(source).toLowerCase();
  console.log('');
  console.log('  EcoGroup · Генератор фавиконок');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Источник : ${source}`);
  console.log(`  Формат   : ${ext || '(авто)'}  →  PNG`);
  console.log(`  Файлов   : ${SIZES.length}`);
  console.log('  ─────────────────────────────────────────');
  console.log('');

  let ok = 0;
  const errors = [];

  for (const { file, size, bg } of SIZES) {
    const outPath = path.join(outDir, file);
    try {
      let pipeline = sharp(source, { density: 600 }).resize(size, size, {
        fit: 'contain',
        background: bg ? hexToRgb(bg) : { r: 0, g: 0, b: 0, alpha: 0 },
      });

      if (bg) {
        // MS-tiles: белый фон, нет прозрачности
        pipeline = pipeline.flatten({ background: hexToRgb(bg) });
      }

      await pipeline.png({ compressionLevel: 9 }).toFile(outPath);

      console.log(`  ✓  ${pad(file, 30)} ${size}×${size}`);
      ok++;
    } catch (err) {
      console.error(`  ✗  ${pad(file, 30)} ${err.message}`);
      errors.push(file);
    }
  }

  console.log('');
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Готово: ${ok} из ${SIZES.length} сгенерировано.`);

  if (errors.length) {
    console.log(`  Ошибки (${errors.length}): ${errors.join(', ')}`);
    console.log('');
    process.exit(1);
  }

  /* ---- favicon.ico (16 + 32 + 48 в одном файле) ---- */
  try {
    // sharp не умеет .ico напрямую, поэтому создаём 32px PNG-копию как favicon.ico
    // Для полноценного .ico используйте пакет `to-ico`
    const icoPath = path.join(outDir, 'favicon.ico');
    await sharp(source, { density: 600 })
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(icoPath);
    console.log('  ✓  favicon.ico (32×32 PNG-fallback)');
    console.log('     Совет: для настоящего multi-size .ico запустите');
    console.log('     npx to-ico favicon-16x16.png favicon-32x32.png favicon-96x96.png > favicon.ico');
  } catch (err) {
    console.error(`  ✗  favicon.ico: ${err.message}`);
  }

  console.log('');
}

generate().catch(err => {
  console.error('\n  Критическая ошибка:', err.message);
  console.error('  Убедитесь, что установлен пакет sharp:');
  console.error('    npm install sharp\n');
  process.exit(1);
});
