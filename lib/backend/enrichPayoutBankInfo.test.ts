import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrichPayoutBankInfo } from "./enrichPayoutBankInfo.ts";

describe("enrichPayoutBankInfo", () => {
  it("attaches payout method by doctor_id when list rows lack bank info", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/payout-methods") && !url.includes("/pm-")) {
        return new Response(
          JSON.stringify([
            {
              id: "pm-1",
              doctor_id: "doc-1",
              holder_name: "Dr Test",
              bank_name: "CBE",
              account_number: "1000123456789",
              bank_code: "cbe",
              is_default: true,
              currency: "ETB",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    };

    const out = (await enrichPayoutBankInfo(
      "payout-requests",
      "GET",
      [
        {
          id: "req-1",
          doctor_id: "doc-1",
          amount: 100,
          status: "pending",
          payout_method_id: "pm-1",
        },
      ],
      {
        baseUrl: "https://api.example.com",
        token: "t",
        fetchImpl,
      },
    )) as Array<{
      payout_method?: { bank_name?: string; account_number?: string };
    }>;

    assert.equal(out[0]?.payout_method?.bank_name, "CBE");
    assert.equal(out[0]?.payout_method?.account_number, "1000123456789");
  });

  it("skips fetch when bank details already present", async () => {
    let called = 0;
    const fetchImpl: typeof fetch = async () => {
      called += 1;
      return new Response("[]", { status: 200 });
    };

    const out = (await enrichPayoutBankInfo(
      "payout-requests",
      "GET",
      [
        {
          id: "req-1",
          doctor_id: "doc-1",
          payout_method: {
            holder_name: "Already",
            bank_name: "Awash",
            account_number: "99",
          },
        },
      ],
      { baseUrl: "https://api.example.com", token: "t", fetchImpl },
    )) as Array<{ payout_method?: { bank_name?: string } }>;

    assert.equal(called, 0);
    assert.equal(out[0]?.payout_method?.bank_name, "Awash");
  });

  it("enriches patient withdrawal detail from payment-methods", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/v1/admin/payment-methods")) {
        return new Response(
          JSON.stringify([
            {
              id: "pay-1",
              patient_id: "pat-1",
              holder_name: "Sara",
              bank_name: "CBE",
              account_number: "1000999",
              bank_code: "cbe",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    };

    const out = (await enrichPayoutBankInfo(
      "patient-withdrawals/w1",
      "GET",
      {
        request: {
          id: "w1",
          patient_id: "pat-1",
          amount: 50,
          status: "pending",
        },
        patient: { id: "pat-1", full_name: "Sara" },
      },
      { baseUrl: "https://api.example.com", token: "t", fetchImpl },
    )) as {
      request: { payout_method?: { account_number?: string } };
    };

    assert.equal(out.request.payout_method?.account_number, "1000999");
  });
});
