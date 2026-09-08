const STORAGE_KEY = "mis_tareas_v1";
const SETTINGS_KEY = "mis_tareas_settings_v1";
const TRASH_KEY = "mis_tareas_trash_v1";
const TRASH_TTL = 24 * 60 * 60 * 1000;
const DEFAULT_PENDING_FILTER = "upcoming";
const EXPENSES_KEY = "mis_tareas_expenses_v1";
const BOOKS_KEY = "mis_tareas_books_v1";
const ACTIVE_BOOK_KEY = "mis_tareas_active_book_v1";
const APP_VERSION = "11.0.4.2";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let tasks = loadTasks();
let trash = loadTrash();
let settings = loadSettings();
let expenses = loadExpenses();
let books = loadBooks();
let activeBookId = localStorage.getItem(ACTIVE_BOOK_KEY)||"";
let editingBookId = null;
let selectedDate = startOfDay(new Date());
let calendarCursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let weekCursor = startOfWeek(selectedDate);
let currentView = "calendar";
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
function dotDate(d){ return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`; }
function money(n){ return Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function formatMoneyInput(raw){
  let s=String(raw??"").replace(/[^\d.]/g,"");
  const firstDot=s.indexOf(".");
  if(firstDot>=0){
    s=s.slice(0,firstDot+1)+s.slice(firstDot+1).replace(/\./g,"");
  }
  let [intPart="",decPart=""]=s.split(".");
  intPart=intPart.replace(/^0+(?=\d)/,"");
  if(!intPart) intPart="0";
  intPart=intPart.slice(0,8);
  decPart=decPart.slice(0,2);
  const n=Number(intPart||0);
  const formattedInt=n.toLocaleString("en-US",{maximumFractionDigits:0});
  return formattedInt + (firstDot>=0 ? "."+decPart : "");
}
function parseMoneyInput(display){
  const cleaned=String(display||"").replace(/,/g,"").replace(/[^\d.]/g,"");
  const n=Number(cleaned||0);
  return Number.isFinite(n)?n:0;
}
function formatExportStamp(iso){
  if(!iso) return "Nunca descargado";
  const d=new Date(iso);
  return `Última descarga: ${d.toLocaleDateString("es-MX")} ${d.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}`;
}
function renderExportMarks(){
  if($("#lastExportTxt")) $("#lastExportTxt").textContent=formatExportStamp(settings.lastExportTxt);
  if($("#lastExportCsv")) $("#lastExportCsv").textContent=formatExportStamp(settings.lastExportCsv);
  if($("#lastExportBackup")) $("#lastExportBackup").textContent=formatExportStamp(settings.lastExportBackup);
}
function markExport(kind){
  const stamp=new Date().toISOString();
  if(kind==="txt") settings.lastExportTxt=stamp;
  if(kind==="csv") settings.lastExportCsv=stamp;
  if(kind==="backup") settings.lastExportBackup=stamp;
  saveSettings();
  renderExportMarks();
}

function expenseTotalsForDate(d){
  const key=dateKey(d);
  const day=activeExpenses().filter(e=>e.date===key);
  return {
    MN:day.filter(e=>e.currency==="MN").reduce((s,e)=>s+Number(e.amount||0),0),
    DLS:day.filter(e=>e.currency==="DLS").reduce((s,e)=>s+Number(e.amount||0),0)
  };
}

function getActiveBookExpenseCycleDay(){
  const book=activeBook();
  const value=Number(book?.expenseCycleDay||1);
  return Math.min(31,Math.max(1,value));
}

function setActiveBookExpenseCycleDay(day){
  const book=activeBook();
  if(!book) return;
  book.expenseCycleDay=Math.min(31,Math.max(1,Number(day||1)));
  localStorage.setItem(BOOKS_KEY,JSON.stringify(books));
}

function expenseCycleRange(d){
  const cycle=getActiveBookExpenseCycleDay();
  const y=d.getFullYear(), m=d.getMonth(), day=d.getDate();
  let start;
  if(day>=cycle){
    const maxDay=new Date(y,m+1,0).getDate();
    start=new Date(y,m-1,Math.min(cycle,new Date(y,m,0).getDate()));
    if(cycle<=maxDay) start=new Date(y,m,cycle);
  }else{
    const prevMax=new Date(y,m,0).getDate();
    start=new Date(y,m-1,Math.min(cycle,prevMax));
  }
  const endMonth=start.getMonth()+1;
  const endYear=start.getFullYear() + (endMonth>11?1:0);
  const normalizedMonth=endMonth%12;
  const endMax=new Date(endYear,normalizedMonth+1,0).getDate();
  const nextStart=new Date(endYear,normalizedMonth,Math.min(cycle,endMax));
  const end=addDays(nextStart,-1);
  return {start:startOfDay(start),end:startOfDay(end)};
}
function expenseTotalsForCycle(d){
  const {start,end}=expenseCycleRange(d);
  const list=activeExpenses().filter(e=>{
    const ed=parseDate(e.date);
    return ed>=start && ed<=end;
  });
  return {
    MN:list.filter(e=>e.currency==="MN").reduce((s,e)=>s+Number(e.amount||0),0),
    DLS:list.filter(e=>e.currency==="DLS").reduce((s,e)=>s+Number(e.amount||0),0),
    start,end
  };
}
function totalsText(prefix,t){
  let parts=[];
  if(t.MN || !t.DLS) parts.push(`$${money(t.MN)} MN`);
  if(t.DLS) parts.push(`$${money(t.DLS)} DLS`);
  return `${prefix}: ${parts.join(" · ")}`;
}
function renderExpenseSummary(){
  if(!$("#expenseDayTotal")) return;
  const day=expenseTotalsForDate(selectedDate);
  const cyc=expenseTotalsForCycle(selectedDate);
  $("#expenseDayTotal").textContent=totalsText("Gastos del día",day);
  $("#expenseMonthTotal").textContent=`Total del mes: ${totalsText("",cyc).replace(/^:\s*/,"")} · ${dotDate(cyc.start)}–${dotDate(cyc.end)}`;
}

function esc(s=""){ return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function loadTasks(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return []} }
function loadTrash(){ try{return JSON.parse(localStorage.getItem(TRASH_KEY))||[]}catch{return []} }
function loadSettings(){
  try{
    return {
      defaultPendingFilter:"upcoming",
      expenseCycleDay:1,
      appTitle:"Mis Tareas",
      lastExportTxt:"",
      lastExportCsv:"",
      lastExportBackup:"",
      theme:"emerald_gold",
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY))||{})
    };
  }catch{
    return {defaultPendingFilter:"upcoming",expenseCycleDay:1,appTitle:"Mis Tareas",lastExportTxt:"",lastExportCsv:"",lastExportBackup:"",theme:"emerald_gold"};
  }
}
function saveSettings(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function loadExpenses(){ try{return JSON.parse(localStorage.getItem(EXPENSES_KEY))||[]}catch{return []} }
function loadBooks(){ try{return JSON.parse(localStorage.getItem(BOOKS_KEY))||[]}catch{return []} }
function saveBooks(){
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  renderBooks();
}

const BOOK_ICON_SECTIONS=[
  {key:"work",label:"Trabajo",icons:TASK_EMOJIS.work},
  {key:"tasks",label:"Tareas y organización",icons:TASK_EMOJIS.tasks},
  {key:"money",label:"Dinero y compras",icons:TASK_EMOJIS.money},
  {key:"food",label:"Comida",icons:TASK_EMOJIS.food},
  {key:"social",label:"Sociales y otros",icons:TASK_EMOJIS.social},
  {key:"zelda",label:"Aventura",icons:TASK_EMOJIS.zelda,themeOnly:"emerald_gold"}
];
const BOOK_COLORS=["#725cff","#3d8bfd","#22b573","#d7a928","#f06a6a","#b56cff","#5aa7a7","#8d98a8"];

function normalizeBookAppearance(book){
  if(!book.icon) book.icon="📖";
  if(!book.color) book.color="#725cff";
  return book;
}


function setBookFormOpen(open){
  const panel=$("#bookFormPanel");
  const chevron=$("#bookFormChevron");
  if(!panel) return;
  panel.classList.toggle("hidden",!open);
  if(chevron) chevron.textContent=open?"⌃":"⌄";
}

function resetBookForm(){
  editingBookId=null;
  $("#bookNameInput").value="";
  $("#bookNameCounter").textContent="0/20";
  $("#bookIconInput").value="📖";
  $("#bookColorInput").value="#725cff";
  $("#bookFormLabel").firstChild.textContent="Agregar libro ";
  $("#addBookBtn").textContent="＋ Agregar libro";
  $("#addBookBtn").classList.add("hidden");
  $("#deleteBookBtn").classList.add("hidden");
  renderBookCustomizePickers();
}

function renderBookCustomizePickers(){
  if($("#bookIconPicker")){
    const current=$("#bookIconInput").value;
    const theme=settings.theme||"emerald_gold";

    $("#bookIconPicker").innerHTML=BOOK_ICON_SECTIONS
      .filter(section=>!section.themeOnly || section.themeOnly===theme)
      .map(section=>`
        <div class="book-icon-section ${section.themeOnly?"theme-adventure-book":""}">
          <small class="book-icon-section-title">${section.label}</small>
          <div class="book-icon-section-grid">
            ${section.icons.map(icon=>`
              <button type="button" class="book-icon-option ${current===icon?"selected":""}" data-book-icon="${icon}" title="${section.label}">${icon}</button>
            `).join("")}
          </div>
        </div>
      `).join("");
  }

  if($("#bookColorPicker")){
    $("#bookColorPicker").innerHTML=BOOK_COLORS.map(color=>`
      <button type="button" class="book-color-option ${$("#bookColorInput").value===color?"selected":""}" data-book-color="${color}" style="--book-color:${color}" title="${color}"></button>
    `).join("");
  }

  $$("[data-book-icon]").forEach(btn=>btn.onclick=()=>{
    $("#bookIconInput").value=btn.dataset.bookIcon;
    renderBookCustomizePickers();
  });

  $$("[data-book-color]").forEach(btn=>btn.onclick=()=>{
    $("#bookColorInput").value=btn.dataset.bookColor;
    renderBookCustomizePickers();
  });
}


function updateActiveBookSelect(){
  const select=$("#activeBookSelect");
  if(!select) return;

  select.innerHTML=books.map(book=>{
    normalizeBookAppearance(book);
    return `<option value="${book.id}" ${book.id===activeBookId?"selected":""}>${book.icon} ${esc(book.name)}</option>`;
  }).join("");
}

function ensureBookMigration(){
  let changedBooks=false;
  let defaultBook=books.find(b=>b && (b.isDefault || b.name==="Libro 1"));

  if(!defaultBook){
    defaultBook={
      id:uid(),
      name:"Libro 1",
      icon:"📖",
      color:"#725cff",
      expenseCycleDay:1,
      createdAt:new Date().toISOString(),
      isDefault:true
    };
    books.unshift(defaultBook);
    changedBooks=true;
  }

  books.forEach(book=>{
    const beforeIcon=book.icon, beforeColor=book.color, beforeCycle=book.expenseCycleDay;
    normalizeBookAppearance(book);
    if(!book.expenseCycleDay) book.expenseCycleDay=1;
    if(beforeIcon!==book.icon || beforeColor!==book.color || beforeCycle!==book.expenseCycleDay) changedBooks=true;
  });

  let changedTasks=false;
  tasks.forEach(t=>{
    if(!t.bookId){t.bookId=defaultBook.id;changedTasks=true;}
  });

  let changedTrash=false;
  trash.forEach(t=>{
    if(!t.bookId){t.bookId=defaultBook.id;changedTrash=true;}
  });

  let changedExpenses=false;
  expenses.forEach(e=>{
    if(!e.bookId){e.bookId=defaultBook.id;changedExpenses=true;}
  });

  if(!activeBookId || !books.some(b=>b.id===activeBookId)){
    activeBookId=defaultBook.id;
    localStorage.setItem(ACTIVE_BOOK_KEY,activeBookId);
  }

  if(changedBooks) localStorage.setItem(BOOKS_KEY,JSON.stringify(books));
  if(changedTasks) localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));
  if(changedTrash) localStorage.setItem(TRASH_KEY,JSON.stringify(trash));
  if(changedExpenses) localStorage.setItem(EXPENSES_KEY,JSON.stringify(expenses));
}

function activeBook(){
  return books.find(b=>b.id===activeBookId) || books[0] || null;
}
function activeTasks(){
  if(!activeBookId) return tasks.filter(t=>t.highImportance);
  return tasks.filter(t=>t.bookId===activeBookId || t.highImportance===true);
}
function activeExpenses(){
  return activeBookId ? expenses.filter(e=>e.bookId===activeBookId) : [];
}
function activeTrash(){
  return activeBookId ? trash.filter(t=>t.bookId===activeBookId) : [];
}
function setActiveBook(id,{render=true}={}){
  activeBookId=id||"";
  if(activeBookId) localStorage.setItem(ACTIVE_BOOK_KEY,activeBookId);
  else localStorage.removeItem(ACTIVE_BOOK_KEY);
  updateActiveBookSelect();
  if(render) renderAll();
}
function finalizeBookSelection(){
  if(!activeBookId && books.length){
    activeBookId=books[0].id;
    localStorage.setItem(ACTIVE_BOOK_KEY,activeBookId);
  }
  updateActiveBookSelect();
  renderAll();
}


function saveExpenses(){
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  renderExpenseSummary();
}

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
  if(!t || !t.dueDate) return null;
  const d=parseDate(t.dueDate);
  if(t.allDay){ d.setHours(23,59,59,999); } else {
    const [h,m]=(t.dueTime||"23:59").split(":").map(Number); d.setHours(h,m,0,0);
  }
  return d;
}
function sortDate(t){
  return taskDueDate(t) || taskStartDate(t) || new Date(8640000000000000);
}
function compareTasksByDate(a,b){
  const ad=taskDueDate(a), bd=taskDueDate(b);
  if(ad && bd) return ad-bd;
  if(ad) return -1;
  if(bd) return 1;
  return taskStartDate(a)-taskStartDate(b);
}
function boardStageOf(t){
  if(t.status==="completed") return "completed";
  return t.boardStage || "pending";
}
function boardStageLabel(stage){
  return ({pending:"Pendiente",in_progress:"En proceso",waiting:"En espera",completed:"Completada"})[stage] || "Pendiente";
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
    if(t.status==="pending" && t.recurrence==="none" && taskDueDate(t) && taskDueDate(t) < now){
      t.status="missed";
      t.missedAt=now.toISOString();
      changed=true;
    }
  }
  if(changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function nextDueForSort(t){
  const baseDue=taskDueDate(t);
  if(!baseDue) return null;
  if(t.recurrence==="none") return baseDue;

  const now=new Date();
  let candidate=new Date(baseDue);
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
let emojiEditTaskId=null;

const TASK_EMOJIS={
  work:["📌","✅","☑️","📝","📋","📁","📂","🗂️","🗃️","🗄️","💼","🏢","🏭","👷","🧑‍💼","👨‍💻","👩‍💻","💻","🖥️","🖨️","⌨️","🖱️","📊","📈","📉","📞","📧","📅","🗓️","⏰","🔔","⚙️","🔧","🛠️","🔩","📐","📏","✏️","🖊️","📎","🔍","🎯","🚚","📦","🧾","🏷️","🪜","🧰","🪛","🪚","🔨"],
  tasks:["🏠","🧹","🧺","🛒","🍳","🚗","⛽","💡","🔑","🔒","📚","🎓","🏃","🏋️","🚶","💊","🩺","🧴","🪴","🐶","🐱","✈️","🚌","📍","⭐","⚡","🔄","🧠","💧","🚿","🛏️","🪥","🧽","🧼","🧯","🪣","📬","📮","🗑️","🧊","🔌","🧑‍🍳","🧑‍🔧","🧑‍🏫","🧑‍⚕️","🧑‍🌾","🧑‍🎨"],
  money:["💰","💵","💴","💶","💷","🪙","💳","🏦","🏧","💹","🧮","🧾","🛍️","🛒","🏷️","📦","💸","💲","🤑","💱","📉","📈","🏪","🧺","⛽","🚕","🍽️","☕","🏠","🔑"],
  food:["🍽️","🍳","🥘","🍲","🍜","🍝","🍕","🌮","🌯","🥪","🍔","🍟","🥗","🍣","🍱","🥩","🍗","🥚","🍞","🥐","🧀","🍎","🍌","🍇","🍓","🥦","🥕","☕","🧃","🥤","🍰","🎂"],
  social:["👥","🤝","🎂","🎉","🎁","❤️","😊","👍","🙏","☕","🍽️","🎬","🎵","📷","🎮","⚽","🏀","🌟","🌙","☀️","💬","📱","☎️","🥳","🎈","🎊","🫶","🤗","👏","🙌","💐"],
  zelda:[
    "🗡️","⚔️","🛡️","🏹","🪄","🧝","🧝‍♂️","🧝‍♀️","🧚","🧚‍♂️","🧚‍♀️",
    "💎","🔺","🟩","🟨","🟦","🟪","⭐","🌟","✨","💫","🌙","☀️",
    "🗝️","🔑","📜","🧭","🗺️","🏺","🏰","⛺","🔥","🌿","🍃","🌱","🌲","🌳",
    "🪙","💰","💎","🏆","👑","🎯","🧰","🔨","⚒️","🛠️","🔧","⚙️","🪓","⛏️",
    "🧱","📦","🎒","🧺","🧪","⚗️","🧴","🕯️","🔔","🎵","🎶","🪕","📯",
    "🐎","🦅","🐺","🦊","🐉","🐲","🦋","🐝","🪶","🪽","🌊","💧","❄️","⚡",
    "🔮","🪬","🧿","💠","♻️","✅","📌","📋","📚","📝","💼","🧾","💳","🏦"
  ]
};
function renderEmojiPicker(){
  const fill=(id,list)=>{
    const el=$("#"+id);
    if(!el) return;
    el.innerHTML=list.map(e=>`<button type="button" class="emoji-choice" data-task-emoji="${e}">${e}</button>`).join("");
  };

  fill("emojiWorkGrid",TASK_EMOJIS.work);
  fill("emojiTaskGrid",TASK_EMOJIS.tasks);
  fill("emojiMoneyGrid",TASK_EMOJIS.money);
  fill("emojiFoodGrid",TASK_EMOJIS.food);
  fill("emojiSocialGrid",TASK_EMOJIS.social);
  fill("emojiZeldaGrid",TASK_EMOJIS.zelda);

  $$("[data-task-emoji]").forEach(b=>b.onclick=()=>{
    const newEmoji=b.dataset.taskEmoji;

    if(emojiEditTaskId){
      const task=tasks.find(t=>t.id===emojiEditTaskId);
      if(task){
        task.emoji=newEmoji;
        saveTasks();
      }

      emojiEditTaskId=null;
      $("#emojiDialog").close();

      $("#emojiSavedIcon").textContent=newEmoji;
      $("#emojiSavedDialog").showModal();
      return;
    }

    $("#taskEmoji").value=newEmoji;
    $("#taskEmojiPreview").textContent=newEmoji;
    $("#emojiDialog").close();
  });
}


function renderAll(){
  updateActiveBookSelect();
  normalizeStatuses();
  purgeExpiredTrash(); renderWeekStrip(); renderDay(); renderCalendar(); renderWeek(); renderBoard(); renderTrash(); renderExpenseSummary();
}
function renderWeekStrip(){
  const week=startOfWeek(selectedDate);
  $("#weekStrip").innerHTML = [...Array(7)].map((_,i)=>{
    const d=addDays(week,i), key=dateKey(d);
    const hasTask=activeTasks().some(t=>occursOn(t,d)&&t.status==="pending");
    const hasExpense=activeExpenses().some(e=>e.date===key);

    return `<button class="week-day ${key===dateKey(selectedDate)?"active":""}" data-date="${key}">
      <span class="dow">${d.toLocaleDateString("es-MX",{weekday:"short"}).replace(".","")}</span>
      <span class="num">${d.getDate()}</span>
      <span class="week-day-indicators">
        ${hasExpense?'<span class="week-expense-mark" title="Hay gastos registrados">$</span>':""}
        ${hasTask?'<span class="dot"></span>':""}
      </span>
    </button>`;
  }).join("");

  $$(".week-day").forEach(b=>b.onclick=()=>{
    selectedDate=parseDate(b.dataset.date);
    switchView("day");
    renderAll();
  });
}
function renderDay(){
  $("#selectedDateTitle").textContent = longDate(selectedDate);
  if ($("#dayDatePicker")) $("#dayDatePicker").value = dateKey(selectedDate);

  // Global sections: do not hide tasks just because they belong to another date.
  const bookTasks=activeTasks();
  const allPending = bookTasks
    .filter(t=>t.status==="pending")
    .sort(compareTasksByDate);

  const allCompleted = bookTasks
    .filter(t=>t.status==="completed")
    .sort((a,b)=>{
      const ad=a.completedAt ? new Date(a.completedAt) : (taskDueDate(a)||taskStartDate(a));
      const bd=b.completedAt ? new Date(b.completedAt) : (taskDueDate(b)||taskStartDate(b));
      return bd-ad;
    });

  const allMissed = bookTasks
    .filter(t=>t.status==="missed")
    .sort((a,b)=>sortDate(b)-sortDate(a));

  const todayKey=dateKey(selectedDate);
  const filter=$("#pendingFilter").value;
  let filtered=allPending;

  if(filter==="today"){
    filtered=allPending.filter(t=>occursOn(t,selectedDate));
  }

  if(filter==="upcoming"){
    filtered=allPending
      .filter(t=>!t.dueDate || (nextDueForSort(t) && nextDueForSort(t)>=new Date()))
      .sort(compareTasksByDate);
  }

  if(filter==="recurring"){
    filtered=allPending
      .filter(t=>t.recurrence!=="none")
      .sort(compareTasksByDate);
  }

  $("#statsGrid").innerHTML = `
    <button class="stat-card stat-link" data-stat-target="pendingSection"><strong>${allPending.length}</strong><small>Pendientes</small></button>
    <button class="stat-card stat-link" data-stat-target="completedSection"><strong>${allCompleted.length}</strong><small>Completadas</small></button>
    <button class="stat-card stat-link" data-stat-target="missedSection"><strong>${allMissed.length}</strong><small>Vencidas</small></button>`;

  $("#pendingList").innerHTML=listHtml(filtered);
  $("#completedList").innerHTML=listHtml(allCompleted);
  $("#missedList").innerHTML=listHtml(allMissed);
  $$("[data-stat-target]").forEach(btn=>btn.onclick=()=>{
    const target=document.getElementById(btn.dataset.statTarget);
    if(target) target.scrollIntoView({behavior:"smooth",block:"start"});
  });
  bindTaskActions();
}
function expandedTasksForDate(d){ return activeTasks().filter(t=>occursOn(t,d)); }
function occursOn(t,d){
  const target=startOfDay(d);
  const start=startOfDay(parseDate(t.startDate));
  const due=t.dueDate?startOfDay(parseDate(t.dueDate)):null;

  if(t.recurrence==="none"){
    if(!due) return dateKey(target)===dateKey(start);
    return target>=start && target<=due;
  }

  if(target<start) return false;
  if(due && t.status!=="pending" && target>due) return false;

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
  return `<article class="task-card ${t.status} ${t.highImportance?"high-importance":""}">
    <div class="task-row">
      <input class="task-check" type="checkbox" data-complete="${t.id}" ${t.status==="completed"?"checked":""} ${t.status==="missed"?"disabled":""}/>
      <button type="button" class="task-emoji task-emoji-edit" data-emoji-task="${t.id}" title="Cambiar emoticono">${esc(t.emoji||"📌")}</button>
      <div>
        <div class="task-title">${esc(t.title)}</div>
        ${t.description?`<div class="task-desc">${esc(t.description)}</div>`:""}
        <div class="task-meta">
          <span>📅 ${t.dueDate?shortDate(parseDate(t.dueDate)):"Sin vencimiento"}</span>
          <span>🕒 ${formatTimeMeta(t)}</span>
          ${t.recurrence!=="none"?`<span class="recur-pill">↻ ${recurrenceLabel(t.recurrence)}</span>`:""}
          ${t.status==="pending"?`<span class="board-pill stage-${boardStageOf(t)}">▦ ${boardStageLabel(boardStageOf(t))}</span>`:""}
          ${t.status==="completed"?`<span class="state-chip completed">✓ Completada</span>`:""}
          ${t.status==="missed"?`<span class="state-chip missed">✕ No completada</span>`:""}
          ${t.comment?`<button type="button" class="comment-icon-btn" data-comment-task="${t.id}" title="Ver comentario">💬</button>`:""}
        </div>
        <div class="card-actions task-card-actions">
          <button type="button" class="importance-chip ${t.highImportance?"active":""}" data-important="${t.id}">
            ${t.highImportance?"★ Alta importancia":"☆ Alta importancia"}
          </button>
          <div class="task-action-row">
            <div class="task-action-left">
              <button data-edit="${t.id}">Editar</button>
              ${t.status==="missed"?`<button data-reopen="${t.id}">Reabrir</button>`:""}
            </div>
            <button class="task-delete-btn" data-delete="${t.id}">Eliminar</button>
          </div>
        </div>
      </div>
      ${t.status!=="pending"?``:""}
    </div>
  </article>`;
}

function reopenTask(t){
  const originalMissedDate=t.dueDate || t.startDate || dateKey(new Date());
  const missedDateLabel=shortDate(parseDate(originalMissedDate));
  const reopenNote=`Tarea reabierta por no ser completada el día ${missedDateLabel}.`;
  t.comment=t.comment ? `${t.comment} | ${reopenNote}` : reopenNote;

  const now=new Date();
  const today=startOfDay(now);

  let target=today;
  if(!t.allDay && t.startTime){
    const [h,m]=(t.startTime||"00:00").split(":").map(Number);
    const todayStart=new Date(today);
    todayStart.setHours(h,m,0,0);
    if(now>=todayStart) target=addDays(today,1);
  }

  const oldStart=t.startDate?parseDate(t.startDate):today;
  const oldDue=t.dueDate?parseDate(t.dueDate):null;
  const durationDays=oldDue?Math.max(0,Math.round((startOfDay(oldDue)-startOfDay(oldStart))/86400000)):0;

  t.startDate=dateKey(target);
  if(t.dueDate) t.dueDate=dateKey(addDays(target,durationDays));
  t.status="pending";
  t.boardStage="pending";
  t.missedAt=null;
  t.completedAt=null;
}

function openEmojiOnlyEditor(taskId){
  const task=tasks.find(t=>t.id===taskId);
  if(!task) return;

  emojiEditTaskId=taskId;
  renderEmojiPicker();
  $("#emojiDialog").showModal();
}


function openCommentDialog(taskId){
  const task=tasks.find(t=>t.id===taskId);
  if(!task || !task.comment) return;
  $("#commentDialogTitle").textContent=task.title||"Comentario";
  $("#commentDialogBody").textContent=task.comment;
  $("#commentDialog").showModal();
}

function bindTaskActions(){
  $$("[data-comment-task]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openCommentDialog(btn.dataset.commentTask);
  });

  $$("[data-important]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    const task=tasks.find(t=>t.id===btn.dataset.important);
    if(!task) return;
    task.highImportance=!task.highImportance;
    saveTasks();
    toast(task.highImportance?"Alta importancia activada.":"Alta importancia desactivada.");
  });

  $$("[data-emoji-task]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openEmojiOnlyEditor(btn.dataset.emojiTask);
  });

  $$("[data-complete]").forEach(ch=>ch.onchange=()=>{
    const t=tasks.find(x=>x.id===ch.dataset.complete); if(!t)return;
    t.status=ch.checked?"completed":"pending";
    t.completedAt=ch.checked?new Date().toISOString():null;
    saveTasks();
  });
  $$("[data-edit]").forEach(b=>b.onclick=()=>openTask(tasks.find(t=>t.id===b.dataset.edit)));
  $$("[data-reopen]").forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.reopen); if(!t)return; reopenTask(t); saveTasks(); toast(`Tarea reabierta para ${shortDate(parseDate(t.startDate))}.`);});
  $$("[data-delete]").forEach(b=>b.onclick=async()=>{
    const t=tasks.find(x=>x.id===b.dataset.delete);
    if(!t) return;
    if(await comicConfirm(`¿Eliminar "${t.title}"? Se moverá a la papelera y podrás restaurarla durante 24 horas.`,{
      title:"Eliminar tarea",
      okText:"🗑 Eliminar"
    })){
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
    const hasExpense=activeExpenses().some(e=>e.date===key);

    return `<button class="calendar-day ${inMonth?"":"muted"} ${key===dateKey(selectedDate)?"selected":""} ${key===dateKey(new Date())?"today":""}" data-caldate="${key}">
      ${d.getDate()}
      ${hasExpense?`<span class="calendar-expense-mark">$</span>`:""}
      <span class="calendar-dots">${dots}</span>
    </button>`;
  }).join("");
  $$("[data-caldate]").forEach(b=>b.onclick=()=>{
    selectedDate=parseDate(b.dataset.caldate);
    $("#calendarDayHeading").textContent=`Tareas · ${shortDate(selectedDate)}`;
    $("#calendarDayList").innerHTML=listHtml(expandedTasksForDate(selectedDate).sort(compareTasksByDate));
    bindTaskActions(); renderCalendar(); renderExpenseSummary();
  });
  $("#calendarDayHeading").textContent=`Tareas · ${shortDate(selectedDate)}`;
  $("#calendarDayList").innerHTML=listHtml(expandedTasksForDate(selectedDate).sort(compareTasksByDate));
  bindTaskActions();
}
function renderWeek(){
  const end=addDays(weekCursor,6);
  $("#weekTitle").textContent=`${shortDate(weekCursor)} – ${shortDate(end)}`;

  const days=[...Array(7)].map((_,i)=>{
    const d=addDays(weekCursor,i);
    const list=expandedTasksForDate(d).sort(compareTasksByDate);
    return {d,list};
  }).filter(x=>x.list.length>0);

  $("#weekBoard").innerHTML=days.length ? days.map(({d,list})=>`
    <section class="week-column">
      <h3>${d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"short"})}</h3>
      ${list.map(t=>`<div class="mini-task ${t.highImportance?"high-importance":""}" data-edit="${t.id}">
        <button type="button" class="mini-task-emoji task-emoji-edit" data-emoji-task="${t.id}" title="Cambiar emoticono">${esc(t.emoji||"📌")}</button>
        <span><strong>${esc(t.title)}</strong><small>${formatTimeMeta(t)} · ${statusLabel(t.status)} ${t.comment?`· <button type="button" class="mini-comment-btn" data-comment-task="${t.id}">💬</button>`:""}</small></span>
      </div>`).join("")}
    </section>
  `).join("") : `<div class="empty week-empty">No hay tareas registradas en esta semana.</div>`;

  $$("[data-comment-task]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openCommentDialog(btn.dataset.commentTask);
  });

  $$("[data-emoji-task]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openEmojiOnlyEditor(btn.dataset.emojiTask);
  });
  $$("[data-edit]").forEach(b=>b.onclick=()=>openTask(tasks.find(t=>t.id===b.dataset.edit)));
}
function renderBoard(){
  const groups={pending:[],in_progress:[],waiting:[],completed:[]};

  activeTasks().forEach(t=>{
    const stage=boardStageOf(t);
    if(stage==="completed" || t.status==="completed") groups.completed.push(t);
    else if(stage==="in_progress") groups.in_progress.push(t);
    else if(stage==="waiting") groups.waiting.push(t);
    else groups.pending.push(t);
  });

  Object.values(groups).forEach(list=>list.sort(compareTasksByDate));

  const boardCard=t=>`<article class="board-card ${t.status} ${t.highImportance?"high-importance":""}">
    <div class="board-card-head">
      <div class="board-title-with-emoji"><button type="button" class="board-task-emoji task-emoji-edit" data-emoji-task="${t.id}" title="Cambiar emoticono">${esc(t.emoji||"📌")}</button><strong>${esc(t.title)}</strong></div>
      <span class="status-pill ${t.status}">${statusLabel(t.status)}</span>
    </div>
    ${t.description?`<p>${esc(t.description)}</p>`:""}
    <div class="board-card-meta">
      <span>📅 ${t.dueDate?shortDate(parseDate(t.dueDate)):"Sin vencimiento"}</span>
      ${!t.allDay && t.startTime?`<span>🕒 ${t.startTime}</span>`:""}
      ${t.recurrence!=="none"?`<span>↻ ${recurrenceLabel(t.recurrence)}</span>`:""}
      ${t.status==="pending"?`<span class="board-pill stage-${boardStageOf(t)}">▦ ${boardStageLabel(boardStageOf(t))}</span>`:""}
      ${t.status==="completed"?`<span class="state-chip completed">✓ Completada</span>`:""}
      ${t.status==="missed"?`<span class="state-chip missed">✕ No completada</span>`:""}
      ${t.comment?`<button type="button" class="comment-icon-btn" data-comment-task="${t.id}" title="Ver comentario">💬</button>`:""}
    </div>
    <label class="board-move-label">Mover a
      <select data-board-move="${t.id}">
        <option value="pending" ${boardStageOf(t)==="pending"?"selected":""}>Pendiente</option>
        <option value="in_progress" ${boardStageOf(t)==="in_progress"?"selected":""}>En proceso</option>
        <option value="waiting" ${boardStageOf(t)==="waiting"?"selected":""}>En espera</option>
        <option value="completed" ${boardStageOf(t)==="completed"?"selected":""}>Completada</option>
      </select>
    </label>
    <div class="card-actions board-card-actions">
      <button type="button" class="importance-chip ${t.highImportance?"active":""}" data-important="${t.id}">
        ${t.highImportance?"★ Alta importancia":"☆ Alta importancia"}
      </button>
      <div class="task-action-row">
        <div class="task-action-left">
          <button data-edit="${t.id}">Editar</button>
        </div>
        <button class="task-delete-btn" data-delete="${t.id}">Eliminar</button>
      </div>
    </div>
  </article>`;

  $("#boardPending").innerHTML=groups.pending.length?groups.pending.map(boardCard).join(""):`<div class="empty">Sin actividades</div>`;
  $("#boardProgress").innerHTML=groups.in_progress.length?groups.in_progress.map(boardCard).join(""):`<div class="empty">Sin actividades</div>`;
  $("#boardWaiting").innerHTML=groups.waiting.length?groups.waiting.map(boardCard).join(""):`<div class="empty">Sin actividades</div>`;
  $("#boardCompleted").innerHTML=groups.completed.length?groups.completed.map(boardCard).join(""):`<div class="empty">Sin actividades</div>`;

  $("#boardCountPending").textContent=groups.pending.length;
  $("#boardCountProgress").textContent=groups.in_progress.length;
  $("#boardCountWaiting").textContent=groups.waiting.length;
  $("#boardCountCompleted").textContent=groups.completed.length;

  $("#boardStats").innerHTML=`
    <div class="stat-card"><strong>${groups.pending.length}</strong><small>Pendientes</small></div>
    <div class="stat-card"><strong>${groups.in_progress.length}</strong><small>En proceso</small></div>
    <div class="stat-card"><strong>${groups.waiting.length}</strong><small>En espera</small></div>
    <div class="stat-card"><strong>${groups.completed.length}</strong><small>Completadas</small></div>`;

  $$("[data-board-move]").forEach(sel=>sel.onchange=()=>{
    const t=tasks.find(x=>x.id===sel.dataset.boardMove);
    if(!t) return;
    t.boardStage=sel.value;
    if(sel.value==="completed"){
      t.status="completed";
      t.completedAt=t.completedAt||new Date().toISOString();
    }else if(t.status==="completed"){
      t.status="pending";
      t.completedAt=null;
    }
    saveTasks();
    toast(`Movida a ${boardStageLabel(sel.value)}.`);
  });

  bindTaskActions();
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
  const bookTrash=activeTrash();
  if(!bookTrash.length){
    el.innerHTML=`<div class="empty">La papelera está vacía.</div>`;
    return;
  }
  el.innerHTML=bookTrash.map(t=>`
    <article class="task-card trash-card">
      <div class="task-row">
        <div style="font-size:1.3rem">🗑</div>
        <div>
          <div class="task-title">${esc(t.title)}</div>
          ${t.description?`<div class="task-desc">${esc(t.description)}</div>`:""}
          <div class="task-meta">
            <span>📅 ${t.dueDate?shortDate(parseDate(t.dueDate)):"Sin vencimiento"}</span>
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
  $$("[data-delete-forever]").forEach(b=>b.onclick=async()=>{
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
  $("#taskEmoji").value=t?.emoji||"📌";
  $("#taskEmojiPreview").textContent=t?.emoji||"📌";
  $("#startDate").value=t?.startDate||today;
  $("#dueDate").value=t?.dueDate||"";
  $("#allDay").checked=t?!!t.allDay:true;
  $("#startTime").value=t?.startTime||"09:00";
  $("#dueTime").value=t?.dueTime||"10:00";
  $("#recurrence").value=t?.recurrence||"none";
  $("#status").value=t?.status||"pending";
  $("#boardStage").value=t?boardStageOf(t):"pending";
  $("#comment").value=t?.comment||"";
  $("#highImportance").checked=!!t?.highImportance;
  toggleTimeFields();
  $("#taskDialog").showModal();
}
function readForm(){
  const start=$("#startDate").value;
  const due=$("#dueDate").value;
  if(due && parseDate(due)<parseDate(start)) throw new Error("La fecha de vencimiento no puede ser anterior al inicio.");

  let status=$("#status").value;
  let boardStage=$("#boardStage").value;
  if(status==="completed") boardStage="completed";
  if(boardStage==="completed") status="completed";

  return {
    title:$("#title").value.trim(),
    description:$("#description").value.trim(),
    emoji:$("#taskEmoji").value||"📌",
    startDate:start,
    dueDate:due||"",
    allDay:$("#allDay").checked,
    startTime:$("#allDay").checked?"":$("#startTime").value,
    dueTime:(!due || $("#allDay").checked)?"":$("#dueTime").value,
    recurrence:$("#recurrence").value,
    status,
    boardStage,
    notify:false,
    notifyAmount:1,
    notifyUnit:"days",
    comment:$("#comment").value.trim(),
    highImportance:$("#highImportance").checked
  };
}
function toggleTimeFields(){ $("#timeFields").classList.toggle("hidden",$("#allDay").checked); }




async function deleteEditingBook(){
  if(!editingBookId) return;

  const book=books.find(b=>b.id===editingBookId);
  if(!book) return;

  if(books.length<=1){
    toast("Debe existir al menos un libro.");
    return;
  }

  const bookTasksCount=tasks.filter(t=>t.bookId===book.id).length;
  const bookExpensesCount=expenses.filter(e=>e.bookId===book.id).length;

  const ok=await comicConfirm(
    `¿Borrar el libro "${book.name}"? También se eliminarán ${bookTasksCount} tareas y ${bookExpensesCount} gastos de este libro.`,
    {title:"Borrar libro",okText:"🗑 Borrar libro"}
  );
  if(!ok) return;

  tasks=tasks.filter(t=>t.bookId!==book.id);
  trash=trash.filter(t=>t.bookId!==book.id);
  expenses=expenses.filter(e=>e.bookId!==book.id);
  books=books.filter(b=>b.id!==book.id);

  localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));
  localStorage.setItem(TRASH_KEY,JSON.stringify(trash));
  localStorage.setItem(EXPENSES_KEY,JSON.stringify(expenses));
  localStorage.setItem(BOOKS_KEY,JSON.stringify(books));

  if(activeBookId===book.id){
    activeBookId=books[0]?.id||"";
    if(activeBookId) localStorage.setItem(ACTIVE_BOOK_KEY,activeBookId);
    else localStorage.removeItem(ACTIVE_BOOK_KEY);
  }

  editingBookId=null;
  $("#bookNameInput").value="";
  $("#bookNameCounter").textContent="0/20";
  $("#bookIconInput").value="📖";
  $("#bookColorInput").value="#725cff";
  $("#bookFormLabel").firstChild.textContent="Agregar libro ";
  $("#addBookBtn").textContent="＋ Agregar libro";
  $("#addBookBtn").classList.add("hidden");
  $("#deleteBookBtn").classList.add("hidden");

  updateActiveBookSelect();
  renderBookCustomizePickers();
  renderBooks();
  renderAll();
  setBookFormOpen(false);
  toast("Libro borrado.");
}

