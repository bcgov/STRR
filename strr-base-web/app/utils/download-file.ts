/** Download the file as the given filename. */
export const downloadFile = (data: any, fileName: string) => {
  const blob = new Blob([data])
  // @ts-expect-error - msSaveOrOpenBlob only exists for IE browsers
  if (window.navigator && !!window.navigator.msSaveOrOpenBlob) {
    // @ts-expect-error - msSaveOrOpenBlob only exists for IE browsers
    window.navigator.msSaveOrOpenBlob(blob, fileName)
  } else {
    // for other browsers, create a link pointing to the ObjectURL containing the blob
    const url = window.URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    window.document.body.appendChild(a)
    a.setAttribute('style', 'display: none')
    a.href = url
    a.download = fileName
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }
}
