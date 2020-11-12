const csv = require("csv-parser");
const fs = require("fs");
const { DateTime } = require("luxon");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const {
  getUserSchedule,
  getUserScheduleByRegion,
  getPromoUserSchedule,
  getPromoUserScheduleByRegion,
} = require("../users/users.js");
const { loadScrub } = require("../scrub/scrub.js");
const { getMapFromHeader, parseDate } = require("../csvUtils");
const { override } = require("./override.js");
const Country = require("../regionUtils.js");


const advisorHeaders = [
  { id: "Lat", title: "Lat" },
  { id: "Long", title: "Long" },
  { title: "Empty" },
  { id: "TotalUsers", title: "TotalUsers" },
  { id: "referral_code", title: "referral_code" },
  { id: "First name", title: "First name" },
  { id: "Recipient", title: "Recipient" },
  { id: "MarketingUsers", title: "MarketingUsers" },
  { id: "BonusUsers", title: "BonusUsers" },
  { id: "assigned_marketing_this_period", title: "assigned_marketing_this_period" },
  { id: "subscribed_users", title: "subscribed_users" },
  { id: "Copy", title: "Copy" },
  { id: "RemaingingUsers", title: "RemaingingUsers" },
  { id: "Difference", title: "Difference" },
  { id: "dayInMonth", title: "dayInMonth" },
  { id: "dayInPeriod", title: "dayInPeriod" },
  { id: "latest_period_start", title: "latest_period_start" },
  { id: "stripe_created_at", title: "stripe_created_at" },
  { id: "Date Churned", title: "Date Churned" },
  { id: "Last Update", title: "Last Update" },
  { id: "upper", title: "Region Code" },
  Country.Columns.Region,
];


const loadOverride = () => {
  const rows = [];
  return new Promise((resolve) => {
    fs.createReadStream(`csv/all/Master Advisor List - Data Center - ${Country.Code} Daily Export - Advisor Users.csv`)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
};

const loadAdvisors = () => {
  const rows = [];
  return new Promise((resolve) => {
    const fileList = fs.readdirSync("csv/all");
    const files = fileList.filter((file) => file.match(/-advisors.csv/gi));
    if (files.length == 0) {
      reject("no advisors file found");
    } else if (files.length > 1) {
      reject("too many advisors files found " + files);
    } else {
      fs.createReadStream("csv/all/" + files[0])
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows));
    }
  });
};

const generateAdvisorUsers = async (currentDate, advisors, scrub) => {
  const userSchedules = advisors.map((advisor) =>
    getUserSchedule(advisor, currentDate)
  );
  const userPromoSchedules = advisors.map((advisor) =>
    getPromoUserSchedule(advisor, currentDate)
  );

  scrub.forEach(scrubRow => scrubRow[Country.Scrub.Columns.Code.title] = scrubRow[Country.Scrub.Columns.Code.title] + '');
  const scrubRegionCodes = getMapFromHeader(scrub, Country.Scrub.Columns.Code.title);

  const writer = createCsvWriter({
    path: `csv/all/${currentDate.toISODate()}-${Country.Code}-advisor_users.csv`,
    header: advisorHeaders,
  });
  writer.writeRecords(
    advisors
      .map((advisor, index) => {
        const userDay = userSchedules[index].find(
          (daySchedule) => daySchedule.date === currentDate.toISODate()
        );
        const promoUserDay = userPromoSchedules[index].find(
          (daySchedule) => daySchedule.date === currentDate.toISODate()
        );
        const NewUsers = userDay.users;
        const regionCodeRows = scrubRegionCodes[advisor["upper"]] || [];
        const regionCodeRow = regionCodeRows[0] || {};
        const latestPeriodStart = parseDate(advisor["latest_period_start"]);
        const stripeCreatedAt = parseDate(advisor["stripe_created_at"]);
        const asapBonus = parseInt(advisor["asapBonus"]);
        const promoBonus = promoUserDay ? promoUserDay.promoUsers : 0;
        const marketingUsers = parseInt(advisor["marketing_this_period"]);
        const now = DateTime.local();
        const today = DateTime.local(now.year, now.month, now.day)
        const subscribedUsers = parseInt(advisor["subscribed_leads"]);
        return {
          ...advisor,
          TotalUsers: NewUsers + (asapBonus + promoBonus || 0),
          MarketingUsers: NewUsers,
          BonusUsers: Math.max(0, asapBonus + promoBonus),
          assigned_marketing_this_period: Math.max(0, NewUsers + marketingUsers),
          dayInMonth: userDay.dayInMonth,
          [Country.Columns.Region.id]: regionCodeRow[Country.Scrub.Columns.Region.title],
          Long: regionCodeRow["Long"],
          Lat: regionCodeRow["Lat"],
          Copy: "",
          Difference: latestPeriodStart.diff(stripeCreatedAt).as('days'),
          dayInPeriod: today.diff(latestPeriodStart).as('days'),
          RemaingingUsers: Math.max(0, subscribedUsers - NewUsers - marketingUsers),
        };
      })
      .filter(
        (advisor) =>
          advisor["TotalUsers"] != 0 && !isNaN(advisor["MarketingUsers"]) && !isNaN(advisor["BonusUsers"]) && (parseDate(advisor["latest_period_start"]) < DateTime.local()),
      )
  );
};

