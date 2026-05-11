const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');

const offLux = document.getElementById('offLux');
const onLux = document.getElementById('onLux');

const pointsWrap = document.getElementById('points');

let points = [];
let selected = null;

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

window.addEventListener('resize',resize);
resize();

async function initCamera(){

  try{

    const stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:'environment'}
      },
      audio:false
    });

    video.srcObject = stream;
    await video.play();

  }catch(err){
    console.error(err);
    alert('カメラ起動失敗');
  }
}

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  points.forEach(p=>{

    const x = p.rx * canvas.width;
    const y = p.ry * canvas.height;

    ctx.beginPath();
    ctx.arc(x,y,16,0,Math.PI*2);
    ctx.fillStyle='red';
    ctx.fill();

    ctx.fillStyle='white';
    ctx.font='18px sans-serif';
    ctx.fillText(`${p.id} ${p.diff ?? '-'}lx`,x+24,y);

  });

  requestAnimationFrame(draw);
}

function renderList(){

  pointsWrap.innerHTML='';

  points.forEach(p=>{

    const div = document.createElement('div');
    div.className='point';

    div.innerHTML = `
      <b>${p.id}</b><br>
      消灯:${p.offLux ?? '-'} lx<br>
      点灯:${p.onLux ?? '-'} lx<br>
      差分:${p.diff ?? '-'} lx
    `;

    div.onclick=()=>selected=p;

    pointsWrap.appendChild(div);

  });
}

canvas.addEventListener('click',e=>{

  const rect = canvas.getBoundingClientRect();

  const point = {
    id:'P-'+Date.now(),
    rx:(e.clientX-rect.left)/rect.width,
    ry:(e.clientY-rect.top)/rect.height,
    offLux:null,
    onLux:null,
    diff:null
  };

  points.push(point);
  selected=point;

  renderList();

});

function updateLux(){

  if(!selected) return;

  selected.offLux = Number(offLux.value)||0;
  selected.onLux = Number(onLux.value)||0;
  selected.diff = selected.onLux - selected.offLux;

  renderList();
}

offLux.addEventListener('input',updateLux);
onLux.addEventListener('input',updateLux);

exportBtn.onclick=()=>{

  const rows = [
    ['ID','消灯','点灯','差分']
  ];

  points.forEach(p=>{
    rows.push([
      p.id,
      p.offLux,
      p.onLux,
      p.diff
    ]);
  });

  const csv = rows.map(r=>r.join(',')).join('\n');

  const blob = new Blob([csv],{
    type:'text/csv'
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download='lux.csv';
  a.click();

};

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js');
}

initCamera();
draw();
