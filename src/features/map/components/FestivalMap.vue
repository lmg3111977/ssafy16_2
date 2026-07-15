<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { MapPlace } from '../types'

const props = withDefaults(defineProps<{
  places: MapPlace[]
  highlighted?: boolean
}>(), {
  highlighted: false,
})

// template의 지도 div를 가리키는 변수
const mapContainer = ref<HTMLElement | null>(null)

// Leaflet 지도 객체
let map: L.Map | null = null

// 지도 위의 마커들을 묶어서 관리하는 그룹
let markerLayer: L.LayerGroup | null = null

// 서울시청 주변 좌표
const SEOUL_CENTER: L.LatLngExpression = [
  37.5665,
  126.978,
]

const SEOUL_ZOOM = 11

const markerColors: Record<MapPlace['type'], string> = {
  festival: '#d9465f',
  attraction: '#3165ff',
  culture: '#7c3aed',
  leisure: '#0f9f77',
  accommodation: '#ea7c19',
  shopping: '#d43c93',
  course: '#2276a5',
}

const typeLabels: Record<MapPlace['type'], string> = {
  festival: '축제·행사',
  attraction: '관광지',
  culture: '문화시설',
  leisure: '레포츠',
  accommodation: '숙박',
  shopping: '쇼핑',
  course: '여행 코스',
}

/*
 * 팝업 HTML 안에 외부 데이터를 직접 넣기 전에
 * 특수문자를 안전한 HTML 문자로 변경
 */
const escapeHtml = (value = '') => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

// 20260916 → 2026.09.16
const formatDate = (date?: string) => {
  if (!date || date.length !== 8) {
    return '일정 정보 없음'
  }

  return [
    date.slice(0, 4),
    date.slice(4, 6),
    date.slice(6, 8),
  ].join('.')
}

