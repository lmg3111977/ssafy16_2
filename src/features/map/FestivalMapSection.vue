<script setup lang="ts">
import { computed, ref } from 'vue'

import FestivalFilter from './components/FestivalFilter.vue'
import FestivalMap from './components/FestivalMap.vue'

import festivalJson from '../../../netlify/functions/data/seoul-festivals.json'
import { filterMapPlaces, normalizeDatasetItems } from './data'
import type { RawMapDataset } from './types'

// 불러온 JSON의 전체 구조를 FestivalDataset으로 지정
const festivalData = festivalJson as RawMapDataset

// 사용자가 선택한 필터값
const selectedDistrict = ref('전체')
const selectedStartDate = ref('')
const selectedEndDate = ref('')

/*
 * 주소에서 자치구 이름 추출
 *
 * 서울특별시 종로구 대학로 104
 * → 종로구
 */
const festivals = normalizeDatasetItems(festivalData.items, 'festival')

/*
 * 중복을 제거한 자치구 목록 생성
 *
 * 종로구, 강남구, 강남구
 * → 강남구, 종로구
 */
const districts = [
  ...new Set(
    festivals
      .map((festival) => {
        return festival.district ?? '기타'
      })
      .filter((district) => {
        return district !== '기타'
      }),
  ),
].sort((a, b) => {
  return a.localeCompare(b, 'ko-KR')
})

/*
 * 날짜 입력창의 값:
 * 2026-07-16
 *
 * 축제 JSON의 값:
 * 20260716
 *
 * 비교할 수 있도록 하이픈 제거
 */
/*
 * 시작일이 종료일보다 늦은지 확인
 */
const isInvalidDateRange = computed(() => {
  return Boolean(
    selectedStartDate.value &&
      selectedEndDate.value &&
      selectedStartDate.value >
        selectedEndDate.value,
  )
})

/*
 * 필터가 하나라도 적용되어 있는지 확인
 */
const hasActiveFilter = computed(() => {
  return (
    selectedDistrict.value !== '전체' ||
    selectedStartDate.value !== '' ||
    selectedEndDate.value !== ''
  )
})

/*
 * 자치구와 기간을 모두 적용한 최종 축제 목록
 */
const filteredFestivals = computed(() => {
  if (isInvalidDateRange.value) {
    return []
  }

  return filterMapPlaces(festivals, {
    district: selectedDistrict.value,
    startDate: selectedStartDate.value,
    endDate: selectedEndDate.value,
  })
})

/*
 * 필터 초기화
 */
const resetFilters = () => {
  selectedDistrict.value = '전체'
  selectedStartDate.value = ''
  selectedEndDate.value = ''
}
</script>

<template>
  <section
    id="festivals"
    class="map-feature-section"
  >
    <!-- 제목 영역 -->
    <header class="map-feature-header">
      <div class="map-feature-heading">
        <span class="map-feature-kicker">
          Seoul Festival Map
        </span>

        <h2>
          서울의 축제를
          <strong>지도에서 찾아보세요.</strong>
        </h2>

        <p>
          원하는 자치구와 기간을 선택하면
          조건에 맞는 축제 위치만 지도에 표시됩니다.
        </p>
      </div>

      <div class="map-feature-result">
        <span>검색 결과</span>

        <strong>
          {{ filteredFestivals.length }}
          <small>개</small>
        </strong>

        <p>
          전체 {{ festivals.length }}개 행사
        </p>
      </div>
    </header>

    <div class="map-feature-workspace">
      <!-- 필터 영역 -->
      <div class="map-feature-filter-card">
      <div class="map-feature-filter-header">
        <div>
          <span>축제 검색 조건</span>

          <strong>
            지역과 기간을 선택해 주세요.
          </strong>
        </div>

        <button
          v-if="hasActiveFilter"
          type="button"
          class="map-feature-reset"
          @click="resetFilters"
        >
          필터 초기화
        </button>
      </div>

      <div class="map-feature-filter-grid">
        <!-- 자치구 필터 -->
        <FestivalFilter
          v-model="selectedDistrict"
          :districts="districts"
        />

        <!-- 시작일 필터 -->
        <div class="map-feature-date-field">
          <label for="festival-start-date">
            시작일
          </label>

          <div class="map-feature-date-input">
            <span aria-hidden="true">
              📅
            </span>

            <input
              id="festival-start-date"
              v-model="selectedStartDate"
              type="date"
              :max="selectedEndDate || undefined"
            />
          </div>
        </div>

        <!-- 종료일 필터 -->
        <div class="map-feature-date-field">
          <label for="festival-end-date">
            종료일
          </label>

          <div class="map-feature-date-input">
            <span aria-hidden="true">
              📅
            </span>

            <input
              id="festival-end-date"
              v-model="selectedEndDate"
              type="date"
              :min="selectedStartDate || undefined"
            />
          </div>
        </div>
      </div>

      <p
        v-if="isInvalidDateRange"
        class="map-feature-error"
      >
        종료일은 시작일보다 빠를 수 없습니다.
      </p>
      </div>

      <!-- 지도 영역 -->
      <div class="map-feature-card">
      <div class="map-feature-card-header">
        <div>
          <span class="map-feature-live-dot"></span>
          축제 위치
        </div>

        <span>
          마커를 누르면 상세 정보를 확인할 수 있습니다.
        </span>
      </div>

      <div class="map-feature-area">
        <FestivalMap :places="filteredFestivals" />

        <!-- 검색 결과가 없을 때 -->
        <div
          v-if="filteredFestivals.length === 0"
          class="map-feature-empty"
        >
          <span aria-hidden="true">
            🗺️
          </span>

          <strong>
            조건에 맞는 축제가 없습니다.
          </strong>

          <p>
            지역이나 기간을 다시 선택해 주세요.
          </p>
        </div>
      </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.map-feature-section {
  width: min(var(--lh-content), calc(100% - 40px));
  margin: 0 auto;
  padding: 76px 0 90px;
}

