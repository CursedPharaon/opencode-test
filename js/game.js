const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const TILE = 32;
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

// ---------- ITEMS ----------
const ITEMS = {
  // consumables
  hp_potion: {id:'hp_potion', name:'Зелье HP', icon:'🧪', desc:'Восстанавливает 50 HP', price:15, sell:7, type:'consumable', heal:50},
  big_potion:{id:'big_potion', name:'Большое зелье', icon:'⚗️', desc:'Восстанавливает 120 HP', price:35, sell:17, type:'consumable', heal:120},
  // weapons
  stick:{id:'stick', name:'Палка', icon:'🪵', desc:'АТК +2', price:10, sell:5, type:'weapon', atk:2},
  rust_sword:{id:'rust_sword', name:'Ржавый меч', icon:'🗡️', desc:'АТК +6', price:40, sell:20, type:'weapon', atk:6},
  steel_sword:{id:'steel_sword', name:'Стальной меч', icon:'⚔️', desc:'АТК +12', price:120, sell:60, type:'weapon', atk:12},
  fire_blade:{id:'fire_blade', name:'Огненный клинок', icon:'🔥', desc:'АТК +22, +5% крит', price:280, sell:140, type:'weapon', atk:22, crit:0.05},
  // armor
  cloth:{id:'cloth', name:'Тканевый жилет', icon:'👕', desc:'ЗАЩ +2', price:20, sell:10, type:'armor', def:2},
  leather:{id:'leather', name:'Кожаная броня', icon:'🦺', desc:'ЗАЩ +6', price:80, sell:40, type:'armor', def:6},
  plate:{id:'plate', name:'Латы', icon:'🛡️', desc:'ЗАЩ +12, HP +20', price:200, sell:100, type:'armor', def:12, hp:20},
  // materials / loot
  slime_gel:{id:'slime_gel', name:'Слизь', icon:'🟢', desc:'Луто с слаймов', price:4, sell:4, type:'loot'},
  goblin_ear:{id:'goblin_ear', name:'Ухо гоблина', icon:'👂', desc:'Трофей', price:8, sell:8, type:'loot'},
  bone:{id:'bone', name:'Кость', icon:'🦴', desc:'Трофей', price:10, sell:10, type:'loot'},
  desert_scale:{id:'desert_scale', name:'Чешуя', icon:'🐍', desc:'Редкий трофей', price:18, sell:18, type:'loot'},
};

// Shops
const SHOPS = {
  village_weapon: {title:'Кузница Грорна 🔨', items:['rust_sword','steel_sword','fire_blade','leather','plate']},
  village_potion: {title:'Травница Мира 🌿', items:['hp_potion','big_potion','cloth']},
  cave_shop: {title:'Отшельник', items:['big_potion','steel_sword','plate']},
};

// Enemies templates
const ENEMIES = {
  slime:{name:'Слайм', icon:'🟩', hp:28, atk:6, def:1, xp:12, gold:6, color:'#5ee27a', scale:0.9},
  goblin:{name:'Гоблин', icon:'👺', hp:45, atk:10, def:2, xp:22, gold:11, color:'#7ab84a', scale:1},
  skeleton:{name:'Скелет', icon:'💀', hp:70, atk:16, def:4, xp:38, gold:18, color:'#d8d8d8', scale:1},
  bat:{name:'Летучая мышь', icon:'🦇', hp:35, atk:12, def:1, xp:20, gold:9, color:'#6a5acd', scale:0.8},
  scorpion:{name:'Скорпион', icon:'🦂', hp:90, atk:20, def:6, xp:55, gold:26, color:'#e6b422', scale:1.1},
  golem:{name:'Голем', icon:'🗿', hp:140, atk:24, def:10, xp:80, gold:40, color:'#8d7a5a', scale:1.2},
};

// NPCs
const NPC_DEFS = {
  elder:{name:'Староста', icon:'🧙', color:'#ffcc00', dialog:'Привет, путник! В лесу водятся слаймы и гоблины — отличный старт для кача. В пещере опаснее, а в пустыне — настоящий ад.\nПодсказка: бей SPACE, говори E, инвентарь I.', shop:null, quest:null},
  blacksmith:{name:'Кузнец Грорн', icon:'🔨', color:'#ff8a4d', dialog:'Кую лучшее оружие! Принесёшь материалы — сделаю скидку... шучу, просто покупай.', shop:'village_weapon'},
  herbalist:{name:'Травница Мира', icon:'🌿', color:'#6bff8a', dialog:'Зелья — жизнь! Без них в пещере не выжить. Держи пару травок.', shop:'village_potion'},
  hermit:{name:'Отшельник', icon:'🧛', color:'#7afcff', dialog:'Я сторожу пещеру. Хочешь пройти дальше — докажи силу.', shop:'cave_shop'},
};

// Maps definition
const LOCS = {
  village:{name:'Деревня', color:'#5a7f3a', w:32, h:22, enemies:[], enemyCount:0},
  forest:{name:'Тёмный лес', color:'#1e3d1e', w:36, h:26, enemies:['slime','goblin','bat'], enemyCount:8},
  cave:{name:'Пещера', color:'#2a2a3a', w:34, h:24, enemies:['skeleton','bat','golem'], enemyCount:9},
  desert:{name:'Пустыня', color:'#b89a5a', w:38, h:28, enemies:['scorpion','golem','skeleton'], enemyCount:10},
};

let currentLoc = 'village';
let map = []; // 2D tile: 0 ground, 1 wall, 2 water, 3 road, 4 tree, 5 house floor
let camera = {x:0,y:0};
let keys = {};
let lastAttack = 0;

// Player
let player = {
  x: 16*TILE, y: 11*TILE,
  w: 22, h: 26,
  hp: 100, maxHp: 100,
  level:1, xp:0, xpNeed:100,
  gold: 50,
  statPoints:0,
  stats:{str:5, agi:5, vit:5, int:5}, // strength, agility, vitality, intellect
  inv: [], // {id,count}
  equip:{weapon:null, armor:null},
  facing: {x:1,y:0},
  invul:0,
  dead:false,
};

// World objects
let enemies = [];
let npcs = [];
let drops = []; // {x,y,id,count}
let portals = []; // {x,y,w,h,to,tx,ty,label}
let particles = []; // for effects

