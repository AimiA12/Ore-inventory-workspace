const STORAGE_KEY = "web_mining_inventory_piles_v1";
const SALE_PRICE_KEY = "web_mining_inventory_sale_prices_v1";
const SOLD_RECORDS_KEY = "web_mining_inventory_sold_records_v1";
const USER_KEY = "web_mining_inventory_account_v1";
const AUTH_ACCOUNTS_KEY = "web_mining_inventory_accounts_v1";

let supabaseClient = null;

const oreTypes = [
  { name: "铜矿", suggested: ["Cu", "Au", "Ag", "Mo", "Pb"], baseColor: "#8f4a2f" },
  { name: "铅锌矿", suggested: ["Pb", "Zn", "Ag", "Cd", "Cu"], baseColor: "#5e6670" },
  { name: "镍矿", suggested: ["Ni", "Co", "Cu", "Fe", "Cr"], baseColor: "#4f6f57" },
  { name: "锡矿", suggested: ["Sn", "W", "Cu", "Pb", "Zn"], baseColor: "#7b7066" },
  { name: "钨矿", suggested: ["W", "Mo", "Sn", "Bi", "Cu"], baseColor: "#4f4b46" },
  { name: "锂矿", suggested: ["Li2O", "Ta2O5", "Nb2O5", "Fe2O3", "K2O"], baseColor: "#d9c5a3" },
  { name: "金银矿", suggested: ["Au", "Ag", "Cu", "Pb", "Zn"], baseColor: "#b8892e" },
  { name: "铁矿", suggested: ["Fe", "Ti", "V", "S", "P"], baseColor: "#7c3f35" }
];

const metalMeta = {
  Cu: { name: "铜", color: "#c46b3d" },
  Pb: { name: "铅", color: "#68717a" },
  Zn: { name: "锌", color: "#9aa7b0" },
  Ag: { name: "银", color: "#c8d2d9" },
  Au: { name: "金", color: "#d4a62f" },
  Fe: { name: "铁", color: "#8b3f31" },
  S: { name: "硫", color: "#d7b23c" },
  As: { name: "砷", color: "#8a8c5f" },
  Mo: { name: "钼", color: "#58758c" },
  Ni: { name: "镍", color: "#5c8a68" },
  Co: { name: "钴", color: "#3f6f9e" },
  Sn: { name: "锡", color: "#8f8a83" },
  W: { name: "钨", color: "#4b4b4b" },
  Bi: { name: "铋", color: "#a1888f" },
  Cd: { name: "镉", color: "#b5a56c" },
  Sb: { name: "锑", color: "#71697a" },
  Cr: { name: "铬", color: "#37795f" },
  Li2O: { name: "氧化锂", color: "#d6b48a" },
  MgO: { name: "氧化镁", color: "#b7c7a3" },
  SiO2: { name: "二氧化硅", color: "#d2cec4" },
  Ta2O5: { name: "五氧化二钽", color: "#7f6c9d" },
  Nb2O5: { name: "五氧化二铌", color: "#6d83a3" },
  Fe2O3: { name: "三氧化二铁", color: "#a24b39" },
  K2O: { name: "氧化钾", color: "#c6a0c8" },
  Na2O: { name: "氧化钠", color: "#93bfd3" },
  Ti: { name: "钛", color: "#6e7f86" },
  V: { name: "钒", color: "#657d54" },
  P: { name: "磷", color: "#bd8d46" },
  Al2O3: { name: "三氧化二铝", color: "#c7b9a2" }
};

const unitOptions = ["%", "g/t"];
const rareGradeElements = ["AU", "AG", "PT", "PD", "RH", "IR", "RU", "OS"];

const state = {
  tab: "piles",
  view: "home",
  piles: [],
  selectedIds: [],
  salePrices: {},
  soldRecords: [],
  user: null,
  profile: null,
  loading: true,
  cloudReady: false,
  authMode: "login",
  activeRecordId: null,
  editingPileId: null,
  buyerName: "",
  pileForm: createEmptyPileForm(),
  assayDraft: { element: "", value: "", unit: "%" },
  draftAssays: []
};

function round(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const times = 10 ** digits;
  return Math.round(number * times) / times;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return round(value, 2).toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function normalizeElement(value) {
  const text = String(value || "").trim();
  const map = {
    cu: "Cu", pb: "Pb", zn: "Zn", ag: "Ag", au: "Au", fe: "Fe", s: "S", as: "As",
    mo: "Mo", ni: "Ni", co: "Co", sn: "Sn", w: "W", bi: "Bi", cd: "Cd", sb: "Sb",
    cr: "Cr", ti: "Ti", v: "V", p: "P", li2o: "Li2O", mgo: "MgO", sio2: "SiO2",
    ta2o5: "Ta2O5", nb2o5: "Nb2O5", fe2o3: "Fe2O3", k2o: "K2O", na2o: "Na2O",
    al2o3: "Al2O3"
  };
  return map[text.toLowerCase()] || text;
}

function inferUnit(element) {
  return rareGradeElements.includes(String(element || "").trim().toUpperCase()) ? "g/t" : "%";
}

function isRareElement(element, unit) {
  return unit === "g/t" || rareGradeElements.includes(String(element || "").trim().toUpperCase());
}

function kgPerTon(value, unit) {
  const number = toNumber(value);
  return unit === "%" ? number * 10 : number / 1000;
}

function formatDash(value, digits = 3) {
  const number = toNumber(value);
  return number ? String(round(number, digits)) : "-";
}

function getOreConfig(name) {
  return oreTypes.find((item) => item.name === name) || oreTypes[0];
}

function createEmptyPileForm() {
  return {
    name: "",
    oreType: "铜矿",
    dryWeightTon: "",
    wetWeightTon: "",
    moistureRate: "",
    purchaseCost: "",
    source: "",
    location: "",
    remark: ""
  };
}

function createDefaultPiles() {
  return [
    {
      id: "pile_cu_demo",
      name: "A区铜矿 001",
      oreType: "铜矿",
      source: "云南个旧 - 张总",
      location: "东侧堆场 2 号位",
      dryWeightTon: 118.569,
      wetWeightTon: 128.6,
      moistureRate: 7.8,
      purchaseCost: 240000,
      remark: "铜为主，银可计价。",
      assays: [
        { element: "Cu", value: 2.35, unit: "%" },
        { element: "Ag", value: 118, unit: "g/t" },
        { element: "Fe", value: 18.4, unit: "%" }
      ]
    },
    {
      id: "pile_ni_demo",
      name: "西场镍矿 111",
      oreType: "镍矿",
      source: "广西 - 老周",
      location: "原料棚 C3",
      dryWeightTon: 122,
      wetWeightTon: 0,
      moistureRate: 0,
      purchaseCost: 310000,
      remark: "",
      assays: [
        { element: "Ni", value: 1.82, unit: "%" },
        { element: "Co", value: 0.08, unit: "%" }
      ]
    }
  ];
}

function createDefaultSalePrices() {
  return { Cu: 68000, Ag: 14.53, Pb: 10500, Zn: 10500, Fe: 0, Ni: 128000, Co: 165000 };
}

function getSupabaseConfig() {
  const config = window.APP_CONFIG || {};
  return {
    url: String(config.SUPABASE_URL || "").trim(),
    anonKey: String(config.SUPABASE_ANON_KEY || "").trim()
  };
}

function setupSupabase() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !window.supabase) return false;
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  state.cloudReady = true;
  return true;
}

