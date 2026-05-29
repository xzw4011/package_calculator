<template>
  <div class="card" v-if="store.adminPage === 'packages'">
    <div class="card-header">
      <h2>套餐管理 — {{ store.currentProvince }}</h2>
      <button class="btn btn-primary btn-sm" @click="store.openPackageModal()">+ 新增套餐</button>
    </div>
    <div class="card-body">
      <div class="empty" v-if="store.currentPackages.length === 0">暂无套餐，点击右上角新增</div>
      <div v-else class="package-card" v-for="pkg in store.currentPackages" :key="pkg.id">
        <div class="pkg-header">
          <div>
            <span class="pkg-name">{{ pkg.name }}</span>
            <span class="badge" :class="pkg.status === 'active' ? 'badge-active' : 'badge-inactive'" style="margin-left:8px">
              {{ pkg.status === 'active' ? '启用' : '停用' }}
            </span>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm" @click="store.openPackageModal(pkg.id)">编辑</button>
            <button class="btn btn-sm" @click="store.togglePkgStatus(pkg.id)">
              {{ pkg.status === 'active' ? '停用' : '启用' }}
            </button>
            <button class="btn btn-sm btn-danger" @click="store.deletePackage(pkg.id)">删除</button>
          </div>
        </div>
        <div class="pkg-meta">有效期：{{ pkg.start }} 至 {{ pkg.end }}</div>
        <div class="pkg-formula">{{ pkg.formula || '（未配置公式）' }}</div>
        <div class="pkg-meta" style="margin-top:4px">C端输入字段：{{ fieldSummary(pkg) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()

function fieldSummary(pkg) {
  return (pkg.fields || []).map(f => f.name).join('、') || '无'
}
</script>
