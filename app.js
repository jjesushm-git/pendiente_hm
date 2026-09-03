const STORAGE_KEY = "mis_tareas_v1";
const SETTINGS_KEY = "mis_tareas_settings_v1";
const TRASH_KEY = "mis_tareas_trash_v1";
const TRASH_TTL = 24 * 60 * 60 * 1000;
const DEFAULT_PENDING_FILTER = "upcoming";
const APP_VERSION = "v8";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let tasks = loadTasks();
let trash = loadTrash();
let selectedDate = startOfDay(new Date());
let calendarCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let weekCursor = startOfWeek(selectedDate);
let currentView = "day";
let notificationTimers = new Map();

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }
function pad(n){ return String(n).padStart(2,"0"); }
function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseDate(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function startOfDay(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d){ const x=startOfDay(d); const day=(x.getDay()+6)%7; return addDays(x,-day); }
function monthName(d){ return d.toLocaleDateString("es-MX",{month:"long",year:"numeric"}); }
function longDate(d){ return d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
function shortDate(d){ return d.toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function esc(s=""){ return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function loadTasks(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return []} }
function loadTrash(){ try{return JSON.parse(localStorage.getItem(TRASH_KEY))||[]}catch{return []} }
function saveTrash(){ localStorage.setItem(TRASH_KEY, JSON.stringify(trash)); }
function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); purgeExpiredTrash(); scheduleNotifications(); renderAll(); }
function purgeExpiredTrash(){
  const now=Date.now();
  const before=trash.length;
  trash=trash.filter(t=>!t.deletedAt || (now-new Date(t.deletedAt).getTime()) < TRASH_TTL);
  if(trash.length!==before) saveTrash();
}
function moveToTrash(id){
  const idx=tasks.findIndex(t=>t.id===id);
  if(idx<0) return;
  const [task]=tasks.splice(idx,1);
  trash.unshift({...task,deletedAt:new Date().toISOString()});
  saveTrash();
  saveTasks();
}
function restoreFromTrash(id){
  const idx=trash.findIndex(t=>t.id===id);
  if(idx<0) return;
  const [task]=trash.splice(idx,1);
  delete task.deletedAt;
  if(tasks.some(t=>t.id===task.id)) task.id=uid();
  tasks.push(task);
  saveTrash();
  saveTasks();
}
function deleteForever(id){
  trash=trash.filter(t=>t.id!==id);
  saveTrash();
  renderTrash();
}
function taskDueDate(t){
  const d=parseDate(t.dueDate);
  if(t.allDay){ d.setHours(23,59,59,999); } else {
    const [h,m]=(t.dueTime||"23:59").split(":").map(Number); d.setHours(h,m,0,0);
  }
  return d;
}
function taskStartDate(t){
  const d=parseDate(t.startDate);
  if(!t.allDay && t.startTime){ const [h,m]=t.startTime.split(":").map(Number); d.setHours(h,m,0,0); }
  return d;
}
function normalizeStatuses(){
  const now=new Date();
  let changed=false;
  for(const t of tasks){
    if(t.status==="pending" && t.recurrence==="none" && taskDueDate(t) < now){
      t.status="missed";
      t.missedAt=now.toISOString();
      changed=true;
    }
  }
  if(changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function nextDueForSort(t){
  if(t.recurrence==="none") return taskDueDate(t);
  const now=new Date();
  const baseDue=taskDueDate(t);
  let candidate=new Date(baseDue);

  // Advance recurring task until its next occurrence is now/future.
  let guard=0;
  while(candidate < now && guard < 5000){
    if(t.recurrence==="daily") candidate.setDate(candidate.getDate()+1);
    else if(t.recurrence==="weekly") candidate.setDate(candidate.getDate()+7);
    else if(t.recurrence==="monthly") candidate.setMonth(candidate.getMonth()+1);
    else if(t.recurrence==="yearly") candidate.setFullYear(candidate.getFullYear()+1);
    else break;
    guard++;
  }
  return candidate;
}

function formatTimeMeta(t){
  return t.allDay ? "Todo el día" : `${t.startTime||"--:--"}${t.dueTime ? " – "+t.dueTime : ""}`;
}
function recurrenceLabel(r){
  return ({daily:"Diaria",weekly:"Semanal",monthly:"Mensual",yearly:"Anual"})[r]||"";
}
function statusLabel(s){ return ({pending:"Pendiente",completed:"Completada",missed:"No completada"})[s]; }

function renderAll(){
  normalizeStatuses();
  purgeExpiredTrash(); renderWeekStrip(); renderDay(); renderCalendar(); renderWeek(); renderGantt(); renderTrash();
}
function renderWeekStrip(){
  const week=startOfWeek(selectedDate);
  $("#weekStrip").innerHTML = [...Array(7)].map((_,i)=>{
    const d=addDays(week,i), key=dateKey(d);
    const has=tasks.some(t=>occursOn(t,d)&&t.status==="pending");
    return `<button class="week-day ${key===dateKey(selectedDate)?"active":""}" data-date="${key}">
      <span class="dow">${d.toLocaleDateString("es-MX",{weekday:"short"}).replace(".","")}</span>
      <span class="num">${d.getDate()}</span>${has?'<span class="dot"></span>':""}
    </button>`;
  }).join("");
  $$(".week-day").forEach(b=>b.onclick=()=>{selectedDate=parseDate(b.dataset.date); switchView("day"); renderAll();});
}
function renderDay(){
  $("#selectedDateTitle").textContent = longDate(selectedDate);
  if ($("#dayDatePicker")) $("#dayDatePicker").value = dateKey(selectedDate);

  // Global sections: do not hide tasks just because they belong to another date.
  const allPending = tasks
    .filter(t=>t.status==="pending")
    .sort((a,b)=>nextDueForSort(a)-nextDueForSort(b));

  const allCompleted = tasks
    .filter(t=>t.status==="completed")
    .sort((a,b)=>{
      const ad=a.completedAt ? new Date(a.completedAt) : taskDueDate(a);
      const bd=b.completedAt ? new Date(b.completedAt) : taskDueDate(b);
      return bd-ad;
    });

  const allMissed = tasks
    .filter(t=>t.status==="missed")
    .sort((a,b)=>taskDueDate(b)-taskDueDate(a));

  const todayKey=dateKey(selectedDate);
  const filter=$("#pendingFilter").value;
  let filtered=allPending;

  if(filter==="today"){
    filtered=allPending.filter(t=>occursOn(t,selectedDate));
  }

  if(filter==="upcoming"){
    filtered=allPending
      .filter(t=>nextDueForSort(t)>=new Date())
      .sort((a,b)=>nextDueForSort(a)-nextDueForSort(b));
  }

  if(filter==="recurring"){
    filtered=allPending
      .filter(t=>t.recurrence!=="none")
      .sort((a,b)=>nextDueForSort(a)-nextDueForSort(b));
  }

  $("#statsGrid").innerHTML = `
    <div class="stat-card"><strong>${allPending.length}</strong><small>Pendientes</small></div>
    <div class="stat-card"><strong>${allCompleted.length}</strong><small>Completadas</small></div>
    <div class="stat-card"><strong>${allMissed.length}</strong><small>Vencidas</small></div>`;

  $("#pendingList").innerHTML=listHtml(filtered);
  $("#completedList").innerHTML=listHtml(allCompleted);
  $("#missedList").innerHTML=listHtml(allMissed);
  bindTaskActions();
}
function expandedTasksForDate(d){ return tasks.filter(t=>occursOn(t,d)); }
function occursOn(t,d){
  const target=startOfDay(d), start=startOfDay(parseDate(t.startDate)), due=startOfDay(parseDate(t.dueDate));
  if(t.recurrence==="none") return target>=start && target<=due;
  if(target<start) return false;
  if(t.status!=="pending" && target>due) return false;
  switch(t.recurrence){
    case "daily": return true;
    case "weekly": return target.getDay()===start.getDay();
    case "monthly": return target.getDate()===start.getDate();
    case "yearly": return target.getDate()===start.getDate() && target.getMonth()===start.getMonth();
    default:return false;
  }
}
function listHtml(list){
  if(!list.length) return `<div class="empty">No hay tareas en esta sección.</div>`;
  return list.map(t=>taskCard(t)).join("");
}
function taskCard(t){
  const due=taskDueDate(t);
  return `<article class="task-card ${t.status}">
    <div class="task-row">
      <input class="task-check" type="checkbox" data-complete="${t.id}" ${t.status==="completed"?"checked":""} ${t.status==="missed"?"disabled":""}/>
      <div>
        <div class="task-title">${esc(t.title)}</div>
        ${t.description?`<div class="task-desc">${esc(t.description)}</div>`:""}
        <div class="task-meta">
          <span>📅 ${shortDate(parseDate(t.dueDate))}</span>
          <span>🕒 ${formatTimeMeta(t)}</span>
          ${t.recurrence!=="none"?`<span class="recur-pill">↻ ${recurrenceLabel(t.recurrence)}</span>`:""}
          ${t.comment?`<span>💬 ${esc(t.comment)}</span>`:""}
        </div>
        <div class="card-actions">
          <button data-edit="${t.id}">Editar</button>
          ${t.status==="missed"?`<button data-reopen="${t.id}">Reabrir</button>`:""}
          <button class="task-delete-btn" data-delete="${t.id}">Eliminar</button>
        </div>
      </div>
      <span class="status-pill ${t.status}">${statusLabel(t.status)}</span>
    </div>
  </article>`;
}
function bindTaskActions(){
  $$("[data-complete]").forEach(ch=>ch.onchange=()=>{
    const t=tasks.find(x=>x.id===ch.dataset.complete); if(!t)return;
    t.status=ch.checked?"completed":"pending";
    t.completedAt=ch.checked?new Date().toISOString():null;
    saveTasks();
  });
  $$("[data-edit]").forEach(b=>b.onclick=()=>openTask(tasks.find(t=>t.id===b.dataset.edit)));
  $$("[data-reopen]").forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.reopen); t.status="pending"; t.missedAt=null; saveTasks();});
  $$("[data-delete]").forEach(b=>b.onclick=()=>{
    const t=tasks.find(x=>x.id===b.dataset.delete);
    if(!t) return;
    if(confirm(`¿Eliminar "${t.title}"?\n\nSe moverá a la papelera y podrás restaurarla durante 24 horas.`)){
      moveToTrash(t.id);
      toast("Tarea movida a la papelera.");
    }
  });
}
function renderCalendar(){
  $("#calendarTitle").textContent=monthName(calendarCursor);
  const first=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1);
  const start=addDays(first,-((first.getDay()+6)%7));
  $("#calendarGrid").innerHTML=[...Array(42)].map((_,i)=>{
    const d=addDays(start,i), key=dateKey(d), inMonth=d.getMonth()===calendarCursor.getMonth();
    const dayTasks=expandedTasksForDate(d);
    const dots=dayTasks.slice(0,4).map(t=>`<i class="${t.status==="missed"?"red":t.status==="completed"?"green":""}"></i>`).join("");
    return `<button class="calendar-day ${inMonth?"":"muted"} ${key===dateKey(selectedDate)?"selected":""} ${key===dateKey(new Date())?"today":""}" data-caldate="${key}">
      ${d.getDate()}<span class="calendar-dots">${dots}</span>
    </button>`;
  }).join("");
  $$("[data-caldate]").forEach(b=>b.onclick=()=>{
    selectedDate=parseDate(b.dataset.caldate);
    $("#calendarDayHeading").textContent=`Tareas · ${shortDate(selectedDate)}`;
    $("#calendarDayList").innerHTML=listHtml(expandedTasksForDate(selectedDate).sort((a,b)=>taskDueDate(a)-taskDueDate(b)));
    bindTaskActions(); renderCalendar();
  });
  $("#calendarDayHeading").textContent=`Tareas · ${shortDate(selectedDate)}`;
  $("#calendarDayList").innerHTML=listHtml(expandedTasksForDate(selectedDate).sort((a,b)=>taskDueDate(a)-taskDueDate(b)));
  bindTaskActions();
}
function renderWeek(){
  const end=addDays(weekCursor,6);
  $("#weekTitle").textContent=`${shortDate(weekCursor)} – ${shortDate(end)}`;
  $("#weekBoard").innerHTML=[...Array(7)].map((_,i)=>{
    const d=addDays(weekCursor,i);
    const list=expandedTasksForDate(d).sort((a,b)=>taskDueDate(a)-taskDueDate(b));
    return `<section class="week-column">
      <h3>${d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"short"})}</h3>
      ${list.length?list.map(t=>`<div class="mini-task" data-edit="${t.id}"><strong>${esc(t.title)}</strong><small>${formatTimeMeta(t)} · ${statusLabel(t.status)}</small></div>`).join(""):`<div class="empty">Sin tareas</div>`}
    </section>`;
  }).join("");
  $$("[data-edit]").forEach(b=>b.onclick=()=>openTask(tasks.find(t=>t.id===b.dataset.edit)));
}
function renderGantt(){
  const days=Number($("#ganttRange").value);
  const start=startOfDay(new Date());
  const end=addDays(start,days-1);
  const visible=tasks.filter(t=>taskStartDate(t)<=addDays(end,1)&&taskDueDate(t)>=start).sort((a,b)=>taskDueDate(a)-taskDueDate(b));
  const cell=100/days;
  let html=`<div class="gantt-head"><div></div><div class="gantt-days" style="grid-template-columns:repeat(${days},1fr)">`;
  for(let i=0;i<days;i++){const d=addDays(start,i); html+=`<span>${d.getDate()}<br>${d.toLocaleDateString("es-MX",{month:"short"}).slice(0,3)}</span>`}
  html+=`</div></div>`;
  for(const t of visible){
    const s=Math.max(0,Math.floor((startOfDay(taskStartDate(t))-start)/86400000));
    const e=Math.min(days-1,Math.floor((startOfDay(taskDueDate(t))-start)/86400000));
    const width=Math.max(1,e-s+1);
    html+=`<div class="gantt-row">
      <div class="gantt-label" title="${esc(t.title)}">${esc(t.title)}</div>
      <div class="gantt-track" style="--cell:${cell}%">
        <div class="gantt-bar ${t.status}" data-edit="${t.id}" style="left:${s*cell}%;width:${width*cell}%"></div>
      </div>
    </div>`;
  }
  if(!visible.length) html+=`<div class="empty">No hay tareas dentro de este rango.</div>`;
  $("#ganttChart").innerHTML=html;
  $$("[data-edit]").forEach(b=>b.onclick=()=>openTask(tasks.find(t=>t.id===b.dataset.edit)));
}


