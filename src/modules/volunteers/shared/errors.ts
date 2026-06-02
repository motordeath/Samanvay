export class BaseAppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends BaseAppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends BaseAppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ConflictError extends BaseAppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class StateTransitionError extends BaseAppError {
  constructor(message: string) {
    super(message, 422);
  }
}

export class ForbiddenError extends BaseAppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class ConcurrencyConflictError extends BaseAppError {
  constructor(message: string) {
    super(message, 409);
  }
}
