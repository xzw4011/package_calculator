<template>
  <nav class="top-nav">
    <div class="logo">我要售电 · 套餐计算器</div>
    <button
      class="nav-tab"
      :class="{ active: store.activeTab === 'admin' }"
      @click="$emit('switch', 'admin')"
    >后台管理</button>
    <button
      class="nav-tab"
      :class="{ active: store.activeTab === 'client' }"
      @click="$emit('switch', 'client')"
    >C端预览</button>
  </nav>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()
defineEmits(['switch'])
</script>
