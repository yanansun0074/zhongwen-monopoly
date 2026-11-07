'use strict';
const $=s=>document.querySelector(s), avatars=['🐼','🐯','🐰','🦊','🐸','🐨','🐵','🦁','🐱','🐶','🐲','🦄'];
const questions=['你叫什么名字？','你几岁？','你好吗？','你的中文老师叫什么名字？','你是哪国人？','你妈妈是哪国人？','见到老师怎么说？','你同学叫什么名字？','你喜欢什么颜色？','你家有几口人？','你喜欢吃什么？','今天星期几？','你会说中文吗？','你喜欢什么动物？','一加二等于几？','你爸爸叫什么名字？','你有哥哥吗？','请说三个水果。','和同学说再见！'];
const defaults=()=>questions.map((question,i)=>({question,reward:i%4+1,answer:''}));
const fresh=()=>({lesson:defaults(),players:[],turn:0,pending:null,dice:5});
let state=fresh(),busy=false,chosen=avatars[0],modalKind='',toastTimer,movementStep=0;
// Format classroom numbers using ordinary Chinese numerals.
function chineseNumber(n){
 const digits='零一二三四五六七八九';
 if(n===0)return digits[0];
 function section(value){let out='',zero=false;for(let place=3;place>=0;place--){const power=10**place,d=Math.floor(value/power)%10;if(d){if(zero)out+='零';out+=digits[d]+['','十','百','千'][place];zero=false;}else if(out)zero=true;}return out;}
 const high=Math.floor(n/10000),low=n%10000;
 const text=high?section(high)+'万'+(low?(low<1000?'零':'')+section(low):''):section(low);
 return text.replace(/^一十/,'十');
}
function parseReward(text){const value=text.trim();if(/^\d{1,3}$/.test(value))return Number(value);for(let i=0;i<=999;i++)if(chineseNumber(i)===value)return i;return NaN;}
function validLesson(x){return Array.isArray(x)&&x.length===19&&x.every(t=>t&&typeof t.question==='string'&&t.question.trim().length>0&&t.question.length<=160&&Number.isInteger(t.reward)&&t.reward>=0&&t.reward<=999&&(t.answer===undefined||typeof t.answer==='string'&&t.answer.length<=240));}
try{const s=JSON.parse(localStorage.getItem('mandarin-adventure-v1'));if(s&&validLesson(s.lesson)&&Array.isArray(s.players)&&s.players.length<=30&&s.players.every(p=>typeof p.name==='string'&&p.name.length<=30&&avatars.includes(p.avatar)&&Number.isInteger(p.position)&&p.position>=0&&p.position<20&&Number.isInteger(p.money)&&p.money>=0&&p.money<=999999)&&Number.isInteger(s.turn)&&s.turn>=0&&s.turn<Math.max(1,s.players.length)){state=s;if(!s.pending||!s.players.length||s.pending.player!==s.turn||s.pending.tile!==s.players[s.turn].position)state.pending=null;}}catch(e){}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem('mandarin-adventure-v1',JSON.stringify(state));}catch(e){toast('Browser storage unavailable. Export your lesson to keep it.');}}
function toast(msg){$('#toast').textContent=msg;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3500);}
function openModal(html,kind='general'){$('#modalContent').innerHTML=html;modalKind=kind;if(!$('#modal').open)$('#modal').showModal();}
function closeModal(){$('#modal').close();modalKind='';}
function render(){
 const coords=[];for(let c=1;c<=6;c++)coords.push([1,c]);for(let r=2;r<=6;r++)coords.push([r,6]);for(let c=5;c>=1;c--)coords.push([6,c]);for(let r=5;r>=2;r--)coords.push([r,1]);
 const colors=['#ffb52e','#23c9a0','#ff718b','#9b83ef'];
 $('#board').innerHTML='<div class="center"><div class="panda">🐼</div><span class="eyebrow">WELCOME TO</span><h2>中文小镇</h2><p>A little Chinese town.<br>A big adventure together.</p><span class="route">START → Follow the tiles clockwise</span></div>'+coords.map(([r,c],i)=>`<div class="tile ${state.players.length&&state.players[state.turn].position===i?'active':''}" style="grid-row:${r};grid-column:${c};--tile:${colors[i%4]}"><small>${i===0?'START →':chineseNumber(i)+' →'}</small><strong lang="zh">${esc(i===0?'出发！':state.lesson[i-1].question)}</strong><span class="reward">${i===0?'🌟 Let’s go!':'🪙 '+chineseNumber(state.lesson[i-1].reward)+' 元'}</span><div class="tokens">${state.players.filter(p=>p.position===i).map(p=>`<span class="token ${busy&&p===state.players[state.turn]?'hopping':''}" title="${esc(p.name)}" aria-label="${esc(p.name)}">${p.avatar}</span>`).join('')}</div></div>`).join('');
 $('#empty').hidden=state.players.length>0;
 $('#players').innerHTML=state.players.map((p,i)=>`<div class="player ${state.turn===i?'selected':''}"><button class="face" data-select="${i}" aria-label="Make ${esc(p.name)} the current player" ${busy||state.pending?'disabled':''}>${p.avatar}</button><div class="info"><b>${esc(p.name)}</b><small>${chineseNumber(p.money)} 元 ${state.turn===i?'· Your turn':''}</small><button class="remove" data-remove="${i}" aria-label="Remove ${esc(p.name)}" ${busy||state.pending?'disabled':''}>Remove</button></div><div class="money-controls"><button data-money="${i}" data-delta="-1" aria-label="Subtract one yuan from ${esc(p.name)}" ${busy?'disabled':''}>−</button><button data-money="${i}" data-delta="1" aria-label="Add one yuan to ${esc(p.name)}" ${busy?'disabled':''}>+</button></div></div>`).join('');
 $('#turnName').textContent=state.players.length?state.players[state.turn].avatar+' '+state.players[state.turn].name+'’s turn':'Ready to play?';
 $('#dice').innerHTML=diceFace(state.dice);
 $('#roll').disabled=busy||!state.players.length;$('#roll').textContent=state.pending?'Answer question':busy?'On the move…':'Roll the dice';
 $('#status').textContent=busy?(movementStep?'第'+chineseNumber(movementStep)+'步，共'+chineseNumber(state.dice)+'步！':'Rolling… 掷骰子！'):state.pending?'A question is waiting. Let’s hear your answer!':state.players.length?'Answer correctly to earn the tile’s reward.':'Add an explorer to begin.';
 $('#clearPlayers').disabled=busy||!!state.pending||!state.players.length;$('#help').disabled=busy;$('#edit').disabled=busy||!!state.pending;$('#add').disabled=busy||!!state.pending;$('#reset').disabled=busy||!!state.pending;
}
function nextTurn(){state.pending=null;state.turn=(state.turn+1)%state.players.length;save();render();}
function showQuestion(){const pending=state.pending;if(!pending)return;const p=state.players[pending.player];const tile=pending.tile?state.lesson[pending.tile-1]:null;
 openModal(`<div class="question"><span class="eyebrow">${esc(p.name)} · YOUR CHALLENGE</span><h3 lang="zh">${esc(tile?tile.question:'说“你好”！')}</h3><p class="prize">${tile?'🪙 '+chineseNumber(tile.reward)+' 元 for a correct answer':'🌟 A friendly hello at START'}</p>${tile&&tile.answer?`<details><summary>Teacher: reveal answer / hint</summary><p>${esc(tile.answer)}</p></details>`:''}<p>Listen to the student, then choose below.</p></div><div class="actions"><button id="skip">Keep practicing · Next turn</button><button id="correct" class="primary">✓ Correct${tile?' · +'+chineseNumber(tile.reward)+' 元':''}</button></div>`,'question');
 $('#correct').onclick=()=>{if(!state.pending)return;const reward=tile?tile.reward:0;p.money=Math.min(999999,p.money+reward);closeModal();nextTurn();toast(reward?'太棒了！ '+p.name+' earned '+chineseNumber(reward)+' 元 🎉':'你好！ Well done! 🌟');};
 $('#skip').onclick=()=>{closeModal();nextTurn();toast('加油！ Keep trying — next explorer’s turn.');};
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function diceFace(value){
 const positions={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
 return '<span class="die-face" role="img" aria-label="Dice: '+chineseNumber(value)+'">'+Array.from({length:9},(_,i)=>'<i class="'+(positions[value].includes(i+1)?'pip':'')+'"></i>').join('')+'</span>';
}
// Preload the supplied raster frames; this works offline without a Lottie CDN.
const diceImages=diceFrames.map(src=>{const img=new Image();img.src=src;return img;});
async function animateRoll(value){
 const overlay=$('#rollOverlay'),art=$('#rollingArt'),result=$('#rollResult');
 $('#rollTitle').textContent='Rolling… 掷骰子！';$('#rollCaption').textContent='Where will you land?';
 result.hidden=true;art.hidden=false;art.src=diceFrames[0];overlay.hidden=false;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced){
  await new Promise(resolve=>{let start;function frame(now){if(start===undefined)start=now;const index=Math.floor((now-start)*30/1000);if(index>=diceFrames.length){resolve();return;}art.src=diceFrames[index];requestAnimationFrame(frame);}requestAnimationFrame(frame);});
 }else{await delay(200);}
 art.hidden=true;result.innerHTML=diceFace(value);result.hidden=false;
 $('#rollTitle').textContent='你掷出了'+chineseNumber(value)+'！';$('#rollCaption').textContent='前进'+chineseNumber(value)+'格！';
 await delay(reduced?400:1000);overlay.hidden=true;
}
$('#roll').onclick=async()=>{
 if(busy||!state.players.length)return;if(state.pending){showQuestion();return;}
 busy=true;movementStep=0;render();
 const bytes=new Uint8Array(1);do{crypto.getRandomValues(bytes);}while(bytes[0]>=252);
 state.dice=bytes[0]%6+1;
 try{
  await animateRoll(state.dice);
  const p=state.players[state.turn];
  for(let i=0;i<state.dice;i++){
   p.position=(p.position+1)%20;movementStep=i+1;render();
   document.querySelector('.tile.active').scrollIntoView({block:'nearest',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   await delay(650);
  }
  state.pending={player:state.turn,tile:p.position};
 }finally{busy=false;$('#rollOverlay').hidden=true;save();render();}
 showQuestion();
};
$('#players').onclick=e=>{const select=e.target.closest('[data-select]'),remove=e.target.closest('[data-remove]'),money=e.target.closest('[data-money]');if(busy)return;if(money){const p=state.players[Number(money.dataset.money)];p.money=Math.max(0,Math.min(999999,p.money+Number(money.dataset.delta)));save();render();}else if(select&&!state.pending){state.turn=Number(select.dataset.select);save();render();}else if(remove&&!state.pending){const i=Number(remove.dataset.remove);openModal(`<h2>Remove ${esc(state.players[i].name)}?</h2><p>Their position and money will be removed.</p><div class="actions"><button id="cancel">Cancel</button><button id="confirm">Remove explorer</button></div>`);$('#cancel').onclick=closeModal;$('#confirm').onclick=()=>{state.players.splice(i,1);if(i<state.turn)state.turn--;state.turn=state.turn%Math.max(1,state.players.length);save();closeModal();render();};}};
$('#clearPlayers').onclick=()=>{
 if(busy||state.pending||!state.players.length)return;
 openModal('<h2>Clear all explorers?</h2><p>Remove every explorer, including their money and board positions. Your lesson questions and rewards will stay saved.</p><div class="actions"><button id="cancel">Cancel</button><button id="confirm" class="danger">Clear all explorers</button></div>');
 $('#cancel').onclick=closeModal;
 $('#confirm').onclick=()=>{state.players=[];state.turn=0;state.pending=null;state.dice=5;save();closeModal();render();toast('All explorers cleared. Your lesson is ready for a new class.');};
};
$('#add').onclick=()=>{if(state.players.length>=30){toast('Up to 三十 explorers can join.');return;}chosen=avatars[state.players.length%avatars.length];openModal(`<h2>Meet a new explorer</h2><p>Pick a friend for your Chinese adventure.</p><form id="register"><label for="name">Student or team name</label><input id="name" maxlength="30" required placeholder="e.g. 小明 / Team Panda" autocomplete="off"><label>Choose an avatar</label><div class="avatars">${avatars.map(a=>`<button type="button" data-avatar="${a}" aria-label="Choose ${a}" aria-pressed="${a===chosen}" class="${a===chosen?'chosen':''}">${a}</button>`).join('')}</div><div class="actions"><button type="button" id="cancel">Cancel</button><button class="primary">Join the adventure</button></div></form>`);$('#cancel').onclick=closeModal;document.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{chosen=b.dataset.avatar;document.querySelectorAll('[data-avatar]').forEach(x=>{x.classList.toggle('chosen',x===b);x.setAttribute('aria-pressed',x===b);});});$('#register').onsubmit=e=>{e.preventDefault();const name=$('#name').value.trim();if(!name){$('#name').setCustomValidity('Please enter a name.');$('#name').reportValidity();return;}state.players.push({name,avatar:chosen,position:0,money:0});save();closeModal();render();};$('#name').oninput=()=>$('#name').setCustomValidity('');$('#name').focus();};
function downloadLesson(){const data={title:'Mandarin Money Adventure lesson',version:1,tiles:state.lesson};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='chinese-lesson.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Saved lesson exported.');}
$('#edit').onclick=()=>{openModal(`<h2>Make this lesson yours</h2><p>Edit 十九 question tiles. Rewards range from 零 to 九百九十九 元. START stays fixed.</p><form id="lessonForm"><div class="editor-list">${state.lesson.map((t,i)=>`<div class="editor-row"><div><label for="q${i}">Tile ${chineseNumber(i+1)} · Question</label><textarea id="q${i}" maxlength="160" required rows="2">${esc(t.question)}</textarea><input id="a${i}" aria-label="Tile ${chineseNumber(i+1)} optional teacher answer or hint" placeholder="Optional teacher answer / hint" maxlength="240" value="${esc(t.answer||'')}"></div><div><label for="r${i}">元</label><input id="r${i}" type="text" maxlength="12" required value="${chineseNumber(t.reward)}"></div></div>`).join('')}</div><div class="actions"><button type="button" id="export">Export saved lesson</button><button type="button" id="import">Import lesson</button><input hidden type="file" id="file" accept="application/json,.json"><button type="button" id="cancel">Cancel</button><button class="primary">Save lesson</button></div><p id="importError" role="alert"></p></form>`);$('#cancel').onclick=closeModal;$('#export').onclick=downloadLesson;$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error('File is too large.');const data=JSON.parse(await f.text());if(!validLesson(data.tiles))throw Error('Use an exported lesson containing exactly 十九 valid question tiles.');data.tiles.forEach((t,i)=>{$('#q'+i).value=t.question;$('#r'+i).value=chineseNumber(t.reward);$('#a'+i).value=t.answer||'';});$('#importError').textContent='Imported into editor. Choose Save lesson to apply.';}catch(err){$('#importError').textContent='Could not import: '+err.message;}};$('#lessonForm').onsubmit=e=>{e.preventDefault();const lesson=state.lesson.map((_,i)=>({question:$('#q'+i).value.trim(),reward:parseReward($('#r'+i).value),answer:$('#a'+i).value.trim()}));if(!validLesson(lesson)){$('#importError').textContent='Each tile needs a question and a whole-number reward from 零 to 九百九十九.';return;}state.lesson=lesson;save();closeModal();render();toast('Lesson saved. Happy exploring!');};};
$('#help').onclick=()=>openModal('<h2>A little guide to a big adventure</h2><p>一、 Add students or teams and choose their avatars.</p><p>二、 Roll the dice. The current explorer moves clockwise by 一 to 六 spaces.</p><p>三、 Ask the question on the landing tile. Mark it correct to award the displayed 元, or choose Keep practicing to continue without money.</p><p>四、 Turns advance automatically. Click an explorer’s avatar to change whose turn it is. Use + / − for one-yuan adjustments.</p><p>五、 Edit lesson to change questions, teacher hints, and rewards. Export saved lessons to keep a backup or move them to another browser.</p><p>There is no fixed finish: play as long as you like and celebrate everyone’s learning. New game clears positions and money but keeps students and the lesson. Data stays in this browser, with no student accounts.</p><div class="actions"><button onclick="document.querySelector(\'#modal\').close()">Let’s play!</button></div>');
$('#reset').onclick=()=>{openModal('<h2>Ready for a new adventure?</h2><p>Reset all money and positions to zero. Keep your explorers and edited lesson.</p><div class="actions"><button id="cancel">Cancel</button><button id="confirm" class="primary">Start new game</button></div>');$('#cancel').onclick=closeModal;$('#confirm').onclick=()=>{state.players.forEach(p=>{p.money=0;p.position=0;});state.turn=0;state.pending=null;state.dice=5;save();closeModal();render();};};
$('#modal').addEventListener('cancel',()=>{if(modalKind==='question')toast('Question saved. Click Answer question to continue.');});
render();
