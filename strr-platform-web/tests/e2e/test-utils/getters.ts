import { type Page } from '@playwright/test'

export const getH2 = (page: Page) => page.getByTestId('h2').first()