function moveBook(bookId,direction){
  const index=books.findIndex(b=>b.id===bookId);
  if(index<0) return;
  const target=index+direction;
  if(target<0 || target>=books.length) return;

  [books[index],books[target]]=[books[target],books[index]];
  localStorage.setItem(BOOKS_KEY,JSON.stringify(books));
  renderBooks();
}

function renderBooks(){
  if(!$("#booksList")) return;

  $("#booksList").innerHTML=books.length ? books.map((book,index)=>{
    normalizeBookAppearance(book);
    const selected=book.id===activeBookId;
    const taskCount=tasks.filter(t=>t.bookId===book.id).length;
    const expenseCount=expenses.filter(e=>e.bookId===book.id).length;

    return `
      <article class="book-select-card ${selected?"selected":""}" style="--book-accent:${book.color}">
        <label class="book-check-wrap" title="${selected?"Quitar selección":"Seleccionar libro"}">
          <input type="checkbox" data-book-select="${book.id}" ${selected?"checked":""}>
          <span class="book-custom-check">✓</span>
        </label>

        <button type="button" class="book-name-btn" data-book-edit="${book.id}" title="Editar nombre, icono o color">
          <span class="book-card-icon" style="--book-accent:${book.color}">${book.icon}</span>
          <span class="book-card-copy">
            <strong>${esc(book.name)}</strong>
            <small>${taskCount} ${taskCount===1?"tarea":"tareas"} · ${expenseCount} ${expenseCount===1?"gasto":"gastos"}</small>
          </span>
        </button>

        <div class="book-row-actions">
          <button type="button" data-book-up="${book.id}" ${index===0?"disabled":""} title="Subir">↑</button>
          <button type="button" data-book-down="${book.id}" ${index===books.length-1?"disabled":""} title="Bajar">↓</button>
          <button type="button" data-book-export="${book.id}" title="Exportar libro">⇩</button>
        </div>
      </article>`;
  }).join("") : `<div class="empty">No hay libros.</div>`;

  $$("[data-book-select]").forEach(ch=>ch.onchange=()=>{
    const id=ch.dataset.bookSelect;
    if(ch.checked){
      setActiveBook(id,{render:false});
      $$("[data-book-select]").forEach(other=>{if(other!==ch) other.checked=false;});
    }else if(activeBookId===id){
      setActiveBook("",{render:false});
    }
    renderBooks();
  });

  $$("[data-book-edit]").forEach(btn=>btn.onclick=()=>{
    const book=books.find(b=>b.id===btn.dataset.bookEdit);
    if(!book) return;
    normalizeBookAppearance(book);
    editingBookId=book.id;
    $("#bookNameInput").value=book.name;
    $("#bookNameCounter").textContent=`${book.name.length}/20`;
    $("#bookIconInput").value=book.icon;
    $("#bookColorInput").value=book.color;
    $("#bookFormLabel").firstChild.textContent="Editar libro ";
    $("#addBookBtn").textContent="Guardar";
    $("#addBookBtn").classList.remove("hidden");
    $("#deleteBookBtn").classList.remove("hidden");
    setBookFormOpen(true);
    renderBookCustomizePickers();
    $("#bookNameInput").focus();
  });

  $$("[data-book-up]").forEach(btn=>btn.onclick=()=>moveBook(btn.dataset.bookUp,-1));
  $$("[data-book-down]").forEach(btn=>btn.onclick=()=>moveBook(btn.dataset.bookDown,1));
  $$("[data-book-export]").forEach(btn=>btn.onclick=()=>exportBook(btn.dataset.bookExport));
}

