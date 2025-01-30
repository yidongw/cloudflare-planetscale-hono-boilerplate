import httpStatus from 'http-status'
import { test, describe, expect } from 'vitest'
import app from '../../src'

describe('Basic routing', () => {
  test('should return 404 if route not found', async () => {
    const res = await app.request('/idontexist', {
      method: 'GET'
    })
    expect(res.status).toBe(httpStatus.NOT_FOUND)
  })
})