function isCloudMode() {
  return Boolean(state.cloudReady && supabaseClient);
}

function isMembershipActive() {
  if (!isCloudMode()) return true;
  if (!state.profile) return false;
  if (state.profile.membershipStatus !== "active") return false;
  if (!state.profile.membershipExpiresAt) return false;
  return new Date(state.profile.membershipExpiresAt).getTime() > Date.now();
}

function normalizeAuthEmail(account) {
  const value = String(account || "").trim();
  if (value.includes("@")) return value;
  const latinName = value.toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const safeName = latinName || `u_${Array.from(value).map((char) => char.codePointAt(0).toString(36)).join("_")}`;
  return `${safeName || "user"}@ore.local`;
}

function createId(prefix = "id") {
  return window.crypto?.randomUUID ? window.crypto.randomUUID() : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function dbToProfile(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    displayName: row.display_name || "",
    plan: row.plan || "monthly",
    membershipStatus: row.membership_status || "inactive",
    membershipExpiresAt: row.membership_expires_at || null
  };
}

function pileToDbRow(pile) {
  return {
    id: pile.id,
    user_id: state.user?.id,
    name: pile.name,
    ore_type: pile.oreType,
    source: pile.source || "",
    location: pile.location || "",
    dry_weight_ton: toNumber(pile.dryWeightTon),
    wet_weight_ton: toNumber(pile.wetWeightTon),
    moisture_rate: toNumber(pile.moistureRate),
    purchase_cost: toNumber(pile.purchaseCost),
    remark: pile.remark || "",
    assays: pile.assays || []
  };
}

function dbRowToPile(row) {
  return cleanPile({
    id: row.id,
    name: row.name,
    oreType: row.ore_type,
    source: row.source,
    location: row.location,
    dryWeightTon: row.dry_weight_ton,
    wetWeightTon: row.wet_weight_ton,
    moistureRate: row.moisture_rate,
    purchaseCost: row.purchase_cost,
    remark: row.remark,
    assays: row.assays || []
  });
}

function saleRecordToDbRow(record) {
  return {
    id: record.id,
    user_id: state.user?.id,
    buyer: record.buyer,
    sold_at: record.soldAtIso || new Date().toISOString(),
    pile_count: record.pileCount,
    pile_names: record.pileNames,
    piles: record.piles || [],
    rows: record.rows || [],
    total_dry_weight_ton: toNumber(record.totalDryWeightTon),
    total_purchase_cost: toNumber(record.totalPurchaseCost),
    total_revenue: toNumber(record.totalRevenue),
    total_profit: toNumber(record.totalProfit)
  };
}

function dbRowToSaleRecord(row) {
  return {
    id: row.id,
    buyer: row.buyer || "",
    soldAtIso: row.sold_at,
    soldAt: formatDateTime(new Date(row.sold_at)),
    pileCount: row.pile_count || 0,
    pileNames: row.pile_names || "",
    piles: row.piles || [],
    rows: row.rows || [],
    totalDryWeightTon: toNumber(row.total_dry_weight_ton),
    totalPurchaseCost: toNumber(row.total_purchase_cost),
    totalRevenue: toNumber(row.total_revenue),
    totalProfit: toNumber(row.total_profit)
  };
}

