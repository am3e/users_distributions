const csv = require("csv-parser");
const fs = require("fs");
const { DateTime } = require("luxon");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const {
  getUserSchedule,
  getUserScheduleByRegion,
  getPromoUserSchedule,
  getPromoUserScheduleByRegion,
} = require("../needs/needs.js");
const { loadScrub } = require("../scrub/scrub.js");
const { getMapFromHeader, parseDate } = require("../csvUtils");
const { override } = require("./override.js");
const Country = require("../regionUtils.js");


const advisorHeaders = [
  Country.Columns.Region,
  { id: "Difference", title: "Days since Last Payment" },
  { id: "Status", title: "Status" },
  { id: "Date Churned", title: "Date Churned" },
  { id: "Last Update", title: "Last Update" },
  { id: "TotalUsers", title: "TotalUsers" },
  { id: "referral_code", title: "referral_code" },
  { id: "First name", title: "First name" },
  { id: "Recipient", title: "Recipient" },
  { id: "MarketingUsers", title: "marketing" },
  { id: "BonusUsers", title: "bonus" },
  { id: "assigned_marketing_this_period", title: "assigned_marketing_this_period" },
  { id: "assigned_bonus_this_period", title: "assigned_bonus_this_period" },
  { id: "Copy", title: "Copy" },
  { id: "RemaingingUsers", title: "RemaingingUsers" },
  // { id: "dayInMonth", title: "dayInMonth" },
  { id: "subscribed_leads", title: "subscribed_users" },
  { id: "latest_period_start", title: "latest_period_start" },
  { id: "stripe_created_at", title: "stripe_created_at" },

  { id: "upper", title: "Region Code" },
  { id: "Lat", title: "lat" },
  { id: "Long", title: "long" },
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
        const status = advisor["array_agg"] || "none";
        const regionCodeRows = scrubRegionCodes[advisor["upper"]] || [];
        const regionCodeRow = regionCodeRows[0] || {};
        const latestPeriodStart = parseDate(advisor["latest_period_start"]);
        const stripeCreatedAt = parseDate(advisor["stripe_created_at"]);
        const asapBonus = parseInt(advisor["asapBonus"]);
        const bankedType = promoUserDay && (advisor["banked"]);
        const promoType = promoUserDay && !(advisor["banked"]);
        const promoBonus = promoType ? promoUserDay.promoUsers : 0;
        const bankedUsers = bankedType ? promoUserDay.promoUsers : 0;
        const marketingUsers = parseInt(advisor["marketing_this_period"]);
        const bonusUsers = parseInt(advisor["bonus_this_period"]);

        // console.log(promoType, advisor["referral_code"], promoBonus, advisor["banked"]);
        const now = DateTime.local();
        const today = DateTime.local(now.year, now.month, now.day);
        const subscribedUsers = parseInt(advisor["subscribed_leads"]);
        const difference = Math.ceil(today.diff(latestPeriodStart).as('days'));
        const differenceInPaymentDaysIssue = difference > 30;
        const differenceInPaymentDays = differenceInPaymentDaysIssue ?  `${difference - 30 } days overdue` : `${difference}`;
        const remainingUsers = Math.max(0, subscribedUsers - NewUsers - marketingUsers);
        const differenceRequiredUsersIssue = remainingUsers > 10 && difference > 23 ;
        const differenceRequiredUsers = differenceRequiredUsersIssue ?  remainingUsers : 0 ;

        if ([advisor["subscribed_leads"]] == 50 && [advisor["referral_code"]] === "adv-ryan-5") {
          console.log(`****${[advisor["subscribed_leads"]]}, ${[advisor["referral_code"]]}`);
          advisor["subscribed_leads"] = 150;
          console.log(`****${[advisor["subscribed_leads"]]}, ${[advisor["referral_code"]]}`);
        };
        if (differenceInPaymentDaysIssue) {
          console.log("\x1b[42m",`Payment issue: ${differenceInPaymentDays} for ${advisor["referral_code"]}`,"\x1b[0m");
        }
        if (differenceRequiredUsersIssue) {
          console.log("\x1b[46m",`Required Users issue: ${differenceRequiredUsers} for ${advisor["referral_code"]}`,"\x1b[0m");
        }
        return {
          ...advisor,
          TotalUsers: NewUsers + bankedUsers + (asapBonus + promoBonus || 0),
          MarketingUsers: NewUsers + bankedUsers,
          BonusUsers: Math.max(0, asapBonus + promoBonus),
          assigned_marketing_this_period: Math.max(0, NewUsers + marketingUsers),
          assigned_bonus_this_period: Math.max(0, NewUsers + bonusUsers),
          Status: status,
          dayInMonth: userDay.dayInMonth,
          [Country.Columns.Region.id]: regionCodeRow[Country.Scrub.Columns.Region.title],
          Long: regionCodeRow["Long"],
          Lat: regionCodeRow["Lat"],
          Copy: Country.Copy,
          Difference: differenceInPaymentDays,
          RemaingingUsers: remainingUsers,
        };
      })
      .filter(
        (advisor) =>
          advisor["TotalUsers"] != 0 && !isNaN(advisor["MarketingUsers"]) && !isNaN(advisor["BonusUsers"]) && (parseDate(advisor["latest_period_start"]) < DateTime.local()),
      )
  );
};

