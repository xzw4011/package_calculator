<template>
  <TopNav @switch="onSwitchTab" />

  <div class="app-body">
    <!-- Admin Panel -->
    <div v-show="store.activeTab === 'admin'">
      <BreadcrumbNav />
      <AdminProvinceTable />
      <AdminPriceList />
      <AdminPriceDetail />
      <AdminPackageList />
    </div>

    <!-- Client Panel -->
    <div v-show="store.activeTab === 'client'" class="c-app">
      <ClientInput
        v-if="!showResult"
        ref="clientInputRef"
        @calculate="cCalculate"
      />
      <ClientResult
        v-else
        :resultData="resultData"
        @back="cGoBack"
      />
    </div>
  </div>

  <!-- Modals -->
  <ModalPriceType />
  <ModalPackage />
  <ModalConfirm />
  <AppToast />
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useAppStore } from './stores/app.js'
import { evalFormula, getFieldType, checkRuleFail } from './utils/formula.js'

import TopNav from './components/TopNav.vue'
import BreadcrumbNav from './components/BreadcrumbNav.vue'
import AdminProvinceTable from './components/AdminProvinceTable.vue'
import AdminPriceList from './components/AdminPriceList.vue'
import AdminPriceDetail from './components/AdminPriceDetail.vue'
import AdminPackageList from './components/AdminPackageList.vue'
import ModalPriceType from './components/ModalPriceType.vue'
import ModalPackage from './components/ModalPackage.vue'
import ModalConfirm from './components/ModalConfirm.vue'
import AppToast from './components/AppToast.vue'
import ClientInput from './components/ClientInput.vue'
import ClientResult from './components/ClientResult.vue'

const store = useAppStore()
const showResult = ref(false)
const resultData = ref({})
const clientInputRef = ref(null)

function onSwitchTab(tab) {
  store.switchTab(tab)
  if (tab === 'client') {
    showResult.value = false
  }
}

function cGoBack() {
  showResult.value = false
}

function cCalculate() {
  const pkg = store.cSelectedPkg
  if (!pkg) return store.toast('请选择套餐')

  const prices = store.cGetPrices()
  if (!prices) return store.toast('请选择计算年月')

  const mRaw = store.cCalcMonth
  const [y, m] = mRaw.split('-')
  const ml = y + '年' + m + '月'
  const prov = store.PROVINCES.find(p => store.provStatus[p]) || ''

  const fields = pkg.fields || []

  // 必填校验
  for (const f of fields) {
    const ftype = getFieldType(f)
    if (ftype === 'pref_select') {
      const sel = document.getElementById('cinp_' + f.code)
      if (!sel || !sel.value) { store.toast('请填写 ' + f.name); return }
      if (sel.value === 'custom') {
        const customEl = document.getElementById('cinp_' + f.code + '_custom')
        if (!customEl || !customEl.value.trim()) { store.toast('请填写 ' + f.name); return }
      }
    } else {
      const el = document.getElementById('cinp_' + f.code)
      if (!el || !el.value.trim()) { store.toast('请填写 ' + f.name); return }
    }
  }

  // Collect inputs
  const cInputs = {}

  for (const f of fields) {
    const ftype = getFieldType(f)

    if (ftype === 'pref_select') {
      const sel = document.getElementById('cinp_' + f.code)
      if (!sel || !sel.value) { cInputs[f.code] = 0; continue }
      if (sel.value === 'custom') {
        const customEl = document.getElementById('cinp_' + f.code + '_custom')
        cInputs[f.code] = customEl ? (parseFloat(customEl.value) || 0) : 0
      } else if (sel.value.indexOf('price_') === 0) {
        const targetPriceName = sel.value.substring(6)
        const info = store.cFindPriceInfo(prov, targetPriceName, m)
        cInputs[f.code] = info && info.value != null ? info.value : 0
      } else {
        cInputs[f.code] = 0
      }
      continue
    }

    const el = document.getElementById('cinp_' + f.code)
    if (!el) continue
    cInputs[f.code] = parseFloat(el.value) || 0
  }

  // Validation rules
  const rules = pkg.rules || []
  for (const rule of rules) {
    const msg = rule.message || '输入数据不符合校验规则'
    const op = rule.operator || '<='
    let allZero = true
    for (const code of rule.fields) {
      if ((cInputs[code] || 0) !== 0) { allZero = false; break }
    }
    if (allZero && rule.fields.length > 0) continue

    if (rule.type === 'sum') {
      let sum = 0
      for (const code of rule.fields) { sum += cInputs[code] || 0 }
      if (checkRuleFail(sum, op, rule.value)) { store.toast(msg); return }
    } else if (rule.type === 'max') {
      for (const code of rule.fields) {
        const fv = cInputs[code] || 0
        if (checkRuleFail(fv, op, rule.value)) { store.toast(msg); return }
      }
    }
  }

  // Convert pct_input to decimal
  for (const f of fields) {
    if (getFieldType(f) === 'pct_input' && cInputs[f.code] !== undefined) {
      cInputs[f.code] /= 100
    }
  }

  // Formula evaluation
  const formula = pkg.formula || ''
  if (!formula.trim()) {
    store.toast('该套餐未配置计算公式，请在后台管理中配置')
    return
  }

  const formulaResult = evalFormula(formula, cInputs, prices, fields)
  const debugLog = formulaResult.log || ''

  if (formulaResult.error) {
    const errLines = debugLog.split('\n')
    let errMsg = '公式计算失败'
    for (let ei = errLines.length - 1; ei >= 0; ei--) {
      if (errLines[ei].indexOf('ERROR') !== -1) {
        errMsg = errLines[ei].replace('ERROR: ', '')
        break
      }
    }
    resultData.value = {
      monthHtml: ml + ' · ' + prov + ' · ' + (pkg ? pkg.name : '') + '<br><span style="font-size:12px;color:var(--danger)">计算失败</span>',
      price: '--',
      echo: [{ k: '状态', v: '公式计算失败，请检查公式配置和输入参数' }],
      log: debugLog
    }
    showResult.value = true
    return
  }

  const monthlyPrice = formulaResult.price

  // Build echo
  const echo = [
    { k: '省份', v: prov },
    { k: '计算年月', v: ml },
    { k: '套餐', v: pkg.name || '' },
    { k: '公式', v: formula }
  ]
  for (const f of fields) {
    const val = cInputs[f.code]
    if (val !== undefined && val !== null) {
      echo.push({ k: f.name, v: typeof val === 'number' ? val.toFixed(6) : val })
    }
  }

  resultData.value = {
    monthHtml: ml + ' · ' + prov + ' · ' + (pkg ? pkg.name : ''),
    price: monthlyPrice.toFixed(6),
    echo,
    log: debugLog
  }
  showResult.value = true
}
</script>

