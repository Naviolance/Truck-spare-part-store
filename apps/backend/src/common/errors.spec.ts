import { readFileSync } from "fs";
import { join } from "path";
import { ERROR_CODES, defaultCode } from "./errors";

// The frontend translates every API error code (messages/*.json,
// "ApiErrors"). A code without a translation would show a French customer
// a generic message instead of the real reason — so it fails here.
describe("API error codes", () => {
  for (const locale of ["en", "fr"]) {
    it(`all have a translation in ${locale}.json`, () => {
      const messages = JSON.parse(readFileSync(join(__dirname, `../../../frontend/messages/${locale}.json`), "utf8"));
      const missing = ERROR_CODES.filter((code) => typeof messages.ApiErrors?.[code] !== "string");
      expect(missing).toEqual([]);
    });
  }

  it("unlabelled errors get a code from their status", () => {
    expect(defaultCode(400, true)).toBe("VALIDATION_FAILED");
    expect(defaultCode(429, false)).toBe("RATE_LIMITED");
    expect(defaultCode(503, false)).toBe("SERVER_ERROR");
  });
});
