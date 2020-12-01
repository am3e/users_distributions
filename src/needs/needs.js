const { DateTime } = require("luxon");
const { getMapFromHeaders, parseDate } = require("../csvUtils.js");
const Country = require("../regionUtils.js");

const userWeeks = {
  0: {},
  10: { 1: 10, 8: 0, 15: 0, 22: 0 },
  25: { 1: 10, 8: 10, 15: 5, 22: 0 },
  20: { 1: 10, 8: 10, 15: 0, 22: 0 },
  30: { 1: 10, 8: 10, 15: 10, 22: 0 },
  35: { 1: 10, 8: 10, 15: 10, 22: 5 },
  50: { 1: 10, 8: 15, 15: 10, 22: 15 },
  60: { 1: 15, 8: 15, 15: 15, 22: 15 }
};

const promoUserWeeks = {
  0: {},
  5: { 1: 0, 8: 5, 15: 0, 22: 0 },
  10: { 1: 0, 8: 10, 15: 0, 22: 0 },
  15: { 1: 0, 8: 10, 15: 5, 22: 0 },
  20: { 1: 0, 8: 10, 15: 10, 22: 0 },
};
const getLatestPeriodStart = (startDate, currentDate = DateTime.local()) => {
  const months = Math.floor(
    currentDate.diff(startDate, "months").toObject().months
  );
  return startDate.plus({ months });
};

const getCurrentMonthDays = (
  latestPeriodStart,
  currentDate = DateTime.local()
) => {
  return Math.ceil(currentDate.diff(latestPeriodStart, "days").toObject().days);
};

const isHolidayOrWeekend = (date) => {
  if (Country.Holidays[date.toISODate()]) {
    return true;
  }
  return date.weekday == 6 || date.weekday == 7;
};

const getUserSchedule = (
  advisor,
  currentDate = DateTime.local(),
  days = 7 * 7,
  daysBack = 7
) => {
  let calculationDay = currentDate.minus({ days: daysBack });
  const userSchedule = [];
  const weeks = userWeeks[advisor["subscribed_leads"]];
  if (!weeks) {
    console.error(
    `${advisors[index]["referral_code"]} - (${advisors[index]["stripe_customer_id"]}) subscribed_users_amount not found for ${advisor["subscribed_leads"]}`
    );
    return;
  }
  // let bonus = (parseInt(advisor["BonusUsers"])) + (parseInt(advisor["ImmediateBonusUsers"]));
  // if (isNaN(bonus)) {
  //   bonus = 0;
  // }
  let pendingUsers = 0;
  for (let i = 0; i < days; i++) {
    const latestPeriodStart = getLatestPeriodStart(
      parseDate(advisor["latest_period_start"]),
      calculationDay
    );
    const dayInMonth = getCurrentMonthDays(latestPeriodStart, calculationDay);
    let usersForToday = weeks[dayInMonth] || 0;
    // console.log([advisor["referral_code"],advisor["latest_period_start"], calculationDay.toISODate(), latestPeriodStart.toISODate(), dayInMonth].join(","));
    // console.log([advisor["referral_code"], calculationDay.toISODate(),[advisor["subscribed_leads"]], usersForToday].join(","));
    if (isHolidayOrWeekend(calculationDay)) {
      pendingUsers += usersForToday;
      usersForToday = 0;
    } else {
      usersForToday += pendingUsers;
      pendingUsers = 0;
    }
    // if (usersForToday + bonus > 0) {
    //   usersForToday += bonus;
    //   bonus = 0;
    // }
    userSchedule.push({
      date: calculationDay.toISODate(),
      users: usersForToday,
      dayInMonth: dayInMonth,
    });
    calculationDay = calculationDay.plus({ days: 1 });
  }
  return userSchedule;
};

const getPromoUserSchedule = (
  advisor,
  currentDate = DateTime.local(),
  days = 7 * 7,
  daysBack = 7
) => {
  const promoBonus = (parseInt(advisor["promoBonus"]));
  let calculationDay = currentDate.minus({ days: daysBack });
  const promoUserSchedule = [];
  const promoWeeks = promoUserWeeks[promoBonus];
  if (!promoWeeks) {
    // console.error(`${advisor["stripe_customer_id"]} bonus_users_amount not found for ${advisor["promoBonus"]}`);
    return promoUserSchedule;
  }
  let bonus = (parseInt(advisor["asapBonus"]));
  if (isNaN(bonus)) {
    bonus = 0;
  }
  let pendingBonusUsers = 0;
  for (let i = 0; i < days; i++) {
    const latestPeriodStart = getLatestPeriodStart(
      parseDate(advisor["latest_period_start"]),
      calculationDay
    );
    const dayInMonth = getCurrentMonthDays(latestPeriodStart, calculationDay);
    let promoUsersForToday = promoWeeks[dayInMonth] || 0;
    //console.log([advisor["referral_code"],advisor["latest_period_start"], calculationDay.toISODate(), latestPeriodStart.toISODate(), dayInMonth].join(","));
    if (isHolidayOrWeekend(calculationDay)) {
      pendingBonusUsers += promoUsersForToday;
      promoUsersForToday = 0;
    } else {
      promoUsersForToday += pendingBonusUsers;
      pendingBonusUsers = 0;
    }
    if (promoUsersForToday + bonus > 0) {
      promoUsersForToday += bonus;
      bonus = 0;
    } else {
      promoUsersForToday = 0;
    }
    promoUserSchedule.push({
      date: calculationDay.toISODate(),
      promoUsers: promoUsersForToday,
      dayInMonth: dayInMonth,
    });
    calculationDay = calculationDay.plus({ days: 1 });
  }
  return promoUserSchedule;
};

