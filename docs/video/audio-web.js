// Genera la pista de audio del video web (groove + sound design)
// y la mezcla dentro del mp4. Todo sintetizado, sin samples externos.
//
// Tempo 106.67 BPM: el compás dura 2.25s y la grilla cae clavada en los
// momentos del video -> drop en 9.0 (aparece el iPhone), corte en 22.5
// (barrido lima) y resolución en 29.25 (cierre de marca).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const DIR = __dirname;
const SR = 48000;
const DUR = 33.6;
const N = Math.round(SR * DUR);

const BAR = 2.25;
const BEAT = BAR / 4;
const S16 = BAR / 16;
const BARS = 15;

// dos buses: el colchón musical (bed) y el sound design (fx)
const bedL = new Float64Array(N), bedR = new Float64Array(N);
const fxL = new Float64Array(N), fxR = new Float64Array(N);
const wet = new Float64Array(N);   // envío a reverb
const duck = new Float64Array(N);  // detector para bajar la música bajo los efectos

let BUS = 'bed';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const coef = (fc) => 1 - Math.exp(-TAU * fc / SR);

// voz genérica: fn(lt) -> muestra mono. Se llama una vez por sample y en
// orden, así que las funciones pueden guardar estado (fase, filtros).
function add(t0, dur, fn, gain, pan, send) {
    gain = gain === undefined ? 1 : gain;
    if (gain <= 0 || t0 >= DUR) return;
    pan = pan === undefined ? 0 : pan; // -1 izq .. 1 der
    send = send === undefined ? 0 : send;
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * 1.414;
    const gr = gain * Math.sin((pan + 1) * Math.PI / 4) * 1.414;
    const s0 = Math.max(0, Math.round(t0 * SR));
    const s1 = Math.min(N, Math.round((t0 + dur) * SR));
    const tL = BUS === 'bed' ? bedL : fxL;
    const tR = BUS === 'bed' ? bedR : fxR;
    for (let i = s0; i < s1; i++) {
        const v = fn((i - s0) / SR);
        tL[i] += v * gl;
        tR[i] += v * gr;
        if (send) wet[i] += v * gain * send;
        if (BUS === 'fx') duck[i] += Math.abs(v * gain);
    }
}

const sin = (f, t, ph) => Math.sin(TAU * f * t + (ph || 0));
const pluckEnv = (t, fast, slow, mix) =>
    (1 - mix) * Math.exp(-t / fast) + mix * Math.exp(-t / slow);
const ad = (t, dur, atk, rel) => Math.min(1, t / atk) * clamp((dur - t) / rel, 0, 1);

let noiseState = 12345;
function noise() {
    noiseState = (noiseState * 1664525 + 1013904223) >>> 0;
    return noiseState / 2147483648 - 1;
}

// oscilador con fase integrada (permite barridos de frecuencia limpios)
function osc() {
    let ph = 0;
    return (f) => { ph += TAU * f / SR; return Math.sin(ph); };
}
// ruido filtrado por banda
function bandNoise(lo, hi) {
    const cl = coef(lo), ch = coef(hi);
    let a = 0, b = 0;
    return () => {
        const n = noise();
        a += (n - a) * ch;
        b += (a - b) * cl;
        return a - b;
    };
}

/* ------------------------------------------------------------- BATERÍA */

function kick(t, g) {
    const o = osc();
    add(t, 0.6, (lt) => {
        const f = 46 + 130 * Math.exp(-lt * 34);
        const click = Math.exp(-lt / 0.004) * 0.3;
        return (o(f) + click) * Math.exp(-lt / 0.13);
    }, g, 0, 0);
}

function clap(t, g) {
    const nz = bandNoise(900, 4800);
    add(t, 0.45, (lt) => {
        // tres golpecitos y una cola: suena a palmada, no a ruido pelado
        let e = 0;
        for (const d of [0, 0.011, 0.023]) if (lt >= d) e += Math.exp(-(lt - d) / 0.007);
        e += Math.exp(-lt / 0.085) * 0.9;
        return nz() * e * 1.4;
    }, g, -0.12, 0.35);
}

function hat(t, g, open) {
    const nz = bandNoise(6500, 16000);
    const d = open ? 0.16 : 0.022;
    add(t, open ? 0.5 : 0.12, (lt) => nz() * Math.exp(-lt / d) * 2.2, g, 0.35, 0.18);
}