function openBooksDialog(){
  resetBookForm();
  setBookFormOpen(false);
  renderBooks();
  $("#booksDialog").showModal();
}

function addBook(){
  const name=$("#bookNameInput").value.trim();
  const icon=$("#bookIconInput").value||"📖";
  const color=$("#bookColorInput").value||"#725cff";

  if(!name){
    toast(editingBookId?"Escribe el nuevo nombre del libro.":"Escribe el nombre del libro.");
    return;
  }
  if(name.length>20){
    toast("El nombre del libro no puede superar 20 caracteres.");
    return;
  }

  if(editingBookId){
    const book=books.find(b=>b.id===editingBookId);
    if(book){
      book.name=name;
      book.icon=icon;
      book.color=color;
      book.updatedAt=new Date().toISOString();
      localStorage.setItem(BOOKS_KEY,JSON.stringify(books));
      if(book.id===activeBookId) updateActiveBookSelect();
    }
    editingBookId=null;
    $("#bookNameInput").value="";
    $("#bookNameCounter").textContent="0/20";
    $("#bookIconInput").value="📖";
    $("#bookColorInput").value="#725cff";
    $("#bookFormLabel").firstChild.textContent="Agregar libro ";
    $("#addBookBtn").textContent="＋ Agregar libro";
    $("#addBookBtn").classList.add("hidden");
    $("#deleteBookBtn").classList.add("hidden");
    renderBookCustomizePickers();
    renderBooks();
    updateActiveBookSelect();
    setBookFormOpen(false);
    toast("Nombre de libro actualizado.");
    return;
  }

  books.push({
    id:uid(),
    name,
    icon,
    color,
    expenseCycleDay:1,
    createdAt:new Date().toISOString()
  });

  localStorage.setItem(BOOKS_KEY,JSON.stringify(books));
  $("#bookNameInput").value="";
  $("#bookNameCounter").textContent="0/20";
  $("#bookIconInput").value="📖";
  $("#bookColorInput").value="#725cff";
  renderBookCustomizePickers();
  $("#deleteBookBtn").classList.add("hidden");
  renderBooks();
  setBookFormOpen(false);
  toast("Libro agregado.");
}

