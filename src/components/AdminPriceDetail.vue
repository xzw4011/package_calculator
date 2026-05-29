<template>
  <div class="card" v-if="store.adminPage === 'priceDetail' && pt">
    <div class="card-header">
      <h2>价格详情 — {{ pt.name }}</h2>
      <div class="btn-group">
        <button class="btn btn-sm" :class="{ 'btn-primary': store.priceEditMode }" @click="store.togglePriceEdit()">
          {{ store.priceEditMode ? '保存' : '编辑' }}
        </button>
        <button class="btn btn-sm" style="display:none" @click="store.toast('模拟Excel导入功能')">📥 Excel导入</button>
      </div>
    </div>
    <div class="card-body">
      <div style="margin-bottom:16px;color:var(--text-secondary);font-size:14px">
        <strong>省份：</strong>{{ store.currentProvince }} |
        <strong>配置方式：</strong>{{ pt.method === 'year' ? '按年' : '按年月' }}
      </div>
      <div class="price-grid" v-if="pt.method === 'year'">
        <div class="price-item"><label>全年价格</label>
          <input type="text" id="price_0" :value="pt.prices.year != null ? pt.prices.year.toFixed(6) : ''" placeholder="0.000000" :readonly="!store.priceEditMode">
        </div>
      </div>
      <div class="price-grid" v-else>
        <div class="price-item" v-for="m in 12" :key="m">
          <label>{{ m }}月</label>
          <input type="text" :id="'price_' + m" :value="pt.prices.months && pt.prices.months[m] !== undefined ? pt.prices.months[m].toFixed(6) : ''" placeholder="0.000000" :readonly="!store.priceEditMode">
        </div>
      </div>
      <div style="margin-top:16px" :style="{ color: store.priceEditMode ? 'var(--primary)' : 'var(--text-hint)', fontSize: '13px' }">
        {{ store.priceEditMode ? '编辑模式，修改后点击保存' : '点击编辑按钮可修改' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app.js'
const store = useAppStore()
const pt = computed(() => store.getPriceDetail())
</script>