const getUserScheduleByRegion = (
  advisors,
  currentDate = DateTime.local(),
  scrub
) => {
  const userSchedules = advisors.map((advisor) =>
    getUserSchedule(advisor, currentDate)
  );
  console.log("");
  console.log("\x1b[45m", "Issue with Region Code", "\x1b[0m");
  scrub.forEach(scrubRow => scrubRow[Country.Scrub.Columns.Code.title] = scrubRow[Country.Scrub.Columns.Code.title] + '');
  const scrubRegionCodes = getMapFromHeaders(scrub, Country.Scrub.Columns.Code.title, Country.Scrub.Columns.Region.title);
  const userSchedulesByRegion = userSchedules.reduce(
    (regions, schedule, index) => {
      const region = scrubRegionCodes[advisors[index]["upper"].substr(0,3)];
      if (!region) {
        console.error(  
          `Users for ${advisors[index]["referral_code"]} - (${advisors[index]["stripe_customer_id"]}) region not found for code ${advisors[index]["upper"]}`
        );
      }
      advisors[index][Country.Columns.Region.id] = region;

      let schedulesByRegion = regions[region];
      if (!schedulesByRegion) {
        schedulesByRegion = [];
      }
      schedulesByRegion.push(schedule);
      return { ...regions, [region]: schedulesByRegion };
    },
    {}
  );
  const result = Object.fromEntries(
    Object.entries(userSchedulesByRegion).map(
      ([region, schedulesByRegion]) => {
        return [
          region,
          schedulesByRegion.reduce((sumSchedule, advisorSchedule) => {
            if (advisorSchedule.length === 0) {
              return sumSchedule;
            }
            return advisorSchedule.map((scheduleDay, index) => {
              return {
                date: scheduleDay.date,
                users:
                  scheduleDay.users +
                  (sumSchedule[index] ? sumSchedule[index].users : 0),
              };
            });
          }, []),
        ];
      }
    )
  );
  return result;
};

const getPromoUserScheduleByRegion = (
  advisors,
  currentDate = DateTime.local(),
  scrub
) => {
  const promoUserSchedules = advisors.map((advisor) =>
    getPromoUserSchedule(advisor, currentDate)
  );
  
  
  scrub.forEach(scrubRow => scrubRow[Country.Scrub.Columns.Code.title] = scrubRow[Country.Scrub.Columns.Code.title] + '');
  const scrubRegionCodes = getMapFromHeaders(scrub, Country.Scrub.Columns.Code.title, Country.Scrub.Columns.Region.title);
  const promoUserSchedulesByRegion = promoUserSchedules.reduce(
    (regions, schedule, index) => {
      const region = scrubRegionCodes[advisors[index]["upper"].substr(0,3)];
      if (!region) {
        console.error(  
          `Bonus for ${advisors[index]["referral_code"]} - (${advisors[index]["stripe_customer_id"]}) region not found for code ${advisors[index]["upper"]}`
        );
      }
      advisors[index][Country.Columns.Region.id] = region;

      let schedulesByRegion = regions[region];
      if (!schedulesByRegion) {
        schedulesByRegion = [];
      }
      schedulesByRegion.push(schedule);
      return { ...regions, [region]: schedulesByRegion };
    },
    {}
  );
  const result = Object.fromEntries(
    Object.entries(promoUserSchedulesByRegion).map(
      ([region, schedulesByRegion]) => {
        return [
          region,
          schedulesByRegion.reduce((sumSchedule, advisorSchedule) => {
            if (advisorSchedule.length === 0) {
              return sumSchedule;
            }
            return advisorSchedule.map((scheduleDay, index) => {
              return {
                date: scheduleDay.date,
                promoUsers:
                  scheduleDay.promoUsers +
                  (sumSchedule[index] ? sumSchedule[index].promoUsers : 0),
              };
            });
          }, []),
        ];
      }
    )
  );
  return result;
};

module.exports = {
  getLatestPeriodStart,
  getCurrentMonthDays,
  getUserSchedule,
  getUserScheduleByRegion,
  getPromoUserSchedule,
  getPromoUserScheduleByRegion,
};
