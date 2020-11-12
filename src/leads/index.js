const csv = require("csv-parser");
const fs = require("fs");
const { DateTime } = require("luxon");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const {
  getLeadSchedule,
  getLeadScheduleByRegion,
  getPromoLeadSchedule,
  getPromoLeadScheduleByRegion,
} = require("../leads/leads.js");
const { loadScrub } = require("../scrub/scrub.js");
const { getMapFromHeader, parseDate } = require("../csvUtils");
const { override } = require("./override.js");
const Country = require("../regionUtils.js");


const advisorHeaders = [
  { id: "Lat", title: "Lat" },
  { id: "Long", title: "Long" },
  { title: "Empty" },
  { id: "TotalLeads", title: "TotalLeads" },
  { id: "referral_code", title: "referral_code" },
  { id: "First name", title: "First name" },
  { id: "Recipient", title: "Recipient" },
  { id: "MarketingLeads", title: "MarketingLeads" },
  { id: "BonusLeads", title: "BonusLeads" },
  { id: "assigned_marketing_this_period", title: "assigned_marketing_this_period" },
  { id: "subscribed_leads", title: "subscribed_leads" },
  { id: "Copy", title: "Copy" },
  { id: "RemaingingLeads", title: "RemaingingLeads" },
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
    fs.createReadStream(`csv/all/Master Advisor List - Data Center - ${Country.Code} Daily Export - Advisor Leads.csv`)
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

const generateAdvisorLeads = async (currentDate, advisors, scrub) => {
  const leadSchedules = advisors.map((advisor) =>
    getLeadSchedule(advisor, currentDate)
  );
  const leadPromoSchedules = advisors.map((advisor) =>
    getPromoLeadSchedule(advisor, currentDate)
  );

  scrub.forEach(scrubRow => scrubRow[Country.Scrub.Columns.Code.title] = scrubRow[Country.Scrub.Columns.Code.title] + '');
  const scrubRegionCodes = getMapFromHeader(scrub, Country.Scrub.Columns.Code.title);

  const writer = createCsvWriter({
    path: `csv/all/${currentDate.toISODate()}-${Country.Code}-advisor_leads.csv`,
    header: advisorHeaders,
  });
  writer.writeRecords(
    advisors
      .map((advisor, index) => {
        const leadDay = leadSchedules[index].find(
          (daySchedule) => daySchedule.date === currentDate.toISODate()
        );
        const promoLeadDay = leadPromoSchedules[index].find(
          (daySchedule) => daySchedule.date === currentDate.toISODate()
        );
        const NewLeads = leadDay.leads;
        const regionCodeRows = scrubRegionCodes[advisor["upper"]] || [];
        const regionCodeRow = regionCodeRows[0] || {};
        const latestPeriodStart = parseDate(advisor["latest_period_start"]);
        const stripeCreatedAt = parseDate(advisor["stripe_created_at"]);
        const asapBonus = parseInt(advisor["asapBonus"]);
        const promoBonus = promoLeadDay ? promoLeadDay.promoLeads : 0;
        const marketingLeads = parseInt(advisor["marketing_this_period"]);
        const now = DateTime.local();
        const today = DateTime.local(now.year, now.month, now.day)
        const subscribedLeads = parseInt(advisor["subscribed_leads"]);
        return {
          ...advisor,
          TotalLeads: NewLeads + (asapBonus + promoBonus || 0),
          MarketingLeads: NewLeads,
          BonusLeads: Math.max(0, asapBonus + promoBonus),
          assigned_marketing_this_period: Math.max(0, NewLeads + marketingLeads),
          dayInMonth: leadDay.dayInMonth,
          [Country.Columns.Region.id]: regionCodeRow[Country.Scrub.Columns.Region.title],
          Long: regionCodeRow["Long"],
          Lat: regionCodeRow["Lat"],
          Copy: "",
          Difference: latestPeriodStart.diff(stripeCreatedAt).as('days'),
          dayInPeriod: today.diff(latestPeriodStart).as('days'),
          RemaingingLeads: Math.max(0, subscribedLeads - NewLeads - marketingLeads),
        };
      })
      .filter(
        (advisor) =>
          advisor["TotalLeads"] != 0 && !isNaN(advisor["MarketingLeads"]) && !isNaN(advisor["BonusLeads"]) && (parseDate(advisor["latest_period_start"]) < DateTime.local()),
      )
  );
};

const generateRegionLeads = async (currentDate, advisors, scrub) => {
  const leadSchedule = getLeadScheduleByRegion(advisors, currentDate, scrub);
  const leadScheduleEntries = Object.entries(leadSchedule);
  const aRegionSchedule = leadScheduleEntries[0][1];
  const regionHeaders = [
    Country.Columns.Region,
    ...aRegionSchedule.map((scheduleDay) => ({
      id: scheduleDay.date,
      title: scheduleDay.date,
    })),
  ];
  const writer = createCsvWriter({
    path: `csv/all/${Country.Code}_leads_schedule.csv`,
    header: regionHeaders,
  });
  writer.writeRecords(
    leadScheduleEntries
      .map(([region, leadSchedule]) => {
        return {
          [Country.Columns.Region.id]: region,
          ...Object.fromEntries(
            leadSchedule.map((scheduleDay) => [
              scheduleDay.date,
              scheduleDay.leads,
            ])
          ),
        };
      })
      .filter((row) => row[Country.Columns.Region.id])
      .sort((row1,row2) => row1[Country.Columns.Region.id].localeCompare(row2[Country.Columns.Region.id]))
  );
};

const generateRegionPromoLeads = async (currentDate, advisors, scrub) => {
  const promoLeadSchedule = getPromoLeadScheduleByRegion(advisors, currentDate, scrub);
  const leadPromoScheduleEntries = Object.entries(promoLeadSchedule);
  const aRegionPromoSchedule = leadPromoScheduleEntries[0][1];
  const regionHeaders = [
    Country.Columns.Region,
    ...aRegionPromoSchedule.map((scheduleDay) => ({
      id: scheduleDay.date,
      title: scheduleDay.date,
    })),
  ];
  const writer = createCsvWriter({
    path: `csv/all/${Country.Code}_promoleads_schedule.csv`,
    header: regionHeaders,
  });
  writer.writeRecords(
    leadPromoScheduleEntries
      .map(([region, promoLeadSchedule]) => {
        return {
          [Country.Columns.Region.id]: region,
          ...Object.fromEntries(
            promoLeadSchedule.map((scheduleDay) => [
              scheduleDay.date,
              scheduleDay.promoLeads,
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
  generateAdvisorLeads(today, overrideAdvisors, scrub);
  generateRegionLeads(today, overrideAdvisors, scrub);
  generateRegionPromoLeads(today, overrideAdvisors, scrub);

  // const tomorrow = today.plus({days:1});
  // generateAdvisorLeads(tomorrow, overrideAdvisors, scrub);
};

generateAll();