function dbRowsToSalePrices(rows) {
  return rows.reduce((map, row) => {
    map[row.element] = toNumber(row.price);
    return map;
  }, createDefaultSalePrices());
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readAccounts() {
  return readStorage(AUTH_ACCOUNTS_KEY, {});
}

function writeAccounts(accounts) {
  writeStorage(AUTH_ACCOUNTS_KEY, accounts);
}

function cleanPile(pile) {
  return {
    id: pile.id,
    name: pile.name,
    oreType: pile.oreType,
    source: pile.source || "",
    location: pile.location || "",
    dryWeightTon: toNumber(pile.dryWeightTon),
    wetWeightTon: toNumber(pile.wetWeightTon),
    moistureRate: toNumber(pile.moistureRate),
    purchaseCost: toNumber(pile.purchaseCost),
    remark: pile.remark || "",
    assays: (pile.assays || []).map((item) => ({
      element: normalizeElement(item.element),
      value: toNumber(item.value),
      unit: unitOptions.includes(item.unit) ? item.unit : inferUnit(item.element)
    }))
  };
}

function calculateDryWeight(pile) {
  if (toNumber(pile.dryWeightTon) > 0) return toNumber(pile.dryWeightTon);
  const wetWeightTon = toNumber(pile.wetWeightTon);
  const moistureRate = Math.min(Math.max(toNumber(pile.moistureRate), 0), 99.9);
  return wetWeightTon * (1 - moistureRate / 100);
}

function createVisualStyle(baseColor, assays) {
  const sorted = assays
    .filter((item) => item.kgPerTon > 0)
    .sort((a, b) => b.kgPerTon - a.kgPerTon)
    .slice(0, 4);
  if (!sorted.length) {
    return `background:radial-gradient(circle at 32% 18%, rgba(255,255,255,.34), transparent 22%),linear-gradient(135deg, ${baseColor}, #2c2520);`;
  }
  const main = sorted[0]?.color || baseColor;
  const second = sorted[1]?.color || baseColor;
  const third = sorted[2]?.color || "#2d2823";
  return `background:radial-gradient(circle at 30% 18%, rgba(255,255,255,.38), transparent 19%),radial-gradient(circle at 76% 72%, rgba(0,0,0,.3), transparent 28%),linear-gradient(118deg, ${main} 0%, ${baseColor} 30%, ${second} 52%, ${third} 72%, #2b2723 100%);`;
}

function enrichPile(pile) {
  const clean = cleanPile(pile);
  const oreConfig = getOreConfig(clean.oreType);
  const dryWeightTon = round(calculateDryWeight(clean), 3);
  const assays = clean.assays.map((item) => {
    const meta = metalMeta[item.element] || { name: item.element, color: "#7b6f63" };
    const rare = isRareElement(item.element, item.unit);
    const contentKgPerTon = kgPerTon(item.value, item.unit);
    const totalKg = dryWeightTon * contentKgPerTon;
    const contentTon = rare ? 0 : totalKg / 1000;
    const rareContentGram = rare ? dryWeightTon * item.value : 0;
    const price = toNumber(state.salePrices[item.element]);
    const revenue = rare ? rareContentGram * price : contentTon * price;
    return {
      ...item,
      elementName: meta.name,
      color: meta.color,
      rare,
      metalKind: `${meta.name} ${item.element}`,
      kgPerTon: round(contentKgPerTon, 4),
      contentTon: round(contentTon, 4),
      rareContentGram: round(rareContentGram, 3),
      price,
      revenue: round(revenue, 2)
    };
  });
  const totalRevenue = round(assays.reduce((sum, item) => sum + item.revenue, 0), 2);
  return {
    ...clean,
    dryWeightTon,
    assays,
    selected: state.selectedIds.includes(clean.id),
    sourceText: clean.source || "未填写",
    locationText: clean.location || "未填写",
    wetWeightText: clean.wetWeightTon ? `${clean.wetWeightTon} t` : "未填写",
    moistureText: clean.moistureRate ? `${round(clean.moistureRate, 2)}%` : "未填写",
    purchaseCostText: clean.purchaseCost ? `¥${money(clean.purchaseCost)}` : "未填写",
    totalRevenue,
    profit: round(totalRevenue - clean.purchaseCost, 2),
    visualStyle: createVisualStyle(oreConfig.baseColor, assays),
    assayBadges: assays.slice(0, 5)
  };
}

function enrichedPiles() {
  return state.piles.map(enrichPile);
}

function createSaleSummary() {
  const piles = enrichedPiles();
  const selectedPiles = piles.filter((pile) => state.selectedIds.includes(pile.id));
  const totalWetWeightTon = round(selectedPiles.reduce((sum, item) => sum + item.wetWeightTon, 0), 3);
  const totalDryWeightTon = round(selectedPiles.reduce((sum, item) => sum + item.dryWeightTon, 0), 3);
  const totalPurchaseCost = round(selectedPiles.reduce((sum, item) => sum + item.purchaseCost, 0), 2);
  const moistureRate = totalWetWeightTon ? round((1 - totalDryWeightTon / totalWetWeightTon) * 100, 2) : 0;
  const rows = [];

  selectedPiles.forEach((pile) => {
    pile.assays.forEach((assay) => {
      const price = toNumber(state.salePrices[assay.element]);
      const revenue = assay.rare ? assay.rareContentGram * price : assay.contentTon * price;
      rows.push({
        rowId: `${pile.id}_${assay.element}`,
        pileName: pile.name,
        metalKind: assay.metalKind,
        element: assay.element,
        color: assay.color,
        wetWeightText: pile.wetWeightTon ? String(round(pile.wetWeightTon, 3)) : "-",
        moistureText: pile.wetWeightTon ? String(round(pile.moistureRate, 2)) : "-",
        dryWeightText: String(round(pile.dryWeightTon, 3)),
        gradePercentText: assay.rare ? "-" : String(round(assay.value, 4)),
        rareGradeText: assay.rare ? String(round(assay.value, 4)) : "-",
        contentTonText: assay.rare ? "-" : formatDash(assay.contentTon, 4),
        rareContentGramText: assay.rare ? formatDash(assay.rareContentGram, 3) : "-",
        price,
        revenue: round(revenue, 2)
      });
    });
  });

  const totalRevenue = round(rows.reduce((sum, item) => sum + item.revenue, 0), 2);
  return {
    selectedPiles,
    selectedCount: selectedPiles.length,
    selectedNames: selectedPiles.map((item) => item.name).join("、"),
    totalWetWeightTon,
    totalDryWeightTon,
    totalWetText: totalWetWeightTon ? `${totalWetWeightTon} t` : "未填写",
    moistureText: totalWetWeightTon ? `${moistureRate}%` : "未填写",
    totalPurchaseCost,
    totalRevenue,
    totalProfit: round(totalRevenue - totalPurchaseCost, 2),
    rows
  };
}

function createProfileStats() {
  const buyerMap = {};
  state.soldRecords.forEach((record) => {
    const buyer = record.buyer || "未填写买家";
    if (!buyerMap[buyer]) buyerMap[buyer] = { buyer, count: 0, amount: 0, profit: 0 };
    buyerMap[buyer].count += 1;
    buyerMap[buyer].amount += toNumber(record.totalRevenue);
    buyerMap[buyer].profit += toNumber(record.totalProfit);
  });
  const buyers = Object.values(buyerMap).map((item) => ({
    ...item,
    amount: round(item.amount, 2),
    profit: round(item.profit, 2)
  }));
  return {
    transactionCount: state.soldRecords.length,
    buyerCount: buyers.length,
    totalAmount: round(state.soldRecords.reduce((sum, item) => sum + toNumber(item.totalRevenue), 0), 2),
    totalProfit: round(state.soldRecords.reduce((sum, item) => sum + toNumber(item.totalProfit), 0), 2),
    buyers,
    recentBuyers: buyers.slice(0, 6)
  };
}

function saveAll() {
  if (isCloudMode()) return;
  writeStorage(STORAGE_KEY, state.piles.map(cleanPile));
  writeStorage(SALE_PRICE_KEY, state.salePrices);
  writeStorage(SOLD_RECORDS_KEY, state.soldRecords);
  if (state.user) writeStorage(USER_KEY, state.user);
}

async function loadCloudState(user) {
  state.user = {
    id: user.id,
    account: user.user_metadata?.display_name || user.email || "",
    email: user.email || "",
    nickName: user.user_metadata?.display_name || user.email || "矿堆用户",
    accountInitial: (user.user_metadata?.display_name || user.email || "账").slice(0, 1).toUpperCase()
  };

  const { data: profile, error: profileError } = await supabaseClient
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  state.profile = dbToProfile(profile);

  if (!isMembershipActive()) {
    state.piles = [];
    state.salePrices = createDefaultSalePrices();
    state.soldRecords = [];
    return;
  }

  const [pilesResult, pricesResult, recordsResult] = await Promise.all([
    supabaseClient.from("mine_piles").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("user_sale_prices").select("*"),
    supabaseClient.from("sale_records").select("*").order("sold_at", { ascending: false })
  ]);
  if (pilesResult.error) throw pilesResult.error;
  if (pricesResult.error) throw pricesResult.error;
  if (recordsResult.error) throw recordsResult.error;
  state.piles = (pilesResult.data || []).map(dbRowToPile);
  state.salePrices = dbRowsToSalePrices(pricesResult.data || []);
  state.soldRecords = (recordsResult.data || []).map(dbRowToSaleRecord);
}

async function refreshCloudState() {
  if (!isCloudMode()) return;
  const { data } = await supabaseClient.auth.getUser();
  if (data?.user) await loadCloudState(data.user);
}

async function init() {
  state.loading = true;
  render();
  if (setupSupabase()) {
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user) await loadCloudState(data.session.user);
    } catch (error) {
      console.error(error);
      toast("云端数据加载失败，请稍后重试");
    } finally {
      state.loading = false;
      render();
    }
    return;
  }

  state.piles = readStorage(STORAGE_KEY, createDefaultPiles());
  state.salePrices = readStorage(SALE_PRICE_KEY, createDefaultSalePrices());
  state.soldRecords = readStorage(SOLD_RECORDS_KEY, []);
  state.user = readStorage(USER_KEY, null);
  state.loading = false;
  render();
}