function shaker(t, g) {
    const nz = bandNoise(7500, 15000);
    add(t, 0.09, (lt) => nz() * Math.exp(-lt / 0.013) * 2.2, g, -0.4, 0.12);
}

// click seco y brillante: le da pulso a la intro filtrada
function rim(t, g) {
    const nz = bandNoise(1400, 9000);
    add(t, 0.14, (lt) =>
        (sin(1750, lt) * 0.7 + nz() * 1.3) * Math.exp(-lt / 0.016), g, 0.25, 0.25);
}

function snare(t, g) {
    const nz = bandNoise(420, 7000);
    add(t, 0.3, (lt) =>
        (nz() * 1.6 + sin(190, lt) * 0.5) * Math.exp(-lt / 0.07), g, 0, 0.3);
}

function crash(t, g) {
    const nz = bandNoise(3500, 17000);
    add(t, 2.2, (lt) => nz() * (Math.exp(-lt / 0.35) * 0.7 + Math.exp(-lt / 1.1) * 0.5) * 2,
        g, 0.15, 0.5);
}

// riser de ruido que sube hacia el golpe
function riser(t, dur, g) {
    let lp = 0;
    add(t, dur, (lt) => {
        const p = clamp(lt / dur, 0, 1);
        lp += (noise() - lp) * (0.02 + 0.45 * p * p);
        return lp * (0.15 + 0.85 * p * p) * 2.2;
    }, g, 0, 0.45);
}

/* -------------------------------------------------------------- ARMONÍA */

const Am = { bass: 110.0, pad: [220.0, 261.63, 329.63], arp: [440, 523.25, 659.25, 880], stab: [440, 523.25, 659.25] };
const F = { bass: 87.31, pad: [174.61, 261.63, 349.23], arp: [349.23, 523.25, 698.46, 880], stab: [349.23, 523.25, 698.46] };
const C = { bass: 130.81, pad: [196.0, 261.63, 329.63], arp: [392, 523.25, 659.25, 1046.5], stab: [392, 523.25, 783.99] };
const G = { bass: 98.0, pad: [196.0, 246.94, 293.66], arp: [392, 493.88, 587.33, 783.99], stab: [392, 493.88, 587.33] };

// Am Am F F | C C G G | Am Am F F | G (tensión) C C (resolución en 29.25)
const PROG = [Am, Am, F, F, C, C, G, G, Am, Am, F, F, G, C, C];

// colchón: sostiene la armonía por debajo del groove
PROG.forEach((ch, bar) => {
    if (bar > 0 && PROG[bar - 1] === ch) return;
    let last = bar;
    while (last + 1 < BARS && PROG[last + 1] === ch) last++;
    const t0 = Math.max(0, bar * BAR - 0.7);
    const dur = (last + 1) * BAR + 0.7 - t0;
    ch.pad.forEach((f, ni) => {
        add(t0, dur, (t) => {
            const trem = 1 + 0.08 * sin(0.19, t + ni);
            return (sin(f, t) + sin(f * 1.003, t, 1.1) * 0.8 + sin(f * 2, t) * 0.24) *
                ad(t, dur, 0.9, 0.9) * trem;
        }, 0.052, (ni - 1) * 0.55, 0.16);
    });
});

function bassNote(t, f, dur, g) {
    const o1 = osc(), o2 = osc(), o3 = osc();
    add(t, dur + 0.2, (lt) => {
        // filtro que se cierra: da el "pluck" del bajo
        const bright = Math.exp(-lt / 0.09);
        return (o1(f) + o2(f * 2) * 0.45 * bright + o3(f * 3) * 0.2 * bright) *
            pluckEnv(lt, 0.02, dur * 0.55, 0.8) * Math.min(1, lt / 0.004);
    }, g, 0, 0.08);
}

function stab(t, ch, g) {
    ch.stab.forEach((f, i) => {
        add(t, 0.5, (lt) =>
            (sin(f, lt) + sin(f * 1.004, lt, 0.7) * 0.7 + sin(f * 2, lt) * 0.18) *
            pluckEnv(lt, 0.012, 0.13, 0.85) * Math.min(1, lt / 0.003),
            g * 0.45, (i - 1) * 0.5, 0.35);
    });
}

