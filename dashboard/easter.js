'use strict';
/* Easter Egg: 5x schnell auf den Titel klicken oder tippen. Kein Ton, kein Einfluss auf Ablauf und Layout. */
const egg = { clicks: [], timer: null };

function eggHide() {
  document.getElementById('egg').hidden = true;
}

function eggShow() {
  const box = document.getElementById('egg');
  if (!box || !box.hidden) return;
  box.hidden = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  egg.timer = setTimeout(eggHide, reduced ? 2500 : 5000);
}

function eggOnClick() {
  const now = Date.now();
  egg.clicks = egg.clicks.filter((t) => now - t < 2000).concat(now);
  if (egg.clicks.length < 5) return;
  egg.clicks = [];
  eggShow();
}

function eggBind() {
  const logo = document.querySelector('.statuscol h1');
  if (logo) logo.addEventListener('click', eggOnClick);
}

/* ---------- UFO: selten und zufaellig (alle 2–5 Minuten), ohne Ton ---------- */
const ufo = { timer: null, msgTimer: null };

function ufoReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ufoDelay() {
  if (new URLSearchParams(location.search).get('ufo') === '1') return 1000; // nur zum Testen
  return (120 + Math.random() * 180) * 1000;
}

function ufoRestart(el) {
  el.style.animation = 'none';
  void el.offsetWidth; // Animation neu starten
  el.style.animation = '';
}

function ufoHide() {
  document.getElementById('ufo-band').hidden = true;
  ufoSchedule();
}

function ufoFly() {
  if (ufoReduced() || document.hidden) return ufoSchedule();
  const band = document.getElementById('ufo-band');
  band.hidden = false;
  band.querySelectorAll('.ufo,.jet').forEach(ufoRestart);
  setTimeout(ufoHide, 4200);
}

function ufoSchedule() {
  clearTimeout(ufo.timer);
  ufo.timer = setTimeout(ufoFly, ufoDelay());
}

function ufoGreet() {
  const msg = document.getElementById('ufo-msg');
  msg.hidden = false;
  clearTimeout(ufo.msgTimer);
  ufo.msgTimer = setTimeout(() => { msg.hidden = true; }, 2500);
}

function ufoBind() {
  if (!document.getElementById('ufo-band')) return;
  document.getElementById('ufo').addEventListener('click', ufoGreet);
  if (!ufoReduced()) ufoSchedule();
}

eggBind();
ufoBind();
