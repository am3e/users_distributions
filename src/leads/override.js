const serverAcceptsEmail = require("server-accepts-email");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const { getMapFromHeaders, getMapFromHeader, parseDate } = require("../csvUtils.js");
const { DateTime } = require("luxon");
const Country = require("../regionUtils.js");

const override = async (overrideRows, advisors) => {
  const overridesById = overrideRows.reduce((map, row) => {
    map[row['stripe_customer_id']] = row;
    return map;
  }, 
{});
  return advisors.map (advisor => {
    const overrideRow = overridesById[advisor["stripe_customer_id"]];
    if ( !overrideRow ) {
      return advisor;
    }
    const deferralDate = overrideRow["deferralDate"];
    const lastPeriodStartDate = deferralDate ? deferralDate : advisor["latest_period_start"];
    const overrideRegion = Country.Scrub.CleanRegionalCode(overrideRow[Country.Columns.Code.title]);
    const correctRegion = overrideRegion === advisor["upper"] ? advisor["upper"] : overrideRegion;
    const refCodeIssue = (overrideRow["Ref/Group"]);
    const brokenRefCode = refCodeIssue === advisor["referral_code"] ? advisor["referral_code"] : refCodeIssue;
    if ( brokenRefCode !== advisor["referral_code"]) {
      console.log([brokenRefCode, advisor["stripe_customer_id"], advisor["referral_code"]].join(","));
    }

    return {
      ...advisor,
      "Ref/Group": (overrideRow["Ref/Group"]),
        "First name": (overrideRow["First name"]),
        Recipient: (overrideRow["Recipient"]),
        ImmediateBonusLeads: parseInt(overrideRow["ImmediateBonusLeads"]) || 0,
        BonusLeads: parseInt(overrideRow["BonusLeads"]) || 0,
        latest_period_start: lastPeriodStartDate,
        Status: (overrideRow["Status"]),
        "upper": correctRegion,
        Plan: (overrideRow["Plan"]),
        "Date Churned": (overrideRow["Date Churned"]),
        "Last Update": (overrideRow["Last Update"]),
    }
  })
}

module.exports = { override };

        