const serverAcceptsEmail = require("server-accepts-email");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const csvDir = "csv/scrub/";
const { getMapFromHeaders, getMapFromHeader, parseDate, sumColumns } = require("../csvUtils.js");
const Country = require("../regionUtils.js");
const { DateTime } = require("luxon");
const { daysOutFree, daysOutBonus } = require("../variables.js");


const headers = [
  { id: "Lat", title: "Lat" },
  { id: "Long", title: "Long" },
  Country.Columns.Code,
  { id: "inserted_at", title: "inserted_at" },
  { id: "group", title: "group" },
  Country.Columns.Region,
  { id: "Scrubbed", title: "Scrubbed" },
  { id: "Scrub", title: "Scrub" },
  { id: "household_id", title: "household_id" },
  { id: "referred_by", title: "referred_by" },
  { id: "email", title: "email" },
  { id: "primary_age", title: "primary_age" },
  { id: "house_value", title: "house_value" },
  { id: "child_count", title: "child_count" },
  { id: "lead_income", title: "lead_income" },
  { id: "lead_aum", title: "lead_aum" },
  { id: "Type", title: "Type" },
  { id: "first_name", title: "first_name" },
  { id: "email", title: "email" },
  { id: "phone", title: "phone" },
  { id: "appointment", title: "appointment" },
  { id: "notes", title: "notes" },
  { id: "Issue", title: "Issue" },
  { id: "Reason", title: "Reason" },
  { id: "uuid", title: "uuid" },
  { id: "verified", title: "verified" },
  { id: "primary_income", title: "primary_income" },
  { id: "secondary_income", title: "secondary_income" },
  { id: "house_value", title: "house_value" },
  { id: "cottage_balance", title: "cottage_balance" },
  { id: "car_loan_balance", title: "car_loan_balance" },
  { id: "other_loan_balance", title: "other_loan_balance" },
  { id: "credit_card_balance", title: "credit_card_balance" },
  { id: "line_of_credit_balance", title: "line_of_credit_balance" },
  { id: "primary_rrsp_balance", title: "primary_rrsp_balance" },
  { id: "primary_tfsa_balance", title: "primary_tfsa_balance" },
  {
    id: "primary_non_reg_external_balance",
    title: "primary_non_reg_external_balance",
  },
  { id: "secondary_rrsp_balance", title: "secondary_rrsp_balance" },
  { id: "secondary_tfsa_balance", title: "secondary_tfsa_balance" },
  {
    id: "secondary_non_reg_external_balance",
    title: "secondary_non_reg_external_balance",
  },
  { id: "child_count", title: "child_count" },
  Country.Columns.Region,
  Country.Columns.PhoneRegion,
  { id: "Disposition", title: "Disposition" },
  { id: "Assignment", title: "Assignment" },
  { id: "first_name", title: "first_name" },
  { id: "email", title: "email" },
];

const scrub_inventory = [
  { id: "inserted_at", title: "inserted_at" },
  { id: "Issue", title: "Issue" },
  { id: "household_id", title: "household_id" },
  { id: "first_name", title: "first_name" },
  { id: "email", title: "email" },
];

salesExportHeaders = [
  { id: "inserted_at", title: "inserted_at" },
  { id: "Sales_Export", title: "Sales_Export" },
  { id: "first_name", title: "first_name" },
  { id: "email", title: "email" },
  { id: "phone", title: "phone" },
  Country.Columns.Region,
  Country.Code,
]

let lasttime = new Date().getTime();
const snapshot = (message) => {
  const newtime = new Date().getTime();
  console.log(message, newtime - lasttime, "ms");
  lasttime = newtime;
};

const loadScrub = () => {
  const rows = [];
  return new Promise((resolve) => {
    fs.createReadStream(csvDir + `${Country.Code} scrub.csv`)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
};

const loadManualScrub = () => {
  const rows = [];
  return new Promise((resolve) => {
    fs.createReadStream(csvDir + "manual-scrub.csv")
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
};

const loadUsers = () => {
  const rows = [];
  return new Promise((resolve, reject) => {
    const fileList = fs.readdirSync("csv/all/");
    const files = fileList.filter((file) => file.match(/-users.csv/gi));
    if (files.length == 0) {
      reject("no user file found");
    } else if (files.length > 1) {
      reject("too many user files found " + files);
    } else {
      console.log(files[0]);
      fs.createReadStream("csv/all/" + files[0])
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows));
    }
  });
};

const loadDispositions = () => {
  const rows = [];
  return new Promise((resolve, reject) => {
    const infoList = fs.readdirSync("csv/all/");
    const infoDispositions = infoList.filter((file) =>
      file.match(/-dispositions.csv/gi)
    );
    if (infoDispositions.length == 0) {
      reject("no dispositions file found");
    } else if (infoDispositions.length > 1) {
      reject("too many dispositions files found " + infoDispositions);
    } else {
      console.log(infoDispositions[0]);
      fs.createReadStream("csv/all/" + infoDispositions[0])
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows));
    }
  });
};

