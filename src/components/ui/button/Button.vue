<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/utils'
const variants = cva('ui-button', {
  variants: {
    variant: { default: 'button-primary', outline: 'button-outline', ghost: 'button-ghost' },
    size: { default: '', sm: 'button-sm', icon: 'button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
type Variants = VariantProps<typeof variants>
interface Props extends PrimitiveProps {
  variant?: Variants['variant']
  size?: Variants['size']
  class?: HTMLAttributes['class']
}
const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
  class: undefined,
})
</script>
<template>
  <Primitive :as="as" :as-child="asChild" :class="cn(variants({ variant, size }), props.class)"
    ><slot
  /></Primitive>
</template>
