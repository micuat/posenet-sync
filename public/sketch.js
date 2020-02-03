// Naoto Hieda
// https://creativecommons.org/licenses/by-sa/3.0/

function midiToFreq(m) {
  let tuning = 440;
  if(m > 120) return 0;
  return Math.pow(2, (m - 69) / 12) * tuning;
}

let replayMode = false;
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

const s = (p) => {
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

  p.setup = () => {
    p.noCanvas();
    p.frameRate(60);

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
    p.runButtonClicked('');
  }

  let node;
  let curPattern = 0;
  let curDraw = 0;

  p.draw = () => {
    let t = p.millis() * 0.001;

    if (isPlaying) {
      if (pointer < tokens.length) {
          node = tokens[pointer];
          execute(node);
      } else {
        isPlaying = false;
        setTimeout(() => {
          p.runButtonClicked();
        }, 500);
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
  }

  let isSetup = false;
  p.runButtonClicked = (code) => {
    isPlaying = true;
    if (isSetup == false) {
      feedbackLoop.setup();

      for (const key in synths) {
        synths[key].connect(feedbackLoop.feedbackDelay);
      }
      isSetup = true;
    }
    let unbalancedBrackets = (code.split("<").length - 1) - (code.split(">").length - 1);
    if (unbalancedBrackets > 0) {
      code += '>'.repeat(unbalancedBrackets);
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