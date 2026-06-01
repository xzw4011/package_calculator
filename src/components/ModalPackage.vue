<template>
  <div class="modal-overlay" v-if="store.showPackageModal" @click.self="store.showPackageModal = false">
    <div class="modal" style="max-width:800px">
      <div class="modal-header">
        <h3>{{ store.editingPkgId ? '编辑套餐' : '新增套餐' }}</h3>
        <button class="modal-close" @click="store.showPackageModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label"><span class="req">*</span> 套餐名称</label>
            <input type="text" v-model="store.pkgForm.name" maxlength="30" placeholder="如：2026年江苏固定+浮动套餐">
            <div class="form-hint">限制30字以内</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label"><span class="req">*</span> 套餐有效期（起）</label>
            <input type="month" v-model="store.pkgForm.start" min="2000-01" max="2099-12">
          </div>
          <div class="form-group"><label class="form-label"><span class="req">*</span> 套餐有效期（止）</label>
            <input type="month" v-model="store.pkgForm.end" min="2000-01" max="2099-12">
          </div>
        </div>

        <!-- Formula Builder -->
        <div class="form-group">
          <label class="form-label">套餐公式配置</label>
          <p class="form-hint" style="margin-bottom:8px">点击运算符号或价格字段将其加入公式编辑区。公式中可使用IF(条件,真值,假值)和min(值1,值2)函数</p>
          <div class="formula-bar">
            <span v-for="ch in formulaOps" :key="ch" class="formula-chip" :class="ch === 'IF(' || ch === 'min(' ? 'func' : 'op'" @click="insertFormula(ch)">{{ ch }}</span>
            <span v-for="pt in store.currentPriceTypes" :key="'pt_' + pt.id" class="formula-chip" @click="insertFormula(pt.name, true)">{{ pt.name }}</span>
            <span v-for="(f, i) in validFields" :key="'tf_' + i" class="formula-chip var" @click="insertFormula(f.name, true)" :title="'编码：' + f.code">{{ f.name }}</span>
          </div>
          <div
            ref="formulaDisplay"
            class="formula-display"
            :class="{ 'has-content': hasFormulaContent }"
            contenteditable="true"
            placeholder="请输入客户月份结算价公式"
            @input="onFormulaInput"
            @blur="onFormulaBlur"
          ></div>
        </div>

        <!-- Field Table -->
        <div class="form-group">
          <label class="form-label">C端输入字段定义</label>
          <p class="form-hint" style="margin-bottom:8px">定义套餐公式中需要C端用户手动填入的变量字段</p>
          <button class="btn btn-sm" @click="store.addFieldRow()" style="margin-bottom:8px">+ 新增字段</button>
          <table class="field-table">
            <thead><tr><th>字段名称</th><th>字段编码</th><th>字段类型</th><th>备注</th><th>位数限制</th><th style="width:80px">操作</th></tr></thead>
            <tbody>
              <tr v-if="store.tempFields.length === 0">
                <td colspan="6" style="text-align:center;color:var(--text-hint)">暂无字段</td>
              </tr>
              <template v-for="(f, i) in store.tempFields" :key="i">
                <tr>
                  <td><input type="text" :value="f.name || ''" placeholder="字段名称" @change="store.updateTF(i, 'name', $event.target.value)" maxlength="30"></td>
                  <td><input type="text" :value="f.code || ''" placeholder="字段编码" @change="store.updateTF(i, 'code', $event.target.value)"></td>
                  <td>
                    <select :value="getFieldType(f)" @change="store.updateTF(i, 'type', $event.target.value)" style="width:110px">
                      <option value="text">文本输入</option>
                      <option value="pref_select">参考价</option>
                      <option value="pct_input">百分比输入</option>
                    </select>
                  </td>
                  <td><input type="text" :value="f.remark || ''" placeholder="限10字" maxlength="10" @change="store.updateTF(i, 'remark', $event.target.value)" style="width:90px;font-size:12px"></td>
                  <td><input type="text" :value="f.refValue || ''" placeholder="如0.000000" @change="store.updateTF(i, 'refValue', $event.target.value)" style="width:90px;font-size:12px"></td>
                  <td><button class="btn btn-sm btn-danger" @click="store.removeTF(i)">删除</button></td>
                </tr>
                <tr v-if="getFieldType(f) === 'pref_select'" style="background:#fafafa">
                  <td colspan="6" style="padding:8px 12px;font-size:12px;overflow:visible">
                    <span style="color:var(--text-secondary);margin-right:8px">可选价格类型：</span>
                    <div class="ms-wrap">
                      <div class="ms-trigger" :class="{ open: openMsIdx === i }" @click.stop="toggleMsDropdown(i)">
                        <div class="ms-tags">
                          <span v-for="tag in getMsSelectedTags(i)" :key="tag" class="ms-tag">
                            {{ tag }}<span class="ms-tag-close" @click.stop="msRemoveTag(i, tag)">×</span>
                          </span>
                        </div>
                        <span class="ms-placeholder" :style="{ display: getMsSelectedTags(i).length > 0 ? 'none' : '' }">请选择价格类型</span>
                        <span class="ms-arrow">▾</span>
                      </div>
                      <div class="ms-dropdown" :class="{ show: openMsIdx === i }">
                        <div class="ms-item ms-item-all">
                          <label style="display:flex;align-items:center;gap:8px;padding:0;cursor:pointer;font-weight:500">
                            <input type="checkbox" value="__all__" :checked="getMsSelectedTags(i).length === 0" @change="msToggleAll(i, $event.target)" style="flex-shrink:0;width:14px;height:14px;margin:0;cursor:pointer;accent-color:var(--primary)">全选
                          </label>
                        </div>
                        <div v-if="store.currentPriceTypes.length === 0" class="ms-empty">暂无价格类型</div>
                        <div v-for="pt in store.currentPriceTypes" :key="pt.id" class="ms-item">
                          <label style="display:flex;align-items:center;gap:8px;padding:0;cursor:pointer">
                            <input type="checkbox" :value="pt.name" :checked="isMsSelected(i, pt.name)" @change="msOnChange(i)" style="flex-shrink:0;width:14px;height:14px;margin:0;cursor:pointer;accent-color:var(--primary)">{{ pt.name }}
                          </label>
                        </div>
                      </div>
                    </div>
                    <span style="color:var(--text-hint);margin-left:8px;font-size:11px">留空=全部价格类型</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Validation Rules -->
        <div class="form-group" style="margin-top:16px">
          <label class="form-label">校验规则</label>
          <p class="form-hint" style="margin-bottom:8px">配置C端输入校验规则，触发时弹窗提示并阻止计算</p>
          <div v-if="store.tempRules.length === 0" class="form-hint" style="text-align:center;padding:12px">暂无校验规则</div>
          <div v-for="(r, i) in store.tempRules" :key="i" class="rule-card">
            <div class="rule-row">
              <span style="font-weight:500;min-width:50px">规则{{ i + 1 }}</span>
              <select :value="r.type" @change="r.type = $event.target.value" style="width:100px">
                <option value="sum">多项之和</option>
                <option value="max">单项</option>
              </select>
              <select :value="r.operator" @change="r.operator = $event.target.value" style="width:60px">
                <option value=">=">>=</option>
                <option value=">">></option>
                <option value="<="><=</option>
                <option value="<"><</option>
                <option value="=">=</option>
              </select>
              <input type="number" :value="r.value || ''" placeholder="阈值" style="width:100px" step="any" @change="r.value = parseFloat($event.target.value) || 0">
              <button class="btn btn-sm btn-danger" @click="store.removeRule(i)">删除</button>
            </div>
            <div class="rule-row">
              <span style="font-size:12px;color:var(--text-hint);min-width:50px">校验字段</span>
              <div class="field-checkboxes">
                <span v-if="validFields.length === 0" style="color:var(--text-hint)">暂无可用字段</span>
                <template v-if="r.type === 'max'">
                  <label v-for="f in validFields" :key="f.code" style="cursor:pointer;white-space:nowrap">
                    <input type="radio" :name="'rule_'+i+'_field'" :checked="(r.fields || []).includes(f.code)" @change="store.selectRuleField(i, f.code)">{{ f.name }}
                  </label>
                  <label style="cursor:pointer;white-space:nowrap;margin-left:8px">
                    <input type="radio" :name="'rule_'+i+'_field'" :checked="(r.fields || []).length === 0" @change="store.selectRuleField(i, '')">不限制
                  </label>
                </template>
                <template v-else>
                  <label v-for="f in validFields" :key="f.code" style="cursor:pointer;white-space:nowrap">
                    <input type="checkbox" :checked="(r.fields || []).includes(f.code)" @change="store.toggleRuleField(i, f.code, $event.target.checked)">{{ f.name }}
                  </label>
                </template>
              </div>
            </div>
            <div class="rule-row">
              <span style="font-size:12px;color:var(--text-hint);min-width:50px">提示内容</span>
              <input class="rule-msg" type="text" :value="r.message || ''" placeholder="如：固定价格+浮动价格之和不能超过0.5" maxlength="50" @change="r.message = $event.target.value">
            </div>
          </div>
          <button class="btn btn-sm" @click="store.addRuleRow()" style="margin-top:8px">+ 新增校验规则</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="store.showPackageModal = false">取消</button>
        <button class="btn btn-primary" @click="saveAndClose">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app.js'