function remainingTrashTime(t){
  const elapsed=Date.now()-new Date(t.deletedAt).getTime();
  const left=Math.max(0,TRASH_TTL-elapsed);
  const hours=Math.floor(left/3600000);
  const minutes=Math.floor((left%3600000)/60000);
  return `${hours} h ${minutes} min`;
}
function renderTrash(){
  purgeExpiredTrash();
  const el=$("#trashList");
  if(!el) return;
  if(!trash.length){
    el.innerHTML=`<div class="empty">La papelera está vacía.</div>`;
    return;
  }
  el.innerHTML=trash.map(t=>`
    <article class="task-card trash-card">
      <div class="task-row">
        <div style="font-size:1.3rem">🗑</div>
        <div>
          <div class="task-title">${esc(t.title)}</div>
          ${t.description?`<div class="task-desc">${esc(t.description)}</div>`:""}
          <div class="task-meta">
            <span>📅 ${shortDate(parseDate(t.dueDate))}</span>
            <span>🕒 ${formatTimeMeta(t)}</span>
          </div>
          <div class="trash-countdown">Se elimina definitivamente en ${remainingTrashTime(t)}</div>
          <div class="card-actions">
            <button class="restore-btn" data-restore="${t.id}">Restaurar</button>
            <button class="delete-forever-btn" data-delete-forever="${t.id}">Eliminar definitivamente</button>
          </div>
        </div>
        <span class="status-pill">Papelera</span>
      </div>
    </article>`).join("");
  $$("[data-restore]").forEach(b=>b.onclick=()=>{restoreFromTrash(b.dataset.restore);toast("Tarea restaurada.");});
  $$("[data-delete-forever]").forEach(b=>b.onclick=()=>{
    if(confirm("¿Eliminar esta tarea definitivamente? Esta acción no se puede deshacer.")){
      deleteForever(b.dataset.deleteForever); toast("Tarea eliminada definitivamente.");
    }
  });
}

