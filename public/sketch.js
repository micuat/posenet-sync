// Naoto Hieda
// https://creativecommons.org/licenses/by-sa/3.0/

const replayMode = true;

function midiToFreq(m) {
  let tuning = 440;
  return Math.pow(2, (m - 69) / 12) * tuning;
}

let setColorMode = 0;

class ColorScheme {
  constructor(colorString) {
    this.colors = []; {
      let cc = colorString.split("/");
      let cs = cc[cc.length - 1].split("-");
      for (let i in cs) {
        let r = parseInt("0x" + cs[i].substring(0, 2));
        let g = parseInt("0x" + cs[i].substring(2, 4));
        let b = parseInt("0x" + cs[i].substring(4, 6));
        let a = undefined;
        if (cs[i].length == 8) {
          a = parseInt("0x" + cs[i].substring(6, 8));
        }
        this.colors.push({
          r, g, b, a
        });
      }
      this.offset = 0;
    }
  }
  get(i) {
    i = Math.min(this.colors.length - 1, Math.max(0, i));
    return this.colors[(i + this.offset) % this.colors.length];
  }

}

var colorSchemes = [
  new ColorScheme("https://coolors.co/3891a6-4c5b5c-fde74c-db5461-e3655b"),
  new ColorScheme("https://coolors.co/80ffe8-eccbd9-e1eff6-97d2fb-83bcff"),
  new ColorScheme("https://coolors.co/ff0000-00ff00-0000ff-00000000-aaaaaa"),
  new ColorScheme("https://coolors.co/ffffff-808080-000000-333333-aaaaaa"),
];

function setColor(parent, func, index, alpha) {
  let idx = setColorMode;
  let a = colorSchemes[idx].get(index).a;
  if (a == undefined) a = 255;
  if (alpha != undefined) a *= alpha;
  parent[func](colorSchemes[idx].get(index).r, colorSchemes[idx].get(index).g, colorSchemes[idx].get(index).b, a);
}

// https://gist.github.com/gre/1650294/
EasingFunctions = {
  // no easing, no acceleration
  linear: function (t) { return t },
  // accelerating from zero velocity
  easeInQuad: function (t) { return t * t },
  // decelerating to zero velocity
  easeOutQuad: function (t) { return t * (2 - t) },
  // acceleration until halfway, then deceleration
  easeInOutQuad: function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t },
  // accelerating from zero velocity 
  easeInCubic: function (t) { return t * t * t },
  // decelerating to zero velocity 
  easeOutCubic: function (t) { return (--t) * t * t + 1 },
  // acceleration until halfway, then deceleration 
  easeInOutCubic: function (t) { return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1 },
  // accelerating from zero velocity 
  easeInQuart: function (t) { return t * t * t * t },
  // decelerating to zero velocity 
  easeOutQuart: function (t) { return 1 - (--t) * t * t * t },
  // acceleration until halfway, then deceleration
  easeInOutQuart: function (t) { return t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t },
  // accelerating from zero velocity
  easeInQuint: function (t) { return t * t * t * t * t },
  // decelerating to zero velocity
  easeOutQuint: function (t) { return 1 + (--t) * t * t * t * t },
  // acceleration until halfway, then deceleration
  easeInOutQuint: function (t) { return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t },
  // easeInElastic: function (t) { return (.04 - .04 / t) * Math.sin(25 * t) + 1 },
  // easeOutElastic: function (t) { return .04 * t / (--t) * Math.sin(25 * t) },
  // easeInOutElastic: function (t) { return Math.pow(2, -10*t) * Math.sin((t - .075)*(2+Math.PI)/.3)+1 },
}

const width = 400;
const height = 400;

