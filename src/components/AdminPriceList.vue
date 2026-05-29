<template>
  <div class="card" v-if="store.adminPage === 'priceList'">
    <div class="card-header">
      <h2>配置价格 — {{ store.currentProvince }}</h2>
      <button class="btn btn-primary btn-sm" @click="store.openPriceModal()">+ 新增价格类型</button>
    </div>
    <div class="card-body">
      <div class="empty" v-if="store.currentPriceTypes.length === 0">暂无价格类型，点击右上角新增</div>
      <div v-else class="price-type-card" v-for="pt in store.currentPriceTypes" :key="pt.id">
        <div class="info">
          <div class="name">{{ pt.name }}</div>
          <div class="meta">{{ pt.method === 'year' ? '按年' : '按年月' }} · {{ pricePreview(pt) }}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm" @click="store.openPriceDetail(pt.id)">配置</button>
          <button class="btn btn-sm" @click="store.openPriceModal(pt.id)">编辑</button>
          <button class="btn btn-sm btn-danger" @click="store.deletePriceType(pt.id)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()

function pricePreview(pt) {
  if (pt.method === 'year' && pt.prices.year != null) return '当前价格：' + pt.prices.year.toFixed(6)
  if (pt.method === 'month') {
    const filled = Object.keys(pt.prices.months || {}).length
    return '已配置 ' + filled + '/12 个月'
  }
  return ''
}
</script>