function switchView(view){
  currentView=view;
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===`${view}View`));
  $$(".view-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $$(".bottom-tab[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}
function openTask(t=null){
  $("#taskForm").reset();
  $("#taskId").value=t?.id||"";
  $("#taskDialogTitle").textContent=t?"Editar tarea":"Agregar tarea";
  $("#deleteTaskBtn").classList.toggle("hidden",!t);
  const today=dateKey(new Date());
  $("#title").value=t?.title||"";
  $("#description").value=t?.description||"";
  $("#startDate").value=t?.startDate||today;
  $("#dueDate").value=t?.dueDate||today;
  $("#allDay").checked=t?!!t.allDay:true;
  $("#startTime").value=t?.startTime||"09:00";
  $("#dueTime").value=t?.dueTime||"10:00";
  $("#recurrence").value=t?.recurrence||"none";
  $("#status").value=t?.status||"pending";
  $("#notify").checked=t?!!t.notify:true;
  $("#notifyAmount").value=t?.notifyAmount||1;
  $("#notifyUnit").value=t?.notifyUnit||"days";
  $("#comment").value=t?.comment||"";
  toggleTimeFields(); toggleNotifyFields();
  $("#taskDialog").showModal();
}
function readForm(){
  const start=$("#startDate").value, due=$("#dueDate").value;
  if(parseDate(due)<parseDate(start)) throw new Error("La fecha de vencimiento no puede ser anterior al inicio.");
  return {
    title:$("#title").value.trim(),
    description:$("#description").value.trim(),
    startDate:start,dueDate:due,
    allDay:$("#allDay").checked,
    startTime:$("#allDay").checked?"":$("#startTime").value,
    dueTime:$("#allDay").checked?"":$("#dueTime").value,
    recurrence:$("#recurrence").value,
    status:$("#status").value,
    notify:$("#notify").checked,
    notifyAmount:Number($("#notifyAmount").value||1),
    notifyUnit:$("#notifyUnit").value,
    comment:$("#comment").value.trim()
  };
}
function toggleTimeFields(){ $("#timeFields").classList.toggle("hidden",$("#allDay").checked); }
function toggleNotifyFields(){ $("#notifyFields").classList.toggle("hidden",!$("#notify").checked); }

function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),2600); }

