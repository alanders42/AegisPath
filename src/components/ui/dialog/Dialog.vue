<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import { watch } from 'vue'
import { X } from '@lucide/vue'
const props = defineProps<{ open: boolean; title: string; description: string }>()
defineEmits<{ 'update:open': [value: boolean] }>()
let returnFocus: HTMLElement | null = null
watch(
  () => props.open,
  (open) => {
    if (open && document.activeElement instanceof HTMLElement) returnFocus = document.activeElement
  },
)
function openFocus(event: Event) {
  event.preventDefault()
  requestAnimationFrame(() =>
    document.querySelector<HTMLInputElement>('[data-hero-search]')?.focus(),
  )
}
function closeFocus(event: Event) {
  event.preventDefault()
  returnFocus?.focus()
}
</script>
<template>
  <DialogRoot :open="open" @update:open="$emit('update:open', $event)">
    <DialogPortal
      ><DialogOverlay class="dialog-overlay" /><DialogContent
        class="dialog-content"
        @open-auto-focus="openFocus"
        @close-auto-focus="closeFocus"
      >
        <div class="dialog-heading">
          <div>
            <DialogTitle class="section-title">{{ title }}</DialogTitle
            ><DialogDescription class="muted mt-1 text-sm">{{ description }}</DialogDescription>
          </div>
          <DialogClose class="ui-button button-ghost button-icon" aria-label="Close hero selector"
            ><X :size="18"
          /></DialogClose>
        </div>
        <slot /> </DialogContent
    ></DialogPortal>
  </DialogRoot>
</template>