function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),2600); }

async function requestNotifications(){
  if(!("Notification" in window)){toast("Este navegador no admite notificaciones.");return;}
  const p=await Notification.requestPermission();
  toast(p==="granted"?"Notificaciones activadas.":"Permiso de notificaciones no concedido.");
  scheduleNotifications();
}
function notificationTime(t){
  const due=taskDueDate(t);
  if(!due) return null;
  const n=new Date(due);
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
  tasks.filter(t=>t.status==="pending"&&t.notify&&t.dueDate).forEach(t=>{
    const ntDate=notificationTime(t);
    if(!ntDate) return;
    const nt=ntDate.getTime(), delay=nt-now;
    if(delay>0 && delay<2147483647){
      const id=setTimeout(()=>new Notification("Recordatorio de tarea",{body:`${t.title} · vence ${shortDate(parseDate(t.dueDate))} ${t.allDay?"":t.dueTime||""}`,icon:"icon.svg"}),delay);
      notificationTimers.set(t.id,id);
    }
  });
}

function exportData(){
  const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),tasks,trash},null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`mis_tareas_${dateKey(new Date())}.json`; a.click(); URL.revokeObjectURL(a.href);
  markExport("backup");
}
async function importData(file){
  try{
    const data=JSON.parse(await file.text()); const arr=Array.isArray(data)?data:data.tasks;
    if(!Array.isArray(arr)) throw 0; tasks=arr; trash=Array.isArray(data.trash)?data.trash:[]; ensureBookMigration(); saveTrash(); saveTasks(); toast("Respaldo importado.");
  }catch{ toast("Archivo de respaldo no válido."); }
}