function xpNeed(l){ return Math.floor(100 * Math.pow(l, 1.55)); }
function calcStats(){
  const s = player.stats;
  const weaponAtk = player.equip.weapon ? ITEMS[player.equip.weapon].atk||0 : 0;
  const weaponCrit = player.equip.weapon ? ITEMS[player.equip.weapon].crit||0 : 0;
  const armorDef = player.equip.armor ? ITEMS[player.equip.armor].def||0 : 0;
  const armorHp = player.equip.armor ? ITEMS[player.equip.armor].hp||0 : 0;
  const baseAtk = 8 + s.str*2.2 + s.agi*0.6;
  const baseDef = 2 + s.vit*1.4 + s.agi*0.4;
  return {
    atk: Math.floor(baseAtk + weaponAtk),
    def: Math.floor(baseDef + armorDef),
    maxHp: Math.floor(80 + s.vit*12 + s.str*2 + armorHp),
    crit: 0.05 + s.agi*0.012 + weaponCrit,
    speed: 2.2 + s.agi*0.06,
  };
}

function addItem(id, count=1){
  let slot = player.inv.find(s=>s.id===id);
  // stack consumables/loot
  const it = ITEMS[id];
  const stackable = it.type==='consumable' || it.type==='loot';
  if(stackable && slot){ slot.count+=count; }
  else if(stackable){ player.inv.push({id,count}); }
  else { // equipment not stackable but allow multiple
    for(let i=0;i<count;i++) player.inv.push({id,count:1});
  }
  if(player.inv.length>28){ // limit
    player.inv = player.inv.slice(0,28);
  }
}
function removeItem(id, count=1){
  let idx = player.inv.findIndex(s=>s.id===id);
  if(idx===-1) return false;
  let it = ITEMS[id];
  if(it.type==='consumable' || it.type==='loot'){
    player.inv[idx].count-=count;
    if(player.inv[idx].count<=0) player.inv.splice(idx,1);
  } else {
    player.inv.splice(idx,1);
  }
  return true;
}
function hasItem(id){ return player.inv.some(s=>s.id===id); }

// ---------- MAP GENERATION ----------
function genMap(locId){
  const L = LOCS[locId];
  let w=L.w, h=L.h;
  let m = Array.from({length:h},()=>Array(w).fill(0));
  // borders are walls
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(x===0||y===0||x===w-1||y===h-1) m[y][x]=1;
  }
  // scatter
  if(locId==='village'){
    // houses 3x3
    const houses=[{x:5,y:4},{x:22,y:5},{x:10,y:14}];
    houses.forEach(hs=>{
      for(let dy=0;dy<4;dy++) for(let dx=0;dx<5;dx++){
        let x=hs.x+dx,y=hs.y+dy;
        if(dx===2 && dy===3) m[y][x]=3; // door = road
        else if(dx===0||dy===0||dx===4||dy===3) m[y][x]=1;
        else m[y][x]=5;
      }
    });
    // trees
    for(let i=0;i<18;i++){
      let x=2+Math.floor(Math.random()*(w-4)), y=2+Math.floor(Math.random()*(h-4));
      if(m[y][x]===0) m[y][x]=4;
    }
    // road vertical + horizontal
    for(let x=0;x<w;x++) { if(m[11][x]===0) m[11][x]=3; }
    for(let y=0;y<h;y++) { if(m[y][15]===0) m[y][15]=3; }
  } else if(locId==='forest'){
    for(let i=0;i<70;i++){
      let x=1+Math.floor(Math.random()*(w-2)), y=1+Math.floor(Math.random()*(h-2));
      if(m[y][x]===0) m[y][x]= (Math.random()<0.7?4:1);
    }
    // clear path
    for(let x=0;x<w;x++) if(m[13][x]===1) m[13][x]=0;
    for(let y=0;y<h;y++) if(m[y][18]===1) m[y][18]=0;
  } else if(locId==='cave'){
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
      if(Math.random()<0.12) m[y][x]=1;
      else if(Math.random()<0.04) m[y][x]=2; // water/lava
    }
    // ensure spawn clear
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) m[12+dy][16+dx]=0;
  } else if(locId==='desert'){
    for(let i=0;i<40;i++){
      let x=1+Math.floor(Math.random()*(w-2)), y=1+Math.floor(Math.random()*(h-2));
      if(m[y][x]===0) m[y][x]=1; // rocks
    }
    for(let i=0;i<12;i++){
      let x=1+Math.floor(Math.random()*(w-2)), y=1+Math.floor(Math.random()*(h-2));
      if(m[y][x]===0) m[y][x]=2; // oasis water
    }
  }
  // portals per location
  portals=[];
  if(locId==='village'){
    portals.push({x:(w-2)*TILE,y:11*TILE-16,w:32,h:64,to:'forest',tx:2*TILE,ty:13*TILE,label:'→ Лес'});
    portals.push({x:15*TILE,y:1*TILE,w:64,h:32,to:'cave',tx:16*TILE,ty:(LOCS.cave.h-3)*TILE,label:'↑ Пещера'});
  } else if(locId==='forest'){
    portals.push({x:0,y:13*TILE-16,w:32,h:64,to:'village',tx:(LOCS.village.w-3)*TILE,ty:11*TILE,label:'→ Деревня'});
    portals.push({x:(w-2)*TILE,y:13*TILE-16,w:32,h:64,to:'cave',tx:2*TILE,ty:12*TILE,label:'→ Пещера'});
    portals.push({x:18*TILE,y:(h-2)*TILE,w:64,h:32,to:'desert',tx:18*TILE,ty:2*TILE,label:'↓ Пустыня'});
  } else if(locId==='cave'){
    portals.push({x:0,y:12*TILE-16,w:32,h:64,to:'forest',tx:(LOCS.forest.w-3)*TILE,ty:13*TILE,label:'→ Лес'});
    portals.push({x:15*TILE,y:(h-2)*TILE,w:64,h:32,to:'village',tx:15*TILE,ty:3*TILE,label:'↓ Деревня'});
    portals.push({x:(w-2)*TILE,y:12*TILE,w:32,h:64,to:'desert',tx:2*TILE,ty:14*TILE,label:'→ Пустыня'});
  } else if(locId==='desert'){
    portals.push({x:0,y:14*TILE-16,w:32,h:64,to:'cave',tx:(LOCS.cave.w-3)*TILE,ty:12*TILE,label:'→ Пещера'});
    portals.push({x:18*TILE,y:0,w:64,h:32,to:'forest',tx:18*TILE,ty:(LOCS.forest.h-3)*TILE,label:'↑ Лес'});
  }
  return m;
}

