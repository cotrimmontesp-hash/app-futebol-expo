import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const themeSrc = readFileSync(resolve(root, 'src/theme.ts'), 'utf8');
const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const left = luminance(a);
  const right = luminance(b);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

function palette(name) {
  const match = themeSrc.match(new RegExp(`export const ${name}: Palette = \\{([\\s\\S]*?)\\n\\};`));
  if (!match) throw new Error(`Paleta ${name} não encontrada em src/theme.ts`);
  const colors = {};
  for (const entry of match[1].matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) colors[entry[1]] = entry[2].toLowerCase();
  return colors;
}

const textPairs = [
  ['Texto principal / fundo', 'text', 'bg', 4.5],
  ['Texto principal / cartão', 'text', 'card', 4.5],
  ['Texto secundário / fundo', 'muted', 'bg', 4.5],
  ['Texto secundário / cartão', 'muted', 'card', 4.5],
  ['Link / fundo', 'link', 'bg', 4.5],
  ['Link / cartão', 'link', 'card', 4.5],
  ['Destaque / cabeçalho', 'highlight', 'header', 4.5],
  ['Aviso / fundo', 'warning', 'bg', 4.5],
  ['Aviso / cartão', 'warning', 'card', 4.5],
  ['Erro / fundo', 'error', 'bg', 4.5],
  ['Erro / cartão', 'error', 'card', 4.5],
  ['Ao vivo / cartão', 'live', 'card', 4.5],
  ['Letra V / bolinha', 'formLetter', 'formV', 4.5],
  ['Letra E / bolinha', 'formLetter', 'formE', 4.5],
  ['Letra D / bolinha', 'formLetter', 'formD', 4.5],
  ['Texto do botão / botão', 'onButton', 'button', 4.5],
  ['Chip ativo / fundo do chip', 'link', 'tabBg', 4.5],
  ['Botão secundário / fundo', 'buttonOffText', 'buttonOffBg', 4.5],
  ['Selo V / fundo', 'badgeVText', 'badgeVBg', 4.5],
  ['Selo E / fundo', 'badgeEText', 'badgeEBg', 4.5],
  ['Selo D / fundo', 'badgeDText', 'badgeDBg', 4.5],
  ['Nome no campo / gramado', 'pitchName', 'pitchTop', 4.5],
  ['Saiu no campo / gramado', 'pitchOut', 'pitchTop', 4.5],
  ['Número mandante / círculo', 'shirtHome', 'shirtHomeBg', 4.5],
  ['Número visitante / círculo', 'shirtAway', 'away', 4.5],
  ['VAR / cartão', 'varBlue', 'card', 4.5],
  ['Pênalti perdido / cartão', 'miss', 'card', 4.5],
  ['Saiu na lista / cartão', 'out', 'card', 4.5],
];

const iconPairs = [
  ['Estrela / cartão', 'star', 'card', 3],
  ['Estrela apagada / cartão', 'starOff', 'card', 3],
  ['Bolinha V / cartão', 'formV', 'card', 3],
  ['Bolinha E / cartão', 'formE', 'card', 3],
  ['Bolinha D / cartão', 'formD', 'card', 3],
];

const failures = [];
const rows = [];

for (const scheme of ['light', 'dark']) {
  const colors = palette(scheme);
  const label = scheme === 'light' ? 'Claro' : 'Escuro';
  for (const [name, fg, bg, min] of [...textPairs, ...iconPairs]) {
    if (!colors[fg] || !colors[bg]) throw new Error(`${scheme}: token ausente ${fg} ou ${bg}`);
    const ratio = contrast(colors[fg], colors[bg]);
    const ok = ratio + 1e-9 >= min;
    if (!ok) failures.push(`${label} · ${name}: ${ratio.toFixed(2)} < ${min.toFixed(1)}`);
    rows.push(`| ${label} | ${name} | \`${colors[fg]}\` | \`${colors[bg]}\` | ${ratio.toFixed(2)} | ${min.toFixed(1)} | ${ok ? 'ok' : 'abaixo'} |`);
  }
  if (!html.includes(colors.bg)) failures.push(`public/index.html não contém o fundo ${scheme} ${colors.bg}`);
}

const sources = [];
function collect(dir) {
  for (const entry of readdirSync(dir)) {
    const file = resolve(dir, entry);
    if (statSync(file).isDirectory()) collect(file);
    else if (file.endsWith('.ts') || file.endsWith('.tsx')) sources.push(file);
  }
}
collect(resolve(root, 'src'));
sources.push(resolve(root, 'App.tsx'));
for (const file of sources) {
  const body = readFileSync(file, 'utf8');
  for (const match of body.matchAll(/fontSize:\s*(\d+)/g)) {
    const size = Number(match[1]);
    if (size < 12) failures.push(`${file.replace(root + '/', '')}: fontSize ${size}`);
  }
}

console.log('| Tema | Par | Texto | Fundo | Razão | Mínimo | |');
console.log('| --- | --- | --- | --- | ---: | ---: | --- |');
console.log(rows.join('\n'));
if (failures.length) {
  console.error('\nContraste ou fonte abaixo do mínimo:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\n${rows.length} pares ok. Nenhuma fonte abaixo de 12px.`);
