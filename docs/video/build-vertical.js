// Arma template-vertical.html a partir del web: mismo HTML y misma línea de
// tiempo (por eso comparten la pista de audio), sólo cambian el CSS y tres
// constantes que dependen del tamaño del lienzo.
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const css = fs.readFileSync(path.join(DIR, 'style-vertical.css'), 'utf8');
let h = fs.readFileSync(path.join(DIR, 'template-web.html'), 'utf8');

const a = h.indexOf('<style>') + 7;
const b = h.indexOf('</style>');
h = h.slice(0, a) + '\n' + css + h.slice(b);

function swap(from, to) {
    if (!h.includes(from)) throw new Error('no se encontró: ' + from.slice(0, 60));
    h = h.replace(from, to);
}

// el iPhone se dibuja con el layout base de 440px y se escala para vertical
swap(
    "' translateY(' + (rise + floatY).toFixed(2) + 'px) scale(' + (0.94 + dIn * 0.06).toFixed(3) + ')';",
    "' translateY(' + (rise + floatY).toFixed(2) + 'px) scale(' + ((0.94 + dIn * 0.06) * DEVICE_SCALE).toFixed(3) + ')';"
);
swap('const MSG =', 'const DEVICE_SCALE = 1.34;\nconst MSG =');

// el barrido tiene que cruzar 1080px, no 1920
swap(
    'return { x: -420 + easeInOut(p) * 2340, a: Math.sin(Math.PI * p) * 0.9 };',
    'return { x: -600 + easeInOut(p) * 1800, a: Math.sin(Math.PI * p) * 0.9 };'
);

// en vertical sobra alto: el párrafo de la escena 2 entra antes para que la
// composición no quede con el pie vacío
swap("fade($('s2p'), lt, 3.9, 0.7, 28);", "fade($('s2p'), lt, 3.2, 0.7, 28);");

fs.writeFileSync(path.join(DIR, 'template-vertical.html'), h);
console.log('template-vertical.html ok');
