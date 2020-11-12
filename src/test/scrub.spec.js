const assert = require("assert");
const { scrubRow } = require("../scrub/scrub.js");

describe("scrub", () => {
  describe("scrubRow", () => {
    const rows = [
      {
        uuid: "001c3454-e352-44b8-bdad-ec775a09f56c",
        first_name: "Joe1",
        email: "joe@test.com",
        referred_by: "FBT12v14",
        upper: "V0R ",
        inserted_at: "2020-06-25 23:44:17",
        group: "pw-dnd-scrub",
        household_id: "464b654e-382e-42b7-ab35-81a1e67a68c2",
        phone: "1234567890",
        verified: "VERIFIED",
        primary_income: "107000",
        secondary_income: "76000",
        house_value: "700000",
        cottage_balance: "0",
        car_loan_balance: "40000",
        other_loan_balance: "0",
        credit_card_balance: "0",
        line_of_credit_balance: "48000",
        primary_rrsp_balance: "80000",
        primary_tfsa_balance: "1400",
        primary_non_reg_external_balance: "0",
        secondary_rrsp_balance: "20000",
        secondary_tfsa_balance: "50",
        secondary_non_reg_external_balance: "0",
        child_count: "2",
      },
      {
        uuid: "001c3454-e352-44b8-bdad-ec775a09f56c",
        first_name: "Joe2",
        email: "joe@test.com",
        referred_by: "FBT12v14",
        upper: "V0R ",
        inserted_at: "2020-06-25 23:44:17",
        group: "pw-dnd-scrub",
        household_id: "464b654e-382e-42b7-ab35-81a1e67a68c2",
        phone: "1234567890",
        verified: "VERIFIED",
        primary_income: "107000",
        secondary_income: "76000",
        house_value: "700000",
        cottage_balance: "0",
        car_loan_balance: "40000",
        other_loan_balance: "0",
        credit_card_balance: "0",
        line_of_credit_balance: "48000",
        primary_rrsp_balance: "80000",
        primary_tfsa_balance: "1400",
        primary_non_reg_external_balance: "0",
        secondary_rrsp_balance: "20000",
        secondary_tfsa_balance: "50",
        secondary_non_reg_external_balance: "0",
        child_count: "2",
      },
      {
        uuid: "001c3454-e352-44b8-bdad-ec775a09f56c",
        first_name: "Frank1",
        email: "frank@test.com",
        referred_by: "FBT12v14",
        upper: "V0R ",
        inserted_at: "2020-06-25 23:44:17",
        group: "FBT12v14",
        household_id: "464b654e-382e-42b7-ab35-81a1e67a68c2",
        phone: "2234567890",
        verified: "VERIFIED",
        primary_income: "107000",
        secondary_income: "76000",
        house_value: "700000",
        cottage_balance: "0",
        car_loan_balance: "40000",
        other_loan_balance: "0",
        credit_card_balance: "0",
        line_of_credit_balance: "48000",
        primary_rrsp_balance: "80000",
        primary_tfsa_balance: "1400",
        primary_non_reg_external_balance: "0",
        secondary_rrsp_balance: "20000",
        secondary_tfsa_balance: "50",
        secondary_non_reg_external_balance: "0",
        child_count: "2",
      },
      {
        uuid: "001c3454-e352-44b8-bdad-ec775a09f56c",
        first_name: "Frank2",
        email: "frank@test.com",
        referred_by: "FBT12v14",
        upper: "V0R ",
        inserted_at: "2020-06-25 23:44:17",
        group: "FBT12v14",
        household_id: "464b654e-382e-42b7-ab35-81a1e67a68c2",
        phone: "2234567890",
        verified: "VERIFIED",
        primary_income: "107000",
        secondary_income: "76000",
        house_value: "700000",
        cottage_balance: "0",
        car_loan_balance: "40000",
        other_loan_balance: "0",
        credit_card_balance: "0",
        line_of_credit_balance: "48000",
        primary_rrsp_balance: "80000",
        primary_tfsa_balance: "1400",
        primary_non_reg_external_balance: "0",
        secondary_rrsp_balance: "20000",
        secondary_tfsa_balance: "50",
        secondary_non_reg_external_balance: "0",
        child_count: "2",
      },
    ];
    const userPhoneToRow = {
      "1234567890": [rows[0], rows[1]],
      "2234567890": [rows[2], rows[3]],
    };

    it("should sum primary_income and secondary_income for user_income", () => {
      scrubRow(rows[0], {}, {}, {}, userPhoneToRow, {}, {});
      assert.equal(rows[0]["user_income"], 107000 + 76000);
    });

    it("should make a note that the user has multiple plans and belongs to an advisor", () => {
      scrubRow(rows[0], {}, {}, {}, userPhoneToRow, {}, {});
      assert.match(rows[0]["Reason"], /exists with advisor/);
    });

    it("should make a note that the user has multiple plans", () => {
      scrubRow(rows[2], {}, {}, {}, userPhoneToRow, {}, {});
      assert.match(rows[2]["Note"], /multiple plans/);
    });
  });
});
