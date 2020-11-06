const { DateTime } = require("luxon");

const getMapFromHeaders = (rows, key, value) => {
  const map = {};
  rows.forEach((row) => {
    map[row[key]] = row[value];
  });
  return map;
};

const getMapFromHeader = (rows, key) => {
  const map = {};
  rows.forEach((row) => {
    let lookup = map[row[key]];
    if (!lookup) {
      lookup = map[row[key]] = [];
    }
    lookup.push(row);
  });
  return map;
};


const parseDate = (date) => {
  let result = DateTime.fromISO(date, { zone: "UTC" });
  if (!result.isValid) {
    result = DateTime.fromSQL(date, { zone: "UTC" });
  }
  if (!result.isValid) {
    result = DateTime.fromFormat(date, "yyyy-MM-dd h:m:s", { zone: "UTC" });
  }
  if (!result.isValid) {
    result = DateTime.fromFormat(date, "yyyy-MM-dd h:m", { zone: "UTC" });
  }
  if (!result.isValid) {
    console.error(`date parsing failed for ${date}`);
  }
  return result.setZone("America/Toronto");
};


const sumColumns = (row, headersToSum) => {
  return headersToSum.reduce(
      (sum, header) => sum + (parseInt(row[header]) || 0),
      0
  );
};

module.exports = {
  getMapFromHeaders,
  getMapFromHeader,
  parseDate,
  sumColumns
};
