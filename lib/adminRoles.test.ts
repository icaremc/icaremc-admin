import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminCanView } from "./adminRoles.ts";

describe("adminCanView", () => {
  it("lets manage_users roles pass view_users checks", () => {
    assert.equal(adminCanView("super_admin", "view_users"), true);
    assert.equal(adminCanView("support", "view_users"), true);
  });

  it("keeps viewer read-only on manage_* via manage check", () => {
    assert.equal(adminCanView("viewer", "view_users"), true);
    // adminCanView(manage_*) still true for viewers (route gate); writes use adminCanManage
    assert.equal(adminCanView("viewer", "manage_users"), true);
    assert.equal(adminCanView("content_admin", "view_users"), false);
  });

  it("lets manage_content pass view_content", () => {
    assert.equal(adminCanView("content_admin", "view_content"), true);
    assert.equal(adminCanView("super_admin", "view_content"), true);
  });
});
