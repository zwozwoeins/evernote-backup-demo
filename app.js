'use strict';
// Klickbarer Prototyp: Alles hier ist simuliert (Vorschau). Es werden keine Daten gesendet.
(function(){
  var $ = function(s){ return document.querySelector(s); };
  var TOTAL = 1000, PROBE = 2;
  var MSG = {
    offline: 'Keine Verbindung. Bitte später nochmal.',
    skip: 'Schon gesichert, wird übersprungen.',
    full: 'Kein Platz mehr in iCloud. Bitte Platz freimachen, dann „Weiter sichern“.',
    apple: 'Nicht bei Apple angemeldet. Bitte in den Einstellungen anmelden.'
  };
  var NAMES = ['Büro','Rezepte','Garten','Reisen','Steuer','Auto','Gesundheit','Fotos','Haus','Briefe'];
  var connected = false, pos = 0, notes = 0, timer = null, probeDone = false;
  var btn = $('#b-btn'), stop = $('#b-stop'), test = $('#b-test');

  function fmt(n){ return n.toLocaleString('de-DE'); }
  function show(el, on){ el.hidden = !on; }
  function logLine(t){ var li = document.createElement('li'); li.textContent = t; var l = $('#log'); l.appendChild(li); l.scrollTop = l.scrollHeight; }
  function techLine(t){ var p = $('#techlog'); p.textContent += new Date().toLocaleTimeString('de-DE') + '  ' + t + '\n'; p.scrollTop = p.scrollHeight; }
  function eta(left){
    var min = Math.max(1, Math.round(left * 7 / 60)); // grob: 7 Sekunden je Notizbuch
    if(min === 1) return 'Noch etwa 1 Minute.';
    if(min < 60) return 'Noch etwa ' + min + ' Minuten.';
    var h = Math.round(min / 60);
    if(h === 1) return 'Noch etwa 1 Stunde.';
    return 'Noch etwa ' + h + ' Stunden.';
  }

  $('#c-btn').addEventListener('click', function(){
    var b = this; if(connected || b.disabled) return;
    b.disabled = true; b.textContent = 'Verbinde …';
    setTimeout(function(){
      connected = true;
      b.textContent = 'Verbunden ✓'; b.classList.add('ok');
      $('#s1').classList.add('done');
      btn.disabled = false; show($('#b-why'), false);
      show(test, true);
    }, 1200);
  });

  function tick(limit){
    var step = limit === PROBE ? 1 : 7;
    for(var k = 0; k < step && pos < limit; k++){
      pos++;
      var name = NAMES[pos % NAMES.length] + (pos > NAMES.length ? ' ' + pos : '');
      var n = (pos * 7) % 4;
      notes += n;
      if(k === 0){
        logLine('Notizbuch „' + name + '“ (' + pos + ' von ' + TOTAL + '): ' + (n ? (n === 1 ? '1 Notiz' : n + ' Notizen') + ' gespeichert' : MSG.skip));
        techLine('notebook #' + pos + ' items=' + n);
      }
    }
    $('#b-state').textContent = 'Sichere … Notizbuch ' + pos + ' von ' + TOTAL;
    $('#b-eta').textContent = eta(TOTAL - pos);
    var pct = Math.round(pos / TOTAL * 100);
    $('#b-fill').style.width = pct + '%';
    $('#b-bar').setAttribute('aria-valuenow', String(pct));
    if(pos >= limit){ finish(limit); }
  }

  function run(limit){
    if(!connected) return;
    show($('#b-run'), true); show($('#b-done'), false); show($('#b-probe'), false);
    show(test, false); show(stop, true);
    btn.disabled = true; btn.textContent = 'Sichere …';
    if(pos === 0){ $('#log').innerHTML = ''; $('#techlog').textContent = ''; logLine('Gleich fragt der Mac, ob der Helfer Notizen nutzen darf. Bitte „OK“ klicken.'); logLine('Verbindung zu Evernote steht.'); }
    else logLine('Es geht weiter bei Notizbuch ' + (pos + 1) + '.');
    timer = setInterval(function(){ tick(limit); }, limit === PROBE ? 700 : 120);
  }

  function halt(){
    clearInterval(timer); timer = null; show(stop, false);
    logLine('Angehalten. Mit „Weiter sichern“ geht es an dieser Stelle weiter.');
    $('#b-state').textContent = 'Angehalten bei Notizbuch ' + pos + ' von ' + TOTAL + '.';
    btn.disabled = false; btn.textContent = 'Weiter sichern';
  }

  function finish(limit){
    clearInterval(timer); timer = null; show(stop, false);
    btn.disabled = false;
    if(limit === PROBE){
      probeDone = true; show($('#b-probe'), true);
      btn.textContent = 'Weiter sichern'; show(btn, false);
      $('#b-state').textContent = 'Probe fertig.';
      return;
    }
    $('#b-state').textContent = 'Fertig.'; $('#b-eta').textContent = '';
    $('#b-done-text').textContent = 'Fertig: ' + fmt(notes) + ' Notizen in ' + fmt(TOTAL) + ' Ordnern (Beispielzahlen).';
    $('#b-fail-text').textContent = '1 Notizbuch konnte nicht gesichert werden: „Briefe 734“. Alles andere ist gesichert.';
    show($('#b-fail'), true);
    show($('#b-done'), true);
    $('#s2').classList.add('done');
    logLine('Fertig. Alles ist gesichert.');
    pos = 0; notes = 0; btn.textContent = 'Jetzt sichern';
  }

  btn.addEventListener('click', function(){ if(!btn.disabled) run(TOTAL); });
  test.addEventListener('click', function(){ run(PROBE); });
  stop.addEventListener('click', halt);
  $('#b-retry').addEventListener('click', function(){
    show($('#b-fail'), false);
    logLine('Notizbuch „Briefe 734“ wird noch einmal versucht … gesichert.');
    $('#b-done-text').textContent = 'Fertig: alles gesichert (Beispiel).';
  });
  $('#b-probe-ok').addEventListener('click', function(){ show(btn, true); run(TOTAL); });
})();
