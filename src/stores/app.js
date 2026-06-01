import { defineStore } from 'pinia'
import { evalFormula, getFieldType, validateNumInput, checkRuleFail } from '../utils/formula.js'

const PROVINCES = ['江苏', '山东', '上海']

const DEFAULT_DATA = {
  "provStatus": {
    "江苏": true,
    "山东": true,
    "上海": true
  },
  "priceTypes": {
    "江苏": [
      {
        "id": 10,
        "name": "P中长期",
        "code": "P_long_term",
        "method": "month",
        "prices": {
          "months": {
            "2": 3,
            "3": 1,
            "4": 1,
            "5": 1
          }
        }
      },
      {
        "id": 13,
        "name": "P实时",
        "code": "P_realtime",
        "method": "month",
        "prices": {
          "months": {
            "3": 2,
            "4": 2.3,
            "5": 2
          }
        }
      },
      {
        "id": 14,
        "name": "P购电均",
        "code": "P_purchase_avg",
        "method": "month",
        "prices": {
          "months": {
            "3": 3,
            "4": 3,
            "5": 3
          }
        }
      },
      {
        "id": 16,
        "name": "国网代理购电价格",
        "code": "P_agent_purchase",
        "method": "month",
        "prices": {
          "months": {
            "3": 4,
            "4": 4,
            "5": 4
          }
        }
      },
      {
        "id": 17,
        "name": "年度交易均价",
        "code": "P_annual_avg",
        "method": "year",
        "prices": {
          "year": 0.34419
        }
      }
    ],
    "山东": [
      {
        "id": 4,
        "name": "批发市场中长期交易加权出清价格",
        "code": "P_wholesale_avg",
        "method": "year",
        "prices": {
          "year": 0.395
        }
      }
    ],
    "上海": []
  },
  "packages": {
    "江苏": [
      {
        "id": 1,
        "name": "固定价格+浮动套餐",
        "start": "2026-03",
        "end": "2026-12",
        "formula": "IF( K固定  × P固定  + K中长期  × P中长期  + K实时  ×  P实时 >  (1 + K浮动  )  ×  P购电均 , (1 + K浮动 ) × P购电均 , K固定  × P固定  + K中长期  × P中长期 + K实时  × P实时 +  ( 1- P固定  )  × ∆P  )",
        "fields": [
          {
            "name": "K固定",
            "code": "fixedRatio",
            "type": "pct_input",
            "remark": "建议最高50%",
            "refValue": "00"
          },
          {
            "name": "P固定",
            "code": "fixedPrice",
            "remark": "请输入固定价格",
            "refValue": "0.000000"
          },
          {
            "name": "∆P",
            "code": "floatPrice",
            "remark": "请输入浮动价格",
            "refValue": "0.000000"
          },
          {
            "name": "K中长期",
            "code": "longPrice",
            "type": "pct_input",
            "remark": "请输入比例",
            "refValue": "00"
          },
          {
            "name": "K实时",
            "code": "Realtimeprice",
            "type": "pct_input",
            "remark": "最高5-15%",
            "refValue": "00"
          },
          {
            "name": "K浮动",
            "code": "Formulaprice",
            "type": "pct_input",
            "remark": "建议最高5%",
            "refValue": "00"
          }
        ],
        "status": "active",
        "rules": [
          {
            "type": "sum",
            "fields": [
              "fixedRatio",
              "longPrice",
              "Realtimeprice"
            ],
            "operator": ">",
            "value": 100,
            "message": "电量比例相加已大于100%，请调整电量比例"
          },
          {
            "type": "max",
            "fields": [
              "fixedRatio"
            ],
            "operator": ">",
            "value": 50,
            "message": "固定比例不得超过50%"
          },
          {
            "type": "max",
            "fields": [
              "longPrice"
            ],
            "operator": ">",
            "value": 95,
            "message": "建议输入0-95%"
          },
          {
            "type": "max",
            "fields": [
              "Realtimeprice"
            ],
            "operator": ">",
            "value": 15,
            "message": "建议输入5-15%"
          },
          {
            "type": "max",
            "fields": [
              "Realtimeprice"
            ],
            "operator": "<",
            "value": 1,
            "message": "建议输入5-15%"
          }
        ]
      },
      {
        "id": 2,
        "name": "固定价格+比例分成套餐",
        "start": "2026-04",
        "end": "2026-12",
        "formula": "min(IF(P参考>P中长期,(P参考+(P中长期-P参考)*K分享)*K中长期,(P参考+(P中长期-P参考)*K分摊)*K中长期)+IF(P参考>P实时,(P参考+(P实时-P参考)*K分享)*K实时,(P参考+(P实时-P参考)*K分摊)*K实时)+K固定*P固定,P购电均*(1+K浮动))",
        "fields": [
          {
            "name": "K固定",
            "code": "fixedRatio",
            "remark": "建议最高50"
          },
          {
            "name": "P固定",
            "code": "fixedPrice",
            "remark": "请输入固定价格"
          },
          {
            "name": "P参考",
            "code": "p_ref",
            "type": "pref_select",
            "prefOptions": "国网代理购电,年度交易均价",
            "remark": "请输入参考价格"
          },
          {
            "name": "K中长期",
            "code": "k_long",
            "type": "text",
            "remark": "请输入比例"
          },
          {
            "name": "K实时",
            "code": "K_time",
            "type": "text",
            "remark": "最高5-15%"
          },
          {
            "name": "K浮动",
            "code": "k_fu",
            "type": "text",
            "remark": "建议最高5%"
          },
          {
            "name": "K分享",
            "code": "k_fen",
            "type": "text",
            "remark": "50-100%"
          },
          {
            "name": "K分摊",
            "code": "k_tan",
            "type": "text",
            "remark": "0-50%"
          }
        ],
        "status": "active",
        "rules": [
          {
            "type": "sum",
            "fields": [
              "fixedRatio",
              "k_long",
              "K_time"
            ],
            "operator": ">",
            "value": 100,
            "message": "电量比例相加已大于100%，请调整电量比例"
          },
          {
            "type": "max",
            "fields": [
              "fixedRatio"
            ],
            "operator": ">",
            "value": 50,
            "message": "固定比例不得超过50%"
          },
          {
            "type": "max",
            "fields": [
              "k_long"
            ],
            "operator": ">",
            "value": 95,
            "message": "K中长期最高比例为95%"
          },
          {
            "type": "max",
            "fields": [
              "K_time"
            ],
            "operator": ">",
            "value": 15,
            "message": "建议输入5-15%"
          },
          {
            "type": "max",
            "fields": [
              "K_time"
            ],
            "operator": "<",
            "value": 5,
            "message": "建议输入5-15%"
          },
          {
            "type": "max",
            "fields": [
              "k_fen"
            ],
            "operator": "<",
            "value": 50,
            "message": "K分享建议输入50-100%"
          },
          {
            "type": "max",
            "fields": [
              "k_tan"
            ],
            "operator": ">",
            "value": 50,
            "message": "K分摊建议输入0-50%"
          }
        ]
      }
    ],
    "山东": [
      {
        "id": 3,
        "name": "2026年山东固定+浮动套餐",
        "start": "2026-01",
        "end": "2026-12",
        "formula": "固定比例×固定价格 + 中长期比例×中长期价",
        "fields": [
          {
            "name": "固定电量比例",
            "code": "fixedRatio"
          },
          {
            "name": "固定价格",
            "code": "fixedPrice"
          }
        ],
        "status": "active",
        "rules": []
      }
    ],
    "上海": [
      {
        "id": 4,
        "name": "2026年上海固定+浮动套餐",
        "start": "2026-01",
        "end": "2026-12",
        "formula": "固定比例×固定价格 + 中长期比例×中长期价",
        "fields": [
          {
            "name": "固定电量比例",
            "code": "fixedRatio"
          },
          {
            "name": "固定价格",
            "code": "fixedPrice"
          }
        ],
        "status": "active",
        "rules": []
      }
    ]
  },
  "nextPtId": 20,
  "nextPkgId": 10
};

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    if (v) return JSON.parse(v)
  } catch {}
  // Fall back to hardcoded defaults
  const k = key.replace('calc_demo_', '')
  return DEFAULT_DATA[k] !== undefined ? DEFAULT_DATA[k] : fallback
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export const useAppStore = defineStore('app', {
  state: () => {
    const provStatus = load('calc_demo_provStatus', {})
    PROVINCES.forEach(p => { if (!(p in provStatus)) provStatus[p] = true })

    return {
      // UI
      activeTab: 'admin',
      adminPage: 'provinces',
      currentProvince: null,
      navStack: [{ page: 'provinces', prov: null, label: '套餐计算器' }],

      // Data
      PROVINCES,
      provStatus,
      priceTypes: load('calc_demo_priceTypes', { 江苏: [], 山东: [], 上海: [] }),
      packages: load('calc_demo_packages', { 江苏: [], 山东: [], 上海: [] }),

      // ID counters
      nextPtId: load('calc_demo_nextPtId', 10),
      nextPkgId: load('calc_demo_nextPkgId', 10),

      // Modal visibility
      showPriceModal: false,
      showPackageModal: false,
      showConfirmModal: false,
      confirmMessage: '',
      confirmCallback: null,

      // Price type editing
      editingPtId: null,
      ptForm: { name: '', code: '', method: 'year' },
      ptCodeReadonly: false,

      // Price detail
      priceDetailId: null,
      priceEditMode: false,

      // Package editing
      editingPkgId: null,
      pkgForm: { name: '', start: '', end: '', formula: '' },
      tempFields: [],
      tempRules: [],

      // Toast
      toastText: '',

      // C端
      cSelectedPkgId: null,
      cCalcMonth: '',

      // formula display saved range
      _savedRange: null
    }
  },

  getters: {
    // Get price types for current province
    currentPriceTypes: (state) => state.currentProvince ? (state.priceTypes[state.currentProvince] || []) : [],

    // Get packages for current province
    currentPackages: (state) => state.currentProvince ? (state.packages[state.currentProvince] || []) : [],

    // C端 selected package object
    cSelectedPkg: (state) => {
      if (!state.cSelectedPkgId) return null
      const prov = state.PROVINCES.find(p => state.provStatus[p])
      if (!prov) return null
      const pkgs = state.packages[prov] || []
      return pkgs.find(p => p.id == state.cSelectedPkgId) || null
    },

    // Breadcrumb HTML
    breadcrumbHtml: (state) => {
      return state.navStack.map((item, i) => {
        const isLast = i === state.navStack.length - 1
        return isLast
          ? `<span>${item.label}</span>`
          : `<a href="#">${item.label}</a><span> › </span>`
      }).join('')
    }
  },

  actions: {
    // ---- Persistence ----
    saveAll() {
      save('calc_demo_provStatus', this.provStatus)
      save('calc_demo_priceTypes', this.priceTypes)
      save('calc_demo_packages', this.packages)
      save('calc_demo_nextPtId', this.nextPtId)
      save('calc_demo_nextPkgId', this.nextPkgId)
    },

    // ---- Toast ----
    toast(msg) {
      this.toastText = msg
      clearTimeout(this._toastTimer)
      this._toastTimer = setTimeout(() => { this.toastText = '' }, 2000)
    },

    // ---- Tab ----
    switchTab(tab) {
      this.activeTab = tab
    },

    // ---- Navigation ----
    getPageLabel(page, prov) {
      switch (page) {
        case 'provinces': return '套餐计算器'
        case 'priceList': return '配置价格（' + prov + '）'
        case 'priceDetail': return '价格详情（' + this.currentProvince + '）'
        case 'packages': return '套餐管理（' + prov + '）'
        default: return ''
      }
    },

    adminNav(page, prov) {
      const p = prov || null
      const existingIdx = this.navStack.findIndex(item => item.page === page && (item.prov || null) === p)
      if (existingIdx >= 0) {
        this.navStack = this.navStack.slice(0, existingIdx + 1)
      } else {
        this.navStack.push({ page, prov, label: this.getPageLabel(page, prov) })
      }
      if (page === 'provinces') {
        this.currentProvince = null
      } else if (page === 'priceList' || page === 'packages') {
        this.currentProvince = prov
      }
      this.adminPage = page
    },

    // ---- Province ----
    toggleProvince(prov) {
      this.provStatus[prov] = !this.provStatus[prov]
      this.saveAll()
      this.toast(prov + ' 已' + (this.provStatus[prov] ? '启用' : '停用') + '（C端即时生效）')
    },

    // ---- Price Types ----
    openPriceModal(id) {
      this.editingPtId = id || null
      if (id) {
        const pt = this.currentPriceTypes.find(p => p.id === id)
        if (pt) {
          this.ptForm = { name: pt.name, code: pt.code || '', method: pt.method }
          this.ptCodeReadonly = true
          this.showPriceModal = true
          return
        }
      }
      this.ptForm = { name: '', code: '', method: 'year' }
      this.ptCodeReadonly = false
      this.showPriceModal = true
    },

    savePriceType() {
      const name = this.ptForm.name.trim()
      const code = this.ptForm.code.trim()
      if (!name) { this.toast('请输入名称'); return }
      if (name.length > 30) { this.toast('名称不超过30字'); return }
      if (!code) { this.toast('请输入字段编码'); return }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(code)) { this.toast('字段编码仅支持英文/数字/下划线，且不能以数字开头'); return }
      if (this.editingPtId) {
        const pt = this.currentPriceTypes.find(p => p.id === this.editingPtId)
        if (pt) {
          if (pt.method !== this.ptForm.method) {
            pt.prices = this.ptForm.method === 'year' ? { year: null } : { months: {} }
          }
          pt.name = name
          pt.method = this.ptForm.method
        }
      } else {
        this.priceTypes[this.currentProvince].push({
          id: this.nextPtId++,
          name,
          code,
          method: this.ptForm.method,
          prices: this.ptForm.method === 'year' ? { year: null } : { months: {} }
        })
      }
      this.saveAll()
      this.showPriceModal = false
      this.toast('已保存')
    },

    deletePriceType(id) {
      const pt = this.currentPriceTypes.find(p => p.id === id)
      if (!pt) return
      this.confirmMessage = '确认删除「' + pt.name + '」？'
      this.confirmCallback = () => {
        this.priceTypes[this.currentProvince] = this.currentPriceTypes.filter(p => p.id !== id)
        this.saveAll()
        this.showConfirmModal = false
        this.toast('已删除')
      }
      this.showConfirmModal = true
    },

    // ---- Price Detail ----
    openPriceDetail(id) {
      this.priceDetailId = id
      this.priceEditMode = false
      this.adminNav('priceDetail')
    },

    togglePriceEdit() {
      if (this.priceEditMode) {
        this.savePriceDetail()
      } else {
        this.priceEditMode = true
      }
    },

    savePriceDetail() {
      const pt = this.currentPriceTypes.find(p => p.id === this.priceDetailId)
      if (!pt) return
      if (pt.method === 'year') {
        const el = document.getElementById('price_0')
        const v = el ? parseFloat(el.value) : NaN
        pt.prices.year = isNaN(v) ? null : v
      } else {
        for (let m = 1; m <= 12; m++) {
          const el = document.getElementById('price_' + m)
          if (el && el.value.trim() !== '') {
            const v = parseFloat(el.value)
            if (!isNaN(v)) pt.prices.months[m] = v
          }
        }
      }
      this.priceEditMode = false
      this.saveAll()
      this.toast('价格已保存（C端即时生效）')
    },

    getPriceDetail() {
      if (!this.priceDetailId) return null
      return this.currentPriceTypes.find(p => p.id === this.priceDetailId) || null
    },

    getPriceValue(pt, month) {
      return pt.method === 'year' ? pt.prices.year : ((pt.prices.months && pt.prices.months[month]) || null)
    },

    // ---- Packages ----
    openPackageModal(id) {
      this.editingPkgId = id || null
      if (id) {
        const pkg = this.currentPackages.find(p => p.id === id)
        if (pkg) {
          this.pkgForm = { name: pkg.name, start: pkg.start, end: pkg.end, formula: pkg.formula || '' }
          this.tempFields = JSON.parse(JSON.stringify(pkg.fields || []))
          this.tempRules = JSON.parse(JSON.stringify(pkg.rules || []))
          this.showPackageModal = true
          return
        }
      }
      this.pkgForm = { name: '', start: '', end: '', formula: '' }
      this.tempFields = []
      this.tempRules = []
      this.showPackageModal = true
    },

    savePackage() {
      const { name, start, end, formula } = this.pkgForm
      if (!name) { this.toast('请输入套餐名称'); return }
      if (name.length > 30) { this.toast('名称不超过30字'); return }
      if (!start || !end) { this.toast('请选择有效期'); return }
      if (start > end) { this.toast('起始不能晚于截止'); return }
      const vf = this.tempFields.filter(f => f.name.trim() && f.code.trim())
      if (vf.length < this.tempFields.length) { this.toast('请完善字段名称和编码'); return }
      const vr = this.tempRules.filter(r => r.fields.length > 0)
      if (vr.length < this.tempRules.length) { this.toast('请为每条校验规则至少选择一个字段'); return }

      if (this.editingPkgId) {
        const pkg = this.currentPackages.find(p => p.id === this.editingPkgId)
        if (pkg) {
          pkg.name = name; pkg.start = start; pkg.end = end
          pkg.formula = formula; pkg.fields = vf; pkg.rules = vr
        }
      } else {
        this.packages[this.currentProvince].push({
          id: this.nextPkgId++, name, start, end, formula, fields: vf, rules: vr, status: 'active'
        })
      }
      this.saveAll()
      this.showPackageModal = false
      this.toast('套餐已保存（C端即时生效）')
    },

    togglePkgStatus(id) {
      const pkg = this.currentPackages.find(p => p.id === id)
      if (!pkg) return
      pkg.status = pkg.status === 'active' ? 'inactive' : 'active'
      this.saveAll()
      this.toast('已' + (pkg.status === 'active' ? '启用' : '停用') + '（C端即时生效）')
    },

    deletePackage(id) {
      const pkg = this.currentPackages.find(p => p.id === id)
      if (!pkg) return
      this.confirmMessage = '确认删除「' + pkg.name + '」？'
      this.confirmCallback = () => {
        this.packages[this.currentProvince] = this.currentPackages.filter(p => p.id !== id)
        this.saveAll()
        this.showConfirmModal = false
        this.toast('已删除')
      }
      this.showConfirmModal = true
    },

    // ---- Temp Fields ----
    addFieldRow() {
      this.tempFields.push({ name: '', code: '', type: 'text', remark: '', refValue: '' })
    },

    updateTF(i, key, value) {
      this.tempFields[i][key] = value
    },

    removeTF(i) {
      this.tempFields.splice(i, 1)
    },

    // ---- Temp Rules ----
    addRuleRow() {
      this.tempRules.push({ type: 'sum', fields: [], operator: '>', value: 0, message: '' })
    },

    removeRule(idx) {
      this.tempRules.splice(idx, 1)
    },

    toggleRuleField(ruleIdx, code, checked) {
      const fs = this.tempRules[ruleIdx].fields
      if (checked) {
        if (fs.indexOf(code) < 0) fs.push(code)
      } else {
        this.tempRules[ruleIdx].fields = fs.filter(c => c !== code)
      }
    },

    selectRuleField(ruleIdx, code) {
      if (code) {
        this.tempRules[ruleIdx].fields = [code]
      } else {
        this.tempRules[ruleIdx].fields = []
      }
    },

    // ---- C端 ----
    cInit() {
      const now = new Date()
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      this.cCalcMonth = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0')
      this.cSelectedPkgId = null
    },

    cSelectPkg(id) {
      this.cSelectedPkgId = id
    },

    cGetMonth() {
      const v = this.cCalcMonth
      return v ? parseInt(v.split('-')[1]) : null
    },

    cGetPrices() {
      const prov = this.PROVINCES.find(p => this.provStatus[p])
      if (!prov) return null
      const m = this.cGetMonth()
      if (!m) return null
      const list = this.priceTypes[prov] || []
      const allPrices = {}
      for (const pt of list) {
        const val = this.getPriceValue(pt, m)
        if (val != null) allPrices[pt.name] = val
      }
      return { allPrices }
    },

    cFindPriceInfo(prov, keyword, month) {
      const list = this.priceTypes[prov] || []
      const pt = list.find(p => p.name.includes(keyword))
      if (!pt) return null
      const val = this.getPriceValue(pt, month)
      return { name: pt.name, value: val }
    },

    cGoBack() {
      this.cSelectedPkgId = null
      this.cCalcMonth = ''
    }
  }
})
