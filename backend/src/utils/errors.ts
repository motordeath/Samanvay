export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  constructor(message: string) { super(message); this.name = 'AuthorizationError'; }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) { super(message); this.name = 'NotFoundError'; }
}

export class StateTransitionError extends Error {
  statusCode = 409;
  constructor(message: string) { super(message); this.name = 'StateTransitionError'; }
}

export class ConcurrencyConflictError extends Error {
  statusCode = 409;
  constructor(message: string) { super(message); this.name = 'ConcurrencyConflictError'; }
}