const getColumn = (rows, header) => {
  const column = [];
  rows.forEach((row) => {
    if (row[header]) {
      column.push(row[header]);
    }
  });
  return column;
};



const cleanGroup = (group) => {
  const cleanGroup = group.trim().toUpperCase();
  if (cleanGroup.startsWith("FB")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("ORG")) {
    return cleanGroup.substring(0, 3);
  } else if (cleanGroup.startsWith("BLOG")) {
    return cleanGroup.substring(0, 4);
  } else if (cleanGroup.startsWith("GA")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("LI")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("VN")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("YT")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("SC")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("RED")) {
    return cleanGroup.substring(0, 3);
  } else if (cleanGroup.startsWith("TJ")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("SPOT")) {
    return cleanGroup.substring(0, 4);
  } else if (cleanGroup.startsWith("TK")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("OB")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("TW")) {
    return cleanGroup.substring(0, 2);
  } else if (cleanGroup.startsWith("TIK")) {
    return "TK";
  }
  return group;
};

const cleanPhone = (phone) => {
  return phone.toString().substring(0, 3);
};

const validateEmail = (row, scrubAdvisorEmails, scrubInvalidNames, scrubInvalidNameEmails, scrubInvalidDomainEmails, userPhoneToRow) => {
  const email = row["email"];
  const advisordomain = email.split("@").pop();
  if (scrubAdvisorEmails[advisordomain]) {
    return "advisor email domain";
  }
  if (row["email"] === "") {
    return "no email";
  }
};

const validateFirstName = (row, scrubAdvisorEmails, scrubInvalidNames, scrubInvalidNameEmails, scrubInvalidDomainEmails, userPhoneToRow) => {
  const name = row["first_name"];
  if (scrubInvalidNames[name]) {
    return "invalid first name";
  }
  if (name.length <= 2) {
    row["Issue"] = "possibly initials";
    return;
  }
};

const validateRealEmailName = (row, scrubAdvisorEmails, scrubInvalidNames, scrubInvalidNameEmails, scrubInvalidDomainEmails, userPhoneToRow) => {
  const invalidNameEmail = row["email"];
  const nameEmail = invalidNameEmail.split("@");
  if (scrubInvalidNameEmails[nameEmail[0]]) {
    return "invalid email name";
  }
};

const validateRealEmailDomain = (row, scrubAdvisorEmails, scrubInvalidNames, scrubInvalidNameEmails, scrubInvalidDomainEmails, userPhoneToRow) => {
  const invalidEmail = row["email"];
  const invalidDomain = invalidEmail.split("@").pop();
  if (scrubInvalidDomainEmails[invalidDomain]) {
    return "invalid email domain";
  }
};


const validateVerified = (row) => {
  if (row["verified"] !== "VERIFIED") {
    return "not verified";
  }
};
//remove stale leads

//two inventory lists: 1 file 0-5days ago marketing-inventory, 6days-51 days ago <bonus-inventory
//assignment, if bonus-inventory created first and if there is still a need then use needs-inventory

const now = DateTime.local();
const today = DateTime.local(now.year, now.month, now.day);
const validateNew = (row) => {
  if (parseDate(row["inserted_at"]) <= today.minus({days:daysOutFree})) {
    return "stale";
  }
};

const scrubAppointment = (appointment) => {
  if (appointment) {
    const parsedDate = parseDate(appointment);
    if (parsedDate.isValid && parsedDate.valueOf() > today.minus({days:1}).valueOf()) {
      return parsedDate.toFormat("yyyy-MM-dd hh:mm:ss a");
    }
  }
}

const rowType = (insertdate) => {
  if (insertdate) {
    const daysOut = parseDate(insertdate);
    if (daysOut <= today.minus({days:daysOutFree})) {
        return "Free";
    } else if (daysOut <= today.minus({days:daysOutBonus})) {
        return "Bonus";
    } else {
        return "Marketing";
    }
  }
}