function arpNote(t, f, g, pan) {
    add(t, 0.7, (lt) =>
        (sin(f, lt) + sin(f * 2, lt) * 0.32 + sin(f * 3.01, lt) * 0.1) *
        pluckEnv(lt, 0.035, 0.22, 0.5), g, pan, 0.3);
}

/* ---------------------------------------------------- ARREGLO POR SECCIÓN */

// Cuánto suena cada instrumento en cada tramo. El groove arranca desde el
// primer compás: lo que cambia entre intro y drop es el filtro (ver HP),
// no que entren o salgan instrumentos.
function section(t) {
    if (t < 4.4) return { k: .85, c: .5, h: .8, s: .9, b: .85, st: .55, ar: .8, r: 1 };
    if (t < 8.4) return { k: .95, c: .85, h: .95, s: .9, b: 1, st: .85, ar: .95, r: .5 };
    if (t < 9.0) return { k: .9, c: 0, h: .5, s: .5, b: .7, st: 0, ar: .5, r: 0 };  // tensión
    if (t < 22.35) return { k: 1, c: 1, h: 1, s: .75, b: 1, st: .9, ar: 1, r: 0 };
    if (t < 22.9) return { k: .6, c: 0, h: .5, s: .5, b: .5, st: 0, ar: .6, r: .8 };// respiro
    if (t < 28.5) return { k: 1, c: 1, h: 1, s: .75, b: 1, st: .9, ar: 1, r: 0 };
    if (t < 29.25) return { k: .7, c: 0, h: .4, s: .6, b: .5, st: 0, ar: .4, r: .6 };
    if (t < 32.2) return { k: 1, c: 1, h: 1, s: .75, b: 1, st: 1, ar: 1, r: 0 };
    return { k: 0, c: 0, h: 0, s: 0, b: 0, st: 0, ar: 0, r: 0 };                     // cola
}

// Filtro pasa-altos automatizado sobre la música: intro finita, drop abierto.
// Las subidas antes de 9.0 / 29.25 son el clásico barrido de tensión.
const HP = [
    [0, 175], [4.4, 150], [8.4, 100], [8.98, 900], [9.0, 25],
    [22.3, 25], [22.62, 480], [22.95, 25],
    [28.5, 25], [29.2, 1000], [29.26, 25], [DUR, 25],
];
function hpAt(t) {
    for (let i = 0; i < HP.length - 1; i++) {
        const [t0, f0] = HP[i], [t1, f1] = HP[i + 1];
        if (t < t1) {
            const p = clamp((t - t0) / (t1 - t0), 0, 1);
            const e = p * p * (3 - 2 * p);
            return f0 * Math.pow(f1 / f0, e); // interpolación logarítmica
        }
    }
    return 25;
}

const P_HAT = [1, 0, .5, 0, 1, 0, .5, 0, 1, 0, .5, 0, 1, 0, .6, .35];
const P_BASS = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, .8, 0];
const P_STAB = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
const P_ARP = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1];

for (let bar = 0; bar < BARS; bar++) {
    const ch = PROG[bar];
    for (let s = 0; s < 16; s++) {
        const t = bar * BAR + s * S16;
        if (t >= DUR) break;
        const m = section(t);
        const fill = bar % 4 === 3; // variación cada 4 compases

        if (s % 4 === 0 && m.k) kick(t, 0.42 * m.k);
        if (m.r && (s === 4 || s === 12 || (s === 10 && fill))) rim(t, 0.09 * m.r);
        if (m.k && fill && s === 14) kick(t, 0.38);
        if ((s === 4 || s === 12) && m.c) clap(t, 0.24 * m.c);
        if (s % 2 === 0 || P_HAT[s] > 0.5) {
            const v = P_HAT[s];
            if (v && m.h) hat(t, 0.062 * v * m.h, s === 14 && fill);
        }
        if (m.s) shaker(t, 0.028 * m.s * (s % 2 ? 0.6 : 1));
        if (P_BASS[s] && m.b) {
            const oct = s === 14 ? 1.5 : 1; // adorno al final del compás
            bassNote(t, ch.bass * oct, S16 * (s === 0 ? 3 : 2), 0.21 * m.b * P_BASS[s]);
        }
        if (P_STAB[s] && m.st) stab(t, ch, 0.17 * m.st);
        if (P_ARP[s] && m.ar) {
            const f = ch.arp[(bar * 16 + s) % 4];
            arpNote(t, f, 0.05 * m.ar, (((s + bar) % 4) - 1.5) * 0.35);
        }
    }
}

