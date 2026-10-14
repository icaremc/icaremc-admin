import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrichMembershipParents } from "./enrichParents.ts";
import type { AppSubscriptionMember } from "./members.ts";

const base: AppSubscriptionMember = {
  id: "s1",
  patient_id: "p1",
  plan: "yearly",
  status: "active",
  starts_at: "2026-01-01",
  ends_at: "2027-01-01",
  amount_paid: 1,
  currency: "ETB",
  payment_method: "chapa",
  chapa_tx_ref: "x",
  admin_receipt_url: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  patient_name: null,
  patient_phone: null,
  has_access: true,
};

describe("enrichMembershipParents", () => {
  it("fills missing names from user detail", async () => {
    const members: AppSubscriptionMember[] = [
      { ...base, patient_name: null },
      {
        ...base,
        id: "s2",
        patient_id: "p2",
        patient_name: "Already Named",
      },
    ];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/users/p1")) {
        return new Response(
          JSON.stringify({
            profile: { full_name: "Meron", phone: "+2519" },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      throw new Error(`unexpected ${url}`);
    }) as typeof fetch;

    const out = await enrichMembershipParents(members, fetchImpl);
    assert.equal(out[0]?.patient_name, "Meron");
    assert.equal(out[0]?.patient_phone, "+2519");
    assert.equal(out[1]?.patient_name, "Already Named");
  });
});
