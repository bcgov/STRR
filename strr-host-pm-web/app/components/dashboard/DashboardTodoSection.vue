<script setup lang="ts">
defineProps<{
  todos: Todo[]
  loading: boolean
  showRenewalSubmitted?: boolean
}>()
</script>
<template>
  <ConnectDashboardSection
    id="to-do-section"
    data-test-id="todo-section"
    :title="$t('label.todo')"
    :title-num="todos.length"
    :loading="loading"
  >
    <!-- Renewal submitted success notification (separate from todos) -->
    <div
      v-if="showRenewalSubmitted"
      data-test-id="renewal-submitted-notification"
      class="flex gap-3 rounded border-l-4 border-green-500 bg-green-50 p-6"
    >
      <UIcon name="i-mdi-check-circle" class="size-5 shrink-0 text-green-500" />
      <div class="space-y-1">
        <h3 class="text-sm font-bold">
          {{ $t('todos.renewalSubmitted.title') }}
        </h3>
        <p class="text-sm">
          {{ $t('todos.renewalSubmitted.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Gray separator between notification and todos/empty state -->
    <div v-if="showRenewalSubmitted" class="h-3 bg-bcGovGray-100" />

    <TodoEmpty v-if="!todos.length" data-test-id="todo-empty" />
    <template v-else>
      <template v-for="(todo, index) in todos" :key="todo.title">
        <Todo
          :id="todo.id"
          :title="todo.title"
          :subtitle="todo.subtitle"
          :buttons="todo?.buttons"
          :icon="todo?.icon"
          :icon-class="todo?.iconClass"
        />
        <div v-if="index < todos.length - 1" class="h-px w-full border-b border-gray-100" />
      </template>
    </template>
  </ConnectDashboardSection>
</template>