function render() {
  document.getElementById("app").innerHTML = state.loading
    ? renderLoadingView()
    : state.user && !isMembershipActive()
      ? renderMembershipView()
      : state.user
    ? `
      <div class="layout">
        ${renderSidebar()}
        <main class="content">${renderContent()}</main>
        ${renderMobileTabs()}
      </div>
    `
    : renderLoginView();
  bindEvents();
}

function renderLoadingView() {
  return `<main class="auth-page"><section class="auth-panel simple-auth-panel"><div class="auth-logo-row"><div class="brand-mark"></div><div><div class="brand-title">矿堆账本</div><div class="brand-sub">正在连接云端数据</div></div></div></section></main>`;
}

function renderMembershipView() {
  const expiresText = state.profile?.membershipExpiresAt
    ? formatDateTime(new Date(state.profile.membershipExpiresAt))
    : "未开通";
  return `
    <main class="auth-page">
      <section class="auth-panel simple-auth-panel membership-panel">
        <div class="auth-logo-row">
          <div class="brand-mark"></div>
          <div>
            <div class="brand-title">会员待开通</div>
            <div class="brand-sub">账号已登录，等待管理员开通访问权限</div>
          </div>
        </div>
        <div class="membership-copy">
          <div>当前账号：${escapeHtml(state.user?.nickName || state.user?.email || "")}</div>
          <div>会员状态：${escapeHtml(state.profile?.membershipStatus || "inactive")}</div>
          <div>到期时间：${escapeHtml(expiresText)}</div>
        </div>
        <button class="primary-btn auth-submit" data-action="logout">退出登录</button>
      </section>
    </main>
  `;
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"></div>
        <div>
          <div class="brand-title">矿堆账本</div>
          <div class="brand-sub">Ore inventory workspace</div>
        </div>
      </div>
      <nav class="nav">
        ${navButton("piles", "库存工作台")}
        ${navButton("profile", "个人中心")}
      </nav>
    </aside>
  `;
}

function renderMobileTabs() {
  return `<nav class="mobile-tabs">${navButton("piles", "库存")}${navButton("profile", "我的")}</nav>`;
}

function navButton(key, label) {
  return `<button class="nav-btn ${state.tab === key && state.view === "home" ? "active" : ""}" data-action="switch-tab" data-tab="${key}"><span>${label}</span></button>`;
}

function renderContent() {
  if (state.view === "add") return renderAddView();
  if (state.view === "sale") return renderSaleView();
  if (state.tab === "profile") return renderProfileView();
  return renderHomeView();
}

function renderHomeView() {
  const piles = enrichedPiles();
  const totalRevenue = piles.reduce((sum, item) => sum + item.totalRevenue, 0);
  const activeMetals = new Set(piles.flatMap((pile) => pile.assays.map((assay) => assay.element))).size;
  return `
    <div class="topbar">
      <div>
        <div class="page-kicker">库存工作台</div>
        <h1 class="page-title">我的矿堆</h1>
        <div class="subtle">${activeMetals ? `已记录 ${activeMetals} 种金属/氧化物` : "还没有化验数据"}</div>
      </div>
      <div class="page-actions">
        <button class="primary-btn" data-action="go-add">新增矿堆</button>
      </div>
    </div>
    <section class="summary-bar">
      <div class="summary-item">
        <div class="summary-label">矿堆数</div>
        <div class="summary-value">${piles.length}</div>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <div class="summary-label">预计货值</div>
        <div class="summary-value money">¥${money(totalRevenue)}</div>
      </div>
    </section>
    ${piles.length ? `<section class="pile-grid">${piles.map(renderPileCard).join("")}</section>` : `<div class="empty">还没有矿堆。点击右上角新增第一批库存。</div>`}
    ${state.selectedIds.length ? renderActionBar() : ""}
    ${!state.selectedIds.length ? `<button class="mobile-fab" data-action="go-add" aria-label="新增矿堆">+</button>` : ""}
  `;
}

function renderPileCard(pile) {
  return `
    <article class="pile-card ${pile.selected ? "selected" : ""}" data-action="toggle-pile" data-id="${pile.id}">
      <div class="select-dot">${pile.selected ? "✓" : ""}</div>
      <div class="ore-visual">
        <div class="ore-heap" style="${pile.visualStyle}"></div>
        <div class="ore-ground"></div>
      </div>
      <div class="pile-body">
        <div class="pile-card-head">
          <div>
            <div class="pile-name">${escapeHtml(pile.name)}</div>
            <div class="pile-meta">${escapeHtml(pile.oreType)} · 干重 ${pile.dryWeightTon} t</div>
          </div>
        </div>
        <div class="info-grid">
          ${infoItem("收矿来源", pile.sourceText)}
          ${infoItem("堆放地点", pile.locationText)}
          ${infoItem("湿重", pile.wetWeightText)}
          ${infoItem("水分", pile.moistureText)}
          ${infoItem("购入价格", pile.purchaseCostText)}
        </div>
        <div class="card-foot">
          <div class="metal-tags">${pile.assayBadges.map((item) => `<span class="metal-tag" style="color:${item.color}">${item.element}</span>`).join("")}</div>
          <div><div class="pile-money">¥${money(pile.totalRevenue)}</div><div class="pile-profit">利润 ¥${money(pile.profit)}</div></div>
        </div>
      </div>
    </article>
  `;
}

function infoItem(label, value) {
  return `<div><div class="info-label">${label}</div><div class="info-value">${escapeHtml(value)}</div></div>`;
}

function renderActionBar() {
  return `
    <section class="action-bar">
      <div>
        <div class="action-copy">已选 ${state.selectedIds.length} 个矿堆</div>
      </div>
      <div class="action-buttons">
        <button class="danger-btn" data-action="delete-selected">删除</button>
        <button class="secondary-btn edit-btn" data-action="edit-selected">修改</button>
        <button class="gold-btn" data-action="go-sale">出售</button>
      </div>
    </section>
  `;
}

function renderAddView() {
  const suggestions = getOreConfig(state.pileForm.oreType).suggested;
  const isEditing = Boolean(state.editingPileId);
  return `
    <div class="screen-head">
      <button class="back-btn" data-action="go-home"><span>‹</span><span>‹</span><span>‹</span></button>
      <div><h1 class="page-title">${isEditing ? "修改矿堆" : "新增矿堆"}</h1><div class="subtle">干重优先，湿重和水分可选</div></div>
    </div>
    <section class="panel">
      <h2 class="section-title">矿堆信息</h2>
      <div class="form-grid">
        ${field("矿堆名称", `<input class="input" data-form="pile" data-field="name" value="${escapeAttr(state.pileForm.name)}" placeholder="如 铅锌矿 527">`)}
        ${field("矿种", `<select class="select" data-form="pile" data-field="oreType">${oreTypes.map((item) => `<option ${item.name === state.pileForm.oreType ? "selected" : ""}>${item.name}</option>`).join("")}</select>`)}
        ${field("干重 t", `<input class="input" type="number" step="0.001" data-form="pile" data-field="dryWeightTon" value="${escapeAttr(state.pileForm.dryWeightTon)}" placeholder="如有可优先填写">`)}
        ${field("购入价格 元", `<input class="input" type="number" step="0.01" data-form="pile" data-field="purchaseCost" value="${escapeAttr(state.pileForm.purchaseCost)}" placeholder="这批矿的购入总价">`)}
        ${field(`湿重 t <span class="optional">可选</span>`, `<input class="input" type="number" step="0.001" data-form="pile" data-field="wetWeightTon" value="${escapeAttr(state.pileForm.wetWeightTon)}" placeholder="将为您自动计算干重">`)}
        ${field(`水分 % <span class="optional">可选</span>`, `<input class="input" type="number" step="0.01" data-form="pile" data-field="moistureRate" value="${escapeAttr(state.pileForm.moistureRate)}" placeholder="将为您自动计算干重">`)}
        ${field(`收矿来源 <span class="optional">可选</span>`, `<input class="input" data-form="pile" data-field="source" value="${escapeAttr(state.pileForm.source)}" placeholder="客户 / 矿山 / 地区">`)}
        ${field(`堆放地点 <span class="optional">可选</span>`, `<input class="input" data-form="pile" data-field="location" value="${escapeAttr(state.pileForm.location)}" placeholder="仓库 / 堆场 / 车号">`)}
        ${field(`备注 <span class="optional">可选</span>`, `<textarea class="textarea" data-form="pile" data-field="remark" rows="1" placeholder="扣款风险、运输情况等">${escapeHtml(state.pileForm.remark)}</textarea>`, true)}
      </div>
    </section>
    <section class="panel">
      <h2 class="section-title">化验单</h2>
      <div class="subtle">常用元素可点选，其他可手动输入</div>
      <div class="suggest-list">${suggestions.map((item) => `<button class="suggest-chip" data-action="quick-element" data-element="${item}">${item}</button>`).join("")}</div>
      <div class="form-grid">
        ${field("金属 / 氧化物", `<input class="input" data-form="assay" data-field="element" value="${escapeAttr(state.assayDraft.element)}" placeholder="如 Cu、Ag、Li2O">`)}
        ${field("品位", `<input class="input" type="number" step="0.0001" data-form="assay" data-field="value" value="${escapeAttr(state.assayDraft.value)}" placeholder="0">`)}
        ${field("单位", `<select class="select" data-form="assay" data-field="unit">${unitOptions.map((unit) => `<option ${unit === state.assayDraft.unit ? "selected" : ""}>${unit}</option>`).join("")}</select>`)}
        <div class="field"><label class="label">&nbsp;</label><button class="secondary-btn" data-action="add-assay">加入化验项</button></div>
      </div>
      ${state.draftAssays.length ? `<div class="draft-list">${state.draftAssays.map((item) => `<div class="draft-row"><strong>${item.element}</strong><span>${item.value}${item.unit}</span><button class="icon-btn" data-action="remove-assay" data-element="${item.element}">×</button></div>`).join("")}</div>` : ""}
    </section>
    <div class="center-actions"><button class="primary-btn" data-action="save-pile">${isEditing ? "保存修改" : "保存矿堆"}</button></div>
  `;
}

function field(label, control, full = false) {
  return `<div class="field ${full ? "full" : ""}"><label class="label">${label}</label>${control}</div>`;
}

function renderSaleView() {
  const summary = createSaleSummary();
  return `
    <div class="screen-head">
      <button class="back-btn" data-action="go-home"><span>‹</span><span>‹</span><span>‹</span></button>
      <div><h1 class="page-title">出售核算</h1><div class="subtle">${escapeHtml(summary.selectedNames)}</div></div>
    </div>
    <section class="panel weight-panel">
      <div><div class="stat-label">总干重</div><div class="big-number">${summary.totalDryWeightTon} t</div></div>
      <div class="weight-side"><div>湿重 ${summary.totalWetText}</div><div>综合水分 ${summary.moistureText}</div><div>已选 ${summary.selectedCount} 个</div></div>
    </section>
    <section class="panel">
      <div class="form-grid">
        ${field("买家 / 收购公司", `<input class="input" id="buyerName" value="${escapeAttr(state.buyerName)}" placeholder="如 XX 金属贸易公司">`, true)}
      </div>
      ${createProfileStats().recentBuyers.length ? `<div class="metal-tags" style="margin-top:12px">${createProfileStats().recentBuyers.map((item) => `<button class="suggest-chip" data-action="use-buyer" data-buyer="${escapeAttr(item.buyer)}">${escapeHtml(item.buyer)}</button>`).join("")}</div>` : ""}
    </section>
    <div class="table-wrap">
      <table class="sale-table">
        <thead><tr><th class="pile-col">矿堆</th><th>金属种类</th><th>湿重 T</th><th>水分 %</th><th>干重 T</th><th>品位 %</th><th>稀有金属品位 g/T</th><th>含量 T</th><th>稀有金属含量 g</th><th>出售单价 元</th><th>总金额 元</th></tr></thead>
        <tbody>${summary.rows.map(renderSaleRow).join("")}</tbody>
      </table>
    </div>
    ${summary.rows.length ? "" : `<div class="empty">选中的矿堆还没有化验数据。</div>`}
    <section class="panel total-panel"><div>全部总价<div class="total-sub">购入 ¥${money(summary.totalPurchaseCost)}</div></div><div><strong>¥${money(summary.totalRevenue)}</strong><div class="total-sub">利润 ¥${money(summary.totalProfit)}</div></div></section>
    <div class="center-actions"><button class="primary-btn" data-action="complete-sale">已完成出售</button></div>
  `;
}

function renderSaleRow(row) {
  return `
    <tr>
      <td class="pile-col">${escapeHtml(row.pileName)}</td>
      <td><span class="metal-cell"><span class="dot" style="background:${row.color}"></span>${escapeHtml(row.metalKind)}</span></td>
      <td>${row.wetWeightText}</td>
      <td>${row.moistureText}</td>
      <td>${row.dryWeightText}</td>
      <td>${row.gradePercentText}</td>
      <td>${row.rareGradeText}</td>
      <td>${row.contentTonText}</td>
      <td>${row.rareContentGramText}</td>
      <td><input class="input price-input" type="number" step="0.01" data-price-element="${row.element}" value="${row.price}"></td>
      <td><strong>¥${money(row.revenue)}</strong></td>
    </tr>
  `;
}

function renderProfileView() {
  if (!state.user) return renderLoginView();
  const stats = createProfileStats();
  const activeRecord = state.soldRecords.find((item) => item.id === state.activeRecordId);
  return `
    <div class="topbar"><div><h1 class="page-title">个人中心</h1><div class="subtle">查看往期出售、交易次数和往来买家</div></div></div>
    <section class="profile-card">
      <div class="avatar">${escapeHtml(state.user.accountInitial || "账")}</div>
      <div class="profile-main"><div class="profile-name">${escapeHtml(state.user.nickName)}</div><div class="profile-sub">账号登录后可按用户保存交易记录</div></div>
      <button class="secondary-btn" data-action="logout">退出</button>
    </section>
    <section class="stats-grid">
      ${statCard("往来交易次数", stats.transactionCount)}
      ${statCard("往来买家", stats.buyerCount)}
      ${statCard("累计出售", `¥${money(stats.totalAmount)}`)}
      ${statCard("累计利润", `¥${money(stats.totalProfit)}`)}
    </section>
    ${activeRecord ? renderRecordDetail(activeRecord) : renderProfileLists(stats)}
  `;
}

function renderLoginView() {
  const isRegister = state.authMode === "register";
  return `
    <main class="auth-page">
      <section class="auth-showcase">
        <div class="auth-showcase-top">
          <div class="brand auth-brand">
            <div class="brand-mark"></div>
            <div>
              <div class="brand-title">矿堆账本</div>
              <div class="brand-sub">Ore inventory workspace</div>
            </div>
          </div>
          <div class="auth-badge">Inventory • Assay • Settlement</div>
        </div>
        <div class="auth-showcase-copy">
          <div class="page-kicker">矿业库存与出售核算</div>
          <h1>
            <span class="headline-main">每一批矿堆的品位、货值、利润</span>
            <span class="headline-sub">都让您一目了然~</span>
          </h1>
          <p>记录来源、地点、干湿重和化验项，出售时按金属品位自动生成核算表。</p>
        </div>
        <div class="login-ore-card">
          <div class="login-ore">
            <div class="login-ore-shine"></div>
          </div>
          <div>
            <div class="login-ore-title">A区铜矿 001</div>
            <div class="login-ore-meta">Cu / Ag / Fe · 干重 118.569 t</div>
          </div>
          <strong>¥392,764.55</strong>
        </div>
      </section>
      <section class="auth-panel simple-auth-panel">
        <div class="auth-logo-row">
          <div class="brand-mark"></div>
          <div>
            <div class="brand-title">矿堆账本</div>
            <div class="brand-sub">登录后进入库存工作台</div>
          </div>
        </div>

        <div>
          <h1 class="auth-simple-title">${isRegister ? "注册账号" : "账号登录"}</h1>
          <div class="subtle">${isRegister ? "创建账号后即可开始管理矿堆。" : "请输入账号密码进入系统。"}</div>
        </div>

        <div class="auth-tabs">
          <button class="${!isRegister ? "active" : ""}" data-action="switch-auth" data-mode="login">登录</button>
          <button class="${isRegister ? "active" : ""}" data-action="switch-auth" data-mode="register">注册</button>
        </div>

        <div class="auth-form">
          ${field("账号", `<input class="input" id="loginAccount" autocomplete="username" placeholder="账户邮箱 / 用户名">`, true)}
          ${field("密码", `<input class="input" id="loginPassword" type="password" autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="访问密钥">`, true)}
          ${isRegister ? field("确认密码", `<input class="input" id="loginPasswordConfirm" type="password" autocomplete="new-password" placeholder="确认访问密钥">`, true) : ""}
          <button class="primary-btn auth-submit" data-action="${isRegister ? "register" : "login"}">${isRegister ? "注册并进入" : "激活控制台"}</button>
        </div>

        <button class="auth-note" data-action="switch-auth" data-mode="${isRegister ? "login" : "register"}">
          ${isRegister ? "已有账号？返回登录" : "还没有账号？申请加入"}
        </button>
      </section>
    </main>
  `;
}

function statCard(label, value) {
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}

function renderProfileLists(stats) {
  return `
    <section class="panel">
      <h2 class="section-title">往来买家</h2>
      ${stats.buyers.length ? `<div class="buyer-list">${stats.buyers.map((item) => `<div class="buyer-row"><div><strong>${escapeHtml(item.buyer)}</strong><div class="subtle">${item.count} 次交易</div></div><strong>¥${money(item.amount)}</strong></div>`).join("")}</div>` : `<div class="empty">暂无往来买家。</div>`}
    </section>
    <section class="panel">
      <h2 class="section-title">往期出售矿堆</h2>
      ${state.soldRecords.length ? `<div class="record-list">${state.soldRecords.map(renderRecordCard).join("")}</div>` : `<div class="empty">暂无出售记录。</div>`}
    </section>
  `;
}

function renderRecordCard(record) {
  return `
    <article class="record-card" data-action="open-record" data-id="${record.id}">
      <div class="record-head"><div class="record-title">${escapeHtml(record.pileNames)}</div><div class="record-date">${record.soldAt}</div></div>
      <div class="record-grid">
        <div>买家：${escapeHtml(record.buyer)}</div>
        <div>矿堆：${record.pileCount} 个</div>
        <div>干重：${record.totalDryWeightTon} t</div>
        <div>出售：¥${money(record.totalRevenue)}</div>
        <div>购入：¥${money(record.totalPurchaseCost)}</div>
        <div>利润：¥${money(record.totalProfit)}</div>
      </div>
    </article>
  `;
}

function renderRecordDetail(record) {
  return `
    <section class="panel">
      <div class="screen-head"><button class="back-btn" data-action="close-record"><span>‹</span><span>‹</span><span>‹</span></button><div><h2 class="section-title">出售详情</h2><div class="subtle">${record.soldAt} · ${escapeHtml(record.buyer)}</div></div></div>
      <div class="record-grid">
        <div>矿堆：${escapeHtml(record.pileNames)}</div>
        <div>干重：${record.totalDryWeightTon} t</div>
        <div>出售：¥${money(record.totalRevenue)}</div>
        <div>购入：¥${money(record.totalPurchaseCost)}</div>
        <div>利润：¥${money(record.totalProfit)}</div>
        <div>矿堆数：${record.pileCount} 个</div>
      </div>
    </section>
    <div class="table-wrap">
      <table class="record-table">
        <thead><tr><th>矿堆</th><th>金属</th><th>干重T</th><th>品位%</th><th>稀有g/T</th><th>含量T</th><th>稀有g</th><th>单价</th><th>金额</th></tr></thead>
        <tbody>${record.rows.map((row) => `<tr><td>${escapeHtml(row.pileName)}</td><td>${escapeHtml(row.metalKind)}</td><td>${row.dryWeightText}</td><td>${row.gradePercentText}</td><td>${row.rareGradeText}</td><td>${row.contentTonText}</td><td>${row.rareContentGramText}</td><td>${row.price}</td><td>¥${money(row.revenue)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <section class="toolbar" style="justify-content:flex-start;margin-top:16px">
      <button class="secondary-btn" data-action="restore-record" data-id="${record.id}">恢复到库存</button>
      <button class="danger-btn" data-action="delete-record" data-id="${record.id}">删除记录</button>
    </section>
  `;
}

async function saveCloudSalePrice(element, price) {
  if (!isCloudMode() || !isMembershipActive()) return;
  const { error } = await supabaseClient
    .from("user_sale_prices")
    .upsert({ user_id: state.user.id, element, price: toNumber(price) });
  if (error) throw error;
}

async function saveCloudPile(pile) {
  if (!isCloudMode() || !isMembershipActive()) return;
  const { error } = await supabaseClient.from("mine_piles").upsert(pileToDbRow(pile));
  if (error) throw error;
}

async function deleteCloudPiles(ids) {
  if (!isCloudMode() || !isMembershipActive() || !ids.length) return;
  const { error } = await supabaseClient.from("mine_piles").delete().in("id", ids);
  if (error) throw error;
}

async function saveCloudSaleRecord(record) {
  if (!isCloudMode() || !isMembershipActive()) return;
  const { error } = await supabaseClient.from("sale_records").insert(saleRecordToDbRow(record));
  if (error) throw error;
}

async function deleteCloudSaleRecord(id) {
  if (!isCloudMode() || !isMembershipActive()) return;
  const { error } = await supabaseClient.from("sale_records").delete().eq("id", id);
  if (error) throw error;
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach((node) => {
    node.addEventListener("click", handleAction);
  });
  document.querySelectorAll("[data-form='pile']").forEach((node) => {
    node.addEventListener("input", (event) => {
      state.pileForm[event.target.dataset.field] = event.target.value;
      if (event.target.dataset.field === "oreType") render();
    });
    node.addEventListener("change", (event) => {
      state.pileForm[event.target.dataset.field] = event.target.value;
      if (event.target.dataset.field === "oreType") render();
    });
  });
  document.querySelectorAll("[data-form='assay']").forEach((node) => {
    node.addEventListener("input", handleAssayInput);
    node.addEventListener("change", handleAssayInput);
  });
  document.querySelectorAll("[data-price-element]").forEach((node) => {
    node.addEventListener("input", (event) => {
      state.salePrices[event.target.dataset.priceElement] = toNumber(event.target.value);
    });
    node.addEventListener("change", async (event) => {
      const element = event.target.dataset.priceElement;
      state.salePrices[element] = toNumber(event.target.value);
      try {
        await saveCloudSalePrice(element, state.salePrices[element]);
        saveAll();
        render();
      } catch (error) {
        console.error(error);
        toast("报价保存失败");
      }
    });
  });
  const buyerInput = document.getElementById("buyerName");
  if (buyerInput) buyerInput.addEventListener("input", (event) => { state.buyerName = event.target.value; });
}

function handleAssayInput(event) {
  const field = event.target.dataset.field;
  let value = event.target.value;
  if (field === "element") {
    const element = normalizeElement(value);
    state.assayDraft.element = value;
    state.assayDraft.unit = inferUnit(element);
    render();
    return;
  }
  state.assayDraft[field] = value;
}

async function handleAction(event) {
  event.preventDefault();
  const el = event.currentTarget;
  const action = el.dataset.action;
  try {
    if (action === "switch-tab") {
      state.tab = el.dataset.tab;
      state.view = "home";
      state.activeRecordId = null;
    }
    if (action === "go-add") startAddPile();
    if (action === "go-home") {
      state.view = "home";
      state.editingPileId = null;
    }
    if (action === "go-sale" && state.selectedIds.length) state.view = "sale";
    if (action === "toggle-pile") togglePile(el.dataset.id);
    if (action === "delete-selected") await deleteSelected();
    if (action === "edit-selected") editSelectedPile();
    if (action === "quick-element") quickElement(el.dataset.element);
    if (action === "add-assay") addAssay();
    if (action === "remove-assay") removeAssay(el.dataset.element);
    if (action === "save-pile") await savePile();
    if (action === "complete-sale") await completeSale();
    if (action === "switch-auth") state.authMode = el.dataset.mode || "login";
    if (action === "login") await login();
    if (action === "register") await register();
    if (action === "logout") await logout();
    if (action === "use-buyer") state.buyerName = el.dataset.buyer || "";
    if (action === "open-record") {
      state.activeRecordId = el.dataset.id;
      state.tab = "profile";
    }
    if (action === "close-record") state.activeRecordId = null;
    if (action === "restore-record") await restoreRecord(el.dataset.id);
    if (action === "delete-record") await deleteRecord(el.dataset.id);
    saveAll();
    render();
  } catch (error) {
    console.error(error);
    toast(error.message || "操作失败，请稍后重试");
  }
}

function togglePile(id) {
  state.selectedIds = state.selectedIds.includes(id)
    ? state.selectedIds.filter((item) => item !== id)
    : [...state.selectedIds, id];
}

function startAddPile() {
  state.editingPileId = null;
  state.pileForm = createEmptyPileForm();
  state.assayDraft = { element: "", value: "", unit: "%" };
  state.draftAssays = [];
  state.view = "add";
}

function editSelectedPile() {
  if (state.selectedIds.length !== 1) {
    toast("请选择 1 个矿堆修改");
    return;
  }
  const pile = state.piles.find((item) => item.id === state.selectedIds[0]);
  if (!pile) return;
  state.editingPileId = pile.id;
  state.pileForm = {
    name: pile.name || "",
    oreType: pile.oreType || oreTypes[0].name,
    dryWeightTon: pile.dryWeightTon || "",
    wetWeightTon: pile.wetWeightTon || "",
    moistureRate: pile.moistureRate || "",
    purchaseCost: pile.purchaseCost || "",
    source: pile.source || "",
    location: pile.location || "",
    remark: pile.remark || ""
  };
  state.draftAssays = (pile.assays || []).map((item) => ({ ...item }));
  state.assayDraft = { element: "", value: "", unit: "%" };
  state.view = "add";
}

async function deleteSelected() {
  if (!state.selectedIds.length) return;
  if (!confirm(`确认删除已选 ${state.selectedIds.length} 个矿堆？删除后不会进入往期出售记录。`)) return;
  await deleteCloudPiles(state.selectedIds);
  state.piles = state.piles.filter((pile) => !state.selectedIds.includes(pile.id));
  state.selectedIds = [];
  toast("已删除");
}

function quickElement(element) {
  state.assayDraft.element = normalizeElement(element);
  state.assayDraft.unit = inferUnit(element);
}

function addAssay() {
  const element = normalizeElement(state.assayDraft.element);
  if (!element || !state.assayDraft.value) {
    toast("请填写元素和品位");
    return;
  }
  state.draftAssays = [
    ...state.draftAssays.filter((item) => item.element !== element),
    { element, value: toNumber(state.assayDraft.value), unit: state.assayDraft.unit || inferUnit(element) }
  ];
  state.assayDraft = { element: "", value: "", unit: "%" };
}

function removeAssay(element) {
  state.draftAssays = state.draftAssays.filter((item) => item.element !== element);
}

async function savePile() {
  const form = state.pileForm;
  if (!form.dryWeightTon && !form.wetWeightTon) {
    toast("请填写干重或湿重");
    return;
  }
  const wasEditing = Boolean(state.editingPileId);
  const pile = {
    id: state.editingPileId || createId("pile"),
    name: form.name || `${form.oreType} ${state.piles.length + 1}`,
    oreType: form.oreType,
    source: form.source,
    location: form.location,
    dryWeightTon: toNumber(form.dryWeightTon),
    wetWeightTon: toNumber(form.wetWeightTon),
    moistureRate: toNumber(form.moistureRate),
    purchaseCost: toNumber(form.purchaseCost),
    remark: form.remark,
    assays: state.draftAssays
  };
  await saveCloudPile(pile);
  if (state.editingPileId) {
    state.piles = state.piles.map((item) => (item.id === state.editingPileId ? pile : item));
  } else {
    state.piles = [pile, ...state.piles];
  }
  state.selectedIds = [];
  state.editingPileId = null;
  state.pileForm = createEmptyPileForm();
  state.assayDraft = { element: "", value: "", unit: "%" };
  state.draftAssays = [];
  state.view = "home";
  toast(wasEditing ? "修改已保存" : "矿堆已保存");
}

async function completeSale() {
  const summary = createSaleSummary();
  if (!summary.rows.length) {
    toast("没有可出售的化验明细");
    return;
  }
  const buyer = String(state.buyerName || "").trim() || "未填写买家";
  const soldAt = new Date();
  const record = {
    id: createId("sale"),
    buyer,
    soldAtIso: soldAt.toISOString(),
    soldAt: formatDateTime(soldAt),
    pileCount: summary.selectedPiles.length,
    pileNames: summary.selectedPiles.map((item) => item.name).join("、"),
    piles: summary.selectedPiles.map(cleanPile),
    rows: summary.rows,
    totalDryWeightTon: summary.totalDryWeightTon,
    totalPurchaseCost: summary.totalPurchaseCost,
    totalRevenue: summary.totalRevenue,
    totalProfit: summary.totalProfit
  };
  await saveCloudSaleRecord(record);
  await deleteCloudPiles(state.selectedIds);
  state.soldRecords = [record, ...state.soldRecords];
  state.piles = state.piles.filter((pile) => !state.selectedIds.includes(pile.id));
  state.selectedIds = [];
  state.buyerName = "";
  state.view = "home";
  state.tab = "piles";
  toast("出售已完成");
}

async function login() {
  const account = document.getElementById("loginAccount")?.value.trim();
  const password = document.getElementById("loginPassword")?.value || "";
  if (!account || !password) {
    toast("请输入账号和密码");
    return;
  }
  if (password.length < 6) {
    toast("密码至少 6 位");
    return;
  }
  if (isCloudMode()) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: normalizeAuthEmail(account),
      password
    });
    if (error) {
      toast("账号或密码不正确");
      return;
    }
    await loadCloudState(data.user);
  } else {
    const accounts = readAccounts();
    if (!accounts[account]) {
      toast("账号不存在，请先注册");
      return;
    }
    if (accounts[account].password !== password) {
      toast("密码不正确");
      return;
    }
    state.user = {
      account,
      nickName: accounts[account].nickName || account,
      accountInitial: account.slice(0, 1).toUpperCase()
    };
  }
  toast("已登录");
}