class Drawer {
  constructor({ c, args }) {
    this.c = c;
    if (args == undefined) {
      args = {};
    }
    if (args.col == undefined) {
      args.col = { bg: Math.floor(Math.random() * 5), fg: Math.floor(Math.random() * 5) };
      if (args.col.bg == args.col.fg) args.col.fg = (args.col.fg + 2) % 5;
    }
    if (args.sides == undefined) {
      args.sides = Math.floor(Math.random() * 3);
      args.rand = [];
      for (let i = 0; i < 8; i++) {
        args.rand.push(Math.random());
      }
    }
    this.args = args;
  }
  draw({ pg, args }) {
    pg.push();
    if (typeof this.c === 'object') {
      this.c.draw(pg, { ...this.args, ...args });
    }
    pg.pop();
  }
}

class LayerGraphics {
  constructor({ p, pgF, pgB }) {
    this.p = p;
    this.pgF = pgF == undefined ? p.createGraphics(width, height, p.WEBGL) : pgF;
    this.pgB = pgB == undefined ? p.createGraphics(width, height, p.WEBGL) : pgB;

    this.bangT = 0;
    this.bangDur = 0.75;
    this.bangCycle = 0;
    this.bangParam = 0;
    this.bangTween = 0;
  }

  bang({ t }) {
    this.bangT = t;
    this.bangParam = Math.floor(Math.random() * 4);
    this.bangCycle = (this.bangCycle + 1) % 2;
  }

  update({ t }) {
    let p = this.p;
    this.bangTween = p.constrain((t - this.bangT) / this.bangDur, 0, 1);
  }
}

class WipeDelayGraphics extends LayerGraphics {
  constructor({ p, pgF, pgB, fore, back, wipe, switcherCallback }) {
    const vert = `
#ifdef GL_ES
precision highp float;
precision highp int;
#endif
// attributes, in
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
attribute vec4 aVertexColor;

// attributes, out
varying vec3 var_vertPos;
varying vec4 var_vertCol;
varying vec3 var_vertNormal;
varying vec2 var_vertTexCoord;

// matrices
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);

  // just passing things through
  var_vertPos      = aPosition;
  var_vertCol      = aVertexColor;
  var_vertNormal   = aNormal;
  var_vertTexCoord = aTexCoord;
}
`;
    const frag = `
#ifdef GL_ES
precision highp float;
precision highp int;
#endif

uniform float time;
uniform vec4 col;
//uniform vec2 center;   
uniform vec2 resolution;
uniform sampler2D ppixelsR;
uniform sampler2D ppixelsG;
uniform sampler2D ppixelsB;
uniform sampler2D ppixelsM;
varying vec2 vTexCoord;

void main( void ) {
  vec2 uv = gl_FragCoord.xy / resolution.xy;//vTexCoord;
  // uv.y = 1.0 - uv.y;

  vec4 colR = texture2D(ppixelsR, uv);
  vec4 colG = texture2D(ppixelsG, uv);
  vec4 colB = texture2D(ppixelsB, uv);
  vec4 colM = texture2D(ppixelsM, uv);

  gl_FragColor = colR * colM.r + colG * colM.g + colB * colM.b;

}
`;
    super({ p, pgF, pgB });
    this.pgMask = p.createGraphics(width, height, p.WEBGL);
    this.pgM = p.createGraphics(width, height, p.WEBGL);
    this.foreDraw = fore;
    this.backDraw = back;
    this.wipeDraw = wipe;
    this.next = undefined;
    this.nextWipe = undefined;
    this.bangDur = 2;
    this.switcherCallback = switcherCallback;
    this.pShader = new p5.Shader(p._renderer, vert, frag);
    // this.lastUpdateFrame = -1;
  }

  bang({ t, next, wipe }) {
    this.next = next;
    this.nextWipe = wipe;
    // super.bang({ t });
    this.bangT = t;
  }