async function requestNotifications(){
  if(!("Notification" in window)){toast("Este navegador no admite notificaciones.");return;}
  const p=await Notification.requestPermission();
  toast(p==="granted"?"Notificaciones activadas.":"Permiso de notificaciones no concedido.");
  scheduleNotifications();
}
function notificationTime(t){
  const due=taskDueDate(t); const n=new Date(due);
  const amount=t.notifyAmount||1;
  if(t.notifyUnit==="minutes") n.setMinutes(n.getMinutes()-amount);
  else if(t.notifyUnit==="hours") n.setHours(n.getHours()-amount);
  else n.setDate(n.getDate()-amount);
  if(t.allDay && t.notifyUnit==="days"){ n.setHours(9,0,0,0); }
  return n;
}
function scheduleNotifications(){
  notificationTimers.forEach(clearTimeout); notificationTimers.clear();
  if(!("Notification" in window) || Notification.permission!=="granted") return;
  const now=Date.now();
  tasks.filter(t=>t.status==="pending"&&t.notify).forEach(t=>{
    const nt=notificationTime(t).getTime(), delay=nt-now;
    if(delay>0 && delay<2147483647){
      const id=setTimeout(()=>new Notification("Recordatorio de tarea",{body:`${t.title} · vence ${shortDate(parseDate(t.dueDate))} ${t.allDay?"":t.dueTime||""}`,icon:"icon.svg"}),delay);
      notificationTimers.set(t.id,id);
    }
  });
}