function populateSettings(){
  $("#defaultPendingFilter").value=settings.defaultPendingFilter||"upcoming";
  $("#expenseCycleDay").innerHTML=[...Array(31)].map((_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
  $("#expenseCycleDay").value=String(getActiveBookExpenseCycleDay());
  $("#customAppTitle").value=settings.appTitle||"Mis Tareas";
  if($("#themeSelect")) $("#themeSelect").value=settings.theme||"emerald_gold";
  renderExportMarks();
}
function applyTheme(theme){
  const valid=["emerald_gold","midnight_violet","ocean_blue","graphite"];
  document.documentElement.dataset.theme=valid.includes(theme)?theme:"emerald_gold";
}

function applySettings(){
  applyTheme(settings.theme||"emerald_gold");
  if($("#pendingFilter")) $("#pendingFilter").value=settings.defaultPendingFilter||"upcoming";
  if($("#appTitle")) $("#appTitle").textContent=settings.appTitle||"Mis Tareas";
}
function saveSettingsFromDialog(){
  const title=$("#customAppTitle").value.trim()||"Mis Tareas";
  if(title.length>18){
    alert("El título es muy largo. El máximo permitido es de 18 caracteres.");
    return;
  }
  settings.defaultPendingFilter=$("#defaultPendingFilter").value;
  setActiveBookExpenseCycleDay($("#expenseCycleDay").value);
  settings.appTitle=title;
  settings.theme=$("#themeSelect")?.value||"emerald_gold";
  saveSettings();
  applySettings();
  renderAll();
  const m=$("#settingsSavedMessage");
  m.classList.remove("hidden");
  clearTimeout(m._t);
  m._t=setTimeout(()=>m.classList.add("hidden"),2600);
  toast("Los cambios han sido guardados.");
}

function isFutureDate(d){
  return startOfDay(d)>startOfDay(new Date());
}
function clampExpenseDateToToday(d){
  const today=startOfDay(new Date());
  return startOfDay(d)>today ? today : d;
}

function shiftExpenseDate(type){
  let d=parseDate($("#expenseDate").value);

  if(type==="-day") d=addDays(d,-1);
  if(type==="+day") d=addDays(d,1);
  if(type==="-week") d=addDays(d,-7);
  if(type==="+week") d=addDays(d,7);
  if(type==="-month") d.setMonth(d.getMonth()-1);
  if(type==="+month") d.setMonth(d.getMonth()+1);

  if(isFutureDate(d)){
    toast("No puedes registrar gastos en una fecha futura.");
    d=startOfDay(new Date());
  }

  $("#expenseDate").value=dateKey(d);
  $("#expenseDateLabel").textContent=dotDate(d);
}
function openExpenseDialog(expense=null){
  $("#expenseForm").reset();
  $("#expenseId").value=expense?.id||"";

  const d=expense?.date ? parseDate(expense.date) : clampExpenseDateToToday(selectedDate);
  $("#expenseDate").value=dateKey(d);
  $("#expenseDateLabel").textContent=dotDate(d);
  $("#expenseTitle").value=expense?.title||"";
  $("#expenseDescription").value=expense?.description||"";
  const amountValue=expense ? Number(expense.amount||0).toFixed(2) : "";
  $("#expenseAmount").value=amountValue;
  $("#expenseAmountDisplay").value=amountValue ? formatMoneyInput(amountValue) : "";
  $("#expenseCurrencyBtn").textContent=expense?.currency||"MN";

  const heading=document.querySelector("#expenseDialog h2");
  if(heading) heading.textContent=expense ? "Editar gasto" : "Agregar gasto";

  $("#expenseDialog").showModal();
}
function openViewExpensesDialog(){
  $("#viewExpenseDate").value=dateKey(selectedDate);
  $("#viewExpenseDateLabel").textContent=dotDate(selectedDate);
  renderViewExpenses();
  $("#viewExpensesDialog").showModal();
}

function shiftViewExpenseDate(type){
  let d=parseDate($("#viewExpenseDate").value);

  if(type==="-day") d=addDays(d,-1);
  if(type==="+day") d=addDays(d,1);
  if(type==="-week") d=addDays(d,-7);
  if(type==="+week") d=addDays(d,7);
  if(type==="-month") d.setMonth(d.getMonth()-1);
  if(type==="+month") d.setMonth(d.getMonth()+1);

  $("#viewExpenseDate").value=dateKey(d);
  $("#viewExpenseDateLabel").textContent=dotDate(d);

  selectedDate=startOfDay(d);
  calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
  weekCursor=startOfWeek(selectedDate);

  renderViewExpenses();
  renderAll();
}

function renderViewExpenses(){
  if(!$("#viewExpensesList")) return;

  const key=$("#viewExpenseDate").value || dateKey(selectedDate);
  const d=parseDate(key);
  const list=activeExpenses().filter(e=>e.date===key);

  $("#viewExpenseDayTotal").textContent=
    totalsText("Gastos del día",expenseTotalsForDate(d));

  $("#viewExpensesList").innerHTML=list.length ? list.map(e=>`
    <article class="expense-card">
      <div class="expense-card-main">
        <strong>${esc(e.title)}</strong>
        <span class="expense-card-amount">$${money(e.amount)} ${e.currency}</span>
      </div>
      ${e.description ? `<p>${esc(e.description)}</p>` : ""}
      <div class="expense-card-actions">
        <button class="expense-edit-btn" data-expense-edit="${e.id}">✏ Editar</button>
        <button class="expense-delete-btn" data-expense-delete="${e.id}">🗑 Borrar</button>
      </div>
    </article>
  `).join("") : `<div class="empty">No hay gastos registrados en este día.</div>`;

  $$("[data-expense-edit]").forEach(btn=>{
    btn.onclick=async()=>{
      const expense=expenses.find(e=>e.id===btn.dataset.expenseEdit);
      if(!expense) return;
      $("#viewExpensesDialog").close();
      openExpenseDialog(expense);
    };
  });

  $$("[data-expense-delete]").forEach(btn=>{
    btn.onclick=async()=>{
      const expense=expenses.find(e=>e.id===btn.dataset.expenseDelete);
      if(!expense) return;

      if(await comicConfirm(`¿Borrar "${expense.title}" por $${money(expense.amount)} ${expense.currency}?`,{
        title:"Borrar gasto",
        okText:"🗑 Borrar"
      })){
        expenses=expenses.filter(e=>e.id!==expense.id);
        saveExpenses();
        renderViewExpenses();
        renderAll();
        toast("Gasto borrado.");
      }
    };
  });
}


function exportBook(bookId){
  const book=books.find(b=>b.id===bookId);
  if(!book) return;

  const payload={
    version:"11.0.2",
    exportedAt:new Date().toISOString(),
    book:{...book},
    tasks:tasks.filter(t=>t.bookId===bookId),
    expenses:expenses.filter(e=>e.bookId===bookId),
    trash:trash.filter(t=>t.bookId===bookId)
  };

  const safeName=(book.name||"libro").replace(/[^\w\-áéíóúÁÉÍÓÚñÑ ]+/g,"").trim().replace(/\s+/g,"_") || "libro";
  downloadText(
    `libro_${safeName}_${dateKey(new Date())}.json`,
    JSON.stringify(payload,null,2),
    "application/json;charset=utf-8"
  );
  toast(`Libro "${book.name}" exportado.`);
}

function downloadText(filename,text,type="text/plain;charset=utf-8"){
  const blob=new Blob([text],{type});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function exportExpensesTxt(){
  const rows=[`GASTOS - ${settings.appTitle||"Mis Tareas"}`,""];
  [...expenses].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{
    rows.push(`${dotDate(parseDate(e.date))} | ${e.title} | ${e.description||""} | $${money(e.amount)} ${e.currency}`);
  });
  downloadText(`gastos_${dateKey(new Date())}.txt`,rows.join("\n"));
  markExport("txt");
}
function csvCell(v){
  const s=String(v??"").replace(/"/g,'""');
  return `"${s}"`;
}
function exportExpensesCsv(){
  const rows=[["Fecha","En que gaste","Descripcion","Monto","Moneda"]];
  [...expenses].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>rows.push([
    dotDate(parseDate(e.date)),e.title,e.description||"",Number(e.amount||0).toFixed(2),e.currency
  ]));
  const csv="\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
  downloadText(`gastos_${dateKey(new Date())}.csv`,csv,"text/csv;charset=utf-8");
  markExport("csv");
}

$("#taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  try{
    const data=readForm(); if(!data.title) return;
    const id=$("#taskId").value;
    if(id){const i=tasks.findIndex(t=>t.id===id); tasks[i]={...tasks[i],...data};}
    else tasks.push({id:uid(),bookId:activeBookId,createdAt:new Date().toISOString(),...data});
    $("#taskDialog").close(); saveTasks(); toast("Tarea guardada.");
  }catch(err){toast(err.message||"Revisa los datos.");}
});
$("#deleteTaskBtn").onclick=async()=>{
  const id=$("#taskId").value;
  if(!id) return;
  if(await comicConfirm("¿Mover esta tarea a la papelera? Podrás recuperarla durante 24 horas.",{
    title:"Eliminar tarea",
    okText:"🗑 Eliminar"
  })){
    moveToTrash(id);
    $("#taskDialog").close();
    toast("Tarea movida a la papelera.");
  }
};
$("#closeTaskDialog").onclick=$("#cancelTaskBtn").onclick=()=>$("#taskDialog").close();
$("#chooseTaskEmojiBtn").onclick=()=>{emojiEditTaskId=null;renderEmojiPicker();$("#emojiDialog").showModal();};
$("#closeEmojiDialog").onclick=()=>{emojiEditTaskId=null;$("#emojiDialog").close();};
$("#emojiDialog").addEventListener("click",e=>{
  if(e.target===$("#emojiDialog")){
    emojiEditTaskId=null;
    $("#emojiDialog").close();
  }
});

