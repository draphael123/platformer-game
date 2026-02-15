import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

const GRAVITY = 0.55;
const JUMP_FORCE = -11.5;
const MOVE_SPEED = 4.2;
const TILE = 40;
const PW = 30;
const PH = 38;
const CW = 800;
const CH = 600;

// ─── CHARACTERS ───
const CHARS = [
  { name:"Ugly Umberto", desc:"Beer belly, unibrow, missing teeth", hat:"#c0392b", skin:"#f5cba7", shirt:"#e74c3c", pants:"#1a5276", shoes:"#5d4037", feat:"unibrow,wart,missingTooth,beerBelly,stubble" },
  { name:"Grimy Gertrude", desc:"Massive mole, ratty hair, snaggleteeth", hat:"#8e44ad", skin:"#fde3a7", shirt:"#9b59b6", pants:"#2c3e50", shoes:"#1a1a1a", feat:"mole,snaggletooth,ratHair,warts,crossEyed" },
  { name:"Bumpy Boris", desc:"Covered in bumps, lazy eye, drooling", hat:"#27ae60", skin:"#e8beac", shirt:"#2ecc71", pants:"#7f8c8d", shoes:"#4a235a", feat:"bumps,lazyEye,drool,hugNose,monobrow" },
  { name:"Crusty Carl", desc:"Eye patch, patchy beard, gold tooth", hat:"#d35400", skin:"#d2b48c", shirt:"#e67e22", pants:"#2c2c2c", shoes:"#8B0000", feat:"eyePatch,patchyBeard,goldTooth,scar,earHair" },
  { name:"Swampy Sue", desc:"Green tint, webbed ears, tongue out", hat:"#16a085", skin:"#a8d8b9", shirt:"#1abc9c", pants:"#0e6251", shoes:"#4a3728", feat:"greenTint,webbedEars,tongueOut,wideEyes,noseDrip" },
  { name:"Wonky Wayne", desc:"Huge ears, buck teeth, asymmetric everything", hat:"#2980b9", skin:"#fad7a0", shirt:"#3498db", pants:"#1b4f72", shoes:"#6c3483", feat:"hugeEars,buckTeeth,asymmetric,tinyEyes,neckBeard" },
];

// ─── THEME VISUALS ───
const THEMES = {
  grassland:{ sky1:"#4a90d9",sky2:"#87ceeb",ground:"#5dbb63",groundDark:"#3d8b43",brick:"#c0784a",brickDark:"#8B5e3c",hill:"#4da653",bg:"rgba(255,255,255,0.5)",dark:false },
  desert:{ sky1:"#f4a460",sky2:"#ffe4b5",ground:"#daa520",groundDark:"#b8860b",brick:"#d2b48c",brickDark:"#8B7355",hill:"#c8a84e",bg:"rgba(255,220,150,0.4)",dark:false },
  cave:{ sky1:"#1a1a2e",sky2:"#2d2d44",ground:"#4a4a5a",groundDark:"#333340",brick:"#555566",brickDark:"#3a3a4a",hill:"#2a2a3a",bg:"rgba(100,100,150,0.2)",dark:true },
  snow:{ sky1:"#b0c4de",sky2:"#e8f0fe",ground:"#f0f8ff",groundDark:"#b0c4de",brick:"#dcdcdc",brickDark:"#a9a9a9",hill:"#c8dce8",bg:"rgba(255,255,255,0.6)",dark:false },
  lava:{ sky1:"#2c0a0a",sky2:"#4a1010",ground:"#8B0000",groundDark:"#5c0000",brick:"#a0522d",brickDark:"#6b3410",hill:"#3a0808",bg:"rgba(255,100,0,0.15)",dark:true },
  night:{ sky1:"#0a0a2e",sky2:"#15153e",ground:"#2d5a3d",groundDark:"#1a3a2a",brick:"#4a6a5a",brickDark:"#2a4a3a",hill:"#1a2a1a",bg:"rgba(200,200,255,0.1)",dark:true },
  swamp:{ sky1:"#2d4a2d",sky2:"#4a6a3a",ground:"#556b2f",groundDark:"#3a4a1f",brick:"#6b8e23",brickDark:"#4a6a10",hill:"#3a5a2a",bg:"rgba(100,150,50,0.2)",dark:false },
  sky:{ sky1:"#87ceeb",sky2:"#e0f0ff",ground:"#ddd",groundDark:"#bbb",brick:"#bcd",brickDark:"#9ab",hill:"#aadaff",bg:"rgba(255,255,255,0.7)",dark:false },
  toxic:{ sky1:"#1a2a0a",sky2:"#2a3a1a",ground:"#4a5a0a",groundDark:"#3a4a00",brick:"#6a7a2a",brickDark:"#4a5a1a",hill:"#2a3a0a",bg:"rgba(150,255,0,0.1)",dark:true },
  crystal:{ sky1:"#1a0a2e",sky2:"#2a1a4e",ground:"#6a4a8a",groundDark:"#4a2a6a",brick:"#8a6aaa",brickDark:"#5a3a7a",hill:"#3a1a5a",bg:"rgba(180,100,255,0.15)",dark:true },
};

// ─── MUSIC ENGINE (per-theme songs, pleasant sounding) ───
class MusicEngine {
  constructor() { this.started=false; this.muted=false; this.currentTheme=null; this.loops=[]; }

  async start() {
    if (this.started) return;
    await Tone.start();
    this.started = true;
    // SFX synths
    this.jumpSynth = new Tone.Synth({ oscillator:{type:"sine"}, envelope:{attack:0.01,decay:0.12,sustain:0,release:0.05}, volume:-20 }).toDestination();
    this.coinSynth = new Tone.Synth({ oscillator:{type:"triangle"}, envelope:{attack:0.005,decay:0.15,sustain:0,release:0.05}, volume:-16 }).toDestination();
    this.stompSynth = new Tone.MembraneSynth({ pitchDecay:0.03, octaves:4, envelope:{attack:0.01,decay:0.15,sustain:0,release:0.05}, volume:-18 }).toDestination();
    this.dieSynth = new Tone.Synth({ oscillator:{type:"sawtooth"}, envelope:{attack:0.01,decay:0.4,sustain:0,release:0.2}, volume:-16 }).toDestination();
    this.winSynth = new Tone.PolySynth(Tone.Synth,{ oscillator:{type:"triangle"}, envelope:{attack:0.05,decay:0.3,sustain:0.15,release:0.4}, volume:-14 }).toDestination();
    this.hazardSynth = new Tone.NoiseSynth({ noise:{type:"white"}, envelope:{attack:0.005,decay:0.08,sustain:0,release:0.02}, volume:-22 }).toDestination();
    // Music synths with reverb for warmth
    this.reverb = new Tone.Reverb({ decay:1.8, wet:0.25 }).toDestination();
    this.delay = new Tone.FeedbackDelay({ delayTime:"8n", feedback:0.15, wet:0.12 }).connect(this.reverb);
    this.melSynth = new Tone.Synth({ oscillator:{type:"triangle"}, envelope:{attack:0.04,decay:0.2,sustain:0.35,release:0.15}, volume:-20 }).connect(this.delay);
    this.padSynth = new Tone.PolySynth(Tone.Synth,{ oscillator:{type:"sine"}, envelope:{attack:0.3,decay:0.5,sustain:0.6,release:0.5}, volume:-26 }).connect(this.reverb);
    this.bassSynth2 = new Tone.Synth({ oscillator:{type:"triangle"}, envelope:{attack:0.05,decay:0.2,sustain:0.5,release:0.1}, volume:-22 }).toDestination();
    this.arpSynth = new Tone.Synth({ oscillator:{type:"sine"}, envelope:{attack:0.02,decay:0.1,sustain:0.1,release:0.08}, volume:-24 }).connect(this.reverb);
  }

  stopMusic() {
    this.loops.forEach(l => l.stop());
    this.loops = [];
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.currentTheme = null;
  }

  startMusic(theme, levelIdx) {
    if (!this.started) return;
    this.stopMusic();
    this.currentTheme = theme;
    const song = SONGS[theme];
    if (!song) return;

    // Variation per level: transpose based on level index within theme
    const transpose = [0, 2, -2, 1, -1, 3, -3, 4, -4, 5][levelIdx % 10];
    const shift = (note) => {
      if (note === "rest") return "rest";
      const n = Tone.Frequency(note).transpose(transpose);
      return n.toNote ? n.toNote() : Tone.Frequency(n).toNote();
    };

    Tone.getTransport().bpm.value = song.bpm;
    let melIdx = 0, bassIdx = 0, arpIdx = 0, padIdx = 0;

    // Melody
    const melLoop = new Tone.Loop((time) => {
      if (this.muted) return;
      const note = shift(song.melody[melIdx % song.melody.length]);
      if (note !== "rest") this.melSynth.triggerAttackRelease(note, song.melLen || "8n", time);
      melIdx++;
    }, song.melDiv || "8n");

    // Bass
    const bassLoop = new Tone.Loop((time) => {
      if (this.muted) return;
      const note = shift(song.bass[bassIdx % song.bass.length]);
      if (note !== "rest") this.bassSynth2.triggerAttackRelease(note, song.bassLen || "4n", time);
      bassIdx++;
    }, song.bassDiv || "4n");

    // Arp (if defined)
    let arpLoop = null;
    if (song.arp) {
      arpLoop = new Tone.Loop((time) => {
        if (this.muted) return;
        const note = shift(song.arp[arpIdx % song.arp.length]);
        if (note !== "rest") this.arpSynth.triggerAttackRelease(note, "16n", time);
        arpIdx++;
      }, "16n");
    }

    // Pad chords (if defined)
    let padLoop = null;
    if (song.pads) {
      padLoop = new Tone.Loop((time) => {
        if (this.muted) return;
        const chord = song.pads[padIdx % song.pads.length];
        if (chord && chord.length) {
          const shifted = chord.map(n => shift(n));
          this.padSynth.triggerAttackRelease(shifted, song.padLen || "2n", time);
        }
        padIdx++;
      }, song.padDiv || "2n");
    }

    melLoop.start(0);
    bassLoop.start(0);
    this.loops = [melLoop, bassLoop];
    if (arpLoop) { arpLoop.start(0); this.loops.push(arpLoop); }
    if (padLoop) { padLoop.start(0); this.loops.push(padLoop); }
    Tone.getTransport().start();
  }

