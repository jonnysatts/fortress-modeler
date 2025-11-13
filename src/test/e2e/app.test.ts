import { describe, it, expect } from 'vitest'
import { getPage, waitForApp, takeScreenshot, fillForm, waitForToast } from './setup'

describe('Fortress Modeler E2E Tests', () => {
  describe('Application Loading', () => {
    it('should load the application successfully', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Check that the app title is present
      const title = await page.title()
      expect(title).toContain('Fortress')
      
      // Take screenshot for visual verification
      await takeScreenshot(page, 'app-loaded')
    })

    it('should show the correct header content', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Check for main navigation elements
      const header = await page.$('header, nav, [role="banner"]')
      expect(header).toBeTruthy()
      
      // Check for app name or logo
      const appName = await page.$eval('h1, [data-testid="app-name"]', el => el.textContent)
      expect(appName).toMatch(/fortress/i)
    })

    it('should handle offline scenarios gracefully', async () => {
      const page = getPage()
      
      // Simulate offline
      await page.setOfflineMode(true)
      
      await waitForApp(page)
      
      // App should still load with cached resources
      const body = await page.$('body')
      expect(body).toBeTruthy()
      
      // Restore online mode
      await page.setOfflineMode(false)
    })
  })

  describe('Project Management', () => {
    it('should create a new project', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Navigate to new project
      await page.click('[data-testid="new-project-button"], button:has-text("New Project")')
      
      // Fill out project form
      await fillForm(page, {
        '[name="name"], [data-testid="project-name"]': 'E2E Test Project',
        '[name="description"], [data-testid="project-description"]': 'Created by E2E test',
      })
      
      // Select product type
      await page.click('[data-testid="product-type-select"]')
      await page.click('[data-value="Web Application"]')
      
      // Submit form
      await page.click('[type="submit"], [data-testid="create-project-button"]')
      
      // Wait for success notification
      await waitForToast(page, 'Project created successfully')
      
      // Verify navigation to project details
      const url = page.url()
      expect(url).toMatch(/\/projects\/[\w-]+/)
      
      await takeScreenshot(page, 'project-created')
    })

    it('should display project list', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Navigate to projects list if not already there
      const projectsLink = await page.$('[href="/projects"], [data-testid="projects-link"]')
      if (projectsLink) {
        await page.click('[href="/projects"], [data-testid="projects-link"]')
      }
      
      // Wait for projects to load
      await page.waitForSelector('[data-testid="project-card"], .project-item', { timeout: 10000 })
      
      // Count projects
      const projectCards = await page.$$('[data-testid="project-card"], .project-item')
      expect(projectCards.length).toBeGreaterThan(0)
      
      await takeScreenshot(page, 'projects-list')
    })

    it('should edit project details', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Find and click on first project
      await page.click('[data-testid="project-card"]:first-child, .project-item:first-child')
      
      // Click edit button
      await page.click('[data-testid="edit-project-button"], button:has-text("Edit")')
      
      // Update project name
      const nameInput = '[name="name"], [data-testid="project-name"]'
      await page.focus(nameInput)
      await page.keyboard.selectAll()
      await page.type(nameInput, 'Updated E2E Test Project')
      
      // Save changes
      await page.click('[type="submit"], [data-testid="save-project-button"]')
      
      // Wait for success notification
      await waitForToast(page, 'Project updated successfully')
      
      // Verify updated name is displayed
      const updatedName = await page.$eval('h1, [data-testid="project-title"]', el => el.textContent)
      expect(updatedName).toContain('Updated E2E Test Project')
    })
  })

  describe('Financial Model Management', () => {
    it('should create a financial model', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Navigate to a project
      await page.click('[data-testid="project-card"]:first-child')
      
      // Create new model
      await page.click('[data-testid="new-model-button"], button:has-text("New Model")')
      
      // Fill model form
      await fillForm(page, {
        '[name="name"], [data-testid="model-name"]': 'E2E Test Model',
      })
      
      // Add revenue stream
      await page.click('[data-testid="add-revenue-button"]')
      await fillForm(page, {
        '[data-testid="revenue-name-0"]': 'Subscription Revenue',
        '[data-testid="revenue-value-0"]': '99.99',
      })
      
      // Add cost item
      await page.click('[data-testid="add-cost-button"]')
      await fillForm(page, {
        '[data-testid="cost-name-0"]': 'Server Hosting',
        '[data-testid="cost-value-0"]': '50.00',
      })
      
      // Submit form
      await page.click('[type="submit"], [data-testid="create-model-button"]')
      
      // Wait for success notification
      await waitForToast(page, 'Model created successfully')
      
      await takeScreenshot(page, 'model-created')
    })

    it('should display financial projections', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Navigate to a project with models
      await page.click('[data-testid="project-card"]:first-child')
      await page.click('[data-testid="model-card"]:first-child, .model-item:first-child')
      
      // Wait for projections to load
      await page.waitForSelector('[data-testid="financial-chart"], .recharts-wrapper', { timeout: 10000 })
      
      // Verify chart is rendered
      const chart = await page.$('[data-testid="financial-chart"], .recharts-wrapper')
      expect(chart).toBeTruthy()
      
      // Verify key metrics are displayed
      const metrics = await page.$$('[data-testid="metric-card"], .metric-item')
      expect(metrics.length).toBeGreaterThan(0)
      
      await takeScreenshot(page, 'financial-projections')
    })
  })

  describe('Actuals Input', () => {
    it('should allow entering actual performance data', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Navigate to a model
      await page.click('[data-testid="project-card"]:first-child')
      await page.click('[data-testid="model-card"]:first-child')
      
      // Navigate to actuals section
      await page.click('[data-testid="actuals-tab"], [href*="actuals"]')
      
      // Enter actual revenue
      await fillForm(page, {
        '[data-testid="revenue-actual-0"], [name*="revenue"]': '120.00',
        '[data-testid="cost-actual-0"], [name*="cost"]': '45.00',
        '[data-testid="notes"], [name="notes"]': 'E2E test actuals entry',
      })
      
      // Save actuals
      await page.click('[data-testid="save-actuals-button"], button:has-text("Save")')
      
      // Wait for success notification
      await waitForToast(page, 'Actuals saved successfully')
      
      await takeScreenshot(page, 'actuals-entered')
    })
  })

  describe('Export Functionality', () => {
    it('should export financial data to Excel', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Navigate to a project with data
      await page.click('[data-testid="project-card"]:first-child')
      
      // Set up download handler
      const downloadPromise = page.waitForEvent('download')
      
      // Click export button
      await page.click('[data-testid="export-excel-button"], button:has-text("Export")')
      
      // Wait for download to start
      const download = await downloadPromise
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
      
      await takeScreenshot(page, 'export-started')
    })

    it('should generate an executive report', async () => {
      const page = getPage()

      await waitForApp(page)

      await page.click('a[href="/settings"], [data-testid="nav-settings"]')

      const downloadPromise = page.waitForEvent('download')

      await page.click('button:has-text("Executive Report")')

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.pdf$/)

      await takeScreenshot(page, 'executive-report')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Simulate network failure
      await page.setOfflineMode(true)
      
      // Try to create a project (should handle offline gracefully)
      await page.click('[data-testid="new-project-button"]')
      
      // Should show appropriate error message
      await page.waitForSelector('[data-testid="error-message"], .error-toast', { timeout: 5000 })
      
      // Restore connection
      await page.setOfflineMode(false)
      
      await takeScreenshot(page, 'network-error-handled')
    })

    it('should display validation errors', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Try to create project with invalid data
      await page.click('[data-testid="new-project-button"]')
      
      // Submit empty form
      await page.click('[type="submit"]')
      
      // Should show validation errors
      const errorMessages = await page.$$('[data-testid="field-error"], .field-error')
      expect(errorMessages.length).toBeGreaterThan(0)
      
      await takeScreenshot(page, 'validation-errors')
    })
  })

  describe('Calendar Display', () => {
    it('should display date picker when selecting start date', async () => {
      const page = getPage()

      await waitForApp(page)

      await page.click('[data-testid="new-project-button"], button:has-text("New Project")')

      await page.click('label:has-text("Start Date") + div button')

      await page.waitForSelector('.rdp', { timeout: 5000 })

      await takeScreenshot(page, 'calendar-display')
    })
  })

  describe('Responsive Design', () => {
    it('should work on mobile viewport', async () => {
      const page = getPage()
      
      // Set mobile viewport
      await page.setViewport({ width: 375, height: 667 })
      
      await waitForApp(page)
      
      // Check that mobile menu exists
      const mobileMenu = await page.$('[data-testid="mobile-menu"], .mobile-menu-button')
      expect(mobileMenu).toBeTruthy()
      
      await takeScreenshot(page, 'mobile-view')
    })

    it('should work on tablet viewport', async () => {
      const page = getPage()
      
      // Set tablet viewport
      await page.setViewport({ width: 768, height: 1024 })
      
      await waitForApp(page)
      
      // App should render properly on tablet
      const content = await page.$('[data-testid="main-content"], main')
      expect(content).toBeTruthy()
      
      await takeScreenshot(page, 'tablet-view')
    })
  })

  describe('Performance', () => {
    it('should load within acceptable time limits', async () => {
      const page = getPage()
      
      const startTime = Date.now()
      await waitForApp(page)
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    it('should handle large datasets efficiently', async () => {
      const page = getPage()
      
      await waitForApp(page)
      
      // Navigate to a project with many models/data points
      await page.click('[data-testid="project-card"]:first-child')
      
      // Verify that lists render efficiently
      await page.waitForSelector('[data-testid="model-list"], .model-grid')
      
      // Check that scrolling is smooth (basic performance check)
      await page.evaluate(() => {
        window.scrollTo(0, 1000)
      })
      
      await page.waitForTimeout(100) // Allow for scroll to complete
      
      const scrollPosition = await page.evaluate(() => window.scrollY)
      expect(scrollPosition).toBeGreaterThan(0)
    })
  })
})