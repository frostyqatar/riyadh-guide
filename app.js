/* Riyadh directory — tabs, search, filters, sort. No dependencies. */
(function () {
  var D = window.DATA || { rows: [], counts: {}, datasets: [] };
  var rows = D.rows;

  var state = {
    ds: D.datasets.length ? D.datasets[0].key : "eat",
    q: "",
    min: 0,
    kind: null,
    line: null,
    sort: "reviews",
    dir: "desc",
  };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  $("gen").textContent = D.generated || "";
  $("total").textContent = rows.length;
  $("ncat").textContent = (D.datasets || []).length;

  /* ------------------------------------------------------------------ tabs */
  var tabs = $("tabs");
  (D.datasets || []).forEach(function (d) {
    var b = document.createElement("button");
    b.className = "tab";
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.ds = d.key;
    b.innerHTML = esc(d.label) + ' <span class="n">' + (D.counts[d.key] || 0) + "</span>";
    b.onclick = function () {
      state.ds = d.key;
      state.kind = null;
      state.line = null;
      render();
    };
    tabs.appendChild(b);
  });

  /* --------------------------------------------------------------- filters */
  document.querySelectorAll("#ratings button").forEach(function (b) {
    b.onclick = function () {
      state.min = parseFloat(b.dataset.min);
      document.querySelectorAll("#ratings button").forEach(function (x) {
        x.setAttribute("aria-pressed", String(x === b));
      });
      render();
    };
  });

  document.querySelectorAll("#sorts button").forEach(function (b) {
    b.onclick = function () {
      state.sort = b.dataset.sort;
      document.querySelectorAll("#sorts button").forEach(function (x) {
        x.setAttribute("aria-pressed", String(x === b));
      });
      render();
    };
  });

  $("q").addEventListener("input", function (e) {
    state.q = e.target.value.trim().toLowerCase();
    render();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== $("q")) {
      e.preventDefault();
      $("q").focus();
    }
    if (e.key === "Escape") { $("q").value = ""; state.q = ""; render(); }
  });

  /* ---------------------------------------------------------------- render */
  function datasetRows() {
    return rows.filter(function (r) { return r.ds === state.ds; });
  }

  function renderChips(base) {
    var chips = $("chips");
    chips.innerHTML = "";

    // the metro tab filters by line, not by kind
    if (state.ds === "metro") {
      var lines = {};
      base.forEach(function (r) {
        (r.lines || "").split("+").forEach(function (l) {
          if (l) lines[l] = (lines[l] || 0) + 1;
        });
      });
      var order = ["Blue", "Red", "Orange", "Yellow", "Green", "Purple"];
      var names = Object.keys(lines).sort(function (a, b) {
        return order.indexOf(a) - order.indexOf(b);
      });
      var all0 = document.createElement("button");
      all0.className = "chip";
      all0.type = "button";
      all0.textContent = "All lines";
      all0.setAttribute("aria-pressed", String(state.line === null));
      all0.onclick = function () { state.line = null; render(); };
      chips.appendChild(all0);
      names.forEach(function (k) {
        var c = document.createElement("button");
        c.className = "chip";
        c.type = "button";
        c.textContent = k + " " + lines[k];
        c.setAttribute("aria-pressed", String(state.line === k));
        c.onclick = function () { state.line = state.line === k ? null : k; render(); };
        chips.appendChild(c);
      });
      return;
    }

    var kinds = {};
    base.forEach(function (r) { if (r.kind) kinds[r.kind] = (kinds[r.kind] || 0) + 1; });
    var knames = Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a]; });
    if (knames.length < 2) return;

    var all = document.createElement("button");
    all.className = "chip";
    all.type = "button";
    all.textContent = "Everything";
    all.setAttribute("aria-pressed", String(state.kind === null));
    all.onclick = function () { state.kind = null; render(); };
    chips.appendChild(all);

    knames.slice(0, 12).forEach(function (k) {
      var c = document.createElement("button");
      c.className = "chip";
      c.type = "button";
      c.textContent = k + " " + kinds[k];
      c.setAttribute("aria-pressed", String(state.kind === k));
      c.onclick = function () { state.kind = state.kind === k ? null : k; render(); };
      chips.appendChild(c);
    });
  }

  function visible(base) {
    var q = state.q;
    return base.filter(function (r) {
      if (r.rating < state.min) return false;
      if (state.kind && r.kind !== state.kind) return false;
      if (state.line && (r.lines || "").split("+").indexOf(state.line) < 0) return false;
      if (!q) return true;
      return (r.name + " " + r.kind + " " + r.area + " " + (r.station || "") + " " +
              (r.lines || "") + " " + r.q).toLowerCase().indexOf(q) > -1;
    });
  }

  function renderHead(isMetro) {
    // [label, class, align, sortKey|null]
    var head = [["#", "rank", "", null], ["Place", "name", "", null],
                ["★", "rate", "r", "rating"], ["Reviews", "num", "r", "reviews"]];
    head = head.concat(isMetro
      ? [["Station", "station", "", null], ["Walk", "num", "r", null],
         ["Kind", "kind", "", null]]
      : [["Kind", "kind", "", null], ["Area", "area", "", null]]);

    $("thead").innerHTML = "<tr>" + head.map(function (c) {
      var cls = c[1] + (c[2] ? " " + c[2] : "");
      var attrs = "";
      if (c[3]) {
        attrs = ' data-sort="' + c[3] + '"';
        if (state.sort === c[3]) {
          attrs += state.dir === "asc" ? ' data-dir="asc"' : ' data-dir="desc"';
        }
      }
      return '<th class="' + cls + '"' + attrs + ">" + esc(c[0]) + "</th>";
    }).join("") + "</tr>";

    $("thead").querySelectorAll("th[data-sort]").forEach(function (th) {
      th.onclick = function () {
        var key = th.dataset.sort;
        if (state.sort === key) {
          state.dir = state.dir === "desc" ? "asc" : "desc";
        } else {
          state.sort = key;
          state.dir = "desc";
        }
        render();
      };
    });
  }

  function render() {
    var base = datasetRows();
    document.querySelectorAll(".tab").forEach(function (t) {
      t.setAttribute("aria-selected", String(t.dataset.ds === state.ds));
    });

    renderChips(base);
    var list = visible(base);

    list.sort(function (a, b) {
      var k = state.sort === "rating" ? "rating" : "reviews";
      var d = a[k] - b[k];
      if (d === 0) d = a.reviews - b.reviews;
      return state.dir === "asc" ? d : -d;
    });

    var isMetro = state.ds === "metro";
    renderHead(isMetro);

    var avg = list.length
      ? (list.reduce(function (s, r) { return s + r.rating; }, 0) / list.length).toFixed(2)
      : "—";
    $("meta").innerHTML = "<b>" + list.length + "</b> of " + base.length +
      " · average rating <b>" + avg + "</b>" +
      (state.kind ? " · showing only <b>" + esc(state.kind) + "</b>" : "");

    $("tbody").innerHTML = list.map(function (r, i) {
      // clicking a name opens Google Maps with that name in the search box
      var mapsHref = r.name
        ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(r.name)
        : r.url;
      var link = mapsHref
        ? '<a href="' + esc(mapsHref) + '" target="_blank" rel="noopener" ' +
          'title="Open in Google Maps">' + esc(r.name) + "</a>"
        : esc(r.name);
      var br = r.branches ? '<span class="br">+' + (r.branches - 1) + "</span>" : "";
      var cells = '<td class="rank">' + (i + 1) + "</td>" +
        '<td class="name">' + link + br + "</td>" +
        '<td class="rate' + (r.rating >= 4.9 ? " hi" : "") + '">' + r.rating.toFixed(1) + "</td>" +
        '<td class="num">' + r.reviews.toLocaleString() + "</td>";
      if (isMetro) {
        cells += '<td class="station">' + esc(r.station) +
          ' <span class="lines">' + esc(r.lines || "") + "</span></td>" +
          '<td class="num">' + (r.walk ? r.walk + " m" : "") + "</td>" +
          '<td class="kind">' + esc(r.kind) + "</td>";
      } else {
        cells += '<td class="kind">' + esc(r.kind) + "</td>" +
          '<td class="area" title="' + esc(r.area) + '">' +
          esc((r.area || "").slice(0, 34)) + "</td>";
      }
      return "<tr>" + cells + "</tr>";
    }).join("");

    $("empty").hidden = list.length > 0;

    // footer (with the CSV link) may not exist
    var ds = (D.datasets || []).filter(function (d) { return d.key === state.ds; })[0];
    var dl = $("dl");
    if (dl && ds) dl.href = "csv/" + ds.key + ".csv";
  }

  render();
})();