import { getFieldType } from '../utils/formula.js'

const store = useAppStore()
const formulaDisplay = ref(null)
const hasFormulaContent = ref(false)
const openMsIdx = ref(-1)

// Multi-select helpers
function getMsSelectedTags(i) {
  const f = store.tempFields[i]
  if (!f) return []
  return (f.prefOptions || '').split(',').map(s => s.trim()).filter(Boolean)
}
function isMsSelected(i, name) {
  return getMsSelectedTags(i).includes(name)
}
function toggleMsDropdown(i) {
  openMsIdx.value = openMsIdx.value === i ? -1 : i
}
function msOnChange(i) {
  const f = store.tempFields[i]
  if (!f) return
  const allNames = store.currentPriceTypes.map(p => p.name)
  const selected = allNames.filter(name => isCheckboxChecked(i, name))
  f.prefOptions = selected.join(',')
  if (selected.length === 0) {
    // "全选" state - uncheck all triggers all-selected
  }
}
function isCheckboxChecked(i, name) {
  const f = store.tempFields[i]
  if (!f) return false
  return (f.prefOptions || '').split(',').map(s => s.trim()).filter(Boolean).includes(name)
}
function msToggleAll(i, target) {
  const f = store.tempFields[i]
  if (!f) return
  if (target.checked) {
    f.prefOptions = ''
  } else {
    target.checked = true
  }
}
function msRemoveTag(i, name) {
  const f = store.tempFields[i]
  if (!f) return
  const tags = (f.prefOptions || '').split(',').map(s => s.trim()).filter(Boolean)
  f.prefOptions = tags.filter(t => t !== name).join(',')
}
function closeAllMs() {
  openMsIdx.value = -1
}