<style>
:root {
  --primary: #1677ff; --primary-light: #e6f4ff;
  --success: #52c41a; --success-bg: #f6ffed;
  --danger: #ff4d4f; --danger-bg: #fff2f0;
  --warning: #faad14; --bg: #f0f2f5; --card: #fff;
  --text: #1a1a2e; --text-secondary: #666; --text-hint: #999;
  --border: #e8e8e8; --radius: 8px; --shadow: 0 1px 4px rgba(0,0,0,0.06);
}
*{margin:0;padding:0;box-sizing:border-box;}
body{
  font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;
  background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh;
}

/* Top nav */
.top-nav{
  background:#001529;color:#fff;display:flex;align-items:center;
  padding:0 24px;height:56px;position:sticky;top:0;z-index:100;gap:0;
}
.top-nav .logo{color:#fff;font-size:16px;font-weight:600;margin-right:32px;display:flex;align-items:center;gap:8px;}
.top-nav .logo::before{content:'⚡';font-size:20px;}
.nav-tab{
  padding:16px 20px;cursor:pointer;font-size:14px;color:rgba(255,255,255,0.65);
  border-bottom:2px solid transparent;transition:all 0.2s;background:none;border-top:none;border-left:none;border-right:none;
  font-family:inherit;
}
.nav-tab:hover{color:#fff;}
.nav-tab.active{color:#fff;border-bottom-color:var(--primary);}

.app-body{max-width:1400px;margin:0 auto;padding:20px 24px;}

/* Breadcrumb */
.breadcrumb{font-size:13px;color:var(--text-hint);margin-bottom:16px;}
.breadcrumb a{color:var(--primary);cursor:pointer;text-decoration:none;}
.breadcrumb a:hover{text-decoration:underline;}
.breadcrumb span{margin:0 6px;}

/* Card */
.card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:16px;}
.card-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
.card-header h2{font-size:16px;font-weight:600;}
.card-body{padding:20px;}

/* Table */
.table-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;font-size:14px;}
thead th{background:#f5f5f5;padding:12px 16px;text-align:left;font-weight:600;border-bottom:2px solid var(--border);white-space:nowrap;color:var(--text-secondary);}
thead th:first-child{border-radius:8px 0 0 0;}
thead th:last-child{border-radius:0 8px 0 0;}
tbody td{padding:10px 16px;border-bottom:1px solid #f0f0f0;vertical-align:middle;}
tbody tr:nth-child(even){background:#fafafa;}
tbody tr:hover{background:#e6f4ff;}

/* Badge */
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;}
.badge-active{background:var(--success-bg);color:var(--success);}
.badge-inactive{background:var(--danger-bg);color:var(--danger);}

/* Button */
.btn{display:inline-flex;align-items:center;gap:4px;padding:6px 16px;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer;background:#fff;color:var(--text);transition:all 0.2s;font-family:inherit;white-space:nowrap;}
.btn:hover{border-color:var(--primary);color:var(--primary);}
.btn-primary{background:var(--primary);color:#fff;border-color:var(--primary);}
.btn-primary:hover{opacity:0.85;color:#fff;}
.btn-danger{color:var(--danger);}
.btn-danger:hover{border-color:var(--danger);color:var(--danger);background:var(--danger-bg);}
.btn-sm{padding:4px 10px;font-size:12px;}
.btn-link{border:none;background:none;color:var(--primary);padding:4px 8px;}
.btn-link:hover{color:var(--primary);text-decoration:underline;}
.btn-group{display:flex;gap:8px;flex-wrap:wrap;}
.btn-block{display:block;width:100%;padding:14px;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit;}
.btn-block.primary{background:linear-gradient(135deg,#1677ff,#4096ff);color:#fff;margin-top:16px;}
.btn-block.primary:hover{opacity:0.9;}
.btn-block.primary:active{transform:scale(0.98);}
.btn-block.primary:disabled{background:#d9d9d9;color:#999;cursor:not-allowed;transform:none;}
.btn-block.outline{background:#fff;color:var(--primary);border:1.5px solid var(--primary);margin-top:12px;}
.btn-block.outline:hover{background:var(--primary-light);}

/* Form */
.form-group{margin-bottom:16px;}
.form-label{display:flex;align-items:center;gap:4px;font-size:13px;font-weight:500;margin-bottom:6px;color:var(--text);}
.form-label .req{color:var(--danger);}
.form-label .unit{color:var(--text-hint);font-weight:400;font-size:12px;margin-left:auto;}
input[type="text"],input[type="number"],select,textarea{width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-family:inherit;color:var(--text);background:#fff;transition:border-color 0.2s;}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 2px rgba(22,119,255,0.1);}
textarea{resize:vertical;min-height:60px;}
.form-row{display:flex;gap:16px;}
.form-row>*{flex:1;}
.form-hint{font-size:12px;color:var(--text-hint);margin-top:4px;}
input:read-only{background:#f0f0f0;color:var(--text-hint);cursor:not-allowed;}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding-top:60px;animation:fadeIn 0.2s;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:#fff;border-radius:12px;width:90%;max-width:800px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,0.15);}
.modal-header{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.modal-header h3{font-size:16px;}
.modal-close{background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-hint);padding:4px;}
.modal-close:hover{color:var(--text);}
.modal-body{padding:24px;overflow-y:auto;flex:1;}
.modal-footer{padding:12px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:12px;}

/* Formula builder */
.formula-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.formula-chip{display:inline-flex;align-items:center;padding:4px 10px;border:1px solid var(--border);border-radius:4px;font-size:13px;cursor:pointer;background:#fafafa;user-select:none;transition:all 0.15s;}
.formula-chip:hover{border-color:var(--primary);background:var(--primary-light);}
.formula-chip.op{font-family:'SF Mono','Consolas',monospace;font-weight:600;background:#f5f5f5;}
.formula-chip.func{font-family:'SF Mono','Consolas',monospace;font-weight:600;background:#e6f7ff;color:#1677ff;border-color:#91caff;}
.formula-chip.var{color:var(--primary);}
.formula-display{min-height:40px;padding:10px 12px;border:1px dashed var(--border);border-radius:6px;background:#fafafa;font-size:14px;word-break:break-all;color:var(--text-secondary);line-height:2.2;}
.formula-display.has-content{border-style:solid;color:var(--text);}
.formula-tag{display:inline-block;padding:0 8px;background:var(--primary-light);color:var(--primary);border-radius:4px;margin:1px 2px;font-size:13px;cursor:default;user-select:all;line-height:1.8;vertical-align:middle;}

/* Field table */
.field-table{width:100%;border-collapse:collapse;margin-top:12px;}
.field-table th,.field-table td{padding:8px 12px;border:1px solid var(--border);font-size:13px;text-align:left;}
.field-table th{background:#fafafa;}
.field-table input{width:100%;border:1px solid transparent;padding:4px 8px;border-radius:4px;font-size:13px;}
.field-table input:focus{border-color:var(--primary);}

/* Toggle */
.toggle{position:relative;display:inline-block;width:44px;height:22px;cursor:pointer;}
.toggle input{display:none;}
.toggle-slider{position:absolute;inset:0;background:#ccc;border-radius:22px;transition:0.2s;}
.toggle-slider::before{content:'';position:absolute;width:18px;height:18px;left:2px;top:2px;background:#fff;border-radius:50%;transition:0.2s;}
.toggle input:checked+.toggle-slider{background:var(--primary);}
.toggle input:checked+.toggle-slider::before{transform:translateX(22px);}

/* Price type card */
.price-type-card{border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;transition:all 0.2s;}
.price-type-card:hover{border-color:var(--primary);}
.price-type-card .info{flex:1;min-width:200px;}
.price-type-card .info .name{font-weight:600;font-size:15px;}
.price-type-card .info .meta{font-size:12px;color:var(--text-hint);margin-top:2px;}
.price-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;}
.price-item{text-align:center;}
.price-item label{display:block;font-size:12px;color:var(--text-hint);margin-bottom:4px;}
.price-item input{text-align:center;}

/* Package card */
.package-card{border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px;transition:all 0.2s;}
.package-card:hover{border-color:var(--primary);}
.package-card .pkg-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;}
.package-card .pkg-name{font-weight:600;font-size:15px;}
.package-card .pkg-meta{font-size:12px;color:var(--text-hint);}
.package-card .pkg-formula{font-family:'SF Mono','Consolas',monospace;font-size:13px;background:#f9f9f9;padding:8px 12px;border-radius:6px;word-break:break-all;color:var(--text-secondary);margin-top:8px;}

/* Toast */
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:6px;font-size:14px;z-index:300;pointer-events:none;opacity:0;transition:opacity 0.3s;}
.toast.show{opacity:1;}

/* Confirm */
.confirm-overlay{z-index:250;}
.confirm-box{width:400px;max-width:90%;background:#fff;border-radius:12px;padding:24px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.15);}
.confirm-box p{margin:16px 0 24px;font-size:15px;color:var(--text-secondary);}
.confirm-box .btn-group{justify-content:center;}

/* C-end styles */
.c-app{max-width:420px;margin:0 auto;}
.c-card{background:var(--card);border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
.c-card-title{font-size:15px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:6px;}
.c-card-title::before{content:'';display:inline-block;width:4px;height:18px;background:var(--primary);border-radius:2px;}
.c-market{background:linear-gradient(135deg,#f0f5ff,#e6f7ff);border:1px solid #bae0ff;}
.c-mrow{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #e6f7ff;}
.c-mrow:last-child{border-bottom:none;}
.c-mrow .mk{color:var(--text-secondary);}
.c-mrow .mv{font-weight:500;}

/* Package option */
.pkg-option{display:block;width:100%;padding:14px;border:1.5px solid var(--border);border-radius:8px;text-align:left;cursor:pointer;transition:all 0.2s;background:var(--card);margin-bottom:8px;font-family:inherit;}
.pkg-option:hover{border-color:var(--primary);}
.pkg-option.selected{border-color:var(--primary);background:var(--primary-light);}
.pkg-option .po-name{font-size:15px;font-weight:600;}
.pkg-option .po-desc{font-size:12px;color:var(--text-hint);margin-top:4px;}
.pkg-option .po-formula{font-size:12px;color:var(--primary);margin-top:2px;font-family:'SF Mono',monospace;}

/* C result */
.c-result-header{text-align:center;padding:20px 0 8px;}
.c-result-month{font-size:14px;color:var(--text-secondary);margin-bottom:4px;}
.c-result-price{font-size:42px;font-weight:700;color:var(--primary);line-height:1.2;}
.c-result-price .ut{font-size:16px;font-weight:400;color:var(--text-secondary);margin-left:4px;}
.c-result-label{font-size:13px;color:var(--text-hint);margin-top:2px;}
.c-rrow{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #f5f5f5;}
.c-rrow:last-child{border-bottom:none;}
.c-rrow .k{color:var(--text-secondary);}
.c-rrow .v{font-weight:500;color:var(--text);}
.c-disclaimer{text-align:center;font-size:12px;color:var(--text-hint);padding:12px 16px;line-height:1.5;}
.c-disclaimer::before{content:'💡 ';}

.empty{text-align:center;padding:40px;color:var(--text-hint);font-size:14px;}
.bottom-spacer{height:80px;}

/* Validation rule card */
.rule-card{border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:8px;background:#fafafa;}
.rule-card .rule-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
.rule-card .rule-row:last-child{margin-bottom:0;}
.rule-card select,.rule-card input{width:auto;min-width:100px;}
.rule-card .rule-msg{flex:1;min-width:180px;}
.rule-card .field-checkboxes{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px;}
.rule-card .field-checkboxes label{cursor:pointer;white-space:nowrap;}
</style>