$("#closeEmojiSavedDialog").onclick=()=>$("#emojiSavedDialog").close();
$("#emojiSavedDialog").addEventListener("click",e=>{
  if(e.target===$("#emojiSavedDialog")) $("#emojiSavedDialog").close();
});
$("#emojiSavedDialog").addEventListener("cancel",e=>{
  e.preventDefault();
  $("#emojiSavedDialog").close();
});


$("#allDay").onchange=toggleTimeFields; function syncDueDependentFields(){}

$("#dueDate").addEventListener("change",syncDueDependentFields);


$("#viewExpensesBtn").onclick=openViewExpensesDialog;
$("#closeViewExpensesDialog").onclick=()=>$("#viewExpensesDialog").close();
$$("[data-view-expense-shift]").forEach(btn=>{
  btn.onclick=()=>shiftViewExpenseDate(btn.dataset.viewExpenseShift);
});
$("#addExpenseBtn").onclick=()=>openExpenseDialog();
$("#closeExpenseDialog").onclick=$("#cancelExpenseBtn").onclick=()=>$("#expenseDialog").close();
$$("[data-expense-shift]").forEach(b=>b.onclick=()=>shiftExpenseDate(b.dataset.expenseShift));

$("#expenseAmountDisplay").addEventListener("input",e=>{
  const caretWasAtEnd=e.target.selectionStart===e.target.value.length;
  const formatted=formatMoneyInput(e.target.value);
  e.target.value=formatted;
  const amount=parseMoneyInput(formatted);
  $("#expenseAmount").value=amount>0 ? String(amount) : "";
  if(caretWasAtEnd){
    const len=e.target.value.length;
    try{ e.target.setSelectionRange(len,len); }catch{}
  }
});
$("#expenseAmountDisplay").addEventListener("blur",e=>{
  const amount=parseMoneyInput(e.target.value);
  if(amount>0){
    const fixed=Math.min(amount,99999999.99).toFixed(2);
    e.target.value=formatMoneyInput(fixed);
    $("#expenseAmount").value=String(Number(fixed));
  }
});

