const { DateTime } = require("luxon");
const { expect } = require("chai");
const {
  getLatestPeriodStart,
  getCurrentMonthDays,
  getUserSchedule,
  getUserScheduleByProvince,
} = require("../needs/needs.js");

describe("userNeeds", () => {
  const scrub = [
    {
      Postal: "M4G",
      PostalProvince: "ON",
    },
    {
      Postal: "M1H",
      PostalProvince: "ON",
    },
    {
      Postal: "N1L",
      PostalProvince: "ON",
    },
  ];
  const advisors = [
    {
      upper: "M4G",
      latest_period_start: "2020-07-22 20:50",
      subscribed_users: "30",
      // "Subscription Plan": "plan_HBqX6OMJypD9mA",
    },
    {
      upper: "M1H",
      latest_period_start: "2020-07-26 20:50",
      subscribed_users: "50",
      //  "Subscription Plan": "plan_HBqaOVKUMqmC7B",
    },
    {
      upper: "N1L",
      latest_period_start: "2020-07-22 20:50",
      subscribed_users: "10",
      //  "Subscription Plan": "plan_H0Sxm9UMnr5GhF",
    },
  ];

  it("should calculate next renewal date correctly", () => {
    //given
    const startDate = DateTime.fromISO("2020-04-22");
    const currentDate = DateTime.fromISO("2020-08-03");

    //when
    const calculatedDate = getLatestPeriodStart(startDate, currentDate);

    //then
    expect(calculatedDate.toISODate()).to.eql("2020-07-22");
  });

  it("should calculate the day in current month correctly", () => {
    //given
    const latestPeriodStart = DateTime.fromISO("2020-07-22");
    const currentDate = DateTime.fromISO("2020-08-03");

    //when
    const calculatedDays = getCurrentMonthDays(latestPeriodStart, currentDate);

    //then
    expect(calculatedDays).to.eql(12);
  });

  it("should generate user schedule for 30 plan", () => {
    //given
    const currentDate = DateTime.fromISO("2020-08-03");

    //when
    const userSchedule = getUserSchedule(advisors[0], currentDate);

    //then
    expect(userSchedule).to.eql([
      { date: "2020-07-27", users: 0, dayInMonth: 5 },
      { date: "2020-07-28", users: 0, dayInMonth: 6 },
      { date: "2020-07-29", users: 0, dayInMonth: 7 },
      { date: "2020-07-30", users: 10, dayInMonth: 8 },
      { date: "2020-07-31", users: 0, dayInMonth: 9 },
      { date: "2020-08-01", users: 0, dayInMonth: 10 },
      { date: "2020-08-02", users: 0, dayInMonth: 11 },
      { date: "2020-08-03", users: 0, dayInMonth: 12 },
      { date: "2020-08-04", users: 0, dayInMonth: 13 },
      { date: "2020-08-05", users: 0, dayInMonth: 14 },
      { date: "2020-08-06", users: 10, dayInMonth: 15 },
      { date: "2020-08-07", users: 0, dayInMonth: 16 },
      { date: "2020-08-08", users: 0, dayInMonth: 17 },
      { date: "2020-08-09", users: 0, dayInMonth: 18 },
      { date: "2020-08-10", users: 0, dayInMonth: 19 },
      { date: "2020-08-11", users: 0, dayInMonth: 20 },
      { date: "2020-08-12", users: 0, dayInMonth: 21 },
      { date: "2020-08-13", users: 0, dayInMonth: 22 },
      { date: "2020-08-14", users: 0, dayInMonth: 23 },
      { date: "2020-08-15", users: 0, dayInMonth: 24 },
      { date: "2020-08-16", users: 0, dayInMonth: 25 },
      { date: "2020-08-17", users: 0, dayInMonth: 26 },
      { date: "2020-08-18", users: 0, dayInMonth: 27 },
      { date: "2020-08-19", users: 0, dayInMonth: 28 },
      { date: "2020-08-20", users: 0, dayInMonth: 29 },
      { date: "2020-08-21", users: 0, dayInMonth: 30 },
      { date: "2020-08-22", users: 0, dayInMonth: 31 },
      { date: "2020-08-23", users: 0, dayInMonth: 1 },
      { date: "2020-08-24", users: 10, dayInMonth: 2 },
      { date: "2020-08-25", users: 0, dayInMonth: 3 },
      { date: "2020-08-26", users: 0, dayInMonth: 4 },
      { date: "2020-08-27", users: 0, dayInMonth: 5 },
      { date: "2020-08-28", users: 0, dayInMonth: 6 },
      { date: "2020-08-29", users: 0, dayInMonth: 7 },
      { date: "2020-08-30", users: 0, dayInMonth: 8 },
    ]);
  });

  it("should generate user schedule for 50 plan", () => {
    //given
    const currentDate = DateTime.fromISO("2020-08-03");

    //when
    const userSchedule = getUserSchedule(advisors[1], currentDate);

    //then
    expect(userSchedule).to.eql([
      { date: "2020-07-27", users: 20, dayInMonth: 1 },
      { date: "2020-07-28", users: 0, dayInMonth: 2 },
      { date: "2020-07-29", users: 0, dayInMonth: 3 },
      { date: "2020-07-30", users: 0, dayInMonth: 4 },
      { date: "2020-07-31", users: 0, dayInMonth: 5 },
      { date: "2020-08-01", users: 0, dayInMonth: 6 },
      { date: "2020-08-02", users: 0, dayInMonth: 7 },
      { date: "2020-08-03", users: 0, dayInMonth: 8 },
      { date: "2020-08-04", users: 15, dayInMonth: 9 },
      { date: "2020-08-05", users: 0, dayInMonth: 10 },
      { date: "2020-08-06", users: 0, dayInMonth: 11 },
      { date: "2020-08-07", users: 0, dayInMonth: 12 },
      { date: "2020-08-08", users: 0, dayInMonth: 13 },
      { date: "2020-08-09", users: 0, dayInMonth: 14 },
      { date: "2020-08-10", users: 15, dayInMonth: 15 },
      { date: "2020-08-11", users: 0, dayInMonth: 16 },
      { date: "2020-08-12", users: 0, dayInMonth: 17 },
      { date: "2020-08-13", users: 0, dayInMonth: 18 },
      { date: "2020-08-14", users: 0, dayInMonth: 19 },
      { date: "2020-08-15", users: 0, dayInMonth: 20 },
      { date: "2020-08-16", users: 0, dayInMonth: 21 },
      { date: "2020-08-17", users: 0, dayInMonth: 22 },
      { date: "2020-08-18", users: 0, dayInMonth: 23 },
      { date: "2020-08-19", users: 0, dayInMonth: 24 },
      { date: "2020-08-20", users: 0, dayInMonth: 25 },
      { date: "2020-08-21", users: 0, dayInMonth: 26 },
      { date: "2020-08-22", users: 0, dayInMonth: 27 },
      { date: "2020-08-23", users: 0, dayInMonth: 28 },
      { date: "2020-08-24", users: 0, dayInMonth: 29 },
      { date: "2020-08-25", users: 0, dayInMonth: 30 },
      { date: "2020-08-26", users: 0, dayInMonth: 31 },
      { date: "2020-08-27", users: 20, dayInMonth: 1 },
      { date: "2020-08-28", users: 0, dayInMonth: 2 },
      { date: "2020-08-29", users: 0, dayInMonth: 3 },
      { date: "2020-08-30", users: 0, dayInMonth: 4 },
    ]);
  });

  it("should generate user schedule by province", () => {
    //given
    const currentDate = DateTime.fromISO("2020-08-03");

    //when
    const userSchedule = getUserScheduleByProvince(
      advisors,
      currentDate,
      scrub
    );

    //then
    expect(userSchedule).to.eql({
      ON: [
        { date: "2020-07-27", users: 20 },
        { date: "2020-07-28", users: 0 },
        { date: "2020-07-29", users: 0 },
        { date: "2020-07-30", users: 10 },
        { date: "2020-07-31", users: 0 },
        { date: "2020-08-01", users: 0 },
        { date: "2020-08-02", users: 0 },
        { date: "2020-08-03", users: 0 },
        { date: "2020-08-04", users: 15 },
        { date: "2020-08-05", users: 0 },
        { date: "2020-08-06", users: 10 },
        { date: "2020-08-07", users: 0 },
        { date: "2020-08-08", users: 0 },
        { date: "2020-08-09", users: 0 },
        { date: "2020-08-10", users: 15 },
        { date: "2020-08-11", users: 0 },
        { date: "2020-08-12", users: 0 },
        { date: "2020-08-13", users: 0 },
        { date: "2020-08-14", users: 0 },
        { date: "2020-08-15", users: 0 },
        { date: "2020-08-16", users: 0 },
        { date: "2020-08-17", users: 0 },
        { date: "2020-08-18", users: 0 },
        { date: "2020-08-19", users: 0 },
        { date: "2020-08-20", users: 0 },
        { date: "2020-08-21", users: 0 },
        { date: "2020-08-22", users: 0 },
        { date: "2020-08-23", users: 0 },
        { date: "2020-08-24", users: 20 },
        { date: "2020-08-25", users: 0 },
        { date: "2020-08-26", users: 0 },
        { date: "2020-08-27", users: 20 },
        { date: "2020-08-28", users: 0 },
        { date: "2020-08-29", users: 0 },
        { date: "2020-08-30", users: 0 },
      ],
    });
  });
});
