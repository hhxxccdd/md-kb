export function downloadMarkdown(content: string, filename: string): void {
    const blob = new Blob([content],{
        type:'text/markdown;charset=utf-8'
    })

    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = downloadUrl
    link.download = filename

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(downloadUrl)
}
