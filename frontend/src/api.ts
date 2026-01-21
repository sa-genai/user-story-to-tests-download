import { GenerateRequest, GenerateResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export function downloadAsJSON(data: GenerateResponse, filename: string = 'test-cases.json'): void {
  try {
    const jsonData = {
      testCases: data.cases,
      model: data.model,
      tokens: {
        prompt: data.promptTokens,
        completion: data.completionTokens
      }
    }
    const jsonString = JSON.stringify(jsonData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    downloadFile(blob, filename)
  } catch (error) {
    console.error('Error downloading JSON:', error)
    throw error instanceof Error ? error : new Error('Failed to download JSON')
  }
}

export function downloadAsCSV(data: GenerateResponse, filename: string = 'test-cases.csv'): void {
  try {
    let csv = ''
    if (data.cases && Array.isArray(data.cases)) {
      const headers = ['id', 'title', 'category', 'expectedResult', 'steps', 'testData']
      csv = headers.join(',') + '\n'
      csv += data.cases.map(testCase => 
        headers.map(header => {
          const value = (testCase as Record<string, unknown>)[header]
          if (Array.isArray(value)) {
            const arrayStr = value.join('; ')
            return arrayStr.includes(',') ? `"${arrayStr}"` : arrayStr
          }
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : (value || '')
        }).join(',')
      ).join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadFile(blob, filename)
  } catch (error) {
    console.error('Error downloading CSV:', error)
    throw error instanceof Error ? error : new Error('Failed to download CSV')
  }
}

export function downloadAsXLSX(data: GenerateResponse, filename: string = 'test-cases.xlsx'): void {
  try {
    // Dynamic import for xlsx library
    import('xlsx').then(XLSX => {
      if (data.cases && Array.isArray(data.cases)) {
        const worksheet = XLSX.utils.json_to_sheet(data.cases)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases')
        XLSX.writeFile(workbook, filename)
      }
    }).catch(error => {
      console.error('Error importing xlsx library:', error)
      throw new Error('xlsx library not available')
    })
  } catch (error) {
    console.error('Error downloading XLSX:', error)
    throw error instanceof Error ? error : new Error('Failed to download XLSX')
  }
}

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}