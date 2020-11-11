const { DateTime } = require("luxon");
const { getMapFromHeaders, parseDate } = require("../csvUtils.js");
const Country = require("../regionUtils.js");

const leadWeeks = {
  0: {},
  10: { 1: 10, 8: 0, 15: 0, 22: 0 },
  25: { 1: 10, 8: 10, 15: 5, 22: 0 },
  20: { 1: 10, 8: 10, 15: 0, 22: 0 },
  30: { 1: 10, 8: 10, 15: 10, 22: 0 },
  35: { 1: 10, 8: 10, 15: 10, 22: 5 },
  50: { 1: 10, 8: 15, 15: 10, 22: 15 },
  60: { 1: 15, 8: 15, 15: 15, 22: 15 }
};

const promoLeadWeeks = {
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

const getLeadSchedule = (
  advisor,
  currentDate = DateTime.local(),
  days = 7 * 7,
  daysBack = 7
) => {
  let calculationDay = currentDate.minus({ days: daysBack });
  const leadSchedule = [];
  const weeks = leadWeeks[advisor["subscribed_leads"]];
  if (!weeks) {
    console.error(`${advisor["stripe_customer_id"]} subscribed_leads_amount not found for ${advisor["subscribed_leads"]}`);
    return;
  }
  // let bonus = (parseInt(advisor["BonusLeads"])) + (parseInt(advisor["ImmediateBonusLeads"]));
  // if (isNaN(bonus)) {
  //   bonus = 0;
  // }
  let pendingLeads = 0;
  for (let i = 0; i < days; i++) {
    const latestPeriodStart = getLatestPeriodStart(
      parseDate(advisor["latest_period_start"]),
      calculationDay
    );
    const dayInMonth = getCurrentMonthDays(latestPeriodStart, calculationDay);
    let leadsForToday = weeks[dayInMonth] || 0;
    //console.log([advisor["referral_code"],advisor["latest_period_start"], calculationDay.toISODate(), latestPeriodStart.toISODate(), dayInMonth].join(","));
    if (isHolidayOrWeekend(calculationDay)) {
      pendingLeads += leadsForToday;
      leadsForToday = 0;
    } else {
      leadsForToday += pendingLeads;
      pendingLeads = 0;
    }
    // if (leadsForToday + bonus > 0) {
    //   leadsForToday += bonus;
    //   bonus = 0;
    // }
    leadSchedule.push({
      date: calculationDay.toISODate(),
      leads: leadsForToday,
      dayInMonth: dayInMonth,
    });
    calculationDay = calculationDay.plus({ days: 1 });
  }
  return leadSchedule;
};

const getPromoLeadSchedule = (
  advisor,
  currentDate = DateTime.local(),
  days = 7 * 7,
  daysBack = 7
) => {
  const promoBonus = (parseInt(advisor["promoBonus"]));
  let calculationDay = currentDate.minus({ days: daysBack });
  const promoLeadSchedule = [];
  const promoWeeks = promoLeadWeeks[promoBonus];
  if (!promoWeeks) {
    console.error(`${advisor["stripe_customer_id"]} bonus_leads_amount not found for ${advisor["promoBonus"]}`);
    return promoLeadSchedule;
  }
  let bonus = (parseInt(advisor["asapBonus"]));
  if (isNaN(bonus)) {
    bonus = 0;
  }
  let pendingBonusLeads = 0;
  for (let i = 0; i < days; i++) {
    const latestPeriodStart = getLatestPeriodStart(
      parseDate(advisor["latest_period_start"]),
      calculationDay
    );
    const dayInMonth = getCurrentMonthDays(latestPeriodStart, calculationDay);
    let promoLeadsForToday = promoWeeks[dayInMonth] || 0;
    //console.log([advisor["referral_code"],advisor["latest_period_start"], calculationDay.toISODate(), latestPeriodStart.toISODate(), dayInMonth].join(","));
    if (isHolidayOrWeekend(calculationDay)) {
      pendingBonusLeads += promoLeadsForToday;
      promoLeadsForToday = 0;
    } else {
      promoLeadsForToday += pendingBonusLeads;
      pendingBonusLeads = 0;
    }
    if (promoLeadsForToday + bonus > 0) {
      promoLeadsForToday += bonus;
      bonus = 0;
    } else {
      promoLeadsForToday = 0;
    }
    promoLeadSchedule.push({
      date: calculationDay.toISODate(),
      promoLeads: promoLeadsForToday,
      dayInMonth: dayInMonth,
    });
    calculationDay = calculationDay.plus({ days: 1 });
  }
  return promoLeadSchedule;
};

const getLeadScheduleByRegion = (
  advisors,
  currentDate = DateTime.local(),
  scrub
) => {
  const leadSchedules = advisors.map((advisor) =>
    getLeadSchedule(advisor, currentDate)
  );
  
  
  scrub.forEach(scrubRow => scrubRow[Country.Scrub.Columns.Code.title] = scrubRow[Country.Scrub.Columns.Code.title] + '');
  const scrubRegionCodes = getMapFromHeaders(scrub, Country.Scrub.Columns.Code.title, Country.Scrub.Columns.Region.title);
  const leadSchedulesByRegion = leadSchedules.reduce(
    (regions, schedule, index) => {
      const region = scrubRegionCodes[advisors[index]["upper"].substr(0,3)];
      if (!region) {
        console.error(  
          `${advisors[index]["stripe_customer_id"]} region not found for code ${advisors[index]["upper"]}`
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
    Object.entries(leadSchedulesByRegion).map(
      ([region, schedulesByRegion]) => {
        return [
          region,
          schedulesByRegion.reduce((sumSchedule, advisorSchedule) => {
            return advisorSchedule.map((scheduleDay, index) => {
              return {
                date: scheduleDay.date,
                leads:
                  scheduleDay.leads +
                  (sumSchedule[index] ? sumSchedule[index].leads : 0),
              };
            });
          }, {}),
        ];
      }
    )
  );
  return result;
};

const getPromoLeadScheduleByRegion = (
  advisors,
  currentDate = DateTime.local(),
  scrub
) => {
  const promoLeadSchedules = advisors.map((advisor) =>
    getPromoLeadSchedule(advisor, currentDate)
  );
  
  
  scrub.forEach(scrubRow => scrubRow[Country.Scrub.Columns.Code.title] = scrubRow[Country.Scrub.Columns.Code.title] + '');
  const scrubRegionCodes = getMapFromHeaders(scrub, Country.Scrub.Columns.Code.title, Country.Scrub.Columns.Region.title);
  const promoLeadSchedulesByRegion = promoLeadSchedules.reduce(
    (regions, schedule, index) => {
      const region = scrubRegionCodes[advisors[index]["upper"].substr(0,3)];
      if (!region) {
        console.error(  
          `${advisors[index]["stripe_customer_id"]} region not found for code ${advisors[index]["upper"]}`
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
    Object.entries(promoLeadSchedulesByRegion).map(
      ([region, schedulesByRegion]) => {
        return [
          region,
          schedulesByRegion.reduce((sumSchedule, advisorSchedule) => {
            return advisorSchedule.map((scheduleDay, index) => {
              return {
                date: scheduleDay.date,
                promoLeads:
                  scheduleDay.promoLeads +
                  (sumSchedule[index] ? sumSchedule[index].promoLeads : 0),
              };
            });
          }, {}),
        ];
      }
    )
  );
  return result;
};

module.exports = {
  getLatestPeriodStart,
  getCurrentMonthDays,
  getLeadSchedule,
  getLeadScheduleByRegion,
  getPromoLeadSchedule,
  getPromoLeadScheduleByRegion,
};