  playJump() { if (!this.muted && this.started) this.jumpSynth.triggerAttackRelease("G5","0.06"); }
  playCoin() {
    if (!this.muted && this.started) {
      const t = Tone.now();
      this.coinSynth.triggerAttackRelease("E6","0.05",t);
      this.coinSynth.triggerAttackRelease("A6","0.05",t+0.06);
    }
  }
  playStomp() { if (!this.muted && this.started) this.stompSynth.triggerAttackRelease("C2","0.08"); }
  playDie() {
    if (!this.muted && this.started) {
      const t = Tone.now();
      this.dieSynth.triggerAttackRelease("D4","0.12",t);
      this.dieSynth.triggerAttackRelease("Bb3","0.12",t+0.14);
      this.dieSynth.triggerAttackRelease("F3","0.3",t+0.28);
    }
  }
  playWin() {
    if (!this.muted && this.started) {
      const t = Tone.now();
      this.winSynth.triggerAttackRelease(["C5","E5","G5"],"0.2",t);
      this.winSynth.triggerAttackRelease(["F5","A5","C6"],"0.2",t+0.25);
      this.winSynth.triggerAttackRelease(["G5","B5","D6"],"0.2",t+0.5);
      this.winSynth.triggerAttackRelease(["C5","E5","G5","C6"],"0.5",t+0.75);
    }
  }
  playHazard() { if (!this.muted && this.started) this.hazardSynth.triggerAttackRelease("0.04"); }
  toggle() { this.muted = !this.muted; return !this.muted; }
}

// ─── SONGS PER THEME ───
// Each has a distinct feel: pleasant melodies in various styles
const SONGS = {
  grassland: {
    bpm: 128,
    melody: ["C5","E5","G5","A5","G5","E5","D5","C5","rest","E5","G5","A5","B5","A5","G5","rest",
             "F5","A5","C6","A5","F5","E5","D5","rest","G5","B5","D6","B5","G5","F5","E5","D5"],
    melLen:"8n", melDiv:"8n",
    bass: ["C3","C3","F3","F3","G3","G3","C3","C3","Am2","Am2","F3","F3","G3","G3","G3","C3"],
    bassLen:"4n", bassDiv:"4n",
    arp: ["C4","E4","G4","E4","C4","E4","G4","E4","F4","A4","C5","A4","G4","B4","D5","B4"],
    pads: [["C4","E4","G4"],["F4","A4","C5"],["G4","B4","D5"],["C4","E4","G4"]],
    padDiv:"1n", padLen:"1n",
  },
  desert: {
    bpm: 108,
    melody: ["D5","F5","A5","rest","Bb5","A5","F5","D5","rest","C5","D5","F5","rest","A5","G5","F5",
             "D5","rest","A4","Bb4","D5","F5","rest","A5","Bb5","A5","G5","F5","D5","rest","rest","rest"],
    melLen:"8n", melDiv:"8n",
    bass: ["D3","rest","D3","A2","rest","A2","Bb2","rest","Bb2","G2","rest","G2","D3","rest","A2","rest"],
    bassLen:"8n", bassDiv:"8n",
    pads: [["D4","F4","A4"],["Bb3","D4","F4"],["G3","Bb3","D4"],["A3","D4","F4"]],
    padDiv:"1n", padLen:"2n",
  },
  cave: {
    bpm: 90,
    melody: ["E4","rest","G4","rest","B4","rest","E5","rest","D5","rest","B4","rest","A4","rest","G4","rest",
             "E4","rest","A4","rest","B4","rest","D5","rest","E5","rest","D5","B4","A4","G4","rest","rest"],
    melLen:"8n", melDiv:"8n",
    bass: ["E2","rest","E2","rest","A2","rest","A2","rest","B2","rest","B2","rest","E2","rest","E2","rest"],
    bassLen:"4n", bassDiv:"8n",
    arp: ["E3","G3","B3","E4","G3","B3","E4","G4","A3","C4","E4","A4","B3","D4","F#4","B4"],
  },
  snow: {
    bpm: 100,
    melody: ["A4","C5","E5","rest","D5","C5","rest","A4","rest","G4","A4","C5","E5","rest","F5","E5","D5","C5",
             "rest","A4","B4","D5","rest","E5","D5","B4","A4","rest","rest","rest","rest","rest"],
    melLen:"8n", melDiv:"8n",
    bass: ["A2","rest","A2","E2","rest","E2","F2","rest","F2","G2","rest","G2","A2","rest","E2","rest"],
    bassLen:"4n", bassDiv:"8n",
    pads: [["A3","C4","E4"],["F3","A3","C4"],["G3","B3","D4"],["A3","C4","E4"]],
    padDiv:"1n", padLen:"1n",
  },
  lava: {
    bpm: 138,
    melody: ["E4","E4","G4","A4","rest","B4","A4","G4","E4","rest","D4","E4","G4","rest","A4","G4",
             "E4","D4","rest","C4","D4","E4","G4","A4","rest","B4","A4","G4","E4","D4","rest","rest"],
    melLen:"16n", melDiv:"16n",
    bass: ["E2","E2","rest","E2","G2","rest","A2","A2","rest","A2","G2","rest","E2","E2","rest","E2"],
    bassLen:"8n", bassDiv:"8n",
    arp: ["E3","G3","B3","E4","E3","G3","B3","E4","A3","C4","E4","A4","A3","C4","E4","A4"],
  },
  night: {
    bpm: 85,
    melody: ["G4","rest","Bb4","rest","D5","rest","F5","rest","Eb5","rest","D5","rest","Bb4","rest","G4","rest",
             "rest","A4","rest","C5","rest","Eb5","rest","D5","rest","C5","rest","A4","rest","G4","rest","rest"],
    melLen:"8n", melDiv:"8n",
    bass: ["G2","rest","rest","G2","Bb2","rest","rest","Bb2","Eb2","rest","rest","Eb2","D2","rest","rest","D2"],
    bassLen:"4n", bassDiv:"8n",
    pads: [["G3","Bb3","D4"],["Eb3","G3","Bb3"],["C3","Eb3","G3"],["D3","F3","A3"]],
    padDiv:"1n", padLen:"1n",
  },
  swamp: {
    bpm: 95,
    melody: ["D4","F4","rest","G4","A4","rest","Bb4","A4","G4","F4","rest","D4","rest","C4","D4","rest",
             "F4","rest","G4","A4","Bb4","rest","C5","Bb4","A4","G4","rest","F4","D4","rest","rest","rest"],
    melLen:"8n", melDiv:"8n",
    bass: ["D2","rest","D2","F2","rest","G2","rest","G2","Bb2","rest","Bb2","A2","rest","D2","rest","rest"],
    bassLen:"8n", bassDiv:"8n",
    arp: ["D3","F3","A3","D4","F3","A3","D4","F4","G3","Bb3","D4","G4","A3","D4","F4","A4"],
  },
  sky: {
    bpm: 120,
    melody: ["C5","D5","E5","G5","rest","A5","G5","E5","D5","C5","rest","rest","E5","F5","G5","A5",
             "rest","B5","A5","G5","E5","D5","C5","rest","G5","A5","B5","C6","rest","B5","A5","G5"],
    melLen:"8n", melDiv:"8n",
    bass: ["C3","rest","G2","rest","A2","rest","F2","rest","C3","rest","G2","rest","F2","rest","G2","rest"],
    bassLen:"4n", bassDiv:"8n",
    pads: [["C4","E4","G4","B4"],["A3","C4","E4","G4"],["F3","A3","C4","E4"],["G3","B3","D4","F4"]],
    padDiv:"1n", padLen:"1n",
  },
  toxic: {
    bpm: 118,
    melody: ["E4","rest","F4","E4","D4","rest","E4","rest","G4","rest","A4","G4","E4","rest","D4","rest",
             "C4","rest","D4","E4","rest","G4","A4","rest","B4","A4","G4","E4","rest","D4","rest","rest"],
    melLen:"8n", melDiv:"8n",
    bass: ["E2","E2","rest","E2","rest","A2","A2","rest","C3","rest","B2","rest","E2","E2","rest","rest"],
    bassLen:"8n", bassDiv:"8n",
    arp: ["E3","G3","B3","E3","G3","B3","A3","C4","E4","A3","C4","E4","B3","D4","E4","B3"],
  },
  crystal: {
    bpm: 105,
    melody: ["A4","C5","E5","rest","F5","E5","C5","A4","rest","G4","A4","B4","rest","D5","E5","rest",
             "C5","rest","A4","G4","rest","F4","E4","rest","A4","C5","E5","rest","D5","C5","A4","rest"],
    melLen:"8n", melDiv:"8n",
    bass: ["A2","rest","A2","E2","rest","F2","rest","F2","G2","rest","G2","rest","A2","rest","E2","rest"],
    bassLen:"4n", bassDiv:"8n",
    pads: [["A3","C4","E4"],["F3","A3","C4"],["G3","B3","D4"],["E3","G3","B3"]],
    padDiv:"1n", padLen:"1n",
    arp: ["A3","C4","E4","A4","C4","E4","A4","C5","F3","A3","C4","F4","G3","B3","D4","G4"],
  },
};

