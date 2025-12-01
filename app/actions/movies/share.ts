'use server'

import jwt from 'jsonwebtoken'

import { fail, info } from '@/services/logger'
import { addToFavorites } from '@/services/tmdb'
import { hasTmdbAuth } from '@/services/tmdb/env'
import { generateShareToken as createShareToken } from '@/utils/jwt'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('process.env.JWT_SECRET is not defined')
}

/**
 * Generate a share token for temporary favorite access (1 day validity)
 * Requires authentication
 * Returns only the token and path, client should construct the full URL
 */
export async function generateShareToken(): Promise<{ success: boolean; token?: string; path?: string; message: string }> {
  const startTime = Date.now()
  info('generateShareToken - Request received')

  try {
    // Require authentication
    const { validateCookie } = await import('@/services/auth/access')
    if (!(await validateCookie())) {
      fail('Unauthorized access to generate share token')
      return {
        success: false,
        message: 'Unauthorized',
      }
    }

    // Check if TMDB auth is available
    if (!hasTmdbAuth()) {
      return {
        success: false,
        message: 'TMDB authentication not configured',
      }
    }

    // Generate token with 1 day expiration
    const token = createShareToken('movie-share', '1d')
    const path = `/movies/share/${token}`

    const duration = Date.now() - startTime
    info(`generateShareToken - Success (${duration}ms)`)

    return {
      success: true,
      token,
      path,
      message: 'Share token generated successfully',
    }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`generateShareToken - Error (${duration}ms):`, error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate share token'
    return {
      success: false,
      message: errorMessage,
    }
  }
}

/**
 * Verify share token and return if valid
 */
export async function verifyShareToken(token: string): Promise<{ valid: boolean; payload?: any; error?: string }> {
  try {
    if (!token) {
      return { valid: false, error: 'Token is required' }
    }

    const payload = jwt.verify(token, JWT_SECRET) as any

    // Verify token type
    if (payload.type !== 'movie-share') {
      return { valid: false, error: 'Invalid token type' }
    }

    return { valid: true, payload }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' }
    }
    return { valid: false, error: 'Token verification failed' }
  }
}

/**
 * Add movie to favorites using share token (no authentication required)
 * Token must be valid and not expired
 */
export async function favoriteMovieWithToken(movieId: number, token: string, favorite = true): Promise<{ success: boolean; message: string }> {
  const startTime = Date.now()
  info(`favoriteMovieWithToken - Request received: movieId=${movieId}, favorite=${favorite}`)

  try {
    // Verify token
    const verification = await verifyShareToken(token)
    if (!verification.valid) {
      fail(`favoriteMovieWithToken - Invalid token: ${verification.error}`)
      return {
        success: false,
        message: verification.error || 'Invalid or expired token',
      }
    }

    // Check if TMDB auth is available
    if (!hasTmdbAuth()) {
      return {
        success: false,
        message: 'TMDB authentication not configured',
      }
    }

    // Add to favorites
    await addToFavorites(movieId, favorite)

    const duration = Date.now() - startTime
    const action = favorite ? 'added to' : 'removed from'
    info(`favoriteMovieWithToken - Success (${duration}ms), movie ${movieId} ${action} favorites`)

    return {
      success: true,
      message: favorite ? 'Added to favorites' : 'Removed from favorites',
    }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`favoriteMovieWithToken - Error (${duration}ms):`, error)

    const errorMessage = error instanceof Error ? error.message : 'Operation failed'
    return {
      success: false,
      message: errorMessage,
    }
  }
}
