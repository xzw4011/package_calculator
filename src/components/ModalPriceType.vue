<template>
  <div class="modal-overlay" v-if="store.showPriceModal" @click.self="store.showPriceModal = false">
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <h3>{{ store.editingPtId ? '编辑价格类型' : '新增价格类型' }}</h3>
        <button class="modal-close" @click="store.showPriceModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label"><span class="req">*</span> 价格类型名称</label>
          <input type="text" v-model="store.ptForm.name" maxlength="30" placeholder="如：批发市场中长期交易加权出清价格">
          <div class="form-hint">限制30字以内</div>
        </div>
        <div class="form-group">
          <label class="form-label"><span class="req">*</span> 配置方式</label>
          <select v-model="store.ptForm.method">
            <option value="year">按年（全年统一价格）</option>
            <option value="month">按年月（分别配置1-12月）</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="store.showPriceModal = false">取消</button>
        <button class="btn btn-primary" @click="store.savePriceType()">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()
</script>