  update({ t }) {
    let p = this.p;
    // if (p.frameCount <= this.lastUpdateFrame) {
    //   return;
    // }
    // this.lastUpdateFrame = p.frameCount;
    super.update({ t });

    if (this.next != undefined && this.bangTween >= 0.5) {
      this.bangParam = Math.floor(Math.random() * 4);
      this.bangCycle = (this.bangCycle + 1) % 2;
      if (this.wipeDraw.c.isWipe) {
        this.foreDraw = this.backDraw;
        this.backDraw = this.next;
      }
      this.next = undefined;

      this.wipeDraw = this.nextWipe;
      this.nextWipe = undefined;
      this.switcherCallback();
    }

    setColorMode = 0;
    this.backDraw.draw({ pg: this.pgB });
    this.foreDraw.draw({ pg: this.pgF });
    setColorMode = 2;
    let tw = 0;
    if (this.bangTween < 0.5) {
      tw = this.bangTween + 0.5;
    }
    else {
      tw = this.bangTween - 0.5;
    }
    let args = { tw, bangParam: this.bangParam };
    this.pgMask.push();
    this.wipeDraw.draw({ pg: this.pgMask, args });
    this.pgMask.pop();
    setColorMode = 0;
  }

  draw({ pg }) {
    const p = this.p;

    this.pShader.setUniform("ppixelsR", this.pgF);
    this.pShader.setUniform("ppixelsG", this.pgM);
    this.pShader.setUniform("ppixelsB", this.pgB);
    this.pShader.setUniform("ppixelsM", this.pgMask);
    this.pShader.setUniform("resolution", [width * p.pixelDensity(), height * p.pixelDensity()]);
    pg.push();
    pg.shader(this.pShader);
    pg.noStroke();
    pg.fill(255);
    pg.rect(-width / 2, -height / 2, width, height);
    pg.resetShader();
    pg.pop();
  }
}

class ClockWipe {
  constructor({ p }) {
    this.p = p;
    this.isWipe = true;
    this.name = 'ClockWipe';
  }
  draw(pg, args) {
    const p = this.p
    const { col, sides, rand, tw, bangParam } = args;
    pg.push();
    setColor(pg, 'background', col.bg);
    // pg.translate(pg.width / 2, pg.height / 2);
    pg.noStroke();
    let rate0 = 0;
    let rate1 = 0;
    let r1 = pg.width / 2;
    let rMax = pg.width * 2;
    let rr = 0;
    // if (rand[4] < 0.5) {
    //   r1 = pg.width * 2;
    // }
    let halfRate = col.mg == undefined ? 1 / 2 : 1 / 3;
    const halfRateDiv = Math.floor(rand[0] * 5 + 1);
    halfRate /= halfRateDiv;
    if (rand[3] < 0.5) {
      this.isWipe = true;
    }
    else {
      this.isWipe = false;
    }
    if (tw <= 0.5) {
      const etw = EasingFunctions.easeInOutCubic(tw * 2);
      rate0 = etw * halfRate * 2;
      rate1 = etw * halfRate;
    }
    else {
      const etw = EasingFunctions.easeInOutCubic(tw * 2 - 1);
      if (this.isWipe) {
        rate0 = p.map(etw, 0, 1, 2 * halfRate, 1);
        rate1 = p.map(etw, 0, 1, 1 * halfRate, 1);
        r1 = p.map(etw, 0, 1, r1, rMax);
      }
      else {
        if (rand[5] < 0.5) {
          rate0 = p.map(etw, 0, 1, 2 * halfRate, 0);
          rate1 = p.map(etw, 0, 1, 1 * halfRate, 0);
        }
        else {
          rate0 = 2 * halfRate;
          rate1 = 1 * halfRate;
          rr = p.map(etw, 0, 1, 0, 1);
        }
      }
    }
    function drawArc(r0, r1, rate) {
      const n = 64;
      const sign = bangParam % 2 == 0 ? -1 : 1;
      pg.beginShape(p.TRIANGLE_STRIP);
      for (let i = 0; i <= n; i++) {
        let theta = sign * i / n * Math.PI * 2 * rate - Math.PI / 2;
        let x = r0 * Math.cos(theta);
        let y = r0 * Math.sin(theta);
        pg.vertex(x, y);
        x = r1 * Math.cos(theta);
        y = r1 * Math.sin(theta);
        pg.vertex(x, y);
      }
      pg.endShape();
    }
    const N = Math.floor(4 * rand[1]);
    const M = Math.floor(rand[6] * halfRateDiv + 1);
    for (let i = 0; i <= N; i++) {
      const R1 = p.map(i, 0, N + 1, 0, r1);
      const R0 = p.lerp(p.map(i - 1, 0, N + 1, 0, r1), R1, rr);
      for (let j = 0; j < M; j++) {
        pg.push();
        pg.rotate((i + j) * halfRate * Math.PI * 4 - ((i * 0.25 + 1) * p.millis() * 0.001 + rand[2]) * Math.PI * 0.25);
        if (col.mg != undefined) {
          setColor(pg, 'fill', col.mg);
          drawArc(R0, R1, rate0);
        }
        pg.rotate(halfRate * Math.PI * 4);
        setColor(pg, 'fill', col.fg);
        drawArc(R0, R1, rate1);
        pg.pop();
      }
    }
    pg.pop();
  }
}

