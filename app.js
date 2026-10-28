'use strict';
// Klickbarer Prototyp: Alles hier ist simuliert (Vorschau). Es werden keine Daten gesendet.
(function(){
  var $ = function(s){ return document.querySelector(s); };
  var connected = false;

  function logLine(t){ var li = document.createElement('li'); li.textContent = t; var l = $('#log'); l.appendChild(li); l.scrollTop = l.scrollHeight; }
  function techLine(t){ var p = $('#techlog'); p.textContent += new Date().toLocaleTimeString('de-DE') + '  ' + t + '\n'; p.scrollTop = p.scrollHeight; }
  function state(id, text){ var e = $(id); e.hidden = false; e.textContent = text; }

  // Schritt 1: Verbinden (simuliert)
  $('#c-btn').addEventListener('click', function(){
    var b = this; if(connected || b.disabled) return;
    b.disabled = true; b.textContent = 'Verbinde …';
    setTimeout(function(){
      connected = true;
      state('#c-state', '✓ Verbunden mit Evernote (Beispiel)');
      b.textContent = 'Verbunden';
      $('#s1').classList.add('done');
      $('#b-btn').disabled = false;
      $('#s2').scrollIntoView({behavior:'smooth', block:'start'});
    }, 1200);
  });

  // Schritt 2: Backup jetzt (simuliert)
  $('#b-btn').addEventListener('click', function(){
    var btn = this; if(btn.disabled || !connected) return;
    btn.disabled = true; btn.textContent = 'Sichert …';
    $('#b-bar').hidden = false; $('#logwrap').hidden = false;
    $('#log').innerHTML = ''; $('#techlog').textContent = '';
    var names = ['Familie','Rezepte','Garten','Reisen','Steuer','Auto','Gesundheit','Fotos'];
    var total = 1000, steps = [];
    steps.push(function(){ logLine('Verbindung zu Evernote wird aufgebaut …'); techLine('evernote-backup sync'); });
    steps.push(function(){ logLine('Evernote meldet: 15 Notizen sind neu oder geändert.'); techLine('15 notes to download'); });
    names.forEach(function(n, i){
      var nr = Math.round((i + 1) * total / names.length);
      steps.push(function(){ logLine('Notizbuch „' + n + '“ wird geholt (' + nr + ' von ' + total + ')'); techLine('notebook ' + n); });
      steps.push(function(){
        var k = (i * 7) % 3;
        logLine(k ? (k === 1 ? '1 Notiz' : k + ' Notizen') + ' in Notizen gespeichert' : 'Keine Änderungen – wird übersprungen');
        techLine('notes_writer folder=Evernote/' + n + ' items=' + k);
      });
    });
    steps.push(function(){ logLine('Fertig! Alles ist gesichert.'); techLine('done new=12 changed=3'); });
    var i = 0;
    state('#b-state', 'Sicherung läuft …');
    var t = setInterval(function(){
      steps[i](); i++;
      $('#b-fill').style.width = Math.round(i / steps.length * 100) + '%';
      if(i >= steps.length){
        clearInterval(t);
        state('#b-state', '✓ Fertig! 12 neue und 3 geänderte Notizen gesichert. (Beispielzahlen)');
        btn.disabled = false; btn.textContent = 'Backup jetzt';
        $('#s2').classList.add('done');
      }
    }, 450);
  });
})();
