import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

const GRAVITY = 0.55;
const JUMP_FORCE = -11.5;
const MOVE_SPEED = 4.2;
const SAVE_KEY = "ugly_platformer_save";
const TILE = 40;
const PW = 30;
const PH = 38;
const CW = 800;
const CH = 600;

// ─── CHARACTERS ─── (unique ability per char)
const CHARS = [
  { name:"Ugly Umberto", desc:"Extra life, beer belly horror", ability:"extraLife", hat:"#c0392b", skin:"#e8a87c", shirt:"#e74c3c", pants:"#1a5276", shoes:"#5d4037", feat:"unibrow,giganticWart,missingTooth,beerBelly,stubble,veinyForehead,oozingPores,crookedNose" },
  { name:"Grimy Gertrude", desc:"Double jump, mole colony", ability:"doubleJump", hat:"#8e44ad", skin:"#d4a574", shirt:"#9b59b6", pants:"#2c3e50", shoes:"#1a1a1a", feat:"moleColony,snaggletooth,ratHair,warts,crossEyed,boils,skinTags,yellowTeeth" },
  { name:"Bumpy Boris", desc:"Dash attack, bumpy nightmare", ability:"dash", hat:"#27ae60", skin:"#c99b7a", shirt:"#2ecc71", pants:"#7f8c8d", shoes:"#4a235a", feat:"bumps,lazyEye,drool,hugNose,monobrow,cyst,lipSores,bulgingVeins" },
  { name:"Crusty Carl", desc:"Stomp shockwave, patchy terror", ability:"stompDamage", hat:"#d35400", skin:"#b88968", shirt:"#e67e22", pants:"#2c2c2c", shoes:"#8B0000", feat:"eyePatch,patchyBeard,goldTooth,scar,earHair,blackheads,flakySkin,redNose" },
  { name:"Swampy Sue", desc:"Float longer, swamp creature", ability:"float", hat:"#16a085", skin:"#7a9e7a", shirt:"#1abc9c", pants:"#0e6251", shoes:"#4a3728", feat:"greenTint,webbedEars,tongueOut,wideEyes,noseDrip,wartCluster,fungus,recedingGums" },
  { name:"Wonky Wayne", desc:"Invincibility frames, asymmetrical horror", ability:"longerInvincible", hat:"#2980b9", skin:"#d4b896", shirt:"#3498db", pants:"#1b4f72", shoes:"#6c3483", feat:"hugeEars,buckTeeth,asymmetric,tinyEyes,neckBeard,protrudingJaw,bloodshotEyes,ingrownHairs" },
];

