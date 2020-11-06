const serverAcceptsEmail = require("server-accepts-email");
const csv = require("csv-parser");
const csvDir = "csv/scrub/";
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const { start } = require("repl");

const csvWriter = createCsvWriter({
  path: csvDir + "out.csv",
  header: [
    { id: "Email", title: "Email" },
    { id: "EmailCheck", title: "EmailCheck" },
  ],
});
let finished = 0;
const checkEmail = (row) => {
  return serverAcceptsEmail(row.email)
    .then((result) => {
      finished++;
      console.log(`${finished}/${rows.length} ${row.email} ${result}`);
      return result;
    })
    .catch((error) => {
      console.log(`error with ${finished}/${rows.length} ${row.email}`, error);
      return "error";
    });
};
const checkEmails = async (rows) => {
  let allResults = [];
  const rowsToBatch = [...rows];
  while (rowsToBatch.length) {
    const batchOfRows = rowsToBatch.splice(0, 100);
    const batchOfResults = await Promise.all(batchOfRows.map(checkEmail));
    allResults = allResults.concat(batchOfResults);
  }
  return allResults;
};

const rows = [];
fs.createReadStream(csvDir + "inventory.csv")
  .pipe(csv())
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    console.log("Verifying email server will begin now");
    const results = await checkEmails(rows);
    const data = rows.map((row, index) => ({
      ...row,
      Email: row.email,
      EmailCheck: results[index],
    }));
    csvWriter
      .writeRecords(data)
      .then(() => console.log("The CSV file was written successfully"));
  });

  start();