const validFields = computed(() => store.tempFields.filter(f => f.name.trim() && f.code.trim()))
const operations = ['+', '-', '×', '÷', '(', ')', 'min(', 'IF(', ',']

const formulaOps = computed(() => operations)

let savedRange = null

function insertFormula(text, isParam = false) {
  const el = formulaDisplay.value
  if (!el) return
  el.focus()

  if (savedRange) {
    try {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRange)
    } catch (e) {}
    savedRange = null
  }

  const sel = window.getSelection()
  if (sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
    const r = sel.getRangeAt(0)
    r.deleteContents()
    if (isParam) {
      const tag = document.createElement('span')
      tag.className = 'formula-tag'
      tag.contentEditable = 'false'
      tag.setAttribute('data-value', text)
      tag.textContent = text
      r.insertNode(tag)
      const space = document.createTextNode(' ')
      r.setStartAfter(tag)
      r.collapse(true)
      tag.after(space)
    } else {
      const tn = document.createTextNode(' ' + text + ' ')
      r.insertNode(tn)
      r.setStartAfter(tn)
      r.collapse(true)
    }
    sel.removeAllRanges()
    sel.addRange(r)
  } else {
    if (isParam) {
      const tag = document.createElement('span')
      tag.className = 'formula-tag'
      tag.contentEditable = 'false'
      tag.setAttribute('data-value', text)
      tag.textContent = text
      el.appendChild(tag)
      el.appendChild(document.createTextNode(' '))
    } else {
      el.appendChild(document.createTextNode(' ' + text + ' '))
    }
  }
  el.classList.add('has-content')
  hasFormulaContent.value = true
  el.focus()
}

