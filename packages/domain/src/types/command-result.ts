import type { NewActivityEvent } from "../entities/activity-event.js";

export interface CommandResult<T> {
  readonly data: T;
  readonly events: readonly NewActivityEvent[];
}
