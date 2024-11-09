<template>
  <footer
    id="bcros-main-footer"
    :class="`
    ${extraSpace ? `
      mobile:flex-[0_0_116px] mobile:mb-[55px]`: 'mobile:flex-[0_0_80px]' }
      h-[54px] flex-[0_0_54px] flex items-center border-t-2
      border-bcGovColor-navDivider bg-bcGovColor-footer text-sm  flex-col
    `"
    data-test-id="footer"
  >
    <div class="m-auto px-4 w-full max-w-[1360px] flex-shrink">
      <nav class="flex flex-grow">
        <ul class="p-0 -ml-2 list-none">
          <li
            v-for="link in links"
            :key="link.text"
            class="inline-block mr-2 mobile:border-none pr-2 border-r border-blue-200 last:mr-0 last:border-r-0"
          >
            <a
              class="block py-1 px-2 text-white text-[15px] mobile:text-[13px] hover:underline"
              :href="link.href"
              rel="noopener noreferrer"
              :target="link.newTab ? '_blank' : '_self'"
            >
              {{ t(`footer.link.${link.text}`) }}
            </a>
          </li>
        </ul>
        <div class="flex flex-auto justify-end items-center">
          <i class="text-yellow-500">{{ t(`footer.bcApp`) }}</i>
          <BcrosTooltip
            id="footer-tooltip"
            class="mt-1"
            :text="`STRR UI v${version}`"
            :popper="{
              placement: 'left',
              arrow: true
            }"
          >
            <div class="ml-[15px] icon-container" role="img" aria-label="information">
              <UIcon class="text-2xl text-blue-200" name="i-mdi-information-outline" />
            </div>
          </BcrosTooltip>
        </div>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { isExaminer } = storeToRefs(useBcrosKeycloak())
const { t } = useTranslation()
const version = useRuntimeConfig().public.version

const { extraSpace } = defineProps<{ extraSpace?: boolean }>()

const homeLink = isExaminer.value ? RouteNamesE.REGISTRY_DASHBOARD : RouteNamesE.APPLICATION_STATUS

const links = [
  { text: 'home', href: '/' + homeLink, newTab: false },
  { text: 'disclaimer', href: 'https://www2.gov.bc.ca/gov/content/home/disclaimer', newTab: true },
  { text: 'privacy', href: 'https://www2.gov.bc.ca/gov/content/home/privacy', newTab: true },
  { text: 'accessibility', href: 'https://www2.gov.bc.ca/gov/content/home/accessibility', newTab: true },
  { text: 'copyright', href: 'https://www2.gov.bc.ca/gov/content/home/copyright', newTab: true }
]
</script>
