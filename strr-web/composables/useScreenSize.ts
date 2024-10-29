import { ref, onMounted, onUnmounted } from 'vue'

const useScreenSize = () => {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)

  const handler = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  const isMobile = computed(() => width.value <= 1263)

  onMounted(() => window.addEventListener('resize', handler))
  onUnmounted(() => window.removeEventListener('resize', handler))

  return { width, height, isMobile }
}

export default useScreenSize