function isSolidAt(px,py){
  // px,py world coords center of entity
  let tx = Math.floor(px / TILE);
  let ty = Math.floor(py / TILE);
  if(ty<0||ty>=map.length||tx<0||tx>=map[0].length) return true;
  let t = map[ty][tx];
  return t===1 || t===4; // wall or tree solid
}
function isSolidTile(tx,ty){
  if(ty<0||ty>=map.length||tx<0||tx>=map[0].length) return true;
  let t=map[ty][tx];
  return t===1||t===4;
}

function spawnEnemies(){
  enemies=[];
  let L=LOCS[currentLoc];
  if(!L.enemies.length) return;
  for(let i=0;i<L.enemyCount;i++){
    let type = L.enemies[Math.floor(Math.random()*L.enemies.length)];
    let tpl = ENEMIES[type];
    let tries=0, x,y;
    do{
      x = 2+Math.floor(Math.random()*(L.w-4));
      y= 2+Math.floor(Math.random()*(L.h-4));
      tries++;
    }while((isSolidTile(x,y) || dist2(x*TILE,y*TILE,player.x,player.y)< 6*TILE*6*TILE) && tries<80);
    enemies.push({
      type, ...JSON.parse(JSON.stringify(tpl)),
      x:x*TILE+TILE/2, y:y*TILE+TILE/2,
      maxHp: tpl.hp, hp:tpl.hp,
      w:24, h:24,
      vx:0, vy:0,
      cooldown:0, hitTimer:0, dead:false,
    });
  }
}
function spawnNPCs(){
  npcs=[];
  if(currentLoc==='village'){
    npcs.push({id:'elder', x:7*TILE, y:6*TILE, ...NPC_DEFS.elder});
    npcs.push({id:'blacksmith', x:24*TILE, y:7*TILE, ...NPC_DEFS.blacksmith});
    npcs.push({id:'herbalist', x:12*TILE, y:16*TILE, ...NPC_DEFS.herbalist});
  } else if(currentLoc==='cave'){
    npcs.push({id:'hermit', x:16*TILE, y:10*TILE, ...NPC_DEFS.hermit});
  } else if(currentLoc==='desert'){
    // trader in desert
    npcs.push({id:'desert_trader', x:20*TILE, y:15*TILE, name:'Торговец', icon:'🧕', color:'#e6b422', dialog:'Жара... Купи воды... то есть зелий. И не лезь к големам без брони.', shop:'cave_shop'});
  }
}

function switchLocation(to){
  currentLoc=to;
  map=genMap(currentLoc);
  let L=LOCS[to];
  // find portal entry fallback if not specified via portal tx/ty
  spawnEnemies();
  spawnNPCs();
  drops=[];
  particles=[];
  updateHUD();
  save();
}

function dist2(ax,ay,bx,by){ let dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }

// ---------- INPUT ----------
window.addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()]=true;
  if(e.code==='Space') { e.preventDefault(); tryAttack(); }
  if(e.key.toLowerCase()==='e'){ tryInteract(); }
  if(e.key.toLowerCase()==='i'){ toggleInventory(); }
  if(e.key.toLowerCase()==='c'){ toggleStats(); }
  if(e.key.toLowerCase()==='m'){ toggleMap(); }
  if(e.key==='Escape'){ closeAll(); }
});
window.addEventListener('keyup', e=> keys[e.key.toLowerCase()]=false);

// ---------- HUD ----------
function updateHUD(){
  const st = calcStats();
  // hp
  document.getElementById('hp-fill').style.width = (player.hp/player.maxHp*100)+'%';
  document.getElementById('hp-text').textContent = Math.ceil(player.hp)+'/'+player.maxHp;
  document.getElementById('xp-fill').style.width = (player.xp/player.xpNeed*100)+'%';
  document.getElementById('xp-text').textContent = player.xp+'/'+player.xpNeed;
  document.getElementById('hud-level').textContent = player.level;
  document.getElementById('location-name').textContent = LOCS[currentLoc].name;
  document.getElementById('coords').textContent = `X:${Math.floor(player.x/TILE)} Y:${Math.floor(player.y/TILE)} [${LOCS[currentLoc].name}]`;
  document.getElementById('gold-text').textContent = player.gold;
  document.getElementById('atk-text').textContent = st.atk;
  document.getElementById('def-text').textContent = st.def;
  // map nodes active
  document.querySelectorAll('.map-node').forEach(n=> n.classList.toggle('active', n.dataset.loc===currentLoc));
}

// ---------- INTERACT ----------
let nearNPC=null, nearPortal=null, nearDrop=null;
function tryInteract(){
  // if dialogue open -> close
  const dlg=document.getElementById('dialogue');
  if(!dlg.classList.contains('hidden')){ dlg.classList.add('hidden'); return; }
  if(document.getElementById('shop') && !document.getElementById('shop').classList.contains('hidden')){ closeShop(); return; }
  if(nearNPC){
    openDialogue(nearNPC);
    return;
  }
  if(nearPortal){
    player.x=nearPortal.tx; player.y=nearPortal.ty;
    switchLocation(nearPortal.to);
    return;
  }
  if(nearDrop){
    addItem(nearDrop.id, nearDrop.count);
    drops = drops.filter(d=>d!==nearDrop);
    spawnParticle(nearDrop.x, nearDrop.y-10, '+'+nearDrop.count+' '+ITEMS[nearDrop.id].name, '#ffcc00');
    nearDrop=null;
    updateHUD();
    return;
  }
}
function openDialogue(npc){
  const dlg=document.getElementById('dialogue');
  document.getElementById('dialogue-name').textContent = npc.name + ' ' + npc.icon;
  document.getElementById('dialogue-text').textContent = npc.dialog;
  const opts=document.getElementById('dialogue-options');
  opts.innerHTML='';
  if(npc.shop){
    let b=document.createElement('button'); b.className='dialogue-opt'; b.textContent='🛒 Открыть магазин';
    b.onclick=()=>{dlg.classList.add('hidden'); openShop(npc.shop);};
    opts.appendChild(b);
  }
  if(npc.id==='elder'){
    let b=document.createElement('button'); b.className='dialogue-opt'; b.textContent='💡 Получить подсказку';
    b.onclick=()=>{ document.getElementById('dialogue-text').textContent='Качай СИЛ для урона, ВНС для живучести. В лесу бей слаймов, собирай слизь и продавай травнице. На 5 уровне иди в пещеру!';};
    opts.appendChild(b);
  }
  dlg.classList.remove('hidden');
}

