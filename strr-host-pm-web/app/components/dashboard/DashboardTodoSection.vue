<script setup lang="ts">
defineProps<{
  todos: Todo[]
  loading: boolean
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
