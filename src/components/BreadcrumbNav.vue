<template>
  <div class="breadcrumb" v-html="store.breadcrumbHtml" @click="onBreadcrumbClick"></div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()

function onBreadcrumbClick(e) {
  if (e.target.tagName === 'A') {
    e.preventDefault()
    const idx = Array.from(e.target.parentElement.children).filter(c => c.tagName === 'A').indexOf(e.target)
    if (idx >= 0) {
      const item = store.navStack[idx]
      if (item) store.adminNav(item.page, item.prov)
    }
  }
}
</script>