class ShapeExpand {
  constructor({ p }) {
    this.p = p;
    this.isWipe = true;
    this.name = 'ShapeExpand';
  }
  draw(pg, args) {
    const p = this.p;
    const t = p.millis() * 0.001;
    const { col, sides, rand, tw, bangParam } = args;
    pg.push();
    setColor(pg, 'background', col.bg);
    // pg.translate(pg.width / 2, pg.height / 2);
    const draw = (R) => {
      pg.push();
      const n = [3, 4, 5, 6, 8][Math.floor(rand[1] * 5)];
      pg.rotate((EasingFunctions.easeInOutCubic(t % 1) + Math.floor(t)) * Math.PI / n);
      pg.noStroke();
      let r = R;
      if (rand[0] < 0.5) {
        this.isWipe = false;
      }
      else {
        this.isWipe = true;
      }
      if (tw < 0.5) {
        r *= p.map(EasingFunctions.easeInOutCubic(tw * 2), 0, 1, 0, 0.25);
      }
      else {
        if (rand[0] < 0.5) {
          r *= p.map(EasingFunctions.easeInOutCubic(tw * 2 - 1), 0, 1, 0.25, 0);
        }
        else {
          r *= p.map(EasingFunctions.easeInOutCubic(tw * 2 - 1), 0, 1, 0.25, 1);
        }
      }
      pg.beginShape();
      for (let i = 0; i <= n; i++) {
        let theta = i / n * Math.PI * 2 - Math.PI / 2;
        let x = r * Math.cos(theta);
        let y = r * Math.sin(theta);
        pg.vertex(x, y);
      }
      pg.endShape(p.CLOSE);
      pg.pop();
    }
    if (col.mg != undefined) {
      setColor(pg, 'fill', col.mg);
      draw(pg.width * 1.42 * 1.2);
    }
    setColor(pg, 'fill', col.fg);
    draw(pg.width * 1.42);
    pg.pop();
  }
}

class ParticleMove {
  constructor({ p }) {
    this.p = p;
    this.isWipe = false;
    this.name = 'ParticleMove';
  }
  draw(pg, args) {
    const p = this.p;
    const t = p.millis() * 0.001;
    const { col, sides, rand, tw, bangParam } = args;
    pg.push();
    pg.noStroke();
    if (rand[0] < 0.5) {
      this.isWipe = false;
    }
    else {
      this.isWipe = true;
    }
    setColor(pg, 'background', col.bg);
    let tween = 0;
    if (tw < 0.5) {
      tween = EasingFunctions.easeInOutCubic(tw * 2);
    }
    else {
      tween = p.map(EasingFunctions.easeInOutCubic(tw * 2 - 1), 0, 1, 1, 0);
    }
    const draw = (phase) => {
      let r = width * 0.03;
      if (rand[0] < 0.5) {
      }
      else {
        if (tw >= 0.5) {
          r = p.map(EasingFunctions.easeInOutCubic(tw * 2 - 1), 0, 1, r, width * 2);
        }
      }
      const n = 64;
      for (let i = 0; i < n; i++) {
        const R = width * (0.4 + phase * 0.1);
        let X, Y;
        if (rand[1] < 1 / 3) {
          const theta = (i / n * 2 + t / n * 16 + phase) * Math.PI;
          X = R * Math.cos(theta);
          Y = R * Math.sin(theta);
        }
        else if (rand[1] < 2 / 3) {
          const theta = (i / n * 2 + phase) * Math.PI;
          X = R * Math.cos(theta);
          Y = R * 0.5 * (Math.random() - 0.5);
        }
        else {
          const theta = (i / n * 2 + phase) * Math.PI;
          X = R * Math.cos(theta);
          Y = R * 0.5 * Math.sin((X / R + t) * Math.PI);
        }
        const x = p.lerp(0, X, tween);
        const y = p.lerp(0, Y, tween);
        pg.ellipse(x, y, r, r);
      }
    }
    if (col.mg != undefined) {
      setColor(pg, 'fill', col.mg);
      draw(0.5);
    }
    setColor(pg, 'fill', col.fg);
    draw(0);
    pg.pop();
  }
}

