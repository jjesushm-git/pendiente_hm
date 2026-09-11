const STORAGE_KEY = "mis_tareas_v1";
const SETTINGS_KEY = "mis_tareas_settings_v1";
const TRASH_KEY = "mis_tareas_trash_v1";
const TRASH_TTL = 24 * 60 * 60 * 1000;
const DEFAULT_PENDING_FILTER = "upcoming";
const EXPENSES_KEY = "mis_tareas_expenses_v1";
const BOOKS_KEY = "mis_tareas_books_v1";
const ACTIVE_BOOK_KEY = "mis_tareas_active_book_v1";
const APP_VERSION = "11.7.6";

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


function movementType(e){
  return e && e.type==="income" ? "income" : "expense";
}

function movementSignedAmount(e){
  const amount=Math.abs(Number(e?.amount||0));
  return movementType(e)==="income" ? amount : -amount;
}

function movementSymbol(e){
  return movementType(e)==="income" ? "$$" : "$";
}

function movementTypeLabel(e){
  return movementType(e)==="income" ? "Ingreso" : "Gasto";
}

function signedMoney(n){
  const value=Number(n||0);
  if(value>0) return `+$${money(value)}`;
  if(value<0) return `-$${money(Math.abs(value))}`;
  return `$${money(0)}`;
}

function balanceClassForTotals(t){
  const values=[Number(t.MN||0),Number(t.DLS||0)].filter(v=>v!==0);
  if(!values.length) return "balance-neutral";
  if(values.every(v=>v>0)) return "balance-positive";
  if(values.every(v=>v<0)) return "balance-negative";
  return "balance-mixed";
}

function findTaskMovement(taskId){
  return expenses.find(e=>e.taskId===taskId) || null;
}

function taskMovementIndicatorHTML(t){
  const movement=findTaskMovement(t.id);
  if(!movement) return "";
  return `<button type="button"
                  class="task-money-indicator"
                  data-task-money="${movement.id}"
                  title="${movementTypeLabel(movement)} asociado a esta tarea">${movementSymbol(movement)}</button>`;
}


function taskCountIndicatorHTML(dayTasks,scope="calendar"){
  const count=dayTasks.length;
  if(!count) return "";

  if(count===1){
    const emoji=esc(dayTasks[0].emoji||"📌");
    return `<span class="${scope}-task-single" title="1 tarea">${emoji}</span>`;
  }

  const level=count>=5?"red":"yellow";
  const displayCount=Math.min(count,99);
  return `<span class="${scope}-task-count ${level}" title="${count} tareas">${displayCount}</span>`;
}


function compactTaskCardHTML(t,occurrenceDate=selectedDate,scope="compact"){
  const occurrenceKey=occurrenceKeyForTask(t,occurrenceDate);
  const comment=taskCommentForOccurrence(t,occurrenceKey);

  return `
    <div class="compact-task-shell"
         data-compact-shell="${t.id}"
         data-compact-date="${occurrenceKey}"
         data-compact-scope="${scope}">
      <div class="mini-task compact-task-card ${t.highImportance?"high-importance":""}"
           data-expand-task="${t.id}"
           data-expand-date="${occurrenceKey}"
           data-expand-scope="${scope}">
        <button type="button"
                class="mini-task-emoji task-emoji-edit"
                data-emoji-task="${t.id}"
                title="Cambiar emoticono">${esc(t.emoji||"📌")}</button>

        <span class="compact-task-copy">
          <strong>${esc(t.title)}</strong>
          <small>
            ${formatTimeMeta(t)} · ${statusLabel(t.status)}
            ${t.status==="pending"?` · ${boardStageLabel(boardStageOf(t))}`:""}
            · ${recurrenceButtonHTML(t,true,occurrenceDate)}
            ${taskMovementIndicatorHTML(t)} ·
            <button type="button"
                    class="mini-comment-btn ${comment?"has-comment":"no-comment"}"
                    data-comment-task="${t.id}"
                    data-comment-date="${occurrenceKey}">${comment?"💬":"💬＋"}</button>
          </small>
        </span>
      </div>
    </div>`;
}

function compactTaskListHTML(list,occurrenceDate=selectedDate,scope="compact"){
  if(!list.length) return `<div class="empty">No hay tareas en esta sección.</div>`;
  return list.map(t=>compactTaskCardHTML(t,occurrenceDate,scope)).join("");
}

function bindCompactTaskExpansion(root=document){
  root.querySelectorAll("[data-expand-task]").forEach(card=>{
    card.onclick=e=>{
      if(e.target.closest("button,select,input,a,label,textarea")) return;

      const task=tasks.find(t=>t.id===card.dataset.expandTask);
      if(!task) return;

      const occurrenceDate=parseDate(card.dataset.expandDate||dateKey(selectedDate));
      const scope=card.dataset.expandScope||"compact";
      const shell=card.closest("[data-compact-shell]");
      if(!shell) return;

      shell.innerHTML=taskCard(task,occurrenceDate);
      shell.classList.add("expanded-task-shell");

      bindTaskActions(shell);

      let collapseTimer=null;

      const collapseCard=()=>{
        if(!shell.isConnected) return;
        const fresh=tasks.find(x=>x.id===task.id);
        if(!fresh) return;

        if(collapseTimer){
          clearTimeout(collapseTimer);
          collapseTimer=null;
        }

        const temp=document.createElement("div");
        temp.innerHTML=compactTaskCardHTML(fresh,occurrenceDate,scope).trim();
        const newShell=temp.firstElementChild;

        shell.replaceWith(newShell);
        bindTaskActions(newShell);
        bindCompactTaskExpansion(root);
      };

      const scheduleCollapse=()=>{
        if(collapseTimer) clearTimeout(collapseTimer);
        collapseTimer=setTimeout(collapseCard,5000);
      };

      const article=shell.querySelector(".task-card");
      if(article){
        article.classList.add("expanded-from-compact");

        article.onclick=evt=>{
          if(evt.target.closest("button,select,input,a,label,textarea,.task-card-popup,.task-unified-move")) return;
          collapseCard();
        };

        article.addEventListener("pointerdown",()=>{
          scheduleCollapse();
        },{passive:true});

        article.addEventListener("focusin",()=>{
          scheduleCollapse();
        });

        scheduleCollapse();
      }
    };
  });
}

function statusCountsForCurrentContext(){
  let list=[];

  if(currentView==="week"){
    list=[...Array(7)].flatMap((_,i)=>expandedTasksForDate(addDays(weekCursor,i)));
  }else if(currentView==="board"){
    list=activeTasks();
  }else{
    list=expandedTasksForDate(selectedDate);
  }

  return {
    pending:list.filter(t=>t.status==="pending").length,
    completed:list.filter(t=>t.status==="completed").length,
    missed:list.filter(t=>t.status==="missed").length
  };
}

function renderGlobalStatusStrip(){
  if(!$("#globalStatusStrip")) return;
  const c=statusCountsForCurrentContext();
  $("#globalPendingCount").textContent=c.pending;
  $("#globalCompletedCount").textContent=c.completed;
  $("#globalMissedCount").textContent=c.missed;
}

function scopedStatusStatsHTML(counts,targetPrefix){
  return `
    <button class="stat-card stat-link" data-status-target="${targetPrefix}PendingSection">
      <strong>${counts.pending}</strong><small>Pendientes</small>
    </button>
    <button class="stat-card stat-link" data-status-target="${targetPrefix}CompletedSection">
      <strong>${counts.completed}</strong><small>Completadas</small>
    </button>
    <button class="stat-card stat-link" data-status-target="${targetPrefix}MissedSection">
      <strong>${counts.missed}</strong><small>Vencidas</small>
    </button>`;
}

function bindScopedStatusButtons(root=document){
  root.querySelectorAll("[data-status-target]").forEach(btn=>{
    btn.onclick=()=>{
      const target=document.getElementById(btn.dataset.statusTarget);
      if(target) target.scrollIntoView({behavior:"smooth",block:"start"});
    };
  });
}

function weekOccurrenceListHTML(items){
  if(!items.length) return `<div class="empty">No hay tareas en esta sección.</div>`;

  const groups=new Map();
  items.forEach(({t,d})=>{
    const key=dateKey(d);
    if(!groups.has(key)) groups.set(key,{d,items:[]});
    groups.get(key).items.push(t);
  });

  return [...groups.values()]
    .sort((a,b)=>a.d-b.d)
    .map(group=>`
      <div class="week-status-day">
        <h4>${group.d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"short"})}</h4>
        <div class="task-list compact-task-list">
          ${compactTaskListHTML(group.items,group.d,"week-status")}
        </div>
      </div>
    `).join("");
}

function movementsThroughDate(d){
  const key=dateKey(d);
  return activeExpenses()
    .filter(e=>e.date<=key)
    .sort((a,b)=>{
      const byDate=a.date.localeCompare(b.date);
      if(byDate) return byDate;
      return String(a.createdAt||"").localeCompare(String(b.createdAt||""));
    });
}

function financialBreakdownThroughDate(d){
  const list=movementsThroughDate(d);
  const out={
    MN:{expenses:0,income:0,balance:0},
    DLS:{expenses:0,income:0,balance:0}
  };

  list.forEach(e=>{
    const cur=e.currency==="DLS"?"DLS":"MN";
    const amount=Math.abs(Number(e.amount||0));
    if(movementType(e)==="income") out[cur].income+=amount;
    else out[cur].expenses+=amount;
    out[cur].balance+=movementSignedAmount(e);
  });

  return {list,...out};
}

function financialTotalsThroughDate(d){
  const data=financialBreakdownThroughDate(d);
  return {
    MN:data.MN.balance,
    DLS:data.DLS.balance
  };
}

function renderFinanceLedger(){
  const through=startOfDay(selectedDate||new Date());
  const data=financialBreakdownThroughDate(through);
  $("#financeLedgerThroughDate").textContent=`Desde el movimiento más antiguo hasta ${shortDate(through)} · ${activeBook()?.name||"Libro"}`;

  $("#financeLedgerList").innerHTML=data.list.length ? data.list.map(e=>{
    const linkedTask=e.taskId?tasks.find(t=>t.id===e.taskId):null;
    const type=movementType(e);
    return `
      <article class="ledger-movement-card ${type}">
        <div class="ledger-movement-head">
          <span class="movement-gold-symbol">${movementSymbol(e)}</span>
          <div>
            <small class="movement-type-label ${type}">${movementTypeLabel(e)}</small>
            <strong>${esc(e.title)}</strong>
          </div>
          <span class="ledger-movement-amount ${type}">${signedMoney(movementSignedAmount(e))} ${esc(e.currency||"MN")}</span>
        </div>
        ${e.description?`<p>${esc(e.description)}</p>`:""}
        <div class="ledger-movement-meta">
          <span>📅 ${shortDate(parseDate(e.date))}</span>
          ${linkedTask?`<span>✅ Tarea: ${esc(linkedTask.title)}</span>`:""}
        </div>
      </article>`;
  }).join("") : `<div class="empty">No hay gastos ni ingresos registrados hasta esta fecha.</div>`;

  const totalBlock=(currency,label)=>`
    <div class="ledger-total-currency">
      <strong>${label}</strong>
      <div><span>Gastos</span><b class="balance-negative">-$${money(data[currency].expenses)} ${currency}</b></div>
      <div><span>Ingresos</span><b class="balance-positive">+$${money(data[currency].income)} ${currency}</b></div>
      <div class="ledger-net"><span>Balance</span><b class="${data[currency].balance>0?"balance-positive":data[currency].balance<0?"balance-negative":"balance-neutral"}">${signedMoney(data[currency].balance)} ${currency}</b></div>
    </div>`;

  $("#financeLedgerTotals").innerHTML=`
    <h3>Totales hasta ${shortDate(through)}</h3>
    ${totalBlock("MN","Moneda nacional")}
    <details class="ledger-dls-details">
      <summary>💵 Dólares (DLS) · tocar para ver</summary>
      ${totalBlock("DLS","Dólares")}
    </details>
  `;
}

function openFinanceLedger(){
  renderFinanceLedger();
  $("#financeLedgerDialog").showModal();
}

function movementMarkerForDateKey(key){
  const list=activeExpenses().filter(e=>e.date===key);
  const hasExpense=list.some(e=>movementType(e)==="expense");
  const hasIncome=list.some(e=>movementType(e)==="income");
  if(hasExpense && hasIncome) return "$ $$";
  if(hasIncome) return "$$";
  if(hasExpense) return "$";
  return "";
}

function migrateMovementsV116(){
  let changed=false;
  expenses.forEach(e=>{
    if(e.type!=="income" && e.type!=="expense"){
      e.type="expense";
      changed=true;
    }
    const amount=Math.abs(Number(e.amount||0));
    if(Number(e.amount||0)!==amount){
      e.amount=amount;
      changed=true;
    }
  });
  if(changed) localStorage.setItem(EXPENSES_KEY,JSON.stringify(expenses));
}

