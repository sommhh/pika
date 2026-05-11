
const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

const offLuxInput = document.getElementById('offLux');
const onLuxInput = document.getElementById('onLux');
const targetLuxInput = document.getElementById('targetLux');
const commentInput = document.getElementById('comment');

const pointList = document.getElementById('pointList');

let points = [];
let selectedPoint = null;
let pointNo = 1;
let showMinimal = true;

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

window.addEventListener('resize', resize);
resize();

async function initCamera(){

  try{

    const stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ideal:'environment'},
        width:{ideal:1280},
        height:{ideal:720}
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

function createPointId(){
  return 'A' + pointNo++;
}

function addPoint(x,y){

  const rect = canvas.getBoundingClientRect();

  const point = {
    id:createPointId(),
    rx:x/rect.width,
    ry:y/rect.height,
    offLux:null,
    onLux:null,
    diff:null,
    comment:'',
    created:new Date().toLocaleString()
  };

  points.push(point);

  selectedPoint = point;

  renderPointList();
}

canvas.addEventListener('click',e=>{

  const rect = canvas.getBoundingClientRect();

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const nearest = findNearest(x,y);

  if(nearest){
    selectedPoint = nearest;
    syncInputs();
    renderPointList();
    return;
  }

  addPoint(x,y);

});

function findNearest(x,y){

  let best = null;
  let min = 999999;

  for(const p of points){

    const px = p.rx * canvas.width;
    const py = p.ry * canvas.height;

    const dx = px - x;
    const dy = py - y;

    const d = dx*dx + dy*dy;

    if(d < min){
      min = d;
      best = p;
    }
  }

  return min < 1600 ? best : null;
}

function renderOverlay(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(const p of points){

    const x = p.rx * canvas.width;
    const y = p.ry * canvas.height;

    ctx.beginPath();
    ctx.arc(x,y,12,0,Math.PI*2);

    const ng = p.diff != null && p.diff < Number(targetLuxInput.value || 0);

    ctx.fillStyle = ng ? '#ff3b30' : '#0a84ff';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';

    ctx.fillText(p.id,x+16,y);

    if(selectedPoint && selectedPoint.id === p.id && !showMinimal){

      ctx.fillStyle = 'rgba(0,0,0,.85)';
      ctx.fillRect(x+16,y+10,150,72);

      ctx.fillStyle = '#fff';
      ctx.font = '13px sans-serif';

      ctx.fillText('消灯:'+ (p.offLux ?? '-'),x+24,y+30);
      ctx.fillText('点灯:'+ (p.onLux ?? '-'),x+24,y+48);
      ctx.fillText('差:'+ (p.diff ?? '-'),x+24,y+66);

    }

  }

  requestAnimationFrame(renderOverlay);
}

function renderPointList(){

  pointList.innerHTML = '';

  for(const p of points){

    const div = document.createElement('div');
    div.className = 'pointCard';

    const ng = p.diff != null && p.diff < Number(targetLuxInput.value || 0);

    div.innerHTML = `
      <b>${p.id}</b>
      <span class="badge">${ng ? 'NG' : 'OK'}</span>
      <br>
      消灯:${p.offLux ?? '-'}
      点灯:${p.onLux ?? '-'}
      差:${p.diff ?? '-'}
      <br>
      ${p.comment || ''}
    `;

    div.onclick = ()=>{
      selectedPoint = p;
      syncInputs();
    };

    pointList.appendChild(div);
  }

}

function syncInputs(){

  if(!selectedPoint) return;

  offLuxInput.value = selectedPoint.offLux ?? '';
  onLuxInput.value = selectedPoint.onLux ?? '';
  commentInput.value = selectedPoint.comment ?? '';
}

function updateSelected(){

  if(!selectedPoint) return;

  selectedPoint.offLux = Number(offLuxInput.value || 0);
  selectedPoint.onLux = Number(onLuxInput.value || 0);
  selectedPoint.diff =
    selectedPoint.onLux - selectedPoint.offLux;

  selectedPoint.comment = commentInput.value;

  renderPointList();
}

offLuxInput.addEventListener('input',updateSelected);
onLuxInput.addEventListener('input',updateSelected);
commentInput.addEventListener('input',updateSelected);

document.getElementById('toggleLabelBtn').onclick = ()=>{

  showMinimal = !showMinimal;

  document.getElementById('toggleLabelBtn').textContent =
    showMinimal ? '番号のみ' : '詳細表示';
};

document.getElementById('addBtn').onclick = ()=>{
  addPoint(canvas.width/2, canvas.height/2);
};

document.getElementById('exportCsvBtn').onclick = ()=>{

  const rows = [
    ['ID','消灯','点灯','差分','コメント']
  ];

  for(const p of points){
    rows.push([
      p.id,
      p.offLux,
      p.onLux,
      p.diff,
      p.comment
    ]);
  }

  const csv = rows.map(r=>r.join(',')).join('\n');

  const blob = new Blob([csv],{
    type:'text/csv'
  });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lux_points.csv';
  a.click();
};

document.getElementById('exportPdfBtn').onclick = ()=>{

  window.print();
};

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js');
}

initCamera();
renderOverlay();