// ─── LEVEL GENERATION ───
function genLevel(idx) {
  const seed = idx*7919+1;
  const r = (n) => ((seed*(n+1)*9301+49297)%233280)/233280;
  const diff = Math.min(idx/100, 1);
  const len = 65+Math.floor(idx*1.8)+Math.floor(r(0)*30);
  const platforms=[], coins=[], enemies=[], traps=[];

  // Ground with gaps
  let x=0;
  while (x<len) {
    const seg = 5+Math.floor(r(x+1)*12);
    for (let i=0;i<seg&&x+i<len;i++) platforms.push({x:x+i,y:14});
    x += seg;
    const gap = diff>0.2 ? 2+Math.floor(r(x+2)*(2+diff*3)) : 0;
    x += gap;
  }
  for (let i=0;i<7;i++) if(!platforms.find(p=>p.x===i&&p.y===14)) platforms.push({x:i,y:14});

  // Floating platforms
  const nFloat = 10+Math.floor(diff*22)+Math.floor(r(99)*10);
  for (let i=0;i<nFloat;i++) {
    const fx=6+Math.floor(r(i*3+10)*(len-10));
    const fy=5+Math.floor(r(i*3+11)*7);
    const fw=1+Math.floor(r(i*3+12)*3);
    for (let j=0;j<fw;j++) platforms.push({x:fx+j,y:fy});
  }

  // Moving platforms
  const nMoving = Math.floor(diff*8)+Math.floor(r(150)*4);
  for (let i=0;i<nMoving;i++) {
    const mx=10+Math.floor(r(i*3+160)*(len-15));
    const my=6+Math.floor(r(i*3+161)*6);
    const mdir = r(i*3+162)>0.5?"h":"v";
    const mrange = 2+Math.floor(r(i*3+163)*3);
    traps.push({type:"movingPlatform",x:mx*TILE,y:my*TILE,dir:mdir,range:mrange*TILE,speed:0.8+diff,ox:mx*TILE,oy:my*TILE,t:r(i)*Math.PI*2});
  }

  // Falling platforms
  const nFalling = Math.floor(diff*6)+Math.floor(r(200)*3);
  for (let i=0;i<nFalling;i++) {
    const fx2=8+Math.floor(r(i*2+210)*(len-12));
    const fy2=7+Math.floor(r(i*2+211)*5);
    traps.push({type:"fallingPlatform",x:fx2*TILE,y:fy2*TILE,oy:fy2*TILE,triggered:false,timer:0,fallen:false,shaking:false});
  }

  // Pipes
  const nPipes=2+Math.floor(diff*5);
  for (let i=0;i<nPipes;i++) {
    const px=10+Math.floor(r(i*5+50)*(len-15));
    const ph=2+Math.floor(r(i*5+51)*3);
    for (let h=0;h<ph;h++) platforms.push({x:px,y:13-h,isPipe:true});
  }

  // Spikes
  const nSpikes = Math.floor(diff*10)+Math.floor(r(300)*5);
  for (let i=0;i<nSpikes;i++) {
    const sx=6+Math.floor(r(i*2+310)*(len-8));
    if (platforms.find(p=>p.x===sx&&p.y===14)) {
      traps.push({type:"spike",x:sx*TILE,y:13*TILE});
    }
  }

  // Lava pools
  const nLava = Math.floor(diff*6)+Math.floor(r(350)*3);
  for (let i=0;i<nLava;i++) {
    const lx=8+Math.floor(r(i*2+360)*(len-10));
    const lw=2+Math.floor(r(i*2+361)*3);
    traps.push({type:"lava",x:lx*TILE,y:14*TILE,w:lw*TILE});
  }

  // Saw blades
  const nSaws = Math.floor(diff*5)+Math.floor(r(400)*3);
  for (let i=0;i<nSaws;i++) {
    const sx2=10+Math.floor(r(i*3+410)*(len-15));
    const sy2=5+Math.floor(r(i*3+411)*7);
    const sDir = r(i*3+412)>0.5?"h":"v";
    const sRange = 2+Math.floor(r(i*3+413)*3);
    traps.push({type:"saw",x:sx2*TILE,y:sy2*TILE,dir:sDir,range:sRange*TILE,ox:sx2*TILE,oy:sy2*TILE,t:r(i)*Math.PI*2});
  }

  // Wind zones
  const nWind = Math.floor(diff*4)+Math.floor(r(450)*2);
  for (let i=0;i<nWind;i++) {
    const wx=12+Math.floor(r(i*2+460)*(len-20));
    const ww=3+Math.floor(r(i*2+461)*5);
    const wdir = r(i*2+462)>0.5?1:-1;
    traps.push({type:"wind",x:wx*TILE,y:4*TILE,w:ww*TILE,h:10*TILE,force:wdir*(1.5+diff*1.5)});
  }

  // Coins
  const nCoins=10+Math.floor(r(500)*8)+Math.floor(diff*8);
  for (let i=0;i<nCoins;i++) {
    const cx=4+Math.floor(r(i*2+600)*(len-8));
    const cy=3+Math.floor(r(i*2+601)*10);
    coins.push({x:cx,y:cy,collected:false});
  }

  // Enemies - multiple types
  const nEn = 3+Math.floor(diff*14)+Math.floor(r(700)*5);
  for (let i=0;i<nEn;i++) {
    const ex=8+Math.floor(r(i*4+800)*(len-12));
    const ey=13;
    const rn=2+Math.floor(r(i*4+801)*4);
    const typeRoll = r(i*4+802);
    let type;
    if (typeRoll < 0.35) type="walker";
    else if (typeRoll < 0.55) type="fast";
    else if (typeRoll < 0.7) type="flyer";
    else if (typeRoll < 0.82) type="jumper";
    else if (typeRoll < 0.92) type="charger";
    else type="shooter";
    const flyY = type==="flyer" ? (5+Math.floor(r(i*4+803)*6)) : ey;
    enemies.push({
      x:ex*TILE,y:flyY*TILE,startX:ex*TILE,startY:flyY*TILE,
      range:rn*TILE,dir:1,frame:0,type,alive:true,
      chargeTimer:0,charging:false,
      jumpTimer:40+Math.floor(r(i*4+804)*60),jumpCd:0,
      shootTimer:80+Math.floor(r(i*4+805)*60),shootCd:0,
      projectiles:[],
    });
  }

  const themeNames=["grassland","desert","cave","snow","lava","night","swamp","sky","toxic","crystal"];
  return {
    name:`World ${Math.floor(idx/10)+1}-${(idx%10)+1}`,
    theme:themeNames[idx%10], platforms, coins, enemies, traps,
    flag:{x:len+5,y:6}, startX:2, startY:12, length:len,
  };
}