async function register() {
  const account = document.getElementById("loginAccount")?.value.trim();
  const password = document.getElementById("loginPassword")?.value || "";
  const confirmPassword = document.getElementById("loginPasswordConfirm")?.value || "";
  if (!account || !password || !confirmPassword) {
    toast("请完整填写账号和密码");
    return;
  }
  if (password.length < 6) {
    toast("密码至少 6 位");
    return;
  }
  if (password !== confirmPassword) {
    toast("两次密码不一致");
    return;
  }
  if (isCloudMode()) {
    const { data, error } = await supabaseClient.auth.signUp({
      email: normalizeAuthEmail(account),
      password,
      options: { data: { display_name: account } }
    });
    if (error) {
      toast(error.message.includes("already") ? "账号已存在，请直接登录" : "注册失败，请稍后重试");
      return;
    }
    if (data.user) await loadCloudState(data.user);
  } else {
    const accounts = readAccounts();
    if (accounts[account]) {
      toast("账号已存在，请直接登录");
      return;
    }
    accounts[account] = {
      account,
      nickName: account,
      password,
      createdAt: new Date().toISOString()
    };
    writeAccounts(accounts);
    state.user = { account, nickName: account, accountInitial: account.slice(0, 1).toUpperCase() };
  }
  state.authMode = "login";
  toast("注册成功");
}

