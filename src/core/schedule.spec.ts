import { describe, it } from "node:test";
import { Schedule } from "./schedule";
import { strictEqual } from "node:assert";

describe('Schedule', () => {
  it('should have zero size for a new object', () => {
    const schedule = new Schedule();
    strictEqual(schedule.size, 0);
  });

  it('should be able schedule an event using start and end dates', () => {
    const schedule = new Schedule();
    const startDate = new Date();
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + 1);
    schedule.schedule({ start: startDate, end: endDate });
  });

  it('should be able schedule an event using duration', () => {
    const schedule = new Schedule();
    const startDate = new Date();
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + 1);
    schedule.schedule({ start: startDate, duration: { days: 2 } });
  });

  it('should increase the size', () => {
    const schedule = new Schedule();
    const firstStartDate = new Date();
    const firstEndDate = new Date(firstStartDate.getTime());
    firstEndDate.setDate(firstStartDate.getDate() + 1);
    schedule.schedule({ start: firstStartDate, end: firstEndDate });

    strictEqual(schedule.size, 1);

    const secondStartDate = new Date(firstStartDate.getTime() + 2);
    const secondEndDate = new Date(secondStartDate.getTime());
    secondEndDate.setDate(secondStartDate.getDate() + 1);
    schedule.schedule({ start: secondStartDate, end: secondEndDate });

    strictEqual(schedule.size, 2);
  });

  it('should be able unschedule event', () => {
    const schedule = new Schedule();
    const firstStartDate = new Date();
    const firstEndDate = new Date(firstStartDate.getTime());
    firstEndDate.setDate(firstStartDate.getDate() + 1);
    const id = schedule.schedule({ start: firstStartDate, end: firstEndDate });

    strictEqual(schedule.size, 1);

    schedule.unschedule(id);

    strictEqual(schedule.size, 0);
  });

  it('should return scheduled events (using start and end dates)', () => {
    const schedule = new Schedule();
    const firstStartDate = new Date();
    const firstEndDate = new Date(firstStartDate.getTime());
    firstEndDate.setDate(firstStartDate.getDate() + 1);
    schedule.schedule({ start: firstStartDate, end: firstEndDate });

    const secondStartDate = new Date();
    secondStartDate.setDate(firstEndDate.getDate() + 1);
    const secondEndDate = new Date(secondStartDate.getTime());
    secondEndDate.setDate(secondStartDate.getDate() + 1);
    schedule.schedule({ start: secondStartDate, end: secondEndDate });

    const events = schedule.getEvents();

    strictEqual(events.length, 2);

    strictEqual(events[0].start.getTime(), firstStartDate.getTime(), 'First start date is not changed');
    strictEqual(events[0].end.getTime(), firstEndDate.getTime(), 'First end date is not changed');
    strictEqual(events[1].start.getTime(), secondStartDate.getTime(), 'Second start date is not changed');
    strictEqual(events[1].end.getTime(), secondEndDate.getTime(), 'Second end date is not changed');
  });

  it('should return scheduled events (using duration)', () => {
    const schedule = new Schedule();
    const firstStartDate = new Date();
    const firstEndDate = new Date(firstStartDate.getTime());
    firstEndDate.setDate(firstStartDate.getDate() + 2);
    schedule.schedule({ start: firstStartDate, duration: { days: 2 } });

    const secondStartDate = new Date();
    secondStartDate.setDate(firstStartDate.getDate() + 3);
    const secondEndDate = new Date(secondStartDate.getTime());
    secondEndDate.setDate(secondStartDate.getDate() + 2);
    schedule.schedule({ start: secondStartDate, duration: { days: 2 } });

    const events = schedule.getEvents();

    strictEqual(events.length, 2);

    strictEqual(events[0].start.getTime(), firstStartDate.getTime(), 'First start date is not changed');
    strictEqual(events[0].end.getTime(), firstEndDate.getTime(), 'First end date is not changed');
    strictEqual(events[1].start.getTime(), secondStartDate.getTime(), 'Second start date is not changed');
    strictEqual(events[1].end.getTime(), secondEndDate.getTime(), 'Second end date is not changed');
  });
});

