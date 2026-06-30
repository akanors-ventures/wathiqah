import { describe, expect, it } from "vitest";
import { removeById, replaceById, upsertById } from "./org-live-updates";

describe("upsertById", () => {
  it("prepends a new item", () => {
    const result = upsertById([{ id: "a" }, { id: "b" }], { id: "c" });
    expect(result).toEqual([{ id: "c" }, { id: "a" }, { id: "b" }]);
  });

  it("is a no-op when the item is already present (id dedup)", () => {
    const list = [{ id: "a" }, { id: "b" }];
    const result = upsertById(list, { id: "a" });
    expect(result).toBe(list);
  });
});

describe("replaceById", () => {
  it("replaces the matching item in place", () => {
    const result = replaceById(
      [
        { id: "a", body: "old" },
        { id: "b", body: "keep" },
      ],
      { id: "a", body: "new" },
    );
    expect(result).toEqual([
      { id: "a", body: "new" },
      { id: "b", body: "keep" },
    ]);
  });

  it("leaves the list unchanged when no item matches", () => {
    const list = [{ id: "a", body: "old" }];
    const result = replaceById(list, { id: "missing", body: "new" });
    expect(result).toEqual(list);
  });
});

describe("removeById", () => {
  it("filters out the matching item", () => {
    const result = removeById([{ id: "a" }, { id: "b" }], "a");
    expect(result).toEqual([{ id: "b" }]);
  });

  it("is a no-op when the id is absent", () => {
    const result = removeById([{ id: "a" }], "missing");
    expect(result).toEqual([{ id: "a" }]);
  });
});