function expenseTotalsForDate(d){
  const key=dateKey(d);
  const day=activeExpenses().filter(e=>e.date===key);
  return {
    MN:day.filter(e=>e.currency==="MN").reduce((s,e)=>s+movementSignedAmount(e),0),
    DLS:day.filter(e=>e.currency==="DLS").reduce((s,e)=>s+movementSignedAmount(e),0)
  };
}

function getBookExpenseCycleDayForDate(book,d){
  if(!book) return 1;
  const fallback=Math.min(31,Math.max(1,Number(book.expenseCycleDay||1)));
  const history=Array.isArray(book.expenseCycleHistory)?book.expenseCycleHistory:[];
  if(!history.length) return fallback;

  const key=dateKey(d);
  const valid=history
    .filter(h=>h && h.from && h.from<=key)
    .sort((a,b)=>a.from.localeCompare(b.from));

  const last=valid[valid.length-1];
  return last ? Math.min(31,Math.max(1,Number(last.day||fallback))) : fallback;
}

function getActiveBookExpenseCycleDay(){
  const book=activeBook();
  return getBookExpenseCycleDayForDate(book,new Date());
}

function setActiveBookExpenseCycleDay(day){
  const book=activeBook();
  if(!book) return;

  const next=Math.min(31,Math.max(1,Number(day||1)));
  const today=dateKey(new Date());
  const current=getBookExpenseCycleDayForDate(book,new Date());

  book.expenseCycleDay=next;
  if(!Array.isArray(book.expenseCycleHistory)) book.expenseCycleHistory=[];

  if(next!==current){
    const existing=book.expenseCycleHistory.find(h=>h.from===today);
    if(existing) existing.day=next;
    else book.expenseCycleHistory.push({from:today,day:next});
    book.expenseCycleHistory.sort((a,b)=>a.from.localeCompare(b.from));
  }

  localStorage.setItem(BOOKS_KEY,JSON.stringify(books));
}