const validateScrubbed = (row) => {
  // row["Scrubbed"] && console.log(row["Scrubbed"], row["household_id"]);
  if (row["Scrubbed"] === row["household_id"]) {
    row["Scrubbed"] = "scrubbing";
    return;
  }
};

const validateDispositions = (row) => {
  if (row["Disposition"] !== "new") {
    return "already dispositioned";
  }
  if (row["Assignment"] !== "") {
    return "already assigned";
  }
};

const validateGroup = (row) => {
  if (row["group"] !== "FB" && row["group"] !== "ORG" && row["group"] !== "BLOG" && row["group"] !== "GA" && row["group"] !== "LI" && row["group"] !== "VN" && row["group"] !== "YT" && row["group"] !== "SC" && row["group"] !== "RED" && row["group"] !== "TJ" && row["group"] !== "SPOT" && row["group"] !== "TK" && row["group"] !== "OB" && row["group"] !== "TW" && row["group"].startsWith("dnc-")) {
    return "not inventory";
  }
};

const validateIncome = (row) => {
  const childCount = parseInt(row["child_count"]);
  if (
    (childCount > 0 && row["lead_income"] < 50000 && row["lead_aum"] < 25000) || 
    (childCount === 0 && row["lead_income"] < 70000 && row["lead_aum"] < 70000)) {
      return "low lead quality";
    }
  }
const validateAge = (row) => {
  const primaryAge = parseInt(row["primary_age"]);
  if (primaryAge < 25) {
      return "young";
    }
  }


const validateUnique = (row, scrubAdvisorEmails, scrubInvalidNames, scrubInvalidNameEmails, scrubInvalidDomainEmails, userPhoneToRow) => {
  const phoneRows = userPhoneToRow[row["phone"]];
  if (phoneRows.length > 1) {
    if (phoneRows.find((phoneRow) => phoneRow["group"].startsWith("pw-"))) {
      return "exists with advisor";
    }
    if (phoneRows.find((phoneRow) => parseDate(phoneRow["inserted_at"]).valueOf() > parseDate(row["inserted_at"]).valueOf() && phoneRow["email"] ))  {
      return `older plan/${phoneRows.length}`;
    }
    row["Issue"] = `newest plan/${phoneRows.length}`;
    return;
  }
};

const exportGroup = (row) => {
  if (row["group"].startsWith("dnc-")) {
    row["Sales_Export"] = "Yes";
    return;
  }
};

const validateRow = (
  row,
  validationFunctions,
  scrubAdvisorEmails,
  scrubInvalidNames,
  scrubInvalidNameEmails,
  scrubInvalidDomainEmails,
  userPhoneToRow
) => {
  const reasons = [];
  validationFunctions.forEach((validate) => {
    const reason = validate(row, scrubAdvisorEmails, scrubInvalidNames, scrubInvalidNameEmails, scrubInvalidDomainEmails, userPhoneToRow);
    if (reason) {
      reasons.push(reason);
    }
  });
  if (reasons.length) {
    return reasons.join(";");
  }
};

const scrubRow = (
  row,
  scrubRegionCodes,
  scrubPhone,
  scrubAdvisorEmails,
  scrubInvalidNames,
  scrubInvalidNameEmails,
  scrubInvalidDomainEmails,
  userPhoneToRow,
  manualScrub,
  scrubDispositions,
  scrubAssignments
) => {
  row["lead_income"] = sumColumns(row, ["primary_income", "secondary_income"]);
  row["lead_aum"] = Country.Scrub.SumLeadAum(row);
  row["postal_code"] = Country.Scrub.CleanRegionalCode(row["postal_code"]);
  const regionCodeRows = scrubRegionCodes[row["postal_code"]];
  if (regionCodeRows) {
    row[Country.Columns.Region.id] = regionCodeRows[0][Country.Columns.Region.id];
    row["Long"] = regionCodeRows[0]["Long"];
    row["Lat"] = regionCodeRows[0]["Lat"];
  }
  row[Country.Columns.PhoneRegion.id] = scrubPhone[cleanPhone(row["phone"])];
  row["Scrubbed"] = manualScrub[row["household_id"]];
  row["Scrub"] = "";
  row["Disposition"] = scrubDispositions[row["household_id"]];
  row["Assignment"] = scrubAssignments[row["household_id"]];
  row["group"] = cleanGroup(row["group"]);
  row["appointment"] = scrubAppointment(row["appointment"]);
  row["Type"] = rowType(row["inserted_at"]);
  row["Group"] = "";
  row["Reason"] = validateRow(
    row,
    [
      validateNew,
      Country.Scrub.ValidateRegion,
      validateEmail,
      validateIncome,
      validateAge,
      validateGroup,
      validateUnique,
      validateScrubbed,
      validateDispositions,
      validateVerified,
      validateFirstName,
      validateRealEmailName,
      validateRealEmailDomain,
      exportGroup,
    ],
    scrubAdvisorEmails,
    scrubInvalidNames,
    scrubInvalidNameEmails,
    scrubInvalidDomainEmails,
    userPhoneToRow
  );
};



