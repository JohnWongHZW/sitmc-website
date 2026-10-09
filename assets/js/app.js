/* ══════════════════════════════════════════════════════════════
   SIT-MINECRAFT · 六角恐龙社 档案终端
   交互层：接入序列 / 主题 / 导航刻度 / 滚动揭示 / 部门切换
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* Themed <meta theme-color> */
  function syncMeta() {
    var m = $('meta[name="theme-color"]');
    if (!m) return;
    m.setAttribute("content", root.dataset.theme === "dark" ? "#11181b" : "#e8e5e1");
  }

  /* ─────────────── 1. 主题 ─────────────── */
  var THEME_KEY = "sitmc.theme";
  function applyStoredTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === "dark" || saved === "light") {
      root.dataset.theme = saved;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.dataset.theme = "dark";
    }
    syncMeta();
  }
  applyStoredTheme();

  var themeBtn = $("#themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      syncMeta();
    });
  }

  /* ─────────────── 2. 接入序列 ─────────────── */
  var boot    = $("#boot");
  var bootBar = $("#bootBar");
  var bootPct = $("#bootPct");
  var bootSkip= $("#bootSkip");
  var BOOT_KEY = "sitmc.booted";
  var bootPlayed = false;
  try { bootPlayed = sessionStorage.getItem(BOOT_KEY) === "1"; } catch (e) {}

  // 深链参数：?noboot=1 跳过接入序列（便于分享直链与对照截图）
  var params = new URLSearchParams(window.location.search);
  if (params.has("noboot")) bootPlayed = true;
  var deepLink = (params.get("s") || "").replace(/[^a-z0-9_-]/gi, "");

  function endBoot() {
    if (!boot || boot.classList.contains("is-done")) return;
    boot.classList.add("is-done");
    document.body.classList.remove("is-locked");
    try { sessionStorage.setItem(BOOT_KEY, "1"); } catch (e) {}
    window.setTimeout(function () {
      if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    }, 700);
  }

  function runBoot() {
    if (!boot) return;

    // 重访或减少动态效果：直接跳过
    if (bootPlayed || REDUCED) {
      boot.classList.add("is-done");
      window.setTimeout(function () {
        if (boot.parentNode) boot.parentNode.removeChild(boot);
      }, 60);
      return;
    }

    document.body.classList.add("is-locked");

    var lines = $$("[data-boot-line]", boot);
    var total = 2400;
    var start = performance.now();
    var lineStep = total / (lines.length + 0.6);
    var shown = 0;

    function tick(now) {
      var t = Math.min(1, (now - start) / total);
      // 缓动，末尾收束
      var eased = t < 0.85 ? t * 1.06 : 0.901 + (t - 0.85) * 0.66;
      var p = Math.min(1, eased);
      var pct = Math.round(p * 100);
      if (bootBar) bootBar.style.width = pct + "%";
      if (bootPct) bootPct.textContent = (pct < 10 ? "00" : pct < 100 ? "0" : "") + pct + " %";

      var want = Math.min(lines.length, Math.floor((now - start) / lineStep) + 1);
      while (shown < want) {
        if (lines[shown]) lines[shown].classList.add("is-on");
        shown++;
      }

      if (p < 1) {
        window.requestAnimationFrame(tick);
      } else {
        lines.forEach(function (l) { l.classList.add("is-on"); });
        window.setTimeout(endBoot, 420);
      }
    }
    window.requestAnimationFrame(tick);
    if (bootSkip) bootSkip.addEventListener("click", endBoot);
  }
  runBoot();

  /* ─────────────── 3. 时钟 ─────────────── */
  var clock = $("#clock");
  if (clock) {
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    var tickClock = function () {
      var d = new Date();
      clock.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    };
    tickClock();
    window.setInterval(tickClock, 1000);
  }

  /* ─────────────── 4. 吸顶 + 滚动进度 + 章节高亮 ─────────────── */
  var sitehead = $(".sitehead");
  var rail     = $("#rail");
  var railFill = $(".rail__fill", rail || document);
  var totop    = $("#totop");
  var navLinks = $$(".nav a");
  var railLinks= $$(".rail a");

  var sections = ["hero", "about", "projects", "pixelsit", "departments", "courses", "faq", "join"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  // 章节的文档坐标：offsetTop 对嵌套在定位容器内的章节不可靠（如 .finale 内的 #join）
  function docY(el) {
    return el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
  }

  var lastActive = null;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (sitehead) sitehead.classList.toggle("is-stuck", y > 40);
    if (totop) totop.classList.toggle("is-on", y > 700);

    var doc = document.documentElement;
    var max = (doc.scrollHeight - window.innerHeight) || 1;
    var ratio = Math.max(0, Math.min(1, y / max));
    if (railFill) railFill.style.height = (ratio * 100) + "%";

    // 当前章节：视口上方 30% 处所在章节（短屏也不会慢半拍）
    var probe = y + window.innerHeight * 0.30;
    var active = sections[0] ? sections[0].id : null;
    for (var i = 0; i < sections.length; i++) {
      if (docY(sections[i]) <= probe) active = sections[i].id;
    }

    // 页面到底时，末尾章节可能永远推不到探测线，此时以视口内可见的最后一个章节为准
    if (max - y < 8) {
      var bot = y + window.innerHeight - 8;
      for (var j = 0; j < sections.length; j++) {
        if (docY(sections[j]) <= bot) active = sections[j].id;
      }
    }

    if (active === lastActive) return;
    lastActive = active;

    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + active);
    });
    railLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.dataset.target === active);
    });
  }

  var rafPending = false;
  window.addEventListener("scroll", function () {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(function () { rafPending = false; onScroll(); });
  }, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  if (totop) {
    totop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
    });
  }

  /* ─────────────── 5. 移动端抽屉 ─────────────── */
  var burger = $("#burger");
  var drawer = $("#navDrawer");
  function closeDrawer() {
    if (!drawer || !burger) return;
    drawer.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "展开导航");
  }
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      if (open) { closeDrawer(); return; }
      drawer.hidden = false;
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "收起导航");
    });
    $$("a", drawer).forEach(function (a) { a.addEventListener("click", closeDrawer); });
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1000) closeDrawer();
    }, { passive: true });
  }

  /* ─────────────── 6. 滚动揭示 ─────────────── */
  var revealables = $$("[data-reveal]");
  if (REDUCED || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    revealables.forEach(function (el, i) {
      // 同一容器内的兄弟元素做轻微错峰
      el.style.transitionDelay = ((i % 4) * 70) + "ms";
      io.observe(el);
    });
  }

  /* ─────────────── 7. 进度条 ─────────────── */
  var progress = $(".progress");
  if (progress) {
    if (REDUCED || !("IntersectionObserver" in window)) {
      progress.classList.add("is-on");
    } else {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { progress.classList.add("is-on"); pio.disconnect(); }
        });
      }, { threshold: 0.4 });
      pio.observe(progress);
    }
  }

  /* ─────────────── 8. 部门切换 ─────────────── */
  var deptsRoot = $("#depts");
  if (deptsRoot) {
    var tabs   = $$(".dept-tab", deptsRoot);
    var panels = $$(".dept-panel", deptsRoot);

    function selectDept(idx) {
      tabs.forEach(function (t, i) {
        var on = i === idx;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, i) {
        var on = i === idx;
        p.hidden = !on;
        p.classList.toggle("is-on", on);
        if (on) {
          // 重放出现动画
          p.style.animation = "none";
          void p.offsetWidth;
          p.style.animation = "";
        }
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectDept(i); });
      tab.addEventListener("keydown", function (e) {
        var k = e.key;
        if (k !== "ArrowDown" && k !== "ArrowUp" && k !== "ArrowRight" && k !== "ArrowLeft") return;
        e.preventDefault();
        var dir = (k === "ArrowDown" || k === "ArrowRight") ? 1 : -1;
        var next = (i + dir + tabs.length) % tabs.length;
        selectDept(next);
        tabs[next].focus();
      });
    });
    selectDept(0);
  }

  /* ─────────────── 9. 锚点：补偿固定头部高度 ─────────────── */
  function headOffset() {
    var h = 34;
    if (sitehead) h += sitehead.offsetHeight;
    return h - 1;
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - headOffset();
      window.scrollTo({ top: Math.max(0, top), behavior: REDUCED ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", id);
    });
  });

  /* ─────────────── 10. FAQ 手风琴（一次只开一个） ─────────────── */
  var qas = $$(".qa");
  qas.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      qas.forEach(function (o) { if (o !== d && o.open) o.open = false; });
    });
  });

  /* ─────────────── 11. 深链定位 ?s=<section> ─────────────── */
  if (deepLink) {
    var jump = function () {
      var el = document.getElementById(deepLink);
      if (!el) return;
      var top = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - headOffset();
      // 临时关闭 CSS smooth，确保定位精确落点
      var prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, Math.max(0, top));
      root.style.scrollBehavior = prev;
      onScroll();
    };
    // 图片与字体可能改变版面高度，加载完成后重新校准
    window.addEventListener("load", function () {
      jump();
      window.requestAnimationFrame(jump);
      window.setTimeout(jump, 260);
    });
    window.setTimeout(jump, bootPlayed || REDUCED ? 60 : 3300);
  }
})();
