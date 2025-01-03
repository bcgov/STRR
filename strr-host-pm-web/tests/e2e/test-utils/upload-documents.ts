import { join } from 'path'
import { expect, type Page } from '@playwright/test'
export async function uploadDocuments (
  currentDir: string,
  page: Page,
  section: ReturnType<Page['locator']>,
  files: { option: string, filename: string }[]
) {
  for (const { option, filename } of files) {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await section.getByLabel('Choose Supporting Documents').click()
    await section.getByRole('option', { name: option }).click()

    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(join(currentDir, `../fake-files/${filename}.pdf`))

    // wait for upload to be complete
    await page.waitForResponse(res =>
      res.url().includes('/documents') && res.status() === 201
    )

    await expect(section.getByTestId('document-upload-list')).toContainText(option)
  }
}