class CircleGridMove {
  constructor({ p }) {
    this.p = p;
    this.name = 'CircleGridMove';
  }
  draw(pg, args) {
    const p = this.p;
    const { col, sides, rand, tw, bangParam } = args;
    pg.push();
    setColor(pg, 'background', col.bg);
    setColor(pg, 'fill', col.fg);
    pg.noStroke();
    const n = sides + 1;
    const r = pg.width / n / 4;
    const t = p.millis() * 0.001;
    // pg.translate(pg.width / 2, pg.height / 2);
    pg.rotate(sides * Math.PI / 4);
    for (let j = -n - 1; j <= n + 1; j++) {
      const sj = rand[0] > 0.5 ? (j + n + 1) / (2 * n + 2) : 0;
      const tww = p.constrain(p.map(t % 1, 0, 1 - sj, 0, 1), 0, 1);
      const dt = EasingFunctions.easeInOutCubic(tww) * pg.width / 2 / n;
      for (let i = -n - 1; i <= n + 1; i++) {
        pg.push();
        const dx = (i + n + 1) % 2 == Math.floor(t) % 2 ? dt : 0;
        pg.translate(pg.width / 2 / n * j + dx, pg.width / 2 / n * i);
        pg.ellipse(0, 0, r, r);
        pg.pop();
      }
    }
    pg.pop();
  }
}

class SquareGridRotate {
  constructor({ p }) {
    this.p = p;
    this.name = 'SquareGridRotate';
  }
  draw(pg, args) {
    const p = this.p
    const { col, sides, rand, tw, bangParam } = args;
    pg.push();
    const n = sides + 1;
    const r = pg.width / n / 4 * Math.sqrt(2);

    const t = p.millis() * 0.001;
    if ((t + 1) % 4 < 2) {
      setColor(pg, 'background', col.bg);
      setColor(pg, 'fill', col.fg);
    }
    else {
      setColor(pg, 'background', col.fg);
      setColor(pg, 'fill', col.bg);
      pg.translate(pg.width / 2 / n * 0.5, pg.width / 2 / n * 0.5);
    }
    pg.noStroke();
    pg.rectMode(p.CENTER);
    // pg.translate(pg.width / 2, pg.height / 2);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        pg.push();
        pg.translate(pg.width / 2 / n * j, pg.width / 2 / n * i);
        pg.rotate((EasingFunctions.easeInOutQuint(t % 1) + Math.floor(t)) / 4 * Math.PI);
        pg.rect(0, 0, r, r);
        pg.pop();
      }
    }
    pg.pop();
  }
}