// Shop
let currentShop=null;
function openShop(shopId){
  currentShop=SHOPS[shopId];
  if(!currentShop) return;
  document.getElementById('shop-title').textContent=currentShop.title;
  document.getElementById('shop').classList.remove('hidden');
  renderShop();
}
function closeShop(){ document.getElementById('shop').classList.add('hidden'); currentShop=null; }
function renderShop(){
  const cont=document.getElementById('shop-items');
  cont.innerHTML='';
  currentShop.items.forEach(id=>{
    const it=ITEMS[id];
    let div=document.createElement('div'); div.className='item-card';
    div.innerHTML=`<div class="item-icon">${it.icon}</div><div class="item-info"><div class="item-name">${it.name}</div><div class="item-desc">${it.desc}</div></div><div class="item-price">${it.price} 💰</div>`;
    div.onclick=()=>{
      if(player.gold>=it.price){
        player.gold-=it.price;
        addItem(id,1);
        spawnParticle(player.x, player.y-20, '-'+it.price+' 💰', '#ffcc00');
        updateHUD(); renderShop(); renderInventoryGrid(); save();
      } else {
        spawnParticle(player.x, player.y-20, 'Не хватает золота!', '#ff4d4d');
      }
      document.getElementById('shop-gold').textContent=player.gold;
    };
    cont.appendChild(div);
  });
  document.getElementById('shop-gold').textContent=player.gold;
  const inv=document.getElementById('shop-inventory');
  inv.innerHTML='';
  if(!player.inv.length){ inv.innerHTML='<div style="opacity:.5;font-size:12px">Пусто</div>'; return; }
  player.inv.forEach((slot,idx)=>{
    const it=ITEMS[slot.id];
    let div=document.createElement('div'); div.className='item-card';
    div.innerHTML=`<div class="item-icon">${it.icon}</div><div class="item-info"><div class="item-name">${it.name} ${slot.count>1?'×'+slot.count:''}</div><div class="item-desc">Продать за ${it.sell} 💰</div></div><div class="item-price">+${it.sell}</div>`;
    div.onclick=()=>{
      player.gold+=it.sell;
      removeItem(slot.id,1);
      updateHUD(); renderShop(); renderInventoryGrid(); save();
      spawnParticle(player.x, player.y-20, '+'+it.sell+' 💰', '#6bff8a');
    };
    inv.appendChild(div);
  });
}

// Inventory
function toggleInventory(){
  const el=document.getElementById('inventory');
  const willOpen = el.classList.contains('hidden');
  closeAll();
  if(willOpen){ el.classList.remove('hidden'); renderInventoryGrid(); }
}
function renderInventoryGrid(){
  const grid=document.getElementById('inv-grid');
  grid.innerHTML='';
  player.inv.forEach((slot, idx)=>{
    const it=ITEMS[slot.id];
    let div=document.createElement('div'); div.className='item-card';
    div.innerHTML=`<div class="item-icon">${it.icon}</div><div class="item-info"><div class="item-name">${it.name}</div><div class="item-desc">${it.desc}</div></div>${slot.count>1?'<b style="color:var(--accent)">×'+slot.count+'</b>':''}`;
    div.onclick=()=> showDetail(idx);
    grid.appendChild(div);
  });
  if(!player.inv.length) grid.innerHTML='<div style="opacity:.5;grid-column:1/-1;text-align:center;padding:20px">Инвентарь пуст. Бей монстров!</div>';
  // if detail not selected show first?
}
function showDetail(idx){
  const slot=player.inv[idx];
  const it=ITEMS[slot.id];
  const detail=document.getElementById('inv-detail');
  let actions='';
  if(it.type==='consumable'){
    actions+=`<button class="btn-pixel btn-small" onclick="useItem(${idx})">Использовать</button>`;
  } else if(it.type==='weapon' || it.type==='armor'){
    const equipped = (it.type==='weapon' && player.equip.weapon===it.id) || (it.type==='armor' && player.equip.armor===it.id);
    actions+=`<button class="btn-pixel btn-small" onclick="equipItem(${idx})">${equipped?'Снять':'Надеть'}</button>`;
  }
  actions+=`<button class="btn-pixel secondary btn-small" onclick="sellOne(${idx})">Продать за ${it.sell} 💰</button>`;
  detail.innerHTML=`<div class="detail-icon">${it.icon}</div><div class="detail-name">${it.name}</div><div class="detail-desc">${it.desc}</div><div style="font-size:12px;text-align:center">Цена: ${it.price} / продать ${it.sell}</div>${actions}`;
}
function useItem(idx){
  const slot=player.inv[idx];
  const it=ITEMS[slot.id];
  if(it.heal){
    if(player.hp>=player.maxHp){ spawnParticle(player.x, player.y-20,'HP уже максимум','#7afcff'); return; }
    player.hp=Math.min(player.maxHp, player.hp+it.heal);
    spawnParticle(player.x, player.y-20, '+'+it.heal+' HP', '#6bff8a');
    removeItem(slot.id,1);
    updateHUD(); renderInventoryGrid(); document.getElementById('inv-detail').innerHTML='<div class="inv-detail-empty">Использовано!</div>'; save();
  }
}
function equipItem(idx){
  const slot=player.inv[idx];
  const it=ITEMS[slot.id];
  if(it.type==='weapon'){
    if(player.equip.weapon===it.id){ player.equip.weapon=null; }
    else { player.equip.weapon=it.id; }
  } else if(it.type==='armor'){
    if(player.equip.armor===it.id){ player.equip.armor=null; }
    else { player.equip.armor=it.id; }
  }
  // recalc maxHp
  const st=calcStats();
  player.maxHp=st.maxHp;
  if(player.hp>player.maxHp) player.hp=player.maxHp;
  updateHUD(); renderInventoryGrid(); renderStats(); save();
  spawnParticle(player.x, player.y-20, 'Экипировано!', '#ffcc00');
}
function sellOne(idx){
  const slot=player.inv[idx];
  const it=ITEMS[slot.id];
  // if equipped, unequip first
  if(player.equip.weapon===it.id) player.equip.weapon=null;
  if(player.equip.armor===it.id) player.equip.armor=null;
  player.gold+=it.sell;
  removeItem(slot.id,1);
  updateHUD(); renderInventoryGrid(); document.getElementById('inv-detail').innerHTML='<div class="inv-detail-empty">Продано!</div>'; save();
}

