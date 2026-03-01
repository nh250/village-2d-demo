async function loadHouses() {
  const res = await fetch("data/houses.json");
  if (!res.ok) throw new Error("无法加载 houses.json");
  return await res.json();
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
  if (!house) {
    detail.innerHTML = `
      <h2 class="h3">房屋详情</h2>
      <p class="muted">请选择左侧任意房屋热区。</p>
    `;
    return;
  }

  const tags = (house.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  const photos = (house.photos || []).map((p, idx) => `
    <figure>
      <img src="${escapeHtml(p)}" alt="${escapeHtml(house.name)} 调研图片 ${idx + 1}" loading="lazy" />
    </figure>
  `).join("");

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

function setActiveHotspot(id) {
  document.querySelectorAll(".hs").forEach(a => {
    const isActive = a.dataset.id === id;
    if (isActive) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}

function wireHotspots(housesById) {
  const hotspots = document.getElementById("hotspots");

  hotspots.addEventListener("click", (e) => {
    const a = e.target.closest(".hs");
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.id;
    const house = housesById.get(id);
    setActiveHotspot(id);
    renderDetail(house);
    const sel = document.getElementById("houseSelect");
    if (sel) sel.value = id;
  });

  hotspots.addEventListener("keydown", (e) => {
    const a = e.target.closest(".hs");
    if (!a) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const id = a.dataset.id;
      const house = housesById.get(id);
      setActiveHotspot(id);
      renderDetail(house);
      const sel = document.getElementById("houseSelect");
      if (sel) sel.value = id;
    }
  });
}

function initSelect(houses, housesById) {
  const sel = document.getElementById("houseSelect");
  if (!sel) return;

  for (const h of houses) {
    const opt = document.createElement("option");
    opt.value = h.id;
    opt.textContent = `${h.id}｜${h.name ?? ""}`;
    sel.appendChild(opt);
  }

  sel.addEventListener("change", () => {
    const id = sel.value;
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
    const houses = await loadHouses();
    const housesById = new Map(houses.map(h => [h.id, h]));
    wireHotspots(housesById);
    initSelect(houses, housesById);
    renderDetail(null);
  } catch (err) {
    console.error(err);
    document.getElementById("detail").innerHTML = `
      <h2 class="h3">加载失败</h2>
      <p class="muted">请检查 data/houses.json 路径和内容格式。</p>
    `;
  }
})();