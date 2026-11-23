/* Riyadh directory — tabs, search, filters, sort. No dependencies. */
(function () {
  var D = window.DATA || { rows: [], counts: {}, datasets: [] };
  var rows = D.rows;

  var state = {
    ds: D.datasets.length ? D.datasets[0].key : "eat",
    q: "",
    min: 0,
    kind: null,
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
    var kinds = {};
    base.forEach(function (r) { if (r.kind) kinds[r.kind] = (kinds[r.kind] || 0) + 1; });
    var names = Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a]; });
    chips.innerHTML = "";
    if (names.length < 2) return;

    var all = document.createElement("button");
    all.className = "chip";
    all.type = "button";
    all.textContent = "Everything";
    all.setAttribute("aria-pressed", String(state.kind === null));
    all.onclick = function () { state.kind = null; render(); };
    chips.appendChild(all);

    names.slice(0, 12).forEach(function (k) {
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
      if (!q) return true;
      return (r.name + " " + r.kind + " " + r.area + " " + (r.station || "") + " " +
              (r.lines || "") + " " + r.q).toLowerCase().indexOf(q) > -1;
    });
  }

  function renderHead(isMetro) {
    var cols = isMetro
      ? [["#", "rank", ""], ["Place", "name", ""], ["", "rate", "r"], ["Reviews", "num", "r"],
         ["Station", "station", ""], ["Walk", "num", "r"], ["Kind", "kind", ""]]
      : [["#", "rank", ""], ["Place", "name", ""], ["", "rate", "r"], ["Reviews", "num", "r"],
         ["Kind", "kind", ""], ["Area", "area", ""]];
    $("thead").innerHTML = "<tr>" + cols.map(function (c) {
      var cls = c[1] + (c[2] ? " " + c[2] : "");
      var arrow = (c[1] === "rate" || c[1] === "num")
        ? ' data-sort="' + (c[1] === "rate" ? "rating" : "reviews") + '"' : "";
      if (arrow && state.sort === (c[1] === "rate" ? "rating" : "reviews")) {
        arrow += state.dir === "asc" ? ' data-sort="asc"' : "";
      }
      return '<th class="' + cls + '"' + arrow + ">" + esc(c[0]) + "</th>";
    }).join("") + "</tr>";

    $("thead").querySelectorAll("th[data-sort]").forEach(function (th) {
      th.onclick = function () {
        var key = th.dataset.sort === "asc" ? "rating" : th.dataset.sort;
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
      var link = r.url
        ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + "</a>"
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
          '<td class="area" title="' + esc(r.area) + '">' + esc(r.area) + "</td>";
      }
      return "<tr>" + cells + "</tr>";
    }).join("");

    $("empty").hidden = list.length > 0;

    var ds = (D.datasets || []).filter(function (d) { return d.key === state.ds; })[0];
    $("dl").href = "csv/" + (ds ? ds.key : "eat") + ".csv";
  }

  render();
})();
