import { NextResponse } from 'next/server'

/**
 * Standardized API error responses
 */

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function errorResponse(
  message: string,
  statusCode: number = 500,
  code?: string
) {
  return NextResponse.json(
    {
      error: message,
      code: code || `ERROR_${statusCode}`,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}

// Common error responses
export const errors = {
  unauthorized: () => errorResponse('Unauthorized', 401, 'UNAUTHORIZED'),
  
  forbidden: (message = 'Forbidden') =>
    errorResponse(message, 403, 'FORBIDDEN'),
  
  notFound: (resource = 'Resource') =>
    errorResponse(`${resource} not found`, 404, 'NOT_FOUND'),
  
  badRequest: (message = 'Bad request') =>
    errorResponse(message, 400, 'BAD_REQUEST'),
  
  validationError: (message: string) =>
    errorResponse(`Validation error: ${message}`, 400, 'VALIDATION_ERROR'),
  
  agencyMismatch: () =>
    errorResponse(
      'Resource does not belong to your agency',
      403,
      'AGENCY_MISMATCH'
    ),
  
  insufficientPermissions: () =>
    errorResponse(
      'Insufficient permissions for this action',
      403,
      'INSUFFICIENT_PERMISSIONS'
    ),
  
  internalError: (message = 'Internal server error') =>
    errorResponse(message, 500, 'INTERNAL_ERROR'),
  
  methodNotAllowed: (allowedMethods: string[]) =>
    NextResponse.json(
      {
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
        allowedMethods,
      },
      { status: 405, headers: { Allow: allowedMethods.join(', ') } }
    ),
}

// Success response helper
export function successResponse<T>(data: T, statusCode: number = 200) {
  return NextResponse.json(data, { status: statusCode })
}

// Created response helper
export function createdResponse<T>(data: T) {
  return NextResponse.json(data, { status: 201 })
}

// No content response
export function noContentResponse() {
  return new NextResponse(null, { status: 204 })
}