$("#expenseCurrencyBtn").onclick=()=>{
  $("#expenseCurrencyBtn").textContent=$("#expenseCurrencyBtn").textContent==="MN"?"DLS":"MN";
};
$("#expenseForm").addEventListener("submit",e=>{
  e.preventDefault();

  const title=$("#expenseTitle").value.trim();
  const amount=parseMoneyInput($("#expenseAmountDisplay").value);
  const expenseDateValue=parseDate($("#expenseDate").value);

  if(isFutureDate(expenseDateValue)){
    toast("No puedes registrar gastos en una fecha futura.");
    return;
  }

  if(!title){
    toast("Escribe en qué gastaste.");
    return;
  }

  if(amount<=0 || amount>99999999.99){
    toast("El monto debe estar entre $0.01 y $99,999,999.99.");
    return;
  }

  const id=$("#expenseId").value;
  const data={
    date:$("#expenseDate").value,
    title,
    description:$("#expenseDescription").value.trim(),
    amount:Number(amount.toFixed(2)),
    currency:$("#expenseCurrencyBtn").textContent
  };

  if(id){
    const i=expenses.findIndex(x=>x.id===id);
    if(i>=0) expenses[i]={...expenses[i],...data,updatedAt:new Date().toISOString()};
  }else{
    expenses.push({id:uid(),bookId:activeBookId,...data,createdAt:new Date().toISOString()});
  }

  selectedDate=parseDate(data.date);
  calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
  weekCursor=startOfWeek(selectedDate);

  saveExpenses();
  $("#expenseDialog").close();
  renderAll();

  if($("#viewExpensesDialog") && $("#viewExpensesDialog").open){
    $("#viewExpenseDate").value=data.date;
    $("#viewExpenseDateLabel").textContent=dotDate(parseDate(data.date));
    renderViewExpenses();
  }

  toast(id ? "Gasto actualizado." : "Gasto guardado.");
});



