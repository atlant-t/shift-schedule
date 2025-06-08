import { LineMap } from "./linemap";

interface Duration {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/**
 * Settings for the event being scheduled.
 */
export type ScheduleEventSettings = {
  /** Date time of the event start. */
  start: Date;
} & ({
  /** Date time of the event end. */
  end: Date;
} | {
  /** Duration of the event. */
  duration: Duration;
})

/**
 * Information about a scheduled event.
 */
export class ScheduleEventInfo {
  private _start?: Date;
  private _end?: Date;
  private _duration?: Duration;

  /** Date time of the event start. */
  public get start(): Date { return this._start ??= new Date(this._startTime); }
  /** Date time of the event end. */
  public get end(): Date { return this._end ??= new Date(this._endTime); }
  /** Duration of the event. */
  public get duration(): Duration {
    // FIX: Update this logic to avoid negative results.
    return this._duration ??= {
      years: this.end.getFullYear() - this.start.getFullYear(),
      months: this.end.getMonth() - this.start.getMonth(),
      days: this.end.getDate() - this.start.getDate(),
      hours: this.end.getHours() - this.start.getHours(),
      minutes: this.end.getMinutes() - this.start.getMinutes(),
      seconds: this.end.getSeconds() - this.start.getSeconds(),
    };
  };

  constructor(
    public readonly id: number,
    private _startTime: number,
    private _endTime: number,
  ) { }
}

// TODO: It is necessary to think about collisions. On the one hand, collisions
// can be and are resolved individually by the user, on the other hand, this
// can cause various difficulties. To solve this issue:
// - a configuration can be added that will contain a flag about the
//   admissibility of collisions, but what to do if the user tries to schedule
//   an event that will have a collision;
// - a method for finding collisions can be added, but this is already
//   post-factum processing and can be solved by other tools, such as rules
//   during generation.
/**
 * Schedule of events.
 */
export class Schedule {
  private _map = new LineMap<number>();

  /**
   * Number of scheduled events.
   */
  public get size(): number {
    return this._map.size;
  }

  /**
   * Schedules the event and returns a uniq event identifier.
   *
   * @param config The event configuration.
   */
  public schedule(config: ScheduleEventSettings): number {
    const eventId = this._getNewId();
    const startDate = getStartDate(config);
    const endDate = getEndDate(config);
    this._map.set(eventId, startDate, endDate);

    return eventId;
  };

  /**
   * Unschedule an exist event by their identiefier.
   *
   * @param eventId The uniq identifier of the scheduled event.
   * @returns Whether the event found and removed.
   */
  public unschedule(eventId: number): boolean {
    return this._map.remove(eventId);
  };

  /**
   * Updates scheduled events.
   */
  public reschedule(eventId: number, config: ScheduleEventSettings): boolean {
    if (this._map.has(eventId)) {
      const startDate = getStartDate(config);
      const endDate = getEndDate(config);
      this._map.set(eventId, startDate, endDate);
      return true;
    }

    return false;
  }

  /**
   * Returns all scheduled events.
   *
   * @param filterfn Function for filetring results.
   */
  public getEvents(filterfn?: (info: ScheduleEventInfo) => boolean): Array<ScheduleEventInfo> {
    const result = new Array<ScheduleEventInfo>();

    for (const [eventId, start, end] of this._map) {
      const info = new ScheduleEventInfo(eventId, start, end);
      if (!filterfn || filterfn(info)) {
        result.push(info);
      }
    }

    return result;
  }

  private _getNewId: () => number = createIdGenerator();
}

function createIdGenerator(): () => number {
  let uniqId = 0;
  return function getNewId() { return uniqId++ }
}

function getStartDate(config: ScheduleEventSettings): number {
  return config.start.getTime();
}

function getEndDate(config: ScheduleEventSettings): number {
  if ('end' in config) {
    return config.end.getTime();
  } else if ('duration' in config) {
    const endDate = new Date(config.start);
    const { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = config.duration;
    endDate.setFullYear(
      endDate.getFullYear() + years,
      endDate.getMonth() + months,
      endDate.getDate() + days,
    );
    endDate.setHours(
      endDate.getHours() + hours,
      endDate.getMinutes() + minutes,
      endDate.getSeconds() + seconds,
      endDate.getMilliseconds(),
    );
    return endDate.getTime();
  } else {
    throw new Error('Unexpected error');
  }
}