// redobles y golpes de sección
crash(9.0, 0.16);
crash(22.9, 0.1);
crash(29.25, 0.2);
riser(7.6, 1.4, 0.1);
riser(27.9, 1.35, 0.12);
// redoble que acelera antes del drop y antes del cierre
[[8.4, 9.0], [28.5, 29.25]].forEach(([a, b]) => {
    let t = a, gap = 0.16;
    for (let i = 0; i < 14 && t < b; i++) {
        snare(t, 0.1 * (0.4 + 0.6 * (t - a) / (b - a)));
        t += gap;
        gap = Math.max(gap * 0.78, 0.035);
    }
});
// bombo grave que marca la resolución final
kick(29.25, 0.6);

/* ------------------------------------------------------------ EFECTOS UI */

BUS = 'fx';

function popIn(t) {
    add(t, 0.35, (lt) => {
        const f = 520 + 420 * Math.exp(-lt / 0.02);
        return (sin(f, lt) + sin(f * 1.5, lt) * 0.25) * Math.exp(-lt / 0.055);
    }, 0.4, 0.35, 0.22);
}

function popOut(t) {
    add(t, 0.35, (lt) => {
        const f = 700 + 500 * (1 - Math.exp(-lt / 0.03));
        return (sin(f, lt) + sin(f * 2, lt) * 0.2) * Math.exp(-lt / 0.05);
    }, 0.36, 0.35, 0.22);
}

// tick apenas audible para las tarjetas flotantes
function uiTick(t, f) {
    add(t, 0.25, (lt) => sin(f || 1320, lt) * Math.exp(-lt / 0.022), 0.1, -0.4, 0.3);
}

function bell(t, freqs, gain, pan) {
    freqs.forEach((f, i) => {
        add(t + i * 0.11, 1.4, (lt) =>
            (sin(f, lt) + sin(f * 2.01, lt) * 0.3 + sin(f * 3.03, lt) * 0.12) *
            pluckEnv(lt, 0.03, 0.42, 0.75),
            gain === undefined ? 0.16 : gain, pan === undefined ? 0.2 : pan, 0.45);
    });
}

// barrido de aire para los cambios de escena
function whoosh(t, dur, gain) {
    dur = dur || 0.85;
    let lp1 = 0, lp2 = 0;
    add(t - 0.15, dur, (lt) => {
        const p = clamp(lt / dur, 0, 1);
        const cut = 0.02 + 0.5 * Math.sin(Math.PI * p);
        const n = noise();
        lp1 += (n - lp1) * cut;
        lp2 += (lp1 - lp2) * cut;
        return lp2 * Math.sin(Math.PI * p) * 1.6;
    }, gain === undefined ? 0.4 : gain, 0, 0.4);
}

function impact(t, gain) {
    const o = osc();
    add(t, 1.0, (lt) => o(38 + 90 * Math.exp(-lt * 9)) * Math.exp(-lt / 0.2),
        gain === undefined ? 0.4 : gain);
    let lp = 0;
    add(t, 0.5, (lt) => { lp += (noise() - lp) * 0.12; return lp * Math.exp(-lt / 0.09) * 2; },
        0.18, 0, 0.5);
}

// apertura
whoosh(1.1, 1.1, 0.22);
uiTick(1.35, 880);

// S2: palabras que rotan
[5.1, 6.2, 7.3].forEach((t, i) => uiTick(t, 740 + i * 180));

// cambios de escena (coinciden con los barridos lima)
whoosh(8.75);
whoosh(22.35);
whoosh(29.0, 0.95, 0.45);

// chat
uiTick(10.0, 560);            // aparece "escribiendo…"
popOut(12.3);                 // el cliente manda su mensaje
popIn(12.6);                  // responde Servy
popOut(14.2);                 // elige "1"
popIn(17.0);                  // link de pago
bell(18.9, [523.25, 659.25, 783.99], 0.2); // pago recibido
popIn(20.4);                  // técnico asignado
popIn(23.6);                  // "este es tu código"
whoosh(24.45, 0.5, 0.18);     // entra el QR
popIn(24.55);

// escaneo del QR (25.2 -> 26.5)
add(25.2, 1.35, (lt) => {
    const p = lt / 1.3;
    return sin(320 + 1100 * p, lt) * (0.5 + 0.5 * sin(11, lt)) *
        Math.sin(Math.PI * clamp(p, 0, 1));
}, 0.07, 0.3, 0.4);

