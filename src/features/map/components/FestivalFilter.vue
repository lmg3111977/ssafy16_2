<script setup lang="ts">
defineProps<{
  // 현재 선택된 자치구
  modelValue: string

  // 선택 목록에 표시할 서울 자치구 배열
  districts: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const handleChange = (event: Event) => {
  const selectElement =
    event.target as HTMLSelectElement

  emit(
    'update:modelValue',
    selectElement.value,
  )
}
</script>

<template>
  <div class="festival-filter-field">
    <label for="district-select">
      지역
    </label>

    <div class="festival-select-wrapper">
      <span
        class="festival-select-icon"
        aria-hidden="true"
      >
        📍
      </span>

      <select
        id="district-select"
        :value="modelValue"
        @change="handleChange"
      >
        <option value="전체">
          서울 전체
        </option>

        <option
          v-for="district in districts"
          :key="district"
          :value="district"
        >
          {{ district }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.festival-filter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.festival-filter-field label {
  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.festival-select-wrapper {
  position: relative;
}

.festival-select-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  z-index: 1;

  transform: translateY(-50%);
  pointer-events: none;
}

.festival-select-wrapper select {
  width: 100%;
  height: 48px;
  padding: 0 42px;

  color: #172033;
  border: 1px solid #dfe5ef;
  border-radius: 12px;
  background: #ffffff;

  font-size: 14px;

  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.festival-select-wrapper select:hover {
  border-color: #8aa5ff;
}

.festival-select-wrapper select:focus {
  border-color: var(--lh-primary);
  outline: none;
  box-shadow:
    0 0 0 4px rgba(49, 101, 255, 0.1);
}
</style>
