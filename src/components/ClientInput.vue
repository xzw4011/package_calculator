<template>
  <div>
    <div class="c-card">
      <div class="form-group">
        <label class="form-label">省份</label>
        <select :value="selectedProvince" @change="onProvinceChange">
          <option v-for="p in enabledProvinces" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">计算年月</label>
        <input type="month" :value="calcMonth" @change="onMonthChange">
      </div>
    </div>

    <div class="c-card" id="cPkgCard">
      <div class="c-card-title">选择套餐</div>
      <div v-if="availablePkgs.length === 0" class="form-hint" style="text-align:center;padding:16px">
        当前月份暂无可用套餐<br><small>（请检查后台套餐状态和有效期）</small>
      </div>
      <button
        v-for="pkg in availablePkgs" :key="pkg.id"
        class="pkg-option"
        :class="{ selected: store.cSelectedPkgId == pkg.id }"
        @click="store.cSelectPkg(pkg.id)"
      >
        <div class="po-name">{{ pkg.name }}</div>
        <div class="po-desc">有效期：{{ pkg.start }} 至 {{ pkg.end }}</div>
        <div class="po-formula">{{ pkg.formula || '' }}</div>
      </button>
    </div>

    <div class="c-card c-market" v-if="marketRows.length > 0">
      <div class="c-card-title">市场参考数据（本月）</div>
      <div v-for="(row, idx) in marketRows" :key="idx" class="c-mrow">
        <span class="mk">{{ row.name }}</span>
        <span class="mv" v-html="row.val"></span>
      </div>
    </div>
    <div class="c-card c-market" v-else>
      <div class="form-hint" style="text-align:center;padding:12px">
        {{ marketEmptyMsg }}<br><small v-if="!monthSelected">请先选择计算年月</small>
        <small v-else>请先在「后台管理」→「配置价格」中添加</small>
      </div>
    </div>

    <div class="c-card" v-if="pkg && pkg.fields && pkg.fields.length > 0">
      <div class="c-card-title">输入参数</div>
      <div v-for="f in pkg.fields" :key="f.code" class="form-group">
        <label class="form-label"><span class="req">*</span>{{ f.name }}</label>

        <!-- pref_select -->
        <template v-if="getFieldType(f) === 'pref_select'">
          <select :id="'cinp_' + f.code" @change="onPrefSourceChange(f.code)" required>
            <option value="">-- 请选择P参考来源 --</option>
            <option v-for="ptName in getPrefOptions(f)" :key="ptName" :value="'price_' + ptName">{{ ptName }}</option>
            <option value="custom">自行输入</option>
          </select>
          <input
            type="text"
            :id="'cinp_' + f.code + '_custom'"
            :placeholder="f.remark || '请输入'"
            style="display:none;margin-top:6px"
            @input="onNumInput($event, f.refValue || '')"
            :data-ref-value="f.refValue || undefined"
            required
          >
        </template>

        <!-- pct_input -->
        <div v-else-if="getFieldType(f) === 'pct_input'" style="display:flex;align-items:center;gap:6px">
          <input
            type="text"
            :id="'cinp_' + f.code"
            :placeholder="f.remark || '请输入'"
            @input="onNumInput($event, f.refValue || '')"
            :data-ref-value="f.refValue || undefined"
            style="flex:1"
            required
          >
          <span style="font-size:14px;color:var(--text-secondary)">%</span>
        </div>

        <!-- text -->
        <input
          v-else
          type="text"
          :id="'cinp_' + f.code"
          :placeholder="f.remark || '请输入'"
          @input="onNumInput($event, f.refValue || '')"
          :data-ref-value="f.refValue || undefined"
          required
        >
      </div>
    </div>

    <button class="btn-block primary" :disabled="!canCalculate" @click="$emit('calculate')">开始计算</button>
    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/app.js'
import { getFieldType, validateNumInput } from '../utils/formula.js'

const store = useAppStore()
const emit = defineEmits(['calculate'])

const selectedProvince = ref('')
const calcMonth = ref('')

const enabledProvinces = computed(() => store.PROVINCES.filter(p => store.provStatus[p]))

function onProvinceChange(e) {
  selectedProvince.value = e.target.value
  store.cSelectedPkgId = null
}

function onMonthChange(e) {
  calcMonth.value = e.target.value
  store.cCalcMonth = e.target.value
  store.cSelectedPkgId = null
}

const monthSelected = computed(() => !!calcMonth.value)
const monthNum = computed(() => calcMonth.value ? parseInt(calcMonth.value.split('-')[1]) : null)

const pkg = computed(() => store.cSelectedPkg)

const availablePkgs = computed(() => {
  if (!selectedProvince.value) return []
  const all = store.packages[selectedProvince.value] || []
  let avail = all.filter(p => p.status === 'active')
  if (calcMonth.value) {
    avail = avail.filter(p => p.start <= calcMonth.value && p.end >= calcMonth.value)
  }
  return avail
})

const canCalculate = computed(() => !!pkg.value)

const marketRows = computed(() => {
  if (!selectedProvince.value || !monthNum.value) return []
  const list = store.priceTypes[selectedProvince.value] || []
  return list.map(pt => {
    const val = store.getPriceValue(pt, monthNum.value)
    return {
      name: pt.name,
      val: val != null ? val.toFixed(6) : '<span style="color:#ccc">--</span>'
    }
  })
})

const marketEmptyMsg = computed(() => {
  if (!monthSelected.value) return '请选择计算年月'
  if (!selectedProvince.value) return '请选择省份'
  const list = store.priceTypes[selectedProvince.value] || []
  if (list.length === 0) return '该省份尚未配置价格数据'
  return ''
})

function getPrefOptions(f) {
  if (!selectedProvince.value) return []
  const allNames = (store.priceTypes[selectedProvince.value] || []).map(pt => pt.name)
  const prefOpts = (f.prefOptions || '').split(',').map(s => s.trim()).filter(Boolean)
  if (prefOpts.length === 0) return allNames
  return allNames.filter(name => prefOpts.some(kw => name.indexOf(kw) !== -1))
}

function onPrefSourceChange(code) {
  // handled via DOM query in calculate - no reactive tracking needed
}

function onNumInput(e, refVal) {
  if (!refVal) return  // 无参考值时不限制输入格式（纯文本框）
  e.target.value = validateNumInput(e.target.value, refVal)
}

watch(selectedProvince, (prov) => {
  if (prov) {
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    calcMonth.value = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0')
    store.cCalcMonth = calcMonth.value
  }
}, { immediate: true })
</script>
