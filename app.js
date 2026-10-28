'use strict';
(function(){
  var state = {files:[], total:{notes:0,res:0,bytes:0}};
  var $ = function(s){return document.querySelector(s);};

  function show(n){
    document.querySelectorAll('.step').forEach(function(s){ s.hidden = s.id !== 's'+n; });
    document.querySelectorAll('.progress li').forEach(function(li){
      var k = +li.dataset.s; li.className = k===n ? 'on' : (k<n ? 'done' : '');
    });
    if(n===4) renderCheck();
    window.scrollTo(0,0);
    var h = document.querySelector('#s'+n+' h2'); if(h){ h.tabIndex=-1; h.focus({preventScroll:true}); }
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-go]'); if(b){ show(b.dataset.go==='demo' ? 'demo' : +b.dataset.go); }
  });

  function fmtSize(b){
    if(b < 1024*1024) return Math.max(1,Math.round(b/1024)) + ' KB';
    if(b < 1024*1024*1024) return (b/1048576).toFixed(1).replace('.',',') + ' MB';
    return (b/1073741824).toFixed(2).replace('.',',') + ' GB';
  }
  function num(n){ return n.toLocaleString('de-DE'); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  // Streaming scan: works for files of several GB without loading them fully.
  var PATS = {
    noteOpen:/<note>/g, noteClose:/<\/note>/g, res:/<resource>/g, tag:/<tag>/g,
    crypt:/<en-crypt/g, exportOpen:/<en-export/g, exportClose:/<\/en-export>/g,
    img:/<mime>image\//g, pdf:/<mime>application\/pdf/g, audio:/<mime>audio\//g,
    task:/<task>/g, reminder:/<reminder-time>/g
  };
  var TAIL = 40;

  async function scan(file, onProg){
    var c = {}; Object.keys(PATS).forEach(function(k){c[k]=0;});
    var tags = new Set(), tail = '', read = 0, head = '';
    var dec = new TextDecoder('utf-8');
    var reader = file.stream().getReader();
    while(true){
      var r = await reader.read();
      if(r.done) break;
      read += r.value.length;
      var txt = dec.decode(r.value, {stream:true});
      if(head.length < 600) head += txt.slice(0, 600);
      var buf = tail + txt;
      for(var k in PATS){
        var re = PATS[k]; re.lastIndex = 0; var m;
        while((m = re.exec(buf))){ if(m.index + m[0].length > tail.length) c[k]++; }
      }
      if(tags.size < 5000){
        var tr = /<tag>([^<]{1,200})<\/tag>/g, tm;
        while((tm = tr.exec(buf))){ if(tm.index + tm[0].length > tail.length) tags.add(tm[1]); }
      }
      tail = buf.slice(-TAIL);
      onProg(read / file.size);
    }
    c.tagNames = tags.size; c.head = head;
    return c;
  }

  function judge(file, c){
    var errors = [], warns = [];
    if(!/\.enex$/i.test(file.name)) errors.push('Das ist keine Evernote-Sicherung. Bitte in Evernote mit dem Format „ENEX“ speichern.');
    else if(c.exportOpen === 0) errors.push('Die Datei sieht nicht wie ein Evernote-Export aus.');
    else {
      if(c.exportClose === 0) errors.push('Die Datei ist nicht vollständig. Bitte in Evernote noch einmal exportieren.');
      if(c.noteOpen === 0) errors.push('In der Datei sind keine Notizen. War das Notizbuch leer?');
      if(c.noteOpen !== c.noteClose) errors.push('Die Datei ist beschädigt. Bitte noch einmal exportieren.');
    }
    if(c.crypt) warns.push(c.crypt + '× mit Passwort geschützter Text – der ist in Notizen nicht lesbar. Vorher in Evernote entsperren.');
    if(c.task || c.reminder) warns.push('Aufgaben/Erinnerungen werden nicht übernommen.');
    if(file.size > 1.9*1073741824) warns.push('Sehr große Datei – der Import kann lange dauern.');
    return {errors:errors, warns:warns};
  }

  function render(){
    var out = '';
    var okFiles = state.files.filter(function(f){return !f.j.errors.length;});
    var t = {notes:0,res:0,bytes:0,img:0,pdf:0};
    okFiles.forEach(function(f){ t.notes+=f.c.noteOpen; t.res+=f.c.res; t.bytes+=f.size; t.img+=f.c.img; t.pdf+=f.c.pdf; });
    state.total = t;
    if(okFiles.length){
      out += '<div class="sum">✔ ' + num(t.notes) + ' Notizen mit ' + num(t.res) + ' Anhängen (' + fmtSize(t.bytes) + ') sind bereit.</div>';
    }
    state.files.forEach(function(f){
      var bad = f.j.errors.length;
      out += '<div class="card ' + (bad?'bad':'ok') + '"><h3>' + (bad?'✖ ':'✔ ') + esc(f.name.replace(/\.enex$/i,'')) + '</h3>';
      if(!bad){
        out += '<p>' + num(f.c.noteOpen) + ' Notizen · ' + num(f.c.res) + ' Anhänge';
        if(f.c.res) out += ' (davon ' + num(f.c.img) + ' Bilder, ' + num(f.c.pdf) + ' PDF)';
        out += ' · ' + num(f.c.tagNames) + ' Schlagwörter · ' + fmtSize(f.size) + '</p>';
      }
      f.j.errors.forEach(function(e){ out += '<p class="warn">' + esc(e) + '</p>'; });
      f.j.warns.forEach(function(e){ out += '<p>⚠ ' + esc(e) + '</p>'; });
      out += '</div>';
    });
    if(state.files.length && !okFiles.length) out += '<p class="warn">Bitte zurück zu Schritt 1 und das Notizbuch neu exportieren.</p>';
    $('#result').innerHTML = out;
    $('#to3').hidden = !okFiles.length;
  }

  async function handle(list){
    var files = Array.prototype.slice.call(list);
    if(!files.length) return;
    for(var i=0;i<files.length;i++){
      var f = files[i];
      if(state.files.some(function(x){return x.name===f.name && x.size===f.size;})) continue;
      $('#result').innerHTML = '<p>Prüfe „' + esc(f.name) + '“ …</p><div class="bar"><i id="pb"></i></div>';
      var c;
      try { c = await scan(f, function(p){ var pb=$('#pb'); if(pb) pb.style.width = Math.round(p*100)+'%'; }); }
      catch(err){ c = {exportOpen:0,exportClose:0,noteOpen:0,noteClose:0,res:0,crypt:0,task:0,reminder:0,tagNames:0,img:0,pdf:0}; }
      state.files.push({name:f.name, size:f.size, c:c, j:judge(f,c)});
    }
    render();
  }

  function renderCheck(){
    var t = state.total;
    $('#check').innerHTML = t.notes ? '<p class="sum">Im Ordner „Importierte Notizen“ sollten jetzt etwa <b>' + num(t.notes) + ' Notizen</b> sein.</p>' : '';
  }

  var drop = $('#drop'), input = $('#file');
  input.addEventListener('change', function(){ handle(input.files); input.value=''; });
  ['dragenter','dragover'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('over');}); });
  ['dragleave','drop'].forEach(function(ev){ drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('over');}); });
  drop.addEventListener('drop', function(e){ handle(e.dataTransfer.files); });
  drop.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); input.click(); } });
  // avoid browser opening file when dropped beside the zone
  window.addEventListener('dragover', function(e){e.preventDefault();});
  window.addEventListener('drop', function(e){e.preventDefault();});
  var demoBtn = $('#demobtn');
  function logLine(t){ var li=document.createElement('li'); li.textContent=t; var l=$('#log'); l.appendChild(li); l.scrollTop=l.scrollHeight; }
  function techLine(t){ var p=$('#techlog'); p.textContent += new Date().toLocaleTimeString('de-DE')+'  '+t+'\n'; p.scrollTop=p.scrollHeight; }
  demoBtn.addEventListener('click', function(){
    if(demoBtn.disabled) return;
    demoBtn.disabled = true; demoBtn.textContent = 'Sichert … (Vorschau)';
    $('#demobarwrap').hidden = false; $('#logwrap').hidden = false;
    $('#log').innerHTML=''; $('#techlog').textContent='';
    var names = ['Familie','Rezepte','Garten','Reisen','Steuer','Auto','Gesundheit','Fotos'];
    var total = 1000, steps = [], saved = 0, changed = 0;
    steps.push(function(){ logLine('Verbindung zu Evernote wird aufgebaut …'); techLine('evernote-backup sync -d en_backup.db'); });
    steps.push(function(){ logLine('Evernote meldet: 15 Notizen sind neu oder geändert.'); techLine('Syncing latest changes... 15 notes to download'); });
    names.forEach(function(n, i){
      var nr = Math.round((i+1) * total / names.length);
      steps.push(function(){ logLine('Notizbuch „' + n + '“ wird geholt (' + nr + ' von ' + total + ')'); techLine('export ' + n + '.enex'); });
      steps.push(function(){
        var k = (i*7)%3; saved += k; if(i%3===0){ changed++; }
        logLine(k ? k + ' Notizen in Notizen gespeichert' : 'Keine Änderungen – wird übersprungen');
        techLine('osascript notes_writer.js folder=Evernote/' + n + ' items=' + k);
      });
    });
    steps.push(function(){ logLine('Fertig! Alles ist gesichert.'); techLine('done new=12 changed=3'); });
    var i = 0;
    var t = setInterval(function(){
      steps[i](); i++;
      $('#demobar').style.width = Math.round(i/steps.length*100) + '%';
      $('#demostate').textContent = i < steps.length ? 'Sicherung läuft … (Vorschau)' : '✔ Fertig! 12 neue und 3 geänderte Notizen gesichert. (Beispielzahlen)';
      if(i >= steps.length){ clearInterval(t); demoBtn.disabled = false; demoBtn.textContent = 'Backup jetzt'; }
    }, 450);
  });
  show(1);
})();