function expenseCycleRange(d){
  const cycle=getBookExpenseCycleDayForDate(activeBook(),d);
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
    MN:list.filter(e=>e.currency==="MN").reduce((s,e)=>s+movementSignedAmount(e),0),
    DLS:list.filter(e=>e.currency==="DLS").reduce((s,e)=>s+movementSignedAmount(e),0),
    start,end
  };
}
function totalsText(prefix,t){
  let parts=[];
  if(t.MN || !t.DLS) parts.push(`${signedMoney(t.MN)} MN`);
  if(t.DLS) parts.push(`${signedMoney(t.DLS)} DLS`);
  return `${prefix}: ${parts.join(" · ")}`;
}
function renderExpenseSummary(){
  if(!$("#expenseDayTotal")) return;
  const day=expenseTotalsForDate(selectedDate);
  const cumulative=financialTotalsThroughDate(selectedDate);

  $("#expenseDayTotal").textContent=totalsText("Balance del día",day);
  $("#expenseMonthTotal").textContent=`Acumulado hasta ${shortDate(selectedDate)}: ${totalsText("",cumulative).replace(/^:\s*/,"")}`;

  $("#expenseDayTotal").classList.remove("balance-positive","balance-negative","balance-mixed","balance-neutral");
  $("#expenseMonthTotal").classList.remove("balance-positive","balance-negative","balance-mixed","balance-neutral");
  $("#expenseDayTotal").classList.add(balanceClassForTotals(day));
  $("#expenseMonthTotal").classList.add(balanceClassForTotals(cumulative));
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

const BOOK_COLORS=["#725cff","#3d8bfd","#22b573","#d7a928","#f06a6a","#b56cff","#5aa7a7","#8d98a8"];

function normalizeBookAppearance(book){
  if(book.icon===undefined || book.icon===null) book.icon="📖";
  if(book.color===undefined || book.color===null) book.color="#725cff";
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
  $("#bookIconInput").value="";
  $("#bookColorInput").value="";
  $("#bookFormLabel").firstChild.textContent="Agregar libro ";
  $("#addBookBtn").textContent="＋ Agregar libro";
  $("#addBookBtn").classList.add("hidden");
  $("#deleteBookBtn").classList.add("hidden");
  if($("#bookAppearanceDetails")) $("#bookAppearanceDetails").open=false;
  renderBookCustomizePickers();
}

function renderBookCustomizePickers(){
  if($("#bookIconPicker")){
    const current=$("#bookIconInput").value;
    const theme=settings.theme||"emerald_gold";

    $("#bookIconPicker").innerHTML=BOOK_ICON_SECTIONS
      .filter(section=>!section.themeOnly || section.themeOnly===theme)
      .map(section=>`
        <section class="book-emoji-section ${section.themeOnly?"book-adventure-section":""}">
          <h4>${section.label}</h4>
          <div class="book-emoji-grid">
            ${section.icons.map(icon=>`
              <button type="button"
                      class="book-icon-option ${current===icon?"selected":""}"
                      data-book-icon="${icon}"
                      title="${section.label}">${icon}</button>
            `).join("")}
          </div>
        </section>
      `).join("");
  }

  if($("#bookColorPicker")){
    $("#bookColorPicker").innerHTML=BOOK_COLORS.map(color=>`
      <button type="button"
              class="book-color-option ${$("#bookColorInput").value===color?"selected":""}"
              data-book-color="${color}"
              style="--book-color:${color}"
              title="${color}"></button>
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

  if($("#clearBookIconBtn")){
    $("#clearBookIconBtn").onclick=()=>{
      $("#bookIconInput").value="";
      renderBookCustomizePickers();
    };
  }

  if($("#clearBookColorBtn")){
    $("#clearBookColorBtn").onclick=()=>{
      $("#bookColorInput").value="";
      renderBookCustomizePickers();
    };
  }
}


function updateActiveBookSelect(){
  const select=$("#activeBookSelect");
  if(!select) return;

  select.innerHTML=books.map(book=>{
    normalizeBookAppearance(book);
    return `<option value="${book.id}" ${book.id===activeBookId?"selected":""}>${book.icon?book.icon+" ":""}${esc(book.name)}</option>`;
  }).join("");

  const current=books.find(book=>book.id===activeBookId);
  const label=current ? `${current.icon?current.icon+" ":""}${current.name}` : "Cambiar libro";
  select.title=label;

  const display=$("#activeBookDisplay");
  const ticker=$("#activeBookTicker");
  if(display && ticker){
    ticker.textContent=label;
    display.classList.remove("show-end","can-scroll");
    ticker.style.removeProperty("--book-scroll-distance");

    if(window.__bookTickerTimer){
      clearInterval(window.__bookTickerTimer);
      window.__bookTickerTimer=null;
    }

    requestAnimationFrame(()=>{
      const distance=Math.max(0,ticker.scrollWidth-display.clientWidth);
      if(distance>6){
        display.classList.add("can-scroll");
        ticker.style.setProperty("--book-scroll-distance",`${distance}px`);
        window.__bookTickerTimer=setInterval(()=>{
          display.classList.toggle("show-end");
        },5000);
      }
    });
  }
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
      expenseCycleHistory:[{from:"1970-01-01",day:1}],
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
    if(!Array.isArray(book.expenseCycleHistory) || !book.expenseCycleHistory.length){
      book.expenseCycleHistory=[{from:"1970-01-01",day:Number(book.expenseCycleDay||1)}];
      changedBooks=true;
    }
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
  return ({
    none:"Sin recurrencia",
    daily:"Diaria",
    weekly:"Semanal",
    monthly:"Mensual",
    yearly:"Anual"
  })[r]||"Sin recurrencia";
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
    "🔺","🟩","🟨","🟦","🟪","💎","💠","🔮","🪬","🧿","👑","🏆","🥇","⭐","🌟","✨","💫",
    "🗝️","🔑","📜","🗺️","🧭","🏺","🏰","⛺","🕯️","🔥","🌿","🍃","🌱","🌲","🌳","🌾","🍄",
    "🪙","💰","💵","💳","🏦","🧾","💲","💸","📦","🎒","🧺","🎁",
    "🧰","🔨","⚒️","🛠️","🔧","⚙️","🪓","⛏️","🪚","🪛","🧱","🧲","🔩",
    "🧪","⚗️","🧴","🔔","🎵","🎶","📯","🪕","🎺","🎻",
    "🐎","🦅","🐺","🦊","🐉","🐲","🦋","🐝","🪶","🪽","🐟","🦉","🦌","🐏",
    "🌊","💧","❄️","⚡","☀️","🌙","🌈","🌌","🌋","🏔️","⛰️",
    "📌","✅","☑️","📋","📝","📚","💼","🎯","📈","📉","🧮","🗂️","📁","📂","🔍","⏰","📅",
    "🧠","💡","🔋","🧱","🚪","🪜","🧵","🪡","🧶","🧹","🪣","🧼","🧽",
    "🍞","🥖","🍎","🍏","🍇","🍄","🥕","🥔","🌽","🧀","🥩","🍗","🥚","🍯",
    "🚚","🛒","🏪","🏠","🏕️","🚪","🧳","📬","📮","🪧","🛎️","🎒","🎣","⛏️"
  ]
};

const BOOK_ICON_SECTIONS=[
  {key:"work",label:"Trabajo y oficina",icons:TASK_EMOJIS.work},
  {key:"tasks",label:"Tareas y organización",icons:TASK_EMOJIS.tasks},
  {key:"money",label:"Dinero y compras",icons:TASK_EMOJIS.money},
  {key:"food",label:"Comida",icons:TASK_EMOJIS.food},
  {key:"social",label:"Sociales y otros",icons:TASK_EMOJIS.social},
  {key:"zelda",label:"Aventura",icons:TASK_EMOJIS.zelda,themeOnly:"emerald_gold"}
];

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
  purgeExpiredTrash(); renderWeekStrip(); renderDay(); renderCalendar(); renderWeek(); renderBoard(); renderTrash(); renderGlobalStatusStrip(); renderExpenseSummary();
}
function renderWeekStrip(){
  const week=startOfWeek(selectedDate);
  $("#weekStrip").innerHTML = [...Array(7)].map((_,i)=>{
    const d=addDays(week,i), key=dateKey(d);
    const dayTasks=expandedTasksForDate(d).sort(compareTasksByDate);
    const taskIndicator=taskCountIndicatorHTML(dayTasks,"week");
    const movementMark=movementMarkerForDateKey(key);

    return `<button class="week-day ${key===dateKey(selectedDate)?"active":""}" data-date="${key}">
      <span class="dow">${d.toLocaleDateString("es-MX",{weekday:"short"}).replace(".","")}</span>
      <span class="num">${d.getDate()}</span>
      <span class="day-bottom-indicators week-day-indicators">
        ${taskIndicator}
        ${movementMark?`<span class="week-expense-mark" title="Hay movimientos registrados">${movementMark}</span>`:""}
      </span>
    </button>`;
  }).join("");

  $$(".week-day").forEach(b=>b.onclick=()=>{
    selectedDate=parseDate(b.dataset.date);
    weekCursor=startOfWeek(selectedDate);
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
    .filter(t=>t.status==="pending" && !recurrenceSegmentEndedBefore(t,selectedDate))
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

  $("#pendingList").innerHTML=compactTaskListHTML(filtered,selectedDate,"day-pending");
  $("#completedList").innerHTML=compactTaskListHTML(allCompleted,selectedDate,"day-completed");
  $("#missedList").innerHTML=compactTaskListHTML(allMissed,selectedDate,"day-missed");
  bindTaskActions($("#dayView"));
  bindCompactTaskExpansion($("#dayView"));
}
function expandedTasksForDate(d){ return activeTasks().filter(t=>occursOn(t,d)); }

function ensureTaskCommentMap(t){
  if(!t.commentsByOccurrence || typeof t.commentsByOccurrence!=="object" || Array.isArray(t.commentsByOccurrence)){
    t.commentsByOccurrence={};
  }
  return t.commentsByOccurrence;
}

function occurrenceKeyForTask(t,referenceDate=selectedDate){
  if(!t) return dateKey(referenceDate||new Date());

  if(t.recurrence==="none"){
    return t.startDate || t.dueDate || dateKey(referenceDate||new Date());
  }

  let ref=startOfDay(referenceDate||new Date());
  const start=t.startDate?startOfDay(parseDate(t.startDate)):ref;

  if(ref<start) ref=start;

  if(occursOn(t,ref)) return dateKey(ref);

  let cursor=new Date(ref);
  for(let i=0;i<740;i++){
    cursor=addDays(cursor,1);
    if(occursOn(t,cursor)) return dateKey(cursor);
  }

  return t.startDate || dateKey(referenceDate||new Date());
}

function taskCommentForOccurrence(t,occurrenceKey){
  const map=ensureTaskCommentMap(t);
  return String(map[occurrenceKey]||"");
}

function hasTaskCommentForOccurrence(t,occurrenceKey){
  return !!taskCommentForOccurrence(t,occurrenceKey).trim();
}

function migrateTaskCommentsV1155(){
  let changed=false;

  tasks.forEach(t=>{
    const map=ensureTaskCommentMap(t);

    if(t.comment && String(t.comment).trim()){
      const oldest=t.startDate || t.dueDate || dateKey(new Date(t.createdAt||Date.now()));
      if(!map[oldest]) map[oldest]=String(t.comment).trim();
      t.comment="";
      changed=true;
    }

    if(!t.comment && t.comment!==undefined){
      delete t.comment;
      changed=true;
    }
  });

  if(changed){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));
  }
}



function recurrenceSegmentEndedBefore(t,referenceDate=selectedDate){
  if(!t || t.recurrence==="none" || !t.recurrenceUntil) return false;
  return parseDate(t.recurrenceUntil)<startOfDay(referenceDate||new Date());
}

function occurrenceEditKey(t,referenceDate=selectedDate){
  if(!t) return dateKey(referenceDate||new Date());
  if(t.recurrence==="none") return t.startDate || dateKey(referenceDate||new Date());
  return occurrenceKeyForTask(t,referenceDate);
}

function isLaterSeriesOccurrence(t,occurrenceKey){
  if(!t || t.recurrence==="none" || !occurrenceKey || !t.startDate) return false;
  return occurrenceKey>t.startDate && occursOn(t,parseDate(occurrenceKey));
}

function moveOccurrenceCommentsForSplit(sourceTask,newTask,splitKey){
  const sourceMap=ensureTaskCommentMap(sourceTask);
  const newMap={};

  Object.keys(sourceMap).forEach(key=>{
    if(key>=splitKey){
      newMap[key]=sourceMap[key];
      delete sourceMap[key];
    }
  });

  newTask.commentsByOccurrence=newMap;
}

function splitRecurringTaskFromOccurrence(sourceTask,splitKey,data){
  const splitDate=parseDate(splitKey);
  const previousKey=dateKey(addDays(splitDate,-1));
  const originalUntil=sourceTask.recurrenceUntil||"";

  const newTask={
    ...sourceTask,
    ...data,
    id:uid(),
    startDate:data.startDate||splitKey,
    recurrenceUntil:originalUntil,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    seriesParentId:sourceTask.seriesParentId||sourceTask.id,
    seriesSplitFrom:splitKey,
    completedAt:null,
    missedAt:null
  };

  sourceTask.recurrenceUntil=previousKey;
  sourceTask.updatedAt=new Date().toISOString();

  moveOccurrenceCommentsForSplit(sourceTask,newTask,splitKey);

  tasks.push(newTask);
  return newTask;
}

function splitRecurrenceOnlyFromOccurrence(sourceTask,splitKey,newRecurrence){
  let shiftedDue="";
  if(sourceTask.dueDate){
    const durationDays=Math.max(
      0,
      Math.round((startOfDay(parseDate(sourceTask.dueDate))-startOfDay(parseDate(sourceTask.startDate)))/86400000)
    );
    shiftedDue=dateKey(addDays(parseDate(splitKey),durationDays));
  }

  const data={
    title:sourceTask.title,
    description:sourceTask.description,
    emoji:sourceTask.emoji,
    startDate:splitKey,
    dueDate:shiftedDue,
    allDay:sourceTask.allDay,
    startTime:sourceTask.startTime,
    dueTime:"",
    recurrence:newRecurrence,
    status:"pending",
    boardStage:sourceTask.boardStage==="completed"?"pending":boardStageOf(sourceTask),
    notify:false,
    notifyAmount:1,
    notifyUnit:"days",
    highImportance:sourceTask.highImportance
  };

  const newTask=splitRecurringTaskFromOccurrence(sourceTask,splitKey,data);

  /* Los movimientos financieros existentes permanecen en el tramo original.
     No se duplican automáticamente al dividir una serie. */
  return newTask;
}

function occursOn(t,d){
  const target=startOfDay(d);
  const start=startOfDay(parseDate(t.startDate));
  const due=t.dueDate?startOfDay(parseDate(t.dueDate)):null;

  if(t.recurrence==="none"){
    if(!due) return dateKey(target)===dateKey(start);
    return target>=start && target<=due;
  }

  if(target<start) return false;

  const recurrenceUntil=t.recurrenceUntil?startOfDay(parseDate(t.recurrenceUntil)):null;
  if(recurrenceUntil && target>recurrenceUntil) return false;

  if(due && t.status!=="pending" && target>due) return false;

  switch(t.recurrence){
    case "daily": return true;
    case "weekly": return target.getDay()===start.getDay();
    case "monthly": return target.getDate()===start.getDate();
    case "yearly": return target.getDate()===start.getDate() && target.getMonth()===start.getMonth();
    default:return false;
  }
}
function listHtml(list,occurrenceDate=selectedDate){
  if(!list.length) return `<div class="empty">No hay tareas en esta sección.</div>`;
  return list.map(t=>taskCard(t,occurrenceDate)).join("");
}

function recurrenceButtonHTML(t,compact=false,occurrenceDate=selectedDate){
  const value=t?.recurrence||"none";
  const label=recurrenceLabel(value);
  const occurrenceKey=occurrenceEditKey(t,occurrenceDate);
  return `<button type="button"
                  class="${compact?"mini-recurrence-btn":"recur-pill recur-edit-btn"}"
                  data-recurrence-task="${t.id}"
                  data-recurrence-date="${occurrenceKey}"
                  title="Cambiar recurrencia">↻ ${label}</button>`;
}

function openTaskCopyDialog(taskId,occurrenceKey){
  const task=tasks.find(t=>t.id===taskId);
  if(!task) return;

  const key=occurrenceKey || occurrenceEditKey(task,selectedDate);
  const today=startOfDay(new Date());
  const occurrence=parseDate(key);
  const minDate=addDays(today,1);
  const suggested=occurrence>=minDate ? addDays(occurrence,1) : minDate;

  $("#copyTaskId").value=task.id;
  $("#copyTaskOccurrenceDate").value=key;
  $("#copyTaskDate").min=dateKey(minDate);
  $("#copyTaskDate").value=dateKey(suggested);
  $("#taskCopyDialogTitle").textContent=`Copiar: ${task.title}`;
  $("#copyTaskPreview").innerHTML=`<strong>${esc(task.title)}</strong><small>La copia será una tarea independiente, sin recurrencia, comentarios ni movimiento financiero.</small>`;

  if($("#recurrenceDialog").open) $("#recurrenceDialog").close();
  $("#taskCopyDialog").showModal();
}

function saveTaskCopy(){
  const source=tasks.find(t=>t.id===$("#copyTaskId").value);
  const copyDateValue=$("#copyTaskDate").value;
  if(!source || !copyDateValue) return;

  const copyDate=parseDate(copyDateValue);
  const today=startOfDay(new Date());
  if(copyDate<=today){
    toast("La copia solo puede guardarse en una fecha futura.");
    return;
  }

  const occurrenceKey=$("#copyTaskOccurrenceDate").value || source.startDate;
  let shiftedDue="";
  if(source.dueDate){
    const baseStart=parseDate(source.startDate||occurrenceKey);
    const durationDays=Math.max(0,Math.round((startOfDay(parseDate(source.dueDate))-startOfDay(baseStart))/86400000));
    shiftedDue=dateKey(addDays(copyDate,durationDays));
  }

  const clone={
    ...source,
    id:uid(),
    startDate:dateKey(copyDate),
    dueDate:shiftedDue,
    recurrence:"none",
    recurrenceUntil:"",
    status:"pending",
    boardStage:"pending",
    highImportance:!!source.highImportance,
    commentsByOccurrence:{},
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    copiedFromTaskId:source.id,
    copiedFromOccurrence:occurrenceKey
  };

  delete clone.completedAt;
  delete clone.missedAt;
  delete clone.seriesSplitFrom;

  tasks.push(clone);
  $("#taskCopyDialog").close();
  saveTasks();
  toast(`Tarea copiada al ${shortDate(copyDate)}.`);
}

function openRecurrenceDialog(taskId,occurrenceKey){
  const task=tasks.find(t=>t.id===taskId);
  if(!task) return;

  const key=occurrenceKey || occurrenceEditKey(task,selectedDate);

  $("#recurrenceTaskId").value=task.id;
  $("#recurrenceOccurrenceDate").value=key;
  $("#recurrenceDialogTitle").textContent=task.title||"Cambiar recurrencia";

  $$("[data-recurrence-value]").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.recurrenceValue===(task.recurrence||"none"));
  });

  $("#recurrenceDialog").showModal();
}

function setTaskRecurrence(taskId,value,occurrenceKey){
  const task=tasks.find(t=>t.id===taskId);
  if(!task) return;

  const allowed=["none","daily","weekly","monthly","yearly"];
  if(!allowed.includes(value)) return;

  const key=occurrenceKey || occurrenceEditKey(task,selectedDate);

  if(isLaterSeriesOccurrence(task,key)){
    const futureTask=splitRecurrenceOnlyFromOccurrence(task,key,value);
    $("#recurrenceDialog").close();
    saveTasks();
    toast(`Recurrencia actualizada desde ${shortDate(parseDate(key))}: ${recurrenceLabel(value)}.`);
    return futureTask;
  }

  task.recurrence=value;
  task.updatedAt=new Date().toISOString();

  $("#recurrenceDialog").close();
  saveTasks();
  toast(`Recurrencia actualizada: ${recurrenceLabel(value)}.`);
  return task;
}


function taskMoveControlHTML(t,occurrenceKey){
  return `
    <div class="task-unified-move" data-task-move-control>
      <button type="button"
              class="task-move-mode-btn"
              data-task-move-mode="stage"
              aria-label="Cambiar tipo de movimiento">Mover a</button>

      <select class="task-move-select"
              data-task-move-select
              data-task-id="${t.id}"
              data-occurrence-date="${occurrenceKey}">
        <option value="">Selecciona destino</option>
        <option value="pending">Pendiente</option>
        <option value="in_progress">En proceso</option>
        <option value="waiting">En espera</option>
        <option value="completed">Completada</option>
      </select>
    </div>`;
}

function populateTaskMoveSelect(wrapper,task,mode){
  const select=wrapper?.querySelector("[data-task-move-select]");
  const button=wrapper?.querySelector("[data-task-move-mode]");
  if(!select || !button || !task) return;

  select.value="";
  button.dataset.taskMoveMode=mode;

  if(mode==="book"){
    button.textContent="Mover a libro";
    select.innerHTML=`<option value="">Selecciona libro</option>`+
      books
        .filter(book=>book.id!==task.bookId)
        .map(book=>`<option value="${book.id}">${book.icon||"📖"} ${esc(book.name)}</option>`)
        .join("");
  }else{
    button.textContent="Mover a";
    select.innerHTML=`
      <option value="">Selecciona destino</option>
      <option value="pending">Pendiente</option>
      <option value="in_progress">En proceso</option>
      <option value="waiting">En espera</option>
      <option value="completed">Completada</option>`;
  }
}

function applyTaskStageMove(task,value,occurrenceKey){
  if(!task || !value) return;

  task.boardStage=value;

  if(value==="completed"){
    if(task.status==="missed"){
      completeTaskOutOfTime(task,occurrenceKey);
    }else{
      task.status="completed";
      task.completedAt=task.completedAt||new Date().toISOString();
    }
  }else if(task.status==="completed"){
    task.status="pending";
    task.completedAt=null;
  }

  task.updatedAt=new Date().toISOString();
  saveTasks();
  toast(`Movida a ${boardStageLabel(value)}.`);
}

function applyTaskBookMove(task,destinationId){
  if(!task || !destinationId) return;

  const destination=books.find(book=>book.id===destinationId);
  if(!destination) return;

  const origin=books.find(book=>book.id===task.bookId);
  task.bookId=destination.id;
  task.updatedAt=new Date().toISOString();

  expenses.filter(e=>e.taskId===task.id).forEach(e=>{
    e.bookId=destination.id;
    e.updatedAt=new Date().toISOString();
  });
  localStorage.setItem(EXPENSES_KEY,JSON.stringify(expenses));

  saveTasks();
  toast(`Tarea movida de ${origin?.name||"libro"} a ${destination.name}.`);
}

function taskCard(t,occurrenceDate=selectedDate){
  const occurrenceKey=occurrenceKeyForTask(t,occurrenceDate);
  const occurrenceComment=taskCommentForOccurrence(t,occurrenceKey);

  return `<article class="task-card ${t.status} ${t.highImportance?"high-importance":""}"
                   data-task-card-id="${t.id}"
                   data-task-occurrence="${occurrenceKey}">
    <div class="task-row">
      <input class="task-check"
             type="checkbox"
             data-complete="${t.id}"
             data-complete-date="${occurrenceKey}"
             ${t.status==="completed"?"checked":""}/>

      <button type="button"
              class="task-emoji task-emoji-edit"
              data-emoji-task="${t.id}"
              title="Cambiar emoticono">${esc(t.emoji||"📌")}</button>

      <div class="task-card-content">
        <div class="task-title">${esc(t.title)}</div>
        ${t.description?`<div class="task-desc">${esc(t.description)}</div>`:""}

        <div class="task-meta task-meta-with-menu">
          <span>📅 ${t.dueDate?shortDate(parseDate(t.dueDate)):"Sin vencimiento"}</span>
          <span>🕒 ${formatTimeMeta(t)}</span>

          <button type="button"
                  class="task-card-menu-btn"
                  data-task-menu
                  aria-label="Acciones de la tarea"
                  title="Acciones">
            <span></span><span></span><span></span>
          </button>

          ${recurrenceButtonHTML(t,false,occurrenceDate)}
          ${taskMovementIndicatorHTML(t)}

          ${t.status==="pending"?`<span class="board-pill stage-${boardStageOf(t)}">▦ ${boardStageLabel(boardStageOf(t))}</span>`:""}
          ${t.status==="completed"?`<span class="state-chip completed">✓ Completada</span>`:""}
          ${t.status==="missed"?`<span class="state-chip missed">✕ No completada</span>`:""}

          <button type="button"
                  class="comment-icon-btn ${occurrenceComment?"has-comment":"no-comment"}"
                  data-comment-task="${t.id}"
                  data-comment-date="${occurrenceKey}"
                  title="${occurrenceComment?"Ver / editar comentario":"Agregar comentario"}">${occurrenceComment?"💬":"💬＋"}</button>
        </div>

        <div class="task-card-popup hidden" data-task-menu-panel>
          <button type="button" data-edit="${t.id}" data-edit-date="${occurrenceKey}">✏ Editar</button>
          ${t.status==="missed"?`<button type="button" data-reopen="${t.id}">↻ Reabrir</button>`:""}
          <button type="button" class="task-delete-btn" data-delete="${t.id}">🗑 Eliminar</button>
        </div>

        ${taskMoveControlHTML(t,occurrenceKey)}

        <div class="card-actions task-card-actions task-card-actions-compact">
          <button type="button"
                  class="importance-chip ${t.highImportance?"active":""}"
                  data-important="${t.id}">
            ${t.highImportance?"★ Alta importancia":"☆ Alta importancia"}
          </button>
        </div>
      </div>
    </div>
  </article>`;
}

function completeTaskOutOfTime(t,occurrenceKey){
  if(!t) return;
  const key=occurrenceKey || t.dueDate || t.startDate || dateKey(selectedDate||new Date());
  const map=ensureTaskCommentMap(t);
  const note=`Tarea completada fuera de tiempo el día ${shortDate(new Date())}.`;
  map[key]=map[key] ? `${map[key]} | ${note}` : note;
  t.status="completed";
  t.boardStage="completed";
  t.completedAt=new Date().toISOString();
  t.missedAt=null;
}

function reopenTask(t){
  const originalMissedDate=t.dueDate || t.startDate || dateKey(new Date());
  const missedDateLabel=shortDate(parseDate(originalMissedDate));
  const reopenNote=`Tarea reabierta por no ser completada el día ${missedDateLabel}.`;
  const commentMap=ensureTaskCommentMap(t);
  commentMap[originalMissedDate]=commentMap[originalMissedDate]
    ? `${commentMap[originalMissedDate]} | ${reopenNote}`
    : reopenNote;

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


function openCommentDialog(taskId,occurrenceKey){
  const task=tasks.find(t=>t.id===taskId);
  if(!task) return;

  const key=occurrenceKey || occurrenceKeyForTask(task,selectedDate);
  const comment=taskCommentForOccurrence(task,key);

  $("#commentTaskId").value=task.id;
  $("#commentOccurrenceKey").value=key;
  $("#commentDialogTitle").textContent=task.title||"Comentario";
  $("#commentDialogDate").textContent=`Ocurrencia: ${shortDate(parseDate(key))}`;
  $("#commentDialogInput").value=comment;

  $("#commentDialog").showModal();
}

function bindTaskActions(root=document){
  root.querySelectorAll("[data-task-menu]").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();

      const card=btn.closest(".task-card");
      const panel=card?.querySelector("[data-task-menu-panel]");
      if(!panel) return;

      document.querySelectorAll("[data-task-menu-panel]").forEach(other=>{
        if(other!==panel) other.classList.add("hidden");
      });

      panel.classList.toggle("hidden");
    };
  });

  root.querySelectorAll("[data-task-move-mode]").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();

      const wrapper=btn.closest("[data-task-move-control]");
      const card=btn.closest(".task-card");
      const taskId=card?.dataset.taskCardId;
      const task=tasks.find(t=>t.id===taskId);
      if(!wrapper || !task) return;

      const current=btn.dataset.taskMoveMode||"stage";
      populateTaskMoveSelect(wrapper,task,current==="stage"?"book":"stage");
    };
  });

  root.querySelectorAll("[data-task-move-select]").forEach(select=>{
    select.onchange=e=>{
      e.preventDefault();
      e.stopPropagation();

      const wrapper=select.closest("[data-task-move-control]");
      const button=wrapper?.querySelector("[data-task-move-mode]");
      const card=select.closest(".task-card");
      const taskId=card?.dataset.taskCardId;
      const task=tasks.find(t=>t.id===taskId);

      if(!task || !select.value || !button) return;

      if(button.dataset.taskMoveMode==="book"){
        applyTaskBookMove(task,select.value);
      }else{
        applyTaskStageMove(task,select.value,select.dataset.occurrenceDate);
      }
    };
  });

  root.querySelectorAll("[data-recurrence-task]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openRecurrenceDialog(btn.dataset.recurrenceTask,btn.dataset.recurrenceDate);
  });

  root.querySelectorAll("[data-task-money]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openTaskMovementDetail(btn.dataset.taskMoney);
  });

  root.querySelectorAll("[data-comment-task]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openCommentDialog(btn.dataset.commentTask,btn.dataset.commentDate);
  });

  root.querySelectorAll("[data-important]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    const task=tasks.find(t=>t.id===btn.dataset.important);
    if(!task) return;
    task.highImportance=!task.highImportance;
    saveTasks();
    toast(task.highImportance?"Alta importancia activada.":"Alta importancia desactivada.");
  });

  root.querySelectorAll("[data-emoji-task]").forEach(btn=>btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    openEmojiOnlyEditor(btn.dataset.emojiTask);
  });

  root.querySelectorAll("[data-complete]").forEach(ch=>ch.onchange=()=>{
    const t=tasks.find(x=>x.id===ch.dataset.complete);
    if(!t) return;

    const previous=t.status;

    if(ch.checked){
      if(previous==="missed"){
        completeTaskOutOfTime(t,ch.dataset.completeDate);
      }else{
        t.status="completed";
        t.boardStage="completed";
        t.completedAt=new Date().toISOString();
      }
    }else{
      t.status="pending";
      t.boardStage="pending";
      t.completedAt=null;
    }

    saveTasks();

    if(previous==="missed" && ch.checked){
      toast("Tarea completada fuera de tiempo. Se agregó el comentario.");
    }
  });

  root.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      openTask(tasks.find(t=>t.id===btn.dataset.edit),btn.dataset.editDate);
    };
  });

  root.querySelectorAll("[data-reopen]").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const t=tasks.find(x=>x.id===btn.dataset.reopen);
      if(!t) return;
      reopenTask(t);
      saveTasks();
      toast(`Tarea reabierta para ${shortDate(parseDate(t.startDate))}.`);
    };
  });

  root.querySelectorAll("[data-delete]").forEach(btn=>{
    btn.onclick=async e=>{
      e.preventDefault();
      e.stopPropagation();

      const t=tasks.find(x=>x.id===btn.dataset.delete);
      if(!t) return;

      if(await comicConfirm(`¿Eliminar "${t.title}"? Se moverá a la papelera y podrás restaurarla durante 24 horas.`,{
        title:"Eliminar tarea",
        okText:"🗑 Eliminar"
      })){
        moveToTrash(t.id);
        toast("Tarea movida a la papelera.");
      }
    };
  });
}
function renderCalendar(){
  $("#calendarTitle").textContent=monthName(calendarCursor);
  const year=calendarCursor.getFullYear();
  const month=calendarCursor.getMonth();
  const first=new Date(year,month,1);
  const leading=(first.getDay()+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cellCount=Math.ceil((leading+daysInMonth)/7)*7;
  const start=addDays(first,-leading);

  $("#calendarGrid").innerHTML=[...Array(cellCount)].map((_,i)=>{
    const d=addDays(start,i), key=dateKey(d), inMonth=d.getMonth()===month;
    const dayTasks=expandedTasksForDate(d).sort(compareTasksByDate);
    const taskIndicator=taskCountIndicatorHTML(dayTasks,"week");
    const movementMark=movementMarkerForDateKey(key);

    return `<button class="calendar-day ${inMonth?"":"muted"} ${key===dateKey(selectedDate)?"selected":""} ${key===dateKey(new Date())?"today":""}" data-caldate="${key}">
      <span class="calendar-day-number">${d.getDate()}</span>
      <span class="day-bottom-indicators calendar-task-indicator">
        ${taskIndicator}
        ${movementMark?`<span class="calendar-expense-mark">${movementMark}</span>`:""}
      </span>
    </button>`;
  }).join("");

  const renderSelectedCalendarDay=()=>{
    const list=expandedTasksForDate(selectedDate).sort(compareTasksByDate);
    const pending=list.filter(t=>t.status==="pending");
    const completed=list.filter(t=>t.status==="completed");
    const missed=list.filter(t=>t.status==="missed");

    $("#calendarDayHeading").textContent=`Pendientes · ${shortDate(selectedDate)}`;

    $("#calendarPendingList").innerHTML=compactTaskListHTML(pending,selectedDate,"calendar-pending");
    $("#calendarCompletedList").innerHTML=compactTaskListHTML(completed,selectedDate,"calendar-completed");
    $("#calendarMissedList").innerHTML=compactTaskListHTML(missed,selectedDate,"calendar-missed");

    bindTaskActions($("#calendarView"));
    bindCompactTaskExpansion($("#calendarView"));
  };

  $$("[data-caldate]").forEach(b=>b.onclick=()=>{
    selectedDate=parseDate(b.dataset.caldate);
    weekCursor=startOfWeek(selectedDate);

    renderWeekStrip();
    renderDay();
    renderWeek();
    renderCalendar();
    renderExpenseSummary();
    renderGlobalStatusStrip();
  });

  renderSelectedCalendarDay();
}
function renderWeek(){
  const end=addDays(weekCursor,6);
  $("#weekTitle").textContent=`${shortDate(weekCursor)} – ${shortDate(end)}`;

  const days=[...Array(7)].map((_,i)=>{
    const d=addDays(weekCursor,i);
    const list=expandedTasksForDate(d).sort(compareTasksByDate);
    return {d,list};
  });

  const daysWithTasks=days.filter(x=>x.list.length>0);

  $("#weekBoard").innerHTML=daysWithTasks.length ? daysWithTasks.map(({d,list})=>`
    <section class="week-column">
      <h3>${d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"short"})}</h3>
      ${compactTaskListHTML(list,d,"week-main")}
    </section>
  `).join("") : `<div class="empty week-empty">No hay tareas registradas en esta semana.</div>`;

  const occurrences=days.flatMap(({d,list})=>list.map(t=>({t,d})));
  const pending=occurrences.filter(x=>x.t.status==="pending");
  const completed=occurrences.filter(x=>x.t.status==="completed");
  const missed=occurrences.filter(x=>x.t.status==="missed");
  $("#weekCompletedList").innerHTML=weekOccurrenceListHTML(completed);
  $("#weekMissedList").innerHTML=weekOccurrenceListHTML(missed);

  bindTaskActions($("#weekView"));
  bindCompactTaskExpansion($("#weekView"));
}
function renderBoard(){
  const groups={pending:[],in_progress:[],waiting:[],completed:[]};

  activeTasks()
    .filter(t=>!(t.status==="pending" && recurrenceSegmentEndedBefore(t,selectedDate)))
    .forEach(t=>{
      const stage=boardStageOf(t);
      if(stage==="completed" || t.status==="completed") groups.completed.push(t);
      else if(stage==="in_progress") groups.in_progress.push(t);
      else if(stage==="waiting") groups.waiting.push(t);
      else groups.pending.push(t);
    });

  Object.values(groups).forEach(list=>list.sort(compareTasksByDate));

  const renderGroup=(list,scope)=>
    list.length
      ? compactTaskListHTML(list,selectedDate,scope)
      : `<div class="empty">Sin actividades</div>`;

  $("#boardPending").innerHTML=renderGroup(groups.pending,"board-pending");
  $("#boardProgress").innerHTML=renderGroup(groups.in_progress,"board-progress");
  $("#boardWaiting").innerHTML=renderGroup(groups.waiting,"board-waiting");
  $("#boardCompleted").innerHTML=renderGroup(groups.completed,"board-completed");

  $("#boardCountPending").textContent=groups.pending.length;
  $("#boardCountProgress").textContent=groups.in_progress.length;
  $("#boardCountWaiting").textContent=groups.waiting.length;
  $("#boardCountCompleted").textContent=groups.completed.length;

  bindTaskActions($("#boardView"));
  bindCompactTaskExpansion($("#boardView"));
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
  renderGlobalStatusStrip();
}

function updateTaskFinanceTypeUI(){
  const type=$("#taskFinanceType").value==="income" ? "income" : "expense";
  const income=type==="income";
  $("#taskFinanceTypeBtn").textContent=income ? "Ingreso" : "Gasto";
  $("#taskFinanceTypeBtn").classList.toggle("income",income);
  $("#taskFinanceTypeBtn").classList.toggle("expense",!income);
  $("#taskFinanceTitleLabel").textContent=income ? "¿Cómo lo gané?" : "¿En qué gasté?";
  $("#taskFinanceTitle").placeholder=income
    ? "Ej. Venta, pago, devolución..."
    : "Ej. Material, gasolina, comida...";
}

function readTaskFinanceForm(){
  const amount=parseMoneyInput($("#taskFinanceAmountDisplay").value);
  const title=$("#taskFinanceTitle").value.trim();

  if(amount>99999999.99){
    throw new Error("El movimiento no puede superar $99,999,999.99.");
  }
  if(amount>0 && !title){
    throw new Error($("#taskFinanceType").value==="income" ? "Escribe cómo ganaste el ingreso." : "Escribe en qué gastaste.");
  }

  if(amount<=0){
    return null;
  }

  return {
    type:$("#taskFinanceType").value==="income" ? "income" : "expense",
    title,
    description:$("#taskFinanceDescription").value.trim(),
    amount:Number(amount.toFixed(2)),
    currency:$("#taskFinanceCurrencyBtn").textContent
  };
}

function syncTaskMovement(task,movementData){
  const existing=findTaskMovement(task.id);

  if(!movementData){
    if(existing){
      expenses=expenses.filter(e=>e.id!==existing.id);
    }
    return;
  }

  const data={
    ...movementData,
    taskId:task.id,
    bookId:task.bookId,
    date:task.startDate,
    cycleDay:getBookExpenseCycleDayForDate(
      books.find(b=>b.id===task.bookId)||activeBook(),
      parseDate(task.startDate)
    )
  };

  if(existing){
    Object.assign(existing,data,{updatedAt:new Date().toISOString()});
  }else{
    expenses.push({
      id:uid(),
      ...data,
      createdAt:new Date().toISOString()
    });
  }
}

function openTaskMovementDetail(movementId){
  const movement=expenses.find(e=>e.id===movementId && e.taskId);
  if(!movement) return;

  const type=movementType(movement);
  const signed=movementSignedAmount(movement);
  $("#taskMovementDialogTitle").textContent=type==="income" ? "Detalle del ingreso" : "Detalle del gasto";
  $("#taskMovementDetailBody").innerHTML=`
    <div class="task-movement-detail-card ${type}">
      <div class="task-movement-detail-symbol">${movementSymbol(movement)}</div>
      <div>
        <small>${movementTypeLabel(movement)}</small>
        <strong>${esc(movement.title)}</strong>
      </div>
      <div class="task-movement-detail-amount ${type}">${signedMoney(signed)} ${esc(movement.currency||"MN")}</div>
    </div>
    ${movement.description?`<div class="task-movement-detail-description">${esc(movement.description)}</div>`:""}
    <div class="task-movement-detail-date">📅 ${shortDate(parseDate(movement.date))}</div>
  `;
  $("#taskMovementDialog").showModal();
}

function openTask(t=null,occurrenceKey=""){
  $("#taskForm").reset();
  $("#taskId").value=t?.id||"";
  const effectiveOccurrence=t ? (occurrenceKey||occurrenceEditKey(t,selectedDate)) : "";
  $("#editOccurrenceDate").value=effectiveOccurrence;
  $("#taskDialogTitle").textContent=t?"Editar tarea":"Agregar tarea";
  $("#deleteTaskBtn").classList.toggle("hidden",!t);
  const defaultStartDate=dateKey(selectedDate||new Date());
  $("#title").value=t?.title||"";
  $("#description").value=t?.description||"";
  $("#taskEmoji").value=t?.emoji||"📌";
  $("#taskEmojiPreview").textContent=t?.emoji||"📌";
  const editingLaterOccurrence=!!(t && isLaterSeriesOccurrence(t,effectiveOccurrence));
  const formStartDate=editingLaterOccurrence ? effectiveOccurrence : (t?.startDate||defaultStartDate);
  $("#startDate").value=formStartDate;
  $("#startDate").min=editingLaterOccurrence ? effectiveOccurrence : "";

  if(t?.dueDate && editingLaterOccurrence){
    const originalStart=parseDate(t.startDate);
    const originalDue=parseDate(t.dueDate);
    const durationDays=Math.max(0,Math.round((startOfDay(originalDue)-startOfDay(originalStart))/86400000));
    $("#dueDate").value=dateKey(addDays(parseDate(formStartDate),durationDays));
  }else{
    $("#dueDate").value=t?.dueDate||"";
  }
  $("#allDay").checked=t?!!t.allDay:true;
  $("#startTime").value=t?.startTime||"09:00";
  $("#dueTime").value=t?.dueTime||"10:00";
  refreshTimeTrigger("startTime");
  refreshTimeTrigger("dueTime");
  const recurrenceSelect=$("#recurrence");
  const recurrenceCopyOption=$("#recurrenceCopyOption");
  recurrenceCopyOption.hidden=!t;
  recurrenceCopyOption.disabled=!t;
  recurrenceSelect.value=t?.recurrence||"none";
  recurrenceSelect.dataset.lastNonCopy=recurrenceSelect.value;
  $("#status").value=t?.status||"pending";
  $("#boardStage").value=t?boardStageOf(t):"pending";
  $("#highImportance").checked=!!t?.highImportance;
  const taskMovement=(t && !editingLaterOccurrence)?findTaskMovement(t.id):null;
  $("#taskFinanceDetails").open=!!taskMovement;
  $("#taskFinanceType").value=taskMovement?movementType(taskMovement):"expense";
  $("#taskFinanceTitle").value=taskMovement?.title||"";
  $("#taskFinanceDescription").value=taskMovement?.description||"";
  const taskFinanceAmount=taskMovement?Number(taskMovement.amount||0).toFixed(2):"";
  $("#taskFinanceAmount").value=taskFinanceAmount;
  $("#taskFinanceAmountDisplay").value=taskFinanceAmount?formatMoneyInput(taskFinanceAmount):"";
  $("#taskFinanceCurrencyBtn").textContent=taskMovement?.currency||"MN";
  updateTaskFinanceTypeUI();
  syncDueDependentFields();
  toggleTimeFields();
  $("#taskDialog").showModal();
}

function validateTaskForm(){
  const missing=[];
  let firstField=null;

  const title=$("#title").value.trim();
  const start=$("#startDate").value;
  const allDay=$("#allDay").checked;
  const startTime=$("#startTime").value;
  const due=$("#dueDate").value;
  const dueTime=$("#dueTime").value;

  if(!title){
    missing.push("Título");
    firstField=firstField||$("#title");
  }

  if(!start){
    missing.push("Fecha de inicio");
    firstField=firstField||$("#startDate");
  }

  if(!allDay && !startTime){
    missing.push("Hora de inicio");
    firstField=firstField||$("#startTime");
  }

  if(due && !allDay && !dueTime){
    missing.push("Hora de vencimiento");
    firstField=firstField||$("#dueTime");
  }

  const financeTitle=$("#taskFinanceTitle").value.trim();
  const financeDescription=$("#taskFinanceDescription").value.trim();
  const financeAmount=parseMoneyInput($("#taskFinanceAmountDisplay").value);
  const financeStarted=!!financeTitle || !!financeDescription || financeAmount>0;

  if(financeStarted){
    if(!financeTitle){
      missing.push($("#taskFinanceType").value==="income" ? "Cómo lo gané" : "En qué gasté");
      firstField=firstField||$("#taskFinanceTitle");
    }

    if(financeAmount<=0){
      missing.push($("#taskFinanceType").value==="income" ? "Monto del ingreso" : "Monto del gasto");
      firstField=firstField||$("#taskFinanceAmountDisplay");
    }
  }

  if(missing.length){
    toast(`Falta llenar: ${missing.join(", ")}.`);
    if(firstField){
      setTimeout(()=>{
        try{
          firstField.focus({preventScroll:true});
          firstField.scrollIntoView({behavior:"smooth",block:"center"});
        }catch{}
      },80);
    }
    return false;
  }

  return true;
}

function readForm(){
  const start=$("#startDate").value;
  let due=$("#dueDate").value;
  if(due && start && due<start){
    due=start;
    $("#dueDate").value=start;
  }

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
    highImportance:$("#highImportance").checked
  };
}
function toggleTimeFields(){ $("#timeFields").classList.toggle("hidden",$("#allDay").checked); }

let timePickerTargetId="";

function time12Label(value){
  if(!value) return "Seleccionar";
  const [hh,mm]=value.split(":").map(Number);
  const period=hh>=12?"P.M.":"A.M.";
  const hour12=hh%12||12;
  return `${hour12}:${pad(mm)} ${period}`;
}

function refreshTimeTrigger(inputId){
  const input=$("#"+inputId);
  const display=$("#"+inputId+"Display");
  if(input && display) display.textContent=time12Label(input.value);
}

function updateTimePickerPreview(){
  const hour=Number($("#timePickerHour").value||12);
  const minute=Number($("#timePickerMinute").value||0);
  const period=$("#timePickerAM").classList.contains("active")?"A.M.":"P.M.";
  $("#timePickerPreview").textContent=`${hour}:${pad(minute)} ${period}`;
}

function setTimePickerPeriod(period){
  const isAM=period==="AM";
  $("#timePickerAM").classList.toggle("active",isAM);
  $("#timePickerPM").classList.toggle("active",!isAM);
  updateTimePickerPreview();
}

function openTimePicker(targetId){
  const input=$("#"+targetId);
  if(!input) return;

  timePickerTargetId=targetId;
  $("#timePickerTitle").textContent=targetId==="startTime"?"Hora de inicio":"Hora de vencimiento";

  const current=input.value || (targetId==="startTime"?"09:00":"10:00");
  let [hour24,minute]=current.split(":").map(Number);
  if(!Number.isFinite(hour24)) hour24=9;
  if(!Number.isFinite(minute)) minute=0;

  const period=hour24>=12?"PM":"AM";
  const hour12=hour24%12||12;

  $("#timePickerHour").value=String(hour12);
  $("#timePickerMinute").value=String(minute);
  setTimePickerPeriod(period);

  $("#timePickerDialog").showModal();
}

function applyTimePicker(){
  if(!timePickerTargetId) return;

  let hour=Number($("#timePickerHour").value||12);
  const minute=Number($("#timePickerMinute").value||0);
  const isPM=$("#timePickerPM").classList.contains("active");

  if(isPM && hour<12) hour+=12;
  if(!isPM && hour===12) hour=0;

  const value=`${pad(hour)}:${pad(minute)}`;
  const input=$("#"+timePickerTargetId);
  if(input) input.value=value;
  refreshTimeTrigger(timePickerTargetId);

  $("#timePickerDialog").close();
}

function clearTimePicker(){
  if(!timePickerTargetId) return;
  const input=$("#"+timePickerTargetId);
  if(input) input.value="";
  refreshTimeTrigger(timePickerTargetId);
  $("#timePickerDialog").close();
}






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
      <article class="book-select-card ${selected?"selected":""}" style="--book-accent:${book.color||"transparent"}">
        <label class="book-check-wrap" title="${selected?"Quitar selección":"Seleccionar libro"}">
          <input type="checkbox" data-book-select="${book.id}" ${selected?"checked":""}>
          <span class="book-custom-check">✓</span>
        </label>

        <button type="button" class="book-name-btn" data-book-edit="${book.id}" title="Editar nombre, icono o color">
          ${book.icon?`<span class="book-card-icon" style="--book-accent:${book.color||"transparent"}">${book.icon}</span>`:""}
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
    $("#bookIconInput").value=book.icon||"";
    $("#bookColorInput").value=book.color||"";
    $("#bookFormLabel").firstChild.textContent="Editar libro ";
    $("#addBookBtn").textContent="Guardar";
    $("#addBookBtn").classList.remove("hidden");
    $("#deleteBookBtn").classList.remove("hidden");
    setBookFormOpen(true);
    if($("#bookAppearanceDetails")) $("#bookAppearanceDetails").open=false;
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
  const icon=$("#bookIconInput").value||"";
  const color=$("#bookColorInput").value||"";

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
    $("#bookIconInput").value="";
    $("#bookColorInput").value="";
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
    expenseCycleHistory:[{from:dateKey(new Date()),day:1}],
    createdAt:new Date().toISOString()
  });

  localStorage.setItem(BOOKS_KEY,JSON.stringify(books));
  $("#bookNameInput").value="";
  $("#bookNameCounter").textContent="0/20";
  $("#bookIconInput").value="";
  $("#bookColorInput").value="";
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
function comicConfirm(message,{title="Confirmar",okText="Sí, continuar"}={}){
  return new Promise(resolve=>{
    const dialog=$("#comicConfirmDialog");
    const titleEl=$("#comicConfirmTitle");
    const messageEl=$("#comicConfirmMessage");
    const ok=$("#comicConfirmOk");
    const cancel=$("#comicConfirmCancel");

    if(!dialog || !titleEl || !messageEl || !ok || !cancel){
      resolve(window.confirm(message));
      return;
    }

    titleEl.textContent=title;
    messageEl.textContent=message;
    ok.textContent=okText;

    let finished=false;

    const cleanup=()=>{
      ok.removeEventListener("click",onOk);
      cancel.removeEventListener("click",onCancel);
      dialog.removeEventListener("cancel",onCancel);
      dialog.removeEventListener("click",onBackdrop);
      dialog.removeEventListener("close",onClose);
    };

    const finish=value=>{
      if(finished) return;
      finished=true;
      cleanup();
      if(dialog.open) dialog.close();
      resolve(value);
    };

    const onOk=()=>finish(true);
    const onCancel=e=>{
      if(e) e.preventDefault();
      finish(false);
    };
    const onBackdrop=e=>{
      if(e.target===dialog) finish(false);
    };
    const onClose=()=>{
      if(!finished){
        finished=true;
        cleanup();
        resolve(false);
      }
    };

    ok.addEventListener("click",onOk);
    cancel.addEventListener("click",onCancel);
    dialog.addEventListener("cancel",onCancel);
    dialog.addEventListener("click",onBackdrop);
    dialog.addEventListener("close",onClose);

    if(dialog.open) dialog.close();
    dialog.showModal();
  });
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
    if(!Array.isArray(arr)) throw 0; tasks=arr; trash=Array.isArray(data.trash)?data.trash:[]; ensureBookMigration(); migrateTaskCommentsV1155(); migrateMovementsV116(); saveTrash(); saveTasks(); toast("Respaldo importado.");
  }catch{ toast("Archivo de respaldo no válido."); }
}
function parseCsvRows(text){
  const rows=[];
  let row=[],cell="",quoted=false;

  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"' && text[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"'){quoted=false;}
      else cell+=ch;
    }else{
      if(ch==='"') quoted=true;
      else if(ch===','){row.push(cell);cell="";}
      else if(ch==='\\n'){
        row.push(cell.replace(/\\r$/,""));
        rows.push(row);
        row=[];cell="";
      }else cell+=ch;
    }
  }
  if(cell.length || row.length){row.push(cell.replace(/\\r$/,""));rows.push(row);}
  return rows;
}

function parseImportedDate(value){
  const v=String(value||"").trim();
  if(/^\\d{4}-\\d{2}-\\d{2}$/.test(v)) return v;
  const m=v.match(/^(\\d{1,2})[.\\/-](\\d{1,2})[.\\/-](\\d{4})$/);
  if(!m) return "";
  return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
}

async function importExpensesData(file){
  try{
    const raw=await file.text();
    let imported=[];

    if(file.name.toLowerCase().endsWith(".json")){
      const data=JSON.parse(raw);
      const arr=Array.isArray(data)?data:data.expenses;
      if(!Array.isArray(arr)) throw new Error("json");
      imported=arr.map(e=>({
        date:parseImportedDate(e.date),
        type:(String(e.type||e.tipo||"").toLowerCase().includes("ingreso") || e.type==="income") ? "income" : "expense",
        title:String(e.title||e.name||e.concepto||"Movimiento").trim(),
        description:String(e.description||"").trim(),
        amount:Math.abs(Number(e.amount||0)),
        currency:String(e.currency||"MN").toUpperCase()==="DLS"?"DLS":"MN"
      }));
    }else if(file.name.toLowerCase().endsWith(".csv")){
      const rows=parseCsvRows(raw.replace(/^\\ufeff/,""));
      if(rows.length<2) throw new Error("csv");
      const header=rows[0].map(x=>x.trim().toLowerCase());
      const idx=(...names)=>header.findIndex(h=>names.includes(h));
      const iDate=idx("fecha");
      const iType=idx("tipo");
      const iTitle=idx("en que gaste","en qué gasté","titulo","título","concepto");
      const iDesc=idx("descripcion","descripción");
      const iAmount=idx("monto","importe");
      const iCurrency=idx("moneda");
      if(iDate<0 || iTitle<0 || iAmount<0) throw new Error("headers");

      imported=rows.slice(1).filter(r=>r.some(Boolean)).map(r=>({
        date:parseImportedDate(r[iDate]),
        title:String(r[iTitle]||"Gasto").trim(),
        description:iDesc>=0?String(r[iDesc]||"").trim():"",
        amount:Number(String(r[iAmount]||"0").replace(/[$,\\s]/g,"")),
        currency:iCurrency>=0 && String(r[iCurrency]||"MN").trim().toUpperCase()==="DLS"?"DLS":"MN"
      }));
    }else{
      imported=raw.split(/\\r?\\n/)
        .filter(line=>line.includes("|"))
        .map(line=>{
          const parts=line.split("|").map(x=>x.trim());
          const isNewFormat=parts.length>=6 && /gasto|ingreso/i.test(parts[1]||"");
          const amountRaw=isNewFormat?parts[4]:parts[3];
          return {
            date:parseImportedDate(parts[0]),
            type:isNewFormat && /ingreso/i.test(parts[1]) ? "income" : "expense",
            title:(isNewFormat?parts[2]:parts[1])||"Movimiento",
            description:(isNewFormat?parts[3]:parts[2])||"",
            amount:Math.abs(Number(String(amountRaw||"0").replace(/[^0-9.-]/g,""))),
            currency:String((isNewFormat?parts[5]:parts[4])||"MN").toUpperCase().includes("DLS")?"DLS":"MN"
          };
        });
    }

    imported=imported.filter(e=>
      e.date &&
      e.title &&
      Number.isFinite(e.amount) &&
      e.amount>0 &&
      e.amount<=99999999.99
    );

    if(!imported.length) throw new Error("empty");

    imported.forEach(e=>{
      expenses.push({
        id:uid(),
        bookId:activeBookId,
        cycleDay:getBookExpenseCycleDayForDate(activeBook(),parseDate(e.date)),
        ...e,
        createdAt:new Date().toISOString(),
        importedAt:new Date().toISOString()
      });
    });

    saveExpenses();
    renderAll();
    toast(`${imported.length} ${imported.length===1?"movimiento importado":"movimientos importados"} al libro activo.`);
  }catch{
    toast("Archivo de movimientos no válido.");
  }
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
  let d=parseDate($("#expenseDate").value || dateKey(selectedDate));
  if(type==="-day") d=addDays(d,-1);
  if(type==="+day") d=addDays(d,1);

  if(isFutureDate(d)){
    toast("No puedes registrar movimientos en una fecha futura.");
    d=startOfDay(new Date());
  }

  $("#expenseDate").value=dateKey(d);
  $("#expenseDateLabel").textContent=dotDate(d);
}

function updateExpenseTypeUI(){
  const type=$("#expenseType").value==="income" ? "income" : "expense";
  const income=type==="income";

  $("#expenseTypeBtn").textContent=income ? "Ingreso" : "Gasto";
  $("#expenseTypeBtn").classList.toggle("income",income);
  $("#expenseTypeBtn").classList.toggle("expense",!income);
  $("#expenseTitleLabel").textContent=income ? "¿Cómo lo gané?" : "¿En qué gasté?";
  $("#expenseTitle").placeholder=income
    ? "Ej. Venta, pago, devolución..."
    : "Ej. Comida, gasolina, farmacia...";

  const editing=!!$("#expenseId").value;
  $("#expenseDialogTitle").textContent=editing
    ? (income ? "Editar ingreso" : "Editar gasto")
    : (income ? "Agregar ingreso" : "Agregar gasto");
  $("#saveExpenseBtn").textContent=income ? "Guardar ingreso" : "Guardar gasto";
}

function openExpenseDialog(expense=null){
  $("#expenseForm").reset();
  $("#expenseId").value=expense?.id||"";

  const d=expense?.date ? parseDate(expense.date) : clampExpenseDateToToday(selectedDate);
  $("#expenseDate").max=dateKey(new Date());
  $("#expenseDate").value=dateKey(d);
  $("#expenseDateLabel").textContent=dotDate(d);
  $("#expenseTitle").value=expense?.title||"";
  $("#expenseDescription").value=expense?.description||"";
  const amountValue=expense ? Number(expense.amount||0).toFixed(2) : "";
  $("#expenseAmount").value=amountValue;
  $("#expenseAmountDisplay").value=amountValue ? formatMoneyInput(amountValue) : "";
  $("#expenseCurrencyBtn").textContent=expense?.currency||"MN";
  $("#expenseType").value=expense?movementType(expense):"expense";
  updateExpenseTypeUI();

  $("#expenseDialog").showModal();
}
function openViewExpensesDialog(){
  $("#viewExpenseDate").value=dateKey(selectedDate);
  $("#viewExpenseDateLabel").textContent=shortDate(selectedDate);
  renderViewExpenses();
  $("#viewExpensesDialog").showModal();
}

function shiftViewExpenseDate(type){
  let d=parseDate($("#viewExpenseDate").value || dateKey(selectedDate));
  if(type==="-day") d=addDays(d,-1);
  if(type==="+day") d=addDays(d,1);

  $("#viewExpenseDate").value=dateKey(d);
  $("#viewExpenseDateLabel").textContent=shortDate(d);

  selectedDate=startOfDay(d);
  calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
  weekCursor=startOfWeek(selectedDate);
  renderViewExpenses();
  renderAll();
}

function expensePeriodKey(period){
  return `${dateKey(period.start)}__${dateKey(period.end)}`;
}

function getExpenseLogPeriods(){
  const current=currentExpensePeriod();
  const currentKey=expensePeriodKey(current);
  const map=new Map();

  activeExpenses().forEach(e=>{
    const d=parseDate(e.date);
    const period=expenseCycleRange(d);
    const key=expensePeriodKey(period);
    if(key===currentKey) return;

    if(!map.has(key)){
      map.set(key,{
        key,
        start:period.start,
        end:period.end,
        token:periodFileToken(period),
        count:0,
        totalMN:0,
        totalDLS:0
      });
    }

    const p=map.get(key);
    p.count++;
    if(e.currency==="DLS") p.totalDLS+=movementSignedAmount(e);
    else p.totalMN+=movementSignedAmount(e);
  });

  return [...map.values()].sort((a,b)=>a.start-b.start);
}

function renderExpenseLog(){
  const box=$("#expenseLogPeriods");
  if(!box) return;

  const periods=getExpenseLogPeriods();
  box.innerHTML=periods.length ? periods.map(p=>`
    <label class="expense-log-period-card">
      <input type="checkbox" data-expense-period="${p.key}">
      <span class="expense-log-check">✓</span>
      <span class="expense-log-copy">
        <strong>${p.token}</strong>
        <small>${dotDate(p.start)}–${dotDate(p.end)} · ${p.count} ${p.count===1?"movimiento":"movimientos"}</small>
        <small>${p.totalMN?`${signedMoney(p.totalMN)} MN`:""}${p.totalMN&&p.totalDLS?" · ":""}${p.totalDLS?`${signedMoney(p.totalDLS)} DLS`:""}</small>
      </span>
    </label>
  `).join("") : `<div class="empty">Todavía no hay periodos anteriores con movimientos.</div>`;
}

function openExpenseLog(){
  renderExpenseLog();
  $("#expenseLogDialog").showModal();
}

function exportSelectedExpensePeriods(){
  const selected=[...$$("[data-expense-period]:checked")].map(x=>x.dataset.expensePeriod);
  if(!selected.length){
    toast("Selecciona al menos un periodo.");
    return;
  }

  const periods=getExpenseLogPeriods()
    .filter(p=>selected.includes(p.key))
    .sort((a,b)=>a.start-b.start);

  const rows=[];
  periods.forEach(period=>{
    expensesInRange(period.start,period.end).forEach(e=>{
      rows.push({...e,_period:period.token});
    });
  });

  const csvRows=[["Periodo","Fecha","Tipo","Concepto","Descripcion","Monto","Moneda","Libro"]];
  const book=activeBook();
  rows.forEach(e=>csvRows.push([
    e._period,
    dotDate(parseDate(e.date)),
    movementTypeLabel(e),
    e.title,
    e.description||"",
    movementSignedAmount(e).toFixed(2),
    e.currency,
    book?.name||""
  ]));

  const csv="\\ufeff"+csvRows.map(r=>r.map(csvCell).join(",")).join("\\r\\n");
  const first=periods[0].token;
  const last=periods[periods.length-1].token;
  const name=periods.length===1 ? `gastos_${first}.csv` : `gastos_${first}-${last}.csv`;

  downloadText(name,csv,"text/csv;charset=utf-8");
  toast(`${periods.length} ${periods.length===1?"periodo exportado":"periodos exportados"}.`);
  $("#expenseLogDialog").close();
}


async function deleteExpenseById(expenseId){
  const index=expenses.findIndex(e=>e.id===expenseId);
  if(index<0){
    toast("No se encontró el movimiento seleccionado.");
    return false;
  }

  const expense=expenses[index];
  const ok=await comicConfirm(
    `¿Borrar "${expense.title}" por ${signedMoney(movementSignedAmount(expense))} ${expense.currency}?`,
    {title:"Borrar movimiento",okText:"🗑 Borrar"}
  );

  if(!ok) return false;

  expenses.splice(index,1);
  saveExpenses();
  renderViewExpenses();
  renderAll();
  toast("Movimiento borrado.");
  return true;
}

function moveExpenseToBook(expenseId,destinationBookId){
  const expense=expenses.find(e=>e.id===expenseId);
  const destination=books.find(book=>book.id===destinationBookId);
  if(!expense || !destination) return false;

  const origin=books.find(book=>book.id===expense.bookId);
  expense.bookId=destination.id;
  expense.updatedAt=new Date().toISOString();

  saveExpenses();
  renderViewExpenses();
  renderAll();

  toast(`Movimiento movido de ${origin?.name||"libro"} a ${destination.name}.`);
  return true;
}


function openExpenseDetailDialog(expenseId){
  const expense=expenses.find(e=>e.id===expenseId);
  if(!expense) return;

  const linkedTask=expense.taskId?tasks.find(t=>t.id===expense.taskId):null;
  const type=movementType(expense);

  $("#expenseDetailId").value=expense.id;
  $("#expenseDetailTitle").textContent=expense.title||"Movimiento";

  $("#expenseDetailBody").innerHTML=`
    <article class="expense-detail-card ${type}">
      <div class="expense-detail-head">
        <span class="movement-gold-symbol">${movementSymbol(expense)}</span>
        <div>
          <small class="movement-type-label ${type}">${movementTypeLabel(expense)}</small>
          <strong>${esc(expense.title)}</strong>
        </div>
        <span class="expense-detail-amount ${type}">${signedMoney(movementSignedAmount(expense))} ${esc(expense.currency||"MN")}</span>
      </div>

      <div class="expense-detail-date">
        <small>Fecha</small>
        <strong>📅 ${shortDate(parseDate(expense.date))}</strong>
      </div>

      <div class="expense-detail-description">
        <small>Descripción</small>
        <p>${expense.description?esc(expense.description):"Sin descripción."}</p>
      </div>

      <div class="expense-detail-book">
        <small>Libro</small>
        <strong>${esc(books.find(b=>b.id===expense.bookId)?.name||"Libro")}</strong>
      </div>

      ${linkedTask?`
        <div class="expense-detail-linked-task">
          <small>Tarea relacionada</small>
          <strong>✅ ${esc(linkedTask.title)}</strong>
        </div>`:""}
    </article>`;

  const select=$("#expenseDetailBookSelect");
  select.innerHTML=`<option value="">Selecciona libro</option>`+
    books
      .filter(book=>book.id!==expense.bookId)
      .map(book=>`<option value="${book.id}">${book.icon?book.icon+" ":""}${esc(book.name)}</option>`)
      .join("");
  select.classList.add("hidden");

  $("#expenseDetailDialog").showModal();
}

function renderViewExpenses(){
  if(!$("#viewExpensesList")) return;

  const key=$("#viewExpenseDate").value || dateKey(selectedDate);
  const d=parseDate(key);
  const list=activeExpenses()
    .filter(e=>e.date===key)
    .sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")));

  $("#viewExpenseDateLabel").textContent=shortDate(d);

  const dayTotals=expenseTotalsForDate(d);
  $("#viewExpenseDayTotal").textContent=totalsText("Balance del día",dayTotals);
  $("#viewExpenseDayTotal").classList.remove("balance-positive","balance-negative","balance-mixed","balance-neutral");
  $("#viewExpenseDayTotal").classList.add(balanceClassForTotals(dayTotals));

  $("#viewExpensesList").innerHTML=list.length ? list.map(e=>{
    const linkedTask=e.taskId?tasks.find(t=>t.id===e.taskId):null;
    const type=movementType(e);

    return `
      <article class="expense-card expense-card-menu-card expense-collapsible-card"
               data-expense-expand="${e.id}">
        <div class="expense-card-main expense-card-summary">
          <div class="movement-card-title">
            <span class="movement-gold-symbol">${movementSymbol(e)}</span>
            <span>
              <strong>${esc(e.title)}</strong>
              <small class="expense-card-date">📅 ${shortDate(parseDate(e.date))}</small>
            </span>
          </div>

          <div class="expense-card-right">
            <span class="expense-card-amount ${type}">${signedMoney(movementSignedAmount(e))} ${e.currency}</span>
            <button type="button"
                    class="expense-card-menu-btn"
                    data-expense-detail="${e.id}"
                    aria-label="Ver detalle y acciones"
                    title="Detalle y acciones">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>

        <div class="expense-expanded-content hidden" data-expense-expanded-content="${e.id}">
          ${e.description
            ? `<p class="expense-expanded-description">${esc(e.description)}</p>`
            : `<p class="expense-expanded-description muted-text">Sin descripción.</p>`}
          ${linkedTask
            ? `<small class="expense-linked-task">✅ Tarea: ${esc(linkedTask.title)}</small>`
            : ""}
        </div>
      </article>`;
  }).join("") : `<div class="empty">No hay gastos ni ingresos registrados en este día.</div>`;

  $$("[data-expense-expand]").forEach(card=>{
    card.onclick=e=>{
      if(e.target.closest("button,select,input,label")) return;
      const content=$(`[data-expense-expanded-content="${card.dataset.expenseExpand}"]`);
      if(content) content.classList.toggle("hidden");
    };
  });

  $$("[data-expense-detail]").forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      openExpenseDetailDialog(btn.dataset.expenseDetail);
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
function monthAbbrEs(d){
  return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][d.getMonth()];
}

function periodFileToken(period){
  const labelDate=period.end;
  return `${monthAbbrEs(labelDate)}${String(labelDate.getFullYear()).slice(-2)}`;
}

function expensesInRange(start,end){
  return activeExpenses()
    .filter(e=>{
      const d=parseDate(e.date);
      return d>=start && d<=end;
    })
    .sort((a,b)=>a.date.localeCompare(b.date));
}

function buildExpensesTxt(list,title){
  const book=activeBook();
  const rows=[
    `MOVIMIENTOS - ${book?.name||"Libro"}`,
    title,
    ""
  ];
  list.forEach(e=>{
    rows.push(`${dotDate(parseDate(e.date))} | ${movementTypeLabel(e)} | ${e.title} | ${e.description||""} | ${signedMoney(movementSignedAmount(e))} ${e.currency}`);
  });
  return rows.join("\n");
}

function buildExpensesCsv(list){
  const rows=[["Fecha","Tipo","Concepto","Descripcion","Monto","Moneda","Libro"]];
  const book=activeBook();
  list.forEach(e=>rows.push([
    dotDate(parseDate(e.date)),
    movementTypeLabel(e),
    e.title,
    e.description||"",
    movementSignedAmount(e).toFixed(2),
    e.currency,
    book?.name||""
  ]));
  return "\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
}

function currentExpensePeriod(){
  return expenseCycleRange(new Date());
}

function exportExpensesTxt(){
  const period=currentExpensePeriod();
  const list=expensesInRange(period.start,period.end);
  const token=periodFileToken(period);
  const title=`Periodo: ${dotDate(period.start)}–${dotDate(period.end)}`;
  downloadText(`gastos_${token}.txt`,buildExpensesTxt(list,title));
  markExport("txt");
  toast(`Movimientos del periodo ${token} exportados.`);
}
function csvCell(v){
  const s=String(v??"").replace(/"/g,'""');
  return `"${s}"`;
}
function exportExpensesCsv(){
  const period=currentExpensePeriod();
  const list=expensesInRange(period.start,period.end);
  const token=periodFileToken(period);
  downloadText(`gastos_${token}.csv`,buildExpensesCsv(list),"text/csv;charset=utf-8");
  markExport("csv");
  toast(`Movimientos del periodo ${token} exportados.`);
}

$("#taskForm").addEventListener("submit",e=>{
  e.preventDefault();

  if(!validateTaskForm()) return;

  try{
    const data=readForm();
    const movementData=readTaskFinanceForm();
    const id=$("#taskId").value;
    const editOccurrenceKey=$("#editOccurrenceDate").value;

    if(id && editOccurrenceKey && data.startDate<editOccurrenceKey){
      data.startDate=editOccurrenceKey;
      $("#startDate").value=editOccurrenceKey;
      if(data.dueDate && data.dueDate<data.startDate){
        data.dueDate=data.startDate;
        $("#dueDate").value=data.startDate;
      }
    }
    let savedTask;
    let splitApplied=false;

    if(id){
      const i=tasks.findIndex(t=>t.id===id);
      if(i<0) throw new Error("No se encontró la tarea que deseas editar.");

      const originalTask=tasks[i];

      if(isLaterSeriesOccurrence(originalTask,editOccurrenceKey)){
        savedTask=splitRecurringTaskFromOccurrence(originalTask,editOccurrenceKey,data);
        splitApplied=true;
      }else{
        tasks[i]={...tasks[i],...data,updatedAt:new Date().toISOString()};
        savedTask=tasks[i];
      }
    }else{
      savedTask={
        id:uid(),
        bookId:activeBookId,
        createdAt:new Date().toISOString(),
        ...data
      };
      tasks.push(savedTask);
    }

    syncTaskMovement(savedTask,movementData);
    localStorage.setItem(EXPENSES_KEY,JSON.stringify(expenses));

    $("#taskDialog").close();
    saveTasks();

    if(splitApplied){
      toast(`Tarea actualizada desde ${shortDate(parseDate(editOccurrenceKey))}. Las anteriores se conservaron.`);
    }else{
      toast(id ? "Tarea actualizada correctamente." : "Tarea guardada correctamente.");
    }
  }catch(err){
    toast(err.message||"Revisa los datos de la tarea.");
  }
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



$$("[data-time-target]").forEach(btn=>{
  btn.onclick=()=>openTimePicker(btn.dataset.timeTarget);
});

$("#timePickerHour").innerHTML=[...Array(12)].map((_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
$("#timePickerMinute").innerHTML=[...Array(60)].map((_,i)=>`<option value="${i}">${pad(i)}</option>`).join("");

$("#timePickerHour").onchange=updateTimePickerPreview;
$("#timePickerMinute").onchange=updateTimePickerPreview;
$("#timePickerAM").onclick=()=>setTimePickerPeriod("AM");
$("#timePickerPM").onclick=()=>setTimePickerPeriod("PM");
$("#applyTimePickerBtn").onclick=applyTimePicker;
$("#clearTimePickerBtn").onclick=clearTimePicker;
$("#cancelTimePickerBtn").onclick=$("#closeTimePickerDialog").onclick=()=>$("#timePickerDialog").close();

$("#timePickerDialog").addEventListener("click",e=>{
  if(e.target===$("#timePickerDialog")) $("#timePickerDialog").close();
});


$("#closeRecurrenceDialog").onclick=$("#cancelRecurrenceDialog").onclick=()=>$("#recurrenceDialog").close();

$("#recurrenceCopyBtn").onclick=()=>{
  const taskId=$("#recurrenceTaskId").value;
  const occurrenceKey=$("#recurrenceOccurrenceDate").value;
  if(taskId) openTaskCopyDialog(taskId,occurrenceKey);
};

$("#recurrence").addEventListener("change",()=>{
  const select=$("#recurrence");
  if(select.value==="copy"){
    const taskId=$("#taskId").value;
    const occurrenceKey=$("#editOccurrenceDate").value;
    const fallback=select.dataset.lastNonCopy||"none";
    select.value=fallback;
    if(taskId) openTaskCopyDialog(taskId,occurrenceKey);
    return;
  }
  select.dataset.lastNonCopy=select.value;
});

$("#closeTaskCopyDialog").onclick=$("#cancelTaskCopyBtn").onclick=()=>$("#taskCopyDialog").close();
$("#saveTaskCopyBtn").onclick=saveTaskCopy;
$("#taskCopyDialog").addEventListener("click",e=>{
  if(e.target===$("#taskCopyDialog")) $("#taskCopyDialog").close();
});



$$("[data-recurrence-value]").forEach(btn=>{
  btn.onclick=()=>{
    const taskId=$("#recurrenceTaskId").value;
    const occurrenceKey=$("#recurrenceOccurrenceDate").value;
    if(!taskId) return;
    setTaskRecurrence(taskId,btn.dataset.recurrenceValue,occurrenceKey);
  };
});

$("#recurrenceDialog").addEventListener("click",e=>{
  if(e.target===$("#recurrenceDialog")) $("#recurrenceDialog").close();
});

$("#allDay").onchange=toggleTimeFields;

function syncDueDependentFields({notify=false}={}){
  const startValue=$("#startDate").value;
  const dueValue=$("#dueDate").value;

  if(!startValue) return;

  $("#dueDate").min=startValue;

  if(dueValue && dueValue<startValue){
    $("#dueDate").value=startValue;
    if(notify){
      toast("La fecha de vencimiento no puede ser anterior a la fecha de inicio. Se ajustó automáticamente.");
    }
  }
}

$("#dueDate").addEventListener("change",()=>syncDueDependentFields({notify:true}));
$("#startDate").addEventListener("change",()=>syncDueDependentFields({notify:true}));


$("#financeLedgerBtn").onclick=openFinanceLedger;
$("#closeFinanceLedgerDialog").onclick=$("#closeFinanceLedgerBtn").onclick=()=>$("#financeLedgerDialog").close();
$("#financeLedgerDialog").addEventListener("click",e=>{
  if(e.target===$("#financeLedgerDialog")) $("#financeLedgerDialog").close();
});

$("#closeExpenseDetailDialog").onclick=()=>$("#expenseDetailDialog").close();

$("#expenseDetailDialog").addEventListener("click",e=>{
  if(e.target===$("#expenseDetailDialog")) $("#expenseDetailDialog").close();
});

$("#expenseDetailEditBtn").onclick=()=>{
  const expense=expenses.find(e=>e.id===$("#expenseDetailId").value);
  if(!expense) return;

  $("#expenseDetailDialog").close();
  $("#viewExpensesDialog").close();
  openExpenseDialog(expense);
};

$("#expenseDetailMoveBtn").onclick=()=>{
  const select=$("#expenseDetailBookSelect");
  const expense=expenses.find(e=>e.id===$("#expenseDetailId").value);
  if(!expense) return;

  if(!books.some(book=>book.id!==expense.bookId)){
    toast("No hay otro libro disponible.");
    return;
  }

  select.classList.toggle("hidden");
  if(!select.classList.contains("hidden")) select.focus();
};

$("#expenseDetailBookSelect").onchange=()=>{
  const expenseId=$("#expenseDetailId").value;
  const destination=$("#expenseDetailBookSelect").value;
  if(!expenseId || !destination) return;

  moveExpenseToBook(expenseId,destination);
  $("#expenseDetailDialog").close();

  if($("#viewExpensesDialog").open){
    renderViewExpenses();
  }
};

$("#expenseDetailDeleteBtn").onclick=async()=>{
  const expenseId=$("#expenseDetailId").value;
  if(!expenseId) return;

  const deleted=await deleteExpenseById(expenseId);
  if(deleted){
    $("#expenseDetailDialog").close();
  }
};

$("#viewExpensesBtn").onclick=openViewExpensesDialog;
$("#closeViewExpensesDialog").onclick=()=>$("#viewExpensesDialog").close();
$("#viewExpenseTodayBtn").onclick=()=>{
  const d=startOfDay(new Date());
  $("#viewExpenseDate").value=dateKey(d);
  $("#viewExpenseDateLabel").textContent=shortDate(d);
  selectedDate=d;
  calendarCursor=new Date(d.getFullYear(),d.getMonth(),1);
  weekCursor=startOfWeek(d);
  renderViewExpenses();
  renderAll();
};
$$("[data-view-expense-shift]").forEach(btn=>{
  btn.onclick=()=>shiftViewExpenseDate(btn.dataset.viewExpenseShift);
});
$("#viewExpenseDate").addEventListener("change",()=>{
  const d=parseDate($("#viewExpenseDate").value);
  $("#viewExpenseDateLabel").textContent=shortDate(d);
  selectedDate=startOfDay(d);
  calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
  weekCursor=startOfWeek(selectedDate);
  renderViewExpenses();
  renderAll();
});
$("#addExpenseBtn").onclick=()=>openExpenseDialog();
$("#closeExpenseDialog").onclick=$("#cancelExpenseBtn").onclick=()=>$("#expenseDialog").close();
$("#closeTaskMovementDialog").onclick=$("#closeTaskMovementDetailBtn").onclick=()=>$("#taskMovementDialog").close();
$("#taskMovementDialog").addEventListener("click",e=>{
  if(e.target===$("#taskMovementDialog")) $("#taskMovementDialog").close();
});
$("#expenseLogBtn").onclick=()=>{
  $("#expenseDialog").close();
  openExpenseLog();
};
$("#closeExpenseLogDialog").onclick=$("#cancelExpenseLogBtn").onclick=()=>$("#expenseLogDialog").close();
$("#exportExpenseLogBtn").onclick=exportSelectedExpensePeriods;
$("#expenseLogDialog").addEventListener("click",e=>{
  if(e.target===$("#expenseLogDialog")) $("#expenseLogDialog").close();
});
$$("[data-expense-shift]").forEach(b=>b.onclick=()=>shiftExpenseDate(b.dataset.expenseShift));
$("#expenseDate").addEventListener("change",()=>{
  let d=parseDate($("#expenseDate").value);
  if(isFutureDate(d)){
    toast("No puedes registrar movimientos en una fecha futura.");
    d=startOfDay(new Date());
    $("#expenseDate").value=dateKey(d);
  }
  $("#expenseDateLabel").textContent=dotDate(d);
});

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


$("#expenseTypeBtn").onclick=()=>{
  $("#expenseType").value=$("#expenseType").value==="income" ? "expense" : "income";
  updateExpenseTypeUI();
};

$("#taskFinanceTypeBtn").onclick=()=>{
  $("#taskFinanceType").value=$("#taskFinanceType").value==="income" ? "expense" : "income";
  updateTaskFinanceTypeUI();
};

$("#taskFinanceCurrencyBtn").onclick=()=>{
  $("#taskFinanceCurrencyBtn").textContent=$("#taskFinanceCurrencyBtn").textContent==="MN"?"DLS":"MN";
};

$("#taskFinanceAmountDisplay").addEventListener("input",e=>{
  const caretWasAtEnd=e.target.selectionStart===e.target.value.length;
  const formatted=formatMoneyInput(e.target.value);
  e.target.value=formatted;
  const amount=parseMoneyInput(formatted);
  $("#taskFinanceAmount").value=amount>0 ? String(amount) : "";
  if(caretWasAtEnd){
    const len=e.target.value.length;
    try{e.target.setSelectionRange(len,len);}catch{}
  }
});

$("#taskFinanceAmountDisplay").addEventListener("blur",e=>{
  const amount=parseMoneyInput(e.target.value);
  if(amount>0){
    const fixed=Math.min(amount,99999999.99).toFixed(2);
    e.target.value=formatMoneyInput(fixed);
    $("#taskFinanceAmount").value=String(Number(fixed));
  }else{
    e.target.value="";
    $("#taskFinanceAmount").value="";
  }
});

$("#expenseCurrencyBtn").onclick=()=>{
  $("#expenseCurrencyBtn").textContent=$("#expenseCurrencyBtn").textContent==="MN"?"DLS":"MN";
};
$("#expenseForm").addEventListener("submit",e=>{
  e.preventDefault();

  const type=$("#expenseType").value==="income" ? "income" : "expense";
  const title=$("#expenseTitle").value.trim();
  const amount=parseMoneyInput($("#expenseAmountDisplay").value);
  const expenseDateValue=parseDate($("#expenseDate").value);

  if(isFutureDate(expenseDateValue)){
    toast("No puedes registrar movimientos en una fecha futura.");
    return;
  }

  if(!title){
    toast(type==="income" ? "Escribe cómo ganaste el ingreso." : "Escribe en qué gastaste.");
    return;
  }

  if(amount<=0 || amount>99999999.99){
    toast("El monto debe estar entre $0.01 y $99,999,999.99.");
    return;
  }

  const id=$("#expenseId").value;
  const data={
    type,
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
    expenses.push({id:uid(),bookId:activeBookId,cycleDay:getActiveBookExpenseCycleDay(),...data,createdAt:new Date().toISOString()});
  }

  selectedDate=parseDate(data.date);
  calendarCursor=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
  weekCursor=startOfWeek(selectedDate);

  saveExpenses();
  $("#expenseDialog").close();
  renderAll();

  if($("#viewExpensesDialog") && $("#viewExpensesDialog").open){
    $("#viewExpenseDate").value=data.date;
    $("#viewExpenseDateLabel").textContent=shortDate(parseDate(data.date));
    renderViewExpenses();
  }

  const label=type==="income" ? "Ingreso" : "Gasto";
  toast(id ? `${label} actualizado.` : `${label} guardado.`);
});



$("#closeCommentDialog").onclick=$("#cancelCommentBtn").onclick=()=>$("#commentDialog").close();
$("#saveCommentBtn").onclick=()=>{
  const task=tasks.find(t=>t.id===$("#commentTaskId").value);
  const key=$("#commentOccurrenceKey").value;
  if(!task || !key) return;

  const text=$("#commentDialogInput").value.trim();
  const map=ensureTaskCommentMap(task);

  if(text) map[key]=text;
  else delete map[key];

  task.updatedAt=new Date().toISOString();
  $("#commentDialog").close();
  saveTasks();

  toast(text ? "Comentario guardado para esta ocurrencia." : "Comentario eliminado de esta ocurrencia.");
};
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
$("#toggleBookFormBtn").onclick=()=>{
  const opening=$("#bookFormPanel").classList.contains("hidden");
  setBookFormOpen(opening);
  if(opening && $("#bookAppearanceDetails")) $("#bookAppearanceDetails").open=false;
};
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
$$(".bottom-nav button").forEach(btn=>{
  btn.addEventListener("pointerdown",()=>{
    btn.classList.remove("nav-pulse");
    void btn.offsetWidth;
    btn.classList.add("nav-pulse");
    setTimeout(()=>btn.classList.remove("nav-pulse"),420);
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
$("#settingsBtnTop").onclick=()=>{
  populateSettings();
  $("#settingsSavedMessage").classList.add("hidden");
  $$("#settingsDialog details.settings-group").forEach(group=>group.open=false);
  $("#settingsDialog").showModal();
};
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
$("#importBtn").onclick=()=>$("#importChoiceDialog").showModal();
$("#closeImportChoiceDialog").onclick=$("#cancelImportChoiceBtn").onclick=()=>$("#importChoiceDialog").close();
$("#chooseImportTasksBtn").onclick=()=>{
  $("#importChoiceDialog").close();
  $("#importInput").click();
};
$("#chooseImportExpensesBtn").onclick=()=>{
  $("#importChoiceDialog").close();
  $("#importExpensesInput").click();
};
$("#importInput").onchange=e=>{
  const file=e.target.files[0];
  if(file) importData(file);
  e.target.value="";
};
$("#importExpensesInput").onchange=e=>{
  const file=e.target.files[0];
  if(file) importExpensesData(file);
  e.target.value="";
};
$("#importChoiceDialog").addEventListener("click",e=>{
  if(e.target===$("#importChoiceDialog")) $("#importChoiceDialog").close();
});
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
migrateTaskCommentsV1155();
migrateMovementsV116();
updateActiveBookSelect();
populateSettings();
applySettings();
if ($("#appVersion")) $("#appVersion").textContent = APP_VERSION;
switchView("calendar");
renderAll(); scheduleNotifications();
