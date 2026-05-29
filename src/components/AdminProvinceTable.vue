<template>
  <div class="card" v-if="store.adminPage === 'provinces'">
    <div class="card-header"><h2>全国省份管理（31省）</h2></div>
    <div class="card-body">
      <div class="table-wrap">
        <table>
          <thead><tr><th style="width:50px">#</th><th>省份</th><th style="width:120px">状态</th><th style="width:260px">操作</th></tr></thead>
          <tbody>
            <tr v-for="(p, i) in store.PROVINCES" :key="p">
              <td>{{ i + 1 }}</td>
              <td><strong>{{ p }}</strong></td>
              <td style="white-space:nowrap">
                <label class="toggle"><input type="checkbox" :checked="store.provStatus[p]" @change="store.toggleProvince(p)"><span class="toggle-slider"></span></label>
                <span style="margin-left:8px;font-size:12px">{{ store.provStatus[p] ? '启用' : '停用' }}</span>
              </td>
              <td style="white-space:nowrap"><div class="btn-group">
                <button class="btn btn-sm" @click="store.adminNav('priceList', p)">💰 配置价格</button>
                <button class="btn btn-sm" @click="store.adminNav('packages', p)">📦 套餐管理</button>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app.js'
const store = useAppStore()
</script>