const generateRegionUsers = async (currentDate, advisors, scrub) => {
  const userSchedule = getUserScheduleByRegion(advisors, currentDate, scrub);
  const userScheduleEntries = Object.entries(userSchedule);
  const aRegionSchedule = userScheduleEntries[0][1];
  const regionHeaders = [
    Country.Columns.Region,
    ...aRegionSchedule.map((scheduleDay) => ({
      id: scheduleDay.date,
      title: scheduleDay.date,
    })),
  ];
  const writer = createCsvWriter({
    path: `csv/all/${Country.Code}_users_schedule.csv`,
    header: regionHeaders,
  });
  writer.writeRecords(
    userScheduleEntries
      .map(([region, userSchedule]) => {
        return {
          [Country.Columns.Region.id]: region,
          ...Object.fromEntries(
            userSchedule.map((scheduleDay) => [
              scheduleDay.date,
              scheduleDay.users,
            ])
          ),
        };
      })
      .filter((row) => row[Country.Columns.Region.id])
      .sort((row1,row2) => row1[Country.Columns.Region.id].localeCompare(row2[Country.Columns.Region.id]))
  );
};

const generateRegionPromoUsers = async (currentDate, advisors, scrub) => {
  const promoUserSchedule = getPromoUserScheduleByRegion(advisors, currentDate, scrub);
  const userPromoScheduleEntries = Object.entries(promoUserSchedule);
  const aRegionPromoSchedule = userPromoScheduleEntries[0][1];
  const regionHeaders = [
    Country.Columns.Region,
    ...aRegionPromoSchedule.map((scheduleDay) => ({
      id: scheduleDay.date,
      title: scheduleDay.date,
    })),
  ];
  const writer = createCsvWriter({
    path: `csv/all/${Country.Code}_promousers_schedule.csv`,
    header: regionHeaders,
  });
  writer.writeRecords(
    userPromoScheduleEntries
      .map(([region, promoUserSchedule]) => {
        return {
          [Country.Columns.Region.id]: region,
          ...Object.fromEntries(
            promoUserSchedule.map((scheduleDay) => [
              scheduleDay.date,
              scheduleDay.promoUsers,
            ])
          ),
        };
      })
      .filter((row) => row[Country.Columns.Region.id])
      .sort((row1,row2) => row1[Country.Columns.Region.id].localeCompare(row2[Country.Columns.Region.id]))
  );
};

const generateAll = async () => {
  const [advisors, overrideRows, scrub] = await Promise.all([loadAdvisors(), loadOverride(),loadScrub()]);
  const overrideAdvisors = await override (overrideRows, advisors);

  const now = DateTime.local();
  const today = DateTime.local(now.year, now.month, now.day);
  generateAdvisorUsers(today, overrideAdvisors, scrub);
  generateRegionUsers(today, overrideAdvisors, scrub);
  generateRegionPromoUsers(today, overrideAdvisors, scrub);

  // const tomorrow = today.plus({days:1});
  // generateAdvisorUsers(tomorrow, overrideAdvisors, scrub);
};

generateAll();
