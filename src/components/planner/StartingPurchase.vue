<script setup lang="ts">
import type { StartingInventory } from '@/types/planner'
import { assetUrl } from '@/utils'
defineProps<{ inventory: StartingInventory; compact?: boolean }>()
</script>
<template>
  <div :class="['starting-purchase', { 'starting-compact': compact }]">
    <div class="purchase-budget">
      <h3>Starting items</h3>
      <span
        ><strong>{{ inventory.totalCost }}g</strong> / {{ inventory.budget }}g</span
      >
    </div>
    <div class="starting-set">
      <details
        v-for="purchase in inventory.purchases"
        :key="purchase.item.id"
        class="purchase-tile"
      >
        <summary>
          <span class="purchase-image"
            ><img :src="assetUrl(purchase.item.icon)" alt="" width="64" height="46" /><span
              class="quantity-badge"
              >×{{ purchase.quantity }}</span
            ></span
          ><strong>{{ purchase.item.name }}</strong
          ><span class="gold"
            >{{ purchase.unitCost }}g<span v-if="purchase.quantity > 1">
              × {{ purchase.quantity }} = {{ purchase.totalCost }}g</span
            ></span
          ><span v-if="purchase.item.consumable" class="muted"
            >{{ purchase.charges }} {{ purchase.charges === 1 ? 'charge' : 'charges' }}</span
          >
        </summary>
        <p>{{ purchase.reason }}</p>
      </details>
    </div>
    <div class="purchase-totals">
      <span>{{ inventory.mainSlots }} / 6 main slots</span
      ><strong>{{ inventory.remainingGold }}g remaining</strong>
    </div>
    <p v-if="!compact" class="planner-note">{{ inventory.explanation }}</p>
    <p v-if="!compact" class="planner-note">
      {{ inventory.freeItems.join(' ') }} Coordinate free Observer Wards with your lane partner.
    </p>
  </div>
</template>