/* 제목 영역 */

.map-feature-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 40px;

  margin-bottom: 28px;
}

.map-feature-kicker {
  color: var(--lh-primary);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.map-feature-heading h2 {
  margin: 10px 0 12px;

  color: var(--lh-ink);
  font-size: 36px;
  line-height: 1.25;
  letter-spacing: -0.04em;
}

.map-feature-heading h2 strong {
  color: var(--lh-primary);
}

.map-feature-heading p {
  margin: 0;

  color: var(--lh-muted);
  font-size: 15px;
  line-height: 1.7;
}

/* 검색 결과 카드 */

.map-feature-result {
  flex: 0 0 185px;
  padding: 18px 20px;

  border: 1px solid var(--lh-line);
  border-radius: 18px;
  background: var(--lh-card);

  box-shadow:
    0 16px 42px rgba(31, 51, 91, 0.08);
}

.map-feature-result > span {
  color: #7c879a;
  font-size: 12px;
  font-weight: 700;
}

.map-feature-result strong {
  display: block;
  margin: 6px 0 5px;

  color: var(--lh-primary);
  font-size: 30px;
  line-height: 1;
}

.map-feature-result small {
  font-size: 14px;
}

.map-feature-result p {
  margin: 0;

  color: #8a94a6;
  font-size: 11px;
}

.map-feature-workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  align-items: start;
  gap: 24px;
}

/* 필터 카드 */

.map-feature-filter-card {
  padding: 22px;

  border: 1px solid var(--lh-line);
  border-radius: var(--lh-radius-lg);
  background: var(--lh-card);

  box-shadow:
    0 14px 36px rgba(31, 51, 91, 0.06);
}

.map-feature-filter-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  margin-bottom: 20px;
}

.map-feature-filter-header > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.map-feature-filter-header span {
  color: #3165ff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.map-feature-filter-header strong {
  color: #172033;
  font-size: 16px;
}

.map-feature-filter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

/* 날짜 입력 */

.map-feature-date-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-feature-date-field label {
  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.map-feature-date-input {
  position: relative;
}

.map-feature-date-input > span {
  position: absolute;
  top: 50%;
  left: 14px;

  transform: translateY(-50%);
  pointer-events: none;
}

.map-feature-date-input input {
  width: 100%;
  height: 48px;
  padding: 0 14px 0 42px;

  color: #172033;
  border: 1px solid #dfe5ef;
  border-radius: 12px;
  background: #ffffff;

  font: inherit;

  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.map-feature-date-input input:hover {
  border-color: #8aa5ff;
}

.map-feature-date-input input:focus {
  border-color: #3165ff;
  outline: none;

  box-shadow:
    0 0 0 4px rgba(49, 101, 255, 0.1);
}

/* 초기화 버튼 */

.map-feature-reset {
  padding: 9px 13px;

  color: #2757e6;
  border: 1px solid #cad6ff;
  border-radius: 10px;
  background: #edf2ff;

  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.map-feature-reset:hover {
  border-color: #8aa5ff;
  background: #e3eaff;
}

/* 오류 메시지 */

.map-feature-error {
  margin: 14px 0 0;

  color: #d73955;
  font-size: 13px;
}

/* 지도 카드 */

.map-feature-card {
  padding: 12px;

  border: 1px solid var(--lh-line);
  border-radius: var(--lh-radius-lg);
  background: var(--lh-card);

  box-shadow:
    0 22px 55px rgba(31, 51, 91, 0.12);
}

.map-feature-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  height: 44px;
  padding: 0 8px 10px;

  color: #7c879a;
  font-size: 12px;
}

.map-feature-card-header > div {
  display: flex;
  align-items: center;
  gap: 9px;

  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.map-feature-live-dot {
  width: 9px;
  height: 9px;

  border-radius: 50%;
  background: #3165ff;

  box-shadow:
    0 0 0 5px rgba(49, 101, 255, 0.12);
}

.map-feature-area {
  position: relative;
}

/* 검색 결과 없음 */

.map-feature-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 500;

  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 270px;
  padding: 25px;

  border: 1px solid #dfe5ef;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);

  transform: translate(-50%, -50%);

  box-shadow:
    0 16px 40px rgba(31, 51, 91, 0.14);
}

.map-feature-empty > span {
  margin-bottom: 9px;
  font-size: 34px;
}

.map-feature-empty strong {
  color: #172033;
}

.map-feature-empty p {
  margin: 6px 0 0;

  color: #7c879a;
  font-size: 13px;
}

/* 모바일 */

@media (max-width: 800px) {
  .map-feature-section {
    width: min(100% - 24px, var(--lh-content));
    padding: 46px 0 64px;
  }

  .map-feature-workspace {
    grid-template-columns: 1fr;
  }

  .map-feature-header {
    align-items: stretch;
    flex-direction: column;
  }

  .map-feature-result {
    flex: auto;
  }

  .map-feature-filter-grid {
    grid-template-columns: 1fr;
  }

  .map-feature-heading h2 {
    font-size: 30px;
  }

  .map-feature-card-header > span {
    display: none;
  }
}
</style>