class SquareGrid {
  constructor({ p }) {
    this.p = p;
    this.name = 'SquareGrid';
  }
  draw(pg, args) {
    const p = this.p
    const { col, sides, rand, tw, bangParam } = args;
    pg.push();
    const n = sides + 1;
    const r = pg.width / n / 4 * Math.sqrt(2);

    const t = p.millis() * 0.001;
    setColor(pg, 'background', col.bg);
    setColor(pg, 'fill', col.fg);
    pg.noStroke();
    pg.rectMode(p.CENTER);
    // pg.translate(pg.width / 2, pg.height / 2);
    pg.rotate(Math.PI / 2 * sides);
    for (let j = -n - 1; j <= n + 1; j++) {
      const sj = rand[0] > 0.5 ? (j + n + 1) / (2 * n + 2) : 0;
      const tww = p.constrain(p.map(t % 1, 0, 1 - sj, 0, 1), 0, 1);
      const dt = EasingFunctions.easeInOutCubic(tww) * pg.width / 2 / n;
      for (let i = -n - 1; i <= n + 1; i++) {
        pg.push();
        const dx = (i + n + 1) % 2 == Math.floor(t) % 2 ? dt : 0;
        pg.translate(pg.width / 2 / n * j + dx, pg.width / 2 / n * i);
        pg.rotate(Math.PI / 4 * sides);
        pg.rect(0, 0, r, r);
        pg.pop();
      }
    }
    pg.pop();
  }
}

