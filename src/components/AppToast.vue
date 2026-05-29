<template>
  <div class="toast" :class="{ show: store.toastText }">{{ store.toastText }}</div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()
</script>