// ─── DRAWING ───
function drawChar(ctx,x,y,w,h,ci,right,frame,jumping,scale) {
  const c=CHARS[ci]; const f=Math.floor(frame)%4; const dir=right?1:-1; const feat=c.feat.split(",");
  ctx.save();
  if(scale&&scale!==1){ctx.translate(x+w/2,y+h);ctx.scale(scale,scale);ctx.translate(-(x+w/2),-(y+h));}
  // Shadow
  ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+2,w/2+2,5,0,0,Math.PI*2); ctx.fill();
  // Legs
  const la=jumping?0:Math.sin(f*Math.PI/2)*5;
  ctx.fillStyle=c.pants;
  ctx.beginPath();ctx.roundRect(x+3,y+h-14,10,15,2);ctx.fill();
  ctx.beginPath();ctx.roundRect(x+w-13,y+h-14,10,15,2);ctx.fill();
  ctx.fillStyle=c.shoes;
  if(!jumping){ctx.beginPath();ctx.roundRect(x+1+la,y+h-3,14,6,[0,0,3,3]);ctx.fill();ctx.beginPath();ctx.roundRect(x+w-15-la,y+h-3,14,6,[0,0,3,3]);ctx.fill();}
  else{ctx.beginPath();ctx.roundRect(x+1,y+h-1,13,5,2);ctx.fill();ctx.beginPath();ctx.roundRect(x+w-14,y+h+2,13,5,2);ctx.fill();}
  // Body
  ctx.fillStyle=c.shirt;
  const belly=feat.includes("beerBelly")?3:0;
  ctx.beginPath();ctx.ellipse(x+w/2,y+h-20,w/2+belly,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.1)";ctx.beginPath();ctx.ellipse(x+w/2+3,y+h-18,w/2-2,12,0.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.3)";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x+7,y+h-30);ctx.lineTo(x+10,y+h-14);ctx.moveTo(x+w-7,y+h-30);ctx.lineTo(x+w-10,y+h-14);ctx.stroke();
  ctx.fillStyle="#f1c40f";ctx.fillRect(x+w/2-4,y+h-18,8,4);
  // Arms
  ctx.fillStyle=c.skin;
  const as=jumping?-10:Math.sin(f*Math.PI/2)*5;
  ctx.beginPath();ctx.roundRect(x-5,y+h-30+(jumping?-6:as),8,14,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(x+w-3,y+h-30+(jumping?-6:-as),8,14,3);ctx.fill();
  ctx.beginPath();ctx.arc(x-1,y+h-17+(jumping?-6:as),4,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+w+1,y+h-17+(jumping?-6:-as),4,0,Math.PI*2);ctx.fill();
  // Head
  ctx.fillStyle=c.skin;ctx.beginPath();ctx.ellipse(x+w/2,y+12,15,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.05)";ctx.beginPath();ctx.ellipse(x+w/2+3,y+13,13,11,0.1,0,Math.PI*2);ctx.fill();
  if(feat.includes("bumps")){ctx.fillStyle="rgba(180,100,100,0.4)";[[x+w/2-8,y+6],[x+w/2+7,y+8],[x+w/2-3,y+4],[x+w/2+10,y+14]].forEach(([a,b])=>{ctx.beginPath();ctx.arc(a,b,3,0,Math.PI*2);ctx.fill();});}
  // Nose
  const nx=x+w/2+dir*6; const ns=feat.includes("hugNose")?8:6;
  ctx.fillStyle=feat.includes("hugNose")?"#d4956b":"#e8a87c";
  ctx.beginPath();ctx.ellipse(nx,y+13,ns,ns-1,0,0,Math.PI*2);ctx.fill();
  if(feat.includes("wart")||feat.includes("warts")){ctx.fillStyle="#8B4513";ctx.beginPath();ctx.arc(nx+dir*3,y+11,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#4a2800";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(nx+dir*3,y+9);ctx.lineTo(nx+dir*4,y+5);ctx.stroke();if(feat.includes("warts")){ctx.fillStyle="#8B4513";ctx.beginPath();ctx.arc(x+w/2-dir*8,y+16,2,0,Math.PI*2);ctx.fill();}}
  if(feat.includes("noseDrip")){ctx.fillStyle="rgba(150,220,100,0.6)";ctx.beginPath();ctx.ellipse(nx,y+18,2,4+Math.sin(frame*0.2)*2,0,0,Math.PI*2);ctx.fill();}
  if(feat.includes("mole")){ctx.fillStyle="#5a3a1a";ctx.beginPath();ctx.arc(x+w/2+6,y+17,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#3a2a0a";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+w/2+6,y+13);ctx.lineTo(x+w/2+7,y+9);ctx.stroke();}
  // Eyes
  const eo=feat.includes("crossEyed")?-1:feat.includes("asymmetric")?1:0;
  const es1=feat.includes("tinyEyes")?2:feat.includes("wideEyes")?6:4;
  const es2=feat.includes("tinyEyes")?1.5:feat.includes("wideEyes")?5:3.5;
  if(feat.includes("eyePatch")){
    ctx.fillStyle="white";ctx.beginPath();ctx.ellipse(x+w/2+4*dir,y+8,es1,es1+1,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#000";ctx.beginPath();ctx.arc(x+w/2+4*dir+dir*2,y+8,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#1a1a1a";ctx.beginPath();ctx.ellipse(x+w/2-6*dir,y+8,6,5,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#1a1a1a";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w/2-6*dir,y+3);ctx.lineTo(x+w/2+8*dir,y-3);ctx.stroke();
  } else {
    ctx.fillStyle="white";
    ctx.beginPath();ctx.ellipse(x+w/2-6,y+8,es1,es1+1,-0.1,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+w/2+5,y+9+eo,es2,es2+0.5,0.1,0,Math.PI*2);ctx.fill();
    const po=dir*2; const lo=feat.includes("lazyEye")?3:0;
    ctx.fillStyle="#000";
    ctx.beginPath();ctx.arc(x+w/2-5+po,y+8,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(x+w/2+6+po+(feat.includes("crossEyed")?-4:0),y+9+eo+lo,1.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.7)";ctx.beginPath();ctx.arc(x+w/2-6+po,y+7,1,0,Math.PI*2);ctx.fill();
  }
  // Brows
  ctx.strokeStyle="#4a2800";ctx.lineWidth=feat.includes("monobrow")||feat.includes("unibrow")?3.5:2.5;
  if(feat.includes("unibrow")||feat.includes("monobrow")){ctx.beginPath();ctx.moveTo(x+w/2-11,y+4);ctx.quadraticCurveTo(x+w/2,y+1,x+w/2+10,y+5);ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(x+w/2-10,y+3);ctx.lineTo(x+w/2-2,y+5);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w/2+2,y+4);ctx.lineTo(x+w/2+10,y+3);ctx.stroke();}
  // Mouth
  if(feat.includes("tongueOut")){ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.ellipse(x+w/2+dir*3,y+21,5,7,dir*0.3,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle="#000";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+w/2-5,y+18);ctx.quadraticCurveTo(x+w/2,y+22,x+w/2+6,y+17);ctx.stroke();
  if(feat.includes("missingTooth")){ctx.fillStyle="#fffdd0";ctx.fillRect(x+w/2-4,y+17,3,3);ctx.fillRect(x+w/2+3,y+16,3,3);}
  else if(feat.includes("snaggletooth")){ctx.fillStyle="#fffdd0";ctx.fillRect(x+w/2-2,y+17,3,5);ctx.fillStyle="#ddd";ctx.fillRect(x+w/2+2,y+16,2,3);}
  else if(feat.includes("buckTeeth")){ctx.fillStyle="#fffdd0";ctx.fillRect(x+w/2-4,y+17,4,6);ctx.fillRect(x+w/2+1,y+17,4,6);}
  else if(feat.includes("goldTooth")){ctx.fillStyle="#fffdd0";ctx.fillRect(x+w/2-3,y+17,3,3);ctx.fillStyle="#ffd700";ctx.fillRect(x+w/2+2,y+16,3,3);}
  if(feat.includes("drool")){ctx.fillStyle="rgba(150,200,255,0.5)";ctx.beginPath();ctx.ellipse(x+w/2+5,y+22,2,4+Math.sin(frame*0.15)*3,0,0,Math.PI*2);ctx.fill();}
  if(feat.includes("stubble")){ctx.fillStyle="rgba(80,50,30,0.2)";ctx.beginPath();ctx.ellipse(x+w/2,y+17,9,7,0,0,Math.PI);ctx.fill();}
  if(feat.includes("patchyBeard")){ctx.fillStyle="rgba(60,40,20,0.4)";for(let i=0;i<12;i++){ctx.fillRect(x+w/2-8+((i*7)%16),y+16+((i*3)%6),2,3);}}
  if(feat.includes("neckBeard")){ctx.fillStyle="rgba(60,40,20,0.35)";ctx.beginPath();ctx.ellipse(x+w/2,y+24,10,6,0,0,Math.PI);ctx.fill();}
  if(feat.includes("scar")){ctx.strokeStyle="rgba(180,100,100,0.5)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w/2-8,y+4);ctx.lineTo(x+w/2-2,y+16);ctx.stroke();}
  if(feat.includes("hugeEars")){ctx.fillStyle=c.skin;ctx.beginPath();ctx.ellipse(x-3,y+10,8,12,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+w+3,y+10,8,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(200,120,120,0.3)";ctx.beginPath();ctx.ellipse(x-3,y+10,5,8,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+w+3,y+10,5,8,0,0,Math.PI*2);ctx.fill();}
  else if(feat.includes("webbedEars")){ctx.fillStyle=c.skin;ctx.beginPath();ctx.moveTo(x-2,y+4);ctx.lineTo(x-10,y+2);ctx.lineTo(x-2,y+16);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(x+w+2,y+4);ctx.lineTo(x+w+10,y+2);ctx.lineTo(x+w+2,y+16);ctx.closePath();ctx.fill();}
  if(feat.includes("earHair")){ctx.strokeStyle="#5a3a1a";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-1,y+8);ctx.lineTo(x-6,y+4);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w+1,y+8);ctx.lineTo(x+w+6,y+4);ctx.stroke();}
  if(feat.includes("ratHair")){ctx.strokeStyle="#4a2800";ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x+w/2-10+i*5,y-5);ctx.lineTo(x+w/2-14+i*5,y-12-i*2);ctx.stroke();}}
  // Hat
  ctx.fillStyle=c.hat;ctx.beginPath();ctx.ellipse(x+w/2,y+2,16,7,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.roundRect(x+w/2-13,y-7,26,10,[4,4,0,0]);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.15)";ctx.beginPath();ctx.roundRect(x+w/2-13,y-2,26,5,0);ctx.fill();
  const bx=right?x+w/2-6:x+w/2-18;
  ctx.fillStyle=c.hat;ctx.beginPath();ctx.roundRect(bx,y-1,24,6,2);ctx.fill();
  ctx.fillStyle="#f1c40f";ctx.font="bold 10px monospace";ctx.fillText("U",x+w/2-4,y+1);
  ctx.restore();
}

function drawEnemy(ctx,x,y,frame,type) {
  const f=Math.floor(frame)%4; const b=Math.sin(f*Math.PI/2)*2;
  if(type==="walker"||type==="fast") {
    const fast=type==="fast";
    ctx.fillStyle=fast?"#5b2c6f":"#8B4513";
    ctx.beginPath();ctx.ellipse(x+16,y+28+b,14,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=fast?"#a569bd":"#e74c3c";
    ctx.beginPath();ctx.ellipse(x+16,y+14+b,18,14,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle=fast?"#d7bde2":"#fff";
    ctx.beginPath();ctx.arc(x+10,y+10+b,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(x+22,y+8+b,4,0,Math.PI*2);ctx.fill();
    if(fast){ctx.fillStyle="#4a1a6a";for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+6+i*8,y+4+b);ctx.lineTo(x+10+i*8,y-4+b);ctx.lineTo(x+14+i*8,y+4+b);ctx.closePath();ctx.fill();}}
    ctx.fillStyle="white";ctx.beginPath();ctx.ellipse(x+10,y+20+b,5,4,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+22,y+20+b,5,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=fast?"#e74c3c":"#000";ctx.beginPath();ctx.arc(x+11,y+20+b,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+23,y+20+b,2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#000";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x+5,y+14+b);ctx.lineTo(x+14,y+17+b);ctx.moveTo(x+27,y+14+b);ctx.lineTo(x+18,y+17+b);ctx.stroke();
    ctx.fillStyle="#000";const fo=Math.sin(f*Math.PI/2)*3;
    ctx.beginPath();ctx.roundRect(x+3+fo,y+34+b,11,5,2);ctx.fill();
    ctx.beginPath();ctx.roundRect(x+18-fo,y+34+b,11,5,2);ctx.fill();
  }
  else if(type==="flyer") {
    // Bat-like creature
    const wb=Math.sin(frame*0.3)*12;
    ctx.fillStyle="#2c2c3e";ctx.beginPath();ctx.ellipse(x+16,y+16,10,8,0,0,Math.PI*2);ctx.fill();
    // Wings
    ctx.fillStyle="#444466";
    ctx.beginPath();ctx.moveTo(x+6,y+14);ctx.quadraticCurveTo(x-10+wb,y+4,x-8,y+18);ctx.lineTo(x+6,y+18);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(x+26,y+14);ctx.quadraticCurveTo(x+42-wb,y+4,x+40,y+18);ctx.lineTo(x+26,y+18);ctx.closePath();ctx.fill();
    // Eyes
    ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.arc(x+12,y+14,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+20,y+14,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(x+12,y+13,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+20,y+13,1,0,Math.PI*2);ctx.fill();
    // Fangs
    ctx.fillStyle="#fff";ctx.fillRect(x+13,y+20,2,4);ctx.fillRect(x+17,y+20,2,4);
  }
  else if(type==="jumper") {
    // Spring-loaded enemy
    const jb=Math.abs(Math.sin(frame*0.15))*8;
    ctx.fillStyle="#d4a017";ctx.beginPath();ctx.ellipse(x+16,y+24-jb,12,12,0,0,Math.PI*2);ctx.fill();
    // Spring
    ctx.strokeStyle="#aaa";ctx.lineWidth=3;
    ctx.beginPath();
    for(let s=0;s<4;s++){ctx.moveTo(x+10,y+34-jb*0.5+s*3);ctx.lineTo(x+22,y+36-jb*0.5+s*3);}
    ctx.stroke();
    // Eyes
    ctx.fillStyle="white";ctx.beginPath();ctx.ellipse(x+12,y+20-jb,4,5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+20,y+20-jb,4,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#000";ctx.beginPath();ctx.arc(x+12,y+20-jb,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+20,y+20-jb,2,0,Math.PI*2);ctx.fill();
    // Angry mouth
    ctx.strokeStyle="#000";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+10,y+28-jb);ctx.lineTo(x+22,y+28-jb);ctx.stroke();
  }
  else if(type==="charger") {
    // Bull-like enemy
    ctx.fillStyle="#8b0000";ctx.beginPath();ctx.ellipse(x+16,y+24+b,16,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.15)";ctx.beginPath();ctx.ellipse(x+18,y+26+b,14,10,0,0,Math.PI*2);ctx.fill();
    // Horns
    ctx.fillStyle="#d4a017";
    ctx.beginPath();ctx.moveTo(x+2,y+16+b);ctx.lineTo(x-6,y+8+b);ctx.lineTo(x+6,y+18+b);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(x+30,y+16+b);ctx.lineTo(x+38,y+8+b);ctx.lineTo(x+26,y+18+b);ctx.closePath();ctx.fill();
    // Eyes (angry red)
    ctx.fillStyle="#ff4444";ctx.beginPath();ctx.arc(x+11,y+22+b,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+21,y+22+b,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#000";ctx.beginPath();ctx.arc(x+11,y+22+b,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+21,y+22+b,1.5,0,Math.PI*2);ctx.fill();
    // Nostrils (steam)
    ctx.fillStyle="#600";ctx.beginPath();ctx.arc(x+14,y+28+b,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+18,y+28+b,2,0,Math.PI*2);ctx.fill();
    // Feet
    ctx.fillStyle="#500";const fo2=Math.sin(f*Math.PI/2)*4;
    ctx.fillRect(x+2+fo2,y+33+b,10,5);ctx.fillRect(x+20-fo2,y+33+b,10,5);
  }
  else if(type==="shooter") {
    // Turret-like enemy
    ctx.fillStyle="#555";ctx.fillRect(x+4,y+20,24,18);
    ctx.fillStyle="#777";ctx.fillRect(x+6,y+22,20,14);
    // Barrel
    ctx.fillStyle="#444";ctx.fillRect(x+26,y+26,12,6);
    ctx.fillStyle="#333";ctx.fillRect(x+34,y+24,6,10);
    // Eye/sensor
    ctx.fillStyle="#e74c3c";
    const blink=Math.sin(frame*0.1)>0.9?0:1;
    ctx.beginPath();ctx.ellipse(x+16,y+26,5*blink,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ff6666";ctx.beginPath();ctx.arc(x+16,y+25,2*blink,0,Math.PI*2);ctx.fill();
  }
}

function drawCoin(ctx,x,y,frame) {
  const s=Math.abs(Math.sin(frame*0.08));
  ctx.fillStyle=`rgba(241,196,15,${0.15+Math.sin(frame*0.1)*0.1})`;
  ctx.beginPath();ctx.arc(x+16,y+16,16,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#f1c40f";ctx.beginPath();ctx.ellipse(x+16,y+16,10*s+2,12,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#d4a017";ctx.lineWidth=2;ctx.stroke();
  if(s>0.3){ctx.fillStyle="#d4a017";ctx.font="bold 13px monospace";ctx.fillText("$",x+11,y+21);}
}

function drawFlag(ctx,x,y) {
  ctx.fillStyle="#888";ctx.fillRect(x+18,y,5,TILE*8);
  ctx.fillStyle="rgba(255,255,255,0.2)";ctx.fillRect(x+19,y,2,TILE*8);
  const g=ctx.createRadialGradient(x+20,y-2,2,x+20,y,10);
  g.addColorStop(0,"#fff");g.addColorStop(1,"#f1c40f");
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x+20,y,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#2ecc71";ctx.beginPath();ctx.moveTo(x+23,y+4);ctx.lineTo(x+55,y+18);ctx.lineTo(x+23,y+32);ctx.closePath();ctx.fill();
  ctx.fillStyle="#27ae60";ctx.beginPath();ctx.moveTo(x+23,y+18);ctx.lineTo(x+55,y+18);ctx.lineTo(x+23,y+32);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff";ctx.font="bold 16px monospace";ctx.fillText("U",x+30,y+24);
}

// ─── MAIN COMPONENT ───
export default function Game() {
  const canvasRef = useRef(null);
  const audioRef = useRef(new MusicEngine());
  const [screen,setScreen] = useState("menu");
  const [selChar,setSelChar] = useState(0);
  const [soundOn,setSoundOn] = useState(true);
  const [unlocked,setUnlocked] = useState(1);
  const [levelPage,setLevelPage] = useState(0);
  const gsRef = useRef({
    player:{x:0,y:0,vx:0,vy:0,right:true,frame:0,grounded:false,invincible:0},
    camera:{x:0}, keys:{},
    level:null, score:0, lives:3, totalScore:0,
    state:"playing", deathTimer:0, fc:0,
    particles:[], screenShake:0, levelIdx:0, charIdx:0,
    projectiles:[],
  });

  const addP = useCallback((x,y,col,n,sz)=>{
    const gs=gsRef.current;
    for(let i=0;i<n;i++) gs.particles.push({x,y,vx:(Math.random()-0.5)*8,vy:-Math.random()*6-2,life:25+Math.random()*25,color:col,size:sz||(2+Math.random()*4)});
  },[]);

  const initLevel = useCallback((li,ci)=>{
    const gs=gsRef.current;
    const lv=genLevel(li);
    gs.level=lv; gs.levelIdx=li; gs.charIdx=ci;
    gs.player={x:lv.startX*TILE,y:lv.startY*TILE,vx:0,vy:0,right:true,frame:0,grounded:false,invincible:0};
    gs.camera={x:0}; gs.score=0; gs.lives=3;
    gs.state="playing"; gs.deathTimer=0; gs.fc=0;
    gs.particles=[]; gs.screenShake=0; gs.projectiles=[];
    setScreen("playing");
    audioRef.current.startMusic(lv.theme, li);
  },[]);

  const hurtPlayer = useCallback((gs)=>{
    if(gs.player.invincible>0) return;
    gs.lives--;
    addP(gs.player.x+PW/2,gs.player.y+PH/2,"#e74c3c",20,4);
    gs.screenShake=10;
    audioRef.current.playHazard();
    if(gs.lives<=0){gs.state="gameOver";audioRef.current.stopMusic();}
    else{gs.player.invincible=90; gs.player.vy=JUMP_FORCE*0.7;}
  },[addP]);

  useEffect(()=>{
    if(screen!=="playing") return;
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    let animId;

    const kd=(e)=>{
      gsRef.current.keys[e.key]=true;
      if([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
      const gs=gsRef.current;
      if(gs.state==="levelComplete"&&(e.key===" "||e.key==="Enter")){
        const next=gs.levelIdx+1;
        setUnlocked(u=>Math.max(u,next+1));
        if(next>=100) gs.state="win";
        else initLevel(next,gs.charIdx);
      }
      if((gs.state==="gameOver"||gs.state==="win")&&(e.key===" "||e.key==="Enter")){
        audioRef.current.stopMusic();setScreen("menu");
      }
    };
    const ku=(e)=>{gsRef.current.keys[e.key]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);

    const loop=()=>{
      const gs=gsRef.current;
      if(!gs.level){animId=requestAnimationFrame(loop);return;}
      const W=CW,H=CH,lv=gs.level;
      const th=THEMES[lv.theme]||THEMES.grassland;
      gs.fc++;

      // ─── UPDATE ───
      if(gs.state==="playing"){
        const p=gs.player;
        if(gs.keys["ArrowLeft"]||gs.keys["a"]){p.vx=-MOVE_SPEED;p.right=false;}
        else if(gs.keys["ArrowRight"]||gs.keys["d"]){p.vx=MOVE_SPEED;p.right=true;}
        else{p.vx*=0.7;if(Math.abs(p.vx)<0.5)p.vx=0;}
        if((gs.keys["ArrowUp"]||gs.keys["w"]||gs.keys[" "])&&p.grounded){
          p.vy=JUMP_FORCE;p.grounded=false;audioRef.current.playJump();
        }
        p.vy+=GRAVITY;if(p.vy>15)p.vy=15;
        p.x+=p.vx;p.y+=p.vy;
        if(Math.abs(p.vx)>0.5&&p.grounded)p.frame+=0.18;
        if(p.invincible>0) p.invincible--;

        // Wind zones
        for(const trap of lv.traps){
          if(trap.type==="wind"){
            if(p.x+PW>trap.x&&p.x<trap.x+trap.w&&p.y+PH>trap.y&&p.y<trap.y+trap.h){
              p.vx+=trap.force*0.08;
            }
          }
        }

        // Platform collision
        p.grounded=false;
        for(const pl of lv.platforms){
          const px=pl.x*TILE,py=pl.y*TILE;
          if(p.x+PW>px&&p.x<px+TILE&&p.y+PH>py&&p.y+PH<py+TILE+8&&p.vy>=0){
            p.y=py-PH;p.vy=0;p.grounded=true;
          }
        }

        // Moving platforms
        for(const trap of lv.traps){
          if(trap.type==="movingPlatform"){
            trap.t+=0.02*trap.speed;
            const oldX=trap.x,oldY=trap.y;
            if(trap.dir==="h") trap.x=trap.ox+Math.sin(trap.t)*trap.range;
            else trap.y=trap.oy+Math.sin(trap.t)*trap.range;
            // Collision
            if(p.x+PW>trap.x&&p.x<trap.x+TILE*2&&p.y+PH>trap.y&&p.y+PH<trap.y+12&&p.vy>=0){
              p.y=trap.y-PH;p.vy=0;p.grounded=true;
              if(trap.dir==="h") p.x+=(trap.x-oldX);
            }
          }
          // Falling platforms
          if(trap.type==="fallingPlatform"&&!trap.fallen){
            if(p.x+PW>trap.x&&p.x<trap.x+TILE*2&&p.y+PH>trap.y&&p.y+PH<trap.y+12&&p.vy>=0){
              p.y=trap.y-PH;p.vy=0;p.grounded=true;
              if(!trap.triggered){trap.triggered=true;trap.timer=35;}
            }
            if(trap.triggered){
              trap.timer--;
              trap.shaking=trap.timer>0;
              if(trap.timer<=0){
                trap.y+=4;
                if(trap.y>16*TILE) trap.fallen=true;
              }
            }
          }
        }

        // Spikes
        for(const trap of lv.traps){
          if(trap.type==="spike"){
            if(p.x+PW>trap.x+4&&p.x<trap.x+TILE-4&&p.y+PH>trap.y+10&&p.y<trap.y+TILE){
              hurtPlayer(gs);
            }
          }
          // Lava
          if(trap.type==="lava"){
            if(p.x+PW>trap.x&&p.x<trap.x+trap.w&&p.y+PH>trap.y+6){
              hurtPlayer(gs);
            }
          }
          // Saw
          if(trap.type==="saw"){
            trap.t+=0.03;
            if(trap.dir==="h") trap.x=trap.ox+Math.sin(trap.t)*trap.range;
            else trap.y=trap.oy+Math.sin(trap.t)*trap.range;
            const dx=p.x+PW/2-(trap.x+16),dy=p.y+PH/2-(trap.y+16);
            if(Math.sqrt(dx*dx+dy*dy)<28) hurtPlayer(gs);
          }
        }

        // Coins
        for(const coin of lv.coins){
          if(coin.collected) continue;
          const cx=coin.x*TILE,cy=coin.y*TILE;
          if(p.x+PW>cx&&p.x<cx+TILE&&p.y+PH>cy&&p.y<cy+TILE){
            coin.collected=true;gs.score+=100;
            addP(cx+16,cy+16,"#f1c40f",10,3);
            audioRef.current.playCoin();
          }
        }

        // Enemies
        for(const en of lv.enemies){
          if(!en.alive) continue;
          // Movement by type
          if(en.type==="walker"){en.x+=en.dir*1.2;if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;}
          else if(en.type==="fast"){en.x+=en.dir*2.4;if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;}
          else if(en.type==="flyer"){
            en.x+=en.dir*1.5;
            en.y=en.startY+Math.sin(gs.fc*0.04+en.startX)*30;
            if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;
          }
          else if(en.type==="jumper"){
            en.x+=en.dir*1;
            en.jumpCd--;
            if(en.jumpCd<=0){en.y=en.startY-Math.abs(Math.sin(gs.fc*0.06))*TILE*1.5;en.jumpCd=en.jumpTimer;}
            if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;
          }
          else if(en.type==="charger"){
            const dx=p.x-en.x;
            if(Math.abs(dx)<TILE*6&&!en.charging){en.charging=true;en.chargeTimer=60;en.dir=dx>0?1:-1;}
            if(en.charging){en.x+=en.dir*4;en.chargeTimer--;if(en.chargeTimer<=0)en.charging=false;}
            else{en.x+=en.dir*0.6;if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;}
          }
          else if(en.type==="shooter"){
            en.shootCd--;
            if(en.shootCd<=0){
              gs.projectiles.push({x:en.x+34,y:en.y+27,vx:-3,life:200});
              gs.projectiles.push({x:en.x+34,y:en.y+27,vx:3,life:200});
              en.shootCd=en.shootTimer;
            }
          }
          en.frame+=0.1;

          // Player vs enemy collision
          if(p.x+PW>en.x&&p.x<en.x+32&&p.y+PH>en.y&&p.y<en.y+36){
            if(en.type!=="shooter"&&p.vy>0&&p.y+PH<en.y+18){
              en.alive=false;p.vy=JUMP_FORCE*0.55;gs.score+=200;
              addP(en.x+16,en.y+16,"#e74c3c",15,3);gs.screenShake=6;
              audioRef.current.playStomp();
            } else {
              hurtPlayer(gs);
            }
          }
        }

        // Projectiles
        gs.projectiles=gs.projectiles.filter(pr=>{
          pr.x+=pr.vx;pr.life--;
          if(p.x+PW>pr.x-4&&p.x<pr.x+4&&p.y+PH>pr.y-4&&p.y<pr.y+4){
            hurtPlayer(gs);return false;
          }
          return pr.life>0;
        });

        // Flag
        if(p.x+PW>lv.flag.x*TILE&&p.x<lv.flag.x*TILE+TILE){
          gs.score+=1000;gs.totalScore+=gs.score;gs.state="levelComplete";
          audioRef.current.stopMusic();audioRef.current.playWin();
          setUnlocked(u=>Math.max(u,gs.levelIdx+2));
        }
        if(p.y>16*TILE){gs.lives--;if(gs.lives<=0){gs.state="gameOver";audioRef.current.stopMusic();}else{p.x=lv.startX*TILE;p.y=lv.startY*TILE;p.vx=0;p.vy=0;gs.camera.x=0;addP(p.x+PW/2,p.y+PH/2,"#e74c3c",15,3);gs.screenShake=8;audioRef.current.playDie();}}
        gs.camera.x=p.x-W/3;if(gs.camera.x<0)gs.camera.x=0;
      }
      if(gs.state==="dead"){gs.deathTimer--;if(gs.deathTimer<=0){if(gs.lives<=0){gs.state="gameOver";audioRef.current.stopMusic();}else{const l2=gs.level;gs.player={x:l2.startX*TILE,y:l2.startY*TILE,vx:0,vy:0,right:true,frame:0,grounded:false,invincible:60};gs.camera.x=0;gs.state="playing";gs.particles=[];}}}
      gs.screenShake=Math.max(0,gs.screenShake-0.5);
      gs.particles=gs.particles.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vy+=0.18;pt.life--;return pt.life>0;});

      // ─── RENDER ───
      const sx=gs.screenShake>0?(Math.random()-0.5)*gs.screenShake*2:0;
      const sy=gs.screenShake>0?(Math.random()-0.5)*gs.screenShake*2:0;
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,th.sky1);sky.addColorStop(1,th.sky2);
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

      // Stars
      if(th.dark){ctx.fillStyle="rgba(255,255,255,0.5)";for(let i=0;i<40;i++){const sx2=((i*137+50)%W),sy2=((i*97+30)%(H*0.6)),ss=1+((i*3)%3)*0.5;ctx.globalAlpha=0.3+Math.sin(gs.fc*0.03+i)*0.3;ctx.beginPath();ctx.arc(sx2,sy2,ss,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
      // Clouds
      ctx.fillStyle=th.bg;
      for(let i=0;i<7;i++){const cx=((i*220+50)-gs.camera.x*0.2)%(W+300)-150,cy=25+i*40+Math.sin(i*2.5)*25;ctx.beginPath();ctx.ellipse(cx,cy,55,22,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx+35,cy-5,38,18,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx-25,cy+4,32,16,0,0,Math.PI*2);ctx.fill();}
      // Hills
      ctx.fillStyle=th.hill;for(let i=0;i<6;i++){const hx=((i*280)-gs.camera.x*0.35)%(W+500)-250;ctx.beginPath();ctx.ellipse(hx,H-15,200,90+i*12,0,Math.PI,Math.PI*2);ctx.fill();}
      ctx.fillStyle=th.hill+"44";for(let i=0;i<4;i++){const hx=((i*400+100)-gs.camera.x*0.15)%(W+600)-300;ctx.beginPath();ctx.ellipse(hx,H-10,280,130,0,Math.PI,Math.PI*2);ctx.fill();}

      ctx.save();ctx.translate(-gs.camera.x+sx,sy);

      // Wind zone visuals
      for(const trap of lv.traps){
        if(trap.type==="wind"){
          ctx.fillStyle=trap.force>0?"rgba(100,200,255,0.06)":"rgba(255,200,100,0.06)";
          ctx.fillRect(trap.x,trap.y,trap.w,trap.h);
          // Wind lines
          ctx.strokeStyle=trap.force>0?"rgba(100,200,255,0.2)":"rgba(255,200,100,0.2)";
          ctx.lineWidth=1;
          for(let i=0;i<8;i++){
            const wy=trap.y+20+i*(trap.h/8);
            const wx=trap.x+((gs.fc*2+(i*30))%(trap.w));
            ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+trap.force*12,wy);ctx.stroke();
          }
        }
      }

      // Platforms
      for(const pl of lv.platforms){
        const px=pl.x*TILE,py=pl.y*TILE;
        if(px-gs.camera.x>-TILE*2&&px-gs.camera.x<W+TILE*2){
          if(pl.y===14){
            ctx.fillStyle=th.groundDark;ctx.fillRect(px,py,TILE,TILE);
            ctx.fillStyle=th.ground;ctx.fillRect(px,py,TILE,10);
            ctx.strokeStyle=th.ground+"99";ctx.lineWidth=1.5;
            for(let g=0;g<4;g++){ctx.beginPath();ctx.moveTo(px+3+g*10,py+10);ctx.lineTo(px+6+g*10,py-2);ctx.stroke();}
          } else if(pl.isPipe){
            ctx.fillStyle="#27ae60";ctx.fillRect(px,py,TILE,TILE);
            ctx.fillStyle="#2ecc71";ctx.fillRect(px+2,py,8,TILE);
            ctx.fillStyle="rgba(0,0,0,0.15)";ctx.fillRect(px+TILE-10,py,10,TILE);
            ctx.fillStyle="#2ecc71";ctx.fillRect(px-3,py,TILE+6,6);
            ctx.fillStyle="#1e8449";ctx.fillRect(px-3,py+4,TILE+6,3);
          } else {
            ctx.fillStyle=th.brick;ctx.fillRect(px,py,TILE,TILE);
            ctx.strokeStyle=th.brickDark;ctx.lineWidth=1;
            ctx.strokeRect(px+1,py+1,TILE/2-1,TILE/2-1);
            ctx.strokeRect(px+TILE/2,py+1,TILE/2-1,TILE/2-1);
            ctx.strokeRect(px+1,py+TILE/2,TILE-2,TILE/2-1);
            ctx.fillStyle="rgba(255,255,255,0.08)";ctx.fillRect(px+2,py+2,TILE/2-3,TILE/2-3);
          }
        }
      }

      // Traps
      for(const trap of lv.traps){
        if(trap.type==="movingPlatform"){
          ctx.fillStyle="#6a6a8a";ctx.fillRect(trap.x,trap.y,TILE*2,10);
          ctx.fillStyle="#8a8aaa";ctx.fillRect(trap.x+2,trap.y+1,TILE*2-4,4);
          // Arrows
          ctx.fillStyle="rgba(255,255,255,0.3)";
          if(trap.dir==="h"){ctx.fillText("↔",trap.x+TILE-6,trap.y+9);}
          else{ctx.fillText("↕",trap.x+TILE-6,trap.y+9);}
        }
        if(trap.type==="fallingPlatform"&&!trap.fallen){
          const shake=trap.shaking?(Math.random()-0.5)*3:0;
          ctx.fillStyle=trap.triggered?"#aa6644":"#cc8855";
          ctx.fillRect(trap.x+shake,trap.y,TILE*2,10);
          ctx.fillStyle="rgba(0,0,0,0.2)";
          ctx.fillRect(trap.x+shake+2,trap.y+6,TILE*2-4,4);
          // Warning cracks
          if(trap.triggered){ctx.strokeStyle="#000";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(trap.x+shake+TILE,trap.y);ctx.lineTo(trap.x+shake+TILE+4,trap.y+10);ctx.stroke();}
        }
        if(trap.type==="spike"){
          for(let s=0;s<4;s++){
            ctx.fillStyle="#888";
            ctx.beginPath();
            ctx.moveTo(trap.x+s*10,trap.y+TILE);
            ctx.lineTo(trap.x+s*10+5,trap.y+12);
            ctx.lineTo(trap.x+s*10+10,trap.y+TILE);
            ctx.closePath();ctx.fill();
            ctx.fillStyle="#aaa";
            ctx.beginPath();
            ctx.moveTo(trap.x+s*10,trap.y+TILE);
            ctx.lineTo(trap.x+s*10+5,trap.y+12);
            ctx.lineTo(trap.x+s*10+3,trap.y+TILE);
            ctx.closePath();ctx.fill();
          }
        }
        if(trap.type==="lava"){
          // Animated lava
          ctx.fillStyle="#ff4400";ctx.fillRect(trap.x,trap.y+8,trap.w,TILE-8);
          ctx.fillStyle="#ff6600";
          for(let i=0;i<trap.w/12;i++){
            const bx=trap.x+i*12;
            const by=trap.y+4+Math.sin(gs.fc*0.08+i*1.5)*4;
            ctx.beginPath();ctx.ellipse(bx+6,by,7,6,0,0,Math.PI*2);ctx.fill();
          }
          ctx.fillStyle="rgba(255,255,0,0.3)";
          for(let i=0;i<trap.w/20;i++){
            const bx=trap.x+i*20+5;
            const by=trap.y+2+Math.sin(gs.fc*0.12+i*2)*3;
            ctx.beginPath();ctx.ellipse(bx,by,4,3,0,0,Math.PI*2);ctx.fill();
          }
          // Glow
          ctx.fillStyle="rgba(255,100,0,0.08)";ctx.fillRect(trap.x-10,trap.y-20,trap.w+20,30);
        }
        if(trap.type==="saw"){
          const rot=gs.fc*0.15;
          ctx.save();ctx.translate(trap.x+16,trap.y+16);ctx.rotate(rot);
          ctx.fillStyle="#aaa";ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#888";
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4;
            ctx.beginPath();ctx.moveTo(Math.cos(a)*10,Math.sin(a)*10);
            ctx.lineTo(Math.cos(a+0.2)*18,Math.sin(a+0.2)*18);
            ctx.lineTo(Math.cos(a-0.2)*18,Math.sin(a-0.2)*18);
            ctx.closePath();ctx.fill();
          }
          ctx.fillStyle="#666";ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
          ctx.restore();
        }
      }

      // Coins
      for(const coin of lv.coins) if(!coin.collected) drawCoin(ctx,coin.x*TILE,coin.y*TILE,gs.fc);
      // Enemies
      for(const en of lv.enemies) if(en.alive&&en.x>gs.camera.x-100&&en.x<gs.camera.x+W+100) drawEnemy(ctx,en.x,en.y,en.frame,en.type);
      // Projectiles
      ctx.fillStyle="#ff4444";
      for(const pr of gs.projectiles){ctx.beginPath();ctx.arc(pr.x,pr.y,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="rgba(255,100,0,0.3)";ctx.beginPath();ctx.arc(pr.x-pr.vx*2,pr.y,4,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ff4444";}
      // Flag
      drawFlag(ctx,lv.flag.x*TILE,lv.flag.y*TILE);
      // Player
      if(gs.state!=="dead"&&gs.state!=="gameOver"){
        if(gs.player.invincible>0&&gs.fc%4<2){/* blink */}
        else drawChar(ctx,gs.player.x,gs.player.y,PW,PH,gs.charIdx,gs.player.right,gs.player.frame,!gs.player.grounded);
      }
      // Particles
      for(const pt of gs.particles){ctx.globalAlpha=Math.max(0,pt.life/50);ctx.fillStyle=pt.color;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.size*(pt.life/50+0.3),0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;ctx.restore();

      // HUD
      const hg=ctx.createLinearGradient(0,0,0,44);hg.addColorStop(0,"rgba(0,0,0,0.7)");hg.addColorStop(1,"rgba(0,0,0,0.3)");
      ctx.fillStyle=hg;ctx.fillRect(0,0,W,44);
      ctx.fillStyle="#fff";ctx.font="bold 15px monospace";
      ctx.fillText(`SCORE: ${gs.score}`,12,28);
      ctx.fillStyle="#e74c3c";ctx.fillText(`${"♥".repeat(Math.max(0,gs.lives))}`,180,28);
      ctx.fillStyle="#f1c40f";ctx.fillText(`${lv.name}`,W/2-60,28);
      ctx.fillStyle="#aaa";ctx.font="12px monospace";ctx.fillText(`Lv ${gs.levelIdx+1}/100`,W-100,28);
      if(gs.player.invincible>0){ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="11px monospace";ctx.fillText("INVINCIBLE",W/2-40,42);}

      // Overlays
      if(gs.state==="gameOver"){
        ctx.fillStyle="rgba(0,0,0,0.85)";ctx.fillRect(0,0,W,H);ctx.textAlign="center";
        ctx.fillStyle="#e74c3c";ctx.font="bold 48px monospace";ctx.fillText("GAME OVER",W/2,H/2-40);
        ctx.fillStyle="#fff";ctx.font="22px monospace";ctx.fillText(`Score: ${gs.score}`,W/2,H/2+10);
        ctx.fillStyle="#2ecc71";ctx.font="bold 18px monospace";ctx.fillText("Press SPACE for menu",W/2,H/2+50);ctx.textAlign="left";
      }
      if(gs.state==="levelComplete"){
        ctx.fillStyle="rgba(0,0,0,0.75)";ctx.fillRect(0,0,W,H);ctx.textAlign="center";
        ctx.fillStyle="#f1c40f";ctx.font="bold 42px monospace";ctx.fillText("LEVEL COMPLETE!",W/2,H/2-50);
        ctx.fillStyle="#fff";ctx.font="20px monospace";ctx.fillText(`Score: ${gs.score}`,W/2,H/2);
        ctx.fillStyle="#aaa";ctx.font="16px monospace";ctx.fillText(`Total: ${gs.totalScore}`,W/2,H/2+30);
        ctx.fillStyle="#2ecc71";ctx.font="bold 18px monospace";ctx.fillText("Press SPACE for next level",W/2,H/2+70);
        drawChar(ctx,W/2-15,H/2+85,PW,PH,gs.charIdx,true,gs.fc*0.1,true);ctx.textAlign="left";
      }
      if(gs.state==="win"){
        ctx.fillStyle="rgba(0,0,0,0.85)";ctx.fillRect(0,0,W,H);ctx.textAlign="center";
        ctx.fillStyle="#f1c40f";ctx.font="bold 48px monospace";ctx.fillText("YOU WIN!",W/2,H/3-10);
        ctx.fillStyle="#fff";ctx.font="20px monospace";ctx.fillText("All 100 levels conquered!",W/2,H/3+30);
        ctx.fillText(`Total Score: ${gs.totalScore}`,W/2,H/2+20);
        ctx.fillStyle="#2ecc71";ctx.font="bold 18px monospace";ctx.fillText("Press SPACE for menu",W/2,H*0.72);
        drawChar(ctx,W/2-15,H/2+40,PW,PH,gs.charIdx,true,gs.fc*0.08,true);ctx.textAlign="left";
      }
      animId=requestAnimationFrame(loop);
    };
    animId=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animId);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[screen,initLevel,addP,hurtPlayer]);

  const press=(k)=>{gsRef.current.keys[k]=true;};
  const release=(k)=>{gsRef.current.keys[k]=false;};
  const tapSpace=()=>{window.dispatchEvent(new KeyboardEvent("keydown",{key:" "}));setTimeout(()=>window.dispatchEvent(new KeyboardEvent("keyup",{key:" "})),100);};
  const startAudio=async()=>{await audioRef.current.start();};
  const toggleSound=()=>{const on=audioRef.current.toggle();setSoundOn(on);};
  const PPG=20;const totalPg=Math.ceil(100/PPG);

  if(screen==="menu"){
    return(<div style={mc}><div style={mi}>
      <h1 style={{fontFamily:"monospace",fontSize:52,color:"#e74c3c",textShadow:"3px 3px 0 #000,-1px -1px 0 #000",margin:"0 0 4px 0"}}>UGLY MARIO</h1>
      <p style={{fontFamily:"monospace",color:"#f1c40f",fontSize:14,margin:"0 0 24px 0"}}>100 levels • 6 ugly heroes • 10 worlds • actual music</p>
      <canvas ref={canvasRef} width={120} height={80} style={{display:"none"}} />
      <div style={{display:"flex",flexDirection:"column",gap:12,width:280}}>
        <button onClick={async()=>{await startAudio();setScreen("charSelect");}} style={mb("#e74c3c")}>🎮 START GAME</button>
        <button onClick={async()=>{await startAudio();setScreen("levelSelect");setLevelPage(0);}} style={mb("#3498db")}>📋 LEVEL SELECT</button>
        <button onClick={toggleSound} style={mb("#7f8c8d")}>{soundOn?"🔊 Sound ON":"🔇 Sound OFF"}</button>
      </div>
      <p style={{fontFamily:"monospace",color:"#666",fontSize:11,marginTop:20}}>Arrow keys / WASD + Space to jump • Stomp enemies from above</p>
      <div style={{fontFamily:"monospace",color:"#555",fontSize:10,marginTop:8,lineHeight:1.6}}>
        <span style={{color:"#e74c3c"}}>⚠ Hazards:</span> Spikes, Lava, Saw Blades, Wind Zones, Falling Platforms<br/>
        <span style={{color:"#f39c12"}}>👾 Enemies:</span> Walkers, Speedsters, Flyers, Jumpers, Chargers, Turrets
      </div>
    </div></div>);
  }

  if(screen==="charSelect"){
    return(<div style={mc}><div style={mi}>
      <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:28,margin:"0 0 20px 0",textShadow:"2px 2px 0 #000"}}>CHOOSE YOUR UGLY</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {CHARS.map((ch,i)=>(<button key={i} onClick={()=>setSelChar(i)} style={{background:selChar===i?"#444":"#222",border:selChar===i?"3px solid #f1c40f":"3px solid #333",borderRadius:12,padding:"14px 8px",cursor:"pointer",transition:"all 0.15s"}}>
          <CP ci={i} />
          <div style={{fontFamily:"monospace",color:selChar===i?"#f1c40f":"#aaa",fontSize:11,marginTop:6,fontWeight:"bold"}}>{ch.name}</div>
          <div style={{fontFamily:"monospace",color:"#666",fontSize:9,marginTop:2}}>{ch.desc}</div>
        </button>))}
      </div>
      <div style={{display:"flex",gap:12}}>
        <button onClick={()=>setScreen("menu")} style={mb("#7f8c8d")}>← Back</button>
        <button onClick={()=>initLevel(0,selChar)} style={mb("#2ecc71")}>Play as {CHARS[selChar].name} →</button>
      </div>
    </div></div>);
  }

  if(screen==="levelSelect"){
    const si=levelPage*PPG;
    const pl=Array.from({length:PPG},(_,i)=>si+i).filter(i=>i<100);
    const te={grassland:"🌿",desert:"🏜️",cave:"🪨",snow:"❄️",lava:"🌋",night:"🌙",swamp:"🐸",sky:"☁️",toxic:"☠️",crystal:"💎"};
    const tn=["grassland","desert","cave","snow","lava","night","swamp","sky","toxic","crystal"];
    return(<div style={mc}><div style={{...mi,maxWidth:700}}>
      <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:26,margin:"0 0 8px 0",textShadow:"2px 2px 0 #000"}}>LEVEL SELECT</h2>
      <p style={{fontFamily:"monospace",color:"#888",fontSize:12,margin:"0 0 16px 0"}}>{unlocked} of 100 unlocked</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
        {pl.map(idx=>{const ul=idx<unlocked;const t=tn[idx%10];return(
          <button key={idx} onClick={()=>{if(ul)initLevel(idx,selChar);}} style={{background:ul?"#333":"#1a1a1a",border:`2px solid ${ul?"#555":"#222"}`,borderRadius:8,padding:"8px 4px",cursor:ul?"pointer":"not-allowed",opacity:ul?1:0.4,transition:"all 0.15s"}}>
            <div style={{fontSize:18}}>{ul?te[t]:"🔒"}</div>
            <div style={{fontFamily:"monospace",color:"#aaa",fontSize:11,fontWeight:"bold"}}>{idx+1}</div>
            <div style={{fontFamily:"monospace",color:"#666",fontSize:8}}>{t}</div>
          </button>);})}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
        <button onClick={()=>setLevelPage(p=>Math.max(0,p-1))} disabled={levelPage===0} style={{...mb("#555"),opacity:levelPage===0?0.3:1,padding:"8px 16px",fontSize:14}}>←</button>
        <span style={{fontFamily:"monospace",color:"#aaa",fontSize:14,padding:"8px 12px"}}>Page {levelPage+1}/{totalPg}</span>
        <button onClick={()=>setLevelPage(p=>Math.min(totalPg-1,p+1))} disabled={levelPage>=totalPg-1} style={{...mb("#555"),opacity:levelPage>=totalPg-1?0.3:1,padding:"8px 16px",fontSize:14}}>→</button>
      </div>
      <button onClick={()=>setScreen("menu")} style={mb("#7f8c8d")}>← Back to Menu</button>
    </div></div>);
  }

  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",background:"#0a0a1a",minHeight:"100vh",padding:"4px 0"}}>
    <canvas ref={canvasRef} width={CW} height={CH} style={{border:"3px solid #333",borderRadius:8,maxWidth:"100%",background:"#000"}} tabIndex={0} />
    <div style={{display:"flex",gap:10,marginTop:8,userSelect:"none"}}>
      <button onPointerDown={()=>press("ArrowLeft")} onPointerUp={()=>release("ArrowLeft")} onPointerLeave={()=>release("ArrowLeft")} style={cb}>◀</button>
      <button onPointerDown={()=>press("ArrowRight")} onPointerUp={()=>release("ArrowRight")} onPointerLeave={()=>release("ArrowRight")} style={cb}>▶</button>
      <div style={{width:16}} />
      <button onPointerDown={()=>tapSpace()} style={{...cb,width:90,background:"#c0392b"}}>JUMP</button>
      <button onClick={()=>{audioRef.current.stopMusic();setScreen("menu");}} style={{...cb,width:70,background:"#555",fontSize:12}}>MENU</button>
      <button onClick={toggleSound} style={{...cb,width:50,background:"#333",fontSize:16}}>{soundOn?"🔊":"🔇"}</button>
    </div>
  </div>);
}

function CP({ci}){const ref=useRef(null);useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext("2d");ctx.clearRect(0,0,60,70);drawChar(ctx,15,12,PW,PH,ci,true,0,false,1);},[ci]);return<canvas ref={ref} width={60} height={70} style={{imageRendering:"auto"}} />;}

const mc={display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"linear-gradient(180deg,#0a0a2e 0%,#1a1a3e 100%)",padding:20};
const mi={textAlign:"center",maxWidth:520};
const mb=(bg)=>({fontFamily:"monospace",fontSize:16,fontWeight:"bold",color:"#fff",background:bg,border:"none",borderRadius:10,padding:"14px 24px",cursor:"pointer",transition:"all 0.15s",width:"100%"});
const cb={width:56,height:56,fontSize:22,border:"none",borderRadius:10,background:"#2c2c3e",color:"#fff",cursor:"pointer",fontWeight:"bold",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none"};
