// Medida · frontend. Lógica de recomendación en recomendador.js; catálogo e IA vía API.
import { perf, gap as gapR, evaluate as evaluar, REGLA_SUFI_V } from "./recomendador.js";

const $=id=>document.getElementById(id);
const ic=n=>`<svg class="icon" aria-hidden="true"><use href="#${n}"/></svg>`;
const fmt=n=>"S/ "+new Intl.NumberFormat("es-PE").format(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mes=f=>{const d=new Date(f);return isNaN(d)?"fecha de consulta":d.toLocaleDateString("es-PE",{month:"short",year:"numeric",timeZone:"UTC"})};

// Datos que llegan de /api/catalogo (misma forma que usaba el HTML original).
let C=[],T={},P={},PR={};

const STEPS=[["profile","Tu uso"],["results","Recomendación"],["compare","Comparar"],["choice","Mi elección"]];
const st={step:"profile",win:false,text:"",tasks:["docs","calls","many","graphics"],intens:{},budget:4500,prio:"speed",seen:false,picks:[],choice:null,top:null,detected:null,note:""};
const nm=m=>m.brand+" "+m.name;
const gap=(m,id)=>gapR(m,T[id],st.intens[id]);
const evaluate=()=>evaluar(C,T,st);

// Eventos anónimos para validar el producto (no se envía el texto que escribe el usuario).
// randomUUID solo existe en HTTPS/localhost; en HTTP (EC2 sin certificado) se arma con getRandomValues.
const uuid=()=>crypto.randomUUID?crypto.randomUUID():([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
const SID=(()=>{try{let s=sessionStorage.getItem("medida.sid");if(!s){s=uuid();sessionStorage.setItem("medida.sid",s)}return s}catch{return null}})();
function track(tipo,datos){try{fetch("/api/eventos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sesion:SID,tipo,datos}),keepalive:true}).catch(()=>{})}catch{}}

async function boot(){
 try{const r=await fetch("/api/catalogo");if(!r.ok)throw new Error(r.status);const d=await r.json();
  C=d.laptops;T=Object.fromEntries(d.tareas.map(t=>[t.id,t]));
  P=Object.fromEntries(d.perfiles.map(p=>[p.id,[p.nombre,p.tareas]]));
  PR=Object.fromEntries(d.prioridades.map(p=>[p.id,p.etiqueta]));
  st.tasks=st.tasks.filter(id=>T[id]);render()}
 catch{$("app").innerHTML='<p role="alert" style="padding:24px">No pudimos cargar el catálogo. Recarga la página en unos segundos.</p>'}}

const EST={insuficiente:["✕","Insuficiente","bad"],a_medida:["✓","A tu medida","ok"],mas_de_lo_necesario:["!","Más de lo que necesitas","warn"]};
const NE_CAT={software_especifico:"software específico",hardware_especifico:"hardware específico",uso_profesional:"uso profesional",otro:"otro uso"};
const FTIPO={fabricante:"Fabricante",tienda:"Tienda",review_tecnica:"Review técnica",interpretacion:"Interpretación del sistema",otro:"Otra fuente"};
const FATR={specs:"Especificaciones",precio:"Precio",general:"General"};
const estadoDe=i=>i.suf?.estado||(i.fit?"a_medida":"insuficiente");
const light=i=>{const e=EST[estadoDe(i)]||EST.insuficiente;const fp=i.suf?.fuera_presupuesto||(!i.ok&&estadoDe(i)!=="insuficiente");
  return`<span class="light ${e[2]}"><i aria-hidden="true">${e[0]}</i>${e[1]}</span>${fp?'<span class="light warn budget"><i aria-hidden="true">!</i>Fuera de presupuesto</span>':""}`};
function reason(i){if(!i.sys)return"Usa otro sistema y necesitas Windows.";if(i.gaps.length)return`No cubre bien: ${i.gaps.map(g=>T[g.id].l.toLowerCase()).join(", ")}. ${i.gaps[0].g}`;if(i.suf?.estado==="mas_de_lo_necesario")return i.suf.sobras.map(s=>s.hoy).join(" ");if(!i.ok)return`Cubre tus tareas, pero se pasa ${fmt(i.m.price-st.budget)} de tu tope.`;return"Cubre tus tareas para el uso que describiste."}
function extra(i,list){const base=list.find(x=>x.fit&&x.m.price===Math.min(...list.filter(y=>y.fit).map(y=>y.m.price)));if(!i.fit||!base||i===base||i.m.price<=base.m.price)return"";
 const d=i.m.price-base.m.price,g=(st.tasks.includes("graphics")||st.tasks.includes("edit"))&&perf(i.m)>perf(base.m),l=st.prio==="mobile"&&i.m.w<base.m.w-.12;
 if(i.suf?.estado==="mas_de_lo_necesario") return`<p class="extra w">+${fmt(d)} frente a ${nm(base.m)}. ${i.suf.sobras.map(s=>s.hoy).join(" ")} <span class="field-help">Cuándo sí valdría la pena: ${i.suf.sobras.map(s=>s.cuando).join(" ")}</span></p>`;
 return g||l?`<p class="extra">+${fmt(d)} frente a ${nm(base.m)}: ${g?"rinde más en lo que haces":"pesa menos para llevarla a diario"}.</p>`:`<p class="extra w">Pagar ${fmt(d)} más que con ${nm(base.m)} no mejora lo que haces.</p>`}
function why(i,list){const out=[];
 out.push([i.ok,i.ok?`Entra en tu presupuesto (${fmt(st.budget-i.m.price)} de margen)`:`Fuera de presupuesto: se pasa ${fmt(i.m.price-st.budget)} de tu tope`]);
 if(st.win)out.push([i.sys,i.sys?"Funciona con Windows 11":"No usa Windows"]);
 st.tasks.forEach(id=>{const g=gap(i.m,id);out.push([!g,g?`${T[id].l}: ${g}`:`Cubre: ${T[id].l.toLowerCase()}`])});
 if(i.suf?.estado==="mas_de_lo_necesario") out.push([false,`Más de lo que necesitas: ${i.suf.sobras.map(s=>s.label).join(", ")} por encima de tu uso actual`]);
 const f=list.find(x=>x.fit);if(i.fit&&f===i){out.push([1,{price:"Es la más barata de las que te sirven",mobile:"Es la más liviana de las que te sirven",speed:"Es la que más rinde de las que te sirven",screen:"Su pantalla está entre las mejores de las que te sirven"}[st.prio]])}
 return`<ul class="why">${out.map(([o,t])=>`<li class="${o?"":"no"}">${t}</li>`).join("")}</ul>`}
const det=m=>`<details data-laptop="${m.id}" data-bloque="detalles_tecnicos"><summary>Detalles técnicos</summary><ul><li><b>${m.ram} GB de RAM:</b> memoria para tener varias pestañas y programas abiertos a la vez.</li><li><b>${m.ssd} GB de SSD:</b> espacio para programas, documentos y algunos juegos.</li><li><b>${m.cpu}:</b> el “cerebro” que mueve los programas.</li><li><b>${m.gpu} (${m.gm} GB):</b> la parte que dibuja juegos y 3D.</li><li>${m.screen}</li></ul></details>`;
const src=m=>`<p class="src">${fmt(m.price)} · ${m.store} · ref. ${m.ref} · precio referencial, ${mes(m.fecha)}</p>`;
const img=m=>m.img
  ?`<div class="pimg"><img src="${m.img}" alt="${nm(m)}" loading="lazy" style="max-width:100%;height:132px;object-fit:contain"></div>`
  :`<div class="pimg"><div>${ic("laptop")}${m.brand}</div></div>`;
const chips=()=>Object.entries(T).map(([id,t])=>{const on=st.tasks.includes(id),oc=st.intens[id]==="ocasional";
  return`<span class="chip-wrap"><button type="button" class="pick" data-act="task" data-id="${id}" aria-pressed="${on}">${ic("check")}${t.l}</button>${on?`<button type="button" class="pick inten" data-act="inten" data-id="${id}" aria-pressed="${oc}" aria-label="${t.l}: ${oc?"ocasional":"frecuente"}; toca para cambiar">${oc?"A veces":"Frecuente"}</button>`:""}</span>`}).join("");
const presets=()=>[2200,3000,4500,6000].map(b=>`<button type="button" data-act="bud" data-v="${b}" aria-pressed="${st.budget===b}">${fmt(b)}</button>`).join("");
function paint(){document.querySelectorAll("[data-chips]").forEach(e=>e.innerHTML=chips());document.querySelectorAll("[data-presets]").forEach(e=>e.innerHTML=presets())}
function profile(){return`<div class="section-heading"><h2 tabindex="-1" id="h">¿Qué haces en tu laptop un día normal?</h2><p>Cuéntalo con tus palabras o elige abajo. No necesitas saber de tecnología.</p></div>
<div class="form-grid"><div>
<label class="l" for="txt">Cuéntanos tu caso</label>
<textarea id="txt" aria-describedby="dn" maxlength="350" placeholder="Ej. Uso Zoom, Excel y a veces juego. Tengo unas 20 pestañas abiertas y la llevo a clases.">${esc(st.text)}</textarea>
<div class="row" style="margin-top:8px"><button type="button" class="btn subtle" data-act="detect">${ic("spark")} Entender mi uso</button><span class="field-help" id="dn" aria-live="polite" style="margin:0">Usamos IA para entender tu caso; luego puedes corregirlo.</span></div>
<fieldset style="margin-top:20px"><legend>O parte de un perfil</legend><div class="row">${Object.entries(P).map(([k,v])=>`<button type="button" class="pick" data-act="persona" data-id="${k}">${v[0]}</button>`).join("")}</div></fieldset>
<fieldset><legend>Esto es lo que entendimos (toca para cambiar)</legend><div class="row" data-chips>${chips()}</div></fieldset></div>
<aside class="form-side" aria-label="Condiciones de compra"><label class="l" for="bud">Presupuesto máximo</label>
<div class="number-input"><span>S/</span><input id="bud" type="number" inputmode="numeric" min="1" max="100000" value="${st.budget}" data-bud></div>
<div class="presets" data-presets>${presets()}</div>
<fieldset><legend>¿Qué es lo más importante?</legend><div class="prio">${Object.entries(PR).map(([k,v])=>`<label><input type="radio" name="p" value="${k}" ${st.prio===k?"checked":""}>${v}</label>`).join("")}</div></fieldset><label class="os-toggle"><input type="checkbox" data-win ${st.win?"checked":""}>Necesito Windows</label></aside></div>
<div class="form-footer"><p class="field-help">Después podrás cambiar todo esto sin volver aquí.</p><button class="btn primary" data-act="see">Ver mi recomendación ${ic("arrow")}</button></div>`}
function heroCard(i,list){const m=i.m;return`<article class="hero">${img(m)}<div>${light(i)}<h3>${nm(m)}</h3><p class="benefit">${m.benefit}</p>
<p class="price">${fmt(m.price)}</p>${src(m)}<p style="margin-top:10px;font-weight:700">Por qué la elegí</p>${why(i,list)}${extra(i,list)}<p class="note"><b>Ten en cuenta:</b> ${m.note}</p>${det(m)}
<div class="row" style="margin-top:10px"><button class="btn primary" data-act="choose" data-id="${m.id}">Quedarme con esta ${ic("arrow")}</button><button class="btn subtle" data-act="pick" data-id="${m.id}" aria-label="${st.picks.includes(m.id)?"Quitar":"Añadir"} ${nm(m)} ${st.picks.includes(m.id)?"de":"a"} la comparación" aria-pressed="${st.picks.includes(m.id)}">${st.picks.includes(m.id)?"✓ En la comparación":"Comparar con otras"}</button><button type="button" class="text-btn" data-act="src" data-id="${m.id}" aria-label="Fuentes de ${nm(m)}">Fuentes</button></div></div></article>`}
function card(i,list){const m=i.m,p=st.picks.includes(m.id);return`<article class="product ${p?"selected":""}">${img(m)}<div style="margin-top:8px">${light(i)}</div><h3>${nm(m)}</h3><p class="benefit" style="font-size:15px">${m.benefit}</p><p class="price" style="font-size:20px">${fmt(m.price)}</p><p class="src">${m.store} · precio referencial</p><p class="reason">${reason(i)}</p>${extra(i,list)}${det(m)}<div class="row" style="margin-top:auto"><button class="btn subtle" data-act="pick" data-id="${m.id}" aria-label="${p?"Quitar":"Añadir"} ${nm(m)} ${p?"de":"a"} la comparación" aria-pressed="${p}">${p?"✓ En la comparación":"Añadir a comparar"}</button><button type="button" class="text-btn" data-act="src" data-id="${m.id}" aria-label="Fuentes de ${nm(m)}">Fuentes</button></div></article>`}
function list(){const L=evaluate(),f=L.find(x=>x.fit);let h="";
 if(f){h+=heroCard(f,L);}else{const c=L.filter(x=>!x.gaps.length).sort((a,b)=>a.m.price-b.m.price)[0];h+=`<div class="insight warn">${ic("target")}<div><strong>Ninguna opción encaja con todo lo que pides</strong><p>${c?`${nm(c.m)} cubre tus tareas desde ${fmt(c.m.price)}, ${fmt(c.m.price-st.budget)} sobre tu tope.`:"Prueba quitando alguna tarea o subiendo el presupuesto."}</p></div></div>`}
 const rest=L.filter(x=>x!==f);
 h+=`<div class="catalog-heading"><h3>${f?"Otras opciones":"Opciones"}</h3><p class="field-help">La recomendada ya está elegida: añade 1 o 2 más para ver solo lo que cambia.</p></div><div class="catalog">${rest.map(i=>card(i,L)).join("")}</div>`;
 const n=st.picks.length;
 h+=`<div class="compare-dock"><div aria-live="polite"><strong>${n} de 3 seleccionadas</strong><p class="field-help" style="margin:0">${n<2?"Selecciona al menos dos.":"Todo listo para comparar."}</p></div><button class="btn primary" data-act="compare" ${n<2?"disabled":""}>Comparar ${ic("arrow")}</button></div>`;
 return h}
function results(){return`<div class="section-heading section-actions"><div><h2 tabindex="-1" id="h">Tu mejor opción</h2><p>Cambia tu caso aquí y el resultado se actualiza al instante.</p></div><button class="btn subtle" data-act="edit">Editar mi uso</button></div>
<div class="livebar" role="group" aria-label="Tu caso"><div class="row" data-chips>${chips()}</div><div class="row"><label for="bud2" style="font-weight:700">Presupuesto</label><div class="number-input"><span>S/</span><input id="bud2" type="number" inputmode="numeric" min="1" max="100000" value="${st.budget}" data-bud></div><span class="presets" style="margin:0" data-presets>${presets()}</span><label class="os-toggle" style="border:0;margin:0;padding:0"><input type="checkbox" data-win ${st.win?"checked":""}>Necesito Windows</label></div></div><div id="list">${list()}</div>`}
function compare(){const L=evaluate(),it=L.filter(x=>st.picks.includes(x.m.id));
 const A=[["Precio",m=>[m.price,`<b>${fmt(m.price)}</b><small>${m.store}</small>`]],["Juegos y 3D",m=>[m.gm,m.gm>=6?"Con margen":"Más justo"]],["Velocidad general",m=>[m.ct,`${m.ct>=3?"Alta":"Media"}<small>${m.cpu}</small>`]],["Peso",m=>[m.wl,m.wl]],["Pantalla",m=>[m.screen,m.screen]],["Memoria",m=>[m.ram,`${m.ram} GB de RAM`]],["Almacenamiento",m=>[m.ssd,`${m.ssd} GB SSD`]],["Sistema",m=>[m.os,m.os]]];
 const diff=[],same=[];A.forEach(([l,f])=>{const v=it.map(i=>f(i.m));(new Set(v.map(x=>x[0])).size>1?diff:same).push([l,v.map(x=>x[1])])});
 const by=(f,mx)=>it.slice().sort((a,b)=>mx?f(b.m)-f(a.m):f(a.m)-f(b.m))[0];
 const cheap=by(m=>m.price),pw=by(perf,1),lt=by(m=>m.w),parts=[];
 if(perf(pw.m)>perf(it.find(i=>i!==pw).m)||it.some(i=>perf(i.m)<perf(pw.m)))parts.push(`${nm(pw.m)} rinde más en juegos`);
 if(it.some(i=>i.m.w>lt.m.w))parts.push(`${nm(lt.m)} es la más liviana`);
 if(it.some(i=>i.m.price>cheap.m.price))parts.push(`${nm(cheap.m)} es la más barata (${fmt(cheap.m.price)})`);
 const key={price:cheap,mobile:lt,speed:pw,screen:by(m=>m.sc,1)}[st.prio];
 const row=(l,cells)=>`<tr><th scope="row">${l}</th>${cells.map(c=>`<td>${c}</td>`).join("")}</tr>`;
 return`<div class="section-heading section-actions"><div><h2 tabindex="-1" id="h">Lo que realmente cambia</h2><p>Solo mostramos las diferencias; lo igual está resumido abajo.</p></div><button class="btn subtle" data-act="edit">Editar mi uso</button></div>
<div class="insight">${ic("target")}<div><strong>La diferencia real</strong><p>${parts.length?parts.join(". ")+".":"Son muy parecidas para tu uso."}${st.prio==="screen"&&it.every(i=>i.m.sc===it[0].m.sc)?" Las pantallas son equivalentes entre estas opciones.":` Como priorizas “${PR[st.prio].toLowerCase()}”, pesa más: ${nm(key.m)}.`}</p></div></div>
<p class="field-help">Comparación para tu caso.<span class="mobile-instruction"> Desliza la tabla para ver todas las opciones.</span></p><div class="matrix" tabindex="0" role="region" aria-label="Tabla comparativa. Desplázate horizontalmente si hace falta."><table><caption class="sr">Ajuste a tus tareas, diferencias y fuentes de las laptops seleccionadas</caption><thead><tr><th scope="col">Tu comparación</th>${it.map(i=>`<th scope="col">${light(i)}<h3 style="font-size:16px;margin-top:6px">${nm(i.m)}</h3></th>`).join("")}</tr></thead><tbody>
<tr class="group"><th colspan="${it.length+1}" scope="rowgroup">Qué podrás hacer</th></tr>${st.tasks.filter(id=>new Set(it.map(i=>gap(i.m,id))).size>1).map(id=>row(T[id].l,it.map(i=>gap(i.m,id)?`<span class="light bad"><i>✕</i>Limitada</span><small>${gap(i.m,id)}</small>`:`<span class="light ok"><i>✓</i>Adecuada</span>`))).join("")}${row("Suficiencia",it.map(i=>`<span style="font-size:13px">${EST[estadoDe(i)][1]}${i.suf?.fuera_presupuesto?" · Fuera de presupuesto":""}</span><small>${i.suf?.estado==="mas_de_lo_necesario"?i.suf.sobras.map(s=>s.hoy).join(" "):reason(i)}</small>`))}${row("Por qué",it.map(i=>`<span style="font-size:13px">${reason(i)}</span>${extra(i,L)}`))}
<tr class="group"><th colspan="${it.length+1}" scope="rowgroup">Diferencias que notarás</th></tr>${diff.map(([l,c])=>row(l,c)).join("")}
<tr class="group"><th colspan="${it.length+1}" scope="rowgroup">Antes de decidir</th></tr>${row("Fuentes",it.map(i=>`<button type="button" class="btn subtle" data-act="src" data-id="${i.m.id}">Ver referencias</button>`))}${row("Ten en cuenta",it.map(i=>`<span style="font-size:13px">${i.m.note}</span>`))}
${row("",it.map(i=>`<button class="btn primary" data-act="choose" data-id="${i.m.id}">Elegir esta</button>`))}</tbody></table></div>
<p class="shared"><b>Las ${it.length} comparten:</b> ${same.map(([l,c])=>`${l.toLowerCase()}: ${c[0].replace(/<[^>]+>/g," ")}`).join(" · ")}.</p>
<div class="compare-dock"><button class="btn subtle" data-act="results">Cambiar selección</button><button class="text-btn" data-act="how">Cómo se calcula</button></div>`}
function choice(){const L=evaluate(),i=L.find(x=>x.m.id===st.choice),m=i.m,base=L.filter(x=>x.fit).sort((a,b)=>a.m.price-b.m.price)[0];
 const fb=(dim,ctx,label)=>`<div class="fb" data-fb="${dim}" data-ctx="${ctx}"><span>${label}</span><div class="row">${[["si","Sí"],["mas_o_menos","Más o menos"],["no","No"]].map(([v,l])=>`<button type="button" class="pick" data-act="fb" data-dim="${dim}" data-val="${v}" data-ctx="${ctx}">${l}</button>`).join("")}</div></div>`;
 return`<div class="choice"><div class="section-heading"><h2 tabindex="-1" id="h">Tu elección: ${nm(m)}</h2><p>${m.benefit}.</p></div>
 <div class="row">${light(i)}</div>
 <div class="big"><div class="box"><b>Precio</b><p class="price">${fmt(m.price)}</p><p class="src">${m.store} · ref. ${m.ref}</p><p class="field-help">Si la usas 4 años: unos <b>${fmt(Math.round(m.price/4))} por año</b> (estimación).</p></div>
 <div class="box"><b>Dónde conseguirla</b><p>${m.store}</p><p class="field-help">Precio referencial de ${mes(m.fecha)}; confírmalo antes de pagar y revisa la garantía.</p></div></div>
 <p style="font-weight:700">Por qué es buena para ti</p>${why(i,L)}
 <p class="note"><b>Lo que sacrificas:</b> ${m.note}</p>${base&&base!==i?`<p class="extra ${extra(i,L).includes("w")?"w":""}">${extra(i,L).replace(/<\/?p[^>]*>/g,"")}</p>`:""}
 ${det(m)}
 <div class="insight" style="margin-top:14px"><div><strong>Tu opinión nos ayuda</strong><p class="field-help">Responde rápido (opcional).</p>${fb("claridad","eleccion","¿Te quedó clara esta recomendación?")}${fb("suficiencia","eleccion","¿Sientes que esta opción es adecuada para tu uso?")}</div></div>
 <div class="row" style="margin-top:14px"><button class="btn subtle" data-act="src" data-id="${m.id}">Ver fuentes</button><button class="btn subtle" data-act="results">Ver otras opciones</button><button class="btn primary" data-act="edit">Empezar de nuevo</button></div></div>`}

function render(){const s=st.step;$("intro").hidden=s!=="profile";
 $("app").innerHTML={profile,results,compare,choice}[s]();
 $("steps").innerHTML=STEPS.map(([k,l],n)=>{const en=k==="profile"||(k==="results"&&st.seen)||(k==="compare"&&st.picks.length>=2)||(k==="choice"&&st.choice);return`<li><button type="button" data-act="step" data-id="${k}" ${en?"":"disabled"} ${k===s?'aria-current="step"':""}><span>${n+1}</span>${l}</button></li>`}).join("")}
function go(s){st.step=s;render();$("h").focus({preventScroll:true});$("ws").scrollIntoView({block:"start"})}
async function detect(){const raw=$("txt").value.trim();st.text=raw;const d=$("dn");if(!raw){d.textContent="Escribe qué harías con la laptop.";return}
 const btn=document.querySelector("[data-act=detect]");btn.disabled=true;d.textContent="Entendiendo tu caso…";
 let r;try{const res=await fetch("/api/interpretar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texto:raw})});r=await res.json();if(!res.ok)throw new Error(r.error||"No pudimos interpretar tu texto.")}
 catch(e){btn.disabled=false;d.textContent=e instanceof TypeError?"No pudimos conectarnos. Elige tus tareas abajo.":e.message;return}
 const f=r.tareas.map(t=>t.id),keep=st.tasks.filter(x=>!r.negadas.includes(x));
 st.tasks=f.length?[...new Set([...(st.tasks.length&&!st.touched?[]:keep),...f])]:keep;
 r.tareas.forEach(t=>st.intens[t.id]=t.intensidad);
 if(r.presupuesto)st.budget=r.presupuesto;if(r.prioridad)st.prio=r.prioridad;if(r.windows)st.win=true;
 const motor=r.motor||r.fuente;st.detected={fuente:r.fuente,motor,tareas:f};
  track("interpretacion",{v:2,fuente:r.fuente,motor,tareas:r.tareas,negadas:r.negadas,presupuesto_detectado:Boolean(r.presupuesto),windows_detectado:Boolean(r.windows),prioridad:r.prioridad,no_entendido_cat:r.no_entendido_cat||[]});
  render();let msg=f.length?`Entendimos: ${r.tareas.map(t=>T[t.id].l.toLowerCase()+(t.intensidad==="ocasional"?" (a veces)":"")).join(", ")}.`:"No reconocimos tareas. Elígelas abajo.";
  if((r.no_entendido_cat||[]).length){const cats=[...new Set(r.no_entendido_cat)].map(c=>NE_CAT[c]||c).join(", ");msg+=` No ubicamos: ${cats}; elige la tarea más parecida.`;}
  if(f.length)msg+=" Corrige abajo si hace falta.";$("dn").textContent=msg;$("txt").value=raw}
function showSrc(id,origen="fuentes"){const m=C.find(x=>x.id===id);if(!m)return;
  const fbs=(dim,ctx,label)=>`<div class="fb" data-fb="${dim}" data-ctx="${ctx}"><span>${label}</span><div class="row">${[["si","Sí"],["mas_o_menos","Más o menos"],["no","No"]].map(([v,l])=>`<button type="button" class="pick" data-act="fb" data-dim="${dim}" data-val="${v}" data-ctx="${ctx}">${l}</button>`).join("")}</div></div>`;
  const fuentes=(m.fuentes||[]).map(f=>{const tipo=FTIPO[f.tipo]||f.tipo;const atr=FATR[f.atributo]||f.atributo;const fecha=f.fecha?mes(f.fecha):"sin fecha";
    const url=f.url&&/^https?:\/\//.test(f.url)?`<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">Ver fuente</a>`:"";
    const ver=f.verificada?'<span class="light ok" style="font-size:12px;padding:2px 8px"><i aria-hidden="true">✓</i>Verificada</span>':'<span class="light warn" style="font-size:12px;padding:2px 8px"><i aria-hidden="true">!</i>Referencial</span>';
    return `<li class="src-item"><div class="row" style="gap:8px;align-items:center"><b>${esc(tipo)}</b><span class="src">${esc(atr)} · ${fecha}</span>${ver}</div><div>${esc(f.nombre)} ${url}</div>${f.nota?`<p class="field-help" style="margin:2px 0 0">${esc(f.nota)}</p>`:""}</li>`}).join("");
  $("srcc").innerHTML=`<p><b>${nm(m)}</b><br><span class="src">${esc(m.model)}</span></p>
    <div style="margin-top:10px"><b>Fuentes y evidencia</b><p class="field-help" style="margin:4px 0 8px">Cada dato indica su origen, fecha y si fue verificado. La recomendación es una interpretación del sistema basada en reglas visibles.</p>
    ${fuentes?`<ul class="src-list">${fuentes}</ul>`:`<p><b>Datos técnicos</b><br>${esc(m.spec||"")}</p><p style="margin-top:8px"><b>Precio referencial</b><br>${esc(m.store)} · ${esc(m.ref)}</p>`}
    </div>
    <div class="insight" style="margin-top:12px"><div><strong>¿Te ayudó esta información?</strong><p class="field-help">Opcional.</p>${fbs("confianza","fuentes","¿Estas fuentes te dan confianza?")}</div></div>`;
  $("srcd").showModal();track("fuente_vista",{v:2,laptop:id,origen_ui:origen});}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const a=b.dataset.act,id=b.dataset.id;
 if(a==="home"){st.step="profile";render()}
 else if(a==="how")$("how").showModal();else if(a==="closehow")$("how").close();
 else if(a==="detect")detect();else if(a==="src"){const o=st.step==="compare"?"compare":st.step==="choice"?"choice":st.step==="results"?"card":"fuentes";showSrc(id,o)}else if(a==="closesrc")$("srcd").close();
 else if(a==="persona"){st.tasks=[...P[id][1]];st.intens={};st.touched=1;paint()}
  else if(a==="task"){st.touched=1;const on=st.tasks.includes(id);st.tasks=on?st.tasks.filter(x=>x!==id):[...st.tasks,id];if(on)delete st.intens[id];if(!on&&!st.intens[id])st.intens[id]="frecuente";if(st.detected)track("correccion",{v:2,motor:st.detected.motor||st.detected.fuente,fuente:st.detected.fuente,tarea:id,accion:on?"quitar":"agregar"});paint();if(st.step==="results")$("list").innerHTML=list()}
  else if(a==="inten"){st.touched=1;st.intens[id]=st.intens[id]==="ocasional"?"frecuente":"ocasional";paint();if(st.step==="results")$("list").innerHTML=list()}
 else if(a==="bud"){st.budget=+b.dataset.v;document.querySelectorAll("[data-bud]").forEach(x=>x.value=st.budget);paint();if(st.step==="results")$("list").innerHTML=list()}
 else if(a==="see"){if(!st.tasks.length){const d=$("dn");d.textContent="Elige al menos una tarea.";return}if($("txt"))st.text=$("txt").value;st.seen=true;st.choice=null;st.compared=false;const L0=evaluate();const f0=L0.find(x=>x.fit);st.picks=f0?[f0.m.id]:[];st.top=f0?f0.m.id:null;st.resultAt=Date.now();const estados=Object.fromEntries(L0.map(x=>[x.m.id,x.suf.estado]));track("recomendacion",{v:2,regla_v:REGLA_SUFI_V,tareas:st.tasks,intensidad:st.intens,presupuesto:st.budget,prioridad:st.prio,windows:st.win,recomendada:st.top,aptas:L0.filter(x=>x.fit).length,estados});go("results")}
 else if(a==="edit")go("profile");else if(a==="results")go("results");
 else if(a==="pick"){const p=st.picks;if(p.includes(id))st.picks=p.filter(x=>x!==id);else if(p.length<3)p.push(id);$("list").innerHTML=list();const nb=document.querySelector(`[data-act=pick][data-id=${id}]`);nb&&nb.focus({preventScroll:true})}
 else if(a==="compare"&&st.picks.length>=2){st.compared=true;const Lc=evaluate().filter(x=>st.picks.includes(x.m.id));const estados=Object.fromEntries(Lc.map(x=>[x.m.id,x.suf.estado]));track("comparacion",{v:2,laptops:st.picks,incluye_recomendada:st.picks.includes(st.top),estados});go("compare")}
 else if(a==="choose"){st.choice=id;const Le=evaluate().find(x=>x.m.id===id);track("eleccion",{v:2,laptop:id,era_recomendada:id===st.top,estado_elegida:Le?.suf?.estado,comparo_antes:st.compared||false,duracion_ms:st.resultAt?Date.now()-st.resultAt:0});go("choice")}
 else if(a==="fb"){track("feedback",{v:2,dimension:b.dataset.dim,valor:b.dataset.val,contexto:b.dataset.ctx});const box=b.closest(".fb");if(box)box.innerHTML='<span class="field-help">Gracias por tu respuesta.</span>'}
 else if(a==="step"&&!b.disabled)go(id)});
document.addEventListener("input",e=>{if(e.target.matches("[data-bud]")){const v=e.target.valueAsNumber;if(v>0){st.budget=v;document.querySelectorAll("[data-presets]").forEach(x=>x.innerHTML=presets());if(st.step==="results")$("list").innerHTML=list()}}
 if(e.target.matches("[data-win]")){st.win=e.target.checked;document.querySelectorAll("[data-win]").forEach(x=>x.checked=st.win);if(st.step==="results")$("list").innerHTML=list()}
 if(e.target.name==="p"){st.prio=e.target.value;if(st.step==="results")$("list").innerHTML=list()}});
document.addEventListener("toggle",e=>{const d=e.target;if(d?.tagName==="DETAILS"&&d.open&&d.dataset.laptop)track("explicacion_vista",{v:2,laptop:d.dataset.laptop,bloque:d.dataset.bloque||"detalles_tecnicos"});},true);
boot();