const scrub = async () => {
  const [scrubRows, manualScrubRows, userRows, dispositionRows] = await Promise.all([
    loadScrub(),
    loadManualScrub(),
    loadUsers(),
    loadDispositions(),
  ]);

  snapshot(
    `loaded ${scrubRows.length} scrub rows and ${userRows.length} user rows and ${dispositionRows.length} disposition rows`
  );
  const manualScrub = getMapFromHeaders(
    manualScrubRows,
    "household_id",
    "household_id"
  );
  
  // console.log(Object.keys(manualScrubRows[0])[0].split(''), "household_id".split(''));
  const scrubPhone = getMapFromHeaders(scrubRows, "Area Code", Country.Scrub.Columns.RegionCode.id);
  const scrubDispositions = getMapFromHeaders(
    dispositionRows,
    "household_id",
    "disposition"
  );
  const scrubAssignments = getMapFromHeaders(
    dispositionRows,
    "household_id",
    "assigned_on"
  );
  const scrubAdvisorEmails = getMapFromHeaders(
    scrubRows,
    "Advisor Emails",
    "Advisor Emails"
  );
  
  const scrubInvalidNames = getMapFromHeaders(
    scrubRows,
    "Exclude Names",
    "Exclude Names"
  );
  const scrubInvalidNameEmails = getMapFromHeaders(
    scrubRows,
    "Exclude before @",
    "Exclude before @"
  );
  const scrubInvalidDomainEmails = getMapFromHeaders(
    scrubRows,
    "Exclude domains",
    "Exclude domains"
  );



  const userPhoneToRow = getMapFromHeader(userRows, "phone");
  const scrubRegionCodes = getMapFromHeader(scrubRows, Country.Scrub.Columns.Code.id);
  const inventory = [], dnd = [], scrubList = [], salesExport = [];
  userRows.forEach((row) => {
    scrubRow(
    row,
      scrubRegionCodes,
      scrubPhone,
      scrubAdvisorEmails,
      scrubInvalidNames,
      scrubInvalidNameEmails,
      scrubInvalidDomainEmails,
      userPhoneToRow,
      manualScrub,
      scrubDispositions,
      scrubAssignments
    );
    if (row["Reason"] && !row["appointment"]) {
      dnd.push(row);
    } else {
      inventory.push(row);
    }
    if ((row["email"] !== "") && (row["Scrubbed"] !== "scrubbing") && (parseDate(row["inserted_at"]) >= today.minus({days:5}))) {
      scrubList.push(row);
    }
    if (row["Sales_Export"] === "Yes") {
    salesExport.push(row);
    }
  });
  console.log("\x1b[45m", "User Summary", "\x1b[0m");
  console.log(`${inventory.length} rows in inventory`);
  console.log(`${scrubList.length} rows in scrubList`);
  console.log(`${dnd.length} rows in dnd`);
  console.log(`${salesExport.length} rows in salesExport`);

  snapshot("scrubbed");
  const inventoryWriter = createCsvWriter({
    path: `csv/all/${Country.Code}_inventory.csv`,
    header: headers,
  });
  inventoryWriter.writeRecords(inventory);
  const salesExportWriter = createCsvWriter({
    path: `csv/all/${Country.Code}_salesExport.csv`,
    header: salesExportHeaders,
  });
  salesExportWriter.writeRecords(salesExport);
  const scrubCheckWriter = createCsvWriter({
    path: `csv/all/${Country.Code}_inventory-scrub.csv`,
    header: scrub_inventory,
  });
  scrubCheckWriter.writeRecords(scrubList);
  const dndWriter = createCsvWriter({
    path: `csv/all/${Country.Code}_dnd.csv`,
    header: headers,
  });
  dndWriter.writeRecords(dnd);
};

module.exports = {
  scrubRow,
  scrub,
  loadScrub,
  loadManualScrub,
};
