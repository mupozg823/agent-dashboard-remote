// ── Entry Point ──
import './style.css';
import { FLOORS } from './config.js';
import { S } from './state.js';
import { switchFloor, toggleBuildingView } from './game.js';
import { getParams, doConnect, connectWith, openPanel, closePanel, switchTab, setupCanvasTouch, setupSheetSwipe, setupDragDrop, startIntervals, setupVisibility } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  // ── Connect Button ──
  document.getElementById('connectBtn').addEventListener('click', doConnect);

  // ── Floor Nav Buttons ──
  document.querySelectorAll('.floor-btn[data-f]').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.f;
      if (f === 'b') toggleBuildingView();
      else switchFloor(parseInt(f));
    });
  });

  // ── Bottom Nav ──
  document.querySelectorAll('.bnav .nb').forEach(btn => {
    btn.addEventListener('click', () => openPanel(btn.dataset.p));
  });

  // ── Panel Tabs ──
  document.querySelectorAll('.ptab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.p));
  });

  // ── Panel Overlay (close on tap) ──
  document.getElementById('panelOverlay').addEventListener('click', closePanel);

  // ── FAB Button ──
  document.getElementById('fabBtn').addEventListener('click', () => openPanel('cmd'));

  // ── Setup interactions ──
  setupCanvasTouch();
  setupSheetSwipe();
  setupDragDrop();
  startIntervals();
  setupVisibility();

  // ── Auto-connect on load ──
  const p = getParams();
  if (p.url && p.key && p.session) {
    connectWith(p.url, p.key, p.session);
  } else {
    document.getElementById('setupOverlay').style.display = 'flex';
    document.getElementById('cfgUrl').value = p.url;
    document.getElementById('cfgKey').value = p.key;
    document.getElementById('cfgSession').value = p.session;
  }
});
