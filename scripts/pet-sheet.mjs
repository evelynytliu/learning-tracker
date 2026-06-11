// 把某物種 6 個階段的 SVG 排成一張對照圖（PNG），方便預覽美術。
// 用法：node scripts/pet-sheet.mjs <species> [out.png]
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';

const species = process.argv[2];
const out = process.argv[3] || `/tmp/${species}-sheet.png`;
const CELL = 256;

let body = '';
for (let i = 0; i < 6; i += 1) {
  let svg = readFileSync(`public/pets/${species}/${i}.svg`, 'utf8');
  // 避免六張圖的 id 互撞：全部加上 slot 前綴
  svg = svg
    .replace(/id="([^"]+)"/g, `id="s${i}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#s${i}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#s${i}-$1"`);
  // 去掉外層 <svg>，保留內容
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  body += `<g transform="translate(${i * CELL},0) scale(${CELL / 512})">${inner}</g>`;
}

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL * 6}" height="${CELL}" viewBox="0 0 ${CELL * 6} ${CELL}">
  <rect width="100%" height="100%" fill="#eef2fb"/>
  ${body}
</svg>`;

const png = new Resvg(sheet, { fitTo: { mode: 'width', value: 1536 } }).render().asPng();
writeFileSync(out, png);
console.log(out);
