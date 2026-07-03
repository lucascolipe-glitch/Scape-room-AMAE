
(() => {
  const CFG = window.AMAE_CONFIG || {};
  const KEY = {start:'amaeStartTime', stage:'amaeStage', team:'amaeTeam', hints:'amaeHintsUsed', completed:'amaeCompleted'};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  function normalizeText(value){
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
  }
  async function sha256(text){
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function getStage(){ return Number(localStorage.getItem(KEY.stage) || 0); }
  function setStage(n){ if(n > getStage()) localStorage.setItem(KEY.stage, String(n)); updateProgress(); }
  function currentPage(){ return document.body.dataset.page || 'home'; }
  function stationNumber(){ return Number(document.body.dataset.station || 0); }

  function startEscape(){
    const team = normalizeText($('#teamName')?.value);
    if(!team){ showFeedback('homeFeedback','Escriban un nombre para el equipo.',false); return; }
    localStorage.setItem(KEY.team, team);
    if(!localStorage.getItem(KEY.start)) localStorage.setItem(KEY.start, String(Date.now()));
    if(getStage() < 1) localStorage.setItem(KEY.stage,'1');
    if(!localStorage.getItem(KEY.hints)) localStorage.setItem(KEY.hints,'0');
    location.href='estacion1.html';
  }

  function updateTimer(){
    const el = $('#timer'); if(!el) return;
    const start = Number(localStorage.getItem(KEY.start));
    if(!start){ el.textContent='--:--'; return; }
    const total = (CFG.durationMinutes || 90)*60*1000;
    let remaining = Math.max(0, total-(Date.now()-start));
    const m = Math.floor(remaining/60000), s = Math.floor((remaining%60000)/1000);
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if(remaining===0){ el.closest('.status-pill')?.classList.add('warning'); }
  }

  function updateHints(){
    const used = Number(localStorage.getItem(KEY.hints) || 0);
    $$('.ficha').forEach((f,i)=>f.classList.toggle('usada', i >= Math.max(0,(CFG.maxHints||3)-used)));
    const count=$('#hintCount'); if(count) count.textContent=String(Math.max(0,(CFG.maxHints||3)-used));
  }

  function updateProgress(){
    const st = getStage();
    const percent = Math.min(100, Math.max(0, st)*20);
    const bar=$('#progressBar'); if(bar) bar.style.width=`${percent}%`;
  }

  function guardPage(){
    const required = Number(document.body.dataset.required || 0);
    if(required && getStage() < required){
      const overlay=document.createElement('div'); overlay.className='locked-overlay';
      overlay.innerHTML='<div class="box"><img src="img/candado.svg" alt="Candado" width="90"><h2>Estación bloqueada</h2><p>Primero deben completar la estación anterior y recuperar la palabra que está dentro de la caja física.</p><a class="btn btn-secondary" href="index.html">Volver al inicio</a></div>';
      document.body.appendChild(overlay);
    }
  }

  function showFeedback(id,msg,ok){
    const el=document.getElementById(id); if(!el) return;
    el.textContent=msg; el.className=`feedback show ${ok?'ok':'error'}`;
  }
  function revealCode(code){
    const box=$('#lockCode'); if(!box) return;
    $('#codeDigits').textContent=code; box.classList.add('show');
    $('#keywordBox')?.classList.add('show');
    box.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function validateStation1(){
    const a=$('#s1a')?.value,b=$('#s1b')?.value,c=$('#s1c')?.value;
    const oa=$('#s1oa')?.value,ob=$('#s1ob')?.value,oc=$('#s1oc')?.value;
    if(a==='1'&&b==='3'&&c==='1'&&oa==='practica'&&ob==='sin'&&oc==='profesional'){
      showFeedback('activityFeedback','Clasificación validada. El problema no está en los números, sino en el sentido de la pregunta.',true); revealCode('131');
    } else showFeedback('activityFeedback','Revisen qué información permite responder cada pregunta y de qué necesidad surge.',false);
  }
  function validateStation2(){
    const a=$('#s2a')?.value,b=$('#s2b')?.value,c=$('#s2c')?.value;
    if(a==='1'&&b==='2'&&c==='3'){
      showFeedback('activityFeedback','Correspondencia validada: usar, aprender y crear no son la misma clase de trabajo matemático.',true); revealCode('123');
    } else showFeedback('activityFeedback','Pregúntense si las herramientas ya están disponibles, si deben estudiarse o si el grupo produce un resultado nuevo para sí.',false);
  }
  function validateStation3(){
    const n3=Number($('#n3')?.value), n4=Number($('#n4')?.value), formula=$('#formula')?.value;
    const justification=$('#justification')?.checked;
    if(n3===6&&n4===10&&formula==='correcta'&&justification){
      showFeedback('activityFeedback','Respuesta validada. Contaron los elementos libres y justificaron por qué los restantes quedan determinados.',true); revealCode('0610');
    } else showFeedback('activityFeedback','Revisen la diagonal principal y solo uno de los dos triángulos de la matriz.',false);
  }
  function validateStation4(){
    const m1n=Number($('#m1n')?.value),m1d=Number($('#m1d')?.value),m2n=Number($('#m2n')?.value),m2d=Number($('#m2d')?.value);
    const density=$('#density')?.value, intervention=$('#intervention')?.value;
    if(m1n===2&&m1d===5&&m2n===3&&m2d===7&&density==='si'&&intervention==='c'){
      showFeedback('activityFeedback','Análisis validado. La intervención propuesta sostiene la producción matemática sin clausurarla prematuramente.',true); revealCode('2537');
    } else showFeedback('activityFeedback','Comprueben las mediantes y revisen qué intervención permite comparar, justificar y formular conjeturas.',false);
  }

  async function validateKeyword(){
    const n=stationNumber();
    const input=normalizeText($('#keyword')?.value);
    if(!input){showFeedback('keywordFeedback','Ingresen la palabra encontrada dentro de la caja.',false);return;}
    const digest=await sha256('AMAE-2026|'+input);
    if(digest===CFG.keywordHashes[n]){
      setStage(n+1);
      showFeedback('keywordFeedback','Palabra recuperada. La siguiente estación quedó habilitada.',true);
      const next=$('#nextButton'); if(next){next.classList.remove('hidden');next.focus();}
    } else showFeedback('keywordFeedback','La palabra no coincide. Revisen la tarjeta que encontraron dentro de la caja.',false);
  }

  function useHint(btn){
    if(btn.dataset.used==='1') return;
    const used=Number(localStorage.getItem(KEY.hints)||0);
    if(used >= (CFG.maxHints||3)){ showFeedback('hintFeedback','El equipo ya utilizó todas sus fichas de autonomía.',false); return; }
    localStorage.setItem(KEY.hints,String(used+1)); btn.dataset.used='1'; btn.disabled=true;
    const target=document.getElementById(btn.dataset.target); target?.classList.add('show'); updateHints();
  }

  async function validateFinal(){
    const inputs=$$('.final-words input').map(i=>normalizeText(i.value));
    const expected=['NECESIDAD','ESTUDIO','RESPONSABILIDAD','VIGILANCIA'];
    const ok=inputs.every((v,i)=>v===expected[i]);
    if(!ok){showFeedback('finalFeedback','Las cuatro palabras todavía no están en el orden correcto.',false);return;}
    setStage(5); localStorage.setItem(KEY.completed,String(Date.now()));
    showFeedback('finalFeedback','Principios recuperados. El sistema central de la Tienda está listo para reactivarse.',true);
    $('#finalCode')?.classList.add('show');
    $('#celebration')?.classList.add('show');
    const elapsed=$('#elapsed'); if(elapsed){
      const t=Number(localStorage.getItem(KEY.completed))-Number(localStorage.getItem(KEY.start));
      const mins=Math.max(0,Math.floor(t/60000)); elapsed.textContent=`${mins} minutos`;
    }
  }

  function teacherLogin(){
    const pass=$('#teacherPass')?.value;
    if(pass===CFG.teacherPassword){sessionStorage.setItem('amaeTeacher','1');$('#teacherGate')?.classList.add('hidden');$('#teacherContent')?.classList.remove('hidden');}
    else showFeedback('teacherFeedback','Clave incorrecta.',false);
  }
  function teacherInit(){ if(sessionStorage.getItem('amaeTeacher')==='1'){$('#teacherGate')?.classList.add('hidden');$('#teacherContent')?.classList.remove('hidden');} }
  function manualUnlock(){ const st=Number($('#manualStage')?.value); localStorage.setItem(KEY.stage,String(st)); updateProgress(); showFeedback('manualFeedback',`Progreso ajustado al nivel ${st}.`,true); }
  function resetAll(){ if(confirm('¿Reiniciar todo el escape en este dispositivo?')){Object.values(KEY).forEach(k=>localStorage.removeItem(k));location.href='index.html';} }
  function continueEscape(){ const st=getStage(); location.href=st<=1?'estacion1.html':st===2?'estacion2.html':st===3?'estacion3.html':st===4?'estacion4.html':'final.html'; }

  document.addEventListener('DOMContentLoaded',()=>{
    guardPage(); updateTimer(); updateHints(); updateProgress(); setInterval(updateTimer,1000);
    const team=localStorage.getItem(KEY.team); const teamEl=$('#teamDisplay'); if(teamEl) teamEl.textContent=team||'Equipo';
    if($('#teamName')&&team) $('#teamName').value=team;
    const continueBtn=$('#continueButton'); if(continueBtn&&getStage()>0) continueBtn.classList.remove('hidden');
    const n=stationNumber();
    if(n && getStage()>n){
      $('#keywordBox')?.classList.add('show');
      $('#nextButton')?.classList.remove('hidden');
      showFeedback('keywordFeedback','Esta estación ya fue completada en este dispositivo.',true);
    }
    $('#startButton')?.addEventListener('click',startEscape);
    $('#continueButton')?.addEventListener('click',continueEscape);
    $('#validateActivity')?.addEventListener('click',()=>{
      const n=stationNumber(); ({1:validateStation1,2:validateStation2,3:validateStation3,4:validateStation4}[n]||(()=>{}))();
    });
    $('#validateKeyword')?.addEventListener('click',validateKeyword);
    $$('.pista-btn').forEach(b=>b.addEventListener('click',()=>useHint(b)));
    $('#validateFinal')?.addEventListener('click',validateFinal);
    $('#teacherLogin')?.addEventListener('click',teacherLogin);
    $('#manualUnlock')?.addEventListener('click',manualUnlock);
    $$('.resetButton').forEach(b=>b.addEventListener('click',resetAll));
    teacherInit();
  });
})();