// 시작일과 종료일을 하나의 기간으로 표시
const formatPeriod = (
  startDate?: string,
  endDate?: string,
) => {
  if (!startDate) {
    return '일정 정보 없음'
  }

  if (!endDate || startDate === endDate) {
    return formatDate(startDate)
  }

  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`
}

/*
 * 좌표가 숫자인지 확인하고,
 * 서울에서 너무 멀리 벗어난 데이터는 제외
 */
const isValidSeoulCoordinate = (
  latitude: number,
  longitude: number,
) => {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 37.4 &&
    latitude <= 37.75 &&
    longitude >= 126.7 &&
    longitude <= 127.3
  )
}

// 마커 클릭 시 나타날 팝업 HTML
const createPopupContent = (place: MapPlace) => {
  const imageArea = place.imageUrl
    ? `
      <div class="festival-popup-image-area">
        <div class="festival-popup-placeholder">
          🎉
        </div>

        <img
          src="${escapeHtml(place.imageUrl ?? '')}"
          alt="${escapeHtml(place.title)}"
          onerror="this.style.display='none'"
        />
      </div>
    `
    : `
      <div class="festival-popup-placeholder">
        🎉
      </div>
    `

  const location =
    place.eventPlace ||
    place.address ||
    '장소 정보 없음'

  const period = place.startDate
    ? `<p><span>📅</span><span>${formatPeriod(place.startDate, place.endDate ?? undefined)}</span></p>`
    : ''
  const price = place.fee
    ? `<p><span>🎫</span><span>${escapeHtml(place.fee)}</span></p>`
    : ''

  return `
    <article class="festival-popup">
      ${imageArea}

      <div class="festival-popup-body">
        <span class="festival-popup-badge">
          ${typeLabels[place.type]}
        </span>

        <strong class="festival-popup-title">
          ${escapeHtml(place.title)}
        </strong>

        <div class="festival-popup-info">
          ${period}

          <p>
            <span>📍</span>
            <span>
              ${escapeHtml(location)}
            </span>
          </p>

          ${price}
        </div>
      </div>
    </article>
  `
}

/*
 * 현재 festivals 배열을 기준으로
 * 기존 마커를 지우고 다시 표시
 */
const renderMarkers = (
  fitToMarkers = false,
) => {
  if (!map || !markerLayer) {
    return
  }

  // null이 아니라는 사실을 지역 변수에 저장
  const currentMap = map
  const currentMarkerLayer = markerLayer

  currentMarkerLayer.clearLayers()

  const bounds: L.LatLngExpression[] = []

  props.places.forEach((place) => {
    const marker = L.circleMarker(
      [place.latitude, place.longitude],
      {
        radius: props.highlighted ? 10 : 7,
        color: '#ffffff',
        weight: props.highlighted ? 3 : 2,
        fillColor: markerColors[place.type],
        fillOpacity: 0.9,
      },
    )

    marker.bindPopup(
      createPopupContent(place),
      {
        minWidth: 260,
        maxWidth: 290,
      },
    )

    marker.addTo(currentMarkerLayer)

    bounds.push([place.latitude, place.longitude])
  })

  /*
   * 최초 화면에서는 무조건 서울 중심으로 표시
   */
  if (!fitToMarkers) {
    currentMap.setView(
      SEOUL_CENTER,
      SEOUL_ZOOM,
    )

    return
  }

  /*
   * 필터가 변경됐을 때는
   * 현재 남아 있는 마커들이 보이도록 지도 이동
   */
  if (bounds.length > 0) {
    currentMap.fitBounds(
      L.latLngBounds(bounds),
      {
        padding: [40, 40],
        maxZoom: 14,
      },
    )
  } else {
    currentMap.setView(
      SEOUL_CENTER,
      SEOUL_ZOOM,
    )
  }
}

// 컴포넌트가 화면에 나타난 뒤 지도 생성
onMounted(() => {
  if (!mapContainer.value) {
    return
  }

  map = L.map(
    mapContainer.value,
    {
      center: SEOUL_CENTER,
      zoom: SEOUL_ZOOM,
      preferCanvas: true,

      // 너무 멀리 축소되는 것 방지
      minZoom: 10,

      // 서울에서 지나치게 멀리 이동하는 것 제한
      maxBounds: [
        [37.3, 126.55],
        [37.85, 127.45],
      ],

      maxBoundsViscosity: 0.7,
    },
  )

  // OpenStreetMap 지도 배경
  L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,

      attribution:
        '&copy; OpenStreetMap contributors',
    },
  ).addTo(map)

  // 마커를 관리할 레이어 그룹 생성
  markerLayer = L.layerGroup().addTo(map)

  // 최초 마커 표시
  renderMarkers(false)

  /*
   * 화면 레이아웃 계산이 끝난 뒤
   * 지도 크기를 다시 계산
   */
  window.setTimeout(() => {
    map?.invalidateSize()
  }, 0)
})

/*
 * 부모에서 전달된 축제 배열이 바뀌면
 * 마커를 다시 그림
 *
 * 이후 자치구·기간 필터와 연결하면 실행됨
 */
watch(
  [() => props.places, () => props.highlighted],
  () => {
    renderMarkers(true)
  },
)

// 페이지에서 지도 컴포넌트가 제거될 때 정리
onBeforeUnmount(() => {
  map?.remove()

  map = null
  markerLayer = null
})
</script>

<template>
  <div
    ref="mapContainer"
    class="festival-map"
    aria-label="서울 지역정보 위치 지도"
  ></div>
</template>

<style>
.festival-map {
  width: 100%;
  height: 560px;
  overflow: hidden;

  border-radius: 18px;
  background: #e9eefb;
}

/* =========================
   축제 마커
========================= */

.festival-marker-shell {
  border: none;
  background: transparent;
}

.festival-marker {
  position: relative;

  display: grid;
  width: 36px;
  height: 36px;

  color: #ffffff;
  border: 3px solid #ffffff;
  border-radius: 50%;
  background: var(--lh-primary);

  font-size: 14px;

  box-shadow:
    0 7px 18px rgba(49, 101, 255, 0.34),
    0 0 0 3px rgba(49, 101, 255, 0.12);

  place-items: center;
}

.festival-marker::after {
  position: absolute;
  bottom: -7px;
  left: 50%;

  width: 12px;
  height: 12px;

  border-right: 3px solid #ffffff;
  border-bottom: 3px solid #ffffff;
  background: var(--lh-primary);

  content: '';
  transform:
    translateX(-50%)
    rotate(45deg);
}

/* =========================
   Leaflet 팝업 기본 스타일
========================= */

.festival-map
  .leaflet-popup-content-wrapper {
  overflow: hidden;
  padding: 0;

  border-radius: 18px;

  box-shadow:
    0 18px 45px
    rgba(31, 51, 91, 0.22);
}

.festival-map
  .leaflet-popup-content {
  width: 270px !important;
  margin: 0;
}

.festival-map
  .leaflet-popup-tip {
  background: #ffffff;
}

/* =========================
   축제 팝업 내부
========================= */

.festival-popup {
  overflow: hidden;
  background: #ffffff;
}

.festival-popup-image-area {
  position: relative;

  width: 100%;
  height: 145px;

  overflow: hidden;
}

.festival-popup-image-area img {
  position: absolute;
  inset: 0;

  width: 100%;
  height: 100%;

  object-fit: cover;
}

.festival-popup-placeholder {
  display: grid;
  width: 100%;
  height: 145px;

  color: var(--lh-primary);

  background:
    radial-gradient(
      circle at 75% 25%,
      rgba(49, 101, 255, 0.2),
      transparent 32%
    ),
    var(--lh-primary-soft);

  font-size: 38px;
  place-items: center;
}

.festival-popup-body {
  padding: 17px;
}

.festival-popup-badge {
  display: inline-flex;

  margin-bottom: 8px;
  padding: 5px 9px;

  color: var(--lh-primary-strong);
  border-radius: 999px;
  background: var(--lh-primary-soft);

  font-size: 10px;
  font-weight: 900;
}

.festival-popup-title {
  display: block;

  margin-bottom: 13px;

  color: #172033;

  font-size: 17px;
  line-height: 1.45;

  word-break: keep-all;
}

.festival-popup-info {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.festival-popup-info p {
  display: flex;
  align-items: flex-start;
  gap: 8px;

  margin: 0;

  color: #69758c;

  font-size: 12px;
  line-height: 1.55;

  word-break: keep-all;
}

.festival-popup-info p > span:first-child {
  flex: 0 0 auto;
}

/* =========================
   지도 확대·축소 버튼
========================= */

.festival-map
  .leaflet-control-zoom {
  overflow: hidden;

  border: none !important;
  border-radius: 12px !important;

  box-shadow:
    0 8px 24px
    rgba(31, 51, 91, 0.18) !important;
}

.festival-map
  .leaflet-control-zoom a {
  color: var(--lh-primary-strong) !important;

  border-bottom-color:
    #e7ebf2 !important;
}

@media (max-width: 800px) {
  .festival-map {
    height: 480px;
  }
}
</style>