// Stats
function toggleStats(){
  const el=document.getElementById('stats');
  const willOpen=el.classList.contains('hidden');
  closeAll();
  if(willOpen){ el.classList.remove('hidden'); renderStats(); }
}
function renderStats(){
  document.getElementById('st-level').textContent=player.level;
  document.getElementById('st-xp').textContent=player.xp+'/'+player.xpNeed;
  document.getElementById('st-points').textContent=player.statPoints;
  const list=document.getElementById('st-list');
  list.innerHTML='';
  const names={str:'СИЛ — Сила', agi:'ЛВК — Ловкость', vit:'ВНС — Выносливость', int:'ИНТ — Интеллект'};
  Object.entries(player.stats).forEach(([k,v])=>{
    let row=document.createElement('div'); row.className='stat-row';
    row.innerHTML=`<div><b>${names[k]}</b><div style="font-size:11px;opacity:.6">${v}</div></div><div style="display:flex;gap:8px;align-items:center"><span class="stat-val">${v}</span><button class="btn-plus" ${player.statPoints<=0?'disabled':''} onclick="addStat('${k}')">+</button></div>`;
    list.appendChild(row);
  });
  const st=calcStats();
  const equip=document.getElementById('equip-slots');
  equip.innerHTML='';
  const weapon = player.equip.weapon ? ITEMS[player.equip.weapon] : null;
  const armor = player.equip.armor ? ITEMS[player.equip.armor] : null;
  equip.innerHTML+=`<div class="equip-slot ${weapon?'filled':''}"><div class="item-icon">${weapon?weapon.icon:'—'}</div><div><div style="font-weight:800">${weapon?weapon.name:'Оружие: нет'}</div><div style="font-size:11px;opacity:.7">${weapon?weapon.desc:'АТК '+st.atk}</div></div></div>`;
  equip.innerHTML+=`<div class="equip-slot ${armor?'filled':''}"><div class="item-icon">${armor?armor.icon:'—'}</div><div><div style="font-weight:800">${armor?armor.name:'Броня: нет'}</div><div style="font-size:11px;opacity:.7">${armor?armor.desc:'ЗАЩ '+st.def+' | HP '+st.maxHp}</div></div></div>`;
  equip.innerHTML+=`<div style="background:#0a0d2a;border-radius:10px;padding:10px;font-size:12px"><div>⚔️ АТК: <b>${st.atk}</b> &nbsp; 🛡️ ЗАЩ: <b>${st.def}</b></div><div>❤️ HP: <b>${player.maxHp}</b> &nbsp; ⭐ Крит: <b>${Math.round(st.crit*100)}%</b> &nbsp; 👟 Скорость: <b>${st.speed.toFixed(1)}</b></div></div>`;
}
function addStat(k){
  if(player.statPoints<=0) return;
  player.stats[k]++;
  player.statPoints--;
  const st=calcStats();
  let newMax=st.maxHp;
  // keep hp ratio?
  player.maxHp=newMax;
  // heal a bit on level vit increase?
  updateHUD(); renderStats(); save();
}

// Map modal
function toggleMap(){
  const el=document.getElementById('map-modal');
  const willOpen=el.classList.contains('hidden');
  closeAll();
  if(willOpen) el.classList.remove('hidden');
}
document.querySelectorAll('.map-node').forEach(n=>{
  n.addEventListener('click', ()=>{
    let loc=n.dataset.loc;
    // teleport for testing
    player.x=16*TILE; player.y=12*TILE;
    switchLocation(loc);
    closeAll();
  });
});
function closeAll(){
  document.getElementById('shop').classList.add('hidden');
  document.getElementById('inventory').classList.add('hidden');
  document.getElementById('stats').classList.add('hidden');
  document.getElementById('map-modal').classList.add('hidden');
  document.getElementById('dialogue').classList.add('hidden');
}
function closeShop(){ closeAll(); }
function hideLevelUp(){ document.getElementById('levelup').classList.add('hidden'); }
function respawn(){
  player.hp=player.maxHp;
  player.dead=false;
  player.x=16*TILE; player.y=11*TILE;
  currentLoc='village';
  map=genMap(currentLoc);
  spawnEnemies(); spawnNPCs();
  document.getElementById('death').classList.add('hidden');
  updateHUD();
}

// Particles / damage numbers
function spawnParticle(x,y,text,color){
  particles.push({x,y,text,color,life:1});
  // also DOM floating text
  const layer=document.getElementById('damage-layer');
  const el=document.createElement('div');
  el.textContent=text;
  el.style.cssText=`position:absolute;left:${(x-camera.x)}px;top:${(y-camera.y)}px;transform:translate(-50%,-50%);color:${color};font-weight:900;font-size:14px;text-shadow:0 2px 0 #000,0 0 6px #000;pointer-events:none;transition:all .8s;`;
  layer.appendChild(el);
  requestAnimationFrame(()=>{ el.style.transform='translate(-50%,-80px)'; el.style.opacity='0'; });
  setTimeout(()=>el.remove(),800);
}

// Combat
function tryAttack(){
  if(Date.now()-lastAttack < 320) return;
  if(player.dead) return;
  if(!document.getElementById('inventory').classList.contains('hidden') || !document.getElementById('shop').classList.contains('hidden')) return;
  lastAttack=Date.now();
  const st=calcStats();
  // attack anim
  player.attackTimer=12;
  let range = 42;
  let hit=false;
  enemies.forEach(en=>{
    if(en.dead) return;
    let d = Math.hypot(en.x - (player.x + player.facing.x*18), en.y + player.facing.y*18 - en.y);
    // simpler distance from player center
    let d2 = Math.hypot(en.x-player.x, en.y-player.y);
    if(d2 < range+en.w){
      hit=true;
      let isCrit = Math.random() < st.crit;
      let dmg = Math.max(1, st.atk - en.def + Math.floor(Math.random()*6 -2));
      if(isCrit) dmg = Math.floor(dmg*1.7);
      en.hp -= dmg;
      en.hitTimer=10;
      spawnParticle(en.x, en.y-18, (isCrit?'КРИТ! ':'')+dmg, isCrit?'#ffcc00':'#ff4d4d');
      // knockback
      let ang = Math.atan2(en.y-player.y, en.x-player.x);
      en.x += Math.cos(ang)*10;
      en.y += Math.sin(ang)*10;
      if(en.hp<=0){
        en.dead=true;
        // xp and gold
        player.xp += en.xp;
        player.gold += en.gold;
        spawnParticle(en.x, en.y, '+'+en.xp+' XP', '#6bff8a');
        // drops
        let lootChance = Math.random();
        let lootId=null;
        if(en.type==='slime' && lootChance<0.6) lootId='slime_gel';
        else if(en.type==='goblin' && lootChance<0.5) lootId='goblin_ear';
        else if(en.type==='skeleton' && lootChance<0.5) lootId='bone';
        else if(lootChance<0.4) lootId='hp_potion';
        if(lootChance<0.15) lootId='desert_scale';
        if(lootId) drops.push({x:en.x, y:en.y, id:lootId, count:1});
        if(Math.random()<0.08) drops.push({x:en.x+8, y:en.y, id:'hp_potion', count:1});
        checkLevelUp();
        updateHUD();
        save();
      }
    }
  });
  // swing effect even if no hit
  if(!hit){
    // play miss
  }
}
function checkLevelUp(){
  while(player.xp >= player.xpNeed){
    player.xp -= player.xpNeed;
    player.level++;
    player.xpNeed = xpNeed(player.level);
    player.statPoints+=3;
    const stBefore=player.maxHp;
    const st=calcStats(); // but need to calc after? we already have stats unchanged, maxHp will increase on vit?
    // heal fully on level up
    // recalc after points? just heal
    player.maxHp = calcStats().maxHp;
    player.hp = player.maxHp;
    document.getElementById('lvl-text').textContent='Уровень '+player.level+'! +3 очка характеристик';
    document.getElementById('levelup').classList.remove('hidden');
    spawnParticle(player.x, player.y-30, 'LEVEL UP!', '#ffcc00');
  }
}
function enemyAttack(en){
  if(en.cooldown>0) return;
  let d = Math.hypot(en.x-player.x, en.y-player.y);
  if(d<30){
    const st=calcStats();
    let dmg = Math.max(1, en.atk - Math.floor(st.def*0.6) + Math.floor(Math.random()*4-1));
    player.hp -= dmg;
    player.invul=20;
    spawnParticle(player.x, player.y-14, '-'+dmg, '#ff4d4d');
    en.cooldown=60 + Math.floor(Math.random()*30);
    updateHUD();
    if(player.hp<=0){
      player.hp=0;
      player.dead=true;
      player.gold = Math.floor(player.gold*0.9);
      document.getElementById('death').classList.remove('hidden');
      updateHUD(); save();
    }
  }
}