$("#closeCommentDialog").onclick=()=>$("#commentDialog").close();
$("#commentDialog").addEventListener("click",e=>{
  if(e.target===$("#commentDialog")) $("#commentDialog").close();
});
$("#commentDialog").addEventListener("cancel",e=>{
  e.preventDefault();
  $("#commentDialog").close();
});

$("#booksBtn").onclick=openBooksDialog;
$("#activeBookSelect").onchange=e=>{
  setActiveBook(e.target.value);
};
$("#toggleBookFormBtn").onclick=()=>setBookFormOpen($("#bookFormPanel").classList.contains("hidden"));
$("#closeBooksDialog").onclick=()=>{finalizeBookSelection();$("#booksDialog").close();};
$("#addBookBtn").onclick=addBook;
$("#deleteBookBtn").onclick=deleteEditingBook;

$("#bookNameInput").addEventListener("input",e=>{
  const value=e.target.value.slice(0,20);
  if(e.target.value!==value) e.target.value=value;
  $("#bookNameCounter").textContent=`${value.length}/20`;

  if(editingBookId){
    $("#addBookBtn").classList.remove("hidden");
  }else{
    $("#addBookBtn").classList.toggle("hidden",value.trim().length===0);
  }
});

$("#bookNameInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    addBook();
  }
});

$("#booksDialog").addEventListener("click",e=>{
  if(e.target===$("#booksDialog")){
    finalizeBookSelection();
    $("#booksDialog").close();
  }
});
$("#booksDialog").addEventListener("cancel",e=>{
  e.preventDefault();
  finalizeBookSelection();
  $("#booksDialog").close();
});


$$("dialog [id*='cancel'], dialog [id*='Cancel'], dialog .cancel-btn").forEach(btn=>{
  btn.addEventListener("click",e=>{
    e.preventDefault();
    const dialog=btn.closest("dialog");
    if(dialog && dialog.open) dialog.close();
  });
});
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
$("#pendingFilter").onchange=renderDay;
$("#prevMonth").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();};
$("#nextMonth").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();};
$("#prevWeek").onclick=()=>{weekCursor=addDays(weekCursor,-7);renderWeek();};
$("#nextWeek").onclick=()=>{weekCursor=addDays(weekCursor,7);renderWeek();};
$$("[data-view]").forEach(b=>b.onclick=()=>{switchView(b.dataset.view);renderAll();});
$("#settingsBtnTop").onclick=()=>{populateSettings();$("#settingsSavedMessage").classList.add("hidden");$("#settingsDialog").showModal();};
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
$("#saveSettingsBtn").onclick=saveSettingsFromDialog;
$("#exportExpensesTxtBtn").onclick=exportExpensesTxt;
$("#exportExpensesCsvBtn").onclick=exportExpensesCsv;
$("#exportBtn").onclick=exportData;
$("#importInput").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
$("#clearBtn").onclick=async()=>{if(await comicConfirm("Esto borrará todas las tareas, la papelera y los gastos. ¿Continuar?",{title:"Borrar todos los datos",okText:"🗑 Borrar todo"})){tasks=[];trash=[];expenses=[];saveTrash();localStorage.setItem(EXPENSES_KEY,"[]");saveTasks();renderExpenseSummary();toast("Datos eliminados.");}};
$("#emptyTrashBtn").onclick=async()=>{
  if(!trash.length){toast("La papelera ya está vacía.");return;}
  if(await comicConfirm("¿Vaciar la papelera? Las tareas se eliminarán definitivamente.",{
    title:"Vaciar papelera",
    okText:"🗑 Vaciar"
  })){trash=[];saveTrash();renderTrash();toast("Papelera vaciada.");}
};
window.addEventListener("focus",()=>{normalizeStatuses();renderAll();scheduleNotifications();});
setInterval(()=>{normalizeStatuses();renderAll();},60000);

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").then(reg=>reg.update()).catch(()=>{});
}
ensureBookMigration();
updateActiveBookSelect();
populateSettings();
applySettings();
if ($("#appVersion")) $("#appVersion").textContent = APP_VERSION;
switchView("calendar");
renderAll(); scheduleNotifications();