function seedExamples(){
  const now=startOfDay(new Date());
  const ex=[
    {id:uid(),title:"Preparar presentación",description:"Preparar la presentación para la reunión con el cliente.",startDate:dateKey(addDays(now,1)),dueDate:dateKey(addDays(now,1)),allDay:false,startTime:"08:30",dueTime:"09:00",recurrence:"none",status:"pending",notify:true,notifyAmount:1,notifyUnit:"days",comment:"Revisar última versión."},
    {id:uid(),title:"Enviar reporte semanal",description:"Consolidar y enviar el reporte al equipo.",startDate:dateKey(addDays(now,1)),dueDate:dateKey(addDays(now,1)),allDay:false,startTime:"16:00",dueTime:"17:00",recurrence:"weekly",status:"pending",notify:true,notifyAmount:1,notifyUnit:"days",comment:""},
    {id:uid(),title:"Ejercicio",description:"Rutina de ejercicio.",startDate:dateKey(now),dueDate:dateKey(now),allDay:false,startTime:"18:30",dueTime:"19:30",recurrence:"daily",status:"pending",notify:false,notifyAmount:1,notifyUnit:"days",comment:""},
    {id:uid(),title:"Revisar correos",description:"Responder correos importantes.",startDate:dateKey(now),dueDate:dateKey(now),allDay:true,startTime:"",dueTime:"",recurrence:"none",status:"completed",notify:false,notifyAmount:1,notifyUnit:"days",comment:"",completedAt:new Date().toISOString()},
    {id:uid(),title:"Llamar al proveedor",description:"Confirmar pedido de material.",startDate:dateKey(addDays(now,-2)),dueDate:dateKey(addDays(now,-1)),allDay:false,startTime:"14:00",dueTime:"15:00",recurrence:"none",status:"missed",notify:false,notifyAmount:1,notifyUnit:"days",comment:""}
  ];
  tasks=[...tasks,...ex]; saveTasks(); toast("Ejemplos agregados.");
}
function exportData(){
  const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),tasks,trash},null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`mis_tareas_${dateKey(new Date())}.json`; a.click(); URL.revokeObjectURL(a.href);
}
async function importData(file){
  try{
    const data=JSON.parse(await file.text()); const arr=Array.isArray(data)?data:data.tasks;
    if(!Array.isArray(arr)) throw 0; tasks=arr; trash=Array.isArray(data.trash)?data.trash:[]; saveTrash(); saveTasks(); toast("Respaldo importado.");
  }catch{ toast("Archivo de respaldo no válido."); }
}

