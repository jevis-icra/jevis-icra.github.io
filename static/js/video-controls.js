// A slim scrub bar under every video (the teaser included) and a playback-speed button under the
// result videos. Click or drag the bar to scrub; with the bar focused, the arrow keys step 2 s.
(function () {
  'use strict';
  var SPEEDS = [1, 1.5, 2, 0.5];  // each click moves to the next

  function speedButton(video) {
    var b = document.createElement('button'), i = 0;
    b.type = 'button';
    b.className = 'vbar-speed';
    function apply() {
      var s = SPEEDS[i];
      video.defaultPlaybackRate = s;  // survives the lazy src load
      video.playbackRate = s;
      b.textContent = s + '×';
      b.setAttribute('aria-label', 'Playback speed ' + s + 'x (click to change)');
    }
    b.addEventListener('click', function () { i = (i + 1) % SPEEDS.length; apply(); });
    apply();
    return b;
  }

  function attach(video, withSpeed) {
    var row = document.createElement('div');
    row.className = 'vbar';
    var track = document.createElement('div');
    track.className = 'vbar-track';
    track.tabIndex = 0;
    track.setAttribute('role', 'slider');
    track.setAttribute('aria-label', 'Video position');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    var fill = document.createElement('div');
    fill.className = 'vbar-fill';
    var knob = document.createElement('div');
    knob.className = 'vbar-knob';
    track.appendChild(fill);
    track.appendChild(knob);
    row.appendChild(track);
    if (withSpeed) row.appendChild(speedButton(video));
    video.insertAdjacentElement('afterend', row);

    // while dragging, the bar follows the pointer at once and the video catches up
    var dragFrac = null, wasPlaying = false, pending = null, seeking = false;
    function paint() {
      var f = dragFrac !== null ? dragFrac
            : (video.duration ? Math.max(0, Math.min(1, video.currentTime / video.duration)) : 0);
      fill.style.clipPath = 'inset(0 ' + (100 - f * 100).toFixed(3) + '% 0 0 round 2px)';
      knob.style.left = (f * 100).toFixed(3) + '%';
      track.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    }
    var raf = 0;
    function frame() { paint(); raf = video.paused ? 0 : requestAnimationFrame(frame); }
    video.addEventListener('play', function () { if (!raf) raf = requestAnimationFrame(frame); });
    ['pause', 'seeked', 'loadedmetadata', 'timeupdate'].forEach(function (t) { video.addEventListener(t, paint); });

    // only the newest position is sought: a new seek starts once the previous frame is on screen,
    // so fast drags don't pile up seeks and the picture tracks the pointer smoothly both ways
    function requestSeek(t) {
      pending = t;
      if (!seeking) flush();
    }
    function flush() {
      if (pending === null) return;
      seeking = true;
      video.currentTime = pending;
      pending = null;
    }
    video.addEventListener('seeked', function () { seeking = false; flush(); });

    function scrubTo(clientX) {
      var r = track.getBoundingClientRect();
      dragFrac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      paint();
      requestSeek(dragFrac * video.duration);
    }
    function endDrag() {
      if (dragFrac === null) return;
      track.classList.remove('is-drag');
      dragFrac = null;
      if (wasPlaying) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    }
    track.addEventListener('pointerdown', function (e) {
      if (!video.duration) return;
      e.preventDefault();
      track.setPointerCapture(e.pointerId);
      track.classList.add('is-drag');
      wasPlaying = !video.paused;
      video.pause();
      scrubTo(e.clientX);
    });
    track.addEventListener('pointermove', function (e) { if (dragFrac !== null && track.hasPointerCapture(e.pointerId)) scrubTo(e.clientX); });
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('keydown', function (e) {
      var step = e.key === 'ArrowRight' ? 2 : (e.key === 'ArrowLeft' ? -2 : 0);
      if (!step || !video.duration) return;
      e.preventDefault();
      requestSeek(Math.max(0, Math.min(video.duration - 0.05, video.currentTime + step)));
    });
    paint();
    return row;
  }

  document.querySelectorAll('.video-fig video').forEach(function (v) { attach(v, true); });

  // teaser: bar only, as wide as the visible (letterboxed) picture rather than the full-width box
  var teaser = document.querySelector('.teaser-anim video');
  if (teaser) {
    var row = attach(teaser, false);
    var size = function () {
      var r = teaser.getBoundingClientRect();
      row.style.width = Math.round(Math.min(r.width, r.height * 16 / 9)) + 'px';
    };
    size();
    window.addEventListener('resize', size);
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(teaser);
  }
})();
