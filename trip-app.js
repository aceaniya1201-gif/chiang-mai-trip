(() => {
  "use strict";

  const STORAGE_KEY = new URLSearchParams(location.search).has("test")
    ? "chiang-mai-trip-planner-v2-test"
    : "chiang-mai-trip-planner-v2";
  const DEVICE_KEY = "chiang-mai-trip-device-v1";
  const SEED_UPDATED_AT = "2026-09-08T00:00:00.000Z";
  const dayCards = [...document.querySelectorAll(".day-card")];
  const dayNames = new Map(dayCards.map(card => [
    card.dataset.date,
    `${card.querySelector(".day-date")?.childNodes[0]?.textContent?.trim() || ""} ${card.querySelector(".day-title h3")?.textContent || ""}`
  ]));

  function uid(prefix) {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${id}`;
  }

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = uid("device");
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  function captureSeedEvents() {
    return dayCards.flatMap(card => [...card.querySelectorAll(".timeline > .event")].map((node, index) => ({
      trip_id: "",
      id: `base-${card.dataset.date}-${String(index + 1).padStart(2, "0")}`,
      day: card.dataset.date,
      position: (index + 1) * 100,
      time: node.querySelector("time")?.textContent.trim() || "12:00",
      title: node.querySelector("h4")?.textContent.trim() || "未命名行程",
      description: node.querySelector("p")?.textContent.trim() || "",
      links: [...node.querySelectorAll(".inline-actions a")].map(link => ({
        href: link.getAttribute("href") || "",
        label: link.textContent.trim(),
        kind: link.classList.contains("map-link") ? "map-link" : "soft-link",
        external: link.getAttribute("target") === "_blank"
      })),
      checked: false,
      deleted: false,
      updated_at: SEED_UPDATED_AT,
      updated_by: "seed"
    })));
  }

  const seedEvents = captureSeedEvents();
  let state = readStorage(STORAGE_KEY, null) || { version: 2, events: [], expenses: [], pending: { events: [], expenses: [] } };
  state.events = Array.isArray(state.events) ? state.events : [];
  state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
  state.pending = state.pending || { events: [], expenses: [] };
  state.pending.events = Array.isArray(state.pending.events) ? state.pending.events : [];
  state.pending.expenses = Array.isArray(state.pending.expenses) ? state.pending.expenses : [];

  seedEvents.forEach(seed => {
    if (!state.events.some(event => event.id === seed.id)) state.events.push(seed);
  });

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      showToast("本机存储空间不足，刚才的修改可能无法保留");
    }
  }

  function showToast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
      return;
    }
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function activeEvents(day) {
    return state.events
      .filter(event => !event.deleted && (!day || event.day === day))
      .sort((a, b) => Number(a.position) - Number(b.position) || a.id.localeCompare(b.id));
  }

  function activeExpenses(eventId) {
    return state.expenses.filter(expense => !expense.deleted && (!eventId || expense.event_id === eventId));
  }

  function totals(expenses) {
    return expenses.reduce((sum, expense) => {
      const currency = expense.currency === "CNY" ? "CNY" : "THB";
      sum[currency] += Number(expense.amount) || 0;
      return sum;
    }, { THB: 0, CNY: 0 });
  }

  function number(value) {
    return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value || 0);
  }

  function totalLabel(value) {
    return `฿${number(value.THB)} · ¥${number(value.CNY)}`;
  }

  function button(label, action, id, className = "event-action") {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.dataset.action = action;
    if (id) node.dataset.id = id;
    node.textContent = label;
    return node;
  }

  function safeLink(link) {
    if (!link?.href || (!link.href.startsWith("#") && !/^https?:\/\//i.test(link.href))) return null;
    const node = document.createElement("a");
    node.className = link.kind === "soft-link" ? "soft-link" : "map-link";
    node.href = link.href;
    node.textContent = link.label || "打开链接 ↗";
    if (link.external || /^https?:\/\//i.test(link.href)) {
      node.target = "_blank";
      node.rel = "noopener";
    }
    return node;
  }

  function renderExpenseRows(eventId, container) {
    const expenses = activeExpenses(eventId);
    if (!expenses.length) return;
    const list = document.createElement("div");
    list.className = "expense-list";
    expenses.forEach(expense => {
      const row = document.createElement("div");
      row.className = "expense-row";

      const info = document.createElement("span");
      info.className = "expense-note";
      info.textContent = [expense.category, expense.payer, expense.note].filter(Boolean).join(" · ");

      const amount = document.createElement("strong");
      amount.textContent = `${expense.currency === "CNY" ? "¥" : "฿"}${number(Number(expense.amount))}`;

      const tools = document.createElement("span");
      tools.className = "expense-tools";
      tools.append(
        button("编辑", "edit-expense", expense.id, "expense-mini-button"),
        button("删除", "delete-expense", expense.id, "expense-mini-button")
      );
      row.append(info, amount, tools);
      list.append(row);
    });
    container.append(list);
  }

  function renderEvent(event, position, count) {
    const article = document.createElement("article");
    article.className = `event${event.checked ? " is-checked" : ""}`;
    article.dataset.eventId = event.id;

    const time = document.createElement("time");
    time.textContent = event.time;
    const content = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = event.title;
    content.append(title);

    if (event.description) {
      const description = document.createElement("p");
      description.textContent = event.description;
      content.append(description);
    }

    const links = (Array.isArray(event.links) ? event.links : []).map(safeLink).filter(Boolean);
    if (links.length) {
      const inline = document.createElement("div");
      inline.className = "inline-actions";
      inline.append(...links);
      content.append(inline);
    }

    const actions = document.createElement("div");
    actions.className = "event-actions";
    const check = button(event.checked ? "✓ 已打卡" : "○ 标记打卡", "toggle-check", event.id, "event-action check");
    check.setAttribute("aria-pressed", String(Boolean(event.checked)));
    check.setAttribute("aria-label", `${event.title}：${event.checked ? "取消打卡" : "标记已打卡"}`);
    actions.append(check, button("＋ 记一笔", "add-expense", event.id, "event-action cost"));

    const tools = document.createElement("span");
    tools.className = "event-tools planner-edit-only";
    const up = button("↑", "move-up", event.id, "event-tool");
    const down = button("↓", "move-down", event.id, "event-tool");
    up.disabled = position === 0;
    down.disabled = position === count - 1;
    tools.append(up, down, button("编辑", "edit-event", event.id, "event-tool"), button("删除", "delete-event", event.id, "event-tool danger"));
    actions.append(tools);
    content.append(actions);
    renderExpenseRows(event.id, content);
    article.append(time, content);
    return article;
  }

  function augmentDaySummaries() {
    dayCards.forEach(card => {
      if (card.querySelector(".day-summary-meta")) return;
      const expand = card.querySelector(".expand-icon");
      const wrap = document.createElement("span");
      wrap.className = "day-summary-meta";
      const total = document.createElement("span");
      total.className = "day-total";
      total.dataset.totalFor = card.dataset.date;
      expand.replaceWith(wrap);
      wrap.append(total, expand);
    });
  }

  function render() {
    dayCards.forEach(card => {
      const events = activeEvents(card.dataset.date);
      const timeline = card.querySelector(".timeline");
      timeline.replaceChildren();
      if (!events.length) {
        const empty = document.createElement("div");
        empty.className = "timeline-empty";
        empty.textContent = "这一天还没有安排，留白也算一种行程。";
        timeline.append(empty);
      } else {
        events.forEach((event, index) => timeline.append(renderEvent(event, index, events.length)));
      }
      const add = button("＋ 给这一天加一个地方", "add-event", card.dataset.date, "add-event-button planner-edit-only");
      add.dataset.day = card.dataset.date;
      timeline.append(add);

      const eventIds = new Set(events.map(event => event.id));
      const dayExpenses = activeExpenses().filter(expense => eventIds.has(expense.event_id));
      const dayTotal = document.querySelector(`[data-total-for="${card.dataset.date}"]`);
      if (dayTotal) dayTotal.textContent = totalLabel(totals(dayExpenses));
    });

    document.getElementById("tripExpenseTotal").textContent = totalLabel(totals(activeExpenses().filter(expense => {
      const event = state.events.find(item => item.id === expense.event_id);
      return event && !event.deleted;
    })));
    saveState();
    if (typeof window.updateTime === "function") window.updateTime();
  }

  function markPending(kind, id) {
    if (!state.pending[kind].includes(id)) state.pending[kind].push(id);
  }

  function changeRow(kind, row) {
    row.updated_at = new Date().toISOString();
    row.updated_by = deviceId;
    const collection = kind === "events" ? state.events : state.expenses;
    const index = collection.findIndex(item => item.id === row.id);
    if (index >= 0) collection[index] = row;
    else collection.push(row);
    markPending(kind, row.id);
    render();
    remoteSync.schedule();
  }

  const eventDialog = document.getElementById("eventDialog");
  const eventForm = document.getElementById("eventForm");
  const expenseDialog = document.getElementById("expenseDialog");
  const expenseForm = document.getElementById("expenseForm");

  function populateDayOptions() {
    const select = document.getElementById("eventDay");
    select.replaceChildren(...dayCards.map(card => {
      const option = document.createElement("option");
      option.value = card.dataset.date;
      option.textContent = dayNames.get(card.dataset.date);
      return option;
    }));
  }

  function eventMapUrl(event) {
    return (event?.links || []).find(link => link.kind === "map-link" && /^https?:\/\//i.test(link.href))?.href || "";
  }

  function openEventDialog(event, day) {
    eventForm.reset();
    populateDayOptions();
    document.getElementById("eventDialogTitle").textContent = event ? "编辑这个安排" : "添加一个安排";
    document.getElementById("eventId").value = event?.id || "";
    document.getElementById("eventDay").value = event?.day || day;
    document.getElementById("eventTime").value = event?.time || "12:00";
    document.getElementById("eventTitle").value = event?.title || "";
    document.getElementById("eventDescription").value = event?.description || "";
    document.getElementById("eventMapUrl").value = eventMapUrl(event);
    eventDialog.showModal();
    setTimeout(() => document.getElementById("eventTitle").focus(), 50);
  }

  function openExpenseDialog(eventId, expense) {
    expenseForm.reset();
    const event = state.events.find(item => item.id === eventId);
    document.getElementById("expenseDialogTitle").textContent = expense ? "编辑这笔花费" : `记一笔 · ${event?.title || "行程"}`;
    document.getElementById("expenseId").value = expense?.id || "";
    document.getElementById("expenseEventId").value = eventId;
    document.getElementById("expenseAmount").value = expense?.amount || "";
    document.getElementById("expenseCurrency").value = expense?.currency || "THB";
    document.getElementById("expenseCategory").value = expense?.category || "餐饮";
    document.getElementById("expensePayer").value = expense?.payer || "小5";
    document.getElementById("expenseNote").value = expense?.note || "";
    expenseDialog.showModal();
    setTimeout(() => document.getElementById("expenseAmount").focus(), 50);
  }

  function updateMapLink(links, url) {
    const next = Array.isArray(links) ? links.map(link => ({ ...link })) : [];
    const mapIndex = next.findIndex(link => link.kind === "map-link");
    if (!url) {
      if (mapIndex >= 0) next.splice(mapIndex, 1);
      return next;
    }
    const mapLink = { href: url, label: "Google Maps ↗", kind: "map-link", external: true };
    if (mapIndex >= 0) next[mapIndex] = mapLink;
    else next.unshift(mapLink);
    return next;
  }

  eventForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(eventForm);
    const id = form.get("eventId") || uid("event");
    const original = state.events.find(item => item.id === id);
    const day = String(form.get("day"));
    const sameDay = original?.day === day;
    const position = sameDay
      ? original.position
      : (Math.max(0, ...activeEvents(day).map(item => Number(item.position))) + 100);
    const row = {
      ...(original || {}),
      id,
      day,
      position,
      time: String(form.get("time")),
      title: String(form.get("title")).trim(),
      description: String(form.get("description")).trim(),
      links: updateMapLink(original?.links, String(form.get("mapUrl")).trim()),
      checked: original?.checked || false,
      deleted: false
    };
    changeRow("events", row);
    eventDialog.close();
    showToast(original ? "行程已更新" : "新行程已加入");
  });

  expenseForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(expenseForm);
    const id = form.get("expenseId") || uid("expense");
    const original = state.expenses.find(item => item.id === id);
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) return;
    changeRow("expenses", {
      ...(original || {}),
      id,
      event_id: String(form.get("eventId")),
      amount,
      currency: String(form.get("currency")) === "CNY" ? "CNY" : "THB",
      category: String(form.get("category")),
      payer: String(form.get("payer")),
      note: String(form.get("note")).trim(),
      deleted: false
    });
    expenseDialog.close();
    showToast(original ? "花费已更新" : "花费已记下");
  });

  document.querySelectorAll("[data-close-dialog]").forEach(node => node.addEventListener("click", () => node.closest("dialog").close()));
  [eventDialog, expenseDialog].forEach(dialog => dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  }));

  function moveEvent(id, direction) {
    const event = state.events.find(item => item.id === id);
    if (!event) return;
    const events = activeEvents(event.day);
    const index = events.findIndex(item => item.id === id);
    if (direction < 0 && index > 0) {
      event.position = index === 1 ? Number(events[0].position) - 100 : (Number(events[index - 2].position) + Number(events[index - 1].position)) / 2;
    } else if (direction > 0 && index < events.length - 1) {
      event.position = index === events.length - 2 ? Number(events.at(-1).position) + 100 : (Number(events[index + 1].position) + Number(events[index + 2].position)) / 2;
    } else return;
    changeRow("events", { ...event });
  }

  document.getElementById("days").addEventListener("click", event => {
    const target = event.target.closest("button[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === "add-event") return openEventDialog(null, target.dataset.day);
    const row = state.events.find(item => item.id === id);
    if (action === "toggle-check" && row) {
      changeRow("events", { ...row, checked: !row.checked });
      showToast(row.checked ? "已取消打卡" : "打卡成功 ✓");
    } else if (action === "add-expense") openExpenseDialog(id, null);
    else if (action === "edit-event" && row) openEventDialog(row);
    else if (action === "delete-event" && row && confirm(`删除“${row.title}”吗？已记录的相关花费也会从合计中隐藏。`)) {
      changeRow("events", { ...row, deleted: true });
      showToast("行程已删除");
    } else if (action === "move-up") moveEvent(id, -1);
    else if (action === "move-down") moveEvent(id, 1);
    else if (action === "edit-expense") {
      const expense = state.expenses.find(item => item.id === id);
      if (expense) openExpenseDialog(expense.event_id, expense);
    } else if (action === "delete-expense") {
      const expense = state.expenses.find(item => item.id === id);
      if (expense && confirm("删除这笔花费吗？")) {
        changeRow("expenses", { ...expense, deleted: true });
        showToast("花费已删除");
      }
    }
  });

  const editButton = document.getElementById("editTripButton");
  editButton.addEventListener("click", () => {
    const editing = !document.body.classList.contains("planner-editing");
    document.body.classList.toggle("planner-editing", editing);
    editButton.setAttribute("aria-pressed", String(editing));
    editButton.textContent = editing ? "✓ 完成编辑" : "✎ 编辑行程";
    showToast(editing ? "现在可以增删、调整顺序" : "编辑已收起");
  });

  const syncConfig = window.CHIANG_MAI_SYNC || {};
  const syncStatus = document.getElementById("syncStatus");
  const syncFactStatus = document.getElementById("syncFactStatus");
  const configured = Boolean(syncConfig.supabaseUrl && syncConfig.supabaseAnonKey && syncConfig.tripId);

  function setSyncStatus(label, value, fact) {
    syncStatus.dataset.state = value;
    syncStatus.querySelector("span:last-child").textContent = label;
    if (fact) syncFactStatus.textContent = fact;
  }

  function remoteRow(row) {
    return { ...row, trip_id: syncConfig.tripId };
  }

  function cleanRemoteEvent(row) {
    return { ...row, position: Number(row.position), links: Array.isArray(row.links) ? row.links : [] };
  }

  function cleanRemoteExpense(row) {
    return { ...row, amount: Number(row.amount) };
  }

  const remoteSync = {
    timer: null,
    busy: false,
    configured,
    schedule() {
      clearTimeout(this.timer);
      if (configured) this.timer = setTimeout(() => this.run(), 500);
      else setSyncStatus("仅本机 · 云端待配置", "local", "本机记录已开启");
    },
    async request(path, options = {}) {
      const base = String(syncConfig.supabaseUrl).replace(/\/$/, "");
      const response = await fetch(`${base}/rest/v1/${path}`, {
        ...options,
        headers: {
          apikey: syncConfig.supabaseAnonKey,
          Authorization: `Bearer ${syncConfig.supabaseAnonKey}`,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
      if (!response.ok) throw new Error(`Cloud request failed: ${response.status}`);
      if (response.status === 204 || response.headers.get("content-length") === "0") return [];
      return response.json();
    },
    async seed() {
      await this.request("trip_events?on_conflict=trip_id,id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(seedEvents.map(remoteRow))
      });
    },
    async push(kind) {
      const ids = [...state.pending[kind]];
      if (!ids.length) return;
      const rows = (kind === "events" ? state.events : state.expenses)
        .filter(row => ids.includes(row.id))
        .map(remoteRow);
      if (!rows.length) return;
      const table = kind === "events" ? "trip_events" : "trip_expenses";
      const returned = await this.request(`${table}?on_conflict=trip_id,id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(rows)
      });
      const collection = kind === "events" ? state.events : state.expenses;
      returned.forEach(remote => {
        const normalized = kind === "events" ? cleanRemoteEvent(remote) : cleanRemoteExpense(remote);
        const index = collection.findIndex(row => row.id === normalized.id);
        if (index >= 0) collection[index] = normalized;
      });
      state.pending[kind] = state.pending[kind].filter(id => !ids.includes(id));
    },
    async pull() {
      const trip = encodeURIComponent(syncConfig.tripId);
      const [events, expenses] = await Promise.all([
        this.request(`trip_events?trip_id=eq.${trip}&select=*`),
        this.request(`trip_expenses?trip_id=eq.${trip}&select=*`)
      ]);
      events.forEach(remote => {
        if (state.pending.events.includes(remote.id)) return;
        const row = cleanRemoteEvent(remote);
        const index = state.events.findIndex(item => item.id === row.id);
        if (index >= 0) state.events[index] = row;
        else state.events.push(row);
      });
      expenses.forEach(remote => {
        if (state.pending.expenses.includes(remote.id)) return;
        const row = cleanRemoteExpense(remote);
        const index = state.expenses.findIndex(item => item.id === row.id);
        if (index >= 0) state.expenses[index] = row;
        else state.expenses.push(row);
      });
    },
    async run(manual = false) {
      if (!configured) {
        setSyncStatus("仅本机 · 云端待配置", "local", "本机记录已开启");
        if (manual) showToast("云端同步还需要配置 Supabase");
        return;
      }
      if (this.busy) return;
      if (!navigator.onLine) {
        setSyncStatus("离线 · 恢复网络后同步", "error", "离线记录中");
        return;
      }
      this.busy = true;
      setSyncStatus("正在同步…", "syncing", "正在同步五台手机");
      try {
        await this.seed();
        await this.push("events");
        await this.push("expenses");
        await this.pull();
        render();
        setSyncStatus("五人云端已同步", "synced", "五人云端同步已开启");
        if (manual) showToast("已和云端同步");
      } catch (error) {
        console.error(error);
        setSyncStatus("同步失败 · 记录仍在本机", "error", "云端暂时未连接");
        if (manual) showToast("云端暂时连不上，本机记录没有丢失");
      } finally {
        this.busy = false;
      }
    },
    start() {
      if (!configured) {
        setSyncStatus("仅本机 · 云端待配置", "local", "本机记录已开启");
        return;
      }
      this.run();
      setInterval(() => this.run(), Number(syncConfig.pollIntervalMs) || 8000);
    }
  };

  document.getElementById("syncNowButton").addEventListener("click", () => remoteSync.run(true));
  window.addEventListener("online", () => remoteSync.run());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) remoteSync.run();
  });

  function upcomingEvents() {
    return activeEvents()
      .filter(event => !event.checked)
      .map(event => {
        const offset = event.day === "2026-09-25" && event.time < "21:00" ? "+08:00" : "+07:00";
        const dateObject = new Date(`${event.day}T${event.time}:00${offset}`);
        const [, month, day] = event.day.split("-");
        return { ...event, dateObject, date: `${Number(month)}月${Number(day)}日 · 清迈行程` };
      })
      .sort((a, b) => a.dateObject - b.dateObject);
  }

  augmentDaySummaries();
  window.tripPlanner = { upcomingEvents, syncNow: () => remoteSync.run(true) };
  render();
  remoteSync.start();
})();
