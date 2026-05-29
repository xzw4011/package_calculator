<template>
  <div>
    <div class="c-card" style="text-align:center">
      <div class="c-result-month" v-html="resultMonthHtml"></div>
      <div class="c-result-price"><span>{{ resultPrice }}</span><span class="ut">元/千瓦时</span></div>
      <div class="c-result-label">客户月度结算价</div>
    </div>
    <div class="c-card">
      <div class="c-card-title">输入参数回显</div>
      <div v-for="(row, idx) in echoRows" :key="idx" class="c-rrow">
        <span class="k">{{ row.k }}</span>
        <span class="v">{{ row.v }}</span>
      </div>
    </div>
    <div class="c-card">
      <div class="c-card-title">计算日志</div>
      <pre style="font-size:12px;max-height:300px;overflow:auto;background:#f9f9f9;padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;margin:0;">{{ debugLog }}</pre>
    </div>
    <div class="c-disclaimer">温馨提示：本价格仅做参考，请以实际结算数据为准</div>
    <button class="btn-block outline" @click="$emit('back')">重新计算</button>
    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  resultData: { type: Object, default: () => ({}) }
})

defineEmits(['back'])

const resultMonthHtml = computed(() => props.resultData.monthHtml || '')
const resultPrice = computed(() => props.resultData.price || '--')
const echoRows = computed(() => props.resultData.echo || [])
const debugLog = computed(() => props.resultData.log || '(无日志)')
</script>
