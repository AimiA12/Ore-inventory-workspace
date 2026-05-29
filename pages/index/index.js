const STORAGE_KEY = "mining_inventory_piles_v3";
const SALE_PRICE_KEY = "mining_inventory_sale_prices_v2";
const SOLD_RECORDS_KEY = "mining_inventory_sold_records_v1";
const USER_PROFILE_KEY = "mining_inventory_account_user_v1";

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
const bottomTabs = [
  { key: "piles", label: "我的矿堆" },
  { key: "profile", label: "个人中心" }
];

function round(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const times = Math.pow(10, digits);
  return Math.round(number * times) / times;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function getOreConfig(name) {
  return oreTypes.find((item) => item.name === name) || oreTypes[0];
}

function kgPerTon(value, unit) {
  const number = toNumber(value);
  if (unit === "%") return number * 10;
  return number / 1000;
}

function formatDash(value, digits = 3) {
  const number = toNumber(value);
  return number ? String(round(number, digits)) : "-";
}

function createVisualStyle(baseColor, assays) {
  const sorted = assays
    .filter((item) => item.kgPerTon > 0)
    .sort((a, b) => b.kgPerTon - a.kgPerTon)
    .slice(0, 4);

  if (!sorted.length) {
    return `background:
      radial-gradient(circle at 32% 18%, rgba(255,255,255,.34), transparent 22%),
      linear-gradient(135deg, ${baseColor}, #2c2520);`;
  }

  const main = sorted[0] ? sorted[0].color : baseColor;
  const second = sorted[1] ? sorted[1].color : baseColor;
  const third = sorted[2] ? sorted[2].color : "#2d2823";

  return `background:
    radial-gradient(circle at 30% 18%, rgba(255,255,255,.38), transparent 19%),
    radial-gradient(circle at 76% 72%, rgba(0,0,0,.3), transparent 28%),
    linear-gradient(118deg, ${main} 0%, ${baseColor} 30%, ${second} 52%, ${third} 72%, #2b2723 100%);`;
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

function enrichPile(pile, selectedIds, salePrices) {
  const clean = cleanPile(pile);
  const oreConfig = getOreConfig(clean.oreType);
  const dryWeightTon = calculateDryWeight(clean);
  const assays = clean.assays.map((item) => {
    const meta = metalMeta[item.element] || { name: item.element, color: "#7b6f63" };
    const rare = isRareElement(item.element, item.unit);
    const contentKgPerTon = kgPerTon(item.value, item.unit);
    const totalKg = dryWeightTon * contentKgPerTon;
    const contentTon = rare ? 0 : totalKg / 1000;
    const rareContentGram = rare ? dryWeightTon * item.value : 0;
    const price = toNumber(salePrices[item.element]);
    const revenue = rare ? rareContentGram * price : contentTon * price;

    return {
      ...item,
      elementName: meta.name,
      color: meta.color,
      rare,
      metalKind: `${meta.name} ${item.element}`,
      gradeText: `${item.value}${item.unit}`,
      kgPerTon: round(contentKgPerTon, 4),
      totalKg: round(totalKg, 3),
      contentTon: round(contentTon, 4),
      rareContentGram: round(rareContentGram, 3),
      price,
      revenue: round(revenue, 2)
    };
  });
  const totalRevenue = assays.reduce((sum, item) => sum + item.revenue, 0);
  const profit = totalRevenue - clean.purchaseCost;

  return {
    ...clean,
    assays,
    selected: selectedIds.includes(clean.id),
    dryWeightTon: round(dryWeightTon, 3),
    moistureRate: round(clean.moistureRate, 2),
    sourceText: clean.source || "未填写",
    locationText: clean.location || "未填写",
    wetWeightText: clean.wetWeightTon ? `${clean.wetWeightTon} t` : "未填写",
    moistureText: clean.moistureRate ? `${round(clean.moistureRate, 2)}%` : "未填写",
    purchaseCostText: clean.purchaseCost ? `¥${round(clean.purchaseCost, 2)}` : "未填写",
    totalRevenue: round(totalRevenue, 2),
    profit: round(profit, 2),
    suggestedElements: oreConfig.suggested,
    visualStyle: createVisualStyle(oreConfig.baseColor, assays),
    assayBadges: assays.slice(0, 5)
  };
}

function createSaleSummary(piles, selectedIds, salePrices) {
  const selectedPiles = piles.filter((pile) => selectedIds.includes(pile.id));
  const totalWetWeightTon = round(selectedPiles.reduce((sum, item) => sum + item.wetWeightTon, 0), 3);
  const totalDryWeightTon = round(selectedPiles.reduce((sum, item) => sum + item.dryWeightTon, 0), 3);
  const totalPurchaseCost = round(selectedPiles.reduce((sum, item) => sum + item.purchaseCost, 0), 2);
  const moistureRate = totalWetWeightTon ? round((1 - totalDryWeightTon / totalWetWeightTon) * 100, 2) : 0;

  const rows = [];
  selectedPiles.forEach((pile) => {
    pile.assays.forEach((assay, assayIndex) => {
      const price = toNumber(salePrices[assay.element]);
      const revenue = assay.rare ? assay.rareContentGram * price : assay.contentTon * price;
      rows.push({
        rowId: `${pile.id}_${assay.element}`,
        pileName: assayIndex === 0 ? pile.name : "",
        pileNameGhost: false,
        pileNameFull: pile.name,
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
        revenue: round(revenue, 2),
        revenueText: String(round(revenue, 2))
      });
    });
  });

  if (selectedPiles.length === 1 && rows.length) {
    const middleIndex = Math.floor((rows.length - 1) / 2);
    rows.forEach((row, index) => {
      row.pileName = index === middleIndex ? selectedPiles[0].name : "";
      row.pileNameGhost = index !== middleIndex;
    });
  } else if (selectedPiles.length > 1) {
    rows.forEach((row) => {
      row.pileName = row.pileNameFull;
      row.pileNameGhost = false;
    });
  }

  const totalRevenue = round(rows.reduce((sum, item) => sum + item.revenue, 0), 2);
  const totalProfit = round(totalRevenue - totalPurchaseCost, 2);

  return {
    selectedCount: selectedPiles.length,
    singlePile: selectedPiles.length === 1,
    selectedNames: selectedPiles.map((item) => item.name).join("、"),
    totalWetWeightTon,
    totalWetText: totalWetWeightTon ? `${totalWetWeightTon} t` : "未填写",
    totalDryWeightTon,
    moistureRate,
    moistureText: totalWetWeightTon ? `${moistureRate}%` : "未填写",
    rows,
    totalPurchaseCost,
    totalRevenue,
    totalProfit
  };
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function createProfileStats(records) {
  const buyerMap = {};
  records.forEach((record) => {
    const buyer = record.buyer || "未填写买家";
    if (!buyerMap[buyer]) {
      buyerMap[buyer] = { buyer, count: 0, amount: 0, profit: 0 };
    }
    buyerMap[buyer].count += 1;
    buyerMap[buyer].amount += toNumber(record.totalRevenue);
    buyerMap[buyer].profit += toNumber(record.totalProfit);
  });

    const buyers = Object.keys(buyerMap).map((key) => ({
    ...buyerMap[key],
    amount: round(buyerMap[key].amount, 2),
    profit: round(buyerMap[key].profit, 2)
  }));

  return {
    transactionCount: records.length,
    buyerCount: buyers.length,
    totalAmount: round(records.reduce((sum, item) => sum + toNumber(item.totalRevenue), 0), 2),
    totalProfit: round(records.reduce((sum, item) => sum + toNumber(item.totalProfit), 0), 2),
    buyers,
    recentBuyers: buyers.slice(0, 6)
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
      id: "pile_pbzn_demo",
      name: "B区铅锌混合矿",
      oreType: "铅锌矿",
      source: "贵州毕节 - 李经理",
      location: "雨棚仓 1 排",
      dryWeightTon: 77.83,
      wetWeightTon: 86,
      moistureRate: 9.5,
      purchaseCost: 168000,
      remark: "铅锌双计价，建议补测镉、砷、锑。",
      assays: [
        { element: "Pb", value: 4.8, unit: "%" },
        { element: "Zn", value: 7.6, unit: "%" },
        { element: "Ag", value: 62, unit: "g/t" }
      ]
    }
  ];
}

function createDefaultSalePrices() {
  return { Cu: 68000, Ag: 14.53, Pb: 10500, Zn: 10500, Fe: 0 };
}

Page({
  data: {
    mainTab: "piles",
    viewMode: "home",
    bottomTabs,
    oreTypes,
    unitOptions,
    oreTypeIndex: 0,
    assayUnitIndex: 0,
    piles: [],
    selectedIds: [],
    salePrices: {},
    soldRecords: [],
    profileStats: createProfileStats([]),
    userProfile: null,
    loginForm: {
      account: "",
      password: ""
    },
    buyerName: "",
    activeRecord: null,
    stats: {},
    saleSummary: createSaleSummary([], [], {}),
    pileForm: {
      name: "",
      oreType: oreTypes[0].name,
      source: "",
      location: "",
      dryWeightTon: "",
      wetWeightTon: "",
      moistureRate: "",
      purchaseCost: "",
      remark: ""
    },
    assayDraft: {
      element: "",
      value: "",
      unit: unitOptions[0]
    },
    draftAssays: [],
    currentSuggestions: oreTypes[0].suggested
  },

  onLoad() {
    const cached = wx.getStorageSync(STORAGE_KEY);
    const prices = wx.getStorageSync(SALE_PRICE_KEY) || createDefaultSalePrices();
    const soldRecords = wx.getStorageSync(SOLD_RECORDS_KEY) || [];
    const userProfile = wx.getStorageSync(USER_PROFILE_KEY) || null;
    const piles = Array.isArray(cached) && cached.length ? cached : createDefaultPiles();
    this.setData({
      soldRecords,
      userProfile,
      profileStats: createProfileStats(soldRecords)
    });
    this.refreshPiles(piles, [], prices);
  },

  refreshPiles(rawPiles, selectedIds, salePrices = this.data.salePrices) {
    const piles = rawPiles.map((pile) => enrichPile(pile, selectedIds, salePrices));
    const stats = {
      count: piles.length,
      totalRevenue: round(piles.reduce((sum, item) => sum + item.totalRevenue, 0), 2)
    };
    const saleSummary = createSaleSummary(piles, selectedIds, salePrices);

    this.setData({ piles, selectedIds, salePrices, stats, saleSummary });
    wx.setStorageSync(STORAGE_KEY, piles.map(cleanPile));
    wx.setStorageSync(SALE_PRICE_KEY, salePrices);
  },

  goHome() {
    this.refreshPiles(this.data.piles, this.data.selectedIds);
    this.setData({ viewMode: "home" });
  },

  switchMainTab(event) {
    const mainTab = event.currentTarget.dataset.key;
    this.setData({ mainTab, viewMode: "home", activeRecord: null });
  },

  goAdd() {
    this.setData({ viewMode: "add" });
  },

  goSale() {
    if (!this.data.selectedIds.length) return;
    this.refreshPiles(this.data.piles, this.data.selectedIds);
    this.setData({ viewMode: "sale" });
  },

  togglePileSelection(event) {
    const id = event.currentTarget.dataset.id;
    const selectedIds = this.data.selectedIds.includes(id)
      ? this.data.selectedIds.filter((item) => item !== id)
      : [...this.data.selectedIds, id];
    this.refreshPiles(this.data.piles, selectedIds);
  },

  clearSelection() {
    this.refreshPiles(this.data.piles, []);
  },

  deleteSelectedPiles() {
    const selectedIds = this.data.selectedIds;
    if (!selectedIds.length) return;

    wx.showModal({
      title: "删除矿堆",
      content: `确认删除已选 ${selectedIds.length} 个矿堆？删除后不会进入往期出售记录。`,
      confirmText: "删除",
      confirmColor: "#8b3f31",
      success: (res) => {
        if (!res.confirm) return;
        const remainingPiles = this.data.piles.filter((pile) => !selectedIds.includes(pile.id));
        this.refreshPiles(remainingPiles, []);
        wx.showToast({ title: "已删除", icon: "success" });
      }
    });
  },

  bindPileInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`pileForm.${field}`]: event.detail.value });
  },

  bindLoginInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`loginForm.${field}`]: event.detail.value });
  },

  loginWithPassword() {
    const account = String(this.data.loginForm.account || "").trim();
    const password = String(this.data.loginForm.password || "");
    if (!account || !password) {
      wx.showToast({ title: "请输入账号和密码", icon: "none" });
      return;
    }
    if (password.length < 6) {
      wx.showToast({ title: "密码至少 6 位", icon: "none" });
      return;
    }

    const userProfile = {
      account,
      nickName: account,
      accountInitial: account.slice(0, 1).toUpperCase()
    };
    wx.setStorageSync(USER_PROFILE_KEY, userProfile);
    this.setData({
      userProfile,
      loginForm: { account: "", password: "" }
    });
    wx.showToast({ title: "已登录", icon: "success" });
  },

  logoutAccount() {
    wx.removeStorageSync(USER_PROFILE_KEY);
    this.setData({
      userProfile: null,
      activeRecord: null,
      loginForm: { account: "", password: "" }
    });
  },

  bindBuyerName(event) {
    this.setData({ buyerName: event.detail.value });
  },

  useBuyer(event) {
    this.setData({ buyerName: event.currentTarget.dataset.buyer || "" });
  },

  bindOreType(event) {
    const index = Number(event.detail.value);
    this.setData({
      oreTypeIndex: index,
      currentSuggestions: oreTypes[index].suggested,
      "pileForm.oreType": oreTypes[index].name
    });
  },

  bindAssayInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    if (field === "element") {
      const element = normalizeElement(value);
      const unit = inferUnit(element);
      this.setData({
        "assayDraft.element": value,
        "assayDraft.unit": unit,
        assayUnitIndex: unitOptions.indexOf(unit)
      });
      return;
    }
    this.setData({ [`assayDraft.${field}`]: value });
  },

  bindAssayUnit(event) {
    const index = Number(event.detail.value);
    this.setData({
      assayUnitIndex: index,
      "assayDraft.unit": unitOptions[index]
    });
  },

  bindSalePrice(event) {
    const element = event.currentTarget.dataset.element;
    const salePrices = {
      ...this.data.salePrices,
      [element]: toNumber(event.detail.value)
    };
    this.refreshPiles(this.data.piles, this.data.selectedIds, salePrices);
  },

  quickFillElement(event) {
    const element = normalizeElement(event.currentTarget.dataset.element);
    const unit = inferUnit(element);
    this.setData({
      "assayDraft.element": element,
      "assayDraft.unit": unit,
      assayUnitIndex: unitOptions.indexOf(unit)
    });
  },

  addDraftAssay() {
    const draft = this.data.assayDraft;
    const element = normalizeElement(draft.element);
    if (!element || !draft.value) {
      wx.showToast({ title: "请填写元素和品位", icon: "none" });
      return;
    }

    const nextAssay = {
      element,
      value: toNumber(draft.value),
      unit: draft.unit || inferUnit(element)
    };
    const draftAssays = [
      ...this.data.draftAssays.filter((item) => item.element !== element),
      nextAssay
    ];

    this.setData({
      draftAssays,
      assayDraft: { element: "", value: "", unit: unitOptions[0] },
      assayUnitIndex: 0
    });
  },

  removeDraftAssay(event) {
    const element = event.currentTarget.dataset.element;
    this.setData({
      draftAssays: this.data.draftAssays.filter((item) => item.element !== element)
    });
  },

  savePile() {
    const form = this.data.pileForm;
    if (!form.dryWeightTon && !form.wetWeightTon) {
      wx.showToast({ title: "请填写干重或湿重", icon: "none" });
      return;
    }

    const pile = {
      id: `pile_${Date.now()}`,
      name: form.name || `${form.oreType} ${this.data.piles.length + 1}`,
      oreType: form.oreType,
      source: form.source,
      location: form.location,
      dryWeightTon: toNumber(form.dryWeightTon),
      wetWeightTon: toNumber(form.wetWeightTon),
      moistureRate: toNumber(form.moistureRate),
      purchaseCost: toNumber(form.purchaseCost),
      remark: form.remark,
      assays: this.data.draftAssays
    };

    this.refreshPiles([pile, ...this.data.piles], []);
    this.setData({
      viewMode: "home",
      oreTypeIndex: 0,
      assayUnitIndex: 0,
      currentSuggestions: oreTypes[0].suggested,
      pileForm: {
        name: "",
        oreType: oreTypes[0].name,
        source: "",
        location: "",
        dryWeightTon: "",
        wetWeightTon: "",
        moistureRate: "",
        purchaseCost: "",
        remark: ""
      },
      assayDraft: { element: "", value: "", unit: unitOptions[0] },
      draftAssays: []
    });
    wx.showToast({ title: "矿堆已保存", icon: "success" });
  },

  completeSale() {
    if (!this.data.selectedIds.length) return;
    const saleSummary = this.data.saleSummary;
    if (!saleSummary.rows.length) {
      wx.showToast({ title: "没有可出售的化验明细", icon: "none" });
      return;
    }

    const selectedPiles = this.data.piles.filter((pile) => this.data.selectedIds.includes(pile.id));
    const now = new Date();
    const buyer = String(this.data.buyerName || "").trim() || "未填写买家";
    const record = {
      id: `sale_${Date.now()}`,
      buyer,
      soldAt: formatDateTime(now),
      pileCount: selectedPiles.length,
      pileNames: selectedPiles.map((item) => item.name).join("、"),
      piles: selectedPiles.map(cleanPile),
      rows: saleSummary.rows,
      totalDryWeightTon: saleSummary.totalDryWeightTon,
      totalPurchaseCost: saleSummary.totalPurchaseCost,
      totalRevenue: saleSummary.totalRevenue,
      totalProfit: saleSummary.totalProfit
    };
    const soldRecords = [record, ...this.data.soldRecords];
    const remainingPiles = this.data.piles.filter((pile) => !this.data.selectedIds.includes(pile.id));

    wx.setStorageSync(SOLD_RECORDS_KEY, soldRecords);
    this.setData({
      soldRecords,
      profileStats: createProfileStats(soldRecords),
      buyerName: "",
      mainTab: "piles",
      viewMode: "home"
    });
    this.refreshPiles(remainingPiles, []);
    wx.showToast({ title: "出售已完成", icon: "success" });
  },

  openSaleRecord(event) {
    const id = event.currentTarget.dataset.id;
    const activeRecord = this.data.soldRecords.find((item) => item.id === id) || null;
    this.setData({ activeRecord });
  },

  closeSaleRecord() {
    this.setData({ activeRecord: null });
  },

  restoreSaleRecord(event) {
    const id = event.currentTarget.dataset.id;
    const record = this.data.soldRecords.find((item) => item.id === id);
    if (!record) return;
    const restoredPiles = (record.piles || []).map((pile) => ({
      ...pile,
      id: `${pile.id}_restored_${Date.now()}`
    }));
    const soldRecords = this.data.soldRecords.filter((item) => item.id !== id);
    wx.setStorageSync(SOLD_RECORDS_KEY, soldRecords);
    this.setData({
      soldRecords,
      profileStats: createProfileStats(soldRecords),
      activeRecord: null,
      mainTab: "piles",
      viewMode: "home"
    });
    this.refreshPiles([...restoredPiles, ...this.data.piles], []);
    wx.showToast({ title: "已恢复到库存", icon: "success" });
  },

  deleteSaleRecord(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "删除出售记录",
      content: "删除后不会恢复矿堆，仅移除这条历史记录。",
      confirmText: "删除",
      confirmColor: "#8b3f31",
      success: (res) => {
        if (!res.confirm) return;
        const soldRecords = this.data.soldRecords.filter((item) => item.id !== id);
        wx.setStorageSync(SOLD_RECORDS_KEY, soldRecords);
        this.setData({
          soldRecords,
          profileStats: createProfileStats(soldRecords),
          activeRecord: null
        });
        wx.showToast({ title: "已删除", icon: "success" });
      }
    });
  }
});