async function logout() {
  if (isCloudMode()) await supabaseClient.auth.signOut();
  localStorage.removeItem(USER_KEY);
  state.user = null;
  state.profile = null;
  state.piles = [];
  state.salePrices = createDefaultSalePrices();
  state.soldRecords = [];
  state.activeRecordId = null;
  state.tab = "piles";
  state.view = "home";
  state.authMode = "login";
}

async function restoreRecord(id) {
  const record = state.soldRecords.find((item) => item.id === id);
  if (!record) return;
  const restored = (record.piles || []).map((pile) => ({ ...pile, id: createId("pile") }));
  if (isCloudMode()) {
    for (const pile of restored) await saveCloudPile(pile);
    await deleteCloudSaleRecord(id);
  }
  state.piles = [...restored, ...state.piles];
  state.soldRecords = state.soldRecords.filter((item) => item.id !== id);
  state.activeRecordId = null;
  state.tab = "piles";
  state.view = "home";
  toast("已恢复到库存");
}

async function deleteRecord(id) {
  if (!confirm("确认删除这条出售记录？删除后不会恢复矿堆。")) return;
  await deleteCloudSaleRecord(id);
  state.soldRecords = state.soldRecords.filter((item) => item.id !== id);
  state.activeRecordId = null;
  toast("记录已删除");
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1800);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

init();