// ---------- UPDATE LOOP ----------
function update(){
  if(player.dead) return;
  const st=calcStats();
  let speed = st.speed;
  let dx=0, dy=0;
  if(keys['w']||keys['arrowup']) dy-=1;
  if(keys['s']||keys['arrowdown']) dy+=1;
  if(keys['a']||keys['arrowleft']) dx-=1;
  if(keys['d']||keys['arrowright']) dx+=1;
  if(dx||dy){
    let len=Math.hypot(dx,dy);
    dx/=len; dy/=len;
    player.facing={x:dx,y:dy};
    let nx = player.x + dx*speed;
    let ny = player.y + dy*speed;
    // collision X
    if(!isSolidAt(nx, player.y)) player.x = nx;
    // collision Y
    if(!isSolidAt(player.x, ny)) player.y = ny;
  }
  // camera follow
  camera.x += ((player.x - VIEW_W/2) - camera.x)*0.12;
  camera.y += ((player.y - VIEW_H/2) - camera.y)*0.12;
  camera.x = Math.max(0, Math.min(camera.x, LOCS[currentLoc].w*TILE - VIEW_W));
  camera.y = Math.max(0, Math.min(camera.y, LOCS[currentLoc].h*TILE - VIEW_H));

  // enemies AI
  enemies.forEach(en=>{
    if(en.dead) return;
    if(en.hitTimer>0) en.hitTimer--;
    if(en.cooldown>0) en.cooldown--;
    let d = Math.hypot(en.x-player.x, en.y-player.y);
    if(d<180){
      let ang=Math.atan2(player.y-en.y, player.x-en.x);
      let spd=0.9 + (en.type==='bat'?0.7:0) + (en.type==='golem'?-0.3:0);
      let nx=en.x + Math.cos(ang)*spd;
      let ny=en.y + Math.sin(ang)*spd;
      if(!isSolidAt(nx,en.y)) en.x=nx;
      if(!isSolidAt(en.x,ny)) en.y=ny;
      enemyAttack(en);
    } else {
      // wander
      if(Math.random()<0.02){
        en.vx=(Math.random()-0.5)*0.6; en.vy=(Math.random()-0.5)*0.6;
      }
      let nx=en.x+en.vx, ny=en.y+en.vy;
      if(!isSolidAt(nx,en.y)) en.x=nx; else en.vx*=-1;
      if(!isSolidAt(en.x,ny)) en.y=ny; else en.vy*=-1;
    }
  });
  // check near NPC / portal / drop
  nearNPC=null; nearPortal=null; nearDrop=null;
  let minNPC=40;
  npcs.forEach(n=>{
    let d=Math.hypot(n.x-player.x,n.y-player.y);
    if(d<minNPC){ minNPC=d; nearNPC=n; }
  });
  portals.forEach(p=>{
    if(player.x>p.x && player.x<p.x+p.w && player.y>p.y && player.y<p.y+p.h){
      nearPortal=p;
    }
  });
  let minDrop=28;
  drops.forEach(d=>{
    let dist=Math.hypot(d.x-player.x,d.y-player.y);
    if(dist<minDrop){ minDrop=dist; nearDrop=d; }
  });
  // hint
  const hint=document.getElementById('hint');
  if(nearNPC){ hint.style.display='block'; hint.innerHTML=`Нажми <b>[E]</b> поговорить с ${nearNPC.name}`; }
  else if(nearPortal){ hint.style.display='block'; hint.innerHTML=`Нажми <b>[E]</b> ${nearPortal.label}`; }
  else if(nearDrop){ hint.style.display='block'; hint.innerHTML=`Нажми <b>[E]</b> поднять ${ITEMS[nearDrop.id].name}`; }
  else hint.style.display='none';

  if(player.invul>0) player.invul--;
  if(player.attackTimer>0) player.attackTimer--;

  // auto regen a bit? no
  // respawn enemies if all dead
  if(enemies.filter(e=>!e.dead).length===0 && LOCS[currentLoc].enemyCount>0){
    // 10% chance per second to respawn one
    if(Math.random()<0.008){
      let L=LOCS[currentLoc];
      let type=L.enemies[Math.floor(Math.random()*L.enemies.length)];
      let tpl=ENEMIES[type];
      let x=2+Math.floor(Math.random()*(L.w-4)), y=2+Math.floor(Math.random()*(L.h-4));
      if(!isSolidTile(x,y)){
        enemies.push({type, ...JSON.parse(JSON.stringify(tpl)), x:x*TILE, y:y*TILE, maxHp:tpl.hp, hp:tpl.hp, w:24,h:24, vx:0,vy:0, cooldown:0, hitTimer:0, dead:false});
      }
    }
  }
}