const s = (p) => {
  const wipeDraws = [
    // new ClockWipe({ p }),
    // new ShapeExpand({ p }),
    new ParticleMove({ p }),
  ];
  let solidDraws = [
    // new SquareGrid({ p }),
    // new CircleGridMove({ p }),
    new SquareGrid({ p }),
    new CircleGridMove({ p }),
    new SquareGridRotate({ p }),
    new SquareGrid({ p }),
  ];
  const synths = {};
  const feedbackLoop = new FeedbackLoop();

  let freq = 0, freqLerped = 0;
  let pointer = 0;
  let codeInput;
  let tokens = [];

  let isPlaying = false;
  let prevChar = '';

  let codeBase = 'n';
  let pastCommands = [];

  let wipe0;
  let turn;

  let diffDrawer;

  const history = [];
  const savedHistory = [
    "<<<30f=n=>>>",
    "<<<30f=n=>d>b>",
    "<<<<30f=n=>d>>b>",
    "<<<<30f=n=>d>>b>d<<<31p===>>>b",
    "<<<<30f=n=>d>>b>d<<<31p=f=>>>b",
    "<<<<30fff===nnn===>d>>b>d<<<31ppp===fff===>>>b",
    "<<<30fff===nnn===>d>>b<<d<31ppp===fff===>b>>",
    "<<<30fff===nnn===>d>>b<<<31mm==aa==>d<31[[[===fff===>b>>",
    "<<<31mm==aa==>d<31[[[===fff===>b>>d<<<32NN=====>>>b",
    "<<<31mm==aa==>d<31[[[===fff===>b>>d<<<32[[===>>>b",
    "<<<31mm==aa==>d<31[[[===fff===>b>>d32<<<+2[[===>>>b",
    "<<<31mm==aa==>d<31[[[===fff===>b>>d32<<<+2[[[<===>>>>b"
  ];
  let curHistory = 0;

  p.setup = () => {
    p.createCanvas(width, height, p.WEBGL);
    p.frameRate(60);

    wipe0 = new WipeDelayGraphics({
      p,
      switcherCallback: p.switcherCallback,
      fore: new Drawer({ c: solidDraws[1] }),
      back: new Drawer({ c: solidDraws[0] }),
      wipe: new Drawer({
        c: wipeDraws[0], args: { col: { bg: 0, fg: 2, mg: 1 } }
      })
    });

    turn = wipe0;

    diffDrawer = new Drawer({ c: solidDraws[2] });

    synths['~'] = new Tone.Synth({
      oscillator: { type: 'triangle' }
    }).toMaster();
    synths['a'] = new Tone.AMSynth().toMaster();
    synths['f'] = new Tone.FMSynth().toMaster();
    synths['N'] = new Tone.Synth({
      oscillator: { type: 'sawtooth' }
    }).toMaster();
    synths['^'] = new Tone.Synth({
      oscillator: { type: 'triangle' }
    }).toMaster();
    synths['['] = new Tone.Synth({
      oscillator: { type: 'square' }
    }).toMaster();
    synths['p'] = new Tone.PluckSynth().toMaster();
    synths['m'] = new Tone.MetalSynth().toMaster();
    synths['n'] = new Tone.NoiseSynth().toMaster();

    if (replayMode == false) {
      codeInput = p.createInput(codeBase);
      codeInput.size(p.width * 1.5);
    }
  }

  p.mouseClicked = () => {
    runButtonClicked();
  }

  let node;
  let curPattern = 0;
  let curDraw = 0;

  p.switcherCallback = () => {
    diffDrawer = new Drawer({ c: solidDraws[Math.floor(solidDraws.length * Math.random())] });
  }
  p.draw = () => {
    let t = p.millis() * 0.001;

    if (isPlaying) {
      freqLerped = p.lerp(freqLerped, freq, 0.3);
      if (pointer < tokens.length) {
        if (p.frameCount % 4 == 0) {
          lastNode = node;
          node = tokens[pointer];
          execute(node);
        }
      } else {
        isPlaying = false;
        if (replayMode) {
          curPattern = (curPattern + 1) % wipeDraws.length;
          curDraw = (curDraw + 1) % solidDraws.length;
          turn = wipe0;
          next = new Drawer({ c: solidDraws[curDraw] })
          wipe0.bang({
            t, next,
            wipe: new Drawer({
              c: wipeDraws[curPattern],
              args: {
                col: { bg: 0, fg: 2, mg: Math.random() > 0.5 ? 1 : undefined }
              }
            })
          });
          setTimeout(() => {
            curHistory++;
            if (curHistory < savedHistory.length) {
              runButtonClicked();
            }
            else {
              curHistory = 0;
            }
          }, 500);
        }
      }
    } else {
      for (const key in synths) {
        synths[key].triggerRelease();
      }
      prevChar = '';
    }

    if (!isNaN(node)) {
      pastCommands.push(freq);
    } else {
      pastCommands.push(node);
    }
    if (pastCommands.length > 15 * 15) pastCommands.shift();
    pointer++;

    const dt = -Math.cos(t * Math.PI * 0.5) * 0.5 + 0.5;
    const du = -Math.cos(t * Math.PI * 0.1) * 0.5 + 0.5;

    turn.freq = freq;
    turn.update({ t });

    diffDrawer.draw({ pg: turn.pgM });

    p.background(0);
    turn.draw({ pg: p });
    // p.image(turn.pgF, -width / 2, -height / 2, width / 2, height / 2);
    // p.image(turn.pgB, -width / 2, 0, width / 2, height / 2);
    // p.image(turn.pgM, 0, -height / 2, width / 2, height / 2);
    // p.image(turn.pgMask, 0, -height / 2, width / 2, height / 2);
  }

  let isSetup = false;
  let runButtonClicked = () => {
    isPlaying = true;
    if (isSetup == false) {
      feedbackLoop.setup();

      for (const key in synths) {
        synths[key].connect(feedbackLoop.feedbackDelay);
      }
      isSetup = true;
    }
    let code;
    if (replayMode) {
      code = savedHistory[curHistory];
    }
    else {
      code = codeInput.value();
    }
    let unbalancedBrackets = (code.split("<").length - 1) - (code.split(">").length - 1);
    if (unbalancedBrackets > 0) {
      code += '>'.repeat(unbalancedBrackets);
    }
    if (replayMode == false) {
      if (history.length == 0 || history[history.length - 1] != code) {
        history.push(code);
        console.log(history);
      }
    }
    code = unpack(code);

    while (code.indexOf('<') > -1) {
      code = unpack(code);
    }

    let lex = code.match(/(\D+)|[+-]?(\d*[.])?\d+/gi);
    parse(lex);
  }

  let unpack = (code, index) => {
    let pointer = 0;
    let result = '';
    let start = 0;
    let end = 0;
    let stack = 0;

    let peek = () => {
      return code[pointer];
    }

    let consume = () => {
      pointer++;
    }

    while (pointer < code.length) {
      let t = peek();
      if (t === "<") {
        if (stack == 0) {
          start = pointer;
        }
        stack++;
      } else if (t === ">") {
        end = pointer;
        stack--;
        if (stack == 0) {
          result += code.slice(start + 1, end).repeat(2);
        }
      } else {
        if (stack == 0) {
          result += t;
        }
      }
      consume();
    }

    return result;
  }

  let parse = (l) => {
    pointer = 0;
    tokens = [];
    if (l) {
      for (let i = 0; i < l.length; i++) {
        if (isNaN(l[i])) {
          let chars = l[i].split('');
          for (let j = 0; j < chars.length; j++) {
            tokens.push(chars[j]);
          }
        } else {
          tokens.push(l[i]);
        }
      }
    }
  }

  const execute = (t) => {
    if (t != prevChar) {
      if (isNaN(t)) {
        switch (t) {
          case '~':
          case 'a':
          case 'f':
          case 'N':
          case '^':
          case '[':
          case 'p':
          case 'm':
            curSynth = t;
            if (t == 'm') {
              synths[t].triggerAttack();
            } else {
              synths[t].triggerAttack(midiToFreq(freq));
            }
            for (const key in synths) {
              if (key != t) {
                synths[key].triggerRelease();
              }
            }
            break;
          case '=':
            curSynth = '';
            for (const key in synths) {
              synths[key].triggerRelease();
            }
            break;
          case 'd':
            if (feedbackLoop.feedbackDelay) {
              // feedbackLoop.feedbackDelay.delayTime.linearRampTo(0.2, 1 / 60);
              // feedbackLoop.feedbackDelay.delayTime.linearRampTo(0.1, 1 / 60, 1 / 2);
              feedbackLoop.feedbackDelay.feedback.linearRampTo(0.7, 1 / 30);
            }
            break;
          case 'b':
            if (feedbackLoop.feedbackDelay) {
              // feedbackLoop.feedbackDelay.feedback.linearRampTo(1, 1 / 60);
              feedbackLoop.feedbackDelay.feedback.linearRampTo(0, 1 / 30);
            }
            break;
          case '+':
          case '-':
          case '*':
          case '/':
          case '<':
          case '>':
            break;
          default:
            curSynth = 'n';
            for (const key in synths) {
              synths[key].triggerRelease();
            }
            synths.n.triggerAttack();
        }
      } else {
        if (prevChar == "+") {
          freq += parseFloat(t);
        } else if (prevChar == "-") {
          freq -= parseFloat(t);
        } else if (prevChar == "*") {
          freq *= parseFloat(t);
        } else if (prevChar == "/") {
          freq /= parseFloat(t);
        } else {
          freq = parseFloat(t);
        }

        // if (freq == 0) freq = p.random(110);

        let f = midiToFreq(freq);
        if (isNaN(f) == false && f < 1e5) {
          for (const key in synths) {
            if (key != 'n' && key != 'p') {
              synths[key].frequency.setValueAtTime(f);
            }
          }
        }
      }
    }
    prevChar = t;
  }
}

class FeedbackLoop {
  constructor() {
    this.isSetup = false;
    this.bufferSize = 1024;
    this.effectiveBufferSize = this.bufferSize;
    this.amp = 0.5;
  }
  setup() {
    if (this.isSetup) return;

    this.feedback = Tone.context.createScriptProcessor(this.bufferSize, 1, 1);
    this.feedbackDelay = new Tone.FeedbackDelay(0.1, 0.0).connect(this.feedback);
    this.feedback.onaudioprocess = (e) => {
      let a = e.inputBuffer.getChannelData(0);
      let output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < this.bufferSize; i++) {
        output[i] = a[i % this.effectiveBufferSize] * this.amp;
      }
    }

    this.feedback.connect(Tone.Master);
    this.isSetup = true;
  }
}

let myp5 = new p5(s, document.getElementById('p5sketch'));