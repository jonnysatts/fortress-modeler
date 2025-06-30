import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import puppeteer, { Browser, Page } from 'puppeteer'

// Global state for Puppeteer
let browser: Browser
let page: Page

// Configure Puppeteer for E2E tests
const PUPPETEER_CONFIG = {
  headless: process.env.CI === 'true' ? true : 'new', // Run headless in CI
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--allow-running-insecure-content',
  ],
  defaultViewport: {
    width: 1280,
    height: 720,
  },
  timeout: 30000,
}

// Setup browser before all tests
beforeAll(async () => {
  browser = await puppeteer.launch(PUPPETEER_CONFIG)
  console.log('🚀 Puppeteer browser launched for E2E testing')
})

// Clean up browser after all tests
afterAll(async () => {
  if (browser) {
    await browser.close()
    console.log('🔚 Puppeteer browser closed')
  }
})

// Create new page for each test
beforeEach(async () => {
  page = await browser.newPage()
  
  // Set up page configuration
  await page.setViewport({ width: 1280, height: 720 })
  
  // Set up console logging from the page
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('Page Error:', msg.text())
    }
  })
  
  // Set up error handling
  page.on('pageerror', (error) => {
    console.error('Page Crash:', error.message)
  })
  
  page.on('requestfailed', (request) => {
    console.warn('Request Failed:', request.url(), request.failure()?.errorText)
  })
})

// Clean up page after each test
afterEach(async () => {
  if (page && !page.isClosed()) {
    await page.close()
  }
})

// Export utilities for tests
export const getBrowser = () => browser
export const getPage = () => page

// Helper functions for E2E testing
export const waitForApp = async (page: Page, url: string = 'http://localhost:3000') => {
  await page.goto(url)
  
  // Wait for React to load
  await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 }).catch(() => {
    // Fallback: wait for any content to load
    return page.waitForSelector('body', { timeout: 5000 })
  })
  
  // Wait for any loading states to complete
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="loading"]'),
    { timeout: 5000 }
  ).catch(() => {
    // Ignore timeout if no loading indicator is found
  })
}

export const takeScreenshot = async (page: Page, name: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `screenshot-${name}-${timestamp}.png`
  
  await page.screenshot({
    path: `./test-results/${filename}`,
    fullPage: true,
  })
  
  console.log(`📸 Screenshot saved: ${filename}`)
}

export const mockLocalStorage = async (page: Page, data: Record<string, any>) => {
  await page.evaluateOnNewDocument((data) => {
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value))
    })
  }, data)
}

export const clearLocalStorage = async (page: Page) => {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export const waitForNavigation = async (page: Page, timeout: number = 5000) => {
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout }),
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout }),
  ])
}

export const fillForm = async (
  page: Page,
  formData: Record<string, string>,
  submitButton?: string
) => {
  for (const [selector, value] of Object.entries(formData)) {
    await page.waitForSelector(selector)
    await page.focus(selector)
    await page.keyboard.down('Control')
    await page.keyboard.press('KeyA')
    await page.keyboard.up('Control')
    await page.type(selector, value)
  }
  
  if (submitButton) {
    await page.click(submitButton)
  }
}

export const waitForToast = async (page: Page, message?: string, timeout: number = 5000) => {
  const toastSelector = '[data-sonner-toast]'
  
  await page.waitForSelector(toastSelector, { timeout })
  
  if (message) {
    await page.waitForFunction(
      (msg) => {
        const toasts = document.querySelectorAll('[data-sonner-toast]')
        return Array.from(toasts).some(toast => 
          toast.textContent?.includes(msg)
        )
      },
      { timeout },
      message
    )
  }
}

export const getConsoleErrors = async (page: Page): Promise<string[]> => {
  return page.evaluate(() => {
    // @ts-ignore
    return window.__consoleErrors || []
  })
}

export const interceptApiCalls = async (page: Page) => {
  const apiCalls: Array<{
    url: string
    method: string
    postData?: string
    response?: any
  }> = []
  
  await page.setRequestInterception(true)
  
  page.on('request', (request) => {
    const call = {
      url: request.url(),
      method: request.method(),
      postData: request.postData(),
    }
    
    if (request.url().includes('/api/')) {
      apiCalls.push(call)
    }
    
    request.continue()
  })
  
  page.on('response', (response) => {
    const call = apiCalls.find(c => 
      c.url === response.url() && !('response' in c)
    )
    
    if (call) {
      call.response = {
        status: response.status(),
        statusText: response.statusText(),
      }
    }
  })
  
  return apiCalls
}