// ---------- DRAW ----------
function draw(){
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  // draw tiles
  let startX=Math.floor(camera.x/TILE), endX=Math.ceil((camera.x+VIEW_W)/TILE);
  let startY=Math.floor(camera.y/TILE), endY=Math.ceil((camera.y+VIEW_H)/TILE);
  for(let y=startY;y<endY;y++){
    for(let x=startX;x<endX;x++){
      if(y<0||y>=map.length||x<0||x>=map[0].length) continue;
      let t=map[y][x];
      let sx=x*TILE-camera.x, sy=y*TILE-camera.y;
      // base ground color per loc
      let base = LOCS[currentLoc].color;
      if(t===0){ // ground with checker
        ctx.fillStyle = (x+y)%2===0 ? adjust(base, 10) : adjust(base, -8);
        ctx.fillRect(sx,sy,TILE,TILE);
        // grass dots for village/forest
        if(currentLoc==='village' || currentLoc==='forest'){
          if((x*3+y*7)%11===0){ ctx.fillStyle='#ffffff0c'; ctx.fillRect(sx+8,sy+8,4,4); }
        }
        if(currentLoc==='desert'){
          ctx.fillStyle='#ffffff18'; if((x+y)%5===0) ctx.fillRect(sx+12,sy+12,2,2);
        }
      } else if(t===1){ // wall
        ctx.fillStyle = currentLoc==='cave'? '#3a3a4a' : currentLoc==='desert'? '#8a7a5a' : '#4a3a2a';
        ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(sx,sy,TILE,6);
        ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(sx+4,sy+4,TILE-8,TILE-8);
      } else if(t===2){ // water
        ctx.fillStyle = currentLoc==='desert' ? '#4fc3f7' : currentLoc==='cave' ? '#ff6a3a' : '#3a7bd5';
        ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle='rgba(255,255,255,.25)';
        let off = (Date.now()/400 + x*0.7)%1;
        ctx.fillRect(sx+4, sy+8+off*4, TILE-8, 2);
      } else if(t===3){ // road
        ctx.fillStyle='#6b5a3a'; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle='#8a7a4a'; ctx.fillRect(sx+2,sy+2,TILE-4,TILE-4);
        ctx.fillStyle='#3a2a1a'; if(y===11||x===15) ctx.fillRect(sx+TILE/2-1,sy,2,TILE);
      } else if(t===4){ // tree
        ctx.fillStyle= adjust(base, 12); ctx.fillRect(sx,sy,TILE,TILE);
        // trunk
        ctx.fillStyle='#5a3a1a'; ctx.fillRect(sx+TILE/2-4,sy+TILE/2,8,16);
        ctx.fillStyle='#2e7d32'; ctx.beginPath(); ctx.arc(sx+TILE/2, sy+10, 14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#1b5e20'; ctx.beginPath(); ctx.arc(sx+TILE/2-4, sy+8, 6,0,Math.PI*2); ctx.fill();
      } else if(t===5){ // house floor
        ctx.fillStyle='#8a6a3a'; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle='#6a4a1a'; ctx.strokeRect(sx+1,sy+1,TILE-2,TILE-2);
      }
      // grid subtle
      ctx.strokeStyle='rgba(0,0,0,.06)'; ctx.strokeRect(sx,sy,TILE,TILE);
    }
  }
  // portals
  portals.forEach(p=>{
    let sx=p.x-camera.x, sy=p.y-camera.y;
    ctx.fillStyle='#ffcc00'; ctx.globalAlpha=0.85;
    ctx.fillRect(sx,sy,p.w,p.h);
    ctx.globalAlpha=1;
    ctx.fillStyle='#1a1a1a'; ctx.font='700 10px Manrope'; ctx.textAlign='center';
    ctx.fillText(p.label, sx+p.w/2, sy+p.h/2+3);
    // glow
    ctx.fillStyle='rgba(255,204,0,.18)';
    ctx.fillRect(sx-6,sy-6,p.w+12,p.h+12);
  });
  // drops
  drops.forEach(d=>{
    let sx=d.x-camera.x, sy=d.y-camera.y;
    ctx.fillStyle='#000'; ctx.globalAlpha=0.25; ctx.beginPath(); ctx.ellipse(sx,sy+10,10,4,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    ctx.font='20px serif'; ctx.textAlign='center'; ctx.fillText(ITEMS[d.id].icon, sx, sy);
    // bob
    let bob=Math.sin(Date.now()/300 + d.x)*4;
    ctx.font='20px serif'; ctx.fillText(ITEMS[d.id].icon, sx, sy+bob);
  });
  // npcs
  npcs.forEach(n=>{
    let sx=n.x-camera.x, sy=n.y-camera.y;
    // shadow
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx,sy+14,14,5,0,0,Math.PI*2); ctx.fill();
    // body pixel
    drawPixelChar(sx,sy,n);
    ctx.fillStyle='#fff'; ctx.font='700 11px Manrope'; ctx.textAlign='center';
    ctx.fillText(n.name, sx, sy-28);
    if(nearNPC===n){
      ctx.fillStyle='#ffcc00'; ctx.beginPath(); ctx.arc(sx, sy-38, 3,0,Math.PI*2); ctx.fill();
    }
  });
  // enemies
  enemies.forEach(en=>{
    if(en.dead) return;
    let sx=en.x-camera.x, sy=en.y-camera.y;
    let flash = en.hitTimer>0 ? (en.hitTimer%4<2) : false;
    // shadow
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(sx,sy+14,12*en.scale,4,0,0,Math.PI*2); ctx.fill();
    // body
    ctx.save();
    if(flash) ctx.filter='brightness(2)';
    drawEnemy(sx,sy,en);
    ctx.restore();
    // hp bar
    let w=28*en.scale, h=4;
    ctx.fillStyle='#000'; ctx.fillRect(sx-w/2-1,sy-22-1,w+2,h+2);
    ctx.fillStyle='#ff4d4d'; ctx.fillRect(sx-w/2,sy-22,w*(en.hp/en.maxHp),h);
    ctx.fillStyle='#fff'; ctx.font='700 9px Manrope'; ctx.textAlign='center'; ctx.fillText(en.name, sx, sy-30);
  });
  // player
  let px=player.x-camera.x, py=player.y-camera.y;
  if(player.invul===0 || player.invul%4<2){
    // shadow
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(px,py+14,12,5,0,0,Math.PI*2); ctx.fill();
    // if attacking, draw swing
    if(player.attackTimer>0){
      ctx.save();
      ctx.translate(px,py);
      let ang = Math.atan2(player.facing.y, player.facing.x);
      ctx.rotate(ang);
      ctx.fillStyle='rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(18,0,18, -0.9, 0.9); ctx.lineTo(0,0); ctx.fill();
      ctx.fillStyle='#ffcc00'; ctx.fillRect(14,-2,14,4);
      ctx.restore();
    }
    drawPlayer(px,py);
    // level badge
    ctx.fillStyle='#ffcc00'; ctx.beginPath(); ctx.arc(px+14, py-18, 8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.font='800 10px Manrope'; ctx.textAlign='center'; ctx.fillText(player.level, px+14, py-15);
  }
  // mini vignette
  // ctx.fillStyle='radial-gradient...'; // skip
}

function adjust(hex, amt){
  // hex color adjust brightness
  let c=hex.replace('#','');
  let r=parseInt(c.substring(0,2),16), g=parseInt(c.substring(2,4),16), b=parseInt(c.substring(4,6),16);
  r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt));
  return `rgb(${r},${g},${b})`;
}
function drawPlayer(sx,sy){
  // pixel style 16x? simple
  // head
  ctx.fillStyle='#ffdbac'; ctx.fillRect(sx-7,sy-18,14,10);
  ctx.fillStyle='#1a1a1a'; ctx.fillRect(sx-6,sy-16,4,3); ctx.fillRect(sx+2,sy-16,4,3); // eyes
  ctx.fillStyle='#ff8a8a'; ctx.fillRect(sx-2,sy-12,4,2); // mouth
  // hair
  ctx.fillStyle='#3a2a1a'; ctx.fillRect(sx-8,sy-20,16,5);
  // body
  let bodyColor = player.equip.armor ? '#4a7cff' : '#3a9ad9';
  ctx.fillStyle=bodyColor; ctx.fillRect(sx-6,sy-8,12,12);
  ctx.fillStyle='#2a5a8a'; ctx.fillRect(sx-6,sy-8,3,12); ctx.fillRect(sx+3,sy-8,3,12);
  // arms
  ctx.fillStyle='#ffdbac'; ctx.fillRect(sx-10,sy-6,4,8); ctx.fillRect(sx+6,sy-6,4,8);
  // weapon in hand
  if(player.equip.weapon){
    ctx.fillStyle='#c0c0c0'; ctx.fillRect(sx+8,sy-10,3,14);
    ctx.fillStyle='#ffcc00'; ctx.fillRect(sx+7,sy-12,5,4);
  } else {
    ctx.fillStyle='#8a5a2a'; ctx.fillRect(sx+8,sy-8,2,10);
  }
  // legs
  ctx.fillStyle='#2a3a5a'; ctx.fillRect(sx-5,sy+4,5,10); ctx.fillRect(sx, sy+4,5,10);
  ctx.fillStyle='#1a1a1a'; ctx.fillRect(sx-5,sy+12,5,3); ctx.fillRect(sx,sy+12,5,3);
}
function drawPixelChar(sx,sy,n){
  ctx.fillStyle=n.color; ctx.fillRect(sx-8,sy-16,16,16);
  ctx.fillStyle='#1a1a1a'; ctx.fillRect(sx-6,sy-12,3,3); ctx.fillRect(sx+3,sy-12,3,3);
  ctx.fillStyle='#fff'; ctx.fillRect(sx-5,sy-11,1,1); ctx.fillRect(sx+4,sy-11,1,1);
  ctx.fillStyle='#ffdbac'; ctx.fillRect(sx-7,sy-4,14,8);
  ctx.font='14px serif'; ctx.textAlign='center'; ctx.fillText(n.icon, sx, sy-1);
}
function drawEnemy(sx,sy,en){
  let c = en.color;
  // body box
  ctx.fillStyle=c; ctx.fillRect(sx-12*en.scale, sy-12*en.scale, 24*en.scale, 20*en.scale);
  ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(sx-12*en.scale, sy+4*en.scale, 24*en.scale, 4*en.scale);
  // eyes
  ctx.fillStyle='#000'; ctx.fillRect(sx-7*en.scale, sy-8*en.scale, 4*en.scale,4*en.scale); ctx.fillRect(sx+3*en.scale, sy-8*en.scale,4*en.scale,4*en.scale);
  ctx.fillStyle='#ff4d4d'; ctx.fillRect(sx-6*en.scale, sy-7*en.scale,2*en.scale,2*en.scale); ctx.fillRect(sx+4*en.scale, sy-7*en.scale,2*en.scale,2*en.scale);
  ctx.font=`${14*en.scale}px serif`; ctx.textAlign='center'; ctx.fillText(en.icon, sx, sy+2);
}