$("#taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const data=readForm(); if(!data.title) return;
    const id=$("#taskId").value;
    if(id){const i=tasks.findIndex(t=>t.id===id); tasks[i]={...tasks[i],...data};}
    else tasks.push({id:uid(),createdAt:new Date().toISOString(),...data});
    $("#taskDialog").close(); saveTasks(); toast("Tarea guardada.");
  }catch(err){toast(err.message||"Revisa los datos.");}
});
$("#deleteTaskBtn").onclick=()=>{const id=$("#taskId").value;if(id&&confirm("¿Mover esta tarea a la papelera? Podrás recuperarla durante 24 horas.")){moveToTrash(id);$("#taskDialog").close();toast("Tarea movida a la papelera.");}};
$("#closeTaskDialog").onclick=$("#cancelTaskBtn").onclick=()=>$("#taskDialog").close();
$("#allDay").onchange=toggleTimeFields; $("#notify").onchange=toggleNotifyFields;
$("#bottomAddBtn").onclick=()=>openTask();
function setSelectedDay(d){
  selectedDate=startOfDay(d);
  calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
  weekCursor=startOfWeek(selectedDate);
  renderAll();
}
$("#prevDayBtn").onclick=()=>setSelectedDay(addDays(selectedDate,-1));
$("#nextDayBtn").onclick=()=>setSelectedDay(addDays(selectedDate,1));
$("#dayDatePicker").onchange=e=>{
  if(e.target.value) setSelectedDay(parseDate(e.target.value));
};
$("#todayBtn").onclick=()=>setSelectedDay(new Date());
$("#notifyBtn").onclick=requestNotifications;
$("#pendingFilter").onchange=renderDay;
$("#prevMonth").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();};
$("#nextMonth").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();};
$("#prevWeek").onclick=()=>{weekCursor=addDays(weekCursor,-7);renderWeek();};
$("#nextWeek").onclick=()=>{weekCursor=addDays(weekCursor,7);renderWeek();};
$("#ganttRange").onchange=renderGantt;
$$("[data-view]").forEach(b=>b.onclick=()=>{switchView(b.dataset.view);renderAll();});
$("#settingsBtnTop").onclick=()=>$("#settingsDialog").showModal();
$("#closeSettings").onclick=()=>$("#settingsDialog").close();
$("#updateAppBtn").onclick=async()=>{
  try{
    if("serviceWorker" in navigator){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg) await reg.update();
    }
    toast("Buscando actualización...");
    setTimeout(()=>location.reload(),700);
  }catch{
    location.reload();
  }
};
$("#exportBtn").onclick=exportData;
$("#importInput").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
$("#seedBtn").onclick=seedExamples;
$("#clearBtn").onclick=()=>{if(confirm("Esto borrará todas las tareas y la papelera. ¿Continuar?")){tasks=[];trash=[];saveTrash();saveTasks();toast("Datos eliminados.");}};
$("#emptyTrashBtn").onclick=()=>{
  if(!trash.length){toast("La papelera ya está vacía.");return;}
  if(confirm("¿Vaciar la papelera? Las tareas se eliminarán definitivamente.")){trash=[];saveTrash();renderTrash();toast("Papelera vaciada.");}
};
window.addEventListener("focus",()=>{normalizeStatuses();renderAll();scheduleNotifications();});
setInterval(()=>{normalizeStatuses();renderAll();},60000);

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").then(reg=>reg.update()).catch(()=>{});
}
if ($("#pendingFilter")) $("#pendingFilter").value = DEFAULT_PENDING_FILTER;
if ($("#appVersion")) $("#appVersion").textContent = APP_VERSION;
renderAll(); scheduleNotifications();
