async function loadHouses() {
  // 加 no-store 避免 GitHub Pages / 浏览器缓存旧的 houses.json
  const res = await fetch("data/houses.json", { cache: "no-store" });
  if (!res.ok) throw new Error("无法加载 houses.json");
  const data = await res.json();

  // 兼容：既支持数组，也支持 { houses: [...] }
  return Array.isArray(data) ? data : (data.houses ?? []);
}

// 规范化 id：去空格 + 大写，避免 H001 / h001 / "H001 " 不一致
function normId(v) {
  return String(v ?? "").trim().toUpperCase();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderDetail(house) {
  const detail = document.getElementById("detail");
  if (!detail) return;

  if (!house) {
    detail.innerHTML = `
      <h2 class="h3">房屋详情</h2>
      <p class="muted">请选择左侧任意房屋热区。</p>
    `;
    return;
  }

  const tags = (house.tags || [])
    .map(t => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("");

  // 给图片加一个最轻量的 onerror 提示：不改变原意，只让你能看出哪张图缺失
  const photos = (house.photos || [])
    .map((p, idx) => {
      const src = escapeHtml(p);
      const alt = `${escapeHtml(house.name)} 调研图片 ${idx + 1}`;
      return `
        <figure>
          <img
            src="${src}"
            alt="${alt}"
            loading="lazy"
            onerror="this.outerHTML='<p class=&quot;muted&quot;>图片加载失败：${src}</p>';"
          />
        </figure>
      `;
    })
    .join("");

  detail.innerHTML = `
    <h2 class="h3">${escapeHtml(house.name)}</h2>
    <p class="muted"><strong>房屋ID：</strong>${escapeHtml(house.id)}</p>
    <div class="tags" aria-label="标签">${tags || `<span class="muted">（无）</span>`}</div>
    <p>${escapeHtml(house.summary || "")}</p>
    ${house.designIdeas ? `<p class="card subtle"><strong>设计建议：</strong> ${escapeHtml(house.designIdeas)}</p>` : ""}
    <h3 class="h4">调研图片</h3>
    ${photos || `<p class="muted">暂无图片（请补充上传）。</p>`}
  `;
}

function setActiveHotspot(idRaw) {
  const id = normId(idRaw);
  document.querySelectorAll(".hs").forEach(a => {
    const isActive = normId(a.dataset.id) === id && id;
    if (isActive) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}

function wireHotspots(housesById) {
  const hotspots = document.getElementById("hotspots");
  if (!hotspots) return;

  const handlePick = (idRaw) => {
    const id = normId(idRaw);
    if (!id) return;

    const house = housesById.get(id);
    setActiveHotspot(id);

    // 如果没找到对应数据，给一个友好提示（不改变原功能，只是防止空白）
    if (!house) {
      const detail = document.getElementById("detail");
      if (detail) {
        detail.innerHTML = `
          <h2 class="h3">房屋详情</h2>
          <p class="muted">未找到房屋数据：<strong>${escapeHtml(id)}</strong><br/>请检查 data-id 与 houses.json 的 id 是否一致（大小写/空格）。</p>
        `;
      }
    } else {
      renderDetail(house);
    }

    const sel = document.getElementById("houseSelect");
    if (sel) sel.value = id;
  };

  hotspots.addEventListener("click", (e) => {
    const a = e.target.closest(".hs");
    if (!a) return;
    e.preventDefault();
    handlePick(a.dataset.id);
  });

  hotspots.addEventListener("keydown", (e) => {
    const a = e.target.closest(".hs");
    if (!a) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePick(a.dataset.id);
    }
  });
}

function initSelect(houses, housesById) {
  const sel = document.getElementById("houseSelect");
  if (!sel) return;

  // ✅ 防止重复追加 option
  sel.innerHTML = `<option value="">— 请选择 —</option>`;

  // 统一 id 后排序（不改变内容，只是更整齐）
  const sorted = [...housesById.values()].sort((a, b) => a.id.localeCompare(b.id));

  for (const h of sorted) {
    const opt = document.createElement("option");
    opt.value = h.id;
    opt.textContent = `${h.id}｜${h.name ?? ""}`;
    sel.appendChild(opt);
  }

  sel.addEventListener("change", () => {
    const id = normId(sel.value);
    if (!id) {
      setActiveHotspot(null);
      renderDetail(null);
      return;
    }
    setActiveHotspot(id);
    renderDetail(housesById.get(id));
  });

  document.getElementById("clearBtn")?.addEventListener("click", () => {
    sel.value = "";
    setActiveHotspot(null);
    renderDetail(null);
  });
}

(async function main() {
  try {
    const housesRaw = await loadHouses();

    // ✅ 统一 id（不改变含义，只避免匹配失败）
    const houses = housesRaw
      .filter(h => h && h.id != null)
      .map(h => ({ ...h, id: normId(h.id) }));

    const housesById = new Map(houses.map(h => [h.id, h]));

    wireHotspots(housesById);
    initSelect(houses, housesById);
    renderDetail(null);
  } catch (err) {
    console.error(err);
    const detail = document.getElementById("detail");
    if (detail) {
      detail.innerHTML = `
        <h2 class="h3">加载失败</h2>
        <p class="muted">请检查 data/houses.json 路径和内容格式。</p>
      `;
    }
  }
})();