bell(27.2, [783.99, 1046.5], 0.28); // visita confirmada

// tarjetas flotantes
[13.1, 17.4, 19.8, 27.4].forEach((t, i) => uiTick(t, 1180 + i * 90));

// cierre
impact(29.2, 0.42);
bell(29.45, [523.25, 659.25, 783.99, 1046.5], 0.1, -0.1);

/* ------------------------------------------------------------- REVERB */

function combBank(src, delays, fb, damp) {
    const out = new Float64Array(src.length);
    for (const d of delays) {
        let store = 0;
        for (let i = 0; i < src.length; i++) {
            const back = i - d >= 0 ? out[i - d] : 0;
            store = back * (1 - damp) + store * damp;
            out[i] += src[i] + store * fb;
        }
    }
    for (let i = 0; i < out.length; i++) out[i] /= delays.length;
    return out;
}

const wetL = combBank(wet, [1694, 1760, 1623, 1548], 0.76, 0.45);
const wetR = combBank(wet, [1721, 1789, 1601, 1519], 0.76, 0.45);

/* ------------------------------------------------------- MASTER + WAV */

// sidechain: los efectos abren paso en la música
let env = 0;
const DUCK = new Float64Array(N);
for (let i = 0; i < N; i++) {
    const target = clamp(duck[i] * 2.2, 0, 1);
    env += (target - env) * (target > env ? 0.02 : 0.00035);
    DUCK[i] = 1 - env * 0.3;
}

const L = new Float64Array(N), R = new Float64Array(N);
let a = 0, b = 0;
// estado del pasa-altos (música) y de un pasa-altos fijo para el reverb
let hxL = 0, hyL = 0, hxR = 0, hyR = 0;
let rxL = 0, ryL = 0, rxR = 0, ryR = 0;
const DT = 1 / SR;
const alRev = (1 / (TAU * 140)) / ((1 / (TAU * 140)) + DT);
for (let i = 0; i < N; i++) {
    a += (wetL[i] - a) * 0.35;
    b += (wetR[i] - b) * 0.35;
    ryL = alRev * (ryL + a - rxL); rxL = a;
    ryR = alRev * (ryR + b - rxR); rxR = b;

    const rc = 1 / (TAU * hpAt(i / SR));
    const al = rc / (rc + DT);
    hyL = al * (hyL + bedL[i] - hxL); hxL = bedL[i];
    hyR = al * (hyR + bedR[i] - hxR); hxR = bedR[i];

    L[i] = hyL * DUCK[i] + fxL[i] + ryL * 0.34;
    R[i] = hyR * DUCK[i] + fxR[i] + ryR * 0.34;
}

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.8 / (peak || 1);

const FADE_IN = 0.25, FADE_OUT = 1.4;
const buf = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / FADE_IN) * clamp((DUR - t) / FADE_OUT, 0, 1);
    const l = Math.tanh(L[i] * norm * 1.75) * fade;
    const r = Math.tanh(R[i] * norm * 1.75) * fade;
    buf.writeInt16LE(Math.round(clamp(l, -1, 1) * 32000), i * 4);
    buf.writeInt16LE(Math.round(clamp(r, -1, 1) * 32000), i * 4 + 2);
}

const head = Buffer.alloc(44);
head.write('RIFF', 0);
head.writeUInt32LE(36 + buf.length, 4);
head.write('WAVEfmt ', 8);
head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20);
head.writeUInt16LE(2, 22);
head.writeUInt32LE(SR, 24);
head.writeUInt32LE(SR * 4, 28);
head.writeUInt16LE(4, 32);
head.writeUInt16LE(16, 34);
head.write('data', 36);
head.writeUInt32LE(buf.length, 40);

const wav = path.join(DIR, 'servy-web.wav');
fs.writeFileSync(wav, Buffer.concat([head, buf]));
console.log('WAV ->', wav);

const silent = path.join(DIR, 'servy-como-funciona-web.mp4');
const out = path.join(DIR, 'servy-como-funciona-web-audio.mp4');
execFileSync(
    ffmpeg,
    ['-y', '-i', silent, '-i', wav, '-map', '0:v:0', '-map', '1:a:0',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
        '-movflags', '+faststart', out],
    { stdio: 'inherit' }
);
console.log('OK ->', out);