const generateFullSchedule = async (currentDate, advisors, scrub) => {
  const userSchedule = getUserScheduleByRegion(advisors, currentDate, scrub);
  const userPromoSchedule = getPromoUserScheduleByRegion(advisors,currentDate,scrub);
  const userFullScheduleEntries = Object.entries(userSchedule);
  const aRegionSchedule = userFullScheduleEntries[0][1];
  const regionHeaders = [
    Country.Columns.Region,
    ...aRegionSchedule.map((scheduleDay) => ({
      id: scheduleDay.date,
      title: scheduleDay.date,
    })),
  ];
    userFullScheduleEntries.map(
      ([region, schedulesByRegion]) => {
        const promoSchedulesByRegion = userPromoSchedule[region];
        if (!promoSchedulesByRegion || promoSchedulesByRegion.length == 0) {
          console.error('theres no promo schedule for ' + region);
        } else {
          // console.log(region);
          schedulesByRegion.map(
            (scheduleDay, index) => {
              const promoSchedule = promoSchedulesByRegion[index];
              if (!promoSchedule) {
                console.error('theres no promo schedule for ' + region + ' ' + scheduleDay.date);
              } else {
                // console.log(scheduleDay.date, scheduleDay.users, promoSchedule.promoUsers);
                scheduleDay.users = scheduleDay.users + promoSchedule.promoUsers;
                // console.log(scheduleDay.date, scheduleDay.users);
              }
            }
          )
        }
      }
    )
    const writer = createCsvWriter({
      path: `csv/all/${Country.Code}_fullschedule.csv`,
      header: regionHeaders,
    });
    writer.writeRecords(
      userFullScheduleEntries
        .map(([region, fullSchedule]) => {
          return {
            [Country.Columns.Region.id]: region,
            ...Object.fromEntries(
              fullSchedule.map((scheduleDay) => [
                scheduleDay.date,
                scheduleDay.users,
              ])
            ),
          };
        })
        .filter((row) => row[Country.Columns.Region.id])
        .sort((row1,row2) => row1[Country.Columns.Region.id].localeCompare(row2[Country.Columns.Region.id]))
    );
}

const generateAll = async () => {
  const [advisors, overrideRows, scrub] = await Promise.all([loadAdvisors(), loadOverride(),loadScrub()]);
  const overrideAdvisors = await override (overrideRows, advisors);
  console.log("");

  const now = DateTime.local();
  const today = DateTime.local(now.year, now.month, now.day);
  generateAdvisorUsers(today, overrideAdvisors, scrub);
  generateFullSchedule(today, overrideAdvisors, scrub);
  // generateRegionUsers(today, overrideAdvisors, scrub);
  //generateRegionPromoUsers(today, overrideAdvisors, scrub);

  //const tomorrow = today.plus({days:1});
  //generateAdvisorUsers(tomorrow, overrideAdvisors, scrub);
};

generateAll();