// Save / Load
function save(){
  localStorage.setItem('pixelRPG_save', JSON.stringify({player, currentLoc}));
}
function load(){
  let s=localStorage.getItem('pixelRPG_save');
  if(s){
    try{
      let data=JSON.parse(s);
      if(data.player){ Object.assign(player, data.player); player.hp=Math.min(player.hp, calcStats().maxHp); }
      if(data.currentLoc) currentLoc=data.currentLoc;
    }catch(e){}
  }
  player.maxHp=calcStats().maxHp;
  if(player.hp>player.maxHp) player.hp=player.maxHp;
  player.xpNeed=xpNeed(player.level);
}

// Loop
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

// Start
function startGame(){
  document.getElementById('start-screen').classList.add('hidden');
  load();
  map=genMap(currentLoc);
  // ensure player not inside wall
  if(isSolidAt(player.x,player.y)){ player.x=16*TILE; player.y=11*TILE; }
  spawnEnemies();
  spawnNPCs();
  // starter items
  if(!hasItem('hp_potion')){ addItem('hp_potion',3); addItem('stick',1); }
  if(!player.equip.weapon){ player.equip.weapon='stick'; }
  player.maxHp=calcStats().maxHp;
  if(player.hp>player.maxHp) player.hp=player.maxHp;
  updateHUD();
  loop();
}
window.startGame=startGame;
window.toggleInventory=toggleInventory;
window.toggleStats=toggleStats;
window.toggleMap=toggleMap;
window.closeShop=closeShop;
window.hideLevelUp=hideLevelUp;
window.respawn=respawn;
window.useItem=useItem;
window.equipItem=equipItem;
window.sellOne=sellOne;
window.addStat=addStat;

// expose for HTML inline
window.closeAll=closeAll;

// initial: keep start screen, but prepare map for preview behind?
load();
map=genMap(currentLoc);
spawnEnemies(); spawnNPCs();
updateHUD();
requestAnimationFrame(function preview(){
  if(document.getElementById('start-screen').classList.contains('hidden')) return;
  // draw preview behind start screen
  draw();
  requestAnimationFrame(preview);
});

setInterval(save, 3000);