function onFormulaInput() {
  const el = formulaDisplay.value
  if (el) {
    hasFormulaContent.value = el.textContent.trim().length > 0
  }
}

function onFormulaBlur() {
  const sel = window.getSelection()
  if (sel.rangeCount > 0 && sel.anchorNode) {
    const el = formulaDisplay.value
    if (el && el.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange()
    }
  }
  // 失焦时重新解析公式，修复手动编辑导致的tag/文字混排问题
  const raw = getFormulaValue()
  if (raw.trim()) {
    setFormulaValue(raw)
  } else {
    const el2 = formulaDisplay.value
    if (el2) { el2.innerHTML = ''; hasFormulaContent.value = false }
  }
}

function getFormulaValue() {
  const el = formulaDisplay.value
  if (!el) return ''
  let result = ''
  function walk(node) {
    if (node.nodeType === 3) {
      result += node.textContent
    } else if (node.nodeType === 1) {
      if (node.classList.contains('formula-tag')) {
        result += node.getAttribute('data-value') || node.textContent
      } else {
        for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i])
      }
    }
  }
  for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i])
  return result.trim()
}

function setFormulaValue(text) {
  const el = formulaDisplay.value
  if (!el) return
  el.innerHTML = ''
  if (!text) {
    hasFormulaContent.value = false
    return
  }

  const pl = store.currentPriceTypes.map(p => p.name)
  const tfNames = validFields.value.map(f => f.name)
  const tfCodes = validFields.value.map(f => f.code)
  const paramNames = [...pl, ...tfNames, ...tfCodes].sort((a, b) => b.length - a.length)

  let remaining = text
  while (remaining.length > 0) {
    let matched = false
    for (const name of paramNames) {
      if (!name || remaining.indexOf(name) !== 0) continue
      const tag = document.createElement('span')
      tag.className = 'formula-tag'
      tag.contentEditable = 'false'
      tag.setAttribute('data-value', name)
      tag.textContent = name
      el.appendChild(tag)
      remaining = remaining.substring(name.length)
      matched = true
      break
    }
    if (!matched) {
      const txt = remaining.charAt(0)
      const last = el.lastChild
      if (last && last.nodeType === 3) {
        last.textContent += txt
      } else {
        el.appendChild(document.createTextNode(txt))
      }
      remaining = remaining.substring(1)
    }
  }
  hasFormulaContent.value = (text || '').trim().length > 0
}

function saveAndClose() {
  store.pkgForm.formula = getFormulaValue()
  store.savePackage()
}

watch(() => store.showPackageModal, (visible) => {
  if (visible) {
    nextTick(() => {
      setFormulaValue(store.pkgForm.formula || '')
    })
  } else {
    closeAllMs()
  }
})

function onDocClick(e) {
  if (!e.target.closest('.ms-wrap')) {
    closeAllMs()
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
