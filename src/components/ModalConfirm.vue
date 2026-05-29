<template>
  <div class="modal-overlay confirm-overlay" v-if="store.showConfirmModal" @click.self="store.showConfirmModal = false">
    <div class="confirm-box">
      <h3>提示</h3>
      <p>{{ store.confirmMessage }}</p>
      <div class="btn-group" style="justify-content:center">
        <button class="btn" @click="store.showConfirmModal = false">取消</button>
        <button class="btn btn-danger" @click="onConfirm">确认删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()

function onConfirm() {
  if (store.confirmCallback) store.confirmCallback()
}
</script>
