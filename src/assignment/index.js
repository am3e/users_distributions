const csv = require("csv-parser");
const fs = require("fs");
const { DateTime } = require("luxon");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { assignUsers } = require("./assignment");
const { groupBy, uniqBy } = require("lodash");
const Country = require("../regionUtils.js");

const mainHeaders = [


  { id: "group", title: "user-source" },
  { id: "Issue", title: "Issue" },
  { id: "house_value", title: "house_value" },
  { id: "child_count", title: "child_count" },
  { id: "primary_age", title: "primary_age" },
  { id: "user_income", title: "user_income" },
  { id: "user_aum", title: "user_aum" },
  { id: "inserted_at", title: "inserted_at" },
  Country.Columns.Region,
  { id: "Scrubbed", title: "Scrubbed" },
  { id: "first_name", title: "first_name" },
  { title: "Empty" },
  { id: "household_id", title: "Household_ID" },
  { id: "referred_by", title: "Group" },
  { id: "email", title: "Email" },
  { id: "referral_code", title: "Ref" },
  { id: "Type", title: "Type" },
  { id: "distance", title: "distance" },
];

const loadFile = (path) => {
  const rows = [];
  return new Promise((resolve) => {
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
};

const generateAll = async (currentDate) => {
  const [advisors, users] = await Promise.all([
    loadFile(`csv/all/${currentDate.toISODate()}-${Country.Code}-advisor_users.csv`),
    loadFile(`csv/all/${Country.Code}_inventory.csv`),
  ]);
  const [userAssignmentsMarketing, advisorUsersMarketing, userDistancesMarketing, distancesMarketing, unfulfilledAdvisorsMarketing] = assignUsers(
    users.filter(user => user["Type"] === "Marketing"),
    advisors,
    "MarketingUsers"
  );
  const [userAssignmentsBonus, advisorUsersBonus, userDistancesBonus, distancesBonus, unfulfilledAdvisorsBonus] = assignUsers(
    users.filter(user => user["Type"] === "Bonus"),
    advisors,
    "BonusUsers"
  );
  const userAssignments = {...userAssignmentsMarketing, ...userAssignmentsBonus};
  const advisorUsers = Object.fromEntries(advisors.map(advisor => {
    const marketing = advisorUsersMarketing[advisor["referral_code"]] || [];
    const bonus = advisorUsersBonus[advisor["referral_code"]] || [];
    return [advisor["referral_code"], [
      ...marketing,
      ...bonus
    ]]
  }));
  const userDistances = {...userDistancesMarketing, ...userDistancesBonus};
  const distances = [...distancesMarketing, ...distancesBonus];
  const unfulfilledAdvisors = uniqBy([...unfulfilledAdvisorsMarketing, ...unfulfilledAdvisorsBonus], advisor => advisor['referral_code']);
  const distancesByUser = groupBy(distances, "user.household_id");
  const inventoryWriter = createCsvWriter({
    path: `csv/all/${currentDate.toISODate()}-${Country.Code}-assigned.csv`,
    header: [
      ...mainHeaders,
      ...advisors.map(advisor => ({id:advisor["referral_code"], title:advisor["referral_code"]}))
    ]
  });
  inventoryWriter.writeRecords(
    users.map((user) => {
      const distancesForUser = distancesByUser[user["household_id"]];
      const advisorDistances = distancesForUser ? Object.fromEntries(distancesByUser[user["household_id"]].map(distance => [distance.advisor["referral_code"], distance.distance])) : {};
      return {
        ...user,
        referral_code: userAssignments[user["household_id"]],
        distance: userDistances[user["household_id"]],
        Type: user["Type"],
        ...advisorDistances,
      }
    })
  );

  console.log("");
  const unassignedUsersByRegion = groupBy(users.filter(user => !userAssignments[user["household_id"]]), Country.Columns.Region.title);
  console.log("\x1b[45m", "Unassigned Users:", "\x1b[0m");
  Object.keys(unassignedUsersByRegion).forEach(region => {
    const unassignedUsersByType = groupBy(unassignedUsersByRegion[region], "Type");
    console.log(`${region}, ${unassignedUsersByRegion[region].length}, ${unassignedUsersByType['Marketing']?unassignedUsersByType['Marketing'].length:0}, ${unassignedUsersByType['Bonus']?unassignedUsersByType['Bonus'].length:0}`);
  })
  console.log("");
  console.log("\x1b[45m", "Quick Review - Unfulfilled", "\x1b[0m");
  console.log(['*referral_code', 'Region', 'fulfilled', 'unfulfilled'].join(','));
  unfulfilledAdvisors.map(advisor => {
    const users = advisorUsers[advisor["referral_code"]];
    const fulfilled = users ? users.length : 0;
    if (advisor['TotalUsers'] - fulfilled > 0) {
      console.log([advisor['referral_code'], advisor[Country.Columns.Region.title],fulfilled, (advisor['TotalUsers'] - fulfilled || 0)].join(","));
    } 
  });
  console.log("");
  console.log("\x1b[45m", "AUM Review", "\x1b[0m");
  console.log(['*referral_code', 'user_aum'].join(','));
  Object.entries(advisorUsers).map(([referral_code, household_ids]) => {
    const avgUserAum = household_ids.reduce((sum,household_id) => {
      const user = users.find((user) => user["household_id"] === household_id);
      return sum + parseInt(user["user_aum"]);
    },0)/ household_ids.length;
      const advisor = advisors.find((advisor) => advisor["referral_code"] === referral_code);
      const region = advisor[Country.Columns.Region.title];
    // const region = user[Country.Columns.Region.title];
    if (avgUserAum < 125000) {
      console.log("\x1b[41m", "issue - " + [referral_code, region, avgUserAum.toFixed(0)].join(","), "\x1b[0m");
    } else if (avgUserAum > 125000) {
      console.log("no issue - " + [referral_code, region, avgUserAum.toFixed(0)].join(","));
    } else {
      console.log("\x1b[41m", "issue - " + referral_code + "," + region + ",no aum", "\x1b[0m");
    }
  })
  console.log("");
  console.log("\x1b[45m", "Advisor User Averages", "\x1b[0m");
  console.log(['*referral_code', 'fulfilled', 'distance', 'house value', 'child count', 'age', 'user income','user_aum'].join(','));
  Object.entries(advisorUsers).map(([referral_code, household_ids]) => {
    if(household_ids.length === 0) {
      console.log([referral_code, household_ids.length, 0, 0, 0, 0, 0, 0].join(","));
    } else {
      const avgUserDistance = household_ids.reduce((sum,household_id) => {
        const user = users.find((user) => user["household_id"] === household_id);
        return sum + userDistances[user["household_id"]];
      },0)/ household_ids.length;
      const avgHomeseValue = household_ids.reduce((sum,household_id) => {
        const user = users.find((user) => user["household_id"] === household_id);
        return sum + parseInt(user["house_value"]);
      },0)/ household_ids.length;
      const avgChildCount = household_ids.reduce((sum,household_id) => {
        const user = users.find((user) => user["household_id"] === household_id);
        return sum + parseInt(user["child_count"]);
      },0)/ household_ids.length;
      const avgAge = household_ids.reduce((sum,household_id) => {
        const user = users.find((user) => user["household_id"] === household_id);
        return sum + parseInt(user["primary_age"]);
      },0)/ household_ids.length;
      const avgUserIncome = household_ids.reduce((sum,household_id) => {
        const user = users.find((user) => user["household_id"] === household_id);
        return sum + parseInt(user["user_income"]);
      },0)/ household_ids.length;
      const avgUserAum = household_ids.reduce((sum,household_id) => {
        const user = users.find((user) => user["household_id"] === household_id);
        return sum + parseInt(user["user_aum"]);
      },0)/ household_ids.length;
      const advisor = advisors.find((advisor) => advisor["referral_code"] === referral_code);
      const region = advisor[Country.Columns.Region.title];
      console.log([referral_code, household_ids.length, region, avgUserDistance.toFixed(0), avgHomeseValue.toFixed(0), avgChildCount.toFixed(0), avgAge.toFixed(0),avgUserIncome.toFixed(0), avgUserAum.toFixed(0)].join(","));
    }
  })
  
};

const now = DateTime.local();

generateAll(DateTime.local(now.year, now.month, now.day)); //today
// generateAll(DateTime.local(now.year, now.month, now.day).plus({days:1})); //tomorrow

