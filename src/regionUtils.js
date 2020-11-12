const { sumColumns } = require("./csvUtils.js");

const US = {
  Code: "US",
  Holidays: {
    "2020-11-26": "Thanksgiving",
  },
  Columns: {
    Code: { id: "postal_code", title: "Zip" },
    Region: { id: "State", title: "State" },
    PhoneRegion: { id: "PhoneState", title: "PhoneState" },
  },
  Scrub: {
    Columns: {
      Code: { id: "Zip", title: "Zip" },
      Region: { id: "State", title: "State" },
      RegionCode: { id: "State Code", title: "State Code" },
    },
    CleanRegionalCode: (region) => {
      const trimmed = parseInt(region.trim()) + '';
      const short = trimmed.substring(0, trimmed.length - 2);
      return short;
    },
    SumLeadAum: (row) => {
      return sumColumns(row, ["primary_aum", "secondary_aum"]);
    },
    ValidateRegion: (row) => {
      const zipState = row[US.Columns.Region.title];
      const phoneState = row[US.Columns.PhoneRegion.title];
      if (!zipState) {
        return "no zip state";
      }
      if (!phoneState) {
        return "no phone state";
      }
      // if (zipState.localeCompare(phoneState) !== 0) {
      //   return "phone & zip state dont match";
      // }
      return;
    },
  },
};

const Canada = {
  Code: "CA",
  Holidays: {
    "2020-08-03": "Civic Holiday",
    "2020-09-07": "Labour Day",
    "2020-10-12": "Thanksgiving",
  },
  Columns: {
    Code: { id: "postal_code", title: "postal_code" },
    Region: { id: "Province", title: "Province" },
    PhoneRegion: { id: "PhoneProvince", title: "PhoneProvince" },
  },
  Scrub: {
    Columns: {
      Code: { id: "Postal", title: "Postal" },
      Region: { id: "Province", title: "Province" },
      RegionCode: { id: "Province Code", title: "Province Code" },
    },
    CleanRegionalCode: (region) => {
      return region.trim().substring(0, 3).toUpperCase();
    },
    SumLeadAum: (row) => {
      return sumColumns(row, [
        "primary_rrsp_balance",
        "primary_tfsa_balance",
        "primary_non_reg_external_balance",
        "secondary_rrsp_balance",
        "secondary_tfsa_balance",
        "secondary_non_reg_external_balance",
      ]);
    },
    ValidateRegion: (row) => {
      const postalProvince = row[Canada.Columns.Region.title];
      const phoneProvince = row[Canada.Columns.PhoneRegion.title];
      if (!postalProvince) {
        return "no postal province";
      }
      if (!phoneProvince) {
        return "no phone province";
      }
      if (
        phoneProvince.localeCompare("NS/PEI") === 0 &&
        (postalProvince.localeCompare("NS") === 0 ||
          postalProvince.localeCompare("PE") === 0)
      ) {
        return;
      } else if (
        phoneProvince.localeCompare("NORTH") === 0 &&
        (postalProvince.localeCompare("NT") === 0 ||
          postalProvince.localeCompare("NU") === 0 ||
          postalProvince.localeCompare("YT") === 0)
      ) {
        return;
      }
      if (postalProvince.localeCompare(phoneProvince) !== 0) {
        return "phone & postal province dont match";
      }
      return;
    },
  },
};

const Countries = {
  CA: Canada,
  US: US
}

console.log("");
console.log('running for ' + process.argv[2]);
module.exports = Countries[process.argv[2]];
