import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE = process.argv[2];
const OUT = path.join(WORKSPACE, 'docs', 'wi-t1000345', 'sunflower.svg');

const CX = 320, CY = 240; // 花头中心
const r1 = n => Math.round(n * 10) / 10;

// ------- 花瓣（舌状花）：两层各 20 片，围绕花心旋转排布 -------
const petalBack = 'M 0 -60 C -15 -96 -18 -148 0 -190 C 18 -148 15 -96 0 -60 Z';
const petalFront = 'M 0 -58 C -13 -92 -16 -138 0 -176 C 16 -138 13 -92 0 -58 Z';
let petals = '';
for (let i = 0; i < 20; i++) {
  petals += `      <path d="${petalBack}" fill="url(#gPetalBack)" stroke="#D9891F" stroke-width="1" stroke-linejoin="round" transform="rotate(${i * 18})"/>\n`;
}
for (let i = 0; i < 20; i++) {
  petals += `      <path d="${petalFront}" fill="url(#gPetalFront)" stroke="#E49B24" stroke-width="1.1" stroke-linejoin="round" transform="rotate(${i * 18 + 9})"/>\n`;
}

// ------- 花盘（管状花）：棕色底盘 + 边缘金色环状小花 + 黄金角螺旋点阵 -------
let florets = '';
for (let k = 0; k < 30; k++) {
  florets += `        <ellipse rx="3" ry="6.5" fill="#F6C445" stroke="#E5AB2E" stroke-width="0.5" transform="rotate(${k * 12}) translate(0 -66)"/>\n`;
}
const GA = 2.39996323; // 黄金角 ~137.5°（弧度）
const N = 110;
let seeds = '';
for (let i = 1; i <= N; i++) {
  const t = Math.sqrt(i / N);
  const rr = 58 * t;
  const a = i * GA;
  const x = r1(rr * Math.cos(a));
  const y = r1(rr * Math.sin(a));
  const dr = r1(Math.min(3.2, 1.1 + 2.3 * t));
  const fill = i % 2 === 0 ? '#7B5230' : '#93683A';
  seeds += `        <circle cx="${x}" cy="${y}" r="${dr}" fill="${fill}" opacity="0.92"/>\n`;
}

// ------- 茎与叶片 -------
const stem = `      <path d="M ${CX} 305 C 332 430 306 560 318 806" fill="none" stroke="#457523" stroke-width="18" stroke-linecap="round"/>\n      <path d="M ${CX - 4} 330 C 326 445 300 560 311 780" fill="none" stroke="#6E9B46" stroke-width="5" stroke-linecap="round" opacity="0.65"/>`;

const leafRight = `      <path d="M 315 554 C 367 500 436 474 502 472 C 472 538 397 572 315 554 Z" fill="url(#gLeaf)" stroke="#3D6120" stroke-width="2.5" stroke-linejoin="round"/>\n      <path d="M 321 552 C 374 516 434 489 494 475" fill="none" stroke="#CFE3B5" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>\n      <path d="M 356 528 Q 372 514 394 508 M 386 512 Q 406 498 430 494 M 416 497 Q 438 486 462 484" fill="none" stroke="#CBDFB0" stroke-width="1.7" stroke-linecap="round" opacity="0.7"/>`;

const leafLeft = `      <path d="M 313 646 C 258 592 190 566 124 564 C 154 630 229 664 313 646 Z" fill="url(#gLeaf)" stroke="#3D6120" stroke-width="2.5" stroke-linejoin="round"/>\n      <path d="M 307 644 C 254 608 194 581 132 567" fill="none" stroke="#CFE3B5" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>\n      <path d="M 272 620 Q 254 606 232 600 M 240 604 Q 220 590 196 586 M 208 588 Q 188 577 165 575" fill="none" stroke="#CBDFB0" stroke-width="1.7" stroke-linecap="round" opacity="0.7"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="860" viewBox="0 0 640 860" role="img">
  <title>向日葵</title>
  <desc>一朵完整的向日葵：金黄色花瓣环绕棕色花盘（管状花，黄金角螺旋花籽点阵），下方为绿色花茎与左右两片带叶脉的叶片。</desc>
  <defs>
    <linearGradient id="gPetalBack" gradientUnits="userSpaceOnUse" x1="0" y1="-60" x2="0" y2="-190">
      <stop offset="0" stop-color="#EE9A1F"/>
      <stop offset="1" stop-color="#F8C34A"/>
    </linearGradient>
    <linearGradient id="gPetalFront" gradientUnits="userSpaceOnUse" x1="0" y1="-58" x2="0" y2="-176">
      <stop offset="0" stop-color="#F7AE26"/>
      <stop offset="1" stop-color="#FFD84E"/>
    </linearGradient>
    <radialGradient id="gDisc">
      <stop offset="0" stop-color="#6E4524"/>
      <stop offset="1" stop-color="#37200E"/>
    </radialGradient>
    <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6FA544"/>
      <stop offset="1" stop-color="#4C7E2B"/>
    </linearGradient>
    <linearGradient id="gBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDF9EF"/>
      <stop offset="1" stop-color="#F4EBD6"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="640" height="860" fill="url(#gBg)"/>
${stem}
${leafRight}
${leafLeft}
  <g transform="translate(${CX},${CY})">
      <!-- 花瓣（舌状花）：两层各 20 片 -->
${petals}      <!-- 花盘（管状花） -->
      <circle r="78" fill="url(#gDisc)" stroke="#241408" stroke-width="2"/>
      <g>
${florets}      </g>
      <g>
${seeds}      </g>
      <ellipse cx="-18" cy="-22" rx="34" ry="20" fill="#8A6136" opacity="0.14"/>
  </g>
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg, 'utf8');
console.log('written:', OUT, 'bytes:', Buffer.byteLength(svg));
