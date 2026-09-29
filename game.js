(() => {
'use strict';
const T=window.GAME_CONTENT, $=s=>document.querySelector(s), canvas=$('#scene'), ctx=canvas.getContext('2d');
const ui={overlay:$('#overlay'),message:$('#message'),next:$('#next'),controls:$('#controls'),progress:$('#progress'),stage:$('#stageName'),sub:$('#subStatus'),help:$('#help'),hint:$('#actionHint')};
const KEY='busan-bonus-v1', SETTINGS='busan-bonus-audio';
const fresh=()=>({version:1,stage:1,phase:'opening',pieces:[],seaTalk:false,shells:[],coins:[],wins:0,failStreak:0,attempts:0,key:false,placed:[],p:{x:38,y:208},checkpoint:0});
let state=fresh(), saved=null, storageOK=true, muted=false;
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.version===1&&Array.isArray(s.pieces)&&s.stage>=1&&s.stage<=4)saved=s;muted=localStorage.getItem(SETTINGS)==='off';}catch(e){storageOK=false;}
let mode='title', dialog=[], afterDialog=null, keys=new Set(), vy=0,grounded=false, camera=0,lastTime=0,time=0,selected=null,flipAt=0,toastUntil=0, gaugeStart=0,gaugeRendered=0,gaugeFrozen=null,gaugePause=0,lastSave=0,resetModal=false, audio=null;
let autoTarget=null, autoCooldown=0, endingStarted=0, musicTrack=-1, musicStep=0, musicNext=0;
let dialogContext=null, gaugeElapsed=0, lastHitSuccessful=false, lastActionPointer=-Infinity, musicHoldUntil=0;
const fmt=(s,n)=>s.replace('{n}',n), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));saved=JSON.parse(JSON.stringify(state));}catch(e){storageOK=false;}}
function tone(kind='tap'){if(!audio||muted)return;const now=audio.currentTime;const seq=kind==='reward'?[523,659,784,1047]:kind==='coin'?[740,1108]:kind==='bad'?[180,120]:[440];seq.forEach((f,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='square';osc.frequency.value=f;gain.gain.setValueAtTime(.035,now+i*.09);gain.gain.exponentialRampToValueAtTime(.001,now+i*.09+.13);osc.connect(gain);gain.connect(audio.destination);osc.start(now+i*.09);osc.stop(now+i*.09+.14);});}
function unlockAudio(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended'){audio.resume();musicNext=0;}}catch(e){}}
document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);
// Original major-key chiptune phrases: lead, soft bass and a plucked accompaniment.
const melodies=[
 [72,76,79,84,83,79,76,0,77,81,84,81,79,76,74,0,72,76,79,84,86,84,79,76,77,76,74,71,72,0,79,0],
 [72,76,79,76,74,77,81,0,76,79,84,83,81,79,76,0,77,81,84,81,79,76,74,0,72,74,76,79,76,74,72,0],
 [76,79,84,0,79,84,86,84,81,84,88,0,86,84,81,79,77,81,84,0,81,79,77,76,74,77,79,83,84,0,79,0],
 [79,76,79,84,79,76,74,0,77,74,77,81,77,74,72,0,76,79,84,86,84,79,76,0,77,76,74,71,72,0,76,0],
 [72,76,79,0,76,79,84,0,81,79,77,76,74,76,77,0,76,79,84,0,83,81,79,76,77,76,74,71,72,0,0,0],
 [72,76,79,84,88,84,79,0,77,81,84,89,88,84,81,0,79,84,88,91,89,88,86,84,81,79,77,74,72,0,84,0]
];
const musicVoices=new Set();
function musicNote(midi,start,duration,volume,type='triangle'){
 if(!midi)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);
 gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.009);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 osc.connect(gain);gain.connect(audio.destination);musicVoices.add(osc);osc.onended=()=>{musicVoices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+duration+.01);
}
function stopMusic(){for(const osc of musicVoices){try{osc.stop();}catch(e){}}musicVoices.clear();musicNext=0;musicHoldUntil=0;}
function stageSuccessMusic(){
 if(!audio||muted||audio.state!=='running')return;
 stopMusic();const start=audio.currentTime;
 [72,76,79,84,79,84,88].forEach((note,i)=>musicNote(note,start+i*.14,i===6?.55:.12,.027));
 [60,64,67,72].forEach(note=>musicNote(note,start+.84,.55,.009));
 musicHoldUntil=start+1.5;
}
function celebrationMusic(){
 if(!audio||muted||audio.state!=='running')return;
 stopMusic();const start=audio.currentTime;
 const melody=[72,76,79,84,0,84,86,88,91,88,91,96];
 melody.forEach((note,i)=>musicNote(note,start+i*.13,i===11?.85:.17,.045,'square'));
 [[60,64,67],[65,69,72],[67,71,74],[60,64,67,72]].forEach((chord,i)=>{
  chord.forEach(note=>musicNote(note,start+i*.52,.48,.018));
  musicNote(i===3?36:48,start+i*.52,.25,.06,'triangle');
 });
 [84,88,91,96,91,96].forEach((note,i)=>musicNote(note,start+2.1+i*.1,.24,.024));
 musicHoldUntil=start+3;
}
function updateBgm(){
 if(!audio||muted||audio.state!=='running'||audio.currentTime<musicHoldUntil)return;
 const track=mode==='title'?0:mode==='ending'?5:Math.max(1,Math.min(4,state.stage));
 if(track!==musicTrack){musicTrack=track;musicStep=0;musicNext=audio.currentTime;}
 if(audio.currentTime<musicNext)return;
 const beat=60/[124,116,136,128,120,140][track]/2,step=musicStep++%32,start=audio.currentTime;
 const root=[48,53,55,48][Math.floor(step/8)];
 musicNote(melodies[track][step],start,beat*.72,.019);
 if(step%4===0)musicNote(root,start,beat*1.4,.013);
 if(step%2===1)musicNote(root+12+[0,4,7,4][Math.floor(step/2)%4],start,beat*.55,.006,'square');
 musicNext=start+beat;
}
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';toastUntil=time+2;}
function text(s,context=null){
 const value=s||'',who=value.startsWith(T.names.daeun+':')?'daeun':value.startsWith(T.names.munseok+':')?'munseok':context?.speaker||(mode==='play'?'munseok':'system');
 $('#dialog').dataset.speaker=who;$('#speaker').textContent=[T.names[who],context?.object].filter(Boolean).join(' · ');ui.message.textContent=value;
}
function say(lines,done,context=null){keys.clear();dialogContext=context;dialog=Array.isArray(lines)?[...lines]:[lines];afterDialog=done||null;text(dialog[0],dialogContext);ui.next.classList.remove('hidden');ui.help.textContent=T.general.next;}
function advance(){if(!dialog.length)return;dialog.shift();tone();if(dialog.length){text(dialog[0],dialogContext);return;}const f=afterDialog;afterDialog=null;dialogContext=null;ui.next.classList.add('hidden');if(f)f();else refresh();}
function button(label,handler,cls='primary'){const b=document.createElement('button');b.textContent=label;b.className=cls;b.onclick=handler;return b;}
function clearOverlay(){ui.overlay.replaceChildren();}
function card(cls='center-card'){clearOverlay();const el=document.createElement('div');el.className=cls;ui.overlay.append(el);return el;}
function para(parent,value,tag='p'){const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;}
function updateHeader(){ui.progress.textContent=fmt(T.progress,mode==='title'?0:state.pieces.length);ui.stage.textContent=mode==='title'?T.edition:`STAGE ${state.stage} / ${T.stages[state.stage-1]}`;ui.sub.textContent=state.stage===2&&mode!=='title'?fmt(T.harbor.coin,state.coins.length):state.stage===3&&mode!=='title'?fmt(T.train.attempts,state.wins):state.stage===4&&state.key?T.home.key:'';$('#mute').textContent=muted?T.mute:T.unmute;$('#mute').setAttribute('aria-pressed',String(muted));$('#reset').textContent=T.reset;}
function showTitle(){mode='title';dialog=[];clearOverlay();const el=card('title-card');para(el,T.edition,'span').className='eyebrow';para(el,T.title,'h1');para(el,T.subtitle,'h2');if(saved)el.append(button(T.continue,()=>begin(true)));el.append(button(T.start,()=>saved?confirmReset():begin(false)));ui.controls.classList.add('hidden');ui.next.classList.add('hidden');text('');ui.help.textContent=T.general.saved;$('#game').dataset.mode=mode;updateHeader();}
function begin(resume){tone();state=resume?JSON.parse(JSON.stringify(saved)):fresh();if(state.phase==='book'){state.phase='play';state.seaTalk=true;}mode=state.phase;clearOverlay();if(state.phase==='opening'){save();say(T.opening,()=>{state.phase='play';mode='play';save();say(T.sea.start);refresh(false);});refresh(false);}else{if(state.stage===3&&state.wins===2&&!state.pieces.includes(3)){state.pieces.push(3);state.phase='depart';save();}if(state.phase==='train'){gaugeStart=time;gaugeFrozen=null;gaugeElapsed=0;gaugeRendered=0;lastHitSuccessful=false;}if(state.phase==='ending')endingStarted=time;refresh();}}
function refresh(changeText=true){mode=state.phase;updateHeader();clearOverlay();ui.controls.classList.remove('hidden','disabled-pad');ui.help.textContent=storageOK?T.general.explore:T.general.storageError;ui.hint.textContent=T.general.interact;
 $('#game').dataset.mode=mode;
 if(mode==='opening'){ui.controls.classList.add('disabled-pad');}
 if(mode==='play'){if(changeText&&!dialog.length)text(hint());if(state.stage===2){const route=document.createElement('div');route.className='route-banner';route.textContent=T.harbor.direction;ui.overlay.append(route);}}
 if(mode==='train'){buildGauge();ui.controls.classList.add('disabled-pad');ui.hint.textContent=T.general.timing;ui.help.textContent=T.train.instruction;if(changeText&&!dialog.length)text(T.train.instruction);}
 if(mode==='depart'){const el=card();para(el,T.train.next,'h2');el.append(button(T.continue,()=>enterStage(4)));ui.controls.classList.add('hidden');if(changeText&&!dialog.length)text(T.train.next);}
 if(mode==='ready'){const el=card();const p=document.createElement('div');p.className='piece-icon';el.append(p);para(el,T.allPieces,'h2');el.append(button(T.puzzle.start,()=>{state.phase='puzzle';state.p={x:215,y:225};save();refresh();}));ui.controls.classList.add('hidden');if(changeText&&!dialog.length)text(T.allPieces);}
 if(mode==='puzzle'){buildPuzzle();ui.controls.classList.add('hidden');ui.help.textContent=T.puzzle.hint;if(changeText)text(T.puzzle.instruction);}
 if(mode==='reveal'){buildReward();ui.controls.classList.add('hidden');ui.help.textContent=T.general.saved;if(changeText)text(T.rewardName);}
 if(mode==='ending'){endingStarted=time;const el=card('center-card ending-card');para(el,T.endLabel,'h2');para(el,T.ending);ui.controls.classList.add('hidden');ui.help.textContent=T.general.saved;if(changeText)text(T.ending);}
 if(dialog.length){text(dialog[0],dialogContext);ui.next.classList.remove('hidden');ui.help.textContent=T.general.next;}else ui.next.classList.add('hidden');
}
function hint(){if(state.stage===1)return state.pieces.includes(1)?T.sea.exit:state.seaTalk?T.sea.clue:T.sea.start;if(state.stage===2)return state.pieces.includes(2)?T.harbor.exit:T.harbor.hint;if(state.stage===3)return T.train.instruction;return T.home.start;}
function enterStage(n){if(n!==state.stage+1||!state.pieces.includes(state.stage))return;state.stage=n;state.phase=n===3?'train':'play';state.p=n===4?{x:128,y:215}:n===2?{x:24,y:214}:{x:110,y:142};vy=0;grounded=false;keys.clear();autoTarget=null;musicTrack=-1;gaugeStart=time;gaugeFrozen=null;gaugeElapsed=0;gaugeRendered=0;lastHitSuccessful=false;gaugePause=0;save();refresh();tone();say(n===2?T.harbor.start:n===3?[T.train.start,T.train.instruction]:T.home.start);}
function award(n,done){if(state.stage!==n||state.pieces.length!==n-1)return;state.pieces.push(n);if(n===4)state.phase='ready';if(n===3)state.phase='depart';save();updateHeader();stageSuccessMusic();const el=card();const p=document.createElement('div');p.className='piece-icon';el.append(p);para(el,fmt(T.acquired,n),'h2');para(el,T.general.acquiredHint);say(fmt(T.acquired,n),()=>{clearOverlay();if(done)done();else refresh();});}
const objects={1:[{id:'daeun',x:178,y:152,r:30},{id:'shell0',x:44,y:158,r:24},{id:'shell1',x:111,y:215,r:24},{id:'shell2',x:220,y:198,r:24},{id:'exit',x:240,y:125,r:24}],4:[{id:'desk',x:216,y:194,r:34},{id:'sofa',x:48,y:146,r:32},{id:'fridge',x:222,y:77,r:32},{id:'table',x:134,y:153,r:31},{id:'drawer',x:160,y:77,r:30},{id:'box',x:63,y:83,r:28}]};
function nearest(){let list=state.stage===2?[{id:'chest',x:652,y:214,r:29},{id:'exit',x:708,y:214,r:25}]:objects[state.stage]||[];return list.map(o=>({...o,d:Math.hypot(o.x-state.p.x,o.y-state.p.y)})).filter(o=>o.d<o.r).sort((a,b)=>a.d-b.d)[0];}
function act(){if(resetModal)return;if(dialog.length){advance();return;}if(mode==='train'){hitGauge();return;}if(mode!=='play')return;const o=nearest();if(!o){toast(T.general.noTarget);return;}interact(o);}
function interact(o){tone();
 if(state.stage===1){if(o.id==='daeun'){if(state.seaTalk)say(T.sea.clue);else{state.seaTalk=true;save();say([T.sea.greeting,T.sea.clue]);}}else if(o.id.startsWith('shell')){if(!state.seaTalk){say(T.sea.beforeTalk);return;}const i=Number(o.id.slice(-1));if(i===2&&state.pieces.includes(1)){say(T.sea.found);return;}if(!state.shells.includes(i))state.shells.push(i);save();say(T.sea.shells[i],i===2?()=>award(1):undefined);}else if(o.id==='exit'){if(state.pieces.includes(1))enterStage(2);else say(T.sea.exitLocked);}}
 if(state.stage===2){if(o.id==='chest'){if(state.pieces.includes(2))say(T.harbor.exit);else if(state.coins.length<3)say(T.harbor.missing);else say(T.harbor.open,()=>award(2));}else if(o.id==='exit'){if(state.pieces.includes(2))enterStage(3);else say(T.harbor.locked);}}
 if(state.stage===4){const context={speaker:'object',object:T.names[o.id]};if(o.id==='drawer'){if(state.key)say(T.home.drawerEmpty,null,context);else{state.key=true;save();updateHeader();say(T.home.drawer,null,context);}}else if(o.id==='box'){if(!state.key)say(T.home.locked,null,context);else if(!state.pieces.includes(4))say(T.home.open,()=>award(4),context);}else say(T.home[o.id],null,context);}
}
function autoInteract(){
 if(mode!=='play'||dialog.length||time<autoCooldown)return;
 const o=nearest();
 if(!o){autoTarget=null;return;}
 if(o.id===autoTarget)return;
 autoTarget=o.id;autoCooldown=time+.45;interact(o);
}
function buildGauge(){const el=card('train-panel');para(el,T.train.label,'h2');const bar=document.createElement('div');bar.className='gauge';bar.setAttribute('role','meter');bar.setAttribute('aria-label',T.train.label);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');const target=document.createElement('div');target.className='target';const needle=document.createElement('div');needle.className='needle';bar.append(target,needle);el.append(bar);const labels=document.createElement('div');labels.className='gauge-labels';para(labels,'0%','span');para(labels,T.train.target,'span');el.append(labels);para(el,'0%','div').className='gauge-read';}
function gaugeValue(t){const wave=(t*.78)%2;return wave<=1?wave:2-wave;}
function threshold(){return .98;}
function restartGauge(){gaugeFrozen=null;gaugeRendered=0;gaugeElapsed=0;lastHitSuccessful=false;refresh();}
function hitGauge(){if(mode!=='train'||dialog.length||gaugeFrozen!==null||state.wins>=2)return;const value=gaugeRendered;state.attempts++;gaugeFrozen=value;lastHitSuccessful=value>=threshold();if(lastHitSuccessful){state.wins++;state.failStreak=0;tone('coin');save();updateHeader();if(state.wins===2){say([T.train.success[1],T.train.complete],()=>award(3));}else say(T.train.success[0],restartGauge);}else{state.failStreak++;tone('bad');save();say(T.train.fail,restartGauge);}}
const pieceOrder=[2,0,3,1];
function piecePath(c,id,scale=1){const x=10,y=10,w=56,h=56; c.beginPath();c.moveTo(x,y); // complementary square tabs, identical patterned backs
 c.lineTo(x+20,y);if(id>=2){c.lineTo(x+20,y-7);c.lineTo(x+34,y-7);c.lineTo(x+34,y);}c.lineTo(x+w,y);
 c.lineTo(x+w,y+20);if(id%2===0){c.lineTo(x+w+7,y+20);c.lineTo(x+w+7,y+34);c.lineTo(x+w,y+34);}else{c.lineTo(x+w,y+34);}c.lineTo(x+w,y+h);
 c.lineTo(x+34,y+h);if(id<2){c.lineTo(x+34,y+h-7);c.lineTo(x+20,y+h-7);c.lineTo(x+20,y+h);}c.lineTo(x,y+h);
 c.lineTo(x,y+34);if(id%2===1){c.lineTo(x+7,y+34);c.lineTo(x+7,y+20);c.lineTo(x,y+20);}c.closePath();}
function drawPiece(c,id,filled){c.clearRect(0,0,76,76);c.save();piecePath(c,id);c.fillStyle=filled?'#687db3':'#29374e';c.fill();c.clip();if(filled){for(let y=0;y<76;y+=6)for(let x=0;x<76;x+=6){c.fillStyle=(x/6+y/6)%2?'#8196c8':'#687db3';c.fillRect(x,y,6,6);}c.fillStyle='#d9e1ee';c.fillRect(29,28,18,4);c.fillRect(40,31,7,8);c.fillRect(34,37,7,6);c.fillRect(34,47,7,5);}c.restore();piecePath(c,id);c.lineWidth=3;c.strokeStyle=filled?'#10131d':'#a8b9d4';c.stroke();}
function pieceCanvas(id,filled){const c=document.createElement('canvas');c.width=76;c.height=76;drawPiece(c.getContext('2d'),id,filled);return c;}
function buildPuzzle(){const el=card('puzzle-panel');para(el,T.puzzle.instruction,'h2');const board=document.createElement('div');board.className='puzzle-board';for(let i=0;i<4;i++){const b=button('',()=>place(i),'puzzle-slot');b.dataset.slot=i;b.setAttribute('aria-label',fmt(T.puzzle.slot,i+1));b.append(pieceCanvas(i,state.placed.includes(i)));board.append(b);}el.append(board);const tray=document.createElement('div');tray.className='puzzle-pieces';for(const id of pieceOrder){const b=button('',()=>selectPiece(id),'puzzle-piece');b.dataset.piece=id;b.setAttribute('aria-label',fmt(T.puzzle.piece,id+1));b.setAttribute('aria-pressed',String(selected===id));b.classList.toggle('used',state.placed.includes(id));b.classList.toggle('selected',selected===id);b.append(pieceCanvas(id,true));attachDrag(b,id);tray.append(b);}el.append(tray);para(el,fmt(T.puzzle.count,state.placed.length),'small');}
function selectPiece(id){if(mode!=='puzzle'||state.placed.includes(id)||flipAt)return;selected=id;tone();buildPuzzle();text(T.puzzle.selected);}
function place(slot){if(mode!=='puzzle'||selected===null||state.placed.includes(slot)||flipAt)return;if(selected!==slot){selected=null;tone('bad');toast(T.puzzle.wrong);buildPuzzle();text(T.puzzle.instruction);return;}state.placed.push(slot);selected=null;save();tone('coin');buildPuzzle();if(state.placed.length===4){flipAt=time;$('.puzzle-board').classList.add('flipping');text(T.general.loading);state.phase='reveal';save();}else toast(T.puzzle.correct);}
function attachDrag(b,id){let start=null,ghost=null,moved=false;b.addEventListener('pointerdown',e=>{if(state.placed.includes(id)||flipAt)return;start={x:e.clientX,y:e.clientY};moved=false;if(e.isTrusted)b.setPointerCapture(e.pointerId);});b.addEventListener('pointermove',e=>{if(!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>8&&!ghost){moved=true;ghost=pieceCanvas(id,true);ghost.className='drag-ghost';document.body.append(ghost);}if(ghost){ghost.style.left=(e.clientX-36)+'px';ghost.style.top=(e.clientY-36)+'px';}});b.addEventListener('pointerup',e=>{if(!start)return;start=null;if(ghost){ghost.remove();ghost=null;selected=id;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(target)place(Number(target.dataset.slot));else{selected=null;buildPuzzle();}}});b.addEventListener('click',e=>{if(moved){e.stopImmediatePropagation();e.preventDefault();moved=false;}},true);b.addEventListener('pointercancel',()=>{start=null;ghost?.remove();ghost=null;});}
function buildReward(){const el=card('reward-card');para(el,T.rewardTitle,'h2');const c=document.createElement('canvas');c.width=160;c.height=100;c.setAttribute('aria-label',T.accessibility.reward);rewardArt(c.getContext('2d'),0,0,1);el.append(c);para(el,T.rewardName);el.append(button(T.claim,()=>{state.phase='ending';endingStarted=time;musicTrack=-1;save();tone('reward');refresh();}));}
function confirmReset(){if(resetModal)return;keys.clear();resetModal=true;const bg=document.createElement('div');bg.className='modal-backdrop';const el=document.createElement('div');el.className='center-card';para(el,T.resetQuestion);el.append(button(T.yes,()=>{bg.remove();resetModal=false;saved=null;state=fresh();selected=null;flipAt=0;dialog=[];afterDialog=null;try{localStorage.removeItem(KEY);}catch(e){}begin(false);}));el.append(button(T.no,()=>{bg.remove();resetModal=false;}));bg.append(el);$('#game').append(bg);el.querySelector('button:last-child').focus();}
$('#reset').onclick=confirmReset;$('#mute').onclick=()=>{muted=!muted;if(muted)stopMusic();try{localStorage.setItem(SETTINGS,muted?'off':'on');}catch(e){}updateHeader();if(!muted)tone();};ui.next.onclick=advance;
$('#dialog').addEventListener('click',e=>{if(e.target!==ui.next&&dialog.length)advance();});
$('#action').addEventListener('pointerdown',e=>{e.preventDefault();lastActionPointer=performance.now();unlockAudio();act();});$('#action').addEventListener('click',e=>{if(e.detail===0&&performance.now()-lastActionPointer>350)act();});
function direction(dir){if(mode!=='play'||dialog.length||resetModal)return;if(dir==='up'&&state.stage===2){if(grounded){vy=-222;grounded=false;tone();}}else keys.add(dir);}
for(const b of document.querySelectorAll('[data-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(e.isTrusted)b.setPointerCapture(e.pointerId);b.classList.add('pressed');direction(b.dataset.dir);});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>{keys.delete(b.dataset.dir);b.classList.remove('pressed');if(mode==='play')save();});}
const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
document.addEventListener('keydown',e=>{if(e.target.closest('button')&&(e.code==='Space'||e.code==='Enter'))return;if(keyMap[e.key]){e.preventDefault();if(!e.repeat)direction(keyMap[e.key]);}if(['Space','KeyA','KeyZ','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)act();}});document.addEventListener('keyup',e=>{keys.delete(keyMap[e.key]);if(mode==='play')save();});window.addEventListener('blur',()=>{keys.clear();saveIfPlaying();});document.addEventListener('visibilitychange',()=>{keys.clear();saveIfPlaying();});window.addEventListener('pagehide',saveIfPlaying);
function saveIfPlaying(){if(mode!=='title')save();}
const platforms=[{x:0,y:214,w:183},{x:212,y:214,w:190},{x:431,y:214,w:301},{x:80,y:182,w:45},{x:145,y:151,w:44},{x:259,y:181,w:46},{x:326,y:150,w:44},{x:480,y:180,w:46},{x:547,y:149,w:44}];
const coinPositions=[{x:167,y:125},{x:348,y:124},{x:569,y:123}];
const blocks=[{x:20,y:62,w:82,h:24},{x:199,y:48,w:39,h:35},{x:139,y:55,w:40,h:24},{x:20,y:115,w:61,h:29},{x:109,y:122,w:47,h:31},{x:195,y:172,w:38,h:23}];
function blocked(x,y){return state.stage===4&&blocks.some(b=>x>b.x-6&&x<b.x+b.w+6&&y>b.y-3&&y<b.y+b.h+5);}
function move(dt){const p=state.p;let dx=(keys.has('right')?1:0)-(keys.has('left')?1:0),dy=(keys.has('down')?1:0)-(keys.has('up')?1:0);if(state.stage===2){p.x=clamp(p.x+dx*70*dt,8,724);const oldY=p.y;vy+=490*dt;p.y+=vy*dt;grounded=false;for(const b of platforms){if(p.x>b.x-4&&p.x<b.x+b.w+4&&oldY<=b.y+.8&&p.y>=b.y&&vy>=0){p.y=b.y;vy=0;grounded=true;break;}}if(grounded&&p.y===214)state.checkpoint=p.x<183?0:p.x<402?1:2;if(p.y>258){p.x=[30,226,445][state.checkpoint];p.y=214;vy=0;grounded=true;toast(T.harbor.retry);save();}coinPositions.forEach((c,i)=>{if(!state.coins.includes(i)&&Math.hypot(p.x-c.x,p.y-16-c.y)<16){state.coins.push(i);save();tone('coin');toast(fmt(T.harbor.coin,state.coins.length));updateHeader();}});camera=clamp(p.x-100,0,476);
 }else{const norm=dx&&dy?Math.SQRT1_2:1, speed=53;const nx=clamp(p.x+dx*speed*dt*norm,12,244),ny=clamp(p.y+dy*speed*dt*norm,state.stage===1?121:66,228);if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;}
 if(time-lastSave>1&&(dx||dy||vy)){save();lastSave=time;}}
// All scenes and sprites are drawn on a low-resolution canvas. No external images or asset requests.
const C={ink:'#10131d',sky:'#142446',water:'#153c67',blue:'#2b6190',light:'#5c9cbd',cream:'#fff1ce',gold:'#ffd36b',skin:'#efbb93',skinShade:'#c78268',wood:'#945a41',woodLight:'#c58a5b'};
function rect(x,y,w,h,color,c=ctx){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
function box(x,y,w,h,color,border=2,c=ctx){rect(x,y,w,h,C.ink,c);rect(x+border,y+border,w-border*2,h-border*2,color,c);}
function line(x,y,w,color){rect(x,y,w,1,color);}
function star(x,y,color=C.gold,c=ctx){rect(x+2,y,2,6,color,c);rect(x,y+2,6,2,color,c);}
function sprite(x,y,bride=false,walking=false,celebrate=false){x=Math.round(x)-12;y=Math.round(y)-34;const step=walking?Math.floor(time*8)%2:0;rect(x-1,y+33,27,3,'#10131d55');if(bride){rect(x+2,y+2,22,28,C.ink);rect(x+4,y+4,18,28,'#4b3032');rect(x+1,y+11,5,19,'#d4d9e5');rect(x+6,y+3,17,3,'#fff4d9');rect(x+5,y+6,14,15,C.skin);rect(x+7,y+4,14,4,'#463235');rect(x+17,y+6,5,17,'#463235');rect(x+9,y+11,2,4,C.ink);rect(x+15,y+11,2,4,C.ink);rect(x+7,y+21,12,6,C.cream);rect(x+5,y+26,17,4,'#fffaf0');rect(x+2,y+30,23,5,'#fffaf0');rect(x+5,y+32,2,3,'#b4c3d7');rect(x+18,y+29,2,6,'#b4c3d7');if(celebrate){const clap=Math.floor(time*7)%2;rect(x-1-clap*3,y+19-clap*3,5,4,C.skin);rect(x+22+clap*3,y+19-clap*3,5,4,C.skin);rect(x+2,y+21,4,3,'#fffaf0');rect(x+20,y+21,4,3,'#fffaf0');}else{box(x-7,y+19,17,17,'#fffaf0');rect(x-5,y+22,2,10,'#9ca9ba');}star(x+18,y+3,'#fffaf0');return;}
 // Short, near-black hair; rounded face, large ears; black outfit and brown shoes.
 rect(x+4,y,16,2,C.ink);rect(x+1,y+2,22,17,C.ink);rect(x-3,y+10,6,9,C.ink);rect(x+21,y+10,6,9,C.ink);rect(x-1,y+12,5,5,C.skin);rect(x+21,y+12,4,5,C.skin);rect(x+3,y+6,18,14,C.skin);rect(x+5,y+20,14,2,C.skinShade);rect(x+3,y+3,18,5,'#201e24');rect(x+6,y+2,12,2,'#353037');rect(x+3,y+7,3,3,'#201e24');rect(x+18,y+7,3,3,'#201e24');rect(x+7,y+11,3,5,C.ink);rect(x+16,y+11,3,5,C.ink);rect(x+11,y+18,4,1,'#a96253');rect(x+3,y+21,18,11,C.ink);rect(x+7,y+22,10,8,'#23252c');rect(x+1,y+24,4,6,C.skin);rect(x+20,y+24,4,6,C.skin);rect(x+5,y+30,7,5,C.ink);rect(x+14,y+30,7,5,C.ink);rect(x+3,y+33-step,9,4,'#815336');rect(x+14,y+33+step,10,4,'#815336');rect(x+3,y+36-step,9,1,'#d2ae77');rect(x+14,y+36+step,10,1,'#d2ae77');}
function seaBackground(day=false,offset=0){rect(-32,0,320,240,day?'#6eb4d7':C.sky);if(!day){for(let i=0;i<22;i++){const x=(i*47+15)%320-32,y=(i*19+8)%82;rect(x,y,2,2,i%3?'#718fae':'#ffe3a0');if(i%7===0)star(x,y,'#91a9c5');}rect(208,15,17,22,'#ffdf88');rect(203,19,22,14,'#ffdf88');rect(202,14,14,16,C.sky);}else{for(let i=0;i<3;i++){const x=((i*103-offset*.2)%310+310)%310-40;rect(x,20+i*17,32,7,'#dceff2');rect(x+8,14+i*17,14,7,'#dceff2');}}rect(-32,89,320,83,day?'#3284b6':'#173b66');rect(0,90,80,8,'#192c43');for(let i=0;i<8;i++)rect(i*10,77+(i%3)*4,12,14,'#192c43');rect(46,53,7,37,'#304864');rect(44,55,11,5,'#eed897');rect(47,46,5,7,'#142438');rect(43,61,13,3,'#152941');for(let i=0;i<60;i++){const x=(i*39+Math.floor(time*(i%2?3:-2))+1024)%256,y=99+(i*17)%69;rect(x,y,4+i%9,2,i%4===0?'#5691b0':'#24547d');}if(!day)for(let i=0;i<8;i++)rect(193-i*3+Math.sin(i)*9,99+i*8,12+i*4,2,i%2?'#a99e79':'#e1c988');}
function lamp(x,y){rect(x-2,y-31,4,32,C.ink);box(x-7,y-40,14,16,'#f1c878');rect(x-4,y-37,8,10,'#ffe9a5');rect(x-5,y-44,10,4,C.ink);rect(x-1,y-48,2,4,C.ink);rect(x-5,y,10,3,'#26334a');}
function shell(x,y,inspected){
 // Peach fan shell, angled hinge and broad ivory highlights from the reference.
 const palette={o:'#633827',s:'#e5a18f',p:inspected?'#dfb5a6':'#ffc4a4',h:'#ffe8c7'};
 const pixels=[
 '      oooooooo      ',
 '    oossssssssoo    ',
 '   ospppppppppsso   ',
 '  ospphhpphpppppso  ',
 ' ospphhpphhppppppso ',
 ' ospphppphppphhppso ',
 ' ospphpphhpphhpppso ',
 '  osphpphpphhppppsso',
 '  osppphpphhppppppso',
 '   ospppphhppphpppso',
 '   osppphhpphhppppso',
 ' oospphhpphhppppppso',
 'osphpppphhppppppppso',
 'ospppphhppppppppsso ',
 ' ospppppppppppssso  ',
 '  osppppssppppsso   ',
 '   osppsoosppsoo    ',
 '    osso  oooo      ',
 '     oo             '
 ];
 rect(x-11,y+2,22,2,'#795d6655');
 const scale=1.25;
 pixels.forEach((row,j)=>Array.from(row).forEach((pixel,i)=>{if(palette[pixel])rect(x-12+Math.round(i*scale),y-21+Math.round(j*scale),Math.round((i+1)*scale)-Math.round(i*scale),Math.round((j+1)*scale)-Math.round(j*scale),palette[pixel]);}));
}
function gwanganBridge(){
 // Two illuminated suspension towers, sweeping cables and their reflections.
 rect(78,89,210,4,'#748ba8');rect(78,90,210,1,'#ffe3b0');
 for(const x of [116,238]){
  rect(x-4,47,3,53,'#8eabc6');rect(x+5,47,3,53,'#8eabc6');
  rect(x-5,46,14,3,'#e9c8de');rect(x-2,58,8,3,'#cbbce5');rect(x-2,78,8,3,'#cbbce5');
 }
 for(let x=78;x<288;x++){
  let y=x<116?49+(116-x)*.9:x>238?49+(x-238)*.72:49+31*Math.sin((x-116)/122*Math.PI);
  rect(x,Math.round(y),1,2,'#d9b9e9');
  if(x%8===0)rect(x,Math.round(y)+2,1,89-Math.round(y),'#728da9');
  if(x%10===0){rect(x,88,2,2,'#fff1bb');rect(x-2,103+(x%3)*4,5,1,'#6a749c');}
 }
}
function sea(){seaBackground();gwanganBridge();rect(-32,165,320,75,'#bfa18b');rect(-32,164,320,4,'#dcc9a2');for(let i=0;i<15;i++){rect((i*23-32),168+(i%3)*22,18,2,'#9d7f79');rect((i*23-32)+6,192+(i%2)*22,2,2,'#e2cdaa');}rect(-32,127,320,4,'#698ca0');rect(-32,143,320,3,'#68808f');for(let x=-44;x<288;x+=52){box(x,123,6,39,'#8293a0',1);rect(x-2,122,10,3,'#bbc3bb');}rect(226,128,30,38,'#d7c4a0');lamp(17,163);lamp(237,169);sprite(178,152,true);for(const [i,o] of objects[1].filter(o=>o.id.startsWith('shell')).entries()){shell(o.x,o.y,state.shells.includes(i));}if(state.pieces.includes(1)){rect(234,117,12,5,C.gold);rect(241,113,5,13,C.gold);}sprite(state.p.x,state.p.y,false,keys.size>0);}
function chest(x,y,open=false){box(x-12,y-17,25,18,'#9b603d');box(x-13,y-23-(open?7:0),27,9,'#d49a52');rect(x-10,y-13,21,2,'#e2b764');box(x-3,y-15,7,7,C.gold,1);}
function harbor(){seaBackground(true,camera);rect(-32,171,320,69,'#225782');for(let i=0;i<16;i++)rect((i*59-camera*.6+1280)%320-32,192+i%4*11,15,2,'#4385ab');ctx.save();ctx.translate(-Math.round(camera),0);for(let i=0;i<14;i++){rect(i*58,185,3,28,'#172d3f');rect(i*58-2,184,7,4,'#bcc0ac');}rect(-32,191,796,3,'#728d96');for(const source of platforms){const p={...source};if(p.x===0){p.x-=32;p.w+=32;}if(p.x+p.w===732)p.w+=32;box(p.x,p.y,p.w,p.y===214?32:10,'#9b674a');rect(p.x+2,p.y+2,p.w-4,4,'#e3b270');for(let x=p.x+8;x<p.x+p.w-2;x+=16)rect(x,p.y+8,2,p.y===214?20:2,'#6e4939');}for(const sx of [34,226,444]){rect(sx,185,3,29,C.ink);box(sx-8,174,42,12,C.gold,1);rect(sx+1,178,22,3,C.ink);rect(sx+20,176,3,7,C.ink);}coinPositions.forEach((c,i)=>{if(state.coins.includes(i))return;const bob=Math.round(Math.sin(time*3+i)*2);box(c.x-6,c.y-8+bob,12,15,'#f6a743');rect(c.x-3,c.y-6+bob,6,11,'#ffe78a');rect(c.x-1,c.y-4+bob,2,7,'#db8231');});chest(652,214,state.pieces.includes(2));rect(706,183,3,31,C.ink);box(681,168,48,17,C.gold);ctx.font='bold 8px monospace';ctx.fillStyle=C.ink;ctx.textAlign='center';ctx.fillText('STATION >',705,179);sprite(state.p.x,state.p.y,false,keys.size>0&&grounded);ctx.restore();}
function train(){rect(-32,0,320,240,'#dec9a1');rect(-32,0,320,21,'#304557');rect(-32,18,320,5,'#122031');for(const x of [12,142]){box(x,36,105,70,'#78b0c2',4);ctx.save();ctx.beginPath();ctx.rect(x+4,40,97,62);ctx.clip();rect(x+4,72,100,30,'#73946d');for(let i=0;i<8;i++){const xx=x+((i*40-time*31)%150+150)%150-30;rect(xx,64+i%3*9,20,34,'#466c69');rect(xx+7,53+i%3*9,8,14,'#466c69');}rect(x+4,91,100,10,'#b6bc8c');rect(x+4,95,100,3,'#d8d3a3');ctx.restore();rect(x+48,38,4,66,'#344c5e');rect(x+5,40,94,3,'#c7e7e4');}rect(-32,115,320,3,'#9d987e');rect(-32,156,320,84,'#405362');for(let x=-32;x<288;x+=21)rect(x,159,1,80,'#354654');for(let x=22;x<240;x+=76){box(x,115,54,43,'#587785');rect(x+5,119,44,4,'#93a5a5');box(x-4,148,62,12,'#77929a');rect(x+2,160,4,10,C.ink);rect(x+48,160,4,10,C.ink);}sprite(122,151);rect(109,150,26,5,C.ink);rect(114,152,7,7,'#97643e');rect(130,152,7,7,'#97643e');box(103,13,52,15,'#e7d799');rect(117,17,23,3,'#4a594c');}
function room(){
 const cream='#f8f1df',wood='#a37852',edge='#716454';
 rect(-32,0,320,240,'#dfb98f');rect(-32,0,320,7,'#f3dcc0');
 rect(-32,79,320,161,'#e7d5b3');rect(-32,77,320,5,'#a78067');
 for(let y=84;y<240;y+=19){rect(-32,y,320,2,'#bfa27a');rect(-32,y+2,320,1,'#f8e7c9');for(let x=-32+(y%2)*25;x<288;x+=52)rect(x,y+2,2,17,'#c3a77f');}
 // Paired cream window frames above the still-empty desk.
 for(const x of [21,61]){box(x,16,34,39,edge,1);box(x+1,16,32,37,cream,2);rect(x+5,21,24,27,'#9fe1e5');rect(x+4,29,26,4,cream);rect(x-2,52,38,4,'#fff9e9');}
 ctx.save();ctx.translate(153,111);
 rect(23,77,5,22,wood);rect(90,77,5,22,wood);box(18,62,83,16,cream,2);rect(21,74,77,3,'#c9bea6');ctx.restore();
 // White drawers with warm wooden trim.
 box(141,46,38,35,wood,2);for(let y=50;y<79;y+=13){box(144,y,32,11,cream,1);rect(157,y+4,7,2,wood);}rect(144,81,3,5,wood);rect(173,81,3,5,wood);
 box(201,29,35,57,edge,1);box(202,30,33,55,cream,2);rect(204,53,29,2,'#bbb9a6');rect(206,40,2,8,wood);rect(206,60,2,12,wood);
 // Sage cushions, a blush pillow and a pale striped rug.
 box(12,107,79,58,'#b18c7e',2);rect(16,111,71,50,'#e7c8bb');
 for(let x=19;x<87;x+=8)rect(x,111,3,50,'#fff0db');
 box(19,111,62,36,cream,2);box(24,107,51,19,'#b6bd82',2);rect(47,111,3,15,'#8c985c');
 box(16,121,10,26,cream,2);box(74,121,10,26,cream,2);rect(26,130,48,12,'#fffaed');
 box(51,117,19,15,'#cf8c87',1);rect(54,119,13,10,'#edb2a7');rect(23,147,4,7,wood);rect(73,147,4,7,wood);
 rect(113,145,4,17,wood);rect(150,145,4,17,wood);box(107,124,53,23,cream,2);rect(109,143,49,3,'#c9b999');box(125,130,12,8,'#e6d0a8',1);
 ctx.save();ctx.translate(-153,-111);
 box(195,171,40,29,'#c99a65');rect(210,174,8,23,'#ebc990');rect(197,182,36,2,'#977149');ctx.restore();box(250,176,21,21,'#b58355');rect(259,178,3,17,'#e2be85');
 // Wall shelf, framed fruit and plants keep the reference's cozy palette.
 box(114,19,52,5,cream,1);rect(118,24,3,7,wood);rect(158,24,3,7,wood);
 box(141,7,15,12,wood,1);rect(144,11,9,2,'#f2d5a4');
 box(252,24,24,29,cream,2);rect(256,28,16,21,'#7cae8b');rect(261,35,7,7,'#df8153');rect(264,32,2,3,'#657c48');
 function plant(x,y){
  box(x-6,y,13,13,cream,1);rect(x-4,y+10,9,3,'#c6b799');
  rect(x,y-17,2,18,'#66804c');
  for(const [dx,dy] of [[-9,-14],[3,-18],[-7,-23],[3,-8]]){rect(x+dx,y+dy,8,6,'#6f9456');rect(x+dx+2,y+dy-2,4,3,'#93ae64');}
 }
 plant(-14,191);plant(267,115);
 rect(124,11,7,8,'#efe6cc');rect(122,5,11,8,'#82ab8b');rect(125,2,5,5,'#adc5a3');
 rect(118,0,3,9,wood);
 if(mode==='reveal'||mode==='ending'){ctx.save();ctx.translate(179,140);ctx.scale(.44,.44);rewardArt(ctx,0,0,1,true);ctx.restore();}
 if(mode!=='ending')sprite(state.p.x,state.p.y,false,keys.size>0);
}
function rewardArt(c,x,y,s=1,transparent=false){c.save();c.translate(x,y);c.scale(s,s);if(!transparent){rect(0,0,160,100,'#f3d68c',c);for(let i=0;i<9;i++)star(6+(i*43)%146,4+(i*23)%82,i%2?'#fff5c5':'#eab856',c);}box(17,79,126,9,'#b78049',2,c);rect(23,88,5,12,'#835638',c);rect(132,88,5,12,'#835638',c);
 box(23,23,30,54,'#394854',3,c);rect(27,27,20,4,'#677885',c);rect(28,36,17,2,'#121e2e',c);rect(28,42,17,2,'#121e2e',c);rect(29,53,14,13,'#172c43',c);rect(32,55,8,9,'#59b9c1',c);rect(34,57,4,5,'#ade8ce',c);rect(43,70,3,3,'#ffd36b',c);
 box(61,20,73,48,'#3b4b60',3,c);rect(66,25,63,37,'#4c9dcc',c);rect(69,28,57,3,'#86c3df',c);rect(68,31,31,3,'#67b3d5',c);rect(68,34,27,3,'#67b3d5',c);rect(68,37,23,3,'#67b3d5',c);rect(94,68,8,7,'#26364c',c);rect(85,74,27,4,'#26364c',c);
 box(60,79,59,12,'#26364c',2,c);for(let row=0;row<2;row++)for(let k=0;k<10;k++)rect(64+k*5,82+row*4,3,2,k%3===0?'#eabf77':'#aabfc9',c);box(127,77,10,14,'#384b5c',2,c);rect(131,79,2,4,'#9fd7d8',c);c.restore();}
function label(textValue,x,y){ctx.font='bold 8px monospace';const w=ctx.measureText(textValue).width+10;box(x-w/2,y-16,w,13,'#fff1ce',1);ctx.fillStyle=C.ink;ctx.textAlign='center';ctx.fillText(textValue,x,y-7);}
function renderScene(){if(canvas.width!==320||canvas.height!==240){canvas.width=320;canvas.height=240;}rect(0,0,320,240,state.stage===4&&mode!=='title'?'#dbb583':state.stage===3&&mode!=='title'?'#dec9a1':mode==='title'||state.stage===1?C.sky:'#6eb4d7');ctx.save();ctx.translate(32,0);draw();ctx.restore();}
function draw(){ctx.imageSmoothingEnabled=false;if(mode==='title'){seaBackground();rect(-32,210,320,30,'#b18c68');rect(-32,208,320,4,'#e2cba0');for(let x=-32;x<288;x+=28)rect(x,215,2,25,'#86654f');sprite(117,206);lamp(26,208);lamp(228,208);return;}
 if(state.stage===1)sea();else if(state.stage===2)harbor();else if(state.stage===3)train();else room();
 if(mode==='ending')drawEnding();
 if(mode==='play'&&!dialog.length){const o=nearest();if(o){const x=state.stage===2?o.x-camera:o.x;label('AUTO',x,(o.id==='daeun'?o.y-36:o.y-18));ui.hint.textContent=o.id==='daeun'?T.general.talk:T.general.interact;}else ui.hint.textContent=T.general.interact;}
 if(mode==='reveal'&&Math.floor(time*4)%2===0){for(let i=0;i<7;i++)star((i*39+17)%250,(i*29+23)%170,'#ffed9c');}
}
function drawEnding(){
 const elapsed=Math.max(0,time-endingStarted),jump=Math.abs(Math.sin(elapsed*5.6))*13;
 sprite(108,197-jump,false,false);sprite(154,197,true,false,true);
 for(let i=0;i<5;i++){const rise=(elapsed*18+i*17)%65;rect(123+i*11,164-rise,3,3,'#ef7e99');rect(126+i*11,164-rise,3,3,'#ef7e99');rect(124+i*11,167-rise,4,3,'#ef7e99');}
}
function tick(ms){time=ms/1000;const dt=Math.min(.035,lastTime?time-lastTime:0);lastTime=time;if(!document.hidden&&!resetModal){if(mode==='play'&&!dialog.length){move(dt);autoInteract();}if(mode==='train'){if(!dialog.length&&gaugeFrozen===null)gaugeElapsed+=dt;const v=gaugeFrozen!==null?gaugeFrozen:gaugeValue(gaugeElapsed);const needle=$('.needle'),target=$('.target'),read=$('.gauge-read');if(needle){gaugeRendered=v;needle.style.left=(v*100)+'%';target.style.width=((1-threshold())*100)+'%';read.textContent=(gaugeFrozen!==null&&lastHitSuccessful?100:Math.floor(v*100))+'%';$('.gauge').setAttribute('aria-valuenow',Math.round(v*100));}}if(mode==='ending'){const p=$('.ending-card p');if(p&&time-endingStarted>2.1){p.textContent=T.endingLine;text(T.endingLine);}}if(flipAt&&time-flipAt>.9){flipAt=0;mode='reveal';refresh();celebrationMusic();$('#viewport').classList.add('flash');setTimeout(()=>$('#viewport').classList.remove('flash'),600);}updateBgm();renderScene();}if(toastUntil&&time>toastUntil){$('#toast').style.display='none';toastUntil=0;}requestAnimationFrame(tick);}
showTitle();requestAnimationFrame(tick);
})();
