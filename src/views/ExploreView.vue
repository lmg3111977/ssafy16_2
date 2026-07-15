<script setup lang="ts">
import FestivalMapSection from '../features/map/FestivalMapSection.vue'
import type { ChatMapRequest } from '../features/map/types'

defineProps<{
  chatMapRequest?: ChatMapRequest | null
}>()
</script>

<template>
  <FestivalMapSection :chat-map-request="chatMapRequest" />
</template>
