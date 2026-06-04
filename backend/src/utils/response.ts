export function createSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
    meta: {},
    errors: []
  };
}

export function createErrorResponse(message: string) {
  return {
    success: false,
    error: {
      message,
    },
  };
}
