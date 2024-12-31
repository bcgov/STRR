<script setup lang="ts">
const docStore = useDocumentStore()
</script>
<template>
  <ul class="flex flex-col gap-1" data-testid="document-upload-list">
    <DocumentListItem
      :documents="docStore.storedDocuments"
      @remove="docStore.removeStoredDocument"
    />
  </ul>
</template>