// ─── THEME VISUALS (grungy, sickly, unpleasant) ───
const THEMES = {
  grassland:{ sky1:"#5a6a4a",sky2:"#7a8a6a",ground:"#6b5a4a",groundDark:"#4a3a2a",brick:"#8a6a4a",brickDark:"#5a3a2a",hill:"#5a5a3a",bg:"rgba(120,130,80,0.3)",stain:"#3a2a1a",dark:false },
  desert:{ sky1:"#c4a060",sky2:"#d4b080",ground:"#a08050",groundDark:"#6a5030",brick:"#a08060",brickDark:"#6a5030",hill:"#8a7040",bg:"rgba(200,160,80,0.25)",stain:"#5a4030",dark:false },
  cave:{ sky1:"#0a0a12",sky2:"#1a1a28",ground:"#3a3a45",groundDark:"#252530",brick:"#4a4a55",brickDark:"#2a2a35",hill:"#1a1a25",bg:"rgba(60,50,80,0.15)",stain:"#1a1a20",dark:true },
  snow:{ sky1:"#7a8a9a",sky2:"#9aa8b8",ground:"#b8a8a0",groundDark:"#8a7a72",brick:"#9a9088",brickDark:"#6a6058",hill:"#7a8088",bg:"rgba(180,190,200,0.4)",stain:"#5a6068",dark:false },
  lava:{ sky1:"#1a0808",sky2:"#3a1515",ground:"#5a2020",groundDark:"#3a1010",brick:"#6a3020",brickDark:"#4a2010",hill:"#2a0808",bg:"rgba(255,80,0,0.12)",stain:"#2a0a0a",dark:true },
  night:{ sky1:"#080818",sky2:"#121228",ground:"#2a3a32",groundDark:"#1a2520",brick:"#3a4a42",brickDark:"#252a28",hill:"#121a18",bg:"rgba(80,90,120,0.08)",stain:"#0a0a12",dark:true },
  swamp:{ sky1:"#2a3a28",sky2:"#3a4a38",ground:"#4a5a3a",groundDark:"#2a3520",brick:"#5a6a4a",brickDark:"#3a4a30",hill:"#2a3528",bg:"rgba(80,120,60,0.2)",stain:"#1a2a18",dark:false },
  sky:{ sky1:"#6a7a8a",sky2:"#8a9aa8",ground:"#9a8a82",groundDark:"#6a5a52",brick:"#8a7a72",brickDark:"#5a4a42",hill:"#6a7a82",bg:"rgba(150,160,180,0.35)",stain:"#4a5a62",dark:false },
  toxic:{ sky1:"#1a2515",sky2:"#2a3518",ground:"#3a4a1a",groundDark:"#252a0a",brick:"#4a5a2a",brickDark:"#2a3510",hill:"#1a2510",bg:"rgba(120,180,40,0.08)",stain:"#152008",dark:true },
  crystal:{ sky1:"#1a1528",sky2:"#2a2038",ground:"#4a3a5a",groundDark:"#2a1a3a",brick:"#5a4a6a",brickDark:"#3a2a4a",hill:"#2a1a3a",bg:"rgba(120,80,150,0.12)",stain:"#1a0a2a",dark:true },
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

  setVolumes(musicVol=1, sfxVol=1) { this.musicVol=musicVol; this.sfxVol=sfxVol; const mv=musicVol<=0?-100:20*Math.log10(musicVol); const sv=sfxVol<=0?-100:-20+20*Math.log10(Math.max(0.01,sfxVol)); if(this.melSynth)this.melSynth.volume.value=mv; if(this.bassSynth2)this.bassSynth2.volume.value=mv; if(this.arpSynth)this.arpSynth.volume.value=mv; if(this.padSynth)this.padSynth.volume.value=mv; if(this.jumpSynth)this.jumpSynth.volume.value=sv; if(this.coinSynth)this.coinSynth.volume.value=sv; if(this.stompSynth)this.stompSynth.volume.value=sv; if(this.dieSynth)this.dieSynth.volume.value=sv; if(this.winSynth)this.winSynth.volume.value=sv; if(this.hazardSynth)this.hazardSynth.volume.value=sv; }
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

// ─── DAILY SEED (YYYYMMDD) ───
function getDailySeed() { const d=new Date(); return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }

// ─── LEVEL GENERATION ───
function genLevel(idx, opts = {}) {
  const themeOverride = opts.themeOverride || "auto";
  const easyBoss = opts.easyBoss || false;
  const cs = opts.customSeed;
  const seed = cs != null ? (typeof cs === "number" ? cs : (parseInt(String(cs).replace(/\D/g,""),36) || idx*7919+1)) : idx*7919+1;
  const r = (n) => ((seed*(n+1)*9301+49297)%233280)/233280;
  const diff = Math.min(idx/100, 1);
  const len = 70+Math.floor(idx*2)+Math.floor(r(0)*40);
  const platforms=[], coins=[], enemies=[], traps=[];
  const themeNames=["grassland","desert","cave","snow","lava","night","swamp","sky","toxic","crystal"];
  const theme = themeOverride && themeOverride !== "auto" ? themeOverride : themeNames[idx%10];

  // Ground with gaps - more varied segments
  let x=0;
  while (x<len) {
    const seg = 4+Math.floor(r(x+1)*14);
    for (let i=0;i<seg&&x+i<len;i++) platforms.push({x:x+i,y:14});
    x += seg;
    const gap = diff>0.15 ? 2+Math.floor(r(x+2)*(3+diff*4)) : 0;
    x += gap;
  }
  for (let i=0;i<8;i++) if(!platforms.find(p=>p.x===i&&p.y===14)) platforms.push({x:i,y:14});

  // Vertical towers - climbable pillars with top platform
  const nTowers = 3+Math.floor(diff*5)+Math.floor(r(50)*3);
  for (let i=0;i<nTowers;i++) {
    const tx=12+Math.floor(r(i*7+50)*(len-25));
    const th=2+Math.floor(r(i*7+51)*4);
    for (let h=0;h<=th;h++) platforms.push({x:tx,y:13-h});
    if(r(i*7+52)>0.3) platforms.push({x:tx+1,y:13-th});
  }
  // Staircase sections
  const nStairs = 2+Math.floor(diff*4)+Math.floor(r(60)*3);
  for (let i=0;i<nStairs;i++) {
    const sx=15+Math.floor(r(i*9+60)*(len-25));
    const steps=3+Math.floor(r(i*9+61)*4);
    for (let s=0;s<steps;s++) platforms.push({x:sx+s,y:13-s});
  }
  // Winding path - alternating high/low platforms
  const nWinding = 4+Math.floor(diff*8)+Math.floor(r(70)*5);
  for (let i=0;i<nWinding;i++) {
    const wx=8+Math.floor(r(i*5+70)*(len-15));
    const wy=9+(i%3); // alternating heights
    platforms.push({x:wx,y:wy});
  }

  // Floating platforms - more variety in size
  const nFloat = 12+Math.floor(diff*25)+Math.floor(r(99)*12);
  for (let i=0;i<nFloat;i++) {
    const fx=6+Math.floor(r(i*3+10)*(len-10));
    const fy=4+Math.floor(r(i*3+11)*8);
    const fw=1+Math.floor(r(i*3+12)*4);
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
  const nWind = Math.floor(diff*5)+Math.floor(r(450)*3);
  for (let i=0;i<nWind;i++) {
    const wx=12+Math.floor(r(i*2+460)*(len-20));
    const ww=3+Math.floor(r(i*2+461)*6);
    const wdir = r(i*2+462)>0.5?1:-1;
    traps.push({type:"wind",x:wx*TILE,y:4*TILE,w:ww*TILE,h:10*TILE,force:wdir*(1.5+diff*1.5)});
  }
  // Lasers - horizontal beams that pulse on/off
  const nLaser = 2+Math.floor(diff*5)+Math.floor(r(465)*4);
  for (let i=0;i<nLaser;i++) {
    const lx=8+Math.floor(r(i*3+465)*(len-12));
    const ly=5+Math.floor(r(i*3+466)*8)*TILE;
    const lw=2+Math.floor(r(i*3+467)*4)*TILE;
    traps.push({type:"laser",x:lx*TILE,y:ly,w:lw,h:4,phase:Math.floor(r(i*3+468)*60)});
  }
  // Crushers - vertical pistons that crush
  const nCrusher = 2+Math.floor(diff*4)+Math.floor(r(480)*3);
  for (let i=0;i<nCrusher;i++) {
    const cx=10+Math.floor(r(i*4+480)*(len-15));
    const cy=6+Math.floor(r(i*4+481)*5)*TILE;
    const crange=1+Math.floor(r(i*4+482)*3)*TILE;
    traps.push({type:"crusher",x:cx*TILE,y:cy,w:TILE*1.5,h:20,oy:cy,range:crange,t:r(i)*Math.PI*2});
  }
  // Acid pools
  const nAcid = Math.floor(diff*5)+Math.floor(r(495)*4);
  for (let i=0;i<nAcid;i++) {
    const ax=8+Math.floor(r(i*2+495)*(len-10));
    const aw=2+Math.floor(r(i*2+496)*3);
    traps.push({type:"acid",x:ax*TILE,y:14*TILE,w:aw*TILE});
  }
  // Steam vents - damage zones that pulse
  const nSteam = 2+Math.floor(diff*4)+Math.floor(r(500)*3);
  for (let i=0;i<nSteam;i++) {
    const vx=10+Math.floor(r(i*3+500)*(len-15));
    const vy=8+Math.floor(r(i*3+501)*4)*TILE;
    traps.push({type:"steam",x:vx*TILE,y:vy,w:TILE,h:TILE*2});
  }
  // Floating mines - bob and damage on contact
  const nMine = 3+Math.floor(diff*6)+Math.floor(r(510)*4);
  for (let i=0;i<nMine;i++) {
    const mx=8+Math.floor(r(i*4+510)*(len-12));
    const my=4+Math.floor(r(i*4+511)*7)*TILE;
    traps.push({type:"mine",x:mx*TILE,y:my,ox:mx*TILE,oy:my,t:r(i)*Math.PI*2});
  }
  // Hanging thorns
  const nThorn = 4+Math.floor(diff*8)+Math.floor(r(520)*5);
  for (let i=0;i<nThorn;i++) {
    const tx=8+Math.floor(r(i*3+520)*(len-12));
    const ty=2+Math.floor(r(i*3+521)*6)*TILE;
    const th=1+Math.floor(r(i*3+522)*2)*TILE;
    traps.push({type:"thorn",x:tx*TILE,y:ty,w:12,h:th});
  }
  // Electric barriers - vertical zap zones
  const nElectric = 2+Math.floor(diff*3)+Math.floor(r(530)*2);
  for (let i=0;i<nElectric;i++) {
    const ex=12+Math.floor(r(i*4+530)*(len-20));
    const ey=4*TILE;
    traps.push({type:"electric",x:ex*TILE,y:ey,w:8,h:TILE*8,phase:Math.floor(r(i*4+531)*40)});
  }
  // Theme-specific features - stalactites (cave), toxic bubbles (swamp/toxic)
  const deco=[];
  if(theme==="cave"){
    const nStal=5+Math.floor(r(470)*8);
    for(let i=0;i<nStal;i++){
      const sx=10+Math.floor(r(i*3+471)*(len-15));
      const sy=2+Math.floor(r(i*3+472)*4);
      deco.push({type:"stalactite",x:sx*TILE,y:sy*TILE});
    }
  }
  if(theme==="swamp"||theme==="toxic"){
    const nBub=4+Math.floor(r(480)*6);
    for(let i=0;i<nBub;i++){
      const bx=8+Math.floor(r(i*3+481)*(len-12));
      const by=10+Math.floor(r(i*3+482)*4);
      deco.push({type:"bubble",x:bx*TILE,y:by*TILE});
    }
  }

  // Coins
  const nCoins=10+Math.floor(r(500)*8)+Math.floor(diff*8);
  for (let i=0;i<nCoins;i++) {
    const cx=4+Math.floor(r(i*2+600)*(len-8));
    const cy=3+Math.floor(r(i*2+601)*10);
    coins.push({x:cx,y:cy,collected:false});
  }
  // Level collectable - each level has a special collectable (key, star, gem, crown)
  const collectableTypes=["key","star","gem","crown"];
  const collectType=collectableTypes[idx%4];
  const cx2=len-8+Math.floor(r(600)*4);
  const cy2=3+Math.floor(r(601)*8);
  const collectable={type:collectType,x:cx2,y:cy2,collected:false};

  // Enemies - multiple distinct types (ground enemies get vy for terrain collision)
  const nEn = 3+Math.floor(diff*14)+Math.floor(r(700)*5);
  const groundTypes=["walker","fast","jumper","charger","slime","tank"];
  const airTypes=["flyer","shooter"];
  for (let i=0;i<nEn;i++) {
    const ex=8+Math.floor(r(i*4+800)*(len-12));
    const ey=13;
    const rn=2+Math.floor(r(i*4+801)*4);
    const typeRoll = r(i*4+802);
    let type;
    if (typeRoll < 0.2) type="walker";
    else if (typeRoll < 0.35) type="fast";
    else if (typeRoll < 0.48) type="flyer";
    else if (typeRoll < 0.6) type="jumper";
    else if (typeRoll < 0.72) type="charger";
    else if (typeRoll < 0.84) type="slime";
    else if (typeRoll < 0.92) type="tank";
    else type="shooter";
    const flyY = (type==="flyer") ? (5+Math.floor(r(i*4+803)*6)) : ey;
    const isGround = groundTypes.includes(type);
    enemies.push({
      x:ex*TILE,y:flyY*TILE,startX:ex*TILE,startY:flyY*TILE,
      vx:0,vy:0,range:rn*TILE,dir:1,frame:0,type,alive:true,
      chargeTimer:0,charging:false,grounded:false,
      jumpTimer:40+Math.floor(r(i*4+804)*60),jumpCd:0,
      shootTimer:80+Math.floor(r(i*4+805)*60),shootCd:0,
      projectiles:[],hp:type==="tank"?2:1,
    });
  }
  // Boss at end of every level
  const bossTypes=["blob","beast","skeleton","golem","phantom","titan"];
  const baseHp = 5+Math.floor(diff*8);
  const bossHp = easyBoss ? Math.max(2,Math.floor(baseHp*0.4)) : baseHp;
  const boss={x:(len+1)*TILE,y:10*TILE,startX:(len+1)*TILE,hp:bossHp,maxHp:bossHp,type:bossTypes[idx%6],frame:0,alive:true,vx:0,vy:0,grounded:false,attackCd:0};
  // Checkpoints - every ~25 tiles
  const checkpoints = [];
  for (let cp = 25; cp < len - 5; cp += 25) {
    const cpx = cp;
    const cpy = 13;
    if (platforms.some(p => p.x === cpx && p.y >= 12 && p.y <= 14)) {
      checkpoints.push({ x: cpx, y: cpy });
    }
  }
  // Breakable walls (secret areas)
  const breakables = [];
  const nBreak = 1 + Math.floor(diff * 3) + Math.floor(r(540) * 2);
  for (let i = 0; i < nBreak; i++) {
    const bx = 15 + Math.floor(r(i * 3 + 540) * (len - 30));
    const by = 10 + Math.floor(r(i * 3 + 541) * 3);
    if (!platforms.find(p => p.x === bx && p.y === by) && !platforms.find(p => p.x === bx + 1 && p.y === by)) {
      breakables.push({ x: bx, y: by, broken: false });
    }
  }
  // Power-up spawn positions
  const powerupPos = [];
  const nPow = 1 + Math.floor(diff * 2) + Math.floor(r(550) * 2);
  const powTypes = ["speed", "invincibility", "projectile", "magnet"];
  for (let i = 0; i < nPow; i++) {
    const px = 12 + Math.floor(r(i * 4 + 550) * (len - 25));
    const py = 4 + Math.floor(r(i * 4 + 551) * 8);
    powerupPos.push({ x: px, y: py, type: powTypes[Math.floor(r(i * 4 + 552) * powTypes.length)], collected: false });
  }
  return {
    name:`World ${Math.floor(idx/10)+1}-${(idx%10)+1}`,
    theme, platforms, coins, collectable, enemies, traps, deco,
    flag:{x:len+5,y:6}, startX:2, startY:12, length:len, boss,
    checkpoints, breakables, powerupPos,
  };
}

// ─── COLLISION HELPER (enemies vs terrain) ───
const EW=32,EH=36;
function solidAt(platforms,traps,x,y,w=EW,h=EH,excludeMoving) {
  for(const pl of platforms){
    const plx=pl.x*TILE,ply=pl.y*TILE;
    if(x+w>plx&&x<plx+TILE&&y+h>ply&&y+h<ply+TILE+6) return {solid:true,y:ply-h};
    if(x+w>plx+4&&x<plx+TILE-4&&y+h>ply&&y<ply+TILE) return {solid:true,y:ply-h};
  }
  for(const t of traps){
    if(t.type==="movingPlatform"&&!excludeMoving){
      if(x+w>t.x&&x<t.x+TILE*2&&y+h>t.y&&y+h<t.y+14) return {solid:true,y:t.y-h};
    }
  }
  return {solid:false};
}
function hasSolidBelow(platforms,traps,x,y,w,h=36) {
  const checkY=y+2;
  for(const pl of platforms){
    const plx=pl.x*TILE,ply=pl.y*TILE;
    if(x+w/2>plx&&x+w/2<plx+TILE&&checkY+h>ply&&checkY+h<ply+TILE+8) return true;
  }
  for(const t of traps){
    if(t.type==="movingPlatform"&&!t.fallen&&x+w/2>t.x&&x+w/2<t.x+TILE*2&&checkY+h>t.y&&checkY+h<t.y+12) return true;
  }
  return false;
}
function shouldEnemyTurn(platforms,traps,x,y,dir) {
  const frontX=x+(dir>0?36:-4);
  const wall=solidAt(platforms,traps,x+dir*36,y,32,36,true).solid;
  const cliff=!hasSolidBelow(platforms,traps,frontX,y,16);
  return wall||cliff;
}

// ─── DRAWING ───
function drawChar(ctx,x,y,w,h,ci,right,frame,jumping,scale) {
  const c=CHARS[ci]; const f=Math.floor(frame)%4; const dir=right?1:-1; const feat=c.feat.split(",");
  ctx.save();
  if(scale&&scale!==1){ctx.translate(x+w/2,y+h);ctx.scale(scale,scale);ctx.translate(-(x+w/2),-(y+h));}
  // Shadow
  ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+2,w/2+2,5,0,0,Math.PI*2); ctx.fill();
  // Legs - thicker for obese build
  const la=jumping?0:Math.sin(f*Math.PI/2)*5;
  ctx.fillStyle=c.pants;
  ctx.beginPath();ctx.roundRect(x+2,y+h-16,12,17,2);ctx.fill();
  ctx.beginPath();ctx.roundRect(x+w-14,y+h-16,12,17,2);ctx.fill();
  ctx.fillStyle=c.shoes;
  if(!jumping){ctx.beginPath();ctx.roundRect(x+1+la,y+h-3,14,6,[0,0,3,3]);ctx.fill();ctx.beginPath();ctx.roundRect(x+w-15-la,y+h-3,14,6,[0,0,3,3]);ctx.fill();}
  else{ctx.beginPath();ctx.roundRect(x+1,y+h-1,13,5,2);ctx.fill();ctx.beginPath();ctx.roundRect(x+w-14,y+h+2,13,5,2);ctx.fill();}
  // Body - visibly obese: wide torso, prominent belly
  ctx.fillStyle=c.shirt;
  const bellyW=8; const bellyH=18; const torsoW=w/2+bellyW; const torsoH=18;
  ctx.beginPath();ctx.ellipse(x+w/2,y+h-22,torsoW,torsoH,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.12)";ctx.beginPath();ctx.ellipse(x+w/2+4,y+h-20,torsoW-3,torsoH-4,0.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=c.skin;
  ctx.beginPath();ctx.ellipse(x+w/2,y+h-4,bellyW+4,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.08)";ctx.beginPath();ctx.ellipse(x+w/2+2,y+h-2,bellyW+2,8,0.15,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.3)";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x+5,y+h-32);ctx.lineTo(x+8,y+h-14);ctx.moveTo(x+w-5,y+h-32);ctx.lineTo(x+w-8,y+h-14);ctx.stroke();
  ctx.fillStyle="#f1c40f";ctx.fillRect(x+w/2-5,y+h-20,10,5);
  // Arms - thicker for obese build
  ctx.fillStyle=c.skin;
  const as=jumping?-10:Math.sin(f*Math.PI/2)*5;
  ctx.beginPath();ctx.roundRect(x-6,y+h-32+(jumping?-6:as),10,16,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(x+w-4,y+h-32+(jumping?-6:-as),10,16,3);ctx.fill();
  ctx.beginPath();ctx.arc(x-1,y+h-16+(jumping?-6:as),5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+w+1,y+h-16+(jumping?-6:-as),5,0,Math.PI*2);ctx.fill();
  // Neck/chin - double chin for obese build
  ctx.fillStyle=c.skin;ctx.beginPath();ctx.ellipse(x+w/2,y+h-28,10,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.06)";ctx.beginPath();ctx.ellipse(x+w/2+2,y+h-27,8,5,0.1,0,Math.PI*2);ctx.fill();
  // Head - greasy, patchy skin (better graphics, uglier look)
  const skinGrad=ctx.createRadialGradient(x+w/2-5,y+8,2,x+w/2,y+15,20);
  skinGrad.addColorStop(0,c.skin);skinGrad.addColorStop(0.5,"#d4a574");skinGrad.addColorStop(1,"#b88968");
  ctx.fillStyle=skinGrad;ctx.beginPath();ctx.ellipse(x+w/2,y+12,17,14,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(100,80,60,0.15)";ctx.beginPath();ctx.ellipse(x+w/2+3,y+14,12,10,0.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(255,240,200,0.08)";ctx.beginPath();ctx.ellipse(x+w/2-6,y+8,6,5,0,0,Math.PI*2);ctx.fill();
  if(feat.includes("bumps")||feat.includes("boils")){ctx.fillStyle=feat.includes("boils")?"rgba(200,150,100,0.8)":"rgba(180,100,100,0.5)";[[x+w/2-8,y+6],[x+w/2+7,y+8],[x+w/2-3,y+4],[x+w/2+10,y+14],[x+w/2-12,y+18]].forEach(([a,b])=>{const r=feat.includes("boils")?4:3;ctx.beginPath();ctx.arc(a,b,r,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,200,150,0.4)";ctx.beginPath();ctx.arc(a-1,b-1,1,0,Math.PI*2);ctx.fill();ctx.fillStyle=feat.includes("boils")?"rgba(200,150,100,0.8)":"rgba(180,100,100,0.5)";});}
  if(feat.includes("cyst")){ctx.fillStyle="rgba(220,180,140,0.9)";ctx.beginPath();ctx.ellipse(x+w/2+10,y+8,6,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#8b7355";ctx.lineWidth=1;ctx.stroke();}
  if(feat.includes("skinTags")){ctx.fillStyle="#8b7355";[[x+w/2-12,y+20],[x+w/2+14,y+16],[x+w/2+8,y+24]].forEach(([a,b])=>{ctx.beginPath();ctx.ellipse(a,b,2,4,0.3,0,Math.PI*2);ctx.fill();});}
  if(feat.includes("veinyForehead")||feat.includes("bulgingVeins")){ctx.strokeStyle="rgba(100,50,80,0.6)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w/2-8,y+2);ctx.lineTo(x+w/2-4,y+8);ctx.moveTo(x+w/2+6,y+4);ctx.lineTo(x+w/2+10,y+10);ctx.stroke();}
  if(feat.includes("oozingPores")){ctx.fillStyle="rgba(200,180,100,0.5)";for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(x+w/2-10+(i%4)*8,y+10+Math.floor(i/4)*6,1+Math.sin(frame*0.2+i)*0.5,0,Math.PI*2);ctx.fill();}}
  if(feat.includes("flakySkin")){ctx.fillStyle="rgba(200,180,150,0.5)";for(let i=0;i<6;i++){ctx.fillRect(x+w/2-8+(i*5)%14,y+12+Math.floor(i/3)*4,3,2);}}
  if(feat.includes("fungus")){ctx.fillStyle="rgba(120,160,80,0.6)";ctx.beginPath();ctx.arc(x+w/2-10,y+20,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+w/2+12,y+22,3,0,Math.PI*2);ctx.fill();}
  if(feat.includes("protrudingJaw")){ctx.fillStyle=c.skin;ctx.beginPath();ctx.moveTo(x+w/2-8,y+20);ctx.lineTo(x+w/2-12,y+28);ctx.lineTo(x+w/2+12,y+28);ctx.lineTo(x+w/2+8,y+20);ctx.closePath();ctx.fill();ctx.strokeStyle="rgba(0,0,0,0.3)";ctx.stroke();}
  if(feat.includes("bloodshotEyes")){ctx.strokeStyle="rgba(200,0,0,0.7)";ctx.lineWidth=1;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+w/2-6+i*6,y+8);ctx.lineTo(x+w/2-4+i*6,y+10);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w/2-5+i*6,y+9);ctx.lineTo(x+w/2-3+i*6,y+7);ctx.stroke();}}
  if(feat.includes("ingrownHairs")){ctx.fillStyle="#4a3520";ctx.beginPath();ctx.arc(x+w/2-10,y+16,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+w/2+12,y+18,1.5,0,Math.PI*2);ctx.fill();}
  // Nose - crooked, red, or huge
  const nx=x+w/2+dir*6; const ns=feat.includes("hugNose")?10:feat.includes("crookedNose")?7:6;
  ctx.fillStyle=feat.includes("redNose")?"#c44":"#d4956b";
  ctx.save();
  if(feat.includes("crookedNose")){ctx.translate(nx,y+13);ctx.rotate(dir*0.4);ctx.translate(-nx,-y-13);}
  ctx.beginPath();ctx.ellipse(nx,y+13,ns,ns-1,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  if(feat.includes("giganticWart")||feat.includes("wart")||feat.includes("warts")){ctx.fillStyle="#5a3a1a";const ws=feat.includes("giganticWart")?5:2.5;ctx.beginPath();ctx.arc(nx+dir*4,y+10,ws,0,Math.PI*2);ctx.fill();ctx.fillStyle="#3a2800";ctx.beginPath();ctx.arc(nx+dir*4,y+10,ws-1,0,Math.PI*2);ctx.fill();}
  if(feat.includes("wartCluster")){for(let i=0;i<5;i++){ctx.fillStyle="#6b4423";ctx.beginPath();ctx.arc(x+w/2+dir*(6+i*3),y+14+i%2*4,2,0,Math.PI*2);ctx.fill();}}
  if(feat.includes("blackheads")){ctx.fillStyle="#2a2a2a";ctx.beginPath();ctx.arc(nx-2,y+11,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(nx+3,y+15,1,0,Math.PI*2);ctx.fill();}
  if(feat.includes("noseDrip")){ctx.fillStyle="rgba(150,220,100,0.6)";ctx.beginPath();ctx.ellipse(nx,y+18,2,4+Math.sin(frame*0.2)*2,0,0,Math.PI*2);ctx.fill();}
  if(feat.includes("mole")||feat.includes("moleColony")){const moles=feat.includes("moleColony")?[[x+w/2+6,y+17,5],[x+w/2-8,y+12,3],[x+w/2+10,y+22,2]]:[[x+w/2+6,y+17,4]];moles.forEach(([mx,my,ms])=>{ctx.fillStyle="#3a2515";ctx.beginPath();ctx.arc(mx,my,ms+1,0,Math.PI*2);ctx.fill();ctx.fillStyle="#5a3a1a";ctx.beginPath();ctx.arc(mx,my,ms,0,Math.PI*2);ctx.fill();ctx.fillStyle="#1a0a00";ctx.beginPath();ctx.arc(mx+1,my-1,1,0,Math.PI*2);ctx.fill();});}
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
  const toothCol=feat.includes("yellowTeeth")?"#c4a040":feat.includes("recedingGums")?"#ddd":"#fffdd0";
  if(feat.includes("missingTooth")){ctx.fillStyle=toothCol;ctx.fillRect(x+w/2-4,y+17,3,3);ctx.fillRect(x+w/2+3,y+16,3,3);}
  else if(feat.includes("snaggletooth")){ctx.fillStyle=toothCol;ctx.fillRect(x+w/2-2,y+17,3,6);ctx.fillStyle="#8a7a5a";ctx.fillRect(x+w/2+2,y+16,2,3);}
  else if(feat.includes("buckTeeth")){ctx.fillStyle=toothCol;ctx.fillRect(x+w/2-4,y+17,4,7);ctx.fillRect(x+w/2+1,y+17,4,7);}
  else if(feat.includes("goldTooth")){ctx.fillStyle=toothCol;ctx.fillRect(x+w/2-3,y+17,3,3);ctx.fillStyle="#ffd700";ctx.fillRect(x+w/2+2,y+16,3,3);}
  if(feat.includes("lipSores")){ctx.fillStyle="rgba(180,80,80,0.7)";ctx.beginPath();ctx.ellipse(x+w/2-3,y+20,3,2,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+w/2+4,y+19,2,2,0,0,Math.PI*2);ctx.fill();}
  if(feat.includes("recedingGums")){ctx.strokeStyle="rgba(200,120,120,0.8)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+w/2-5,y+20);ctx.lineTo(x+w/2+6,y+19);ctx.stroke();}
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
  else if(type==="slime") {
    const squash=1-Math.abs(Math.sin(frame*0.2))*0.2;
    ctx.fillStyle="#2ecc71";
    ctx.beginPath();ctx.ellipse(x+16,y+28+b,14*squash,10/squash,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(46,204,113,0.5)";ctx.beginPath();ctx.ellipse(x+16,y+25,10,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#27ae60";ctx.beginPath();ctx.arc(x+10,y+24+b,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+22,y+26+b,3,0,Math.PI*2);ctx.fill();
  }
  else if(type==="tank") {
    ctx.fillStyle="#34495e";ctx.fillRect(x+2,y+18,28,22);
    ctx.fillStyle="#5d6d7e";ctx.fillRect(x+4,y+20,24,18);
    ctx.fillStyle="#2c3e50";ctx.fillRect(x+8,y+14,16,10);
    ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.arc(x+12,y+20+b,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+20,y+20+b,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#000";ctx.fillRect(x+26,y+24,8,4);
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

function drawCollectable(ctx,x,y,type,frame) {
  const s=Math.abs(Math.sin(frame*0.08));
  const types={key:"🔑",star:"⭐",gem:"💎",crown:"👑"};
  ctx.font="bold 20px monospace";
  ctx.fillStyle="rgba(255,255,255,0.3)";ctx.beginPath();ctx.arc(x+16,y+16,14,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=type==="key"?"#d4a017":type==="star"?"#f1c40f":type==="gem"?"#9b59b6":"#f39c12";
  ctx.fillText(types[type]||"?",x+6,y+24);
}

function drawBoss(ctx,x,y,frame,type) {
  const f=Math.floor(frame)%4; const b=Math.sin(f*Math.PI/2)*3;
  ctx.save();
  if(type==="blob"){
    const pulse=1+Math.sin(frame*0.1)*0.15;
    ctx.fillStyle="#8e44ad";ctx.beginPath();ctx.ellipse(x+24,y+28+b,24*pulse,18,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#9b59b6";ctx.beginPath();ctx.ellipse(x+24,y+24+b,20,14,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.arc(x+18,y+22+b,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+30,y+22+b,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#2c3e50";ctx.beginPath();ctx.arc(x+20,y+22+b,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+32,y+22+b,2,0,Math.PI*2);ctx.fill();
  } else if(type==="beast"){
    ctx.fillStyle="#8b0000";ctx.beginPath();ctx.ellipse(x+24,y+28+b,28,18,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#a0522d";ctx.beginPath();ctx.moveTo(x+2,y+18+b);ctx.lineTo(x-8,y+8+b);ctx.lineTo(x+10,y+22+b);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(x+46,y+18+b);ctx.lineTo(x+56,y+8+b);ctx.lineTo(x+38,y+22+b);ctx.closePath();ctx.fill();
    ctx.fillStyle="#ff4444";ctx.beginPath();ctx.arc(x+18,y+24+b,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+30,y+24+b,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 16px monospace";ctx.fillText("B",x+18,y+28+b);
  } else if(type==="skeleton"){
    ctx.fillStyle="#ecf0f1";ctx.fillRect(x+4,y+20,40,28);
    ctx.fillStyle="#bdc3c7";ctx.fillRect(x+8,y+24,12,20);ctx.fillRect(x+28,y+24,12,20);
    ctx.fillStyle="#2c3e50";ctx.beginPath();ctx.arc(x+24,y+22+b,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.arc(x+20,y+20+b,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+28,y+20+b,3,0,Math.PI*2);ctx.fill();
  } else if(type==="phantom"){
    ctx.globalAlpha=0.7+Math.sin(frame*0.15)*0.2;
    ctx.fillStyle="#2c3e50";ctx.beginPath();ctx.ellipse(x+24,y+26+b,22,16,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#34495e";ctx.beginPath();ctx.ellipse(x+24,y+20+b,18,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.arc(x+18,y+22+b,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+30,y+22+b,4,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  } else if(type==="titan"){
    ctx.fillStyle="#1a1a2a";ctx.fillRect(x+0,y+12,48,36);
    ctx.fillStyle="#2a2a3a";ctx.fillRect(x+4,y+16,40,28);
    ctx.fillStyle="#4a4a5a";ctx.fillRect(x+14,y+8,20,14);
    ctx.fillStyle="#ff4444";ctx.beginPath();ctx.arc(x+20,y+28+b,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+32,y+28+b,6,0,Math.PI*2);ctx.fill();
  } else {
    ctx.fillStyle="#7f8c8d";ctx.fillRect(x+2,y+16,44,32);
    ctx.fillStyle="#95a5a6";ctx.fillRect(x+6,y+20,36,24);
    ctx.fillStyle="#2c3e50";ctx.fillRect(x+14,y+12,20,12);
    ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.arc(x+20,y+26+b,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+32,y+26+b,5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
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

// ─── SAVE/LOAD ───
const DEFAULT_OPTIONS = {
  practiceMode: false, hazardsOff: false, screenShake: true, particleDensity: "medium", easyBoss: false,
  musicVol: 1, sfxVol: 1, muteMenus: false, fullscreen: false,
  colorblind: "none", themeOverride: "auto", retroMode: false, menuTheme: "dark", uiScale: 1,
  keyJump: " ", keyLeft: "ArrowLeft", keyRight: "ArrowRight", keyDash: "Shift", keyShoot: "z",
  touchSensitivity: 1,
};
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { unlocked: d.unlocked ?? 1, highScores: d.highScores ?? {}, achievements: d.achievements ?? {}, difficulty: d.difficulty ?? "normal", musicVol: d.musicVol ?? 1, sfxVol: d.sfxVol ?? 1, options: { ...DEFAULT_OPTIONS, ...d.options }, stats: d.stats ?? { playTime: 0, deaths: 0, levelsCompleted: 0 } };
    }
  } catch (e) {}
  return { unlocked: 1, highScores: {}, achievements: {}, difficulty: "normal", musicVol: 1, sfxVol: 1, options: { ...DEFAULT_OPTIONS }, stats: { playTime: 0, deaths: 0, levelsCompleted: 0 } };
}
function saveGame(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}

// ─── DIFFICULTY SCALING ───
function getDifficultyScale(diff) {
  if (diff === "easy") return { enemyHp: 0.7, playerDmg: 0.6, enemySpawn: 0.7, trapDmg: 0.7 };
  if (diff === "hard") return { enemyHp: 1.4, playerDmg: 1.3, enemySpawn: 1.2, trapDmg: 1.2 };
  return { enemyHp: 1, playerDmg: 1, enemySpawn: 1, trapDmg: 1 };
}

// ─── ACHIEVEMENTS ───
const ACHIEVEMENTS = [
  { id: "first_stomp", name: "First Stomp", desc: "Stomp your first enemy", check: a => (a.stomps || 0) >= 1 },
  { id: "stomp_50", name: "Stomp Master", desc: "Stomp 50 enemies", check: a => (a.stomps || 0) >= 50 },
  { id: "level_10", name: "Level 10", desc: "Beat level 10", check: a => (a.maxLevel || 0) >= 10 },
  { id: "level_50", name: "Halfway", desc: "Beat level 50", check: a => (a.maxLevel || 0) >= 50 },
  { id: "collect_10", name: "Collector", desc: "Collect 10 level items", check: a => (a.collectables || 0) >= 10 },
  { id: "boss_5", name: "Boss Hunter", desc: "Defeat 5 bosses", check: a => (a.bosses || 0) >= 5 },
  { id: "combo_5", name: "Combo King", desc: "Get a 5x combo", check: a => (a.maxCombo || 0) >= 5 },
  { id: "perfect_level", name: "Perfect Run", desc: "Beat a level without taking damage", check: a => a.perfectLevel || false },
];

// ─── MAIN COMPONENT ───
export default function Game() {
  const canvasRef = useRef(null);
  const audioRef = useRef(new MusicEngine());
  const [screen,setScreen] = useState("menu");
  const [selChar,setSelChar] = useState(0);
  const [soundOn,setSoundOn] = useState(true);
  const [saveData] = useState(() => loadSave());
  const [unlocked,setUnlocked] = useState(1);
  const [difficulty,setDifficulty] = useState("normal");
  useEffect(() => { const s = loadSave(); setUnlocked(s.unlocked); setDifficulty(s.difficulty); if(s.options) setOptions(o=>({...DEFAULT_OPTIONS,...s.options})); }, []);
  const [levelPage,setLevelPage] = useState(0);
  const [showAchievements,setShowAchievements] = useState(false);
  const [showOptions,setShowOptions] = useState(false);
  const [showStats,setShowStats] = useState(false);
  const [showCredits,setShowCredits] = useState(false);
  const [showTutorial,setShowTutorial] = useState(false);
  const [showDailyChallenge,setShowDailyChallenge] = useState(false);
  const [showSeedInput,setShowSeedInput] = useState(false);
  const [runMode,setRunMode] = useState(false);
  const [options,setOptions] = useState(() => loadSave().options || { ...DEFAULT_OPTIONS });
  const [customSeed,setCustomSeed] = useState("");
  const gsRef = useRef({
    player:{x:0,y:0,vx:0,vy:0,right:true,frame:0,grounded:false,invincible:0},
    camera:{x:0}, keys:{},
    level:null, score:0, lives:3, totalScore:0,
    state:"playing", deathTimer:0, fc:0,
    particles:[], screenShake:0, levelIdx:0, charIdx:0,
    projectiles:[],
    checkpoint: null, combo: 0, comboTime: 0, levelStartTime: 0,
    powerups: {}, levelLivesStart: 3, levelDamageTaken: 0,
    achievements: {}, stompsTotal: 0, bossesDefeated: 0, collectablesTotal: 0,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const addP = useCallback((x,y,col,n,sz)=>{
    const gs=gsRef.current;
    const pd = optionsRef.current?.particleDensity || "medium";
    const mult = pd === "low" ? 0.3 : pd === "high" ? 1.5 : 1;
    const nn = Math.max(1, Math.floor(n * mult));
    for(let i=0;i<nn;i++) gs.particles.push({x,y,vx:(Math.random()-0.5)*8,vy:-Math.random()*6-2,life:25+Math.random()*25,color:col,size:sz||(2+Math.random()*4)});
  },[]);

  const initLevel = useCallback(async (li,ci,useCheckpoint = false, optsOverride = {})=>{
    const gs=gsRef.current;
    const opts = { customSeed: optsOverride.customSeed ?? (optsOverride.dailyChallenge ? getDailySeed() : null), themeOverride: optsOverride.themeOverride ?? options.themeOverride, easyBoss: optsOverride.easyBoss ?? options.easyBoss };
    const lv=genLevel(li, opts);
    gs.level=lv; gs.levelIdx=li; gs.charIdx=ci;
    const ab=CHARS[ci].ability;
    const startLives=options.practiceMode?999:(ab==="extraLife"?4:3);
    const ds=getDifficultyScale(difficulty);
    let startX=lv.startX*TILE, startY=lv.startY*TILE;
    if(useCheckpoint && gs.checkpoint){
      startX=gs.checkpoint.x*TILE; startY=(gs.checkpoint.y||13)*TILE;
    }
    gs.player={x:startX,y:startY,vx:0,vy:0,right:true,frame:0,grounded:false,invincible:0,jumpsLeft:ab==="doubleJump"?2:1,floatTimer:0,dashCd:0};
    gs.camera={x:Math.max(0,startX-CW/3)}; gs.score=useCheckpoint?gs.score:0; gs.lives=useCheckpoint?gs.lives:startLives;
    gs.state="playing"; gs.deathTimer=0; gs.fc=0;
    gs.particles=[]; gs.screenShake=0; gs.projectiles=[]; gs.hasCollectable=useCheckpoint?gs.hasCollectable:null;
    gs.checkpoint=useCheckpoint?gs.checkpoint:null; gs.combo=0; gs.comboTime=0;
    gs.levelStartTime=Date.now(); gs.powerups={}; gs.levelLivesStart=startLives; gs.levelDamageTaken=0;
    gs.levelStomps=0; gs.levelBosses=0; gs.levelCollectables=0; gs.levelFade=0;
    if(lv.powerupPos){ lv.powerupPos.forEach(p=>{ p.collected=false; }); }
    if(lv.breakables){ lv.breakables.forEach(b=>{ b.broken=false; }); }
    setScreen("playing");
    try {
      if (!audioRef.current?.started) await audioRef.current.start();
      const s=loadSave(); audioRef.current.setVolumes?.(s.musicVol,s.sfxVol);
      const theme = (SONGS[lv.theme] ? lv.theme : null) || "grassland";
      audioRef.current.startMusic(theme, li);
    } catch (e) { console.warn("Audio init failed:", e); }
  },[difficulty,options]);

  const hurtPlayer = useCallback((gs, fromHazard=false)=>{
    if(gs.player.invincible>0 || gs.powerups?.invincibility) return;
    if(options.practiceMode) return;
    if(fromHazard && options.hazardsOff) return;
    gs.lives--;
    gs.levelDamageTaken = (gs.levelDamageTaken || 0) + 1;
    addP(gs.player.x+PW/2,gs.player.y+PH/2,"#e74c3c",20,4);
    if(optionsRef.current?.screenShake) gs.screenShake=10;
    audioRef.current.playHazard();
    const invLen=CHARS[gs.charIdx].ability==="longerInvincible"?150:90;
    if(gs.lives<=0){gs.state="gameOver";const st=loadSave().stats||{playTime:0,deaths:0,levelsCompleted:0};saveGame({...loadSave(),stats:{...st,deaths:st.deaths+1}});audioRef.current.stopMusic();}
    else{
      gs.player.invincible=invLen; gs.player.vy=JUMP_FORCE*0.7;
      if(gs.checkpoint){
        gs.player.x=gs.checkpoint.x*TILE; gs.player.y=(gs.checkpoint.y||13)*TILE; gs.player.vx=0; gs.player.vy=0;
        gs.camera.x=Math.max(0,gs.player.x-CW/3); gs.particles=[]; gs.screenShake=0;
      }
    }
  },[addP,options.practiceMode,options.hazardsOff]);

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
        if(runMode&&next>=20){ gs.state="runWin"; }
        else if(next>=100) gs.state="win";
        else initLevel(next,gs.charIdx);
      }
      if((gs.state==="gameOver"||gs.state==="win"||gs.state==="runWin")&&(e.key===" "||e.key==="Enter")){
        audioRef.current.stopMusic();setScreen("menu");
      }
    };
    const ku=(e)=>{gsRef.current.keys[e.key]=false;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);

    const loop=()=>{
      try {
      const gs=gsRef.current;
      if(!gs.level){animId=requestAnimationFrame(loop);return;}
      const W=CW,H=CH,lv=gs.level;
      const th=THEMES[lv.theme]||THEMES.grassland;
      gs.fc++;

      // ─── UPDATE ───
      if(gs.state==="playing"){
        const p=gs.player;
        const ab=CHARS[gs.charIdx].ability;
        // Dash (Shift or X)
        if((gs.keys["Shift"]||gs.keys["x"])&&(ab==="dash")&&p.dashCd<=0){
          p.vx=(p.right?1:-1)*12; p.dashCd=45; p.invincible=20;
        }
        const speedMult = gs.powerups?.speed ? 1.6 : 1;
        if(p.dashCd>0){p.dashCd--;p.vy=0;} else {
        if(gs.keys["ArrowLeft"]||gs.keys["a"]){p.vx=-MOVE_SPEED*speedMult;p.right=false;}
        else if(gs.keys["ArrowRight"]||gs.keys["d"]){p.vx=MOVE_SPEED*speedMult;p.right=true;}
        else{p.vx*=0.7;if(Math.abs(p.vx)<0.5)p.vx=0;}
        if(p.grounded) p.jumpsLeft=ab==="doubleJump"?2:1;
        const jumpPress=(gs.keys["ArrowUp"]||gs.keys["w"]||gs.keys[" "]);
        if(jumpPress){
          if(p.grounded||(ab==="doubleJump"&&p.jumpsLeft>0)){
            if(!p.grounded) p.jumpsLeft--;
            p.vy=JUMP_FORCE;p.grounded=false;audioRef.current.playJump();
          }
          if(ab==="float"&&p.vy>0&&p.floatTimer<30){p.vy*=0.7;p.floatTimer++;}
        } else p.floatTimer=0;
        }
        if(gs.powerups?.projectile&&(gs.keys["z"]||gs.keys["j"])&&gs.projectiles.length<3){
          const vx=(p.right?1:-1)*8; gs.projectiles.push({x:p.x+PW,y:p.y+PH/2,vx,vy:0,life:90,playerProj:true});
          gs.powerups.projectile=Math.max(0,(gs.powerups.projectile||0)-30);
        }
        if(p.dashCd<=0) p.vy+=GRAVITY; if(p.vy>15)p.vy=15;
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
        for(const bw of lv.breakables||[]){
          if(bw.broken) continue;
          const bx=bw.x*TILE,by=bw.y*TILE;
          if(p.x+PW>bx&&p.x<bx+TILE*2&&p.y+PH>by&&p.y+PH<by+TILE+8&&p.vy>=0){
            p.y=by-PH;p.vy=0;p.grounded=true;
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
              hurtPlayer(gs,true);
            }
          }
          // Lava
          if(trap.type==="lava"){
            if(p.x+PW>trap.x&&p.x<trap.x+trap.w&&p.y+PH>trap.y+6){
              hurtPlayer(gs,true);
            }
          }
          // Saw
          if(trap.type==="saw"){
            trap.t+=0.03;
            if(trap.dir==="h") trap.x=trap.ox+Math.sin(trap.t)*trap.range;
            else trap.y=trap.oy+Math.sin(trap.t)*trap.range;
            const dx=p.x+PW/2-(trap.x+16),dy=p.y+PH/2-(trap.y+16);
            if(Math.sqrt(dx*dx+dy*dy)<28) hurtPlayer(gs,true);
          }
          // Crusher - moves up/down
          if(trap.type==="crusher"){
            trap.t+=0.025; trap.y=trap.oy+Math.sin(trap.t)*trap.range;
            if(p.x+PW>trap.x&&p.x<trap.x+trap.w&&p.y+PH>trap.y&&p.y<trap.y+trap.h) hurtPlayer(gs,true);
          }
          // Laser - pulses on/off
          if(trap.type==="laser"){
            const on=((gs.fc+(trap.phase||0))%80)<45;
            if(on&&p.x+PW>trap.x&&p.x<trap.x+trap.w&&p.y+PH>trap.y&&p.y<trap.y+trap.h) hurtPlayer(gs,true);
          }
          // Acid - like lava
          if(trap.type==="acid"){
            if(p.x+PW>trap.x&&p.x<trap.x+trap.w&&p.y+PH>trap.y+6) hurtPlayer(gs,true);
          }
          // Steam - vertical damage zone
          if(trap.type==="steam"){
            const pulse=Math.sin(gs.fc*0.08)*0.5+0.5;
            if(pulse>0.6&&p.x+PW>trap.x+4&&p.x<trap.x+trap.w-4&&p.y+PH>trap.y&&p.y<trap.y+trap.h) hurtPlayer(gs,true);
          }
          // Mine - bobs, damage on touch
          if(trap.type==="mine"){
            trap.t+=0.04; trap.y=trap.oy+Math.sin(trap.t)*15;
            const mdx=p.x+PW/2-(trap.x+12),mdy=p.y+PH/2-(trap.y+12);
            if(Math.sqrt(mdx*mdx+mdy*mdy)<24) hurtPlayer(gs,true);
          }
          // Thorn - hanging spikes
          if(trap.type==="thorn"){
            if(p.x+PW>trap.x+2&&p.x<trap.x+trap.w-2&&p.y+PH>trap.y&&p.y<trap.y+trap.h) hurtPlayer(gs,true);
          }
          // Electric - pulses
          if(trap.type==="electric"){
            const eOn=((gs.fc+(trap.phase||0))%50)<25;
            if(eOn&&p.x+PW>trap.x&&p.x<trap.x+trap.w&&p.y+PH>trap.y&&p.y<trap.y+trap.h) hurtPlayer(gs,true);
          }
        }

        // Checkpoints
        if(lv.checkpoints) for(const cp of lv.checkpoints){
          if(p.x+PW>cp.x*TILE&&p.x<cp.x*TILE+TILE&&p.y+PH>cp.y*TILE&&p.y<cp.y*TILE+TILE){
            if(!gs.checkpoint||cp.x>gs.checkpoint.x){ gs.checkpoint={x:cp.x,y:cp.y}; addP(p.x+PW/2,p.y+PH/2,"#2ecc71",8,3); audioRef.current.playCoin(); }
          }
        }
        // Power-ups
        if(lv.powerupPos) for(const pow of lv.powerupPos){
          if(pow.collected) continue;
          const px=pow.x*TILE,py=pow.y*TILE;
          if(p.x+PW>px&&p.x<px+TILE&&p.y+PH>py&&p.y<py+TILE){
            pow.collected=true; gs.powerups[pow.type]=(gs.powerups[pow.type]||0)+300;
            addP(px+20,py+20,"#9b59b6",15,4); audioRef.current.playCoin();
          }
        }
        // Breakable walls (stomp to break)
        if(lv.breakables) for(const bw of lv.breakables){
          if(bw.broken) continue;
          const bx=bw.x*TILE,by=bw.y*TILE;
          if(p.x+PW>bx&&p.x<bx+TILE*2&&p.y+PH>by&&p.y<by+TILE){
            if(p.vy>0){ bw.broken=true; addP(bx+TILE,by+TILE/2,"#8b4513",12,3); audioRef.current.playStomp(); }
          }
        }
        // Power-up tick down
        for(const k of Object.keys(gs.powerups||{})){ gs.powerups[k]--; if(gs.powerups[k]<=0) delete gs.powerups[k]; }
        // Combo tick
        if(gs.comboTime>0){ gs.comboTime--; if(gs.comboTime<=0) gs.combo=0; }
        // Coins
        const magnetRange = gs.powerups?.magnet ? 80 : 0;
        for(const coin of lv.coins){
          if(coin.collected) continue;
          const cx=coin.x*TILE,cy=coin.y*TILE;
          const dist=Math.hypot(p.x+PW/2-(cx+16),p.y+PH/2-(cy+16));
          const inRange = magnetRange?dist<magnetRange:(p.x+PW>cx&&p.x<cx+TILE&&p.y+PH>cy&&p.y<cy+TILE);
          if(inRange){
            coin.collected=true;
            gs.combo++; gs.comboTime=120; gs.score+=100*(1+Math.min(gs.combo-1,4)*0.1);
            addP(cx+16,cy+16,"#f1c40f",10,3);
            audioRef.current.playCoin();
          }
        }
        // Level collectable (key, star, gem, crown)
        if(lv.collectable&&!lv.collectable.collected){
          const cx=lv.collectable.x*TILE,cy=lv.collectable.y*TILE;
          const cdist=Math.hypot(p.x+PW/2-(cx+16),p.y+PH/2-(cy+16));
          const cInRange = magnetRange?cdist<magnetRange*1.2:(p.x+PW>cx&&p.x<cx+TILE&&p.y+PH>cy&&p.y<cy+TILE);
          if(cInRange){
            lv.collectable.collected=true;
            gs.hasCollectable=lv.collectable.type;
            gs.levelCollectables=(gs.levelCollectables||0)+1;
            gs.combo++; gs.comboTime=120; gs.score+=500*(1+Math.min((gs.combo||0)-1,4)*0.1);
            addP(cx+16,cy+16,"#9b59b6",20,4);
            audioRef.current.playCoin();
          }
        }

        // Enemies - terrain collision for ground types
        const groundTypes=["walker","fast","jumper","charger","slime","tank"];
        for(const en of lv.enemies){
          if(!en.alive) continue;
          const isGround=groundTypes.includes(en.type);
          if(isGround){
            en.vy+=0.5; if(en.vy>12)en.vy=12;
            const col=solidAt(lv.platforms,lv.traps,en.x,en.y,EW,EH,false);
            if(col.solid){en.y=col.y;en.vy=0;en.grounded=true;} else {en.grounded=false;}
            en.y+=en.vy;
            if(shouldEnemyTurn(lv.platforms,lv.traps,en.x,en.y,en.dir)) en.dir*=-1;
          }
          // Movement by type
          if(en.type==="walker"){en.x+=en.dir*1.2;if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;}
          else if(en.type==="fast"){en.x+=en.dir*2.4;if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;}
          else if(en.type==="flyer"){
            en.x+=en.dir*1.5; en.y=en.startY+Math.sin(gs.fc*0.04+en.startX)*30;
            if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;
          }
          else if(en.type==="jumper"){
            en.x+=en.dir*1; en.jumpCd--;
            if(en.jumpCd<=0&&en.grounded){en.vy=-9;en.jumpCd=en.jumpTimer;}
            if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;
          }
          else if(en.type==="charger"){
            const dx=p.x-en.x;
            if(Math.abs(dx)<TILE*6&&!en.charging){en.charging=true;en.chargeTimer=60;en.dir=dx>0?1:-1;}
            if(en.charging){en.x+=en.dir*4;en.chargeTimer--;if(en.chargeTimer<=0)en.charging=false;}
            else{en.x+=en.dir*0.6;if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;}
          }
          else if(en.type==="slime"){
            en.x+=en.dir*0.8; if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;
          }
          else if(en.type==="tank"){
            en.x+=en.dir*0.5; if(en.x>en.startX+en.range)en.dir=-1;if(en.x<en.startX-en.range)en.dir=1;
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
              const ds=getDifficultyScale(difficulty);
              const dmg=CHARS[gs.charIdx].ability==="stompDamage"?2:1;
              en.hp=(en.hp||1)-Math.max(1,Math.floor(dmg/ds.enemyHp));
              if(en.hp<=0){
                en.alive=false; addP(en.x+16,en.y+16,"#e74c3c",15,3); if(optionsRef.current?.screenShake) gs.screenShake=6;
                gs.combo++; gs.comboTime=120; gs.levelStomps=(gs.levelStomps||0)+1; gs.maxCombo=Math.max(gs.maxCombo||0,gs.combo);
                gs.score+=(en.type==="tank"?400:200)*(1+Math.min((gs.combo||0)-1,4)*0.15);
                audioRef.current.playStomp();
              }
              p.vy=JUMP_FORCE*0.55;
            } else {
              hurtPlayer(gs);
            }
          }
        }

        // Boss - spawns near flag, must defeat to pass
        const boss=lv.boss;
        if(boss&&boss.alive){
          boss.vy+=0.5; if(boss.vy>10)boss.vy=10;
          const bCol=solidAt(lv.platforms,lv.traps,boss.x,boss.y,48,48,false);
          if(bCol.solid){boss.y=bCol.y;boss.vy=0;boss.grounded=true;} else boss.grounded=false;
          boss.y+=boss.vy;
          const nextX=boss.x+boss.vx;
          let wall=false;
          for(const pl of lv.platforms){
            const plx=pl.x*TILE,ply=pl.y*TILE;
            if(nextX+48>plx&&nextX<plx+TILE&&boss.y+48>ply&&boss.y<ply+TILE) wall=true;
          }
          if(!wall) boss.x=nextX; else boss.vx*=-0.5;
          const bdx=p.x-boss.x; if(Math.abs(bdx)>TILE*3){boss.vx+=bdx>0?0.05:-0.05;boss.vx=Math.max(-2,Math.min(2,boss.vx));} else boss.vx*=0.9;
          boss.attackCd--;
          if(boss.attackCd<=0&&boss.grounded){
            gs.projectiles.push({x:boss.x+24,y:boss.y+30,vx:(p.x-boss.x>0?1:-1)*4,life:120});
            boss.attackCd=80;
          }
          boss.frame+=0.08;
          // Player stomp boss
          if(p.x+PW>boss.x&&p.x<boss.x+48&&p.y+PH>boss.y&&p.y<boss.y+48){
            if(p.vy>0&&p.y+PH<boss.y+24){
              boss.hp--; p.vy=JUMP_FORCE*0.6; addP(boss.x+24,boss.y+24,"#e74c3c",20,5); if(optionsRef.current?.screenShake) gs.screenShake=12;
              audioRef.current.playStomp();
              if(boss.hp<=0){
                boss.alive=false; gs.levelBosses=1;
                gs.combo++; gs.comboTime=120; gs.score+=2000*(1+Math.min((gs.combo||0)-1,4)*0.2);
                addP(boss.x+24,boss.y+24,"#9b59b6",40,6);audioRef.current.playCoin();
              }
            } else hurtPlayer(gs);
          }
        }

        // Projectiles
        gs.projectiles=gs.projectiles.filter(pr=>{
          pr.x+=pr.vx;pr.y+=pr.vy||0;pr.life--;
          if(pr.playerProj){
            for(const en of lv.enemies){
              if(!en.alive) continue;
              if(pr.x>en.x&&pr.x<en.x+32&&pr.y>en.y&&pr.y<en.y+36){
                const ds=getDifficultyScale(difficulty);
                en.hp=(en.hp||1)-Math.max(1,Math.floor(1/ds.enemyHp));
                if(en.hp<=0){en.alive=false;addP(en.x+16,en.y+16,"#e74c3c",12,2);gs.combo++;gs.comboTime=120;gs.levelStomps=(gs.levelStomps||0)+1;gs.maxCombo=Math.max(gs.maxCombo||0,gs.combo);gs.score+=150;}
                return false;
              }
            }
            if(boss&&boss.alive&&pr.x>boss.x&&pr.x<boss.x+48&&pr.y>boss.y&&pr.y<boss.y+48){
              boss.hp--; addP(boss.x+24,boss.y+24,"#e74c3c",15,4);
              if(boss.hp<=0){boss.alive=false;gs.levelBosses=1;gs.score+=1500;addP(boss.x+24,boss.y+24,"#9b59b6",40,6);}
              return false;
            }
          } else if(!pr.playerProj&&p.x+PW>pr.x-4&&p.x<pr.x+4&&p.y+PH>pr.y-4&&p.y<pr.y+4){
            hurtPlayer(gs,true);return false;
          }
          return pr.life>0;
        });

        // Flag - requires collectable, boss must be defeated
        const bossDead=!boss||!boss.alive;
        const hasCollect=gs.hasCollectable;
        if(p.x+PW>lv.flag.x*TILE&&p.x<lv.flag.x*TILE+TILE&&bossDead){
          if(hasCollect){
            gs.score+=1000; gs.totalScore+=gs.score; gs.state="levelComplete";
            const prev=loadSave().achievements||{};
            const ach={...prev, stomps:(prev.stomps||0)+(gs.levelStomps||0), bosses:(prev.bosses||0)+(gs.levelBosses||0), collectables:(prev.collectables||0)+(gs.levelCollectables||0), maxLevel:Math.max(prev.maxLevel||0,gs.levelIdx+1), maxCombo:Math.max(prev.maxCombo||0,gs.maxCombo||gs.combo||0)};
            if((gs.levelDamageTaken||0)===0&&(gs.levelLivesStart||3)===gs.lives) ach.perfectLevel=true;
            const st=loadSave().stats||{playTime:0,deaths:0,levelsCompleted:0};
            const levelTime=Math.floor((Date.now()-gs.levelStartTime)/1000);
            const nextUnlocked=Math.max(loadSave().unlocked,gs.levelIdx+2);
            const hs={...loadSave().highScores,[gs.levelIdx]:Math.max(loadSave().highScores?.[gs.levelIdx]||0,gs.score)};
            saveGame({...loadSave(),unlocked:nextUnlocked,difficulty,highScores:hs,achievements:ach,stats:{...st,playTime:st.playTime+levelTime,levelsCompleted:st.levelsCompleted+1}});
            audioRef.current.stopMusic();audioRef.current.playWin();
            setUnlocked(u=>Math.max(u,gs.levelIdx+2)); gs.levelFade=0;
          }
        }
        if(p.y>16*TILE){
          gs.lives--;
          if(gs.lives<=0){gs.state="gameOver";const st2=loadSave().stats||{playTime:0,deaths:0,levelsCompleted:0};saveGame({...loadSave(),stats:{...st2,deaths:st2.deaths+1}});audioRef.current.stopMusic();}
          else{
            if(gs.checkpoint){ p.x=gs.checkpoint.x*TILE; p.y=(gs.checkpoint.y||13)*TILE; }
            else{ p.x=lv.startX*TILE; p.y=lv.startY*TILE; }
            p.vx=0;p.vy=0;gs.camera.x=Math.max(0,p.x-CW/3);gs.particles=[];if(optionsRef.current?.screenShake) gs.screenShake=8;
            addP(p.x+PW/2,p.y+PH/2,"#e74c3c",15,3);audioRef.current.playDie();
          }
        }
        gs.camera.x=p.x-W/3;if(gs.camera.x<0)gs.camera.x=0;
      }
      if(gs.state==="dead"){gs.deathTimer--;if(gs.deathTimer<=0){if(gs.lives<=0){gs.state="gameOver";const st3=loadSave().stats||{playTime:0,deaths:0,levelsCompleted:0};saveGame({...loadSave(),stats:{...st3,deaths:st3.deaths+1}});audioRef.current.stopMusic();}else{const l2=gs.level;gs.player={x:l2.startX*TILE,y:l2.startY*TILE,vx:0,vy:0,right:true,frame:0,grounded:false,invincible:60};gs.camera.x=0;gs.state="playing";gs.particles=[];}}}
      gs.screenShake=Math.max(0,gs.screenShake-0.5);
      if(gs.levelFade<1) gs.levelFade=Math.min(1,(gs.levelFade||0)+0.03);
      gs.particles=gs.particles.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vy+=0.18;pt.life--;return pt.life>0;});

      // ─── RENDER ───
      const sx=gs.screenShake>0?(Math.random()-0.5)*gs.screenShake*2:0;
      const sy=gs.screenShake>0?(Math.random()-0.5)*gs.screenShake*2:0;
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,th.sky1);sky.addColorStop(1,th.sky2);
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

      // Grungy overlay - subtle film grain / dirty tint
      ctx.fillStyle="rgba(40,35,30,0.03)"; ctx.fillRect(0,0,W,H);
      // Stars - dimmer, sickly
      if(th.dark){ctx.fillStyle="rgba(200,190,180,0.4)";for(let i=0;i<40;i++){const sx2=((i*137+50)%W),sy2=((i*97+30)%(H*0.6)),ss=1+((i*3)%3)*0.5;ctx.globalAlpha=0.2+Math.sin(gs.fc*0.03+i)*0.25;ctx.beginPath();ctx.arc(sx2,sy2,ss,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
      // Clouds - lumpy, grey-ish, less pretty
      ctx.fillStyle=th.bg;
      for(let i=0;i<9;i++){const cx=((i*220+50)-gs.camera.x*0.2)%(W+300)-150,cy=20+i*35+Math.sin(i*2.5)*20;ctx.globalAlpha=0.6+Math.sin(i*1.3)*0.2;ctx.beginPath();ctx.ellipse(cx,cy,45+Math.sin(i)*10,18+Math.sin(i*2)*5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx+28,cy-4,30,14,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx-20,cy+3,25,12,0,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
      // Hills - lumpy, stained, less smooth
      const stain=th.stain||"rgba(0,0,0,0.15)";
      ctx.fillStyle=th.hill;for(let i=0;i<6;i++){const hx=((i*280)-gs.camera.x*0.35)%(W+500)-250;ctx.beginPath();ctx.ellipse(hx,H-15,200,90+i*12,0,Math.PI,Math.PI*2);ctx.fill();}
      ctx.fillStyle=stain;for(let i=0;i<6;i++){const hx=((i*280+80)-gs.camera.x*0.35)%(W+500)-250;ctx.globalAlpha=0.3+Math.sin(i*2)*0.1;ctx.fillRect(hx,H-25,60+Math.sin(i)*30,35);}
      ctx.globalAlpha=1;
      ctx.fillStyle=th.hill+"66";for(let i=0;i<4;i++){const hx=((i*400+100)-gs.camera.x*0.15)%(W+600)-300;ctx.beginPath();ctx.ellipse(hx,H-10,280,130,0,Math.PI,Math.PI*2);ctx.fill();}

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

      // Platforms - grungy, stained, cracked
      for(const pl of lv.platforms){
        const px=pl.x*TILE,py=pl.y*TILE;
        if(px-gs.camera.x>-TILE*2&&px-gs.camera.x<W+TILE*2){
          if(pl.y===14){
            ctx.fillStyle=th.groundDark;ctx.fillRect(px,py,TILE,TILE);
            ctx.fillStyle=th.ground;ctx.fillRect(px,py,TILE,12);
            ctx.strokeStyle=th.ground+"aa";ctx.lineWidth=1.5;
            for(let g=0;g<4;g++){ctx.beginPath();ctx.moveTo(px+3+g*10,py+12);ctx.lineTo(px+6+g*10,py-2);ctx.stroke();}
            ctx.fillStyle=stain;ctx.globalAlpha=0.25+((pl.x*7+pl.y*3)%5)*0.05;ctx.fillRect(px+2,py+8,8,6);ctx.fillRect(px+25,py+4,10,8);ctx.globalAlpha=1;
            if((pl.x+pl.y)%3===0){ctx.strokeStyle="rgba(0,0,0,0.4)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+15,py+5);ctx.lineTo(px+22,py+12);ctx.stroke();}
          } else if(pl.isPipe){
            ctx.fillStyle="#2a4a2a";ctx.fillRect(px,py,TILE,TILE);
            ctx.fillStyle="#3a5a3a";ctx.fillRect(px+2,py,8,TILE);
            ctx.fillStyle="rgba(0,0,0,0.25)";ctx.fillRect(px+TILE-10,py,10,TILE);
            ctx.fillStyle=stain;ctx.globalAlpha=0.3;ctx.fillRect(px+5,py+20,6,15);ctx.globalAlpha=1;
            ctx.fillStyle="#2e4a32";ctx.fillRect(px-3,py,TILE+6,6);
            ctx.fillStyle="#1e3a22";ctx.fillRect(px-3,py+4,TILE+6,3);
          } else {
            ctx.fillStyle=th.brick;ctx.fillRect(px,py,TILE,TILE);
            ctx.strokeStyle=th.brickDark;ctx.lineWidth=1;
            ctx.strokeRect(px+1,py+1,TILE/2-1,TILE/2-1);
            ctx.strokeRect(px+TILE/2,py+1,TILE/2-1,TILE/2-1);
            ctx.strokeRect(px+1,py+TILE/2,TILE-2,TILE/2-1);
            ctx.fillStyle="rgba(255,255,255,0.04)";ctx.fillRect(px+2,py+2,TILE/2-3,TILE/2-3);
            ctx.fillStyle=stain;ctx.globalAlpha=0.2+((pl.x*11)%7)*0.04;ctx.fillRect(px+5,py+25,15,10);ctx.globalAlpha=1;
            if((pl.x*13+pl.y)%5===0){ctx.strokeStyle="rgba(0,0,0,0.35)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+8,py+8);ctx.lineTo(px+35,py+35);ctx.stroke();}
          }
        }
      }

      // Traps
      for(const trap of lv.traps){
        if(trap.type==="movingPlatform"){
          ctx.fillStyle="#4a4a5a";ctx.fillRect(trap.x,trap.y,TILE*2,10);
          ctx.fillStyle="#5a5a6a";ctx.fillRect(trap.x+2,trap.y+1,TILE*2-4,4);
          ctx.fillStyle="rgba(0,0,0,0.2)";ctx.fillRect(trap.x+4,trap.y+5,TILE*2-8,3);
          // Arrows
          ctx.fillStyle="rgba(255,255,255,0.3)";
          if(trap.dir==="h"){ctx.fillText("↔",trap.x+TILE-6,trap.y+9);}
          else{ctx.fillText("↕",trap.x+TILE-6,trap.y+9);}
        }
        if(trap.type==="fallingPlatform"&&!trap.fallen){
          const shake=trap.shaking?(Math.random()-0.5)*3:0;
          ctx.fillStyle=trap.triggered?"#8a5030":"#9a7050";
          ctx.fillRect(trap.x+shake,trap.y,TILE*2,10);
          ctx.fillStyle="rgba(0,0,0,0.2)";
          ctx.fillRect(trap.x+shake+2,trap.y+6,TILE*2-4,4);
          // Warning cracks
          if(trap.triggered){ctx.strokeStyle="#000";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(trap.x+shake+TILE,trap.y);ctx.lineTo(trap.x+shake+TILE+4,trap.y+10);ctx.stroke();}
        }
        if(trap.type==="spike"){
          for(let s=0;s<4;s++){
            ctx.fillStyle="#5a5a5a";
            ctx.beginPath();
            ctx.moveTo(trap.x+s*10,trap.y+TILE);
            ctx.lineTo(trap.x+s*10+5,trap.y+12);
            ctx.lineTo(trap.x+s*10+10,trap.y+TILE);
            ctx.closePath();ctx.fill();
            ctx.fillStyle="#6a6a6a";
            ctx.beginPath();
            ctx.moveTo(trap.x+s*10,trap.y+TILE);
            ctx.lineTo(trap.x+s*10+5,trap.y+12);
            ctx.lineTo(trap.x+s*10+3,trap.y+TILE);
            ctx.closePath();ctx.fill();
          }
        }
        if(trap.type==="lava"){
          ctx.fillStyle="#4a2010";ctx.fillRect(trap.x,trap.y,trap.w,TILE);
          ctx.fillStyle="#8a3010";ctx.fillRect(trap.x,trap.y+4,trap.w,TILE-4);
          ctx.fillStyle="#c44010";
          for(let i=0;i<trap.w/12;i++){
            const bx=trap.x+i*12;
            const by=trap.y+6+Math.sin(gs.fc*0.08+i*1.5)*3;
            ctx.beginPath();ctx.ellipse(bx+6,by,6,5,0,0,Math.PI*2);ctx.fill();
          }
          ctx.fillStyle="rgba(200,100,0,0.2)";
          for(let i=0;i<trap.w/20;i++){
            const bx=trap.x+i*20+5;
            const by=trap.y+2+Math.sin(gs.fc*0.12+i*2)*3;
            ctx.beginPath();ctx.ellipse(bx,by,4,3,0,0,Math.PI*2);ctx.fill();
          }
          ctx.fillStyle="rgba(200,80,0,0.06)";ctx.fillRect(trap.x-10,trap.y-20,trap.w+20,30);
        }
        if(trap.type==="saw"){
          const rot=gs.fc*0.15;
          ctx.save();ctx.translate(trap.x+16,trap.y+16);ctx.rotate(rot);
          ctx.fillStyle="#5a5a5a";ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#4a4a4a";
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4;
            ctx.beginPath();ctx.moveTo(Math.cos(a)*10,Math.sin(a)*10);
            ctx.lineTo(Math.cos(a+0.2)*18,Math.sin(a+0.2)*18);
            ctx.lineTo(Math.cos(a-0.2)*18,Math.sin(a-0.2)*18);
            ctx.closePath();ctx.fill();
          }
          ctx.fillStyle="#3a3a3a";ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
          ctx.restore();
        }
        if(trap.type==="laser"){
          const on=((gs.fc+(trap.phase||0))%80)<45;
          ctx.fillStyle=on?"rgba(255,50,50,0.9)":"rgba(255,80,80,0.2)";
          ctx.fillRect(trap.x,trap.y,trap.w,trap.h);
          if(on){ctx.strokeStyle="#ff6666";ctx.lineWidth=1;ctx.strokeRect(trap.x,trap.y,trap.w,trap.h);}
        }
        if(trap.type==="crusher"){
          ctx.fillStyle="#4a4a5a";ctx.fillRect(trap.x,trap.y,trap.w,trap.h);
          ctx.fillStyle="#6a6a7a";ctx.fillRect(trap.x+4,trap.y+2,trap.w-8,trap.h-4);
          ctx.fillStyle="#3a3a45";ctx.fillRect(trap.x+6,trap.y+4,trap.w-12,6);
        }
        if(trap.type==="acid"){
          ctx.fillStyle="#2a4a20";ctx.fillRect(trap.x,trap.y,trap.w,TILE);
          ctx.fillStyle="#3a6a28";ctx.fillRect(trap.x,trap.y+6,trap.w,TILE-6);
          ctx.fillStyle="rgba(100,255,80,0.4)";
          for(let i=0;i<trap.w/15;i++){const bx=trap.x+i*15;const by=trap.y+8+Math.sin(gs.fc*0.1+i)*3;ctx.beginPath();ctx.arc(bx+8,by,5,0,Math.PI*2);ctx.fill();}
        }
        if(trap.type==="steam"){
          const pulse=Math.sin(gs.fc*0.08)*0.5+0.5;
          ctx.fillStyle=`rgba(180,190,200,${0.15+pulse*0.25})`;
          ctx.fillRect(trap.x+8,trap.y,trap.w-16,trap.h);
          ctx.fillStyle=`rgba(200,210,220,${pulse*0.2})`;
          ctx.fillRect(trap.x+12,trap.y+10,trap.w-24,trap.h-20);
        }
        if(trap.type==="mine"){
          const bobY=Math.sin((trap.t||0))*8;
          ctx.fillStyle="#3a3a3a";ctx.beginPath();ctx.arc(trap.x+12,trap.y+12+bobY,12,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#5a5a5a";ctx.beginPath();ctx.arc(trap.x+12,trap.y+12+bobY,10,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#e74c3c";ctx.beginPath();ctx.arc(trap.x+12,trap.y+12+bobY,4,0,Math.PI*2);ctx.fill();
        }
        if(trap.type==="thorn"){
          ctx.fillStyle="#3a4a2a";ctx.beginPath();ctx.moveTo(trap.x,trap.y);ctx.lineTo(trap.x+trap.w/2,trap.y+trap.h);ctx.lineTo(trap.x+trap.w,trap.y);ctx.closePath();ctx.fill();
          ctx.fillStyle="#4a5a35";for(let s=0;s<3;s++){ctx.beginPath();ctx.moveTo(trap.x+4+s*4,trap.y);ctx.lineTo(trap.x+6+s*4,trap.y+trap.h-4);ctx.lineTo(trap.x+8+s*4,trap.y);ctx.closePath();ctx.fill();}
        }
        if(trap.type==="electric"){
          const eOn=((gs.fc+(trap.phase||0))%50)<25;
          ctx.fillStyle=eOn?"rgba(100,200,255,0.6)":"rgba(80,150,200,0.15)";
          ctx.fillRect(trap.x,trap.y,trap.w,trap.h);
          if(eOn){ctx.strokeStyle="#88ddff";ctx.lineWidth=2;ctx.strokeRect(trap.x,trap.y,trap.w,trap.h);}
        }
      }

      // Checkpoints
      if(lv.checkpoints) for(const cp of lv.checkpoints){
        const px=cp.x*TILE,py=cp.y*TILE;
        ctx.fillStyle="#2ecc71";ctx.globalAlpha=0.7;ctx.fillRect(px,py,TILE,TILE);ctx.globalAlpha=1;
        ctx.fillStyle="#fff";ctx.font="bold 14px monospace";ctx.fillText("✓",px+12,py+26);
      }
      // Breakable walls
      if(lv.breakables) for(const bw of lv.breakables){
        if(bw.broken) continue;
        const bx=bw.x*TILE,by=bw.y*TILE;
        ctx.fillStyle="#8b4513";ctx.fillRect(bx,by,TILE*2,TILE);
        ctx.fillStyle="#a0522d";ctx.fillRect(bx+2,by+2,TILE*2-4,TILE-4);
        ctx.strokeStyle="#654321";ctx.lineWidth=1;ctx.strokeRect(bx,by,TILE*2,TILE);
      }
      // Power-ups
      if(lv.powerupPos) for(const pow of lv.powerupPos){
        if(pow.collected) continue;
        const px=pow.x*TILE,py=pow.y*TILE;
        const icons={speed:"⚡",invincibility:"🛡",projectile:"🔫",magnet:"🧲"};
        ctx.fillStyle="#9b59b6";ctx.globalAlpha=0.9;ctx.fillRect(px,py,TILE,TILE);ctx.globalAlpha=1;
        ctx.fillStyle="#fff";ctx.font="bold 18px monospace";ctx.fillText(icons[pow.type]||"?",px+8,py+28);
      }
      // Coins
      for(const coin of lv.coins) if(!coin.collected) drawCoin(ctx,coin.x*TILE,coin.y*TILE,gs.fc);
      // Theme deco (stalactites, bubbles)
      if(lv.deco){for(const d of lv.deco){
        if(d.type==="stalactite"){ctx.fillStyle="#4a4a55";ctx.beginPath();ctx.moveTo(d.x+8,d.y);ctx.lineTo(d.x+20,d.y+35);ctx.lineTo(d.x+32,d.y);ctx.closePath();ctx.fill();ctx.fillStyle="#3a3a45";ctx.fillRect(d.x+12,d.y+5,8,25);}
        if(d.type==="bubble"){ctx.fillStyle="rgba(100,180,50,0.4)";ctx.beginPath();ctx.arc(d.x+12,d.y+12+Math.sin(gs.fc*0.1)*3,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(150,200,80,0.3)";ctx.beginPath();ctx.arc(d.x+8,d.y+8,4,0,Math.PI*2);ctx.fill();}
      }}
      // Level collectable
      if(lv.collectable&&!lv.collectable.collected) drawCollectable(ctx,lv.collectable.x*TILE,lv.collectable.y*TILE,lv.collectable.type,gs.fc);
      // Boss
      if(lv.boss&&lv.boss.alive) drawBoss(ctx,lv.boss.x,lv.boss.y,lv.boss.frame,lv.boss.type);
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

      // Fade transition (level start)
      if((gs.levelFade||0)<1){ ctx.fillStyle=`rgba(0,0,0,${1-gs.levelFade})`; ctx.fillRect(0,0,W,H); }
      // HUD
      const hg=ctx.createLinearGradient(0,0,0,44);hg.addColorStop(0,"rgba(0,0,0,0.7)");hg.addColorStop(1,"rgba(0,0,0,0.3)");
      ctx.fillStyle=hg;ctx.fillRect(0,0,W,44);
      ctx.fillStyle="#fff";ctx.font="bold 15px monospace";
      ctx.fillText(`SCORE: ${gs.score}`,12,28);
      ctx.fillStyle="#e74c3c";ctx.fillText(`${"♥".repeat(Math.max(0,gs.lives))}`,180,28);
      ctx.fillStyle="#f1c40f";ctx.fillText(`${lv.name}`,W/2-60,28);
      ctx.fillStyle="#aaa";ctx.font="12px monospace";ctx.fillText(`Lv ${gs.levelIdx+1}/100`,W-100,28);
      const levelTime=Math.floor((Date.now()-gs.levelStartTime)/1000);
      ctx.fillStyle="#9b59b6";ctx.font="11px monospace";ctx.fillText(`⏱ ${levelTime}s`,W-180,28);
      if(gs.combo>1){ctx.fillStyle="#f1c40f";ctx.font="bold 12px monospace";ctx.fillText(`${gs.combo}x COMBO!`,W/2-35,42);}
      const pow=gs.powerups||{}; const powStr=Object.entries(pow).filter(([,v])=>v>0).map(([k,v])=>`${k.slice(0,3)}:${Math.ceil(v/60)}`).join(" ");
      if(powStr){ctx.fillStyle="#2ecc71";ctx.font="10px monospace";ctx.fillText(powStr,W/2-60,26);}
      if(gs.player.invincible>0){ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="11px monospace";ctx.fillText("INVINCIBLE",W/2-40,42);}
      if(!gs.hasCollectable){ctx.fillStyle="#f39c12";ctx.font="10px monospace";ctx.fillText("Collect the level item!",W/2-55,42);}
      if(lv.boss&&lv.boss.alive){ctx.fillStyle="#e74c3c";ctx.font="10px monospace";ctx.fillText("BOSS!",W-50,42);}

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
      if(gs.state==="win"||gs.state==="runWin"){
        ctx.fillStyle="rgba(0,0,0,0.85)";ctx.fillRect(0,0,W,H);ctx.textAlign="center";
        ctx.fillStyle="#f1c40f";ctx.font="bold 48px monospace";ctx.fillText(gs.state==="runWin"?"RUN COMPLETE!":"YOU WIN!",W/2,H/3-10);
        ctx.fillStyle="#fff";ctx.font="20px monospace";ctx.fillText(gs.state==="runWin"?"Reached level 20!":"All 100 levels conquered!",W/2,H/3+30);
        ctx.fillText(`Total Score: ${gs.totalScore}`,W/2,H/2+20);
        ctx.fillStyle="#2ecc71";ctx.font="bold 18px monospace";ctx.fillText("Press SPACE for menu",W/2,H*0.72);
        drawChar(ctx,W/2-15,H/2+40,PW,PH,gs.charIdx,true,gs.fc*0.08,true);ctx.textAlign="left";
      }
      animId=requestAnimationFrame(loop);
      } catch(e) { console.error("Game loop error:", e); animId=requestAnimationFrame(loop); }
    };
    animId=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(animId);window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[screen,initLevel,addP,hurtPlayer,runMode]);

  const press=(k)=>{gsRef.current.keys[k]=true;};
  const release=(k)=>{gsRef.current.keys[k]=false;};
  const tapSpace=()=>{window.dispatchEvent(new KeyboardEvent("keydown",{key:" "}));setTimeout(()=>window.dispatchEvent(new KeyboardEvent("keyup",{key:" "})),100);};
  const startAudio=async()=>{await audioRef.current.start();};
  const toggleSound=()=>{const on=audioRef.current.toggle();setSoundOn(on);};
  const PPG=20;const totalPg=Math.ceil(100/PPG);

  const setDiff=(d)=>{ setDifficulty(d); saveGame({...loadSave(),difficulty:d}); };
  const setOpt=(k,v)=>{ const o={...options,[k]:v}; setOptions(o); saveGame({...loadSave(),options:o}); };
  const saveOpt=()=>{ saveGame({...loadSave(),options:options}); };
  if(screen==="menu"){
    if(showOptions){
      return(<div style={getMc(options.menuTheme)}><div style={{...mi,maxWidth:480}}>
        <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:24,margin:"0 0 16px 0"}}>⚙️ OPTIONS</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20,textAlign:"left"}}>
          <label style={{fontFamily:"monospace",color:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <input type="checkbox" checked={options.practiceMode} onChange={e=>setOpt("practiceMode",e.target.checked)} />
            Practice Mode (infinite lives)
          </label>
          <label style={{fontFamily:"monospace",color:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <input type="checkbox" checked={options.hazardsOff} onChange={e=>setOpt("hazardsOff",e.target.checked)} />
            Hazards Off
          </label>
          <label style={{fontFamily:"monospace",color:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <input type="checkbox" checked={options.screenShake} onChange={e=>setOpt("screenShake",e.target.checked)} />
            Screen Shake
          </label>
          <label style={{fontFamily:"monospace",color:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <input type="checkbox" checked={options.easyBoss} onChange={e=>setOpt("easyBoss",e.target.checked)} />
            Easy Bosses
          </label>
          <div style={{fontFamily:"monospace",color:"#aaa"}}>Particle Density</div>
          <div style={{display:"flex",gap:8}}>
            {["low","medium","high"].map(p=>(<button key={p} onClick={()=>setOpt("particleDensity",p)} style={{...mb(options.particleDensity===p?"#2ecc71":"#555"),padding:"8px 12px",fontSize:12}}>{p.toUpperCase()}</button>))}
          </div>
          <div style={{fontFamily:"monospace",color:"#aaa"}}>Music Volume</div>
          <input type="range" min={0} max={100} value={(options.musicVol||1)*100} onChange={e=>setOpt("musicVol",e.target.value/100)} style={{width:"100%"}} />
          <div style={{fontFamily:"monospace",color:"#aaa"}}>SFX Volume</div>
          <input type="range" min={0} max={100} value={(options.sfxVol||1)*100} onChange={e=>setOpt("sfxVol",e.target.value/100)} style={{width:"100%"}} />
          <label style={{fontFamily:"monospace",color:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <input type="checkbox" checked={options.muteMenus} onChange={e=>setOpt("muteMenus",e.target.checked)} />
            Mute during menus
          </label>
          <div style={{fontFamily:"monospace",color:"#aaa"}}>Colorblind Mode</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["none","protanopia","deuteranopia","tritanopia"].map(c=>(<button key={c} onClick={()=>setOpt("colorblind",c)} style={{...mb(options.colorblind===c?"#2ecc71":"#555"),padding:"6px 10px",fontSize:11}}>{c.toUpperCase()}</button>))}
          </div>
          <div style={{fontFamily:"monospace",color:"#aaa"}}>Theme Override</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["auto","grassland","cave","lava","snow"].map(t=>(<button key={t} onClick={()=>setOpt("themeOverride",t)} style={{...mb(options.themeOverride===t?"#2ecc71":"#555"),padding:"6px 10px",fontSize:11}}>{t}</button>))}
          </div>
          <label style={{fontFamily:"monospace",color:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <input type="checkbox" checked={options.retroMode} onChange={e=>setOpt("retroMode",e.target.checked)} />
            Retro Mode (simpler graphics)
          </label>
          <div style={{fontFamily:"monospace",color:"#aaa"}}>Menu Theme</div>
          <div style={{display:"flex",gap:8}}>
            {["dark","light","colorful"].map(m=>(<button key={m} onClick={()=>setOpt("menuTheme",m)} style={{...mb(options.menuTheme===m?"#2ecc71":"#555"),padding:"6px 12px",fontSize:12}}>{m.toUpperCase()}</button>))}
          </div>
        </div>
        <button onClick={()=>{setShowOptions(false);saveOpt();}} style={mb("#7f8c8d")}>← Back</button>
      </div></div>);
    }
    if(showStats){
      const st=loadSave().stats||{playTime:0,deaths:0,levelsCompleted:0};
      return(<div style={getMc(options.menuTheme)}><div style={{...mi,maxWidth:400}}>
        <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:24,margin:"0 0 16px 0"}}>📊 STATISTICS</h2>
        <div style={{fontFamily:"monospace",color:"#fff",textAlign:"left",lineHeight:2}}>
          <div>Play Time: {Math.floor(st.playTime/60)}m</div>
          <div>Deaths: {st.deaths}</div>
          <div>Levels Completed: {st.levelsCompleted}</div>
          <div>Max Level: {loadSave().achievements?.maxLevel||0}</div>
          <div>Stomps: {loadSave().achievements?.stomps||0}</div>
          <div>Bosses: {loadSave().achievements?.bosses||0}</div>
        </div>
        <button onClick={()=>setShowStats(false)} style={{...mb("#7f8c8d"),marginTop:20}}>← Back</button>
      </div></div>);
    }
    if(showCredits){
      return(<div style={getMc(options.menuTheme)}><div style={{...mi,maxWidth:450}}>
        <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:24,margin:"0 0 16px 0"}}>CREDITS</h2>
        <div style={{fontFamily:"monospace",color:"#aaa",textAlign:"left",lineHeight:2}}>
          <div><strong style={{color:"#fff"}}>Ugly Platformer</strong></div>
          <div>100 levels • 6 heroes • bosses • collectables • power-ups • checkpoints</div>
          <div style={{marginTop:16}}>Built with React, Vite, Tone.js</div>
          <div>Canvas-based platformer with procedurally generated levels</div>
          <div style={{marginTop:16,color:"#666"}}>© 2025</div>
        </div>
        <button onClick={()=>setShowCredits(false)} style={{...mb("#7f8c8d"),marginTop:20}}>← Back</button>
      </div></div>);
    }
    if(showTutorial){
      return(<div style={getMc(options.menuTheme)}><div style={{...mi,maxWidth:500,textAlign:"left"}}>
        <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:24,margin:"0 0 16px 0",textAlign:"center"}}>HOW TO PLAY</h2>
        <div style={{fontFamily:"monospace",color:"#aaa",lineHeight:1.9}}>
          <div><strong style={{color:"#fff"}}>Controls:</strong> Arrow keys / WASD to move, Space to jump</div>
          <div><strong style={{color:"#fff"}}>Goal:</strong> Collect the level item (key/star/gem/crown), defeat the boss, reach the flag</div>
          <div><strong style={{color:"#fff"}}>Stomp:</strong> Jump on enemies from above to defeat them</div>
          <div><strong style={{color:"#fff"}}>Checkpoints:</strong> Touch green checkpoints to save progress</div>
          <div><strong style={{color:"#fff"}}>Power-ups:</strong> Speed, Invincibility, Projectile (Z), Magnet</div>
          <div><strong style={{color:"#fff"}}>Breakable walls:</strong> Stomp to break secret walls</div>
          <div><strong style={{color:"#e74c3c"}}>Hazards:</strong> Spikes, lava, saw blades, lasers, crushers, acid, steam, mines, thorns, electric</div>
        </div>
        <button onClick={()=>setShowTutorial(false)} style={{...mb("#7f8c8d"),marginTop:20,width:"100%"}}>← Back</button>
      </div></div>);
    }
    if(showDailyChallenge){
      const seed=getDailySeed();
      return(<div style={getMc(options.menuTheme)}><div style={mi}>
        <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:24,margin:"0 0 8px 0"}}>📅 DAILY CHALLENGE</h2>
        <p style={{fontFamily:"monospace",color:"#aaa",fontSize:14,margin:"0 0 20px 0"}}>Today's seed: {seed}</p>
        <p style={{fontFamily:"monospace",color:"#888",fontSize:12,margin:"0 0 20px 0"}}>Same level layout for everyone today. How far can you go?</p>
        <button onClick={async()=>{await startAudio();initLevel(0,selChar,false,{customSeed:seed,dailyChallenge:true});}} style={mb("#2ecc71")}>Play Daily Challenge</button>
        <button onClick={()=>setShowDailyChallenge(false)} style={mb("#7f8c8d")}>← Back</button>
      </div></div>);
    }
    if(showSeedInput){
      return(<div style={getMc(options.menuTheme)}><div style={mi}>
        <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:24,margin:"0 0 16px 0"}}>🎲 CUSTOM SEED</h2>
        <p style={{fontFamily:"monospace",color:"#aaa",fontSize:12,margin:"0 0 8px 0"}}>Enter a seed (number or text) to play a specific level layout</p>
        <input type="text" value={customSeed} onChange={e=>setCustomSeed(e.target.value)} placeholder="e.g. 12345 or ABC" style={{fontFamily:"monospace",padding:12,width:"100%",maxWidth:200,marginBottom:16,borderRadius:8,border:"2px solid #444",background:"#222",color:"#fff"}} />
        <div style={{display:"flex",gap:8,flexDirection:"column"}}>
          <button onClick={async()=>{if(customSeed.trim()){await startAudio();setScreen("playing");initLevel(0,selChar,false,{customSeed:customSeed.trim()});}}} style={mb("#2ecc71")}>Play with seed</button>
          <button onClick={()=>setShowSeedInput(false)} style={mb("#7f8c8d")}>← Back</button>
        </div>
      </div></div>);
    }
    if(showAchievements){
      const ach=loadSave().achievements||{};
      return(<div style={getMc(options.menuTheme)}><div style={{...mi,maxWidth:400}}>
        <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:24,margin:"0 0 16px 0"}}>🏆 ACHIEVEMENTS</h2>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {ACHIEVEMENTS.map(a=>{ const done=a.check(ach); return(
            <div key={a.id} style={{background:done?"#2a4a2a":"#2a2a2a",padding:"10px 14px",borderRadius:8,border:`1px solid ${done?"#2ecc71":"#444"}`}}>
              <span style={{color:done?"#2ecc71":"#888",fontSize:18,marginRight:8}}>{done?"✓":"○"}</span>
              <span style={{fontFamily:"monospace",color:done?"#fff":"#888",fontWeight:"bold"}}>{a.name}</span>
              <div style={{fontFamily:"monospace",color:"#aaa",fontSize:11,marginTop:4,marginLeft:26}}>{a.desc}</div>
            </div>
          );})}
        </div>
        <button onClick={()=>setShowAchievements(false)} style={mb("#7f8c8d")}>← Back</button>
      </div></div>);
    }
    return(<div style={getMc(options.menuTheme)}><div style={mi}>
      <h1 style={{fontFamily:"monospace",fontSize:52,color:"#e74c3c",textShadow:"3px 3px 0 #000,-1px -1px 0 #000",margin:"0 0 4px 0"}}>UGLY PLATFORMER</h1>
      <p style={{fontFamily:"monospace",color:"#f1c40f",fontSize:14,margin:"0 0 24px 0"}}>100 levels • 6 heroes • checkpoints • power-ups • achievements</p>
      <canvas ref={canvasRef} width={120} height={80} style={{display:"none"}} />
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:"monospace",color:"#aaa",fontSize:12,marginBottom:6}}>Difficulty</div>
        <div style={{display:"flex",gap:8}}>
          {["easy","normal","hard"].map(d=>(<button key={d} onClick={()=>setDiff(d)} style={{...mb(difficulty===d?"#2ecc71":"#555"),padding:"8px 16px",fontSize:14}}>{d.toUpperCase()}</button>))}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,width:280}}>
        <button onClick={async()=>{await startAudio();setScreen("charSelect");setRunMode(false);}} style={mb("#e74c3c")}>🎮 START GAME</button>
        <button onClick={async()=>{await startAudio();setScreen("charSelect");setRunMode(true);}} style={mb("#9b59b6")}>🏃 RUN (reach Lv 20)</button>
        <button onClick={async()=>{await startAudio();setScreen("levelSelect");setLevelPage(0);}} style={mb("#3498db")}>📋 LEVEL SELECT</button>
        <button onClick={()=>setShowDailyChallenge(true)} style={mb("#1abc9c")}>📅 Daily Challenge</button>
        <button onClick={()=>setShowSeedInput(true)} style={mb("#8e44ad")}>🎲 Custom Seed</button>
        <button onClick={()=>setShowAchievements(true)} style={mb("#f39c12")}>🏆 Achievements</button>
        <button onClick={()=>setShowStats(true)} style={mb("#95a5a6")}>📊 Statistics</button>
        <button onClick={()=>setShowOptions(true)} style={mb("#7f8c8d")}>⚙️ Options</button>
        <button onClick={()=>setShowCredits(true)} style={mb("#555")}>Credits</button>
        <button onClick={()=>setShowTutorial(true)} style={mb("#555")}>❓ How to Play</button>
        <button onClick={toggleSound} style={mb("#555")}>{soundOn?"🔊 Sound ON":"🔇 Sound OFF"}</button>
      </div>
      <p style={{fontFamily:"monospace",color:"#666",fontSize:11,marginTop:20}}>Arrow keys / WASD + Space to jump • Stomp enemies from above</p>
      <div style={{fontFamily:"monospace",color:"#555",fontSize:10,marginTop:8,lineHeight:1.6}}>
        <span style={{color:"#e74c3c"}}>⚠ Hazards:</span> Spikes, Lava, Saw Blades, Wind Zones, Falling Platforms<br/>
        <span style={{color:"#f39c12"}}>👾 Enemies:</span> Walkers, Speedsters, Flyers, Jumpers, Chargers, Slimes, Tanks, Turrets<br/>
        <span style={{color:"#9b59b6"}}> Collect level item + defeat boss → reach flag</span>
      </div>
    </div></div>);
  }

  if(screen==="charSelect"){
    return(<div style={getMc(options.menuTheme)}><div style={mi}>
      <h2 style={{fontFamily:"monospace",color:"#f1c40f",fontSize:28,margin:"0 0 20px 0",textShadow:"2px 2px 0 #000"}}>CHOOSE YOUR UGLY</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {CHARS.map((ch,i)=>(<button key={i} onClick={()=>setSelChar(i)} style={{background:selChar===i?"#444":"#222",border:selChar===i?"3px solid #f1c40f":"3px solid #333",borderRadius:12,padding:"14px 8px",cursor:"pointer",transition:"all 0.15s"}}>
          <CP ci={i} />
          <div style={{fontFamily:"monospace",color:selChar===i?"#f1c40f":"#aaa",fontSize:11,marginTop:6,fontWeight:"bold"}}>{ch.name}</div>
          <div style={{fontFamily:"monospace",color:"#2ecc71",fontSize:8,marginTop:2}}>Ability: {ch.ability}</div>
          <div style={{fontFamily:"monospace",color:"#666",fontSize:9,marginTop:1}}>{ch.desc}</div>
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
    return(<div style={getMc(options.menuTheme)}><div style={{...mi,maxWidth:700}}>
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

  const [fullscreen,setFullscreen] = useState(false);
  const toggleFullscreen = useCallback(()=>{
    if(!document.fullscreenElement){ canvasRef.current?.requestFullscreen?.(); setFullscreen(true); }
    else{ document.exitFullscreen?.(); setFullscreen(false); }
  },[]);
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",background:"#0a0a1a",minHeight:"100vh",padding:"4px 0"}}>
    <canvas ref={canvasRef} width={CW} height={CH} style={{border:"3px solid #333",borderRadius:8,maxWidth:"100%",background:"#000"}} tabIndex={0} />
    <div style={{display:"flex",gap:10,marginTop:8,userSelect:"none",flexWrap:"wrap"}}>
      <button onPointerDown={()=>press("ArrowLeft")} onPointerUp={()=>release("ArrowLeft")} onPointerLeave={()=>release("ArrowLeft")} style={cb}>◀</button>
      <button onPointerDown={()=>press("ArrowRight")} onPointerUp={()=>release("ArrowRight")} onPointerLeave={()=>release("ArrowRight")} style={cb}>▶</button>
      <div style={{width:16}} />
      <button onPointerDown={()=>tapSpace()} style={{...cb,width:90,background:"#c0392b"}}>JUMP</button>
      <button onClick={()=>{audioRef.current.stopMusic();setScreen("menu");}} style={{...cb,width:70,background:"#555",fontSize:12}}>MENU</button>
      <button onClick={toggleFullscreen} style={{...cb,width:50,background:"#333",fontSize:14}} title="Fullscreen">{fullscreen?"⤢":"⛶"}</button>
      <button onClick={toggleSound} style={{...cb,width:50,background:"#333",fontSize:16}}>{soundOn?"🔊":"🔇"}</button>
    </div>
  </div>);
}

function CP({ci}){const ref=useRef(null);useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext("2d");ctx.clearRect(0,0,60,70);drawChar(ctx,15,12,PW,PH,ci,true,0,false,1);},[ci]);return<canvas ref={ref} width={60} height={70} style={{imageRendering:"auto"}} />;}

const getMc=(menuTheme="dark")=>{
  const bgs={dark:"linear-gradient(180deg,#0a0a2e 0%,#1a1a3e 100%)",light:"linear-gradient(180deg,#e8e8f0 0%,#d0d0e0 100%)",colorful:"linear-gradient(180deg,#2e1a4a 0%,#1a3a5a 50%,#1a4a3a 100%)"};
  return {display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:bgs[menuTheme]||bgs.dark,padding:20};
};
const mc=getMc();
const mi={textAlign:"center",maxWidth:520};
const mb=(bg)=>({fontFamily:"monospace",fontSize:16,fontWeight:"bold",color:"#fff",background:bg,border:"none",borderRadius:10,padding:"14px 24px",cursor:"pointer",transition:"all 0.15s",width:"100%"});
const cb={width:56,height:56,fontSize:22,border:"none",borderRadius:10,background:"#2c2c3e",color:"#fff",cursor:"pointer",fontWeight:"bold",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none"};
