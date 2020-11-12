const csv = require("csv-parser");
const fs = require("fs");
const { DateTime } = require("luxon");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { assignLeads } = require("./assignment");
const { groupBy, uniqBy } = require("lodash");
const Country = require("../regionUtils.js");

const mainHeaders = [

  { id: "inserted_at", title: "inserted_at" },
  Country.Columns.Region,
  { id: "referred_by", title: "referred_by" },
  { id: "first_name", title: "first_name" },
  { id: "email", title: "email" },
  { id: "phone", title: "phone" },
  { id: "Issue", title: "Issue" },
  { id: "Reason", title: "Reason" },
  { id: "Scrubbed", title: "Scrubbed" },
  { id: "distance", title: "distance" },
  { id: "house_value", title: "house_value" },
  { id: "child_count", title: "child_count" },
  { id: "primary_age", title: "primary_age" },
  { id: "lead_income", title: "lead_income" },
  { id: "lead_aum", title: "lead_aum" },
  { title: "Empty" },
  { id: "household_id", title: "Household_ID" },
  { id: "referred_by", title: "Group" },
  { id: "email", title: "Email" },
  { id: "referral_code", title: "Ref" },
  { id: "Type", title: "Type" },
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
  const [advisors, leads] = await Promise.all([
    loadFile(`csv/all/${currentDate.toISODate()}-${Country.Code}-advisor_leads.csv`),
    loadFile(`csv/all/${Country.Code}_inventory.csv`),
  ]);
  const [leadAssignmentsMarketing, advisorLeadsMarketing, leadDistancesMarketing, distancesMarketing, unfulfilledAdvisorsMarketing] = assignLeads(
    leads.filter(lead => lead["Type"] === "Marketing"),
    advisors,
    "MarketingLeads"
  );
  const [leadAssignmentsBonus, advisorLeadsBonus, leadDistancesBonus, distancesBonus, unfulfilledAdvisorsBonus] = assignLeads(
    leads.filter(lead => lead["Type"] === "Bonus"),
    advisors,
    "BonusLeads"
  );
  const leadAssignments = {...leadAssignmentsMarketing, ...leadAssignmentsBonus};
  const advisorLeads = Object.fromEntries(advisors.map(advisor => {
    const marketing = advisorLeadsMarketing[advisor["referral_code"]] || [];
    const bonus = advisorLeadsBonus[advisor["referral_code"]] || [];
    return [advisor["referral_code"], [
      ...marketing,
      ...bonus
    ]]
  }));
  const leadDistances = {...leadDistancesMarketing, ...leadDistancesBonus};
  const distances = [...distancesMarketing, ...distancesBonus];
  const unfulfilledAdvisors = uniqBy([...unfulfilledAdvisorsMarketing, ...unfulfilledAdvisorsBonus], advisor => advisor['referral_code']);
  const distancesByLead = groupBy(distances, "lead.household_id");
  const inventoryWriter = createCsvWriter({
    path: `csv/all/${currentDate.toISODate()}-${Country.Code}-assigned.csv`,
    header: [
      ...mainHeaders,
      ...advisors.map(advisor => ({id:advisor["referral_code"], title:advisor["referral_code"]}))
    ]
  });
  inventoryWriter.writeRecords(
    leads.map((lead) => {
      const distancesForLead = distancesByLead[lead["household_id"]];
      const advisorDistances = distancesForLead ? Object.fromEntries(distancesByLead[lead["household_id"]].map(distance => [distance.advisor["referral_code"], distance.distance])) : {};
      return {
        ...lead,
        referral_code: leadAssignments[lead["household_id"]],
        distance: leadDistances[lead["household_id"]],
        Type: lead["Type"],
        ...advisorDistances,
      }
    })
  );
  
  console.log("");
  const unassignedLeadsByRegion = groupBy(leads.filter(lead => !leadAssignments[lead["household_id"]]), Country.Columns.Region.title);
  console.log("\x1b[45m", "Unassigned Leads:", "\x1b[0m");
  Object.keys(unassignedLeadsByRegion).forEach(region => {
    console.log(`${region}, ${unassignedLeadsByRegion[region].length}`);
  })
  console.log("");
  console.log("\x1b[45m", "Quick Review - Unfulfilled", "\x1b[0m");
  console.log(['*referral_code', 'Region', 'fulfilled', 'unfulfilled'].join(','));
  unfulfilledAdvisors.map(advisor => {
    const leads = advisorLeads[advisor["referral_code"]];
    const fulfilled = leads ? leads.length : 0;
    if (advisor['TotalLeads'] - fulfilled > 0) {
      console.log([advisor['referral_code'], advisor[Country.Columns.Region.title],fulfilled, (advisor['TotalLeads'] - fulfilled || 0)].join(","));
    } 
  });
  console.log("");
  console.log("\x1b[45m", "AUM Review", "\x1b[0m");
  console.log(['*referral_code', 'lead_aum'].join(','));
  Object.entries(advisorLeads).map(([referral_code, household_ids]) => {
    const avgLeadAum = household_ids.reduce((sum,household_id) => {
      const lead = leads.find((lead) => lead["household_id"] === household_id);
      return sum + parseInt(lead["lead_aum"]);
    },0)/ household_ids.length;
    if (avgLeadAum < 125000) {
      console.log("issue -" + [referral_code, avgLeadAum.toFixed(0)].join(","));
    } else if (avgLeadAum > 125000) {
      console.log("no issue -" + [referral_code, avgLeadAum.toFixed(0)].join(","));
    } else {
      console.log("issue - no aum, " + referral_code);
    }
  })
  console.log("");
  console.log("\x1b[45m", "Advisor User Averages", "\x1b[0m");
  console.log(['*referral_code', 'fulfilled', 'distance', 'house value', 'child count', 'age', 'lead income','lead_aum'].join(','));
  Object.entries(advisorLeads).map(([referral_code, household_ids]) => {
    if(household_ids.length === 0) {
      console.log([referral_code, household_ids.length, 0, 0, 0, 0, 0, 0].join(","));
    } else {
      const avgLeadDistance = household_ids.reduce((sum,household_id) => {
        const lead = leads.find((lead) => lead["household_id"] === household_id);
        return sum + leadDistances[lead["household_id"]];
      },0)/ household_ids.length;
      const avgHomeseValue = household_ids.reduce((sum,household_id) => {
        const lead = leads.find((lead) => lead["household_id"] === household_id);
        return sum + parseInt(lead["house_value"]);
      },0)/ household_ids.length;
      const avgChildCount = household_ids.reduce((sum,household_id) => {
        const lead = leads.find((lead) => lead["household_id"] === household_id);
        return sum + parseInt(lead["child_count"]);
      },0)/ household_ids.length;
      const avgAge = household_ids.reduce((sum,household_id) => {
        const lead = leads.find((lead) => lead["household_id"] === household_id);
        return sum + parseInt(lead["primary_age"]);
      },0)/ household_ids.length;
      const avgLeadIncome = household_ids.reduce((sum,household_id) => {
        const lead = leads.find((lead) => lead["household_id"] === household_id);
        return sum + parseInt(lead["lead_income"]);
      },0)/ household_ids.length;
      const avgLeadAum = household_ids.reduce((sum,household_id) => {
        const lead = leads.find((lead) => lead["household_id"] === household_id);
        return sum + parseInt(lead["lead_aum"]);
      },0)/ household_ids.length;
      console.log([referral_code, household_ids.length, avgLeadDistance.toFixed(0), avgHomeseValue.toFixed(0), avgChildCount.toFixed(0), avgAge.toFixed(0),avgLeadIncome.toFixed(0), avgLeadAum.toFixed(0)].join(","));
    }
  })
  
};

const now = DateTime.local();

generateAll(DateTime.local(now.year, now.month, now.day)); //today
// generateAll(DateTime.local(now.year, now.month, now.day).plus({days:1})); //tomorrow

